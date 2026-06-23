/**
 * Gamification Queue — BullMQ-backed durable event dispatcher
 *
 * WHY: The existing GamificationEventBus uses Node.js EventEmitter which is
 * in-process and non-durable. If the Node process crashes between emit() and
 * handler completion, the event is permanently lost (coin awards, badge unlocks,
 * streak updates go missing).
 *
 * STRATEGY: Dual-mode dispatch
 *   1. EventEmitter fires immediately (low latency, existing handlers work as-is)
 *   2. BullMQ queue persists the event to Redis (durability + retry on crash)
 *
 * The BullMQ worker processes events from Redis and runs the same handlers. If
 * the EventEmitter path already handled it (same process, no crash), the BullMQ
 * worker is a no-op (idempotency key deduplication in gamificationEventBus prevents
 * double-processing).
 *
 * MIGRATION PATH:
 *   Phase A (done): dual-mode — both EventEmitter and BullMQ ran
 *   Phase B (done): EventEmitter re-emit fallback removed from worker; BullMQ-only on consumer side
 *   Phase C (next): extract gamification-worker into its own process/service
 */

import { Queue, Worker, Job } from 'bullmq';
import { bullmqRedis } from '../config/bullmq-connection';
import { logger } from '../config/logger';
import { attachFailureHandler } from '../config/bullmqFailureHandler';
import type { ActivityEvent, ActivityEventType } from './gamificationEventBus';

export const GAMIFICATION_QUEUE_NAME = 'gamification-events';

// ── Queue (producer side) ─────────────────────────────────────────────────────

let _queue: Queue | null = null;

export function getGamificationQueue(): Queue {
  if (!_queue) {
    _queue = new Queue(GAMIFICATION_QUEUE_NAME, {
      connection: bullmqRedis,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { age: 24 * 3600 }, // keep 24 h for audit
        removeOnFail: { age: 7 * 24 * 3600 }, // keep 7 days for inspection
      },
    });
    _queue.on('error', (err) => {
      logger.error('[GamificationQueue] Queue error: ' + err.message);
    });
  }
  return _queue;
}

/**
 * Publish a gamification event to the durable BullMQ queue.
 * Called inside GamificationEventBus.emit() after the in-process EventEmitter fires.
 *
 * @param event — Full ActivityEvent (already constructed by the EventBus)
 */
export async function publishGamificationEvent(event: ActivityEvent): Promise<void> {
  try {
    const queue = getGamificationQueue();
    await queue.add(event.type, event, {
      // Use eventId as the job ID for deduplication — prevents replay double-fire
      jobId: event.eventId,
    });
  } catch (err: any) {
    // Never throw — publishing failure must not block the HTTP response
    logger.warn('[GamificationQueue] Failed to enqueue event (fail-open):', {
      eventType: event.type,
      userId: event.userId,
      error: err.message,
    });
  }
}

// ── Worker (consumer side) ────────────────────────────────────────────────────

let _worker: Worker | null = null;

/**
 * Start the BullMQ gamification worker.
 * Processes events that were persisted to Redis (durability path).
 * Should be called once on server/worker startup.
 */
