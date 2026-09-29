# NovaForge Image Studios Core Design

**Status:** Approved direction, implementation pending written-spec review  
**Date:** 2026-08-24  
**Repository:** `braydonpurdy1-arch/novaforge-image-generator`  
**Branch:** `agent/novaforge-image-studios-core-2026-08-24`

## 1. Purpose

NovaForge Image Studios is a provider-neutral image and video orchestration layer designed for high-fidelity reference-driven generation and precision editing. The system prioritizes control, repeatability, identity fidelity, and provenance over one-shot generation.

The core product goal is:

> Accept a user image request, understand exactly what is locked versus editable, select the best available model for the requested operation, execute the smallest required change, verify fidelity, and either return the result or perform a targeted repair pass.

Seedream is the preferred still-image realism engine where available. ChatGPT image generation/editing, Higgsfield, FLUX-family tools, and future providers remain selectable behind a common routing contract.

## 2. Product boundaries

### In scope

- Reference-locked still-image generation and editing.
- Identity-preserving workflows.
- Precision delta edits.
- Model routing by task and capability.
- Seedream-first still-image routing when appropriate.
- ChatGPT-facing request normalization and policy instructions.
- Higgsfield-backed cinematic image/video workflows.
- FLUX-style outpainting and expansion workflows.
- Generation preflight.
- Automated fidelity and quality checks.
- Provenance and reproducibility records.
- Preset workflows for portraits, memorial imagery, automotive visualization, posters, and still-to-video sequences.
- Human approval when a requested change conflicts with a locked reference or requires a destructive reinterpretation.

### Out of scope for v1

- Training a proprietary foundation model.
- Silent biometric identity inference from unknown people.
- Automatic face recognition against external databases.
- Unbounded autonomous publishing.
- Hidden destructive edits to user assets.
- Committing third-party provider secrets to the repository.
- Pretending ChatGPT's internal image backend can be modified. ChatGPT integration means request policy, provider selection through connected tools, and reproducible NovaForge instructions—not altering OpenAI product internals.

## 3. Design principles

1. **Locked means locked.** A locked identity, composition, object, region, or visual attribute must not change unless the user explicitly unlocks it.
2. **Delta before regeneration.** Prefer the smallest edit that satisfies the request.
3. **Reference over description.** When a trusted visual reference exists, use it instead of asking the model to reconstruct the subject from text.
4. **Provider-neutral orchestration.** NovaForge owns the policy and workflow; providers are interchangeable executors.
5. **Fail visibly.** If a provider cannot preserve a required lock, report the limitation or route elsewhere rather than silently degrading fidelity.
6. **Provenance by default.** Every generation records source assets, locks, requested deltas, provider, model, parameters, and QC outcome.
7. **Human authority.** The user controls anchor promotion, lock changes, destructive reinterpretation, and final acceptance.
8. **No secret leakage.** Provider credentials stay server-side or in connector-managed secret stores.

## 4. Core architecture

```text
User / ChatGPT / App
        |
        v
RequestNormalizer
        |
        v
ReferencePolicyEngine
        |
        +--> LockedAssetRegistry
        |
        v
GenerationPreflight
        |
        v
ImageModelRouter
        |
        +--> SeedreamProvider
        +--> ChatGptImageProvider
        +--> HiggsfieldProvider
        +--> FluxProvider
        +--> FutureProviderAdapters
        |
        v
GenerationExecutor
        |
        v
GenerationQcEngine
        |
   +----+----+
   |         |
 PASS       FAIL
   |         |
   v         v
Result   TargetedRepairPlanner
   |         |
   +----<----+
        |
        v
ProvenanceLedger
        |
        v
User Result / Anchor Promotion
```

The orchestration layer must never require provider-specific behavior in the UI or user prompt. Provider-specific translation happens only inside adapters.

## 5. Core data model

### 5.1 GenerationRequest

Required fields:

- `requestId`
- `intent`
- `operation`
- `prompt`
- `sourceAssets[]`
- `locks[]`
- `allowedChanges[]`
- `forbiddenChanges[]`
- `outputRequirements`
- `preferredProvider`
- `preferredModel`
- `qualityTier`
- `privacyMode`

