import { expect, it } from "vitest";
import {
  GenerationJobService,
  JobRegistry,
  type GenerationOutcome,
  type GenerationRunOptions,
  type RawImageRequest
} from "../../src/index.js";

it("pauses an over-budget job and resumes the same request after approval", async () => {
  const calls: Array<{ request: RawImageRequest; options?: GenerationRunOptions }> = [];
  const runner = {
    run: async (request: RawImageRequest, options: GenerationRunOptions = {}): Promise<GenerationOutcome> => {
      calls.push({ request, options });
      if (options.costApproved) {
        return { status: "PASS", providerId: "seedream", model: "seedream", assetIds: ["out"], provenanceRecorded: true, reasons: [] };
      }
      return {
        status: "WAITING_APPROVAL",
        providerId: "seedream",
        assetIds: [],
        costDecision: { status: "REQUIRES_APPROVAL", reasons: ["COST_EXCEEDS_BUDGET"], estimate: { amount: 35, unit: "credits" } },
        provenanceRecorded: false,
        reasons: ["COST_EXCEEDS_BUDGET"]
      };
    }
  };
  const service = new GenerationJobService(new JobRegistry(), runner);
  const request: RawImageRequest = {
    requestId: "req-1",
    intent: "edit",
    operation: "EDIT",
    prompt: "edit",
    sourceAssets: [{ id: "base", uri: "file://base", roles: ["scene"] }],
    explicitLocks: [],
    requestedChanges: [],
    privacyMode: "REMOTE_ALLOWED"
  };

  const submitted = await service.submit(request);
  expect(submitted.state).toBe("WAITING_APPROVAL");
  const finished = await service.approveCost(submitted.id, true);
  expect(finished.state).toBe("COMPLETED");
  expect(calls).toHaveLength(2);
  expect(calls[1]?.request.requestId).toBe("req-1");
  expect(calls[1]?.options?.costApproved).toBe(true);
});
