// @ts-nocheck
/**
 * bullmqFailureHandler.ts
 *
 * BULL-005 FIX: Replaces the homegrown Redis LIST DLQ (capped at 1000 entries
 * with silent LTRIM-based eviction) with BullMQ's native named-queues pattern.
 *
 * On permanent failure (all retries exhausted):
 *   1. Logs structured error via createServiceLogger
 *   2. Sends Sentry alert with job data, error, and queue name
 *   3. Forwards job to `<queueName>-dlq` BullMQ named queue (unbounded retention)
 *   4. Alerts if DLQ depth exceeds DLQ_SIZE_ALERT_THRESHOLD
 *
 * Key differences from the old implementation:
 *   - Old: Redis LIST with LPUSH + LTRIM(0, 999) — silently drops oldest entry at 1000 cap
 *   - New: BullMQ named Queue — entries stored indefinitely via removeOnFail age limit
 */

import { Worker, Job, Queue } from 'bullmq';
import * as Sentry from '@sentry/node';
import { createServiceLogger } from './logger';
import { bullmqRedis } from './bullmq-connection';

const logger = createServiceLogger('bullmq-dlq');

// BULL-005 FIX: Configurable alert threshold. When DLQ depth exceeds this value,
// an error-level log is emitted so ops alerting can pick it up. No hard cap —
const DLQ_SIZE_ALERT_THRESHOLD = parseInt(process.env.DLQ_SIZE_ALERT_THRESHOLD || '100', 10);

// BULL-005 FIX: DLQ retention — 30 days (audit trail), no hard entry count cap.
const DLQ_RETENTION_SECONDS = 30 * 24 * 60 * 60;

// BULL-005 FIX: Lazily-created DLQ Queue instances (one per unique queueName).
const _dlqCache = new Map<string, Queue>();

function getDlqForQueue(queueName: string): Queue {
  const dlqName = `${queueName}-dlq`;
  let dlq = _dlqCache.get(dlqName);
  if (!dlq) {
    dlq = new Queue(dlqName, {
      connection: bullmqRedis,
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: { age: 7 * 24 * 3600 },
        // BULL-005 FIX: No count cap — age-based expiry only. Entries survive until
        // the 30-day retention window closes, giving ops time to diagnose and replay.
        removeOnFail: { age: DLQ_RETENTION_SECONDS },
      },
    });
    _dlqCache.set(dlqName, dlq);
  }
  return dlq;
}

/**
 * BULL-005 FIX: Check DLQ depth and alert if it exceeds the configured threshold.
 */
async function checkAndAlertDlqDepth(queueName: string): Promise<void> {
  const dlqName = `${queueName}-dlq`;
  try {
    const dlq = getDlqForQueue(queueName);
    const [waiting, failed] = await Promise.all([
      dlq.getWaitingCount().catch(() => -1),
      dlq.getFailedCount().catch(() => -1),
    ]);
    const total = waiting + failed;
    if (total >= DLQ_SIZE_ALERT_THRESHOLD) {
      logger.error(
        `[DLQ] BULL-005 ALERT: Dead-letter queue for "${queueName}" has ${total} entries ` +
          `(threshold: ${DLQ_SIZE_ALERT_THRESHOLD}). Failed jobs are accumulating. ` +
          `Check origin queue health or replay via /admin/dlq/${queueName}/retry-all`,
        { queueName, dlqName, waiting, failed, total, threshold: DLQ_SIZE_ALERT_THRESHOLD },
      );
    }
  } catch (err) {
    logger.warn('[DLQ] Failed to check DLQ depth', { queueName, error: (err as Error)?.message });
  }
}

/**
 * BULL-005 FIX: Forward a permanently-failed job to the named DLQ queue.
 * Uses the same BullMQ Queue pattern as workers/index.ts — no Redis LIST, no cap.
 */
async function forwardToDlq(queueName: string, job: Job, err: Error): Promise<void> {
  try {
    const dlq = getDlqForQueue(queueName);
    await dlq.add(
      job.name,
      {
        ...job.data,
        dlqMeta: {
          originalQueue: queueName,
          originalJobId: job.id,
          originalJobName: job.name,
          failedAt: new Date().toISOString(),
          attemptsMade: job.attemptsMade,
          lastError: err?.message ?? String(err),
        },
      },
      { jobId: `dlq:${job.id}` },
    );
    logger.error(`[DLQ] Job ${job.id} (${job.name}) forwarded to ${queueName}-dlq after ${job.attemptsMade} attempts`, {
      originalQueue: queueName,
      error: err?.message,
    });
    await checkAndAlertDlqDepth(queueName);
  } catch (dlqErr) {
    logger.error(`[DLQ] CRITICAL: Failed to forward job ${job.id} to DLQ for queue ${queueName}`, {
      dlqError: (dlqErr as Error)?.message,
      originalError: err?.message,
    });
  }
}

export function attachFailureHandler(worker: Worker, queueName: string): void {
  worker.on('failed', async (job: Job | undefined, err: Error) => {
    if (!job) return;

    const maxAttempts = job.opts?.attempts ?? 1;
    const isPermanent = (job.attemptsMade ?? 0) >= maxAttempts;
    if (!isPermanent) return; // transient failure — BullMQ will retry

    logger.error('Job permanently failed — moving to dead-letter queue', {
      queueName,
      jobId: job.id,
      jobName: job.name,
      attemptsMade: job.attemptsMade,
      err: err.message,
    });

    Sentry.captureException(err, {
      tags: { queue: queueName, job_name: job.name },
      extra: {
        jobId: job.id,
        attemptsMade: job.attemptsMade,
        jobData: job.data,
        queueName,
      },
    });

    // BULL-005 FIX: Forward to BullMQ named queue — no 1000-entry cap.
    await forwardToDlq(queueName, job, err);
  });

  worker.on('error', (err: Error) => {
    logger.error('BullMQ worker error', { queueName, err: err.message });
    Sentry.captureException(err, { tags: { queue: queueName, event: 'worker_error' } });
  });
}
