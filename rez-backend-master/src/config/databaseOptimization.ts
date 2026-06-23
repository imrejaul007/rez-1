// @ts-nocheck
/**
 * Database Optimization Configuration
 * Phase 5: Week 1-2 Implementation
 *
 * Identifies slow queries from production logs and creates:
 * 1. Index strategies
 * 2. Redis caching layer
 * 3. Aggregation pipeline optimizations
 * 4. Query monitoring
 */

import { Document, Model, Schema } from 'mongoose';
import redisService from '../services/redisService';
import { logger } from './logger';

// Use raw Redis client — required for get/setex with string results
const redis = {
  get: (key: string): Promise<string | null> => redisService.getClient()?.get(key) ?? Promise.resolve(null),
  setex: (key: string, ttl: number, value: string): Promise<string> =>
    (redisService.getClient()?.set(key, value, { EX: ttl }) ?? Promise.resolve('OK')).then((r) => r ?? 'OK'),
  keys: (pattern: string): Promise<string[]> => redisService.getClient()?.keys(pattern) ?? Promise.resolve([]),
  del: (...keys: string[]): Promise<number> =>
    keys.length > 0 ? (redisService.getClient()?.del(keys) ?? Promise.resolve(0)) : Promise.resolve(0),
};

// ─────────────────────────────────────────────────────────────────────────
// 1. INDEX STRATEGIES
// ─────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const indexStrategies: Record<
  string,
  Array<{ name: string; keys: Record<string, any>; options: Record<string, unknown>; purpose: string }>
