import type { GenerationRequest } from "../domain/types.js";
import type { ProviderResult } from "../providers/types.js";

export type QcCategory = "IDENTITY_FIDELITY"|"FACIAL_GEOMETRY"|"EXPRESSION"|"POSE"|"COMPOSITION"|"BACKGROUND"|"CLOTHING"|"OBJECTS"|"ANATOMY"|"HANDS"|"JEWELLERY"|"HAIR"|"MATERIALS"|"LIGHTING_CONSISTENCY"|"REFLECTIONS"|"VEHICLE_GEOMETRY"|"TEXT_ACCURACY"|"ARTIFACTS"|"CROP_FRAMING"|"REQUESTED_DELTA_SUCCESS"|"COLOR_GRADE";
export type QcStatus = "PASS"|"WARN"|"FAIL";
export interface QcFinding { category: QcCategory; status: QcStatus; confidence: number; notes: string[]; hardLockAffected: boolean; }
export interface QcReport { overall: QcStatus; findings: QcFinding[]; }
export type QcEvaluator = (request: GenerationRequest, result: ProviderResult) => Promise<QcFinding>;
