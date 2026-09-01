import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { NovaForgeError } from "./errors.js";
import { oneOf, requiredText } from "./validation.js";

function enabled(value) {
  return String(value || "false").trim().toLowerCase() === "true";
}

function cleanTags(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > 12) {
    throw new NovaForgeError("tags must be an array with at most 12 items", { code: "INVALID_INPUT" });
  }
  return [...new Set(value.map((tag) => requiredText(tag, "tag", 40).toLowerCase()))];
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "memory";
}

function markdown(record) {
  return [
    "---",
    `id: ${JSON.stringify(record.id)}`,
    `title: ${JSON.stringify(record.title)}`,
    `source: ${JSON.stringify(record.source)}`,
    `confidence: ${record.confidence}`,
    `created_at: ${record.createdAt}`,
    "verification_state: unverified",
    "last_verified: null",
    `tags: ${JSON.stringify(record.tags)}`,
    "---",
    "",
    record.content,
    "",
  ].join("\n");
}

export class SecondBrain {
  constructor({ root, writeEnabled = false, now = () => new Date(), proposalTtlMs = 15 * 60 * 1000 }) {
    this.root = path.resolve(root);
    this.writeEnabled = writeEnabled;
    this.now = now;
    this.proposalTtlMs = proposalTtlMs;
    this.pending = new Map();
  }

  propose(input) {
    const now = this.now();
    const record = {
      id: randomUUID(),
      title: requiredText(input?.title, "title", 160),
      content: requiredText(input?.content, "content", 20000),
      source: requiredText(input?.source, "source", 500),
      confidence: oneOf(input?.confidence, ["low", "medium", "high"], "confidence", "medium"),
      tags: cleanTags(input?.tags),
      createdAt: now.toISOString(),
      verificationState: "unverified",
      lastVerified: null,
    };
    this.pending.set(record.id, { record, expiresAt: now.getTime() + this.proposalTtlMs });
    return { ...record, state: "proposed", expiresAt: new Date(now.getTime() + this.proposalTtlMs).toISOString() };
  }

  async commit(proposalIdValue, { confirmed = false } = {}) {
    if (!this.writeEnabled) {
      throw new NovaForgeError("Persistent second-brain writes are disabled", {
        code: "MEMORY_WRITES_DISABLED",
        status: 503,
      });
    }
    if (confirmed !== true) {
      throw new NovaForgeError("Owner confirmation is required before memory is persisted", {
        code: "CONFIRMATION_REQUIRED",
        status: 409,
      });
    }
    const proposalId = requiredText(proposalIdValue, "proposalId", 100);
    const pending = this.pending.get(proposalId);
    if (!pending || pending.expiresAt < this.now().getTime()) {
      this.pending.delete(proposalId);
      throw new NovaForgeError("The memory proposal is missing or expired", {
        code: "PROPOSAL_NOT_FOUND",
        status: 404,
      });
    }
    await mkdir(this.root, { recursive: true });
    const date = pending.record.createdAt.slice(0, 10);
    const filename = `${date}-${slug(pending.record.title)}-${pending.record.id.slice(0, 8)}.md`;
    await writeFile(path.join(this.root, filename), markdown(pending.record), { encoding: "utf8", flag: "wx" });
    this.pending.delete(proposalId);
    return {
      id: pending.record.id,
      title: pending.record.title,
      state: "committed",
      uri: `nova-memory://${filename}`,
    };
  }

  async search(queryValue, { limit = 10 } = {}) {
    const query = requiredText(queryValue, "query", 500).toLowerCase();
    const boundedLimit = Math.max(1, Math.min(Number(limit) || 10, 20));
    let names;
    try {
      names = (await readdir(this.root)).filter((name) => name.endsWith(".md")).sort().reverse();
    } catch (error) {
      if (error?.code === "ENOENT") return [];
      throw error;
    }
    const results = [];
    for (const name of names) {
      const text = await readFile(path.join(this.root, name), "utf8");
      const index = text.toLowerCase().indexOf(query);
      if (index === -1) continue;
      const rawTitle = text.match(/^title:\s*(.+)$/m)?.[1];
      let title = name;
      if (rawTitle) {
        try {
          title = JSON.parse(rawTitle);
        } catch {
          title = rawTitle.trim();
        }
      }
      const excerptStart = Math.max(0, index - 100);
      results.push({
        uri: `nova-memory://${name}`,
        title,
        excerpt: text.slice(excerptStart, excerptStart + 500).replace(/\s+/g, " ").trim(),
      });
      if (results.length >= boundedLimit) break;
    }
    return results;
  }
}

export function createSecondBrain(env = process.env, rootOverride) {
  return new SecondBrain({
    root: rootOverride || env.NOVA_MEMORY_DIR || "./data/second-brain",
    writeEnabled: enabled(env.NOVAFORGE_MEMORY_WRITE_ENABLED),
  });
}
