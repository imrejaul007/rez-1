import apiClient from './apiClient';

interface PlatformStats {
  averageRating: number;
  totalStores: number;
}

// Module-level in-memory cache (5-min TTL)
let cachedStats: PlatformStats | null = null;
let cacheExpiry = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const platformApi = {
  async getPlatformStats(): Promise<PlatformStats | null> {
    // Return from cache if fresh
    if (cachedStats && Date.now() < cacheExpiry) {
      return cachedStats;
    }

    try {
      const response = await apiClient.get<PlatformStats>('/platform/stats');
      if (response.success && response.data) {
        cachedStats = response.data;
        cacheExpiry = Date.now() + CACHE_TTL;
        return cachedStats;
      }
      return null;
    } catch (error) {
      return null;
    }
  },
};

export default platformApi;
