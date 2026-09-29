export type GeminiModelRole = "REASONING" | "IMAGE";
export type GeminiModelAvailability = "AVAILABLE" | "UNAVAILABLE";
export type GeminiModelSource = "VERIFIED" | "CONFIGURED_ALIAS" | "UNVERIFIED_ALIAS";

export interface GeminiModelDescriptor {
  requested: string;
  modelId?: string;
  role: GeminiModelRole;
  availability: GeminiModelAvailability;
  source: GeminiModelSource;
}

export interface GeminiAliasOverride {
  alias: string;
  modelId: string;
  role: GeminiModelRole;
}

const VERIFIED_MODELS: Record<string, Omit<GeminiModelDescriptor, "requested">> = {
  "gemini-3.7-flash": {
    modelId: "gemini-3.7-flash",
    role: "REASONING",
    availability: "AVAILABLE",
    source: "VERIFIED"
  },
  "gemini-3.5-flash": {
    modelId: "gemini-3.5-flash",
    role: "REASONING",
    availability: "AVAILABLE",
    source: "VERIFIED"
  },
  "gemini-3.5-flash-lite": {
    modelId: "gemini-3.5-flash-lite",
    role: "REASONING",
    availability: "AVAILABLE",
    source: "VERIFIED"
  },
  "gemini-3-pro-image": {
    modelId: "gemini-3-pro-image",
    role: "IMAGE",
    availability: "AVAILABLE",
    source: "VERIFIED"
  },
  "gemini-3.1-flash-image": {
    modelId: "gemini-3.1-flash-image",
    role: "IMAGE",
    availability: "AVAILABLE",
    source: "VERIFIED"
  }
};

const UNVERIFIED_ALIASES: Record<string, GeminiModelRole> = {
  "gemini-3.5-pro": "REASONING"
};

export class GeminiModelCatalog {
  private readonly overrides = new Map<string, GeminiAliasOverride>();

  constructor(overrides: GeminiAliasOverride[] = []) {
    for (const override of overrides) this.overrides.set(override.alias, override);
  }

  resolve(requested: string, required = false): GeminiModelDescriptor {
    const verified = VERIFIED_MODELS[requested];
    if (verified) return { requested, ...verified };

    const configured = this.overrides.get(requested);
    if (configured) {
      return {
        requested,
        modelId: configured.modelId,
        role: configured.role,
        availability: "AVAILABLE",
        source: "CONFIGURED_ALIAS"
      };
    }

    const aliasRole = UNVERIFIED_ALIASES[requested];
    if (aliasRole) {
      if (required) throw new Error(`MODEL_UNAVAILABLE:${requested}`);
      return {
        requested,
        role: aliasRole,
        availability: "UNAVAILABLE",
        source: "UNVERIFIED_ALIAS"
      };
    }

    if (required) throw new Error(`MODEL_UNAVAILABLE:${requested}`);
    return {
      requested,
      role: "REASONING",
      availability: "UNAVAILABLE",
      source: "UNVERIFIED_ALIAS"
    };
  }
}
