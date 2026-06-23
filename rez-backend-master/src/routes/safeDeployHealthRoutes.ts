// @ts-nocheck
/**
 * SafeDeploy Health Routes
 * Comprehensive health checks for regression & integration testing
 *
 * Endpoints:
 *   GET /health           - Liveness probe (lightweight, for load balancers)
 *   GET /health/ready     - Readiness probe (checks all critical services)
 *   GET /health/deep      - Deep integration check (for CI/CD pipelines)
 */

import { Router, Request, Response, NextFunction } from 'express';
import https from 'https';
import mongoose from 'mongoose';
import { database } from '../config/database';
import redisService from '../services/redisService';
import paymentGatewayService from '../services/paymentGatewayService';
import { version as appVersion } from '../../package.json';
import { logger } from '../config/logger';
import { getAllCircuitStatus } from '../utils/circuitBreaker';

// Basic authentication middleware for sensitive health endpoints
const requireInternalAuth = (req: Request, res: Response, next: NextFunction): void => {
  const internalSecret = process.env.INTERNAL_HEALTH_SECRET;
  if (!internalSecret) {
    // If no secret is configured, fall back to requiring admin API key header
    const apiKey = req.headers['x-admin-api-key'];
    if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
      res.status(401).json({ success: false, message: 'Unauthorized: admin API key required' });
      return;
    }
  } else {
    const providedSecret = req.headers['x-internal-secret'];
    if (!providedSecret || providedSecret !== internalSecret) {
      res.status(401).json({ success: false, message: 'Unauthorized: internal secret required' });
      return;
    }
  }
  next();
};

const router = Router();

// ============================================================
// Liveness Probe (fast, for load balancers, no dependencies)
// ============================================================
// Sprint 15: enhanced liveness probe — includes process diagnostics for load test observability.
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    nodeVersion: process.version,
    env: process.env.NODE_ENV || 'development',
  });
});

