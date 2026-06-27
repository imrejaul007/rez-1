/**
 * server.ts — Application entry point
 *
 * Split into:
 *   - config/middleware.ts   — middleware setup (cors, helmet, compression, etc.)
 *   - config/routes.ts       — route registration (all app.use() calls)
 *   - config/socketSetup.ts  — Socket.IO setup and event handlers
 *   - config/cronJobs.ts     — cron job initialization
 */
import express from 'express';
import 'dotenv/config'; // Phase 4 smoke test fix: dotenv must load BEFORE any other import reads process.env
import dotenv from 'dotenv';
import { createServer } from 'http';

// Load environment variables
dotenv.config();

// Import database connection
import { connectDatabase, database } from './config/database';

// Import mongoose for readiness probe
import mongoose from 'mongoose';

// Import Redis service
import redisService from './services/redisService';

// Import payment gateway for health check
import paymentGatewayService from './services/paymentGatewayService';

// App version from package.json
import { version as appVersion } from '../package.json';

// Import environment validation
import { validateEnvironment } from './config/validateEnv';

// Import utilities
import { validateCloudinaryConfig } from './utils/cloudinaryUtils';

// Import logger
import { logger } from './config/logger';
import { validateCorsConfiguration } from './config/corsValidator';

// Override console methods in production to route through structured logger
if (process.env.NODE_ENV === 'production') {
  console.log = (...args: any[]) => logger.info(args.map(String).join(' '));
  console.error = (...args: any[]) => logger.error(args.map(String).join(' '));
  console.warn = (...args: any[]) => logger.warn(args.map(String).join(' '));
  console.debug = (...args: any[]) => logger.debug(args.map(String).join(' '));
}

// Import export worker (initializes automatically when imported)
import './workers/exportWorker';

// Import modular setup functions
import { setupMiddleware, getAllowedOrigins } from './config/middleware';
import { registerRoutes } from './config/routes';
import { setupSocket, attachSocketRedisAdapter } from './config/socketSetup';
import { initializeCronJobs } from './config/cronJobs';
import { ScheduledJobService } from './services/ScheduledJobService';

// ── Create Express application ──
const app = express();
const PORT = process.env.PORT || 5001;
const API_PREFIX = process.env.API_PREFIX || '/api';

// ── Setup middleware ──
setupMiddleware(app);

// ── Health check Mongo ping cache (Phase 5.2) ──
// Render/UptimeRobot may hammer /health. Mongo pings are expensive at high QPS.
// Cache the connection status for 5s; other fields (uptime, timestamp) stay live.
const HEALTH_CHECK_TTL_MS = 5000;
let healthCheckCache: { db: string; expiresAt: number } | null = null;

async function getDbHealthCached(): Promise<string> {
  const now = Date.now();
  if (healthCheckCache && healthCheckCache.expiresAt > now) {
    return healthCheckCache.db;
  }
  let db = 'disconnected';
  try {
    const dbHealth = await database.healthCheck();
    db = dbHealth.status === 'healthy' ? 'connected' : 'disconnected';
  } catch {
    db = 'error';
  }
  healthCheckCache = { db, expiresAt: now + HEALTH_CHECK_TTL_MS };
  return db;
}

