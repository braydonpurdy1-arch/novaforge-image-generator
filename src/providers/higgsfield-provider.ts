import type { GenerationRequest } from "../domain/types.js";
import type { ImageProvider, ProviderCapabilities, ProviderExecutionPlan, ProviderPreflight, ProviderResult } from "./types.js";
import type { ProviderTransport } from "./transport.js";

export interface HiggsfieldProviderOptions { model: string; transport: ProviderTransport; locality?: "LOCAL"|"REMOTE"; }
export class HiggsfieldProvider implements ImageProvider {
  readonly id="higgsfield";
  readonly kind="HIGGSFIELD" as const;
  readonly locality:"LOCAL"|"REMOTE";
  constructor(private readonly options:HiggsfieldProviderOptions){this.locality=options.locality??"REMOTE";}
  capabilities():ProviderCapabilities{return{operations:["GENERATE","EDIT","DELTA_EDIT","IMAGE_TO_VIDEO","VIDEO_EDIT","KEYFRAME_TRANSITION"],referenceRoles:["image","start_image","end_image","video","audio","ref_element"],supportsIdentityReferences:true,supportsTextRendering:false,supportsVideo:true,maxResolution:"4k",historicalQcRate:0.87,costRank:4,latencyRank:4};}
  async preflight(request:GenerationRequest):Promise<ProviderPreflight>{return this.capabilities().operations.includes(request.operation)?{status:"READY",reasons:[]}:{status:"UNSUPPORTED",reasons:["OPERATION_UNSUPPORTED"]};}
  async execute(plan:ProviderExecutionPlan):Promise<ProviderResult>{const r=await this.options.transport({model:this.options.model,prompt:plan.compiledPrompt,operation:plan.request.operation,references:plan.request.sourceAssets.map(a=>({id:a.id,uri:a.uri,roles:a.roles})),locks:plan.request.locks});return{providerId:this.id,model:this.options.model,assetIds:r.assetIds,metadata:{...(r.metadata??{}),...(r.jobId?{jobId:r.jobId}:{})}};}
}
