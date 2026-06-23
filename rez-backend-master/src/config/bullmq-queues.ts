// @ts-nocheck
/**
 * BullMQ Queue Configuration
 * ScalePilot: Production-scale queue prioritization and rate limiting
 */

// @ts-ignore — bullmq is optional, only used when BullMQ migration is enabled
// @ts-ignore
import { Queue, Worker, QueueEvents } from 'bullmq';
import { bullmqRedis } from './bullmq-connection';
import { logger } from './logger';

/**
 * Notification Queue - Medium priority
 * Handles user notifications, reminders, and alerts
 */
export const notificationQueue = new Queue('notifications', {
  connection: bullmqRedis,
  defaultJobOptions: {
    priority: 5,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
      count: 200, // Keep last 200 completed jobs
    },
    removeOnFail: {
      age: 86400, // Keep failed jobs for 24 hours
      // ARJUN: Cap failed job retention at 500 to prevent memory bloat in Redis
      // Failed jobs accumulate forever if removeOnFail.count is missing — force cleanup
      count: 500,
    },
  },
});

/**
 * Payment Queue - Highest priority
 * Handles order payments, refunds, and payment webhooks
 */
export const paymentQueue = new Queue('payment-events', {
  connection: bullmqRedis,
  defaultJobOptions: {
    priority: 10,
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    // timeout moved to per-job add() options in BullMQ v5
    removeOnComplete: {
      age: 7200, // Keep for 2 hours
      count: 500,
    },
    removeOnFail: {
      age: 604800, // Keep for 7 days (audit trail)
      // ARJUN: Cap payment failures at 1500 (not 2000) to enforce aggressive cleanup
      // Payment failures are audit-logged separately; Redis shouldn't be the archive
      count: 1500,
    },
  },
});

/**
 * Analytics Queue - Lowest priority
 * Handles event tracking, metrics, and analytics jobs
 */
export const analyticsQueue = new Queue('analytics', {
  connection: bullmqRedis,
  defaultJobOptions: {
    priority: 1,
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      age: 1800, // Keep for 30 minutes
      count: 50,
    },
    removeOnFail: {
      // ARJUN: Analytics failures are non-critical; aggressively prune to save Redis memory
      age: 1800, // Reduced from 3600s (1h) to 1800s (30m)
      count: 50, // Reduced from 100 to 50
    },
  },
});

/**
 * Email Queue - Medium priority
 * Handles transactional and promotional emails
 */
export const emailQueue = new Queue('emails', {
  connection: bullmqRedis,
  defaultJobOptions: {
    priority: 6,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
    // timeout moved to per-job add() options in BullMQ v5
    removeOnComplete: {
      age: 2400, // Keep for 1 hour
      count: 300,
    },
    removeOnFail: {
      age: 86400, // Keep for 24 hours
      count: 500,
    },
  },
});

/**
 * SMS Queue - Medium-high priority
 * Handles SMS notifications and OTP delivery
 */
export const smsQueue = new Queue('sms', {
  connection: bullmqRedis,
  defaultJobOptions: {
    priority: 7,
    attempts: 4,
    backoff: {
      type: 'exponential',
      delay: 2500,
    },
    // timeout moved to per-job add() options in BullMQ v5
    removeOnComplete: {
      age: 3600,
      count: 400,
    },
    removeOnFail: {
      age: 86400,
      count: 800,
    },
  },
});

/**
 * Order Processing Queue - High priority
 * Handles order creation, confirmation, and updates
 */
export const orderQueue = new Queue('order-events', {
  connection: bullmqRedis,
  defaultJobOptions: {
    priority: 8,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
    // timeout moved to per-job add() options in BullMQ v5
    removeOnComplete: {
      age: 3600,
      count: 600,
    },
    removeOnFail: {
      age: 604800, // 7 days
      count: 1500,
    },
  },
});

/**
 * Reward & Coin Ledger Queue - High priority
 * Handles coin rewards, cashback, and loyalty operations
 */
export const rewardQueue = new Queue('rewards', {
  connection: bullmqRedis,
  defaultJobOptions: {
    priority: 8,
    attempts: 4,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    // timeout moved to per-job add() options in BullMQ v5
    removeOnComplete: {
      age: 3600,
      count: 400,
    },
    removeOnFail: {
      age: 604800, // 7 days (financial audit trail)
      // ARJUN: Cap reward failures at 750 (was 1000) — coin operations must be audit-logged separately
      // Don't rely on Redis queue memory as primary audit trail for financial events
      count: 750,
    },
  },
});

/**
 * Export/Data Generation Queue - Low priority
 * Handles large data exports and batch processing
 */
export const exportQueue = new Queue('exports', {
  connection: bullmqRedis,
  defaultJobOptions: {
    priority: 2,
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    // timeout moved to per-job add() options in BullMQ v5
    removeOnComplete: {
      age: 86400, // 24 hours
      count: 100,
    },
    removeOnFail: {
      age: 604800,
      count: 300,
    },
  },
});

/**
 * Scheduled Tasks Queue - Medium priority
 * Handles cron jobs, reminders, and scheduled operations
 */
export const scheduledQueue = new Queue('scheduled', {
  connection: bullmqRedis,
  defaultJobOptions: {
    priority: 5,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    // timeout moved to per-job add() options in BullMQ v5
    removeOnComplete: {
      age: 7200,
      count: 200,
    },
    removeOnFail: {
      age: 604800,
      count: 500,
    },
  },
});

