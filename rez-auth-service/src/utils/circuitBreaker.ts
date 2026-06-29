/**
 * Circuit Breaker Utility for Auth Service
 *
 * A production-ready implementation of the Circuit Breaker pattern to protect
 * against cascading failures in external service calls.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Circuit is tripped, requests fail fast without executing
 * - HALF_OPEN: Testing if the dependency has recovered
 *
 * Usage:
 * ```typescript
 * const breaker = new CircuitBreaker({
 *   name: 'rez-mind',
 *   failureThreshold: 5,
 *   resetTimeout: 30000,
 * });
 *
 * const result = await breaker.execute(async () => {
 *   return await axios.post(url, data);
 * });
 * ```
 */

import { logger } from '../config/logger';

// ============================================================================
// Types & Interfaces
// ============================================================================

/** Circuit breaker states */
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/** Configuration options for the circuit breaker */
export interface CircuitBreakerConfig {
  /** Unique name for the circuit breaker (used for logging and metrics) */
  name: string;

  /** Number of consecutive failures before opening the circuit (default: 5) */
  failureThreshold?: number;

  /** Percentage of failures that triggers opening (default: 50) */
  failureRateThreshold?: number;

  /** Request timeout in milliseconds (default: 10000) */
  timeout?: number;

  /** Time in ms before attempting recovery (default: 30000) */
  resetTimeout?: number;

  /** Maximum requests allowed in half-open state (default: 3) */
  halfOpenMaxRequests?: number;

  /** Called when circuit state changes */
  onStateChange?: (state: CircuitState) => void;

  /** Called on successful request completion */
  onSuccess?: (duration: number) => void;

  /** Called on request failure */
  onFailure?: (error: Error, duration: number) => void;
}

/** Statistics collected by the circuit breaker */
export interface CircuitBreakerStats {
  failures: number;
  successes: number;
  timeouts: number;
  shortCircuits: number;
  halfOpenAttempts: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  state: CircuitState;
  lastStateChange?: number;
  lastFailure?: number;
  lastSuccess?: number;
  failureRate: number;
  shouldAttemptReset: boolean;
}

/** Error thrown when circuit breaker is open */
export class CircuitBreakerError extends Error {
  public readonly circuitState: CircuitState;
  public readonly serviceName: string;
  public readonly shortCircuitedAt: number;

