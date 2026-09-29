import { randomUUID } from "node:crypto";

export type JobState = "QUEUED" | "PREFLIGHT" | "WAITING_APPROVAL" | "RUNNING" | "QC" | "COMPLETED" | "FAILED";
export interface JobRecord {
  id: string;
  requestId: string;
  state: JobState;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

const transitions: Record<JobState, readonly JobState[]> = {
  QUEUED: ["PREFLIGHT", "RUNNING", "FAILED"],
  PREFLIGHT: ["WAITING_APPROVAL", "RUNNING", "FAILED"],
  WAITING_APPROVAL: ["RUNNING", "FAILED"],
  RUNNING: ["QC", "COMPLETED", "FAILED"],
  QC: ["COMPLETED", "FAILED"],
  COMPLETED: [],
  FAILED: []
};

export class JobRegistry {
  private readonly jobs = new Map<string, JobRecord>();

  create(requestId: string, metadata: Record<string, unknown> = {}): JobRecord {
    const now = new Date().toISOString();
    const job: JobRecord = {
      id: `job_${randomUUID().replace(/-/g, "")}`,
      requestId,
      state: "QUEUED",
      createdAt: now,
      updatedAt: now,
      metadata: { ...metadata }
    };
    this.jobs.set(job.id, job);
    return structuredClone(job);
  }

  get(id: string): JobRecord | undefined {
    const job = this.jobs.get(id);
    return job ? structuredClone(job) : undefined;
  }

  transition(id: string, next: JobState, metadata?: Record<string, unknown>): JobRecord {
    const job = this.jobs.get(id);
    if (!job) throw new Error(`JOB_NOT_FOUND:${id}`);
    if (!transitions[job.state].includes(next)) throw new Error(`INVALID_JOB_TRANSITION:${job.state}->${next}`);
    job.state = next;
    job.updatedAt = new Date().toISOString();
    if (metadata) job.metadata = { ...job.metadata, ...metadata };
    return structuredClone(job);
  }
}