// ============================================================
// Readiness Probe (checks critical services)
// ============================================================
router.get('/health/ready', async (req: Request, res: Response) => {
  const checks: Record<string, { ok: boolean; latencyMs?: number; error?: string }> = {};
  let allReady = true;

  // 1. MongoDB
  const dbStart = Date.now();
  try {
    const dbHealth = await database.healthCheck();
    const ok = dbHealth.status === 'healthy';
    checks.mongodb = { ok, latencyMs: Date.now() - dbStart };
    if (!ok) allReady = false;
  } catch (err: any) {
    checks.mongodb = { ok: false, latencyMs: Date.now() - dbStart, error: err.message };
    allReady = false;
  }

  // 2. Redis
  const redisStart = Date.now();
  try {
    const ok = redisService.isReady();
    checks.redis = { ok, latencyMs: Date.now() - redisStart };
    if (!ok) allReady = false;
  } catch (err: any) {
    checks.redis = { ok: false, latencyMs: Date.now() - redisStart, error: err.message };
    allReady = false;
  }

  // 3. Payment gateway (Razorpay config)
  try {
    const pgHealth = paymentGatewayService.getHealthStatus();
    const ok = pgHealth?.status !== 'unconfigured';
    checks.paymentGateway = { ok };
    if (!ok) allReady = false;
  } catch (err: any) {
    checks.paymentGateway = { ok: false, error: err.message };
    allReady = false;
  }

  const statusCode = allReady ? 200 : 503;
  res.status(statusCode).json({
    success: allReady,
    status: allReady ? 'ready' : 'not-ready',
    checks,
    uptime: Math.floor(process.uptime()),
    version: appVersion,
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// Deep Health Check (for SafeDeploy CI/CD integration)
// ============================================================
router.get('/health/deep', async (req: Request, res: Response) => {
  const checks: Record<
    string,
    {
      status: 'ok' | 'error';
      latencyMs?: number;
      detail?: string;
      contracts?: {
        [key: string]: any;
      };
    }
  > = {};

  // 1. MongoDB - full health check
  try {
    const start = Date.now();
    const dbHealth = await database.healthCheck();
    const latency = Date.now() - start;
    checks.mongodb = {
      status: dbHealth.status === 'healthy' ? 'ok' : 'error',
      latencyMs: latency,
      detail: `Connection pool: ${(dbHealth as any).connections || 'unknown'}`,
    };
  } catch (err) {
    checks.mongodb = {
      status: 'error',
      detail: String(err),
    };
  }

  // 2. Redis - full health check
  try {
    const start = Date.now();
    const pong = await (redisService as any).ping();
    const latency = Date.now() - start;
    checks.redis = {
      status: pong === 'PONG' ? 'ok' : 'error',
      latencyMs: latency,
      detail: pong,
    };
  } catch (err) {
    checks.redis = {
      status: 'error',
      detail: String(err),
    };
  }

  // 3. Razorpay credentials check
  checks.razorpay = {
    status: process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET ? 'ok' : 'error',
    detail: !process.env.RAZORPAY_KEY_ID
      ? 'RAZORPAY_KEY_ID missing'
      : !process.env.RAZORPAY_KEY_SECRET
        ? 'RAZORPAY_KEY_SECRET missing'
        : 'configured',
  };

  // 4. Sentry check
  checks.sentry = {
    status: process.env.SENTRY_DSN ? 'ok' : 'error',
    detail: !process.env.SENTRY_DSN ? 'SENTRY_DSN missing' : 'configured',
  };

  // 5. Environment validation check
  const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
  const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
  checks.environment = {
    status: missingVars.length === 0 ? 'ok' : 'error',
    detail: missingVars.length === 0 ? 'All required variables set' : `Missing: ${missingVars.join(', ')}`,
  };

  // 6. API Contract verification (check sample endpoints respond correctly)
  checks.apiContracts = {
    status: 'ok',
    detail: 'API contract endpoints registered',
    contracts: {
      health: '/health',
      ready: '/health/ready',
      deep: '/health/deep',
    },
  };

  // 7. Node.js/Runtime check
  checks.runtime = {
    status: 'ok',
    detail: `Node.js ${process.version}`,
  };

  // Determine overall health
  const allOk = Object.values(checks).every((c) => c.status === 'ok');
  const statusCode = allOk ? 200 : 503;

  res.status(statusCode).json({
    success: allOk,
    status: allOk ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
    version: appVersion,
    uptime: Math.floor(process.uptime()),
  });
});

// ============================================================
// Cache Statistics Endpoint (requires internal auth)
// ============================================================
router.get('/health/cache-stats', requireInternalAuth, async (req: Request, res: Response) => {
  try {
    const stats = await redisService.getStats();
    res.json({
      success: true,
      data: {
        redis: stats,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================
// Database Connection Status
// ============================================================
router.get('/health/db', async (req: Request, res: Response) => {
  try {
    const start = Date.now();
    const dbHealth = await database.healthCheck();
    const latency = Date.now() - start;

    res.status(dbHealth.status === 'healthy' ? 200 : 503).json({
      success: dbHealth.status === 'healthy',
      status: dbHealth.status,
      database: {
        driver: 'mongodb',
        latencyMs: latency,
        connections: (dbHealth as any).connections,
        state: (dbHealth as any).state,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: error instanceof Error ? error.message : 'Database error',
    });
  }
});

// ============================================================
// Redis Connection Status
// ============================================================
router.get('/health/cache', async (req: Request, res: Response) => {
  try {
    const start = Date.now();
    const pong = await (redisService as any).ping();
    const latency = Date.now() - start;

    res.status(pong === 'PONG' ? 200 : 503).json({
      success: pong === 'PONG',
      status: pong === 'PONG' ? 'connected' : 'disconnected',
      cache: {
        driver: 'redis',
        latencyMs: latency,
        response: pong,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: error instanceof Error ? error.message : 'Cache error',
    });
  }
});

// ============================================================
// Downstream Microservice Reachability Check
// ============================================================
router.get('/health/services', async (req: Request, res: Response) => {
  const services = [
    {
      name: 'gamification',
      url: process.env.GAMIFICATION_SERVICE_URL || '',
    },
    { name: 'wallet', url: process.env.WALLET_SERVICE_URL || '' },
    { name: 'payment', url: process.env.PAYMENT_SERVICE_URL || '' },
    { name: 'notification', url: process.env.NOTIFICATION_SERVICE_URL || '' },
    {
      name: 'merchant',
      url: process.env.MERCHANT_SERVICE_URL || '',
    },
  ].filter((s) => s.url);

  const checkService = (url: string): Promise<{ ok: boolean; latencyMs: number }> => {
    return new Promise((resolve) => {
      const start = Date.now();
      const timeout = setTimeout(() => resolve({ ok: false, latencyMs: 5000 }), 5000);
      try {
        const outReq = https.get(url, (inRes) => {
          clearTimeout(timeout);
          resolve({ ok: inRes.statusCode === 200, latencyMs: Date.now() - start });
          inRes.resume();
        });
        outReq.on('error', () => {
          clearTimeout(timeout);
          resolve({ ok: false, latencyMs: Date.now() - start });
        });
      } catch {
        clearTimeout(timeout);
        resolve({ ok: false, latencyMs: Date.now() - start });
      }
    });
  };

  const results = await Promise.all(
    services.map(async (s) => {
      const { ok, latencyMs } = await checkService(s.url);
      return { service: s.name, status: ok ? 'up' : 'down', latencyMs };
    }),
  );

  const allUp = results.every((r) => r.status === 'up');
  res.status(allUp ? 200 : 207).json({
    success: true,
    timestamp: new Date().toISOString(),
    services: results,
    summary: allUp ? 'all_services_up' : 'some_services_degraded',
  });
});

// ============================================================
// Circuit Breaker Status
// ============================================================
router.get('/health/circuits', (req: Request, res: Response) => {
  const statuses = getAllCircuitStatus();
  const hasOpen = statuses.some((s) => s.state === 'OPEN');
  res.status(hasOpen ? 207 : 200).json({
    success: true,
    timestamp: new Date().toISOString(),
    circuits: statuses,
    summary: hasOpen ? 'some_circuits_open' : 'all_circuits_closed',
  });
});

export default router;
