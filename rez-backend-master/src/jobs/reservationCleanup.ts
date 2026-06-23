import * as cron from 'node-cron';
import reservationService from '../services/reservationService';
import { CLEANUP_INTERVAL_MINUTES } from '../types/reservation';
import redisService from '../services/redisService';
import { logger } from '../config/logger';

/**
 * Reservation Cleanup Job
 *
 * This background job runs periodically (every 5 minutes by default)
 * to clean up expired stock reservations.
 *
 * When a reservation expires:
 * 1. It's removed from the cart
 * 2. The stock becomes available for other customers
 * 3. The cleanup is logged for monitoring
 *
 * This prevents stock from being held indefinitely by abandoned carts.
 */

let cleanupJob: ReturnType<typeof cron.schedule> | null = null;
let isRunning = false;

/**
 * Initialize and start the cleanup job
 */
export function startReservationCleanup(): void {
  if (cleanupJob) {
    logger.info('⚠️ [CLEANUP JOB] Already running');
    return;
  }

  // Run every N minutes
  const cronExpression = `*/${CLEANUP_INTERVAL_MINUTES} * * * *`;

  logger.info(`🧹 [CLEANUP JOB] Starting reservation cleanup job (runs every ${CLEANUP_INTERVAL_MINUTES} minutes)`);

  cleanupJob = cron.schedule(cronExpression, async () => {
    // Prevent concurrent executions
    if (isRunning) {
      logger.info('⏭️ [CLEANUP JOB] Previous cleanup still running, skipping this execution');
      return;
    }

    // Acquire Redis distributed lock to prevent cross-instance overlap
    const lockKey = 'job:reservation-cleanup';
    const lockToken = await redisService.acquireLock(lockKey, 300);
    if (!lockToken) {
      logger.info('reservation-cleanup skipped — lock held by another instance');
      return;
    }

    isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('🧹 [CLEANUP JOB] Running expired reservation cleanup...');

      const result = await reservationService.releaseExpiredReservations();

      const duration = Date.now() - startTime;

      logger.info('✅ [CLEANUP JOB] Cleanup completed:', {
        duration: `${duration}ms`,
        releasedCount: result.releasedCount,
        errorCount: result.errors.length,
        timestamp: new Date().toISOString()
      });

      // Log details if there were releases or errors
      if (result.releasedCount > 0) {
        logger.info(`📊 [CLEANUP JOB] Released reservations from ${new Set(result.releasedItems.map(i => i.cartId)).size} carts`);

        // Log first few released items for monitoring
        const sampleSize = Math.min(5, result.releasedItems.length);
        logger.info(`📋 [CLEANUP JOB] Sample of released items (${sampleSize}/${result.releasedItems.length}):`);
        result.releasedItems.slice(0, sampleSize).forEach((item, index) => {
          logger.info(`   ${index + 1}. Cart: ${item.cartId.substring(0, 8)}..., Product: ${item.productId.substring(0, 8)}..., Quantity: ${item.quantity}`);
        });
      }

      if (result.errors.length > 0) {
        logger.error('❌ [CLEANUP JOB] Errors during cleanup:');
        result.errors.forEach((error, index) => {
          logger.error(`   ${index + 1}. Cart: ${error.cartId}, Error: ${error.error}`);
        });
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('❌ [CLEANUP JOB] Cleanup failed:', {
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    } finally {
      await redisService.releaseLock(lockKey, lockToken);
      isRunning = false;
    }
  });

  logger.info('✅ [CLEANUP JOB] Reservation cleanup job started successfully');
}

/**
 * Stop the cleanup job
 */
export function stopReservationCleanup(): void {
  if (cleanupJob) {
    cleanupJob.stop();
    cleanupJob = null;
    logger.info('🛑 [CLEANUP JOB] Reservation cleanup job stopped');
  } else {
    logger.info('⚠️ [CLEANUP JOB] No job running to stop');
  }
}

/**
 * Get cleanup job status
 */
export function getCleanupJobStatus(): {
  running: boolean;
  executing: boolean;
  interval: number;
} {
  return {
    running: cleanupJob !== null,
    executing: isRunning,
    interval: CLEANUP_INTERVAL_MINUTES
  };
}

/**
 * Manually trigger a cleanup (for testing or maintenance)
 */
export async function triggerManualCleanup(): Promise<void> {
  if (isRunning) {
    logger.info('⚠️ [CLEANUP JOB] Cleanup already running, please wait');
    return;
  }

  logger.info('🧹 [CLEANUP JOB] Manual cleanup triggered');

  isRunning = true;
  const startTime = Date.now();

  try {
    const result = await reservationService.releaseExpiredReservations();
    const duration = Date.now() - startTime;

    logger.info('✅ [CLEANUP JOB] Manual cleanup completed:', {
      duration: `${duration}ms`,
      releasedCount: result.releasedCount,
      errorCount: result.errors.length
    });
  } catch (error) {
    logger.error('❌ [CLEANUP JOB] Manual cleanup failed:', error);
  } finally {
    isRunning = false;
  }
}

export default {
  start: startReservationCleanup,
  stop: stopReservationCleanup,
  getStatus: getCleanupJobStatus,
  triggerManual: triggerManualCleanup
};