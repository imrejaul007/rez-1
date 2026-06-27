/// <reference path="../types/razorpay-extended.d.ts" />
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { Order, IOrder } from '../models/Order';
import { Product } from '../models/Product';
import { Cart } from '../models/Cart';
import { User } from '../models/User';
// Note: StorePromoCoin removed - using wallet.brandedCoins instead
import { Wallet } from '../models/Wallet';
import coinService from './coinService';
import { toPaise, pct, round2 } from '../utils/currency';
import { razorpayCircuit } from '../utils/circuitBreaker';
import merchantWalletService from './merchantWalletService';
import mongoose, { Types } from 'mongoose';
import stockSocketService from './stockSocketService';
import { logger } from '../config/logger';
import { SMSService } from './SMSService';
import EmailService from './EmailService';
import {
  IRazorpayOrderRequest,
  IRazorpayOrder,
  IRazorpayPaymentVerification,
  IPaymentGatewayDetails,
  IRefundRequest,
  IRefundResponse
} from '../types/payment';
import {
  validateRazorpayPaymentSignature,
  validateRazorpayWebhookSignature,
  verifyPaymentDataCompleteness,
  validateRazorpayConfiguration,
  logPaymentVerificationAttempt,
  sanitizePaymentData,
  RAZORPAY_CONSTANTS
} from '../utils/razorpayUtils';
import { PaymentLogger } from './logging/paymentLogger';
import stripeService from './stripeService';
import orderSocketService, { CoinsAwardedPayload, MerchantWalletUpdatedPayload } from './orderSocketService';
// Wallet already imported above

// Initialize Razorpay instance conditionally
let razorpayInstance: Razorpay | null = null;

// Validate Razorpay configuration on startup
const configValidation = validateRazorpayConfiguration();
if (configValidation.isValid) {
  razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!
  });
  logger.info('✅ [PAYMENT SERVICE] Razorpay initialized successfully');

  // Log warnings if any
  if (configValidation.warnings.length > 0) {
    configValidation.warnings.forEach(warning => {
      logger.warn(`⚠️ [PAYMENT SERVICE] ${warning}`);
    });
  }
} else {
  logger.error('❌ [PAYMENT SERVICE] Razorpay configuration invalid. Missing:', configValidation.missingVars.join(', '));
  logger.warn('⚠️ [PAYMENT SERVICE] Payment features will be disabled');
}

class PaymentService {
  /**
   * Create a Razorpay order for payment
   * @param orderId MongoDB Order ID
   * @param amount Amount in rupees
   * @param currency Currency (default: INR)
   * @returns Razorpay order details
   */
  async createPaymentOrder(
    orderId: string,
    amount: number,
    currency: string = 'INR'
  ): Promise<IRazorpayOrder> {
    try {
      logger.info('💳 [PAYMENT SERVICE] Creating Razorpay order:', {
        orderId,
        amount,
        currency
      });

      // Check if Razorpay is configured
      if (!razorpayInstance) {
        throw new Error('Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
      }

      // FIX [HIGH-5]: Validate currency is INR (Razorpay only supports INR)
      if (currency !== 'INR') {
        logger.error('❌ [PAYMENT SERVICE] Invalid currency for Razorpay:', currency);
        throw new Error(`Razorpay only supports INR currency. Received: ${currency}`);
      }

      // Fetch order to get order number
      const order = await Order.findById(orderId).lean();
      if (!order) {
        throw new Error('Order not found');
      }

      // Validate payment amount matches order total (prevent underpayment/overpayment)
      const orderTotal = order.totals?.total ?? 0;
      if (Math.abs(amount - orderTotal) > 1) {
        logger.error('❌ [PAYMENT SERVICE] Amount mismatch:', { requested: amount, orderTotal });
        throw new Error(`Payment amount ₹${amount} does not match order total ₹${orderTotal}`);
      }

      // Convert amount to paise (smallest currency unit)
      const amountInPaise = toPaise(amount);

      const orderOptions: IRazorpayOrderRequest = {
        amount: amountInPaise,
        currency: currency,
        receipt: order.orderNumber,
        notes: {
          orderId: orderId,
          orderNumber: order.orderNumber,
          userId: order.user.toString()
        },
        payment_capture: 1 // Auto capture payment
        // FIX [HIGH-1]: Add idempotency key to prevent duplicate orders on network retry
      };

      // FIX [HIGH-1]: Add idempotency key to prevent duplicate Razorpay orders on network failures
      // Use orderId + timestamp to ensure uniqueness while being deterministic for retries
      const idempotencyKey = `order_${orderId}_${Date.now()}`;
      (orderOptions as any).idempotency_key = idempotencyKey;

      // Create Razorpay order (circuit breaker protects against cascade failures)
      const razorpayOrder = await razorpayCircuit.exec(() =>
        razorpayInstance!.orders.create(orderOptions)
      );

      logger.info('✅ [PAYMENT SERVICE] Razorpay order created:', razorpayOrder.id);

      // Update order with gateway details
      order.payment.paymentGateway = 'razorpay';
      await order.save();

      return razorpayOrder as unknown as IRazorpayOrder;
    } catch (error: any) {
      logger.error('❌ [PAYMENT SERVICE] Error creating Razorpay order:', error);
      throw new Error(`Failed to create payment order: ${error.message}`);
    }
  }

  /**
   * Verify Razorpay payment signature
   * @param orderId Razorpay order ID
   * @param paymentId Razorpay payment ID
   * @param signature Razorpay signature
   * @returns true if signature is valid
   */
  verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string
  ): boolean {
    try {
      logger.info('🔐 [PAYMENT SERVICE] Verifying payment signature:', {
        orderId,
        paymentId,
        timestamp: new Date().toISOString()
      });

      // Validate that Razorpay is configured
      const secret = process.env.RAZORPAY_KEY_SECRET || '';
      if (!secret || secret === 'your_razorpay_key_secret_here') {
        logger.error('❌ [PAYMENT SERVICE] Razorpay secret not configured');
        PaymentLogger.logPaymentFailure(paymentId, 'unknown', 0, new Error('Razorpay not configured'), 'Configuration error');
        return false;
      }

      // Use the utility function for signature validation
      const validationResult = validateRazorpayPaymentSignature(
        orderId,
        paymentId,
        signature,
        secret
      );

      if (validationResult.isValid) {
        logger.info('✅ [PAYMENT SERVICE] Signature verified successfully');
        PaymentLogger.logPaymentProcessing(paymentId, 'system', 0);
      } else {
        logger.error('❌ [PAYMENT SERVICE] Signature verification failed:', validationResult.error);
        PaymentLogger.logPaymentFailure(
          paymentId,
          'unknown',
          0,
          new Error(validationResult.error || 'Invalid signature'),
          'Signature verification failed'
        );
      }

      return validationResult.isValid;
    } catch (error: any) {
      logger.error('❌ [PAYMENT SERVICE] Error verifying signature:', error);
      PaymentLogger.logPaymentFailure(paymentId, 'unknown', 0, error, 'Signature verification exception');
      return false;
    }
  }

