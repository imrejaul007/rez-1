import { Request, Response } from 'express';
import mongoose, { Types } from 'mongoose';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { User } from '../models/User';
import {
  sendSuccess,
  sendNotFound,
  sendBadRequest,
} from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import stockSocketService from '../services/stockSocketService';
import activityService from '../services/activityService';
import { walletService } from '../services/walletService';
import { Wallet } from '../models/Wallet';
import { SMSService } from '../services/SMSService';
import EmailService from '../services/EmailService';
import { Store } from '../models/Store';
import { logger } from '../config/logger';
import { CacheInvalidator } from '../utils/cacheHelper';
import { Refund } from '../models/Refund';

// ─── cancelOrder ────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/orders/{orderId}/cancel:
 *   patch:
 *     summary: Cancel order (restores stock, refunds coins/payment)
 *     tags: [User Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Order cannot be cancelled (invalid status)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 */
export const cancelOrder = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const userId = req.userId!;
  const { reason } = req.body;

  // ATOMIC IDEMPOTENCY GUARD — claim the order for cancellation
  // Only one concurrent caller can transition from cancellable status to 'cancelling'
  // Use { new: false } to get the original status for rollback
  const preClaimOrder = await Order.findOneAndUpdate(
    {
      _id: orderId,
      user: userId,
      status: { $in: ['placed', 'confirmed', 'preparing'] }
    },
    { $set: { status: 'cancelling' } },
    { new: false }
  );
  const claimedOrder = preClaimOrder;
  const originalStatus = preClaimOrder?.status || 'placed';

  if (!claimedOrder) {
    const existing = await Order.findOne({ _id: orderId, user: userId }).lean();
    if (!existing) {
      return sendNotFound(res, 'Order not found');
    }
    if (existing.status === 'cancelled' || (existing.status as string) === 'cancelling') {
      return sendBadRequest(res, 'Order is already cancelled');
    }
    return sendBadRequest(res, 'Order cannot be cancelled at this stage');
  }

  // Start a MongoDB session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(orderId).session(session).lean();
    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return sendNotFound(res, 'Order not found');
    }

    // Restore stock for cancelled order items
    const stockRestorations: Array<{ productId: string; storeId: string; newStock: number; productName: string }> = [];

    for (const orderItem of order.items) {
      const productId = orderItem.product;
      const quantity = orderItem.quantity;
      const variant = orderItem.variant;

      if (variant) {
        // Restore variant stock
        const updateResult = await Product.findOneAndUpdate(
          {
            _id: productId,
            'inventory.variants': {
              $elemMatch: {
                type: variant.type,
                value: variant.value
              }
            }
          },
          {
            $inc: {
              'inventory.variants.$[variant].stock': quantity
            }
          },
          {
            session,
            new: true,
            arrayFilters: [{
              'variant.type': variant.type,
              'variant.value': variant.value
            }]
          }
        );

        if (updateResult) {
          const newStock = updateResult.inventory?.stock ?? 0;
          const storeId = updateResult.store?.toString() || '';
          stockRestorations.push({
            productId: updateResult._id.toString(),
            storeId,
            newStock,
            productName: updateResult.name || 'Unknown Product'
          });
        } else {
        }
      } else {
        // Restore main product stock
        const updateResult = await Product.findByIdAndUpdate(
          productId,
          {
            $inc: {
              'inventory.stock': quantity
            },
            $set: {
              'inventory.isAvailable': true
            }
          },
          {
            session,
            new: true
          }
        );

        if (updateResult) {
          const newStock = updateResult.inventory?.stock ?? 0;
          const storeId = updateResult.store?.toString() || '';
          stockRestorations.push({
            productId: updateResult._id.toString(),
            storeId,
            newStock,
            productName: updateResult.name || 'Unknown Product'
          });
        } else {
        }
      }
    }

    // Refund coins if they were used in this order
    if (order.payment?.coinsUsed) {
      const orderUserId = order.user;

      // Support both rezCoins (new) and wasilCoins (legacy) field names
      const rezCoins = (order.payment.coinsUsed as any).rezCoins || (order.payment.coinsUsed as any).wasilCoins || 0;
      const promoCoins = (order.payment.coinsUsed as any).promoCoins || 0;
      const storePromoCoins = (order.payment.coinsUsed as any).storePromoCoins || 0;

      // Refund REZ coins via refundService (centralized refund pipeline)
      if (rezCoins > 0) {
        try {
          const { refundService } = await import('../services/refundService');
          await refundService.processRefund({
            userId: orderUserId.toString(),
            amount: rezCoins,
            reason: `Order cancelled: ${order.orderNumber}`,
            refundType: 'order_cancel',
            referenceId: `order:${order._id}:rez`,
            referenceModel: 'Order',
            skipNotification: true, // Notification sent at end of cancel flow
          });
        } catch (coinError) {
          logger.error('[CANCEL ORDER] Failed to refund REZ coins:', coinError);
        }
      }

      // Refund promo coins
      if (promoCoins > 0) {
        try {
          const wallet = await Wallet.findOne({ user: orderUserId }).session(session).lean();
          if (wallet) {
            const promoCoin = wallet.coins.find((c: any) => c.type === 'promo');
            if (promoCoin) {
              promoCoin.amount += promoCoins;
              wallet.markModified('coins');
              wallet.lastTransactionAt = new Date();
              await wallet.save({ session });
            }
          }
        } catch (coinError) {
          logger.error('[CANCEL ORDER] Failed to refund promo coins:', coinError);
        }
      }

      // Refund store promo coins (branded coins)
      if (storePromoCoins > 0) {
        try {
          const firstItem = order.items[0];
          const storeId = typeof firstItem.store === 'object'
            ? (firstItem.store as any)._id
            : firstItem.store;
          const storeName = typeof firstItem.store === 'object'
            ? (firstItem.store as any).name || 'Store'
            : 'Store';

          if (storeId) {
            const wallet = await Wallet.findOne({ user: orderUserId }).session(session);
            if (wallet) {
              await wallet.addBrandedCoins(
                new Types.ObjectId(storeId.toString()),
                storeName,
                storePromoCoins
              );
            }
          }
        } catch (coinError) {
          logger.error('[CANCEL ORDER] Failed to refund store promo coins:', coinError);
        }
      }
    }

    // Reverse offer redemption cashback if applied
    if ((order as any).offerRedemption?.code) {
      const OfferRedemption = require('../models/OfferRedemption').default;
      const { Transaction } = require('../models/Transaction');

      const cashbackAmount = (order as any).offerRedemption?.cashback || 0;
      const redemptionCode = (order as any).offerRedemption?.code;

      try {
        // Find and restore the offer redemption to active status
        const offerRedemption = await OfferRedemption.findOneAndUpdate(
          {
            redemptionCode: redemptionCode,
            user: userId,
            status: 'used'
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
          // Deduct cashback from user's wallet if it was credited
          if (cashbackAmount > 0) {
            // Use walletService for atomic debit + CoinTransaction + LedgerEntry
            await walletService.debit({
              userId,
              amount: cashbackAmount,
              source: 'order',
              description: `Cashback reversed for cancelled order #${order.orderNumber}`,
              operationType: 'cashback_reversal',
              referenceId: `cashback-reversal:${order._id}`,
              referenceModel: 'Order',
              metadata: { orderId: order._id, orderNumber: order.orderNumber },
              session,
            });

            {

              // Create reversal transaction record
              const reversalTransaction = new Transaction({
                user: userId,
                type: 'debit',
                amount: cashbackAmount,
                currency: 'RC',
                category: 'cashback_reversal',
                description: `Cashback reversed for cancelled order #${order.orderNumber}`,
                status: {
                  current: 'completed',
                  history: [{
                    status: 'completed',
                    timestamp: new Date(),
                    reason: 'Order cancelled - cashback reversed',
                  }],
                },
                source: {
                  type: 'cashback_reversal',
                  reference: offerRedemption._id,
                  description: `Reversal - ${(order as any).offerRedemption?.offerTitle || 'Offer Cashback'}`,
                  metadata: {
                    orderId: order._id,
                    orderNumber: order.orderNumber,
                    redemptionCode: redemptionCode,
                  },
                },
                balanceBefore: 0,
                balanceAfter: 0,
              });

              await reversalTransaction.save({ session });
              // Send notification about reversal
              try {
                const NotificationService = require('../services/notificationService').default;
                NotificationService.sendToUser(userId.toString(), {
                  title: 'Cashback Reversed',
                  body: `₹${cashbackAmount} cashback has been reversed due to order #${order.orderNumber} cancellation. Your voucher is now available again.`,
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
        }
      } catch (redemptionError) {
        logger.error('[CANCEL ORDER] Failed to reverse offer redemption:', redemptionError);
        // Continue with cancellation even if redemption reversal fails
      }
    }

    // Update order status
    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancelReason = reason || 'Customer request';

    await order.save({ session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    // Emit Socket.IO events for stock restorations and invalidate cache after transaction success
    for (const restoration of stockRestorations) {
      try {
        stockSocketService.emitStockUpdate(
          restoration.productId,
          restoration.newStock,
          {
            storeId: restoration.storeId,
            reason: 'return'
          }
        );
      } catch (socketError) {
        // Log but don't fail the cancellation if socket emission fails
        logger.error('[CANCEL ORDER] Socket emission failed:', socketError);
      }
      // Invalidate product cache after stock restoration
      CacheInvalidator.invalidateProduct(restoration.productId).catch((err) => logger.error('[OrderCancelCtrl] Product cache invalidation failed after stock restoration', { error: err.message, productId: restoration.productId }));
    }

    // Create activity for order cancellation
    const storeData = order.items[0]?.store as any;
    const storeName = storeData?.name || storeData?.toString() || 'Store';
    await activityService.order.onOrderCancelled(
      new Types.ObjectId(userId),
      order._id as Types.ObjectId,
      storeName
    );

    sendSuccess(res, order, 'Order cancelled successfully');

  } catch (error: any) {
    // Rollback transaction on error
    await session.abortTransaction();
    session.endSession();

    // Reset status from 'cancelling' back to previous state so it can be retried
    try {
      await Order.findByIdAndUpdate(orderId, { $set: { status: originalStatus } });
    } catch (resetError) {
      logger.error('[CANCEL ORDER] Failed to reset status:', resetError);
    }

    logger.error('[CANCEL ORDER] Error:', error.message);
    throw new AppError(`Failed to cancel order: ${error.message}`, 500);
  }
});

// ─── requestRefund ──────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/orders/{orderId}/refund-request:
 *   post:
 *     summary: Request refund for an order (delivered/cancelled within 7 days)
 *     tags: [User Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 500
 *               refundItems:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     itemId:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *     responses:
 *       201:
 *         description: Refund request created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Validation error (order not eligible, reason too short, etc.)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 */
export const requestRefund = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const userId = req.userId!;
  const { reason, refundItems } = req.body;

  try {
    // Verify order belongs to user
    const order = await Order.findOne({ _id: orderId, user: userId }).lean();
    if (!order) {
      return sendNotFound(res, 'Order not found');
    }

    // Validate refund eligibility
    if (order.payment.status !== 'paid' && order.payment.status !== 'partially_refunded') {
      return sendBadRequest(res, 'Only paid or partially refunded orders can be refunded');
    }

    // Check if already fully refunded
    const alreadyRefunded = order.totals.refundAmount || 0;
    const remaining = order.totals.paidAmount - alreadyRefunded;
    if (remaining <= 0) {
      return sendBadRequest(res, 'Order is already fully refunded');
    }

    if (!['delivered', 'cancelled'].includes(order.status)) {
      return sendBadRequest(res, 'Refund can only be requested for delivered or cancelled orders');
    }

    // Check refund window (e.g., 7 days for delivered orders)
    if (order.status === 'delivered') {
      const deliveredAt = order.delivery?.deliveredAt;
      if (!deliveredAt) {
        return sendBadRequest(res, 'Delivery date not found');
      }

      const daysSinceDelivery = (Date.now() - deliveredAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDelivery > 7) {
        return sendBadRequest(res, 'Refund window has expired (7 days)');
      }
    }

    // Calculate refund amount
    let refundAmount = order.totals.paidAmount - (order.totals.refundAmount || 0);
    const refundType = refundItems && refundItems.length > 0 ? 'partial' : 'full';

    if (refundType === 'partial') {
      refundAmount = refundItems.reduce((sum: number, item: any) => {
        const orderItem = order.items.find((oi: any) => oi._id.toString() === item.itemId);
        if (orderItem) {
          return sum + (orderItem.price * item.quantity);
        }
        return sum;
      }, 0);
    }

    // Create refund record
    const refund = new Refund({
      order: order._id,
      user: userId,
      orderNumber: order.orderNumber,
      paymentMethod: (order.payment.method || 'razorpay') as 'razorpay' | 'stripe' | 'wallet' | 'cod',
      refundAmount,
      refundType,
      refundReason: reason,
      refundedItems: refundItems?.map((item: any) => {
        const orderItem = order.items.find((oi: any) => oi._id.toString() === item.itemId);
        return {
          itemId: item.itemId,
          productId: orderItem?.product,
          quantity: item.quantity,
          refundAmount: orderItem ? orderItem.price * item.quantity : 0
        };
      }) || [],
      status: 'pending',
      estimatedArrival: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    await refund.save();

    // Notify admin/merchant for approval
    try {
      // Get user information
      const user = await User.findById(userId).lean();
      const customerName = user?.profile?.firstName || user?.phoneNumber || 'Customer';
      const refundId = (refund._id as any)?.toString() || '';

      // Get store information from order
      const storeIds = [...new Set(order.items.map((item: any) => item.store?.toString()).filter(Boolean))];

      if (storeIds.length > 0) {
        const stores = await Store.find({ _id: { $in: storeIds } }).select('name contact owner').lean();

        for (const store of stores) {
          // Get merchant contact info
          const merchantPhone = store.contact?.phone;
          const merchantEmail = store.contact?.email;
          const storeName = store.name || 'Store';

          // Send SMS to merchant
          if (merchantPhone) {
            try {
              await SMSService.sendRefundRequestNotification(
                merchantPhone,
                order.orderNumber,
                refundAmount,
                refundType
              );
            } catch (smsError) {
              logger.error(`[REFUND REQUEST] Failed to send SMS to merchant:`, smsError);
            }
          }

          // Send email to merchant
          if (merchantEmail) {
            try {
              await EmailService.sendRefundRequestNotification(
                merchantEmail,
                storeName,
                {
                  orderNumber: order.orderNumber,
                  refundAmount,
                  refundType,
                  refundReason: reason,
                  customerName,
                  refundId
                }
              );
            } catch (emailError) {
              logger.error(`[REFUND REQUEST] Failed to send email to merchant:`, emailError);
            }
          }
        }
      }

      // Also notify admin if admin email is configured
      const adminEmail = process.env.ADMIN_EMAIL;
      if (adminEmail) {
        try {
          await EmailService.sendAdminRefundRequestNotification(
            adminEmail,
            {
              orderNumber: order.orderNumber,
              refundAmount,
              refundType,
              refundReason: reason,
              customerName,
              refundId
            }
          );
        } catch (adminError) {
          logger.error(`[REFUND REQUEST] Failed to send admin notification:`, adminError);
        }
      }
    } catch (notificationError) {
      logger.error('[REFUND REQUEST] Error sending notifications:', notificationError);
      // Don't fail refund request if notifications fail
    }

    sendSuccess(res, {
      refundId: (refund._id as any)?.toString() || '',
      orderNumber: order.orderNumber,
      refundAmount,
      refundType,
      status: 'pending',
      message: 'Refund request submitted successfully. It will be reviewed within 24-48 hours.'
    }, 'Refund request submitted successfully', 201);

  } catch (error: any) {
    logger.error('[REFUND REQUEST] Error:', error);
    throw new AppError(`Failed to request refund: ${error.message}`, 500);
  }
});

// ─── getUserRefunds ─────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/orders/refunds:
 *   get:
 *     summary: List user refunds
 *     tags: [User Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 50
 *     responses:
 *       200:
 *         description: Paginated list of user refunds
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized
 */
export const getUserRefunds = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { status, page = 1, limit = 20 } = req.query;

  try {
    const query: any = { user: userId };
    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const refunds = await Refund.find(query)
      .populate('order', 'orderNumber totals.total createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Refund.countDocuments(query);
    const totalPages = Math.ceil(total / Number(limit));

    sendSuccess(res, {
      refunds,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1
      }
    }, 'Refunds retrieved successfully');

  } catch (error: any) {
    logger.error('[GET REFUNDS] Error:', error);
    throw new AppError('Failed to fetch refunds', 500);
  }
});

// ─── getRefundDetails ───────────────────────────────────────────────────────

/**
 * @swagger
 * /api/orders/refunds/{refundId}:
 *   get:
 *     summary: Get single refund details
 *     tags: [User Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: refundId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Refund details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Refund not found
 */
export const getRefundDetails = asyncHandler(async (req: Request, res: Response) => {
  const { refundId } = req.params;
  const userId = req.userId!;

  try {
    const refund = await Refund.findOne({ _id: refundId, user: userId })
      .populate('order', 'orderNumber totals items createdAt')
      .populate('refundedItems.productId', 'name image')
      .lean();

    if (!refund) {
      return sendNotFound(res, 'Refund not found');
    }

    sendSuccess(res, refund, 'Refund details retrieved successfully');

  } catch (error: any) {
    logger.error('[GET REFUND DETAILS] Error:', error);
    throw new AppError('Failed to fetch refund details', 500);
  }
});
