import type { WorkflowPreset } from "./types.js";
export const memorialPhotorealPreset: WorkflowPreset = {
  id:"MEMORIAL_PHOTOREAL",
  description:"Strict identity/composition photoreal workflow for memorial imagery.",
  defaultOperation:"DELTA_EDIT",
  defaultQualityTier:"MASTER",
  requiredLocks:[
    {type:"IDENTITY",strength:"HARD",description:"preserve identity"},
    {type:"COMPOSITION",strength:"HARD",description:"preserve approved composition"}
  ],
  routingHints:{preferredProviderClass:"PHOTOREAL_STILL",preferredProviderId:"seedream"},
  qcRequirements:["IDENTITY_FIDELITY","FACIAL_GEOMETRY","COMPOSITION","MATERIALS","LIGHTING_CONSISTENCY","REQUESTED_DELTA_SUCCESS"]
};
