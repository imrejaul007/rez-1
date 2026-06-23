/**
 * Request Retry Utility
 *
 * Provides intelligent retry logic for API requests with:
 * - Exponential backoff
 * - Configurable retry attempts
 * - Smart error classification
 * - Request timeout handling
 * - Development logging
 *
 * @module requestRetry
 */

import { ApiResponse } from '@/services/apiClient';

// ============================================================================
// Type Definitions
// ============================================================================

export interface RetryConfig {
  /**
   * Maximum number of retry attempts
   * @default 3
   */
  maxRetries?: number;

  /**
   * Initial delay in milliseconds before first retry
   * @default 1000
   */
  initialDelay?: number;

  /**
   * Maximum delay in milliseconds between retries
   * @default 8000
   */
  maxDelay?: number;

  /**
   * Exponential backoff multiplier
   * @default 2
   */
  backoffMultiplier?: number;

  /**
   * Add random jitter to prevent thundering herd
   * @default true
   */
  jitter?: boolean;

  /**
   * Request timeout in milliseconds
   * @default 30000 (30 seconds)
   */
  timeout?: number;

  /**
   * Function to determine if error should trigger retry
   */
  shouldRetry?: (error: any, attempt: number) => boolean;

  /**
   * Callback before each retry attempt
   */
  onRetry?: (error: any, attempt: number, delay: number) => void;

  /**
   * Enable detailed logging (development only)
   * @default __DEV__
   */
  enableLogging?: boolean;
}

export interface RetryStats {
  attemptCount: number;
  totalDelay: number;
  errors: Array<{
    attempt: number;
    error: any;
    timestamp: number;
  }>;
  startTime: number;
  endTime?: number;
  success: boolean;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 8000,
  backoffMultiplier: 2,
  jitter: true,
  timeout: 30000,
  shouldRetry: isRetryableError,
  onRetry: () => {},
  enableLogging: __DEV__,
};

// ============================================================================
// Error Classification
// ============================================================================

/**
 * Determine if an error should trigger a retry
 */
export function isRetryableError(error: any, attempt: number = 0): boolean {
  // Don't retry if we've exceeded max retries
  if (attempt >= DEFAULT_RETRY_CONFIG.maxRetries) {
    return false;
  }

  // Check if error has explicit retry flag
  if (typeof error?.isRetryable === 'boolean') {
    return error.isRetryable;
  }

  // Network errors - always retry
  const errorMessage = error?.message?.toLowerCase() || '';
  const errorCode = error?.code?.toLowerCase() || '';

  if (
    errorMessage.includes('network') ||
    errorMessage.includes('fetch') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('aborted') ||
    errorMessage.includes('econnrefused') ||
    errorMessage.includes('econnreset') ||
    errorMessage.includes('enotfound') ||
    errorCode === 'econnrefused' ||
    errorCode === 'econnreset' ||
    errorCode === 'enotfound' ||
    errorCode === 'econnaborted'
  ) {
    return true;
  }

  // HTTP status codes
  const status = error?.response?.status || error?.status || error?.statusCode;
  if (status) {
    // Retry on server errors (5xx)
    if (status >= 500 && status < 600) {
      return true;
    }

    // Retry on specific client errors
    if (
      status === 408 || // Request Timeout
      status === 429 || // Too Many Requests
      status === 502 || // Bad Gateway
      status === 503 || // Service Unavailable
      status === 504    // Gateway Timeout
    ) {
      return true;
    }

    // Don't retry on other 4xx errors (client errors)
    if (status >= 400 && status < 500) {
      return false;
    }
  }

  // Default: don't retry unknown errors
  return false;
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: any): boolean {
  const errorMessage = error?.message?.toLowerCase() || '';
  return (
    errorMessage.includes('network') ||
    errorMessage.includes('fetch failed') ||
    errorMessage.includes('connection')
  );
}

/**
 * Check if error is a timeout error
 */
export function isTimeoutError(error: any): boolean {
  const errorMessage = error?.message?.toLowerCase() || '';
  return (
    errorMessage.includes('timeout') ||
    errorMessage.includes('aborted') ||
    error?.code === 'ECONNABORTED'
  );
}

/**
 * Check if error is a rate limit error
 */
export function isRateLimitError(error: any): boolean {
  const status = error?.response?.status || error?.status;
  const errorMessage = error?.message?.toLowerCase() || '';
  return (
    status === 429 ||
    errorMessage.includes('rate limit') ||
    errorMessage.includes('too many requests')
  );
}

/**
 * Check if error is a server error (5xx)
 */
export function isServerError(error: any): boolean {
  const status = error?.response?.status || error?.status;
  return status >= 500 && status < 600;
}

/**
 * Check if error is a client error (4xx)
 */
export function isClientError(error: any): boolean {
  const status = error?.response?.status || error?.status;
  return status >= 400 && status < 500;
}

// ============================================================================
// Retry Logic
// ============================================================================

/**
 * Calculate exponential backoff delay with jitter
 */
export function calculateDelay(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  const {
    initialDelay = 1000,
    maxDelay = 8000,
    backoffMultiplier = 2,
    jitter = true,
  } = config;

  // Calculate exponential delay
  let delay = initialDelay * Math.pow(backoffMultiplier, attempt);

  // Cap at max delay
  delay = Math.min(delay, maxDelay);

  // Add jitter (±25% randomness)
  if (jitter) {
    const jitterAmount = delay * 0.25;
    delay = delay - jitterAmount + Math.random() * (jitterAmount * 2);
  }

  return Math.round(delay);
}

