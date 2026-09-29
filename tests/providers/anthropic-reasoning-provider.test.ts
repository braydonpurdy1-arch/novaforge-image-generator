import { describe, expect, it, vi } from "vitest";
import { AnthropicReasoningProvider } from "../../src/index.js";

describe("Anthropic reasoning provider", () => {
  it("pins Claude Opus 5.5 and forwards bounded reasoning options", async () => {
    const transport = vi.fn(async () => ({ text: "analysis" }));
    const provider = new AnthropicReasoningProvider({
      transport,
      effort: "high",
      maxTokens: 16384
    });

    const result = await provider.analyze({
      prompt: "audit the locked visual delta",
      inputAssetIds: ["asset-1"]
    });

    expect(result.text).toBe("analysis");
    expect(transport).toHaveBeenCalledWith({
      model: "claude-opus-5-5",
      prompt: "audit the locked visual delta",
      inputAssetIds: ["asset-1"],
      effort: "high",
      maxTokens: 16384
    });
  });

  it("fails closed for an unapproved model or invalid output bound", () => {
    const transport = async () => ({ text: "unused" });

    expect(() => new AnthropicReasoningProvider({
      transport,
      model: "other"
    })).toThrow("ANTHROPIC_REASONING_MODEL_REQUIRED:other");

    expect(() => new AnthropicReasoningProvider({
      transport,
      maxTokens: 200000
    })).toThrow("ANTHROPIC_INVALID_MAX_TOKENS");
  });
});
