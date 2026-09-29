import { describe, expect, it } from "vitest";
import {
  HUGGINGFACE_VISUAL_RESEARCH_CANDIDATES,
  getVisualResearchCandidate
} from "../src/index.js";

describe("Hugging Face visual candidate registry", () => {
  it("keeps all discovered candidates research-only and out of automatic routing", () => {
    expect(HUGGINGFACE_VISUAL_RESEARCH_CANDIDATES.length).toBeGreaterThan(0);
    for (const candidate of HUGGINGFACE_VISUAL_RESEARCH_CANDIDATES) {
      expect(candidate.promotionStatus).toBe("RESEARCH_ONLY");
      expect(candidate.autoRoute).toBe(false);
      expect(candidate.source).toBe("huggingface");
    }
  });

  it("includes identity and low-drift candidates for locked-character evaluation", () => {
    const qwen = getVisualResearchCandidate("Qwen/Qwen-Image-Edit-2511");
    const pulid = getVisualResearchCandidate("remyxai/pulid-flux-modular");

    expect(qwen?.capabilities).toEqual(expect.arrayContaining([
      "LOW_DRIFT_EDIT",
      "IDENTITY_PRESERVATION",
      "MULTI_REFERENCE_EDIT"
    ]));
    expect(pulid?.capabilities).toEqual(expect.arrayContaining([
      "IDENTITY_PRESERVATION",
      "TRAINING_FREE_PERSONALIZATION"
    ]));
  });
});