/**
 * Sleep/delay for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const mergedConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  const {
    maxRetries,
    shouldRetry,
    onRetry,
    enableLogging,
  } = mergedConfig;

  const stats: RetryStats = {
    attemptCount: 0,
    totalDelay: 0,
    errors: [],
    startTime: Date.now(),
    success: false,
  };

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    stats.attemptCount++;

    try {
      if (enableLogging && attempt > 0) {
      }

      // Execute the function
      const result = await fn();

      // Success!
      stats.success = true;
      stats.endTime = Date.now();

      if (enableLogging && attempt > 0) {
      }

      return result;

    } catch (error) {
      lastError = error;

      // Record error
      stats.errors.push({
        attempt,
        error,
        timestamp: Date.now(),
      });

      if (enableLogging) {
      }

      // Check if we should retry
      const canRetry = shouldRetry(error, attempt);
      const isLastAttempt = attempt >= maxRetries;

      if (!canRetry || isLastAttempt) {
        stats.endTime = Date.now();

        if (enableLogging) {
          if (isLastAttempt) {
          } else {
          }
        }

        throw error;
      }

      // Calculate delay before retry
      const delay = calculateDelay(attempt, mergedConfig);
      stats.totalDelay += delay;

      if (enableLogging) {
      }

      // Call onRetry callback
      if (onRetry) {
        onRetry(error, attempt + 1, delay);
      }

      // Wait before retrying
      await sleep(delay);
    }
  }

  // Should never reach here, but TypeScript needs it
  stats.endTime = Date.now();
  throw lastError;
}

/**
 * Retry an API call and return ApiResponse format
 */
export async function retryApiCall<T>(
  fn: () => Promise<ApiResponse<T>>,
  config: RetryConfig = {}
): Promise<ApiResponse<T>> {
  try {
    return await retryWithBackoff(fn, {
      ...config,
      shouldRetry: (error, attempt) => {
        // For API responses, check the error structure
        if (error?.success === false) {
          // Check HTTP status from error message or response
          const status = error?.response?.status || error?.status;
          if (status) {
            return isRetryableError({ status }, attempt);
          }
        }

        // Fallback to standard retry logic
        return config.shouldRetry
          ? config.shouldRetry(error, attempt)
          : isRetryableError(error, attempt);
      },
    });
  } catch (error: any) {
    // Convert to ApiResponse format
    return {
      success: false,
      error: error?.message || 'Request failed after retries',
      message: error?.message || 'Request failed after retries',
    };
  }
}

/**
 * Create a retry wrapper for any async function
 */
export function createRetryWrapper<TArgs extends any[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  config: RetryConfig = {}
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    return retryWithBackoff(() => fn(...args), config);
  };
}

// ============================================================================
// Request Timeout
// ============================================================================

/**
 * Add timeout to a promise
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string = 'Request timeout'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error(timeoutMessage));
      }, timeoutMs);
    }),
  ]);
}

/**
 * Create a fetch with timeout
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

// ============================================================================
// Retry Statistics
// ============================================================================

/**
 * Format retry stats for logging
 */
export function formatRetryStats(stats: RetryStats): string {
  const duration = stats.endTime
    ? stats.endTime - stats.startTime
    : Date.now() - stats.startTime;

  return [
    `Retry Statistics:`,
    `  Attempts: ${stats.attemptCount}`,
    `  Success: ${stats.success}`,
    `  Total Delay: ${stats.totalDelay}ms`,
    `  Total Duration: ${duration}ms`,
    `  Errors: ${stats.errors.length}`,
  ].join('\n');
}

// ============================================================================
// Presets
// ============================================================================

/**
 * Aggressive retry for critical operations
 */
export const AGGRESSIVE_RETRY_CONFIG: RetryConfig = {
  maxRetries: 5,
  initialDelay: 500,
  maxDelay: 10000,
  backoffMultiplier: 2,
  jitter: true,
  timeout: 60000,
};

/**
 * Conservative retry for rate-limited operations
 */
export const CONSERVATIVE_RETRY_CONFIG: RetryConfig = {
  maxRetries: 2,
  initialDelay: 2000,
  maxDelay: 5000,
  backoffMultiplier: 2.5,
  jitter: false,
  timeout: 30000,
};

/**
 * Fast retry for quick operations
 */
export const FAST_RETRY_CONFIG: RetryConfig = {
  maxRetries: 2,
  initialDelay: 300,
  maxDelay: 1000,
  backoffMultiplier: 2,
  jitter: true,
  timeout: 10000,
};

/**
 * No retry config (for testing or specific cases)
 */
export const NO_RETRY_CONFIG: RetryConfig = {
  maxRetries: 0,
  initialDelay: 0,
  maxDelay: 0,
  backoffMultiplier: 1,
  jitter: false,
  timeout: 30000,
};

// ============================================================================
// Export
// ============================================================================

export default {
  retryWithBackoff,
  retryApiCall,
  createRetryWrapper,
  withTimeout,
  fetchWithTimeout,
  calculateDelay,
  sleep,
  isRetryableError,
  isNetworkError,
  isTimeoutError,
  isRateLimitError,
  isServerError,
  isClientError,
  formatRetryStats,
  DEFAULT_RETRY_CONFIG,
  AGGRESSIVE_RETRY_CONFIG,
  CONSERVATIVE_RETRY_CONFIG,
  FAST_RETRY_CONFIG,
  NO_RETRY_CONFIG,
};
