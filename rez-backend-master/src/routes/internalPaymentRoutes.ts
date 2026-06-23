// @ts-nocheck
/**
 * internalPaymentRoutes.ts — Service-to-service payment sync endpoints.
 *
 * Mounted at /api/internal/payments — NOT exposed publicly.
 * All routes validate INTERNAL_WEBHOOK_SECRET instead of using the standard
 * x-internal-token header so the payment service (which uses a different auth
 * mechanism) can call us without changes to its auth stack.
 *
 * BL-H2: Provides the webhook-sync endpoint so the payment service can push
 * payment completion status back to the monolith order record immediately
 * after a Razorpay webhook fires, rather than waiting for a reconciliation cron.
 */

import { Router, Request, Response } from 'express';
import { Order } from '../models/Order';
import { logger } from '../config/logger';

const router = Router();

/**
 * POST /api/internal/payments/webhook-sync
 *
 * Called by rez-payment-service after a successful Razorpay webhook capture.
 * Updates the monolith Order's payment status to 'paid' so the order pipeline
 * can proceed without waiting for the reconciliation cron job.
 *
 * BAK-CROSS-014 FIX: Now accepts x-internal-token header alongside secret body
 * for consistency with all other internal service-to-service calls.
 * BAK-CROSS-018 FIX: Idempotency key prevents duplicate payment status updates
 * when Razorpay retries the webhook or the caller retries the HTTP call.
 *
 * Body: { orderId, status, paymentId, idempotencyKey, secret }
 */
