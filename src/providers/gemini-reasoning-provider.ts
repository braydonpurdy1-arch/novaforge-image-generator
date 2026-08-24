import { GeminiModelCatalog } from "./gemini-model-catalog.js";

export interface GeminiReasoningRequest { prompt: string; inputAssetIds?: string[]; }
export interface GeminiReasoningResponse { text: string; metadata?: Record<string, unknown>; }
export type GeminiReasoningTransport = (request: { model: string; prompt: string; inputAssetIds?: string[] }) => Promise<GeminiReasoningResponse>;

export interface GeminiReasoningProviderOptions {
  model: string;
  transport: GeminiReasoningTransport;
  catalog?: GeminiModelCatalog;
}

export class GeminiReasoningProvider {
  readonly id = "gemini-reasoning";
  readonly model: string;

  constructor(private readonly options: GeminiReasoningProviderOptions) {
    const descriptor = (options.catalog ?? new GeminiModelCatalog()).resolve(options.model, true);
    if (descriptor.role !== "REASONING" || !descriptor.modelId) throw new Error(`GEMINI_REASONING_MODEL_REQUIRED:${options.model}`);
    this.model = descriptor.modelId;
  }

  analyze(request: GeminiReasoningRequest): Promise<GeminiReasoningResponse> {
    return this.options.transport({ model: this.model, prompt: request.prompt, inputAssetIds: request.inputAssetIds });
  }
}
