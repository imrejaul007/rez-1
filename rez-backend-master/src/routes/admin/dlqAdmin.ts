// @ts-nocheck
/**
 * DLQ Admin API — programmatic dead-letter queue management.
 *
 * Provides JSON endpoints for:
 *   GET  /admin/dlq                        — list all DLQs with job counts
 *   GET  /admin/dlq/:queueName/jobs        — list jobs in a DLQ (paginated)
 *   POST /admin/dlq/:queueName/jobs/:jobId/retry  — replay one job back to origin queue
 *   POST /admin/dlq/:queueName/retry-all   — replay all waiting DLQ jobs
 *   DELETE /admin/dlq/:queueName/jobs/:jobId      — discard a DLQ job permanently
 *
 * All endpoints are protected by admin auth middleware.
 * Replay is idempotent: the original jobId is preserved so BullMQ's
 * deduplication silently discards double-submits.
 */

import { Router, Request, Response } from 'express';
import { Queue, Job } from 'bullmq';
import { bullmqRedis } from '../../config/bullmq-connection';
import { CRITICAL_QUEUE_NAMES, NONCRITICAL_QUEUE_NAMES } from '../../workers/workerGroups';
import { createServiceLogger } from '../../config/logger';

const logger = createServiceLogger('dlq-admin');
const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

const ALL_DLQ_NAMES: string[] = [
  ...CRITICAL_QUEUE_NAMES.map((n) => `${n}-dlq`),
  ...NONCRITICAL_QUEUE_NAMES.map((n) => `${n}-dlq`),
];

/** Map origin queue name from a DLQ name. "payment-events-dlq" → "payment-events" */
function originQueueName(dlqName: string): string {
  return dlqName.replace(/-dlq$/, '');
}

/** Lazily open a Queue connection; caller must close it after use. */
function openQueue(name: string): Queue {
  return new Queue(name, { connection: bullmqRedis });
}

// ── GET /admin/dlq — summary of all DLQs ────────────────────────────────────

router.get('/', async (_req: Request, res: Response) => {
  const results: Array<{
    dlqName: string;
    originQueue: string;
    waiting: number;
    failed: number;
    total: number;
  }> = [];

  await Promise.all(
    ALL_DLQ_NAMES.map(async (dlqName) => {
      const q = openQueue(dlqName);
      try {
        const [waiting, failed] = await Promise.all([q.getWaitingCount(), q.getFailedCount()]);
        results.push({ dlqName, originQueue: originQueueName(dlqName), waiting, failed, total: waiting + failed });
      } catch {
        results.push({ dlqName, originQueue: originQueueName(dlqName), waiting: -1, failed: -1, total: -1 });
      } finally {
        await q.close();
      }
    }),
  );

  return res.json({ success: true, data: results });
});

// ── GET /admin/dlq/:queueName/jobs — list jobs in one DLQ ───────────────────

router.get('/:queueName/jobs', async (req: Request, res: Response) => {
  const dlqName = req.params.queueName.endsWith('-dlq') ? req.params.queueName : `${req.params.queueName}-dlq`;

  if (!ALL_DLQ_NAMES.includes(dlqName)) {
    return res.status(404).json({ success: false, message: `DLQ not found: ${dlqName}` });
  }

  const start = parseInt(String(req.query.start ?? '0'), 10);
  const end = parseInt(String(req.query.end ?? '49'), 10);

  const q = openQueue(dlqName);
  try {
    const [waitingJobs, failedJobs] = await Promise.all([q.getWaiting(start, end), q.getFailed(start, end)]);

    const formatJob = (job: Job) => ({
      id: job.id,
      name: job.name,
      data: job.data,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
    });

    return res.json({
      success: true,
      data: {
        dlqName,
        originQueue: originQueueName(dlqName),
        waiting: waitingJobs.map(formatJob),
        failed: failedJobs.map(formatJob),
      },
    });
  } finally {
    await q.close();
  }
});

// ── POST /admin/dlq/:queueName/jobs/:jobId/retry — replay one job ────────────

