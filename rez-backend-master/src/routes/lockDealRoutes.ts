/**
 * Lock Price Deal Routes
 *
 * All routes for the lock-price deal system.
 * Base path: /api/lock-deals
 */

import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { validateQuery, validateParams, validateBody, Joi } from '../middleware/validation';
import { createRateLimiter } from '../middleware/rateLimiter';
import {
  getLockDeals,
  getLockDealById,
  initiateLock,
  confirmLock,
  initiateBalancePayment,
  confirmBalancePayment,
  verifyPickup,
  getMyLocks,
  getMyLockDetail,
  cancelLock,
  processExpiredLocks,
} from '../controllers/lockDealController';

const router = Router();

// Rate limiters for lock operations
const lockLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: 'Too many lock attempts. Please try again later.',
});

const cancelLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 5,
  message: 'Too many cancel attempts. Please try again later.',
});

const pickupLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Too many pickup verification attempts.',
});

// ==================== STATIC ROUTES (before :id) ====================

// User's locked deals
router.get('/my-locks',
  requireAuth,
  validateQuery(Joi.object({
    status: Joi.string().custom((value, helpers) => {
      const validStatuses = ['locked', 'paid_balance', 'picked_up', 'expired', 'refunded', 'cancelled'];
      const statuses = value.split(',').map((s: string) => s.trim());
      for (const s of statuses) {
        if (!validStatuses.includes(s)) {
          return helpers.error('any.invalid');
        }
      }
      return value;
    }, 'comma-separated statuses'),
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(50),
  })),
  getMyLocks
);

// User's single lock detail
router.get('/my-locks/:lockId',
  requireAuth,
  validateParams(Joi.object({
    lockId: Joi.string().required(),
  })),
  getMyLockDetail
);

// Pickup verification by code (merchant action)
router.post('/verify-pickup/:code',
  requireAuth,
  pickupLimiter,
  validateParams(Joi.object({
    code: Joi.string().required(),
  })),
  validateBody(Joi.object({
    merchantNotes: Joi.string().max(500),
  })),
  verifyPickup
);

// Admin: Process expired locks (cron endpoint)
router.post('/process-expired',
  requireAuth, // Should be requireAdmin in production
  processExpiredLocks
);

// ==================== DYNAMIC ROUTES ====================

// Browse lock deals (public)
router.get('/',
  optionalAuth,
  validateQuery(Joi.object({
    region: Joi.string().valid('bangalore', 'dubai', 'all'),
    category: Joi.string(),
    storeId: Joi.string(),
    featured: Joi.string().valid('true', 'false'),
    tag: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())),
    search: Joi.string().max(100),
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(50),
  })),
  getLockDeals
);

// Get single deal detail
router.get('/:id',
  optionalAuth,
  validateParams(Joi.object({
    id: Joi.string().required(),
  })),
  getLockDealById
);

// Initiate lock (pay deposit)
router.post('/:id/lock',
  requireAuth,
  lockLimiter,
  validateParams(Joi.object({
    id: Joi.string().required(),
  })),
  initiateLock
);

// Confirm lock after deposit payment
router.post('/:id/confirm-lock',
  requireAuth,
  validateParams(Joi.object({
    id: Joi.string().required(),
  })),
  validateBody(Joi.object({
    paymentIntentId: Joi.string().required(),
  })),
  confirmLock
);

// Initiate balance payment
router.post('/:lockId/pay-balance',
  requireAuth,
  lockLimiter,
  validateParams(Joi.object({
    lockId: Joi.string().required(),
  })),
  initiateBalancePayment
);

// Confirm balance payment
router.post('/:lockId/confirm-balance',
  requireAuth,
  validateParams(Joi.object({
    lockId: Joi.string().required(),
  })),
  validateBody(Joi.object({
    paymentIntentId: Joi.string().required(),
  })),
  confirmBalancePayment
);

// Cancel a lock
router.post('/:lockId/cancel',
  requireAuth,
  cancelLimiter,
  validateParams(Joi.object({
    lockId: Joi.string().required(),
  })),
  validateBody(Joi.object({
    reason: Joi.string().max(500),
  })),
  cancelLock
);

export default router;