  constructor(serviceName: string, circuitState: CircuitState, message?: string) {
    const defaultMessage = `[CircuitBreaker:${serviceName}] Circuit is ${circuitState}`;
    super(message || defaultMessage);
    this.name = 'CircuitBreakerError';
    this.circuitState = circuitState;
    this.serviceName = serviceName;
    this.shortCircuitedAt = Date.now();
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Circuit Breaker class
 */
export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private consecutiveFailures = 0;
  private consecutiveSuccesses = 0;
  private lastFailureTime = 0;
  private lastSuccessTime = 0;
  private lastStateChangeTime = 0;
  private halfOpenRequests = 0;
  private resetTimer?: ReturnType<typeof setTimeout>;

  private readonly name: string;
  private readonly failureThreshold: number;
  private readonly failureRateThreshold: number;
  private readonly timeout: number;
  private readonly resetTimeout: number;
  private readonly halfOpenMaxRequests: number;

  private readonly onStateChange?: (state: CircuitState) => void;
  private readonly onSuccess?: (duration: number) => void;
  private readonly onFailure?: (error: Error, duration: number) => void;

  constructor(config: CircuitBreakerConfig) {
    this.name = config.name;
    this.failureThreshold = config.failureThreshold ?? 5;
    this.failureRateThreshold = config.failureRateThreshold ?? 50;
    this.timeout = config.timeout ?? 10000;
    this.resetTimeout = config.resetTimeout ?? 30000;
    this.halfOpenMaxRequests = config.halfOpenMaxRequests ?? 3;

    this.onStateChange = config.onStateChange;
    this.onSuccess = config.onSuccess;
    this.onFailure = config.onFailure;

    logger.info(`[CircuitBreaker:${this.name}] Initialized`, {
      failureThreshold: this.failureThreshold,
      failureRateThreshold: this.failureRateThreshold,
      timeout: this.timeout,
      resetTimeout: this.resetTimeout,
      halfOpenMaxRequests: this.halfOpenMaxRequests,
    });
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>, fallback?: () => T | Promise<T>): Promise<T> {
    const startTime = Date.now();

    // Check if circuit should attempt reset from OPEN to HALF_OPEN
    if (this.state === 'OPEN' && this.shouldAttemptReset()) {
      this.transitionTo('HALF_OPEN');
    }

    // Short-circuit if circuit is open
    if (this.state === 'OPEN') {
      this.recordShortCircuit();
      const error = new CircuitBreakerError(this.name, this.state);

      if (fallback) {
        logger.warn(`[CircuitBreaker:${this.name}] Circuit OPEN, using fallback`, {
          elapsed: Date.now() - startTime,
        });
        try {
          const result = await Promise.resolve(fallback());
          this.recordSuccess(Date.now() - startTime);
          return result;
        } catch (fallbackError) {
          logger.error(`[CircuitBreaker:${this.name}] Fallback failed`, {
            error: (fallbackError as Error).message,
          });
          throw fallbackError;
        }
      }

      logger.warn(`[CircuitBreaker:${this.name}] Circuit OPEN, request rejected`, {
        elapsed: Date.now() - startTime,
      });
      throw error;
    }

    // Limit half-open requests
    if (this.state === 'HALF_OPEN' && this.halfOpenRequests >= this.halfOpenMaxRequests) {
      this.recordShortCircuit();
      const error = new CircuitBreakerError(this.name, this.state);
      throw error;
    }

    // Increment half-open counter if in half-open state
    if (this.state === 'HALF_OPEN') {
      this.halfOpenRequests++;
    }

    try {
      const result = await this.executeWithTimeout(fn);
      const duration = Date.now() - startTime;
      this.recordSuccess(duration);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const err = error as Error;

      if (err.name === 'TimeoutError' || err.message?.includes('timeout')) {
        this.recordTimeout();
      } else {
        this.recordFailure(err, duration);
      }

      throw error;
    }
  }

  private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(
          new Error(`[CircuitBreaker:${this.name}] Request timed out after ${this.timeout}ms`)
        );
      }, this.timeout);

      fn()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private recordSuccess(duration: number): void {
    this.successCount++;
    this.consecutiveSuccesses++;
    this.consecutiveFailures = 0;
    this.lastSuccessTime = Date.now();

    this.onSuccess?.(duration);

    // In half-open state, close the circuit after successful requests
    if (this.state === 'HALF_OPEN') {
      if (this.consecutiveSuccesses >= this.halfOpenMaxRequests) {
        logger.info(`[CircuitBreaker:${this.name}] Recovery successful, closing circuit`, {
          consecutiveSuccesses: this.consecutiveSuccesses,
        });
        this.transitionTo('CLOSED');
      }
    }
  }

  private recordFailure(error: Error, duration: number): void {
    this.failureCount++;
    this.consecutiveFailures++;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = Date.now();

    this.onFailure?.(error, duration);

    const shouldOpen =
      this.consecutiveFailures >= this.failureThreshold ||
      this.calculateFailureRate() >= this.failureRateThreshold;

    if (shouldOpen && this.state === 'CLOSED') {
      logger.error(`[CircuitBreaker:${this.name}] Failure threshold exceeded, opening circuit`, {
        consecutiveFailures: this.consecutiveFailures,
        failureRate: this.calculateFailureRate().toFixed(2),
        lastError: error.message,
      });
      this.transitionTo('OPEN');
    }
  }

  private recordTimeout(): void {
    this.failureCount++;
    this.consecutiveFailures++;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = Date.now();

    if (this.consecutiveFailures >= this.failureThreshold && this.state === 'CLOSED') {
      logger.error(`[CircuitBreaker:${this.name}] Timeout threshold exceeded, opening circuit`, {
        consecutiveFailures: this.consecutiveFailures,
      });
      this.transitionTo('OPEN');
    }
  }

  private recordShortCircuit(): void {
    // Metrics recording would go here if prom-client is available
  }

  private calculateFailureRate(): number {
    const total = this.failureCount + this.successCount;
    if (total === 0) return 0;
    return (this.failureCount / total) * 100;
  }

  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastFailureTime >= this.resetTimeout;
  }

  private transitionTo(newState: CircuitState): void {
    const previousState = this.state;
    this.state = newState;
    this.lastStateChangeTime = Date.now();

    if (newState === 'CLOSED') {
      this.failureCount = 0;
      this.successCount = 0;
      this.consecutiveFailures = 0;
      this.consecutiveSuccesses = 0;
      this.halfOpenRequests = 0;
    }

    if (newState === 'HALF_OPEN') {
      this.halfOpenRequests = 0;
    }

    if (newState === 'OPEN') {
      this.scheduleReset();
    }

    if (newState === 'CLOSED' && this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = undefined;
    }

    logger.info(`[CircuitBreaker:${this.name}] State transition: ${previousState} -> ${newState}`);
    this.onStateChange?.(newState);
  }

  private scheduleReset(): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }

    this.resetTimer = setTimeout(() => {
      logger.info(`[CircuitBreaker:${this.name}] Reset timeout elapsed, preparing to test`, {
        resetTimeout: this.resetTimeout,
      });
    }, this.resetTimeout);
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats(): CircuitBreakerStats {
    return {
      failures: this.failureCount,
      successes: this.successCount,
      timeouts: 0,
      shortCircuits: 0,
      halfOpenAttempts: this.halfOpenRequests,
      consecutiveFailures: this.consecutiveFailures,
      consecutiveSuccesses: this.consecutiveSuccesses,
      state: this.state,
      lastStateChange: this.lastStateChangeTime || undefined,
      lastFailure: this.lastFailureTime || undefined,
      lastSuccess: this.lastSuccessTime || undefined,
      failureRate: this.calculateFailureRate(),
      shouldAttemptReset: this.state === 'OPEN' && this.shouldAttemptReset(),
    };
  }

  forceState(state: CircuitState): void {
    logger.warn(`[CircuitBreaker:${this.name}] Manual state override: ${this.state} -> ${state}`);
    this.transitionTo(state);
  }

  reset(): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = undefined;
    }
    this.transitionTo('CLOSED');
  }

  isAllowingRequests(): boolean {
    return this.state !== 'OPEN' || (this.state === 'OPEN' && this.shouldAttemptReset());
  }
}

