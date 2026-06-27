/**
 * Custom error class hierarchy for standardized error handling.
 * All operational errors should use these classes instead of raw Error.
 * The global error handler maps these to proper HTTP responses.
 */

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly errors?: Array<{ field?: string; message: string }>;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    errors?: Array<{ field?: string; message: string }>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.errors = errors;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', errors?: Array<{ field?: string; message: string }>) {
    super(message, 400, 'VALIDATION_ERROR', errors);
  }
}

/**
 * Authentication error (401)
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

/**
 * Authorization error (403)
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Access forbidden') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

/**
 * Conflict error (409)
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * Payment error (402)
 */
export class PaymentError extends AppError {
  constructor(message: string = 'Payment required') {
    super(message, 402, 'PAYMENT_ERROR');
  }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}

/**
 * Service unavailable error (503)
 */
export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service temporarily unavailable') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
  }
}

/**
 * Error codes for common errors (compatible with rez-auth-service)
 */
export const ErrorCodes = {
  // Authentication errors
  AUTH_001: 'Invalid credentials',
  AUTH_002: 'Token expired',
  AUTH_003: 'Invalid token',
  AUTH_004: 'Unauthorized access',
  AUTH_005: 'Account locked',
  AUTH_006: 'Insufficient permissions',
  AUTH_007: 'MFA required',
  AUTH_008: 'Invalid OTP',
  AUTH_009: 'OTP expired',

  // Server errors
  SRV_001: 'Internal server error',
  SRV_002: 'Database error',
  SRV_003: 'Service unavailable',

  // Resource errors
  RES_001: 'Resource not found',
  RES_002: 'Resource already exists',
  RES_003: 'Resource deleted',

  // Validation errors
  VAL_001: 'Invalid input',
  VAL_002: 'Missing required field',

  // Rate limiting
  RATE_001: 'Too many requests',
} as const;

export type ErrorCode = keyof typeof ErrorCodes;
