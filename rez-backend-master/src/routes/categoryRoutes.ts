import { Router } from 'express';
import {
  getCategories,
  getCategoryTree,
  getCategoryBySlug,
  getCategoriesWithCounts,
  getRootCategories,
  getFeaturedCategories,
  getBestDiscountCategories,
  getBestSellerCategories,
  getCategoryVibes,
  getCategoryOccasions,
  getCategoryHashtags,
  getCategoryAISuggestions,
  getCategoryLoyaltyStats,
  getRecentOrders,
  getCategoryPageConfig
} from '../controllers/categoryController';
import { optionalAuth } from '../middleware/auth';
import { validateQuery, validateParams } from '../middleware/validation';
import { generalLimiter } from '../middleware/rateLimiter';
import { Joi } from '../middleware/validation';
import { cacheMiddleware } from '../middleware/cacheMiddleware';
import { CacheTTL } from '../config/redis';

const router = Router();
router.use(generalLimiter);

// Get all categories
router.get('/',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    type: Joi.string().valid('going_out', 'home_delivery', 'earn', 'play', 'general'),
    featured: Joi.boolean(),
    parent: Joi.string(),
    isActive: Joi.alternatives().try(
      Joi.boolean(),
      Joi.string().valid('true', 'false')
    )
  })),
  cacheMiddleware({ ttl: CacheTTL.CATEGORY_LIST, keyPrefix: 'categories:list', condition: () => true }),
  getCategories
);

// Get category tree
router.get('/tree',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    type: Joi.string().valid('going_out', 'home_delivery', 'earn', 'play', 'general')
  })),
  cacheMiddleware({ ttl: CacheTTL.CATEGORY_LIST, keyPrefix: 'categories:tree', condition: () => true }),
  getCategoryTree
);

// Get root categories
router.get('/root',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    type: Joi.string().valid('going_out', 'home_delivery', 'earn', 'play', 'general')
  })),
  cacheMiddleware({ ttl: CacheTTL.CATEGORY_LIST, keyPrefix: 'categories:root', condition: () => true }),
  getRootCategories
);

// Get featured categories
router.get('/featured',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    type: Joi.string().valid('going_out', 'home_delivery', 'earn', 'play', 'general'),
    limit: Joi.number().integer().min(1).max(20).default(6)
  })),
  cacheMiddleware({ ttl: CacheTTL.CATEGORY_LIST, keyPrefix: 'categories:featured', condition: () => true }),
  getFeaturedCategories
);

// Get categories with counts
router.get('/with-counts',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    type: Joi.string().valid('going_out', 'home_delivery', 'earn', 'play', 'general').default('general')
  })),
  cacheMiddleware({ ttl: CacheTTL.CATEGORY_LIST, keyPrefix: 'categories:counts', condition: () => true }),
  getCategoriesWithCounts
);

// Get best discount categories
router.get('/best-discount',
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(20).default(10)
  })),
  cacheMiddleware({ ttl: CacheTTL.PRODUCT_LIST, keyPrefix: 'categories:discount', condition: () => true }),
  getBestDiscountCategories
);

// Get best seller categories
router.get('/best-seller',
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(20).default(10)
  })),
  cacheMiddleware({ ttl: CacheTTL.PRODUCT_LIST, keyPrefix: 'categories:bestseller', condition: () => true }),
  getBestSellerCategories
);

// Get category page config (full page configuration for frontend)
router.get('/:slug/page-config',
  optionalAuth,
  validateParams(Joi.object({
    slug: Joi.string().required()
  })),
  cacheMiddleware({ ttl: CacheTTL.CATEGORY_DETAIL, keyPrefix: 'categories:pageconfig', condition: () => true }),
  getCategoryPageConfig
);

// Get category by slug
router.get('/:slug',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    slug: Joi.string().required()
  })),
  cacheMiddleware({ ttl: CacheTTL.CATEGORY_DETAIL, keyPrefix: 'categories:detail', condition: () => true }),
  getCategoryBySlug
);

// Get category vibes
router.get('/:slug/vibes',
  optionalAuth,
  validateParams(Joi.object({
    slug: Joi.string().required()
  })),
  cacheMiddleware({ ttl: CacheTTL.CATEGORY_DETAIL, keyPrefix: 'categories:vibes', condition: () => true }),
  getCategoryVibes
);

// Get category occasions
router.get('/:slug/occasions',
  optionalAuth,
  validateParams(Joi.object({
    slug: Joi.string().required()
  })),
  cacheMiddleware({ ttl: CacheTTL.CATEGORY_DETAIL, keyPrefix: 'categories:occasions', condition: () => true }),
  getCategoryOccasions
);

// Get category hashtags
router.get('/:slug/hashtags',
  optionalAuth,
  validateParams(Joi.object({
    slug: Joi.string().required()
  })),
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(20).default(6)
  })),
  cacheMiddleware({ ttl: CacheTTL.CATEGORY_DETAIL, keyPrefix: 'categories:hashtags', condition: () => true }),
  getCategoryHashtags
);

// Get category AI suggestions
router.get('/:slug/ai-suggestions',
  optionalAuth,
  validateParams(Joi.object({
    slug: Joi.string().required()
  })),
  cacheMiddleware({ ttl: CacheTTL.PRODUCT_SEARCH, keyPrefix: 'categories:ai', condition: () => true }),
  getCategoryAISuggestions
);

// Get category loyalty stats
router.get('/:slug/loyalty-stats',
  optionalAuth,
  validateParams(Joi.object({
    slug: Joi.string().required()
  })),
  cacheMiddleware({ ttl: 300, keyPrefix: 'categories:loyalty', condition: () => true }),
  getCategoryLoyaltyStats
);

// Get recent orders for social proof ticker
router.get('/:slug/recent-orders',
  optionalAuth,
  validateParams(Joi.object({
    slug: Joi.string().required()
  })),
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(10).default(5)
  })),
  cacheMiddleware({ ttl: CacheTTL.SHORT_CACHE, keyPrefix: 'categories:recentorders', condition: () => true }),
  getRecentOrders
);

export default router;