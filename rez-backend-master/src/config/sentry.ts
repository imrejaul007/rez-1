import * as Sentry from '@sentry/node';
import { Express } from 'express';
import { logger } from './logger';
import path from 'path';
import fs from 'fs';

/**
 * Sentry Configuration & Initialization
 * Provides comprehensive error tracking, performance monitoring, and alerting
 */

// Helper to get package version safely
function getPackageVersion(): string {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      return packageJson.version || '1.0.0';
    }
  } catch (error) {
    logger.warn('Failed to read package.json version:', error);
  }
  return '1.0.0';
}

// ============================================================================
// SENTRY INITIALIZATION
// ============================================================================

export const initSentry = (app: Express) => {
  if (!process.env.SENTRY_DSN) {
    logger.warn('Sentry DSN not configured, error tracking disabled');
    return;
  }

  try {
    Sentry.init({
      // Core Configuration
      dsn: process.env.SENTRY_DSN,
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
      release: process.env.SENTRY_RELEASE || getPackageVersion(),

      // Performance & Tracing
      tracesSampleRate: getTraceSampleRate(),
      profilesSampleRate: getProfilesSampleRate(),

      // Integrations for enhanced tracking
      integrations: [
        // HTTP/HTTPS integration for tracking external API calls
        new Sentry.Integrations.Http({ tracing: true }),
        // Express integration for automatic request/response tracking
        new Sentry.Integrations.Express({
          app
        }),
        // Console integration to capture console errors/logs
        new Sentry.Integrations.Console({
          levels: ['error', 'warn']
        }),
        // Global handlers for uncaught exceptions
        new Sentry.Integrations.OnUncaughtException(),
        new Sentry.Integrations.OnUnhandledRejection({ mode: 'strict' })
      ],

      // Ignore certain errors
      ignoreErrors: [
        // Browser extensions
        'chrome-extension://',
        'moz-extension://',
        // Low-value errors
        'Script error',
        'Network request failed',
        'NetworkError',
        'timeout',
        'Script Tag Error'
      ],

      // Data filtering & sanitization
      beforeSend: (event, hint) => sanitizeEvent(event, hint),
      beforeBreadcrumb: (breadcrumb) => sanitizeBreadcrumb(breadcrumb),

      // Request payload configuration
      maxBreadcrumbs: 100,
      maxValueLength: 1024,
      attachStacktrace: true,

      // Additional configuration
      serverName: process.env.SENTRY_SERVER_NAME || 'rez-app-backend',
      includeLocalVariables: process.env.NODE_ENV === 'development',
      enabled: process.env.NODE_ENV !== 'test'
    });

    logger.info('Sentry initialized successfully', {
      environment: process.env.SENTRY_ENVIRONMENT,
      release: getPackageVersion(),
      dsn: maskDSN(process.env.SENTRY_DSN)
    });
  } catch (error) {
    logger.error('Failed to initialize Sentry', error as any);
    // Don't throw - continue without Sentry
  }
};

/**
 * Phase 6.24: Sentry initialization for the background worker process.
 * Unlike `initSentry(app)`, this doesn't require an Express app because
 * the worker doesn't serve HTTP — it only runs cron jobs and Bull queues.
 * Captures uncaught exceptions and unhandled rejections so a misbehaving
 * cron job surfaces in Sentry instead of silently dying in the logs.
 */
export const initSentryWorker = (): void => {
  if (!process.env.SENTRY_DSN) {
    logger.warn('Sentry DSN not configured, error tracking disabled in worker');
    return;
  }

  try {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
      release: process.env.SENTRY_RELEASE || getPackageVersion(),
      tracesSampleRate: getTraceSampleRate(),
      profilesSampleRate: getProfilesSampleRate(),
      // No HTTP/Express integrations — worker is not an HTTP server. Just
      // the global handlers for uncaught exceptions and unhandled rejections.
      integrations: [
        new Sentry.Integrations.Console({
          levels: ['error', 'warn']
        }),
        new Sentry.Integrations.OnUncaughtException(),
        new Sentry.Integrations.OnUnhandledRejection({ mode: 'strict' })
      ],
      beforeSend(event) {
        // Sanitize: strip PII from event before sending
        if (event.user) {
          delete event.user.ip_address;
          delete event.user.email;
        }
        if (event.request) {
          delete event.request.cookies;
          delete event.request.headers;
        }
        return event;
      },
    });

    logger.info('Sentry initialized for worker process', {
      dsn: maskDSN(process.env.SENTRY_DSN)
    });
  } catch (error) {
    logger.error('Failed to initialize Sentry for worker', error as any);
    // Don't throw - continue without Sentry
  }
};

