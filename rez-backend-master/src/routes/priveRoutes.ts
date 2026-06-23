import { logger } from '../config/logger';
/**
 * Privé Routes
 *
 * API endpoints for Privé eligibility, offers, check-in, and dashboard
 */

import { Router } from 'express';
import {
  getPriveEligibility,
  getPillarBreakdown,
  refreshEligibility,
  getReputationHistory,
  getImprovementTips,
  dailyCheckIn,
  getHabitLoops,
  getPriveDashboard,
  getPriveOffers,
  getPriveOfferById,
  getPriveHighlights,
  trackOfferClick,
  getEarnings,
  getTransactions,
  redeemCoins,
  getVouchers,
  getVoucherById,
  markVoucherUsed,
  getRedeemConfig,
  getCatalog,
  getPublicProgramConfig,
  getTierComparison,
} from '../controllers/priveController';
import {
  getMissions,
  getActiveMissions,
  claimMission,
  completeMission,
  getCompletedMissions,
} from '../controllers/priveMissionController';
import {
  createTicket as createConciergeTicket,
  getTickets as getConciergeTickets,
  getTicketById as getConciergeTicketById,
  addMessage as addConciergeMessage,
} from '../controllers/priveConciergeController';
import { priveNextBestActionService } from '../services/priveNextBestActionService';
import { priveNotificationService } from '../services/priveNotificationService';
import { priveAnalyticsService } from '../services/priveAnalyticsService';
import priveAccessService from '../services/priveAccessService';
import {
  getSmartSpendCatalog,
  getSmartSpendItem,
  trackSmartSpendClick,
} from '../controllers/smartSpendController';
import { getPriveReviewDashboard } from '../controllers/priveReviewController';
import { authenticate } from '../middleware/auth';
import { strictLimiter, generalLimiter } from '../middleware/rateLimiter';
import { requireReAuthForRedemption } from '../middleware/reAuth';
import { getCachedWalletConfig } from '../services/walletCacheService';
import { asyncHandler } from '../utils/asyncHandler';
import { validate } from '../middleware/validation';
import { redeemCoinsSchema } from '../validators/financialValidators';

/**
 * Middleware factory: checks that a feature flag is enabled in WalletConfig
 */
const requireFeatureFlag = (flagName: string) => async (req: any, res: any, next: any) => {
  try {
    const config = await getCachedWalletConfig();
    const flags = config?.priveProgramConfig?.featureFlags as Record<string, boolean> | undefined;
    if (flags && flags[flagName] === false) {
      return res.status(403).json({ success: false, error: 'This feature is currently disabled' });
    }
    next();
  } catch {
    next(); // fail open on config fetch error
  }
};

const router = Router();

// All routes require authentication
router.use(authenticate);

// ==========================================
// Program Config (Public)
// ==========================================
router.get('/program-config/public', generalLimiter, getPublicProgramConfig);
router.get('/tier-comparison', generalLimiter, getTierComparison);

// ==========================================
// Next Best Actions
// ==========================================

router.get('/next-actions', generalLimiter, asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });
    const result = await priveNextBestActionService.getNextActions(userId);
    res.json({ success: true, data: result });
}));

// ==========================================
// Missions
// ==========================================

router.get('/missions', generalLimiter, requireFeatureFlag('missionsEnabled'), getMissions);
router.get('/missions/active', generalLimiter, requireFeatureFlag('missionsEnabled'), getActiveMissions);
router.get('/missions/completed', generalLimiter, requireFeatureFlag('missionsEnabled'), getCompletedMissions);
router.post('/missions/:id/claim', strictLimiter, requireFeatureFlag('missionsEnabled'), claimMission);
router.post('/missions/:id/complete', strictLimiter, requireFeatureFlag('missionsEnabled'), completeMission);

// ==========================================
// Concierge Support
// ==========================================

router.post('/concierge/tickets', strictLimiter, requireFeatureFlag('conciergeEnabled'), createConciergeTicket);
router.get('/concierge/tickets', generalLimiter, requireFeatureFlag('conciergeEnabled'), getConciergeTickets);
router.get('/concierge/tickets/:id', generalLimiter, requireFeatureFlag('conciergeEnabled'), getConciergeTicketById);
router.post('/concierge/tickets/:id/message', strictLimiter, requireFeatureFlag('conciergeEnabled'), addConciergeMessage);

// ==========================================
// Eligibility & Reputation
// ==========================================

/**
 * @route   GET /api/prive/eligibility
 * @desc    Get user's Privé eligibility status
 * @access  Private
 */
router.get('/eligibility', generalLimiter, getPriveEligibility);

/**
 * @route   GET /api/prive/pillars
 * @desc    Get detailed pillar breakdown with factors
 * @access  Private
 */
router.get('/pillars', generalLimiter, getPillarBreakdown);

/**
 * @route   POST /api/prive/refresh
 * @desc    Force recalculation of reputation score
 * @access  Private
 */
router.post('/refresh', strictLimiter, refreshEligibility);

/**
 * @route   GET /api/prive/history
 * @desc    Get reputation score history
 * @access  Private
 */
router.get('/history', generalLimiter, getReputationHistory);

