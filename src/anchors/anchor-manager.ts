import type { QcReport } from "../qc/types.js";
export interface AnchorCandidate { containsIdentity: boolean; assetId?: string; }
export interface AnchorPromotionContext { qc: QcReport; userApproved: boolean; presetAllowsIntermediateAutoPromotion: boolean; }
export type AnchorPromotionStatus = "ALLOWED"|"REJECTED_QC"|"REQUIRES_USER_APPROVAL"|"NOT_ALLOWED";
export interface AnchorPromotionDecision { status: AnchorPromotionStatus; reasons: string[]; }

export class AnchorManager {
  canPromote(candidate: AnchorCandidate, context: AnchorPromotionContext): AnchorPromotionDecision {
    if (context.qc.overall === "FAIL") return { status:"REJECTED_QC", reasons:["QC_FAILED"] };
    if (candidate.containsIdentity && !context.userApproved) return { status:"REQUIRES_USER_APPROVAL", reasons:["IDENTITY_REQUIRES_USER_APPROVAL"] };
    if (!candidate.containsIdentity && !context.userApproved && !context.presetAllowsIntermediateAutoPromotion) return { status:"NOT_ALLOWED", reasons:["NO_APPROVAL_PATH"] };
    return { status:"ALLOWED", reasons:[] };
  }
}
