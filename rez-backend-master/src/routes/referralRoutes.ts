// Referral Routes
// Routes for referral program endpoints

import express from 'express';
import {
  getReferralData,
  getReferralHistory,
  getReferralStatistics,
  generateReferralLink,
  shareReferralLink,
  claimReferralRewards,
  getReferralLeaderboard,
  getReferralCode,
  getReferralStats
} from '../controllers/referralController';
import {
  applyCode,
  checkUpgrade,
  getTier,
  getRewards,
  claimReward,
  generateQR,
  getMilestones,
  validateCode,
  getAnalytics,
} from '../controllers/referralTierController';
import { authenticate } from '../middleware/auth';
import { referralLimiter, referralShareLimiter } from '../middleware/rateLimiter';
import { validate, Joi } from '../middleware/validation';

const router = express.Router();

// All referral routes require authentication
router.use(authenticate);

// ✅ Apply rate limiting to all referral routes to prevent abuse
router.use(referralLimiter);

/**
 * @route   GET /api/referral/data
 * @desc    Get referral data
 * @access  Private
 */
router.get('/data', getReferralData);

/**
 * @route   GET /api/referral/history
 * @desc    Get referral history
 * @access  Private
 */
router.get('/history', getReferralHistory);

/**
 * @route   GET /api/referral/statistics
 * @desc    Get referral statistics
 * @access  Private
 */
router.get('/statistics', getReferralStatistics);

/**
 * @route   POST /api/referral/generate-link
 * @desc    Generate referral link
 * @access  Private
 */
router.post('/generate-link', generateReferralLink);

/**
 * @route   POST /api/referral/share
 * @desc    Share referral link
 * @access  Private
 * @note    Additional strict rate limiting to prevent spam
 */
router.post('/share', referralShareLimiter, shareReferralLink);

/**
 * @route   POST /api/referral/claim-rewards
 * @desc    Claim referral rewards
 * @access  Private
 */
router.post('/claim-rewards', claimReferralRewards);

/**
 * @route   GET /api/referral/leaderboard
 * @desc    Get referral leaderboard
 * @access  Private
 */
router.get('/leaderboard', getReferralLeaderboard);

/**
 * @route   GET /api/referral/code
 * @desc    Get user's referral code
 * @access  Private
 */
router.get('/code', getReferralCode);

/**
 * @route   GET /api/referral/stats
 * @desc    Get user's referral statistics
 * @access  Private
 */
router.get('/stats', getReferralStats);

/**
 * @route   GET /api/referral/tier
 * @desc    Get current tier and progress
 * @access  Private
 */
router.get('/tier', getTier);

/**
 * @route   GET /api/referral/rewards
 * @desc    Get claimable and claimed rewards
 * @access  Private
 */
router.get('/rewards', getRewards);

/**
 * @route   POST /api/referral/claim-reward
 * @desc    Claim a specific reward
 * @access  Private
 */
router.post('/claim-reward', claimReward);

/**
 * @route   POST /api/referral/generate-qr
 * @desc    Generate QR code for referral
 * @access  Private
 */
router.post('/generate-qr', generateQR);

/**
 * @route   GET /api/referral/milestones
 * @desc    Get milestone progress
 * @access  Private
 */
router.get('/milestones', getMilestones);

/**
 * @route   POST /api/referral/validate-code
 * @desc    Validate referral code (used during signup)
 * @access  Private
 */
router.post('/validate-code', validateCode);

/**
 * @route   GET /api/referral/analytics
 * @desc    Get referral analytics
 * @access  Private
 */
router.get('/analytics', getAnalytics);

/**
 * @route   POST /api/referral/apply-code
 * @desc    Apply referral code during registration
 * @access  Private
 */
router.post(
  '/apply-code',
  validate(Joi.object({
    code: Joi.string().trim().uppercase().min(4).max(20).required(),
    metadata: Joi.object().optional(),
  })),
  applyCode
);

/**
 * @route   GET /api/referral/check-upgrade
 * @desc    Check if user qualifies for tier upgrade
 * @access  Private
 */
router.get('/check-upgrade', checkUpgrade);

export default router;
