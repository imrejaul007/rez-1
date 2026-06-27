/**
 * Timeout utility for wrapping promises with configurable timeouts
 */

/**
 * Custom error class for timeout errors
 */
export class TimeoutError extends Error {
  public readonly timeout: number;
  public readonly operation?: string;

  constructor(timeout: number, operation?: string) {
    const message = operation
      ? `Operation "${operation}" timed out after ${timeout}ms`
      : `Operation timed out after ${timeout}ms`;
    super(message);
    this.name = 'TimeoutError';
    this.timeout = timeout;
    this.operation = operation;

    // Maintains proper stack trace for where error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TimeoutError);
    }
  }
}

/**
 * Options for the withTimeout function
 */
export interface TimeoutOptions<T = unknown> {
  /** Timeout in milliseconds */
  timeout: number;
  /** Optional fallback value or function to call on timeout */
  fallback?: T | (() => T);
  /** Custom error message for better debugging */
  fallbackError?: string;
  /** Operation name for better error messages */
  operation?: string;
}

/**
 * Wraps a promise with a timeout.
 * Throws TimeoutError if the promise doesn't resolve within the timeout.
 * Returns the fallback value if provided and timeout occurs.
 *
 * @example
 * // Simple timeout
 * const result = await withTimeout(fetchData(), 5000);
 *
 * @example
 * // With fallback
 * const result = await withTimeout(fetchData(), {
 *   timeout: 5000,
 *   fallback: () => getCachedData()
 * });
 *
 * @example
 * // With operation name
 * const result = await withTimeout(fetchData(), {
 *   timeout: 5000,
 *   fallbackError: 'Payment gateway timed out',
 *   operation: 'payment-gateway'
 * });
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  options: number | TimeoutOptions<T>
): Promise<T> {
  // Normalize options to consistent format
  const normalizedOptions: TimeoutOptions<T> = typeof options === 'number'
    ? { timeout: options }
    : options;

  const { timeout, fallback, fallbackError, operation } = normalizedOptions;

  // Create a timeout promise that rejects
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new TimeoutError(timeout, operation));
    }, timeout);
  });

  try {
    // Race between the original promise and the timeout
    return await Promise.race([promise, timeoutPromise]);
  } catch (error) {
    // If timeout occurred and a fallback is provided, return it
    if (error instanceof TimeoutError && fallback !== undefined) {
      // Handle both fallback as value and fallback as function
      return typeof fallback === 'function' ? fallback() : fallback;
    }

    // If it's a TimeoutError but no fallback, throw with custom message if provided
    if (error instanceof TimeoutError && fallbackError) {
      const customError = new TimeoutError(timeout, operation);
      customError.message = fallbackError;
      throw customError;
    }

    // Re-throw the original error (could be TimeoutError or original promise rejection)
    throw error;
  }
}

/**
 * Creates a timeout promise that resolves after the specified duration.
 * Useful for implementing retries or polling.
 *
 * @param ms - Duration in milliseconds
 * @returns Promise that resolves after the timeout
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Creates a debounced version of a function that delays execution.
 * Cancels any pending execution when called again within the timeout.
 *
 * @param fn - Function to debounce
 * @param wait - Delay in milliseconds
 * @returns Debounced function with a cancel method
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  wait: number
): T & { cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const debouncedFn = (...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, wait);
  };

  (debouncedFn as T & { cancel: () => void }).cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debouncedFn as T & { cancel: () => void };
}
