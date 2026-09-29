import type { GenerationRequest } from "../domain/types.js";
import type { ImageProvider } from "../providers/types.js";

export type PreflightStatus = "READY" | "NEEDS_USER_INPUT" | "UNSUPPORTED" | "BLOCKED_BY_POLICY";
export interface PreflightResult { status: PreflightStatus; reasons: string[]; }
export interface PreflightContext { providers: ImageProvider[]; }

const validAspect = (v: string) => /^(?:auto|[1-9]\d*:[1-9]\d*)$/.test(v);

export function runPreflight(request: GenerationRequest, context: PreflightContext): PreflightResult {
  const reasons: string[] = [];
  if ((request.operation !== "GENERATE") && request.sourceAssets.length === 0) reasons.push("MISSING_SOURCE_ASSET");
  if (request.outputRequirements.aspectRatio && !validAspect(request.outputRequirements.aspectRatio)) reasons.push("INVALID_ASPECT_RATIO");
  if (reasons.length) return { status: "NEEDS_USER_INPUT", reasons };

  const operationCandidates = context.providers.filter(p => p.capabilities().operations.includes(request.operation));
  if (!operationCandidates.length) return { status: "UNSUPPORTED", reasons: ["OPERATION_UNSUPPORTED"] };

  const privacyCandidates = request.privacyMode === "LOCAL_ONLY" ? operationCandidates.filter(p => p.locality === "LOCAL") : operationCandidates;
  if (!privacyCandidates.length && request.privacyMode === "LOCAL_ONLY") return { status: "BLOCKED_BY_POLICY", reasons: ["LOCAL_ONLY_REMOTE_PROVIDER"] };

  if (request.providerRequired && request.preferredProvider && !privacyCandidates.some(p => p.id === request.preferredProvider || p.kind?.toLowerCase() === request.preferredProvider?.toLowerCase())) {
    return { status: "UNSUPPORTED", reasons: ["REQUIRED_PROVIDER_UNAVAILABLE"] };
  }
  return { status: "READY", reasons: [] };
}
