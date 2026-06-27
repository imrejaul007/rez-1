import { Router } from 'express';
import {
  getPersonalizedRecommendations,
  getStoreRecommendations,
  getTrendingStores,
  getCategoryRecommendations,
  getUserRecommendationPreferences,
  updateUserRecommendationPreferences,
  getSimilarProducts,
  getFrequentlyBoughtTogether,
  getBundleDeals,
  getPersonalizedProductRecommendations,
  getPickedForYouRecommendations,
  trackProductView
} from '../controllers/recommendationController';
import { getDiverseRecommendations } from '../controllers/diverseRecommendationController';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { validateQuery, validateParams, validateBody } from '../middleware/validation';
import { generalLimiter } from '../middleware/rateLimiter';
import { Joi } from '../middleware/validation';

const router = Router();
router.use(generalLimiter);

// Get personalized store recommendations
router.get('/personalized',     optionalAuth,
  validateQuery(Joi.object({
    location: Joi.string().pattern(/^-?\d+\.?\d*,-?\d+\.?\d*$/), // "lng,lat" format
    radius: Joi.number().min(0.1).max(50).default(10),
    limit: Joi.number().integer().min(1).max(50).default(10),
    excludeStores: Joi.string(), // Comma-separated store IDs
    category: Joi.string().valid('fastDelivery', 'budgetFriendly', 'premium', 'organic', 'alliance', 'lowestPrice', 'mall', 'cashStore'),
    minRating: Joi.number().min(1).max(5),
    maxDeliveryTime: Joi.number().min(5).max(120),
    priceRange: Joi.string().pattern(/^\d+-\d+$/), // "0-100" format
    features: Joi.string() // Comma-separated features
  })),
  getPersonalizedRecommendations
);

// Get recommendations for a specific store
router.get('/store/:storeId',     optionalAuth,
  validateParams(Joi.object({
    storeId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/) // MongoDB ObjectId
  })),
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(20).default(5)
  })),
  getStoreRecommendations
);

// Get trending stores
router.get('/trending',     optionalAuth,
  validateQuery(Joi.object({
    location: Joi.string().pattern(/^-?\d+\.?\d*,-?\d+\.?\d*$/), // "lng,lat" format
    radius: Joi.number().min(0.1).max(50).default(10),
    limit: Joi.number().integer().min(1).max(50).default(10),
    category: Joi.string().valid('fastDelivery', 'budgetFriendly', 'premium', 'organic', 'alliance', 'lowestPrice', 'mall', 'cashStore'),
    timeRange: Joi.string().valid('1d', '7d', '30d').default('7d')
  })),
  getTrendingStores
);

// Get category-based recommendations
router.get('/category/:category',     optionalAuth,
  validateParams(Joi.object({
    category: Joi.string().valid('fastDelivery', 'budgetFriendly', 'premium', 'organic', 'alliance', 'lowestPrice', 'mall', 'cashStore')
  })),
  validateQuery(Joi.object({
    location: Joi.string().pattern(/^-?\d+\.?\d*,-?\d+\.?\d*$/), // "lng,lat" format
    radius: Joi.number().min(0.1).max(50).default(10),
    limit: Joi.number().integer().min(1).max(50).default(10)
  })),
  getCategoryRecommendations
);

// Alias: "For You" — same as personalized recommendations
router.get('/for-you',
  optionalAuth,
  validateQuery(Joi.object({
    location: Joi.string().pattern(/^-?\d+\.?\d*,-?\d+\.?\d*$/),
    radius: Joi.number().min(0.1).max(50).default(10),
    limit: Joi.number().integer().min(1).max(50).default(10),
    excludeStores: Joi.string(),
    category: Joi.string().valid('fastDelivery', 'budgetFriendly', 'premium', 'organic', 'alliance', 'lowestPrice', 'mall', 'cashStore'),
    minRating: Joi.number().min(1).max(5),
    maxDeliveryTime: Joi.number().min(5).max(120),
    priceRange: Joi.string().pattern(/^\d+-\d+$/),
    features: Joi.string()
  })),
  getPersonalizedRecommendations
);

