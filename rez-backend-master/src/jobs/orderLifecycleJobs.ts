/**
 * Order Lifecycle Background Jobs
 *
 * 1. Stuck Order Detection — every 10 minutes
 * 2. Payment Verification Recovery — every 15 minutes
 * 3. Return Window Logging — daily at midnight
 */

import cron from 'node-cron';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import orderSocketService from '../services/orderSocketService';
import { runOrderAlertChecks } from '../utils/orderAlerts';
import redisService from '../services/redisService';
import { logger } from '../config/logger';

/**
 * Stuck Order Detection
 *
 * - placed + unpaid online orders > 1 hour → auto-cancel, restore stock
 * - confirmed/preparing > 2 hours → admin alert
 * - dispatched > 3 hours → merchant + admin alert
 */
async function runStuckOrderDetection(): Promise<void> {
  const lockKey = 'job:order-lifecycle';
  const lockToken = await redisService.acquireLock(lockKey, 300);
  if (!lockToken) {
    logger.info('order-lifecycle skipped — lock held by another instance');
    return;
  }

  const now = new Date();

  try {
    // 1. Auto-cancel unpaid online orders stuck in 'placed' for > 1 hour
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const unpaidOrders = await Order.find({
      status: 'placed',
      'payment.status': 'pending',
      'payment.method': { $ne: 'cod' },
      createdAt: { $lt: oneHourAgo },
    }).select('_id orderNumber items user').lean();

    for (const order of unpaidOrders) {
      try {
        // NOTE: Do NOT restore stock for unpaid online orders.
        // Stock is only deducted AFTER payment confirmation (in paymentService.handlePaymentSuccess).
        // Since these orders were never paid, stock was never deducted. Restoring would inflate inventory.

        // Cancel the order
        await Order.findByIdAndUpdate(order._id, {
          $set: {
            status: 'cancelled',
            cancelReason: 'Auto-cancelled: payment not received within 1 hour',
            cancelledAt: now,
            'delivery.status': 'failed',
          },
          $push: {
            timeline: {
              status: 'cancelled',
              message: 'Order auto-cancelled due to unpaid payment after 1 hour',
              timestamp: now,
              updatedBy: 'system',
            },
          },
        });

        logger.info(`[ORDER LIFECYCLE] Auto-cancelled unpaid order: ${order.orderNumber}`);
      } catch (err) {
        logger.error(`[ORDER LIFECYCLE] Failed to auto-cancel order ${order.orderNumber}:`, err);
      }
    }

    if (unpaidOrders.length > 0) {
      logger.info(`[ORDER LIFECYCLE] Auto-cancelled ${unpaidOrders.length} unpaid orders`);
    }

    // 2. Alert for orders stuck in confirmed/preparing for > 2 hours
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const stuckPrepOrders = await Order.find({
      status: { $in: ['confirmed', 'preparing'] },
      updatedAt: { $lt: twoHoursAgo },
    }).select('_id orderNumber status items.store').lean();

    if (stuckPrepOrders.length > 0) {
      orderSocketService.emitToAdmin('ORDER_STUCK_ALERT', {
        type: 'preparation_stuck',
        count: stuckPrepOrders.length,
        orders: stuckPrepOrders.map(o => ({
          orderId: String(o._id),
          orderNumber: o.orderNumber,
          status: o.status,
        })),
        threshold: '2 hours',
        timestamp: now,
      });
      logger.info(`[ORDER LIFECYCLE] Alert: ${stuckPrepOrders.length} orders stuck in preparation`);
    }

    // 3. Alert for orders stuck in dispatched for > 3 hours
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const stuckDispatchOrders = await Order.find({
      status: { $in: ['dispatched', 'out_for_delivery'] },
      updatedAt: { $lt: threeHoursAgo },
    }).select('_id orderNumber status items.store').lean();

    if (stuckDispatchOrders.length > 0) {
      // Notify admin
      orderSocketService.emitToAdmin('ORDER_STUCK_ALERT', {
        type: 'delivery_stuck',
        count: stuckDispatchOrders.length,
        orders: stuckDispatchOrders.map(o => ({
          orderId: String(o._id),
          orderNumber: o.orderNumber,
          status: o.status,
        })),
        threshold: '3 hours',
        timestamp: now,
      });

      // Notify each merchant
      for (const order of stuckDispatchOrders) {
        const storeId = order.items?.[0]?.store;
        if (storeId) {
          orderSocketService.emitToMerchant(
            String(storeId),
            'ORDER_DELIVERY_DELAYED',
            {
              orderId: String(order._id),
              orderNumber: order.orderNumber,
              status: order.status,
              message: 'Order has been in transit for over 3 hours',
              timestamp: now,
            }
          );
        }
      }

      logger.info(`[ORDER LIFECYCLE] Alert: ${stuckDispatchOrders.length} orders stuck in delivery`);
    }
  } catch (error) {
    logger.error('[ORDER LIFECYCLE] Stuck order detection failed:', error);
  } finally {
    await redisService.releaseLock(lockKey, lockToken);
  }
}

