export type VisualResearchCapability =
  | "IDENTITY_PRESERVATION"
  | "MULTI_REFERENCE_EDIT"
  | "LOW_DRIFT_EDIT"
  | "TRAINING_FREE_PERSONALIZATION"
  | "RESTORATION"
  | "GENERAL_EDIT";

export interface VisualResearchCandidate {
  id: string;
  source: "huggingface";
  capabilities: readonly VisualResearchCapability[];
  promotionStatus: "RESEARCH_ONLY";
  autoRoute: false;
  notes: string;
}

export const HUGGINGFACE_VISUAL_RESEARCH_CANDIDATES: readonly VisualResearchCandidate[] = Object.freeze([
  {
    id: "Qwen/Qwen-Image-Edit-2511",
    source: "huggingface",
    capabilities: ["LOW_DRIFT_EDIT", "IDENTITY_PRESERVATION", "MULTI_REFERENCE_EDIT", "GENERAL_EDIT"],
    promotionStatus: "RESEARCH_ONLY",
    autoRoute: false,
    notes: "Evaluate for locked-character delta edits and multi-reference composition; upstream model card emphasizes reduced image drift and improved character consistency."
  },
  {
    id: "feng123456xf/FireRed-Image-Edit-1.1",
    source: "huggingface",
    capabilities: ["IDENTITY_PRESERVATION", "MULTI_REFERENCE_EDIT", "GENERAL_EDIT"],
    promotionStatus: "RESEARCH_ONLY",
    autoRoute: false,
    notes: "Evaluate for identity-critical edits and multi-element fusion. Keep outside production routing until retention, license, cost and benchmark requirements are verified."
  },
  {
    id: "remyxai/pulid-flux-modular",
    source: "huggingface",
    capabilities: ["IDENTITY_PRESERVATION", "TRAINING_FREE_PERSONALIZATION"],
    promotionStatus: "RESEARCH_ONLY",
    autoRoute: false,
    notes: "Training-free FLUX identity personalization from a reference face; candidate for identity recovery without LoRA training."
  },
  {
    id: "black-forest-labs/FLUX.2-dev",
    source: "huggingface",
    capabilities: ["MULTI_REFERENCE_EDIT", "GENERAL_EDIT"],
    promotionStatus: "RESEARCH_ONLY",
    autoRoute: false,
    notes: "Strong single/multi-reference research candidate. Repository is gated and uses a non-commercial dev license, so never promote automatically."
  },
  {
    id: "InstantX/InstantID",
    source: "huggingface",
    capabilities: ["IDENTITY_PRESERVATION", "TRAINING_FREE_PERSONALIZATION"],
    promotionStatus: "RESEARCH_ONLY",
    autoRoute: false,
    notes: "Mature zero-shot identity-preserving baseline useful for comparison and fallback research."
  }
]);

export function getVisualResearchCandidate(id: string): VisualResearchCandidate | undefined {
  return HUGGINGFACE_VISUAL_RESEARCH_CANDIDATES.find(candidate => candidate.id === id);
}
