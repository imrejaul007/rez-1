import { exportQueue } from '../config/queue.config';
import { ExportService } from '../services/exportService';
import { logger } from '../config/logger';
import { Worker } from 'bullmq';

/**
 * Export worker - processes export jobs from the queue.
 * Only starts if Redis is available (queue.config.ts gates this).
 *
 * NOTE: bullmq v5 requires a separate Worker class instead of Queue.process.
 * The Worker needs the same connection options as the Queue.
 */
if (exportQueue) {
  // Get the connection opts from the queue config (string URL or object)
  const workerConn = (exportQueue as any).opts?.connection ?? (exportQueue as any).opts?.redis ?? {};

  const exportWorker = new Worker(
    'analytics-export',
    async (job) => {
      logger.info(`Processing export job ${job.id}:`, job.data);
      try {
        const result = await ExportService.processExport(job as any);
        if (!result.success) {
          throw new Error(result.error || 'Export failed');
        }
        return result;
      } catch (error: any) {
        logger.error(`Export job ${job.id} failed:`, error);
        throw error;
      }
    },
    { connection: workerConn }
  );

  logger.info('✅ Export worker started and listening for jobs...');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, closing export worker...');
    await exportWorker.close();
    if (exportQueue) await exportQueue.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, closing export worker...');
    await exportWorker.close();
    if (exportQueue) await exportQueue.close();
    process.exit(0);
  });
} else {
  console.warn('⚠️ Export worker not started - Redis is not available');
}
