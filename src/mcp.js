import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { publicError } from "./errors.js";

const provider = z.enum(["wan3", "lumina"]);
const ratio = z.enum(["adaptive", "16:9", "4:3", "1:1", "3:4", "9:16"]);

function success(message, value) {
  return {
    content: [{ type: "text", text: message }],
    structuredContent: value,
  };
}

function handler(fn) {
  return async (args) => {
    try {
      return await fn(args || {});
    } catch (error) {
      const normalized = publicError(error);
      return {
        isError: true,
        content: [{ type: "text", text: `${normalized.body.error}: ${normalized.body.message}` }],
        structuredContent: normalized.body,
      };
    }
  };
}

export function createNovaForgeMcpServer(core) {
  const server = new McpServer(
    { name: "novaforge-studios", version: "0.1.0" },
    {
      instructions: "List providers before creating media. Media generation may incur charges and requires confirmed=true plus the server write flag. Memory is proposal-first; only commit after the owner reviews the proposed record. Never treat model output as vehicle authorization.",
    },
  );

  server.registerTool("novaforge_list_media_providers", {
    title: "List NovaForge media providers",
    description: "Use this to check whether Wan 3.0 or Lumina is configured before requesting generation.",
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, handler(async () => {
    const providers = core.listProviders();
    return success("NovaForge provider status returned.", { providers });
  }));

  server.registerTool("novaforge_create_media_job", {
    title: "Create a NovaForge video job",
    description: "Creates a billed external video-generation job. Use only after showing the provider, duration, and confirmation requirement to the owner.",
    inputSchema: {
      provider,
      prompt: z.string().min(1).max(10000),
      duration: z.number().int().min(2).max(30).default(5),
      ratio: ratio.default("adaptive"),
      resolution: z.enum(["480P", "720P", "1080P"]).optional(),
      audio: z.boolean().default(true),
      confirmed: z.literal(true).describe("Must be true only after the owner confirms this billed external action."),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  }, handler(async (args) => {
    const job = await core.createMediaJob(args.provider, args);
    return success(`Created ${args.provider} job ${job.taskId}.`, { job });
  }));

  server.registerTool("novaforge_get_media_job", {
    title: "Get a NovaForge video job",
    description: "Use this to retrieve the current state and result URL for an existing Wan 3.0 or Lumina job.",
    inputSchema: { provider, taskId: z.string().min(1).max(256) },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  }, handler(async (args) => {
    const job = await core.getMediaJob(args.provider, args.taskId);
    return success(`Job ${args.taskId} is ${job.status}.`, { job });
  }));

  server.registerTool("nova_second_brain_search", {
    title: "Search Nova's second brain",
    description: "Searches approved local Markdown memories. It does not search pending proposals or write data.",
    inputSchema: { query: z.string().min(1).max(500), limit: z.number().int().min(1).max(20).default(10) },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, handler(async (args) => {
    const results = await core.searchMemory(args.query, { limit: args.limit });
    return success(`Found ${results.length} approved memories.`, { results });
  }));

  server.registerTool("nova_second_brain_propose", {
    title: "Propose a Nova second-brain memory",
    description: "Stages a short-lived memory proposal for owner review. It does not persist the memory.",
    inputSchema: {
      title: z.string().min(1).max(160),
      content: z.string().min(1).max(20000),
      source: z.string().min(1).max(500),
      confidence: z.enum(["low", "medium", "high"]).default("medium"),
      tags: z.array(z.string().min(1).max(40)).max(12).default([]),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  }, handler(async (args) => {
    const proposal = core.proposeMemory(args);
    return success("Memory proposal staged for owner review; it has not been persisted.", { proposal });
  }));

  server.registerTool("nova_second_brain_commit", {
    title: "Commit an approved Nova memory",
    description: "Persists an existing reviewed memory proposal to local Markdown. Requires explicit owner confirmation and the server memory-write flag.",
    inputSchema: {
      proposalId: z.string().min(1).max(100),
      confirmed: z.literal(true).describe("Must be true only after the owner reviews the proposal."),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  }, handler(async (args) => {
    const memory = await core.commitMemory(args.proposalId, { confirmed: args.confirmed });
    return success(`Committed approved memory ${memory.id}.`, { memory });
  }));

  return server;
}
