// MUST be the first import — OpenTelemetry tracing must initialize before any other module
import './config/tracing';

import 'dotenv/config';
import 'express-async-errors';
import * as Sentry from '@sentry/node';

process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'rez-auth-service';

// Prometheus metrics - must be imported after SERVICE_NAME is set
import { metricsMiddleware, getMetricsHandler } from './metrics';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'production',
    serverName: process.env.SERVICE_NAME,
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
  });
}

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import { connectMongoDB, disconnectMongoDB } from './config/mongodb';
import { redis } from './config/redis';
import { startHealthServer } from './health';
import { closeQueue } from './services/otpService';
import authRoutes from './routes/authRoutes';
import mfaRoutes from './routes/mfaRoutes';
import internalRoutes from './routes/internalRoutes';
import profileRoutes from './routes/profile.routes';
import internalProfileRoutes from './routes/internalProfile.routes';
// Phase 6.24: Mount the OAuth2 partner admin API. Gated by
// `requireInternalToken` so it can only be reached from sibling services
// (the monolith) with a valid `x-internal-token`. Was previously defined
// but not mounted, leaving partner registration as a manual PR.
import oauthAdminRoutes from './routes/admin/oauthAdmin';
import oauthPartnerRoutes from './routes/oauthPartnerRoutes';
import { logger } from './config/logger';
import { tracingMiddleware } from './middleware/tracing';
import { errorResponse, errors } from './utils/response';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

