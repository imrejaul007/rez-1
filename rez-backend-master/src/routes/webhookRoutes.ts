import { Router } from 'express';
import { handleRazorpayWebhook, handleStripeWebhook } from '../controllers/webhookController';
import express from 'express';

const router = Router();

/**
 * Webhook Routes
 * Base path: /api/webhooks
 *
 * IMPORTANT: Webhook routes should NOT use authentication middleware
 * They are verified using signature verification instead
 */

/**
 * @route POST /api/webhooks/razorpay
 * @desc Handle Razorpay webhook events
 * @access Public (verified with signature)
 *
 * Events handled:
 * - payment.captured: Payment successfully captured
 * - payment.failed: Payment failed
 * - payment.authorized: Payment authorized (pending capture)
 * - order.paid: Order marked as paid
 * - refund.created: Refund initiated
 * - refund.processed: Refund completed
 * - refund.failed: Refund failed
 */
router.post(
  '/razorpay',
  express.json(), // Parse JSON body for signature verification
  handleRazorpayWebhook
);

/**
 * @route POST /api/webhooks/stripe
 * @desc Handle Stripe webhook events
 * @access Public (verified with signature)
 *
 * Events handled:
 * - payment_intent.succeeded: Payment completed successfully
 * - payment_intent.payment_failed: Payment failed
 * - payment_intent.created: Payment intent created
 * - payment_intent.canceled: Payment intent canceled
 * - charge.refunded: Charge refunded
 * - checkout.session.completed: Checkout session completed
 */
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }), // Stripe requires raw body for signature verification
  handleStripeWebhook
);

export default router;