router.post('/:queueName/jobs/:jobId/retry', async (req: Request, res: Response) => {
  const dlqName = req.params.queueName.endsWith('-dlq') ? req.params.queueName : `${req.params.queueName}-dlq`;

  if (!ALL_DLQ_NAMES.includes(dlqName)) {
    return res.status(404).json({ success: false, message: `DLQ not found: ${dlqName}` });
  }

  const { jobId } = req.params;
  const dlqQueue = openQueue(dlqName);
  const originQueue = openQueue(originQueueName(dlqName));

  try {
    const job = await Job.fromId(dlqQueue, jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: `Job ${jobId} not found in ${dlqName}` });
    }

    const { dlqMeta, ...originalData } = job.data;

    // Replay to origin queue with the original jobId (after stripping the dlq: prefix)
    const replayJobId = dlqMeta?.originalJobId ?? jobId.replace(/^dlq:/, '');

    await originQueue.add(job.name, originalData, {
      jobId: replayJobId,
      attempts: 5,
      backoff: { type: 'exponential', delay: 5000 },
    });

    // Remove from DLQ
    await job.remove();

    logger.info('[DLQ Admin] Job replayed', {
      dlqName,
      jobId,
      replayJobId,
      originQueue: originQueueName(dlqName),
    });

    return res.json({
      success: true,
      message: `Job ${jobId} replayed to ${originQueueName(dlqName)}`,
      data: { replayJobId, originQueue: originQueueName(dlqName) },
    });
  } finally {
    await dlqQueue.close();
    await originQueue.close();
  }
});

// ── POST /admin/dlq/:queueName/retry-all — replay all waiting jobs ───────────

router.post('/:queueName/retry-all', async (req: Request, res: Response) => {
  const dlqName = req.params.queueName.endsWith('-dlq') ? req.params.queueName : `${req.params.queueName}-dlq`;

  if (!ALL_DLQ_NAMES.includes(dlqName)) {
    return res.status(404).json({ success: false, message: `DLQ not found: ${dlqName}` });
  }

  const dlqQueue = openQueue(dlqName);
  const originQueue = openQueue(originQueueName(dlqName));

  try {
    const waitingJobs = await dlqQueue.getWaiting(0, 499); // up to 500 at a time
    let replayed = 0;
    let skipped = 0;

    await Promise.all(
      waitingJobs.map(async (job) => {
        try {
          const { dlqMeta, ...originalData } = job.data;
          const replayJobId = dlqMeta?.originalJobId ?? job.id?.replace(/^dlq:/, '') ?? job.id;

          await originQueue.add(job.name, originalData, {
            jobId: replayJobId,
            attempts: 5,
            backoff: { type: 'exponential', delay: 5000 },
          });

          await job.remove();
          replayed++;
        } catch {
          skipped++;
        }
      }),
    );

    logger.info('[DLQ Admin] Bulk replay completed', {
      dlqName,
      replayed,
      skipped,
      originQueue: originQueueName(dlqName),
    });

    return res.json({
      success: true,
      message: `Replayed ${replayed} jobs to ${originQueueName(dlqName)} (${skipped} skipped)`,
      data: { replayed, skipped },
    });
  } finally {
    await dlqQueue.close();
    await originQueue.close();
  }
});

// ── DELETE /admin/dlq/:queueName/jobs/:jobId — discard a DLQ job ─────────────

router.delete('/:queueName/jobs/:jobId', async (req: Request, res: Response) => {
  const dlqName = req.params.queueName.endsWith('-dlq') ? req.params.queueName : `${req.params.queueName}-dlq`;

  if (!ALL_DLQ_NAMES.includes(dlqName)) {
    return res.status(404).json({ success: false, message: `DLQ not found: ${dlqName}` });
  }

  const { jobId } = req.params;
  const dlqQueue = openQueue(dlqName);

  try {
    const job = await Job.fromId(dlqQueue, jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: `Job ${jobId} not found in ${dlqName}` });
    }

    await job.remove();

    logger.info('[DLQ Admin] Job discarded', { dlqName, jobId });

    return res.json({
      success: true,
      message: `Job ${jobId} permanently removed from ${dlqName}`,
    });
  } finally {
    await dlqQueue.close();
  }
});

export default router;
