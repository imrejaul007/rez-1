/**
 * Analytics Cache Service
 *
 * Provides Redis-based caching layer for analytics queries.
 * Falls back gracefully if Redis is unavailable.
 */

import redisService from '../services/redisService';
import { logger } from '../config/logger';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds (default: 900 = 15 minutes)
  prefix?: string; // Key prefix (default: 'analytics')
}

export class AnalyticsCacheService {
  private static readonly DEFAULT_TTL = 900; // 15 minutes
  private static readonly DEFAULT_PREFIX = 'analytics';
  private static readonly CACHE_VERSION = 'v2'; // Bump this to invalidate all cache

  /**
   * Get cached value or compute it if not in cache
   */
  static async getOrCompute<T>(
    key: string,
    computeFn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const { ttl = this.DEFAULT_TTL, prefix = this.DEFAULT_PREFIX } = options;
    const fullKey = `${prefix}:${key}`;

    try {
      // Try to get from cache
      const cached = await redisService.get<T>(fullKey);

      if (cached !== null) {
        logger.info(`✅ Analytics Cache HIT: ${fullKey}`);
        return cached;
      }

      logger.info(`❌ Analytics Cache MISS: ${fullKey}`);

      // Compute value
      const value = await computeFn();

      // Store in cache (async, don't wait)
      redisService.set(fullKey, value, ttl).catch(err => {
        logger.error(`Failed to cache ${fullKey}:`, err);
      });

      return value;
    } catch (error) {
      logger.error(`Analytics cache error for ${fullKey}:`, error);
      // Fallback: compute without cache
      return computeFn();
    }
  }

  /**
   * Get a cached value
   */
  static async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const { prefix = this.DEFAULT_PREFIX } = options;
    const fullKey = `${prefix}:${key}`;

