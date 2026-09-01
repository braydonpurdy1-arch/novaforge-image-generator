import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

import { createNovaForgeHttpServer } from "../src/server.js";

async function listen(server) {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return `http://127.0.0.1:${server.address().port}`;
}

test("REST endpoints require authentication in the default token mode", async (t) => {
  const server = createNovaForgeHttpServer({
    env: { NOVA_AUTH_MODE: "token", NOVAFORGE_SERVICE_TOKEN: "test-token" },
    logger: { error() {} },
  });
  t.after(() => server.close());
  const url = await listen(server);

  const denied = await fetch(`${url}/api/providers`);
  assert.equal(denied.status, 401);
  const allowed = await fetch(`${url}/api/providers`, {
    headers: { Authorization: "Bearer test-token" },
  });
  assert.equal(allowed.status, 200);
  const payload = await allowed.json();
  assert.deepEqual(payload.providers.map((item) => item.id), ["wan3", "lumina"]);
});

test("MCP advertises read and approval-gated write tools over streamable HTTP", async (t) => {
  const server = createNovaForgeHttpServer({
    env: { NOVA_AUTH_MODE: "tunnel" },
    logger: { error() {} },
  });
  t.after(() => server.close());
  const url = await listen(server);
  const client = new Client({ name: "novaforge-test", version: "0.1.0" });
  const transport = new StreamableHTTPClientTransport(new URL(`${url}/mcp`));
  t.after(async () => client.close());
  await client.connect(transport);

  const tools = await client.listTools();
  const byName = new Map(tools.tools.map((tool) => [tool.name, tool]));
  assert.equal(byName.get("novaforge_list_media_providers").annotations.readOnlyHint, true);
  assert.equal(byName.get("novaforge_create_media_job").annotations.openWorldHint, true);
  assert.equal(byName.get("nova_second_brain_commit").annotations.readOnlyHint, false);

  const result = await client.callTool({ name: "novaforge_list_media_providers", arguments: {} });
  assert.equal(result.isError, undefined);
  assert.equal(result.structuredContent.providers.length, 2);
});