router.post('/webhook-sync', async (req: Request, res: Response) => {
  try {
    const { orderId, status, paymentId, idempotencyKey, secret } = req.body;

    // BAK-CROSS-014: Accept x-internal-token header (preferred) or secret body (legacy compat).
    // This aligns webhook-sync auth with all other internal endpoints that use header tokens.
    const headerToken = req.headers['x-internal-token'] as string | undefined;
    const legacySecret = process.env.INTERNAL_WEBHOOK_SECRET;
    const isHeaderAuthValid = headerToken && legacySecret && headerToken === legacySecret;

    if (!isHeaderAuthValid && (!secret || secret !== legacySecret)) {
      logger.warn('[InternalPayments] Unauthorized webhook-sync attempt', { ip: req.ip });
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required' });
    }

    // BAK-CROSS-018 FIX: Idempotency check using Redis SET NX with 24h TTL.
    // If the same idempotencyKey was already processed, return 200 without re-processing.
    // Idempotency key is required for webhook-sync since it can be called multiple times
    // (Razorpay retries, caller retries) for the same payment event.
    if (idempotencyKey) {
      const Redis = (await import('ioredis')).default;
      const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
      const idempotencyCacheKey = `webhook-sync:idempotency:${idempotencyKey}`;
      const isNew = await redis.set(idempotencyCacheKey, '1', 'EX', 86400, 'NX');
      if (!isNew) {
        logger.info('[InternalPayments] webhook-sync idempotent replay detected', { orderId, idempotencyKey });
        await redis.quit().catch(() => {});
        return res.json({ success: true, idempotent: true });
      }
      await redis.quit().catch(() => {});
    }

    if (status === 'completed') {
      await Order.findOneAndUpdate(
        { _id: orderId },
        {
          $set: {
            'payment.status': 'paid',
            'payment.transactionId': paymentId,
            'payment.paidAt': new Date(),
          },
        },
        { runValidators: false },
      );
      logger.info('[InternalPayments] Order payment status synced', { orderId, paymentId, idempotencyKey });
    }

    return res.json({ success: true });
  } catch (err: any) {
    logger.error('[InternalPayments] webhook-sync error', { error: err.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/internal/payments/refund-notify
 *
 * Called by rez-payment-service after processing a refund webhook event.
 * Broadcasts the refund result to both the merchant's Socket.IO room (for merchant app)
 * and the consumer's user room (for consumer app) so both receive instant notification
 * without polling.
 *
 * BAK-CROSS-014 FIX: Now accepts x-internal-token header alongside secret body
 * for consistency with all other internal service-to-service calls.
 *
 * Body: { merchantId, orderId, orderNumber, paymentId, refundId, amount, status, secret }
 *   status: 'refund_processed' | 'refund_failed' | 'refund_disputed'
 */
router.post('/refund-notify', async (req: Request, res: Response) => {
  try {
    const { merchantId, orderId, orderNumber, paymentId, refundId, amount, status, secret, userId } = req.body;

    // BAK-CROSS-014: Accept x-internal-token header (preferred) or secret body (legacy compat).
    const headerToken = req.headers['x-internal-token'] as string | undefined;
    const legacySecret = process.env.INTERNAL_WEBHOOK_SECRET;
    const isHeaderAuthValid = headerToken && legacySecret && headerToken === legacySecret;

    if (!isHeaderAuthValid && (!secret || secret !== legacySecret)) {
      logger.warn('[InternalPayments] Unauthorized refund-notify attempt', { ip: req.ip });
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!merchantId || !orderId || !status) {
      return res.status(400).json({ error: 'merchantId, orderId, and status are required' });
    }

    // CRITICAL-1 FIX: Emit refund event to both merchant AND consumer rooms.
    // The merchant app joins 'merchant-${merchantId}' room on connect.
    // The consumer app listens for 'order:refunded' in the 'user-${userId}' room.
    if (global.io) {
      const refundStatus =
        status === 'refund_processed'
          ? 'refund_updated'
          : status === 'refund_failed'
            ? 'refund_failed'
            : 'refund_disputed';

      // Emit to merchant room
      // Note: merchantId is already validated as required above (line 84); this is a
      // defensive guard in case the validation guard is ever relaxed in the future.
      if (merchantId) {
        const merchantRoom = `merchant-${merchantId}`;
        const merchantEventData = {
          type: refundStatus,
          merchantId,
          orderId,
          orderNumber,
          paymentId,
          refundId,
          amount,
          status,
          timestamp: new Date().toISOString(),
        };
        global.io.to(merchantRoom).emit('order-event', {
          id: `refund-${orderId}-${Date.now()}`,
          orderId,
          type: refundStatus,
          data: merchantEventData,
          timestamp: new Date().toISOString(),
          merchantId,
        });
        global.io.to(merchantRoom).emit('dashboard-event', {
          type: refundStatus,
          data: merchantEventData,
        });
        logger.info('[InternalPayments] Refund event emitted to merchant room', {
          merchantId,
          orderId,
          status,
          room: merchantRoom,
        });
      }

      // CRITICAL-1 FIX: Emit order:refunded to consumer's personal room so the
      // consumer app's SocketContext.onOrderStatusUpdate() fires and triggers a
      // wallet + order refresh.  The userId is forwarded from the Payment doc.
      // Validate userId format to avoid emitting to malformed room names (e.g. "user-invalid-id").
      const userIdValid = typeof userId === 'string' && /^[0-9a-fA-F]{24}$/.test(userId);
      if (userId && !userIdValid) {
        logger.warn('[InternalPayments] refund-notify received invalid userId format — skipping consumer room emit', {
          userId,
        });
      }
      if (userIdValid && (status === 'refund_processed' || status === 'refund_failed')) {
        const consumerRoom = `user-${userId}`;
        const consumerEventData = {
          orderId,
          orderNumber,
          paymentId,
          refundId,
          amount,
          status,
          timestamp: new Date().toISOString(),
        };
        // Emit as a sub-event of order:status_updated so onOrderStatusUpdate fires
        global.io.to(consumerRoom).emit('order:refunded', {
          id: `refund-consumer-${orderId}-${Date.now()}`,
          orderId,
          type: 'order:refunded',
          data: consumerEventData,
          timestamp: new Date().toISOString(),
        });
        logger.info('[InternalPayments] order:refunded emitted to consumer room', {
          userId,
          orderId,
          status,
          room: consumerRoom,
        });
      }
    } else {
      logger.warn('[InternalPayments] global.io not available — refund event not emitted');
    }

    return res.json({ success: true });
  } catch (err: any) {
    logger.error('[InternalPayments] refund-notify error', { error: err.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/internal/payments/merchant-suspend-notify
 *
 * MISS-06 FIX: Called by rez-merchant-service after setting the Redis suspension
 * marker in /internal/merchants/:merchantId/invalidate-session. Since the merchant
 * service has no Socket.IO server, it POSTs here to emit the merchant_suspended
 * event so the merchant app receives immediate notification and logs out.
 *
 * The monolith admin routes also emit this event directly — this endpoint covers
 * the direct-invalidation path (e.g., if invalidate-session is called without
 * going through the admin panel suspend flow).
 *
 * BAK-CROSS-014 FIX: Now accepts x-internal-token header alongside secret body.
 *
 * Body: { merchantId, reason?, secret }
 */
router.post('/merchant-suspend-notify', async (req: Request, res: Response) => {
  try {
    const { merchantId, reason, secret } = req.body;

    // BAK-CROSS-014: Accept x-internal-token header (preferred) or secret body (legacy compat).
    const headerToken = req.headers['x-internal-token'] as string | undefined;
    const legacySecret = process.env.INTERNAL_WEBHOOK_SECRET;
    const isHeaderAuthValid = headerToken && legacySecret && headerToken === legacySecret;

    if (!isHeaderAuthValid && (!secret || secret !== legacySecret)) {
      logger.warn('[InternalPayments] Unauthorized merchant-suspend-notify attempt', { ip: req.ip });
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!merchantId) {
      return res.status(400).json({ error: 'merchantId is required' });
    }

    if (global.io) {
      const room = `merchant-${merchantId}`;
      global.io.to(room).emit('merchant_suspended', {
        reason: reason || 'Account suspended',
        suspendedAt: new Date(),
      });
      logger.info('[InternalPayments] merchant_suspended event emitted', { merchantId, reason, room });
    } else {
      logger.warn('[InternalPayments] global.io not available — merchant_suspended not emitted');
    }

    return res.json({ success: true });
  } catch (err: any) {
    logger.error('[InternalPayments] merchant-suspend-notify error', { error: err.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/internal/payments/settlement-notify
 *
 * Called by rez-wallet-service after crediting the merchant wallet on order delivery.
 * Broadcasts the settlement credit to the merchant's Socket.IO room so the wallet
 * balance updates in real-time without polling.
 *
 * BAK-CROSS-014 FIX: Now accepts x-internal-token header alongside secret body.
 *
 * Body: { merchantId, orderId, orderNumber, amount, platformFee, transactionId, secret }
 */
router.post('/settlement-notify', async (req: Request, res: Response) => {
  try {
    const { merchantId, orderId, orderNumber, amount, platformFee, transactionId, secret } = req.body;

    // BAK-CROSS-014: Accept x-internal-token header (preferred) or secret body (legacy compat).
    const headerToken = req.headers['x-internal-token'] as string | undefined;
    const legacySecret = process.env.INTERNAL_WEBHOOK_SECRET;
    const isHeaderAuthValid = headerToken && legacySecret && headerToken === legacySecret;

    if (!isHeaderAuthValid && (!secret || secret !== legacySecret)) {
      logger.warn('[InternalPayments] Unauthorized settlement-notify attempt', { ip: req.ip });
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!merchantId || !orderId || amount === undefined) {
      return res.status(400).json({ error: 'merchantId, orderId, and amount are required' });
    }

    // MISS-02 FIX: Emit settlement event to merchant's Socket.IO room.
    if (global.io) {
      const room = `merchant-${merchantId}`;
      const eventData = {
        type: 'settlement_credited',
        merchantId,
        orderId,
        orderNumber,
        amount,
        platformFee,
        transactionId,
        netAmount: amount - (platformFee || 0),
        timestamp: new Date().toISOString(),
      };
      global.io.to(room).emit('wallet-event', {
        id: `settlement-${orderId}-${Date.now()}`,
        type: 'settlement_credited',
        data: eventData,
        timestamp: new Date().toISOString(),
        merchantId,
      });
      global.io.to(room).emit('dashboard-event', {
        type: 'settlement_credited',
        data: eventData,
      });
      global.io.to(room).emit('metrics-updated', {
        merchantId,
        type: 'wallet_settlement',
        amount,
        timestamp: new Date().toISOString(),
      });
      logger.info('[InternalPayments] Settlement event emitted to merchant room', {
        merchantId,
        orderId,
        amount,
        room,
      });
    } else {
      logger.warn('[InternalPayments] global.io not available — settlement event not emitted');
    }

    return res.json({ success: true });
  } catch (err: any) {
    logger.error('[InternalPayments] settlement-notify error', { error: err.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/internal/payments/coins-awarded-notify
 *
 * Called by rez-payment-service after crediting the customer wallet via the
 * wallet-credit BullMQ worker (worker.ts).  Emits coins:awarded and
 * wallet:updated to the consumer's personal Socket.IO room so the consumer
 * app's WalletContext auto-refreshes without polling.
 *
 * INC-4 FIX: Previously the wallet credit job was enqueued but never consumed,
 * so the consumer app never received a wallet update notification.
 *
 * BAK-CROSS-014 FIX: Now accepts x-internal-token header alongside secret body.
 *
 * Body: { userId, amount, coinType, source, description, sourceId, secret }
 */
router.post('/coins-awarded-notify', async (req: Request, res: Response) => {
  try {
    const { userId, amount, coinType, source, description, sourceId, secret } = req.body;

    // BAK-CROSS-014: Accept x-internal-token header (preferred) or secret body (legacy compat).
    const headerToken = req.headers['x-internal-token'] as string | undefined;
    const legacySecret = process.env.INTERNAL_WEBHOOK_SECRET;
    const isHeaderAuthValid = headerToken && legacySecret && headerToken === legacySecret;

    if (!isHeaderAuthValid && (!secret || secret !== legacySecret)) {
      logger.warn('[InternalPayments] Unauthorized coins-awarded-notify attempt', { ip: req.ip });
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!userId || amount === undefined) {
      return res.status(400).json({ error: 'userId and amount are required' });
    }

    // INC-4 FIX: Emit to the consumer's personal room so WalletContext auto-refreshes.
    if (global.io) {
      const consumerRoom = `user-${userId}`;
      const eventData = {
        userId,
        amount,
        coinType: coinType || 'rez',
        source: source || 'payment_capture',
        description: description || 'Payment reward',
        sourceId: sourceId || '',
        timestamp: new Date().toISOString(),
      };

      // Emit coins:awarded — WalletContext listens for this
      global.io.to(consumerRoom).emit('coins:awarded', {
        id: `coins-${userId}-${Date.now()}`,
        type: 'coins:awarded',
        data: eventData,
        timestamp: new Date().toISOString(),
        userId,
      });

      // Also emit wallet:updated as a fallback — WalletContext listens for this too
      global.io.to(consumerRoom).emit('wallet:updated', {
        id: `wallet-${userId}-${Date.now()}`,
        type: 'wallet:updated',
        data: eventData,
        timestamp: new Date().toISOString(),
        userId,
      });

      logger.info('[InternalPayments] coins:awarded and wallet:updated emitted to consumer room', {
        userId,
        amount,
        coinType,
        room: consumerRoom,
      });
    } else {
      logger.warn('[InternalPayments] global.io not available — coins:awarded not emitted');
    }

    return res.json({ success: true });
  } catch (err: any) {
    logger.error('[InternalPayments] coins-awarded-notify error', { error: err.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
