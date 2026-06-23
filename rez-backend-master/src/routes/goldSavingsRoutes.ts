import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validate, validateQuery } from '../middleware/validation';
import { Joi } from '../middleware/validation';
import { createRateLimiter } from '../middleware/rateLimiter';
import {
  getCurrentPrice,
  getHolding,
  buyGold,
  sellGold,
  getTransactions,
  setGoldPrice,
} from '../controllers/goldSavingsController';

const router = Router();

// Rate limiter for buy/sell (10 per minute per user)
const tradeLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Too many gold trade attempts. Please try again later.',
});

// --- Public ---
router.get('/price', getCurrentPrice);

// --- Authenticated ---
router.get('/holding', authenticate, getHolding);

router.get(
  '/transactions',
  authenticate,
  validateQuery(
    Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(10),
    })
  ),
  getTransactions
);

router.post(
  '/buy',
  authenticate,
  tradeLimiter,
  validate(
    Joi.object({
      amount: Joi.number().positive().required().messages({
        'number.positive': 'Amount must be greater than 0',
        'any.required': 'Amount is required',
      }),
      idempotencyKey: Joi.string().required().max(128).messages({
        'any.required': 'idempotencyKey is required',
      }),
    })
  ),
  buyGold
);

router.post(
  '/sell',
  authenticate,
  tradeLimiter,
  validate(
    Joi.object({
      grams: Joi.number().positive().required().messages({
        'number.positive': 'Grams must be greater than 0',
        'any.required': 'Grams is required',
      }),
      idempotencyKey: Joi.string().required().max(128).messages({
        'any.required': 'idempotencyKey is required',
      }),
    })
  ),
  sellGold
);

export default router;
