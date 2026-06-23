import { Queue } from 'bullmq';
import { logger } from './logger';

/**
 * Export Queue Configuration
 *
 * DISABLED BY DEFAULT - Redis connection issues
 * To enable: Set ENABLE_EXPORT_QUEUE=true in .env and ensure Redis is running
 */

let exportQueue: Queue | null = null;
let isRedisAvailable = false;

// Check if export queue should be enabled
const enableExportQueue = process.env.ENABLE_EXPORT_QUEUE === 'true';

if (enableExportQueue) {
  logger.info('🔄 Initializing export queue...');

  try {
    // Redis connection options
    const redisConfig = process.env.REDIS_URL || {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      retryStrategy: () => null // Don't retry on failure
    };

    exportQueue = new Queue('analytics-export', {
      connection: typeof redisConfig === 'string'
        ? redisConfig
        : ({
            host: redisConfig.host,
            port: redisConfig.port,
            password: redisConfig.password,
          } as any),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { age: 24 * 3600 },
        removeOnFail: { age: 7 * 24 * 3600 }
      }
    });

    // Event handlers — bullmq v5 uses different listener signatures
    (exportQueue as any).on('error', () => {
      isRedisAvailable = false;
      logger.warn('⚠️ Redis connection failed - Export queue disabled');
      if (exportQueue) {
        exportQueue.close().catch(() => {});
        exportQueue = null;
      }
    });

    // Test connection
    (exportQueue as any).client?.then?.(() => {
      isRedisAvailable = true;
      logger.info('✅ Redis connection successful - Export queue enabled');
    }).catch(() => {
      isRedisAvailable = false;
      logger.warn('⚠️ Redis not available - Export queue disabled');
      if (exportQueue) {
        exportQueue.close().catch(() => {});
        exportQueue = null;
      }
    });

  } catch (error: any) {
    logger.warn('⚠️ Failed to initialize export queue:', error.message);
    exportQueue = null;
    isRedisAvailable = false;
  }
} else {
  logger.info('ℹ️ Export queue disabled (set ENABLE_EXPORT_QUEUE=true to enable)');
}

export { exportQueue, isRedisAvailable };
export default exportQueue;
