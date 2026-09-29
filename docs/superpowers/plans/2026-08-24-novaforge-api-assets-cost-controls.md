# NovaForge API, Assets, and Cost Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first application-facing API surface, local asset registry/cache, provider retention metadata, and explicit cost-approval controls required by the approved NovaForge design.

**Architecture:** The deterministic core remains framework-independent. A thin local HTTP API exposes request submission and job status. Assets are registered locally by opaque IDs and hashes; provider-upload/retention metadata is recorded without secrets. Cost estimates are checked before execution and requests over budget pause for explicit approval.

**Tech Stack:** Node.js 20+, TypeScript 5.x, Vitest, Fastify 5.x, npm.

**Spec:** `docs/superpowers/specs/2026-08-24-novaforge-image-studios-core-design.md`

## Global Constraints

- API handlers must call the existing orchestration layer; they do not duplicate policy or provider logic.
- Asset IDs are opaque; local filesystem paths are never returned by default.
- Provider retention/upload behavior is metadata, not an assumption: unknown retention is recorded as `UNKNOWN`.
- Deleting a local cached reference never implies deletion from a third-party provider.
- Cost above the request budget pauses before generation and requires explicit approval.
- No provider credentials in API responses, logs, assets, or job metadata.

---

### Task 1: Add asset registry

**Files:**
- Create: `src/assets/types.ts`
- Create: `src/assets/local-asset-registry.ts`
- Create: `tests/assets/local-asset-registry.test.ts`
- Modify: `src/index.ts`

**Interfaces:**
- Produces: `AssetRecord`, `ProviderRetention`, `LocalAssetRegistry.register()`, `get()`, `deleteLocalCache()`.

- [ ] **Step 1: Write failing registry tests**

```ts
it("registers an asset with an opaque id and sha256 hash", async () => {
  const record = await registry.register({ path: sourcePath, mediaType: "image/png" });
  expect(record.id).toMatch(/^asset_/);
  expect(record.sha256).toMatch(/^[a-f0-9]{64}$/);
  expect(record.localPath).toBe(sourcePath);
});

it("tracks provider retention independently from local cache", async () => {
  const record = await registry.register({ path: sourcePath, mediaType: "image/png" });
  await registry.recordProviderCopy(record.id, { providerId: "seedream", remoteAssetId: "r1", retention: "UNKNOWN" });
  const deleted = await registry.deleteLocalCache(record.id);
  expect(deleted.providerCopies[0]?.retention).toBe("UNKNOWN");
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- tests/assets/local-asset-registry.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement local registry**

Store registry metadata in a local JSON file and compute SHA-256 using `node:crypto`. `ProviderRetention` is `EPHEMERAL | RETAINED | UNKNOWN`. `deleteLocalCache()` removes only the configured local cached file and marks `localAvailable=false`; it never claims remote deletion.

- [ ] **Step 4: Verify**

Run: `npm test -- tests/assets/local-asset-registry.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/assets/types.ts src/assets/local-asset-registry.ts tests/assets/local-asset-registry.test.ts src/index.ts
git commit -m "feat: add local NovaForge asset registry"
```

---

### Task 2: Add provider cost estimation contract

**Files:**
- Modify: `src/providers/types.ts`
- Create: `src/cost/cost-policy.ts`
- Create: `tests/cost/cost-policy.test.ts`
- Modify: `src/index.ts`

**Interfaces:**
- Produces: optional `ImageProvider.estimateCost(plan): Promise<CostEstimate>` and `evaluateCostPolicy(request, estimate, approval): CostDecision`.

- [ ] **Step 1: Write failing cost-policy tests**

```ts
it("allows generation below budget", () => {
  expect(evaluateCostPolicy({ budgetCredits: 20 }, { amount: 8, unit: "credits" }, false).status).toBe("ALLOWED");
});

it("requires approval when estimate exceeds budget", () => {
  expect(evaluateCostPolicy({ budgetCredits: 20 }, { amount: 35, unit: "credits" }, false).status).toBe("REQUIRES_APPROVAL");
});

