export type ProviderRetention = "EPHEMERAL" | "RETAINED" | "UNKNOWN";

export interface ProviderMediaBinding { id: string; uri: string; }
export interface ProviderTransportRequest {
  payload: Record<string, unknown>;
  mediaBindings?: ProviderMediaBinding[];
}
export interface TransportResponse {
  jobId?: string;
  assetIds: string[];
  metadata?: Record<string, unknown>;
}
export type ProviderTransport = (request: ProviderTransportRequest) => Promise<TransportResponse>;

export function normalizeRetention(metadata?: Record<string, unknown>): ProviderRetention {
  const value = metadata?.retention;
  return value === "EPHEMERAL" || value === "RETAINED" || value === "UNKNOWN" ? value : "UNKNOWN";
}
