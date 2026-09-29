# NovaForge Gemini Full-Stack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add verified Gemini reasoning/image providers, finish cinematic/privacy hardening, update the public contract, verify security/spec compliance, and bring PR #2 up to date without merging it.

**Architecture:** Gemini is split into a reasoning layer and an image-execution layer. Verified image models implement the existing `ImageProvider` contract; reasoning models use a separate contract and may assist planning/QC but cannot override deterministic locks, privacy, routing, or approval rules. All providers consume shared NovaForge technique semantics and route by hard capabilities before task-fit scoring.

**Tech Stack:** Node.js 20+, TypeScript 5.x, Vitest, Fastify 5.12.1, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-24-novaforge-gemini-provider-design.md`

## Global Constraints

- Never invent a Google model ID.
- `gemini-3.5-pro` is recognized but unavailable by default until a verified backing ID is explicitly configured.
- Required unavailable models fail with `MODEL_UNAVAILABLE`; preferred unavailable models may route elsewhere.
- `gemini-3.7-flash`, `gemini-3.5-flash`, and `gemini-3.5-flash-lite` are reasoning models, not image generators.
- `gemini-3-pro-image` and `gemini-3.1-flash-image` are image-generation/editing targets.
- `LOCAL_ONLY` excludes remote Gemini providers.
- `REMOTE_REDACTED` strips secrets, emails, bearer credentials, and local paths from model-facing text.
- Local media bindings remain separate from serialized prompt text.
- Provider retention defaults to `UNKNOWN` unless explicitly reported.
- No provider or reasoning output can relax a hard lock.
- No protected-branch merge is authorized.

---

### Task 1: Add Gemini model catalog and fail-closed aliases

**Files:**
- Create: `src/providers/gemini-model-catalog.ts`
- Create: `tests/providers/gemini-model-catalog.test.ts`
- Modify: `src/index.ts`

**Interfaces:**
- Produces: `GeminiModelRole`, `GeminiModelDescriptor`, `GeminiModelCatalog.resolve(requested, required)`.

- [ ] **Step 1: Write failing tests**

```ts
it("resolves verified Gemini image model", () => {
  expect(catalog.resolve("gemini-3-pro-image", true).modelId).toBe("gemini-3-pro-image");
});

it("marks gemini-3.7-flash as reasoning-only", () => {
  expect(catalog.resolve("gemini-3.7-flash", true).role).toBe("REASONING");
});

