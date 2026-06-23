import { Router } from 'express';
import {
  createProductComparison,
  getUserProductComparisons,
  getProductComparisonById,
  updateProductComparison,
  deleteProductComparison,
  addProductToComparison,
  removeProductFromComparison,
  getProductComparisonStats,
  clearAllProductComparisons
} from '../controllers/productComparisonController';
import { requireAuth } from '../middleware/auth';
import { validateQuery, validateParams, validateBody, commonSchemas } from '../middleware/validation';
import { Joi } from '../middleware/validation';

const router = Router();

// Create a new product comparison
router.post('/', 
  requireAuth,
  validateBody(Joi.object({
    productIds: Joi.array().items(commonSchemas.objectId()).min(2).max(5).required(),
    name: Joi.string().trim().max(100)
  })),
  createProductComparison
);

// Get user's product comparisons
router.get('/user/my-comparisons', 
  requireAuth,
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getUserProductComparisons
);

// Get specific product comparison by ID
router.get('/:comparisonId', 
  requireAuth,
  validateParams(Joi.object({
    comparisonId: commonSchemas.objectId()
  })),
  getProductComparisonById
);

// Update product comparison
router.put('/:comparisonId', 
  requireAuth,
  validateParams(Joi.object({
    comparisonId: commonSchemas.objectId()
  })),
  validateBody(Joi.object({
    productIds: Joi.array().items(commonSchemas.objectId()).min(2).max(5),
    name: Joi.string().trim().max(100)
  })),
  updateProductComparison
);

// Delete product comparison
router.delete('/:comparisonId', 
  requireAuth,
  validateParams(Joi.object({
    comparisonId: commonSchemas.objectId()
  })),
  deleteProductComparison
);

// Add product to comparison
router.post('/:comparisonId/products', 
  requireAuth,
  validateParams(Joi.object({
    comparisonId: commonSchemas.objectId()
  })),
  validateBody(Joi.object({
    productId: commonSchemas.objectId().required()
  })),
  addProductToComparison
);

// Remove product from comparison
router.delete('/:comparisonId/products/:productId', 
  requireAuth,
  validateParams(Joi.object({
    comparisonId: commonSchemas.objectId(),
    productId: commonSchemas.objectId()
  })),
  removeProductFromComparison
);

// Get product comparison statistics
router.get('/user/stats', 
  requireAuth,
  getProductComparisonStats
);

// Clear all product comparisons
router.delete('/user/clear-all', 
  requireAuth,
  clearAllProductComparisons
);

export default router;
