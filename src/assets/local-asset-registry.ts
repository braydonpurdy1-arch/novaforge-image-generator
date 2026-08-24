import { createHash, randomUUID } from "node:crypto";
import { readFile, writeFile, unlink } from "node:fs/promises";
import type { AssetRecord, ProviderCopy } from "./types.js";

interface RegistryDocument { assets: AssetRecord[]; }

export class LocalAssetRegistry {
  private readonly assets = new Map<string, AssetRecord>();
  private loaded = false;

  constructor(private readonly registryPath: string) {}

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const raw = await readFile(this.registryPath, "utf8");
      const parsed = JSON.parse(raw) as RegistryDocument;
      for (const asset of parsed.assets ?? []) this.assets.set(asset.id, asset);
    } catch {
      // A missing or empty registry starts clean. Asset bytes are still validated on register().
    }
  }

  private async persist(): Promise<void> {
    await writeFile(this.registryPath, JSON.stringify({ assets: [...this.assets.values()] }, null, 2), "utf8");
  }

  async register(input: { path: string; mediaType: string }): Promise<AssetRecord> {
    await this.ensureLoaded();
    const bytes = await readFile(input.path);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const now = new Date().toISOString();
    const record: AssetRecord = {
      id: `asset_${randomUUID().replace(/-/g, "")}`,
      sha256,
      mediaType: input.mediaType,
      localPath: input.path,
      localAvailable: true,
      providerCopies: [],
      createdAt: now,
      updatedAt: now
    };
    this.assets.set(record.id, record);
    await this.persist();
    return structuredClone(record);
  }

  async get(id: string): Promise<AssetRecord | undefined> {
    await this.ensureLoaded();
    const record = this.assets.get(id);
    return record ? structuredClone(record) : undefined;
  }

  async recordProviderCopy(id: string, copy: ProviderCopy): Promise<AssetRecord> {
    await this.ensureLoaded();
    const record = this.assets.get(id);
    if (!record) throw new Error(`ASSET_NOT_FOUND:${id}`);
    record.providerCopies = [...record.providerCopies, { ...copy }];
    record.updatedAt = new Date().toISOString();
    await this.persist();
    return structuredClone(record);
  }

  async deleteLocalCache(id: string): Promise<AssetRecord> {
    await this.ensureLoaded();
    const record = this.assets.get(id);
    if (!record) throw new Error(`ASSET_NOT_FOUND:${id}`);
    if (record.localAvailable) {
      try { await unlink(record.localPath); } catch (error) {
        const code = (error as { code?: string }).code;
        if (code !== "ENOENT") throw error;
      }
    }
    record.localAvailable = false;
    record.updatedAt = new Date().toISOString();
    await this.persist();
    return structuredClone(record);
  }
}
