import { NovaForgeError } from "./errors.js";
import {
  integerInRange,
  oneOf,
  publicHttpsUrl,
  requiredText,
  safeTaskId,
} from "./validation.js";

const WAN_REGION_HOSTS = {
  singapore: "ap-southeast-1.maas.aliyuncs.com",
  beijing: "cn-beijing.maas.aliyuncs.com",
  virginia: "us-east-1.maas.aliyuncs.com",
  tokyo: "ap-northeast-1.maas.aliyuncs.com",
  frankfurt: "eu-central-1.maas.aliyuncs.com",
  hongkong: "cn-hongkong.maas.aliyuncs.com",
};

const RATIOS = ["adaptive", "16:9", "4:3", "1:1", "3:4", "9:16"];
const WAN_RESOLUTIONS = ["480P", "720P", "1080P"];
const WAN_MODELS = ["wan3.0-video", "wan3.0-video-prime"];
const WAN_MEDIA_TYPES = [
  "reference_image",
  "reference_video",
  "reference_audio",
  "first_frame",
  "last_frame",
  "file",
  "link",
];

function enabled(value) {
  return String(value || "false").trim().toLowerCase() === "true";
}

async function jsonRequest(fetchImpl, url, options) {
  let response;
  try {
    response = await fetchImpl(url, options);
  } catch (error) {
    throw new NovaForgeError("The external provider is unreachable", {
      code: "PROVIDER_UNREACHABLE",
      status: 502,
      details: error?.name || "network error",
    });
  }

  let data = {};
  try {
    data = await response.json();
  } catch {
    // Keep provider HTML/proxy errors out of API and MCP responses.
  }
  if (!response.ok) {
    throw new NovaForgeError("The external provider rejected the request", {
      code: "PROVIDER_REJECTED",
      status: 502,
      details: data?.code || data?.error?.code || `HTTP ${response.status}`,
    });
  }
  return data;
}

function normalizeWanBaseUrl(env) {
  if (env.WAN3_BASE_URL) return env.WAN3_BASE_URL.trim().replace(/\/$/, "");
  const workspaceId = (env.WAN3_WORKSPACE_ID || "").trim();
  const region = (env.WAN3_REGION || "singapore").trim().toLowerCase();
  const host = WAN_REGION_HOSTS[region];
  return workspaceId && host ? `https://${workspaceId}.${host}` : "";
}

function normalizeMedia(media) {
  if (media === undefined || media === null) return [];
  if (!Array.isArray(media) || media.length > 20) {
    throw new NovaForgeError("media must be an array with at most 20 items", { code: "INVALID_INPUT" });
  }
  return media.map((item, index) => ({
    type: oneOf(item?.type, WAN_MEDIA_TYPES, `media[${index}].type`),
    url: publicHttpsUrl(item?.url, `media[${index}].url`),
  }));
}

