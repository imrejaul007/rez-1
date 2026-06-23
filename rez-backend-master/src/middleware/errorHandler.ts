import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';
import { logger, sanitizeLog, createServiceLogger } from '../config/logger';
import { AppError } from '../utils/AppError';

// Re-export AppError from its canonical location for backward compatibility
export { AppError } from '../utils/AppError';

const errorLogger = createServiceLogger('ErrorHandler');

// Standard error response shape
interface ErrorResponse {
  success: false;
  code: string;
  message: string;
  errors?: Array<{ field?: string; message: string }>;
  requestId?: string;
  stack?: string;
}

// Handle Mongoose validation errors
const handleMongooseValidationError = (error: any): AppError => {
  const fieldErrors = Object.values(error.errors).map((err: any) => ({
    field: err.path,
    message: err.message
  }));

  errorLogger.warn('Validation error', {
    errorCount: fieldErrors.length,
    fields: fieldErrors.map((e: any) => e.field)
  });

  return new AppError(
    `Validation failed: ${fieldErrors.map(e => `${e.field} - ${e.message}`).join(', ')}`,
    400,
    'VALIDATION_ERROR',
    fieldErrors
  );
};

// Handle Mongoose duplicate key errors (E11000)
const handleDuplicateKeyError = (error: any): AppError => {
  const field = error.keyValue ? Object.keys(error.keyValue)[0] : 'unknown';
  errorLogger.warn('Duplicate key error', { field });
  return new AppError(`${field} already exists`, 409, 'DUPLICATE_KEY');
};

// Handle Mongoose cast errors (invalid ObjectId, etc.)
const handleCastError = (error: any): AppError => {
  errorLogger.warn('Cast error', { path: error.path, value: error.value });
  return new AppError(`Invalid value for ${error.path}`, 400, 'INVALID_ID');
};

// Handle JWT errors
const handleJWTError = (): AppError => {
  errorLogger.warn('Invalid JWT token');
  return new AppError('Invalid token. Please log in again', 401, 'JWT_INVALID');
};

const handleJWTExpiredError = (): AppError => {
  errorLogger.warn('JWT token expired');
  return new AppError('Token expired. Please log in again', 401, 'JWT_EXPIRED');
};

// Handle Twilio errors
const handleTwilioError = (error: any): AppError => {
  errorLogger.error('Twilio service error', error, {
    errorCode: error.code,
    status: error.status
  });
  return new AppError('SMS service unavailable. Please try again later', 503, 'TWILIO_ERROR');
};

// Handle SendGrid errors
const handleSendGridError = (error: any): AppError => {
  errorLogger.error('SendGrid service error', error, {
    errorCode: error.code
  });
  return new AppError('Email service unavailable. Please try again later', 503, 'SENDGRID_ERROR');
};

// Handle Stripe errors
const handleStripeError = (error: any): AppError => {
  errorLogger.error('Stripe error', error, {
    errorCode: error.code,
    errorType: error.type
  });

  const statusMap: Record<string, number> = {
    card_error: 400,
    rate_limit_error: 429,
    authentication_error: 401,
    api_connection_error: 503,
    invalid_request_error: 400
  };

  return new AppError(
    error.message || 'Payment processing error',
    statusMap[error.type] || 500,
    'STRIPE_ERROR'
  );
};

// Handle Razorpay errors
const handleRazorpayError = (error: any): AppError => {
  errorLogger.error('Razorpay service error', error, {
    errorCode: error.code,
    description: error.description
  });
  return new AppError('Payment service error. Please try again', 503, 'RAZORPAY_ERROR');
};

// Handle database errors
const handleDatabaseError = (error: any): AppError => {
  errorLogger.error('Database error', error, {
    name: error.name,
    code: error.code
  });
  return new AppError('Database operation failed. Please try again', 503, 'DATABASE_ERROR');
};

