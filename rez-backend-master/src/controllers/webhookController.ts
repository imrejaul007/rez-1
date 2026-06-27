import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { logger } from '../config/logger';
import { asyncHandler } from '../utils/asyncHandler';
import { Order } from '../models/Order';
import { WebhookLog } from '../models/WebhookLog';
import DealRedemption from '../models/DealRedemption';
import Campaign from '../models/Campaign';
import paymentService from '../services/PaymentService';
import stripeService from '../services/stripeService';
import { razorpayService } from '../services/razorpayService';
import { sendSuccess, sendBadRequest, sendUnauthorized } from '../utils/response';
import Stripe from 'stripe';
import EventBooking from '../models/EventBooking';
import Event from '../models/Event';
import eventRewardService from '../services/eventRewardService';

/**
 * Enhanced Razorpay Webhook Handler
 * POST /api/webhooks/razorpay
 *
 * Handles all Razorpay webhook events with:
 * - Signature verification
 * - Idempotency handling
 * - Comprehensive logging
 * - Error handling and retries
 */
export const handleRazorpayWebhook = asyncHandler(async (req: Request, res: Response) => {
  const webhookSignature = req.headers['x-razorpay-signature'] as string;
  // SECURITY: The webhook route uses express.raw({ type: 'application/json' }),
  // so req.body IS the raw Buffer. Use it directly for signature verification.
  // Razorpay signs the exact bytes sent; JSON.stringify(req.body) would re-serialize
  // with different key order/whitespace and break verification.
  const webhookBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body);
  const event = req.body;

  logger.info('🔔 [RAZORPAY WEBHOOK] Event received:', {
    eventType: event.event,
    eventId: event.payload?.payment?.entity?.id || event.payload?.order?.entity?.id || 'unknown',
    timestamp: new Date().toISOString()
  });

  // Validate webhook signature
  if (!webhookSignature) {
    logger.error('❌ [RAZORPAY WEBHOOK] Missing signature');
    return sendBadRequest(res, 'Missing webhook signature');
  }

  try {
    // Step 1: Verify webhook signature
    const isValidSignature = razorpayService.validateWebhookSignature(
      webhookBody,
      webhookSignature
    );

    if (!isValidSignature) {
      logger.error('❌ [RAZORPAY WEBHOOK] Invalid signature');

      // Log failed verification attempt
      await WebhookLog.create({
        provider: 'razorpay',
        eventId: `failed_${Date.now()}`,
        eventType: event.event || 'unknown',
        payload: event,
        signature: webhookSignature,
        signatureValid: false,
        processed: false,
        status: 'failed',
        errorMessage: 'Invalid webhook signature'
      });

      return sendUnauthorized(res, 'Invalid webhook signature');
    }

    logger.info('✅ [RAZORPAY WEBHOOK] Signature verified');

    // Step 2: Extract event details
    const eventType = event.event;
    const eventId = event.payload?.payment?.entity?.id ||
                    event.payload?.order?.entity?.id ||
                    event.payload?.refund?.entity?.id ||
                    `event_${Date.now()}`;

    // Step 3+4: Atomic idempotency — try to insert log entry; if eventId exists, it's a duplicate
    let webhookLog;
    try {
      webhookLog = await WebhookLog.create({
        provider: 'razorpay',
        eventId,
        eventType,
        payload: event,
        signature: webhookSignature,
        signatureValid: true,
        processed: false,
        status: 'processing',
        metadata: {
          paymentId: event.payload?.payment?.entity?.id,
          orderId: event.payload?.payment?.entity?.notes?.orderId ||
                   event.payload?.order?.entity?.notes?.orderId,
          amount: event.payload?.payment?.entity?.amount,
          currency: event.payload?.payment?.entity?.currency
        }
      });
    } catch (err: any) {
      // Unique index violation = duplicate event
      if (err.code === 11000) {
        logger.info('⚠️ [RAZORPAY WEBHOOK] Duplicate event detected:', eventId);
        return res.status(200).json({
          received: true,
          status: 'duplicate',
          message: 'Event already processed'
        });
      }
      throw err;
    }

    logger.info('📝 [RAZORPAY WEBHOOK] Log created:', webhookLog._id);

    // Step 5: Process the webhook event
    try {
      await processRazorpayEvent(event, webhookLog);

      // Mark as successfully processed
      webhookLog.processed = true;
      webhookLog.processedAt = new Date();
      webhookLog.status = 'success';
      await webhookLog.save();

      logger.info('✅ [RAZORPAY WEBHOOK] Event processed successfully');

      return res.status(200).json({
        received: true,
        status: 'success',
        eventId: webhookLog.eventId
      });

    } catch (processingError: any) {
      logger.error('❌ [RAZORPAY WEBHOOK] Processing error:', processingError);

      // FIX [MEDIUM-4]: Return proper status codes for retry logic
      const MAX_RETRIES = 3;
      webhookLog.retryCount += 1;
      webhookLog.status = webhookLog.retryCount >= MAX_RETRIES ? 'failed' : 'pending_retry';
      webhookLog.errorMessage = processingError.message;
      await webhookLog.save();

      logger.info(`[RAZORPAY WEBHOOK] Event ${webhookLog.eventId} marked as ${webhookLog.status} (retryCount: ${webhookLog.retryCount})`);

      // Return 500 to trigger retry if under max retries, 200 only when giving up
      if (webhookLog.retryCount >= MAX_RETRIES) {
        return res.status(200).json({
          received: true,
          status: 'max_retries_exceeded',
          message: 'Maximum retry attempts reached'
        });
      }
      return res.status(500).json({
        received: true,
        status: 'error',
        message: processingError.message
      });
    }

  } catch (error: any) {
    logger.error('❌ [RAZORPAY WEBHOOK] Unexpected error:', error);

    // FIX [MEDIUM-4]: Return 500 for unexpected errors to trigger retry
    return res.status(500).json({
      received: true,
      status: 'error',
      message: error.message
    });
  }
});

