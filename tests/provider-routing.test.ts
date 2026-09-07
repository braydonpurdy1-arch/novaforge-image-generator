import { describe, expect, it } from "vitest";
import {
  FluxProvider,
  GeminiImageProvider,
  HiggsfieldProvider,
  ModelRouter,
  OpenAiImageProvider,
  SeedreamProvider,
  type GenerationRequest
} from "../src/index.js";

const transport = async () => ({ jobId: "job-1", assetIds: ["asset-1"] });
const baseRequest: GenerationRequest = {
  requestId: "r",
  intent: "photoreal portrait",
  operation: "EDIT",
  prompt: "refine only",
  sourceAssets: [{ id: "base", uri: "file://base.png", roles: ["identity"] }],
  locks: [{ lockId: "id", assetId: "base", type: "IDENTITY", scope: "subject:face", description: "preserve", strength: "HARD" }],
  allowedChanges: [],
  forbiddenChanges: [],
  outputRequirements: { qualityTier: "MASTER" },
  qualityTier: "MASTER",
  privacyMode: "REMOTE_ALLOWED",
  taskClass: "PHOTOREAL_STILL",
  requiredIdentitySupport: true
};

describe("provider routing", () => {
  it("prefers Seedream for compatible photoreal still work", async () => {
    const seedream = new SeedreamProvider({ model: "seedream", transport });
    const gemini = new GeminiImageProvider({ model: "gemini-3-pro-image", transport });
    const route = await new ModelRouter().route(baseRequest, [gemini, seedream]);
    expect(route.providerId).toBe("seedream");
  });

  it("prefers Gemini Pro Image for text-accurate typography", async () => {
    const gemini = new GeminiImageProvider({ model: "gemini-3-pro-image", transport });
    const openai = new OpenAiImageProvider({ model: "gpt-image", transport });
    const route = await new ModelRouter().route({
      ...baseRequest,
      taskClass: "TYPOGRAPHY",
      outputRequirements: { qualityTier: "MASTER", requiresTextAccuracy: true }
    }, [openai, gemini]);
    expect(route.providerId).toBe("gemini-image");
  });

  it("routes typography work to a text-capable provider when Gemini is absent", async () => {
    const seedream = new SeedreamProvider({ model: "seedream", transport });
    const openai = new OpenAiImageProvider({ model: "gpt-image", transport });
    const route = await new ModelRouter().route({
      ...baseRequest,
      taskClass: "TYPOGRAPHY",
      outputRequirements: { qualityTier: "MASTER", requiresTextAccuracy: true }
    }, [seedream, openai]);
    expect(route.providerId).toBe("openai-image");
  });

  it("routes an exact required provider only to its provider", async () => {
    const seedream = new SeedreamProvider({ model: "seedream", transport });
    const openai = new OpenAiImageProvider({ model: "gpt-image", transport });

    const route = await new ModelRouter().route({
      ...baseRequest,
      preferredProvider: "openai-image",
      providerRequired: true
    }, [seedream, openai]);

    expect(route.providerId).toBe("openai-image");
    expect(route.reasons).toContain("REQUIRED_PROVIDER_MATCH");
  });

  it("fails closed when a required provider has no configured adapter", async () => {
    const seedream = new SeedreamProvider({ model: "seedream", transport });

    await expect(new ModelRouter().route({
      ...baseRequest,
      preferredProvider: "openai-image",
      providerRequired: true
    }, [seedream])).rejects.toThrow("PROVIDER_UNAVAILABLE:openai-image");
  });

  it("fails closed when providerRequired is set without a provider", async () => {
    const seedream = new SeedreamProvider({ model: "seedream", transport });

    await expect(new ModelRouter().route({
      ...baseRequest,
      providerRequired: true
    }, [seedream])).rejects.toThrow("PROVIDER_REQUIRED_WITHOUT_PROVIDER");
  });

  it("routes an exact required model only to its provider", async () => {
    const seedream = new SeedreamProvider({ model: "seedream", transport });
    const openai = new OpenAiImageProvider({ model: "gpt-image", transport });

    const route = await new ModelRouter().route({
      ...baseRequest,
      preferredModel: "gpt-image",
      modelRequired: true
    }, [seedream, openai]);

    expect(route.providerId).toBe("openai-image");
    expect(route.reasons).toContain("REQUIRED_MODEL_MATCH");
  });

  it("fails closed when a required model has no configured provider", async () => {
    const seedream = new SeedreamProvider({ model: "seedream", transport });
    const openai = new OpenAiImageProvider({ model: "gpt-image", transport });

    await expect(new ModelRouter().route({
      ...baseRequest,
      preferredModel: "gemini-3.5-pro",
      modelRequired: true
    }, [seedream, openai])).rejects.toThrow("MODEL_UNAVAILABLE:gemini-3.5-pro");
  });

  it("fails closed when modelRequired is set without a model", async () => {
    const openai = new OpenAiImageProvider({ model: "gpt-image", transport });

    await expect(new ModelRouter().route({
      ...baseRequest,
      modelRequired: true
    }, [openai])).rejects.toThrow("MODEL_REQUIRED_WITHOUT_MODEL");
  });

  it("allows fallback when a preferred model is not required", async () => {
    const seedream = new SeedreamProvider({ model: "seedream", transport });
    const openai = new OpenAiImageProvider({ model: "gpt-image", transport });

    const route = await new ModelRouter().route({
      ...baseRequest,
      preferredModel: "not-configured",
      modelRequired: false
    }, [openai, seedream]);

    expect(route.providerId).toBe("seedream");
  });

  it("recognizes configured Gemini aliases", () => {
    const gemini = new GeminiImageProvider({ model: "gemini-3-pro-image", transport });
    expect(gemini.supportsModel("gemini-3-pro-image")).toBe(true);
  });

  it("exposes video and outpaint capabilities through specialist adapters", () => {
    const higgsfield = new HiggsfieldProvider({ model: "video", transport });
    const flux = new FluxProvider({ model: "flux", transport });
    expect(higgsfield.capabilities().supportsVideo).toBe(true);
    expect(flux.capabilities().operations).toContain("OUTPAINT");
  });

  it("keeps provider transports secret-free and defaults retention to UNKNOWN", async () => {
    const calls: unknown[] = [];
    const seedream = new SeedreamProvider({
      model: "seedream",
      transport: async payload => { calls.push(payload); return { assetIds: ["asset-1"] }; }
    });
    const result = await seedream.execute({ request: baseRequest, compiledPrompt: "refinement only" });
    expect(JSON.stringify(calls[0])).not.toMatch(/apiKey|authorization|password/i);
    expect(result.metadata.retention).toBe("UNKNOWN");
  });
});
