# NovaForge Provider Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add capability-based provider adapters and deterministic routing for Seedream-first still-image work, ChatGPT/OpenAI image tasks, Higgsfield cinematic workflows, and FLUX outpainting.

**Architecture:** All providers implement one `ImageProvider` contract. The router scores only providers that satisfy hard requirements, privacy mode, operation support, and reference capabilities. Seedream is preferred for photoreal stills when available, but no provider is hard-coded into UI logic.

**Tech Stack:** Node.js 20+, TypeScript 5.x, Vitest, npm.

**Spec:** `docs/superpowers/specs/2026-08-24-novaforge-image-studios-core-design.md`

## Global Constraints

- Provider-specific IDs stay inside provider configuration/adapters.
- A provider that cannot satisfy a hard requirement is excluded, not merely penalized.
- `LOCAL_ONLY` cannot select a remote provider.
- No API keys or access tokens in repository code, tests, logs, or provenance.
- Seedream preference is capability-driven and must degrade safely if unavailable.

---

### Task 1: Define provider contracts

**Files:**
- Create: `src/providers/types.ts`
- Create: `tests/providers/types.test.ts`
- Modify: `src/index.ts`

**Interfaces:**
- Produces: `ProviderCapabilities`, `ProviderPreflight`, `ProviderExecutionPlan`, `ProviderResult`, `ImageProvider`.

- [ ] **Step 1: Write the failing contract test**

```ts
import { expect, it } from "vitest";
import type { ImageProvider } from "../../src/providers/types";

it("requires providers to expose capabilities and execute plans", () => {
  const provider: ImageProvider = {
    id: "fixture",
    locality: "REMOTE",
    capabilities: () => ({
      operations: ["GENERATE", "EDIT"],
      referenceRoles: ["image", "start_image"],
      supportsIdentityReferences: true,
      supportsTextRendering: false,
      supportsVideo: false,
      maxResolution: "4k"
    }),
    preflight: async () => ({ status: "READY", reasons: [] }),
    execute: async () => ({ providerId: "fixture", model: "fixture-model", assetIds: ["asset-1"], metadata: {} })
  };

  expect(provider.id).toBe("fixture");
});
```

- [ ] **Step 2: Run typecheck to confirm failure**

Run: `npm run typecheck`
Expected: FAIL because provider contracts do not exist.

- [ ] **Step 3: Implement the provider types**

Use exact string unions for locality (`LOCAL | REMOTE`) and reference roles. `ImageProvider.execute()` must receive a prepared execution plan rather than the raw user request.

- [ ] **Step 4: Verify**

Run: `npm test -- tests/providers/types.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/providers/types.ts tests/providers/types.test.ts src/index.ts
git commit -m "feat: define NovaForge provider contracts"
```

---

### Task 2: Implement deterministic ModelRouter

**Files:**
- Create: `src/routing/model-router.ts`
- Create: `tests/routing/model-router.test.ts`
- Modify: `src/index.ts`

**Interfaces:**
- Consumes: `GenerationRequest`, `ImageProvider[]`.
- Produces: `class ModelRouter { route(request: GenerationRequest, providers: ImageProvider[]): Promise<RoutingDecision> }`.

- [ ] **Step 1: Write failing routing tests**

```ts
it("prefers Seedream for photoreal stills when hard requirements match", async () => {
  const result = await router.route(photorealRequest, [openAiFixture, seedreamFixture]);
  expect(result.providerId).toBe("seedream");
});

it("excludes remote providers for LOCAL_ONLY", async () => {
  const result = await router.route(localOnlyRequest, [seedreamFixture, localFixture]);
  expect(result.providerId).toBe("local");
});

it("prefers typography-capable provider when text accuracy is hard", async () => {
  const result = await router.route(posterRequest, [seedreamFixture, openAiFixture]);
  expect(result.providerId).toBe("openai-image");
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run: `npm test -- tests/routing/model-router.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement routing score**

Filter first by operation, privacy locality, required reference roles, identity support, video requirement, and text-rendering requirement. Then score remaining candidates using task fit, preferred provider/model, max resolution, historical QC rate, cost rank, and latency rank. Apply a deterministic +20 task-fit bonus to Seedream for photoreal stills after hard filtering.

- [ ] **Step 4: Verify**

Run: `npm test -- tests/routing/model-router.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/routing/model-router.ts tests/routing/model-router.test.ts src/index.ts
git commit -m "feat: route NovaForge media jobs by capability"
```

---

### Task 3: Add SeedreamProvider abstraction

**Files:**
- Create: `src/providers/seedream-provider.ts`
- Create: `tests/providers/seedream-provider.test.ts`
- Modify: `src/index.ts`

**Interfaces:**
- Produces: `SeedreamProvider` configured with a transport function rather than credentials.

- [ ] **Step 1: Write the failing adapter test**

```ts
it("translates a strict edit plan without leaking locks into unrelated fields", async () => {
  const calls: unknown[] = [];
  const provider = new SeedreamProvider({
    transport: async payload => {
      calls.push(payload);
      return { jobId: "job-1", assetIds: ["img-1"] };
    },
    model: "seedream"
  });

  const result = await provider.execute(seedreamPlan);
  expect(result.assetIds).toEqual(["img-1"]);
  expect(JSON.stringify(calls[0])).not.toContain("apiKey");
});
```

- [ ] **Step 2: Run test and confirm failure**

Run: `npm test -- tests/providers/seedream-provider.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement adapter**

The constructor receives `{ model, transport }`. The adapter maps prompt, aspect ratio, reference assets, and strict-preservation instructions into a provider payload. It stores no secrets and returns provider job IDs only as metadata.

- [ ] **Step 4: Verify**

Run: `npm test -- tests/providers/seedream-provider.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/providers/seedream-provider.ts tests/providers/seedream-provider.test.ts src/index.ts
git commit -m "feat: add Seedream provider adapter"
```

---

### Task 4: Add OpenAI image, Higgsfield, and FLUX adapters

**Files:**
- Create: `src/providers/openai-image-provider.ts`
- Create: `src/providers/higgsfield-provider.ts`
- Create: `src/providers/flux-provider.ts`
- Create: `tests/providers/provider-adapters.test.ts`
- Modify: `src/index.ts`

**Interfaces:**
- Produces: three `ImageProvider` implementations using injected transports.

- [ ] **Step 1: Write failing capability tests**

```ts
it("marks OpenAI image as typography capable", () => {
  expect(openAi.capabilities().supportsTextRendering).toBe(true);
});

it("marks Higgsfield as video capable", () => {
  expect(higgsfield.capabilities().supportsVideo).toBe(true);
});

it("marks FLUX as OUTPAINT capable", () => {
  expect(flux.capabilities().operations).toContain("OUTPAINT");
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run: `npm test -- tests/providers/provider-adapters.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement adapters**

OpenAI image: `GENERATE | EDIT`, text rendering true, reference images supported. Higgsfield: `GENERATE | EDIT | IMAGE_TO_VIDEO | VIDEO_EDIT | KEYFRAME_TRANSITION`, video true, start/end/reference roles supported. FLUX: `GENERATE | EDIT | OUTPAINT`, text rendering false, strong still-image/reference support.

- [ ] **Step 4: Verify full routing stack**

Run: `npm test && npm run typecheck && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/providers/openai-image-provider.ts src/providers/higgsfield-provider.ts src/providers/flux-provider.ts tests/providers/provider-adapters.test.ts src/index.ts
git commit -m "feat: add NovaForge media provider adapters"
```
