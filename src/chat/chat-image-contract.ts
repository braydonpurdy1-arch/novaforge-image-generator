import type { ReferenceLock } from "../domain/types.js";

export interface ChatImageRef { id: string; ordinal: number; }
export interface ChatImageInstruction { text: string; images: ChatImageRef[]; }
export interface ChatImageContractResult {
  rawText: string;
  images: ChatImageRef[];
  locks: ReferenceLock[];
  allowedTargets: string[];
  preferredProviderClass?: "SEEDREAM";
  providerRequired: boolean;
  refinementOnly: boolean;
  promoteAnchor: boolean;
  needsUserInput: boolean;
}

const imageByOrdinal = (images: ChatImageRef[], ordinal: number) => images.find(i => i.ordinal === ordinal);
const trimTarget = (value: string) => value.trim().replace(/[.!?]+$/g, "").replace(/^(the|his|her)\s+/i, "").trim();

export function parseChatImageInstruction(input: ChatImageInstruction): ChatImageContractResult {
  const text = input.text;
  const lower = text.toLowerCase();
  const locks: ReferenceLock[] = [];
  const allowedTargets: string[] = [];
  let needsUserInput = false;

  const baseMatch = /(?:use\s+)?image\s+(\d+).*?(?:main\s+)?locked\s+(?:in\s+)?base|(?:use\s+)?image\s+(\d+).*?main\s+base/i.exec(text);
  if (baseMatch) {
    const ordinal = Number(baseMatch[1] ?? baseMatch[2]);
    const asset = imageByOrdinal(input.images, ordinal);
    if (asset) locks.push({ lockId:`composition-${asset.id}`, assetId:asset.id, type:"COMPOSITION", scope:"full-frame", description:"main locked base", strength:"HARD" });
    else needsUserInput = true;
  }

  if (/do not change (?:his|her|the)?\s*face|face.*(?:locked|do not change)/i.test(text)) {
    const assetId = locks[0]?.assetId ?? input.images[0]?.id;
    if (assetId) locks.push({ lockId:`face-${assetId}`, assetId, type:"FACE", scope:"subject:face", description:"preserve face exactly", strength:"HARD" });
    else needsUserInput = true;
  }

  const onlyChange = /only\s+change\s+([^.;]+)/ig;
  let m: RegExpExecArray | null;
  while ((m = onlyChange.exec(text))) allowedTargets.push(trimTarget(m[1] ?? ""));

  return {
    rawText: text,
    images: input.images,
    locks,
    allowedTargets: allowedTargets.filter(Boolean),
    ...(lower.includes("seedream") ? { preferredProviderClass: "SEEDREAM" as const } : {}),
    providerRequired: /(?:use|with)\s+seedream|seedream\s+only/i.test(text),
    refinementOnly: /refinement\s+only|refine(?:ment)?\s+rather\s+than\s+reinterpret/i.test(text),
    promoteAnchor: /make (?:this|it) (?:the )?new anchor|lock (?:this|it) in/i.test(text),
    needsUserInput
  };
}
