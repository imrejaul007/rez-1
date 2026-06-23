import { Worker, WorkerOptions, Job, Queue } from 'bullmq';
import { bullmqRedis } from '../config/bullmq-connection';
import { jobTracker } from '../utils/jobTracker';
import { logger } from '../config/logger';
import { CRITICAL_QUEUE_NAMES, NONCRITICAL_QUEUE_NAMES, isCriticalQueue } from './workerGroups';

// QF-D004 FIX: Dead-letter queue for permanently failed jobs.
//
// When a job exhausts all its attempts (Bull marks it 'failed'), there is
// previously no further action — the job silently sits in the failed set
// until the removeOnFail TTL expires.  Operations staff have no way to
// know a reward or payment job died permanently, and there is no replay path.
//
// DLQ DESIGN:
//   - One DLQ per high-stakes queue: 'payments-dlq', 'rewards-dlq', etc.
//   - A failed job is forwarded to the DLQ with its original data + failure
//     metadata (error message, attempt count, original queue name).
//   - DLQ jobs are never retried automatically — they require manual replay
//     via admin tooling or the Bull dashboard.
//   - DLQ has a generous removeOnFail to give on-call engineers time to act.
//
// The DLQ Queue instances use the same Redis connection so they inherit the
// existing connection pool. They are append-only from this module — the
// actual processing (replay) is done via admin CLI/dashboard.
// QF-D004: Lazily-initialised DLQ queues (created once per process).
// Extended to cover ALL domain queues — not just payments and rewards.
const _dlqCache: Map<string, Queue> = new Map();

function getDlqForQueue(queueName: string): Queue {
  const dlqName = `${queueName}-dlq`;
  let dlq = _dlqCache.get(dlqName);
  if (!dlq) {
    dlq = new Queue(dlqName, {
      connection: bullmqRedis,
      defaultJobOptions: {
        // DLQ jobs must never auto-retry — they exist for manual inspection.
        attempts: 1,
        removeOnComplete: { age: 7 * 24 * 3600 }, // 7 days
        removeOnFail: { age: 30 * 24 * 3600 }, // 30 days (audit trail)
      },
    });
    _dlqCache.set(dlqName, dlq);
  }
  return dlq;
}

/**
 * Forward a permanently-failed job to the appropriate DLQ.
 * Called from the 'failed' event listener once all retries are exhausted.
 *
 * QF-D004: The DLQ entry contains the original job data plus a 'dlqMeta'
 * envelope with enough context for an engineer to understand what failed
 * and replay the job safely.
 */
async function forwardToDlq(queueName: string, job: Job, err: Error, getDlq: () => Queue): Promise<void> {
  try {
    const dlq = getDlq();
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
      // Use the original job's id as a prefix so duplicate DLQ entries for the
      // same job (unlikely but possible on rapid restart) are deduplicated.
      { jobId: `dlq:${job.id}` },
    );
    logger.error(`[DLQ] Job ${job.id} (${job.name}) forwarded to ${queueName}-dlq after ${job.attemptsMade} attempts`, {
      originalQueue: queueName,
      error: err?.message,
    });
  } catch (dlqErr: any) {
    // DLQ write failure must not crash the worker — just alert loudly.
    logger.error(`[DLQ] CRITICAL: Failed to forward job ${job.id} to DLQ for queue ${queueName}`, {
      dlqError: dlqErr?.message,
      originalError: err?.message,
    });
  }
}

// BULL-004 FIX: Per-job timeout prevents runaway jobs from blocking queue throughput.
// lockDuration (60s) prevents premature stall detection for slow DB writes.
// QF-001 FIX: stalledInterval + maxStalledCount reclaim jobs from crashed workers.
const JOB_TIMEOUT_MS = 60_000;

function withTimeout<T>(
  processor: (job: Job<T>) => Promise<unknown>,
  timeoutMs: number,
): (job: Job<T>) => Promise<unknown> {
  return (job: Job<T>) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(
        () =>
          reject(
            new Error(
              `Job ${job.id} (${job.name}) exceeded timeout of ${timeoutMs}ms — BULL-004 timeout kill`,
            ),
          ),
        timeoutMs,
      );
      timer.unref();
      processor(job)
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((err: Error) => {
          clearTimeout(timer);
          reject(err);
        });
    });
}

