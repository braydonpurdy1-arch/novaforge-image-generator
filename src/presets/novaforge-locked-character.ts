import type { WorkflowPreset } from "./types.js";

export const novaforgeLockedCharacterMasterPreset: WorkflowPreset = {
  id: "NOVAFORGE_LOCKED_CHARACTER_MASTER",
  description: "Strict identity-preserving master-character workflow. Unnamed regions remain immutable and QC must verify identity, hair, clothing, materials, anatomy, lighting and the requested delta.",
  defaultOperation: "DELTA_EDIT",
  defaultQualityTier: "MASTER",
  requiredLocks: [
    { type: "IDENTITY", strength: "HARD", description: "preserve character identity" },
    { type: "FACE", strength: "HARD", description: "preserve facial geometry and identity" },
    { type: "CLOTHING", strength: "HARD", description: "preserve locked wardrobe/gown design" },
    { type: "MATERIAL", strength: "HARD", description: "preserve locked material and metallic treatment" },
    { type: "WINGS_OR_APPENDAGE", strength: "HARD", description: "preserve locked tail/appendage design" }
  ],
  routingHints: { preferredProviderClass: "PHOTOREAL_STILL" },
  qcRequirements: [
    "IDENTITY_FIDELITY",
    "FACIAL_GEOMETRY",
    "HAIR",
    "CLOTHING",
    "MATERIALS",
    "ANATOMY",
    "LIGHTING_CONSISTENCY",
    "REFLECTIONS",
    "ARTIFACTS",
    "REQUESTED_DELTA_SUCCESS"
  ],
  allowsIntermediateAutoPromotion: false
};
