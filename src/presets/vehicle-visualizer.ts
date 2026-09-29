import type { WorkflowPreset } from "./types.js";
export const vehicleVisualizerPreset: WorkflowPreset = {
  id:"VEHICLE_VISUALIZER",
  description:"Automotive visualization with body/proportion and material fidelity.",
  defaultOperation:"DELTA_EDIT",
  defaultQualityTier:"MASTER",
  requiredLocks:[{type:"VEHICLE_BODY",strength:"HARD",description:"preserve vehicle body geometry and proportions"}],
  routingHints:{preferredProviderClass:"PHOTOREAL_STILL",preferredProviderId:"seedream"},
  qcRequirements:["VEHICLE_GEOMETRY","MATERIALS","REFLECTIONS","COMPOSITION","REQUESTED_DELTA_SUCCESS"]
};
