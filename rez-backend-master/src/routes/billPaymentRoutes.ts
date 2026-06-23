import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate, validateQuery, Joi } from '../middleware/validation';
import { financialLimiter } from '../middleware/rateLimiter';
import { idempotencyMiddleware } from '../middleware/idempotency';
import {
  getBillTypes,
  getProviders,
  fetchBill,
  payBill,
  getHistory,
  getPlans,
  requestRefund,
  handleBBPSWebhook,
} from '../controllers/billPaymentController';

const router = Router();

// ============================================
// Validation Schemas
// ============================================

const providerQuerySchema = Joi.object({
  type: Joi.string()
    .valid('electricity', 'water', 'gas', 'internet', 'mobile_postpaid', 'mobile_prepaid',
           'broadband', 'dth', 'landline', 'insurance', 'fastag', 'education_fee')
    .required(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
});

const fetchBillSchema = Joi.object({
  providerId: Joi.string().required().messages({
    'any.required': 'Provider ID is required',
  }),
  customerNumber: Joi.string().trim().min(1).max(50).required().messages({
    'any.required': 'Customer number is required',
    'string.max': 'Customer number must be 50 characters or less',
  }),
});

const payBillSchema = Joi.object({
  providerId: Joi.string().required().messages({
    'any.required': 'Provider ID is required',
  }),
  customerNumber: Joi.string().trim().min(1).max(50).required().messages({
    'any.required': 'Customer number is required',
  }),
  amount: Joi.number().positive().required().messages({
    'any.required': 'Amount is required',
    'number.positive': 'Amount must be greater than 0',
  }),
  razorpayPaymentId: Joi.string().optional(),
  planId: Joi.string().optional(),
});

const historyQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  billType: Joi.string()
    .valid('electricity', 'water', 'gas', 'internet', 'mobile_postpaid', 'mobile_prepaid',
           'broadband', 'dth', 'landline', 'insurance', 'fastag', 'education_fee')
    .optional(),
});

// ============================================
// Public routes (types don't need auth)
// ============================================

router.get('/types', getBillTypes);

// ============================================
// Authenticated routes
// ============================================

router.use(authenticate);

router.get('/providers', validateQuery(providerQuerySchema), getProviders);
router.post('/fetch-bill', financialLimiter, validate(fetchBillSchema), fetchBill);
router.post('/pay', financialLimiter, idempotencyMiddleware({ ttlSeconds: 600 }), validate(payBillSchema), payBill);
router.get('/history', validateQuery(historyQuerySchema), getHistory);

// Plans (mobile prepaid recharge)
router.get('/plans', validateQuery(Joi.object({
  providerId: Joi.string().required(),
  circle: Joi.string().default('KA'),
})), getPlans);

// Refund
router.post('/refund', financialLimiter, idempotencyMiddleware({ ttlSeconds: 600 }), validate(Joi.object({
  paymentId: Joi.string().required(),
  reason: Joi.string().max(200).optional(),
})), requestRefund);

// BBPS Webhook (NO authenticate — called by Razorpay)
// Must be placed BEFORE router.use(authenticate) — moved to top-level registration
// For now, export so it can be registered separately in routes config
export { handleBBPSWebhook };

export default router;
