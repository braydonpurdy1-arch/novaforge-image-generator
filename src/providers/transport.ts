export interface TransportResponse { jobId?: string; assetIds: string[]; metadata?: Record<string, unknown>; }
export type ProviderTransport = (payload: Record<string, unknown>) => Promise<TransportResponse>;
