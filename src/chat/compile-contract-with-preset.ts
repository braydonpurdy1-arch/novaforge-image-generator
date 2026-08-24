import type { AllowedChange, GenerationRequest, ReferenceLock, SourceAsset, TaskClass } from "../domain/types.js";
import type { ChatImageContractResult } from "./chat-image-contract.js";
import type { WorkflowPreset } from "../presets/types.js";

function inferTaskClass(preset: WorkflowPreset): TaskClass {
  switch (preset.routingHints.preferredProviderClass) {
    case "PHOTOREAL_STILL": return "PHOTOREAL_STILL";
    case "TYPOGRAPHY": return "TYPOGRAPHY";
    case "CINEMATIC_VIDEO": return "CINEMATIC_VIDEO";
    default: return "GENERAL";
  }
}

export function compileContractWithPreset(contract: ChatImageContractResult, preset: WorkflowPreset): GenerationRequest {
  const sourceAssets: SourceAsset[] = contract.images.map(image => ({
    id: image.id,
    uri: `chat://${image.id}`,
    roles: contract.locks.some(l => l.assetId === image.id && l.type === "COMPOSITION") ? ["composition"] : ["scene"]
  }));

  const firstAssetId = sourceAssets[0]?.id;
  const requiredLocks: ReferenceLock[] = firstAssetId ? preset.requiredLocks
    .filter(req => !contract.locks.some(existing => existing.type === req.type))
    .map((req, index) => ({
      lockId: `preset-${preset.id.toLowerCase()}-${index}`,
      assetId: firstAssetId,
      type: req.type,
      scope: req.type === "FACE" || req.type === "IDENTITY" ? "subject:face" : req.type === "COMPOSITION" ? "full-frame" : req.type.toLowerCase(),
      description: req.description,
      strength: req.strength
    })) : [];

  const allowedChanges: AllowedChange[] = contract.allowedTargets.map(target => ({
    target,
    transformation: target,
    acceptableVariance: 0.05,
    geometryMayChange: false,
    colorMayChange: true,
    lightingMayChange: false,
    textureMayChange: true
  }));

  const operation = contract.allowedTargets.length > 0 ? "DELTA_EDIT" : preset.defaultOperation;
  const preferredProvider = contract.preferredProviderClass === "SEEDREAM" ? "seedream" : preset.routingHints.preferredProviderId;

  return {
    requestId: `chat-${Date.now()}`,
    intent: contract.rawText,
    operation,
    prompt: contract.rawText,
    sourceAssets,
    locks: [...contract.locks, ...requiredLocks],
    allowedChanges,
    forbiddenChanges: operation === "DELTA_EDIT" ? ["UNSPECIFIED_REGIONS"] : [],
    outputRequirements: {
      qualityTier: preset.defaultQualityTier,
      ...(preset.routingHints.preferredProviderClass === "TYPOGRAPHY" ? { requiresTextAccuracy: true } : {}),
      ...(preset.routingHints.preferredProviderClass === "CINEMATIC_VIDEO" ? { requiresVideo: true } : {})
    },
    ...(preferredProvider ? { preferredProvider } : {}),
    ...(contract.providerRequired ? { providerRequired: true } : {}),
    qualityTier: preset.defaultQualityTier,
    privacyMode: "REMOTE_ALLOWED",
    taskClass: inferTaskClass(preset),
    requiredIdentitySupport: [...contract.locks, ...requiredLocks].some(l => l.type === "FACE" || l.type === "IDENTITY")
  };
}
