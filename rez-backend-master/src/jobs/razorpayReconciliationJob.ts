/**
 * razorpayReconciliationJob.ts
 *
 * Runs every 15 minutes to detect orders that Razorpay has marked as paid
 * but whose app-side payment.status is still 'pending' or 'awaiting_payment'.
 *
 * This catches payments lost during Render cold-start webhook timeouts:
 * Razorpay fires a webhook, the service is sleeping, the 5-second timeout
 * expires, Razorpay retries with backoff and eventually gives up — leaving
 * the order stuck in payment_pending while the user was already charged.
 *
 * Flow:
 *   1. Acquire a distributed lock (prevents concurrent runs on multi-pod deploys)
 *   2. Find orders with payment.status IN ['pending','awaiting_payment'] older
 *      than 10 minutes that have a paymentGateway.gatewayOrderId (i.e. a
 *      Razorpay order was actually created for them)
 *   3. For each such order, call razorpay.orders.fetch(gatewayOrderId)
 *   4. If Razorpay returns status === 'paid', fetch the captured payment via
 *      razorpay.orders.fetchPayments(gatewayOrderId)
 *   5. Update the order document to reflect the recovered payment
 *   6. Log a warning and send a Sentry alert for every recovery
 */

import Razorpay from 'razorpay';
import { createServiceLogger } from '../config/logger';
import * as Sentry from '@sentry/node';
import redisService from '../services/redisService';

const logger = createServiceLogger('razorpay-reconciliation');

const LOCK_KEY = 'job:razorpay-reconciliation';
const LOCK_TTL = 12 * 60; // 12 minutes — safely under the 15-minute repeat interval
const STUCK_THRESHOLD_MINUTES = 10;
const BATCH_SIZE = 50;

// ---------------------------------------------------------------------------
// Lazy Razorpay instance — only created when env vars are present.
// Lazily instantiated so a missing key in dev/test doesn't throw at module load.
// ---------------------------------------------------------------------------

let _razorpay: Razorpay | null | undefined; // undefined = not yet checked

function getRazorpayInstance(): Razorpay | null {
  if (_razorpay !== undefined) return _razorpay;

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    _razorpay = null;
    return null;
  }

  _razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  return _razorpay;
}

// ---------------------------------------------------------------------------
// Result shape
// ---------------------------------------------------------------------------

export interface RazorpayReconciliationResult {
  checked: number;
  recovered: number;
  errors: string[];
  skipped?: boolean;
}

// ---------------------------------------------------------------------------
// Main job function
// ---------------------------------------------------------------------------