### 5.2 Operation enum

- `GENERATE`
- `EDIT`
- `DELTA_EDIT`
- `OUTPAINT`
- `INPAINT`
- `UPSCALE`
- `RESTORE`
- `STYLE_TRANSFER`
- `IMAGE_TO_VIDEO`
- `VIDEO_EDIT`
- `KEYFRAME_TRANSITION`

### 5.3 Lock types

- `IDENTITY`
- `FACE`
- `POSE`
- `COMPOSITION`
- `CAMERA`
- `BACKGROUND`
- `LIGHTING`
- `COLOR_GRADE`
- `CLOTHING`
- `OBJECT`
- `REGION`
- `TEXT`
- `MATERIAL`
- `WINGS_OR_APPENDAGE`
- `VEHICLE_BODY`
- `CUSTOM`

Each lock contains:

- `lockId`
- `assetId`
- `type`
- `scope`
- `description`
- optional normalized bounding region or mask reference
- `strength`: `HARD` or `SOFT`

`HARD` means generation fails QC if violated. `SOFT` permits small model-dependent variation and records the deviation.

### 5.4 AllowedChange

Each allowed change defines:

- target region/object
- requested transformation
- acceptable variance
- whether geometry may change
- whether color may change
- whether lighting may change
- whether texture may change

Everything not explicitly allowed is treated as preserved in strict edit mode.

## 6. Reference Fidelity Engine

### 6.1 Identity Anchor

A designated identity reference is an immutable subject anchor for the request. Identity anchors may contain multiple reference images, but each image must be tagged with its role:

- primary facial structure
- profile
- hair
- expression
- clothing-only
- pose-only
- scene-only

A non-identity reference must never silently influence facial identity.

### 6.2 Composition Anchor

The composition anchor establishes framing, subject placement, scene geometry, camera orientation, and primary background arrangement.

When the user says “use image 1 as the main base,” NovaForge records image 1 as the composition anchor and defaults all unspecified areas to preservation.

### 6.3 Edit-Scope Lock

For precision edits, NovaForge compiles a change set:

```text
MAY_CHANGE:
- requested target(s)

MUST_PRESERVE:
- all hard locks
- all other source regions by default
```

This becomes part of both the provider prompt and the post-generation QC contract.

### 6.4 Anchor carry-forward

A generated image becomes a new anchor only when:

1. generation QC passes;
2. the user explicitly approves or promotes it; or
3. the workflow preset explicitly allows auto-promotion for non-identity intermediate assets.

Identity-containing outputs require user approval before permanent anchor promotion.

## 7. Request Normalizer and Prompt Compiler

The normalizer converts natural language into a structured request. It must distinguish:

- requested change;
- preserve instructions;
- identity references;
- scene references;
- output style;
- quality requirements;
- camera/lighting intent;
- prohibited reinterpretation.

### 7.1 Ambiguity resolver

Ambiguous phrases are converted into explicit deltas where possible.

Examples:

- “more dramatic” -> increase local contrast and shadow depth without altering composition or identity.
- “clean it up” -> do not infer retouching of a locked face; ask or restrict cleanup to artifacts/noise outside locked identity regions.
- “sharpen” -> enhance perceived detail without changing geometry, facial structure, or texture identity.

If ambiguity affects a hard lock, NovaForge asks for approval instead of guessing.

### 7.2 Cinematic prompt compiler

For cinematic stills/video, compile prompts in this order:

1. subject and identity references;
2. shot size and camera position;
3. focal length / perspective intent;
4. scene and blocking;
5. physical lighting setup;
6. material and micro-texture requirements;
7. motion / camera motion if video;
8. atmosphere;
9. preservation constraints;
10. negative constraints and failure conditions.

## 8. Model routing

Routing is capability-driven, not brand-driven.

### 8.1 Seedream role

Seedream is preferred for:

- photorealistic still generation;
- high-fidelity portrait work;
- memorial imagery;
- realistic automotive visualization;
- realism-heavy reference edits;
- image synthesis where natural texture and coherent scene rendering are more important than typography.