/**
 * Process Razorpay webhook events
 */
async function processRazorpayEvent(event: any, webhookLog: any): Promise<void> {
  const eventType = event.event;

  logger.info(`🔄 [RAZORPAY WEBHOOK] Processing event type: ${eventType}`);

  switch (eventType) {
    case 'payment.captured':
      await handleRazorpayPaymentCaptured(event);
      break;

    case 'payment.failed':
      await handleRazorpayPaymentFailed(event);
      break;

    case 'payment.authorized':
      await handleRazorpayPaymentAuthorized(event);
      break;

    case 'order.paid':
      await handleRazorpayOrderPaid(event);
      break;

    case 'refund.created':
      await handleRazorpayRefundCreated(event);
      break;

    case 'refund.processed':
      await handleRazorpayRefundProcessed(event);
      break;

    case 'refund.failed':
      await handleRazorpayRefundFailed(event);
      break;

    default:
      logger.info(`ℹ️ [RAZORPAY WEBHOOK] Unhandled event type: ${eventType}`);
      // Don't throw error for unhandled events
  }
}

/**
 * Handle payment.captured event
 */
async function handleRazorpayPaymentCaptured(event: any): Promise<void> {
  const payment = event.payload.payment.entity;
  const orderId = payment.notes?.orderId;

  if (!orderId) {
    logger.error('❌ [RAZORPAY WEBHOOK] Order ID not found in payment notes');
    return;
  }

  logger.info('✅ [RAZORPAY WEBHOOK] Payment captured for order:', orderId);

  const order = await Order.findById(orderId);
  if (!order) {
    logger.error('❌ [RAZORPAY WEBHOOK] Order not found:', orderId);
    return;
  }

  // Atomic idempotency check — prevents double-processing if two webhook deliveries arrive simultaneously
  if (order.payment.status === 'paid') {
    logger.info('⚠️ [RAZORPAY WEBHOOK] Payment already marked as paid');
    return;
  }

  // Validate captured amount matches order total (±₹1 tolerance for rounding)
  const capturedAmount = payment.amount / 100;
  const orderTotal = order.totals?.total ?? 0;
  if (Math.abs(capturedAmount - orderTotal) > 1) {
    logger.error('🚨 [RAZORPAY WEBHOOK] Amount mismatch!', {
      captured: capturedAmount,
      orderTotal,
      orderId,
      paymentId: payment.id,
    });
    // Keep order in current status, add flag for manual review
    // Do NOT set an invalid payment status — preserve the state machine
    if (!(order as any).flags) (order as any).flags = [];
    (order as any).flags.push('amount_mismatch');
    order.timeline.push({
      status: order.status, // Keep current status, not an invalid one
      message: `Payment amount mismatch: captured ₹${capturedAmount} but order total is ₹${orderTotal}. Flagged for manual review.`,
      timestamp: new Date(),
      metadata: { capturedAmount, orderTotal, paymentId: payment.id },
    });
    await order.save();

    // Emit admin alert for manual review
    try {
      const orderSocketService = require('../services/orderSocketService').default;
      orderSocketService.emitToAdmin('PAYMENT_AMOUNT_MISMATCH', {
        orderId: String(order._id),
        orderNumber: order.orderNumber,
        capturedAmount,
        orderTotal,
        paymentId: payment.id,
        timestamp: new Date(),
      });
    } catch (alertErr) {
      logger.error('[RAZORPAY WEBHOOK] Failed to emit admin alert:', alertErr);
    }

    logger.warn(`🚨 [RAZORPAY WEBHOOK] Order ${order.orderNumber} flagged for amount mismatch review`);
    return;
  }

  // Update order payment status
  order.payment.status = 'paid';
  order.payment.transactionId = payment.id;
  order.payment.paidAt = new Date(payment.created_at * 1000);
  order.totals.paidAmount = capturedAmount;

  // Update payment gateway details
  (order as any).paymentGateway = {
    gatewayPaymentId: payment.id,
    gateway: 'razorpay',
    currency: payment.currency,
    amountPaid: capturedAmount,
    paidAt: new Date(payment.created_at * 1000)
  };

  // Add timeline entry
  order.timeline.push({
    status: 'payment_captured',
    message: 'Payment captured successfully via webhook',
    timestamp: new Date()
  });

  await order.save();

  logger.info('✅ [RAZORPAY WEBHOOK] Order updated with payment details');
}