it("allows an over-budget estimate only after explicit approval", () => {
  expect(evaluateCostPolicy({ budgetCredits: 20 }, { amount: 35, unit: "credits" }, true).status).toBe("ALLOWED");
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- tests/cost/cost-policy.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement contract**

Providers that support estimates return `{ amount, unit, details? }`. Providers without estimation return `undefined`; absence of an estimate is recorded but does not fabricate a zero cost. When `request.outputRequirements.budgetCredits` is set and estimate exceeds it, execution pauses with `REQUIRES_APPROVAL`.

- [ ] **Step 4: Verify**

Run: `npm test -- tests/cost/cost-policy.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/providers/types.ts src/cost/cost-policy.ts tests/cost/cost-policy.test.ts src/index.ts
git commit -m "feat: add generation cost approval policy"
```

---

### Task 3: Add in-memory job registry

**Files:**
- Create: `src/jobs/job-registry.ts`
- Create: `tests/jobs/job-registry.test.ts`
- Modify: `src/index.ts`

**Interfaces:**
- Produces: `JobRegistry.create()`, `get()`, `transition()` with states `QUEUED | PREFLIGHT | WAITING_APPROVAL | RUNNING | QC | COMPLETED | FAILED`.

- [ ] **Step 1: Write failing state-transition tests**

```ts
it("rejects invalid backward transition from COMPLETED", () => {
  const job = jobs.create("req-1");
  jobs.transition(job.id, "RUNNING");
  jobs.transition(job.id, "COMPLETED");
  expect(() => jobs.transition(job.id, "RUNNING")).toThrow("INVALID_JOB_TRANSITION");
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- tests/jobs/job-registry.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement deterministic transitions**

Permit only forward transitions defined by a static transition table. `WAITING_APPROVAL` may transition to `RUNNING` after approval or `FAILED` after explicit rejection/cancellation.

- [ ] **Step 4: Verify**

Run: `npm test -- tests/jobs/job-registry.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/jobs/job-registry.ts tests/jobs/job-registry.test.ts src/index.ts
git commit -m "feat: add NovaForge job state registry"
```

---

### Task 4: Add local Fastify API

**Files:**
- Create: `src/api/server.ts`
- Create: `tests/api/server.test.ts`
- Modify: `package.json`
- Modify: `src/index.ts`

**Interfaces:**
- Produces: `buildServer(deps)` with `POST /v1/generations`, `GET /v1/jobs/:id`, `POST /v1/jobs/:id/approve-cost`, and `DELETE /v1/assets/:id/cache`.

- [ ] **Step 1: Write failing API tests**

```ts
it("submits a generation and returns an opaque job id", async () => {
  const response = await app.inject({ method: "POST", url: "/v1/generations", payload: rawRequest });
  expect(response.statusCode).toBe(202);
  expect(response.json().jobId).toMatch(/^job_/);
});

it("does not expose local asset paths in responses", async () => {
  const response = await app.inject({ method: "GET", url: `/v1/jobs/${jobId}` });
  expect(JSON.stringify(response.json())).not.toContain("/tmp/");
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- tests/api/server.test.ts`
Expected: FAIL.

- [ ] **Step 3: Add Fastify and implement handlers**

Add `fastify` as a runtime dependency. `POST /v1/generations` creates a job and invokes orchestration through injected dependencies. If cost exceeds budget, return job state `WAITING_APPROVAL`. Approval endpoint stores explicit approval and resumes the same deterministic plan. Asset cache deletion calls only `LocalAssetRegistry.deleteLocalCache()`.

- [ ] **Step 4: Verify**

Run: `npm test -- tests/api/server.test.ts && npm run typecheck && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/api/server.ts tests/api/server.test.ts src/index.ts
git commit -m "feat: expose local NovaForge generation API"
```

---

### Task 5: Add integration test for over-budget approval and retention metadata

**Files:**
- Create: `tests/integration/api-cost-assets.test.ts`

**Interfaces:**
- Consumes: API, job registry, asset registry, cost policy, orchestrator.

- [ ] **Step 1: Write failing integration test**

```ts
it("pauses an over-budget Seedream request, resumes after approval, and preserves provider retention metadata", async () => {
  const submitted = await app.inject({ method: "POST", url: "/v1/generations", payload: overBudgetSeedreamRequest });
  const jobId = submitted.json().jobId;
  expect((await app.inject({ method: "GET", url: `/v1/jobs/${jobId}` })).json().state).toBe("WAITING_APPROVAL");

  await app.inject({ method: "POST", url: `/v1/jobs/${jobId}/approve-cost`, payload: { approved: true } });
  const finished = await app.inject({ method: "GET", url: `/v1/jobs/${jobId}` });
  expect(finished.json().state).toBe("COMPLETED");
  expect(finished.json().providerRetention).toBe("UNKNOWN");
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm test -- tests/integration/api-cost-assets.test.ts`
Expected: FAIL.

- [ ] **Step 3: Wire dependencies**

Connect cost estimation before provider execution, preserve provider retention metadata from the adapter, and redact local paths from response serialization.

- [ ] **Step 4: Final verification**

Run: `npm test && npm run typecheck && npm run build`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/integration/api-cost-assets.test.ts src
git commit -m "test: verify NovaForge API cost and asset controls"
```
