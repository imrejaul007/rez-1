/**
 * Retry utility with exponential backoff and jitter
 * @module utils/retry
 */

export interface RetryOptions {
  /** Max retry attempts (default: 3) */
  maxAttempts?: number;
  /** Initial delay in ms (default: 100) */
  initialDelay?: number;
  /** Max delay in ms (default: 30000) */
  maxDelay?: number;
  /** Backoff multiplier (default: 2) */
  factor?: number;
  /** Random jitter 0-1 (default: 0.2 = 20%) */
  jitter?: number;
  /** Error codes/types to retry (overrides default list if provided) */
  retryableErrors?: string[];
  /** Called before each retry attempt */
  onRetry?: (attempt: number, delay: number, error: Error) => void;
}

// Default retryable error codes and patterns
const DEFAULT_RETRYABLE_ERRORS = [
  // Network errors
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'ENETUNREACH',
  'EAI_AGAIN',
  'ECONNREFUSED',
  // HTTP status codes
  '429',
  '500',
  '502',
  '503',
  '504',
  // Error message patterns (lowercase for case-insensitive matching)
  'network error',
  'timeout',
  'econnreset',
  'etimedout',
  'too many requests',
  'service unavailable',
  'bad gateway',
  'gateway timeout',
];

/**
 * Determine if an error is retryable based on its code or message
 * @param error - The error to check
 * @param retryableErrors - List of error codes/patterns to retry
 * @returns True if the error should be retried
 */
export function isRetryable(error: Error, retryableErrors: string[] = DEFAULT_RETRYABLE_ERRORS): boolean {
  const errorCode = error.code || '';
  const errorMessage = (error.message || '').toLowerCase();
  const errorStatus = String((error as any).status || (error as any).statusCode || '');

  return retryableErrors.some(retryable => {
    const normalizedRetryable = retryable.toLowerCase();

    // Check exact matches for error codes and status codes
    if (errorCode && errorCode.toLowerCase() === normalizedRetryable) {
      return true;
    }
    if (errorStatus === retryable) {
      return true;
    }

    // Check if retryable pattern is contained in error message
    if (errorMessage.includes(normalizedRetryable)) {
      return true;
    }

    return false;
  });
}

/**
 * Generate a random number between 0 and 1
 * Extracted for testability
 */
function random(): number {
  return Math.random();
}

/**
 * Calculate delay with exponential backoff and jitter
 * @param attempt - Current attempt number (0-indexed)
 * @param initialDelay - Initial delay in ms
 * @param maxDelay - Maximum delay cap in ms
 * @param factor - Exponential factor
 * @param jitter - Jitter factor (0-1)
 * @returns Delay in ms
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  factor: number,
  jitter: number
): number {
  // Calculate exponential delay: min(initialDelay * factor^attempt, maxDelay)
  const exponentialDelay = Math.min(initialDelay * Math.pow(factor, attempt), maxDelay);

  // Add random jitter: delay * (1 + random * jitter)
  const jitterAmount = exponentialDelay * (1 + random() * jitter);

  return Math.round(jitterAmount);
}

/**
 * Sleep for a specified duration
 * @param ms - Duration in milliseconds
 * @returns Promise that resolves after the delay
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if a value is a plain number (retry count)
 * @param options - Options or number
 * @returns True if options is a number
 */
function isRetryCount(options?: number | RetryOptions): options is number {
  return typeof options === 'number';
}

/**
 * Retry a promise with exponential backoff and jitter
 *
 * @example
 * ```typescript
 * // Simple usage with default options
 * const result = await withRetry(() => fetchData());
 *
 * // With custom options
 * const result = await withRetry(() => sendEmail(), {
 *   maxAttempts: 5,
 *   initialDelay: 1000,
 *   factor: 2,
 *   onRetry: (attempt, delay, error) => {
 *     console.log(`Retrying in ${delay}ms (attempt ${attempt}): ${error.message}`);
 *   }
 * });
 *
 * // Just pass a number for max attempts
 * const result = await withRetry(() => fetchData(), 3);
 * ```
 *
 * @param fn - Async function to retry
 * @param options - Retry options or just max attempts as a number
 * @returns Promise that resolves with the function result
 * @throws The last error if all retries are exhausted
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: number | RetryOptions
): Promise<T> {
  // Parse options with defaults
  const maxAttempts = isRetryCount(options) ? options : (options?.maxAttempts ?? 3);
  const initialDelay = options && !isRetryCount(options) ? (options.initialDelay ?? 100) : 100;
  const maxDelay = options && !isRetryCount(options) ? (options.maxDelay ?? 30000) : 30000;
  const factor = options && !isRetryCount(options) ? (options.factor ?? 2) : 2;
  const jitter = options && !isRetryCount(options) ? (options.jitter ?? 0.2) : 0.2;
  const retryableErrors = options && !isRetryCount(options) ? (options.retryableErrors ?? DEFAULT_RETRYABLE_ERRORS) : DEFAULT_RETRYABLE_ERRORS;
  const onRetry = options && !isRetryCount(options) ? options.onRetry : undefined;

  let lastError: Error;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if this error is retryable
      const shouldRetry = attempt < maxAttempts - 1 && isRetryable(lastError, retryableErrors);

      if (!shouldRetry) {
        throw lastError;
      }

      // Calculate delay for next attempt
      const delay = calculateDelay(attempt, initialDelay, maxDelay, factor, jitter);

      // Call onRetry hook if provided
      if (onRetry) {
        onRetry(attempt + 1, delay, lastError);
      }

      // Wait before retrying
      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError!;
}

export default withRetry;
