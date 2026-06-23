import { Router } from 'express';
import { authenticate, requireSeniorAdmin } from '../middleware/auth';
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  getRazorpayConfig,
  handleRazorpayWebhook,
  createRazorpayRefund,
} from '../controllers/razorpayController';

const router = Router();

/**
 * @route GET /api/razorpay/config
 * @desc Get Razorpay configuration for frontend
 * @access Private
 */
router.get('/config', authenticate, getRazorpayConfig);

/**
 * @route POST /api/razorpay/create-order
 * @desc Create a Razorpay order
 * @access Private
 */
router.post('/create-order', authenticate, createRazorpayOrder);

/**
 * @route POST /api/razorpay/verify-payment
 * @desc Verify Razorpay payment signature and complete order
 * @access Private
 */
router.post('/verify-payment', authenticate, verifyRazorpayPayment);

/**
 * @route POST /api/razorpay/webhook
 * @desc Handle Razorpay webhook events
 * @access Public (verified with signature)
 */
router.post('/webhook', handleRazorpayWebhook);

/**
 * @route POST /api/razorpay/refund
 * @desc Create a refund
 * @access Private (Senior Admin only)
 *
 * SECURITY: previously protected only by `authenticate`, which let any
 * logged-in user trigger real Razorpay refunds. Refunds = real money moving
 * out of the merchant account, so require at least senior admin role.
 */
router.post('/refund', authenticate, requireSeniorAdmin, createRazorpayRefund);

export default router;

