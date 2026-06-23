import { Router } from 'express';
import {
  addToFavorites,
  removeFromFavorites,
  toggleFavorite,
  getUserFavorites,
  isStoreFavorited,
  getFavoriteStatuses,
  clearAllFavorites
} from '../controllers/favoriteController';
import { requireAuth } from '../middleware/auth';
import { validateQuery, validateParams, validateBody, commonSchemas } from '../middleware/validation';
import { generalLimiter } from '../middleware/rateLimiter';
import { Joi } from '../middleware/validation';

const router = Router();
router.use(generalLimiter);

// Add store to favorites
router.post('/store/:storeId',   // favoriteLimiter,, // Disabled for development
  requireAuth,
  validateParams(Joi.object({
    storeId: commonSchemas.objectId()
  })),
  addToFavorites
);

// Remove store from favorites
router.delete('/store/:storeId',   // favoriteLimiter,, // Disabled for development
  requireAuth,
  validateParams(Joi.object({
    storeId: commonSchemas.objectId()
  })),
  removeFromFavorites
);

// Toggle favorite status
router.post('/store/:storeId/toggle',   // favoriteLimiter,, // Disabled for development
  requireAuth,
  validateParams(Joi.object({
    storeId: commonSchemas.objectId()
  })),
  toggleFavorite
);

// Check if store is favorited by user
router.get('/store/:storeId/status',   // generalLimiter,, // Disabled for development
  requireAuth,
  validateParams(Joi.object({
    storeId: commonSchemas.objectId()
  })),
  isStoreFavorited
);

// Get user's favorite stores
router.get('/user/my-favorites',   // generalLimiter,, // Disabled for development
  requireAuth,
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getUserFavorites
);

// Get favorite status for multiple stores
router.post('/statuses',   // generalLimiter,, // Disabled for development
  requireAuth,
  validateBody(Joi.object({
    storeIds: Joi.array().items(commonSchemas.objectId()).min(1).max(100).required()
  })),
  getFavoriteStatuses
);

// Clear all favorites
router.delete('/clear-all',   // favoriteLimiter,, // Disabled for development
  requireAuth,
  clearAllFavorites
);

export default router;
