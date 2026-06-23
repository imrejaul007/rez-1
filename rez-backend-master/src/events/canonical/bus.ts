/**
 * Canonical Event Bus — Sprint 0 Foundation
 *
 * Thin, durable pub/sub layer for canonical domain events.
 * All canonical events flow through here so downstream consumers (cashback,
 * loyalty, analytics, WhatsApp receipts) subscribe to a stable contract
 * rather than being hand-wired into controllers.
 *
 * Uses BullMQ with Redis for durability and retry semantics.
 * All publish calls are fail-open: errors are logged but never thrown,
 * matching the pattern established in emitOrderPlaced.ts.
 */

// ── Topic constants ────────────────────────────────────────────────────────────

export const TOPIC_ORDER_PLACED = 'canonical.order.placed';
export const TOPIC_PAYMENT_SETTLED = 'canonical.payment.settled';
export const TOPIC_VISIT_COMPLETED = 'canonical.visit.completed';
export const TOPIC_MERCHANT_APPROVED = 'canonical.merchant.approved';

// ── BullMQ queue ───────────────────────────────────────────────────────────────

import { Queue } from 'bullmq';
import { bullmqRedis } from '../../config/bullmq-connection';
import { logger } from '../../config/logger';

const CANONICAL_EVENTS_QUEUE = 'canonical-events';

let _queue: Queue | null = null;

function getQueue(): Queue {
  if (!_queue) {
    _queue = new Queue(CANONICAL_EVENTS_QUEUE, {
      connection: bullmqRedis,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { age: 7 * 86400 }, // 7 days
        removeOnFail: { age: 30 * 86400 },   // 30 days
      },
    });
  }
  return _queue;
}

// ── Publish ────────────────────────────────────────────────────────────────────

export async function publishEvent(topic: string, event: object): Promise<void> {
  try {
    const queue = getQueue();
    await queue.add(topic, event, {
      jobId: (event as { eventId?: string }).eventId ?? `${topic}:${Date.now()}`,
    });
  } catch (err) {
    // Fail-open: log and move on. The producer should not be blocked by queue errors.
    logger.error('[canonical-bus] failed to publish event', {
      topic,
      eventId: (event as { eventId?: string }).eventId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
