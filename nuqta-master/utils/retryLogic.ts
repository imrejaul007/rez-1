/**
 * Retry Logic Utilities
 *
 * Provides utilities for retrying failed operations with exponential backoff
 * and intelligent error handling.
 *
 * @module retryLogic
 */

import { errorReporter } from './errorReporter';

// ============================================================================
// Type Definitions
// ============================================================================

export interface RetryOptions {
  /**
   * Maximum number of retry attempts
   * @default 3
   */
  maxRetries?: number;

  /**
   * Initial delay in milliseconds before first retry
   * @default 1000
   */
  baseDelay?: number;

  /**
   * Maximum delay in milliseconds between retries
   * @default 30000 (30 seconds)
   */
  maxDelay?: number;

  /**
   * Exponential backoff factor
   * @default 2
   */
  backoffFactor?: number;

  /**
   * Function to determine if an error should trigger a retry
   * @default Retries all errors
   */
  shouldRetry?: (error: any, attemptNumber: number) => boolean;

  /**
   * Callback function called before each retry attempt
   */
  onRetry?: (error: any, attemptNumber: number, delay: number) => void;

  /**
   * Add random jitter to delay to prevent thundering herd
   * @default true
   */
  jitter?: boolean;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: any;
  attemptCount: number;
  totalDelay: number;
}

// ============================================================================
// Retry Functions
// ============================================================================

/**
 * Retry a function with exponential backoff
 *
 * @example
 * const result = await retryWithExponentialBackoff(
 *   async () => {
 *     const response = await fetch('/api/data');
 *     return response.json();
 *   },
 *   {
 *     maxRetries: 3,
 *     baseDelay: 1000,
 *     onRetry: (error, attempt, delay) => {
 *     }
 *   }
 * );
 */