// Handle timeout errors
const handleTimeoutError = (error: any): AppError => {
  errorLogger.warn('Request timeout', { message: error.message });
  return new AppError('Request timeout. Please try again', 408, 'TIMEOUT_ERROR');
};

/**
 * Classify an unknown error into an AppError.
 * Never leaks internal details (stack traces, schema info, file paths) to the client.
 */
const classifyError = (error: any): AppError => {
  // Already an AppError — pass through
  if (error instanceof AppError) return error;

  // Mongoose validation error
  if (error.name === 'ValidationError' && error.errors) return handleMongooseValidationError(error);

  // MongoDB duplicate key (E11000)
  if (error.code === 11000) return handleDuplicateKeyError(error);

  // Mongoose CastError (invalid ObjectId)
  if (error.name === 'CastError') return handleCastError(error);

  // JWT errors
  if (error.name === 'JsonWebTokenError') return handleJWTError();
  if (error.name === 'TokenExpiredError') return handleJWTExpiredError();

  // External service errors
  if (error.message?.includes('Twilio')) return handleTwilioError(error);
  if (error.message?.includes('SendGrid')) return handleSendGridError(error);
  if (error.type?.includes('Stripe') || error.type === 'card_error') return handleStripeError(error);
  if (error.statusCode === 400 && error.description) return handleRazorpayError(error);

  // MongoDB driver errors
  if (error.name === 'MongoError' || error.name === 'MongoServerError') return handleDatabaseError(error);

  // Timeout
  if (error.code === 'ETIMEDOUT' || error.message === 'timeout') return handleTimeoutError(error);

  // Unknown — generic 500, never expose raw message
  return new AppError('Something went wrong', 500, 'INTERNAL_ERROR');
};

// Global error handling middleware — must be registered AFTER all routes
export const globalErrorHandler = (
  error: any,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const requestId = (req as any).correlationId as string | undefined;
  const userId = (req as any).userId;

  // Log the raw error with full context (server-side only)
  errorLogger.error(`${req.method} ${req.path} - Error occurred`, error, {
    method: req.method,
    path: req.path,
    query: sanitizeLog(req.query),
    body: sanitizeLog(req.body),
    userId,
    requestId,
    errorName: error.name,
    errorMessage: error.message
  }, requestId);

  const appError = classifyError(error);

  // Log severity-appropriate message
  if (appError.statusCode >= 500) {
    errorLogger.error(`Server error ${appError.statusCode}`, null, {
      requestId,
      code: appError.code,
      message: appError.message
    }, requestId);
  } else {
    errorLogger.warn(`Client error ${appError.statusCode}`, {
      requestId,
      code: appError.code,
      message: appError.message
    }, requestId);
  }

  // Build response — never include stack in production
  const response: ErrorResponse = {
    success: false,
    code: appError.code,
    message: appError.isOperational ? appError.message : 'Something went wrong',
    ...(appError.errors && { errors: appError.errors }),
    ...(requestId && { requestId })
  };

  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
    // In dev, always show the real message
    response.message = appError.message || error.message;
  }

  return res.status(appError.statusCode).json(response);
};

// 404 handler for undefined routes
export const notFoundHandler = (req: Request, _res: Response, next: NextFunction) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404, 'NOT_FOUND');
  errorLogger.warn('Route not found', {
    method: req.method,
    path: req.originalUrl
  }, (req as any).correlationId);
  next(error);
};

// Error boundary for critical operations
export const withErrorLogging = (
  operationName: string,
  operation: () => Promise<any>,
  correlationId?: string
) => {
  const opLogger = createServiceLogger(operationName);

  return async () => {
    try {
      opLogger.info(`Starting: ${operationName}`, {}, correlationId);
      const result = await operation();
      opLogger.info(`Completed: ${operationName}`, {}, correlationId);
      return result;
    } catch (error) {
      opLogger.error(`Failed: ${operationName}`, error, {}, correlationId);
      throw error;
    }
  };
};
