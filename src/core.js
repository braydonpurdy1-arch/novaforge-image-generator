import { NovaForgeError } from "./errors.js";
import { createSecondBrain } from "./memory.js";
import { createProviderRegistry } from "./providers.js";

function enabled(value) {
  return String(value || "false").trim().toLowerCase() === "true";
}

export function createNovaForgeCore({ env = process.env, fetchImpl = fetch, memoryRoot } = {}) {
  const registry = createProviderRegistry(env, fetchImpl);
  const memory = createSecondBrain(env, memoryRoot);
  const mediaWritesEnabled = enabled(env.NOVAFORGE_WRITE_ENABLED);

  return {
    listProviders: () => registry.list(),
    async createMediaJob(providerName, input) {
      if (!mediaWritesEnabled) {
        throw new NovaForgeError("Paid media generation is disabled", {
          code: "MEDIA_WRITES_DISABLED",
          status: 503,
        });
      }
      if (input?.confirmed !== true) {
        throw new NovaForgeError("Owner confirmation is required before a billed generation job", {
          code: "CONFIRMATION_REQUIRED",
          status: 409,
        });
      }
      return registry.get(providerName).createJob(input);
    },
    getMediaJob: (providerName, taskId) => registry.get(providerName).getJob(taskId),
    proposeMemory: (input) => memory.propose(input),
    commitMemory: (proposalId, options) => memory.commit(proposalId, options),
    searchMemory: (query, options) => memory.search(query, options),
  };
}
