import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { SecondBrain } from "../src/memory.js";

test("second-brain memories are proposal-first and source-stamped", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "nova-memory-"));
  const brain = new SecondBrain({ root, writeEnabled: true });
  const proposal = brain.propose({
    title: "Nova provider boundary",
    content: "Provider credentials remain backend-only.",
    source: "vf-ui security model",
    confidence: "high",
    tags: ["security", "Nova"],
  });

  await assert.rejects(brain.commit(proposal.id), /confirmation/i);
  const committed = await brain.commit(proposal.id, { confirmed: true });
  assert.equal(committed.state, "committed");
  const filename = committed.uri.replace("nova-memory://", "");
  const text = await readFile(path.join(root, filename), "utf8");
  assert.match(text, /source: "vf-ui security model"/);
  assert.match(text, /confidence: high/);
  assert.match(text, /last_verified:/);

  const results = await brain.search("backend-only");
  assert.equal(results.length, 1);
  assert.equal(results[0].title, "Nova provider boundary");
});

test("persistent memory is disabled unless the operator opts in", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "nova-memory-disabled-"));
  const brain = new SecondBrain({ root, writeEnabled: false });
  const proposal = brain.propose({ title: "Test", content: "Value", source: "test" });
  await assert.rejects(brain.commit(proposal.id, { confirmed: true }), /disabled/i);
});
