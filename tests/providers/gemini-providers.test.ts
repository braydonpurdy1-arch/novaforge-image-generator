import { describe, expect, it } from "vitest";
import {
  GeminiImageProvider,
  GeminiReasoningProvider,
  type ProviderExecutionPlan,
  type ProviderTransportRequest,
  redactRemoteText,
  compileCinematicPrompt
} from "../../src/index.js";

const request = {
  requestId: "req-gemini",
  intent: "edit",
  operation: "EDIT" as const,
  prompt: "Edit /tmp/person.png for user@example.com with Bearer abc123",
  sourceAssets: [{ id: "base", uri: "/tmp/person.png", roles: ["scene" as const] }],
  locks: [],
  allowedChanges: [],
  forbiddenChanges: [],
  outputRequirements: { aspectRatio: "3:4", requiresTextAccuracy: true, requiresVideo: false },
  privacyMode: "REMOTE_REDACTED" as const,
  qualityTier: "MASTER" as const
};

const plan: ProviderExecutionPlan = { request: request as any, compiledPrompt: request.prompt };

describe("Gemini providers", () => {
  it("uses an image model and keeps local URIs out of serialized payload", async () => {
    const calls: ProviderTransportRequest[] = [];
    const provider = new GeminiImageProvider({
      model: "gemini-3-pro-image",
      transport: async input => { calls.push(input); return { assetIds: ["img-1"] }; }
    });
    const result = await provider.execute(plan);
    expect(result.assetIds).toEqual(["img-1"]);
    expect(JSON.stringify(calls[0]?.payload)).not.toContain("/tmp/person.png");
    expect(calls[0]?.mediaBindings?.[0]?.uri).toBe("/tmp/person.png");
  });

  it("refuses a reasoning-only model in the image provider", () => {
    expect(() => new GeminiImageProvider({ model: "gemini-3.7-flash", transport: async () => ({ assetIds: [] }) }))
      .toThrow("GEMINI_IMAGE_MODEL_REQUIRED");
  });

  it("accepts 3.7 Flash for reasoning and rejects image-only models", async () => {
    const reasoning = new GeminiReasoningProvider({ model: "gemini-3.7-flash", transport: async () => ({ text: "ok" }) });
    expect((await reasoning.analyze({ prompt: "inspect" })).text).toBe("ok");
    expect(() => new GeminiReasoningProvider({ model: "gemini-3-pro-image", transport: async () => ({ text: "x" }) }))
      .toThrow("GEMINI_REASONING_MODEL_REQUIRED");
  });
});

describe("shared hardening", () => {
  it("redacts secrets, emails, and local paths for REMOTE_REDACTED", () => {
    const out = redactRemoteText("/tmp/person.png Bearer abc123 user@example.com password=hunter2");
    expect(out).not.toContain("/tmp/");
    expect(out).not.toContain("abc123");
    expect(out).not.toContain("user@example.com");
    expect(out).not.toContain("hunter2");
  });

  it("compiles physics and preservation into cinematic prompts", () => {
    const out = compileCinematicPrompt({
      subject: "angel",
      camera: "tracking",
      lens: "50mm",
      lighting: "warm rim light",
      motion: "turns slowly",
      physics: "fabric and feathers react to acceleration and gravity",
      preserve: ["face", "wings"]
    });
    expect(out).toContain("PHYSICS");
    expect(out).toContain("MUST PRESERVE");
    expect(out).toContain("face");
  });
});