// ============================================================================
// MIDDLEWARE EXPORTS
// ============================================================================

// Safe middleware that only runs when Sentry is configured
const createSafeMiddleware = (handler: any) => {
  return (req: any, res: any, next: any) => {
    if (!process.env.SENTRY_DSN) {
      return next();
    }
    return handler(req, res, next);
  };
};

// RequestHandler middleware must be the first middleware
export const sentryRequestHandler = createSafeMiddleware(
  Sentry.Handlers.requestHandler({
    include: {
      user: true,
      request: true,
      ip: true
    }
  })
);

// TracingHandler middleware for performance monitoring
export const sentryTracingHandler = createSafeMiddleware(
  Sentry.Handlers.tracingHandler()
);

// ErrorHandler middleware must be the last middleware
export const sentryErrorHandler = createSafeMiddleware(
  Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Capture all errors
      return true;
    }
  })
);

// ============================================================================
// CONTEXT & USER MANAGEMENT
// ============================================================================

export interface UserContext {
  id: string;
  email?: string;
  username?: string;
  ip?: string;
  userType?: 'user' | 'merchant' | 'admin';
}

/**
 * Set user context for error tracking
 */
export const setUserContext = (user: UserContext) => {
  if (process.env.SENTRY_DSN) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
      ip_address: user.ip
    });

    // Also set tags for better filtering
    Sentry.setTag('user_type', user.userType || 'user');
  }
};

/**
 * Clear user context
 */
export const clearUserContext = () => {
  if (process.env.SENTRY_DSN) {
    Sentry.setUser(null);
  }
};

/**
 * Set request context with additional metadata
 */
export const setRequestContext = (context: Record<string, any>) => {
  if (process.env.SENTRY_DSN) {
    Sentry.setContext('request', context);
  }
};

/**
 * Set additional tags for filtering and searching
 */
export const setTags = (tags: Record<string, string | number | boolean>) => {
  if (process.env.SENTRY_DSN) {
    Object.entries(tags).forEach(([key, value]) => {
      Sentry.setTag(key, value);
    });
  }
};

/**
 * Set additional context
 */
export const setContext = (name: string, context: Record<string, any>) => {
  if (process.env.SENTRY_DSN) {
    Sentry.setContext(name, context);
  }
};

// ============================================================================
// EXCEPTION & MESSAGE CAPTURE
// ============================================================================

/**
 * Capture exception with optional context
 */
export const captureException = (error: Error, context?: Record<string, any>, level: Sentry.SeverityLevel = 'error') => {
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error, {
      extra: context,
      level
    });
  }
  logger.error('Exception captured', error, { context, level });
};

/**
 * Capture message with optional context
 */
export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>) => {
  if (process.env.SENTRY_DSN) {
    Sentry.captureMessage(message, {
      level,
      extra: context
    });
  }
  logger.log(level as string, message, context);
};

// ============================================================================
// BREADCRUMB TRACKING
// ============================================================================

/**
 * Add custom breadcrumb for tracking important operations
 */
export const addBreadcrumb = (message: string, category: string, level: Sentry.SeverityLevel = 'info', data?: Record<string, any>) => {
  if (process.env.SENTRY_DSN) {
    Sentry.addBreadcrumb({
      message,
      category,
      level,
      data,
      timestamp: Date.now() / 1000
    });
  }
};

// ============================================================================
// TRANSACTION & PERFORMANCE TRACKING
// ============================================================================

