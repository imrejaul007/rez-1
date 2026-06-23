import { logger } from '../config/logger';
import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendError, sendBadRequest } from '../utils/response';
import { razorpayService } from '../services/razorpayService';
import { Order } from '../models/Order';
import { User } from '../models/User';
import mongoose from 'mongoose';
import { SMSService } from '../services/SMSService';
import EmailService from '../services/EmailService';

/**
 * @desc Create a Razorpay order for payment
 * @route POST /api/razorpay/create-order
 * @access Private
 */
export const createRazorpayOrder = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { amount, orderId, notes } = req.body;

  // Validate input
  if (!amount || amount <= 0) {
    return sendBadRequest(res, 'Valid amount is required');
  }

  try {
    // Generate receipt
    const receipt = `order_${orderId || Date.now()}`;

    // Create Razorpay order
    const razorpayOrder = await razorpayService.createOrder(
      amount,
      receipt,
      {
        userId,
        orderId: orderId || 'pending',
        ...notes,
      }
    );

    logger.info('✅ [RAZORPAY CONTROLLER] Order created successfully:', razorpayOrder.id);

    // Return order details to frontend
    sendSuccess(res, {
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      receipt: razorpayOrder.receipt,
      notes: razorpayOrder.notes,
    }, 'Razorpay order created successfully');

  } catch (error: any) {
    logger.error('❌ [RAZORPAY CONTROLLER] Order creation error:', error);
    sendError(res, error.message || 'Failed to create Razorpay order', 500);
  }
});

/**
 * @desc Verify Razorpay payment and create order
 * @route POST /api/razorpay/verify-payment
 * @access Private
 */
export const verifyRazorpayPayment = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const {
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    orderData, // Cart items, delivery address, etc.
  } = req.body;

  // Validate input
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return sendBadRequest(res, 'Payment verification data is required');
  }

  try {
    // Step 1: Verify signature
    const isValid = razorpayService.verifySignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!isValid) {
      logger.error('❌ [RAZORPAY CONTROLLER] Payment signature verification failed');
      return sendError(res, 'Payment verification failed. Please contact support.', 400);
    }

    logger.info('✅ [RAZORPAY CONTROLLER] Payment signature verified');

    // Step 2: Fetch payment details from Razorpay
    const paymentDetails = await razorpayService.fetchPaymentDetails(razorpayPaymentId);

    if (paymentDetails.status !== 'captured' && paymentDetails.status !== 'authorized') {
      logger.error('❌ [RAZORPAY CONTROLLER] Payment not successful:', paymentDetails.status);
      return sendError(res, `Payment failed with status: ${paymentDetails.status}`, 400);
    }

    const amountInRupees = Number(paymentDetails.amount) / 100;

    logger.info('✅ [RAZORPAY CONTROLLER] Payment successful:', {
      paymentId: razorpayPaymentId,
      method: paymentDetails.method,
      amount: `₹${amountInRupees}`,
    });

    // Step 3: Create order in database
    // Note: The actual order creation logic should be handled by the order controller
    // This endpoint just verifies the payment and returns success

    sendSuccess(res, {
      verified: true,
      paymentId: razorpayPaymentId,
      orderId: razorpayOrderId,
      paymentMethod: paymentDetails.method,
      amount: amountInRupees,
      status: paymentDetails.status,
      transactionId: razorpayPaymentId,
    }, 'Payment verified successfully');

  } catch (error: any) {
    logger.error('❌ [RAZORPAY CONTROLLER] Payment verification error:', error);
    sendError(res, error.message || 'Payment verification failed', 500);
  }
});

/**
 * @desc Get Razorpay configuration for frontend
 * @route GET /api/razorpay/config
 * @access Private
 */
export const getRazorpayConfig = asyncHandler(async (req: Request, res: Response) => {
  try {
    const config = razorpayService.getConfigForFrontend();
    
    sendSuccess(res, config, 'Razorpay configuration retrieved successfully');
  } catch (error: any) {
    logger.error('❌ [RAZORPAY CONTROLLER] Config retrieval error:', error);
    sendError(res, error.message || 'Failed to get Razorpay config', 500);
  }
});

/**
 * @desc Handle Razorpay webhook events
 * @route POST /api/razorpay/webhook
 * @access Public (but verified with signature)
 */
