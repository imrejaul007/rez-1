/**
 * config/middleware.ts — Middleware setup (cors, helmet, compression, etc.)
 * Extracted from server.ts for maintainability.
 */
import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import path from 'path';
import mongoSanitize from 'express-mongo-sanitize';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';

import { logger, requestLogger, correlationIdMiddleware } from './logger';
import { initSentry, sentryRequestHandler, sentryTracingHandler } from './sentry';
import { setCsrfToken } from '../middleware/csrf';
import { metricsMiddleware, metricsEndpoint } from './prometheus';
import { generalLimiter } from '../middleware/rateLimiter';
import { ipBlocker } from '../middleware/ipBlocker';
import { handleStripeWebhook, handleWebhook as handleRazorpayWebhook } from '../controllers/paymentController';

// ── CORS ──

export const getAllowedOrigins = (): string[] => {
  // Production: CORS_ORIGIN env var is REQUIRED — explicit whitelist only
  if (process.env.CORS_ORIGIN) {
    return process.env.CORS_ORIGIN.split(',').map(origin => origin.trim());
  }

  // Collect env-configured origins
  const origins: string[] = [];
  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL);
  }
  if (process.env.MERCHANT_FRONTEND_URL) {
    origins.push(process.env.MERCHANT_FRONTEND_URL);
  }
  if (process.env.ADMIN_FRONTEND_URL) {
    origins.push(process.env.ADMIN_FRONTEND_URL);
  }

  // Only add localhost in development (explicit check for 'development')
  if (process.env.NODE_ENV === 'development') {
    origins.push(
      'http://localhost:3000',
      'http://localhost:19006',
      'http://localhost:8081',
      'http://localhost:8082',
      'http://localhost:8083',
      'http://localhost:19000',
      'http://127.0.0.1:19006',
      'http://127.0.0.1:19000'
    );
  }

  if (origins.length === 0) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[CORS] CORS_ORIGIN environment variable is not set. ' +
        'The server cannot start in production without it. ' +
        'Set CORS_ORIGIN to your frontend domain (e.g. https://app.rezapp.com).'
      );
    }
    logger.warn('[CORS] No origins configured. Dev fallback: localhost:3000 only.');
    return ['http://localhost:3000'];
  }

  return origins;
};

// ── Setup all middleware on the app ──

