import type { GenerationRequest } from "../domain/types.js";
import { redactRemoteText } from "../privacy/remote-redaction.js";
import { normalizeRetention, type ProviderTransport } from "./transport.js";
import type { ImageProvider, ProviderCapabilities, ProviderExecutionPlan, ProviderPreflight, ProviderResult } from "./types.js";

export interface HiggsfieldProviderOptions { model: string; transport: ProviderTransport; locality?: "LOCAL"|"REMOTE"; }
export class HiggsfieldProvider implements ImageProvider {
  readonly id="higgsfield";
  readonly kind="HIGGSFIELD" as const;
  readonly locality:"LOCAL"|"REMOTE";
  constructor(private readonly options:HiggsfieldProviderOptions){this.locality=options.locality??"REMOTE";}
  capabilities():ProviderCapabilities{return{operations:["GENERATE","EDIT","DELTA_EDIT","IMAGE_TO_VIDEO","VIDEO_EDIT","KEYFRAME_TRANSITION"],referenceRoles:["image","start_image","end_image","video","audio","ref_element"],supportsIdentityReferences:true,supportsTextRendering:false,supportsVideo:true,maxResolution:"4k",historicalQcRate:0.87,costRank:4,latencyRank:4};}
  async preflight(request:GenerationRequest):Promise<ProviderPreflight>{if(request.privacyMode==="LOCAL_ONLY"&&this.locality==="REMOTE")return{status:"BLOCKED_BY_POLICY",reasons:["LOCAL_ONLY"]};return this.capabilities().operations.includes(request.operation)?{status:"READY",reasons:[]}:{status:"UNSUPPORTED",reasons:["OPERATION_UNSUPPORTED"]};}
  async execute(plan:ProviderExecutionPlan):Promise<ProviderResult>{
    const prompt=plan.request.privacyMode==="REMOTE_REDACTED"?redactRemoteText(plan.compiledPrompt):plan.compiledPrompt;
    const r=await this.options.transport({payload:{model:this.options.model,prompt,operation:plan.request.operation,references:plan.request.sourceAssets.map(a=>({id:a.id,roles:a.roles})),locks:plan.request.locks,parameters:plan.parameters??{}},mediaBindings:plan.request.sourceAssets.map(a=>({id:a.id,uri:a.uri}))});
    return{providerId:this.id,model:this.options.model,assetIds:r.assetIds,metadata:{...(r.metadata??{}),retention:normalizeRetention(r.metadata),...(r.jobId?{jobId:r.jobId}:{})}};
  }
}
