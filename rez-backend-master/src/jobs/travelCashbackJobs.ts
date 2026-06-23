import * as cron from 'node-cron';
import travelCashbackService from '../services/travelCashbackService';
import { ServiceBooking } from '../models/ServiceBooking';
import redisService from '../services/redisService';
import { logger } from '../config/logger';

/**
 * Travel Cashback Background Jobs
 *
 * 1. Credit Pending Cashback (every 2 hours):
 *    - Finds travel bookings past verification period with cashbackStatus='held'
 *    - Credits cashback to user wallets
 *
 * 2. Expire Unpaid Bookings (every 15 minutes):
 *    - Finds travel bookings with pending payment older than 30 minutes
 *    - Cancels them to free up inventory
 *
 * 3. Mark Completed Bookings (daily at 3:00 AM):
 *    - Finds confirmed travel bookings with past booking dates
 *    - Marks them as completed, triggering the verification countdown
 *
 * Uses Redis distributed locks with owner tokens for multi-instance safety.
 */

// Job instances
let creditJob: ReturnType<typeof cron.schedule> | null = null;
let expireUnpaidJob: ReturnType<typeof cron.schedule> | null = null;
let markCompletedJob: ReturnType<typeof cron.schedule> | null = null;

// Schedules
const CREDIT_SCHEDULE = '0 */2 * * *';       // Every 2 hours
const EXPIRE_UNPAID_SCHEDULE = '*/15 * * * *'; // Every 15 minutes
const MARK_COMPLETED_SCHEDULE = '0 3 * * *';  // Daily at 3:00 AM

// Lock TTLs (seconds)
const CREDIT_LOCK_TTL = 3600;        // 1 hour
const EXPIRE_UNPAID_LOCK_TTL = 600;  // 10 minutes
const MARK_COMPLETED_LOCK_TTL = 1800; // 30 minutes

// Travel category slugs for query filtering
const TRAVEL_SLUGS = ['flights', 'hotels', 'trains', 'bus', 'cab', 'packages'];

interface JobStats {
  processed: number;
  failed: number;
  duration: number;
}

/**
 * Run the credit pending travel cashback job
 */
async function runCreditPendingCashback(): Promise<JobStats> {
  const startTime = Date.now();
  const stats: JobStats = { processed: 0, failed: 0, duration: 0 };

  try {
    logger.info('✈️ [TRAVEL CASHBACK JOB] Running credit pending cashback...');

    const result = await travelCashbackService.creditPendingCashback();
    stats.processed = result.credited;
    stats.failed = result.failed;
    stats.duration = Date.now() - startTime;

    logger.info(`✅ [TRAVEL CASHBACK JOB] Credit job completed:`, {
      credited: stats.processed,
      total: result.total,
      failed: stats.failed,
      duration: `${stats.duration}ms`,
    });

    return stats;
  } catch (error: any) {
    stats.duration = Date.now() - startTime;
    logger.error('❌ [TRAVEL CASHBACK JOB] Credit job failed:', error.message);
    throw error;
  }
}

/**
 * Run the expire unpaid bookings job
 */
async function runExpireUnpaidBookings(): Promise<JobStats> {
  const startTime = Date.now();
  const stats: JobStats = { processed: 0, failed: 0, duration: 0 };

  try {
    logger.info('⏰ [TRAVEL CASHBACK JOB] Running expire unpaid bookings...');

    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    // Find unpaid travel bookings older than 30 minutes
    const unpaidBookings = await ServiceBooking.find({
      paymentStatus: 'pending',
      requiresPaymentUpfront: true,
      status: { $in: ['pending', 'confirmed'] },
      createdAt: { $lt: thirtyMinutesAgo },
    })
      .populate('serviceCategory', 'slug')
      .limit(100);

    // Filter to travel bookings only
    const travelBookings = unpaidBookings.filter((b: any) => {
      const slug = b.serviceCategory?.slug || '';
      return TRAVEL_SLUGS.includes(slug) || b.travelDetails;
    });

    for (const booking of travelBookings) {
      try {
        booking.status = 'cancelled';
        booking.cancellationReason = 'Payment timeout - booking expired after 30 minutes';
        booking.cancelledAt = new Date();
        await booking.save();
        stats.processed++;
      } catch (err: any) {
        stats.failed++;
        logger.error(`❌ [TRAVEL CASHBACK JOB] Failed to expire booking ${booking._id}:`, err.message);
      }
    }

    stats.duration = Date.now() - startTime;

    logger.info(`✅ [TRAVEL CASHBACK JOB] Expire unpaid completed:`, {
      expired: stats.processed,
      failed: stats.failed,
      duration: `${stats.duration}ms`,
    });

    return stats;
  } catch (error: any) {
    stats.duration = Date.now() - startTime;
    logger.error('❌ [TRAVEL CASHBACK JOB] Expire unpaid failed:', error.message);
    throw error;
  }
}

/**
 * Run the mark completed bookings job
 */