export const handleRazorpayWebhook = asyncHandler(async (req: Request, res: Response) => {
  const webhookSignature = req.headers['x-razorpay-signature'] as string;
  // SECURITY: use raw bytes (captured via express.json({ verify })) — not a
  // re-serialization. Razorpay signs the exact bytes the sender sent.
  const webhookBody = (req as any).rawBody || JSON.stringify(req.body);

  if (!webhookSignature) {
    return sendBadRequest(res, 'Webhook signature missing');
  }

  try {
    // Verify webhook signature
    const isValid = razorpayService.validateWebhookSignature(webhookBody, webhookSignature);

    if (!isValid) {
      logger.error('❌ [RAZORPAY WEBHOOK] Signature verification failed');
      return sendError(res, 'Invalid webhook signature', 401);
    }

    const event = req.body;
    logger.info('📥 [RAZORPAY WEBHOOK] Event received:', {
      event: event.event,
      paymentId: event.payload?.payment?.entity?.id,
    });

    // Handle different webhook events
    switch (event.event) {
      case 'payment.captured': {
        // Payment successful
        const paymentEntity = event.payload.payment.entity;
        logger.info('✅ [RAZORPAY WEBHOOK] Payment captured:', paymentEntity.id);

        // Find order by Razorpay order ID (stored in notes or as gatewayOrderId)
        const razorpayOrderId = paymentEntity.order_id;
        const order = await Order.findOne({
          $or: [
            { 'paymentGateway.gatewayOrderId': razorpayOrderId },
            { 'payment.transactionId': razorpayOrderId }
          ]
        });

        if (order) {
          // Update order payment status
          order.payment.status = 'paid';
          order.payment.transactionId = paymentEntity.id;
          order.payment.paidAt = new Date();
          order.totals.paidAmount = paymentEntity.amount / 100; // Convert paise to rupees

          // Update payment gateway details
          if (!order.paymentGateway) {
            order.paymentGateway = {} as any;
          }
          order.paymentGateway!.gatewayPaymentId = paymentEntity.id;
          order.paymentGateway!.amountPaid = paymentEntity.amount / 100;
          order.paymentGateway!.paidAt = new Date();
          order.paymentGateway!.gateway = 'razorpay';

          // Update order status to confirmed
          if (order.status === 'placed') {
            order.status = 'confirmed';
            order.timeline.push({
              status: 'confirmed',
              message: 'Payment received and order confirmed',
              timestamp: new Date()
            });
          }

          await order.save();
          logger.info('✅ [RAZORPAY WEBHOOK] Order updated:', order.orderNumber);
        } else {
          logger.warn('⚠️ [RAZORPAY WEBHOOK] Order not found for Razorpay order:', razorpayOrderId);
        }
        break;
      }

      case 'payment.failed': {
        // Payment failed
        const failedPayment = event.payload.payment.entity;
        logger.info('❌ [RAZORPAY WEBHOOK] Payment failed:', failedPayment.id);

        const razorpayOrderId = failedPayment.order_id;
        const order = await Order.findOne({
          $or: [
            { 'paymentGateway.gatewayOrderId': razorpayOrderId },
            { 'payment.transactionId': razorpayOrderId }
          ]
        });

        if (order) {
          order.payment.status = 'failed';
          order.payment.failureReason = failedPayment.error_description || 'Payment failed';

          order.timeline.push({
            status: 'payment_failed',
            message: `Payment failed: ${failedPayment.error_description || 'Unknown error'}`,
            timestamp: new Date()
          });

          await order.save();
          logger.info('✅ [RAZORPAY WEBHOOK] Order marked as payment failed:', order.orderNumber);
        }
        break;
      }

      case 'refund.created': {
        // Refund created
        const refundEntity = event.payload.refund.entity;
        logger.info('💰 [RAZORPAY WEBHOOK] Refund created:', refundEntity.id);

        const paymentId = refundEntity.payment_id;
        const order = await Order.findOne({
          $or: [
            { 'paymentGateway.gatewayPaymentId': paymentId },
            { 'payment.transactionId': paymentId }
          ]
        }).lean();

        if (order) {
          const refundAmount = refundEntity.amount / 100;
          order.payment.status = 'refunded';
          order.payment.refundId = refundEntity.id;
          order.payment.refundedAt = new Date();
          order.totals.refundAmount = (order.totals.refundAmount || 0) + refundAmount;

          if (order.paymentGateway) {
            order.paymentGateway.refundId = refundEntity.id;
            order.paymentGateway.refundedAt = new Date();
            order.paymentGateway.refundAmount = refundAmount;
          }

          order.timeline.push({
            status: 'refunded',
            message: `Refund of ₹${refundAmount} processed`,
            timestamp: new Date()
          });

          await order.save();
          logger.info('✅ [RAZORPAY WEBHOOK] Order refund recorded:', order.orderNumber);
        }
        break;
      }

      default:
        logger.info('ℹ️ [RAZORPAY WEBHOOK] Unhandled event:', event.event);
    }

    // Always return 200 to acknowledge webhook receipt
    res.status(200).json({ received: true });

  } catch (error: any) {
    logger.error('❌ [RAZORPAY WEBHOOK] Processing error:', error);
    // Still return 200 to avoid Razorpay retrying
    res.status(200).json({ received: true, error: error.message });
  }
});

/**
 * @desc Create a refund for a Razorpay payment
 * @route POST /api/razorpay/refund
 * @access Private (Admin only ideally)
 */
export const createRazorpayRefund = asyncHandler(async (req: Request, res: Response) => {
  const { paymentId, amount, notes } = req.body;

  if (!paymentId) {
    return sendBadRequest(res, 'Payment ID is required');
  }

  try {
    const refund = await razorpayService.createRefund(paymentId, amount, notes);

    logger.info('✅ [RAZORPAY CONTROLLER] Refund created:', refund.id);

    const refundAmountInRupees = refund.amount ? Number(refund.amount) / 100 : 0;

    sendSuccess(res, {
      refundId: refund.id,
      paymentId: refund.payment_id,
      amount: refundAmountInRupees,
      status: refund.status,
    }, 'Refund created successfully');

  } catch (error: any) {
    logger.error('❌ [RAZORPAY CONTROLLER] Refund creation error:', error);
    sendError(res, error.message || 'Failed to create refund', 500);
  }
});

