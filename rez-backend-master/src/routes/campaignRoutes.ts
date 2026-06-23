import { Router } from 'express';
import {
  getActiveCampaigns,
  getCampaignsByType,
  getCampaignById,
  getAllCampaigns,
  getExcitingDeals,
  trackDealInteraction,
  redeemDeal,
  verifyDealPayment,
  getUserRedemptions,
  getRedemptionByCode,
  useRedemption,
  cancelRedemption,
} from '../controllers/campaignController';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { validateQuery, validateParams, validateBody, Joi } from '../middleware/validation';
import { createRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Rate limiter for deal redemption (5 per minute per user)
const redeemLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 5,
  message: 'Too many redemption attempts. Please try again later.',
});

// ============================================================================
// STATIC ROUTES (Must come BEFORE dynamic /:campaignId routes)
// ============================================================================

/**
 * @route   GET /api/campaigns
 * @desc    Get all campaigns with pagination
 * @access  Public
 */
router.get('/',
  optionalAuth,
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    active: Joi.string().valid('true', 'false').default('true'),
  })),
  getAllCampaigns
);

/**
 * @route   GET /api/campaigns/active
 * @desc    Get all active campaigns
 * @access  Public
 */
router.get('/active',
  optionalAuth,
  validateQuery(Joi.object({
    type: Joi.string().valid('cashback', 'coins', 'bank', 'bill', 'drop', 'new-user', 'flash', 'general'),
    limit: Joi.number().integer().min(1).max(50).default(10),
  })),
  getActiveCampaigns
);

/**
 * @route   GET /api/campaigns/exciting-deals
 * @desc    Get campaigns formatted for exciting deals section
 * @access  Public
 */
router.get('/exciting-deals',
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(20).default(6),
  })),
  getExcitingDeals
);

/**
 * @route   GET /api/campaigns/type/:type
 * @desc    Get campaigns by type
 * @access  Public
 */
router.get('/type/:type',
  optionalAuth,
  validateParams(Joi.object({
    type: Joi.string().valid('cashback', 'coins', 'bank', 'bill', 'drop', 'new-user', 'flash', 'general').required(),
  })),
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10),
  })),
  getCampaignsByType
);

/**
 * @route   GET /api/campaigns/my-redemptions
 * @desc    Get user's redeemed deals
 * @access  Private
 */
router.get('/my-redemptions',
  requireAuth,
  validateQuery(Joi.object({
    status: Joi.string().valid('active', 'used', 'expired', 'cancelled', 'pending'),
    limit: Joi.number().integer().min(1).max(50).default(20),
    page: Joi.number().integer().min(1).default(1),
  })),
  getUserRedemptions
);

/**
 * @route   POST /api/campaigns/deals/track
 * @desc    Track deal interaction (view, redeem, like, share)
 * @access  Public (optional auth)
 */
router.post('/deals/track',
  optionalAuth,
  trackDealInteraction
);

/**
 * @route   POST /api/campaigns/deals/verify-payment
 * @desc    Verify Stripe payment for paid deal purchase
 * @access  Private
 */
router.post('/deals/verify-payment',
  requireAuth,
  validateBody(Joi.object({
    sessionId: Joi.string().required(),
    redemptionId: Joi.string(),
  })),
  verifyDealPayment
);

/**
 * @route   GET /api/campaigns/redemptions/:code
 * @desc    Get redemption by code
 * @access  Private
 */
router.get('/redemptions/:code',
  requireAuth,
  validateParams(Joi.object({
    code: Joi.string().required(),
  })),
  getRedemptionByCode
);

/**
 * @route   POST /api/campaigns/redemptions/:code/use
 * @desc    Mark redemption as used (after order completion)
 * @access  Private
 */
router.post('/redemptions/:code/use',
  requireAuth,
  validateParams(Joi.object({
    code: Joi.string().required(),
  })),
  validateBody(Joi.object({
    orderId: Joi.string(),
    benefitApplied: Joi.number(),
  })),
  useRedemption
);

/**
 * @route   DELETE /api/campaigns/redemptions/:id
 * @desc    Cancel a pending/free redemption
 * @access  Private
 */
router.delete('/redemptions/:id',
  requireAuth,
  validateParams(Joi.object({
    id: Joi.string().required(),
  })),
  cancelRedemption
);

// ============================================================================
// DYNAMIC ROUTES (Must come AFTER static routes)
// ============================================================================

/**
 * @route   POST /api/campaigns/:campaignId/deals/:dealIndex/redeem
 * @desc    Redeem a deal (free) or initiate payment (paid)
 * @access  Private
 */
router.post('/:campaignId/deals/:dealIndex/redeem',
  requireAuth,
  redeemLimiter,
  validateParams(Joi.object({
    campaignId: Joi.string().required(),
    dealIndex: Joi.string().pattern(/^\d+$/).required(), // Express params are always strings
  })),
  validateBody(Joi.object({
    successUrl: Joi.string().uri(),
    cancelUrl: Joi.string().uri(),
  })),
  redeemDeal
);

/**
 * @route   GET /api/campaigns/:campaignId
 * @desc    Get single campaign by ID or slug
 * @access  Public
 * NOTE: This MUST be the LAST route as it catches all /:campaignId patterns
 */
router.get('/:campaignId',
  optionalAuth,
  validateParams(Joi.object({
    campaignId: Joi.string().required(),
  })),
  getCampaignById
);

export default router;