/**
 * Handle payment.failed event
 */
async function handleRazorpayPaymentFailed(event: any): Promise<void> {
  const payment = event.payload.payment.entity;
  const orderId = payment.notes?.orderId;

  if (!orderId) {
    logger.error('❌ [RAZORPAY WEBHOOK] Order ID not found in payment notes');
    return;
  }

  logger.info('❌ [RAZORPAY WEBHOOK] Payment failed for order:', orderId);

  const order = await Order.findById(orderId).lean();
  if (!order) {
    logger.error('❌ [RAZORPAY WEBHOOK] Order not found:', orderId);
    return;
  }

  const failureReason = payment.error_description || payment.error_code || 'Payment failed';

  // Handle payment failure
  await paymentService.handlePaymentFailure(orderId, failureReason);

  logger.info('✅ [RAZORPAY WEBHOOK] Payment failure processed');
}

/**
 * Handle payment.authorized event
 */
async function handleRazorpayPaymentAuthorized(event: any): Promise<void> {
  const payment = event.payload.payment.entity;
  const orderId = payment.notes?.orderId;

  if (!orderId) {
    logger.error('❌ [RAZORPAY WEBHOOK] Order ID not found in payment notes');
    return;
  }

  logger.info('🔐 [RAZORPAY WEBHOOK] Payment authorized for order:', orderId);

  const order = await Order.findById(orderId);
  if (!order) {
    logger.error('❌ [RAZORPAY WEBHOOK] Order not found:', orderId);
    return;
  }

  // Update order status to processing
  order.payment.status = 'processing';
  order.timeline.push({
    status: 'payment_authorized',
    message: 'Payment authorized, pending capture',
    timestamp: new Date()
  });

  await order.save();
}

/**
 * Handle order.paid event
 */
async function handleRazorpayOrderPaid(event: any): Promise<void> {
  const razorpayOrder = event.payload.order.entity;
  const orderId = razorpayOrder.notes?.orderId;

  if (!orderId) {
    logger.error('❌ [RAZORPAY WEBHOOK] Order ID not found in order notes');
    return;
  }

  logger.info('✅ [RAZORPAY WEBHOOK] Order paid:', orderId);

  const order = await Order.findById(orderId);
  if (!order) {
    logger.error('❌ [RAZORPAY WEBHOOK] Order not found:', orderId);
    return;
  }

  // Additional processing if needed
  order.timeline.push({
    status: 'order_paid_webhook',
    message: 'Order payment confirmed via webhook',
    timestamp: new Date()
  });

  await order.save();
}

/**
 * Handle refund.created event
 */
async function handleRazorpayRefundCreated(event: any): Promise<void> {
  const refund = event.payload.refund.entity;
  const paymentId = refund.payment_id;

  logger.info('💰 [RAZORPAY WEBHOOK] Refund created:', refund.id);

  // Find order by payment ID
  const order = await Order.findOne({ 'payment.transactionId': paymentId });
  if (!order) {
    logger.error('❌ [RAZORPAY WEBHOOK] Order not found for payment:', paymentId);
    return;
  }

  // Update refund details
  order.payment.refundId = refund.id;
  order.payment.status = 'refunded';
  order.totals.refundAmount = (order.totals.refundAmount || 0) + (refund.amount / 100);

  order.timeline.push({
    status: 'refund_created',
    message: `Refund of ₹${refund.amount / 100} initiated`,
    timestamp: new Date()
  });

  await order.save();

  logger.info('✅ [RAZORPAY WEBHOOK] Refund details updated');
}

