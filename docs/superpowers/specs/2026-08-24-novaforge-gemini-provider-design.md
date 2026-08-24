# NovaForge Gemini Provider Design

**Status:** Approved  
**Date:** 2026-08-24  
**Repository:** `braydonpurdy1-arch/novaforge-image-generator`  
**Branch:** `agent/novaforge-image-studios-core-2026-08-24`

## Purpose

Extend NovaForge Image Studios with a Google Gemini provider family while preserving the provider-neutral architecture, strict reference locks, delta editing, privacy controls, cost approval, QC, provenance, and human authority already defined by the core design.

## Verified Google model reality

NovaForge must not invent model IDs.

Verified production targets as of 2026-08-24:

- `gemini-3.7-flash`: GA multimodal reasoning model. Inputs include text, image, video, audio, and PDF. Output is text only. Image generation is not supported. Use it for multimodal scene analysis, prompt planning, reference analysis, structured QC reasoning, and tool/agent orchestration.
- `gemini-3.5-flash`: stable multimodal reasoning model. Use as a lower-cost reasoning fallback where configured.
- `gemini-3.5-flash-lite`: stable lower-latency/cost reasoning model. Use only for lightweight analysis tasks.
- `gemini-3-pro-image`: stable Gemini native image generation/editing model. Use for professional image generation, complex edits, text-accurate graphics, product mockups, high-fidelity visual composition, and grounded image work.
- `gemini-3.1-flash-image`: stable Gemini native image generation/editing model. Use for general image generation/editing where latency/cost is preferred over the Pro image profile.

`gemini-3.5-pro` is not treated as a callable production model until Google exposes and documents a real model ID. NovaForge may accept `gemini-3.5-pro` as a requested alias, but the resolver must return `UNAVAILABLE` unless an administrator explicitly configures a verified backing model ID. Silent substitution is forbidden when the user marks the model as required.

## Architecture

```text
GenerationRequest
      |
      v
ReferencePolicyEngine
      |
      v
Task / Capability Classifier
      |
      +-------------------------------+
      |                               |
      v                               v
Gemini Reasoning Layer           Image Executor Layer
      |                               |
      |-- gemini-3.7-flash            |-- gemini-3-pro-image
      |-- gemini-3.5-flash            |-- gemini-3.1-flash-image
      |-- gemini-3.5-flash-lite       |-- Seedream
      |                               |-- OpenAI Image
      |                               |-- FLUX
      |                               |-- Higgsfield
      +---------------+---------------+
                      |
                      v
               NovaForge QC
                      |
                      v
                 Provenance
```

The reasoning layer never bypasses the deterministic NovaForge policy engine. It may propose prompt structures, reference interpretations, or QC findings, but locks, allowed changes, privacy mode, cost gates, and provider eligibility remain deterministic application rules.

## Gemini provider responsibilities

### GeminiImageProvider

Implements the existing `ImageProvider` interface.

Hard requirements:

- `kind = GEMINI_IMAGE`.
- remote provider only unless a future local Gemini-compatible implementation is explicitly configured.
- image operations: `GENERATE`, `EDIT`, `DELTA_EDIT`, `INPAINT`, and where supported by the selected image model, composition/expansion workflows.
- identity/reference images supported.
- text rendering supported.
- no video output capability.
- no secrets in constructor state other than injected transport closures managed outside repository code.
- remote transport receives redacted model-facing prompt plus opaque media bindings, not raw local filesystem paths.
- provider retention defaults to `UNKNOWN` unless the transport explicitly reports otherwise.

### GeminiReasoningProvider

A separate reasoning contract is used for multimodal analysis and prompt/QC assistance. It must never be advertised as an image generator when configured with `gemini-3.7-flash`, `gemini-3.5-flash`, or `gemini-3.5-flash-lite`.

Allowed reasoning roles:

- reference-role classification;
- scene/object inventory;
- cinematic prompt planning;
- ambiguity resolution proposals;
- text layout planning;
- QC explanation;
- repair-plan recommendation.

Deterministic NovaForge code validates all reasoning outputs before use.

## Model resolver

`GeminiModelCatalog` owns model names and availability.

Required behavior:

1. Exact verified model IDs are accepted.
2. Friendly aliases resolve only to verified configured targets.
3. `gemini-3.5-pro` is recognized but returns `UNAVAILABLE` by default.
4. A required unavailable model causes `MODEL_UNAVAILABLE`; it does not fall back.
5. A preferred unavailable model may fall back according to the capability router if the request does not mark it as required.
6. Provenance records the requested alias and actual resolved model separately.

## Routing policy

Hard filtering happens before scoring.

Recommended scoring additions:

- `gemini-3-pro-image`: +20 for `TYPOGRAPHY`, complex multi-reference composition, grounded factual imagery, or explicit Gemini image preference.
- `gemini-3.1-flash-image`: +12 for general image jobs where latency/cost is prioritized.
- Seedream retains its +20 preference for `PHOTOREAL_STILL` when strict realism is the dominant task class and hard requirements match.
- OpenAI Image remains eligible for text-heavy and flexible editing workflows.
- Higgsfield remains the cinematic/video executor.
- FLUX remains preferred for dedicated outpaint/expansion when its operation fit is stronger.

No model wins merely because it is newer.

## Shared NovaForge technique compiler

All providers consume the same normalized intent and must not rely on keyword stacking. The shared compiler preserves:

- identity anchor;
- composition anchor;
- edit-scope lock;
- delta-edit semantics;
- reference-role isolation;
- hard/soft lock distinction;
- camera, lens, blocking, lighting, materials, atmosphere, and physics sections for cinematic work;
- negative constraints;
- text-accuracy mode;
- output framing/aspect-ratio requirements;
- local-repair-first QC policy;
- anchor carry-forward rules.

Provider adapters translate these semantics into their own payload schema without weakening them.

## Privacy hardening

`REMOTE_REDACTED` must:

- redact email addresses, bearer tokens, secret-like values, and local filesystem paths from model-facing text;
- keep local media bindings separate from serialized prompt content;
- prevent API responses from exposing local paths;
- keep credentials outside provenance and logs;
- record provider retention as `UNKNOWN` unless explicitly known.

`LOCAL_ONLY` excludes Gemini remote providers.

## Security rules

- no hard-coded Google API keys;
- no OAuth/access tokens in repository files, tests, logs, job metadata, or provenance;
- no silent model substitution for required models;
- no reasoning-model output may unlock or relax hard locks;
- no external identity lookup or biometric database search;
- cost estimation above the user budget requires explicit approval before execution;
- model/provider metadata is informational and cannot authorize destructive edits.

## Public contract

README and API documentation must clearly distinguish:

- reasoning models from image-generating models;
- verified production model IDs from future aliases;
- required versus preferred model semantics;
- privacy modes;
- provider retention uncertainty;
- cost approval behavior;
- current provider capabilities.

## Acceptance criteria

The Gemini extension is complete when:

1. Gemini model catalog tests pass, including fail-closed `gemini-3.5-pro` behavior.
2. Gemini image adapter tests pass without secret/path leakage.
3. Router tests demonstrate Gemini/Seedream/OpenAI/FLUX/Higgsfield task-fit decisions.
4. `REMOTE_REDACTED` tests prove prompt/path/token redaction.
5. cinematic compiler tests prove camera/lens/light/material/physics/preservation sections survive provider translation.
6. full `npm test`, `npm run typecheck`, and `npm run build` pass.
7. GitHub CI is green.
8. README/public contract is updated.
9. security/spec review finds no unresolved high-severity issue.
10. PR #2 is updated with implementation status and evidence, but remains unmerged until separately authorized.
