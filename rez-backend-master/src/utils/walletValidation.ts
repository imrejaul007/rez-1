/**
 * Wallet validation utilities for financial operations.
 * Centralized validation to prevent NaN, Infinity, negative, and overflow attacks.
 */

const MAX_WALLET_AMOUNT = 10_000_000; // 10M NC hard ceiling

/**
 * Validate and sanitize a financial amount.
 * Returns { valid: true, amount } or { valid: false, error }.
 */
export function validateAmount(
  raw: any,
  options: { min?: number; max?: number; fieldName?: string } = {}
): { valid: true; amount: number } | { valid: false; error: string } {
  const { min = 0.01, max = MAX_WALLET_AMOUNT, fieldName = 'Amount' } = options;

  const amount = Number(raw);

  if (raw === null || raw === undefined || raw === '') {
    return { valid: false, error: `${fieldName} is required` };
  }

  if (!Number.isFinite(amount)) {
    return { valid: false, error: `${fieldName} must be a valid number` };
  }

  if (amount < min) {
    return { valid: false, error: `${fieldName} must be at least ${min}` };
  }

  if (amount > max) {
    return { valid: false, error: `${fieldName} cannot exceed ${max}` };
  }

  // Round to 2 decimal places to avoid floating point issues
  const sanitized = Math.round(amount * 100) / 100;

  return { valid: true, amount: sanitized };
}

/**
 * Validate pagination parameters.
 */
export function validatePagination(
  rawPage: any,
  rawLimit: any,
  maxLimit: number = 50
): { page: number; limit: number } {
  const page = Math.max(1, Math.floor(Number(rawPage) || 1));
  const limit = Math.max(1, Math.min(maxLimit, Math.floor(Number(rawLimit) || 10)));
  return { page, limit };
}

/**
 * Sanitize error messages for client responses — strip internal details.
 */
export function sanitizeErrorMessage(error: any, fallback: string): string {
  if (!error) return fallback;
  const msg = error.message || String(error);
  // Don't expose internal paths, stack traces, or DB errors
  if (
    msg.includes('ECONNREFUSED') ||
    msg.includes('MongoError') ||
    msg.includes('MongoServerError') ||
    msg.includes('E11000') ||
    msg.includes('ENOTFOUND') ||
    msg.includes('at ') ||
    msg.includes('\\') ||
    msg.includes('/')
  ) {
    return fallback;
  }
  return msg;
}