export async function runRazorpayReconciliation(): Promise<RazorpayReconciliationResult> {
  const razorpay = getRazorpayInstance();

  if (!razorpay) {
    logger.warn('[RAZORPAY-RECON] Razorpay env vars not set — skipping reconciliation');
    return { checked: 0, recovered: 0, errors: [], skipped: true };
  }

  // Distributed lock — skip silently if another pod is already running
  const lockToken = await redisService.acquireLock(LOCK_KEY, LOCK_TTL);
  if (!lockToken) {
    logger.debug('[RAZORPAY-RECON] Lock held by another instance — skipping');
    return { checked: 0, recovered: 0, errors: [], skipped: true };
  }

  const errors: string[] = [];
  let checked = 0;
  let recovered = 0;

  try {
    // Lazy import to avoid circular dependency at module load time
    const { Order } = await import('../models/Order');

    const cutoff = new Date(Date.now() - STUCK_THRESHOLD_MINUTES * 60 * 1000);

    // Orders where:
    //  - payment has not been confirmed on our side
    //  - a Razorpay order ID exists (payment flow was initiated)
    //  - the order is old enough that a webhook should have arrived by now
    const stuckOrders = await Order.find({
      'payment.status': { $in: ['pending', 'awaiting_payment'] },
      'paymentGateway.gatewayOrderId': { $exists: true, $nin: [null, ''] },
      createdAt: { $lt: cutoff },
      deletedAt: null,
    })
      .select('_id orderNumber user payment paymentGateway totals createdAt')
      .limit(BATCH_SIZE)
      .lean();

    checked = stuckOrders.length;

    if (checked === 0) {
      logger.info('[RAZORPAY-RECON] No stuck orders found');
      return { checked, recovered, errors };
    }

    logger.info(`[RAZORPAY-RECON] Found ${checked} stuck order(s) to check against Razorpay`);

    for (const order of stuckOrders) {
      const gatewayOrderId = (order as any).paymentGateway?.gatewayOrderId as string | undefined;
      if (!gatewayOrderId) continue;

      try {
        // Query Razorpay for the canonical order status
        const rzpOrder = await (razorpay.orders.fetch(gatewayOrderId) as unknown as Promise<any>);

        if (rzpOrder?.status !== 'paid') {
          // Still unpaid on Razorpay's side — nothing to recover yet
          logger.debug('[RAZORPAY-RECON] Order not yet paid on Razorpay', {
            appOrderId: String((order as any)._id),
            gatewayOrderId,
            rzpStatus: rzpOrder?.status,
          });
          continue;
        }

        // Razorpay says paid — find the captured payment
        const paymentsResponse = await (razorpay.orders.fetchPayments(gatewayOrderId) as unknown as Promise<any>);
        const capturedPayment = paymentsResponse?.items?.find((p: any) => p.status === 'captured');

        if (!capturedPayment) {
          logger.warn('[RAZORPAY-RECON] Razorpay order is "paid" but no captured payment found', {
            appOrderId: String((order as any)._id),
            gatewayOrderId,
          });
          continue;
        }

        // Recover: update the order to reflect the payment we missed
        await Order.findByIdAndUpdate((order as any)._id, {
          $set: {
            'payment.status': 'paid',
            'payment.transactionId': capturedPayment.id,
            'payment.paidAt': new Date(capturedPayment.created_at * 1000),
            'paymentGateway.gatewayPaymentId': capturedPayment.id,
            'paymentGateway.recoveredByReconciliation': true,
            'paymentGateway.recoveredAt': new Date(),
          },
        });

        recovered++;

        // Re-trigger the post-payment pipeline if it has not already run.
        // Use the same atomic claim pattern as the webhook handler: only the
        // winner of the findOneAndUpdate proceeds — all concurrent runs are
        // silently skipped.
        const pipelineToken = await Order.findOneAndUpdate(
          { _id: (order as any)._id, postPaymentProcessed: { $ne: true } },
          { $set: { postPaymentProcessed: true } },
          { new: false },
        );

        if (pipelineToken) {
          try {
            // Lazy import to keep the same circular-dependency boundary used above
            const paymentService = (await import('../services/PaymentService')).default;
            await paymentService.handlePaymentSuccess(String((order as any)._id), {
              razorpay_order_id: gatewayOrderId,
              razorpay_payment_id: capturedPayment.id,
              razorpay_signature: '',
            });
            logger.info('[RECON] Re-triggered post-payment pipeline', { paymentId: String((order as any)._id) });
          } catch (pipelineErr: any) {
            logger.error('[RECON] Post-payment pipeline re-trigger failed', {
              paymentId: String((order as any)._id),
              error: pipelineErr?.message,
            });
            // Reset flag so the next reconciliation run retries the pipeline
            await Order.findByIdAndUpdate((order as any)._id, {
              $set: { postPaymentProcessed: false },
            }).catch(() => {});
          }
        }

        const meta = {
          appOrderId: String((order as any)._id),
          orderNumber: (order as any).orderNumber,
          gatewayOrderId,
          gatewayPaymentId: capturedPayment.id,
          amountINR: capturedPayment.amount / 100,
          userId: String((order as any).user),
        };

        logger.warn('[RAZORPAY-RECON] Payment recovered by reconciliation', meta);

        Sentry.captureMessage('[RAZORPAY-RECON] Missed webhook payment recovered', {
          level: 'warning',
          extra: meta,
        });
      } catch (orderErr: any) {
        const msg = `Order ${String((order as any)._id)}: ${orderErr?.message ?? String(orderErr)}`;
        logger.error('[RAZORPAY-RECON] Error processing order', {
          orderId: String((order as any)._id),
          gatewayOrderId,
          error: orderErr?.message,
        });
        errors.push(msg);
      }

      // Throttle Razorpay API calls — their rate limit is 60 req/min per key
      await new Promise<void>((resolve) => setTimeout(resolve, 150));
    }
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    logger.error('[RAZORPAY-RECON] Job failed with unexpected error', { error: msg });
    errors.push(msg);
    Sentry.captureException(err);
  } finally {
    await redisService.releaseLock(LOCK_KEY, lockToken).catch(() => {});
  }

  logger.info('[RAZORPAY-RECON] Run complete', { checked, recovered, errorCount: errors.length });
  return { checked, recovered, errors };
}
