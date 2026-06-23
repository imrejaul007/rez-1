import { logger } from '../config/logger';
/**
 * Scheduled Job Service
 *
 * Migrates all node-cron jobs to Bull repeatable jobs for better reliability,
 * monitoring, retry logic, and distributed execution.
 *
 * Uses a single Bull queue ('scheduled-jobs') with named processors.
 * Each job calls the existing run* function from the respective job file.
 *
 * Features:
 * - Repeatable jobs with cron schedules
 * - Retry logic (3 attempts, exponential backoff)
 * - Job health monitoring via getJobHealth()
 * - Manual triggering by job name
 * - Graceful initialize/shutdown lifecycle
 */

import Bull, { Queue, Job } from 'bull';
import { getRedisConfig } from '../config/redis';

// ── Job runner imports ──────────────────────────────────────────────────────
// cashbackJobs.ts  (2 sub-jobs)
import { triggerManualCreditCashback, triggerManualExpireClicks } from '../jobs/cashbackJobs';
// cleanupExpiredSessions.ts
import { triggerManualSessionCleanup } from '../jobs/cleanupExpiredSessions';
// expireCoins.ts
import { triggerManualCoinExpiry } from '../jobs/expireCoins';
// expireDealRedemptions.ts
import { triggerManualDealExpiry } from '../jobs/expireDealRedemptions';
// expireTableBookings.ts
import { triggerManualTableBookingExpiry } from '../jobs/expireTableBookings';
// expireVoucherRedemptions.ts
import { triggerManualVoucherExpiry } from '../jobs/expireVoucherRedemptions';
// inventoryAlerts.ts
import { triggerManualInventoryAlerts } from '../jobs/inventoryAlerts';
// reconciliationJob.ts
import { triggerManualReconciliation } from '../jobs/reconciliationJob';
// reservationCleanup.ts
import { triggerManualCleanup } from '../jobs/reservationCleanup';
// travelCashbackJobs.ts  (3 sub-jobs -- no individual manual exports, import the functions directly)
import { initializeTravelCashbackJobs } from '../jobs/travelCashbackJobs';
// trialExpiryNotification.ts
import { triggerTrialExpiryCheck } from '../jobs/trialExpiryNotification';

// ── Types ───────────────────────────────────────────────────────────────────

interface ScheduledJobDefinition {
  name: string;
  cron: string;
  description: string;
  runner: () => Promise<any>;
}

interface JobHealthEntry {
  name: string;
  cron: string;
  description: string;
  status: 'active' | 'inactive' | 'unknown';
  nextRun?: string;
  lastCompleted?: string;
  lastFailed?: string;
}

// ── Job definitions ─────────────────────────────────────────────────────────

