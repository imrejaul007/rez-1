/**
 * cancelOrderService — canonical order cancellation logic.
 *
 * HIGH 4 FIX: Previously three separate code paths cancelled orders:
 *   1. orderCancelController.ts  — user-facing HTTP handler (full pipeline)
 *   2. orderLifecycleJobs.ts     — findByIdAndUpdate only (no stock/refund)
 *   3. paymentReconciliationJob.ts — order.save() only (no stock/refund)
 *
 * All divergent paths now call `cancelOrderCore()` exported from this module,
 * ensuring every cancellation goes through:
 *   status change → stock restore → refund → cashback reversal → notification
 *
 * The HTTP controller (orderCancelController.ts) retains its own idempotency
 * guard (the 'cancelling' status CAS) and calls `cancelOrderCore()` for the
 * transactional body. Background jobs call `cancelOrderCore()` directly.
 */

import mongoose, { Types } from 'mongoose';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { Wallet } from '../models/Wallet';
import { logger } from '../config/logger';
import stockSocketService from './stockSocketService';
import { CacheInvalidator } from '../utils/cacheHelper';
import { walletService } from './walletService';
import { pushService } from './pushService';

export interface CancelOrderOptions {
  /** The Mongoose ObjectId (or string) of the order to cancel. */
  orderId: string | Types.ObjectId;
  /** Human-readable cancellation reason stored on the order document. */
  reason: string;
  /**
   * The user ID that owns this order.
   * Must be provided for user-initiated cancellations so refunds are credited
   * to the correct wallet. For system/job cancellations where no wallet refund
   * is needed (e.g., payment-never-received orders), pass the order's own
   * user field or omit — the function will fall back to order.user.
   */
  actorUserId?: string;
  /**
   * Who triggered the cancellation — recorded in the timeline entry.
   * Defaults to 'system'.
   */
  cancelledBy?: 'user' | 'admin' | 'system';
  /**
   * When true, skips wallet refunds even if coins were used.
   * Use for payment-timeout cancellations where no money was ever collected.
   */
  skipRefund?: boolean;
}

export interface CancelOrderResult {
  success: boolean;
  orderId: string;
  orderNumber: string;
  stockItemsRestored: number;
  refundIssued: boolean;
  cashbackReversed: boolean;
}

/**
 * Core order cancellation pipeline.
 *
 * Runs inside a single MongoDB transaction:
 *   1. Restore inventory stock
 *   2. Revert coupon usage
 *   3. Refund coins / wallet (unless skipRefund=true)
 *   4. Reverse cashback
 *   5. Update order status → 'cancelled'
 *   6. Commit
 *
 * Post-commit (best-effort, non-transactional):
 *   - Emit stock socket updates
 *   - Invalidate product cache
 *   - Send notification (if applicable)
 *
 * @throws if the order cannot be found or is already in a terminal status.
 */