// Get user's recommendation preferences
router.get('/preferences',     requireAuth,
  getUserRecommendationPreferences
);

// Update user's recommendation preferences
router.put('/preferences',     requireAuth,
  validateBody(Joi.object({
    preferences: Joi.object({
      categories: Joi.array().items(Joi.string()),
      priceRange: Joi.object({
        min: Joi.number().min(0),
        max: Joi.number().min(0)
      }),
      maxDeliveryTime: Joi.number().min(5).max(120),
      minRating: Joi.number().min(1).max(5),
      features: Joi.array().items(Joi.string())
    })
  })),
  updateUserRecommendationPreferences
);

// ============================================
// PRODUCT RECOMMENDATION ROUTES
// ============================================

// Get similar products for a specific product
router.get('/products/similar/:productId',
  optionalAuth,
  validateParams(Joi.object({
    productId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/) // MongoDB ObjectId
  })),
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(20).default(6)
  })),
  getSimilarProducts
);

// Get frequently bought together for a product
router.get('/products/frequently-bought/:productId',
  optionalAuth,
  validateParams(Joi.object({
    productId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/) // MongoDB ObjectId
  })),
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(10).default(4)
  })),
  getFrequentlyBoughtTogether
);

// Get bundle deals for a product
router.get('/products/bundle/:productId',     optionalAuth,
  validateParams(Joi.object({
    productId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/) // MongoDB ObjectId
  })),
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(10).default(3)
  })),
  getBundleDeals
);

// Get personalized product recommendations for user
router.get('/products/personalized',     requireAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10),
    excludeProducts: Joi.string() // Comma-separated product IDs
  })),
  getPersonalizedProductRecommendations
);

// Get "Picked For You" recommendations for homepage
// Works with or without authentication
router.get('/picked-for-you',
  optionalAuth,
  validateQuery(Joi.object({
    location: Joi.string().pattern(/^-?\d+\.?\d*,-?\d+\.?\d*$/), // "lng,lat" format
    limit: Joi.number().integer().min(1).max(20).default(10)
  })),
  getPickedForYouRecommendations
);

// Track product view
router.post('/products/:productId/view',     optionalAuth,
  validateParams(Joi.object({
    productId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/) // MongoDB ObjectId
  })),
  trackProductView
);

// ============================================
// DIVERSE RECOMMENDATIONS ROUTE
// ============================================

/**
 * POST /api/v1/recommendations/diverse
 *
 * Get diverse product recommendations with advanced deduplication
 *
 * This endpoint eliminates duplicate products across recommendation sections
 * and ensures variety across categories, brands, and price ranges.
 */
router.post('/diverse',     optionalAuth,
  validateBody(Joi.object({
    excludeProducts: Joi.array().items(
      Joi.string().pattern(/^[0-9a-fA-F]{24}$/)
    ).optional(),
    excludeStores: Joi.array().items(
      Joi.string().pattern(/^[0-9a-fA-F]{24}$/)
    ).optional(),
    shownProducts: Joi.array().items(
      Joi.string().pattern(/^[0-9a-fA-F]{24}$/)
    ).optional(),
    limit: Joi.number().integer().min(1).max(50).default(10),
    context: Joi.string().valid('homepage', 'product_page', 'store_page', 'category_page').default('homepage'),
    options: Joi.object({
      minCategories: Joi.number().integer().min(1).max(10).optional(),
      maxPerCategory: Joi.number().integer().min(1).max(10).optional(),
      maxPerBrand: Joi.number().integer().min(1).max(10).optional(),
      diversityScore: Joi.number().min(0).max(1).optional(),
      includeStores: Joi.boolean().optional(),
      algorithm: Joi.string().valid('hybrid', 'collaborative', 'content_based').default('hybrid'),
      minRating: Joi.number().min(0).max(5).optional(),
      priceRanges: Joi.number().integer().min(2).max(5).default(3)
    }).optional()
  })),
  getDiverseRecommendations
);

export default router;
