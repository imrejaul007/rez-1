import { Router } from 'express';
import {
  getConsolidatedEarningsSummary,
  getPartnerEarningsSummary,
  getEarningsSummary,
  getProjectStats,
  getNotifications,
  getReferralInfo,
  markNotificationAsRead,
  getEarningsHistory,
  withdrawEarnings
} from '../controllers/earningsController';
import { authenticate } from '../middleware/auth';
import { validate, validateParams, validateQuery, commonSchemas } from '../middleware/validation';
import { Joi } from '../middleware/validation';
import { requireWalletFeature, WALLET_FEATURES } from '../services/walletFeatureService';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get consolidated earnings summary (primary endpoint for My Earnings page)
router.get('/consolidated-summary',
  validateQuery(Joi.object({
    period: Joi.string().valid('7d', '30d', '90d', 'all').default('all'),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional()
  })),
  getConsolidatedEarningsSummary
);

// Get partner-specific earnings summary (for wallet Partner Earnings card)
router.get('/partner-summary',
  requireWalletFeature(WALLET_FEATURES.PARTNER_EARNINGS),
  validateQuery(Joi.object({
    period: Joi.string().valid('7d', '30d', '90d', 'all').default('all'),
  })),
  getPartnerEarningsSummary
);

// Get user's earnings summary (legacy)
router.get('/summary', getEarningsSummary);

// Get user's project statistics
router.get('/project-stats', getProjectStats);

// Get user's earning notifications
router.get('/notifications', getNotifications);

// Mark notification as read
router.patch('/notifications/:id/read', 
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  markNotificationAsRead
);

// Get user's referral information
router.get('/referral-info', getReferralInfo);

// Get user's earnings history
router.get('/history',
  validateQuery(Joi.object({
    type: Joi.string().valid('videos', 'projects', 'referrals', 'cashback', 'socialMedia', 'games', 'dailyCheckIn', 'bonus').optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional()
  })),
  getEarningsHistory
);

// Withdraw earnings (gated behind feature flag — stub endpoint, not production-ready)
router.post('/withdraw',
  requireWalletFeature(WALLET_FEATURES.PARTNER_CLAIMS),
  validate(Joi.object({
    amount: Joi.number().positive().required(),
    method: Joi.string().valid('bank', 'upi', 'wallet').default('bank'),
    accountDetails: Joi.object({
      accountNumber: Joi.string().optional(),
      ifsc: Joi.string().optional(),
      upiId: Joi.string().optional(),
      walletType: Joi.string().optional()
    }).optional()
  })),
  withdrawEarnings
);

export default router;

