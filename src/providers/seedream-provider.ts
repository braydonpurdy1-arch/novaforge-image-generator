import type { GenerationRequest } from "../domain/types.js";
import { redactRemoteText } from "../privacy/remote-redaction.js";
import { normalizeRetention, type ProviderTransport } from "./transport.js";
import type { ImageProvider, ProviderCapabilities, ProviderExecutionPlan, ProviderPreflight, ProviderResult } from "./types.js";

export interface SeedreamProviderOptions { model:string; transport:ProviderTransport; locality?:"LOCAL"|"REMOTE"; }
export class SeedreamProvider implements ImageProvider {
  readonly id="seedream";
  readonly kind="SEEDREAM" as const;
  readonly locality:"LOCAL"|"REMOTE";
  constructor(private readonly options:SeedreamProviderOptions){this.locality=options.locality??"REMOTE";}
  capabilities():ProviderCapabilities{return{operations:["GENERATE","EDIT","DELTA_EDIT","INPAINT","RESTORE"],referenceRoles:["image"],supportsIdentityReferences:true,supportsTextRendering:false,supportsVideo:false,maxResolution:"4k",historicalQcRate:0.9,costRank:3,latencyRank:3};}
  async preflight(request:GenerationRequest):Promise<ProviderPreflight>{if(request.privacyMode==="LOCAL_ONLY"&&this.locality==="REMOTE")return{status:"BLOCKED_BY_POLICY",reasons:["LOCAL_ONLY"]};return this.capabilities().operations.includes(request.operation)?{status:"READY",reasons:[]}:{status:"UNSUPPORTED",reasons:["OPERATION_UNSUPPORTED"]};}
  async execute(plan:ProviderExecutionPlan):Promise<ProviderResult>{
    const prompt=plan.request.privacyMode==="REMOTE_REDACTED"?redactRemoteText(plan.compiledPrompt):plan.compiledPrompt;
    const r=await this.options.transport({payload:{model:this.options.model,prompt,operation:plan.request.operation,aspectRatio:plan.request.outputRequirements?.aspectRatio,references:plan.request.sourceAssets.map(a=>({id:a.id,roles:a.roles})),preserve:plan.request.locks,allowedChanges:plan.request.allowedChanges,parameters:plan.parameters??{}},mediaBindings:plan.request.sourceAssets.map(a=>({id:a.id,uri:a.uri}))});
    return{providerId:this.id,model:this.options.model,assetIds:r.assetIds,metadata:{...(r.metadata??{}),retention:normalizeRetention(r.metadata),...(r.jobId?{jobId:r.jobId}:{})}};
  }
}
