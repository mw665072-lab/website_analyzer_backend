// Simple in-memory cache
const memoryCache: Record<string, { data: any; expires: number }> = {};

export const cache = {
  async getReport(url: string) {
    const key = `report:${url}`;
    const entry = memoryCache[key];
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      delete memoryCache[key];
      return null;
    }
    return entry.data;
  },
  async setReport(url: string, data: any, ttl = 3600) {
    const key = `report:${url}`;
    memoryCache[key] = {
      data,
      expires: Date.now() + ttl * 1000
    };
  }
};

export type Cache = typeof cache;
