import express from 'express';
import {
  createPaymentOrder,
  verifyPayment,
  getPaymentStatus,
  createCheckoutSession,
  verifyStripeSession,
  verifyStripePayment,
} from '../controllers/paymentController';
import { authenticate } from '../middleware/auth';
import { idempotencyMiddleware } from '../middleware/idempotency';
import { validate, validateParams, Joi } from '../middleware/validation';

// Payment validation schemas
const createOrderSchema = Joi.object({
  orderId: Joi.string().required(),
  amount: Joi.number().positive().required(),
  currency: Joi.string().max(3).optional(),
});

const verifyPaymentSchema = Joi.object({
  orderId: Joi.string().required(),
  razorpay_order_id: Joi.string().required(),
  razorpay_payment_id: Joi.string().required(),
  razorpay_signature: Joi.string().required(),
});

const createCheckoutSessionSchema = Joi.object({
  tier: Joi.string().optional(),
  billingCycle: Joi.string().optional(),
  amount: Joi.number().positive().optional(),
  currency: Joi.string().optional(),
});

const verifyStripeSessionSchema = Joi.object({
  sessionId: Joi.string().required(),
});

const verifyStripePaymentSchema = Joi.object({
  paymentIntentId: Joi.string().required(),
});

const orderIdParamSchema = Joi.object({
  orderId: Joi.string().required(),
});

const router = express.Router();

/**
 * Payment Routes
 * Base path: /api/payment
 */

// ==================== RAZORPAY ROUTES ====================

// Create Razorpay order for payment (requires authentication)
router.post('/create-order', authenticate, idempotencyMiddleware({ ttlSeconds: 600 }), validate(createOrderSchema), createPaymentOrder);

// Verify Razorpay payment signature (requires authentication)
router.post('/verify', authenticate, idempotencyMiddleware({ ttlSeconds: 600 }), validate(verifyPaymentSchema), verifyPayment);

// Razorpay webhook: mounted in server.ts with express.raw() BEFORE JSON parser

// ==================== STRIPE ROUTES ====================

// Create Stripe Checkout Session for subscription or one-time payment (requires authentication)
router.post('/create-checkout-session', authenticate, validate(createCheckoutSessionSchema), createCheckoutSession);

// Verify Stripe checkout session after payment (requires authentication)
router.post('/verify-stripe-session', authenticate, validate(verifyStripeSessionSchema), verifyStripeSession);

// Verify Stripe payment intent (requires authentication)
router.post('/verify-stripe-payment', authenticate, validate(verifyStripePaymentSchema), verifyStripePayment);

// Stripe webhook: mounted in server.ts with express.raw() BEFORE JSON parser

// ==================== COMMON ROUTES ====================

// Get payment status for an order (requires authentication)
router.get('/status/:orderId', authenticate, validateParams(orderIdParamSchema), getPaymentStatus);

export default router;