async function runMarkCompletedBookings(): Promise<JobStats> {
  const startTime = Date.now();
  const stats: JobStats = { processed: 0, failed: 0, duration: 0 };

  try {
    logger.info('📋 [TRAVEL CASHBACK JOB] Running mark completed bookings...');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 59, 59, 999);

    // Find confirmed travel bookings with past booking dates
    const bookings = await ServiceBooking.find({
      status: 'confirmed',
      paymentStatus: 'paid',
      bookingDate: { $lt: yesterday },
      completedAt: { $exists: false },
    })
      .populate('serviceCategory', 'slug')
      .limit(200);

    // Filter to travel bookings
    const travelBookings = bookings.filter((b: any) => {
      const slug = b.serviceCategory?.slug || '';
      return TRAVEL_SLUGS.includes(slug) || b.travelDetails;
    });

    for (const booking of travelBookings) {
      try {
        booking.status = 'completed';
        booking.completedAt = new Date();
        await booking.save();
        stats.processed++;
      } catch (err: any) {
        stats.failed++;
        logger.error(`❌ [TRAVEL CASHBACK JOB] Failed to mark booking ${booking._id} as completed:`, err.message);
      }
    }

    stats.duration = Date.now() - startTime;

    logger.info(`✅ [TRAVEL CASHBACK JOB] Mark completed finished:`, {
      completed: stats.processed,
      failed: stats.failed,
      duration: `${stats.duration}ms`,
    });

    return stats;
  } catch (error: any) {
    stats.duration = Date.now() - startTime;
    logger.error('❌ [TRAVEL CASHBACK JOB] Mark completed failed:', error.message);
    throw error;
  }
}

/**
 * Start the credit pending cashback job
 */
export function startTravelCreditJob(): void {
  if (creditJob) {
    logger.info('⚠️ [TRAVEL CASHBACK JOB] Credit job already running');
    return;
  }

  logger.info('✈️ [TRAVEL CASHBACK JOB] Starting credit job (runs every 2 hours)');

  creditJob = cron.schedule(CREDIT_SCHEDULE, async () => {
    const lockToken = await redisService.acquireLock('travel_cashback_credit', CREDIT_LOCK_TTL);
    if (!lockToken) {
      logger.info('⏭️ [TRAVEL CASHBACK JOB] Another instance running credit job, skipping');
      return;
    }

    try {
      await runCreditPendingCashback();
    } catch (error) {
      // Error already logged
    } finally {
      await redisService.releaseLock('travel_cashback_credit', lockToken);
    }
  });
}

/**
 * Start the expire unpaid bookings job
 */
export function startExpireUnpaidJob(): void {
  if (expireUnpaidJob) {
    logger.info('⚠️ [TRAVEL CASHBACK JOB] Expire unpaid job already running');
    return;
  }

  logger.info('⏰ [TRAVEL CASHBACK JOB] Starting expire unpaid job (runs every 15 min)');

  expireUnpaidJob = cron.schedule(EXPIRE_UNPAID_SCHEDULE, async () => {
    const lockToken = await redisService.acquireLock('travel_expire_unpaid', EXPIRE_UNPAID_LOCK_TTL);
    if (!lockToken) {
      logger.info('⏭️ [TRAVEL CASHBACK JOB] Another instance running expire job, skipping');
      return;
    }

    try {
      await runExpireUnpaidBookings();
    } catch (error) {
      // Error already logged
    } finally {
      await redisService.releaseLock('travel_expire_unpaid', lockToken);
    }
  });
}

/**
 * Start the mark completed bookings job
 */
export function startMarkCompletedJob(): void {
  if (markCompletedJob) {
    logger.info('⚠️ [TRAVEL CASHBACK JOB] Mark completed job already running');
    return;
  }

  logger.info('📋 [TRAVEL CASHBACK JOB] Starting mark completed job (runs daily at 3:00 AM)');

  markCompletedJob = cron.schedule(MARK_COMPLETED_SCHEDULE, async () => {
    const lockToken = await redisService.acquireLock('travel_mark_completed', MARK_COMPLETED_LOCK_TTL);
    if (!lockToken) {
      logger.info('⏭️ [TRAVEL CASHBACK JOB] Another instance running mark completed job, skipping');
      return;
    }

    try {
      await runMarkCompletedBookings();
    } catch (error) {
      // Error already logged
    } finally {
      await redisService.releaseLock('travel_mark_completed', lockToken);
    }
  });
}

/**
 * Stop all travel cashback jobs
 */
export function stopTravelCashbackJobs(): void {
  if (creditJob) {
    creditJob.stop();
    creditJob = null;
    logger.info('🛑 [TRAVEL CASHBACK JOB] Credit job stopped');
  }
  if (expireUnpaidJob) {
    expireUnpaidJob.stop();
    expireUnpaidJob = null;
    logger.info('🛑 [TRAVEL CASHBACK JOB] Expire unpaid job stopped');
  }
  if (markCompletedJob) {
    markCompletedJob.stop();
    markCompletedJob = null;
    logger.info('🛑 [TRAVEL CASHBACK JOB] Mark completed job stopped');
  }
}

/**
 * Get travel cashback jobs status
 */
export function getTravelCashbackJobsStatus() {
  return {
    creditJob: { running: creditJob !== null, schedule: CREDIT_SCHEDULE },
    expireUnpaidJob: { running: expireUnpaidJob !== null, schedule: EXPIRE_UNPAID_SCHEDULE },
    markCompletedJob: { running: markCompletedJob !== null, schedule: MARK_COMPLETED_SCHEDULE },
  };
}

/**
 * Initialize all travel cashback background jobs
 * Called from server startup after database connection
 */
export function initializeTravelCashbackJobs(): void {
  startTravelCreditJob();
  startExpireUnpaidJob();
  startMarkCompletedJob();
}

export default {
  initialize: initializeTravelCashbackJobs,
  stop: stopTravelCashbackJobs,
  getStatus: getTravelCashbackJobsStatus,
};
