# NovaForge Image Studios Public API Contract

## Scope

This document describes the first local application-facing NovaForge Image Studios API. The API exposes job submission, job status, cost approval, and local-cache deletion. It does not expose provider credentials, raw local filesystem paths, or protected-branch repository actions.

## POST /v1/generations

Submits an image/media request to the NovaForge orchestration layer.

The request is normalized before routing. Hard requirements are evaluated before scoring providers. The response returns an opaque `jobId` and public job state rather than provider credentials or local file paths.

Important request semantics:

- `privacyMode` may be `LOCAL_ONLY`, `REMOTE_REDACTED`, or `REMOTE_ALLOWED`.
- A required provider/model is a hard constraint. If unavailable, the request fails rather than silently substituting another provider.
- A preferred provider/model is a scoring preference only when all hard requirements remain satisfiable.
- Explicit identity/composition/object/background/clothing locks are deterministic NovaForge policy and cannot be relaxed by a model response.
- A request budget may trigger `WAITING_APPROVAL` before any paid execution occurs.

## GET /v1/jobs/:id

Returns public job state and non-secret job metadata.

Current states:

- `QUEUED`
- `PREFLIGHT`
- `WAITING_APPROVAL`
- `RUNNING`
- `QC`
- `COMPLETED`
- `FAILED`

Transitions are deterministic and forward-only. A completed job cannot re-enter execution.

Public job serialization must not include provider credentials, bearer tokens, passwords, authorization values, or local asset paths.

## POST /v1/jobs/:id/approve-cost

Approves or rejects a generation whose estimated provider cost exceeded the request budget.

Approval resumes the exact stored request under the same lock and routing contract. The approval endpoint does not permit changing the prompt, references, locks, provider requirements, or privacy mode while resuming the job.

A rejection sends the job to `FAILED` with a cost-rejection reason and does not execute the provider.

## DELETE /v1/assets/:id/cache

Deletes the local cached copy of an asset only.

It does not claim to delete a remote provider copy. Provider retention metadata is recorded independently as:

- `EPHEMERAL`
- `RETAINED`
- `UNKNOWN`

If a provider does not explicitly report retention, NovaForge records `UNKNOWN`.

## Provider transport boundary

Remote provider adapters use a two-part transport request:

```ts
interface ProviderTransportRequest {
  payload: Record<string, unknown>;
  mediaBindings?: Array<{ id: string; uri: string }>;
}
```

`payload` is the model-facing serialized request and should contain opaque reference IDs rather than local URIs. `mediaBindings` is consumed by the trusted integration layer to resolve or upload local media. This separation prevents normal prompt serialization from leaking local filesystem paths.

For `REMOTE_REDACTED`, model-facing text is redacted for common local paths, email addresses, bearer credentials, and secret-like assignments before transport.

## Gemini contract

Reasoning and image-generation roles are separate.

Reasoning targets:

- `gemini-3.7-flash`
- `gemini-3.5-flash`
- `gemini-3.5-flash-lite`

Image-generation/editing targets:

- `gemini-3-pro-image`
- `gemini-3.1-flash-image`

`gemini-3.5-pro` is an optional/future alias with no assumed production backing model. A required request fails with `MODEL_UNAVAILABLE` unless an administrator explicitly maps the alias to a separately verified real model ID.

Gemini reasoning output is advisory. It may assist with reference analysis, prompt planning, QC explanation, or repair recommendations, but cannot override deterministic reference locks, privacy policy, cost approval, or provider eligibility.

## Other provider roles

- Seedream: strict photoreal still-image fit
- OpenAI Image: flexible image generation/editing and typography
- Higgsfield: cinematic video/image-to-video/keyframe workflows
- FLUX: still-image editing and outpaint/expansion

Provider routing is capability-first and task-fit scored. No provider is selected solely because it is newer.

## Error and fail-closed rules

Representative deterministic errors include:

- `NO_COMPATIBLE_PROVIDER`
- `MODEL_UNAVAILABLE:<model>`
- `GEMINI_IMAGE_MODEL_REQUIRED:<model>`
- `GEMINI_REASONING_MODEL_REQUIRED:<model>`
- `INVALID_JOB_TRANSITION`
- `SECRET_FIELD_REJECTED`

Required-model failure, privacy-policy conflict, hard-lock QC failure, and invalid state transitions are fail-closed conditions.

## Production integration note

The repository contains provider adapters and injected transport contracts rather than embedded provider credentials. A deployment must supply trusted transport implementations and current provider authentication separately. CI uses fixtures and does not spend third-party generation credits.
