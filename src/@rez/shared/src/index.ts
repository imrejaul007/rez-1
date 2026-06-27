/**
 * @rez/shared - Shared utilities for REZ backend services
 *
 * This package provides cross-service utilities including:
 * - Response helpers (sendSuccess, sendError, sendPaginated, etc.)
 * - Error classes (AppError, ValidationError, NotFoundError, etc.)
 * - Validators (isValidEmail, isValidPhone, isValidOTP, etc.)
 * - Sanitization utilities (sanitizeInput, sanitizeHTML, etc.)
 */

// Response helpers
export {
  type APIResponse,
  type PaginatedData,
  sendSuccess,
  sendError,
  sendPaginated,
  sendCreated,
  sendNoContent,
  sendNotFound,
  sendBadRequest,
  sendValidationError,
  sendUnauthorized,
  sendForbidden,
  sendConflict,
  sendTooManyRequests,
  sendInternalError,
  sendServiceUnavailable,
} from './response';

// Error classes
export {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  PaymentError,
  RateLimitError,
  ServiceUnavailableError,
  ErrorCodes,
  type ErrorCode,
} from './errors';

// Validators
export {
  isValidEmail,
  isValidPhone,
  isValidOTP,
  isValidObjectId,
  isValidURL,
  isValidLength,
  isAlphanumeric,
  isNumeric,
  isStrongPassword,
  isValidReferralCode,
  isValidDate,
  isValidISODate,
} from './validators';

// Sanitization utilities
export {
  sanitizeBody,
  sanitizeQuery,
  sanitizeParams,
  sanitizeRequest,
  sanitizeInput,
  sanitizeHTML,
  sanitizeEmail,
  sanitizePhoneNumber,
  sanitizeURL,
  sanitizeMongoQuery,
  sanitizeObjectId,
  sanitizeProductText,
  sanitizeText,
  normalizePhoneNumber,
} from './sanitization';

// Default export for convenience
import * as response from './response';
import * as errors from './errors';
import * as validators from './validators';
import * as sanitization from './sanitization';

const shared = {
  ...response,
  ...errors,
  ...validators,
  ...sanitization,
};

export default shared;