const baseOptions: WorkerOptions = {
  connection: bullmqRedis,
  lockDuration: 60_000, // BULL-004: 60s lock prevents premature stall detection
  removeOnComplete: { age: 3600 }, // Keep completed jobs for 1 hour
  removeOnFail: { age: 86400 }, // Keep failed jobs for 24 hours
  stalledInterval: 30_000, // QF-001: check for stalled jobs every 30 s
  maxStalledCount: 3, // QF-001: move to failed after 3 consecutive stalls
};

// ── Generic dynamic job dispatcher ────────────────────────────────────────────
// Used by payments, rewards, and notifications workers.
// Loads the job handler module by name (jobs/{job.name}.ts) at runtime.
const genericJobHandler = withTimeout(async function (job: Job): Promise<unknown> {
  // QF-002 FIX: Validate job payload before dispatch so a malformed job
  // fails fast with a clear error rather than crashing deep inside a handler.
  if (!job.name || typeof job.name !== 'string') {
    throw new Error(`Invalid job: missing or non-string job.name (id=${job.id})`);
  }
  await jobTracker.started(job.name);
  try {
    const handler = await import(`../jobs/${job.name}`).catch(() => import('../jobs/default'));
    const result = await handler.default(job.data);
    await jobTracker.succeeded(job.name);
    return result;
  } catch (err: any) {
    await jobTracker.failed(job.name, err);
    throw err;
  }
}, JOB_TIMEOUT_MS);

// ── Event handler attachment helpers ──────────────────────────────────────────

// Attach base observability and DLQ handlers to every worker.
function attachBaseHandlers(workers: Worker[]): void {
  workers.forEach((worker) => {
    worker.on('error', (err) => {
      logger.error(`[Worker:${worker.name}] Error:`, err);
    });

    // QF-D002 FIX: Stalled event was missing from all workers.
    // The 'stalled' event fires on the Worker instance (not the Queue) in BullMQ.
    // This is purely an observability hook — BullMQ's stalledInterval mechanism
    // handles the actual reclaim/retry.
    worker.on('stalled', (jobId: string) => {
      logger.warn(
        `[Worker:${worker.name}] Job ${jobId} stalled — worker may have crashed mid-flight. ` +
          `BullMQ will re-queue after stalledInterval (30 s). Check for OOM/SIGKILL.`,
        { workerId: worker.id, queueName: worker.name, stalledJobId: jobId },
      );
    });

    // QF-D004 FIX: Forward permanently-failed jobs to the dead-letter queue.
    worker.on('failed', (job, err) => {
      if (!job) return;
      const remainingAttempts = (job.opts?.attempts ?? 1) - job.attemptsMade;
      const isPermanentFailure = remainingAttempts <= 0;
      logger.warn(
        `[Worker:${worker.name}] Job ${job.id} (${job.name}) failed ` +
          `(attempt ${job.attemptsMade}/${job.opts?.attempts ?? 1}): ${err?.message}`,
        { isPermanentFailure },
      );
      if (isPermanentFailure) {
        void forwardToDlq(worker.name, job, err, () => getDlqForQueue(worker.name));
      }
    });

    worker.on('completed', (job) => {
      logger.debug(`[Worker:${worker.name}] Job ${job.id} completed`);
    });
  });
}

// Attach group-tagged event handlers so dashboards can filter by group.
function attachGroupHandlers(workers: Worker[], workerGroup: 'critical' | 'noncritical'): void {
  workers.forEach((worker) => {
    const queueName = worker.name;
    worker.on('failed', (job, err) => {
      if (!job) return;
      logger.error(`[Worker:${queueName}] Job failed`, {
        workerGroup,
        queue: queueName,
        jobId: job.id,
        jobName: job.name,
        attemptsMade: job.attemptsMade,
        err: err?.message,
      });
    });
    worker.on('stalled', (jobId: string) => {
      logger.warn(`[Worker:${queueName}] Job stalled`, { workerGroup, queue: queueName, jobId });
    });
    worker.on('error', (err) => {
      logger.error(`[Worker:${queueName}] Worker error`, {
        workerGroup,
        queue: queueName,
        err: err?.message,
      });
    });
  });
}

// ── DLQ startup check ─────────────────────────────────────────────────────────