> = {
  // Categories Collection - Slowest queries (5-6 seconds)
  categories: [
    {
      name: 'categories_parent_active',
      keys: { parentCategory: 1, isActive: 1 },
      options: { background: true },
      purpose: 'Root category listing (6294ms query)',
    },
    {
      name: 'categories_featured_active',
      keys: { 'metadata.featured': 1, isActive: 1 },
      options: { background: true },
      purpose: 'Featured categories (5680ms query)',
    },
    {
      name: 'categories_sort_active',
      keys: { isActive: 1, parentCategory: 1, sortOrder: 1 },
      options: { background: true },
      purpose: 'Sorted category listings',
    },
  ],

  // Products Collection - Second slowest (5-6 seconds)
  products: [
    {
      name: 'products_featured_active',
      keys: { isFeatured: 1, isActive: 1, isDeleted: 1 },
      options: { background: true },
      purpose: 'Featured products (6550ms query)',
    },
    {
      name: 'products_active_deleted',
      keys: { isActive: 1, isDeleted: 1 },
      options: { background: true },
      purpose: 'All active products (5573ms query)',
    },
    {
      name: 'products_store_active',
      keys: { storeId: 1, isActive: 1, isDeleted: 1 },
      options: { background: true },
      purpose: 'Store product listing',
    },
    {
      name: 'products_category_active',
      keys: { categoryId: 1, isActive: 1, isDeleted: 1 },
      options: { background: true },
      purpose: 'Category product listing',
    },
  ],

  // Stores Collection - Moderate queries (2-4 seconds)
  stores: [
    {
      name: 'stores_featured_active',
      keys: { isFeatured: 1, isActive: 1 },
      options: { background: true },
      purpose: 'Featured stores (4055ms query)',
    },
    {
      name: 'stores_active',
      keys: { isActive: 1 },
      options: { background: true },
      purpose: 'All active stores (1876ms query)',
    },
    {
      name: 'stores_bulk_lookup',
      keys: { _id: 1 },
      options: { background: true },
      purpose: 'Bulk store lookup (2467ms query)',
    },
  ],

  // Orders Collection - Transaction critical
  orders: [
    {
      name: 'orders_user_status_date',
      keys: { user: 1, status: 1, createdAt: -1 },
      options: { background: true },
      purpose: 'User order history',
    },
    {
      name: 'orders_store_status_date',
      keys: { store: 1, status: 1, createdAt: -1 },
      options: { background: true },
      purpose: 'Store order history',
    },
  ],

  // Wallet Collection - Financial critical
  wallets: [
    {
      name: 'wallets_user_balance',
      keys: { user: 1, 'balance.available': 1 },
      options: { background: true },
      purpose: 'User balance lookups',
    },
  ],

  // Transactions Collection - Audit trail
  cointransactions: [
    {
      name: 'cointransactions_user_date',
      keys: { user: 1, createdAt: -1 },
      options: { background: true },
      purpose: 'User transaction history',
    },
    {
      name: 'cointransactions_idempotency',
      keys: { idempotencyKey: 1 },
      options: { sparse: true, unique: true, background: true },
      purpose: 'Idempotency key lookups',
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────
// 2. REDIS CACHING STRATEGIES
// ─────────────────────────────────────────────────────────────────────────

export const cacheStrategies = {
  // Cache hot queries with TTL
  categories: {
    rootCategories: {
      ttl: 3600, // 1 hour
      key: 'cache:categories:root',
      queryFilter: { parentCategory: null, isActive: true },
    },
    featuredCategories: {
      ttl: 1800, // 30 minutes
      key: 'cache:categories:featured',
      queryFilter: { 'metadata.featured': true, isActive: true },
    },
  },

  products: {
    featuredProducts: {
      ttl: 1800, // 30 minutes
      key: 'cache:products:featured',
      queryFilter: { isFeatured: true, isActive: true, isDeleted: { $ne: true } },
    },
    topRatedProducts: {
      ttl: 3600, // 1 hour
      key: 'cache:products:toprated',
      queryFilter: { isActive: true, isDeleted: { $ne: true }, rating: { $gte: 4 } },
      sort: { rating: -1, reviewCount: -1 },
      limit: 50,
    },
  },

  stores: {
    featuredStores: {
      ttl: 1800, // 30 minutes
      key: 'cache:stores:featured',
      queryFilter: { isFeatured: true, isActive: true },
    },
    activeStores: {
      ttl: 3600, // 1 hour
      key: 'cache:stores:active',
      queryFilter: { isActive: true },
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────
// 3. QUERY OPTIMIZATION HELPERS
// ─────────────────────────────────────────────────────────────────────────

/**
 * Cache-aside pattern for expensive queries
 */
export async function getCachedQuery<T extends Document>(
  cacheKey: string,
  ttl: number,
  queryFn: () => Promise<T[]>,
): Promise<T[]> {
  try {
    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.debug('[CACHE] Hit', { key: cacheKey });
      return JSON.parse(cached);
    }

    // Execute query
    logger.debug('[CACHE] Miss, executing query', { key: cacheKey });
    const result = await queryFn();

    // Store in cache
    await redis.setex(cacheKey, ttl, JSON.stringify(result));

    return result;
  } catch (error) {
    logger.error('[CACHE] Error in cache-aside pattern', {
      key: cacheKey,
      error: error instanceof Error ? error.message : String(error),
    });
    // Fall back to direct query
    return queryFn();
  }
}

/**
 * Invalidate cache for a collection
 */
export async function invalidateCollectionCache(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.info('[CACHE] Invalidated', { pattern, count: keys.length });
    }
  } catch (error) {
    logger.error('[CACHE] Error invalidating cache', {
      pattern,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Create database indexes
 */
export async function createDatabaseIndexes(models: Record<string, Model<any>>): Promise<void> {
  logger.info('[DATABASE] Creating optimization indexes...');

  for (const [collection, strategies] of Object.entries(indexStrategies)) {
    const model = models[collection];
    if (!model) {
      logger.warn('[DATABASE] Model not found for collection', { collection });
      continue;
    }

    for (const strategy of strategies) {
      try {
        await model.collection.createIndex(strategy.keys, {
          ...strategy.options,
          name: strategy.name,
        });
        logger.info('[DATABASE] Index created', {
          collection,
          name: strategy.name,
          purpose: strategy.purpose,
        });
      } catch (error) {
        logger.warn('[DATABASE] Index creation warning', {
          collection,
          name: strategy.name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  logger.info('[DATABASE] Index creation complete');
}

// ─────────────────────────────────────────────────────────────────────────
// 4. SLOW QUERY MONITORING
// ─────────────────────────────────────────────────────────────────────────

export const slowQueryThresholds = {
  categories: 1000, // 1 second
  products: 1000, // 1 second
  stores: 800, // 0.8 seconds
  orders: 1500, // 1.5 seconds
  wallets: 500, // 0.5 seconds (financial operations)
  default: 1000, // 1 second default
};

/**
 * Enable profiling for slow queries
 * Set profiling level:
 * 0 = off
 * 1 = slow queries only
 * 2 = all queries
 */
export const profilingConfig = {
  level: 1, // Log slow queries
  slowms: slowQueryThresholds.default,
  sampleRate: 1.0, // 100% sampling in production (adjust as needed)
};

// ─────────────────────────────────────────────────────────────────────────
// 5. AGGREGATION PIPELINE OPTIMIZATION
// ─────────────────────────────────────────────────────────────────────────

export const aggregationOptimizations = {
  /**
   * Move $match early to reduce documents processed
   * Use indexed fields in $match
   * Avoid expensive $lookup operations
   * Use $project to reduce field count
   */
  bestPractices: [
    '$match early to filter documents',
    '$project to reduce field count',
    'Use indexed fields',
    'Avoid $lookup if possible (use embedding)',
    'Use $limit/$skip after $group (not before)',
    'Cache aggregation results',
  ],

  examples: {
    // BAD: $match at end
    badExample: [
      { $lookup: { from: 'stores', localField: 'storeId', foreignField: '_id', as: 'store' } },
      { $match: { isActive: true } }, // ❌ After lookup - wasteful
    ],

    // GOOD: $match at start
    goodExample: [
      { $match: { isActive: true } }, // ✅ Before lookup - efficient
      { $lookup: { from: 'stores', localField: 'storeId', foreignField: '_id', as: 'store' } },
      { $project: { _id: 1, name: 1, price: 1, 'store.name': 1 } }, // Reduce fields
    ],
  },
};

export default {
  indexStrategies,
  cacheStrategies,
  slowQueryThresholds,
  profilingConfig,
  aggregationOptimizations,
};
