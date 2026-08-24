export type Operation =
  | "GENERATE" | "EDIT" | "DELTA_EDIT" | "OUTPAINT" | "INPAINT"
  | "UPSCALE" | "RESTORE" | "STYLE_TRANSFER" | "IMAGE_TO_VIDEO"
  | "VIDEO_EDIT" | "KEYFRAME_TRANSITION";

export type LockType =
  | "IDENTITY" | "FACE" | "POSE" | "COMPOSITION" | "CAMERA" | "BACKGROUND"
  | "LIGHTING" | "COLOR_GRADE" | "CLOTHING" | "OBJECT" | "REGION" | "TEXT"
  | "MATERIAL" | "WINGS_OR_APPENDAGE" | "VEHICLE_BODY" | "CUSTOM";
export type LockStrength = "HARD" | "SOFT";
export type PrivacyMode = "LOCAL_ONLY" | "REMOTE_ALLOWED" | "REMOTE_REDACTED";
export type QualityTier = "DRAFT" | "STANDARD" | "MASTER";
export type SourceRole = "identity" | "face" | "profile" | "hair" | "expression" | "clothing" | "pose" | "composition" | "scene" | "object";
export type TaskClass = "PHOTOREAL_STILL" | "TYPOGRAPHY" | "CINEMATIC_VIDEO" | "OUTPAINT" | "GENERAL";

export interface SourceAsset {
  id: string;
  uri: string;
  roles: SourceRole[];
  hash?: string;
}

export interface ReferenceLock {
  lockId: string;
  assetId: string;
  type: LockType;
  scope: string;
  description: string;
  strength: LockStrength;
  region?: { x: number; y: number; width: number; height: number };
  maskAssetId?: string;
}

export interface AllowedChange {
  target: string;
  transformation: string;
  acceptableVariance: number;
  geometryMayChange: boolean;
  colorMayChange: boolean;
  lightingMayChange: boolean;
  textureMayChange: boolean;
}

export interface OutputRequirements {
  aspectRatio?: string;
  width?: number;
  height?: number;
  qualityTier: QualityTier;
  requiresTextAccuracy?: boolean;
  requiresVideo?: boolean;
}

export interface GenerationRequest {
  requestId: string;
  intent: string;
  operation: Operation;
  prompt: string;
  sourceAssets: SourceAsset[];
  locks: ReferenceLock[];
  allowedChanges: AllowedChange[];
  forbiddenChanges: string[];
  outputRequirements: OutputRequirements;
  preferredProvider?: string;
  preferredModel?: string;
  providerRequired?: boolean;
  qualityTier: QualityTier;
  privacyMode: PrivacyMode;
  taskClass?: TaskClass;
  requiredReferenceRoles?: string[];
  requiredIdentitySupport?: boolean;
}

export interface RawRequestedChange {
  target: string;
  transformation: string;
  acceptableVariance?: number;
  geometryMayChange?: boolean;
  colorMayChange?: boolean;
  lightingMayChange?: boolean;
  textureMayChange?: boolean;
}

export interface RawImageRequest {
  requestId: string;
  intent: string;
  operation: Operation;
  prompt: string;
  sourceAssets: SourceAsset[];
  explicitLocks: ReferenceLock[];
  requestedChanges: RawRequestedChange[];
  privacyMode: PrivacyMode;
  outputRequirements?: Partial<OutputRequirements>;
  preferredProvider?: string;
  preferredModel?: string;
  providerRequired?: boolean;
  taskClass?: TaskClass;
}

export type PolicyValidationStatus = "READY" | "BLOCKED_BY_POLICY" | "NEEDS_USER_INPUT";
export interface PolicyValidation { status: PolicyValidationStatus; reasons: string[]; }
