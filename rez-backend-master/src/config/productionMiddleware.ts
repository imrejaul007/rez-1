// @ts-nocheck
/**
 * Production Middleware Template
 *
 * This file serves as a REFERENCE IMPLEMENTATION showing how to integrate
 * @rez/shared production utilities into a new service.
 *
 * NOTE: REZBackend (rezbackend/rez-backend-master) already has all its own
 * implementations for middleware, error handling, rate limiting, health checks,
 * and logging. This file is NOT currently used in rezbackend's server.ts.
 *
 * For NEW SERVICES (e.g., rez-merchant-service, rez-order-service), use this
 * as a template to add @rez/shared utilities:
 *
 * ```typescript
 * import { integrateRezSharedUtilities } from '@rez/shared/middleware';
 *
 * const app = express();
 * setupMiddleware(app); // your existing middleware
 * integrateRezSharedUtilities(app, { redis, mongoose });
 * registerRoutes(app);
 * ```
 *
 * See docs/INTEGRATION_QUICK_START.md for detailed examples.
 *
 * TF-12 / SD-08 fix: path aliases removed from tsconfig.json. New services
 * should install @rez/shared as a proper npm dependency and import from it
 * using the npm package name (not a local path alias).
 */

// EXAMPLE IMPLEMENTATION (uncomment to use in other services):
/*
import express, { Express } from 'express';
import mongoose from 'mongoose';
import { Redis } from 'ioredis';

// Import @rez/shared utilities (install via: npm install @rez/shared)
import {
  requestLogger,
  attachLogger,
  sanitizeInputs,
  idempotencyMiddleware,
  attachHealthChecks,
  globalErrorHandler,
} from '@rez/shared/middleware';

export interface RezSharedOptions {
  redis: Redis;
  mongoose: typeof mongoose;
}

export function integrateRezSharedUtilities(
  app: Express,
  options: RezSharedOptions
): void {
  const { redis, mongoose: mongooseInstance } = options;

  // Request logging (must be first)
  app.use(requestLogger);
  app.use(attachLogger);

  // Body parsing.
  // E6: Capture the raw body string alongside the parsed JSON so webhook
  // handlers (travel OTA, etc.) can compute HMAC against the exact bytes
  // the sender signed. Using JSON.stringify(req.body) for HMAC is
  // semantically broken because Express re-serialization loses whitespace
  // and key order — signatures effectively never match for non-trivial
  // payloads. Dedicated webhook paths that need a different content-type
  // (e.g., Razorpay via express.raw()) still mount their own parser
  // earlier in the chain.
  app.use(
    express.json({
      limit: '10mb',
      verify: (req: any, _res, buf) => {
        // buf is already the raw bytes; cache as string for HMAC usage.
        if (buf && buf.length > 0) req.rawBody = buf.toString('utf8');
      },
    }),
  );
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Input sanitization (XSS prevention)
  app.use(sanitizeInputs);

  // Idempotency (duplicate detection)
  app.use(idempotencyMiddleware(redis));

  // Health checks (Kubernetes probes)
  attachHealthChecks(app, { redis, mongoose: mongooseInstance });

  console.log('[RezShared] All utilities integrated');
}

// NOTE: globalErrorHandler MUST be added AFTER all routes:
// app.use(globalErrorHandler);
*/