  /**
   * Handle successful payment - Update order and deduct stock
   * @param orderId MongoDB Order ID
   * @param paymentDetails Payment details from Razorpay
   */
  async handlePaymentSuccess(
    orderId: string,
    paymentDetails: IRazorpayPaymentVerification
  ): Promise<IOrder> {
    // ATOMIC IDEMPOTENCY GUARD — Only one concurrent caller can claim this order.
    // Uses findOneAndUpdate with status condition BEFORE starting the transaction.
    const claimedOrder = await Order.findOneAndUpdate(
      { _id: orderId, 'payment.status': { $ne: 'paid' } },
      { $set: { 'payment.status': 'processing' } },
      { new: true }
    );

    if (!claimedOrder) {
      // Either not found or already paid/processing by another webhook
      const existing = await Order.findById(orderId).lean();
      if (existing && (existing.payment.status === 'paid' || existing.payment.status === 'processing')) {
        logger.info('⚠️ [PAYMENT SERVICE] Payment already processed/processing for order:', orderId);
        return existing as unknown as IOrder;
      }
      throw new Error('Order not found');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      logger.info('✅ [PAYMENT SERVICE] Processing successful payment for order:', orderId);

      // SECURITY: Refuse to process payment if the buyer's wallet is frozen.
      // A frozen wallet means the account is under fraud review or compliance
      // hold — proceeding with cashback / loyalty crediting here would defeat
      // the freeze. We let the payment succeed (the merchant gets paid) but
      // skip the wallet crediting and record a flagged ledger entry.
      let walletFrozen = false;
      const buyerWallet = await Wallet.findOne({ user: claimedOrder.user })
        .select('isFrozen isActive')
        .session(session)
        .lean();
      if (buyerWallet?.isFrozen || buyerWallet?.isActive === false) {
        walletFrozen = true;
        logger.warn('🚨 [PAYMENT SERVICE] Buyer wallet is frozen/inactive — skipping cashback crediting', {
          orderId,
          userId: claimedOrder.user.toString(),
          isFrozen: buyerWallet.isFrozen,
          isActive: buyerWallet.isActive,
        });
      }

      // Log payment processing start
      PaymentLogger.logPaymentProcessing(
        paymentDetails.razorpay_payment_id,
        orderId,
        0,
        paymentDetails.razorpay_order_id
      );

      // Re-fetch order inside session for transactional consistency
      const order = await Order.findById(orderId).session(session);
      if (!order) {
        throw new Error('Order not found in session');
      }

      // Update payment status to paid
      order.payment.status = 'paid';
      order.payment.transactionId = paymentDetails.razorpay_payment_id;
      order.payment.paidAt = new Date();
      order.payment.method = 'razorpay'; // FIX [LOW-3]: Always set payment method when recording transactions
      order.totals.paidAmount = order.totals.total;

      // Store gateway details (using custom field if needed)
      (order as any).paymentGateway = {
        gatewayOrderId: paymentDetails.razorpay_order_id,
        gatewayPaymentId: paymentDetails.razorpay_payment_id,
        gatewaySignature: paymentDetails.razorpay_signature,
        gateway: 'razorpay',
        currency: 'INR',
        amountPaid: order.totals.total,
        paidAt: new Date()
      };

      // Add timeline entry
      order.timeline.push({
        status: 'payment_success',
        message: 'Payment completed successfully',
        timestamp: new Date()
      });

      logger.info('📦 [PAYMENT SERVICE] Deducting stock for order items...');

      // Deduct stock for each item (this is where stock deduction happens)
      const stockEmissions: Array<{
        productId: string;
        storeId: string;
        newStock: number;
        productName: string;
      }> = [];

      for (const orderItem of order.items) {
        const productId = orderItem.product;
        const quantity = orderItem.quantity;
        const variant = orderItem.variant;

        logger.info('📦 [PAYMENT SERVICE] Deducting stock for:', {
          productId,
          quantity,
          variant
        });

        let updateQuery: any = {};
        let stockCheckQuery: any = { _id: productId };

        if (variant) {
          // Variant stock deduction
          updateQuery = {
            $inc: {
              'inventory.variants.$[variant].stock': -quantity
            }
          };
          stockCheckQuery['inventory.variants'] = {
            $elemMatch: {
              type: variant.type,
              value: variant.value,
              stock: { $gte: quantity }
            }
          };

          const updatedProduct = await Product.findOneAndUpdate(
            stockCheckQuery,
            updateQuery,
            {
              session,
              new: true,
              arrayFilters: [
                {
                  'variant.type': variant.type,
                  'variant.value': variant.value
                }
              ]
            }
          );

          if (!updatedProduct) {
            throw new Error(
              `Insufficient stock for product ${orderItem.name} (${variant.type}: ${variant.value})`
            );
          }

          const newStock = updatedProduct.inventory?.stock ?? 0;
          const storeId = (updatedProduct.store as any)?.toString() || '';
          stockEmissions.push({
            productId: updatedProduct._id.toString(),
            storeId,
            newStock,
            productName: updatedProduct.name || 'Unknown Product'
          });

          logger.info('✅ [PAYMENT SERVICE] Variant stock deducted');
        } else {
          // Main product stock deduction
          stockCheckQuery['inventory.stock'] = { $gte: quantity };
          updateQuery = {
            $inc: {
              'inventory.stock': -quantity
            }
          };

          const updatedProduct = await Product.findOneAndUpdate(
            stockCheckQuery,
            updateQuery,
            {
              session,
              new: true
            }
          );

          if (!updatedProduct) {
            throw new Error(`Insufficient stock for product ${orderItem.name}`);
          }

          // Set isAvailable to false if stock becomes 0
          if (updatedProduct.inventory && updatedProduct.inventory.stock === 0) {
            updatedProduct.inventory.isAvailable = false;
            await updatedProduct.save({ session });
          }

          const newStock = updatedProduct.inventory?.stock ?? 0;
          const storeId = (updatedProduct.store as any)?.toString() || '';
          stockEmissions.push({
            productId: updatedProduct._id.toString(),
            storeId,
            newStock,
            productName: updatedProduct.name || 'Unknown Product'
          });

          logger.info('✅ [PAYMENT SERVICE] Product stock deducted');
        }
      }

      // Update order status to confirmed
      order.status = 'confirmed';
      order.timeline.push({
        status: 'confirmed',
        message: 'Order confirmed after payment',
        timestamp: new Date()
      });

      await order.save({ session });

      // Clear user's cart after successful payment
      // Deduct coins if they were used in this order
      logger.info('💰 [PAYMENT SERVICE] Checking coinsUsed on order:', JSON.stringify(order.payment.coinsUsed));
      if (order.payment.coinsUsed) {
        // Support both rezCoins (new) and wasilCoins (legacy) field names
        const rezCoins = (order.payment.coinsUsed as any).rezCoins || (order.payment.coinsUsed as any).wasilCoins || 0;
        const promoCoins = (order.payment.coinsUsed as any).promoCoins || 0;
        const storePromoCoins = (order.payment.coinsUsed as any).storePromoCoins || 0;
        const userId = order.user as Types.ObjectId;

        // Deduct REZ coins via coinService (handles atomic $inc + CoinTransaction + LedgerEntry)
        if (rezCoins && rezCoins > 0) {
          try {
            logger.info('💰 [PAYMENT SERVICE] Deducting REZ coins:', rezCoins);
            await coinService.deductCoins(
              userId.toString(),
              rezCoins,
              'purchase',
              `Order payment: ${order.orderNumber}`,
              { orderId: order._id, orderNumber: order.orderNumber, paymentMethod: 'online' }
            );
            logger.info('✅ [PAYMENT SERVICE] REZ coins deducted successfully:', rezCoins);
          } catch (coinError) {
            logger.error('❌ [PAYMENT SERVICE] Failed to deduct REZ coins:', coinError);
            // Don't fail payment if coin deduction fails - coins already validated
          }
        }

        // Deduct promo coins via walletService.debit (handles CoinTransaction + LedgerEntry)
        if (promoCoins && promoCoins > 0) {
          try {
            logger.info('💰 [PAYMENT SERVICE] Deducting promo coins:', promoCoins);
            const { walletService } = await import('./walletService');
            await walletService.debit({
              userId: userId.toString(),
              amount: promoCoins,
              source: 'purchase',
              description: `Promo coins for order ${order.orderNumber}`,
              operationType: 'payment',
              referenceId: String(order._id),
              referenceModel: 'Order',
              coinType: 'promo',
              metadata: { orderId: order._id, orderNumber: order.orderNumber, paymentMethod: 'online' },
            });
            logger.info('✅ [PAYMENT SERVICE] Promo coins deducted:', promoCoins);
          } catch (coinError) {
            logger.error('❌ [PAYMENT SERVICE] Failed to deduct promo coins:', coinError);
          }
        }

        // Deduct store branded coins (atomic findOneAndUpdate, no instance method needed)
        if (storePromoCoins && storePromoCoins > 0) {
          try {
            const firstItem = order.items[0];
            const storeId = typeof firstItem.store === 'object'
              ? (firstItem.store as any)._id
              : firstItem.store;

            if (storeId) {
              logger.info('💰 [PAYMENT SERVICE] Deducting branded coins:', storePromoCoins);
              const wallet = await Wallet.findOne({ user: userId });
              if (wallet) {
                await wallet.useBrandedCoins(
                  new Types.ObjectId(storeId.toString()),
                  storePromoCoins
                );
                logger.info('✅ [PAYMENT SERVICE] Branded coins deducted successfully:', storePromoCoins);
              }
            }
          } catch (coinError) {
            logger.error('❌ [PAYMENT SERVICE] Failed to deduct branded coins:', coinError);
            // Don't fail payment if coin deduction fails - coins already validated
          }
        }
        // Ledger entries are now handled internally by coinService.deductCoins / walletService.debit
      }

      const cart = await Cart.findOne({ user: order.user }).session(session);
      if (cart) {
        cart.items = [];
        cart.totals = {
          subtotal: 0,
          tax: 0,
          delivery: 0,
          discount: 0,
          cashback: 0,
          total: 0,
          savings: 0
        };
        await cart.save({ session });
        logger.info('🛒 [PAYMENT SERVICE] Cart cleared after successful payment');
      }

      // Create ServiceBooking records for service items in the order
      const serviceBookings: any[] = [];
      for (const orderItem of order.items) {
        if ((orderItem as any).itemType === 'service' && (orderItem as any).serviceBookingDetails) {
          try {
            logger.info('📅 [PAYMENT SERVICE] Creating ServiceBooking for service item:', orderItem.name);

            const { ServiceBooking } = require('../models/ServiceBooking');
            const serviceBookingDetails = (orderItem as any).serviceBookingDetails;

            // Generate booking number
            const bookingNumber = await ServiceBooking.generateBookingNumber();

            // Get user info for customer details
            let user = order.user as any;
            if (typeof user === 'string' || user instanceof mongoose.Types.ObjectId) {
              user = await User.findById(user).lean();
            }

            const customerName = serviceBookingDetails.customerName ||
              (user?.profile?.firstName ? `${user.profile.firstName} ${user.profile.lastName || ''}`.trim() : 'Customer');
            const customerPhone = serviceBookingDetails.customerPhone || user?.phoneNumber || '';
            const customerEmail = serviceBookingDetails.customerEmail || user?.email;

            // Create service booking
            const booking = new ServiceBooking({
              bookingNumber,
              user: order.user,
              service: orderItem.product,
              store: orderItem.store,
              customerName,
              customerPhone,
              customerEmail,
              bookingDate: serviceBookingDetails.bookingDate,
              timeSlot: serviceBookingDetails.timeSlot,
              duration: serviceBookingDetails.duration || 60,
              serviceType: serviceBookingDetails.serviceType || 'store',
              pricing: {
                basePrice: orderItem.price,
                total: orderItem.subtotal,
                currency: 'INR'
              },
              paymentStatus: 'paid',
              paymentMethod: order.payment.method,
              customerNotes: serviceBookingDetails.customerNotes,
              status: 'confirmed',
              orderId: order._id
            });

            await booking.save({ session });

            // Update order item with service booking ID
            (orderItem as any).serviceBookingId = booking._id;

            serviceBookings.push(booking);
            logger.info('✅ [PAYMENT SERVICE] ServiceBooking created:', booking.bookingNumber);
          } catch (bookingError) {
            logger.error('❌ [PAYMENT SERVICE] Error creating ServiceBooking:', bookingError);
            // Don't fail payment if booking creation fails - log and continue
          }
        }
      }

      // Save order with updated serviceBookingIds
      if (serviceBookings.length > 0) {
        await order.save({ session });
        logger.info('📅 [PAYMENT SERVICE] Created', serviceBookings.length, 'service booking(s)');
      }

      // Commit transaction
      await session.commitTransaction();
      session.endSession();

      logger.info('✅ [PAYMENT SERVICE] Payment processed and stock deducted successfully');

      // Log successful payment completion
      PaymentLogger.logPaymentSuccess(
        paymentDetails.razorpay_payment_id,
        order.user.toString(),
        order.totals.total,
        'razorpay',
        paymentDetails.razorpay_order_id
      );

      // Emit socket events for stock updates
      for (const emission of stockEmissions) {
        try {
          logger.info('🔌 [PAYMENT SERVICE] Emitting stock update via Socket.IO:', emission);
          stockSocketService.emitStockUpdate(emission.productId, emission.newStock, {
            storeId: emission.storeId,
            reason: 'purchase'
          });
        } catch (socketError) {
          logger.error('❌ [PAYMENT SERVICE] Socket emission failed:', socketError);
        }
      }

      // Send payment received SMS notification
      try {
        logger.info('📱 [PAYMENT SERVICE] Sending payment received notification...');

        // Get user details
        let user = order.user as any;
        if (typeof user === 'string' || user instanceof mongoose.Types.ObjectId) {
          user = await User.findById(user).lean();
        }

        const userPhone = user?.profile?.phoneNumber || user?.phoneNumber || user?.phone;
        const orderNumber = order.orderNumber || (order._id as any).toString();
        const amount = order.totals.total || 0;

        if (userPhone) {
          await SMSService.sendPaymentReceived(userPhone, orderNumber, amount);
          logger.info('✅ [PAYMENT SERVICE] Payment received SMS sent successfully');
        }
      } catch (notificationError) {
        logger.error('❌ [PAYMENT SERVICE] Error sending payment notification:', notificationError);
        // Don't fail the payment if notification fails
      }

      // ========================================
      // POST-PAYMENT NOTE
      // ========================================
      // Merchant wallet credit, admin commission, and purchase reward coins
      // are all awarded on DELIVERY (see orderController.ts updateOrderStatus).
      // This ensures money only moves after the customer receives their order.

      return order;
    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();
      logger.error('❌ [PAYMENT SERVICE] Error processing payment success:', error);

      // Reset payment status from 'processing' back to 'pending_payment' so it can be retried
      try {
        await Order.findByIdAndUpdate(orderId, {
          $set: { 'payment.status': 'pending_payment' }
        });
      } catch (resetError) {
        logger.error('❌ [PAYMENT SERVICE] Failed to reset payment status:', resetError);
      }

      // Log payment failure
      PaymentLogger.logPaymentFailure(
        paymentDetails.razorpay_payment_id,
        orderId,
        0,
        error,
        'Payment processing failed'
      );

      throw error;
    }
  }

