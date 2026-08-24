import type { GenerationRequest } from "../domain/types.js";
import type { ImageProvider, RoutingDecision } from "../providers/types.js";

const resolutionRank = (r: "1k"|"2k"|"4k") => r === "4k" ? 3 : r === "2k" ? 2 : 1;

export class ModelRouter {
  async route(request: GenerationRequest, providers: ImageProvider[]): Promise<RoutingDecision> {
    const candidates = providers.filter(provider => {
      const c = provider.capabilities();
      if (!c.operations.includes(request.operation)) return false;
      if (request.privacyMode === "LOCAL_ONLY" && provider.locality !== "LOCAL") return false;
      if (request.outputRequirements.requiresTextAccuracy && !c.supportsTextRendering) return false;
      if (request.outputRequirements.requiresVideo && !c.supportsVideo) return false;
      if (request.requiredIdentitySupport && !c.supportsIdentityReferences) return false;
      if (request.requiredReferenceRoles?.some(role => !c.referenceRoles.includes(role as never))) return false;
      if (request.providerRequired && request.preferredProvider && provider.id !== request.preferredProvider && provider.kind?.toLowerCase() !== request.preferredProvider.toLowerCase()) return false;
      return true;
    });
    if (!candidates.length) throw new Error("NO_COMPATIBLE_PROVIDER");

    const scored = candidates.map(provider => {
      const c = provider.capabilities();
      let score = 0;
      const reasons: string[] = ["HARD_REQUIREMENTS_MATCH"];
      if (request.taskClass === "PHOTOREAL_STILL" && provider.kind === "SEEDREAM") { score += 20; reasons.push("SEEDREAM_PHOTOREAL_FIT"); }
      if (request.taskClass === "TYPOGRAPHY" && provider.kind === "GEMINI_IMAGE") { score += 20; reasons.push("GEMINI_TYPOGRAPHY_FIT"); }
      else if (request.taskClass === "TYPOGRAPHY" && c.supportsTextRendering) { score += 20; reasons.push("TYPOGRAPHY_FIT"); }
      if (request.outputRequirements.requiresTextAccuracy && provider.kind === "GEMINI_IMAGE") { score += 10; reasons.push("GEMINI_TEXT_ACCURACY_FIT"); }
      if (request.taskClass === "CINEMATIC_VIDEO" && c.supportsVideo) { score += 20; reasons.push("VIDEO_FIT"); }
      if (request.taskClass === "OUTPAINT" && c.operations.includes("OUTPAINT")) { score += 20; reasons.push("OUTPAINT_FIT"); }
      if (request.preferredProvider && (provider.id === request.preferredProvider || provider.kind?.toLowerCase() === request.preferredProvider.toLowerCase())) { score += 15; reasons.push("USER_PROVIDER_PREFERENCE"); }
      score += resolutionRank(c.maxResolution) * 2;
      score += Math.round((c.historicalQcRate ?? 0.5) * 10);
      score += Math.max(0, 5 - (c.costRank ?? 3));
      score += Math.max(0, 5 - (c.latencyRank ?? 3));
      return { providerId: provider.id, score, reasons };
    });
    scored.sort((a,b) => b.score - a.score || a.providerId.localeCompare(b.providerId));
    return scored[0]!;
  }
}
