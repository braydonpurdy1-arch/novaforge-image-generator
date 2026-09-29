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
  if (request.budgetCredits === undefined) {
    return estimate
      ? { status: "ALLOWED", reasons: ["NO_BUDGET_CONFIGURED"], estimate }
      : { status: "ALLOWED", reasons: ["NO_BUDGET_CONFIGURED"] };
  }

  if (!estimate) {
    return approved
      ? { status: "ALLOWED", reasons: ["UNKNOWN_COST_EXPLICITLY_APPROVED"] }
      : { status: "REQUIRES_APPROVAL", reasons: ["COST_ESTIMATE_UNAVAILABLE"] };
  }

  if (estimate.unit !== "credits") {
    return approved
      ? { status: "ALLOWED", reasons: ["INCOMPARABLE_COST_EXPLICITLY_APPROVED"], estimate }
      : { status: "REQUIRES_APPROVAL", reasons: ["COST_UNIT_NOT_COMPARABLE"], estimate };
  }

  if (estimate.amount <= request.budgetCredits) {
    return { status: "ALLOWED", reasons: ["WITHIN_BUDGET"], estimate };
  }

  if (approved) {
    return { status: "ALLOWED", reasons: ["OVER_BUDGET_EXPLICITLY_APPROVED"], estimate };
  }

  return { status: "REQUIRES_APPROVAL", reasons: ["COST_EXCEEDS_BUDGET"], estimate };
}
