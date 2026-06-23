// @ts-nocheck
/**
 * Health Check Endpoints
 * ScalePilot: Comprehensive system health verification
 *
 * ROUTE-SEC-029 FIX: All /health/* endpoints now require internal auth token
 * EXCEPT /health/quick (used by load balancers) and /health/public (minimal status).
 * Infrastructure details (memory, versions, queue names) no longer exposed publicly.
 */

import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { getRedis, getRedisRead, checkRedisHealth } from '../../config/redis-pool';
import { logger } from '../../config/logger';
import { requireInternalToken } from '../../middleware/internalAuth';

const router = Router();

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    mongodb: { status: string; latencyMs?: number; error?: string };
    redis: { status: string; latencyMs?: number; error?: string };
    redisRead: { status: string; latencyMs?: number; error?: string };
    memory: { status: string; usagePercent: number; rss: number; heap: number };
    bullmq: { status: string; queues?: string[]; error?: string };
  };
  totalMs: number;
  version: string;
}

interface BullMQHealthCheck {
  status: string;
  queues?: string[];
  error?: string;
}

/**
 * Check BullMQ queue health
 */
async function checkBullMQHealth(): Promise<BullMQHealthCheck> {
  try {
    // Try to import queue instances if available
    const queueModule = await import('../../config/bullmq-queues');
    const queues = [queueModule.notificationQueue, queueModule.paymentQueue, queueModule.analyticsQueue];
    const queueNames: string[] = [];
    let allHealthy = true;

    for (const queue of queues) {
      try {
        // Check if queue is accessible by getting queue info
        const info = await queue.getJobCounts();
        if (info) {
          queueNames.push(queue.name);
        }
      } catch (e) {
        allHealthy = false;
      }
    }

    return {
      status: allHealthy && queueNames.length > 0 ? 'ok' : 'degraded',
      queues: queueNames,
    };
  } catch (e) {
    // BullMQ not configured or import failed — treat as degraded, not critical
    return {
      status: 'degraded',
      error: e instanceof Error ? e.message : 'BullMQ not available',
    };
  }
}

/**
 * Deep health check endpoint (INTERNAL — requires X-Internal-Token)
 * Used by Kubernetes for pod readiness/liveness probes
 * ROUTE-SEC-029 FIX: Now protected — infrastructure details no longer exposed publicly.
 */
router.get('/health/deep', requireInternalToken, async (req: Request, res: Response): Promise<void> => {
  const start = Date.now();
  let healthy = true;

  const checks: HealthCheckResponse['checks'] = {
    mongodb: { status: 'unknown' },
    redis: { status: 'unknown' },
    redisRead: { status: 'unknown' },
    memory: { status: 'unknown', usagePercent: 0, rss: 0, heap: 0 },
    bullmq: { status: 'unknown' },
  };

  // MongoDB health check
  try {
    const dbStart = Date.now();
    await mongoose.connection.db?.admin().ping();
    checks.mongodb = { status: 'ok', latencyMs: Date.now() - dbStart };
  } catch (e: any) {
    checks.mongodb = { status: 'fail', error: e.message };
    healthy = false;
  }

  // Redis write connection health check
  try {
    const redisStart = Date.now();
    await getRedis().ping();
    checks.redis = { status: 'ok', latencyMs: Date.now() - redisStart };
  } catch (e: any) {
    checks.redis = { status: 'fail', error: e.message };
    healthy = false;
  }

  // Redis read connection health check
  try {
    const redisReadStart = Date.now();
    await getRedisRead().ping();
    checks.redisRead = { status: 'ok', latencyMs: Date.now() - redisReadStart };
  } catch (e: any) {
    checks.redisRead = { status: 'fail', error: e.message };
    // Note: If read replica is down, we still consider system healthy (degraded mode)
  }

  // Memory health check
  try {
    const memUsage = process.memoryUsage();
    const totalMemory = require('os').totalmem();
    const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    const rssPercent = (memUsage.rss / totalMemory) * 100;

    checks.memory = {
      status: heapUsedPercent > 85 ? 'warning' : 'ok',
      usagePercent: Math.round(rssPercent),
      rss: memUsage.rss,
      heap: memUsage.heapUsed,
    };

    if (heapUsedPercent > 90) {
      healthy = false;
      logger.warn('Memory usage critical: heap at ' + heapUsedPercent + '%');
    }
  } catch (e) {
    checks.memory = { status: 'error', usagePercent: 0, rss: 0, heap: 0 };
  }

  // BullMQ health check
  try {
    const bullmqHealth = await checkBullMQHealth();
    checks.bullmq = bullmqHealth;
    // BullMQ degradation doesn't mark system as unhealthy (optional infrastructure)
  } catch (e) {
    checks.bullmq = { status: 'error', error: e instanceof Error ? e.message : 'Unknown error' };
  }

  const response: HealthCheckResponse = {
    status: healthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
    totalMs: Date.now() - start,
    version: process.env.VERSION || 'unknown',
  };

  // Return appropriate status code
  const statusCode = healthy ? 200 : 503;
  res.status(statusCode).json(response);
});

