import type { AllowedChange, GenerationRequest, PolicyValidation, RawImageRequest, ReferenceLock } from "../domain/types.js";

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
const overlaps = (target: string, lock: ReferenceLock) => {
  const t = normalize(target);
  const scope = normalize(lock.scope);
  if (!t || !scope) return false;
  return t === scope || t.includes(scope) || scope.includes(t) || (lock.type === "FACE" && t.includes("face"));
};

export class ReferencePolicyEngine {
  compile(raw: RawImageRequest): GenerationRequest {
    const allowedChanges: AllowedChange[] = raw.requestedChanges.map(change => ({
      target: change.target,
      transformation: change.transformation,
      acceptableVariance: change.acceptableVariance ?? 0.05,
      geometryMayChange: change.geometryMayChange ?? false,
      colorMayChange: change.colorMayChange ?? true,
      lightingMayChange: change.lightingMayChange ?? false,
      textureMayChange: change.textureMayChange ?? true
    }));
    const forbiddenChanges = raw.operation === "DELTA_EDIT" ? ["UNSPECIFIED_REGIONS"] : [];
    return {
      requestId: raw.requestId,
      intent: raw.intent,
      operation: raw.operation,
      prompt: raw.prompt,
      sourceAssets: [...raw.sourceAssets],
      locks: [...raw.explicitLocks],
      allowedChanges,
      forbiddenChanges,
      outputRequirements: {
        qualityTier: raw.outputRequirements?.qualityTier ?? "STANDARD",
        ...(raw.outputRequirements?.aspectRatio !== undefined ? { aspectRatio: raw.outputRequirements.aspectRatio } : {}),
        ...(raw.outputRequirements?.width !== undefined ? { width: raw.outputRequirements.width } : {}),
        ...(raw.outputRequirements?.height !== undefined ? { height: raw.outputRequirements.height } : {}),
        ...(raw.outputRequirements?.requiresTextAccuracy !== undefined ? { requiresTextAccuracy: raw.outputRequirements.requiresTextAccuracy } : {}),
        ...(raw.outputRequirements?.requiresVideo !== undefined ? { requiresVideo: raw.outputRequirements.requiresVideo } : {})
      },
      qualityTier: raw.outputRequirements?.qualityTier ?? "STANDARD",
      privacyMode: raw.privacyMode,
      ...(raw.preferredProvider !== undefined ? { preferredProvider: raw.preferredProvider } : {}),
      ...(raw.preferredModel !== undefined ? { preferredModel: raw.preferredModel } : {}),
      ...(raw.providerRequired !== undefined ? { providerRequired: raw.providerRequired } : {}),
      ...(raw.taskClass !== undefined ? { taskClass: raw.taskClass } : {})
    };
  }

  validate(request: GenerationRequest): PolicyValidation {
    const reasons: string[] = [];
    for (const change of request.allowedChanges) {
      for (const lock of request.locks) {
        if (lock.strength === "HARD" && overlaps(change.target, lock)) {
          reasons.push(`HARD_LOCK_CONFLICT:${lock.lockId}:${change.target}`);
        }
      }
    }
    const identityAssets = new Set(request.sourceAssets.filter(a => a.roles.includes("identity") || a.roles.includes("face")).map(a => a.id));
    for (const lock of request.locks) {
      if ((lock.type === "IDENTITY" || lock.type === "FACE") && !identityAssets.has(lock.assetId)) {
        reasons.push(`IDENTITY_ROLE_MISMATCH:${lock.assetId}`);
      }
    }
    return reasons.length ? { status: "BLOCKED_BY_POLICY", reasons } : { status: "READY", reasons: [] };
  }
}