/**
 * Service Integration Queue - Medium priority
 * Handles third-party API calls and integrations
 */
export const integrationQueue = new Queue('integrations', {
  connection: bullmqRedis,
  defaultJobOptions: {
    priority: 5,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
    // timeout moved to per-job add() options in BullMQ v5
    removeOnComplete: {
      age: 3600,
      count: 250,
    },
    removeOnFail: {
      age: 172800, // 2 days
      count: 600,
    },
  },
});

/**
 * Initialize all queues
 */
export async function initializeQueues(): Promise<void> {
  const queues = [
    { name: 'Notifications', queue: notificationQueue },
    { name: 'Payments', queue: paymentQueue },
    { name: 'Analytics', queue: analyticsQueue },
    { name: 'Emails', queue: emailQueue },
    { name: 'SMS', queue: smsQueue },
    { name: 'Orders', queue: orderQueue },
    { name: 'Rewards', queue: rewardQueue },
    { name: 'Exports', queue: exportQueue },
    { name: 'Scheduled', queue: scheduledQueue },
    { name: 'Integrations', queue: integrationQueue },
  ];

  for (const { name, queue } of queues) {
    try {
      await queue.waitUntilReady();
      const count = await queue.count();
      logger.info(`✅ Queue initialized: ${name} (${count} pending jobs)`);
    } catch (error) {
      logger.error(`❌ Failed to initialize queue: ${name}`, error);
    }
  }
}

/**
 * Get queue status summary
 */
export async function getQueueStats(): Promise<Record<string, any>> {
  const queues = [
    notificationQueue,
    paymentQueue,
    analyticsQueue,
    emailQueue,
    smsQueue,
    orderQueue,
    rewardQueue,
    exportQueue,
    scheduledQueue,
    integrationQueue,
  ];

  const stats: Record<string, any> = {};

  for (const queue of queues) {
    try {
      const counts = await queue.getJobCounts();
      stats[queue.name] = counts;
    } catch (error) {
      stats[queue.name] = { error: 'Failed to get stats' };
    }
  }

  return stats;
}

// ── Payment queue failure alerting ─────────────────────────────────────────
// Fires after all retries are exhausted. Logs to error channel + ops alert.
let _paymentQueueEvents: QueueEvents | null = null;
export function startPaymentQueueEvents(): void {
  if (_paymentQueueEvents) return;
  _paymentQueueEvents = new QueueEvents('payment-events', { connection: bullmqRedis });

  _paymentQueueEvents.on('failed', ({ jobId, failedReason, prev }) => {
    logger.error('[PAYMENT QUEUE] Job permanently failed', { jobId, failedReason, prev });
    // If you have an alerting function, call it here. Otherwise just log at error level.
    // This will be picked up by Sentry and any log-based alerting.
  });

  _paymentQueueEvents.on('stalled', ({ jobId }) => {
    logger.warn('[PAYMENT QUEUE] Job stalled (worker may have crashed)', { jobId });
  });
}

// ── Wallet queue failure alerting ───────────────────────────────────────────
let _walletQueueEvents: QueueEvents | null = null;
export function startWalletQueueEvents(): void {
  if (_walletQueueEvents) return;
  try {
    _walletQueueEvents = new QueueEvents('wallet-events', { connection: bullmqRedis });
    _walletQueueEvents.on('failed', ({ jobId, failedReason }) => {
      logger.error('[WALLET QUEUE] Job permanently failed after all retries', {
        jobId,
        failedReason,
      });
    });
  } catch (err: any) {
    logger.warn('[WALLET QUEUE] Could not start QueueEvents', { error: err.message });
  }
}

// ── Cashback queue failure alerting ─────────────────────────────────────────
let _cashbackQueueEvents: QueueEvents | null = null;
export function startCashbackQueueEvents(): void {
  if (_cashbackQueueEvents) return;
  try {
    _cashbackQueueEvents = new QueueEvents('cashback', { connection: bullmqRedis });
    _cashbackQueueEvents.on('failed', ({ jobId, failedReason }) => {
      logger.error('[CASHBACK QUEUE] Job permanently failed', { jobId, failedReason });
    });
  } catch (err: any) {
    logger.warn('[CASHBACK QUEUE] Could not start QueueEvents', { error: err.message });
  }
}

export async function closeAllQueueEvents(): Promise<void> {
  await Promise.all(
    [_paymentQueueEvents?.close(), _walletQueueEvents?.close(), _cashbackQueueEvents?.close()].filter(Boolean),
  );
}

/**
 * Gracefully close all queues
 */
export async function closeQueues(): Promise<void> {
  const queues = [
    notificationQueue,
    paymentQueue,
    analyticsQueue,
    emailQueue,
    smsQueue,
    orderQueue,
    rewardQueue,
    exportQueue,
    scheduledQueue,
    integrationQueue,
  ];

  await Promise.all(
    queues.map((q) =>
      q.close().catch((err: any) => {
        logger.warn(`Error closing queue ${q.name}:`, err.message);
      }),
    ),
  );

  logger.info('All queues closed');
}

export default {
  notificationQueue,
  paymentQueue,
  analyticsQueue,
  emailQueue,
  smsQueue,
  orderQueue,
  rewardQueue,
  exportQueue,
  scheduledQueue,
  integrationQueue,
  initializeQueues,
  getQueueStats,
  closeQueues,
  startPaymentQueueEvents,
  startWalletQueueEvents,
  startCashbackQueueEvents,
  closeAllQueueEvents,
};