// ============================================================================
// Singleton Registry
// ============================================================================

const circuitRegistry = new Map<string, CircuitBreaker>();

const defaultConfigs: Record<string, Partial<CircuitBreakerConfig>> = {
  'rez-mind': {
    name: 'rez-mind',
    failureThreshold: 3,
    failureRateThreshold: 50,
    resetTimeout: 60000,
    timeout: 10000,
  },
  'email-resend': {
    name: 'email-resend',
    failureThreshold: 3,
    failureRateThreshold: 50,
    resetTimeout: 30000,
    timeout: 15000,
  },
  'otp-queue': {
    name: 'otp-queue',
    failureThreshold: 5,
    failureRateThreshold: 50,
    resetTimeout: 30000,
    timeout: 5000,
  },
  default: {
    name: 'default',
    failureThreshold: 5,
    failureRateThreshold: 50,
    resetTimeout: 30000,
    timeout: 10000,
  },
};

export function getCircuitBreaker(
  name: string,
  config?: Partial<CircuitBreakerConfig>
): CircuitBreaker {
  const cached = circuitRegistry.get(name);
  if (cached) return cached;

  const defaultConfig = defaultConfigs[name] || defaultConfigs.default;
  const mergedConfig: CircuitBreakerConfig = {
    ...defaultConfig,
    ...config,
    name,
  };

  const circuit = new CircuitBreaker(mergedConfig);
  circuitRegistry.set(name, circuit);

  logger.info(`[CircuitBreaker:${name}] Created new circuit breaker instance`);

  return circuit;
}

export const getCircuit = getCircuitBreaker;

export function getAllCircuitBreakers(): Map<string, CircuitBreaker> {
  return new Map(circuitRegistry);
}

export function getAllCircuitBreakerStats(): Record<string, CircuitBreakerStats> {
  const stats: Record<string, CircuitBreakerStats> = {};

  circuitRegistry.forEach((circuit, name) => {
    stats[name] = circuit.getStats();
  });

  return stats;
}

export function clearCircuitBreaker(name: string): boolean {
  const circuit = circuitRegistry.get(name);
  if (circuit) {
    circuit.reset();
    return circuitRegistry.delete(name);
  }
  return false;
}

export function clearAllCircuitBreakers(): void {
  circuitRegistry.forEach(circuit => circuit.reset());
  circuitRegistry.clear();
}

// ============================================================================
// Pre-configured instances
// ============================================================================

export const rezMindCircuit = getCircuitBreaker('rez-mind');
export const emailCircuit = getCircuitBreaker('email-resend');
export const otpQueueCircuit = getCircuitBreaker('otp-queue');

export default CircuitBreaker;
