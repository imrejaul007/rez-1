import { logger } from '../config/logger';
import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../utils/asyncHandler';
import {
  getUserLoyalty,
  checkIn,
  completeMission,
  getCoinBalance,
  syncBrandLoyalty,
  getHomepageLoyaltySummary
} from '../controllers/loyaltyController';
import {
  getPointBalance,
  getRewardsCatalog,
  getTierInfo,
  getRedemptionHistory,
  getChallenges,
  dailyCheckInGame,
  getCheckInStatus,
  getExpiringPoints,
  claimChallengeReward,
  getPointHistory,
  redeemReward,
} from '../controllers/loyaltyRedemptionController';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validateParams } from '../middleware/validation';
import { Joi } from '../middleware/validation';
import LoyaltyMilestone from '../models/LoyaltyMilestone';

// Rate limiters for abuse prevention
const checkInLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // max 5 check-in attempts per minute per user
  keyGenerator: (req: Request) => (req as any).user?.id || req.ip || 'unknown',
  message: { success: false, error: 'Too many check-in attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
});

const missionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10, // max 10 mission completion attempts per minute
  keyGenerator: (req: Request) => (req as any).user?.id || req.ip || 'unknown',
  message: { success: false, error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
});

const router = Router();

// Get all active loyalty milestones (public)
router.get('/milestones', asyncHandler(async (req: Request, res: Response) => {
    const milestones = await LoyaltyMilestone.find({ isActive: true })
      .sort({ order: 1 })
      .lean();

    res.json({
      success: true,
      data: milestones,
      message: 'Loyalty milestones retrieved successfully',
    });
}));

// Homepage summary - uses optional auth (works for both logged in and anonymous users)
router.get('/homepage-summary', optionalAuth, getHomepageLoyaltySummary);

// All other loyalty routes require authentication
router.use(authenticate);

// Get user's loyalty data
router.get('/', getUserLoyalty);

// Daily check-in (rate limited to prevent abuse)
router.post('/checkin', checkInLimiter, checkIn);

// Complete mission (rate limited)
router.post('/missions/:missionId/complete',
  missionLimiter,
  validateParams(Joi.object({
    missionId: Joi.string().required()
  })),
  completeMission
);

// Get coin balance
router.get('/coins', getCoinBalance);

// Sync brand loyalty from order history
router.post('/sync-brands', syncBrandLoyalty);

// --- Loyalty Redemption Endpoints ---

// Get point balance with tier info
router.get('/points/balance', getPointBalance);

// Get rewards catalog (milestones as rewards)
router.get('/catalog', getRewardsCatalog);

// Get tier information
router.get('/tier', getTierInfo);

// Get redemption history (paginated)
router.get('/redemptions', getRedemptionHistory);

// Get active challenges with user progress
router.get('/challenges', getChallenges);

// Daily check-in game
router.post('/games/check-in', checkInLimiter, dailyCheckInGame);

// Get check-in status (7-day calendar + streak)
router.get('/games/check-in/status', getCheckInStatus);

// Get expiring points
router.get('/points/expiring', getExpiringPoints);

// Claim challenge reward
router.post('/challenges/:challengeId/claim',
  validateParams(Joi.object({
    challengeId: Joi.string().required()
  })),
  claimChallengeReward
);

// Point transaction history (paginated)
router.get('/points/history', getPointHistory);

// Redeem a reward
router.post('/redeem', redeemReward);

export default router;