/**
 * Payment Verification Recovery
 *
 * Finds orders with pending payment + gateway order ID but >30 min old,
 * checks with Razorpay for actual payment status, and recovers if paid.
 */
async function runPaymentVerificationRecovery(): Promise<void> {
  const lockKey = 'job:order-lifecycle';
  const lockToken = await redisService.acquireLock(lockKey, 300);
  if (!lockToken) {
    logger.info('order-lifecycle skipped — lock held by another instance');
    return;
  }

  const now = new Date();

  try {
    const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    const pendingPaymentOrders = await Order.find({
      status: 'placed',
      'payment.status': 'pending',
      'payment.method': { $ne: 'cod' },
      createdAt: { $lt: thirtyMinAgo, $gt: twoHoursAgo },
    }).select('_id orderNumber paymentGateway totals user').lean();

    let recovered = 0;
    let autoCancelled = 0;

    for (const order of pendingPaymentOrders) {
      try {
        const gatewayOrderId = (order as any).paymentGateway?.gatewayOrderId;
        if (!gatewayOrderId) continue;

        // Try to verify payment with Razorpay API
        try {
          const Razorpay = require('razorpay');
          const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
          });
          const rzpOrder = await razorpay.orders.fetch(gatewayOrderId);

          if (rzpOrder.status === 'paid') {
            // Payment was actually captured — recover the order
            await Order.findByIdAndUpdate(order._id, {
              $set: {
                'payment.status': 'paid',
                'payment.paidAt': now,
              },
              $push: {
                timeline: {
                  status: 'payment_recovered',
                  message: 'Payment verified via background recovery check',
                  timestamp: now,
                  updatedBy: 'system',
                },
              },
            });
            recovered++;
            logger.info(`[ORDER LIFECYCLE] Payment recovered for order: ${order.orderNumber}`);
          }
        } catch {
          // Gateway verification failed — not an error, just couldn't verify
        }
      } catch (err) {
        logger.error(`[ORDER LIFECYCLE] Payment recovery failed for ${order.orderNumber}:`, err);
      }
    }

    // Auto-cancel orders pending payment for > 2 hours
    const expiredPaymentOrders = await Order.find({
      status: 'placed',
      'payment.status': 'pending',
      'payment.method': { $ne: 'cod' },
      createdAt: { $lt: twoHoursAgo },
    }).select('_id orderNumber items').lean();

    // Batch restore stock: collect all product increments across all expired orders
    const stockIncrements = new Map<string, number>();
    for (const order of expiredPaymentOrders) {
      for (const item of order.items || []) {
        const pid = item.product.toString();
        stockIncrements.set(pid, (stockIncrements.get(pid) || 0) + item.quantity);
      }
    }

    // Single bulkWrite for all stock restores instead of N*M individual queries
    if (stockIncrements.size > 0) {
      const bulkOps = Array.from(stockIncrements.entries()).map(([productId, qty]) => ({
        updateOne: {
          filter: { _id: productId },
          update: { $inc: { 'inventory.stock': qty } },
        },
      }));
      try {
        await Product.bulkWrite(bulkOps, { ordered: false });
      } catch (err) {
        logger.error('[ORDER LIFECYCLE] Bulk stock restore failed:', err);
      }
    }

    // Batch cancel all expired orders
    for (const order of expiredPaymentOrders) {
      try {
        await Order.findByIdAndUpdate(order._id, {
          $set: {
            status: 'cancelled',
            cancelReason: 'Auto-cancelled: payment not received within 2 hours',
            cancelledAt: now,
            'delivery.status': 'failed',
          },
          $push: {
            timeline: {
              status: 'cancelled',
              message: 'Order auto-cancelled: payment timeout exceeded 2 hours',
              timestamp: now,
              updatedBy: 'system',
            },
          },
        });
        autoCancelled++;
      } catch (err) {
        logger.error(`[ORDER LIFECYCLE] Auto-cancel failed for ${order.orderNumber}:`, err);
      }
    }

    if (recovered > 0 || autoCancelled > 0) {
      logger.info(`[ORDER LIFECYCLE] Payment recovery: ${recovered} recovered, ${autoCancelled} auto-cancelled`);
    }
  } catch (error) {
    logger.error('[ORDER LIFECYCLE] Payment verification recovery failed:', error);
  } finally {
    await redisService.releaseLock(lockKey, lockToken);
  }
}