/**
 * Start a transaction for performance monitoring
 */
export const startTransaction = (name: string, op: string) => {
  if (process.env.SENTRY_DSN) {
    return Sentry.startTransaction({
      name,
      op,
      description: `${op} - ${name}`
    });
  }
  return null;
};

/**
 * Get current transaction
 */
export const getCurrentTransaction = () => {
  return Sentry.getCurrentScope().getTransaction();
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get trace sample rate based on environment
 */
function getTraceSampleRate(): number {
  const rate = process.env.SENTRY_TRACES_SAMPLE_RATE;
  if (rate) {
    const parsed = parseFloat(rate);
    return isNaN(parsed) ? 0.1 : Math.min(parsed, 1);
  }

  // Default: full tracing in development, 10% in production
  return process.env.NODE_ENV === 'production' ? 0.1 : 1.0;
}

/**
 * Get profiles sample rate based on environment
 */
function getProfilesSampleRate(): number {
  const rate = process.env.SENTRY_PROFILES_SAMPLE_RATE;
  if (rate) {
    const parsed = parseFloat(rate);
    return isNaN(parsed) ? 0 : Math.min(parsed, 1);
  }

  // Default: no profiling in production, full profiling in development
  return process.env.NODE_ENV === 'production' ? 0 : 0.1;
}

/**
 * Sanitize event to remove sensitive data
 */
function sanitizeEvent(event: Sentry.Event, hint: Sentry.EventHint): Sentry.Event | null {
  // Filter sensitive fields
  const sensitiveFields = [
    'password',
    'token',
    'accessToken',
    'refreshToken',
    'authorization',
    'cookie',
    'pan',
    'cvv',
    'cvc',
    'pin',
    'accountNumber',
    'bankAccount',
    'creditCard',
    'debitCard',
    'cardNumber',
    'routingNumber',
    'socialSecurity',
    'apiKey',
    'secret',
    'apiSecret',
    'privateKey',
    'secretKey',
    'passphrase',
    'ssn',
    'businessNumber'
  ];

  // Sanitize request data
  if (event.request) {
    // Remove cookies
    delete (event.request as any).cookies;

    // Remove sensitive headers
    if (event.request.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['cookie'];
      delete event.request.headers['x-api-key'];
    }

    // Sanitize body data
    if (event.request.data && typeof event.request.data === 'object') {
      event.request.data = sanitizeObject(event.request.data, sensitiveFields);
    }
  }

  // Sanitize extra data
  if (event.extra) {
    event.extra = sanitizeObject(event.extra, sensitiveFields);
  }

  // Sanitize contexts
  if (event.contexts) {
    Object.keys(event.contexts).forEach((key) => {
      if (event.contexts && event.contexts[key]) {
        event.contexts[key] = sanitizeObject(event.contexts[key], sensitiveFields);
      }
    });
  }

  return event;
}

/**
 * Sanitize breadcrumb to remove sensitive data
 */
function sanitizeBreadcrumb(breadcrumb: Sentry.Breadcrumb): Sentry.Breadcrumb | null {
  const sensitiveCategories = ['http', 'fetch', 'xhr'];

  // Don't filter out breadcrumbs, but sanitize their data
  if (sensitiveCategories.includes(breadcrumb.category || '')) {
    if (breadcrumb.data) {
      breadcrumb.data = sanitizeObject(breadcrumb.data, [
        'password',
        'token',
        'authorization',
        'apiKey',
        'secret'
      ]);
    }
  }

  return breadcrumb;
}

/**
 * Recursively sanitize object to remove sensitive fields
 */
function sanitizeObject(obj: any, sensitiveFields: string[]): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, sensitiveFields));
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveFields.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
      sanitized[key] = '***REDACTED***';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, sensitiveFields);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Mask DSN for logging (show only domain)
 */
function maskDSN(dsn: string): string {
  try {
    const url = new URL(dsn);
    return `${url.protocol}//${url.hostname}`;
  } catch {
    return '***MASKED***';
  }
}
