export type ProviderRetention = "EPHEMERAL" | "RETAINED" | "UNKNOWN";

export interface ProviderCopy {
  providerId: string;
  remoteAssetId: string;
  retention: ProviderRetention;
}

export interface AssetRecord {
  id: string;
  sha256: string;
  mediaType: string;
  localPath: string;
  localAvailable: boolean;
  providerCopies: ProviderCopy[];
  createdAt: string;
  updatedAt: string;
}
