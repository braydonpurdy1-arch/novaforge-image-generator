# NovaForge Image Studios

NovaForge Image Studios is a provider-neutral image and cinematic media orchestration core. It turns a user request into a normalized generation contract, applies reference and edit locks, routes the job to a compatible provider, enforces privacy and cost boundaries, runs quality-control checks, plans targeted repairs, and records provenance.

The core is designed for **refinement over reinterpretation**. A locked identity, composition, object, background, clothing element, or other protected reference is treated as a contract rather than a suggestion. Providers are execution engines; NovaForge owns policy, routing, approval and QC.

## Core workflow

```text
User request
    ↓
Request normalization
    ↓
Reference Policy Engine
    ↓
Generation preflight
    ↓
Capability-based model router
    ↓
Provider execution
    ↓
Quality-control gate
    ↓
Targeted repair or accepted output
    ↓
Provenance + optional anchor promotion
```

## Locked-image techniques

NovaForge implements the control techniques used throughout the project:

- Reference Fidelity Lock
- Identity Anchor and Composition Anchor
- strict precision delta editing
- explicit allowed and forbidden changes
- reference-role isolation
- hard and soft lock distinction
- anchor carry-forward after approval
- generation preflight
- local-repair-first QC
- targeted repair planning instead of automatic full regeneration
- cinematic camera, lens, blocking, lighting, materials, motion, atmosphere and **PHYSICS** compilation
- explicit **MUST PRESERVE** and negative-constraint sections
- text-accuracy mode
- provider-neutral provenance
- cost-estimate approval before an over-budget generation is executed

## Provider roles

| Provider | Primary role |
| --- | --- |
| **Seedream** | Preferred fit for strict photoreal still-image work when hard requirements match |
| **Gemini Image** | Native Gemini generation/editing, complex composition and text-accurate image work |
| **OpenAI Image** | Flexible generation/editing and typography-capable image workflows |
| **Higgsfield** | Cinematic image-to-video, video editing and keyframe-transition workflows |
| **FLUX** | Still-image generation/editing with dedicated outpaint/expansion capability |

No provider wins simply because it is newer. NovaForge first eliminates providers that cannot satisfy the operation, required reference roles, identity requirements, privacy policy, text-accuracy requirement or video requirement. It then scores the remaining candidates by task fit, explicit user preference, quality history, resolution, cost and latency.

## Gemini model contract

NovaForge deliberately separates **Gemini reasoning models** from **Gemini image models**.

### Reasoning-only Gemini models

`gemini-3.7-flash` is treated as **reasoning-only** in NovaForge. It can be used for multimodal reference analysis, prompt planning, scene/object inventory, ambiguity resolution, structured QC explanation and repair recommendations, but it is not advertised as an image generator.

The same reasoning role is available for configured `gemini-3.5-flash` and `gemini-3.5-flash-lite` targets.

A request for `gemini-3.5-pro` is recognized as a future/optional alias, but NovaForge does **not** invent a backing API model. By default it is unavailable. If the user marks that model as required, resolution fails closed with `MODEL_UNAVAILABLE`. An administrator may explicitly map that alias to a separately verified production model ID; provenance records both the requested alias and the actual configured model.

### Gemini image models

The verified native image targets used by the provider catalog are:

- `gemini-3-pro-image` — professional/complex image generation and editing profile
- `gemini-3.1-flash-image` — general image generation/editing profile with stronger cost/latency weighting

`GeminiImageProvider` rejects reasoning-only models. `GeminiReasoningProvider` rejects image-only models. This prevents capability confusion and silent substitution.

## Privacy modes

NovaForge exposes three explicit privacy modes:

- `LOCAL_ONLY` — remote providers, including remote Gemini, Seedream, OpenAI Image, Higgsfield and FLUX adapters, are excluded from routing.
- `REMOTE_REDACTED` — model-facing text is scrubbed for local filesystem paths, email addresses, bearer credentials and secret-like assignments before remote transport.
- `REMOTE_ALLOWED` — remote execution is permitted without the additional text-redaction transform, while normal secret-handling rules still apply.

Provider transport deliberately separates serialized model payload from local media resolution:

```text
payload       = model-facing prompt + opaque asset IDs + policy parameters
mediaBindings = opaque asset ID → local URI/path, consumed only by the integration layer
```

Local filesystem paths are therefore not serialized into normal provider prompt payloads. API responses also avoid returning local asset paths by default.

## Provider retention

Third-party asset retention is never guessed. Provider results use one of:

- `EPHEMERAL`
- `RETAINED`
- `UNKNOWN`

When a provider transport does not explicitly report retention behavior, NovaForge records `UNKNOWN`. Deleting NovaForge's local cached asset never claims to delete a provider-side copy.

## Human approval boundaries

NovaForge is approval-aware by design.

- A requested **required** model/provider that is unavailable fails rather than silently switching providers.
- A preferred provider may fall back only when the request does not make it mandatory and all hard requirements remain satisfied.
- Cost estimates above a configured request budget enter `WAITING_APPROVAL` before generation.
- Hard reference locks cannot be weakened by a provider response, reasoning model, repair planner or QC suggestion.
- Anchor promotion requires explicit approval.
- Repository integration remains human-controlled; protected-branch merge authority is not delegated to the image runtime.

## Local API

The first local application-facing API surface is implemented with Fastify:

- `POST /v1/generations` — submit a normalized generation request and receive an opaque job ID
- `GET /v1/jobs/:id` — read public job state/metadata
- `POST /v1/jobs/:id/approve-cost` — explicitly approve or reject an over-budget job
- `DELETE /v1/assets/:id/cache` — delete only the local cached asset copy

See `docs/public-api.md` for the public contract.

## Job states

Jobs progress through deterministic forward states:

`QUEUED → PREFLIGHT → WAITING_APPROVAL/RUNNING → QC → COMPLETED`

Failure paths enter `FAILED`. Completed jobs cannot transition backwards into execution.

## Security model

- Provider credentials are not stored in repository source.
- Provider/network clients are injected transports; tests use non-network fixtures.
- API keys, access tokens, authorization values and passwords are not accepted into provenance.
- `REMOTE_REDACTED` strips secret-like model-facing text before remote execution.
- Reasoning-model output is advisory and cannot override deterministic policy.
- `LOCAL_ONLY` is enforced before provider scoring.
- Hard-lock QC failures fail the generation result.
- Provider retention defaults to `UNKNOWN` rather than overstating privacy guarantees.

## Current limitations

This repository implements the orchestration, policy, provider adapters, test fixtures and local API surface. Live third-party provider execution still requires an integration layer with valid provider credentials and verified endpoint/model availability. CI does not spend provider credits or perform real external image-generation calls.

NovaForge also cannot modify ChatGPT's internal image backend. Its ChatGPT-facing contract structures reference locks, allowed edits, model/tool selection and QC around whatever callable image capability is available.

## Development

```bash
npm install
npm test
npm run typecheck
npm run build
```

The test suite covers policy compilation, provider routing, Gemini model-role resolution, privacy redaction, cinematic prompt semantics, QC/provenance, assets/cost/job controls and API behavior.
