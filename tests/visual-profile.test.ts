import { describe, expect, it } from "vitest";
import {
  NOVAFORGE_REFERENCE_ROLES,
  NOVAFORGE_VISUAL_PROFILE,
  PresetRegistry,
  novaforgeLockedCharacterMasterPreset
} from "../src/index.js";

describe("NovaForge canonical visual profile", () => {
  it("uses strict reference fidelity and deny-by-default mutations", () => {
    expect(NOVAFORGE_VISUAL_PROFILE.principles.referenceFidelity).toBe("strict");
    expect(NOVAFORGE_VISUAL_PROFILE.principles.mutationPolicy).toBe("deny-by-default");
    expect(NOVAFORGE_VISUAL_PROFILE.principles.finalUpscaleAfterDesignLock).toBe(true);
  });

  it("contains the protected component roles", () => {
    expect(NOVAFORGE_REFERENCE_ROLES).toEqual(expect.arrayContaining([
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
    ]));
  });

  it("registers the locked-character master preset", () => {
    const preset = new PresetRegistry().get("NOVAFORGE_LOCKED_CHARACTER_MASTER");
    expect(preset).toEqual(novaforgeLockedCharacterMasterPreset);
    expect(preset.defaultOperation).toBe("DELTA_EDIT");
    expect(preset.allowsIntermediateAutoPromotion).toBe(false);
  });

  it("separates precision editing, identity recovery and final-detail routing", () => {
    expect(NOVAFORGE_VISUAL_PROFILE.preferredRouting.precisionEdit).toContain("gpt-image-2.5-sunburst");
    expect(NOVAFORGE_VISUAL_PROFILE.preferredRouting.identityRecovery).toEqual(expect.arrayContaining([
      "runway-gen4-reference",
      "higgsfield-soul-2"
    ]));
    expect(NOVAFORGE_VISUAL_PROFILE.preferredRouting.finalDetail).not.toContain("gpt-image-2.5-sunburst");
  });
});
