/**
 * Retry Strategy Utilities
 *
 * Provides intelligent retry logic for bill upload operations including:
 * - Exponential backoff
 * - Circuit breaker pattern
 * - Retry configuration
 * - Error classification for retryability
 */

import { BillUploadErrorType, isRetryableError } from './billUploadErrors';

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterMs?: number; // Add randomness to prevent thundering herd
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000, // 1 second
  maxDelayMs: 8000, // 8 seconds
  backoffMultiplier: 2, // Double delay each time
  jitterMs: 500, // Add up to 500ms random delay
};

/**
 * Aggressive retry config for critical operations
 */
export const AGGRESSIVE_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 5,
  initialDelayMs: 500,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  jitterMs: 1000,
};

/**
 * Conservative retry config for rate-limited operations
 */
export const CONSERVATIVE_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 2,
  initialDelayMs: 2000,
  maxDelayMs: 5000,
  backoffMultiplier: 2.5,
  jitterMs: 0,
};

/**
 * Retry attempt information
 */
export interface RetryAttempt {
  attemptNumber: number;
  totalAttempts: number;
  delayMs: number;
  error?: any;
  timestamp: number;
}

/**
 * Retry result
 */
export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: any;
  attempts: RetryAttempt[];
  totalDurationMs: number;
}

/**
 * Calculate delay for next retry using exponential backoff
 *
 * @param attemptNumber - Current attempt number (0-indexed)
 * @param config - Retry configuration
 * @returns Delay in milliseconds
 *
 * @example
 * calculateBackoffDelay(0, DEFAULT_RETRY_CONFIG) // ~1000ms
 * calculateBackoffDelay(1, DEFAULT_RETRY_CONFIG) // ~2000ms
 * calculateBackoffDelay(2, DEFAULT_RETRY_CONFIG) // ~4000ms
 */
export function calculateBackoffDelay(
  attemptNumber: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  // Calculate exponential delay
  const exponentialDelay =
    config.initialDelayMs * Math.pow(config.backoffMultiplier, attemptNumber);

  // Cap at maximum delay
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);

  // Add jitter to prevent thundering herd
  const jitter = config.jitterMs
    ? Math.random() * config.jitterMs
    : 0;

  return Math.round(cappedDelay + jitter);
}

/**
 * Get delays for all retry attempts
 *
 * @param config - Retry configuration
 * @returns Array of delays in milliseconds
 *
 * @example
 * getRetryDelays(DEFAULT_RETRY_CONFIG) // [1000, 2000, 4000]
 */
export function getRetryDelays(config: RetryConfig = DEFAULT_RETRY_CONFIG): number[] {
  const delays: number[] = [];

  for (let i = 0; i < config.maxAttempts; i++) {
    delays.push(calculateBackoffDelay(i, config));
  }

  return delays;
}

/**
 * Sleep for a specified duration
 *
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after delay
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if an error is retryable based on error type or code
 *
 * @param error - Error object or error type
 * @returns True if the operation should be retried
 */
export function shouldRetry(error: any): boolean {
  // Check if it's a BillUploadErrorType
  if (typeof error === 'string' && Object.values(BillUploadErrorType).includes(error as BillUploadErrorType)) {
    return isRetryableError(error as BillUploadErrorType);
  }

  // Check error object properties
  if (error && typeof error === 'object') {
    // Check error type property
    if (error.type && isRetryableError(error.type)) {
      return true;
    }

    // Network errors are generally retryable
    if (error.message) {
      const message = error.message.toLowerCase();
      if (
        message.includes('network') ||
        message.includes('timeout') ||
        message.includes('connection') ||
        message.includes('econnreset') ||
        message.includes('enotfound')
      ) {
        return true;
      }
    }

    // HTTP status codes
    if (error.statusCode || error.status) {
      const status = error.statusCode || error.status;
      // Retry on server errors and some client errors
      return (
        status === 408 || // Request Timeout
        status === 429 || // Too Many Requests (with backoff)
        status === 502 || // Bad Gateway
        status === 503 || // Service Unavailable
        status === 504    // Gateway Timeout
      );
    }

    // Check for retryable flag
    if (error.isRetryable !== undefined) {
      return error.isRetryable;
    }
  }

  // Default to not retrying unknown errors
  return false;
}

