/**
 * Cache Invalidation Middleware
 * Phase 5: Automatic cache invalidation on data changes
 *
 * Invalidates relevant caches when data is modified
 */

import { Request, Response, NextFunction } from 'express';
import redisService from '../services/redisService';
import { logger } from '../config/logger';

// Use raw Redis client for del (multi-key) and keys pattern scan
const redis = {
  keys: (pattern: string): Promise<string[]> => redisService.getClient()?.keys(pattern) ?? Promise.resolve([]),
  del: (...keys: string[]): Promise<number> =>
    keys.length > 0 ? (redisService.getClient()?.del(keys) ?? Promise.resolve(0)) : Promise.resolve(0),
};

/**
 * Invalidate cache patterns based on operation
 */
const invalidationMap: Record<string, string[]> = {
  // Categories
  'categories:create': ['cache:categories:*', 'cache:products:featured'],
  'categories:update': ['cache:categories:*', 'cache:products:featured'],
  'categories:delete': ['cache:categories:*', 'cache:products:featured'],

  // Products
  'products:create': ['cache:products:*', 'cache:stores:*', 'cache:categories:*'],
  'products:update': ['cache:products:*', 'cache:stores:*', 'cache:categories:*'],
  'products:delete': ['cache:products:*', 'cache:stores:*', 'cache:categories:*'],

  // Stores
  'stores:create': ['cache:stores:*', 'cache:products:*'],
  'stores:update': ['cache:stores:*', 'cache:products:*'],
  'stores:delete': ['cache:stores:*', 'cache:products:*'],

  // Wallets / Coins
  'wallet:update': ['cache:wallet:*', 'cache:user:*'],
  'coins:transfer': ['cache:wallet:*', 'cache:user:*'],
};

/**
 * Middleware to invalidate cache after mutations
 * Usage: app.post('/api/categories', cacheInvalidation('categories:create'), handler)
 */
export function cacheInvalidation(operation: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original send method
    const originalSend = res.send;

    // Override send to invalidate cache after successful response
    res.send = function (data: any) {
      // Only invalidate on success (2xx status)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const patterns = invalidationMap[operation] || [];

        patterns.forEach((pattern) => {
          redis.del(pattern).catch((error: unknown) => {
            logger.warn('[CACHE] Failed to invalidate pattern', {
              pattern,
              operation,
              error: error instanceof Error ? error.message : String(error),
            });
          });
        });

        logger.debug('[CACHE] Invalidated patterns', {
          operation,
          patterns,
        });
      }

      return originalSend.call(this, data);
    };

    next();
  };
}

/**
 * Bulk invalidate cache by pattern
 */
export async function invalidateCache(pattern: string): Promise<number> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.info('[CACHE] Invalidated pattern', {
        pattern,
        keysRemoved: keys.length,
      });
    }
    return keys.length;
  } catch (error) {
    logger.error('[CACHE] Error invalidating pattern', {
      pattern,
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}