    try {
      return await redisService.get<T>(fullKey);
    } catch (error) {
      logger.error(`Failed to get analytics cache ${fullKey}:`, error);
      return null;
    }
  }

  /**
   * Set a cached value
   */
  static async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<boolean> {
    const { ttl = this.DEFAULT_TTL, prefix = this.DEFAULT_PREFIX } = options;
    const fullKey = `${prefix}:${key}`;

    try {
      return await redisService.set(fullKey, value, ttl);
    } catch (error) {
      logger.error(`Failed to set analytics cache ${fullKey}:`, error);
      return false;
    }
  }

  /**
   * Invalidate cache by key
   */
  static async invalidate(key: string, options: CacheOptions = {}): Promise<boolean> {
    const { prefix = this.DEFAULT_PREFIX } = options;
    const fullKey = `${prefix}:${key}`;

    try {
      return await redisService.del(fullKey);
    } catch (error) {
      logger.error(`Failed to invalidate analytics cache ${fullKey}:`, error);
      return false;
    }
  }

  /**
   * Invalidate all cache keys matching a pattern
   */
  static async invalidatePattern(pattern: string, options: CacheOptions = {}): Promise<number> {
    const { prefix = this.DEFAULT_PREFIX } = options;
    const fullPattern = `${prefix}:${pattern}`;

    try {
      return await redisService.delPattern(fullPattern);
    } catch (error) {
      logger.error(`Failed to invalidate pattern ${fullPattern}:`, error);
      return 0;
    }
  }

  /**
   * Invalidate all analytics cache for a specific store
   */
  static async invalidateStore(storeId: string): Promise<number> {
    try {
      logger.info(`🔄 Invalidating all analytics cache for store ${storeId}`);
      return await this.invalidatePattern(`*:${storeId}:*`);
    } catch (error) {
      logger.error(`Failed to invalidate store cache ${storeId}:`, error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  static async getStats(): Promise<any> {
    try {
      return await redisService.getStats();
    } catch (error) {
      logger.error('Failed to get analytics cache stats:', error);
      return {
        enabled: false,
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Clear all analytics cache
   */
  static async clearAll(): Promise<boolean> {
    try {
      logger.info('🗑️ Clearing all analytics cache');
      const deletedCount = await this.invalidatePattern('*');
      return deletedCount > 0;
    } catch (error) {
      logger.error('Failed to clear all analytics cache:', error);
      return false;
    }
  }

  /**
   * Generate cache key for sales overview
   */
  static getSalesOverviewKey(storeId: string, startDate: Date, endDate: Date): string {
    return `sales:overview:${storeId}:${startDate.toISOString().split('T')[0]}:${endDate.toISOString().split('T')[0]}`;
  }

  /**
   * Generate cache key for revenue trends
   */
  static getRevenueTrendsKey(storeId: string, period: string, days: number): string {
    return `revenue:trends:${storeId}:${period}:${days}`;
  }

  /**
   * Generate cache key for top products
   */
  static getTopProductsKey(storeId: string, limit: number, sortBy: string): string {
    return `${this.CACHE_VERSION}:top:products:${storeId}:${limit}:${sortBy}`;
  }

  /**
   * Generate cache key for category performance
   */
  static getCategoryPerformanceKey(storeId: string): string {
    return `category:performance:${storeId}`;
  }

  /**
   * Generate cache key for customer insights
   */
  static getCustomerInsightsKey(storeId: string): string {
    return `customer:insights:${storeId}`;
  }

  /**
   * Generate cache key for inventory status
   */
  static getInventoryStatusKey(storeId: string): string {
    return `inventory:status:${storeId}`;
  }

  /**
   * Generate cache key for sales forecast
   */
  static getSalesForecastKey(storeId: string, days: number): string {
    return `forecast:sales:${storeId}:${days}`;
  }

  /**
   * Generate cache key for stockout prediction
   */
  static getStockoutPredictionKey(productId: string): string {
    return `forecast:stockout:${productId}`;
  }

  /**
   * Generate cache key for seasonal trends
   */
  static getSeasonalTrendsKey(storeId: string, type: string): string {
    return `trends:seasonal:${storeId}:${type}`;
  }

  /**
   * Generate cache key for demand forecast
   */
  static getDemandForecastKey(productId: string): string {
    return `forecast:demand:${productId}`;
  }

  /**
   * Check if cache is available
   */
  static isAvailable(): boolean {
    return redisService.isReady();
  }

  /**
   * Warm up cache for a store (pre-compute common queries)
   */
  static async warmUpCache(storeId: string): Promise<void> {
    logger.info(`🔥 Warming up analytics cache for store ${storeId}...`);

    try {
      // Import services dynamically to avoid circular dependencies
      const { AnalyticsService } = await import('./AnalyticsService');

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 30);

      // Pre-compute common queries
      const warmupPromises = [
        // Sales overview
        this.getOrCompute(
          this.getSalesOverviewKey(storeId, startDate, endDate),
          () => AnalyticsService.getSalesOverview(storeId, startDate, endDate),
          { ttl: 900 }
        ),
        // Revenue trends
        this.getOrCompute(
          this.getRevenueTrendsKey(storeId, 'daily', 30),
          () => AnalyticsService.getRevenueTrends(storeId, 'daily', 30),
          { ttl: 900 }
        ),
        // Top products
        this.getOrCompute(
          this.getTopProductsKey(storeId, 10, 'revenue'),
          () => AnalyticsService.getTopSellingProducts(storeId, 10, 'revenue'),
          { ttl: 1800 }
        ),
        // Category performance
        this.getOrCompute(
          this.getCategoryPerformanceKey(storeId),
          () => AnalyticsService.getCategoryPerformance(storeId),
          { ttl: 1800 }
        ),
        // Customer insights
        this.getOrCompute(
          this.getCustomerInsightsKey(storeId),
          () => AnalyticsService.getCustomerInsights(storeId),
          { ttl: 1800 }
        ),
        // Inventory status
        this.getOrCompute(
          this.getInventoryStatusKey(storeId),
          () => AnalyticsService.getInventoryStatus(storeId),
          { ttl: 600 }
        )
      ];

      await Promise.all(warmupPromises);
      logger.info(`✅ Analytics cache warmed up for store ${storeId}`);
    } catch (error) {
      logger.error(`Failed to warm up cache for store ${storeId}:`, error);
    }
  }

  /**
   * Auto-refresh cache on new order
   */
  static async onNewOrder(storeId: string): Promise<void> {
    logger.info(`🔄 Invalidating analytics cache for store ${storeId} due to new order`);

    try {
      // Invalidate all analytics cache for this store
      await this.invalidateStore(storeId);

      // Optionally warm up cache again in background
      setImmediate(() => {
        this.warmUpCache(storeId).catch(err => {
          logger.error(`Failed to warm up cache after new order:`, err);
        });
      });
    } catch (error) {
      logger.error(`Failed to invalidate cache on new order for store ${storeId}:`, error);
    }
  }

  /**
   * Auto-refresh cache on product update
   */
  static async onProductUpdate(productId: string, storeId: string): Promise<void> {
    logger.info(`🔄 Invalidating product and store analytics cache due to product update`);

    try {
      // Invalidate product-specific cache
      await this.invalidate(this.getStockoutPredictionKey(productId));
      await this.invalidate(this.getDemandForecastKey(productId));

      // Invalidate store inventory cache
      await this.invalidate(this.getInventoryStatusKey(storeId));
      await this.invalidate(this.getTopProductsKey(storeId, 10, 'revenue'));
      await this.invalidate(this.getCategoryPerformanceKey(storeId));
    } catch (error) {
      logger.error(`Failed to invalidate cache on product update:`, error);
    }
  }
}
