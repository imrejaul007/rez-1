// @ts-nocheck
// Gamification Cache Service
// Specialized caching for gamification data with intelligent invalidation

import cacheService from './cacheService';
import type {
  LeaderboardData,
  Achievement,
  Challenge,
  GamificationStats,
} from '@/types/gamification.types';

/**
 * Debounce helper function
 */
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle helper function
 */
function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Gamification Cache Service
 * High-performance caching layer for gamification data
 */
class GamificationCacheService {
  private static readonly CACHE_KEYS = {
    LEADERBOARD: 'leaderboard',
    ACHIEVEMENTS: 'achievements',
    CHALLENGES: 'challenges',
    STATS: 'gamification_stats',
    COIN_BALANCE: 'coin_balance',
    COIN_TRANSACTIONS: 'coin_transactions',
    USER_RANK: 'user_rank',
  };

  private static readonly TTL = {
    LEADERBOARD: 5 * 60 * 1000, // 5 minutes
    ACHIEVEMENTS: 10 * 60 * 1000, // 10 minutes
    CHALLENGES: 5 * 60 * 1000, // 5 minutes
    STATS: 3 * 60 * 1000, // 3 minutes
    COIN_BALANCE: 2 * 60 * 1000, // 2 minutes
    COIN_TRANSACTIONS: 5 * 60 * 1000, // 5 minutes
    USER_RANK: 5 * 60 * 1000, // 5 minutes
  };

  // In-memory cache for frequently accessed data
  private static readonly MAX_CACHE_SIZE = 100;
  private memoryCache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly MEMORY_CACHE_TTL = 60 * 1000; // 1 minute for memory cache

