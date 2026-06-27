/**
 * Cache Warmup Job — Enhanced for ScalePilot Round 2
 *
 * Pre-populates Redis cache for high-traffic public endpoints on server startup
 * and periodically refreshes cache to ensure fresh data.
 * Supports multi-region caching for bangalore and dubai regions.
 */

import redisService from '../services/redisService';
import { logger } from '../config/logger';
import { CacheTTL } from '../config/redis';
import { withCache, CacheKeys } from '../utils/cacheHelper';
import { regionService } from '../services/regionService';
import { RegionId } from '../config/regions';

export async function cacheWarmupJob() {
  logger.info('[CacheWarmup] Starting enhanced cache warmup...');
  const start = Date.now();

  const results = { success: 0, failed: 0, skipped: 0 };

  // If Redis is not ready, skip warmup
  if (!redisService.isReady()) {
    logger.warn('[CacheWarmup] Redis not ready — skipping cache warmup');
    return;
  }

  // Supported regions for warmup
  const regions: RegionId[] = ['bangalore', 'dubai'];

  const tasks: Array<{
    name: string;
    key: string;
    ttl: number;
    fn: () => Promise<any>;
  }> = [
    // Product caches (global)
    {
      name: 'featured-products',
      key: 'products:featured:/featured:{}',
      ttl: CacheTTL.PRODUCT_FEATURED,
      fn: async () => {
        const { Product } = await import('../models/Product');
        return Product.find({ isFeatured: true, isActive: true })
          .select('name slug images price pricing rating reviewCount store category')
          .populate('store', 'name slug logo')
          .sort({ 'rating.average': -1 })
          .limit(20)
          .lean();
      },
    },
    {
      name: 'new-arrivals',
      key: 'products:new:/new:{}',
      ttl: CacheTTL.PRODUCT_NEW_ARRIVALS,
      fn: async () => {
        const { Product } = await import('../models/Product');
        return Product.find({ isActive: true })
          .select('name slug images price pricing rating store category createdAt')
          .populate('store', 'name slug logo')
          .sort({ createdAt: -1 })
          .limit(20)
          .lean();
      },
    },

    // Category caches (global)
    {
      name: 'root-categories',
      key: 'categories:root:/root:{}',
      ttl: CacheTTL.CATEGORY_LIST,
      fn: async () => {
        const { Category } = await import('../models/Category');
        return Category.find({ parentCategory: null, isActive: true })
          .select('name slug icon image type displayOrder')
          .sort({ displayOrder: 1 })
          .lean();
      },
    },
    {
      name: 'featured-categories',
      key: 'categories:featured:/featured:{}',
      ttl: CacheTTL.CATEGORY_LIST,
      fn: async () => {
        const { Category } = await import('../models/Category');
        return Category.find({ isFeatured: true, isActive: true })
          .select('name slug icon image type displayOrder')
          .sort({ displayOrder: 1 })
          .limit(12)
          .lean();
      },
    },

    // Store caches (global)
    {
      name: 'featured-stores',
      key: 'stores:featured:/featured:{}',
      ttl: CacheTTL.STORE_LIST,
      fn: async () => {
        const { Store } = await import('../models/Store');
        return Store.find({ isFeatured: true, isActive: true })
          .select('name slug logo coverImage rating reviewCount tags category')
          .sort({ 'rating.average': -1 })
          .limit(20)
          .lean();
      },
    },
    {
      name: 'top-rated-stores',
      key: 'stores:toprated:/toprated:{}',
      ttl: CacheTTL.STORE_LIST,
      fn: async () => {
        const { Store } = await import('../models/Store');
        return Store.find({ isActive: true, 'rating.average': { $gte: 4.0 } })
          .select('name slug logo rating reviewCount tags category')
          .sort({ 'rating.average': -1 })
          .limit(10)
          .lean();
      },
    },

    // Region-specific product caches (NEW - for bangalore and dubai)
    ...regions.flatMap((region) => [
      {
        name: `featured-products-${region}`,
        key: CacheKeys.productFeaturedByRegion(region, 20),
        ttl: CacheTTL.PRODUCT_FEATURED,
        fn: async () => {
          const { Product } = await import('../models/Product');
          const regionFilter = regionService.getStoreFilter(region);
          return Product.find({
            isFeatured: true,
            isActive: true,
            ...regionFilter,
          })
            .select('name slug images price pricing rating reviewCount store category')
            .populate('store', 'name slug logo')
            .sort({ 'rating.average': -1 })
            .limit(20)
            .lean();
        },
      },
      {
        name: `new-arrivals-${region}`,
        key: CacheKeys.productNewArrivalsByRegion(region, 20),
        ttl: CacheTTL.PRODUCT_NEW_ARRIVALS,
        fn: async () => {
          const { Product } = await import('../models/Product');
          const regionFilter = regionService.getStoreFilter(region);
          return Product.find({
            isActive: true,
            ...regionFilter,
          })
            .select('name slug images price pricing rating store category createdAt')
            .populate('store', 'name slug logo')
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();
        },
      },
    ]),

    // Region-specific store caches (NEW)
    ...regions.flatMap((region) => [
      {
        name: `featured-stores-${region}`,
        key: CacheKeys.storeListByRegion(region, 'featured'),
        ttl: CacheTTL.STORE_LIST,
        fn: async () => {
          const { Store } = await import('../models/Store');
          const regionFilter = regionService.getStoreFilter(region);
          return Store.find({
            isFeatured: true,
            isActive: true,
            ...regionFilter,
          })
            .select('name slug logo coverImage rating reviewCount tags category')
            .sort({ 'rating.average': -1 })
            .limit(20)
            .lean();
        },
      },
      {
        name: `top-rated-stores-${region}`,
        key: CacheKeys.storesByRegion(region),
        ttl: CacheTTL.STORE_LIST,
        fn: async () => {
          const { Store } = await import('../models/Store');
          const regionFilter = regionService.getStoreFilter(region);
          return Store.find({
            isActive: true,
            'rating.average': { $gte: 4.0 },
            ...regionFilter,
          })
            .select('name slug logo rating reviewCount tags category')
            .sort({ 'rating.average': -1 })
            .limit(10)
            .lean();
        },
      },
    ]),
  ];

  // Execute warmup tasks in parallel
  await Promise.allSettled(
    tasks.map(async (task) => {
      try {
        const cached = await withCache(task.key, task.ttl, task.fn);
        results.success++;
        logger.info(`[CacheWarmup] OK ${task.name} — ${Array.isArray(cached) ? cached.length : 1} items cached`);
      } catch (err) {
        results.failed++;
        logger.warn(`[CacheWarmup] FAILED ${task.name}:`, err instanceof Error ? err.message : err);
      }
    }),
  );

  const elapsed = Date.now() - start;
  logger.info(`[CacheWarmup] Complete in ${elapsed}ms: ${results.success} OK, ${results.failed} failed`);

  return results;
}

