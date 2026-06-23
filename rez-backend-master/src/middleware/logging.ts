import { Request, Response, NextFunction } from 'express';
import { logger, sanitizeLog } from '../config/logger';
import { httpRequestCounter, httpRequestDuration } from '../config/prometheus';

export const loggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  // Log request
  logger.info(`Incoming request: ${req.method} ${req.path}`, {
    correlationId: req.correlationId,
    method: req.method,
    path: req.path,
    query: sanitizeLog(req.query),
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  // Capture response
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;

    // Log response
    logger.info(`Request completed: ${req.method} ${req.path}`, {
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      route,
      status: res.statusCode,
      duration: `${duration}s`,
      contentLength: res.get('content-length')
    });

    // Prometheus metrics
    httpRequestCounter.inc({
      method: req.method,
      route,
      status: res.statusCode.toString()
    });

    httpRequestDuration.observe({
      method: req.method,
      route,
      status: res.statusCode.toString()
    }, duration);
  });

  next();
};

// Request body logger (use sparingly, avoid logging sensitive data)
export const bodyLogger = (req: Request, res: Response, next: NextFunction) => {
  if (req.body && Object.keys(req.body).length > 0) {
    logger.debug('Request body', {
      correlationId: req.correlationId,
      path: req.path,
      body: sanitizeLog(req.body)
    });
  }
  next();
};

// Slow request logger
export const slowRequestLogger = (threshold: number = 1000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;

      if (duration > threshold) {
        logger.warn(`Slow request detected: ${req.method} ${req.path}`, {
          correlationId: req.correlationId,
          method: req.method,
          path: req.path,
          duration: `${duration}ms`,
          threshold: `${threshold}ms`
        });
      }
    });

    next();
  };
};

// Error request logger
export const errorRequestLogger = (req: Request, res: Response, next: NextFunction) => {
  res.on('finish', () => {
    if (res.statusCode >= 400) {
      logger.error(`Error request: ${req.method} ${req.path}`, {
        correlationId: req.correlationId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        ip: req.ip
      });
    }
  });

  next();
};
