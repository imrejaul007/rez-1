/**
 * Travel Payment Controller
 *
 * Handles both Razorpay and Stripe payment creation/verification for travel bookings (ServiceBooking).
 * Supports multi-currency: INR (Razorpay or Stripe), AED/USD/EUR/GBP (Stripe only).
 * Mirrors paymentController.ts dual-gateway pattern but works with ServiceBooking instead of Order.
 */

import { Request, Response } from 'express';
import { logger } from '../config/logger';
import { ServiceBooking } from '../models/ServiceBooking';
import paymentService from '../services/PaymentService';
import stripeService from '../services/stripeService';
import travelCashbackService from '../services/travelCashbackService';
import { asyncHandler } from '../utils/asyncHandler';
import {
  sendSuccess,
  sendBadRequest,
  sendNotFound,
} from '../utils/response';
import {
  verifyPaymentDataCompleteness,
  sanitizePaymentData
} from '../utils/razorpayUtils';

// Currencies that only support Stripe (Razorpay is INR-only)
const STRIPE_ONLY_CURRENCIES = ['AED', 'USD', 'EUR', 'GBP', 'CAD', 'AUD'];
const SUPPORTED_CURRENCIES = ['INR', ...STRIPE_ONLY_CURRENCIES];

/**
 * Create Razorpay order for travel booking payment
 * POST /api/travel-payment/create-order
 */
export const createTravelPaymentOrder = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { bookingId, amount, currency = 'INR' } = req.body;

  logger.info('💳 [TRAVEL-PAYMENT] Creating payment order:', { bookingId, amount, currency, userId });

  if (!bookingId || !amount) {
    return sendBadRequest(res, 'Booking ID and amount are required');
  }

  // Verify booking belongs to user
  const booking = await ServiceBooking.findOne({ _id: bookingId, user: userId }).lean();
  if (!booking) {
    return sendNotFound(res, 'Booking not found');
  }

  // Check if booking is in correct status for payment
  if (booking.paymentStatus === 'paid') {
    return sendBadRequest(res, 'Payment already completed for this booking');
  }
  if (booking.status === 'cancelled') {
    return sendBadRequest(res, 'Cannot pay for a cancelled booking');
  }

  // Server-side price validation: reject if amount doesn't match booking total
  const bookingTotal = booking.pricing.total;
  const discrepancy = Math.abs(amount - bookingTotal) / bookingTotal;
  if (discrepancy > 0.05) {
    logger.error(`❌ [TRAVEL-PAYMENT] Price mismatch: requested ₹${amount}, booking total ₹${bookingTotal} (${(discrepancy * 100).toFixed(1)}% discrepancy)`);
    return sendBadRequest(res, 'Payment amount does not match booking total');
  }

  // Create Razorpay order (reuses existing PaymentService)
  const razorpayOrder = await paymentService.createPaymentOrder(
    bookingId,
    Math.round(bookingTotal * 100), // Razorpay expects amount in paise
    currency
  );

  const response = {
    razorpayOrderId: razorpayOrder.id,
    razorpayKeyId: paymentService.getRazorpayKeyId(),
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    bookingId: bookingId,
    bookingNumber: booking.bookingNumber,
  };

  logger.info('✅ [TRAVEL-PAYMENT] Payment order created for booking:', booking.bookingNumber);
  sendSuccess(res, response, 'Payment order created successfully', 201);
});

/**
 * Verify Razorpay payment signature for travel booking
 * POST /api/travel-payment/verify
 */
