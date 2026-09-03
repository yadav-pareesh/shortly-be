// In-memory storage for demo (replace with MongoDB/PostgreSQL for production)
import { UrlEntry } from '../types/index';

class Database {
  private urls: Map<string, UrlEntry> = new Map();
  private customAliasMap: Map<string, string> = new Map(); // alias -> shortCode

  async findByShortCode(shortCode: string): Promise<UrlEntry | null> {
    return this.urls.get(shortCode) || null;
  }

  async findByCustomAlias(alias: string): Promise<UrlEntry | null> {
    const shortCode = this.customAliasMap.get(alias);
    if (!shortCode) return null;
    return this.urls.get(shortCode) || null;
  }

  async create(entry: UrlEntry): Promise<UrlEntry> {
    this.urls.set(entry.shortCode, entry);
    if (entry.customAlias) {
      this.customAliasMap.set(entry.customAlias, entry.shortCode);
    }
    return entry;
  }

  async updateClicks(shortCode: string): Promise<boolean> {
    const entry = this.urls.get(shortCode);
    if (entry) {
      entry.clicks += 1;
      return true;
    }
    return false;
  }

  async getAllUrls(): Promise<UrlEntry[]> {
    return Array.from(this.urls.values());
  }

  async deleteByShortCode(shortCode: string): Promise<boolean> {
    const entry = this.urls.get(shortCode);
    if (entry?.customAlias) {
      this.customAliasMap.delete(entry.customAlias);
    }
    return this.urls.delete(shortCode);
  }

  async updateCustomAlias(oldAlias: string, newAlias: string, shortCode: string): Promise<boolean> {
    if (oldAlias) {
      this.customAliasMap.delete(oldAlias);
    }
    if (newAlias) {
      this.customAliasMap.set(newAlias, shortCode);
    }
    return true;
  }
}

export const db = new Database();