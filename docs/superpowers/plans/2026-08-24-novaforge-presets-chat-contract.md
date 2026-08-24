# NovaForge Presets and Chat Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reusable NovaForge workflow presets and a ChatGPT-facing contract that preserves lock semantics, supports explicit Seedream routing, and never claims modification of ChatGPT internals.

**Architecture:** Presets compile domain defaults into `GenerationRequest` fragments. The Chat contract turns image instructions into explicit locks, deltas, provider requirements/preferences, and approval requirements. Cinematic instructions compile into deterministic camera/lighting/motion prompt sections. The contract calls the orchestration layer rather than embedding provider logic.

**Tech Stack:** Node.js 20+, TypeScript 5.x, Vitest, npm.

**Spec:** `docs/superpowers/specs/2026-08-24-novaforge-image-studios-core-design.md`

## Global Constraints

- User-approved references override stylistic defaults.
- “Use image X as main base” maps to a composition anchor.
- “Do not change face” maps to a hard face/identity lock.
- “Only change X” maps to strict delta semantics; unspecified regions are preserved.
- Seedream is preferred for qualifying photoreal still tasks when merely hinted by a preset.
- An explicit user instruction such as “use Seedream” or “Seedream mode” sets `providerRequired=true`; if no compliant Seedream transport is available, return unavailable rather than silently routing elsewhere.
- ChatGPT integration is policy/tool routing around available image capabilities; it does not alter the OpenAI product backend.
- Identity-containing outputs require user approval before permanent anchor promotion.

---

### Task 1: Define preset contract and registry

**Files:**
- Create: `src/presets/types.ts`
- Create: `src/presets/preset-registry.ts`
- Create: `tests/presets/preset-registry.test.ts`
- Modify: `src/index.ts`

**Interfaces:**
- Produces: `PresetId`, `WorkflowPreset`, `PresetRegistry.get(id)`.

- [ ] **Step 1: Write failing registry test**

```ts
import { expect, it } from "vitest";
import { PresetRegistry } from "../../src/presets/preset-registry";

it("contains the five locked v1 presets", () => {
  const ids = new PresetRegistry().list().map(p => p.id);
  expect(ids).toEqual(expect.arrayContaining([
    "MEMORIAL_PHOTOREAL",
    "LOCKED_FACE_EDIT",
    "VEHICLE_VISUALIZER",
    "POSTER_TYPOGRAPHY",
    "STILL_TO_VIDEO_CINEMATIC"
  ]));
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm test -- tests/presets/preset-registry.test.ts`
Expected: FAIL because the registry does not exist.

- [ ] **Step 3: Implement registry types**

`WorkflowPreset` defines `id`, `description`, `defaultOperation`, `defaultQualityTier`, `requiredLocks`, `routingHints`, `qcRequirements`, and `allowsIntermediateAutoPromotion`.

- [ ] **Step 4: Verify**

Run: `npm test -- tests/presets/preset-registry.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/presets/types.ts src/presets/preset-registry.ts tests/presets/preset-registry.test.ts src/index.ts
git commit -m "feat: add NovaForge preset registry"
```

---

### Task 2: Implement locked workflow presets

**Files:**
- Create: `src/presets/memorial-photoreal.ts`
- Create: `src/presets/locked-face-edit.ts`
- Create: `src/presets/vehicle-visualizer.ts`
- Create: `src/presets/poster-typography.ts`
- Create: `src/presets/still-to-video-cinematic.ts`
- Create: `tests/presets/presets.test.ts`
- Modify: `src/presets/preset-registry.ts`

**Interfaces:**
- Produces: five concrete `WorkflowPreset` instances.

- [ ] **Step 1: Write failing preset-behaviour tests**

