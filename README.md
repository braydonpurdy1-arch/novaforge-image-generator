# NovaForge Image Studios

NovaForge Image Studios is the orchestration layer for high-end image generation, reference-preserving edits, compositing, enhancement, and final post-processing.

## Toolchain

The default workflow is:

1. **Generate / edit in NovaForge** using the best available image provider for the task.
2. **Preserve locked references** such as face, pose, vehicle, wings, background, composition, text geometry, or other user-designated immutable regions.
3. **Validate realism and consistency** including lighting, shadows, reflections, skin/material texture, perspective, and local edit boundaries.
4. **Optional Photo Studio PRO handoff** for user-controlled final post-processing.
5. **Re-import the finished image** as a new derivative while preserving the original locked source.

## Photo Studio PRO integration

Photo Studio PRO by KVADGroup is treated as an **optional external Android post-processing stage**, not as an autonomous generator and not as a driving-runtime dependency.

- Android package: `com.kvadgroup.photostudio_pro`
- Integration mode: explicit Android image handoff
- Lock policy: non-destructive; locked source images remain immutable
- Intended edits: crop, exposure, tone, colour, sharpening, cleanup, local adjustments, finishing
- Identity/composition-changing edits require an explicit user instruction

The Android helper in `android/PhotoStudioProHandoff.kt` attempts `ACTION_EDIT` first, then a targeted share fallback, and finally a generic Android share chooser if Photo Studio PRO cannot accept the image directly.

## Safety / isolation

Third-party creative tools remain user-launched and isolated from Nova driving-critical services. They receive only the image URI explicitly handed off for editing.
