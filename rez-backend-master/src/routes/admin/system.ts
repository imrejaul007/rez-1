import { logger } from '../../config/logger';
import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { sendSuccess, sendError } from '../../utils/response';
import { QueueService } from '../../services/QueueService';
import {
  getLatestReconciliationResult,
  triggerManualReconciliation,
} from '../../jobs/reconciliationJob';
import mongoose from 'mongoose';
import redisService from '../../services/redisService';
import os from 'os';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

// All routes require admin authentication
router.use(requireAuth);
router.use(requireAdmin);

/**
 * @route   GET /api/admin/system/health
 * @desc    System health overview
 * @access  Admin
 */
router.get('/health', asyncHandler(async (req: Request, res: Response) => {
    // Database status
    const dbState = mongoose.connection.readyState;
    const dbStateMap: Record<number, string> = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };
    const dbStatus = dbStateMap[dbState] || 'unknown';

    let dbConnectionCount = 0;
    try {
      const adminDb = mongoose.connection.db;
      if (adminDb) {
        const serverStatus = await adminDb.command({ serverStatus: 1 });
        dbConnectionCount = serverStatus?.connections?.current || 0;
      }
    } catch {
      // serverStatus may not be available in all configurations
    }

    // Redis status
    const redisStats = await redisService.getStats();
    const redisStatus = redisStats.connected ? 'connected' : 'disconnected';
    const redisMemory = redisStats.info?.Memory?.used_memory_human || null;

    // Queue health
    let queueHealth = null;
    try {
      queueHealth = await QueueService.getHealthStatus();
    } catch {
      queueHealth = { overall: 'unavailable', queues: [], timestamp: new Date().toISOString() };
    }

    // Server info
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const cpus = os.cpus();
    const cpuUsage = cpus.length > 0
      ? cpus.reduce((acc, cpu) => {
          const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
          const idle = cpu.times.idle;
          return acc + ((total - idle) / total) * 100;
        }, 0) / cpus.length
      : 0;

    // Scheduled jobs status
    const jobs = await getScheduledJobStatuses();

    const health = {
      server: {
        uptime: process.uptime(),
        uptimeFormatted: formatUptime(process.uptime()),
        memory: {
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          rss: memUsage.rss,
          external: memUsage.external,
          heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
          rssMB: Math.round(memUsage.rss / 1024 / 1024),
        },
        totalMemory: totalMem,
        freeMemory: freeMem,
        totalMemoryGB: (totalMem / 1024 / 1024 / 1024).toFixed(2),
        freeMemoryGB: (freeMem / 1024 / 1024 / 1024).toFixed(2),
        cpuUsagePercent: Math.round(cpuUsage * 100) / 100,
        cpuCores: cpus.length,
        nodeVersion: process.version,
        platform: process.platform,
        pid: process.pid,
      },
      database: {
        status: dbStatus,
        connectionCount: dbConnectionCount,
        host: mongoose.connection.host || 'unknown',
        name: mongoose.connection.name || 'unknown',
      },
      redis: {
        status: redisStatus,
        enabled: redisStats.enabled,
        memory: redisMemory,
        dbSize: redisStats.dbSize || 0,
      },
      queues: queueHealth,
      jobs,
      timestamp: new Date().toISOString(),
    };

    // Determine overall status
    const isHealthy =
      dbStatus === 'connected' &&
      (redisStatus === 'connected' || !redisStats.enabled);
    const isDegraded =
      dbStatus === 'connected' &&
      redisStats.enabled &&
      redisStatus !== 'connected';
    const overallStatus = isHealthy ? 'healthy' : isDegraded ? 'degraded' : 'unhealthy';

    return sendSuccess(res, { ...health, overallStatus }, 'System health retrieved');
  }));

/**
 * @route   GET /api/admin/system/reconciliation
 * @desc    Get latest reconciliation results
 * @access  Admin
 */
router.get('/reconciliation', asyncHandler(async (req: Request, res: Response) => {
    const result = await getLatestReconciliationResult();

    if (!result) {
      return sendSuccess(res, {
        hasResults: false,
        message: 'No reconciliation results available. The job may not have run yet.',
      }, 'No reconciliation results');
    }

    return sendSuccess(res, {
      hasResults: true,
      ...result,
    }, 'Reconciliation results retrieved');
  }));