/**
 * Handle refund.processed event
 */
async function handleRazorpayRefundProcessed(event: any): Promise<void> {
  const refund = event.payload.refund.entity;
  const paymentId = refund.payment_id;

  logger.info('✅ [RAZORPAY WEBHOOK] Refund processed:', refund.id);

  const order = await Order.findOne({ 'payment.transactionId': paymentId });
  if (!order) {
    logger.error('❌ [RAZORPAY WEBHOOK] Order not found for payment:', paymentId);
    return;
  }

  order.payment.refundedAt = new Date();
  order.timeline.push({
    status: 'refund_processed',
    message: `Refund of ₹${refund.amount / 100} processed successfully`,
    timestamp: new Date()
  });

  await order.save();
}

/**
 * Handle refund.failed event
 */
async function handleRazorpayRefundFailed(event: any): Promise<void> {
  const refund = event.payload.refund.entity;
  const paymentId = refund.payment_id;

  logger.info('❌ [RAZORPAY WEBHOOK] Refund failed:', refund.id);

  const order = await Order.findOne({ 'payment.transactionId': paymentId });
  if (!order) {
    logger.error('❌ [RAZORPAY WEBHOOK] Order not found for payment:', paymentId);
    return;
  }

  order.timeline.push({
    status: 'refund_failed',
    message: `Refund of ₹${refund.amount / 100} failed`,
    timestamp: new Date()
  });

  await order.save();
}

/**
 * Enhanced Stripe Webhook Handler
 * POST /api/webhooks/stripe
 *
 * Handles all Stripe webhook events with:
 * - Signature verification
 * - Idempotency handling
 * - Comprehensive logging
 * - Error handling and retries
 */
export const handleStripeWebhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    logger.error('❌ [STRIPE WEBHOOK] Webhook secret not configured');
    return sendBadRequest(res, 'Stripe webhook secret not configured');
  }

  if (!signature) {
    logger.error('❌ [STRIPE WEBHOOK] Missing signature');
    return sendBadRequest(res, 'Missing webhook signature');
  }

  logger.info('🔔 [STRIPE WEBHOOK] Event received at:', new Date().toISOString());

  try {
    // Step 1: Verify webhook signature using Stripe's constructEvent
    const event: Stripe.Event = stripeService.verifyWebhookSignature(
      req.body,
      signature,
      webhookSecret
    );

    logger.info('✅ [STRIPE WEBHOOK] Signature verified:', {
      eventType: event.type,
      eventId: event.id
    });

    // Step 2: Extract metadata
    const metadata = extractStripeMetadata(event);

    // Step 3+4: Atomic idempotency — try to insert log; unique index catches duplicates
    let webhookLog;
    try {
      webhookLog = await WebhookLog.create({
        provider: 'stripe',
        eventId: event.id,
        eventType: event.type,
        payload: event,
        signature: signature,
        signatureValid: true,
        processed: false,
        status: 'processing',
        metadata
      });
    } catch (err: any) {
      if (err.code === 11000) {
        logger.info('⚠️ [STRIPE WEBHOOK] Duplicate event detected:', event.id);
        return res.status(200).json({
          received: true,
          status: 'duplicate',
          message: 'Event already processed'
        });
      }
      throw err;
    }

    logger.info('📝 [STRIPE WEBHOOK] Log created:', webhookLog._id);

    // Step 5: Process the webhook event
    try {
      await processStripeEvent(event, webhookLog);

      // Mark as successfully processed
      webhookLog.processed = true;
      webhookLog.processedAt = new Date();
      webhookLog.status = 'success';
      await webhookLog.save();

      logger.info('✅ [STRIPE WEBHOOK] Event processed successfully');

      return res.status(200).json({
        received: true,
        status: 'success',
        eventId: webhookLog.eventId
      });

    } catch (processingError: any) {
      logger.error('❌ [STRIPE WEBHOOK] Processing error:', processingError);

      // Update log with error — use pending_retry if under max retries
      webhookLog.retryCount += 1;
      webhookLog.status = webhookLog.retryCount >= 3 ? 'failed' : 'pending_retry';
      webhookLog.errorMessage = processingError.message;
      await webhookLog.save();

      logger.info(`[STRIPE WEBHOOK] Event ${webhookLog.eventId} marked as ${webhookLog.status} (retryCount: ${webhookLog.retryCount})`);

      // Return 200 to prevent unnecessary retries
      return res.status(200).json({
        received: true,
        status: 'error',
        message: processingError.message
      });
    }

  } catch (error: any) {
    logger.error('❌ [STRIPE WEBHOOK] Signature verification failed:', error);

    // Log failed verification attempt
    await WebhookLog.create({
      provider: 'stripe',
      eventId: `failed_${Date.now()}`,
      eventType: 'unknown',
      payload: req.body,
      signature: signature,
      signatureValid: false,
      processed: false,
      status: 'failed',
      errorMessage: error.message
    });

    return sendUnauthorized(res, 'Invalid webhook signature');
  }
});

