import { expect, it } from "vitest";
import {
  GenerationOrchestrator,
  GenerationQcEngine,
  ModelRouter,
  ReferencePolicyEngine,
  type ImageProvider,
  type ProvenanceLedger,
  type RawImageRequest
} from "../src/index.js";

it("pauses before provider execution when estimated cost exceeds budget", async () => {
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
    estimateCost: async () => ({ amount: 10, unit: "credits" }),
    execute: async () => {
      executions += 1;
      return { providerId: "seedream", model: "seedream", assetIds: ["out"], metadata: {} };
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
  const raw: RawImageRequest = {
    requestId: "cost-1",
    intent: "edit",
    operation: "EDIT",
    prompt: "edit",
    sourceAssets: [{ id: "base", uri: "file://base.png", roles: ["scene"] }],
    explicitLocks: [],
    requestedChanges: [],
    privacyMode: "REMOTE_ALLOWED",
    outputRequirements: { qualityTier: "MASTER", budgetCredits: 5 },
    preferredProvider: "seedream"
  };

  const paused = await orchestrator.run(raw);
  expect(paused.status).toBe("WAITING_APPROVAL");
  expect(executions).toBe(0);

  const approved = await orchestrator.run(raw, { costApproved: true });
  expect(approved.status).toBe("PASS");
  expect(executions).toBe(1);
});
