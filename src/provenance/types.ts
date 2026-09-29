import type { ReferenceLock } from "../domain/types.js";
import type { RoutingDecision } from "../providers/types.js";
import type { QcReport } from "../qc/types.js";
import type { PreflightResult } from "../preflight/generation-preflight.js";

export interface ProvenanceEntry {
  requestId: string;
  timestamp: string;
  sourceAssetIds: string[];
  locks: ReferenceLock[];
  routingDecision: RoutingDecision;
  providerId: string;
  model: string;
  providerJobId?: string;
  parameters: Record<string, unknown>;
  preflight: PreflightResult;
  qc: QcReport;
  repairHistory: Array<Record<string, unknown>>;
  finalAssetIds: string[];
  anchorStatus: string;
  metadata: Record<string, unknown>;
}

export interface ProvenanceLedger {
  append(entry: ProvenanceEntry): Promise<void>;
}
