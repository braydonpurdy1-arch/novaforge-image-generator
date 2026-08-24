import type { LockStrength, LockType, Operation, QualityTier } from "../domain/types.js";
import type { QcCategory } from "../qc/types.js";

export type PresetId = "MEMORIAL_PHOTOREAL"|"LOCKED_FACE_EDIT"|"VEHICLE_VISUALIZER"|"POSTER_TYPOGRAPHY"|"STILL_TO_VIDEO_CINEMATIC";
export interface PresetRequiredLock { type: LockType; strength: LockStrength; description: string; }
export interface WorkflowPreset {
  id: PresetId;
  description: string;
  defaultOperation: Operation;
  defaultQualityTier: QualityTier;
  requiredLocks: PresetRequiredLock[];
  routingHints: { preferredProviderClass: "PHOTOREAL_STILL"|"TYPOGRAPHY"|"CINEMATIC_VIDEO"|"GENERAL"; preferredProviderId?: string; };
  qcRequirements: QcCategory[];
  allowsIntermediateAutoPromotion?: boolean;
}
