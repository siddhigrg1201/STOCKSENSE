import { cacheManager } from './cacheManager';
import { monitoring } from './monitoring';

export interface ApiProvider<T> {
  name: string;
  fetch: () => Promise<any>;
  normalize: (data: any) => T;
}

export interface FallbackOptions {
  cacheKey: string;
  cacheTtlMs: number;
  timeoutMs?: number;
  forceCache?: boolean;
  retriesPerProvider?: number;
}

export class FallbackHandler {
  static async execute<T>(
    providers: ApiProvider<T>[],
    options: FallbackOptions
  ): Promise<{ data: T; source: string; isCached: boolean; isOffline: boolean }> {
    const { cacheKey, cacheTtlMs, timeoutMs = 3000, forceCache = false, retriesPerProvider = 1 } = options;

    // 1. Check valid cache
    const cached = cacheManager.get<T>(cacheKey);
    if (cached) {
      return { data: cached, source: 'cache', isCached: true, isOffline: false };
    }

    // If forceCache is true, we only want cached data. If it's expired, we use last known.
    if (forceCache) {
      const lastKnown = cacheManager.getLastKnown<T>(cacheKey);
      if (lastKnown) {
        return { data: lastKnown, source: 'last_known_cache', isCached: true, isOffline: true };
      }
      throw new Error(`Low Data Mode: No cached data available for ${cacheKey}`);
    }

    // 2. Try providers in sequence (Primary -> Secondary -> Tertiary)
    // We sort by success rate here for "Intelligent Fallback"
    const stats = monitoring.getStats();
    const sortedProviders = [...providers].sort((a, b) => {
      const aStats = stats[a.name];
      const bStats = stats[b.name];
      const aSuccessRate = aStats ? aStats.successCount / (aStats.successCount + aStats.failureCount) : 1;
      const bSuccessRate = bStats ? bStats.successCount / (bStats.successCount + bStats.failureCount) : 1;
      return bSuccessRate - aSuccessRate; // Descending
    });

    for (const provider of sortedProviders) {
      const startTime = Date.now();
      try {
        const rawData = await this.fetchWithRetryAndTimeout(provider.fetch, timeoutMs, retriesPerProvider);
        const normalizedData = provider.normalize(rawData);
        
        const responseTime = Date.now() - startTime;
        monitoring.recordSuccess(provider.name, responseTime);
        
        // Save to cache
        cacheManager.set(cacheKey, normalizedData, cacheTtlMs);
        
        return { data: normalizedData, source: provider.name, isCached: false, isOffline: false };
      } catch (error: any) {
        monitoring.recordFailure(provider.name, error);
        // Continue to next provider
      }
    }

    // 3. All providers failed, fallback to last known good cache (Offline mode)
    const lastKnown = cacheManager.getLastKnown<T>(cacheKey);
    if (lastKnown) {
      console.warn(`[Fallback] All APIs failed for ${cacheKey}. Using last known cached data.`);
      return { data: lastKnown, source: 'last_known_cache', isCached: true, isOffline: true };
    }

    // 4. Complete failure
    throw new Error(`All API providers failed for ${cacheKey} and no cache available.`);
  }

  private static async fetchWithRetryAndTimeout<T>(
    fetchFn: () => Promise<T>,
    timeoutMs: number,
    retries: number
  ): Promise<T> {
    let lastError: any;
    for (let i = 0; i <= retries; i++) {
      try {
        return await this.fetchWithTimeout(fetchFn(), timeoutMs);
      } catch (error: any) {
        lastError = error;
        if (i < retries) {
          const delay = Math.pow(2, i) * 500; // Exponential backoff: 500ms, 1000ms, 2000ms...
          console.warn(`[Fallback] Retry ${i + 1}/${retries} after ${delay}ms due to: ${error.message}`);
          await new Promise(res => setTimeout(res, delay));
        }
      }
    }
    throw lastError;
  }

  private static fetchWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Request timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then((res) => {
          clearTimeout(timer);
          resolve(res);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }
}
