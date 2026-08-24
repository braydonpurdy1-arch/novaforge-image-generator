# NovaForge QC and Provenance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add strict generation quality control, targeted repair planning, and append-only provenance so every accepted image/video result is traceable and lock-aware.

**Architecture:** QC evaluates the result against the request contract category by category. Any hard-lock failure causes overall failure. A repair planner chooses the smallest corrective action. Provenance records each request, route, provider result, QC report, and repair attempt without storing secrets.

**Tech Stack:** Node.js 20+, TypeScript 5.x, Vitest, npm, local JSONL ledger for v1.

**Spec:** `docs/superpowers/specs/2026-08-24-novaforge-image-studios-core-design.md`

## Global Constraints

- Hard-lock failures force overall `FAIL`.
- Repair may not relax a hard lock without explicit user approval.
- Prefer local repair over full regeneration.
- Provenance is append-only at the application layer.
- Secrets and access tokens are never logged.

---

### Task 1: Define QC contracts

**Files:**
- Create: `src/qc/types.ts`
- Create: `tests/qc/types.test.ts`
- Modify: `src/index.ts`

**Interfaces:**
- Produces: `QcCategory`, `QcStatus`, `QcFinding`, `QcReport`, `QcEvaluator`.

- [ ] **Step 1: Write the failing contract test**

```ts
import { expect, it } from "vitest";
import type { QcReport } from "../../src/qc/types";

it("represents a hard identity failure", () => {
  const report: QcReport = {
    overall: "FAIL",
    findings: [{
      category: "IDENTITY_FIDELITY",
      status: "FAIL",
      confidence: 0.99,
      notes: ["facial geometry differs from locked identity anchor"],
      hardLockAffected: true
    }]
  };
  expect(report.overall).toBe("FAIL");
});
```

- [ ] **Step 2: Run typecheck and confirm failure**

Run: `npm run typecheck`
Expected: FAIL.

- [ ] **Step 3: Implement exact unions**

Include categories for identity fidelity, facial geometry, expression, pose, composition, background, clothing, objects, anatomy, hands, jewellery, hair, materials, lighting, reflections, vehicle geometry, text accuracy, artifacts, crop/framing, and requested-delta success.

- [ ] **Step 4: Verify**

Run: `npm test -- tests/qc/types.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/qc/types.ts tests/qc/types.test.ts src/index.ts
git commit -m "feat: define NovaForge QC contracts"
```

---

### Task 2: Implement GenerationQcEngine aggregation rules

**Files:**
- Create: `src/qc/generation-qc-engine.ts`
- Create: `tests/qc/generation-qc-engine.test.ts`
- Modify: `src/index.ts`

**Interfaces:**
- Produces: `GenerationQcEngine.evaluate(request, result, evaluators): Promise<QcReport>`.

- [ ] **Step 1: Write failing aggregation tests**

```ts
it("fails overall when any hard lock fails", async () => {
  const report = await engine.evaluate(requestWithHardFaceLock, providerResult, [
    async () => ({ category: "FACIAL_GEOMETRY", status: "FAIL", confidence: 0.98, notes: ["jawline drift"], hardLockAffected: true }),
    async () => ({ category: "LIGHTING_CONSISTENCY", status: "PASS", confidence: 0.9, notes: [], hardLockAffected: false })
  ]);
  expect(report.overall).toBe("FAIL");
});

it("warns rather than fails when only soft-lock drift exists", async () => {
  const report = await engine.evaluate(softLockRequest, providerResult, [
    async () => ({ category: "COLOR_GRADE", status: "WARN", confidence: 0.7, notes: ["slight warmth shift"], hardLockAffected: false })
  ]);
  expect(report.overall).toBe("WARN");
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run: `npm test -- tests/qc/generation-qc-engine.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement aggregation**

Rules:
- any finding with `status=FAIL && hardLockAffected=true` => overall `FAIL`;
- otherwise any `FAIL` => overall `FAIL`;
- otherwise any `WARN` => overall `WARN`;
- otherwise `PASS`.

Evaluators are injected so future visual-comparison or model-assisted checks can be added without changing the engine.

- [ ] **Step 4: Verify**

Run: `npm test -- tests/qc/generation-qc-engine.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/qc/generation-qc-engine.ts tests/qc/generation-qc-engine.test.ts src/index.ts
git commit -m "feat: enforce hard-lock QC failures"
```

---

### Task 3: Implement TargetedRepairPlanner

**Files:**
- Create: `src/qc/targeted-repair-planner.ts`
- Create: `tests/qc/targeted-repair-planner.test.ts`
- Modify: `src/index.ts`

