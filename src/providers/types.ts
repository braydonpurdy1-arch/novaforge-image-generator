import type { GenerationRequest, Operation } from "../domain/types.js";
import type { CostEstimate } from "../cost/cost-policy.js";

export type ProviderLocality = "LOCAL" | "REMOTE";
export type ProviderKind = "SEEDREAM" | "OPENAI_IMAGE" | "GEMINI_IMAGE" | "HIGGSFIELD" | "FLUX" | "GENERIC";
export type ProviderReferenceRole = "image" | "start_image" | "end_image" | "video" | "audio" | "ref_element";

export interface ProviderCapabilities {
  operations: Operation[];
  referenceRoles: ProviderReferenceRole[];
  supportsIdentityReferences: boolean;
  supportsTextRendering: boolean;
  supportsVideo: boolean;
  maxResolution: "1k" | "2k" | "4k";
  historicalQcRate?: number;
  costRank?: number;
  latencyRank?: number;
}

export interface ProviderPreflight { status: "READY" | "UNSUPPORTED" | "BLOCKED_BY_POLICY"; reasons: string[]; estimatedCost?: number; }
export interface ProviderExecutionPlan { request: GenerationRequest; compiledPrompt: string; model?: string; parameters?: Record<string, unknown>; }
export interface ProviderResult { providerId: string; model: string; assetIds: string[]; metadata: Record<string, unknown>; }

export interface ImageProvider {
  id: string;
  locality: ProviderLocality;
  kind?: ProviderKind;
  capabilities(): ProviderCapabilities;
  preflight(request: GenerationRequest): Promise<ProviderPreflight>;
  execute(plan: ProviderExecutionPlan): Promise<ProviderResult>;
  estimateCost?(plan: ProviderExecutionPlan): Promise<CostEstimate | undefined>;
}

export interface RoutingDecision { providerId: string; score: number; reasons: string[]; }
