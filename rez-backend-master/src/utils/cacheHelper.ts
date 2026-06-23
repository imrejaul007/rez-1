/**
 * Cache Helper Utility
 *
 * Provides helper functions for generating cache keys and managing cache invalidation
 */

import redisService from '../services/redisService';
import { CacheTTL } from '../config/redis';
import { logger } from '../config/logger';

/**
 * Cache key generators
 * Region-aware keys include region prefix to prevent cross-region cache pollution
 */
export const CacheKeys = {
  // Product keys
  product: (id: string) => `product:${id}`,
  productList: (filters: string) => `product:list:${filters}`,
  productsByCategory: (categorySlug: string, filters: string) => `product:category:${categorySlug}:${filters}`,
  productsByStore: (storeId: string, filters: string) => `product:store:${storeId}:${filters}`,
  productFeatured: (limit: number) => `product:featured:${limit}`,
  productNewArrivals: (limit: number) => `product:new-arrivals:${limit}`,
  productSearch: (query: string, filters: string) => `product:search:${query}:${filters}`,
  productRecommendations: (productId: string, limit: number) => `product:recommendations:${productId}:${limit}`,

  // Region-aware product keys (include region in cache key to prevent cross-region pollution)
  productListByRegion: (region: string, filters: string) => `region:${region}:product:list:${filters}`,
  productsByCategoryByRegion: (region: string, categorySlug: string, filters: string) =>
    `region:${region}:product:category:${categorySlug}:${filters}`,
  productFeaturedByRegion: (region: string, limit: number) => `region:${region}:product:featured:${limit}`,
  productNewArrivalsByRegion: (region: string, limit: number) => `region:${region}:product:new-arrivals:${limit}`,
  productSearchByRegion: (region: string, query: string, filters: string) =>
    `region:${region}:product:search:${query}:${filters}`,

  // Category keys
  categoryList: () => `category:list`,
  category: (id: string) => `category:${id}`,
  categoryBySlug: (slug: string) => `category:slug:${slug}`,

  // Store keys
  storeList: (filters: string) => `store:list:${filters}`,
  store: (id: string) => `store:${id}`,
  storeProducts: (storeId: string) => `store:${storeId}:products`,

  // Region-aware store keys
  storeListByRegion: (region: string, filters: string) => `region:${region}:store:list:${filters}`,
  storesByRegion: (region: string) => `region:${region}:stores`,

  // Homepage keys by region
  homepageByRegion: (region: string, section: string) => `region:${region}:homepage:${section}`,

  // Cart keys — use CacheTTL.CART_DATA / CART_SUMMARY (60s / 30s) to avoid stale pricing (P-11)
  cart: (userId: string) => `cart:user:${userId}`,
  cartSummary: (userId: string) => `cart:summary:${userId}`,

  // User keys — CONTAINS PII (P-15): name, email, phone, addresses.
  // Use CacheTTL.USER_PROFILE (30s) or CacheTTL.SENSITIVE_DATA.
  // Do NOT increase TTL without a privacy review.
  userProfile: (userId: string) => `user:${userId}:profile`,
  userOrders: (userId: string, filters: string) => `user:${userId}:orders:${filters}`,
  userWishlist: (userId: string) => `user:${userId}:wishlist`,

  // Offer keys
  offerList: (filters: string) => `offer:list:${filters}`,
  offer: (id: string) => `offer:${id}`,
  offerDetail: (id: string) => `offer:detail:${id}`,
  userOffers: (userId: string) => `offer:user:${userId}`,

  // Voucher keys
  voucherList: (filters: string) => `voucher:list:${filters}`,
  voucher: (id: string) => `voucher:${id}`,
  userVouchers: (userId: string) => `voucher:user:${userId}`,

  // Wallet keys — CONTAINS FINANCIAL PII (P-15): balance, transactions, payment methods.
  // Use CacheTTL.WALLET_DATA (30s) or CacheTTL.SENSITIVE_DATA.
  // Do NOT increase TTL without a privacy review.
  wallet: (userId: string) => `wallet:user:${userId}`,
  walletTransactions: (userId: string, filters: string) => `wallet:user:${userId}:txns:${filters}`,

  // Video keys
  videoList: (filters: string) => `video:list:${filters}`,
  videoTrending: (timeframe: string, limit: number) => `video:trending:${timeframe}:${limit}`,
  videoByCategory: (category: string, filters: string) => `video:category:${category}:${filters}`,
  videoByStore: (storeId: string, filters: string) => `video:store:${storeId}:${filters}`,

  // Offers page aggregated data
  offersPageData: (region: string, tab: string) => `offers:page-data:${region}:${tab}`,

  // Stock keys
  stock: (productId: string) => `stock:${productId}`,
  stockByVariant: (productId: string, variantType: string, variantValue: string) =>
    `stock:${productId}:variant:${variantType}:${variantValue}`,
};

/**
 * Cache invalidation helpers.
 *
 * P-13: Every invalidation method wraps its work in a try/catch so that
 * failures are logged as warnings but never bubble up and break the
 * calling request.  This is intentional -- cache invalidation is
 * best-effort; the cache will self-heal when TTLs expire.
 */
