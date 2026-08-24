# NovaForge Image Studios 3D Reference Foundation — Design

**Date:** 2026-08-24
**Repository:** `braydonpurdy1-arch/novaforge-image-generator`
**Status:** Approved architecture; implementation pending plan/review

## Goal

Create a provider-neutral NovaForge Image Studios foundation for controlled multimodal reference workflows and safe 2D→3D visual asset handling, without tying the project to one external generation service.

## Scope

The initial foundation covers:

1. Role-defined multimodal references.
2. Preservation locks and reference provenance.
3. A neutral GLB/glTF visual-asset contract.
4. Explicit engineering-accuracy labelling.
5. Provider adapters that remain optional and replaceable.
6. A project-state model suitable for future still-image, video, and 3D workflows.

The work does **not** attempt to build a full CAD package, mechanical simulator, or photorealistic renderer in the first iteration.

## 1. Reference Roles

References must be assigned a purpose instead of being merged indiscriminately.

Supported initial roles:

- `identity`: face/person/subject identity that must remain stable.
- `geometry`: overall shape, proportions, spatial layout, vehicle/object form.
- `pose`: human/character pose and body positioning.
- `environment`: background, architecture, scene context.
- `lighting`: light direction, intensity, colour temperature, shadows, reflections.
- `material`: paint, skin, metal, glass, fabric, carbon fibre, surface finish.
- `motion`: camera or subject motion references for video stages.
- `audio`: dialogue, ambience, timing, or soundtrack reference for video stages.

A reference can carry multiple roles only when explicitly assigned.

## 2. Preservation Locks

A project may declare immutable targets such as:

- subject identity
- face
- body pose
- vehicle geometry
- background
- lighting
- material appearance
- composition/framing

Preservation locks are instructions and validation metadata, not guarantees from an upstream model. The UI and orchestration layer must report when a provider cannot reliably honour a lock.

## 3. Core Project Model

A provider-neutral project representation should include:

```ts
export type ReferenceRole =
  | 'identity'
  | 'geometry'
  | 'pose'
  | 'environment'
  | 'lighting'
  | 'material'
  | 'motion'
  | 'audio'

export interface StudioReference {
  id: string
  uri: string
  mediaType: 'image' | 'video' | 'audio' | 'model'
  roles: readonly ReferenceRole[]
  source: 'user' | 'generated' | 'scan' | 'manual' | 'unknown'
  notes?: string
}

export interface PreservationLock {
  target: 'identity' | 'face' | 'pose' | 'geometry' | 'background' | 'lighting' | 'material' | 'composition'
  referenceId?: string
  instruction: string
}
```

The project model must remain serializable and versioned.

## 4. 3D Visual Asset Contract

Supported interchange formats initially:

- GLB
- glTF

Every imported/generated model must carry sidecar metadata:

```ts
export interface Visual3DAssetMetadata {
  schemaVersion: 1
  assetId: string
  format: 'glb' | 'gltf'
  source: 'generated' | 'manual' | 'scan' | 'unknown'
  engineeringAccuracy: 'unverified' | 'reference-only' | 'dimensionally-verified'
  intendedUse: readonly ('ui-preview' | 'visualization' | 'reference' | 'engineering')[]
  sourceReferences: readonly string[]
  generatedBy?: string
  createdAt: string
}
```

`dimensionally-verified` or `engineering` use must never be assigned automatically by an AI provider. Those states require an explicit external engineering validation step.

## 5. Provider Boundary

Image Studios owns the project model and orchestration. Providers implement adapters behind a narrow interface.

```ts
export interface StudioProvider {
  id: string
  capabilities(): Promise<ProviderCapabilities>
  generate(request: StudioGenerationRequest): Promise<StudioGenerationResult>
}
```

Provider capabilities must state whether the provider supports:

- image generation
- targeted image editing
- video generation
- video extension/editing
- audio-conditioned generation
- 2D→3D generation
- masks
- multi-reference input
- role-specific reference guidance

The core project must not depend on provider-specific request objects.

## 6. Generated 3D Safety Labelling

For generated models:

- default `engineeringAccuracy` is `unverified`.
- default intended use excludes `engineering`.
- visual UI must show that the model may not match real dimensions or construction.
- no generated model may be used as the sole basis for manufacture, load-bearing design, fitment, clearances, braking, suspension, steering, drivetrain, or safety-critical vehicle modifications.

This constraint applies even when the render looks photorealistic.

## 7. Workflow State

The project should preserve:

- references and their roles
- locks
- prompt/instructions
- generation provider/model metadata
- source/output relationships
- edit history
- before/after revisions
- export provenance

This creates a persistent project state rather than a sequence of unrelated prompts.

## 8. NovaForge Technique Integration

The design is compatible with the already adopted workflow concepts:

- ChatGPT/NovaForge as orchestration surface.
- Role-defined reference packs.
- Locked-reference still-image workflow.
- Seedance-style timed shot instructions and continuity for video.
- Photo Studio PRO as an optional manual/post-processing stage.
- Visily-style design discipline for the Image Studios control-panel UX.

No one external application becomes a mandatory runtime dependency.

## Testing Strategy

Implementation must include tests for:

- reference-role validation
- preservation-lock validation
- project-schema version parsing
- unsupported media-role combinations
- 3D metadata defaults
- prevention of automatic engineering validation
- provider capability negotiation
- serialization round trips

## Non-Goals

- Mechanical CAD generation.
- Automatic dimensional verification.
- CNC/manufacturing output.
- Autonomous provider purchasing or billing.
- Provider credentials committed to the repository.
- Requiring Blender, AmpleCheck, or a specific 3D viewer.
- Replacing the locked still-image workflow.

## Success Criteria

The first implementation is complete when:

1. A versioned Image Studios project can persist role-defined references and preservation locks.
2. Providers can be added without changing core project data structures.
3. GLB/glTF assets carry explicit provenance and engineering-accuracy metadata.
4. Generated 3D defaults to visual/reference-only use.
5. Core validation prevents accidental promotion of generated geometry to engineering-verified status.
6. Tests cover schema, roles, locks, provider capabilities, and 3D safety defaults.
