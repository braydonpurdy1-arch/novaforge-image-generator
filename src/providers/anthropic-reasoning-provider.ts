export type AnthropicEffort = "low" | "medium" | "high" | "xhigh" | "max";

export interface AnthropicReasoningRequest {
  prompt: string;
  inputAssetIds?: string[];
}

export interface AnthropicReasoningResponse {
  text: string;
  metadata?: Record<string, unknown>;
}

export type AnthropicReasoningTransport = (request: {
  model: "claude-opus-5-5";
  prompt: string;
  inputAssetIds?: string[];
  effort: AnthropicEffort;
  maxTokens: number;
}) => Promise<AnthropicReasoningResponse>;

export interface AnthropicReasoningProviderOptions {
  model?: string;
  effort?: AnthropicEffort;
  maxTokens?: number;
  transport: AnthropicReasoningTransport;
}

const EFFORTS = new Set<AnthropicEffort>(["low", "medium", "high", "xhigh", "max"]);

export class AnthropicReasoningProvider {
  readonly id = "anthropic-reasoning";
  readonly model = "claude-opus-5-5" as const;
  readonly effort: AnthropicEffort;
  readonly maxTokens: number;

  constructor(private readonly options: AnthropicReasoningProviderOptions) {
    const requestedModel = options.model ?? this.model;
    if (requestedModel !== this.model) throw new Error(`ANTHROPIC_REASONING_MODEL_REQUIRED:${requestedModel}`);

    this.effort = options.effort ?? "medium";
    if (!EFFORTS.has(this.effort)) throw new Error("ANTHROPIC_INVALID_EFFORT");

    this.maxTokens = options.maxTokens ?? 8192;
    if (!Number.isInteger(this.maxTokens) || this.maxTokens < 512 || this.maxTokens > 128000) {
      throw new Error("ANTHROPIC_INVALID_MAX_TOKENS");
    }
  }

  analyze(request: AnthropicReasoningRequest): Promise<AnthropicReasoningResponse> {
    return this.options.transport({
      model: this.model,
      prompt: request.prompt,
      ...(request.inputAssetIds ? { inputAssetIds: request.inputAssetIds } : {}),
      effort: this.effort,
      maxTokens: this.maxTokens
    });
  }
}