export class CacheInvalidator {
  /** Internal helper: run invalidation ops and log any failures as warnings (P-13). */
  private static async safeInvalidate(label: string, ops: Promise<any>[]): Promise<void> {
    try {
      await Promise.all(ops);
    } catch (err) {
      logger.warn(`[CACHE-INVALIDATION-WARN] ${label} — one or more invalidation ops failed:`, err);
    }
  }

  /**
   * Invalidate all product-related cache (P-12: called on product create/update/delete)
   */
  static async invalidateProduct(productId: string): Promise<void> {
    logger.info(`Invalidating cache for product: ${productId}`);

    await CacheInvalidator.safeInvalidate(`product:${productId}`, [
      // Delete specific product cache
      redisService.del(CacheKeys.product(productId)),

      // Delete product list caches (with different filters)
      redisService.delPattern('product:list:*'),

      // Delete featured and new arrivals (as they might include this product)
      redisService.delPattern('product:featured:*'),
      redisService.delPattern('product:new-arrivals:*'),

      // Delete search results (as they might include this product)
      redisService.delPattern('product:search:*'),

      // Delete recommendations
      redisService.delPattern(`product:recommendations:${productId}:*`),

      // Delete trending products cache
      redisService.delPattern('product:trending:*'),

      // Delete suggestions / popular searches that may reference this product
      redisService.delPattern('product:suggestions:*'),
      redisService.delPattern('product:popular-searches:*'),

      // Delete stock cache
      redisService.del(CacheKeys.stock(productId)),
      redisService.delPattern(`stock:${productId}:variant:*`),

      // Delete region-aware product caches (P-12)
      redisService.delPattern('region:*:product:*'),

      // Delete homepage caches that embed product data
      redisService.delPattern('region:*:homepage:*'),

      // Delete response-middleware caches for product routes
      redisService.delPattern('response:*product*'),
    ]);
  }

  /**
   * Invalidate product list caches
   */
  static async invalidateProductLists(): Promise<void> {
    logger.info('Invalidating all product list caches');

    await CacheInvalidator.safeInvalidate('product-lists', [
      redisService.delPattern('product:list:*'),
      redisService.delPattern('product:featured:*'),
      redisService.delPattern('product:new-arrivals:*'),
      redisService.delPattern('product:search:*'),
      redisService.delPattern('product:trending:*'),
      redisService.delPattern('region:*:product:*'),
    ]);
  }

  /**
   * Invalidate category-related cache (P-12: called on category create/update/delete)
   */
  static async invalidateCategory(categoryId: string, categorySlug?: string): Promise<void> {
    logger.info(`Invalidating cache for category: ${categoryId}`);

    await CacheInvalidator.safeInvalidate(`category:${categoryId}`, [
      redisService.del(CacheKeys.category(categoryId)),
      categorySlug ? redisService.del(CacheKeys.categoryBySlug(categorySlug)) : Promise.resolve(),
      redisService.del(CacheKeys.categoryList()),
      redisService.delPattern('product:category:*'),

      // Region-aware category product caches (P-12)
      redisService.delPattern('region:*:product:category:*'),

      // Homepage sections that may embed category data
      redisService.delPattern('region:*:homepage:*'),

      // Response-middleware caches for category routes
      redisService.delPattern('response:*categor*'),
    ]);
  }

  /**
   * Invalidate ALL categories at once (P-12: useful after bulk category updates)
   */
  static async invalidateAllCategories(): Promise<void> {
    logger.info('Invalidating ALL category caches');

    await CacheInvalidator.safeInvalidate('all-categories', [
      redisService.delPattern('category:*'),
      redisService.delPattern('product:category:*'),
      redisService.delPattern('region:*:product:category:*'),
      redisService.delPattern('region:*:homepage:*'),
      redisService.delPattern('response:*categor*'),
    ]);
  }

  /**
   * Invalidate store-related cache (P-12: called on store create/update/delete)
   */
  static async invalidateStore(storeId: string): Promise<void> {
    logger.info(`Invalidating cache for store: ${storeId}`);

    await CacheInvalidator.safeInvalidate(`store:${storeId}`, [
      redisService.del(CacheKeys.store(storeId)),
      redisService.del(CacheKeys.storeProducts(storeId)),
      redisService.delPattern(`product:store:${storeId}:*`),
      redisService.delPattern('store:list:*'),

      // Trending stores cache
      redisService.delPattern('store:trending:*'),

      // Region-aware store caches (P-12)
      redisService.delPattern('region:*:store:*'),
      redisService.delPattern('region:*:stores'),

      // Homepage sections that may embed store data
      redisService.delPattern('region:*:homepage:*'),

      // Response-middleware caches for store routes
      redisService.delPattern('response:*store*'),
    ]);
  }

  /**
   * Invalidate cart cache for a user
   */
  static async invalidateCart(userId: string): Promise<void> {
    logger.info(`Invalidating cache for user cart: ${userId}`);

    await CacheInvalidator.safeInvalidate(`cart:${userId}`, [
      redisService.del(CacheKeys.cart(userId)),
      redisService.del(CacheKeys.cartSummary(userId)),
    ]);
  }

