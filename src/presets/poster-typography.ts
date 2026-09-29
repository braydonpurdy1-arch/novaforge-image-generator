import type { WorkflowPreset } from "./types.js";
export const posterTypographyPreset: WorkflowPreset = {
  id:"POSTER_TYPOGRAPHY",
  description:"Poster workflow where rendered text accuracy is a hard output criterion.",
  defaultOperation:"EDIT",
  defaultQualityTier:"MASTER",
  requiredLocks:[],
  routingHints:{preferredProviderClass:"TYPOGRAPHY"},
  qcRequirements:["TEXT_ACCURACY","COMPOSITION","REQUESTED_DELTA_SUCCESS"]
};
