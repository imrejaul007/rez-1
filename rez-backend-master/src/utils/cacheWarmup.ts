/**
 * Cache Warmup Utility
 *
 * Pre-populates Redis cache for high-traffic public endpoints on server startup.
 * Calls service/model layer directly (no HTTP) to populate cache via withCache().
 */

import { withCache } from './cacheHelper';
import { CacheTTL } from '../config/redis';
import { logger } from '../config/logger';
import { Category } from '../models/Category';
import { Product } from '../models/Product';
import { Store } from '../models/Store';

export async function warmUpPublicCaches(): Promise<void> {
  const results = { success: 0, failed: 0 };

  const tasks: Array<{ name: string; fn: () => Promise<any> }> = [
    {
      name: 'root-categories',
      fn: () => withCache('categories:root:/root:{}', CacheTTL.CATEGORY_LIST, async () => {
        return Category.find({ parentCategory: null, isActive: true })
          .select('name slug icon image type displayOrder')
          .sort({ displayOrder: 1 })
          .lean();
      }),
    },
    {
      name: 'featured-categories',
      fn: () => withCache('categories:featured:/featured:{}', CacheTTL.CATEGORY_LIST, async () => {
        return Category.find({ isFeatured: true, isActive: true })
          .select('name slug icon image type displayOrder')
          .sort({ displayOrder: 1 })
          .limit(6)
          .lean();
      }),
    },
    {
      name: 'featured-products',
      fn: () => withCache('products:featured:/featured:{}', CacheTTL.PRODUCT_FEATURED, async () => {
        return Product.find({ isFeatured: true, isActive: true })
          .select('name slug images price pricing rating reviewCount store category')
          .populate('store', 'name slug logo')
          .sort({ 'rating.average': -1 })
          .limit(10)
          .lean();
      }),
    },
    {
      name: 'featured-stores',
      fn: () => withCache('stores:featured:/featured:{}', CacheTTL.STORE_LIST, async () => {
        return Store.find({ isFeatured: true, isActive: true })
          .select('name slug logo coverImage rating reviewCount tags category')
          .sort({ 'rating.average': -1 })
          .limit(10)
          .lean();
      }),
    },
  ];

  await Promise.allSettled(
    tasks.map(async (task) => {
      try {
        await task.fn();
        results.success++;
        logger.info(`[CACHE-WARMUP] ${task.name} — OK`);
      } catch (err) {
        results.failed++;
        logger.warn(`[CACHE-WARMUP] ${task.name} — FAILED:`, err instanceof Error ? err.message : err);
      }
    })
  );

  logger.info(`[CACHE-WARMUP] Complete: ${results.success} OK, ${results.failed} failed`);
}