it("fails closed for unverified gemini-3.5-pro", () => {
  expect(() => catalog.resolve("gemini-3.5-pro", true)).toThrow("MODEL_UNAVAILABLE");
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run: `npm test -- tests/providers/gemini-model-catalog.test.ts`
Expected: FAIL because catalog does not exist.

- [ ] **Step 3: Implement minimal catalog**

Define verified descriptors for `gemini-3.7-flash`, `gemini-3.5-flash`, `gemini-3.5-flash-lite`, `gemini-3-pro-image`, and `gemini-3.1-flash-image`. Add alias `gemini-3.5-pro` with no backing model by default. Allow constructor override only with explicit `{ alias, modelId, role }` configuration.

- [ ] **Step 4: Verify**

Run: `npm test -- tests/providers/gemini-model-catalog.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/providers/gemini-model-catalog.ts tests/providers/gemini-model-catalog.test.ts src/index.ts
git commit -m "feat: add verified Gemini model catalog"
```

---

### Task 2: Add Gemini image adapter and reasoning contract

**Files:**
- Create: `src/providers/gemini-image-provider.ts`
- Create: `src/providers/gemini-reasoning-provider.ts`
- Modify: `src/providers/types.ts`
- Create: `tests/providers/gemini-providers.test.ts`
- Modify: `src/index.ts`

**Interfaces:**
- Produces: `GeminiImageProvider`, `GeminiReasoningProvider`, `GeminiReasoningTransport`, `GeminiReasoningResult`.

- [ ] **Step 1: Write failing provider tests**

```ts
it("uses Gemini image model without serializing local paths", async () => {
  const calls: unknown[] = [];
  const provider = new GeminiImageProvider({ model: "gemini-3-pro-image", transport: async p => { calls.push(p); return { assetIds:["img-1"] }; } });
  await provider.execute(plan);
  expect(JSON.stringify(calls[0])).not.toContain("/tmp/");
});

it("refuses reasoning-only model in image provider", () => {
  expect(() => new GeminiImageProvider({ model:"gemini-3.7-flash", transport })).toThrow("GEMINI_IMAGE_MODEL_REQUIRED");
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run: `npm test -- tests/providers/gemini-providers.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement adapters**

`GeminiImageProvider` exposes `kind="GEMINI_IMAGE"`, image operations, identity references, text rendering, 4K capability for the Pro profile, and injected transport. `GeminiReasoningProvider` accepts only reasoning-role descriptors and returns structured analysis text/JSON without executing media generation.

- [ ] **Step 4: Verify**

Run: `npm test -- tests/providers/gemini-providers.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/providers/types.ts src/providers/gemini-image-provider.ts src/providers/gemini-reasoning-provider.ts tests/providers/gemini-providers.test.ts src/index.ts
git commit -m "feat: add Gemini image and reasoning providers"
```

---

### Task 3: Extend routing for Gemini task fit

**Files:**
- Modify: `src/routing/model-router.ts`
- Modify: `tests/routing/model-router.test.ts`

**Interfaces:**
- Consumes: existing `GenerationRequest`, `ImageProvider[]`.
- Produces: deterministic Gemini task-fit scoring without bypassing hard filters.

- [ ] **Step 1: Add failing routing tests**

```ts
it("prefers Gemini Pro Image for hard typography", async () => {
  const result = await router.route(typographyRequest, [seedream, geminiPro]);
  expect(result.providerId).toBe("gemini-image");
});

it("keeps Seedream preference for strict photoreal stills", async () => {
  const result = await router.route(photorealRequest, [seedream, geminiPro]);
  expect(result.providerId).toBe("seedream");
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run: `npm test -- tests/routing/model-router.test.ts`
Expected: at least the Gemini typography test FAILS.

- [ ] **Step 3: Implement scoring additions**

After hard filtering: +20 for `GEMINI_IMAGE` on `TYPOGRAPHY`; +10 for Gemini image where text accuracy is required; retain Seedream +20 `PHOTOREAL_STILL`; retain existing Higgsfield/FLUX task fits. Preferred provider remains +15.

- [ ] **Step 4: Verify**

Run: `npm test -- tests/routing/model-router.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/routing/model-router.ts tests/routing/model-router.test.ts
git commit -m "feat: route Gemini image jobs by task fit"
```

---

### Task 4: Finish cinematic compiler and REMOTE_REDACTED transport hardening

**Files:**
- Create: `src/prompt/cinematic-prompt-compiler.ts`
- Create: `src/privacy/remote-redaction.ts`
- Modify: `src/providers/transport.ts`
- Modify: `src/providers/seedream-provider.ts`
- Modify: `src/providers/openai-image-provider.ts`
- Modify: `src/providers/gemini-image-provider.ts`
- Modify: `src/providers/higgsfield-provider.ts`
- Modify: `src/providers/flux-provider.ts`
- Create: `tests/prompt/cinematic-prompt-compiler.test.ts`
- Create: `tests/privacy/remote-redaction.test.ts`
- Modify: `src/index.ts`

**Interfaces:**
- Produces: `compileCinematicPrompt(input)`, `redactRemoteText(text)`, `ProviderTransportRequest { payload, mediaBindings }`.

- [ ] **Step 1: Write failing cinematic/privacy tests**

```ts
it("compiles physical motion and preservation sections", () => {
  const prompt = compileCinematicPrompt({ subject:"angel", camera:"50mm tracking", motion:"turns", physics:"fabric and feathers react to acceleration", preserve:["face","wings"] });
  expect(prompt).toContain("PHYSICS");
  expect(prompt).toContain("MUST PRESERVE");
});

it("redacts local paths and bearer tokens", () => {
  const out = redactRemoteText("/tmp/person.png Bearer abc123 user@example.com");
  expect(out).not.toContain("/tmp/");
  expect(out).not.toContain("abc123");
  expect(out).not.toContain("user@example.com");
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run: `npm test -- tests/prompt/cinematic-prompt-compiler.test.ts tests/privacy/remote-redaction.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement compiler and transport separation**

Transport signature becomes `(request: { payload: Record<string,unknown>; mediaBindings?: Array<{id:string;uri:string}> })`. Remote adapters place only opaque IDs in `payload.references`; original URIs live only in `mediaBindings` for the transport integration layer. For `REMOTE_REDACTED`, compiled prompt is passed through `redactRemoteText` before transport.

- [ ] **Step 4: Update provider adapter tests**

Assert no local path appears in serialized payload, while `mediaBindings` retains the reference for the connector/runtime layer. Assert hard preservation instructions survive compilation.

- [ ] **Step 5: Verify full provider stack**

Run: `npm test && npm run typecheck && npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/prompt src/privacy src/providers src/index.ts tests/prompt tests/privacy tests/providers
git commit -m "feat: harden cinematic prompts and remote provider transport"
```

---

### Task 5: Normalize provider retention metadata

**Files:**
- Modify: `src/providers/types.ts`
- Modify: provider adapters as needed
- Modify: `src/assets/types.ts`
- Create: `tests/providers/provider-retention.test.ts`

**Interfaces:**
- Produces: provider result metadata with `retention: "EPHEMERAL" | "RETAINED" | "UNKNOWN"`.

- [ ] **Step 1: Write failing retention test**

```ts
it("defaults unreported remote retention to UNKNOWN", async () => {
  const result = await provider.execute(plan);
  expect(result.metadata.retention).toBe("UNKNOWN");
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- tests/providers/provider-retention.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement defaulting**

Adapters preserve explicit transport retention metadata if it is one of the allowed values; otherwise set `UNKNOWN`.

- [ ] **Step 4: Verify**

Run: `npm test -- tests/providers/provider-retention.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/providers src/assets/types.ts tests/providers/provider-retention.test.ts
git commit -m "feat: normalize provider retention metadata"
```

---

### Task 6: Update README/public contract

**Files:**
- Create or replace: `README.md`
- Create: `docs/public-api.md`

**Interfaces:**
- Documents: providers, verified Gemini model roles, privacy modes, cost approval, API endpoints, required/preferred semantics, retention semantics, and security boundaries.

- [ ] **Step 1: Write public contract docs**

README must explicitly state that `gemini-3.7-flash` is reasoning-only, `gemini-3.5-pro` is not assumed callable, and the image models are `gemini-3-pro-image` / `gemini-3.1-flash-image`.

- [ ] **Step 2: Add documentation consistency test**

Create `tests/docs/public-contract.test.ts` that reads README and verifies the verified model IDs and `MODEL_UNAVAILABLE` rule are present.

- [ ] **Step 3: Verify**

Run: `npm test -- tests/docs/public-contract.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add README.md docs/public-api.md tests/docs/public-contract.test.ts
git commit -m "docs: publish NovaForge image provider contract"
```

---

### Task 7: Final security/spec review and CI evidence

**Files:**
- Create: `docs/security/2026-08-24-image-core-review.md`
- Modify spec only if review finds a contradiction.

**Review checks:**

- secret/token leakage;
- local path exposure;
- `REMOTE_REDACTED` bypass;
- required-model silent fallback;
- hard-lock relaxation;
- cost-approval bypass;
- invalid job transition;
- provenance secret fields;
- provider-retention overclaim;
- untrusted reasoning output overriding deterministic policy.

- [ ] **Step 1: Run full local verification**

Run: `npm test && npm run typecheck && npm run build`
Expected: PASS.

- [ ] **Step 2: Run GitHub Actions and inspect every job step**

Expected: install, test, typecheck, build all success.

- [ ] **Step 3: Write security review with findings and evidence**

No unresolved high-severity issue may remain before PR #2 status is updated.

- [ ] **Step 4: Update PR #2 body/title/status evidence**

PR remains draft/unmerged unless separately authorized. Body must list implemented providers, exact Gemini model semantics, test count, CI run ID, security review result, and remaining limitations.

- [ ] **Step 5: Final verification**

Re-fetch PR #2 and current head CI status; confirm head SHA and successful checks match.