const JOB_DEFINITIONS: ScheduledJobDefinition[] = [
  // cashbackJobs.ts
  {
    name: 'credit-cashback',
    cron: '0 * * * *',           // Every hour at minute 0
    description: 'Credit pending cashback to user wallets',
    runner: triggerManualCreditCashback,
  },
  {
    name: 'expire-clicks',
    cron: '0 2 * * *',           // Daily at 2:00 AM
    description: 'Mark expired affiliate clicks (>30 days)',
    runner: triggerManualExpireClicks,
  },

  // cleanupExpiredSessions.ts
  {
    name: 'cleanup-expired-sessions',
    cron: '0 0 * * *',           // Daily at midnight
    description: 'Expire and delete old game sessions',
    runner: triggerManualSessionCleanup,
  },

  // expireCoins.ts
  {
    name: 'expire-coins',
    cron: '0 1 * * *',           // Daily at 1:00 AM
    description: 'Expire coins past their expiry date and notify users',
    runner: triggerManualCoinExpiry,
  },

  // expireDealRedemptions.ts
  {
    name: 'expire-deal-redemptions',
    cron: '0 * * * *',           // Every hour at minute 0
    description: 'Mark expired deal redemptions',
    runner: triggerManualDealExpiry,
  },

  // expireTableBookings.ts
  {
    name: 'expire-table-bookings',
    cron: '15,45 * * * *',       // Every 30 min at :15 and :45
    description: 'Mark past table bookings as no-show',
    runner: triggerManualTableBookingExpiry,
  },

  // expireVoucherRedemptions.ts
  {
    name: 'expire-voucher-redemptions',
    cron: '30 * * * *',          // Every hour at minute 30
    description: 'Expire offer redemptions and user vouchers',
    runner: triggerManualVoucherExpiry,
  },

  // inventoryAlerts.ts
  {
    name: 'inventory-alerts',
    cron: '0 8 * * *',           // Daily at 8:00 AM
    description: 'Send low stock and out of stock alerts to merchants',
    runner: triggerManualInventoryAlerts,
  },

  // reconciliationJob.ts
  {
    name: 'reconciliation',
    cron: '0 3 * * *',           // Daily at 3:00 AM
    description: 'Daily financial reconciliation (cashback, wallet, orders)',
    runner: triggerManualReconciliation,
  },

  // reservationCleanup.ts
  {
    name: 'reservation-cleanup',
    cron: '*/5 * * * *',         // Every 5 minutes
    description: 'Release expired stock reservations from abandoned carts',
    runner: triggerManualCleanup,
  },

  // travelCashbackJobs.ts (3 sub-jobs)
  // Note: The travel cashback job file does not export individual manual triggers
  // for the 3 sub-jobs, so we dynamically import and call the run* functions.
  {
    name: 'travel-credit-cashback',
    cron: '0 */2 * * *',         // Every 2 hours
    description: 'Credit pending travel cashback to user wallets',
    runner: async () => {
      // Dynamically import to access the non-exported run function via the module
      const mod = await import('../jobs/travelCashbackJobs');
      // The module does not export individual run functions, but the start* functions
      // use Redis locks internally. We replicate the lock-wrapped pattern here.
      const redisService = (await import('../services/redisService')).default;
      const travelCashbackService = (await import('../services/travelCashbackService')).default;
      const lockToken = await redisService.acquireLock('travel_cashback_credit', 3600);
      if (!lockToken) {
        logger.info('[SCHEDULED-JOBS] travel-credit-cashback: lock held by another instance, skipping');
        return { skipped: true };
      }
      try {
        const result = await travelCashbackService.creditPendingCashback();
        return result;
      } finally {
        await redisService.releaseLock('travel_cashback_credit', lockToken);
      }
    },
  },
  {
    name: 'travel-expire-unpaid',
    cron: '*/15 * * * *',        // Every 15 minutes
    description: 'Cancel unpaid travel bookings older than 30 minutes',
    runner: async () => {
      const redisService = (await import('../services/redisService')).default;
      const { ServiceBooking } = await import('../models/ServiceBooking');
      const TRAVEL_SLUGS = ['flights', 'hotels', 'trains', 'bus', 'cab', 'packages'];
      const lockToken = await redisService.acquireLock('travel_expire_unpaid', 600);
      if (!lockToken) {
        logger.info('[SCHEDULED-JOBS] travel-expire-unpaid: lock held by another instance, skipping');
        return { skipped: true };
      }
      try {
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
        const unpaidBookings = await ServiceBooking.find({
          paymentStatus: 'pending',
          requiresPaymentUpfront: true,
          status: { $in: ['pending', 'confirmed'] },
          createdAt: { $lt: thirtyMinutesAgo },
        })
          .populate('serviceCategory', 'slug')
          .limit(100).lean();

        const travelBookings = unpaidBookings.filter((b: any) => {
          const slug = b.serviceCategory?.slug || '';
          return TRAVEL_SLUGS.includes(slug) || b.travelDetails;
        });

        let processed = 0;
        let failed = 0;
        for (const booking of travelBookings) {
          try {
            booking.status = 'cancelled';
            booking.cancellationReason = 'Payment timeout - booking expired after 30 minutes';
            booking.cancelledAt = new Date();
            await booking.save();
            processed++;
          } catch {
            failed++;
          }
        }
        return { processed, failed };
      } finally {
        await redisService.releaseLock('travel_expire_unpaid', lockToken);
      }
    },
  },
  {
    name: 'travel-mark-completed',
    cron: '0 3 * * *',           // Daily at 3:00 AM
    description: 'Mark confirmed travel bookings with past dates as completed',
    runner: async () => {
      const redisService = (await import('../services/redisService')).default;
      const { ServiceBooking } = await import('../models/ServiceBooking');
      const TRAVEL_SLUGS = ['flights', 'hotels', 'trains', 'bus', 'cab', 'packages'];
      const lockToken = await redisService.acquireLock('travel_mark_completed', 1800);
      if (!lockToken) {
        logger.info('[SCHEDULED-JOBS] travel-mark-completed: lock held by another instance, skipping');
        return { skipped: true };
      }
      try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(23, 59, 59, 999);

        const bookings = await ServiceBooking.find({
          status: 'confirmed',
          paymentStatus: 'paid',
          bookingDate: { $lt: yesterday },
          completedAt: { $exists: false },
        })
          .populate('serviceCategory', 'slug')
          .limit(200).lean();

        const travelBookings = bookings.filter((b: any) => {
          const slug = b.serviceCategory?.slug || '';
          return TRAVEL_SLUGS.includes(slug) || b.travelDetails;
        });

        let processed = 0;
        let failed = 0;
        for (const booking of travelBookings) {
          try {
            booking.status = 'completed';
            booking.completedAt = new Date();
            await booking.save();
            processed++;
          } catch {
            failed++;
          }
        }
        return { processed, failed };
      } finally {
        await redisService.releaseLock('travel_mark_completed', lockToken);
      }
    },
  },

  // trialExpiryNotification.ts
  {
    name: 'trial-expiry-notification',
    cron: '0 9 * * *',           // Daily at 9:00 AM
    description: 'Send trial expiry notifications (3d, 1d, today) and auto-downgrade',
    runner: triggerTrialExpiryCheck,
  },

  // specialProgramService.ts (3 sub-jobs)
  {
    name: 'special-program-monthly-reset',
    cron: '5 0 1 * *',           // 1st of month at 00:05 UTC
    description: 'Reset monthly earnings for all active special program memberships',
    runner: async () => {
      const sps = (await import('./specialProgramService')).default;
      return sps.resetMonthlyEarnings();
    },
  },
  {
    name: 'special-program-prive-recheck',
    cron: '0 3 * * 0',           // Every Sunday at 3:00 AM
    description: 'Re-evaluate Privé members — suspend if score dropped below threshold',
    runner: async () => {
      const sps = (await import('./specialProgramService')).default;
      return sps.recheckPriveEligibility();
    },
  },
  {
    name: 'special-program-verification-recheck',
    cron: '0 4 * * 0',           // Every Sunday at 4:00 AM (after Privé recheck)
    description: 'Re-check student/corporate verification — suspend if verification revoked',
    runner: async () => {
      const sps = (await import('./specialProgramService')).default;
      return sps.recheckVerificationEligibility();
    },
  },
  {
    name: 'special-program-expire-memberships',
    cron: '0 2 * * *',           // Daily at 2:00 AM
    description: 'Expire special program memberships past their expiresAt date',
    runner: async () => {
      const sps = (await import('./specialProgramService')).default;
      return sps.expireMemberships();
    },
  },
];

