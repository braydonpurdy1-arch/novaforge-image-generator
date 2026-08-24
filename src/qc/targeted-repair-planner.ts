import type { GenerationRequest } from "../domain/types.js";
import type { QcReport } from "./types.js";

export type RepairAction = "LOCAL_EDIT"|"MASK_REFINEMENT"|"PROMPT_CORRECTION"|"REFERENCE_ROLE_CORRECTION"|"PROVIDER_SWITCH"|"FULL_REGENERATION"|"REQUIRES_USER_APPROVAL";
export interface RepairPlan { action: RepairAction; reasons: string[]; relaxLocks: string[]; }

export function planRepair(request: Pick<GenerationRequest,"locks">, report: QcReport): RepairPlan {
  if (report.overall !== "FAIL") return { action: "PROMPT_CORRECTION", reasons: ["NO_FAILURE"], relaxLocks: [] };
  const failed = report.findings.filter(f => f.status === "FAIL");
  if (failed.some(f => f.hardLockAffected && (f.category === "IDENTITY_FIDELITY" || f.category === "FACIAL_GEOMETRY"))) {
    return { action: "PROVIDER_SWITCH", reasons: ["HARD_IDENTITY_FAILURE"], relaxLocks: [] };
  }
  if (failed.length === 1 && failed[0]?.category === "ARTIFACTS") return { action: "LOCAL_EDIT", reasons: ["ISOLATED_ARTIFACT"], relaxLocks: [] };
  if (failed.some(f => f.category === "CROP_FRAMING" || f.category === "OBJECTS")) return { action: "MASK_REFINEMENT", reasons: ["LOCAL_SCOPE_FAILURE"], relaxLocks: [] };
  if (failed.some(f => f.category === "REQUESTED_DELTA_SUCCESS")) return { action: "PROMPT_CORRECTION", reasons: ["DELTA_NOT_ACHIEVED"], relaxLocks: [] };
  return { action: "FULL_REGENERATION", reasons: ["IRRECOVERABLE_OR_BROAD_FAILURE"], relaxLocks: [] };
}
