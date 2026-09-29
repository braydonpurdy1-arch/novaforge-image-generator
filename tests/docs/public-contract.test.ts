import { readFile } from "node:fs/promises";
import { expect, it } from "vitest";

it("documents verified Gemini roles, fail-closed aliases, privacy, and retention", async () => {
  const readme = await readFile("README.md", "utf8");
  for (const required of [
    "gemini-3.7-flash",
    "reasoning-only",
    "gemini-3-pro-image",
    "gemini-3.1-flash-image",
    "gemini-3.5-pro",
    "MODEL_UNAVAILABLE",
    "REMOTE_REDACTED",
    "LOCAL_ONLY",
    "UNKNOWN",
    "Seedream",
    "Higgsfield",
    "FLUX"
  ]) {
    expect(readme).toContain(required);
  }
});
