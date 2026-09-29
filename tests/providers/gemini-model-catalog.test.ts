import { describe, expect, it } from "vitest";
import { GeminiModelCatalog } from "../../src/providers/gemini-model-catalog.js";

describe("GeminiModelCatalog", () => {
  it("resolves verified Gemini image model", () => {
    const catalog = new GeminiModelCatalog();
    expect(catalog.resolve("gemini-3-pro-image", true).modelId).toBe("gemini-3-pro-image");
  });

  it("marks gemini-3.7-flash as reasoning-only", () => {
    const catalog = new GeminiModelCatalog();
    expect(catalog.resolve("gemini-3.7-flash", true).role).toBe("REASONING");
  });

  it("fails closed for unverified gemini-3.5-pro", () => {
    const catalog = new GeminiModelCatalog();
    expect(() => catalog.resolve("gemini-3.5-pro", true)).toThrow("MODEL_UNAVAILABLE");
  });

  it("allows an explicitly configured verified alias target", () => {
    const catalog = new GeminiModelCatalog([
      { alias: "gemini-3.5-pro", modelId: "vendor-verified-gemini-pro", role: "REASONING" }
    ]);
    expect(catalog.resolve("gemini-3.5-pro", true)).toMatchObject({
      requested: "gemini-3.5-pro",
      modelId: "vendor-verified-gemini-pro",
      role: "REASONING",
      source: "CONFIGURED_ALIAS"
    });
  });
});
