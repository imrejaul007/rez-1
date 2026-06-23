/**
 * worker.ts — Background Worker Entry Point
 *
 * Runs all cron jobs and background services in a separate process
 * from the API server. This prevents heavy scheduled jobs from
 * competing with user API requests for MongoDB connection pool slots.
 *
 * Usage:
 *   npm run start:worker        (production, from dist/)
 *   npx ts-node src/worker.ts   (development)
 *
 * Deploy as a separate service (e.g., Render "Background Worker")
 * alongside the API server. Set DISABLE_CRON_IN_API=true on the
 * API server to prevent duplicate job execution.
 */

import dotenv from 'dotenv';
dotenv.config();

import { connectDatabase, database } from './config/database';
import redisService from './services/redisService';
import { initializeCronJobs } from './config/cronJobs';
import { ScheduledJobService } from './services/ScheduledJobService';
import { logger } from './config/logger';
import { QueueService } from './services/QueueService';

async function startWorker() {
  logger.info('[WORKER] Starting background worker process...');

  // Connect to database (same pool config as server.ts)
  logger.info('[WORKER] Connecting to database...');
  await connectDatabase();

  // Connect to Redis (required for distributed locks + Bull queues)
  logger.info('[WORKER] Connecting to Redis...');
  await redisService.connect();
  if (!redisService.isReady()) {
    logger.warn('[WORKER] Redis unavailable — distributed locks and Bull queues will not function');
  }

  // Initialize all cron jobs and background services
  logger.info('[WORKER] Initializing cron jobs and background services...');
  await initializeCronJobs();

  // Initialize Bull queue processors (email, SMS, push, analytics, etc.)
  logger.info('[WORKER] Initializing queue service...');
  await QueueService.initialize();
  logger.info('[WORKER] Queue service initialized');

  logger.info('[WORKER] Worker process started — all cron jobs and background services active');

  // ── Graceful shutdown handling ──
  let isShuttingDown = false;
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info(`[WORKER] Received ${signal}. Graceful shutdown...`);

    try {
      try {
        await ScheduledJobService.shutdown();
        logger.info('[WORKER] Scheduled job service shut down');
      } catch { /* May not be initialized */ }

      try {
        await QueueService.shutdown();
        logger.info('[WORKER] Queue service shut down');
      } catch { /* May not be initialized */ }

      try {
        await redisService.disconnect();
        logger.info('[WORKER] Redis disconnected');
      } catch { /* Redis may not be connected */ }

      await database.disconnect();
      logger.info('[WORKER] Database disconnected');
      logger.info('[WORKER] Worker shut down cleanly');
      process.exit(0);
    } catch (error) {
      logger.error('[WORKER] Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason: unknown) => {
    logger.error('[WORKER] Unhandled Promise Rejection', {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });

  process.on('uncaughtException', (error: Error) => {
    logger.error('[WORKER] Uncaught Exception - shutting down', {
      message: error.message,
      stack: error.stack,
    });
    shutdown('uncaughtException');
  });
}

startWorker().catch((error) => {
  logger.error('[WORKER] Failed to start worker:', error);
  process.exit(1);
});
