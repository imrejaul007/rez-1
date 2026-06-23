import { Worker } from 'bullmq';
import { bullmqRedis } from '../config/bullmq-connection';
import { logger } from '../config/logger';
import { attachFailureHandler } from '../config/bullmqFailureHandler';
import { registerMerchantEventSubscribers } from '../events/merchantEventSubscribers';
import type { MerchantEvent } from '../events/merchantEventBus';

/**
 * Merchant Event Worker — processes durable merchant domain events from BullMQ.
 *
 * Handles financial and high-stakes events that must survive process crashes:
 *   ORDER_PAID, TABLE_PAID, APPOINTMENT_COMPLETED, PURCHASE_ORDER_RECEIVED,
 *   ITEM_EIGHTY_SIXED, CAMPAIGN_FIRED, BROADCAST_SENT
 *
 * Non-durable events (SHIFT_OPENED, REVIEW_RECEIVED, etc.) are handled
 * in-process via EventEmitter in merchantEventBus.ts — not this worker.
 *
 * v3 Architecture: Part 1.2 — registered in workers/index.ts
 */

// Build handler registry once on startup
const handlers = registerMerchantEventSubscribers();

export const merchantEventWorker = new Worker(
  'merchant-events',
  async (job) => {
    const event = job.data as MerchantEvent;

    if (!event?.type) {
      logger.warn('[MerchantEventWorker] Job missing event type', { jobId: job.id });
      return;
    }

    const handler = handlers[event.type as keyof typeof handlers];

    if (handler) {
      await handler(event);
    } else {
      // Log but don't fail — new event types may not have handlers yet
      logger.warn('[MerchantEventWorker] No durable handler registered for event type', {
        type: event.type,
        merchantId: event.merchantId,
        eventId: event.eventId,
      });
    }
  },
  {
    connection: bullmqRedis,
    concurrency: 10,
    limiter: { max: 500, duration: 60000 },
    stalledInterval: 30_000,
    maxStalledCount: 3,
    removeOnComplete: { age: 86400 }, // 24h — audit trail in MerchantRewardJournal
    removeOnFail: { age: 7 * 86400 }, // 7d for debugging
  },
);

// ── Lifecycle hooks ───────────────────────────────────────────────────────────
merchantEventWorker.on('completed', (job) => {
  logger.debug(`[MerchantEventWorker] Job completed: ${job.id} (${job.name})`);
});

merchantEventWorker.on('failed', (job, err) => {
  logger.error(`[MerchantEventWorker] Job failed: ${job?.id} (${job?.name})`, {
    err: err?.message,
    attemptsMade: job?.attemptsMade,
  });
});

merchantEventWorker.on('error', (err) => {
  logger.error('[MerchantEventWorker] Worker error', err);
});

logger.info('[MerchantEventWorker] Worker started — listening on merchant-events queue');

// Attach dead-letter queue handler: permanently failed jobs are pushed to
// rez:dlq:merchant-events Redis list and reported via Sentry.
attachFailureHandler(merchantEventWorker, 'merchant-events');

export default merchantEventWorker;