  /**
   * Handle payment failure - Update order status
   * @param orderId MongoDB Order ID
   * @param reason Failure reason
   */
  async handlePaymentFailure(orderId: string, reason: string): Promise<IOrder> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      logger.info('❌ [PAYMENT SERVICE] Processing payment failure for order:', orderId);

      const order = await Order.findById(orderId).session(session);
      if (!order) {
        await session.abortTransaction();
        session.endSession();
        throw new Error('Order not found');
      }

      // Update payment status
      order.payment.status = 'failed';
      order.payment.failureReason = reason;

      // Add timeline entry
      order.timeline.push({
        status: 'payment_failed',
        message: `Payment failed: ${reason}`,
        timestamp: new Date()
      });

      // Reverse offer redemption cashback if applied
      if ((order as any).offerRedemption?.code) {
        logger.info('🎟️ [PAYMENT SERVICE] Reversing offer redemption cashback for failed payment...');
        const OfferRedemption = require('../models/OfferRedemption').default;
        const { Transaction } = require('../models/Transaction');

        const cashbackAmount = (order as any).offerRedemption?.cashback || 0;
        const redemptionCode = (order as any).offerRedemption?.code;
        const userId = order.user;

        try {
          // Find and restore the offer redemption to active status
          // Match by order ID too (not just status='used') to avoid reversing wrong record on data corruption
          const offerRedemption = await OfferRedemption.findOneAndUpdate(
            {
              redemptionCode: redemptionCode,
              user: userId,
              status: 'used',
              order: order._id
            },
            {
              $set: {
                status: 'active',
                usedDate: null,
                order: null,
                usedAmount: null
              }
            },
            { session, new: true }
          );

          if (offerRedemption) {
            logger.info('✅ [PAYMENT SERVICE] Offer redemption restored to active:', redemptionCode);

            // Deduct cashback from user's wallet if it was credited
            if (cashbackAmount > 0) {
              const wallet = await Wallet.findOne({ user: userId }).session(session).lean();
              if (wallet) {
                const balanceBefore = wallet.balance.total;

                // Deduct from wallet balance
                wallet.balance.total = Math.max(0, wallet.balance.total - cashbackAmount);
                wallet.balance.available = Math.max(0, wallet.balance.available - cashbackAmount);

                // Deduct from rez coins
                const rezCoin = wallet.coins.find((c: any) => c.type === 'rez');
                if (rezCoin) {
                  rezCoin.amount = Math.max(0, rezCoin.amount - cashbackAmount);
                }

                await wallet.save({ session });

                // Create reversal transaction record
                const reversalTransaction = new Transaction({
                  user: userId,
                  type: 'debit',
                  amount: cashbackAmount,
                  currency: wallet.currency || 'INR',
                  category: 'cashback_reversal',
                  description: `Cashback reversed - payment failed for order #${order.orderNumber}`,
                  status: {
                    current: 'completed',
                    history: [{
                      status: 'completed',
                      timestamp: new Date(),
                      reason: 'Payment failed - cashback reversed',
                    }],
                  },
                  source: {
                    type: 'cashback_reversal',
                    reference: offerRedemption._id,
                    description: `Payment failure reversal - ${(order as any).offerRedemption?.offerTitle || 'Offer Cashback'}`,
                    metadata: {
                      orderId: order._id,
                      orderNumber: order.orderNumber,
                      redemptionCode: redemptionCode,
                      failureReason: reason,
                    },
                  },
                  balanceBefore,
                  balanceAfter: wallet.balance.total,
                });

                await reversalTransaction.save({ session });
                logger.info(`✅ [PAYMENT SERVICE] Cashback of ₹${cashbackAmount} reversed from wallet`);

                // Send notification about reversal
                try {
                  const NotificationService = require('./notificationService').default;
                  NotificationService.sendToUser(userId.toString(), {
                    title: 'Cashback Reversed',
                    body: `Payment failed for order #${order.orderNumber}. ₹${cashbackAmount} cashback has been reversed. Your voucher is available again.`,
                    data: {
                      type: 'cashback_reversed',
                      amount: cashbackAmount,
                      orderId: (order as any)._id?.toString() || '',
                      orderNumber: order.orderNumber,
                    }
                  }).catch((err: any) => logger.error('Failed to send reversal notification:', err));
                } catch (notifError) {
                  logger.error('Failed to send reversal notification:', notifError);
                }
              }
            }
          } else {
            logger.warn('⚠️ [PAYMENT SERVICE] Offer redemption not found or already reverted:', redemptionCode);
          }
        } catch (redemptionError) {
          logger.error('❌ [PAYMENT SERVICE] Failed to reverse offer redemption:', redemptionError);
          // Continue with payment failure processing even if redemption reversal fails
        }
      }

