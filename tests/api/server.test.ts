import { expect, it } from "vitest";
import { buildServer, type AssetRecord, type JobRecord, type RawImageRequest } from "../../src/index.js";

const now = new Date(0).toISOString();
const rawRequest: RawImageRequest = {
  requestId: "req-1",
  intent: "edit",
  operation: "EDIT",
  prompt: "edit",
  sourceAssets: [{ id: "base", uri: "file://base", roles: ["scene"] }],
  explicitLocks: [],
  requestedChanges: [],
  privacyMode: "REMOTE_ALLOWED"
};

it("submits a generation and returns an opaque job id", async () => {
  const job: JobRecord = { id: "job_123", requestId: "req-1", state: "QUEUED", createdAt: now, updatedAt: now, metadata: {} };
  const app = buildServer({
    generationJobs: { submit: async () => job, get: () => job, approveCost: async () => job },
    assets: { deleteLocalCache: async () => { throw new Error("unused"); } }
  });
  const response = await app.inject({ method: "POST", url: "/v1/generations", payload: rawRequest });
  expect(response.statusCode).toBe(202);
  expect(response.json().jobId).toMatch(/^job_/);
  await app.close();
});

it("does not expose local paths or arbitrary private job metadata", async () => {
  const job: JobRecord = {
    id: "job_123",
    requestId: "req-1",
    state: "COMPLETED",
    createdAt: now,
    updatedAt: now,
    metadata: { providerId: "seedream", assetIds: ["asset_1"], providerRetention: "UNKNOWN", localPath: "/tmp/private.png", token: "secret" }
  };
  const app = buildServer({
    generationJobs: { submit: async () => job, get: () => job, approveCost: async () => job },
    assets: { deleteLocalCache: async () => { throw new Error("unused"); } }
  });
  const response = await app.inject({ method: "GET", url: "/v1/jobs/job_123" });
  const serialized = JSON.stringify(response.json());
  expect(response.statusCode).toBe(200);
  expect(serialized).not.toContain("/tmp/");
  expect(serialized).not.toContain("secret");
  expect(response.json().providerRetention).toBe("UNKNOWN");
  await app.close();
});

it("deletes only local cache and never returns the local filesystem path", async () => {
  const job: JobRecord = { id: "job_123", requestId: "req-1", state: "QUEUED", createdAt: now, updatedAt: now, metadata: {} };
  const asset: AssetRecord = {
    id: "asset_1",
    sha256: "a".repeat(64),
    mediaType: "image/png",
    localPath: "/tmp/private.png",
    localAvailable: false,
    providerCopies: [{ providerId: "seedream", remoteAssetId: "remote-1", retention: "UNKNOWN" }],
    createdAt: now,
    updatedAt: now
  };
  const app = buildServer({
    generationJobs: { submit: async () => job, get: () => job, approveCost: async () => job },
    assets: { deleteLocalCache: async () => asset }
  });
  const response = await app.inject({ method: "DELETE", url: "/v1/assets/asset_1/cache" });
  const serialized = JSON.stringify(response.json());
  expect(response.statusCode).toBe(200);
  expect(serialized).not.toContain("localPath");
  expect(serialized).not.toContain("/tmp/");
  expect(response.json().providerCopies[0].retention).toBe("UNKNOWN");
  await app.close();
});
