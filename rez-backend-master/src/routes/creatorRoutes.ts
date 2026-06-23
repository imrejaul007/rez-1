import { Router } from 'express';
import {
  getFeaturedCreators,
  getTrendingPicks,
  getAllCreators,
  getPickDetail,
  trackPickView,
  trackPickClick,
  togglePickLike,
  togglePickBookmark,
  getCreatorById,
  getCreatorPicks,
  getCreatorStats,
  checkEligibility,
  applyAsCreator,
  getMyProfile,
  updateMyProfile,
  submitPick,
  getMyPicks,
  getMyEarnings,
  deleteMyPick,
  updateMyPick,
} from '../controllers/creatorController';
import { optionalAuth, authenticate } from '../middleware/auth';
import { validateQuery, validateParams, commonSchemas, Joi } from '../middleware/validation';
import { createRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// ============================================
// PUBLIC ROUTES (optionalAuth)
// ============================================

// Get featured creators — FOR FRONTEND "Featured Creators" SECTION
router.get('/featured',
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(20).default(6)
  })),
  getFeaturedCreators
);

// Get trending picks — FOR FRONTEND "Trending Picks" SECTION
router.get('/trending-picks',
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10),
    category: Joi.string().optional()
  })),
  getTrendingPicks
);

// Get all approved creators with search/filter/sort
router.get('/all',
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(20),
    page: Joi.number().integer().min(1).default(1),
    category: Joi.string().optional(),
    sort: Joi.string().valid('trending', 'followers', 'rating', 'newest').default('trending'),
    search: Joi.string().optional().max(100)
  })),
  getAllCreators
);

// Single pick detail
router.get('/picks/:pickId',
  optionalAuth,
  getPickDetail
);

// Track pick view
router.post('/picks/:pickId/view',
  optionalAuth,
  trackPickView
);

// Track pick click
router.post('/picks/:pickId/click',
  optionalAuth,
  trackPickClick
);

// Toggle pick like (auth required)
router.post('/picks/:pickId/like',
  authenticate,
  togglePickLike
);

// Toggle pick bookmark (auth required)
router.post('/picks/:pickId/bookmark',
  authenticate,
  togglePickBookmark
);

// ============================================
// AUTHENTICATED ROUTES
// ============================================

// Check eligibility to become a creator
router.get('/eligibility',
  authenticate,
  checkEligibility
);

// Apply as creator
router.post('/apply',
  authenticate,
  applyAsCreator
);

// Get my creator profile
router.get('/my-profile',
  authenticate,
  getMyProfile
);

// Update my creator profile
router.put('/my-profile',
  authenticate,
  updateMyProfile
);

// Submit a new pick (rate limited: 10 per hour)
router.post('/my-picks',
  authenticate,
  createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: 'Too many pick submissions. Please try again later.',
  }),
  submitPick
);

// Delete my pick
router.delete('/my-picks/:pickId',
  authenticate,
  deleteMyPick
);

// Update my pick
router.patch('/my-picks/:pickId',
  authenticate,
  updateMyPick
);

// Get my picks
router.get('/my-picks',
  authenticate,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(20),
    page: Joi.number().integer().min(1).default(1),
    status: Joi.string().valid('draft', 'pending_review', 'approved', 'rejected', 'archived').optional()
  })),
  getMyPicks
);

// Get my earnings
router.get('/my-earnings',
  authenticate,
  getMyEarnings
);

// ============================================
// PUBLIC PROFILE ROUTES (must come after /my-* and /picks/*)
// ============================================

// Get single creator by user ID
router.get('/:id',
  optionalAuth,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  getCreatorById
);

// Get creator's product picks
router.get('/:id/picks',
  optionalAuth,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10)
  })),
  getCreatorPicks
);

// Get creator's stats
router.get('/:id/stats',
  optionalAuth,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  getCreatorStats
);

export default router;
