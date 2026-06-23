import AsyncStorage from '@react-native-async-storage/async-storage';

interface CachedSearchResult {
  query: string;
  results: any[];
  timestamp: number;
  expiresAt: number;
}

class SearchCacheService {
  private readonly CACHE_PREFIX = '@search_cache:';
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 50; // Maximum number of cached queries

  /**
   * Generate a cache key for a search query
   */
  private getCacheKey(query: string): string {
    return `${this.CACHE_PREFIX}${query.toLowerCase().trim()}`;
  }

  /**
   * Save search results to cache
   */
  async saveToCache(query: string, results: any[]): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(query);
      const timestamp = Date.now();
      const expiresAt = timestamp + this.CACHE_DURATION;

      const cacheData: CachedSearchResult = {
        query,
        results,
        timestamp,
        expiresAt,
      };

      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
      await this.cleanupOldCache();
    } catch (_error) {
      // silently handle
    }
  }

  /**
   * Get cached search results
   */
  async getFromCache(query: string): Promise<any[] | null> {
    try {
      const cacheKey = this.getCacheKey(query);
      const cached = await AsyncStorage.getItem(cacheKey);

      if (!cached) {
        return null;
      }

      const cacheData: CachedSearchResult = JSON.parse(cached);
      const now = Date.now();

      // Check if cache has expired
      if (now > cacheData.expiresAt) {
        await AsyncStorage.removeItem(cacheKey);
        return null;
      }

      return cacheData.results;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if a query has cached results
   */
  async isCached(query: string): Promise<boolean> {
    try {
      const cacheKey = this.getCacheKey(query);
      const cached = await AsyncStorage.getItem(cacheKey);

      if (!cached) {
        return false;
      }

      const cacheData: CachedSearchResult = JSON.parse(cached);
      const now = Date.now();

      return now <= cacheData.expiresAt;
    } catch (error) {
      return false;
    }
  }

  /**
   * Clear all search cache
   */
  async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (_error) {
      // silently handle
    }
  }

  /**
   * Clean up old cache entries to prevent excessive storage usage
   */
  private async cleanupOldCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));

      if (cacheKeys.length <= this.MAX_CACHE_SIZE) {
        return;
      }

      // Get all cache entries with timestamps
      const entries = await Promise.all(
        cacheKeys.map(async (key) => {
          const data = await AsyncStorage.getItem(key);
          if (!data) return null;
          
          const cacheData: CachedSearchResult = JSON.parse(data);
          return { key, timestamp: cacheData.timestamp };
        })
      );
      // Sort by timestamp (oldest first) and remove oldest entries
      const validEntries = entries.filter(e => e !== null) as Array<{ key: string; timestamp: number }>;
      validEntries.sort((a, b) => a.timestamp - b.timestamp);
      
      const entriesToRemove = validEntries.slice(0, validEntries.length - this.MAX_CACHE_SIZE);
      const keysToRemove = entriesToRemove.map(e => e.key);

      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
      }
    } catch (_error) {
      // silently handle
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalEntries: number;
    totalSize: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));

      let totalSize = 0;
      let oldestEntry: number | null = null;
      let newestEntry: number | null = null;

      for (const key of cacheKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          totalSize += data.length;
          const cacheData: CachedSearchResult = JSON.parse(data);
          
          if (oldestEntry === null || cacheData.timestamp < oldestEntry) {
            oldestEntry = cacheData.timestamp;
          }
          
          if (newestEntry === null || cacheData.timestamp > newestEntry) {
            newestEntry = cacheData.timestamp;
          }
        }
      }

      return {
        totalEntries: cacheKeys.length,
        totalSize,
        oldestEntry,
        newestEntry,
      };
    } catch (error) {
      return {
        totalEntries: 0,
        totalSize: 0,
        oldestEntry: null,
        newestEntry: null,
      };
    }
  }
}

export const searchCacheService = new SearchCacheService();
export default searchCacheService;

