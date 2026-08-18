const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

export const VEO_MODELS = [
  "veo-3.1-generate-preview",
  "veo-3.1-fast-generate-preview",
] as const;

export const VEO_RESOLUTIONS = ["720p", "1080p", "4k"] as const;
export const VEO_ASPECT_RATIOS = ["16:9", "9:16"] as const;
export const VEO_DURATIONS = ["4", "6", "8"] as const;

export type VeoModel = (typeof VEO_MODELS)[number];
export type VeoResolution = (typeof VEO_RESOLUTIONS)[number];
export type VeoAspectRatio = (typeof VEO_ASPECT_RATIOS)[number];
export type VeoDuration = (typeof VEO_DURATIONS)[number];

export type StartVeoInput = {
  prompt: string;
  model?: VeoModel;
  resolution?: VeoResolution;
  aspectRatio?: VeoAspectRatio;
  durationSeconds?: VeoDuration;
};

function apiKey(): string {
  const value = process.env.GEMINI_API_KEY;
  if (!value) throw new Error("GEMINI_API_KEY is not configured.");
  return value;
}

function validateInput(input: StartVeoInput) {
  const prompt = input.prompt?.trim();
  if (!prompt || prompt.length > 4000) throw new Error("Prompt must be between 1 and 4000 characters.");

  const model = input.model ?? "veo-3.1-generate-preview";
  const resolution = input.resolution ?? "1080p";
  const aspectRatio = input.aspectRatio ?? "16:9";
  let durationSeconds = input.durationSeconds ?? "8";

  if (!VEO_MODELS.includes(model)) throw new Error("Unsupported Veo model.");
  if (!VEO_RESOLUTIONS.includes(resolution)) throw new Error("Unsupported resolution.");
  if (!VEO_ASPECT_RATIOS.includes(aspectRatio)) throw new Error("Unsupported aspect ratio.");
  if (!VEO_DURATIONS.includes(durationSeconds)) throw new Error("Unsupported duration.");

  if ((resolution === "1080p" || resolution === "4k") && durationSeconds !== "8") {
    durationSeconds = "8";
  }

  return { prompt, model, resolution, aspectRatio, durationSeconds };
}

export async function startVeoJob(input: StartVeoInput) {
  const clean = validateInput(input);
  const response = await fetch(`${BASE_URL}/models/${clean.model}:predictLongRunning`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": apiKey(),
    },
    body: JSON.stringify({
      instances: [{ prompt: clean.prompt }],
      parameters: {
        aspectRatio: clean.aspectRatio,
        resolution: clean.resolution,
        durationSeconds: clean.durationSeconds,
      },
    }),
    cache: "no-store",
  });

  const body = await response.json();
  if (!response.ok) throw new Error(body?.error?.message ?? "Veo generation request failed.");
  if (!body?.name) throw new Error("Google returned no Veo operation name.");
  return { operation: body.name as string, config: clean };
}

export function validateOperationName(operation: string) {
  if (!/^models\/[A-Za-z0-9._-]+\/operations\/[A-Za-z0-9._-]+$/.test(operation)) {
    throw new Error("Invalid Veo operation name.");
  }
  return operation;
}

export async function getVeoJob(operation: string) {
  const name = validateOperationName(operation);
  const response = await fetch(`${BASE_URL}/${name}`, {
    headers: { "x-goog-api-key": apiKey() },
    cache: "no-store",
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error?.message ?? "Unable to read Veo job status.");
  return body;
}

export function extractVideoUri(job: any): string | null {
  return job?.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri ?? null;
}

export async function fetchGeneratedVideo(operation: string) {
  const job = await getVeoJob(operation);
  if (!job?.done) throw new Error("Video is not ready yet.");
  const uri = extractVideoUri(job);
  if (!uri) throw new Error("Completed Veo job contains no downloadable video URI.");

  const response = await fetch(uri, {
    headers: { "x-goog-api-key": apiKey() },
    cache: "no-store",
    redirect: "follow",
  });
  if (!response.ok || !response.body) throw new Error("Unable to download generated video from Google.");
  return response;
}
