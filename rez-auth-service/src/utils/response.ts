/**
 * Standardized error responses for rez-auth-service.
 */

// Re-export error utilities from errorResponse.ts
export {
  ApiError,
  errorResponse,
  successResponse,
  errorResponseWithRes,
  successResponseWithRes,
  ErrorCodes,
  type ErrorResponse,
  type SuccessResponse,
} from './errorResponse';

// Error factory functions for common errors
export const errors = {
  internalError: () => ({ message: 'Internal server error', code: 'SRV_001' }),
  unauthorized: () => ({ message: 'Unauthorized', code: 'AUTH_004' }),
  notFound: () => ({ message: 'Not found', code: 'RES_001' }),
  badRequest: (msg?: string) => ({ message: msg || 'Bad request', code: 'VAL_001' }),
  authTokenMissing: () => ({ message: 'Auth token missing', code: 'AUTH_001' }),
  authTokenInvalid: () => ({ message: 'Auth token invalid', code: 'AUTH_003' }),
  authInsufficientPermissions: (opts?: { message?: string; [key: string]: unknown }) => ({ message: opts?.message || 'Insufficient permissions', code: 'AUTH_006', ...opts }),
  missingField: (field: string) => ({ message: `Missing required field: ${field}`, code: 'VAL_002' }),
  serviceUnavailable: (msg?: string) => ({ message: msg || 'Service unavailable', code: 'SRV_003' }),
  tooManyRequests: (msg?: string) => ({ message: msg || 'Too many requests', code: 'RATE_001' }),
  ipNotAllowed: () => ({ message: 'IP not allowed', code: 'AUTH_004' }),
  authServiceUnavailable: (msg?: string | { message: string }) => ({
    message: typeof msg === 'string' ? msg : msg?.message || 'Auth service unavailable',
    code: 'SRV_003'
  }),
};

// Legacy error function
export function err(code: string, details?: unknown) {
  const error: { code: string; message: string; details?: unknown } = {
    code,
    message: getErrorMessage(code),
  };
  if (details) {
    error.details = details;
  }
  return { success: false, error };
}

function getErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    AUTH_001: 'Invalid credentials',
    AUTH_002: 'Token has expired',
    AUTH_003: 'Invalid token',
    AUTH_004: 'Unauthorized access',
    AUTH_005: 'Account locked',
    AUTH_006: 'Insufficient permissions',
    AUTH_007: 'MFA verification required',
    SRV_001: 'Internal server error',
    RES_001: 'Resource not found',
  };
  return messages[code] || 'An error occurred';
}
