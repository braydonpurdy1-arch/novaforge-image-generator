# NovaForge Core Policy Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the typed NovaForge request, lock, policy, normalization, privacy, and preflight foundation that every image/video workflow uses.

**Architecture:** Implement a provider-neutral TypeScript core. Raw user instructions are normalized into a strict `GenerationRequest`; the reference policy engine compiles hard/soft locks and allowed deltas; privacy handling and preflight reject contradictory, unsupported, or unsafe requests before any provider call.

**Tech Stack:** Node.js 20+, TypeScript 5.x, Vitest, npm.

**Spec:** `docs/superpowers/specs/2026-08-24-novaforge-image-studios-core-design.md`

## Global Constraints

- Locked means locked; hard-lock violations fail closed.
- Delta edits preserve everything not explicitly allowed to change.
- `LOCAL_ONLY` requests may never route to remote providers.
- `REMOTE_REDACTED` may use a remote provider only after the configured redaction plan has been applied.
- Explicit provider requirements such as “use Seedream” are represented separately from ordinary preferences.
- Provider credentials must never be stored in source, prompts, tests, or provenance.
- No biometric identity lookup against external databases.
- No provider-specific logic in UI-facing request contracts.

---

### Task 1: Bootstrap TypeScript + test harness

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `src/index.ts`
- Create: `tests/smoke.test.ts`

**Interfaces:**
- Produces: npm scripts `build`, `test`, `test:watch`, `typecheck`.

- [ ] **Step 1: Write the failing smoke test**

```ts
import { describe, expect, it } from "vitest";
import { NOVAFORGE_CORE_VERSION } from "../src/index";

describe("NovaForge core", () => {
  it("exports a version", () => {
    expect(NOVAFORGE_CORE_VERSION).toBe("0.1.0");
  });
});
```

- [ ] **Step 2: Add project configuration**

`package.json`:

```json
{
  "name": "novaforge-image-generator",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@types/node": "^20.16.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "outDir": "dist"
  },
  "include": ["src/**/*.ts", "tests/**/*.ts", "vitest.config.ts"]
}
```

`vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node" }
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm install && npm test`
Expected: FAIL because `NOVAFORGE_CORE_VERSION` is missing.

- [ ] **Step 4: Add the minimal export**

```ts
export const NOVAFORGE_CORE_VERSION = "0.1.0" as const;
```

- [ ] **Step 5: Verify**

Run: `npm test && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts src/index.ts tests/smoke.test.ts
git commit -m "chore: bootstrap NovaForge TypeScript core"
```

---

### Task 2: Define domain contracts

**Files:**
- Create: `src/domain/types.ts`
- Create: `tests/domain/types.test.ts`
- Modify: `src/index.ts`

**Interfaces:**
- Produces: `Operation`, `LockType`, `LockStrength`, `PrivacyMode`, `SourceAsset`, `ReferenceLock`, `AllowedChange`, `OutputRequirements`, `GenerationRequest`, `RawImageRequest`.

- [ ] **Step 1: Write the compile-time/runtime contract test**

```ts
import { expect, it } from "vitest";
import type { GenerationRequest } from "../../src/domain/types";

it("accepts a strict delta edit request with an explicit provider requirement", () => {
  const request: GenerationRequest = {
    requestId: "req-1",
    intent: "change stairs only",
    operation: "DELTA_EDIT",
    prompt: "Make the stairs white marble with thin gold lines",
    sourceAssets: [{ id: "base", uri: "file://base.png", roles: ["composition"] }],
    locks: [{ lockId: "face", assetId: "base", type: "FACE", scope: "subject:male", description: "preserve face exactly", strength: "HARD" }],
    allowedChanges: [{ target: "stairs", transformation: "white marble with thin gold lines", acceptableVariance: 0.05, geometryMayChange: false, colorMayChange: true, lightingMayChange: false, textureMayChange: true }],
    forbiddenChanges: ["face", "pose", "wings"],
    outputRequirements: { aspectRatio: "3:4", qualityTier: "MASTER" },
    preferredProvider: "seedream",
    providerRequired: true,
    qualityTier: "MASTER",
    privacyMode: "REMOTE_ALLOWED"
  };

  expect(request.operation).toBe("DELTA_EDIT");
  expect(request.providerRequired).toBe(true);
});
```

- [ ] **Step 2: Run typecheck and confirm failure**

Run: `npm run typecheck`
Expected: FAIL because domain types do not exist.

- [ ] **Step 3: Implement exact types**