export function createWan3Provider(env = process.env, fetchImpl = fetch) {
  const isEnabled = enabled(env.WAN3_ENABLED);
  const apiKey = (env.DASHSCOPE_API_KEY || "").trim();
  const baseUrl = normalizeWanBaseUrl(env);
  const model = WAN_MODELS.includes(env.WAN3_MODEL) ? env.WAN3_MODEL : "wan3.0-video";
  const ready = isEnabled && Boolean(apiKey && baseUrl);

  const descriptor = () => ({
    id: "wan3",
    name: "Wan 3.0",
    model,
    kind: "video",
    status: !isEnabled ? "disabled" : ready ? "ready" : "missing_configuration",
    approvalRequired: true,
    externallyBilled: true,
    capabilities: ["text-to-video", "image-to-video", "reference-to-video", "native-audio"],
    officialUrl: "https://www.alibabacloud.com/help/en/model-studio/wan3-video-generation-api-reference",
  });

  function assertReady() {
    if (!isEnabled) {
      throw new NovaForgeError("Wan 3.0 is disabled", { code: "PROVIDER_DISABLED", status: 503 });
    }
    if (!ready) {
      throw new NovaForgeError("Wan 3.0 is missing its workspace ID, endpoint, or API key", {
        code: "PROVIDER_NOT_CONFIGURED",
        status: 503,
      });
    }
  }

  return {
    descriptor,
    async createJob(input) {
      assertReady();
      const prompt = requiredText(input?.prompt, "prompt", 20000);
      const media = normalizeMedia(input?.media);
      const parameters = {
        resolution: oneOf(input?.resolution, WAN_RESOLUTIONS, "resolution", "720P"),
        ratio: oneOf(input?.ratio, RATIOS, "ratio", "adaptive"),
        duration: integerInRange(input?.duration, "duration", 2, 30, 5),
        audio: input?.audio !== false,
        prompt_extend: input?.promptExtend !== false,
        watermark: input?.watermark === true,
      };
      if (input?.seed !== undefined) {
        parameters.seed = integerInRange(input.seed, "seed", 0, 2147483647, 0);
      }

      const data = await jsonRequest(fetchImpl,
        `${baseUrl}/api/v1/services/aigc/video-generation/video-synthesis`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "X-DashScope-Async": "enable",
          },
          body: JSON.stringify({
            model,
            input: { prompt, ...(media.length ? { media } : {}) },
            parameters,
          }),
        });
      const taskId = data?.output?.task_id;
      if (!taskId) {
        throw new NovaForgeError("Wan 3.0 did not return a task ID", {
          code: "INVALID_PROVIDER_RESPONSE",
          status: 502,
        });
      }
      return {
        provider: "wan3",
        taskId,
        status: String(data.output.task_status || "PENDING").toLowerCase(),
        requestId: data.request_id || null,
      };
    },
    async getJob(taskIdValue) {
      assertReady();
      const taskId = safeTaskId(taskIdValue);
      const data = await jsonRequest(fetchImpl, `${baseUrl}/api/v1/tasks/${encodeURIComponent(taskId)}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const output = data?.output || {};
      return {
        provider: "wan3",
        taskId,
        status: String(output.task_status || "UNKNOWN").toLowerCase(),
        videoUrl: output.video_url || null,
        requestId: data.request_id || null,
        errorCode: output.code || data.code || null,
      };
    },
  };
}

export function createLuminaProvider(env = process.env, fetchImpl = fetch) {
  const isEnabled = enabled(env.LUMINA_ENABLED);
  const apiKey = (env.BYTEPLUS_ARK_API_KEY || "").trim();
  const baseUrl = (env.LUMINA_BASE_URL || "https://ark.ap-southeast.bytepluses.com/api/v3")
    .trim().replace(/\/$/, "");
  const model = (env.LUMINA_MODEL || "dreamina-seedance-2-5-260628").trim();
  const ready = isEnabled && Boolean(apiKey && baseUrl && model);

  const descriptor = () => ({
    id: "lumina",
    name: "Lumina (Seedance)",
    model,
    kind: "video",
    status: !isEnabled ? "disabled" : ready ? "ready" : "missing_configuration",
    approvalRequired: true,
    externallyBilled: true,
    capabilities: ["text-to-video", "native-audio"],
    officialUrl: "https://ai.byteplus.com/lumina/en",
    apiUrl: "https://docs.byteplus.com/en/docs/ModelArk/1520757",
  });

  function assertReady() {
    if (!isEnabled) {
      throw new NovaForgeError("Lumina is disabled", { code: "PROVIDER_DISABLED", status: 503 });
    }
    if (!ready) {
      throw new NovaForgeError("Lumina is missing its ModelArk model or API key", {
        code: "PROVIDER_NOT_CONFIGURED",
        status: 503,
      });
    }
  }

  return {
    descriptor,
    async createJob(input) {
      assertReady();
      const prompt = requiredText(input?.prompt, "prompt", 10000);
      const payload = {
        model,
        content: [{ type: "text", text: prompt }],
        ratio: oneOf(input?.ratio, RATIOS, "ratio", "adaptive"),
        duration: integerInRange(input?.duration, "duration", 2, 30, 5),
        watermark: input?.watermark === true,
        generate_audio: input?.audio !== false,
      };
      const data = await jsonRequest(fetchImpl, `${baseUrl}/contents/generations/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });
      const taskId = data?.id || data?.task_id;
      if (!taskId) {
        throw new NovaForgeError("Lumina did not return a task ID", {
          code: "INVALID_PROVIDER_RESPONSE",
          status: 502,
        });
      }
      return {
        provider: "lumina",
        taskId,
        status: String(data.status || "queued").toLowerCase(),
      };
    },
    async getJob(taskIdValue) {
      assertReady();
      const taskId = safeTaskId(taskIdValue);
      const data = await jsonRequest(fetchImpl,
        `${baseUrl}/contents/generations/tasks/${encodeURIComponent(taskId)}`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
      return {
        provider: "lumina",
        taskId,
        status: String(data.status || "unknown").toLowerCase(),
        videoUrl: data?.content?.video_url?.url || data?.content?.video_url || data?.video_url || null,
        errorCode: data?.error?.code || null,
      };
    },
  };
}

export function createProviderRegistry(env = process.env, fetchImpl = fetch) {
  const providers = new Map([
    ["wan3", createWan3Provider(env, fetchImpl)],
    ["lumina", createLuminaProvider(env, fetchImpl)],
  ]);
  return {
    list: () => [...providers.values()].map((provider) => provider.descriptor()),
    get(name) {
      const provider = providers.get(String(name || "").trim().toLowerCase());
      if (!provider) {
        throw new NovaForgeError("Unsupported media provider", {
          code: "UNSUPPORTED_PROVIDER",
          status: 400,
        });
      }
      return provider;
    },
  };
}
