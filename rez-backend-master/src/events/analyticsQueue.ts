/**
 * Analytics Queue — BullMQ-backed durable analytics event pipeline
 *
 * WHY: Analytics event persistence (eventStreamService.recordEvent) runs inline
 * in the gamification event handler. Under high load (flash sales, campaigns),
 * MongoDB analytics writes contend with critical payment/order writes.
 *
 * STRATEGY: Strangler Fig (Phase A — buffered writes)
 *   - eventStreamService publishes events to this queue instead of writing directly
 *   - Worker batch-writes to AnalyticsEvent collection with configurable batch sizes
 *   - Phase B: move worker to dedicated analytics process with its own DB connection pool
 *   - Phase C: swap MongoDB writes for ClickHouse/TimescaleDB time-series inserts
 */

import { Queue, Worker, Job } from 'bullmq';
import { bullmqRedis } from '../config/bullmq-connection';
import { createServiceLogger } from '../config/logger';
import { attachFailureHandler } from '../config/bullmqFailureHandler';

const logger = createServiceLogger('analytics-queue');

export const ANALYTICS_QUEUE_NAME = 'analytics-events';

// ── Event types ────────────────────────────────────────────────────────────────

export interface AnalyticsQueueEvent {
  /** Unique event ID for deduplication */
  eventId: string;
  /** Analytics event type */
  eventType: 'visit_event' | 'reward_event' | 'redemption_event';
  /** User ID */
  userId: string;
  /** Event data payload */
  data: {
    entityId?: string;
    entityType?: string;
    amount?: number;
    storeId?: string;
    category?: string;
    source?: string;
    metadata?: Record<string, any>;
  };
  /** Source gamification event ID */
  sourceEventId: string;
  /** Timestamp */
  timestamp: string;
}

// ── Queue (producer side) ───────────────────────────────────────────────────

let _queue: Queue | null = null;

export function getAnalyticsQueue(): Queue {
  if (!_queue) {
    _queue = new Queue(ANALYTICS_QUEUE_NAME, {
      connection: bullmqRedis,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { age: 1800 }, // 30 minutes (high volume)
        removeOnFail: { age: 3 * 24 * 3600 }, // 3 days
      },
    });
    _queue.on('error', (err) => {
      logger.error('[AnalyticsQueue] Queue error: ' + err.message);
    });
  }
  return _queue;
}

/**
 * Publish an analytics event to the BullMQ queue.
 * Fail-open: analytics failures must never block the calling flow.
 */
export async function publishAnalyticsEvent(event: AnalyticsQueueEvent): Promise<void> {
  try {
    const queue = getAnalyticsQueue();
    await queue.add(event.eventType, event, {
      jobId: event.eventId, // deduplication
    });
  } catch (err: any) {
    logger.error('[AnalyticsQueue] Publish failed (non-fatal)', {
      eventId: event.eventId,
      error: err.message,
    });
  }
}

// ── Worker (consumer side) ──────────────────────────────────────────────────

export function startAnalyticsWorker(): Worker {
  const worker = new Worker(
    ANALYTICS_QUEUE_NAME,
    async (job: Job<AnalyticsQueueEvent>) => {
      const event = job.data;

      try {
        const { AnalyticsEvent } = await import('../models/AnalyticsEvent');

        // Validate and parse timestamp
        let parsedTimestamp: Date;
        try {
          parsedTimestamp = new Date(event.timestamp);
          if (isNaN(parsedTimestamp.getTime())) {
            logger.error('[AnalyticsWorker] Invalid timestamp format', {
              sourceEventId: event.sourceEventId,
              timestamp: event.timestamp,
            });
            return { status: 'skipped', reason: 'invalid-timestamp', sourceEventId: event.sourceEventId };
          }
        } catch (timeErr: any) {
          logger.error('[AnalyticsWorker] Timestamp parsing error', {
            sourceEventId: event.sourceEventId,
            error: timeErr.message,
          });
          return { status: 'skipped', reason: 'timestamp-parse-error', sourceEventId: event.sourceEventId };
        }

        // Validate data.amount if present
        if (event.data.amount !== undefined) {
          const amount = Number(event.data.amount);
          if (isNaN(amount) || amount < 0) {
            logger.error('[AnalyticsWorker] Invalid amount field', {
              sourceEventId: event.sourceEventId,
              amount: event.data.amount,
            });
            return { status: 'skipped', reason: 'invalid-amount', sourceEventId: event.sourceEventId };
          }
        }

        // Use updateOne with upsert to handle deduplication via sourceEventId unique index
        await AnalyticsEvent.updateOne(
          { sourceEventId: event.sourceEventId },
          {
            $setOnInsert: {
              eventType: event.eventType,
              userId: event.userId,
              timestamp: parsedTimestamp,
              data: event.data,
              sourceEventId: event.sourceEventId,
              processed: false,
            },
          },
          { upsert: true },
        );

        return { status: 'persisted', sourceEventId: event.sourceEventId };
      } catch (err: any) {
        // Duplicate key errors are expected (idempotent replay) — treat as success
        if (err.code === 11000) {
          return { status: 'duplicate-skipped', sourceEventId: event.sourceEventId };
        }
        throw err; // Let BullMQ retry
      }
    },
    {
      connection: bullmqRedis,
      concurrency: 15,
      limiter: {
        max: 500,
        duration: 1000, // max 500 writes/second — well within MongoDB limits
      },
    },
  );
  attachFailureHandler(worker, ANALYTICS_QUEUE_NAME);

  worker.on('failed', (job, err) => {
    logger.error('[AnalyticsWorker] Job failed', {
      jobId: job?.id,
      eventId: (job?.data as AnalyticsQueueEvent)?.eventId,
      error: err.message,
      attemptsMade: job?.attemptsMade,
    });
  });

  worker.on('error', (err) => {
    logger.error('[AnalyticsWorker] Worker error: ' + err.message);
  });

  logger.info('[AnalyticsWorker] Started (concurrency=15, rate=500/s)');
  return worker;
}

// ── Graceful shutdown ───────────────────────────────────────────────────────

export async function closeAnalyticsQueue(): Promise<void> {
  if (_queue) {
    await _queue.close();
    _queue = null;
  }
}