/**
 * @route   GET /api/prive/tips
 * @desc    Get personalized tips to improve eligibility
 * @access  Private
 */
router.get('/tips', generalLimiter, getImprovementTips);

// ==========================================
// Daily Check-in & Habits
// ==========================================

/**
 * @route   POST /api/prive/check-in
 * @desc    Daily check-in with streak tracking
 * @access  Private
 */
router.post('/check-in', requireFeatureFlag('dailyCheckinEnabled'), strictLimiter, dailyCheckIn);

/**
 * @route   GET /api/prive/habit-loops
 * @desc    Get daily habit loops with progress
 * @access  Private
 */
router.get('/habit-loops', generalLimiter, getHabitLoops);

// ==========================================
// Dashboard
// ==========================================

/**
 * @route   GET /api/prive/dashboard
 * @desc    Get combined dashboard data (eligibility, coins, offers, etc.)
 * @access  Private
 */
router.get('/dashboard', generalLimiter, getPriveDashboard);

/**
 * @route   GET /api/prive/review-dashboard
 * @desc    Get aggregated review dashboard data for Privé Review & Earn
 * @access  Private
 */
router.get('/review-dashboard', generalLimiter, getPriveReviewDashboard);

// ==========================================
// Offers
// ==========================================

/**
 * @route   GET /api/prive/offers
 * @desc    Get Privé exclusive offers
 * @access  Private
 */
router.get('/offers', getPriveOffers);

/**
 * @route   GET /api/prive/offers/:id
 * @desc    Get single Privé offer by ID
 * @access  Private
 */
router.get('/offers/:id', getPriveOfferById);

/**
 * @route   POST /api/prive/offers/:id/click
 * @desc    Track offer click for analytics
 * @access  Private
 */
router.post('/offers/:id/click', trackOfferClick);

// ==========================================
// Highlights
// ==========================================

/**
 * @route   GET /api/prive/highlights
 * @desc    Get today's personalized highlights
 * @access  Private
 */
router.get('/highlights', getPriveHighlights);

// ==========================================
// Earnings & Transactions
// ==========================================

/**
 * @route   GET /api/prive/earnings
 * @desc    Get user's coin earning history
 * @access  Private
 */
router.get('/earnings', getEarnings);

/**
 * @route   GET /api/prive/transactions
 * @desc    Get user's coin transaction history
 * @access  Private
 */
router.get('/transactions', getTransactions);

// ==========================================
// Redemption Config & Catalog
// ==========================================

/**
 * @route   GET /api/prive/redeem-config
 * @desc    Get server-side redemption configuration
 * @access  Private
 */
router.get('/redeem-config', getRedeemConfig);

/**
 * @route   GET /api/prive/catalog
 * @desc    Get server-side redemption catalog
 * @access  Private
 */
router.get('/catalog', getCatalog);

// ==========================================
// Redemption & Vouchers
// ==========================================

/**
 * @route   POST /api/prive/redeem
 * @desc    Redeem coins for a voucher
 * @access  Private
 */
router.post('/redeem', strictLimiter, requireReAuthForRedemption(), validate(redeemCoinsSchema), redeemCoins);

/**
 * @route   GET /api/prive/vouchers
 * @desc    Get user's voucher history
 * @access  Private
 */
router.get('/vouchers', getVouchers);

/**
 * @route   GET /api/prive/vouchers/:id
 * @desc    Get single voucher details
 * @access  Private
 */
router.get('/vouchers/:id', getVoucherById);

/**
 * @route   POST /api/prive/vouchers/:id/use
 * @desc    Mark a voucher as used
 * @access  Private
 */
router.post('/vouchers/:id/use', strictLimiter, markVoucherUsed);

// ==========================================
// Smart Spend Marketplace
// ==========================================

/**
 * @route   GET /api/prive/smart-spend
 * @desc    Get curated Smart Spend catalog
 * @access  Private
 */
router.get('/smart-spend', generalLimiter, requireFeatureFlag('smartSpendEnabled'), getSmartSpendCatalog);

/**
 * @route   GET /api/prive/smart-spend/:id
 * @desc    Get single Smart Spend item detail
 * @access  Private
 */
router.get('/smart-spend/:id', requireFeatureFlag('smartSpendEnabled'), getSmartSpendItem);

/**
 * @route   POST /api/prive/smart-spend/:id/click
 * @desc    Track Smart Spend item click for analytics
 * @access  Private
 */
router.post('/smart-spend/:id/click', requireFeatureFlag('smartSpendEnabled'), trackSmartSpendClick);

// ==========================================
// Notifications & Analytics
// ==========================================

router.get('/notifications', generalLimiter, asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });
    const accessCheck = await priveAccessService.checkAccess(userId);
    const tier = accessCheck.effectiveTier || 'none';
    const result = await priveNotificationService.getNotifications(userId, tier);
    res.json({ success: true, data: result });
}));

router.get('/analytics', generalLimiter, asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });
    const period = Math.min(90, Math.max(7, Number(req.query.period) || 30));
    const result = await priveAnalyticsService.getAnalytics(userId, period);
    res.json({ success: true, data: result });
}));

export default router;