export const verifyTravelPayment = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const {
    bookingId,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  } = req.body;

  const sanitizedData = sanitizePaymentData({
    orderId: bookingId,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  });

  logger.info('🔐 [TRAVEL-PAYMENT] Verifying payment:', { ...sanitizedData, userId });

  // Validate completeness
  const dataValidation = verifyPaymentDataCompleteness({
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  });

  if (!dataValidation.isValid) {
    return sendBadRequest(res, dataValidation.error || 'Invalid payment verification data');
  }

  if (!bookingId) {
    return sendBadRequest(res, 'Booking ID is required');
  }

  // Verify booking belongs to user
  const booking = await ServiceBooking.findOne({ _id: bookingId, user: userId })
    .populate('serviceCategory', 'name slug').lean();
  if (!booking) {
    return sendNotFound(res, 'Booking not found');
  }

  // Double-payment prevention
  if (booking.paymentStatus === 'paid') {
    return sendSuccess(res, {
      verified: true,
      booking: booking,
      message: 'Payment already verified'
    }, 'Payment already completed');
  }

  // Verify Razorpay signature
  const isValidSignature = paymentService.verifyPaymentSignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  );

  if (!isValidSignature) {
    logger.error('❌ [TRAVEL-PAYMENT] Invalid payment signature for booking:', booking.bookingNumber);

    // Mark payment as failed
    booking.paymentStatus = 'failed';
    booking.statusHistory.push({
      status: 'payment_failed',
      timestamp: new Date(),
      note: 'Razorpay signature verification failed',
    });
    await booking.save();

    return sendBadRequest(res, 'Payment verification failed - Invalid signature');
  }

  // Payment verified — update booking
  booking.paymentStatus = 'paid';
  booking.paymentId = razorpay_payment_id;
  booking.paymentMethod = 'online';
  booking.status = 'confirmed';
  booking.confirmedAt = new Date();
  booking.statusHistory.push({
    status: 'confirmed',
    timestamp: new Date(),
    note: `Payment verified (${razorpay_payment_id}). Booking confirmed.`,
  });
  await booking.save();

  // Hold cashback (sets cashbackStatus from 'pending' to 'held')
  try {
    await travelCashbackService.holdCashback(bookingId);
  } catch (holdError) {
    // Non-blocking — booking is still confirmed even if cashback hold fails
    logger.error('⚠️ [TRAVEL-PAYMENT] Failed to hold cashback (non-blocking):', holdError);
  }

  logger.info(`✅ [TRAVEL-PAYMENT] Payment verified for booking ${booking.bookingNumber}`);

  sendSuccess(res, {
    verified: true,
    booking: booking,
  }, 'Payment verified successfully');
});

// ==================== STRIPE ENDPOINTS ====================

/**
 * Create Stripe checkout session for travel booking payment
 * POST /api/travel-payment/create-checkout-session
 */
export const createTravelStripeSession = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { bookingId, amount, currency = 'INR', successUrl, cancelUrl } = req.body;

  logger.info('💳 [TRAVEL-PAYMENT] Creating Stripe checkout session:', { bookingId, amount, currency, userId });

  if (!bookingId || !amount) {
    return sendBadRequest(res, 'Booking ID and amount are required');
  }

  if (!successUrl || !cancelUrl) {
    return sendBadRequest(res, 'Success URL and Cancel URL are required');
  }

  // Validate currency
  const upperCurrency = currency.toUpperCase();
  if (!SUPPORTED_CURRENCIES.includes(upperCurrency)) {
    return sendBadRequest(res, `Unsupported currency: ${currency}. Supported: ${SUPPORTED_CURRENCIES.join(', ')}`);
  }

  // Check if Stripe is configured
  if (!stripeService.isStripeConfigured()) {
    return sendBadRequest(res, 'Stripe is not configured on the server');
  }

  // Verify booking belongs to user
  const booking = await ServiceBooking.findOne({ _id: bookingId, user: userId })
    .populate('service', 'name').lean();
  if (!booking) {
    return sendNotFound(res, 'Booking not found');
  }

  if (booking.paymentStatus === 'paid') {
    return sendBadRequest(res, 'Payment already completed for this booking');
  }
  if (booking.status === 'cancelled') {
    return sendBadRequest(res, 'Cannot pay for a cancelled booking');
  }

  // Server-side price validation
  const bookingTotal = booking.pricing.total;
  const discrepancy = Math.abs(amount - bookingTotal) / bookingTotal;
  if (discrepancy > 0.05) {
    logger.error(`❌ [TRAVEL-PAYMENT] Stripe price mismatch: requested ${amount}, booking total ${bookingTotal}`);
    return sendBadRequest(res, 'Payment amount does not match booking total');
  }

  // Create Stripe checkout session using the order method
  const serviceName = (booking.service as any)?.name || 'Travel Booking';
  const session = await stripeService.createCheckoutSessionForOrder({
    orderId: bookingId,
    amount: bookingTotal,
    currency: upperCurrency.toLowerCase(),
    successUrl,
    cancelUrl,
    items: [{
      name: serviceName,
      description: `Booking #${booking.bookingNumber}`,
      amount: bookingTotal,
      quantity: 1,
      itemType: 'service',
    }],
    metadata: {
      type: 'travel_booking',
      bookingId: bookingId,
      bookingNumber: booking.bookingNumber,
      userId: userId.toString(),
    },
  });

  logger.info('✅ [TRAVEL-PAYMENT] Stripe checkout session created:', session.id);

  sendSuccess(res, {
    sessionId: session.id,
    url: session.url,
    bookingId,
    bookingNumber: booking.bookingNumber,
    amount: bookingTotal,
    currency: upperCurrency,
  }, 'Stripe checkout session created successfully', 201);
});

