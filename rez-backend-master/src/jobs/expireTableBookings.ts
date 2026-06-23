import { logger } from '../config/logger';
import * as cron from 'node-cron';
import { TableBooking } from '../models/TableBooking';
import redisService from '../services/redisService';

/**
 * Table Booking Expiry Job
 *
 * Runs every 30 minutes to mark past bookings as no_show.
 * Bookings that are still pending/confirmed after bookingDate + bookingTime + 1hr grace
 * are automatically marked as no_show.
 */

let expiryJob: ReturnType<typeof cron.schedule> | null = null;
let isRunning = false;

const CRON_SCHEDULE = '15,45 * * * *'; // Every 30 min at :15 and :45

/**
 * Process expired table bookings
 */
async function processExpiredTableBookings(): Promise<number> {
  try {
    const count = await TableBooking.markNoShows({}, 1);
    return count;
  } catch (error: any) {
    logger.error('❌ [TABLE BOOKING EXPIRY] Error processing expired bookings:', error);
    throw error;
  }
}

/**
 * Start the expiry job
 */
export function startTableBookingExpiryJob(): void {
  if (expiryJob) {
    logger.info('⚠️ [TABLE BOOKING EXPIRY] Job already running');
    return;
  }

  logger.info(`📅 [TABLE BOOKING EXPIRY] Starting table booking expiry job (runs every 30 min)`);

  expiryJob = cron.schedule(CRON_SCHEDULE, async () => {
    if (isRunning) {
      logger.info('⏭️ [TABLE BOOKING EXPIRY] Previous job still running, skipping');
      return;
    }

    // Acquire Redis distributed lock to prevent cross-instance overlap
    const lockKey = 'job:table-booking-expiry';
    const lockToken = await redisService.acquireLock(lockKey, 300);
    if (!lockToken) {
      logger.info('table-booking-expiry skipped — lock held by another instance');
      return;
    }

    isRunning = true;
    const startTime = Date.now();

    try {
      const count = await processExpiredTableBookings();
      const duration = Date.now() - startTime;

      if (count > 0) {
        logger.info('✅ [TABLE BOOKING EXPIRY] Job completed:', {
          duration: `${duration}ms`,
          expiredCount: count,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('❌ [TABLE BOOKING EXPIRY] Job failed:', {
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    } finally {
      await redisService.releaseLock(lockKey, lockToken);
      isRunning = false;
    }
  });

  logger.info('✅ [TABLE BOOKING EXPIRY] Job started successfully');
}

/**
 * Stop the expiry job
 */
export function stopTableBookingExpiryJob(): void {
  if (expiryJob) {
    expiryJob.stop();
    expiryJob = null;
    logger.info('🛑 [TABLE BOOKING EXPIRY] Job stopped');
  }
}

/**
 * Manually trigger expiry (for testing/maintenance)
 */
export async function triggerManualTableBookingExpiry(): Promise<number> {
  if (isRunning) {
    throw new Error('Expiry already in progress');
  }

  logger.info('📅 [TABLE BOOKING EXPIRY] Manual expiry triggered');
  isRunning = true;

  try {
    const count = await processExpiredTableBookings();
    logger.info('✅ [TABLE BOOKING EXPIRY] Manual expiry completed:', { expiredCount: count });
    return count;
  } finally {
    isRunning = false;
  }
}

/**
 * Initialize the job (called from server startup)
 */
export function initializeTableBookingExpiryJob(): void {
  startTableBookingExpiryJob();
}

export default {
  start: startTableBookingExpiryJob,
  stop: stopTableBookingExpiryJob,
  triggerManual: triggerManualTableBookingExpiry,
  initialize: initializeTableBookingExpiryJob
};
