import express from 'express';
import {
  getPartnerDashboard,
  enrollPartner,
  getPartnerBenefits,
  getPartnerProfile,
  getPartnerEarnings,
  getPartnerMilestones,
  claimMilestoneReward,
  getPartnerTasks,
  claimTaskReward,
  updateTaskProgress,
  getJackpotProgress,
  claimJackpotReward,
  getPartnerOffers,
  claimPartnerOffer,
  getPartnerFAQs,
  getPartnerLevels,
  requestPayout,
  getPartnerStats
} from '../controllers/partnerController';
import { authenticate } from '../middleware/auth';
import {
  validateClaimMilestone,
  validateClaimTask,
  validateClaimJackpot,
  validateUpdateTaskProgress,
  validateClaimOffer,
  validateRequestPayout,
  sanitizeRequestBody
} from '../middleware/partnerValidation';
import { requireReAuth } from '../middleware/reAuth';

const router = express.Router();

// All partner routes require authentication
router.use(authenticate);

// Sanitize all request bodies
router.use(sanitizeRequestBody);

/**
 * @route   GET /api/partner/dashboard
 * @desc    Get complete partner dashboard data (profile, milestones, tasks, jackpot, offers, faqs)
 * @access  Private
 */
router.get('/dashboard', getPartnerDashboard);

/**
 * @route   POST /api/partner/enroll
 * @desc    Explicitly enroll user in partner program (requires user consent)
 * @access  Private
 */
router.post('/enroll', enrollPartner);

/**
 * @route   GET /api/partner/benefits
 * @desc    Get partner benefits for all levels
 * @access  Private
 */
router.get('/benefits', getPartnerBenefits);

/**
 * @route   GET /api/partner/profile
 * @desc    Get partner profile information
 * @access  Private
 */
router.get('/profile', getPartnerProfile);

/**
 * @route   GET /api/partner/earnings
 * @desc    Get partner earnings details and transaction history
 * @access  Private
 */
router.get('/earnings', getPartnerEarnings);

/**
 * @route   GET /api/partner/stats
 * @desc    Get partner statistics and rankings
 * @access  Private
 */
router.get('/stats', getPartnerStats);

/**
 * @route   GET /api/partner/milestones
 * @desc    Get all partner milestones
 * @access  Private
 */
router.get('/milestones', getPartnerMilestones);

/**
 * @route   POST /api/partner/milestones/:milestoneId/claim
 * @desc    Claim a milestone reward
 * @access  Private
 */
router.post('/milestones/:milestoneId/claim', validateClaimMilestone, claimMilestoneReward);

/**
 * @route   GET /api/partner/tasks
 * @desc    Get all partner reward tasks
 * @access  Private
 */
router.get('/tasks', getPartnerTasks);

/**
 * @route   POST /api/partner/tasks/:taskId/claim
 * @desc    Claim a task reward
 * @access  Private
 */
router.post('/tasks/:taskId/claim', validateClaimTask, claimTaskReward);

/**
 * @route   POST /api/partner/tasks/:taskType/update
 * @desc    Update task progress manually
 * @body    progress - Current progress value
 * @access  Private
 */
router.post('/tasks/:taskType/update', validateUpdateTaskProgress, updateTaskProgress);

/**
 * @route   GET /api/partner/jackpot
 * @desc    Get jackpot milestone progress
 * @access  Private
 */
router.get('/jackpot', getJackpotProgress);

/**
 * @route   POST /api/partner/jackpot/:spendAmount/claim
 * @desc    Claim a jackpot milestone reward
 * @access  Private
 */
router.post('/jackpot/:spendAmount/claim', validateClaimJackpot, claimJackpotReward);

/**
 * @route   GET /api/partner/offers
 * @desc    Get all claimable partner offers
 * @access  Private
 */
router.get('/offers', getPartnerOffers);

/**
 * @route   POST /api/partner/offers/claim
 * @desc    Claim a partner offer
 * @body    offerId - The offer title/ID to claim
 * @access  Private
 */
router.post('/offers/claim', validateClaimOffer, claimPartnerOffer);

/**
 * @route   GET /api/partner/faqs
 * @desc    Get partner program FAQs
 * @query   category - Optional category filter
 * @access  Private
 */
router.get('/faqs', getPartnerFAQs);

/**
 * @route   GET /api/partner/levels
 * @desc    Get all partner levels and their benefits
 * @access  Private
 */
router.get('/levels', getPartnerLevels);

/**
 * @route   POST /api/partner/payout/request
 * @desc    Request payout of partner earnings
 * @body    amount, method
 * @access  Private
 */
router.post('/payout/request', requireReAuth(), validateRequestPayout, requestPayout);

export default router;