/**
 * Verify Stripe checkout session for travel booking
 * POST /api/travel-payment/verify-stripe-session
 */
export const verifyTravelStripeSession = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { sessionId, bookingId } = req.body;

  logger.info('🔐 [TRAVEL-PAYMENT] Verifying Stripe session:', { sessionId, bookingId, userId });

  if (!sessionId) {
    return sendBadRequest(res, 'Session ID is required');
  }
  if (!bookingId) {
    return sendBadRequest(res, 'Booking ID is required');
  }

  // Check if Stripe is configured
  if (!stripeService.isStripeConfigured()) {
    return sendBadRequest(res, 'Stripe is not configured on the server');
  }

  // Verify booking belongs to user
  const booking = await ServiceBooking.findOne({ _id: bookingId, user: userId })
    .populate('serviceCategory', 'name slug').lean();
  if (!booking) {
    return sendNotFound(res, 'Booking not found');
  }

  // Double-payment prevention
  if (booking.paymentStatus === 'paid') {
    return sendSuccess(res, {
      verified: true,
      booking,
      message: 'Payment already verified',
    }, 'Payment already completed');
  }

  // Verify Stripe checkout session
  const verification = await stripeService.verifyCheckoutSession(sessionId);

  if (!verification.verified) {
    logger.error('❌ [TRAVEL-PAYMENT] Stripe payment not completed:', verification.paymentStatus);

    booking.paymentStatus = 'failed';
    booking.statusHistory.push({
      status: 'payment_failed',
      timestamp: new Date(),
      note: `Stripe payment not completed. Status: ${verification.paymentStatus}`,
    });
    await booking.save();

    return sendBadRequest(res, `Payment not completed. Status: ${verification.paymentStatus}`);
  }

  // Payment verified — update booking
  booking.paymentStatus = 'paid';
  booking.paymentId = verification.paymentIntentId || sessionId;
  booking.paymentMethod = 'online';
  booking.status = 'confirmed';
  booking.confirmedAt = new Date();
  booking.statusHistory.push({
    status: 'confirmed',
    timestamp: new Date(),
    note: `Stripe payment verified (${verification.paymentIntentId || sessionId}). Booking confirmed.`,
  });
  await booking.save();

  // Hold cashback
  try {
    await travelCashbackService.holdCashback(bookingId);
  } catch (holdError) {
    logger.error('⚠️ [TRAVEL-PAYMENT] Failed to hold cashback (non-blocking):', holdError);
  }

  logger.info(`✅ [TRAVEL-PAYMENT] Stripe payment verified for booking ${booking.bookingNumber}`);

  sendSuccess(res, {
    verified: true,
    booking,
    paymentDetails: {
      amount: verification.amount,
      currency: verification.currency,
      paymentIntentId: verification.paymentIntentId,
    },
  }, 'Stripe payment verified successfully');
});

/**
 * Get supported payment gateways for a given currency
 * GET /api/travel-payment/gateways?currency=INR
 */
export const getTravelPaymentGateways = asyncHandler(async (req: Request, res: Response) => {
  const { currency = 'INR' } = req.query;
  const upperCurrency = (currency as string).toUpperCase();

  const gateways: Array<{ id: string; name: string; isAvailable: boolean }> = [];

  // Stripe is available for all supported currencies
  if (stripeService.isStripeConfigured() && SUPPORTED_CURRENCIES.includes(upperCurrency)) {
    gateways.push({ id: 'stripe', name: 'Stripe', isAvailable: true });
  }

  // Razorpay is only available for INR
  if (upperCurrency === 'INR') {
    gateways.push({ id: 'razorpay', name: 'Razorpay', isAvailable: true });
  }

  sendSuccess(res, {
    currency: upperCurrency,
    gateways,
    defaultGateway: STRIPE_ONLY_CURRENCIES.includes(upperCurrency) ? 'stripe' : (stripeService.isStripeConfigured() ? 'stripe' : 'razorpay'),
  }, 'Payment gateways fetched');
});