  /**
   * Invalidate stock cache for a product
   */
  static async invalidateStock(productId: string): Promise<void> {
    logger.info(`Invalidating stock cache for product: ${productId}`);

    await CacheInvalidator.safeInvalidate(`stock:${productId}`, [
      redisService.del(CacheKeys.stock(productId)),
      redisService.delPattern(`stock:${productId}:variant:*`),

      // Also invalidate the product cache since it contains stock info
      redisService.del(CacheKeys.product(productId)),
    ]);
  }

  /**
   * Update stock cache atomically
   */
  static async updateStockCache(productId: string, newStock: number, ttl: number = CacheTTL.SHORT_CACHE): Promise<void> {
    try {
      await redisService.set(CacheKeys.stock(productId), newStock, ttl);
    } catch (err) {
      logger.warn(`[CACHE-INVALIDATION-WARN] updateStockCache(${productId}) failed:`, err);
    }
  }

  /**
   * Update variant stock cache atomically
   */
  static async updateVariantStockCache(
    productId: string,
    variantType: string,
    variantValue: string,
    newStock: number,
    ttl: number = CacheTTL.SHORT_CACHE
  ): Promise<void> {
    try {
      await redisService.set(CacheKeys.stockByVariant(productId, variantType, variantValue), newStock, ttl);
    } catch (err) {
      logger.warn(`[CACHE-INVALIDATION-WARN] updateVariantStockCache(${productId}) failed:`, err);
    }
  }

  /**
   * Invalidate user-related cache
   */
  static async invalidateUser(userId: string): Promise<void> {
    logger.info(`Invalidating cache for user: ${userId}`);

    await CacheInvalidator.safeInvalidate(`user:${userId}`, [
      redisService.del(CacheKeys.userProfile(userId)),
      redisService.delPattern(`user:${userId}:orders:*`),
      redisService.del(CacheKeys.userWishlist(userId)),
      redisService.del(CacheKeys.cart(userId)),
      redisService.del(CacheKeys.cartSummary(userId)),
      redisService.del(CacheKeys.userOffers(userId)),
      redisService.del(CacheKeys.userVouchers(userId)),
    ]);
  }

  /**
   * Invalidate video-related cache
   */
  static async invalidateVideo(videoId?: string): Promise<void> {
    await CacheInvalidator.safeInvalidate(`video:${videoId || 'all'}`, [
      redisService.delPattern('video:list:*'),
      redisService.delPattern('video:trending:*'),
      redisService.delPattern('video:category:*'),
      redisService.delPattern('video:store:*'),
    ]);
  }

  /**
   * Invalidate offer cache
   */
  static async invalidateOffer(offerId: string): Promise<void> {
    logger.info(`Invalidating cache for offer: ${offerId}`);

    await CacheInvalidator.safeInvalidate(`offer:${offerId}`, [
      redisService.del(CacheKeys.offer(offerId)),
      redisService.del(CacheKeys.offerDetail(offerId)),
      redisService.delPattern('offer:list:*'),
      redisService.delPattern('offer:user:*'),
    ]);
  }

  /**
   * Invalidate voucher cache
   */
  static async invalidateVoucher(voucherId: string): Promise<void> {
    logger.info(`Invalidating cache for voucher: ${voucherId}`);

    await CacheInvalidator.safeInvalidate(`voucher:${voucherId}`, [
      redisService.del(CacheKeys.voucher(voucherId)),
      redisService.delPattern('voucher:list:*'),
      redisService.delPattern('voucher:user:*'),
    ]);
  }
}

/**
 * Generate cache key from query parameters
 */
export function generateQueryCacheKey(params: Record<string, any>): string {
  // Sort keys to ensure consistent cache keys regardless of parameter order
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {} as Record<string, any>);

  return JSON.stringify(sortedParams);
}

/**
 * Wrap a function with caching
 */
export async function withCache<T>(
  cacheKey: string,
  ttl: number,
  fetchFunction: () => Promise<T>
): Promise<T> {
  // Try to get from cache first
  const cached = await redisService.get<T>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // If not in cache, fetch the data
  const data = await fetchFunction();

  // Store in cache (don't await to avoid blocking)
  // P-13: log as warning, not error — cache write failures are non-critical
  redisService.set(cacheKey, data, ttl).catch((err) => {
    logger.warn(`[CACHE-WRITE-WARN] Failed to cache data for key ${cacheKey}:`, err);
  });

  return data;
}

/**
 * Batch cache operations
 */
export class CacheBatch {
  private operations: Array<() => Promise<any>> = [];

  /**
   * Add a cache operation to the batch
   */
  add(operation: () => Promise<any>): void {
    this.operations.push(operation);
  }

  /**
   * Execute all operations in parallel
   */
  async execute(): Promise<void> {
    await Promise.all(this.operations.map((op) => op()));
    this.operations = [];
  }
}

export default {
  CacheKeys,
  CacheInvalidator,
  generateQueryCacheKey,
  withCache,
  CacheBatch,
};