// MP-004 FIX: module-level reference so stopPeriodicCacheWarmup() always reaches
// the real interval regardless of whether the caller stored the returned id.
// Previously every call to startPeriodicCacheWarmup() created an interval that
// was only stoppable if the caller captured the return value — which cronJobs.ts
// does NOT do, leaving the interval running until the process dies.
let _periodicCacheWarmupInterval: NodeJS.Timeout | null = null;

/**
 * Start periodic cache warmup job
 * Runs on server startup and then every 30 minutes
 */
export async function startPeriodicCacheWarmup(intervalMs: number = 30 * 60 * 1000) {
  // Prevent duplicate intervals if called more than once
  if (_periodicCacheWarmupInterval) {
    clearInterval(_periodicCacheWarmupInterval);
    _periodicCacheWarmupInterval = null;
  }

  // Run immediately on startup
  await cacheWarmupJob().catch((err) => {
    logger.error('[CacheWarmup] Initial warmup failed:', err);
  });

  // Schedule periodic warmup
  _periodicCacheWarmupInterval = setInterval(async () => {
    await cacheWarmupJob().catch((err) => {
      logger.error('[CacheWarmup] Periodic warmup failed:', err);
    });
  }, intervalMs);

  logger.info(`[CacheWarmup] Scheduled periodic warmup every ${intervalMs / 1000 / 60} minutes`);

  // Return interval ID for callers that prefer to manage cleanup themselves
  return _periodicCacheWarmupInterval;
}

/**
 * Cleanup function for graceful shutdown
 */
export function stopPeriodicCacheWarmup(intervalId?: NodeJS.Timeout): void {
  // MP-004 FIX: fall back to module-level reference when caller doesn't pass id
  const target = intervalId || _periodicCacheWarmupInterval;
  if (target) {
    clearInterval(target);
    _periodicCacheWarmupInterval = null;
    logger.info('[CacheWarmup] Periodic warmup stopped');
  }
}