/**
 * Quick health check endpoint (faster, minimal checks) — PUBLIC
 * Used by load balancers for fast health probes.
 * ROUTE-SEC-029 FIX: Only returns 'ok'/'fail' — no infrastructure details.
 */
router.get('/health/quick', async (req: Request, res: Response): Promise<void> => {
  try {
    // Only check database and Redis write
    const [dbCheck, redisCheck] = await Promise.allSettled([mongoose.connection.db?.admin().ping(), getRedis().ping()]);

    const healthy = dbCheck.status === 'fulfilled' && redisCheck.status === 'fulfilled';

    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'ok' : 'fail',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'fail',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Database readiness check (detailed MongoDB stats) — INTERNAL
 */
router.get('/health/db', requireInternalToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const connection = mongoose.connection;
    const dbStats = await connection.db?.stats();

    res.json({
      status: connection.readyState === 1 ? 'connected' : 'disconnected',
      readyState: connection.readyState,
      host: connection.host,
      port: connection.port,
      database: connection.name,
      stats: {
        collections: dbStats?.collections,
        indexes: dbStats?.indexes,
        dataSize: dbStats?.dataSize,
        indexes_size: dbStats?.indexes_size,
        avgObjSize: dbStats?.avgObjSize,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Redis readiness check (detailed Redis stats) — INTERNAL
 */
router.get('/health/redis', requireInternalToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const redis = getRedis();
    const redisRead = getRedisRead();

    const [writeInfo, readInfo, writeHealth, readHealth] = await Promise.allSettled([
      redis.info(),
      redisRead.info(),
      checkRedisHealth(),
      Promise.resolve(true),
    ]);

    const response = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      write: {
        status: writeInfo.status === 'fulfilled' ? 'ok' : 'error',
        latencyMs: writeHealth.status === 'fulfilled' ? (writeHealth.value as any).latencyMs : null,
      },
      read: {
        status: readInfo.status === 'fulfilled' ? 'ok' : 'error',
        latencyMs: readHealth.status === 'fulfilled' ? (readHealth.value as any).latencyMs : null,
      },
    };

    res.json(response);
  } catch (error) {
    res.status(503).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Public health check — unauthenticated minimal status for external monitoring.
 * ROUTE-SEC-029 FIX: Returns only 'ok'/'degraded'/'unhealthy' with no internal details.
 */
router.get('/health/public', async (req: Request, res: Response): Promise<void> => {
  try {
    const [dbCheck, redisCheck] = await Promise.allSettled([mongoose.connection.db?.admin().ping(), getRedis().ping()]);

    const healthy = dbCheck.status === 'fulfilled' && redisCheck.status === 'fulfilled';
    const statusCode = healthy ? 200 : 503;

    res.status(statusCode).json({
      status: healthy ? 'ok' : 'unhealthy',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