  /**
   * Get from memory cache first, then persistent cache
   */
  private async getWithMemoryCache<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number
  ): Promise<T> {
    // Check memory cache first
    const memoryCached = this.memoryCache.get(key);
    if (memoryCached && Date.now() - memoryCached.timestamp < this.MEMORY_CACHE_TTL) {
      return memoryCached.data;
    }

    // Check persistent cache
    const cached = await cacheService.get<T>(key);
    if (cached) {
      // Store in memory cache for faster access
      this.evictIfOverLimit();
      this.memoryCache.set(key, { data: cached, timestamp: Date.now() });
      return cached;
    }

    // Fetch fresh data
    const data = await fetchFn();
    await cacheService.set(key, data, { ttl, priority: 'high' });
    this.evictIfOverLimit();
    this.memoryCache.set(key, { data, timestamp: Date.now() });
    return data;
  }

  /**
   * Evict oldest entry if memory cache exceeds size limit
   */
  private evictIfOverLimit(): void {
    if (this.memoryCache.size >= GamificationCacheService.MAX_CACHE_SIZE) {
      // Map iterates in insertion order; delete the first (oldest) key
      const oldestKey = this.memoryCache.keys().next().value;
      if (oldestKey !== undefined) {
        this.memoryCache.delete(oldestKey);
      }
    }
  }

  /**
   * Clear memory cache entry
   */
  private clearMemoryCache(key: string): void {
    this.memoryCache.delete(key);
  }

  // ==================== LEADERBOARD ====================

  /**
   * Get leaderboard with caching (5 min TTL)
   */
  async getLeaderboard(
    period: 'daily' | 'weekly' | 'monthly' | 'all-time',
    fetchFn: () => Promise<LeaderboardData>,
    forceRefresh: boolean = false
  ): Promise<LeaderboardData> {
    const key = `${GamificationCacheService.CACHE_KEYS.LEADERBOARD}_${period}`;

    if (forceRefresh) {
      this.clearMemoryCache(key);
      await cacheService.remove(key);
    }

    return this.getWithMemoryCache(
      key,
      fetchFn,
      GamificationCacheService.TTL.LEADERBOARD
    );
  }

  /**
   * Invalidate leaderboard cache (called after game completion)
   * Debounced to avoid excessive invalidations
   */
  invalidateLeaderboard = debounce(async (period?: string) => {
    if (period) {
      const key = `${GamificationCacheService.CACHE_KEYS.LEADERBOARD}_${period}`;
      this.clearMemoryCache(key);
      await cacheService.remove(key);
    } else {
      // Invalidate all periods
      ['daily', 'weekly', 'monthly', 'all-time'].forEach(p => {
        const key = `${GamificationCacheService.CACHE_KEYS.LEADERBOARD}_${p}`;
        this.clearMemoryCache(key);
      });
      await cacheService.invalidateLeaderboard();
    }
  }, 1000); // Wait 1 second before invalidating

  // ==================== ACHIEVEMENTS ====================

  /**
   * Get achievements with caching (10 min TTL)
   */
  async getAchievements(
    userId: string,
    fetchFn: () => Promise<Achievement[]>,
    forceRefresh: boolean = false
  ): Promise<Achievement[]> {
    const key = `${GamificationCacheService.CACHE_KEYS.ACHIEVEMENTS}_${userId}`;

    if (forceRefresh) {
      this.clearMemoryCache(key);
      await cacheService.remove(key);
    }

    return this.getWithMemoryCache(
      key,
      fetchFn,
      GamificationCacheService.TTL.ACHIEVEMENTS
    );
  }

  /**
   * Invalidate achievements cache (called when achievement unlocked)
   */
  async invalidateAchievements(userId: string): Promise<void> {
    const key = `${GamificationCacheService.CACHE_KEYS.ACHIEVEMENTS}_${userId}`;
    this.clearMemoryCache(key);
    await cacheService.invalidateAchievements(userId);
  }

  // ==================== CHALLENGES ====================

  /**
   * Get challenges with caching (5 min TTL)
   */
  async getChallenges(
    fetchFn: () => Promise<Challenge[]>,
    forceRefresh: boolean = false
  ): Promise<Challenge[]> {
    const key = GamificationCacheService.CACHE_KEYS.CHALLENGES;

    if (forceRefresh) {
      this.clearMemoryCache(key);
      await cacheService.remove(key);
    }

    return this.getWithMemoryCache(
      key,
      fetchFn,
      GamificationCacheService.TTL.CHALLENGES
    );
  }

  /**
   * Invalidate challenges cache (called when challenge completed)
   * Throttled to avoid excessive invalidations
   */
  invalidateChallenges = throttle(async () => {
    const key = GamificationCacheService.CACHE_KEYS.CHALLENGES;
    this.clearMemoryCache(key);
    await cacheService.invalidateChallenges();
  }, 2000); // Max once every 2 seconds

  // ==================== STATS ====================

  /**
   * Get gamification stats with caching (3 min TTL)
   */
  async getStats(
    fetchFn: () => Promise<GamificationStats>,
    forceRefresh: boolean = false
  ): Promise<GamificationStats> {
    const key = GamificationCacheService.CACHE_KEYS.STATS;

    if (forceRefresh) {
      this.clearMemoryCache(key);
      await cacheService.remove(key);
    }

    return this.getWithMemoryCache(
      key,
      fetchFn,
      GamificationCacheService.TTL.STATS
    );
  }

  /**
   * Invalidate stats cache
   */
  async invalidateStats(): Promise<void> {
    const key = GamificationCacheService.CACHE_KEYS.STATS;
    this.clearMemoryCache(key);
    await cacheService.remove(key);
  }

  // ==================== COIN BALANCE ====================

  /**
   * Get coin balance with caching (2 min TTL)
   */
  async getCoinBalance<T>(
    fetchFn: () => Promise<T>,
    forceRefresh: boolean = false
  ): Promise<T> {
    const key = GamificationCacheService.CACHE_KEYS.COIN_BALANCE;

    if (forceRefresh) {
      this.clearMemoryCache(key);
      await cacheService.remove(key);
    }

    return this.getWithMemoryCache(
      key,
      fetchFn,
      GamificationCacheService.TTL.COIN_BALANCE
    );
  }

  /**
   * Invalidate coin balance cache (called after coin transaction)
   */
  invalidateCoinBalance = debounce(async () => {
    const key = GamificationCacheService.CACHE_KEYS.COIN_BALANCE;
    this.clearMemoryCache(key);
    await cacheService.remove(key);
  }, 500); // Wait 500ms before invalidating

  // ==================== UTILITY METHODS ====================

  /**
   * Clear all gamification caches
   */
  async clearAll(): Promise<void> {
    this.memoryCache.clear();

    const keys = Object.values(GamificationCacheService.CACHE_KEYS);
    for (const key of keys) {
      await cacheService.remove(key);
    }

    // Also clear period-specific caches
    ['daily', 'weekly', 'monthly', 'all-time'].forEach(async period => {
      await cacheService.remove(`${GamificationCacheService.CACHE_KEYS.LEADERBOARD}_${period}`);
    });

  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    memoryCacheSize: number;
    memoryCacheKeys: string[];
    persistentCacheStats: any;
  }> {
    const persistentStats = await cacheService.getStats();

    return {
      memoryCacheSize: this.memoryCache.size,
      memoryCacheKeys: Array.from(this.memoryCache.keys()),
      persistentCacheStats: persistentStats,
    };
  }

  /**
   * Preload critical gamification data
   * Call this on app startup or when user navigates to gamification pages
   */
  async preload(
    userId: string,
    loaders: {
      achievements?: () => Promise<Achievement[]>;
      challenges?: () => Promise<Challenge[]>;
      leaderboard?: () => Promise<LeaderboardData>;
    }
  ): Promise<void> {

    const promises: Promise<any>[] = [];

    if (loaders.achievements) {
      promises.push(this.getAchievements(userId, loaders.achievements));
    }

    if (loaders.challenges) {
      promises.push(this.getChallenges(loaders.challenges));
    }

    if (loaders.leaderboard) {
      promises.push(this.getLeaderboard('monthly', loaders.leaderboard));
    }

    await Promise.all(promises);
  }
}

// Export singleton instance
const gamificationCacheService = new GamificationCacheService();
export default gamificationCacheService;
