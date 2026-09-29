export const NOVAFORGE_VISUAL_PROFILE_ID = "novaforge-visual-production-v1" as const;

export const NOVAFORGE_REFERENCE_ROLES = [
  "FACE_ID",
  "EYES",
  "HAIR_FRONT",
  "HAIR_BACK",
  "BODY",
  "RED_FUR",
  "TAIL",
  "GOWN",
  "BRACERS",
  "BOOTS",
  "METALLIC_GOLD",
  "AURA",
  "POSE",
  "BACKGROUND"
] as const;

export type NovaForgeReferenceRole = typeof NOVAFORGE_REFERENCE_ROLES[number];

export interface NovaForgeVisualProfile {
  schemaVersion: 1;
  profileId: typeof NOVAFORGE_VISUAL_PROFILE_ID;
  principles: {
    referenceFidelity: "strict";
    mutationPolicy: "deny-by-default";
    rule: string;
    noSecretEmbedding: true;
    finalUpscaleAfterDesignLock: true;
  };
  referenceRoles: readonly NovaForgeReferenceRole[];
  preferredRouting: {
    precisionEdit: readonly string[];
    rapidIteration: readonly string[];
    identityRecovery: readonly string[];
    multiReferenceComposition: readonly string[];
    stylizedCgiAnime: readonly string[];
    surgicalEdit: readonly string[];
    finalDetail: readonly string[];
    motion: readonly string[];
  };
  qualityTarget: {
    look: string;
    detail: string;
    materials: string;
    lighting: string;
    output: string;
  };
}

export const NOVAFORGE_VISUAL_PROFILE: NovaForgeVisualProfile = Object.freeze({
  schemaVersion: 1,
  profileId: NOVAFORGE_VISUAL_PROFILE_ID,
  principles: {
    referenceFidelity: "strict",
    mutationPolicy: "deny-by-default",
    rule: "Change only explicitly named components. Preserve all other locked components.",
    noSecretEmbedding: true,
    finalUpscaleAfterDesignLock: true
  },
  referenceRoles: NOVAFORGE_REFERENCE_ROLES,
  preferredRouting: {
    precisionEdit: ["gpt-image-2.5-sunburst"],
    rapidIteration: ["gpt-image-2.5-flare"],
    identityRecovery: ["runway-gen4-reference", "higgsfield-soul-2"],
    multiReferenceComposition: ["nano-banana-pro", "nano-banana-2"],
    stylizedCgiAnime: ["seedream-5-pro"],
    surgicalEdit: ["grok-imagine-image-2"],
    finalDetail: ["topaz-image-upscale", "magnific", "recraft-crisp-upscale"],
    motion: ["kling-o3-pro", "seedance-2.5", "runway-gen-4.5", "veo-3.1"]
  },
  qualityTarget: {
    look: "photorealistic cinematic CGI",
    detail: "extreme macro",
    materials: "physically plausible hair fibres, skin pores, fur fibres, metal reflections and fabric texture",
    lighting: "cinematic volumetric light with coherent shadows and reflections",
    output: "highest practical resolution with artifact-aware sharpening"
  }
});
