import { logger } from '../config/logger';
import express from 'express';
import * as subscriptionController from '../controllers/subscriptionController';
import { authenticate } from '../middleware/auth';
import { validate, validateParams, Joi } from '../middleware/validation';
import {
  razorpayIPWhitelist,
  webhookRateLimiter,
  validateWebhookPayload,
  logWebhookSecurityEvent,
} from '../middleware/webhookSecurity';

// Subscription validation schemas
const subscriptionTierEnum = ['premium', 'vip'] as const;
const billingCycleEnum = ['monthly', 'yearly'] as const;

const subscribeSchema = Joi.object({
  tier: Joi.string().valid(...subscriptionTierEnum).required(),
  billingCycle: Joi.string().valid(...billingCycleEnum).required(),
  paymentMethod: Joi.string().optional(),
  promoCode: Joi.string().max(20).optional(),
  source: Joi.string().optional(),
});

const validatePromoSchema = Joi.object({
  code: Joi.string().required(),
  tier: Joi.string().valid(...subscriptionTierEnum).optional(),
  billingCycle: Joi.string().valid(...billingCycleEnum).optional(),
});

const initiateUpgradeSchema = Joi.object({
  newTier: Joi.string().valid(...subscriptionTierEnum).required(),
  billingCycle: Joi.string().valid(...billingCycleEnum).optional(),
  paymentGateway: Joi.string().optional(),
});

const confirmUpgradeSchema = Joi.object({
  upgradeId: Joi.string().required(),
  paymentId: Joi.string().optional(),
  paymentIntentId: Joi.string().optional(),
});

const downgradeSchema = Joi.object({
  newTier: Joi.string().valid('free', 'premium').required(),
  reason: Joi.string().max(500).optional(),
});

const cancelSchema = Joi.object({
  reason: Joi.string().max(500).optional(),
  feedback: Joi.string().max(1000).optional(),
});

const renewSchema = Joi.object({
  paymentMethod: Joi.string().optional(),
  billingCycle: Joi.string().valid(...billingCycleEnum).optional(),
});

const autoRenewSchema = Joi.object({
  autoRenew: Joi.boolean().required(),
});

const tierParamSchema = Joi.object({
  tier: Joi.string().valid('free', 'premium', 'vip').required(),
});

const router = express.Router();

// Logging middleware for all subscription routes
router.use((req, res, next) => {
  logger.info('📡 [SUBSCRIPTION ROUTE] Incoming request:', {
    method: req.method,
    path: req.path,
    fullUrl: req.originalUrl,
    hasAuth: !!req.headers.authorization,
    body: req.method === 'POST' ? req.body : undefined
  });
  next();
});

// Public routes
router.get('/tiers', subscriptionController.getSubscriptionTiers);

// Webhook endpoint with comprehensive security middleware stack
// Order matters: IP whitelist -> rate limit -> payload validation -> logging -> controller
router.post(
  '/webhook',
  razorpayIPWhitelist, // Check IP is from Razorpay
  webhookRateLimiter, // Rate limiting
  validateWebhookPayload, // Validate payload structure
  logWebhookSecurityEvent, // Audit logging
  subscriptionController.handleWebhook // Main handler with replay attack prevention
);

// Protected routes (require authentication)
logger.info('🔒 [SUBSCRIPTION ROUTES] Setting up protected routes with authentication');
router.use((req, res, next) => {
  logger.info('🔒 [SUBSCRIPTION ROUTE] Attempting authentication for:', req.path);
  next();
});
router.use(authenticate);

router.get('/current', subscriptionController.getCurrentSubscription);
router.get('/benefits', subscriptionController.getSubscriptionBenefits);
router.get('/usage', subscriptionController.getSubscriptionUsage);
router.get('/my-savings', subscriptionController.getMySavings);
router.get('/value-proposition/:tier', validateParams(tierParamSchema), subscriptionController.getValueProposition);

router.post('/subscribe', validate(subscribeSchema), subscriptionController.subscribeToPlan);
router.post('/validate-promo', validate(validatePromoSchema), subscriptionController.validatePromoCode);
router.post('/upgrade', subscriptionController.upgradeSubscription);
router.post('/upgrade/initiate', validate(initiateUpgradeSchema), subscriptionController.initiateUpgrade);
router.post('/upgrade/confirm', validate(confirmUpgradeSchema), subscriptionController.confirmUpgrade);
router.post('/downgrade', validate(downgradeSchema), subscriptionController.downgradeSubscription);
router.post('/cancel', validate(cancelSchema), subscriptionController.cancelSubscription);
router.post('/renew', validate(renewSchema), subscriptionController.renewSubscription);

router.patch('/auto-renew', validate(autoRenewSchema), subscriptionController.toggleAutoRenew);

export default router;
