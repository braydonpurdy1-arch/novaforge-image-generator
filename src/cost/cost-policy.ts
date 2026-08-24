export interface CostEstimate {
  amount: number;
  unit: "credits" | "usd" | "aud" | string;
  details?: Record<string, unknown>;
}

export interface CostPolicyInput { budgetCredits?: number; }
export type CostDecisionStatus = "ALLOWED" | "REQUIRES_APPROVAL";
export interface CostDecision { status: CostDecisionStatus; reasons: string[]; estimate?: CostEstimate; }

export function evaluateCostPolicy(
  request: CostPolicyInput,
  estimate: CostEstimate | undefined,
  approved: boolean
): CostDecision {
  if (!estimate) return { status: "ALLOWED", reasons: ["COST_ESTIMATE_UNAVAILABLE"] };
  if (request.budgetCredits === undefined || estimate.unit !== "credits") {
    return { status: "ALLOWED", reasons: ["NO_COMPARABLE_CREDIT_BUDGET"], estimate };
  }
  if (estimate.amount <= request.budgetCredits) return { status: "ALLOWED", reasons: ["WITHIN_BUDGET"], estimate };
  if (approved) return { status: "ALLOWED", reasons: ["OVER_BUDGET_EXPLICITLY_APPROVED"], estimate };
  return { status: "REQUIRES_APPROVAL", reasons: ["COST_EXCEEDS_BUDGET"], estimate };
}