async function checkDlqsOnStartup(): Promise<void> {
  const dlqsToCheck = [
    ...CRITICAL_QUEUE_NAMES.map((n) => `${n}-dlq`),
    ...NONCRITICAL_QUEUE_NAMES.map((n) => `${n}-dlq`),
  ];
  for (const queueName of dlqsToCheck) {
    try {
      const dlqQueue = new Queue(queueName, {
        connection: bullmqRedis,
      });
      const waitingCount = await dlqQueue.getWaitingCount();
      const failedCount = await dlqQueue.getFailedCount();
      const total = waitingCount + failedCount;
      if (total > 0) {
        logger.warn(`[DLQ] Critical queue has unprocessed DLQ jobs`, {
          queue: queueName,
          count: total,
          waiting: waitingCount,
          failed: failedCount,
        });
      }
      await dlqQueue.close();
    } catch (err: any) {
      // DLQ check failure must not prevent worker startup
      logger.warn(`[DLQ] Could not check DLQ on startup`, {
        queue: queueName,
        err: err?.message,
      });
    }
  }
}

// ── Active worker registry ────────────────────────────────────────────────────
// Populated by the startXxx functions below. Used by server.ts/worker.ts
// shutdown handlers via `import('./workers').then(({ allWorkers }) => ...)`.

export let allWorkers: Worker[] = [];

// ── Graceful shutdown ─────────────────────────────────────────────────────────

