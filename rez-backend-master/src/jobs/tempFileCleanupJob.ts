/**
 * Temporary File Cleanup Job
 *
 * Removes old temporary upload files from disk every 6 hours.
 * Prevents disk space exhaustion from accumulated temp files.
 */

import * as cron from 'node-cron';
import { cleanupOldTempFiles } from '../middleware/uploadCleanup';
import { createServiceLogger } from '../config/logger';

const logger = createServiceLogger('temp-cleanup-job');

const SCHEDULE = '0 */6 * * *'; // Every 6 hours
const TEMP_DIRS = [
  '/tmp/gallery-uploads/',
  '/tmp/bulk-imports/',
  '/tmp/uploads/'
];
const AGE_SECONDS = 3600; // Delete files older than 1 hour

let job: ReturnType<typeof cron.schedule> | null = null;

async function runCleanup(): Promise<void> {
  const startTime = Date.now();
  let totalDeleted = 0;
  let totalErrors = 0;

  logger.info('Starting temporary file cleanup');

  for (const tempDir of TEMP_DIRS) {
    try {
      const { deleted, errors } = await cleanupOldTempFiles(tempDir, AGE_SECONDS);
      totalDeleted += deleted;
      totalErrors += errors;

      if (deleted > 0) {
        logger.info(`Cleaned up ${deleted} files from ${tempDir}`, { errors });
      }
    } catch (err) {
      logger.error(`Cleanup failed for ${tempDir}`, err);
      totalErrors++;
    }
  }

  const duration = Date.now() - startTime;
  logger.info('Temporary file cleanup complete', {
    totalDeleted,
    totalErrors,
    durationMs: duration
  });
}

export function initializeTempCleanupJob(): void {
  if (job) {
    logger.info('Temp cleanup job already scheduled');
    return;
  }

  job = cron.schedule(SCHEDULE, async () => {
    try {
      await runCleanup();
    } catch (err) {
      logger.error('Temp cleanup job failed', err);
    }
  });

  logger.info('Temp cleanup job scheduled (every 6 hours)');
}

export function stopTempCleanupJob(): void {
  if (job) {
    job.stop();
    job = null;
    logger.info('Temp cleanup job stopped');
  }
}