The first implementation should support Seedream through an authorized provider transport. If the Higgsfield connector is the available transport, use its Seedream model entry behind `SeedreamProvider`; direct provider transport can be added later without changing the orchestration contract.

No API key or token is stored in source control.

### 8.2 ChatGPT image role

Use the ChatGPT/OpenAI image path for:

- flexible generation and editing;
- text-heavy images and typography;
- general iterative edits;
- situations where the active ChatGPT environment exposes image generation directly.

NovaForge cannot alter ChatGPT’s internal model. “ChatGPT integration” means applying the same lock/request/QC contract before invoking the available image capability and preserving NovaForge provenance around the call.

### 8.3 Higgsfield role

Use Higgsfield for:

- cinematic image-to-video;
- keyframe workflows;
- camera movement;
- reference-consistent video;
- multi-model media workflows;
- Seedream transport when selected and available.

### 8.4 FLUX role

Use FLUX-family models for:

- outpainting;
- canvas expansion;
- selected high-fidelity editing;
- provider fallback when capability and lock requirements are satisfied.

### 8.5 Routing score

Each candidate model receives a score based on:

- required operation support;
- reference input support;
- identity/reference fidelity;
- edit locality;
- requested resolution;
- text rendering needs;
- video/keyframe support;
- latency target;
- cost budget;
- privacy policy;
- provider availability;
- historical QC pass rate for the same task class.

A provider that cannot satisfy all hard requirements is excluded rather than merely penalized.

## 9. Generation preflight

Before any paid or high-cost generation:

1. verify source assets exist and are readable;
2. verify required references are assigned correct roles;
3. ensure no contradictory locks and allowed changes;
4. validate aspect ratio and output dimensions;
5. validate provider/model capability;
6. estimate cost when supported;
7. check privacy mode and remote-provider permission;
8. verify required masks/regions;
9. compile a provider-neutral execution plan;
10. return a deterministic preflight result.

Preflight status:

- `READY`
- `NEEDS_USER_INPUT`
- `UNSUPPORTED`
- `BLOCKED_BY_POLICY`

## 10. Generation QC Engine

QC is mandatory for strict reference workflows.

### 10.1 QC categories

- identity fidelity
- facial geometry drift
- expression drift
- pose drift
- composition drift
- background drift
- clothing drift
- object presence/absence
- anatomy
- hands
- jewellery/accessories
- hair continuity
- material realism
- lighting consistency
- reflections
- vehicle geometry
- text accuracy
- obvious artifacts
- crop/framing compliance
- requested delta success

### 10.2 Result schema

Each category returns:

- `PASS`
- `WARN`
- `FAIL`
- confidence score
- evidence/notes

Hard-lock failures make the generation `FAIL` regardless of aggregate score.

### 10.3 Repair planner

A failed generation should not automatically trigger full regeneration.

The repair planner chooses:

- local inpaint/edit;
- provider switch;
- prompt correction;
- reference role correction;
- mask refinement;
- full regeneration only when the scene is irrecoverable.

A repair may not relax a hard lock without user approval.

## 11. Provenance ledger

Every run stores:

- request ID;
- timestamp;
- source asset hashes/IDs;
- lock definitions;
- normalized request;
- provider and model;
- provider job ID when available;
- parameters;
- prompt compiler version;
- routing decision and reasons;
- preflight outcome;
- QC results;
- repair history;
- final result asset ID;
- anchor promotion status.

Secrets, raw access tokens, and provider credentials are never logged.

The ledger should be append-only at the application level. Corrections create new entries rather than mutating historical execution records.

## 12. Preset workflows

### 12.1 Memorial Photoreal

Defaults:

- hard identity lock;
- composition anchor;
- natural skin texture;
- physically plausible light;
- detailed hair/feathers/materials;
- no unsolicited retouching;
- Seedream-first routing;
- strict QC.

### 12.2 Locked Face Edit

Defaults:

- face/identity hard lock;
- smallest possible delta region;
- no face cleanup, relighting, smoothing, sharpening, or reinterpretation unless explicitly requested;
- automatic fail on facial geometry drift.

### 12.3 Vehicle Visualizer

Defaults:

