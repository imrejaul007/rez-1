import { Router } from 'express';
import {
  createComparison,
  getUserComparisons,
  getComparisonById,
  updateComparison,
  deleteComparison,
  addStoreToComparison,
  removeStoreFromComparison,
  getComparisonStats,
  clearAllComparisons
} from '../controllers/comparisonController';
import { requireAuth } from '../middleware/auth';
import { validateQuery, validateParams, validateBody, commonSchemas } from '../middleware/validation';
import { generalLimiter } from '../middleware/rateLimiter';
import { Joi } from '../middleware/validation';

const router = Router();
router.use(generalLimiter);

// Create a new store comparison
router.post('/',   // comparisonLimiter,, // Disabled for development
  requireAuth,
  validateBody(Joi.object({
    storeIds: Joi.array().items(commonSchemas.objectId()).min(2).max(5).required(),
    name: Joi.string().trim().max(100)
  })),
  createComparison
);

// Get user's store comparisons
router.get('/user/my-comparisons',   // generalLimiter,, // Disabled for development
  requireAuth,
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getUserComparisons
);

// Get specific comparison by ID
router.get('/:comparisonId',   // generalLimiter,, // Disabled for development
  requireAuth,
  validateParams(Joi.object({
    comparisonId: commonSchemas.objectId()
  })),
  getComparisonById
);

// Update comparison
router.put('/:comparisonId',   // comparisonLimiter,, // Disabled for development
  requireAuth,
  validateParams(Joi.object({
    comparisonId: commonSchemas.objectId()
  })),
  validateBody(Joi.object({
    storeIds: Joi.array().items(commonSchemas.objectId()).min(2).max(5),
    name: Joi.string().trim().max(100)
  })),
  updateComparison
);

// Delete comparison
router.delete('/:comparisonId',   // comparisonLimiter,, // Disabled for development
  requireAuth,
  validateParams(Joi.object({
    comparisonId: commonSchemas.objectId()
  })),
  deleteComparison
);

// Add store to comparison
router.post('/:comparisonId/stores',   // comparisonLimiter,, // Disabled for development
  requireAuth,
  validateParams(Joi.object({
    comparisonId: commonSchemas.objectId()
  })),
  validateBody(Joi.object({
    storeId: commonSchemas.objectId().required()
  })),
  addStoreToComparison
);

// Remove store from comparison
router.delete('/:comparisonId/stores/:storeId',   // comparisonLimiter,, // Disabled for development
  requireAuth,
  validateParams(Joi.object({
    comparisonId: commonSchemas.objectId(),
    storeId: commonSchemas.objectId()
  })),
  removeStoreFromComparison
);

// Get comparison statistics
router.get('/user/stats',   // generalLimiter,, // Disabled for development
  requireAuth,
  getComparisonStats
);

// Clear all comparisons
router.delete('/user/clear-all',   // comparisonLimiter,, // Disabled for development
  requireAuth,
  clearAllComparisons
);

export default router;
