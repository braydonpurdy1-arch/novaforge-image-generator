import type { GenerationRequest } from "../domain/types.js";
import type { ProviderResult } from "../providers/types.js";
import type { QcEvaluator, QcReport } from "./types.js";

export class GenerationQcEngine {
  async evaluate(request: GenerationRequest, result: ProviderResult, evaluators: QcEvaluator[]): Promise<QcReport> {
    const findings = await Promise.all(evaluators.map(e => e(request, result)));
    const overall = findings.some(f => f.status === "FAIL" && f.hardLockAffected) ? "FAIL"
      : findings.some(f => f.status === "FAIL") ? "FAIL"
      : findings.some(f => f.status === "WARN") ? "WARN" : "PASS";
    return { overall, findings };
  }
}