**Interfaces:**
- Produces: `planRepair(request: GenerationRequest, report: QcReport): RepairPlan`.

- [ ] **Step 1: Write failing repair-selection tests**

```ts
it("chooses local edit for isolated artifact failure", () => {
  const plan = planRepair(request, artifactOnlyReport);
  expect(plan.action).toBe("LOCAL_EDIT");
});

it("chooses provider switch when identity fidelity fails repeatedly", () => {
  const plan = planRepair(request, repeatedIdentityFailureReport);
  expect(plan.action).toBe("PROVIDER_SWITCH");
});

it("never relaxes a hard lock", () => {
  const plan = planRepair(requestWithHardFaceLock, faceFailureReport);
  expect(plan.relaxLocks).toEqual([]);
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run: `npm test -- tests/qc/targeted-repair-planner.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement deterministic repair rules**

Use these actions: `LOCAL_EDIT`, `MASK_REFINEMENT`, `PROMPT_CORRECTION`, `REFERENCE_ROLE_CORRECTION`, `PROVIDER_SWITCH`, `FULL_REGENERATION`, `REQUIRES_USER_APPROVAL`. Full regeneration is last resort.

- [ ] **Step 4: Verify**

Run: `npm test -- tests/qc/targeted-repair-planner.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/qc/targeted-repair-planner.ts tests/qc/targeted-repair-planner.test.ts src/index.ts
git commit -m "feat: add targeted generation repair planning"
```

---

### Task 4: Implement append-only JSONL ProvenanceLedger

**Files:**
- Create: `src/provenance/types.ts`
- Create: `src/provenance/jsonl-ledger.ts`
- Create: `tests/provenance/jsonl-ledger.test.ts`
- Modify: `src/index.ts`

**Interfaces:**
- Produces: `ProvenanceEntry`, `ProvenanceLedger`, `JsonlProvenanceLedger`.

- [ ] **Step 1: Write failing append/redaction tests**

```ts
it("appends one immutable JSON object per line", async () => {
  const ledger = new JsonlProvenanceLedger(filePath);
  await ledger.append(entryA);
  await ledger.append(entryB);
  const lines = (await readFile(filePath, "utf8")).trim().split("\n");
  expect(lines).toHaveLength(2);
});

it("rejects secret-like fields", async () => {
  const ledger = new JsonlProvenanceLedger(filePath);
  await expect(ledger.append({ ...entryA, metadata: { apiKey: "secret" } })).rejects.toThrow("SECRET_FIELD_REJECTED");
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run: `npm test -- tests/provenance/jsonl-ledger.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement ledger**

Append serialized JSON followed by `\n` using `fs.promises.appendFile`. Before write, recursively reject keys matching `/api[_-]?key|token|secret|password|authorization/i`. Include request ID, timestamps, source asset IDs/hashes, locks, normalized request, routing decision, provider/model, provider job ID, parameters, preflight, QC, repair history, final asset IDs, and anchor status.

- [ ] **Step 4: Verify**

Run: `npm test -- tests/provenance/jsonl-ledger.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/provenance/types.ts src/provenance/jsonl-ledger.ts tests/provenance/jsonl-ledger.test.ts src/index.ts
git commit -m "feat: add append-only generation provenance"
```

---

### Task 5: Add orchestration integration test

**Files:**
- Create: `src/orchestration/generation-orchestrator.ts`
- Create: `tests/orchestration/generation-orchestrator.test.ts`
- Modify: `src/index.ts`

**Interfaces:**
- Produces: `GenerationOrchestrator.run(rawRequest): Promise<GenerationOutcome>`.

- [ ] **Step 1: Write failing end-to-end fixture test**

```ts
it("normalizes, routes, executes, QCs, and records provenance", async () => {
  const outcome = await orchestrator.run(rawMemorialEditRequest);
  expect(outcome.status).toBe("PASS");
  expect(outcome.providerId).toBe("seedream");
  expect(outcome.provenanceRecorded).toBe(true);
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- tests/orchestration/generation-orchestrator.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement orchestration sequence**

Sequence: normalize -> policy compile -> validate -> preflight -> route -> provider preflight -> execute -> QC -> repair plan if failed -> provenance append -> outcome. Do not automatically execute a repair that requires user approval.

- [ ] **Step 4: Run full verification**

Run: `npm test && npm run typecheck && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/orchestration/generation-orchestrator.ts tests/orchestration/generation-orchestrator.test.ts src/index.ts
git commit -m "feat: integrate NovaForge generation orchestration"
```