      // Update order status to cancelled if payment failed
      order.status = 'cancelled';
      order.cancelReason = `Payment failed: ${reason}`;
      order.cancelledAt = new Date();

      await order.save({ session });

      await session.commitTransaction();
      session.endSession();

      logger.info('✅ [PAYMENT SERVICE] Payment failure processed');

      return order;
    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();
      logger.error('❌ [PAYMENT SERVICE] Error processing payment failure:', error);
      throw error;
    }
  }

  /**
   * Refund payment
   * @param orderId MongoDB Order ID
   * @param amount Amount to refund (optional - full refund if not specified)
   * @returns Refund details
   */
  async refundPayment(
    orderId: string,
    amount?: number
  ): Promise<IRefundResponse> {
    try {
      logger.info('💸 [PAYMENT SERVICE] Processing refund for order:', orderId);

      const order = await Order.findById(orderId).lean();
      if (!order) {
        throw new Error('Order not found');
      }

      // Check if order is paid
      if (order.payment.status !== 'paid') {
        throw new Error('Cannot refund unpaid order');
      }

      // Calculate refund amount
      const refundAmount = amount || order.totals.paidAmount;
      const paymentMethod = order.payment.method || 'razorpay';
      let refundId = '';
      let refundStatus = '';

      // Handle different payment methods
      switch (paymentMethod) {
        case 'razorpay': {
          const paymentId = order.payment.transactionId;
          if (!paymentId) {
            throw new Error('Payment transaction ID not found');
          }

          if (!razorpayInstance) {
            throw new Error('Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
          }

          const refundAmountInPaise = toPaise(refundAmount);

          // Create refund via Razorpay
          const refund = await razorpayInstance.payments.refund(paymentId, {
            amount: refundAmountInPaise,
            notes: {
              orderId: orderId,
              orderNumber: order.orderNumber,
              reason: 'Order cancellation'
            }
          });

          refundId = refund.id;
          refundStatus = refund.status;
          logger.info('✅ [PAYMENT SERVICE] Razorpay refund created:', refundId);
          break;
        }

        case 'stripe': {
          const paymentIntentId = order.payment.transactionId;
          if (!paymentIntentId) {
            throw new Error('Payment transaction ID not found');
          }

          if (!stripeService.isStripeConfigured()) {
            throw new Error('Stripe is not configured');
          }

          const amountInPaise = toPaise(refundAmount);
          const refund = await stripeService.createRefund({
            paymentIntentId,
            amount: amountInPaise,
            reason: 'requested_by_customer',
            metadata: {
              orderId: orderId,
              orderNumber: order.orderNumber,
              reason: 'Order cancellation'
            }
          });

          refundId = refund.id;
          refundStatus = refund.status || 'pending';
          logger.info('✅ [PAYMENT SERVICE] Stripe refund created:', refundId);
          break;
        }

        case 'wallet': {
          // Get user wallet
          const user = order.user as any;
          const userId = typeof user === 'string' ? user : user._id?.toString() || user;

          if (!userId) {
            throw new Error('User ID not found');
          }

          // Refund via walletService (atomic $inc + CoinTransaction + LedgerEntry)
          // SECURITY: Refunds must always succeed, even on frozen wallets —
          // the user has a legal right to their money back. The allowOnFrozenWallet
          // flag bypasses the frozen-wallet guard in walletService.credit.
          const { walletService } = await import('./walletService');
          await walletService.credit({
            userId: userId.toString(),
            amount: refundAmount,
            source: 'order',
            description: 'Payment refund',
            operationType: 'refund',
            referenceId: `payment-refund:${Date.now()}`,
            referenceModel: 'Payment',
            metadata: { refundReason: 'payment_refund' },
            allowOnFrozenWallet: true,
          });

          refundId = `wallet_refund_${Date.now()}`;
          refundStatus = 'completed';
          logger.info('Wallet refund completed via walletService:', refundId);
          break;
        }

        case 'cod': {
          // COD refund - mark for manual processing
          refundId = `cod_refund_${Date.now()}`;
          refundStatus = 'pending_manual_processing';
          logger.info('⚠️ [PAYMENT SERVICE] COD refund requires manual processing:', refundId);
          break;
        }

        default:
          throw new Error(`Unsupported payment method for refund: ${paymentMethod}`);
      }

      // Update order with refund details
      order.payment.status = amount === order.totals.paidAmount ? 'refunded' : 'partially_refunded';
      order.payment.refundId = refundId;
      order.payment.refundedAt = new Date();
      order.totals.refundAmount = (order.totals.refundAmount || 0) + refundAmount;

      // Add timeline entry
      order.timeline.push({
        status: 'refund_processed',
        message: `Refund of ₹${refundAmount} processed successfully via ${paymentMethod}`,
        timestamp: new Date()
      });

      await order.save();

      return {
        success: true,
        message: 'Refund processed successfully',
        refundId: refundId,
        refundAmount: refundAmount,
        refundStatus: refundStatus
      };
    } catch (error: any) {
      logger.error('❌ [PAYMENT SERVICE] Error processing refund:', error);
      return {
        success: false,
        message: `Failed to process refund: ${error.message}`
      };
    }
  }

  /**
   * Verify webhook signature from Razorpay
   * @param webhookBody Webhook request body
   * @param webhookSignature Webhook signature from header
   * @returns true if signature is valid
   */
  verifyWebhookSignature(webhookBody: string, webhookSignature: string): boolean {
    try {
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

      // Check if webhook secret is configured
      if (!secret || secret === 'your_webhook_secret_here') {
        logger.error('❌ [PAYMENT SERVICE] Razorpay webhook secret not configured. Rejecting webhook.');
        return false;
      }

      // Use utility function for webhook validation
      const validationResult = validateRazorpayWebhookSignature(
        webhookBody,
        webhookSignature,
        secret
      );

      if (validationResult.isValid) {
        logger.info('✅ [PAYMENT SERVICE] Webhook signature verified:', validationResult.eventType);
      } else {
        logger.error('❌ [PAYMENT SERVICE] Webhook signature verification failed:', validationResult.error);
      }

      return validationResult.isValid;
    } catch (error: any) {
      logger.error('❌ [PAYMENT SERVICE] Error verifying webhook signature:', error);
      return false;
    }
  }

  /**
   * Get Razorpay Key ID for frontend
   */
  getRazorpayKeyId(): string {
    return process.env.RAZORPAY_KEY_ID || '';
  }

  // ==================== CASHBACK PAYOUT METHODS ====================

  /**
   * Create a payout (transfer money to beneficiary)
   */
  async createPayout(options: {
    amount: number; // in paise (100 paise = 1 INR)
    currency?: string;
    accountNumber: string;
    ifscCode: string;
    beneficiaryName: string;
    purpose: string;
    reference: string;
  }): Promise<{
    success: boolean;
    payoutId?: string;
    status?: string;
    amount?: number;
    error?: string;
  }> {
    try {
      // Check if Razorpay is configured
      if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        logger.error('❌ [PAYMENT SERVICE] Payout failed — Razorpay not configured');
        return {
          success: false,
          error: 'Payment gateway not configured. Cannot process payout.',
          status: 'failed',
        };
      }

      // Create contact
      const contact = await (razorpayInstance as any).contacts.create({
        name: options.beneficiaryName,
        type: 'customer',
        reference_id: options.reference,
      });

      // Create fund account
      const fundAccount = await (razorpayInstance as any).fundAccounts.create({
        contact_id: contact.id,
        account_type: 'bank_account',
        bank_account: {
          name: options.beneficiaryName,
          account_number: options.accountNumber,
          ifsc: options.ifscCode,
        },
      });

      // Create payout
      const payout = await (razorpayInstance as any).payouts.create({
        account_number: process.env.RAZORPAY_ACCOUNT_NUMBER, // Your Razorpay account number
        fund_account_id: fundAccount.id,
        amount: options.amount,
        currency: options.currency || 'INR',
        mode: 'IMPS', // IMPS, NEFT, RTGS
        purpose: options.purpose,
        queue_if_low_balance: true,
        reference_id: options.reference,
      });

      logger.info(`✅ [PAYMENT SERVICE] Payout created successfully: ${payout.id}`);

      return {
        success: true,
        payoutId: payout.id,
        status: payout.status,
        amount: payout.amount,
      };
    } catch (error: any) {
      logger.error('❌ [PAYMENT SERVICE] Payout creation error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Process cashback payout
   */
  async processCashbackPayout(
    cashbackRequest: any,
    customerBankDetails: {
      accountNumber: string;
      ifscCode: string;
      accountHolderName: string;
    }
  ): Promise<{
    success: boolean;
    payoutId?: string;
    status?: string;
    amount?: number;
    error?: string;
  }> {
    const amountInPaise = toPaise(cashbackRequest.approvedAmount || cashbackRequest.requestedAmount);

    return this.createPayout({
      amount: amountInPaise,
      accountNumber: customerBankDetails.accountNumber,
      ifscCode: customerBankDetails.ifscCode,
      beneficiaryName: customerBankDetails.accountHolderName,
      purpose: 'cashback',
      reference: `cashback_${cashbackRequest.id}`,
    });
  }

  /**
   * Get payout status
   */
  async getPayoutStatus(payoutId: string): Promise<any> {
    try {
      if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        return {
          success: false,
          error: 'Payment gateway not configured. Cannot fetch payout status.',
        };
      }

      const payout = await (razorpayInstance as any).payouts.fetch(payoutId);

      return {
        success: true,
        status: payout.status,
        amount: payout.amount,
        createdAt: payout.created_at,
      };
    } catch (error: any) {
      logger.error('❌ [PAYMENT SERVICE] Error fetching payout status:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Cancel payout (if not yet processed)
   */
  async cancelPayout(payoutId: string): Promise<any> {
    try {
      if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        return {
          success: false,
          error: 'Payment gateway not configured. Cannot cancel payout.',
        };
      }

      const payout = await (razorpayInstance as any).payouts.cancel(payoutId);

      logger.info(`✅ [PAYMENT SERVICE] Payout cancelled: ${payout.id}`);

      return {
        success: true,
        status: payout.status,
      };
    } catch (error: any) {
      logger.error('❌ [PAYMENT SERVICE] Error cancelling payout:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get account balance
   */
  async getAccountBalance(): Promise<any> {
    try {
      if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        return {
          success: true,
          balance: 1000000, // Simulated 10,000 INR in paise
          currency: 'INR',
          message: 'Razorpay not configured - simulated balance',
        };
      }

      // Note: Account number should be configured in environment
      const accountNumber = process.env.RAZORPAY_ACCOUNT_NUMBER;
      const balance = await (razorpayInstance as any).balance.fetch(accountNumber);

      return {
        success: true,
        balance: balance.balance,
        currency: balance.currency,
      };
    } catch (error: any) {
      logger.error('❌ [PAYMENT SERVICE] Error fetching balance:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Check if payment service is configured
   */
  isPayoutConfigured(): boolean {
    return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
  }
}

export default new PaymentService();