export async function retryWithExponentialBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    backoffFactor = 2,
    shouldRetry = () => true,
    onRetry,
    jitter = true,
  } = options;

  let lastError: any;
  let attemptCount = 0;
  let totalDelay = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    attemptCount++;

    try {
      // Execute the function
      const result = await fn();

      // Log success if this was a retry
      if (attempt > 0) {
        errorReporter.addBreadcrumb({
          type: 'user_action',
          message: `Retry successful after ${attempt} attempts`,
          data: { attemptCount, totalDelay },
        });
      }

      return result;
    } catch (error) {
      lastError = error;

      // Check if we should retry this error
      if (!shouldRetry(error, attempt)) {
        throw error;
      }

      // Don't retry if we've exhausted all attempts
      if (attempt >= maxRetries) {
        errorReporter.captureError(
          error instanceof Error ? error : new Error(String(error)),
          {
            context: 'retryWithExponentialBackoff',
            metadata: {
              attemptCount,
              totalDelay,
              maxRetries,
            },
          }
        );
        throw error;
      }

      // Calculate delay with exponential backoff
      let delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt), maxDelay);

      // Add jitter to prevent thundering herd
      if (jitter) {
        delay = delay * (0.5 + Math.random() * 0.5);
      }

      totalDelay += delay;

      // Call onRetry callback
      if (onRetry) {
        onRetry(error, attempt + 1, delay);
      }

      // Log retry attempt
      errorReporter.addBreadcrumb({
        type: 'user_action',
        message: `Retrying after ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
        data: {
          error: error instanceof Error ? error.message : String(error),
          delay,
          attempt: attempt + 1,
          maxRetries,
        },
      });

      // Wait before retrying
      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}

/**
 * Retry a function with linear backoff
 */
export async function retryWithLinearBackoff<T>(
  fn: () => Promise<T>,
  options: Omit<RetryOptions, 'backoffFactor'> = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    shouldRetry = () => true,
    onRetry,
    jitter = true,
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!shouldRetry(error, attempt) || attempt >= maxRetries) {
        throw error;
      }

      // Linear backoff: delay increases by baseDelay each time
      let delay = Math.min(baseDelay * (attempt + 1), maxDelay);

      if (jitter) {
        delay = delay * (0.5 + Math.random() * 0.5);
      }

      if (onRetry) {
        onRetry(error, attempt + 1, delay);
      }

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Retry a function with constant delay
 */
export async function retryWithConstantDelay<T>(
  fn: () => Promise<T>,
  options: Omit<RetryOptions, 'backoffFactor' | 'maxDelay'> = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    shouldRetry = () => true,
    onRetry,
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!shouldRetry(error, attempt) || attempt >= maxRetries) {
        throw error;
      }

      if (onRetry) {
        onRetry(error, attempt + 1, baseDelay);
      }

      await sleep(baseDelay);
    }
  }

  throw lastError;
}

// ============================================================================
// Retry Predicates
// ============================================================================

/**
 * Check if error is retryable (network/timeout errors)
 */
export function isRetryableError(error: any): boolean {
  const errorMessage = error?.message?.toLowerCase() || '';
  const errorCode = error?.code?.toLowerCase() || '';

  // Network errors
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('fetch') ||
    errorMessage.includes('econnrefused') ||
    errorCode === 'econnrefused'
  ) {
    return true;
  }

  // Timeout errors
  if (
    errorMessage.includes('timeout') ||
    errorMessage.includes('aborted') ||
    errorCode === 'econnaborted'
  ) {
    return true;
  }

  // HTTP status codes that should be retried
  if (error?.response?.status) {
    const status = error.response.status;
    // Retry on 408 (Request Timeout), 429 (Too Many Requests), 500+ (Server Errors)
    return status === 408 || status === 429 || status >= 500;
  }

  return false;
}

/**
 * Check if error is a rate limit error
 */
export function isRateLimitError(error: any): boolean {
  const status = error?.response?.status;
  const errorMessage = error?.message?.toLowerCase() || '';

  return status === 429 || errorMessage.includes('rate limit') || errorMessage.includes('too many requests');
}

/**
 * Check if error is a server error (5xx)
 */
export function isServerError(error: any): boolean {
  const status = error?.response?.status;
  return status >= 500 && status < 600;
}

/**
 * Check if error is a client error (4xx)
 */
export function isClientError(error: any): boolean {
  const status = error?.response?.status;
  return status >= 400 && status < 500;
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: any): boolean {
  const status = error?.response?.status;
  return status === 401 || status === 403;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get retry delay with exponential backoff
 */
export function getExponentialDelay(
  attempt: number,
  baseDelay: number = 1000,
  maxDelay: number = 30000,
  factor: number = 2
): number {
  return Math.min(baseDelay * Math.pow(factor, attempt), maxDelay);
}

/**
 * Get retry delay with jitter
 */
export function getDelayWithJitter(delay: number, jitterFactor: number = 0.5): number {
  return delay * (1 - jitterFactor + Math.random() * jitterFactor * 2);
}

// ============================================================================
// Retry Decorators
// ============================================================================

/**
 * Create a retry wrapper for a function
 *
 * @example
 * const fetchData = createRetryWrapper(
 *   async (url: string) => {
 *     const response = await fetch(url);
 *     return response.json();
 *   },
 *   { maxRetries: 3 }
 * );
 *
 * const data = await fetchData('/api/data');
 */
export function createRetryWrapper<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: RetryOptions = {}
): T {
  return (async (...args: any[]) => {
    return retryWithExponentialBackoff(() => fn(...args), options);
  }) as T;
}

// ============================================================================
// Export
// ============================================================================

export default {
  retryWithExponentialBackoff,
  retryWithLinearBackoff,
  retryWithConstantDelay,
  isRetryableError,
  isRateLimitError,
  isServerError,
  isClientError,
  isAuthError,
  sleep,
  getExponentialDelay,
  getDelayWithJitter,
  createRetryWrapper,
};
