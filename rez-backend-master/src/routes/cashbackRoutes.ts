import { Router } from 'express';
import {
  getCashbackSummary,
  getCashbackHistory,
  getPendingCashback,
  getExpiringSoon,
  redeemCashback,
  getCashbackCampaigns,
  forecastCashback,
  getCashbackStatistics,
} from '../controllers/cashbackController';
import {
  getDoubleCashbackCampaigns,
  getCoinDrops,
  getUploadBillStores,
  getSuperCashbackStores,
} from '../controllers/offersPageController';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validateQuery, validate, commonSchemas } from '../middleware/validation';
import { Joi } from '../middleware/validation';

const router = Router();

// Get cashback summary
router.get('/summary',
  authenticate,
  getCashbackSummary
);

// Get cashback history
router.get('/history',
  authenticate,
  validateQuery(Joi.object({
    status: Joi.string().valid('pending', 'credited', 'expired', 'cancelled'),
    source: Joi.string().valid('order', 'referral', 'promotion', 'special_offer', 'bonus', 'signup'),
    dateFrom: Joi.date().iso(),
    dateTo: Joi.date().iso(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  })),
  getCashbackHistory
);

// Get pending cashback (ready for redemption)
router.get('/pending',
  authenticate,
  getPendingCashback
);

// Get expiring soon cashback
router.get('/expiring-soon',
  authenticate,
  validateQuery(Joi.object({
    days: Joi.number().integer().min(1).max(30).default(7),
  })),
  getExpiringSoon
);

// Redeem pending cashback
router.post('/redeem',
  authenticate,
  redeemCashback
);

// Get active cashback campaigns
router.get('/campaigns',
  optionalAuth,
  getCashbackCampaigns
);

// Forecast cashback for cart
router.post('/forecast',
  optionalAuth,
  validate(Joi.object({
    cartData: Joi.object({
      items: Joi.array().items(Joi.object({
        product: Joi.object().required(),
        quantity: Joi.number().integer().min(1).required(),
        price: Joi.number().min(0).required(),
      })).min(1).required(),
      subtotal: Joi.number().min(0).required(),
    }).required(),
  })),
  forecastCashback
);

// Get cashback statistics
router.get('/statistics',
  authenticate,
  validateQuery(Joi.object({
    period: Joi.string().valid('day', 'week', 'month', 'year').default('month'),
  })),
  getCashbackStatistics
);

// =====================
// NEW OFFERS PAGE ROUTES
// =====================

// Get double cashback campaigns
router.get('/double-campaigns',
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10),
  })),
  getDoubleCashbackCampaigns
);

// Get coin drops (boosted cashback events)
router.get('/coin-drops',
  optionalAuth,
  validateQuery(Joi.object({
    category: Joi.string(),
    limit: Joi.number().integer().min(1).max(50).default(20),
  })),
  getCoinDrops
);

// Get upload bill stores
router.get('/upload-bill-stores',
  optionalAuth,
  validateQuery(Joi.object({
    category: Joi.string(),
    limit: Joi.number().integer().min(1).max(50).default(20),
  })),
  getUploadBillStores
);

// Get super cashback stores (stores with 10%+ cashback)
router.get('/super-cashback-stores',
  optionalAuth,
  validateQuery(Joi.object({
    minCashback: Joi.number().integer().min(1).max(100).default(10),
    limit: Joi.number().integer().min(1).max(50).default(20),
  })),
  getSuperCashbackStores
);

export default router;