/**
 * Return Window Expiry Logging
 *
 * Logs metrics for delivered orders past the return window.
 * No action needed since the model method already checks timestamp.
 */
async function runReturnWindowCheck(): Promise<void> {
  const lockKey = 'job:order-lifecycle';
  const lockToken = await redisService.acquireLock(lockKey, 300);
  if (!lockToken) {
    logger.info('order-lifecycle skipped — lock held by another instance');
    return;
  }

  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const expiredReturnOrders = await Order.countDocuments({
      status: 'delivered',
      'delivery.deliveredAt': {
        $gte: fortyEightHoursAgo,
        $lt: twentyFourHoursAgo,
      },
    });

    if (expiredReturnOrders > 0) {
      logger.info(`[ORDER LIFECYCLE] ${expiredReturnOrders} orders passed the 24h return window`);
    }
  } catch (error) {
    logger.error('[ORDER LIFECYCLE] Return window check failed:', error);
  } finally {
    await redisService.releaseLock(lockKey, lockToken);
  }
}

/**
 * Initialize all order lifecycle cron jobs
 */
export function initializeOrderLifecycleJobs(): void {
  // Stuck order detection — every 10 minutes
  cron.schedule('*/10 * * * *', () => {
    runStuckOrderDetection().catch(err => logger.error('[ORDER LIFECYCLE] Stuck order detection unhandled error:', err));
  });
  logger.info('  Order stuck detection job started (runs every 10 min)');

  // Payment verification recovery — every 15 minutes
  cron.schedule('*/15 * * * *', () => {
    runPaymentVerificationRecovery().catch(err => logger.error('[ORDER LIFECYCLE] Payment verification recovery unhandled error:', err));
  });
  logger.info('  Payment verification recovery job started (runs every 15 min)');

  // Return window logging — daily at midnight
  cron.schedule('0 0 * * *', () => {
    runReturnWindowCheck().catch(err => logger.error('[ORDER LIFECYCLE] Return window check unhandled error:', err));
  });
  logger.info('  Return window check job started (runs daily at midnight)');

  // Order alert checks — every 30 minutes
  cron.schedule('*/30 * * * *', () => {
    runOrderAlertChecks().catch(err => logger.error('[ORDER LIFECYCLE] Order alert checks unhandled error:', err));
  });
  logger.info('  Order alert checks started (runs every 30 min)');
}

// Export individual functions for testing
export {
  runStuckOrderDetection,
  runPaymentVerificationRecovery,
  runReturnWindowCheck,
};
