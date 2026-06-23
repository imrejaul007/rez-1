// @ts-nocheck
import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendError } from '../utils/response';
import { authenticate } from '../middleware/auth';
import mongoose from 'mongoose';
import { logger } from '../config/logger';
import { validate, validateParams, Joi, commonSchemas } from '../middleware/validation';
import { createRateLimiter } from '../middleware/rateLimiter';
// H22 FIX: gamificationEventBus and fireGamificationVisit (HTTP call) imports removed.
// Both were duplicate gamification paths causing triple coin awards on every check-in.
// The BullMQ job below is the sole, durable path with automatic retry.
import { Queue } from 'bullmq';
import { bullmqRedis } from '../config/bullmq-connection';
import redisService from '../services/redisService';
import { Store } from '../models/Store';
import { merchantRewardService } from '../merchantservices/merchantRewardService';
import pushNotificationService from '../services/pushNotificationService';

// Lazy-initialised queue for store-visit-events (streak worker)
let _storeVisitQueue: Queue | null = null;
function getStoreVisitQueue(): Queue {
  if (!_storeVisitQueue) {
    _storeVisitQueue = new Queue('store-visit-events', {
      connection: bullmqRedis,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });
  }
  return _storeVisitQueue;
}

// 5 check-ins per user per minute — prevents coin-farming via rapid scanning
const qrCheckinLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 5,
  message: 'Too many check-in attempts. Please wait before trying again.',
  prefix: 'rl:qr-checkin',
});

const qrCheckinSchema = Joi.object({
  storeId: commonSchemas.objectId().required().messages({
    'any.required': 'storeId is required',
    'string.length': 'Invalid storeId format',
  }),
  amount: Joi.number().positive().max(50000).required().messages({
    'number.positive': 'Amount must be positive',
    'number.max': 'Amount cannot exceed ₹50,000 per check-in',
    'any.required': 'amount is required',
  }),
  paymentMethod: Joi.string().valid('cash', 'upi', 'card', 'wallet').default('cash'),
});

const router = Router();

/**
 * POST /api/qr-checkin
 * Consumer scans merchant QR, self-reports amount, earns coins.
 * Auth: consumer JWT required.
 * Body: { storeId, amount, paymentMethod? }
 */