export async function cancelOrderCore(options: CancelOrderOptions): Promise<CancelOrderResult> {
  const { orderId, reason, cancelledBy = 'system', skipRefund = false } = options;

  const session = await mongoose.startSession();
  session.startTransaction({ writeConcern: { w: 'majority', j: true }, readConcern: { level: 'snapshot' } });

  const stockRestorations: Array<{ productId: string; storeId: string; newStock: number }> = [];
  let refundIssued = false;
  let cashbackReversed = false;

  try {
    const order = await Order.findById(orderId).session(session);
    if (!order) {
      await session.abortTransaction();
      session.endSession();
      throw new Error(`Order ${orderId} not found`);
    }

    const nonCancellableStatuses = ['delivered', 'cancelled', 'refunded', 'returned'];
    if (nonCancellableStatuses.includes(order.status)) {
      await session.abortTransaction();
      session.endSession();
      throw new Error(`Order ${order.orderNumber} cannot be cancelled — status is '${order.status}'`);
    }

    const userId = options.actorUserId || order.user.toString();

    // ── Step 1: Restore inventory stock ──────────────────────────────────────
    for (const orderItem of order.items) {
      const productId = orderItem.product;
      const quantity = orderItem.quantity;
      const variant = orderItem.variant;

      if (variant) {
        const updateResult = await Product.findOneAndUpdate(
          {
            _id: productId,
            'inventory.variants': { $elemMatch: { type: variant.type, value: variant.value } },
          },
          {
            $inc: {
              'inventory.variants.$[v].stock': quantity,
              'inventory.stock': quantity,
              'inventory.reservedStock': -quantity,
            },
          },
          {
            session,
            new: true,
            arrayFilters: [{ 'v.type': variant.type, 'v.value': variant.value }],
          },
        );
        if (updateResult) {
          stockRestorations.push({
            productId: updateResult._id.toString(),
            storeId: updateResult.store?.toString() || '',
            newStock: updateResult.inventory?.stock ?? 0,
          });
        }
      } else {
        const updateResult = await Product.findByIdAndUpdate(
          productId,
          {
            $inc: { 'inventory.stock': quantity, 'inventory.reservedStock': -quantity },
            $set: { 'inventory.isAvailable': true },
          },
          { session, new: true },
        );
        if (updateResult) {
          stockRestorations.push({
            productId: updateResult._id.toString(),
            storeId: updateResult.store?.toString() || '',
            newStock: updateResult.inventory?.stock ?? 0,
          });
        }
      }
    }

    // ── Step 2: Revert coupon usage ───────────────────────────────────────────
    if (order.couponCode) {
      try {
        const couponService = require('./couponService').default;
        await couponService.revertCouponUsage(order.user, order.couponCode, order._id, session);
        logger.info('[cancelOrderCore] Coupon usage reverted:', order.couponCode);
      } catch (couponErr) {
        logger.error('[cancelOrderCore] Failed to revert coupon usage:', couponErr);
        // Non-fatal — continue with cancellation
      }
    }

    // ── Step 3: Refund coins / wallet ─────────────────────────────────────────
    if (!skipRefund && order.payment?.coinsUsed) {
      const rezCoins = (order.payment.coinsUsed as any).rezCoins || (order.payment.coinsUsed as any).wasilCoins || 0;
      const promoCoins = (order.payment.coinsUsed as any).promoCoins || 0;
      const storePromoCoins = (order.payment.coinsUsed as any).storePromoCoins || 0;

      if (rezCoins > 0) {
        const { refundService } = await import('./refundService');
        await refundService.processRefund({
          userId,
          amount: rezCoins,
          reason: `Order cancelled: ${order.orderNumber}`,
          refundType: 'order_cancel',
          referenceId: `order:${order._id}:rez`,
          referenceModel: 'Order',
          skipNotification: true,
          session,
        });
        refundIssued = true;
      }

      if (promoCoins > 0) {
        await Wallet.findOneAndUpdate(
          { user: order.user, 'coins.type': 'promo' },
          { $inc: { 'coins.$.amount': promoCoins }, $set: { lastTransactionAt: new Date() } },
          { session },
        );
        refundIssued = true;
      }

      if (storePromoCoins > 0) {
        const firstItem = order.items[0];
        const storeId = typeof firstItem.store === 'object' ? (firstItem.store as any)._id : firstItem.store;
        const storeName = typeof firstItem.store === 'object' ? (firstItem.store as any).name || 'Store' : 'Store';
        if (storeId) {
          const wallet = await Wallet.findOne({ user: order.user }).session(session);
          if (wallet) {
            await wallet.addBrandedCoins(
              new Types.ObjectId(storeId.toString()),
              storeName,
              storePromoCoins,
              undefined,
              undefined,
              session,
            );
            refundIssued = true;
          }
        }
      }
    }

    // ── Step 4: Reverse cashback ──────────────────────────────────────────────
    // BED-012 FIX: Define typed OfferRedemption shape to replace all `as any` casts
    // in the cashback-reversal path — this is a critical reconciliation operation.
    interface OrderOfferRedemption {
      code?: string;
      cashback?: number;
      offerTitle?: string;
    }
    const offerRedemptionData: OrderOfferRedemption | undefined = (order as unknown as { offerRedemption?: OrderOfferRedemption }).offerRedemption;
    if (!skipRefund && offerRedemptionData?.code) {
      try {
        const OfferRedemption = require('../models/OfferRedemption').default;
        const { Transaction } = require('../models/Transaction');
        const cashbackAmount = offerRedemptionData.cashback || 0;
        const redemptionCode = offerRedemptionData.code;

        const offerRedemption = await OfferRedemption.findOneAndUpdate(
          { redemptionCode, user: order.user, status: 'used', order: order._id },
          { $set: { status: 'active', usedDate: null, order: null, usedAmount: null } },
          { session, new: true },
        );

        if (offerRedemption && cashbackAmount > 0) {
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

          const reversalTx = new Transaction({
            user: userId,
            type: 'debit',
            amount: cashbackAmount,
            currency: 'RC',
            category: 'cashback_reversal',
            description: `Cashback reversed for cancelled order #${order.orderNumber}`,
            status: {
              current: 'completed',
              history: [{ status: 'completed', timestamp: new Date(), reason: 'Order cancelled - cashback reversed' }],
            },
            source: {
              type: 'cashback_reversal',
              reference: offerRedemption._id,
              description: `Reversal - ${offerRedemptionData.offerTitle || 'Offer Cashback'}`,
              metadata: { orderId: order._id, orderNumber: order.orderNumber, redemptionCode },
            },
            balanceBefore: 0,
            balanceAfter: 0,
          });
          await reversalTx.save({ session });
          cashbackReversed = true;
        }
      } catch (cashbackErr) {
        logger.error('[cancelOrderCore] Failed to reverse offer-cashback:', cashbackErr);
        // Non-fatal — continue with cancellation
      }
    }

    // ── Step 4b: Reverse standard order cashback (UserCashback records) ───────
    // Step 4 only handles offer-redemption cashback; this block handles the standard
    // cashback credited through cashbackService.createCashbackFromOrder().
    try {
      const { UserCashback } = require('../models/UserCashback');
      const cashbackDocs = await UserCashback.find(
        { order: order._id, user: order.user, status: { $in: ['pending', 'processing', 'credited'] } },
        null,
        { session },
      );

      for (const cb of cashbackDocs) {
        if (cb.status === 'credited' && cb.amount > 0) {
          // Already in wallet — debit it back
          await walletService.debit({
            userId: userId.toString(),
            amount: cb.amount,
            source: 'order',
            description: `Cashback reversed for cancelled order #${order.orderNumber}`,
            operationType: 'cashback_reversal',
            referenceId: `cashback-reversal:${order._id}`,
            referenceModel: 'Order',
            metadata: { orderId: order._id, orderNumber: order.orderNumber, cashbackId: cb._id },
            session,
          });
        }
        cb.status = 'cancelled';
        cb.cancellationReason = `Order cancelled: ${reason}`;
        await cb.save({ session });
        cashbackReversed = true;
      }

      if (cashbackDocs.length > 0) {
        logger.info(
          `[cancelOrderCore] Reversed ${cashbackDocs.length} cashback record(s) for order ${order.orderNumber}`,
        );
      }
    } catch (stdCashbackErr) {
      logger.error('[cancelOrderCore] Failed to reverse standard cashback:', stdCashbackErr);
      // Non-fatal — continue with cancellation; ops should investigate via logs
    }

    // ── Step 5: Mark order as cancelled ──────────────────────────────────────
    // Phase 3: guard — assertOrderTransition validates the FSM allows this write
    const { assertOrderTransition } = require('../config/orderStateMachine') as {
      assertOrderTransition: (from: string, to: string) => void;
    };
    assertOrderTransition(order.status as string, 'cancelled');
    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancelReason = reason;
    order.timeline.push({
      status: 'cancelled',
      message: `Order cancelled. Reason: ${reason}`,
      timestamp: new Date(),
      updatedBy: cancelledBy,
    });

    await order.save({ session });

    // ── Step 6: Commit ────────────────────────────────────────────────────────
    await session.commitTransaction();
    session.endSession();

    // ── Post-commit: non-transactional side-effects ───────────────────────────
    for (const restoration of stockRestorations) {
      try {
        stockSocketService.emitStockUpdate(restoration.productId, restoration.newStock, {
          storeId: restoration.storeId,
          reason: 'return',
        });
      } catch (socketErr) {
        logger.error('[cancelOrderCore] Socket emission failed:', socketErr);
      }
      CacheInvalidator.invalidateProduct(restoration.productId).catch((err: any) =>
        logger.error('[cancelOrderCore] Product cache invalidation failed:', err?.message),
      );
    }

    // Notify user (best-effort) — use the real pushService, not the stub notificationService
    pushService
      .send({
        userId: order.user.toString(),
        title: 'Order Cancelled',
        body: `Your order #${order.orderNumber} has been cancelled. ${refundIssued ? 'Your refund has been processed.' : ''}`,
        data: { type: 'order_cancelled', orderId: (order._id as any).toString(), orderNumber: order.orderNumber },
      })
      .catch((err: any) => logger.error('[cancelOrderCore] Push notification failed:', err));

    logger.info('[cancelOrderCore] Order cancelled successfully', {
      orderId: (order._id as any).toString(),
      orderNumber: order.orderNumber,
      cancelledBy,
      stockItemsRestored: stockRestorations.length,
      refundIssued,
      cashbackReversed,
    });

    return {
      success: true,
      orderId: (order._id as any).toString(),
      orderNumber: order.orderNumber,
      stockItemsRestored: stockRestorations.length,
      refundIssued,
      cashbackReversed,
    };
  } catch (error: any) {
    try {
      await session.abortTransaction();
    } catch (abortErr) {
      logger.error('[cancelOrderCore] Failed to abort transaction:', abortErr);
    }
    session.endSession();
    logger.error('[cancelOrderCore] Cancellation failed, transaction rolled back:', error?.message);
    throw error;
  }
}