Create string unions matching the design spec. Use `roles: Array<"identity" | "face" | "profile" | "hair" | "expression" | "clothing" | "pose" | "composition" | "scene" | "object">` on `SourceAsset`. `GenerationRequest` includes optional `preferredProvider`, optional `preferredModel`, and `providerRequired: boolean` defaulting to false when compiled from raw input.

- [ ] **Step 4: Re-export the domain contract**

```ts
export * from "./domain/types.js";
```

- [ ] **Step 5: Verify**

Run: `npm test && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/domain/types.ts src/index.ts tests/domain/types.test.ts
git commit -m "feat: define NovaForge generation contracts"
```

---

### Task 3: Implement strict ReferencePolicyEngine

**Files:**
- Create: `src/policy/reference-policy-engine.ts`
- Create: `tests/policy/reference-policy-engine.test.ts`
- Modify: `src/index.ts`

**Interfaces:**
- Consumes: `RawImageRequest`, `GenerationRequest`.
- Produces: `class ReferencePolicyEngine { compile(raw: RawImageRequest): Promise<GenerationRequest>; validate(request: GenerationRequest): PolicyValidation }`.

- [ ] **Step 1: Write failing tests for strict preservation**

```ts
import { expect, it } from "vitest";
import { ReferencePolicyEngine } from "../../src/policy/reference-policy-engine";

const engine = new ReferencePolicyEngine();

it("defaults unspecified areas to preserved for DELTA_EDIT", async () => {
  const result = await engine.compile({
    requestId: "r1",
    intent: "change stairs only",
    operation: "DELTA_EDIT",
    prompt: "Make the stairs marble",
    sourceAssets: [{ id: "base", uri: "file://base.png", roles: ["composition"] }],
    explicitLocks: [],
    requestedChanges: [{ target: "stairs", transformation: "marble" }],
    privacyMode: "REMOTE_ALLOWED"
  });

  expect(result.forbiddenChanges).toContain("UNSPECIFIED_REGIONS");
  expect(result.allowedChanges).toHaveLength(1);
});

it("rejects an allowed change that conflicts with a hard lock", async () => {
  const request = await engine.compile({
    requestId: "r2",
    intent: "change face",
    operation: "DELTA_EDIT",
    prompt: "change face",
    sourceAssets: [{ id: "base", uri: "file://base.png", roles: ["face"] }],
    explicitLocks: [{ lockId: "face", assetId: "base", type: "FACE", scope: "subject", description: "locked", strength: "HARD" }],
    requestedChanges: [{ target: "subject:face", transformation: "change" }],
    privacyMode: "REMOTE_ALLOWED"
  });

  expect(engine.validate(request).status).toBe("BLOCKED_BY_POLICY");
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- tests/policy/reference-policy-engine.test.ts`
Expected: FAIL because engine is missing.

- [ ] **Step 3: Implement compile semantics**

Rules:
- Preserve explicit hard locks verbatim.
- For `DELTA_EDIT`, append `UNSPECIFIED_REGIONS` to `forbiddenChanges`.
- Convert requested changes into `AllowedChange` defaults with `acceptableVariance: 0.05` and geometry/lighting changes false unless explicitly requested.
- Do not infer face retouching from “clean up”, “sharpen”, or “enhance”.
- If a requested target overlaps a hard lock scope, validation returns `BLOCKED_BY_POLICY`.
- Preserve explicit provider preference/requirement fields without allowing them to override hard locks or privacy mode.

- [ ] **Step 4: Verify tests**

Run: `npm test -- tests/policy/reference-policy-engine.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/policy/reference-policy-engine.ts tests/policy/reference-policy-engine.test.ts src/index.ts
git commit -m "feat: enforce strict reference lock policy"
```

---

### Task 4: Add ambiguity-safe RequestNormalizer

**Files:**
- Create: `src/normalization/request-normalizer.ts`
- Create: `tests/normalization/request-normalizer.test.ts`
- Modify: `src/index.ts`

**Interfaces:**
- Produces: `normalizePrompt(rawText: string, lockedScopes: string[]): NormalizedPrompt`.

- [ ] **Step 1: Write failing ambiguity tests**