/**
 * @route   POST /api/admin/system/reconciliation/trigger
 * @desc    Manually trigger reconciliation
 * @access  Admin
 */
router.post('/reconciliation/trigger', asyncHandler(async (req: Request, res: Response) => {
    logger.info(`[ADMIN SYSTEM] Manual reconciliation triggered by admin user`);
    const result = await triggerManualReconciliation();

    return sendSuccess(res, result, 'Reconciliation completed successfully');
  }));

/**
 * @route   GET /api/admin/system/jobs
 * @desc    Get all scheduled job statuses
 * @access  Admin
 */
router.get('/jobs', asyncHandler(async (req: Request, res: Response) => {
    const jobs = await getScheduledJobStatuses();
    return sendSuccess(res, { jobs }, 'Scheduled job statuses retrieved');
  }));

// ---- Helpers ----

/**
 * Get statuses of all known scheduled cron jobs.
 * Since the jobs don't store their status centrally, we build a known list
 * with schedule info. Last run / next run come from Redis if available.
 */
async function getScheduledJobStatuses() {
  const knownJobs = [
    {
      name: 'Credit Pending Cashback',
      schedule: '0 * * * *',
      description: 'Credits confirmed mall cashback to user wallets',
      redisKey: 'job:cashback:credit:lastRun',
    },
    {
      name: 'Expire Stale Clicks',
      schedule: '0 2 * * *',
      description: 'Marks unconverted clicks older than 30 days as expired',
      redisKey: 'job:cashback:expire:lastRun',
    },
    {
      name: 'Daily Reconciliation',
      schedule: '0 3 * * *',
      description: 'Detects financial discrepancies across purchases, wallets, and orders',
      redisKey: 'reconciliation:latest',
    },
    {
      name: 'Travel Credit Cashback',
      schedule: '0 */2 * * *',
      description: 'Credits confirmed travel cashback to user wallets',
      redisKey: 'job:travel:credit:lastRun',
    },
    {
      name: 'Expire Unpaid Bookings',
      schedule: '*/15 * * * *',
      description: 'Cancels travel bookings with pending payment older than 30 minutes',
      redisKey: 'job:travel:expire:lastRun',
    },
    {
      name: 'Mark Completed Bookings',
      schedule: '0 3 * * *',
      description: 'Marks confirmed travel bookings with past dates as completed',
      redisKey: 'job:travel:markCompleted:lastRun',
    },
  ];

  const jobs = await Promise.all(
    knownJobs.map(async (job) => {
      let lastRun: string | null = null;
      let status: 'active' | 'unknown' = 'active';

      try {
        const cached = await redisService.get<any>(job.redisKey);
        if (cached) {
          // reconciliation:latest stores full result with timestamp
          if (cached.timestamp) {
            lastRun = typeof cached.timestamp === 'string'
              ? cached.timestamp
              : new Date(cached.timestamp).toISOString();
          } else if (typeof cached === 'string') {
            lastRun = cached;
          }
        }
      } catch {
        status = 'unknown';
      }

      return {
        name: job.name,
        schedule: job.schedule,
        scheduleHuman: cronToHuman(job.schedule),
        description: job.description,
        lastRun,
        status,
      };
    })
  );

  return jobs;
}

/**
 * Convert cron expression to human-readable string
 */
function cronToHuman(cron: string): string {
  const parts = cron.split(' ');
  if (parts.length < 5) return cron;

  const [min, hour, dom, mon, dow] = parts;

  if (min.startsWith('*/')) {
    return `Every ${min.slice(2)} minutes`;
  }
  if (hour.startsWith('*/')) {
    return `Every ${hour.slice(2)} hours`;
  }
  if (min === '0' && hour === '*') {
    return 'Every hour';
  }
  if (min === '0' && dom === '*' && mon === '*' && dow === '*') {
    return `Daily at ${hour}:00`;
  }

  return cron;
}

/**
 * Format seconds uptime to human-readable string
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(' ');
}

export default router;
