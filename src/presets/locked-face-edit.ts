import type { WorkflowPreset } from "./types.js";
export const lockedFaceEditPreset: WorkflowPreset = {
  id:"LOCKED_FACE_EDIT",
  description:"Smallest-possible edit while preserving facial identity exactly.",
  defaultOperation:"DELTA_EDIT",
  defaultQualityTier:"MASTER",
  requiredLocks:[{type:"FACE",strength:"HARD",description:"preserve face without retouching or reinterpretation"}],
  routingHints:{preferredProviderClass:"PHOTOREAL_STILL"},
  qcRequirements:["IDENTITY_FIDELITY","FACIAL_GEOMETRY","REQUESTED_DELTA_SUCCESS"]
};