router.post(
  '/',
  authenticate,
  qrCheckinLimiter,
  validate(qrCheckinSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    const { storeId, amount, paymentMethod = 'cash' } = req.body;

    const store = await Store.findById(storeId).select('name merchantId isActive').lean();
    if (!store || !store.isActive) {
      sendError(res, 'Store not found', 404);
      return;
    }

    // Idempotency: prevent same user scanning same store within 15 minutes.
    // Atomic SET NX — claim the cooldown slot BEFORE processing the reward to
    // eliminate the race condition where two concurrent requests both read
    // recentCheckin=null and both proceed to award coins.
    const lockKey = `qr-checkin:${userId}:${storeId}`;
    // Returns 'OK' on success (key did not exist), null if key already exists.
    const acquiredCooldown = await (redisService as any).set(lockKey, '1', 'EX', 900, 'NX');
    if (!acquiredCooldown) {
      if (acquiredCooldown === null) {
        logger.error('[QR CHECKIN] Redis lock acquisition failed — failing closed', { userId, storeId });
        sendError(res, 'Service temporarily unavailable. Please try again.', 503);
        return;
      }
      sendError(res, 'You already checked in at this store recently. Please wait before checking in again.', 429);
      return;
    }

    // Award coins via merchantRewardService (idempotent, journaled)
    const sessionId = `qr-checkin:${userId}:${storeId}:${Date.now()}`;
    try {
      const result = await merchantRewardService.processReward({
        sessionId,
        merchantId: store.merchantId?.toString() || '',
        storeId: storeId,
        userId: userId.toString(),
        eventType: 'payment',
        // NOTE: amount is self-reported by the consumer — it is NOT verified by
        // a payment gateway. The selfReported flag instructs merchantRewardService
        // to apply stricter coin caps and flag for risk scoring.
        amount: Number(amount),
        metadata: {
          selfReported: true, // Flag: amount not verified by payment gateway
          paymentMethod,
          source: 'qr_checkin',
        },
      });

      // Push notification to consumer
      const coinsEarned = (result as any)?.coinsIssued || (result as any)?.decision?.coinsIssued || 0;
      pushNotificationService
        .sendPushToUser(userId.toString(), {
          title: `Checked in at ${store.name} ✅`,
          body: coinsEarned > 0 ? `You earned ${coinsEarned} REZ coins!` : `Visit recorded at ${store.name}.`,
          data: { screen: 'wallet' },
        })
        .catch(() => {});

      logger.info(`[QR CHECKIN] userId=${userId} storeId=${storeId} amount=${amount} coins=${coinsEarned}`);

      sendSuccess(
        res,
        {
          storeName: store.name,
          amount: Number(amount),
          coinsEarned,
          message: coinsEarned > 0 ? `You earned ${coinsEarned} REZ coins!` : 'Visit recorded!',
        },
        'Check-in successful',
      );

      // H22 FIX: Previously three paths fired gamification on every check-in, causing
      // triple coin awards:
      //   1. gamificationEventBus.emit() — in-process event bus
      //   2. BullMQ job → rez-gamification-service streak worker
      //   3. HTTP POST → rez-gamification-service /internal/visit
      //
      // KEEP ONLY the BullMQ job (path 2): it is durable, retries on failure, and is
      // the authoritative channel for the streak worker. The in-process event bus
      // (path 1) is redundant because the streak worker handles all coin awards.
      // The direct HTTP call (path 3) duplicated the BullMQ worker's milestone logic.
      //
      // If in-process streak reactions are ever needed in future, add them to the
      // BullMQ worker's completion handler — not here — to keep a single source of truth.
      const merchantId = store.merchantId?.toString() || '';
      setImmediate(() => {
        // Durable BullMQ job → rez-gamification-service streak worker (sole path)
        getStoreVisitQueue()
          .add('store_visit', {
            eventId: sessionId,
            userId: userId.toString(),
            merchantId,
            storeId: storeId.toString(),
            timestamp: new Date().toISOString(),
          })
          .catch(() => {}); // Non-fatal: BullMQ has internal retry (3 attempts, exponential backoff)
      });

      // CANONICAL visit.completed emit (Sprint 2 — dual-write alongside the
      // legacy store-visit-events queue above). Unlocks canonical subscribers
      // (scan-to-earn, lapsed-detection, retention automation) without
      // removing the streak-worker path. When the streak worker migrates to
      // the canonical bus in Sprint 2+, the legacy queue publish above can
      // be deleted.
      try {
        const { emitVisitCompleted } = await import('../events/emitVisitCompleted');
        emitVisitCompleted({
          merchantId,
          storeId: storeId.toString(),
          customerId: userId.toString(),
          visitId: sessionId,
          source: 'qr_checkin',
        });
      } catch (emitErr) {
        // Never-throws contract — defensive guard only. The helper itself
        // swallows publish failures.
        logger.warn('[QR CHECKIN] emitVisitCompleted failed (non-fatal)', {
          userId: userId.toString(),
          storeId: storeId.toString(),
          error: emitErr instanceof Error ? emitErr.message : String(emitErr),
        });
      }
    } catch (err: any) {
      logger.error('[QR CHECKIN] Failed: ' + err.message);
      sendError(res, 'Check-in failed. Please try again.', 500);
    }
  }),
);

/**
 * GET /api/qr-checkin/store/:storeId
 * Public: Returns store info for QR display (name, logo, category).
 * No auth required.
 */
router.get(
  '/store/:storeId',
  validateParams(Joi.object({ storeId: commonSchemas.objectId().required() })),
  asyncHandler(async (req: Request, res: Response) => {
    const { storeId } = req.params;

    const store = await Store.findById(storeId).select('name logo category location.city isActive').lean();

    if (!store || !store.isActive) {
      sendError(res, 'Store not found', 404);
      return;
    }

    sendSuccess(res, {
      _id: storeId,
      name: (store as any).name,
      logo: (store as any).logo,
      category: (store as any).category?.name,
      city: (store as any).location?.city,
    });
  }),
);

export default router;
