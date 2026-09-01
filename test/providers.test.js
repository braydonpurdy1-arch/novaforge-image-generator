import assert from "node:assert/strict";
import test from "node:test";

import { createNovaForgeCore } from "../src/core.js";

function response(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, async json() { return body; } };
}

test("Wan 3.0 uses the official async contract and never runs without confirmation", async () => {
  const calls = [];
  const core = createNovaForgeCore({
    env: {
      NOVAFORGE_WRITE_ENABLED: "true",
      WAN3_ENABLED: "true",
      WAN3_WORKSPACE_ID: "workspace-123",
      WAN3_REGION: "singapore",
      DASHSCOPE_API_KEY: "test-only-key",
    },
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return response({ output: { task_id: "wan-task", task_status: "PENDING" }, request_id: "request-1" });
    },
  });

  await assert.rejects(
    core.createMediaJob("wan3", { prompt: "Night drive", confirmed: false }),
    /confirmation/i,
  );
  assert.equal(calls.length, 0);

  const job = await core.createMediaJob("wan3", {
    prompt: "Night drive",
    duration: 8,
    ratio: "16:9",
    confirmed: true,
  });
  assert.equal(job.taskId, "wan-task");
  assert.match(calls[0].url, /workspace-123\.ap-southeast-1\.maas\.aliyuncs\.com/);
  assert.equal(calls[0].options.headers["X-DashScope-Async"], "enable");
  const payload = JSON.parse(calls[0].options.body);
  assert.equal(payload.model, "wan3.0-video");
  assert.equal(payload.parameters.duration, 8);
  assert.equal(payload.parameters.ratio, "16:9");
});

test("external media URLs fail closed for local/private targets", async () => {
  const core = createNovaForgeCore({
    env: {
      NOVAFORGE_WRITE_ENABLED: "true",
      WAN3_ENABLED: "true",
      WAN3_WORKSPACE_ID: "workspace-123",
      DASHSCOPE_API_KEY: "test-only-key",
    },
    fetchImpl: async () => { throw new Error("must not be called"); },
  });
  await assert.rejects(core.createMediaJob("wan3", {
    prompt: "Use this frame",
    media: [{ type: "first_frame", url: "https://127.0.0.1/private.png" }],
    confirmed: true,
  }), /private or loopback/i);
});

test("Lumina maps to the documented ModelArk Seedance task API", async () => {
  let captured;
  const core = createNovaForgeCore({
    env: {
      NOVAFORGE_WRITE_ENABLED: "true",
      LUMINA_ENABLED: "true",
      BYTEPLUS_ARK_API_KEY: "test-only-key",
    },
    fetchImpl: async (url, options) => {
      captured = { url, options };
      return response({ id: "cgt-test", status: "queued" });
    },
  });
  const job = await core.createMediaJob("lumina", {
    prompt: "Silver car in a cinematic studio",
    duration: 6,
    confirmed: true,
  });
  assert.equal(job.taskId, "cgt-test");
  assert.match(captured.url, /\/api\/v3\/contents\/generations\/tasks$/);
  const payload = JSON.parse(captured.options.body);
  assert.equal(payload.model, "dreamina-seedance-2-5-260628");
  assert.deepEqual(payload.content, [{ type: "text", text: "Silver car in a cinematic studio" }]);
});

test("paid writes are disabled by default", async () => {
  const core = createNovaForgeCore({ env: {}, fetchImpl: async () => response({}) });
  await assert.rejects(
    core.createMediaJob("wan3", { prompt: "test", confirmed: true }),
    /disabled/i,
  );
});
