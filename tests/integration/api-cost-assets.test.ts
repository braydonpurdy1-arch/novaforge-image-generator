import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import {
  buildServer,
  GenerationJobService,
  GenerationOrchestrator,
  GenerationQcEngine,
  JobRegistry,
  LocalAssetRegistry,
  ModelRouter,
  ReferencePolicyEngine,
  type ImageProvider,
  type ProvenanceLedger,
  type RawImageRequest
} from "../../src/index.js";

it("pauses an over-budget Seedream request, resumes after approval, and preserves provider retention metadata", async () => {
  let executions = 0;
  const provider: ImageProvider = {
    id: "seedream",
    kind: "SEEDREAM",
    locality: "REMOTE",
    capabilities: () => ({
      operations: ["EDIT"],
      referenceRoles: ["image"],
      supportsIdentityReferences: true,
      supportsTextRendering: false,
      supportsVideo: false,
      maxResolution: "4k"
    }),
    preflight: async () => ({ status: "READY", reasons: [] }),
    estimateCost: async () => ({ amount: 35, unit: "credits" }),
    execute: async () => {
      executions += 1;
      return { providerId: "seedream", model: "seedream", assetIds: ["asset_out"], metadata: { providerRetention: "UNKNOWN" } };
    }
  };
  const ledger: ProvenanceLedger = { append: async () => undefined };
  const orchestrator = new GenerationOrchestrator({
    policy: new ReferencePolicyEngine(),
    router: new ModelRouter(),
    qc: new GenerationQcEngine(),
    providers: [provider],
    ledger,
    evaluators: [async () => ({ category: "REQUESTED_DELTA_SUCCESS", status: "PASS", confidence: 1, notes: [], hardLockAffected: false })]
  });
  const jobs = new GenerationJobService(new JobRegistry(), orchestrator);
  const dir = await mkdtemp(join(tmpdir(), "nf-api-"));
  const assets = new LocalAssetRegistry(join(dir, "assets.json"));
  const app = buildServer({ generationJobs: jobs, assets });
  const request: RawImageRequest = {
    requestId: "api-cost-1",
    intent: "edit",
    operation: "EDIT",
    prompt: "edit",
    sourceAssets: [{ id: "base", uri: "file://base.png", roles: ["scene"] }],
    explicitLocks: [],
    requestedChanges: [],
    privacyMode: "REMOTE_ALLOWED",
    outputRequirements: { qualityTier: "MASTER", budgetCredits: 20 },
    preferredProvider: "seedream"
  };

  const submitted = await app.inject({ method: "POST", url: "/v1/generations", payload: request });
  expect(submitted.statusCode).toBe(202);
  const jobId = submitted.json().jobId as string;
  expect(submitted.json().state).toBe("WAITING_APPROVAL");
  expect(executions).toBe(0);

  const approved = await app.inject({ method: "POST", url: `/v1/jobs/${jobId}/approve-cost`, payload: { approved: true } });
  expect(approved.statusCode).toBe(200);
  expect(approved.json().state).toBe("COMPLETED");
  expect(executions).toBe(1);

  const finished = await app.inject({ method: "GET", url: `/v1/jobs/${jobId}` });
  expect(finished.json().state).toBe("COMPLETED");
  expect(finished.json().providerRetention).toBe("UNKNOWN");
  expect(JSON.stringify(finished.json())).not.toContain("file://base.png");

  await app.close();
  await rm(dir, { recursive: true, force: true });
});
