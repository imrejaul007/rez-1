import { Router } from 'express';
import {
  getOfferCategories,
  getOfferCategoryBySlug,
  getOffersByCategorySlug,
  getFeaturedCategories,
  getParentCategories,
  getSubcategories
} from '../controllers/offerCategoryController';
import { optionalAuth } from '../middleware/auth';
import { validateQuery, validateParams, commonSchemas } from '../middleware/validation';
import { Joi } from '../middleware/validation';

const router = Router();

// Get all active offer categories
router.get('/',
  optionalAuth,
  validateQuery(Joi.object({
    featured: Joi.boolean(),
    parent: Joi.boolean()
  })),
  getOfferCategories
);

// Get featured categories
router.get('/featured',
  optionalAuth,
  getFeaturedCategories
);

// Get parent categories only
router.get('/parents',
  optionalAuth,
  getParentCategories
);

// Get category by slug
router.get('/:slug',
  optionalAuth,
  validateParams(Joi.object({
    slug: Joi.string().required()
  })),
  getOfferCategoryBySlug
);

// Get subcategories of a parent category
router.get('/:parentId/subcategories',
  optionalAuth,
  validateParams(Joi.object({
    parentId: commonSchemas.objectId().required()
  })),
  getSubcategories
);

// Get offers by category slug
router.get('/:slug/offers',
  optionalAuth,
  validateParams(Joi.object({
    slug: Joi.string().required()
  })),
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    sortBy: Joi.string().valid('cashback', 'createdAt', 'distance').default('createdAt'),
    order: Joi.string().valid('asc', 'desc').default('desc'),
    lat: Joi.number().min(-90).max(90),
    lng: Joi.number().min(-180).max(180)
  })),
  getOffersByCategorySlug
);

export default router;