/**
 * Extract metadata from Stripe event
 */
function extractStripeMetadata(event: Stripe.Event): any {
  const metadata: any = {};

  switch (event.type) {
    case 'payment_intent.succeeded':
    case 'payment_intent.payment_failed':
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      metadata.paymentId = paymentIntent.id;
      metadata.amount = paymentIntent.amount;
      metadata.currency = paymentIntent.currency;
      metadata.orderId = paymentIntent.metadata?.orderId || paymentIntent.metadata?.subscriptionId;
      break;

    case 'charge.refunded':
      const charge = event.data.object as Stripe.Charge;
      metadata.paymentId = charge.id;
      metadata.amount = charge.amount_refunded;
      metadata.currency = charge.currency;
      break;

    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      metadata.orderId = session.metadata?.subscriptionId || session.metadata?.orderId;
      metadata.amount = session.amount_total;
      metadata.currency = session.currency;
      // Deal purchase metadata
      if (session.metadata?.type === 'deal_purchase') {
        metadata.type = 'deal_purchase';
        metadata.campaignId = session.metadata?.campaignId;
        metadata.campaignSlug = session.metadata?.campaignSlug;
        metadata.dealIndex = session.metadata?.dealIndex;
        metadata.userId = session.metadata?.userId;
        metadata.redemptionId = session.metadata?.redemptionId;
      }
      break;
  }

  return metadata;
}

/**
 * Process Stripe webhook events
 */
async function processStripeEvent(event: Stripe.Event, webhookLog: any): Promise<void> {
  const eventType = event.type;

  logger.info(`🔄 [STRIPE WEBHOOK] Processing event type: ${eventType}`);

  switch (eventType) {
    case 'payment_intent.succeeded':
      await handleStripePaymentIntentSucceeded(event);
      break;

    case 'payment_intent.payment_failed':
      await handleStripePaymentIntentFailed(event);
      break;

    case 'charge.refunded':
      await handleStripeChargeRefunded(event);
      break;

    case 'checkout.session.completed':
      await handleStripeCheckoutSessionCompleted(event);
      break;

    case 'payment_intent.created':
      await handleStripePaymentIntentCreated(event);
      break;

    case 'payment_intent.canceled':
      await handleStripePaymentIntentCanceled(event);
      break;

    case 'checkout.session.expired':
      await handleStripeCheckoutSessionExpired(event);
      break;

    case 'checkout.session.async_payment_failed':
      await handleStripeCheckoutSessionAsyncPaymentFailed(event);
      break;

    default:
      logger.info(`ℹ️ [STRIPE WEBHOOK] Unhandled event type: ${eventType}`);
      // Don't throw error for unhandled events
  }
}

/**
 * Handle checkout.session.expired event
 * Cleans up pending redemptions when checkout session expires
 */
async function handleStripeCheckoutSessionExpired(event: Stripe.Event): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session;
  const metadata = session.metadata || {};

  logger.info('⏰ [STRIPE WEBHOOK] Checkout session expired:', session.id);

  // Handle deal purchase expiry
  if (metadata.type === 'deal_purchase') {
    const redemption = await DealRedemption.findOne({
      stripeSessionId: session.id,
      status: 'pending',
    });

    if (redemption) {
      redemption.status = 'cancelled';
      await redemption.save();
      logger.info(`✅ [STRIPE WEBHOOK] Pending redemption cancelled due to session expiry: ${redemption._id}`);
    }
  }
}

/**
 * Handle checkout.session.async_payment_failed event
 * Handles async payment failures (bank transfers, etc.)
 */
async function handleStripeCheckoutSessionAsyncPaymentFailed(event: Stripe.Event): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session;
  const metadata = session.metadata || {};

  logger.info('❌ [STRIPE WEBHOOK] Async payment failed:', session.id);

  // Handle deal purchase async payment failure
  if (metadata.type === 'deal_purchase') {
    const redemption = await DealRedemption.findOne({
      stripeSessionId: session.id,
      status: 'pending',
    });

    if (redemption) {
      redemption.status = 'cancelled';
      await redemption.save();
      logger.info(`✅ [STRIPE WEBHOOK] Pending redemption cancelled due to payment failure: ${redemption._id}`);
    }
  }
}

