import { Request, Response, NextFunction } from 'express';
import { logger, sanitizeLog } from '../config/logger';
import * as Sentry from '@sentry/node';
import { errorCounter } from '../config/prometheus';

export const errorLogger = (err: Error, req: Request, res: Response, next: NextFunction) => {
  // Log error with full context
  logger.error('Error occurred', {
    correlationId: req.correlationId,
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    query: sanitizeLog(req.query),
    body: sanitizeLog(req.body),
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  // Report to Sentry
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err, {
      extra: {
        correlationId: req.correlationId,
        path: req.path,
        method: req.method,
        query: sanitizeLog(req.query),
        body: sanitizeLog(req.body),
        ip: req.ip
      }
    });
  }

  // Track error in Prometheus
  errorCounter.inc({
    type: 'server',
    code: '500'
  });

  next(err);
};

// Async error handler wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Not found error handler
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  logger.warn('Route not found', {
    correlationId: req.correlationId,
    method: req.method,
    path: req.path,
    ip: req.ip
  });

  errorCounter.inc({
    type: 'client',
    code: '404'
  });

  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    correlationId: req.correlationId
  });
};

// Global error handler
export const globalErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Log based on severity
  if (statusCode >= 500) {
    logger.error('Server error', {
      correlationId: req.correlationId,
      error: message,
      stack: err.stack,
      statusCode
    });
  } else {
    logger.warn('Client error', {
      correlationId: req.correlationId,
      error: message,
      statusCode
    });
  }

  // Send error response
  res.status(statusCode).json({
    error: err.name || 'Error',
    message,
    correlationId: req.correlationId,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
