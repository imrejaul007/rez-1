import { Router } from 'express';
import {
  getHeroBannerById,
  getActiveBanners,
  getBannersForUser,
  trackBannerView,
  trackBannerClick,
  trackBannerConversion,
  // Admin CRUD
  createHeroBanner,
  updateHeroBanner,
  deleteHeroBanner,
  toggleHeroBannerActive,
  getAllHeroBanners
} from '../controllers/heroBannerController';
import { optionalAuth, authenticate, requireAdmin } from '../middleware/auth';
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

// ============================================
// ADMIN ROUTES
// ============================================

// Validation schemas for admin operations
const heroBannerSchema = Joi.object({
  title: Joi.string().max(100).required(),
  subtitle: Joi.string().max(200).allow('', null).optional(),
  description: Joi.string().max(500).allow('', null).optional(),
  image: Joi.string().uri().required(),
  ctaText: Joi.string().max(50).required(),
  ctaAction: Joi.string().valid('navigate', 'external_link', 'modal', 'download', 'share').required(),
  ctaUrl: Joi.string().allow('', null).optional(),
  backgroundColor: Joi.string().pattern(/^#[0-9A-F]{6}$/i).required(),
  textColor: Joi.string().pattern(/^#[0-9A-F]{6}$/i).allow('', null).optional(),
  isActive: Joi.boolean().default(true),
  priority: Joi.number().integer().min(0).default(0),
  validFrom: Joi.date().required(),
  validUntil: Joi.date().required(),
  targetAudience: Joi.object({
    userTypes: Joi.array().items(Joi.string().valid('student', 'new_user', 'premium', 'all')).optional(),
    ageRange: Joi.object({
      min: Joi.number().min(0).max(120).optional(),
      max: Joi.number().min(0).max(120).optional()
    }).optional(),
    locations: Joi.array().items(Joi.string()).optional(),
    categories: Joi.array().items(Joi.string()).optional()
  }).optional(),
  metadata: Joi.object({
    page: Joi.string().valid('offers', 'home', 'category', 'product', 'all').default('all'),
    position: Joi.string().valid('top', 'middle', 'bottom').default('top'),
    size: Joi.string().valid('small', 'medium', 'large', 'full').default('medium'),
    animation: Joi.string().valid('fade', 'slide', 'bounce', 'pulse', 'none').default('fade'),
    tags: Joi.array().items(Joi.string()).default([]),
    colors: Joi.array().items(Joi.string()).optional(),
    shareBonus: Joi.number().min(0).default(50)
  }).optional()
});

const updateBannerSchema = heroBannerSchema.fork(
  ['title', 'image', 'ctaText', 'ctaAction', 'backgroundColor', 'validFrom', 'validUntil'],
  (schema) => schema.optional()
);

// All admin routes require authentication and admin role
router.use(authenticate, requireAdmin);

// GET /admin/all — list all banners (including inactive/expired)
router.get('/admin/all',
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    isActive: Joi.boolean().optional(),
    search: Joi.string().optional(),
    pageType: Joi.string().valid('offers', 'home', 'category', 'product', 'all').optional()
  })),
  getAllHeroBanners
);

// POST /admin/create — create a new banner
router.post('/admin/create',
  validate(heroBannerSchema),
  createHeroBanner
);

// PUT /admin/:id — update a banner
router.put('/admin/:id',
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  validate(updateBannerSchema),
  updateHeroBanner
);

// DELETE /admin/:id — delete a banner
router.delete('/admin/:id',
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  deleteHeroBanner
);

// PATCH /admin/:id/toggle — toggle isActive status
router.patch('/admin/:id/toggle',
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  toggleHeroBannerActive
);

export default router;