/**
 * Handle payment_intent.succeeded event
 */
async function handleStripePaymentIntentSucceeded(event: Stripe.Event): Promise<void> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const orderId = paymentIntent.metadata?.orderId || paymentIntent.metadata?.subscriptionId;
  const bookingId = paymentIntent.metadata?.bookingId;

  logger.info('✅ [STRIPE WEBHOOK] Payment intent succeeded:', paymentIntent.id);

  // Handle event booking payment
  if (bookingId) {
    await handleEventBookingPaymentSuccess(bookingId, paymentIntent);
    return;
  }

  if (!orderId) {
    logger.error('❌ [STRIPE WEBHOOK] Order ID not found in metadata');
    return;
  }

  const order = await Order.findById(orderId);
  if (!order) {
    logger.error('❌ [STRIPE WEBHOOK] Order not found:', orderId);
    return;
  }

  // Check if already processed
  if (order.payment.status === 'paid') {
    logger.info('⚠️ [STRIPE WEBHOOK] Payment already marked as paid');
    return;
  }

  // Update order payment status
  order.payment.status = 'paid';
  order.payment.transactionId = paymentIntent.id;
  order.payment.paidAt = new Date(paymentIntent.created * 1000);
  order.totals.paidAmount = paymentIntent.amount / 100;

  // Update payment gateway details
  (order as any).paymentGateway = {
    gatewayPaymentId: paymentIntent.id,
    gateway: 'stripe',
    currency: paymentIntent.currency,
    amountPaid: paymentIntent.amount / 100,
    paidAt: new Date(paymentIntent.created * 1000)
  };

  // Add timeline entry
  order.timeline.push({
    status: 'payment_success',
    message: 'Payment completed successfully via Stripe webhook',
    timestamp: new Date()
  });

  await order.save();

  logger.info('✅ [STRIPE WEBHOOK] Order updated with payment details');
}

/**
 * Handle event booking payment success (called from payment_intent.succeeded and checkout.session.completed)
 */
async function handleEventBookingPaymentSuccess(bookingId: string, paymentIntent: { id: string; amount: number; created: number }): Promise<void> {
  try {
    const booking = await EventBooking.findById(bookingId);
    if (!booking) {
      logger.error('❌ [STRIPE WEBHOOK] Event booking not found:', bookingId);
      return;
    }

    // Already confirmed - idempotent
    if (booking.status === 'confirmed' || booking.status === 'completed') {
      logger.info('⚠️ [STRIPE WEBHOOK] Event booking already confirmed:', bookingId);
      return;
    }

    // Confirm the booking
    booking.status = 'confirmed';
    booking.paymentStatus = 'completed';
    booking.lockedUntil = undefined;
    await booking.save();

    logger.info('✅ [STRIPE WEBHOOK] Event booking confirmed:', bookingId);

    // Grant purchase reward for paid events
    try {
      const event = await Event.findById(booking.eventId).lean();
      await eventRewardService.grantEventReward(
        booking.userId.toString(),
        booking.eventId.toString(),
        booking._id.toString(),
        'purchase_reward',
        { eventName: event?.title || 'Event' }
      );
      logger.info('✅ [STRIPE WEBHOOK] Purchase reward granted for booking:', bookingId);
    } catch (rewardErr) {
      logger.error('[STRIPE WEBHOOK] Reward grant failed (non-blocking):', rewardErr);
    }
  } catch (error) {
    logger.error('❌ [STRIPE WEBHOOK] Error handling event booking payment:', error);
  }
}

/**
 * Handle payment_intent.payment_failed event
 */
async function handleStripePaymentIntentFailed(event: Stripe.Event): Promise<void> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const orderId = paymentIntent.metadata?.orderId || paymentIntent.metadata?.subscriptionId;

  logger.info('❌ [STRIPE WEBHOOK] Payment intent failed:', paymentIntent.id);

  if (!orderId) {
    logger.error('❌ [STRIPE WEBHOOK] Order ID not found in metadata');
    return;
  }

  const order = await Order.findById(orderId).lean();
  if (!order) {
    logger.error('❌ [STRIPE WEBHOOK] Order not found:', orderId);
    return;
  }

  const failureReason = paymentIntent.last_payment_error?.message || 'Payment failed';

  // Handle payment failure
  await paymentService.handlePaymentFailure(orderId, failureReason);

  logger.info('✅ [STRIPE WEBHOOK] Payment failure processed');
}

/**
 * Handle charge.refunded event
 */
