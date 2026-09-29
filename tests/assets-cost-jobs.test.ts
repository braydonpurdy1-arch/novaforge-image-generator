import { access, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { JobRegistry, LocalAssetRegistry, evaluateCostPolicy } from "../src/index.js";

describe("assets, cost, and job state", () => {
  it("hashes local assets and preserves provider retention metadata after local deletion", async () => {
    const dir = await mkdtemp(join(tmpdir(), "nf-asset-"));
    const source = join(dir, "image.bin");
    const registryFile = join(dir, "registry.json");
    await writeFile(source, Buffer.from("novaforge-test"));
    const registry = new LocalAssetRegistry(registryFile);
    const record = await registry.register({ path: source, mediaType: "image/png" });
    expect(record.id).toMatch(/^asset_/);
    expect(record.sha256).toMatch(/^[a-f0-9]{64}$/);
    await registry.recordProviderCopy(record.id, { providerId: "seedream", remoteAssetId: "remote-1", retention: "UNKNOWN" });
    const deleted = await registry.deleteLocalCache(record.id);
    expect(deleted.localAvailable).toBe(false);
    expect(deleted.providerCopies[0]?.retention).toBe("UNKNOWN");
    await expect(access(source)).rejects.toThrow();
  });

  it("requires explicit approval when estimated generation cost exceeds budget", () => {
    expect(evaluateCostPolicy({ budgetCredits: 20 }, { amount: 8, unit: "credits" }, false).status).toBe("ALLOWED");
    expect(evaluateCostPolicy({ budgetCredits: 20 }, { amount: 35, unit: "credits" }, false).status).toBe("REQUIRES_APPROVAL");
    expect(evaluateCostPolicy({ budgetCredits: 20 }, { amount: 35, unit: "credits" }, true).status).toBe("ALLOWED");
    expect(evaluateCostPolicy({ budgetCredits: 20 }, undefined, false).reasons).toContain("COST_ESTIMATE_UNAVAILABLE");
  });

  it("rejects backward job transitions from a terminal state", () => {
    const jobs = new JobRegistry();
    const job = jobs.create("req-1");
    jobs.transition(job.id, "RUNNING");
    jobs.transition(job.id, "COMPLETED");
    expect(() => jobs.transition(job.id, "RUNNING")).toThrow("INVALID_JOB_TRANSITION");
  });
});
