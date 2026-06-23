import * as cron from 'node-cron';
import GameSession from '../models/GameSession';
import redisService from '../services/redisService';
import { logger } from '../config/logger';

/**
 * Session Cleanup Job
 *
 * This background job runs daily at midnight (00:00) to clean up expired game sessions.
 *
 * What it does:
 * 1. Finds all game sessions older than 24 hours
 * 2. Updates their status to 'expired' if still pending or playing
 * 3. Deletes sessions older than 30 days to keep database clean
 * 4. Logs cleanup statistics for monitoring
 *
 * This prevents the database from accumulating stale game sessions
 * and ensures proper session lifecycle management.
 */

let cleanupJob: ReturnType<typeof cron.schedule> | null = null;
let isRunning = false;

// Configuration
const EXPIRY_HOURS = 24; // Sessions older than this are expired
const DELETE_DAYS = 30; // Sessions older than this are permanently deleted
const CRON_SCHEDULE = '0 0 * * *'; // Daily at midnight (00:00)

interface CleanupStats {
  expiredCount: number;
  deletedCount: number;
  totalProcessed: number;
  errors: Array<{
    sessionId: string;
    error: string;
  }>;
}

/**
 * Perform the cleanup operation
 */
async function performCleanup(): Promise<CleanupStats> {
  const stats: CleanupStats = {
    expiredCount: 0,
    deletedCount: 0,
    totalProcessed: 0,
    errors: []
  };

  try {
    // Calculate cutoff times
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() - EXPIRY_HOURS);

    const deleteDate = new Date();
    deleteDate.setDate(deleteDate.getDate() - DELETE_DAYS);

    logger.info(`📅 [SESSION CLEANUP] Expiry cutoff: ${expiryDate.toISOString()}`);
    logger.info(`📅 [SESSION CLEANUP] Delete cutoff: ${deleteDate.toISOString()}`);

    // Step 1: Mark old sessions as expired
    const expireResult = await GameSession.updateMany(
      {
        status: { $in: ['pending', 'playing'] },
        createdAt: { $lt: expiryDate }
      },
      {
        $set: { status: 'expired' }
      }
    );

    stats.expiredCount = expireResult.modifiedCount;
    logger.info(`⏰ [SESSION CLEANUP] Marked ${stats.expiredCount} sessions as expired`);

    // Step 2: Get sessions to delete (for logging before deletion)
    const sessionsToDelete = await GameSession.find({
      createdAt: { $lt: deleteDate }
    })
      .select('_id sessionId gameType user createdAt status')
      .limit(100); // Limit for logging purposes

    // Step 3: Delete very old sessions
    const deleteResult = await GameSession.deleteMany({
      createdAt: { $lt: deleteDate }
    });

    stats.deletedCount = deleteResult.deletedCount || 0;
    logger.info(`🗑️ [SESSION CLEANUP] Deleted ${stats.deletedCount} old sessions`);

    // Log sample of deleted sessions
    if (sessionsToDelete.length > 0) {
      const sampleSize = Math.min(5, sessionsToDelete.length);
      logger.info(`📋 [SESSION CLEANUP] Sample of deleted sessions (${sampleSize}/${sessionsToDelete.length}):`);
      sessionsToDelete.slice(0, sampleSize).forEach((session, index) => {
        logger.info(`   ${index + 1}. ID: ${session.sessionId}, Type: ${session.gameType}, Age: ${Math.floor((Date.now() - session.createdAt.getTime()) / (1000 * 60 * 60 * 24))} days`);
      });
    }

    stats.totalProcessed = stats.expiredCount + stats.deletedCount;

    // Additional stats: Current session counts by status
    const statusCounts = await GameSession.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    logger.info('📊 [SESSION CLEANUP] Current session counts by status:');
    statusCounts.forEach(stat => {
      logger.info(`   - ${stat._id}: ${stat.count}`);
    });

    // Game type distribution
    const gameTypeCounts = await GameSession.aggregate([
      {
        $match: { status: { $ne: 'expired' } } // Active sessions only
      },
      {
        $group: {
          _id: '$gameType',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    logger.info('🎮 [SESSION CLEANUP] Active sessions by game type:');
    gameTypeCounts.forEach(stat => {
      logger.info(`   - ${stat._id}: ${stat.count}`);
    });

  } catch (error: any) {
    logger.error('❌ [SESSION CLEANUP] Error during cleanup:', error);
    stats.errors.push({
      sessionId: 'N/A',
      error: error.message || 'Unknown error'
    });
  }

  return stats;
}

/**
 * Initialize and start the cleanup job
 */
export function startSessionCleanup(): void {
  if (cleanupJob) {
    logger.info('⚠️ [SESSION CLEANUP] Job already running');
    return;
  }

  logger.info(`🧹 [SESSION CLEANUP] Starting session cleanup job (runs daily at midnight)`);
  logger.info(`⚙️ [SESSION CLEANUP] Configuration: Expire after ${EXPIRY_HOURS}h, Delete after ${DELETE_DAYS} days`);

  cleanupJob = cron.schedule(CRON_SCHEDULE, async () => {
    // Prevent concurrent executions
    if (isRunning) {
      logger.info('⏭️ [SESSION CLEANUP] Previous cleanup still running, skipping this execution');
      return;
    }

    // Acquire Redis distributed lock to prevent cross-instance overlap
    const lockKey = 'job:session-cleanup';
    const lockToken = await redisService.acquireLock(lockKey, 300);
    if (!lockToken) {
      logger.info('session-cleanup skipped — lock held by another instance');
      return;
    }

    isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('🧹 [SESSION CLEANUP] Running expired session cleanup...');

      const stats = await performCleanup();

      const duration = Date.now() - startTime;

      logger.info('✅ [SESSION CLEANUP] Cleanup completed:', {
        duration: `${duration}ms`,
        expiredCount: stats.expiredCount,
        deletedCount: stats.deletedCount,
        totalProcessed: stats.totalProcessed,
        errorCount: stats.errors.length,
        timestamp: new Date().toISOString()
      });

      if (stats.errors.length > 0) {
        logger.error('❌ [SESSION CLEANUP] Errors during cleanup:');
        stats.errors.forEach((error, index) => {
          logger.error(`   ${index + 1}. Session: ${error.sessionId}, Error: ${error.error}`);
        });
      }

      // Log summary message
      if (stats.totalProcessed > 0) {
        logger.info(`📈 [SESSION CLEANUP] Processed ${stats.totalProcessed} sessions (${stats.expiredCount} expired, ${stats.deletedCount} deleted)`);
      } else {
        logger.info('✨ [SESSION CLEANUP] No sessions needed cleanup');
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('❌ [SESSION CLEANUP] Cleanup failed:', {
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    } finally {
      await redisService.releaseLock(lockKey, lockToken);
      isRunning = false;
    }
  });

  logger.info('✅ [SESSION CLEANUP] Session cleanup job started successfully');
}

/**
 * Stop the cleanup job
 */
export function stopSessionCleanup(): void {
  if (cleanupJob) {
    cleanupJob.stop();
    cleanupJob = null;
    logger.info('🛑 [SESSION CLEANUP] Session cleanup job stopped');
  } else {
    logger.info('⚠️ [SESSION CLEANUP] No job running to stop');
  }
}

/**
 * Get cleanup job status
 */
export function getSessionCleanupStatus(): {
  running: boolean;
  executing: boolean;
  schedule: string;
  config: {
    expiryHours: number;
    deleteDays: number;
  };
} {
  return {
    running: cleanupJob !== null,
    executing: isRunning,
    schedule: CRON_SCHEDULE,
    config: {
      expiryHours: EXPIRY_HOURS,
      deleteDays: DELETE_DAYS
    }
  };
}

/**
 * Manually trigger a cleanup (for testing or maintenance)
 */
export async function triggerManualSessionCleanup(): Promise<CleanupStats> {
  if (isRunning) {
    logger.info('⚠️ [SESSION CLEANUP] Cleanup already running, please wait');
    throw new Error('Cleanup already in progress');
  }

  logger.info('🧹 [SESSION CLEANUP] Manual cleanup triggered');

  isRunning = true;
  const startTime = Date.now();

  try {
    const stats = await performCleanup();
    const duration = Date.now() - startTime;

    logger.info('✅ [SESSION CLEANUP] Manual cleanup completed:', {
      duration: `${duration}ms`,
      expiredCount: stats.expiredCount,
      deletedCount: stats.deletedCount,
      totalProcessed: stats.totalProcessed
    });

    return stats;
  } catch (error) {
    logger.error('❌ [SESSION CLEANUP] Manual cleanup failed:', error);
    throw error;
  } finally {
    isRunning = false;
  }
}

/**
 * Initialize the job (called from server startup)
 */
export function initializeSessionCleanupJob(): void {
  startSessionCleanup();
}

export default {
  start: startSessionCleanup,
  stop: stopSessionCleanup,
  getStatus: getSessionCleanupStatus,
  triggerManual: triggerManualSessionCleanup,
  initialize: initializeSessionCleanupJob
};
