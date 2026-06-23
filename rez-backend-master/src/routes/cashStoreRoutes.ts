/**
 * Cash Store Routes
 *
 * Public browsing endpoints for Cash Store category filtering and brand discovery.
 * No auth required for browsing — anyone can see categories and brands.
 *
 * These are separate from cashStoreAffiliateRoutes (which handle click tracking,
 * webhooks, and cashback — some requiring auth).
 */

import { Router } from 'express';
import { cacheMiddleware } from '../middleware/cacheMiddleware';
import {
  getCashStoreCategories,
  getCashStoreBrands,
  searchCashStoreBrands,
  getCashStoreHomepage,
  getCashStoreGiftCards,
  getCashStoreTrending,
} from '../controllers/cashStoreController';

const router = Router();

/**
 * GET /api/cashstore/categories
 * Returns active categories with virtual filters (All, Popular, High Cashback)
 */
router.get('/categories',
  cacheMiddleware({ ttl: 1800, keyPrefix: 'cashstore:cat', condition: () => true }),
  getCashStoreCategories
);

/**
 * GET /api/cashstore/brands/search?q=<query>&limit=20
 * Search brands by name (must be before /brands to avoid route conflict)
 */
router.get('/brands/search', searchCashStoreBrands);

/**
 * GET /api/cashstore/brands
 * Query params: category (slug), filter (popular|high-cashback), sort, limit, page
 */
router.get('/brands',
  cacheMiddleware({ ttl: 600, keyPrefix: 'cashstore:brands', condition: () => true }),
  getCashStoreBrands
);

/**
 * GET /api/cashstore/gift-cards?category=<slug>&limit=20&page=1
 * Browse brands as gift card offerings, sorted by cashback
 */
router.get('/gift-cards',
  cacheMiddleware({ ttl: 600, keyPrefix: 'cashstore:gc', condition: () => true }),
  getCashStoreGiftCards
);

/**
 * GET /api/cashstore/trending
 * Aggregated trending: popular brands + active offers + high cashback
 */
router.get('/trending',
  cacheMiddleware({ ttl: 300, keyPrefix: 'cashstore:trend', condition: () => true }),
  getCashStoreTrending
);

/**
 * GET /api/cashstore/homepage
 * Aggregated data: categories + top brands + trending + high cashback
 */
router.get('/homepage',
  cacheMiddleware({ ttl: 300, keyPrefix: 'cashstore:hp', condition: () => true }),
  getCashStoreHomepage
);

export default router;
