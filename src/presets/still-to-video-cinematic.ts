import type { WorkflowPreset } from "./types.js";
export const stillToVideoCinematicPreset: WorkflowPreset = {
  id:"STILL_TO_VIDEO_CINEMATIC",
  description:"Reference-anchored still-to-video workflow with explicit camera motion and continuity checks.",
  defaultOperation:"IMAGE_TO_VIDEO",
  defaultQualityTier:"MASTER",
  requiredLocks:[
    {type:"IDENTITY",strength:"HARD",description:"preserve subject identity across frames"},
    {type:"CLOTHING",strength:"HARD",description:"preserve wardrobe continuity"}
  ],
  routingHints:{preferredProviderClass:"CINEMATIC_VIDEO",preferredProviderId:"higgsfield"},
  qcRequirements:["IDENTITY_FIDELITY","CLOTHING","COMPOSITION","LIGHTING_CONSISTENCY","REQUESTED_DELTA_SUCCESS"]
};
