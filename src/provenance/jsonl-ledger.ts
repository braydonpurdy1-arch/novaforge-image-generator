import { appendFile } from "node:fs/promises";
import type { ProvenanceEntry, ProvenanceLedger } from "./types.js";

const SECRET_KEY = /api[_-]?key|token|secret|password|authorization/i;

function assertNoSecrets(value: unknown, path = "root"): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoSecrets(item, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (SECRET_KEY.test(key)) throw new Error(`SECRET_FIELD_REJECTED:${path}.${key}`);
      assertNoSecrets(child, `${path}.${key}`);
    }
  }
}

export class JsonlProvenanceLedger implements ProvenanceLedger {
  constructor(private readonly filePath: string) {}
  async append(entry: ProvenanceEntry): Promise<void> {
    assertNoSecrets(entry);
    await appendFile(this.filePath, `${JSON.stringify(entry)}\n`, "utf8");
  }
}
