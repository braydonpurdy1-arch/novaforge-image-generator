import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  GenerationQcEngine,
  JsonlProvenanceLedger,
  planRepair,
  type GenerationRequest,
  type ProvenanceEntry
} from "../src/index.js";

const request: GenerationRequest = {
  requestId: "r",
  intent: "edit",
  operation: "EDIT",
  prompt: "edit",
  sourceAssets: [{ id: "base", uri: "file://base.png", roles: ["face"] }],
  locks: [{ lockId: "face", assetId: "base", type: "FACE", scope: "subject:face", description: "locked", strength: "HARD" }],
  allowedChanges: [],
  forbiddenChanges: [],
  outputRequirements: { qualityTier: "MASTER" },
  qualityTier: "MASTER",
  privacyMode: "REMOTE_ALLOWED"
};

const result = { providerId: "seedream", model: "seedream", assetIds: ["out"], metadata: {} };

describe("QC and provenance", () => {
  it("fails the generation when a hard facial lock fails", async () => {
    const report = await new GenerationQcEngine().evaluate(request, result, [
      async () => ({ category: "FACIAL_GEOMETRY", status: "FAIL", confidence: 0.99, notes: ["jawline drift"], hardLockAffected: true })
    ]);
    expect(report.overall).toBe("FAIL");
    expect(planRepair(request, report).relaxLocks).toEqual([]);
  });

  it("appends JSONL provenance and rejects secret-like fields", async () => {
    const dir = await mkdtemp(join(tmpdir(), "novaforge-"));
    const path = join(dir, "ledger.jsonl");
    const ledger = new JsonlProvenanceLedger(path);
    const entry: ProvenanceEntry = {
      requestId: "r",
      timestamp: new Date(0).toISOString(),
      sourceAssetIds: ["base"],
      locks: request.locks,
      routingDecision: { providerId: "seedream", score: 42, reasons: ["fit"] },
      providerId: "seedream",
      model: "seedream",
      parameters: {},
      preflight: { status: "READY", reasons: [] },
      qc: { overall: "PASS", findings: [] },
      repairHistory: [],
      finalAssetIds: ["out"],
      anchorStatus: "NOT_PROMOTED",
      metadata: {}
    };
    await ledger.append(entry);
    expect((await readFile(path, "utf8")).trim().split("\n")).toHaveLength(1);
    await expect(ledger.append({ ...entry, metadata: { apiKey: "secret" } })).rejects.toThrow("SECRET_FIELD_REJECTED");
    await rm(dir, { recursive: true, force: true });
  });
});
