import type { GenerationRequest } from "../domain/types.js";
import type { ImageProvider, ProviderCapabilities, ProviderExecutionPlan, ProviderPreflight, ProviderResult } from "./types.js";
import type { ProviderTransport } from "./transport.js";

export interface FluxProviderOptions { model:string; transport:ProviderTransport; locality?:"LOCAL"|"REMOTE"; }
export class FluxProvider implements ImageProvider {
  readonly id="flux";
  readonly kind="FLUX" as const;
  readonly locality:"LOCAL"|"REMOTE";
  constructor(private readonly options:FluxProviderOptions){this.locality=options.locality??"REMOTE";}
  capabilities():ProviderCapabilities{return{operations:["GENERATE","EDIT","DELTA_EDIT","OUTPAINT","INPAINT"],referenceRoles:["image"],supportsIdentityReferences:true,supportsTextRendering:false,supportsVideo:false,maxResolution:"4k",historicalQcRate:0.86,costRank:3,latencyRank:3};}
  async preflight(request:GenerationRequest):Promise<ProviderPreflight>{return this.capabilities().operations.includes(request.operation)?{status:"READY",reasons:[]}:{status:"UNSUPPORTED",reasons:["OPERATION_UNSUPPORTED"]};}
  async execute(plan:ProviderExecutionPlan):Promise<ProviderResult>{const r=await this.options.transport({model:this.options.model,prompt:plan.compiledPrompt,operation:plan.request.operation,references:plan.request.sourceAssets.map(a=>({id:a.id,uri:a.uri})),locks:plan.request.locks});return{providerId:this.id,model:this.options.model,assetIds:r.assetIds,metadata:{...(r.metadata??{}),...(r.jobId?{jobId:r.jobId}:{})}};}
}