- hard vehicle body/series lock;
- hard paint-color lock unless changed explicitly;
- component references assigned by role;
- preserve wheelbase, body proportions, trim, and perspective;
- automotive material/reflection QC.

### 12.4 Poster / Typography

Defaults:

- typography-capable provider preferred;
- text accuracy is a hard QC criterion;
- visual layout changes may be allowed while identity locks remain intact.

### 12.5 Still-to-Video Cinematic

Defaults:

- approved still becomes start-image anchor;
- optional end-frame anchor;
- identity and wardrobe hard locks;
- camera movement compiled explicitly;
- physics-aware movement;
- scene continuity QC.

## 13. ChatGPT integration contract

NovaForge’s ChatGPT-facing behavior is a policy and tool-routing layer.

When a user asks for an image edit in ChatGPT:

1. identify attached/reference images;
2. parse explicit locks and edits;
3. preserve unspecified areas by default in strict edit mode;
4. if the user explicitly asks for Seedream and a connected Seedream-capable provider is available, route through the Seedream adapter/connector;
5. otherwise use the best available ChatGPT image capability while preserving the same lock semantics;
6. after generation, treat the output as provisional until the user accepts it or QC passes according to the active workflow;
7. never claim the ChatGPT product backend itself was modified.

For the current connected Higgsfield environment, Seedream can be selected through the Higgsfield provider when exposed by its model catalog. Model IDs are provider configuration, not embedded business logic.

## 14. Security and privacy

### 14.1 Secrets

- no provider keys in client bundles;
- no secrets in prompts;
- no secrets in provenance;
- environment variables or connector-managed auth only;
- `.env` excluded from git.

### 14.2 Private references

Privacy modes:

- `LOCAL_ONLY`
- `REMOTE_ALLOWED`
- `REMOTE_REDACTED`

`LOCAL_ONLY` requests cannot be routed to remote providers. If no suitable local provider exists, return `UNSUPPORTED` rather than violating policy.

### 14.3 Reference retention

Provider adapters must document whether references are uploaded, retained, or ephemeral when the provider exposes that information. NovaForge should minimize duplicate uploads and allow local deletion of cached references.

## 15. Service interfaces

The first implementation should expose an internal TypeScript API with these interfaces:

```ts
interface ImageProvider {
  id: string;
  capabilities(): ProviderCapabilities;
  preflight(request: GenerationRequest): Promise<ProviderPreflight>;
  execute(plan: ProviderExecutionPlan): Promise<ProviderResult>;
}

interface ModelRouter {
  route(request: GenerationRequest, providers: ImageProvider[]): Promise<RoutingDecision>;
}

interface ReferencePolicyEngine {
  compile(request: RawImageRequest): Promise<GenerationRequest>;
  validate(request: GenerationRequest): PolicyValidation;
}

interface GenerationQcEngine {
  evaluate(request: GenerationRequest, result: ProviderResult): Promise<QcReport>;
}

interface ProvenanceLedger {
  append(entry: ProvenanceEntry): Promise<void>;
}
```

The initial implementation may use JSON files for local provenance and deterministic unit-test fixtures. A database is unnecessary for v1.

## 16. Proposed repository structure

```text
novaforge-image-generator/
  src/
    domain/
      generation-request.ts
      locks.ts
      providers.ts
      qc.ts
      provenance.ts
    policy/
      reference-policy-engine.ts
      request-normalizer.ts
      prompt-compiler.ts
    routing/
      image-model-router.ts
      routing-score.ts
    providers/
      seedream-provider.ts
      chatgpt-image-provider.ts
      higgsfield-provider.ts
      flux-provider.ts
    qc/
      generation-qc-engine.ts
      repair-planner.ts
    provenance/
      jsonl-provenance-ledger.ts
    presets/
      memorial-photoreal.ts
      locked-face-edit.ts
      vehicle-visualizer.ts
      poster-typography.ts
      still-to-video.ts
    index.ts
  test/
    policy/
    routing/
    qc/
    provenance/
    presets/
  docs/
    superpowers/specs/
  package.json
  tsconfig.json
  README.md
```

## 17. Testing strategy

Development follows TDD.

### Unit tests