// ── Health check endpoint — lean, UptimeRobot-friendly ──
app.get('/health', async (_req, res) => {
  try {
    const db = await getDbHealthCached();

    let redis = 'disconnected';
    try {
      redis = redisService.isReady() ? 'connected' : 'disconnected';
    } catch {
      redis = 'error';
    }

    const payments = paymentGatewayService.getHealthStatus();
    const allHealthy = db === 'connected' && redis === 'connected';

    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'ok' : 'degraded',
      db,
      redis,
      payments,
      uptime: Math.floor(process.uptime()),
      version: appVersion,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Cache stats endpoint
app.get('/health/cache-stats', async (req, res) => {
  try {
    const stats = await redisService.getStats();
    res.json({ success: true, data: { redis: stats } });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Readiness probe — for Kubernetes-style deploys
app.get('/health/ready', (_req, res) => {
  const mongoReady = mongoose.connection.readyState === 1;
  const redisReady = redisService.isReady();
  const ready = mongoReady && redisReady;
  res.status(ready ? 200 : 503).json({
    ready,
    mongo: mongoReady,
    redis: redisReady,
    timestamp: new Date().toISOString(),
  });
});

// Simple test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Test endpoint working' });
});

// ── API versioning ──

// Attach API version header to every response
app.use((req, res, next) => {
  res.setHeader('x-api-version', '1.0.0');
  next();
});

// Version discovery endpoint — clients can check compatibility before calling APIs
app.get('/api/version', (_req, res) => {
  res.json({
    version: '1.0.0',
    minSupportedClientVersion: '1.0.0',
    deprecatedVersions: [],
  });
});

// CSRF Token endpoint
app.get('/api/csrf-token', (req, res) => {
  try {
    const csrfToken = res.getHeader('x-csrf-token');
    if (!csrfToken) {
      return res.status(503).json({
        success: false,
        message: 'CSRF protection is not enabled.',
      });
    }
    res.json({
      success: true,
      message: 'CSRF token generated successfully',
      token: csrfToken,
      usage: {
        header: 'Include this token in X-CSRF-Token header for POST/PUT/DELETE requests',
        cookie: 'Token is also set in csrf-token cookie automatically'
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate CSRF token',
      error: error.message
    });
  }
});

// API info endpoint
app.get('/api-info', (req, res) => {
  res.json({
    name: 'REZ App Backend API',
    version: '1.0.0',
    description: 'Backend API for REZ - E-commerce, Rewards & Social Platform',
    status: 'Running',
    endpoints: {
      auth: `${API_PREFIX}/user/auth`,
      products: `${API_PREFIX}/products`,
      categories: `${API_PREFIX}/categories`,
      cart: `${API_PREFIX}/cart`,
      stores: `${API_PREFIX}/stores`,
      orders: `${API_PREFIX}/orders`,
      health: '/health',
    },
  });
});

// ── Create HTTP server & Socket.IO ──
const server = createServer(app);
const io = setupSocket(server);

// NOTE: The pre-routes error handler that used to live here was removed
// (Phase 6.24 cleanup). It shadowed the real `globalErrorHandler` registered
// post-routes in config/routes.ts and unconditionally logged `err.stack` even
// in production. Express 4-argument error middleware registered before routes
// only catches synchronous throws during middleware execution, not errors
// from route handlers — the post-routes globalErrorHandler is the only one
// that matters.

// ── Register all routes ──
registerRoutes(app);

// ── Start server function ──
async function startServer() {
  try {
    // Validate environment variables first (fail fast if invalid)
    logger.info('Validating environment configuration...');
    try {
      validateEnvironment();
      logger.info('Environment validation passed');
    } catch (error) {
      logger.error('Environment validation failed:', error);
      process.exit(1);
    }

    // Validate CORS configuration (fail fast in production if wildcard or missing)
    try {
      validateCorsConfiguration();
    } catch (error) {
      logger.error('CORS configuration validation failed:', error);
      process.exit(1);
    }

    // Start listening on port FIRST so Render/hosting detects the port immediately
    server.listen(Number(PORT), '0.0.0.0', () => {
      logger.info(`Server listening on port ${PORT} (initializing services...)`);
    });

    // Connect to database
    logger.info('Connecting to database...');
    await connectDatabase();

    // Connect to Redis
    logger.info('Connecting to Redis...');
    await redisService.connect();
    logger.info(redisService.isReady() ? 'Redis connected' : 'Redis unavailable - app will continue without caching');

    // Attach Socket.IO Redis adapter (needs Redis to be connected first)
    await attachSocketRedisAdapter(io);

    // NOTE: QueueService is NOT initialized here — each Bull queue opens 3 Redis
    // connections, and 8 queues would add 24 connections to the API server process,
    // exceeding free-tier Redis client limits. The worker process (worker.ts) handles
    // all queue processing. Enqueue methods (e.g., QueueService.enqueueCashback) use
    // synchronous fallback when the queue is not initialized.

    // Validate Cloudinary configuration
    const cloudinaryConfigured = validateCloudinaryConfig();
    if (!cloudinaryConfigured) {
      logger.warn('Cloudinary not configured. Bill upload features will not work.');
    }

    // Initialize cron jobs (only on the dedicated worker process).
    // The actual gate is inside initializeCronJobs() — it checks ENABLE_CRON.
    // We just log the intent here for ops visibility.
    if (process.env.ENABLE_CRON === 'true') {
      logger.info('ENABLE_CRON=true — initializing cron jobs (worker process mode)');
      await initializeCronJobs();
    } else {
      logger.info(
        'ENABLE_CRON not set — skipping cron jobs in this process. ' +
        'Crons should run on the rez-worker service (set ENABLE_CRON=true there).'
      );
    }

    // All services initialized
    logger.info(`All services initialized successfully`);
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Health Check: http://localhost:${PORT}/health`);

    // ── Graceful shutdown handling ──
    let isShuttingDown = false;
    const shutdown = async (signal: string) => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      logger.info(`Received ${signal}. Graceful shutdown...`);

      // Force-exit safety net (nodemon sends SIGINT and expects fast exit)
      const forceTimer = setTimeout(() => {
        logger.info('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 5000);
      forceTimer.unref(); // Don't keep process alive just for the timer

      try {
        // Close HTTP server (stop accepting new connections)
        server.close(() => {});

        // Close all services in parallel — don't wait for HTTP drain
        await Promise.allSettled([
          ScheduledJobService.shutdown().catch(() => {}),
          import('./config/socketAdapter').then(m => m.disconnectRedisAdapter()).catch(() => {}),
          redisService.disconnect().catch(() => {}),
          database.disconnect().catch(() => {}),
        ]);

        logger.info('All services disconnected');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
      logger.error('Unhandled Promise Rejection', {
        reason: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
      });
    });

    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception - shutting down', {
        message: error.message,
        stack: error.stack,
      });
      shutdown('uncaughtException');
    });

    return server;

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application if this file is run directly
if (require.main === module) {
  startServer();
}

export { app, startServer };
