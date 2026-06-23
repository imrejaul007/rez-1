import { Router } from 'express';
import {
  getHeroBannerById,
  getActiveBanners,
  getBannersForUser,
  trackBannerView,
  trackBannerClick,
  trackBannerConversion
} from '../controllers/heroBannerController';
import { optionalAuth } from '../middleware/auth';
import { validateQuery, validateParams, validate, commonSchemas } from '../middleware/validation';
import { Joi } from '../middleware/validation';

const router = Router();

// Get active hero banners
router.get('/',
  optionalAuth,
  validateQuery(Joi.object({
    page: Joi.string().valid('offers', 'home', 'category', 'product', 'all').default('offers'),
    position: Joi.string().valid('top', 'middle', 'bottom').default('top'),
    limit: Joi.number().integer().min(1).max(10).default(5)
  })),
  getActiveBanners
);

// Get banners for specific user (with targeting)
router.get('/user',
  optionalAuth,
  validateQuery(Joi.object({
    page: Joi.string().valid('offers', 'home', 'category', 'product', 'all').default('offers'),
    limit: Joi.number().integer().min(1).max(10).default(5)
  })),
  getBannersForUser
);

// Get single banner by ID
router.get('/:id',
  optionalAuth,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  getHeroBannerById
);

// Track banner view (analytics)
router.post('/:id/view',
  optionalAuth,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  validate(Joi.object({
    source: Joi.string().optional(),
    device: Joi.string().valid('mobile', 'desktop', 'tablet').optional(),
    location: Joi.object({
      type: Joi.string().valid('Point').default('Point'),
      coordinates: Joi.array().items(Joi.number()).length(2)
    }).optional()
  })),
  trackBannerView
);

// Track banner click (analytics)
router.post('/:id/click',
  optionalAuth,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  validate(Joi.object({
    source: Joi.string().optional(),
    device: Joi.string().valid('mobile', 'desktop', 'tablet').optional(),
    location: Joi.object({
      type: Joi.string().valid('Point').default('Point'),
      coordinates: Joi.array().items(Joi.number()).length(2)
    }).optional()
  })),
  trackBannerClick
);

// Track banner conversion (analytics)
router.post('/:id/conversion',
  optionalAuth,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  validate(Joi.object({
    conversionType: Joi.string().valid('purchase', 'signup', 'download', 'share', 'other').required(),
    value: Joi.number().min(0).optional(),
    source: Joi.string().optional(),
    device: Joi.string().valid('mobile', 'desktop', 'tablet').optional()
  })),
  trackBannerConversion
);

export default router;
