import { Router } from 'express';
import {
  getProducts,
  getProductById,
  getProductsByCategory,
  getProductsBySubcategory,
  getProductsByStore,
  getFeaturedProducts,
  getNewArrivals,
  searchProducts,
  getRecommendations,
  trackProductView,
  getProductAnalytics,
  getFrequentlyBoughtTogether,
  getBundleProducts,
  getSearchSuggestions,
  getPopularSearches,
  getTrendingProducts,
  getRelatedProducts,
  checkAvailability,
  getPopularProducts,
  getNearbyProducts,
  getHotDeals,
  getProductsByCategorySlugHomepage,
  getSimilarProducts
} from '../controllers/productController';
import { optionalAuth } from '../middleware/auth';
import { validateQuery, validateParams, productSchemas, commonSchemas } from '../middleware/validation';
import { generalLimiter } from '../middleware/rateLimiter';
import { Joi } from '../middleware/validation';
import { cacheMiddleware } from '../middleware/cacheMiddleware';
import { CacheTTL } from '../config/redis';

const router = Router();
router.use(generalLimiter);

// Get all products with filtering
router.get('/',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateQuery(productSchemas.getProducts),
  cacheMiddleware({ ttl: CacheTTL.PRODUCT_LIST, keyPrefix: 'products:list', condition: () => true }),
  getProducts
);

// Get featured products - FOR FRONTEND "Just for You" SECTION
router.get('/featured',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(20).default(10)
  })),
  cacheMiddleware({ ttl: CacheTTL.PRODUCT_FEATURED, keyPrefix: 'products:featured', condition: () => true }),
  getFeaturedProducts
);

// Get new arrival products - FOR FRONTEND "New Arrivals" SECTION
router.get('/new-arrivals',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(20).default(10)
  })),
  cacheMiddleware({ ttl: CacheTTL.PRODUCT_NEW_ARRIVALS, keyPrefix: 'products:newarrivals', condition: () => true }),
  getNewArrivals
);

// Search products
router.get('/search',
  // searchLimiter,, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    q: Joi.string().required().trim().min(1).max(100),
    category: commonSchemas.objectId(),
    store: commonSchemas.objectId(),
    brand: Joi.string().max(50),
    minPrice: Joi.number().min(0),
    maxPrice: Joi.number().min(0),
    rating: Joi.number().min(1).max(5),
    inStock: Joi.boolean(),
    ...commonSchemas.pagination()
  })),
  cacheMiddleware({ ttl: CacheTTL.PRODUCT_SEARCH, keyPrefix: 'products:search', condition: () => true }),
  searchProducts
);

// Get search suggestions - FOR FRONTEND SEARCH AUTOCOMPLETE
router.get('/suggestions',
  // searchLimiter,, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    q: Joi.string().required().trim().min(1).max(100)
  })),
  cacheMiddleware({ ttl: CacheTTL.PRODUCT_SEARCH, keyPrefix: 'products:suggestions', condition: () => true }),
  getSearchSuggestions
);

// Get popular searches - FOR FRONTEND SEARCH
router.get('/popular-searches',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(20).default(10)
  })),
  cacheMiddleware({ ttl: CacheTTL.PRODUCT_LIST, keyPrefix: 'products:popsearch', condition: () => true }),
  getPopularSearches
);

// Get trending products - FOR FRONTEND TRENDING SECTION
router.get('/trending',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    category: commonSchemas.objectId(),
    limit: Joi.number().integer().min(1).max(50).default(20),
    page: Joi.number().integer().min(1).default(1),
    days: Joi.number().integer().min(1).max(30).default(7)
  })),
  cacheMiddleware({ ttl: CacheTTL.PRODUCT_LIST, keyPrefix: 'products:trending', condition: () => true }),
  getTrendingProducts
);

// Get popular products - FOR FRONTEND "Popular" SECTION (v2)
router.get('/popular',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    category: Joi.string().trim().max(100),
    limit: Joi.number().integer().min(1).max(50).default(20),
    page: Joi.number().integer().min(1).default(1)
  })),
  cacheMiddleware({ ttl: CacheTTL.PRODUCT_LIST, keyPrefix: 'products:popular', condition: () => true }),
  getPopularProducts
);

// Get nearby products - FOR FRONTEND "In Your Area" SECTION
router.get('/nearby',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    lat: Joi.number().min(-90).max(90),
    lng: Joi.number().min(-180).max(180),
    latitude: Joi.number().min(-90).max(90),
    longitude: Joi.number().min(-180).max(180),
    radius: Joi.number().min(1).max(100).default(10),
    category: Joi.string().trim().max(100),
    limit: Joi.number().integer().min(1).max(50).default(20),
    page: Joi.number().integer().min(1).default(1)
  })),
  cacheMiddleware({ ttl: 300, keyPrefix: 'products:nearby', condition: () => true }),
  getNearbyProducts
);

