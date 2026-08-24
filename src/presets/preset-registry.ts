import { memorialPhotorealPreset } from "./memorial-photoreal.js";
import { lockedFaceEditPreset } from "./locked-face-edit.js";
import { vehicleVisualizerPreset } from "./vehicle-visualizer.js";
import { posterTypographyPreset } from "./poster-typography.js";
import { stillToVideoCinematicPreset } from "./still-to-video-cinematic.js";
import type { PresetId, WorkflowPreset } from "./types.js";

export class PresetRegistry {
  private readonly presets = new Map<PresetId, WorkflowPreset>([
    [memorialPhotorealPreset.id, memorialPhotorealPreset],
    [lockedFaceEditPreset.id, lockedFaceEditPreset],
    [vehicleVisualizerPreset.id, vehicleVisualizerPreset],
    [posterTypographyPreset.id, posterTypographyPreset],
    [stillToVideoCinematicPreset.id, stillToVideoCinematicPreset]
  ]);
  list(): WorkflowPreset[] { return [...this.presets.values()]; }
  get(id: PresetId): WorkflowPreset {
    const preset = this.presets.get(id);
    if (!preset) throw new Error(`UNKNOWN_PRESET:${id}`);
    return preset;
  }
}
