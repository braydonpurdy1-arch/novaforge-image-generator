import Fastify, { type FastifyInstance } from "fastify";
import type { AssetRecord, ProviderRetention } from "../assets/types.js";
import type { RawImageRequest } from "../domain/types.js";
import type { JobRecord } from "../jobs/job-registry.js";

export interface GenerationJobsApi {
  submit(request: RawImageRequest): Promise<JobRecord>;
  get(jobId: string): JobRecord | undefined;
  approveCost(jobId: string, approved: boolean): Promise<JobRecord>;
}

export interface AssetCacheApi {
  deleteLocalCache(assetId: string): Promise<AssetRecord>;
}

export interface ServerDependencies {
  generationJobs: GenerationJobsApi;
  assets: AssetCacheApi;
}

const retentionValues = new Set<ProviderRetention>(["EPHEMERAL", "RETAINED", "UNKNOWN"]);

function publicJob(job: JobRecord) {
  const metadata = job.metadata;
  const response: Record<string, unknown> = {
    jobId: job.id,
    requestId: job.requestId,
    state: job.state,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt
  };

  if (typeof metadata.providerId === "string") response.providerId = metadata.providerId;
  if (typeof metadata.model === "string") response.model = metadata.model;
  if (typeof metadata.outcomeStatus === "string") response.outcomeStatus = metadata.outcomeStatus;
  if (Array.isArray(metadata.assetIds) && metadata.assetIds.every(v => typeof v === "string")) response.assetIds = [...metadata.assetIds];
  if (Array.isArray(metadata.reasons) && metadata.reasons.every(v => typeof v === "string")) response.reasons = [...metadata.reasons];
  if (metadata.costDecision && typeof metadata.costDecision === "object") response.costDecision = structuredClone(metadata.costDecision);
  if (typeof metadata.providerRetention === "string" && retentionValues.has(metadata.providerRetention as ProviderRetention)) {
    response.providerRetention = metadata.providerRetention;
  }
  if (typeof metadata.failureReason === "string") response.failureReason = metadata.failureReason;
  return response;
}

function publicAsset(asset: AssetRecord) {
  return {
    assetId: asset.id,
    sha256: asset.sha256,
    mediaType: asset.mediaType,
    localAvailable: asset.localAvailable,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
    providerCopies: asset.providerCopies.map(copy => ({
      providerId: copy.providerId,
      remoteAssetId: copy.remoteAssetId,
      retention: copy.retention
    }))
  };
}

function isRawImageRequest(value: unknown): value is RawImageRequest {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<RawImageRequest>;
  return typeof v.requestId === "string"
    && typeof v.intent === "string"
    && typeof v.operation === "string"
    && typeof v.prompt === "string"
    && Array.isArray(v.sourceAssets)
    && Array.isArray(v.explicitLocks)
    && Array.isArray(v.requestedChanges)
    && typeof v.privacyMode === "string";
}

function errorCode(error: unknown): { status: number; code: string } {
  const message = error instanceof Error ? error.message : "INTERNAL_ERROR";
  if (message.startsWith("JOB_NOT_FOUND:") || message.startsWith("ASSET_NOT_FOUND:")) return { status: 404, code: message.split(":")[0]! };
  if (message.startsWith("JOB_NOT_WAITING_APPROVAL:")) return { status: 409, code: "JOB_NOT_WAITING_APPROVAL" };
  if (message.startsWith("JOB_REQUEST_NOT_FOUND:")) return { status: 409, code: "JOB_REQUEST_NOT_FOUND" };
  return { status: 500, code: "INTERNAL_ERROR" };
}

export function buildServer(deps: ServerDependencies): FastifyInstance {
  const app = Fastify({ logger: false });

  app.post<{ Body: RawImageRequest }>("/v1/generations", async (request, reply) => {
    if (!isRawImageRequest(request.body)) return reply.code(400).send({ error: "INVALID_GENERATION_REQUEST" });
    try {
      const job = await deps.generationJobs.submit(request.body);
      return reply.code(202).send(publicJob(job));
    } catch (error) {
      const mapped = errorCode(error);
      return reply.code(mapped.status).send({ error: mapped.code });
    }
  });

  app.get<{ Params: { id: string } }>("/v1/jobs/:id", async (request, reply) => {
    const job = deps.generationJobs.get(request.params.id);
    if (!job) return reply.code(404).send({ error: "JOB_NOT_FOUND" });
    return reply.code(200).send(publicJob(job));
  });

  app.post<{ Params: { id: string }; Body: { approved?: unknown } }>("/v1/jobs/:id/approve-cost", async (request, reply) => {
    if (typeof request.body?.approved !== "boolean") return reply.code(400).send({ error: "INVALID_APPROVAL" });
    try {
      const job = await deps.generationJobs.approveCost(request.params.id, request.body.approved);
      return reply.code(200).send(publicJob(job));
    } catch (error) {
      const mapped = errorCode(error);
      return reply.code(mapped.status).send({ error: mapped.code });
    }
  });

  app.delete<{ Params: { id: string } }>("/v1/assets/:id/cache", async (request, reply) => {
    try {
      const asset = await deps.assets.deleteLocalCache(request.params.id);
      return reply.code(200).send(publicAsset(asset));
    } catch (error) {
      const mapped = errorCode(error);
      return reply.code(mapped.status).send({ error: mapped.code });
    }
  });

  return app;
}