export function setupMiddleware(app: Express): void {
  // Trust proxy (for deployment behind reverse proxy)
  app.set('trust proxy', 1);

  // Initialize Sentry (must be first)
  initSentry(app);
  if (process.env.SENTRY_DSN) {
    app.use(sentryRequestHandler);
    app.use(sentryTracingHandler);
  }

  // Correlation ID middleware (early for tracking)
  app.use(correlationIdMiddleware);

  // Security middleware - Enhanced configuration
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // 'unsafe-inline' is needed for inline styles from React Native Web / CSS-in-JS
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        // Restrict to known CDN domains instead of blanket https:
        imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "https://via.placeholder.com", "https://*.amazonaws.com"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    frameguard: { action: 'deny' },
    hidePoweredBy: true
  }));

  // CORS configuration
  const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      const allowedOrigins = getAllowedOrigins();

      // No Origin: browsers omit it for same-origin; mobile/server clients use Authorization.
      // Mutation safety is enforced by the middleware registered immediately after CORS.
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn(`[CORS] Blocked request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token', 'X-Rez-Region', 'X-Device-OS', 'X-Device-Fingerprint', 'X-Rez-Signature', 'X-Provider-Name', 'Idempotency-Key', 'X-App-Version', 'X-Correlation-ID', 'X-Request-ID'],
    exposedHeaders: ['X-CSRF-Token'],
    credentials: true,
    optionsSuccessStatus: 200
  };

  app.use(cors(corsOptions));

  // Mutation requests must have either Origin (browser) or Authorization (mobile/API)
  // This prevents CSRF from non-browser contexts that omit the Origin header
  app.use((req, res, next) => {
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
    const hasOrigin = !!req.headers.origin;
    const hasAuth = !!req.headers.authorization;
    const isHealthCheck = req.path === '/health' || req.path === '/api/health';

    if (isMutation && !hasOrigin && !hasAuth && !isHealthCheck) {
      return res.status(403).json({ success: false, message: 'Origin or authorization required' });
    }
    next();
  });

  // IP Blocker — blocks IPs flagged for suspicious activity (Redis-backed)
  app.use(ipBlocker);

  // ── WEBHOOK RAW BODY ROUTES ──
  // Mount webhook routes BEFORE the JSON body parser so they receive the raw Buffer.
  app.post('/api/payment/stripe-webhook',
    express.raw({ type: 'application/json' }),
    handleStripeWebhook as any
  );

  app.post('/api/payment/webhook',
    express.raw({ type: 'application/json' }),
    handleRazorpayWebhook as any
  );

  // Body parsing middleware — selective limits to prevent memory exhaustion
  const UPLOAD_PATHS = [
    '/api/bills/upload',
    '/api/products/import',
    '/api/merchant/products/bulk',
    '/api/ugc/upload',
    '/api/merchant/uploads',
  ];

  app.use((req: any, res: any, next: any) => {
    // Upload routes get 10MB; everything else gets 1MB.
    // Phase 6.24: bumped non-upload limit from 50KB to 1MB. The 50KB cap was
    // originally for dev to catch accidental huge payloads, but it was too
    // aggressive for production — a typical /api/orders POST with multiple
    // line items + addresses + metadata is 50-200KB. 1MB still catches
    // payload-abuse attacks while letting legitimate requests through.
    const isUpload = UPLOAD_PATHS.some((p: string) => req.path.startsWith(p));
    const limit = isUpload ? '10mb' : '1mb';

    express.json({
      limit,
      // Capture the exact request bytes so webhook handlers can compute HMAC
      // against what the sender actually signed (not a re-serialization, which
      // would change key order/whitespace and break signature verification).
      verify: (req: any, _res: any, buf: Buffer) => {
        if (buf && buf.length > 0) req.rawBody = buf.toString('utf8');
      },
    })(req, res, (err: any) => {
      if (err) {
        if (err.type === 'entity.too.large') {
          return res.status(413).json({
            success: false,
            message: `Request body too large. Maximum size is ${limit}.`,
          });
        }
        if (err instanceof SyntaxError && 'body' in err) {
          req.body = {};
          return next();
        }
        return next(err);
      }
      next();
    });
  });

  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Global request sanitization — XSS + NoSQL injection prevention
  app.use((req, res, next) => {
    if (req.body) mongoSanitize.sanitize(req.body, { replaceWith: '_' });
    if (req.params) mongoSanitize.sanitize(req.params, { replaceWith: '_' });
    // req.query is read-only in Express 5+; sanitize a copy and merge back
    if (req.query && typeof req.query === 'object') {
      const sanitized = mongoSanitize.sanitize({ ...req.query }, { replaceWith: '_' });
      Object.keys(req.query).forEach(k => { (req.query as any)[k] = (sanitized as any)[k]; });
    }
    next();
  });
  logger.info('Request sanitization middleware enabled (mongo-sanitize)');

  // Cookie parser middleware (kept for downstream libs that may need to read
  // cookies; we do not currently use cookie-based auth).
  app.use(cookieParser());

  // CSRF Protection Middleware.
  // SECURITY: this API uses Bearer-token auth (Authorization header), not
  // cookies — so traditional CSRF is not applicable. We still expose a
  // CSRF token for any future cookie-based browser clients to opt into,
  // but only when ENABLE_CSRF=true. Otherwise we don't issue tokens (they
  // were dead weight and gave the false impression of protection).
  if (process.env.ENABLE_CSRF === 'true') {
    app.use(setCsrfToken);
    logger.info('CSRF protection middleware enabled (ENABLE_CSRF=true)');
  } else {
    logger.info('CSRF middleware disabled (Bearer-token auth; set ENABLE_CSRF=true to enable)');
  }

  // ── Compression Configuration ────────────────────────────────────────────────
  // PERFORMANCE: Compression is handled at the Nginx layer (API Gateway), NOT here.
  //
  // Why disabled at Express level:
  // 1. Avoids double-compression: nginx compresses once at the edge, Express compressing
  //    again wastes CPU with zero bandwidth benefit (compressed data can't be further compressed).
  // 2. Better performance: nginx handles compression more efficiently (C code vs JS).
  // 3. Single point of control: Compression settings are managed in nginx.conf.
  // 4. Authenticated requests: nginx skips compression for auth (BREACH protection),
  //    so Express shouldn't re-add it.
  //
  // Brotli support: nginx handles Brotli negotiation and fallback to gzip automatically.
  // Express compression package only supports gzip.
  //
  // If deploying WITHOUT nginx (direct to client/CDN), re-enable this:
  //   app.use(compression({ threshold: 1024, level: 6 }));
  // Compression is disabled - handled at nginx layer to avoid double-compression

  // Prometheus metrics middleware - tracks all HTTP requests
  app.use(metricsMiddleware);

  // Serve uploaded files statically
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Winston request logging middleware
  if (process.env.NODE_ENV !== 'test') {
    app.use(requestLogger);
  }

  // Morgan for additional development logging (optional)
  if (process.env.NODE_ENV === 'development' && process.env.ENABLE_MORGAN === 'true') {
    app.use(morgan('dev'));
  }

  // Rate limiting - Production security
  app.use(generalLimiter);

  // Swagger UI Documentation — dev/staging only
  if (process.env.NODE_ENV !== 'production') {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'REZ API Documentation',
      customfavIcon: '/favicon.ico'
    }));

    app.get('/api-docs.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerSpec);
    });

    logger.info('Swagger documentation available at /api-docs');
  } else {
    app.use('/api-docs', (_req, res) => res.status(404).json({ message: 'Not found' }));
    app.get('/api-docs.json', (_req, res) => res.status(404).json({ message: 'Not found' }));
  }

  // Prometheus metrics endpoint - for scraping by Prometheus server
  app.get('/metrics', metricsEndpoint);
}
