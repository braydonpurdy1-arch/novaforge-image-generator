import type { ProviderRetention } from "../assets/types.js";
import type { RawImageRequest } from "../domain/types.js";
import type { ImageProvider, ProviderExecutionPlan, ProviderResult } from "../providers/types.js";
import type { ReferencePolicyEngine } from "../policy/reference-policy-engine.js";
import type { ModelRouter } from "../routing/model-router.js";
import type { GenerationQcEngine } from "../qc/generation-qc-engine.js";
import type { QcEvaluator, QcReport } from "../qc/types.js";
import type { ProvenanceLedger } from "../provenance/types.js";
import { runPreflight } from "../preflight/generation-preflight.js";
import { planRepair, type RepairPlan } from "../qc/targeted-repair-planner.js";
import { evaluateCostPolicy, type CostDecision } from "../cost/cost-policy.js";

export interface GenerationOrchestratorOptions {
  policy: ReferencePolicyEngine;
  router: ModelRouter;
  qc: GenerationQcEngine;
  providers: ImageProvider[];
  ledger: ProvenanceLedger;
  evaluators: QcEvaluator[];
}

export interface GenerationRunOptions { costApproved?: boolean; }

export interface GenerationOutcome {
  status: "PASS" | "WARN" | "FAIL" | "BLOCKED" | "UNSUPPORTED" | "WAITING_APPROVAL";
  providerId?: string;
  model?: string;
  assetIds: string[];
  qc?: QcReport;
  repairPlan?: RepairPlan;
  costDecision?: CostDecision;
  providerRetention?: ProviderRetention;
  provenanceRecorded: boolean;
  reasons: string[];
}

function providerRetentionFrom(result: ProviderResult): ProviderRetention | undefined {
  const value = result.metadata.providerRetention;
  return value === "EPHEMERAL" || value === "RETAINED" || value === "UNKNOWN" ? value : undefined;
}

export class GenerationOrchestrator {
  constructor(private readonly options: GenerationOrchestratorOptions) {}

  async run(rawRequest: RawImageRequest, runOptions: GenerationRunOptions = {}): Promise<GenerationOutcome> {
    const request = this.options.policy.compile(rawRequest);
    const validation = this.options.policy.validate(request);
    if (validation.status !== "READY") {
      return { status: "BLOCKED", assetIds: [], provenanceRecorded: false, reasons: validation.reasons };
    }

    const preflight = runPreflight(request, { providers: this.options.providers });
    if (preflight.status !== "READY") {
      return {
        status: preflight.status === "UNSUPPORTED" ? "UNSUPPORTED" : "BLOCKED",
        assetIds: [],
        provenanceRecorded: false,
        reasons: preflight.reasons
      };
    }

    let routing;
    try {
      routing = await this.options.router.route(request, this.options.providers);
    } catch (error) {
      return { status: "UNSUPPORTED", assetIds: [], provenanceRecorded: false, reasons: [error instanceof Error ? error.message : "ROUTING_FAILED"] };
    }

    const provider = this.options.providers.find(p => p.id === routing.providerId);
    if (!provider) return { status: "UNSUPPORTED", assetIds: [], provenanceRecorded: false, reasons: ["ROUTED_PROVIDER_MISSING"] };

    const providerPreflight = await provider.preflight(request);
    if (providerPreflight.status !== "READY") {
      return { status: providerPreflight.status === "UNSUPPORTED" ? "UNSUPPORTED" : "BLOCKED", assetIds: [], provenanceRecorded: false, reasons: providerPreflight.reasons };
    }

    const executionPlan: ProviderExecutionPlan = { request, compiledPrompt: request.prompt };
    const estimate = provider.estimateCost ? await provider.estimateCost(executionPlan) : undefined;
    const costDecision = evaluateCostPolicy(
      { ...(request.outputRequirements.budgetCredits !== undefined ? { budgetCredits: request.outputRequirements.budgetCredits } : {}) },
      estimate,
      runOptions.costApproved === true
    );
    if (costDecision.status === "REQUIRES_APPROVAL") {
      return {
        status: "WAITING_APPROVAL",
        providerId: provider.id,
        assetIds: [],
        costDecision,
        provenanceRecorded: false,
        reasons: costDecision.reasons
      };
    }

    let providerResult: ProviderResult;
    try {
      providerResult = await provider.execute(executionPlan);
    } catch (error) {
      return { status: "FAIL", providerId: provider.id, assetIds: [], costDecision, provenanceRecorded: false, reasons: [error instanceof Error ? error.message : "PROVIDER_EXECUTION_FAILED"] };
    }

    const qc = await this.options.qc.evaluate(request, providerResult, this.options.evaluators);
    const repairPlan = qc.overall === "FAIL" ? planRepair(request, qc) : undefined;
    const providerJobId = typeof providerResult.metadata.jobId === "string" ? providerResult.metadata.jobId : undefined;
    const providerRetention = providerRetentionFrom(providerResult);

    await this.options.ledger.append({
      requestId: request.requestId,
      timestamp: new Date().toISOString(),
      sourceAssetIds: request.sourceAssets.map(a => a.id),
      locks: request.locks,
      routingDecision: routing,
      providerId: providerResult.providerId,
      model: providerResult.model,
      ...(providerJobId ? { providerJobId } : {}),
      parameters: {
        cost: costDecision.estimate ?? null,
        costReasons: costDecision.reasons
      },
      preflight,
      qc,
      repairHistory: repairPlan ? [{ action: repairPlan.action, reasons: repairPlan.reasons }] : [],
      finalAssetIds: providerResult.assetIds,
      anchorStatus: "NOT_PROMOTED",
      metadata: providerResult.metadata
    });

    return {
      status: qc.overall,
      providerId: providerResult.providerId,
      model: providerResult.model,
      assetIds: providerResult.assetIds,
      qc,
      ...(repairPlan ? { repairPlan } : {}),
      costDecision,
      ...(providerRetention ? { providerRetention } : {}),
      provenanceRecorded: true,
      reasons: []
    };
  }
}