async function handleStripeChargeRefunded(event: Stripe.Event): Promise<void> {
  const charge = event.data.object as Stripe.Charge;
  const paymentIntentId = charge.payment_intent as string;

  logger.info('💰 [STRIPE WEBHOOK] Charge refunded:', charge.id);

  // Find order by payment ID
  const order = await Order.findOne({ 'payment.transactionId': paymentIntentId });
  if (!order) {
    logger.error('❌ [STRIPE WEBHOOK] Order not found for payment:', paymentIntentId);
    return;
  }

  // Update refund details
  order.payment.status = 'refunded';
  order.payment.refundedAt = new Date();
  order.totals.refundAmount = (order.totals.refundAmount || 0) + (charge.amount_refunded / 100);

  order.timeline.push({
    status: 'refund_processed',
    message: `Refund of ${(charge.amount_refunded / 100).toFixed(2)} ${charge.currency.toUpperCase()} processed`,
    timestamp: new Date()
  });

  await order.save();

  logger.info('✅ [STRIPE WEBHOOK] Refund details updated');
}

/**
 * Handle checkout.session.completed event
 */
async function handleStripeCheckoutSessionCompleted(event: Stripe.Event): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session;
  const metadata = session.metadata || {};

  logger.info('✅ [STRIPE WEBHOOK] Checkout session completed:', session.id);

  // Check if this is a deal purchase
  if (metadata.type === 'deal_purchase') {
    await handleDealPurchaseCompleted(session);
    return;
  }

  // Handle subscription payment completion
  const subscriptionId = metadata.subscriptionId;
  if (subscriptionId) {
    logger.info('✅ [STRIPE WEBHOOK] Subscription payment completed:', subscriptionId);
    return;
  }

  // Handle event booking payment completion
  const bookingId = metadata.bookingId;
  if (bookingId) {
    logger.info('✅ [STRIPE WEBHOOK] Event booking checkout completed:', bookingId);
    await handleEventBookingPaymentSuccess(bookingId, {
      id: session.payment_intent as string,
      amount: (session.amount_total || 0),
      created: Math.floor(Date.now() / 1000),
    } as any);
    return;
  }

  // Handle order payment completion
  const orderId = metadata.orderId;
  if (orderId) {
    logger.info('✅ [STRIPE WEBHOOK] Order payment completed:', orderId);
    const order = await Order.findById(orderId);
    if (order && order.payment.status !== 'paid') {
      order.payment.status = 'paid';
      order.payment.transactionId = session.payment_intent as string;
      order.payment.paidAt = new Date();
      order.totals.paidAmount = (session.amount_total || 0) / 100;
      order.timeline.push({
        status: 'payment_success',
        message: 'Payment completed via Stripe checkout',
        timestamp: new Date()
      });
      await order.save();
    }
    return;
  }

  logger.info('ℹ️ [STRIPE WEBHOOK] No recognized metadata in checkout session');
}

/**
 * Handle deal purchase checkout session completion
 * Uses MongoDB transaction for atomic updates
 */
async function handleDealPurchaseCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const metadata = session.metadata || {};
  const { campaignId, campaignSlug, dealIndex, userId, redemptionId } = metadata;

  logger.info('💳 [STRIPE WEBHOOK] Processing deal purchase:', {
    sessionId: session.id,
    campaignSlug,
    dealIndex,
    userId,
    redemptionId
  });

  // Validate required metadata
  if (!campaignId || !userId || dealIndex === undefined) {
    logger.error('❌ [STRIPE WEBHOOK] Missing required metadata:', { campaignId, userId, dealIndex });
    return;
  }

  // Verify payment was successful
  if (session.payment_status !== 'paid') {
    logger.error('❌ [STRIPE WEBHOOK] Deal purchase not paid:', session.payment_status);
    return;
  }

  const dealIdx = parseInt(dealIndex || '0', 10);

  // Validate deal index bounds
  if (isNaN(dealIdx) || dealIdx < 0) {
    logger.error('❌ [STRIPE WEBHOOK] Invalid deal index:', dealIndex);
    return;
  }

  // Start a MongoDB session for transaction
  const mongoSession = await mongoose.startSession();

  try {
    await mongoSession.withTransaction(async () => {
      // Find the redemption within transaction
      const redemption = await DealRedemption.findOne({
        stripeSessionId: session.id,
        user: new mongoose.Types.ObjectId(userId),
      }).session(mongoSession).lean();

      if (!redemption) {
        throw new Error(`Redemption not found for session: ${session.id}`);
      }

      // Check if already processed (idempotency)
      if (redemption.status === 'active' || redemption.status === 'used') {
        logger.info('⚠️ [STRIPE WEBHOOK] Redemption already processed:', redemption._id);
        return; // Not an error, just already done
      }

      // Verify campaign and deal exist
      const campaign = await Campaign.findById(campaignId).session(mongoSession).lean();
      if (!campaign) {
        throw new Error(`Campaign not found: ${campaignId}`);
      }

      if (dealIdx >= campaign.deals.length) {
        throw new Error(`Deal index ${dealIdx} out of bounds for campaign ${campaignId}`);
      }

      // Update redemption status atomically
      redemption.status = 'active';
      redemption.purchasedAt = new Date();
      redemption.stripePaymentIntentId = session.payment_intent as string;
      redemption.purchasePaymentMethod = 'stripe';
      await redemption.save({ session: mongoSession });

      // Update deal purchase count atomically
      await Campaign.updateOne(
        { _id: new mongoose.Types.ObjectId(campaignId) },
        { $inc: { [`deals.${dealIdx}.purchaseCount`]: 1 } },
        { session: mongoSession }
      );

      logger.info('✅ [STRIPE WEBHOOK] Deal purchase completed:', {
        redemptionId: redemption._id,
        redemptionCode: redemption.redemptionCode,
        amount: (session.amount_total || 0) / 100,
        currency: session.currency
      });
    });
  } catch (error: any) {
    logger.error('❌ [STRIPE WEBHOOK] Transaction failed for deal purchase:', error.message);
    throw error; // Re-throw to mark webhook as failed for retry
  } finally {
    await mongoSession.endSession();
  }
}