// ── Service class ───────────────────────────────────────────────────────────

export class ScheduledJobService {
  private static queue: Queue | null = null;
  private static isInitialized = false;

  /**
   * Initialize the scheduled-jobs Bull queue, register processors and repeatable jobs.
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.info('[SCHEDULED-JOBS] Already initialized');
      return;
    }

    try {
      const redisConfig = getRedisConfig();

      if (!redisConfig.enabled) {
        logger.info('[SCHEDULED-JOBS] Disabled (Redis not available)');
        return;
      }

      // Use URL constructor for robust parsing (handles user:password@host:port)
      const parsedUrl = new URL(redisConfig.url);
      const redisOptions = {
        redis: {
          host: parsedUrl.hostname || 'localhost',
          port: parseInt(parsedUrl.port || '6379', 10),
          password: parsedUrl.password || redisConfig.password || undefined,
          maxRetriesPerRequest: redisConfig.maxRetries,
        },
      };

      this.queue = new Bull('scheduled-jobs', redisOptions);

      // Increase MaxListeners to avoid EventEmitter leak warning with 18+ jobs
      this.queue.setMaxListeners(30);
      if ((this.queue as any).eclient) (this.queue as any).eclient.setMaxListeners(30);
      if ((this.queue as any).bclient) (this.queue as any).bclient.setMaxListeners(30);
      if ((this.queue.client as any)?.setMaxListeners) (this.queue.client as any).setMaxListeners(30);

      // ── Register named processors ──────────────────────────────────────
      for (const def of JOB_DEFINITIONS) {
        this.queue.process(def.name, 1, async (_job: Job) => {
          const startTime = Date.now();
          logger.info(`[SCHEDULED-JOBS] Running "${def.name}" ...`);

          try {
            const result = await def.runner();
            const duration = Date.now() - startTime;
            logger.info(`[SCHEDULED-JOBS] "${def.name}" completed in ${duration}ms`);
            return result;
          } catch (error: any) {
            const duration = Date.now() - startTime;
            logger.error(`[SCHEDULED-JOBS] "${def.name}" failed after ${duration}ms:`, error.message);
            throw error; // Let Bull handle retries
          }
        });
      }

      // ── Register repeatable jobs ───────────────────────────────────────
      // Clean up any stale repeatable jobs from previous deployments first
      const existingRepeatables = await this.queue.getRepeatableJobs();
      for (const existing of existingRepeatables) {
        await this.queue.removeRepeatableByKey(existing.key);
      }

      for (const def of JOB_DEFINITIONS) {
        await this.queue.add(def.name, {}, {
          repeat: { cron: def.cron },
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: 50,
          removeOnFail: 100,
        });
      }

      // ── Global event listeners ─────────────────────────────────────────
      this.queue.on('completed', (job: Job) => {
        // Minimal logging -- the per-job processor already logs details
        if (job.opts?.repeat) {
          // Repeatable completion -- no extra log needed
        }
      });

      this.queue.on('failed', (job: Job, err: Error) => {
        logger.error(`[SCHEDULED-JOBS] Job "${job.name}" (id=${job.id}) failed: ${err.message}`);
      });

      this.queue.on('stalled', (job: Job) => {
        logger.warn(`[SCHEDULED-JOBS] Job "${job.name}" (id=${job.id}) stalled`);
      });

      this.queue.on('error', (err: Error) => {
        logger.error(`[SCHEDULED-JOBS] Queue error: ${err.message}`);
      });

      this.isInitialized = true;
      logger.info(`[SCHEDULED-JOBS] Initialized with ${JOB_DEFINITIONS.length} repeatable jobs`);

    } catch (error: any) {
      logger.error(`[SCHEDULED-JOBS] Failed to initialize: ${error.message}`);
      // Do NOT throw -- let node-cron fallback handle scheduling
    }
  }

  /**
   * Manually trigger a job by name (outside its cron schedule).
   */
  static async triggerJob(jobName: string): Promise<Job | null> {
    if (!this.queue) {
      throw new Error('ScheduledJobService not initialized');
    }

    const def = JOB_DEFINITIONS.find(d => d.name === jobName);
    if (!def) {
      throw new Error(`Unknown job name: "${jobName}". Valid names: ${JOB_DEFINITIONS.map(d => d.name).join(', ')}`);
    }

    const job = await this.queue.add(def.name, { manual: true }, {
      attempts: 1,
      removeOnComplete: 50,
      removeOnFail: 100,
    });

    logger.info(`[SCHEDULED-JOBS] Manually triggered "${jobName}" (job id=${job.id})`);
    return job;
  }

