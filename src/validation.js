import { isIP } from "node:net";

import { NovaForgeError } from "./errors.js";

const PRIVATE_IPV4 = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^0\./,
];

export function requiredText(value, name, maxLength) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new NovaForgeError(`${name} is required`, { code: "INVALID_INPUT" });
  }
  if (normalized.length > maxLength) {
    throw new NovaForgeError(`${name} exceeds ${maxLength} characters`, { code: "INVALID_INPUT" });
  }
  return normalized;
}

export function oneOf(value, allowed, name, fallback) {
  const normalized = value === undefined || value === null || value === "" ? fallback : value;
  if (!allowed.includes(normalized)) {
    throw new NovaForgeError(`${name} must be one of: ${allowed.join(", ")}`, { code: "INVALID_INPUT" });
  }
  return normalized;
}

export function integerInRange(value, name, minimum, maximum, fallback) {
  const normalized = value === undefined || value === null ? fallback : Number(value);
  if (!Number.isInteger(normalized) || normalized < minimum || normalized > maximum) {
    throw new NovaForgeError(`${name} must be an integer from ${minimum} to ${maximum}`, { code: "INVALID_INPUT" });
  }
  return normalized;
}

export function publicHttpsUrl(value, name = "url") {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new NovaForgeError(`${name} must be a valid URL`, { code: "INVALID_INPUT" });
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw new NovaForgeError(`${name} must be a public HTTPS URL without embedded credentials`, {
      code: "INVALID_INPUT",
    });
  }

  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    throw new NovaForgeError(`${name} must not target a local host`, { code: "INVALID_INPUT" });
  }
  const ipVersion = isIP(host);
  if ((ipVersion === 4 && PRIVATE_IPV4.some((pattern) => pattern.test(host))) || ipVersion === 6) {
    throw new NovaForgeError(`${name} must not target a private or loopback address`, {
      code: "INVALID_INPUT",
    });
  }
  return parsed.toString();
}

export function safeTaskId(value) {
  const taskId = requiredText(value, "taskId", 256);
  if (!/^[A-Za-z0-9._:-]+$/.test(taskId)) {
    throw new NovaForgeError("taskId contains unsupported characters", { code: "INVALID_INPUT" });
  }
  return taskId;
}