```ts
it("Memorial Photoreal prefers photoreal still routing and strict identity QC", () => {
  const preset = registry.get("MEMORIAL_PHOTOREAL");
  expect(preset.routingHints.preferredProviderClass).toBe("PHOTOREAL_STILL");
  expect(preset.qcRequirements).toContain("IDENTITY_FIDELITY");
});

it("Locked Face Edit requires hard FACE preservation", () => {
  const preset = registry.get("LOCKED_FACE_EDIT");
  expect(preset.requiredLocks).toContainEqual(expect.objectContaining({ type: "FACE", strength: "HARD" }));
});

it("Vehicle Visualizer hard-locks vehicle body geometry", () => {
  const preset = registry.get("VEHICLE_VISUALIZER");
  expect(preset.requiredLocks).toContainEqual(expect.objectContaining({ type: "VEHICLE_BODY", strength: "HARD" }));
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- tests/presets/presets.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement preset defaults**

Memorial: hard identity/composition, natural skin/materials, photoreal-still routing hint, strict QC. Locked Face Edit: hard face lock, minimal delta, no unsolicited retouch/relight/smoothing/sharpening. Vehicle Visualizer: hard body/series/paint locks unless explicitly changed. Poster: typography capability is a hard routing/QC requirement. Still-to-Video: approved still as start anchor, optional end frame, hard identity/wardrobe, explicit camera motion, continuity QC.

- [ ] **Step 4: Verify**

Run: `npm test -- tests/presets/presets.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/presets/*.ts tests/presets/presets.test.ts
git commit -m "feat: add locked NovaForge media presets"
```

---

### Task 3: Implement ChatImageContract parser

**Files:**
- Create: `src/chat/chat-image-contract.ts`
- Create: `tests/chat/chat-image-contract.test.ts`
- Modify: `src/index.ts`

**Interfaces:**
- Produces: `parseChatImageInstruction(input: ChatImageInstruction): ChatImageContractResult`.

- [ ] **Step 1: Write failing lock-language tests**

```ts
it("maps main base language to a composition anchor", () => {
  const result = parseChatImageInstruction({
    text: "Use image 1 as main locked base. Only change the stairs.",
    images: [{ id: "image-1", ordinal: 1 }]
  });
  expect(result.locks).toContainEqual(expect.objectContaining({ assetId: "image-1", type: "COMPOSITION", strength: "HARD" }));
  expect(result.allowedTargets).toEqual(["stairs"]);
});

it("maps do not change face to a hard FACE lock", () => {
  const result = parseChatImageInstruction({
    text: "Do not change his face at all",
    images: [{ id: "image-2", ordinal: 2 }]
  });
  expect(result.locks).toContainEqual(expect.objectContaining({ type: "FACE", strength: "HARD" }));
});

it("treats explicit Seedream mode as a required provider class", () => {
  const result = parseChatImageInstruction({ text: "Seedream mode, refinement only", images: [] });
  expect(result.preferredProviderClass).toBe("SEEDREAM");
  expect(result.providerRequired).toBe(true);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- tests/chat/chat-image-contract.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement deterministic parser**

Recognize `main base`, `locked in`, `do not change`, `only change`, `refinement only`, `make this the new anchor`, and explicit `Seedream` language. Unresolved image ordinals or contradictory instructions return `needsUserInput: true`. Generic photoreal requests may prefer Seedream without requiring it; explicit Seedream language requires it.

- [ ] **Step 4: Verify**

Run: `npm test -- tests/chat/chat-image-contract.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/chat/chat-image-contract.ts tests/chat/chat-image-contract.test.ts src/index.ts
git commit -m "feat: add ChatGPT-facing image lock contract"
```

---

### Task 4: Add anchor promotion policy

**Files:**
- Create: `src/anchors/anchor-manager.ts`
- Create: `tests/anchors/anchor-manager.test.ts`
- Modify: `src/index.ts`

**Interfaces:**
- Produces: `AnchorManager.canPromote(candidate, context): AnchorPromotionDecision` and `promote(...)`.

- [ ] **Step 1: Write failing approval tests**

```ts
it("requires user approval before promoting identity-containing output", () => {
  const decision = manager.canPromote(identityCandidate, { qc: passingQc, userApproved: false, presetAllowsIntermediateAutoPromotion: false });
  expect(decision.status).toBe("REQUIRES_USER_APPROVAL");
});

it("allows approved passing identity output", () => {
  const decision = manager.canPromote(identityCandidate, { qc: passingQc, userApproved: true, presetAllowsIntermediateAutoPromotion: false });
  expect(decision.status).toBe("ALLOWED");
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- tests/anchors/anchor-manager.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement policy**

Reject promotion on QC failure. Require explicit user approval for identity-containing outputs. Permit non-identity intermediate auto-promotion only when the active preset explicitly allows it.

- [ ] **Step 4: Verify**

Run: `npm test -- tests/anchors/anchor-manager.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/anchors/anchor-manager.ts tests/anchors/anchor-manager.test.ts src/index.ts
git commit -m "feat: add safe anchor promotion policy"
```

---

### Task 5: Implement cinematic prompt compiler

**Files:**
- Create: `src/prompt/cinematic-prompt-compiler.ts`
- Create: `tests/prompt/cinematic-prompt-compiler.test.ts`
- Modify: `src/index.ts`

**Interfaces:**
- Produces: `compileCinematicPrompt(input: CinematicPromptInput): CompiledPrompt`.

- [ ] **Step 1: Write failing ordering and physics tests**

```ts
it("compiles prompt sections in the locked order", () => {
  const result = compileCinematicPrompt(cinematicFixture);
  expect(result.sections.map(s => s.kind)).toEqual([
    "SUBJECT_REFERENCES",
    "SHOT_CAMERA",
    "FOCAL_PERSPECTIVE",
    "SCENE_BLOCKING",
    "LIGHTING",
    "MATERIALS",
    "MOTION",
    "ATMOSPHERE",
    "PRESERVATION",
    "FAILURE_CONSTRAINTS"
  ]);
});

it("adds physical motion constraints for video", () => {
  const result = compileCinematicPrompt({ ...cinematicFixture, mediaType: "VIDEO", motion: "walk forward" });
  expect(result.text).toContain("preserve contact, weight transfer, gravity, inertia, cloth and hair response");
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- tests/prompt/cinematic-prompt-compiler.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement compiler**

Compile the exact ten-section order from the approved spec. For video, append explicit physical motion language covering contact, weight transfer, gravity, acceleration/deceleration, inertia, cloth/hair response, and continuity. Hard locks are repeated in the preservation and failure-constraint sections.

- [ ] **Step 4: Verify**

Run: `npm test -- tests/prompt/cinematic-prompt-compiler.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/prompt/cinematic-prompt-compiler.ts tests/prompt/cinematic-prompt-compiler.test.ts src/index.ts
git commit -m "feat: compile cinematic prompts with physics constraints"
```

---

### Task 6: Add README usage contract and final integration tests

**Files:**
- Create: `README.md`
- Create: `tests/integration/preset-chat-orchestration.test.ts`

**Interfaces:**
- Consumes: preset registry, chat contract, reference policy, router, orchestrator, anchor manager, cinematic prompt compiler.
- Produces: documented public v1 workflow.

- [ ] **Step 1: Write failing integration test**

```ts
it("turns an explicit Seedream locked edit into a required strict delta request", async () => {
  const contract = parseChatImageInstruction({
    text: "Use image 1 as locked base. Do not change his face. Use Seedream. Only change the stairs to white marble with gold lines.",
    images: [{ id: "image-1", ordinal: 1 }]
  });
  const request = compileContractWithPreset(contract, registry.get("MEMORIAL_PHOTOREAL"));
  expect(request.operation).toBe("DELTA_EDIT");
  expect(request.forbiddenChanges).toContain("UNSPECIFIED_REGIONS");
  expect(request.preferredProvider).toBe("seedream");
  expect(request.providerRequired).toBe(true);
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm test -- tests/integration/preset-chat-orchestration.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `compileContractWithPreset` and README**

README documents locked-base semantics, delta editing, Seedream preference vs explicit requirement, provider-neutral routing, privacy modes, QC/repair, anchor approval, cinematic compilation, and the explicit statement that NovaForge does not modify ChatGPT’s internal image backend.

- [ ] **Step 4: Final verification**

Run: `npm test && npm run typecheck && npm run build`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add README.md src/chat src/presets src/anchors src/prompt tests/integration src/index.ts
git commit -m "docs: document NovaForge image workflow contract"
```