// Get hot deals - FOR FRONTEND "Hot Deals" SECTION
router.get('/hot-deals',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    category: Joi.string().trim().max(100),
    limit: Joi.number().integer().min(1).max(50).default(20),
    page: Joi.number().integer().min(1).default(1)
  })),
  cacheMiddleware({ ttl: 300, keyPrefix: 'products:hotdeals', condition: () => true }),
  getHotDeals
);

// Get similar products - FOR FRONTEND EMPTY STATE
router.get('/similar',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    query: Joi.string().trim().max(100),
    category: commonSchemas.objectId(),
    limit: Joi.number().integer().min(1).max(50).default(10)
  })),
  cacheMiddleware({ ttl: CacheTTL.PRODUCT_SEARCH, keyPrefix: 'products:similar', condition: () => true }),
  getSimilarProducts
);

// Get products by category slug - FOR FRONTEND HOMEPAGE CATEGORY SECTIONS
router.get('/category-section/:categorySlug',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    categorySlug: Joi.string().required()
  })),
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(20).default(10)
  })),
  cacheMiddleware({ ttl: CacheTTL.PRODUCT_LIST, keyPrefix: 'products:catsection', condition: () => true }),
  getProductsByCategorySlugHomepage
);

// Get single product by ID
router.get('/:id',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  cacheMiddleware({ ttl: CacheTTL.PRODUCT_DETAIL, keyPrefix: 'products:detail', condition: () => true }),
  getProductById
);

// Get product recommendations
router.get('/:productId/recommendations',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    productId: commonSchemas.objectId().required()
  })),
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(20).default(6)
  })),
  cacheMiddleware({ ttl: CacheTTL.PRODUCT_RECOMMENDATIONS, keyPrefix: 'products:recs', condition: () => true }),
  getRecommendations
);

// Get products by category
router.get('/category/:categorySlug',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    categorySlug: Joi.string().required()
  })),
  validateQuery(Joi.object({
    minPrice: Joi.number().min(0),
    maxPrice: Joi.number().min(0),
    rating: Joi.number().min(1).max(5),
    sort: Joi.string().valid('price_low', 'price_high', 'rating', 'newest', 'popularity', 'oldest',
      'createdAt', '-createdAt', 'updatedAt', '-updatedAt', 'name', '-name'),
    sortBy: Joi.string().valid('price_low', 'price_high', 'rating', 'newest', 'popularity'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().trim().max(100),
  })),
  cacheMiddleware({ ttl: CacheTTL.PRODUCT_LIST, keyPrefix: 'products:bycategory', condition: () => true }),
  getProductsByCategory
);

// Get products by subcategory slug - FOR BROWSE CATEGORIES SLIDER
router.get('/subcategory/:subcategorySlug',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    subcategorySlug: Joi.string().required()
  })),
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(20)
  })),
  cacheMiddleware({ ttl: CacheTTL.PRODUCT_LIST, keyPrefix: 'products:bysubcat', condition: () => true }),
  getProductsBySubcategory
);

// Get products by store
router.get('/store/:storeId',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    // Accept both ObjectId format and string IDs (for mock data compatibility)
    storeId: Joi.string().trim().min(1).required()
  })),
  validateQuery(Joi.object({
    category: commonSchemas.objectId(),
    minPrice: Joi.number().min(0),
    maxPrice: Joi.number().min(0),
    sortBy: Joi.string().valid('price_low', 'price_high', 'rating', 'newest'),
    ...commonSchemas.pagination()
  })),
  cacheMiddleware({ ttl: CacheTTL.STORE_PRODUCTS, keyPrefix: 'products:bystore', condition: () => true }),
  getProductsByStore
);

// Track product view
router.post('/:id/track-view',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  trackProductView
);

// Get product analytics
router.get('/:id/analytics',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  validateQuery(Joi.object({
    location: Joi.string() // JSON stringified location object
  })),
  cacheMiddleware({ ttl: 300, keyPrefix: 'products:analytics', condition: () => true }),
  getProductAnalytics
);

// Get frequently bought together products
router.get('/:id/frequently-bought',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(10).default(4)
  })),
  cacheMiddleware({ ttl: CacheTTL.PRODUCT_RECOMMENDATIONS, keyPrefix: 'products:fbt', condition: () => true }),
  getFrequentlyBoughtTogether
);

// Get bundle products
router.get('/:id/bundles',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  cacheMiddleware({ ttl: CacheTTL.PRODUCT_RECOMMENDATIONS, keyPrefix: 'products:bundles', condition: () => true }),
  getBundleProducts
);

// Get related products - FOR FRONTEND PRODUCT DETAILS PAGE
router.get('/:id/related',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(20).default(5)
  })),
  cacheMiddleware({ ttl: CacheTTL.PRODUCT_RECOMMENDATIONS, keyPrefix: 'products:related', condition: () => true }),
  getRelatedProducts
);

// Check product availability - FOR FRONTEND CART/CHECKOUT
router.get('/:id/availability',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  validateQuery(Joi.object({
    variantId: Joi.string(),
    quantity: Joi.number().integer().min(1).default(1)
  })),
  cacheMiddleware({ ttl: CacheTTL.SHORT_CACHE, keyPrefix: 'products:avail', condition: () => true }),
  checkAvailability
);

export default router;