/**
 * Handle payment_intent.created event
 */
async function handleStripePaymentIntentCreated(event: Stripe.Event): Promise<void> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  logger.info('📝 [STRIPE WEBHOOK] Payment intent created:', paymentIntent.id);
  // Log for audit purposes
}

/**
 * Handle payment_intent.canceled event
 */
async function handleStripePaymentIntentCanceled(event: Stripe.Event): Promise<void> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const orderId = paymentIntent.metadata?.orderId;

  logger.info('❌ [STRIPE WEBHOOK] Payment intent canceled:', paymentIntent.id);

  if (!orderId) {
    return;
  }

  const order = await Order.findById(orderId);
  if (!order) {
    return;
  }

  order.timeline.push({
    status: 'payment_canceled',
    message: 'Payment was canceled',
    timestamp: new Date()
  });

  await order.save();
}

/**
 * Retry failed webhook events
 * Finds WebhookLog entries with status 'pending_retry' and retryCount < 3,
 * then reprocesses them. Designed to be called by a cron job.
 */
export async function retryFailedWebhooks(): Promise<{ processed: number; succeeded: number; failed: number }> {
  const MAX_RETRIES = 3;
  const BATCH_SIZE = 10;

  const pendingLogs = await WebhookLog.find({
    status: 'pending_retry',
    retryCount: { $lt: MAX_RETRIES },
    signatureValid: true,
  })
    .sort({ createdAt: 1 })
    .limit(BATCH_SIZE);

  if (pendingLogs.length === 0) {
    logger.info('[WEBHOOK RETRY] No pending retry events found');
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  logger.info(`[WEBHOOK RETRY] Found ${pendingLogs.length} events to retry`);

  let succeeded = 0;
  let failed = 0;

  for (const webhookLog of pendingLogs) {
    try {
      webhookLog.status = 'processing';
      await webhookLog.save();

      if (webhookLog.provider === 'razorpay') {
        await processRazorpayEvent(webhookLog.payload, webhookLog);
      } else if (webhookLog.provider === 'stripe') {
        await processStripeEvent(webhookLog.payload as Stripe.Event, webhookLog);
      }

      // Mark as successfully processed
      webhookLog.processed = true;
      webhookLog.processedAt = new Date();
      webhookLog.status = 'success';
      await webhookLog.save();

      succeeded++;
      logger.info(`[WEBHOOK RETRY] Successfully reprocessed event ${webhookLog.eventId}`);
    } catch (retryError: any) {
      webhookLog.retryCount += 1;
      webhookLog.status = webhookLog.retryCount >= MAX_RETRIES ? 'failed' : 'pending_retry';
      webhookLog.errorMessage = retryError.message;
      await webhookLog.save();

      failed++;
      logger.error(`[WEBHOOK RETRY] Failed to reprocess event ${webhookLog.eventId} (retryCount: ${webhookLog.retryCount}):`, retryError.message);
    }
  }

  logger.info(`[WEBHOOK RETRY] Completed: ${succeeded} succeeded, ${failed} failed out of ${pendingLogs.length}`);
  return { processed: pendingLogs.length, succeeded, failed };
}
