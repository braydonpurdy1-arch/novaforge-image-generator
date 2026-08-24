import { describe, expect, it } from "vitest";
import {
  ReferencePolicyEngine,
  PresetRegistry,
  compileContractWithPreset,
  parseChatImageInstruction,
  normalizePrompt
} from "../src/index.js";

describe("NovaForge strict reference policy", () => {
  it("preserves unspecified regions in delta edit mode", () => {
    const engine = new ReferencePolicyEngine();
    const request = engine.compile({
      requestId: "r1",
      intent: "change stairs only",
      operation: "DELTA_EDIT",
      prompt: "make the stairs marble",
      sourceAssets: [{ id: "base", uri: "file://base.png", roles: ["composition"] }],
      explicitLocks: [],
      requestedChanges: [{ target: "stairs", transformation: "white marble" }],
      privacyMode: "REMOTE_ALLOWED"
    });
    expect(request.forbiddenChanges).toContain("UNSPECIFIED_REGIONS");
  });

  it("blocks a requested edit that overlaps a hard face lock", () => {
    const engine = new ReferencePolicyEngine();
    const request = engine.compile({
      requestId: "r2",
      intent: "change face",
      operation: "DELTA_EDIT",
      prompt: "change face",
      sourceAssets: [{ id: "base", uri: "file://base.png", roles: ["face"] }],
      explicitLocks: [{ lockId: "face", assetId: "base", type: "FACE", scope: "subject:face", description: "locked", strength: "HARD" }],
      requestedChanges: [{ target: "subject:face", transformation: "change" }],
      privacyMode: "REMOTE_ALLOWED"
    });
    expect(engine.validate(request).status).toBe("BLOCKED_BY_POLICY");
  });

  it("compiles locked-base chat instructions into compatible identity roles", () => {
    const contract = parseChatImageInstruction({
      text: "Use image 1 as locked base. Do not change his face. Seedream mode. Only change the stairs.",
      images: [{ id: "image-1", ordinal: 1 }]
    });
    const request = compileContractWithPreset(contract, new PresetRegistry().get("MEMORIAL_PHOTOREAL"));
    expect(request.preferredProvider).toBe("seedream");
    expect(request.operation).toBe("DELTA_EDIT");
    expect(request.sourceAssets[0]?.roles).toEqual(expect.arrayContaining(["composition", "face", "identity"]));
    expect(new ReferencePolicyEngine().validate(request).status).toBe("READY");
  });

  it("does not reinterpret a locked face for ambiguous cleanup language", () => {
    const result = normalizePrompt("clean it up and sharpen it", ["subject:face"]);
    expect(result.prohibitedInferences).toEqual(expect.arrayContaining([
      "retouch:subject:face",
      "relight:subject:face",
      "smooth:subject:face",
      "reshape:subject:face"
    ]));
  });
});
