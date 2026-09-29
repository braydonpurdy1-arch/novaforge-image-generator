export interface NormalizedPrompt {
  original: string;
  explicitDeltas: string[];
  prohibitedInferences: string[];
  needsUserInput: boolean;
}

export function normalizePrompt(rawText: string, lockedScopes: string[]): NormalizedPrompt {
  const lower = rawText.toLowerCase();
  const explicitDeltas: string[] = [];
  const prohibitedInferences: string[] = [];
  let needsUserInput = false;

  if (lower.includes("more dramatic")) {
    explicitDeltas.push("increase local contrast", "increase shadow depth");
  }

  const ambiguousCleanup = /clean\s+(?:it|this)\s+up|sharpen|enhance/.test(lower);
  if (ambiguousCleanup) {
    for (const scope of lockedScopes) {
      prohibitedInferences.push(`retouch:${scope}`, `relight:${scope}`);
      if (scope.includes("face") || scope.includes("identity")) {
        prohibitedInferences.push(`smooth:${scope}`, `reshape:${scope}`);
      }
    }
  }

  if (/change everything|reimagine|reinterpret/.test(lower) && lockedScopes.length > 0) {
    needsUserInput = true;
  }

  return { original: rawText, explicitDeltas, prohibitedInferences, needsUserInput };
}