  /**
   * Get health/status of all scheduled jobs.
   */
  static async getJobHealth(): Promise<{
    initialized: boolean;
    jobs: JobHealthEntry[];
    queueStats: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
    } | null;
  }> {
    if (!this.queue || !this.isInitialized) {
      return {
        initialized: false,
        jobs: JOB_DEFINITIONS.map(d => ({
          name: d.name,
          cron: d.cron,
          description: d.description,
          status: 'inactive' as const,
        })),
        queueStats: null,
      };
    }

    try {
      const [waiting, active, completed, failed, delayed, repeatableJobs] = await Promise.all([
        this.queue.getWaitingCount(),
        this.queue.getActiveCount(),
        this.queue.getCompletedCount(),
        this.queue.getFailedCount(),
        this.queue.getDelayedCount(),
        this.queue.getRepeatableJobs(),
      ]);

      const repeatableMap = new Map<string, any>();
      for (const rj of repeatableJobs) {
        repeatableMap.set(rj.name || '', rj);
      }

      const jobs: JobHealthEntry[] = JOB_DEFINITIONS.map(def => {
        const rj = repeatableMap.get(def.name);
        return {
          name: def.name,
          cron: def.cron,
          description: def.description,
          status: rj ? 'active' as const : 'inactive' as const,
          nextRun: rj?.next ? new Date(rj.next).toISOString() : undefined,
        };
      });

      return {
        initialized: true,
        jobs,
        queueStats: { waiting, active, completed, failed, delayed },
      };
    } catch (error: any) {
      logger.error(`[SCHEDULED-JOBS] Error getting health: ${error.message}`);
      return {
        initialized: true,
        jobs: JOB_DEFINITIONS.map(d => ({
          name: d.name,
          cron: d.cron,
          description: d.description,
          status: 'unknown' as const,
        })),
        queueStats: null,
      };
    }
  }

  /**
   * List all available job names.
   */
  static getJobNames(): string[] {
    return JOB_DEFINITIONS.map(d => d.name);
  }

  /**
   * Graceful shutdown -- close the Bull queue connection.
   */
  static async shutdown(): Promise<void> {
    if (this.queue) {
      try {
        await this.queue.close();
        logger.info('[SCHEDULED-JOBS] Queue closed');
      } catch (error: any) {
        logger.error(`[SCHEDULED-JOBS] Error closing queue: ${error.message}`);
      }
      this.queue = null;
    }
    this.isInitialized = false;
  }
}

export default ScheduledJobService;