function validateEnv(): void {
  const required = [
    'MONGODB_URI',
    'REDIS_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'JWT_ADMIN_SECRET',
    'JWT_MERCHANT_SECRET',
    'OTP_HMAC_SECRET',
  ];
  // CRITICAL FIX (AUTH-ENV-001): Add OTP_TOTP_ENCRYPTION_KEY to required vars.
  // Previously the TOTP encryption key was optional, causing MFA setup to fail at
  // runtime if not set, giving an attacker a window to exploit the race condition.
  // Now we fail-fast at startup if the key is missing.
  if (!process.env.OTP_TOTP_ENCRYPTION_KEY) {
    logger.error('[FATAL] OTP_TOTP_ENCRYPTION_KEY is not set. MFA will not work without this key.');
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    logger.warn('[DEV] Proceeding without OTP_TOTP_ENCRYPTION_KEY - MFA will fail if used');
  }
  const missing = required.filter((k) => !process.env[k]);
  // Accept either the scoped map or the legacy shared token
  if (!process.env.INTERNAL_SERVICE_TOKENS_JSON && !process.env.INTERNAL_SERVICE_TOKEN) {
    missing.push('INTERNAL_SERVICE_TOKENS_JSON or INTERNAL_SERVICE_TOKEN');
  }
  // Phase 6.24: MFA session JWT must use a separate secret in production so a
  // leaked consumer JWT_SECRET cannot be replayed as an MFA session token.
  // In dev we still allow the fallback to JWT_SECRET so the dev stack starts
  // without operators having to manage a 4th secret.
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_MFA_SESSION_SECRET) {
    missing.push('JWT_MFA_SESSION_SECRET (required in production)');
  }
  if (missing.length > 0) {
    logger.error(`[FATAL] Missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  validateEnv();
  logger.info('Starting rez-auth-service...');

  await connectMongoDB();

  const app = express();
  app.set('trust proxy', 1); // P1: Trust nginx/Render LB X-Forwarded-For so req.ip reflects real client IP
  if (process.env.SENTRY_DSN) {
  // Sentry.Handlers removed in v8
}
  app.use(helmet());
  # ── Compression Configuration ────────────────────────────────────────────────
  # PERFORMANCE: Compression is handled at the Nginx layer (API Gateway), NOT here.
  #
  # Why disabled at Express level:
  # 1. Avoids double-compression: nginx compresses once at the edge, Express compressing
  #    again wastes CPU with zero bandwidth benefit.
  # 2. Better performance: nginx handles compression more efficiently (C code vs JS).
  # 3. Single point of control: Compression settings are managed in nginx.conf.
  #
  # Brotli support: nginx handles Brotli negotiation and fallback to gzip automatically.
  # Express compression package only supports gzip.
  #
  # If deploying WITHOUT nginx (direct to client/CDN), re-enable this:
  // Compression is disabled - handled at nginx layer to avoid double-compression

  // SECURITY FIX: Validate CORS origins to prevent wildcard misconfiguration
  const rawOrigins = process.env.CORS_ORIGIN || 'https://rez.money,https://www.rez.money,https://admin.rez.money';
  const allowedOrigins = rawOrigins.split(',').map(s => s.trim()).filter(Boolean);

  // SECURITY FIX: Reject wildcards in CORS origins (prevents accidentally allowing all origins)
  for (const origin of allowedOrigins) {
    if (origin === '*' || origin.includes('*')) {
      logger.error(`[FATAL] CORS_ORIGIN contains wildcard: "${origin}". This is insecure. Use specific origins only.`);
      process.exit(1);
    }
  }

  app.use(cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (server-to-server, curl, health checks)
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  }));
  app.use(express.json({ limit: '256kb' }));
  app.use(mongoSanitize());

  // Prometheus metrics middleware — before routes
  app.use(metricsMiddleware);

  // W3C traceparent propagation — must run before routes
  app.use(tracingMiddleware);

  // Health check on main port — required by Render's healthCheckPath.
  // Only MongoDB is critical — Redis down causes degraded (not dead) state.
  // Returning 503 makes Render stop routing ALL traffic, so we return 200
  // for degraded-Redis and only 503 for fatal (Mongo down).
  app.get('/health', (_req, res) => {
    const mongoOk = require('mongoose').connection.readyState === 1;
    const redisOk = redis.status === 'ready';
    if (!mongoOk) {
      res.status(503).json({ status: 'unhealthy', mongo: mongoOk, redis: redisOk });
      return;
    }
    res.status(200).json({ status: redisOk ? 'ok' : 'degraded', mongo: mongoOk, redis: redisOk });
  });

  // Prometheus metrics endpoint
  app.get('/metrics', getMetricsHandler);

  // Swagger UI API documentation
  // HIGH FIX (AUTH-SWAGGER-001): Gate Swagger docs behind development environment.
  // Exposing the full API surface in production is a reconnaissance gift for attackers.
  // They can learn all endpoints, parameters, and expected responses.
  // This should be disabled in production (NODE_ENV=production).
  if (process.env.NODE_ENV !== 'production') {
    const swaggerDocument = YAML.load('./docs/openapi.yaml');
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'ReZ Auth API Docs',
    }));
    app.get('/api-docs.json', (_req, res) => {
      res.json(swaggerDocument);
    });
  }

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/mfa', mfaRoutes);
  app.use('/api/v1/profile', profileRoutes);
  app.use('/internal', internalRoutes);
  app.use('/internal', internalProfileRoutes);
  app.use('/api/v1/admin/oauth', oauthAdminRoutes);
  app.use('/api/v1/oauth', oauthPartnerRoutes);
  if (process.env.SENTRY_DSN) {
  // Sentry.Handlers removed in v8
}

  // Global error handler — catches errors even when Sentry is not configured
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const requestId = res.locals?.requestId;

    if (err instanceof Error && 'code' in err) {
      // Handle AppError from rez-shared — Error may have a 'code' property
      return errorResponse(res, err as Error & { code?: string });
    }

    // Log unexpected errors
    logger.error('Unhandled error', { error: err.message, stack: err.stack, requestId });

    return errorResponse(res, errors.internalError());
  });

  const port = parseInt(process.env.PORT || '4002', 10);
  const healthPort = parseInt(process.env.HEALTH_PORT || '4102', 10);

  const server = app.listen(port, () => logger.info(`HTTP on :${port}`));
  const healthServer = startHealthServer(healthPort);

  let isShuttingDown = false;
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info(`[SHUTDOWN] ${signal} received — graceful shutdown starting`);

    // 1. Stop accepting new HTTP connections
    server.close(() => {
      logger.info('[SHUTDOWN] HTTP server closed');
    });
    healthServer.close();

    try {
      // 2. Close OTP queue
      await closeQueue();
      logger.info('[SHUTDOWN] OTP queue closed');

      // 3. Close Redis
      await redis.quit().catch((err) => logger.error('[SHUTDOWN] Redis quit failed', { error: err?.message }));
      logger.info('[SHUTDOWN] Redis disconnected');

      // 4. Close MongoDB
      await disconnectMongoDB();
      logger.info('[SHUTDOWN] MongoDB disconnected');

      logger.info('[SHUTDOWN] Graceful shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error('[SHUTDOWN] Error during shutdown', err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason: unknown) => {
    logger.error('Unhandled promise rejection', { reason: reason instanceof Error ? reason.message : String(reason) });
  });
  process.on('uncaughtException', (err: Error) => {
    logger.error('Uncaught exception', { error: err.message, stack: err.stack });
    process.exit(1);
  });

  logger.info('rez-auth-service ready');
}

main().catch((err) => { logger.error('[FATAL]', err); process.exit(1); });