/**
 * Execute a function with retry logic
 *
 * @param fn - Async function to execute
 * @param config - Retry configuration
 * @param onRetry - Optional callback on each retry
 * @returns Promise with retry result
 *
 * @example
 * const result = await retryWithBackoff(
 *   () => uploadBill(billData),
 *   DEFAULT_RETRY_CONFIG,
 * );
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  onRetry?: (attempt: RetryAttempt) => void
): Promise<RetryResult<T>> {
  const startTime = Date.now();
  const attempts: RetryAttempt[] = [];
  let lastError: any;

  for (let i = 0; i < config.maxAttempts; i++) {
    const attemptStartTime = Date.now();

    try {
      // Execute the function
      const result = await fn();

      // Success!
      const attempt: RetryAttempt = {
        attemptNumber: i,
        totalAttempts: i + 1,
        delayMs: 0,
        timestamp: attemptStartTime,
      };
      attempts.push(attempt);

      return {
        success: true,
        data: result,
        attempts,
        totalDurationMs: Date.now() - startTime,
      };
    } catch (error) {
      lastError = error;

      // Record the attempt
      const delayMs = calculateBackoffDelay(i, config);
      const attempt: RetryAttempt = {
        attemptNumber: i,
        totalAttempts: config.maxAttempts,
        delayMs,
        error,
        timestamp: attemptStartTime,
      };
      attempts.push(attempt);

      // Check if we should retry
      const isLastAttempt = i === config.maxAttempts - 1;
      const canRetry = shouldRetry(error);

      if (!canRetry || isLastAttempt) {
        // No more retries
        return {
          success: false,
          error: lastError,
          attempts,
          totalDurationMs: Date.now() - startTime,
        };
      }

      // Notify about retry
      if (onRetry) {
        onRetry(attempt);
      }

      // Wait before retrying
      await sleep(delayMs);
    }
  }

  // This shouldn't be reached, but just in case
  return {
    success: false,
    error: lastError,
    attempts,
    totalDurationMs: Date.now() - startTime,
  };
}

/**
 * Circuit Breaker State
 */
export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Failing, reject immediately
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

/**
 * Circuit Breaker Configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening
  successThreshold: number; // Successes needed to close from half-open
  timeout: number; // Time to wait before moving to half-open (ms)
  monitoringPeriod: number; // Time window for tracking failures (ms)
}

/**
 * Default circuit breaker configuration
 */
export const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5, // Open after 5 failures
  successThreshold: 2, // Close after 2 successes
  timeout: 60000, // 1 minute
  monitoringPeriod: 120000, // 2 minutes
};

/**
 * Circuit Breaker Implementation
 *
 * Prevents cascading failures by stopping requests to a failing service
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private nextAttemptTime: number = 0;
  private recentFailures: number[] = [];

  constructor(
    private config: CircuitBreakerConfig = DEFAULT_CIRCUIT_CONFIG,
    private name: string = 'default'
  ) {}

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    // Check if we should transition from OPEN to HALF_OPEN
    if (this.state === CircuitState.OPEN && Date.now() >= this.nextAttemptTime) {
      this.state = CircuitState.HALF_OPEN;
      this.successCount = 0;
    }

    return this.state;
  }

  /**
   * Check if request should be allowed
   */
  canExecute(): boolean {
    const state = this.getState();

    if (state === CircuitState.OPEN) {
      return false;
    }

    return true;
  }

  /**
   * Record a successful execution
   */
  recordSuccess(): void {
    this.failureCount = 0;
    this.recentFailures = [];

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;

      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
      }
    }
  }

  /**
   * Record a failed execution
   */
  recordFailure(): void {
    const now = Date.now();
    this.lastFailureTime = now;
    this.recentFailures.push(now);

    // Remove old failures outside monitoring period
    this.recentFailures = this.recentFailures.filter(
      (time) => now - time < this.config.monitoringPeriod
    );

    this.failureCount = this.recentFailures.length;

    if (this.state === CircuitState.HALF_OPEN) {
      // Failed during testing, go back to OPEN
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = now + this.config.timeout;
      this.successCount = 0;
    } else if (this.failureCount >= this.config.failureThreshold) {
      // Too many failures, open the circuit
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = now + this.config.timeout;
    }
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.canExecute()) {
      throw new Error(
        `Circuit breaker '${this.name}' is OPEN. Service is temporarily unavailable.`
      );
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Reset circuit breaker to initial state
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    this.nextAttemptTime = 0;
    this.recentFailures = [];
  }

  /**
   * Get circuit breaker stats
   */
  getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
      recentFailures: this.recentFailures.length,
    };
  }
}

/**
 * Global circuit breaker instance for bill uploads
 */
export const billUploadCircuitBreaker = new CircuitBreaker(
  {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 30000, // 30 seconds
    monitoringPeriod: 60000, // 1 minute
  },
  'billUpload'
);

/**
 * Combine retry logic with circuit breaker
 *
 * @param fn - Function to execute
 * @param circuitBreaker - Circuit breaker instance
 * @param retryConfig - Retry configuration
 * @returns Promise with result
 */
export async function executeWithRetryAndCircuitBreaker<T>(
  fn: () => Promise<T>,
  circuitBreaker: CircuitBreaker = billUploadCircuitBreaker,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  // Check circuit breaker first
  if (!circuitBreaker.canExecute()) {
    const stats = circuitBreaker.getStats();
    throw new Error(
      `Service temporarily unavailable. Circuit breaker is ${stats.state}. ` +
      `Next attempt allowed at ${new Date(stats.nextAttemptTime).toLocaleTimeString()}`
    );
  }

  // Execute with retry logic
  const result = await retryWithBackoff(
    () => circuitBreaker.execute(fn),
    retryConfig
  );

  if (!result.success) {
    throw result.error;
  }

  return result.data as T;
}

/**
 * Format retry information for display
 *
 * @param attempt - Retry attempt information
 * @returns Formatted string
 */
export function formatRetryAttempt(attempt: RetryAttempt): string {
  return `Attempt ${attempt.attemptNumber + 1}/${attempt.totalAttempts} failed. ` +
    `Retrying in ${(attempt.delayMs / 1000).toFixed(1)}s...`;
}
