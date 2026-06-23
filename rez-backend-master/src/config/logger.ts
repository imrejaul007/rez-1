import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom log format for development
const devFormat = printf(({ level, message, timestamp, correlationId, service, ...metadata }) => {
  let msg = `${timestamp} [${level}]${correlationId ? ` [${correlationId}]` : ''}`;

  if (service) {
    msg += ` [${service}]`;
  }

  msg += `: ${message}`;

  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }

  return msg;
});

// Sensitive data masking format — auto-redacts PII from log strings
const maskSensitiveData = winston.format((info) => {
  const msg = info.message;
  if (typeof msg === 'string') {
    let masked = msg;
    // Mask phone numbers (+91XXXXXXXX → +91****XXXX)
    masked = masked.replace(/(\+?\d{1,3})\d{6}(\d{4})/g, '$1****$2');
    // Mask JWT tokens (eyJ... → eyJ***[REDACTED])
    masked = masked.replace(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, 'eyJ***[REDACTED]');
    // Mask card numbers (1234567890123456 → ****3456)
    masked = masked.replace(/\b\d{12,16}\b/g, (m: string) => '****' + m.slice(-4));
    // Mask email addresses (user@example.com → u***@example.com)
    masked = masked.replace(/([a-zA-Z0-9])[a-zA-Z0-9.+_-]*@/g, '$1***@');
    info.message = masked;
  }
  return info;
});

// Production JSON format
const prodFormat = json();

// Increase default EventEmitter listeners to avoid MaxListenersExceeded warnings
// when multiple DailyRotateFile transports + exception/rejection handlers are added
import { EventEmitter } from 'events';
EventEmitter.defaultMaxListeners = 20;

// Create logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: {
    service: 'user-backend',
    environment: process.env.NODE_ENV || 'development'
  },
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    maskSensitiveData(),
    process.env.NODE_ENV === 'production' ? prodFormat : devFormat
  ),
  transports: [
    // Console transport
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production'
        ? json()
        : combine(colorize(), devFormat),
      level: process.env.LOG_LEVEL || 'info'
    })
  ],
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      format: json()
    })
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      format: json()
    })
  ]
});

// Add file transports in production
if (process.env.NODE_ENV === 'production') {
  // Combined logs (90 days for financial compliance/PCI)
  logger.add(new DailyRotateFile({
    filename: path.join(logsDir, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '90d',
    format: json()
  }));

  // Error logs (90 days for financial compliance/PCI)
  logger.add(new DailyRotateFile({
    level: 'error',
    filename: path.join(logsDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '90d',
    format: json()
  }));

  // Warning logs
  logger.add(new DailyRotateFile({
    level: 'warn',
    filename: path.join(logsDir, 'warn-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format: json()
  }));
}

// Development file logging
if (process.env.LOG_FILES === 'true' && process.env.NODE_ENV !== 'production') {
  logger.add(new DailyRotateFile({
    filename: path.join(logsDir, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '7d',
    format: devFormat
  }));

  logger.add(new DailyRotateFile({
    level: 'error',
    filename: path.join(logsDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format: devFormat
  }));
}

// Create request logger middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? 'warn' : 'info';

    logger.log(level, `${req.method} ${req.originalUrl}`, {
      method: req.method,
      path: req.path,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.getHeader('content-length'),
      ip: req.ip,
      userAgent: req.get('user-agent'),
      correlationId: (req as any).correlationId,
      userId: (req as any).userId
    });
  });

  next();
};

// Helper to sanitize sensitive data from logs
export const sanitizeLog = (data: any): any => {
  if (!data) return data;

  const sensitiveFields = [
    'password', 'token', 'accessToken', 'refreshToken', 'authorization',
    'cookie', 'pan', 'cvv', 'cvc', 'pin', 'accountNumber', 'bankAccount',
    'creditCard', 'debitCard', 'cardNumber', 'routingNumber', 'socialSecurity',
    'apiKey', 'secret', 'apiSecret', 'privateKey', 'secretKey', 'passphrase'
  ];

  const sanitizeObj = (obj: any): any => {
    if (obj === null || obj === undefined) return obj;

    if (typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map(sanitizeObj);
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        sanitized[key] = '***REDACTED***';
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeObj(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  };

  return sanitizeObj(data);
};

// Correlation ID middleware
export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const correlationId =
    req.headers['x-correlation-id'] ||
    req.headers['x-request-id'] ||
    req.headers['x-trace-id'] ||
    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  (req as any).correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);

  next();
};

// Context-aware logging helpers
export const logInfo = (message: string, meta?: any, correlationId?: string) => {
  logger.info(message, { ...meta, correlationId });
};

export const logWarn = (message: string, meta?: any, correlationId?: string) => {
  logger.warn(message, { ...meta, correlationId });
};

export const logError = (message: string, error?: any, meta?: any, correlationId?: string) => {
  const errorMeta = {
    ...meta,
    correlationId,
    ...(error instanceof Error && {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack
    })
  };
  logger.error(message, errorMeta);
};

export const logDebug = (message: string, meta?: any, correlationId?: string) => {
  logger.debug(message, { ...meta, correlationId });
};

// Service-specific loggers
export const createServiceLogger = (serviceName: string) => {
  return {
    info: (message: string, meta?: any, correlationId?: string) =>
      logger.info(message, { service: serviceName, ...meta, correlationId }),

    warn: (message: string, meta?: any, correlationId?: string) =>
      logger.warn(message, { service: serviceName, ...meta, correlationId }),

    error: (message: string, error?: any, meta?: any, correlationId?: string) => {
      const errorMeta = {
        service: serviceName,
        ...meta,
        correlationId,
        ...(error instanceof Error && {
          errorName: error.name,
          errorMessage: error.message,
          errorStack: error.stack
        })
      };
      logger.error(message, errorMeta);
    },

    debug: (message: string, meta?: any, correlationId?: string) =>
      logger.debug(message, { service: serviceName, ...meta, correlationId })
  };
};

// Add correlationId to Request interface
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      userId?: string;
    }
  }
}
