import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  JsonlProvenanceLedger,
  ModelRouter,
  OpenAiImageProvider,
  SeedreamProvider,
  evaluateCostPolicy,
  redactRemoteValue,
  type GenerationRequest,
  type ProvenanceEntry
} from "../src/index.js";

const baseRequest: GenerationRequest = {
  requestId: "sec-1",
  intent: "edit",
  operation: "EDIT",
  prompt: "edit",
  sourceAssets: [{ id: "base", uri: "/tmp/base.png", roles: ["scene"] }],
  locks: [],
  allowedChanges: [],
  forbiddenChanges: [],
  outputRequirements: { qualityTier: "MASTER" },
  qualityTier: "MASTER",
  privacyMode: "REMOTE_REDACTED"
};

describe("security regressions", () => {
  it("requires approval when a configured budget cannot be safely compared", () => {
    expect(evaluateCostPolicy({ budgetCredits: 20 }, undefined, false).status).toBe("REQUIRES_APPROVAL");
    expect(evaluateCostPolicy({ budgetCredits: 20 }, { amount: 5, unit: "usd" }, false).status).toBe("REQUIRES_APPROVAL");
    expect(evaluateCostPolicy({ budgetCredits: 20 }, undefined, true).status).toBe("ALLOWED");
  });

  it("redacts sensitive strings recursively in remote model payloads", () => {
    const value = redactRemoteValue({
      prompt: "Bearer abc123",
      locks: [{ description: "email user@example.com path /tmp/face.png" }],
      allowedChanges: [{ transformation: "password=hunter2" }]
    });
    const serialized = JSON.stringify(value);
    expect(serialized).not.toContain("abc123");
    expect(serialized).not.toContain("user@example.com");
    expect(serialized).not.toContain("/tmp/face.png");
    expect(serialized).not.toContain("hunter2");
  });

  it("rejects secret-looking values in provenance even under innocent keys", async () => {
    const dir = await mkdtemp(join(tmpdir(), "nf-sec-"));
    const ledger = new JsonlProvenanceLedger(join(dir, "ledger.jsonl"));
    const entry: ProvenanceEntry = {
      requestId: "sec",
      timestamp: new Date(0).toISOString(),
      sourceAssetIds: [],
      locks: [],
      routingDecision: { providerId: "seedream", score: 1, reasons: [] },
      providerId: "seedream",
      model: "seedream",
      parameters: {},
      preflight: { status: "READY", reasons: [] },
      qc: { overall: "PASS", findings: [] },
      repairHistory: [],
      finalAssetIds: [],
      anchorStatus: "NOT_PROMOTED",
      metadata: { debug: "Bearer secret-token-value" }
    };
    await expect(ledger.append(entry)).rejects.toThrow("SECRET_VALUE_REJECTED");
    await rm(dir, { recursive: true, force: true });
  });

  it("fails closed when an exact required model is unavailable", async () => {
    const transport = async () => ({ assetIds: ["out"] });
    const seedream = new SeedreamProvider({ model: "seedream", transport });
    const openai = new OpenAiImageProvider({ model: "gpt-image", transport });
    const request: GenerationRequest = {
      ...baseRequest,
      preferredModel: "gemini-3.5-pro",
      modelRequired: true
    };
    await expect(new ModelRouter().route(request, [seedream, openai])).rejects.toThrow("MODEL_UNAVAILABLE:gemini-3.5-pro");
  });
});
