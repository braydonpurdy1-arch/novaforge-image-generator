import type { GenerationRequest } from "../domain/types.js";
import { redactRemoteText } from "../privacy/remote-redaction.js";
import { GeminiModelCatalog } from "./gemini-model-catalog.js";
import type { ProviderTransport } from "./transport.js";
import type { ImageProvider, ProviderCapabilities, ProviderExecutionPlan, ProviderPreflight, ProviderResult } from "./types.js";

export interface GeminiImageProviderOptions {
  model: string;
  transport: ProviderTransport;
  locality?: "LOCAL" | "REMOTE";
  catalog?: GeminiModelCatalog;
}

export class GeminiImageProvider implements ImageProvider {
  readonly id = "gemini-image";
  readonly kind = "GEMINI_IMAGE" as const;
  readonly locality: "LOCAL" | "REMOTE";
  private readonly modelId: string;

  constructor(private readonly options: GeminiImageProviderOptions) {
    this.locality = options.locality ?? "REMOTE";
    const descriptor = (options.catalog ?? new GeminiModelCatalog()).resolve(options.model, true);
    if (descriptor.role !== "IMAGE" || !descriptor.modelId) throw new Error(`GEMINI_IMAGE_MODEL_REQUIRED:${options.model}`);
    this.modelId = descriptor.modelId;
  }

  capabilities(): ProviderCapabilities {
    return {
      operations: ["GENERATE", "EDIT", "DELTA_EDIT", "INPAINT"],
      referenceRoles: ["image"],
      supportsIdentityReferences: true,
      supportsTextRendering: true,
      supportsVideo: false,
      maxResolution: "4k",
      historicalQcRate: 0.9,
      costRank: this.modelId === "gemini-3.1-flash-image" ? 2 : 4,
      latencyRank: this.modelId === "gemini-3.1-flash-image" ? 2 : 4
    };
  }

  async preflight(request: GenerationRequest): Promise<ProviderPreflight> {
    if (request.privacyMode === "LOCAL_ONLY" && this.locality === "REMOTE") return { status: "BLOCKED_BY_POLICY", reasons: ["LOCAL_ONLY"] };
    return this.capabilities().operations.includes(request.operation)
      ? { status: "READY", reasons: [] }
      : { status: "UNSUPPORTED", reasons: ["OPERATION_UNSUPPORTED"] };
  }

  async execute(plan: ProviderExecutionPlan): Promise<ProviderResult> {
    const prompt = plan.request.privacyMode === "REMOTE_REDACTED" ? redactRemoteText(plan.compiledPrompt) : plan.compiledPrompt;
    const result = await this.options.transport({
      payload: {
        model: this.modelId,
        prompt,
        operation: plan.request.operation,
        aspectRatio: plan.request.outputRequirements?.aspectRatio,
        references: plan.request.sourceAssets.map(asset => ({ id: asset.id, roles: asset.roles })),
        locks: plan.request.locks,
        allowedChanges: plan.request.allowedChanges,
        parameters: plan.parameters ?? {}
      },
      mediaBindings: plan.request.sourceAssets.map(asset => ({ id: asset.id, uri: asset.uri }))
    });
    const retention = result.metadata?.retention === "EPHEMERAL" || result.metadata?.retention === "RETAINED" || result.metadata?.retention === "UNKNOWN"
      ? result.metadata.retention
      : "UNKNOWN";
    return {
      providerId: this.id,
      model: this.modelId,
      assetIds: result.assetIds,
      metadata: { ...(result.metadata ?? {}), retention, ...(result.jobId ? { jobId: result.jobId } : {}) }
    };
  }
}
