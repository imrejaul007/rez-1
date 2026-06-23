/**
 * Order Reconciliation Job
 *
 * Runs daily at 3 AM to verify financial integrity of delivered orders.
 * Checks for missing CoinTransaction, merchant wallet credits, and admin commission.
 */

import cron from 'node-cron';
import { Order } from '../models/Order';
import { CoinTransaction } from '../models/CoinTransaction';
import { LedgerEntry } from '../models/LedgerEntry';
import orderSocketService from '../services/orderSocketService';
import redisService from '../services/redisService';
import { logger } from '../config/logger';

interface Discrepancy {
  orderId: string;
  orderNumber: string;
  type: 'missing_purchase_reward' | 'missing_merchant_payout' | 'missing_admin_commission';
  expectedAmount: number;
  details: string;
}

/**
 * Run order reconciliation for delivered orders in the last 24 hours.
 */
async function runOrderReconciliation(): Promise<void> {
  const lockKey = 'job:order-reconciliation';
  let lockToken: string | null = null;

  try {
    lockToken = await redisService.acquireLock(lockKey, 600);
    if (!lockToken) {
      logger.info('order-reconciliation skipped — lock held by another instance');
      return;
    }

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const deliveredOrders = await Order.find({
      status: 'delivered',
      'delivery.deliveredAt': { $gte: twentyFourHoursAgo, $lte: now },
    })
      .select('_id orderNumber user totals items')
      .lean();

    if (deliveredOrders.length === 0) {
      logger.info('[ORDER RECONCILIATION] No delivered orders in last 24h');
      return;
    }

    const discrepancies: Discrepancy[] = [];

    for (const order of deliveredOrders) {
      const orderId = String(order._id);
      const userId = order.user ? String(order.user) : null;

      // 1. Verify purchase_reward CoinTransaction exists
      if (userId) {
        const purchaseReward = await CoinTransaction.findOne({
          userId,
          source: 'purchase_reward',
          'metadata.orderId': order._id,
        }).lean();

        const expectedCoins = Math.floor((order.totals?.subtotal || 0) * 0.05);
        if (!purchaseReward && expectedCoins > 0) {
          discrepancies.push({
            orderId,
            orderNumber: order.orderNumber,
            type: 'missing_purchase_reward',
            expectedAmount: expectedCoins,
            details: `Expected ${expectedCoins} purchase reward coins for subtotal ${order.totals?.subtotal}`,
          });
        }
      }

      // 2. Verify merchant payout ledger entry exists
      const merchantPayoutLedger = await LedgerEntry.findOne({
        referenceId: orderId,
        referenceModel: 'Order',
        operationType: 'merchant_payout',
      }).lean();

      const expectedPayout = (order.totals?.subtotal || 0) - (order.totals?.platformFee || 0);
      if (!merchantPayoutLedger && expectedPayout > 0) {
        discrepancies.push({
          orderId,
          orderNumber: order.orderNumber,
          type: 'missing_merchant_payout',
          expectedAmount: expectedPayout,
          details: `Expected merchant payout of ${expectedPayout} (subtotal: ${order.totals?.subtotal}, fee: ${order.totals?.platformFee})`,
        });
      }

      // 3. Verify admin commission (platform fee) ledger entry
      const platformFeeLedger = await LedgerEntry.findOne({
        referenceId: orderId,
        referenceModel: 'Order',
        operationType: 'order_payment',
      }).lean();

      const expectedPlatformFee = order.totals?.platformFee || 0;
      if (!platformFeeLedger && expectedPlatformFee > 0) {
        discrepancies.push({
          orderId,
          orderNumber: order.orderNumber,
          type: 'missing_admin_commission',
          expectedAmount: expectedPlatformFee,
          details: `Expected platform fee ledger entry of ${expectedPlatformFee}`,
        });
      }
    }

    // Log results
    logger.info(`[ORDER RECONCILIATION] Checked ${deliveredOrders.length} delivered orders, found ${discrepancies.length} discrepancies`);

    // Alert admin if discrepancies found
    if (discrepancies.length > 0) {
      orderSocketService.emitToAdmin('ORDER_RECONCILIATION_ALERT', {
        ordersChecked: deliveredOrders.length,
        discrepancyCount: discrepancies.length,
        discrepancies: discrepancies.slice(0, 20), // Limit to 20 for socket payload
        totalMissingAmount: discrepancies.reduce((sum, d) => sum + d.expectedAmount, 0),
        timestamp: now,
      });

      // Log each discrepancy
      for (const d of discrepancies) {
        logger.warn(`[ORDER RECONCILIATION] ${d.type}: ${d.orderNumber} - ${d.details}`);
      }

      // Create AdminAction entries for manual review
      try {
        const { AdminAction } = require('../models/AdminAction');
        const { Types } = require('mongoose');
        const SYSTEM_USER_ID = new Types.ObjectId('000000000000000000000000');

        for (const d of discrepancies) {
          try {
            await AdminAction.create({
              actionType: 'manual_adjustment',
              initiatorId: SYSTEM_USER_ID,
              status: 'pending_approval',
              payload: {
                orderId: d.orderId,
                orderNumber: d.orderNumber,
                discrepancyType: d.type,
                expectedAmount: d.expectedAmount,
              },
              reason: `Order reconciliation: ${d.details}`,
              threshold: d.expectedAmount,
            });
          } catch {
            // Duplicate or creation error — non-critical
          }
        }
      } catch (adminErr) {
        logger.error('[ORDER RECONCILIATION] Failed to create AdminAction entries:', adminErr);
      }
    }
  } catch (error) {
    logger.error('[ORDER RECONCILIATION] Job failed:', error);
  } finally {
    if (lockToken) {
      await redisService.releaseLock(lockKey, lockToken);
    }
  }
}

/**
 * Initialize the reconciliation cron job (daily at 3 AM)
 */
export function initializeOrderReconciliationJob(): void {
  cron.schedule('0 3 * * *', () => {
    runOrderReconciliation().catch(err => logger.error('[ORDER RECONCILIATION] Unhandled error:', err));
  });
  logger.info('  Order reconciliation job started (runs daily at 3 AM)');
}

export { runOrderReconciliation };