export function startGamificationWorker(): Worker {
  if (_worker) return _worker;

  _worker = new Worker(
    GAMIFICATION_QUEUE_NAME,
    async (job: Job<ActivityEvent>) => {
      const event = job.data;

      logger.debug('[GamificationWorker] Processing event', {
        type: event.type,
        userId: event.userId,
        eventId: event.eventId,
        attempt: job.attemptsMade,
      });

      // Phase 5: Self-contained handler dispatch — no longer depends on in-process EventEmitter.
      // Each handler is called directly, making this worker extractable into a standalone process.
      // Handlers are imported dynamically to avoid circular dependencies on startup.
      const errors: string[] = [];

      // 1. Achievement progress
      try {
        const achievementEngine = (await import('../services/achievementEngine')).default;
        const { EVENT_TO_METRICS } = await import('../config/achievementMetrics');
        const affectedMetrics = EVENT_TO_METRICS[event.type];
        if (affectedMetrics && affectedMetrics.length > 0) {
          // Build metrics object from affected metric names (each counts as 1 occurrence)
          const metricsMap: Record<string, number> = {};
          for (const m of affectedMetrics) metricsMap[m] = 1;
          await achievementEngine.processMetricUpdate(event.userId, metricsMap);
        }
      } catch (err: any) {
        errors.push(`achievement:${err.message}`);
      }

      // 2. Challenge progress
      try {
        const UserChallengeProgress = (await import('../models/UserChallengeProgress')).default;
        const EVENT_TO_CHALLENGE: Record<string, string> = {
          order_placed: 'order_count',
          order_delivered: 'order_count',
          review_submitted: 'review_count',
          referral_completed: 'refer_friends',
          login: 'login_streak',
          daily_checkin: 'login_streak',
          bill_uploaded: 'upload_bills',
          social_share: 'share_deals',
          offer_redeemed: 'visit_stores',
        };
        const action = EVENT_TO_CHALLENGE[event.type];
        if (action && UserChallengeProgress) {
          await (UserChallengeProgress as any).updateMany(
            { userId: event.userId, status: 'active', [`actions.${action}.target`]: { $exists: true } },
            { $inc: { [`actions.${action}.current`]: 1 } },
          );
        }
      } catch (err: any) {
        errors.push(`challenge:${err.message}`);
      }

      // 3. Streak update
      try {
        const streakService = (await import('../services/streakService')).default;
        if (streakService?.recordActivity) {
          const EVENT_TO_STREAK: Record<string, string> = {
            login: 'login',
            daily_checkin: 'login',
            order_placed: 'order',
            order_delivered: 'order',
            review_submitted: 'review',
            store_payment_confirmed: 'savings',
          };
          const streakType = EVENT_TO_STREAK[event.type];
          if (streakType) {
            await streakService.recordActivity(event.userId, streakType as any);
          }
        }
      } catch (err: any) {
        errors.push(`streak:${err.message}`);
      }

      // 4. Leaderboard cache invalidation
      try {
        const LEADERBOARD_EVENTS = new Set([
          'order_placed',
          'order_delivered',
          'review_submitted',
          'referral_completed',
          'game_won',
          'daily_checkin',
          'bill_uploaded',
        ]);
        if (LEADERBOARD_EVENTS.has(event.type)) {
          const redisService = (await import('../services/redisService')).default;
          await redisService.del(`leaderboard:weekly`);
          await redisService.del(`leaderboard:monthly`);
        }
      } catch (err: any) {
        errors.push(`leaderboard:${err.message}`);
      }

      // 5. Mission progress
      try {
        const { priveMissionService } = await import('../services/priveMissionService');
        if (priveMissionService?.trackProgress) {
          await priveMissionService.trackProgress(event.userId, event.type, event.data);
        }
      } catch (err: any) {
        errors.push(`mission:${err.message}`);
      }

      // 6. Analytics stream (already handled by Phase 4 queue, but keep for backward compat)
      try {
        const { eventStreamService } = await import('../services/eventStreamService');
        await eventStreamService.handleEvent(event);
      } catch (err: any) {
        errors.push(`analytics:${err.message}`);
      }

      if (errors.length > 0) {
        logger.warn('[GamificationWorker] Some handlers failed', {
          eventId: event.eventId,
          errors,
        });
      }

      // Phase B: EventEmitter re-emit fallback removed.
      // All handlers are wired directly above. The EventBus in-process path
      // still fires on the producer side (publishGamificationEvent is called after
      // GamificationEventBus.emit), but this worker no longer fans back into it.
    },
    {
      connection: bullmqRedis,
      concurrency: 5,
      limiter: {
        max: 100, // process at most 100 events per second
        duration: 1000,
      },
    },
  );
  attachFailureHandler(_worker, GAMIFICATION_QUEUE_NAME);

  _worker.on('completed', (job) => {
    logger.debug('[GamificationWorker] Job completed', { jobId: job.id, type: job.name });
  });

  _worker.on('failed', (job, err) => {
    logger.error('[GamificationWorker] Job failed', {
      jobId: job?.id,
      type: job?.name,
      userId: (job?.data as ActivityEvent)?.userId,
      error: err.message,
      attempts: job?.attemptsMade,
    });
  });

  _worker.on('error', (err) => {
    logger.error('[GamificationWorker] Worker error: ' + err.message);
  });

  logger.info('[GamificationWorker] Started — processing queue: ' + GAMIFICATION_QUEUE_NAME);
  return _worker;
}

/**
 * Gracefully close queue and worker connections.
 * Call on SIGTERM to drain in-flight jobs before exit.
 */
export async function closeGamificationQueue(): Promise<void> {
  await Promise.allSettled([_worker?.close(), _queue?.close()]);
  _worker = null;
  _queue = null;
}
