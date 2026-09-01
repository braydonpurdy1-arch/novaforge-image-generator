import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { timingSafeEqual } from "node:crypto";

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { createNovaForgeCore } from "./core.js";
import { publicError } from "./errors.js";
import { createNovaForgeMcpServer } from "./mcp.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const INDEX_FILE = path.resolve(HERE, "../public/index.html");
const MAX_BODY_BYTES = 256 * 1024;

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}

async function body(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      const error = new Error("Request body too large");
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Request body must be valid JSON");
    error.status = 400;
    throw error;
  }
}

function loopback(address) {
  return address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
}

function constantTimeEqual(left, right) {
  const a = Buffer.from(left || "");
  const b = Buffer.from(right || "");
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

function authorize(req, env) {
  const mode = (env.NOVA_AUTH_MODE || "token").trim().toLowerCase();
  if (mode === "tunnel") {
    return loopback(req.socket.remoteAddress)
      ? null
      : { status: 403, body: { error: "FORBIDDEN", message: "Tunnel mode only trusts loopback connections." } };
  }
  if (mode !== "token") {
    return { status: 503, body: { error: "AUTH_NOT_CONFIGURED", message: "Unsupported authentication mode." } };
  }
  const configured = (env.NOVAFORGE_SERVICE_TOKEN || "").trim();
  if (!configured) {
    return { status: 503, body: { error: "AUTH_NOT_CONFIGURED", message: "Service token is not configured." } };
  }
  const header = String(req.headers.authorization || "");
  const supplied = header.startsWith("Bearer ") ? header.slice(7) : "";
  return constantTimeEqual(configured, supplied)
    ? null
    : { status: 401, body: { error: "UNAUTHORIZED", message: "A valid bearer token is required." } };
}

function mcpCors(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "authorization, content-type, mcp-session-id",
    });
    res.end();
    return true;
  }
  return false;
}

export function createNovaForgeHttpServer({
  env = process.env,
  fetchImpl = fetch,
  memoryRoot,
  logger = console,
} = {}) {
  const core = createNovaForgeCore({ env, fetchImpl, memoryRoot });

  return createServer(async (req, res) => {
    if (!req.url || !req.method) return json(res, 400, { error: "BAD_REQUEST" });
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    if (req.method === "GET" && url.pathname === "/") {
      const html = await readFile(INDEX_FILE, "utf8");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(html);
    }
    if (req.method === "GET" && url.pathname === "/health") {
      return json(res, 200, { status: "ok", service: "novaforge-studios", providers: core.listProviders() });
    }

    if (url.pathname === "/mcp" && mcpCors(req, res)) return;
    const authError = authorize(req, env);
    if (authError) return json(res, authError.status, authError.body);

    if (url.pathname === "/mcp" && ["POST", "GET", "DELETE"].includes(req.method)) {
      const server = createNovaForgeMcpServer(core);
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      res.on("close", () => {
        transport.close();
        server.close();
      });
      try {
        await server.connect(transport);
        await transport.handleRequest(req, res);
      } catch (error) {
        logger.error("MCP request failed", error?.name || "Error");
        if (!res.headersSent) json(res, 500, { error: "MCP_REQUEST_FAILED" });
      }
      return;
    }

    try {
      if (req.method === "GET" && url.pathname === "/api/providers") {
        return json(res, 200, { providers: core.listProviders() });
      }
      if (req.method === "POST" && url.pathname === "/api/jobs") {
        const input = await body(req);
        const job = await core.createMediaJob(input.provider, input);
        return json(res, 202, { job });
      }
      const jobMatch = url.pathname.match(/^\/api\/jobs\/(wan3|lumina)\/([^/]+)$/);
      if (req.method === "GET" && jobMatch) {
        const job = await core.getMediaJob(jobMatch[1], decodeURIComponent(jobMatch[2]));
        return json(res, 200, { job });
      }
      if (req.method === "GET" && url.pathname === "/api/memory/search") {
        const results = await core.searchMemory(url.searchParams.get("q"), {
          limit: url.searchParams.get("limit"),
        });
        return json(res, 200, { results });
      }
      if (req.method === "POST" && url.pathname === "/api/memory/proposals") {
        const proposal = core.proposeMemory(await body(req));
        return json(res, 201, { proposal });
      }
      const commitMatch = url.pathname.match(/^\/api\/memory\/proposals\/([^/]+)\/commit$/);
      if (req.method === "POST" && commitMatch) {
        const input = await body(req);
        const memory = await core.commitMemory(decodeURIComponent(commitMatch[1]), {
          confirmed: input.confirmed,
        });
        return json(res, 201, { memory });
      }
      return json(res, 404, { error: "NOT_FOUND" });
    } catch (error) {
      if (error?.status && !("code" in error)) {
        return json(res, error.status, { error: "BAD_REQUEST", message: error.message });
      }
      const normalized = publicError(error);
      if (normalized.status >= 500) logger.error("Request failed", error?.name || "Error");
      return json(res, normalized.status, normalized.body);
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const host = process.env.HOST || "127.0.0.1";
  const port = Number(process.env.PORT || 8787);
  const server = createNovaForgeHttpServer();
  server.listen(port, host, () => {
    console.log(`NovaForge Studios listening on http://${host}:${port}`);
    console.log(`MCP endpoint: http://${host}:${port}/mcp`);
  });
}
