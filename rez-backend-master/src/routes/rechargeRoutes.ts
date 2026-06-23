import { Router } from 'express';
import Joi from 'joi';
import { requireAuth } from '../middleware/auth';
import { createRateLimiter } from '../middleware/rateLimiter';
import { validateQuery, validateParams, validateBody } from '../middleware/validation';
import {
  getOperators,
  getPlans,
  initiateRecharge,
} from '../controllers/rechargeController';

const router = Router();

// Rate limiter for recharge initiation (5 per minute per user)
const rechargeLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 5,
  message: 'Too many recharge attempts. Please try again later.',
});

// GET /operators?type=mobile&page=1&limit=10
router.get(
  '/operators',
  validateQuery(
    Joi.object({
      type: Joi.string().valid('mobile', 'dth', 'broadband').default('mobile'),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(10),
    })
  ),
  getOperators
);

// GET /operators/:code/plans?sort=amount&page=1&limit=10
router.get(
  '/operators/:code/plans',
  validateParams(
    Joi.object({
      code: Joi.string().alphanum().min(1).max(30).required(),
    })
  ),
  validateQuery(
    Joi.object({
      sort: Joi.string().valid('amount', '-amount', 'popularity', '-popularity').default('amount'),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(10),
    })
  ),
  getPlans
);

// POST / — Initiate recharge (requires auth)
router.post(
  '/',
  requireAuth,
  rechargeLimiter,
  validateBody(
    Joi.object({
      operatorCode: Joi.string().alphanum().min(1).max(30).required(),
      amount: Joi.number().positive().min(1).max(10000).required(),
      phoneNumber: Joi.string()
        .pattern(/^\+[1-9]\d{9,14}$/)
        .required()
        .messages({
          'string.pattern.base': 'Phone number must be in E.164 format (e.g., +919876543210)',
        }),
      planId: Joi.string().hex().length(24).optional(),
    })
  ),
  initiateRecharge
);

export default router;
