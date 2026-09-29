const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const BEARER = /\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi;
const WINDOWS_PATH = /\b[A-Za-z]:\\(?:[^\s\\]+\\)*[^\s\\]*/g;
const UNIX_PATH = /(?:^|\s)(\/(?:tmp|var|home|Users|mnt|private|data)\/[^\s]*)/g;
const SECRET_ASSIGNMENT = /\b(api[_-]?key|token|secret|password|authorization)\s*[:=]\s*[^\s,;]+/gi;

export function redactRemoteText(input: string): string {
  return input
    .replace(EMAIL, "[REDACTED_EMAIL]")
    .replace(BEARER, "Bearer [REDACTED]")
    .replace(WINDOWS_PATH, "[REDACTED_PATH]")
    .replace(UNIX_PATH, match => match.startsWith(" ") ? " [REDACTED_PATH]" : "[REDACTED_PATH]")
    .replace(SECRET_ASSIGNMENT, (_m, key: string) => `${key}=[REDACTED]`);
}

export function redactRemoteValue<T>(value: T): T {
  if (typeof value === "string") return redactRemoteText(value) as T;
  if (Array.isArray(value)) return value.map(item => redactRemoteValue(item)) as T;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, child]) => [key, redactRemoteValue(child)] as const);
    return Object.fromEntries(entries) as T;
  }
  return value;
}
