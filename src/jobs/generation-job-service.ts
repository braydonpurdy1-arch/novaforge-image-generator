import type { RawImageRequest } from "../domain/types.js";
import type { GenerationOutcome, GenerationRunOptions } from "../orchestration/generation-orchestrator.js";
import { JobRegistry, type JobRecord } from "./job-registry.js";

export interface GenerationRunner {
  run(request: RawImageRequest, options?: GenerationRunOptions): Promise<GenerationOutcome>;
}

export class GenerationJobService {
  private readonly requests = new Map<string, RawImageRequest>();

  constructor(
    private readonly jobs: JobRegistry,
    private readonly runner: GenerationRunner
  ) {}

  get(jobId: string): JobRecord | undefined {
    return this.jobs.get(jobId);
  }

  async submit(request: RawImageRequest): Promise<JobRecord> {
    const job = this.jobs.create(request.requestId);
    this.requests.set(job.id, structuredClone(request));
    this.jobs.transition(job.id, "PREFLIGHT");
    const outcome = await this.runner.run(request);
    return this.applyOutcome(job.id, outcome, false);
  }

  async approveCost(jobId: string, approved: boolean): Promise<JobRecord> {
    const current = this.jobs.get(jobId);
    if (!current) throw new Error(`JOB_NOT_FOUND:${jobId}`);
    if (current.state !== "WAITING_APPROVAL") throw new Error(`JOB_NOT_WAITING_APPROVAL:${jobId}`);
    const request = this.requests.get(jobId);
    if (!request) throw new Error(`JOB_REQUEST_NOT_FOUND:${jobId}`);
    if (!approved) return this.jobs.transition(jobId, "FAILED", { failureReason: "COST_REJECTED" });
    this.jobs.transition(jobId, "RUNNING", { costApproved: true });
    const outcome = await this.runner.run(structuredClone(request), { costApproved: true });
    return this.applyOutcome(jobId, outcome, true);
  }

  private applyOutcome(jobId: string, outcome: GenerationOutcome, alreadyRunning: boolean): JobRecord {
    if (outcome.status === "WAITING_APPROVAL") {
      return this.jobs.transition(jobId, "WAITING_APPROVAL", {
        providerId: outcome.providerId,
        costDecision: outcome.costDecision,
        reasons: outcome.reasons
      });
    }

    if (outcome.status === "PASS" || outcome.status === "WARN") {
      if (!alreadyRunning) this.jobs.transition(jobId, "RUNNING");
      this.jobs.transition(jobId, "QC");
      return this.jobs.transition(jobId, "COMPLETED", {
        outcomeStatus: outcome.status,
        providerId: outcome.providerId,
        model: outcome.model,
        assetIds: outcome.assetIds,
        costDecision: outcome.costDecision
      });
    }

    return this.jobs.transition(jobId, "FAILED", {
      outcomeStatus: outcome.status,
      providerId: outcome.providerId,
      reasons: outcome.reasons
    });
  }
}