async function gracefulShutdown(): Promise<void> {
  logger.info('[Workers] Graceful shutdown initiated');
  try {
    const closeTargets: Array<{ close(): Promise<void>; name: string }> = [...allWorkers];
    for (const dlq of _dlqCache.values()) {
      closeTargets.push(dlq);
    }
    await Promise.all(closeTargets.map((w) => w.close()));
    logger.info('[Workers] All workers and DLQ queues closed successfully');
  } catch (err) {
    logger.error('[Workers] Error during worker shutdown:', err);
  }
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// ── Exported startup functions ────────────────────────────────────────────────
// IMPORTANT: Workers are created LAZILY inside these functions — NEVER at
// module load time. This prevents creating BullMQ blocking Redis connections
// on dynos that don't need them (each Worker duplicates the bullmqRedis
// connection, consuming one Valkey connection slot per worker).
//
// Connection budget (Valkey free tier ~25 slots):
//   API dyno  (WORKER_ROLE=critical):     7 critical workers ≈ 9 connections
//   Worker dyno (WORKER_ROLE=noncritical): 6 noncritical workers
//                                        + QueueService 8 workers ≈ 16 connections
//   Total ≈ 25 connections

/**
 * Start only CRITICAL workers (API dyno default / WORKER_ROLE=critical).
 * Creates and registers only the 7 critical-queue workers.
 *
 * Queues: payments, payment-events, rewards, merchant-events,
 *         gamification-events, order-events, wallet-events
 */
export async function startCriticalWorkers(): Promise<Worker[]> {
  logger.info('[Workers] startCriticalWorkers() — creating critical workers', {
    queues: CRITICAL_QUEUE_NAMES,
  });

  // Dynamic imports ensure Worker instances are only created when this
  // function is called — not on module load.
  const [
    { merchantEventWorker },
    { startGamificationWorker },
    { startOrderWorker },
    { startWalletWorker },
    { startPaymentEventsWorker },
  ] = await Promise.all([
    import('./merchantEventWorker'),
    import('../events/gamificationQueue'),
    import('../events/orderQueue'),
    import('../events/walletQueue'),
    import('../events/paymentQueue'),
  ]);

  const paymentWorker = new Worker('payments', genericJobHandler, {
    ...baseOptions,
    concurrency: 3, // max 3 payment jobs at once
    limiter: { max: 50, duration: 60000 }, // max 50/min (critical operations)
  });

  const rewardWorker = new Worker('rewards', genericJobHandler, {
    ...baseOptions,
    concurrency: 5,
    limiter: { max: 100, duration: 60000 },
  });

  // Phase C cutover flags: set the corresponding env var to 'true' on the monolith
  // dyno once the standalone microservice is confirmed healthy. The monolith will
  // stop consuming that queue and defer entirely to the external service.
  const gamificationWorker = process.env.GAMIFICATION_WORKER_EXTERNAL === 'true' ? null : startGamificationWorker();
  const orderWorker = process.env.ORDER_WORKER_EXTERNAL === 'true' ? null : startOrderWorker();
  const walletWorker = process.env.WALLET_WORKER_EXTERNAL === 'true' ? null : startWalletWorker();
  const paymentEventsWorker = process.env.PAYMENT_EVENTS_WORKER_EXTERNAL === 'true' ? null : startPaymentEventsWorker();

  if (!gamificationWorker)
    logger.info('[Workers] gamification-events worker deferred to external rez-gamification-service');
  if (!orderWorker) logger.info('[Workers] order-events worker deferred to external rez-order-service');
  if (!walletWorker) logger.info('[Workers] wallet-events worker deferred to external rez-wallet-service');
  if (!paymentEventsWorker) logger.info('[Workers] payment-events worker deferred to external rez-payment-service');

  const workers: Worker[] = [
    paymentWorker,
    ...(paymentEventsWorker ? [paymentEventsWorker] : []),
    rewardWorker,
    merchantEventWorker,
    ...(gamificationWorker ? [gamificationWorker] : []),
    ...(orderWorker ? [orderWorker] : []),
    ...(walletWorker ? [walletWorker] : []),
  ];

  attachBaseHandlers(workers);
  attachGroupHandlers(workers, 'critical');
  await checkDlqsOnStartup();

  // Populate module-level registry so shutdown handlers can close these workers.
  allWorkers = workers;

  logger.info('[Workers] Critical worker group active', {
    workerGroup: 'critical',
    queues: workers.map((w) => w.name),
  });

  return workers;
}

/**
 * Start only NONCRITICAL workers (WORKER_ROLE=noncritical).
 * Creates and registers only the 6 noncritical-queue domain workers.
 * QueueService.initialize() (called separately in worker.ts) covers the
 * email/sms/analytics/etc. queues.
 *
 * Queues: notifications, notification-events, broadcast,
 *         media-events, analytics-events, catalog-events
 */
export async function startNoncriticalWorkers(): Promise<Worker[]> {
  logger.info('[Workers] startNoncriticalWorkers() — creating noncritical workers', {
    queues: NONCRITICAL_QUEUE_NAMES,
  });

  const [
    { broadcastWorker },
    { startNotificationWorker },
    { startMediaWorker },
    { startAnalyticsWorker },
    { startCatalogWorker },
    { startCashbackSubscriber },
    { startScanRewardSubscriber },
    { startWhatsAppReceiptSubscriber },
    { startCpaAttributionSubscriber },
  ] = await Promise.all([
    import('./broadcastWorker'),
    import('../events/notificationQueue'),
    import('../events/mediaQueue'),
    import('../events/analyticsQueue'),
    import('../events/catalogQueue'),
    // Sprint-2 canonical-events subscriber: consumes order.placed from the
    // canonical bus + credits cashback via walletService. Idempotent via
    // ProcessedEvent ledger.
    import('../events/canonical/subscribers/cashbackSubscriber'),
    // Phase-B canonical-events subscriber: consumes visit.completed
    // (source=qr_checkin) and awards Scan-to-Earn coins per merchant
    // rewardRules.scanToEarn config. 3-layer idempotency (ProcessedEvent +
    // daily-cap slots + wallet referenceId).
    import('../events/canonical/subscribers/scanRewardSubscriber'),
    // Phase-D canonical-events subscriber: consumes payment.settled and
    // sends the paying customer a WhatsApp receipt via
    // WhatsAppMarketingService. DPDP-aware — checks UserConsent for the
    // 'whatsapp_transactional' category before dispatch.
    import('../events/canonical/subscribers/whatsappReceiptSubscriber'),
    // Phase-J canonical-events subscriber: consumes payment.settled and
    // appends a CpaBillingEvent when the payment is attributable (new
    // customer conversion or lapsed reactivation) per the merchant's
    // CpaPricingPlan. Monthly-cap guarded.
    import('../events/canonical/subscribers/cpaAttributionSubscriber'),
  ]);

  const notificationWorker = new Worker('notifications', genericJobHandler, {
    ...baseOptions,
    concurrency: 10,
    limiter: { max: 200, duration: 60000 },
  });

  // If rez-notification-events is deployed as a standalone service, skip starting
  // the notification worker here to avoid double-consuming the same BullMQ queue.
  // Set NOTIFICATION_WORKER_EXTERNAL=true on the monolith worker dyno when the
  // standalone service is active.
  const notificationEventsWorker =
    process.env.NOTIFICATION_WORKER_EXTERNAL === 'true' ? null : startNotificationWorker();

  if (notificationEventsWorker === null) {
    logger.info('[Workers] notification-events worker deferred to external rez-notification-events service');
  }

  // Phase C cutover flags for noncritical domain workers.
  const mediaWorker = process.env.MEDIA_WORKER_EXTERNAL === 'true' ? null : startMediaWorker();
  const analyticsEventsWorker = process.env.ANALYTICS_WORKER_EXTERNAL === 'true' ? null : startAnalyticsWorker();
  const catalogWorker = process.env.CATALOG_WORKER_EXTERNAL === 'true' ? null : startCatalogWorker();

  if (!mediaWorker) logger.info('[Workers] media-events worker deferred to external rez-media-service');
  if (!analyticsEventsWorker)
    logger.info('[Workers] analytics-events worker deferred to external rez-analytics-service');
  if (!catalogWorker) logger.info('[Workers] catalog-events worker deferred to external rez-catalog-service');

  // Canonical-events cashback subscriber. `CASHBACK_SUBSCRIBER_EXTERNAL=true`
  // lets us defer this to a future standalone service without deploying a
  // code change. When true, events still flow through the bus; they're just
  // consumed by the external service instead of the monolith worker.
  const cashbackWorker =
    process.env.CASHBACK_SUBSCRIBER_EXTERNAL === 'true' ? null : startCashbackSubscriber();
  if (!cashbackWorker) {
    logger.info('[Workers] canonical cashback subscriber deferred to external service');
  }

  // Canonical-events scan-reward subscriber. Same
  // XXX_SUBSCRIBER_EXTERNAL=true escape hatch for future standalone service.
  const scanRewardWorker =
    process.env.SCAN_REWARD_SUBSCRIBER_EXTERNAL === 'true' ? null : startScanRewardSubscriber();
  if (!scanRewardWorker) {
    logger.info('[Workers] canonical scan-reward subscriber deferred to external service');
  }

  // Canonical-events WhatsApp-receipt subscriber (Phase D). Flag-gated by
  // CANONICAL_WHATSAPP_RECEIPT_MODE (off|shadow|primary) AT THE SUBSCRIBER
  // layer; the external-override flag just controls whether the monolith
  // worker process owns the BullMQ consumer.
  const whatsappReceiptWorker =
    process.env.WHATSAPP_RECEIPT_SUBSCRIBER_EXTERNAL === 'true'
      ? null
      : startWhatsAppReceiptSubscriber();
  if (!whatsappReceiptWorker) {
    logger.info('[Workers] canonical whatsapp-receipt subscriber deferred to external service');
  }

  // Canonical-events CPA-attribution subscriber (Phase J). Same escape
  // hatch; when no external service is live, the monolith owns it.
  const cpaAttributionWorker =
    process.env.CPA_ATTRIBUTION_SUBSCRIBER_EXTERNAL === 'true'
      ? null
      : startCpaAttributionSubscriber();
  if (!cpaAttributionWorker) {
    logger.info('[Workers] canonical cpa-attribution subscriber deferred to external service');
  }

  const workers: Worker[] = [
    notificationWorker,
    broadcastWorker,
    ...(notificationEventsWorker ? [notificationEventsWorker] : []),
    ...(mediaWorker ? [mediaWorker] : []),
    ...(analyticsEventsWorker ? [analyticsEventsWorker] : []),
    ...(catalogWorker ? [catalogWorker] : []),
    ...(cashbackWorker ? [cashbackWorker] : []),
    ...(scanRewardWorker ? [scanRewardWorker] : []),
    ...(whatsappReceiptWorker ? [whatsappReceiptWorker] : []),
    ...(cpaAttributionWorker ? [cpaAttributionWorker] : []),
  ];

  attachBaseHandlers(workers);
  attachGroupHandlers(workers, 'noncritical');

  // Populate module-level registry so shutdown handlers can close these workers.
  allWorkers = workers;

  logger.info('[Workers] Noncritical worker group active', {
    workerGroup: 'noncritical',
    queues: workers.map((w) => w.name),
  });

  return workers;
}

/**
 * Start ALL workers (single-process dev mode).
 * Useful locally when WORKER_ROLE is not set.
 */
export async function startAllWorkers(): Promise<Worker[]> {
  logger.info('[Workers] startAllWorkers() — creating all workers (single-process dev mode)');

  // Run both groups in parallel; they use separate dynamic imports.
  const [critical, noncritical] = await Promise.all([startCriticalWorkers(), startNoncriticalWorkers()]);

  // Merge into module-level registry (overrides the individual assignments above).
  allWorkers = [...critical, ...noncritical];

  logger.info(`[Workers] Domain-segmented workers initialized: ${allWorkers.map((w) => w.name).join(', ')}`);
  return allWorkers;
}