- hard locks cannot be relaxed by a provider adapter;
- unspecified regions are preserved in strict delta mode;
- scene-only references cannot become identity references;
- provider capability mismatch fails closed;
- Seedream is preferred for qualifying photoreal still tasks when available;
- typography tasks route away from providers lacking text capability;
- `LOCAL_ONLY` never selects a remote provider;
- provenance never contains configured secrets;
- hard QC failure rejects a generation;
- repair planner chooses local repair before full regeneration where possible;
- anchor promotion requires approval for identity-containing outputs.

### Contract tests

Provider adapters use mocked HTTP/connector clients. No CI test requires paid generation.

### Integration tests

A manual or explicitly enabled integration suite can test real providers using environment-managed credentials. It must be disabled by default in CI.

## 18. Failure handling

- Provider unavailable -> reroute if another provider satisfies all hard requirements.
- Provider returns malformed result -> fail and log non-secret metadata.
- Cost estimate exceeds request budget -> require user approval.
- Identity QC fails -> do not auto-promote result; attempt targeted repair or return failure.
- Conflicting locks -> stop before generation.
- Unsupported Seedream transport -> select a compliant alternate only if the request did not require Seedream explicitly; otherwise report unavailable.
- Missing reference -> request the reference rather than inventing one.

## 19. Build-vs-buy decisions

### Build in NovaForge

- request normalization;
- reference lock semantics;
- provider-neutral model routing;
- provenance;
- QC policy;
- repair planning;
- presets;
- user approval boundaries.

### Use external providers for

- foundation image generation;
- foundation video generation;
- provider-specific upscaling/outpainting;
- high-cost vision/model inference where appropriate.

This keeps NovaForge valuable even when model rankings change.

## 20. Implementation phases

### Phase 1 — deterministic core

- TypeScript project scaffold.
- Domain contracts.
- Reference policy engine.
- Strict delta semantics.
- Model router.
- Provider capability model.
- JSONL provenance ledger.
- Presets.
- Unit tests.

### Phase 2 — provider adapters

- Seedream adapter with injected transport.
- Higgsfield adapter.
- ChatGPT/OpenAI image adapter boundary.
- FLUX adapter boundary.
- Mocked contract tests.

### Phase 3 — QC and repair

- deterministic rule-based QC contract;
- pluggable visual similarity/vision evaluator interface;
- repair planner;
- anchor promotion workflow.

### Phase 4 — application/API surface

- REST or MCP interface;
- job status;
- asset registry;
- optional UI/workflow graph.

## 21. Acceptance criteria

The v1 core is complete when:

1. A request can name a main base image, identity references, and allowed changes.
2. NovaForge produces a normalized lock contract.
3. The router deterministically selects the best compatible provider.
4. Seedream wins qualifying photoreal still tasks when configured and available.
5. Strict delta edits preserve all non-target hard locks by contract.
6. QC can block anchor promotion on identity or composition drift.
7. Every execution produces a provenance entry without secrets.
8. Presets compile into ordinary `GenerationRequest` objects rather than bypassing policy.
9. All unit tests pass without network access or paid provider calls.
10. Provider adapters can be replaced without modifying policy or UI contracts.

## 22. Non-negotiable project rules

- Locked references are source-of-truth.
- Identity drift is a failure, not a creative variation.
- Unrequested composition drift is a failure in strict mode.
- Provider-specific prompts cannot override NovaForge hard locks.
- User-approved anchors are never silently replaced.
- Secrets never enter prompts, logs, or source control.
- Provider selection is capability-based.
- Seedream is preferred, not hard-coded as the only still-image engine.
- ChatGPT integration does not claim modification of ChatGPT internals.
- Expensive or destructive retries require an explicit policy path rather than uncontrolled looping.

## 23. Initial implementation decision

Use **TypeScript** for the first NovaForge orchestration layer because the repository is currently empty, the domain is API/connector-heavy, and TypeScript provides strong contracts with a low-friction path to MCP/HTTP integrations. Provider transports are dependency-injected so future native/mobile clients can consume the service without duplicating policy.

The first implementation must remain small and deterministic: no database, no vector store, no agent swarm, and no paid provider calls in CI.
