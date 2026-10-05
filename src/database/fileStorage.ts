import fs from "fs";
import path from "path";

export interface StoredUrl {
  id: string;
  shortCode: string;
  originalUrl: string;
  customAlias: string | null;
  clicks: number;
  title?: string | null;
  description?: string | null;
  metadata?: any;
  createdAt: Date;
  expiresAt: Date | null;
  updatedAt: Date;
}

const DATA_DIR = path.join(__dirname, "../../.data");
const DATA_FILE = path.join(DATA_DIR, "urls.json");

const SEED_URLS: StoredUrl[] = [
  {
    id: "seed-1",
    shortCode: "docs",
    originalUrl: "https://expressjs.com/en/starter/installing.html",
    customAlias: "docs",
    clicks: 42,
    createdAt: new Date(Date.now() - 3600000 * 24),
    expiresAt: null,
    updatedAt: new Date(),
  },
  {
    id: "seed-2",
    shortCode: "prismaguide",
    originalUrl: "https://www.prisma.io/docs",
    customAlias: "prismaguide",
    clicks: 18,
    createdAt: new Date(Date.now() - 3600000 * 12),
    expiresAt: new Date(Date.now() + 3600000 * 24 * 30),
    updatedAt: new Date(),
  },
];

class FileStorage {
  private urls: StoredUrl[] = [];
  private initialized = false;

  private ensureLoaded() {
    if (this.initialized) return;

    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        this.urls = parsed.map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt),
          expiresAt: item.expiresAt ? new Date(item.expiresAt) : null,
          updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date(),
        }));
      } else {
        this.urls = [...SEED_URLS];
        this.persist();
      }
    } catch (e) {
      console.warn("Could not read local data file, using in-memory store:", e);
      this.urls = [...SEED_URLS];
    }

    this.initialized = true;
  }

  private persist() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.urls, null, 2), "utf-8");
    } catch (e) {
      console.error("Failed to persist data file:", e);
    }
  }

  async findByCodeOrAlias(codeOrAlias: string): Promise<StoredUrl | null> {
    this.ensureLoaded();
    const query = codeOrAlias.toLowerCase();
    return (
      this.urls.find(
        (u) =>
          u.shortCode.toLowerCase() === query ||
          (u.customAlias && u.customAlias.toLowerCase() === query)
      ) || null
    );
  }

  async findByShortCode(shortCode: string): Promise<StoredUrl | null> {
    this.ensureLoaded();
    return this.urls.find((u) => u.shortCode === shortCode) || null;
  }

  async findByCustomAlias(customAlias: string): Promise<StoredUrl | null> {
    this.ensureLoaded();
    const query = customAlias.toLowerCase();
    return (
      this.urls.find(
        (u) => u.customAlias && u.customAlias.toLowerCase() === query
      ) || null
    );
  }

  async create(data: {
    originalUrl: string;
    shortCode: string;
    customAlias?: string | null;
    expiresAt?: Date | null;
  }): Promise<StoredUrl> {
    this.ensureLoaded();
    const newRecord: StoredUrl = {
      id: `local-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      originalUrl: data.originalUrl,
      shortCode: data.shortCode,
      customAlias: data.customAlias || null,
      clicks: 0,
      createdAt: new Date(),
      expiresAt: data.expiresAt || null,
      updatedAt: new Date(),
    };

    this.urls.unshift(newRecord);
    this.persist();
    return newRecord;
  }

  async updateCustomAlias(
    codeOrAlias: string,
    customAlias: string
  ): Promise<StoredUrl | null> {
    this.ensureLoaded();
    const record = await this.findByCodeOrAlias(codeOrAlias);
    if (!record) return null;

    record.customAlias = customAlias;
    record.updatedAt = new Date();
    this.persist();
    return record;
  }

  async incrementClicks(codeOrAlias: string): Promise<StoredUrl | null> {
    this.ensureLoaded();
    const record = await this.findByCodeOrAlias(codeOrAlias);
    if (!record) return null;

    record.clicks += 1;
    record.updatedAt = new Date();
    this.persist();
    return record;
  }

  async delete(codeOrAlias: string): Promise<boolean> {
    this.ensureLoaded();
    const initialLen = this.urls.length;
    const query = codeOrAlias.toLowerCase();
    this.urls = this.urls.filter(
      (u) =>
        u.shortCode.toLowerCase() !== query &&
        (!u.customAlias || u.customAlias.toLowerCase() !== query)
    );

    const changed = this.urls.length !== initialLen;
    if (changed) this.persist();
    return changed;
  }

  async getAll(skip = 0, take = 50, search?: string) {
    this.ensureLoaded();
    let result = [...this.urls];

    if (search) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (u) =>
          u.shortCode.toLowerCase().includes(q) ||
          u.originalUrl.toLowerCase().includes(q) ||
          (u.customAlias && u.customAlias.toLowerCase().includes(q))
      );
    }

    const total = result.length;
    const data = result.slice(skip, skip + take);
    return { data, total };
  }

  async getStats() {
    this.ensureLoaded();
    const totalUrls = this.urls.length;
    const totalClicks = this.urls.reduce((acc, curr) => acc + curr.clicks, 0);
    return { totalUrls, totalClicks };
  }

  async cleanupExpired(): Promise<number> {
    this.ensureLoaded();
    const now = Date.now();
    const initialLen = this.urls.length;
    this.urls = this.urls.filter(
      (u) => !u.expiresAt || new Date(u.expiresAt).getTime() > now
    );
    const deleted = initialLen - this.urls.length;
    if (deleted > 0) this.persist();
    return deleted;
  }
}

export const fileStorage = new FileStorage();
