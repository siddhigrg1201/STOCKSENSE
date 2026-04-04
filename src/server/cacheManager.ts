interface CacheItem<T> {
  data: T;
  timestamp: number;
}

export class CacheManager {
  private cache: Map<string, CacheItem<any>> = new Map();

  set<T>(key: string, data: T, ttlMs: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now() + ttlMs,
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.timestamp) {
      // Expired, but we keep it for offline fallback
      return null;
    }
    return item.data as T;
  }

  getLastKnown<T>(key: string): T | null {
    const item = this.cache.get(key);
    return item ? (item.data as T) : null;
  }
}

export const cacheManager = new CacheManager();