```ts
it("does not reinterpret a locked face when user says clean it up", () => {
  const result = normalizePrompt("clean it up and sharpen it", ["subject:face"]);
  expect(result.prohibitedInferences).toContain("retouch:subject:face");
  expect(result.prohibitedInferences).toContain("relight:subject:face");
});

it("expands more dramatic into non-geometric changes", () => {
  const result = normalizePrompt("make it more dramatic", []);
  expect(result.explicitDeltas).toEqual(expect.arrayContaining(["increase local contrast", "increase shadow depth"]));
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- tests/normalization/request-normalizer.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement deterministic phrase rules**

Use a small explicit mapping only for known ambiguous phrases. Do not call an LLM in v1. Unknown ambiguity must set `needsUserInput: true` when it intersects a hard lock.

- [ ] **Step 4: Verify**

Run: `npm test -- tests/normalization/request-normalizer.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/normalization/request-normalizer.ts tests/normalization/request-normalizer.test.ts src/index.ts
git commit -m "feat: normalize ambiguous image edit instructions"
```

---

### Task 5: Implement privacy redaction policy

**Files:**
- Create: `src/privacy/privacy-policy.ts`
- Create: `tests/privacy/privacy-policy.test.ts`
- Modify: `src/index.ts`

**Interfaces:**
- Produces: `applyPrivacyPolicy(request: GenerationRequest, plan: RedactionPlan): PrivacyPreparedRequest`.

- [ ] **Step 1: Write failing privacy tests**

```ts
it("leaves REMOTE_ALLOWED request unchanged", () => {
  const prepared = applyPrivacyPolicy(remoteAllowedRequest, { redactAssetIds: [], removeMetadataKeys: [] });
  expect(prepared.redactionApplied).toBe(false);
});

it("requires redaction before REMOTE_REDACTED can leave the device", () => {
  const prepared = applyPrivacyPolicy(remoteRedactedRequest, { redactAssetIds: ["private-ref"], removeMetadataKeys: ["gps"] });
  expect(prepared.redactionApplied).toBe(true);
  expect(prepared.request.sourceAssets.find(a => a.id === "private-ref")).toBeUndefined();
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- tests/privacy/privacy-policy.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement deterministic redaction**

For `REMOTE_REDACTED`, remove configured asset IDs and metadata keys before routing. If a removed asset is required by a hard lock, return `NEEDS_USER_INPUT` rather than silently weakening the request. `LOCAL_ONLY` performs no remote preparation at all.

- [ ] **Step 4: Verify**

Run: `npm test -- tests/privacy/privacy-policy.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/privacy/privacy-policy.ts tests/privacy/privacy-policy.test.ts src/index.ts
git commit -m "feat: enforce NovaForge privacy modes"
```

---

### Task 6: Implement GenerationPreflight

**Files:**
- Create: `src/preflight/generation-preflight.ts`
- Create: `tests/preflight/generation-preflight.test.ts`
- Modify: `src/index.ts`

**Interfaces:**
- Produces: `runPreflight(request: GenerationRequest, context: PreflightContext): PreflightResult` with status `READY | NEEDS_USER_INPUT | UNSUPPORTED | BLOCKED_BY_POLICY`.

- [ ] **Step 1: Write failing privacy/capability/provider tests**

```ts
it("returns UNSUPPORTED when LOCAL_ONLY has no local provider", () => {
  const result = runPreflight(localOnlyRequest, { providers: [{ id: "remote", locality: "REMOTE", operations: ["EDIT"] }] });
  expect(result.status).toBe("UNSUPPORTED");
});

it("returns UNSUPPORTED when no provider supports the operation", () => {
  const result = runPreflight(outpaintRequest, { providers: [{ id: "x", locality: "REMOTE", operations: ["GENERATE"] }] });
  expect(result.status).toBe("UNSUPPORTED");
});

it("returns UNSUPPORTED when an explicitly required provider class is unavailable", () => {
  const result = runPreflight(seedreamRequiredRequest, { providers: [{ id: "openai-image", locality: "REMOTE", operations: ["EDIT"] }] });
  expect(result.status).toBe("UNSUPPORTED");
  expect(result.reasons).toContain("REQUIRED_PROVIDER_UNAVAILABLE");
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run: `npm test -- tests/preflight/generation-preflight.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement deterministic preflight**

Validate source presence/readability, contradictory locks, aspect ratio/output dimensions, privacy locality, operation support, required references/masks, explicit provider requirements, and whether `REMOTE_REDACTED` has a completed redaction result. Return stable reason codes including `LOCAL_PROVIDER_UNAVAILABLE`, `OPERATION_UNSUPPORTED`, `MISSING_SOURCE_ASSET`, `LOCK_CONFLICT`, `REQUIRED_PROVIDER_UNAVAILABLE`, and `REDACTION_REQUIRED`.

- [ ] **Step 4: Run full verification**

Run: `npm test && npm run typecheck && npm run build`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/preflight/generation-preflight.ts tests/preflight/generation-preflight.test.ts src/index.ts
git commit -m "feat: add NovaForge generation preflight"
```
