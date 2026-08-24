import type { GenerationRequest } from "../domain/types.js";
import type { ImageProvider, ProviderCapabilities, ProviderExecutionPlan, ProviderPreflight, ProviderResult } from "./types.js";
import type { ProviderTransport } from "./transport.js";

export interface SeedreamProviderOptions { model: string; transport: ProviderTransport; locality?: "LOCAL"|"REMOTE"; }

export class SeedreamProvider implements ImageProvider {
  readonly id = "seedream";
  readonly kind = "SEEDREAM" as const;
  readonly locality: "LOCAL"|"REMOTE";
  constructor(private readonly options: SeedreamProviderOptions) { this.locality = options.locality ?? "REMOTE"; }
  capabilities(): ProviderCapabilities {
    return { operations:["GENERATE","EDIT","DELTA_EDIT","INPAINT","RESTORE"], referenceRoles:["image"], supportsIdentityReferences:true, supportsTextRendering:false, supportsVideo:false, maxResolution:"4k", historicalQcRate:0.9, costRank:3, latencyRank:3 };
  }
  async preflight(request: GenerationRequest): Promise<ProviderPreflight> {
    return this.capabilities().operations.includes(request.operation) ? {status:"READY",reasons:[]} : {status:"UNSUPPORTED",reasons:["OPERATION_UNSUPPORTED"]};
  }
  async execute(plan: ProviderExecutionPlan): Promise<ProviderResult> {
    const payload: Record<string, unknown> = {
      model: this.options.model,
      prompt: plan.compiledPrompt,
      aspectRatio: plan.request.outputRequirements.aspectRatio,
      references: plan.request.sourceAssets.map(a => ({id:a.id,uri:a.uri,roles:a.roles})),
      preserve: plan.request.locks.filter(l => l.strength === "HARD").map(l => ({type:l.type,scope:l.scope,description:l.description})),
      allowedChanges: plan.request.allowedChanges
    };
    const response = await this.options.transport(payload);
    return { providerId:this.id, model:this.options.model, assetIds:response.assetIds, metadata:{...(response.metadata ?? {}), ...(response.jobId ? {jobId:response.jobId} : {})} };
  }
}
