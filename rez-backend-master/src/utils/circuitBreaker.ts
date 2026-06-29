/**
 * Circuit Breaker Utility
 *
 * A production-ready implementation of the Circuit Breaker pattern to protect
 * against cascading failures in external service calls, database connections,
 * and other critical dependencies.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Circuit is tripped, requests fail fast without executing
 * - HALF_OPEN: Testing if the dependency has recovered
 *
 * Usage:
 * ```typescript
 * const breaker = new CircuitBreaker({
 *   name: 'payment-service',
 *   failureThreshold: 5,
 *   resetTimeout: 30000,
 * });
 *
 * const result = await breaker.execute(async () => {
 *   return await paymentApi.charge(amount);
 * });
 * ```
 *
 * Or use the singleton factory:
 * ```typescript
 * import { getCircuitBreaker } from './circuitBreaker';
 * const breaker = getCircuitBreaker('razorpay');
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

  /** Called when a request times out */
  onTimeout?: () => void;
}

/** Statistics collected by the circuit breaker */
export interface CircuitBreakerStats {
  /** Total number of failures */
  failures: number;

  /** Total number of successes */
  successes: number;

  /** Total number of timeouts */
  timeouts: number;

  /** Total number of requests that were short-circuited (rejected while OPEN) */
  shortCircuits: number;

  /** Total number of half-open attempts */
  halfOpenAttempts: number;

  /** Number of consecutive failures */
  consecutiveFailures: number;

  /** Number of consecutive successes */
  consecutiveSuccesses: number;

  /** Current circuit state */
  state: CircuitState;

  /** Timestamp of last state change */
  lastStateChange?: number;

  /** Timestamp of last failure */
  lastFailure?: number;

  /** Timestamp of last success */
  lastSuccess?: number;

  /** Current failure rate percentage */
  failureRate: number;

  /** Whether the circuit should attempt to close */
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

// ============================================================================
// Prometheus Metrics (optional - gracefully degrade if prom-client unavailable)
// ============================================================================

let promMetrics: {
  failures: any;
  successes: any;
  timeouts: any;
  shortCircuits: any;
  stateChanges: any;
  duration: any;
} | null = null;

try {
  // Dynamic import to handle missing prom-client gracefully
  const promClient = require('prom-client');
  const register = promClient.register;

  promMetrics = {
    failures: new promClient.Counter({
      name: 'circuit_breaker_failures_total',
      help: 'Total number of circuit breaker failures',
      labelNames: ['name'],
      registers: [register],
    }),

    successes: new promClient.Counter({
      name: 'circuit_breaker_successes_total',
      help: 'Total number of circuit breaker successes',
      labelNames: ['name'],
      registers: [register],
    }),

    timeouts: new promClient.Counter({
      name: 'circuit_breaker_timeouts_total',
      help: 'Total number of circuit breaker timeouts',
      labelNames: ['name'],
      registers: [register],
    }),

    shortCircuits: new promClient.Counter({
      name: 'circuit_breaker_short_circuits_total',
      help: 'Total number of requests short-circuited due to open circuit',
      labelNames: ['name'],
      registers: [register],
    }),

    stateChanges: new promClient.Counter({
      name: 'circuit_breaker_state_changes_total',
      help: 'Total number of circuit state changes',
      labelNames: ['name', 'from_state', 'to_state'],
      registers: [register],
    }),

    duration: new promClient.Histogram({
      name: 'circuit_breaker_request_duration_seconds',
      help: 'Duration of circuit breaker requests in seconds',
      labelNames: ['name', 'status'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
      registers: [register],
    }),
  };
} catch {
  // prom-client not available, metrics will be disabled
  logger.debug('[CircuitBreaker] prom-client not available, metrics disabled');
}

// ============================================================================
// Circuit Breaker Implementation
// ============================================================================

/**
 * Circuit Breaker class
 *
 * Implements the Circuit Breaker pattern to prevent cascading failures
 * when a dependency becomes unresponsive.
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
  private resetTimer?: NodeJS.Timeout;

  // Configuration
  private readonly name: string;
  private readonly failureThreshold: number;
  private readonly failureRateThreshold: number;
  private readonly timeout: number;
  private readonly resetTimeout: number;
  private readonly halfOpenMaxRequests: number;

  // Event callbacks
  private readonly onStateChange?: (state: CircuitState) => void;
  private readonly onSuccess?: (duration: number) => void;
  private readonly onFailure?: (error: Error, duration: number) => void;
  private readonly onTimeout?: () => void;

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
    this.onTimeout = config.onTimeout;

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
   *
   * @param fn - The async function to execute
   * @param fallback - Optional fallback function to call when circuit is open
   * @returns The result of the function call
   * @throws CircuitBreakerError when circuit is open and no fallback provided
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

      // Record metrics
      if (promMetrics) {
        promMetrics.successes.inc({ name: this.name });
        promMetrics.duration.observe({ name: this.name, status: 'success' }, duration / 1000);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const err = error as Error;

      // Check if it's a timeout
      if (err.name === 'TimeoutError' || err.message?.includes('timeout')) {
        this.recordTimeout();
        this.onTimeout?.();

        if (promMetrics) {
          promMetrics.timeouts.inc({ name: this.name });
          promMetrics.duration.observe({ name: this.name, status: 'timeout' }, duration / 1000);
        }
      } else {
        this.recordFailure(err, duration);

        if (promMetrics) {
          promMetrics.failures.inc({ name: this.name });
          promMetrics.duration.observe({ name: this.name, status: 'failure' }, duration / 1000);
        }
      }

      throw error;
    }
  }

  /** Alias for execute() — used by payment/SMS/email services */
  exec<T>(fn: () => Promise<T>, fallback?: () => T | Promise<T>): Promise<T> {
    return this.execute(fn, fallback);
  }

  /**
   * Execute function with timeout wrapper
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`[CircuitBreaker:${this.name}] Request timed out after ${this.timeout}ms`));
      }, this.timeout);

      fn()
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Record a successful request
   */
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

  /**
   * Record a failed request
   */
  private recordFailure(error: Error, duration: number): void {
    this.failureCount++;
    this.consecutiveFailures++;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = Date.now();

    this.onFailure?.(error, duration);

    // Check if we should open the circuit
    const shouldOpen =
      this.consecutiveFailures >= this.failureThreshold || this.calculateFailureRate() >= this.failureRateThreshold;

    if (shouldOpen && this.state === 'CLOSED') {
      logger.error(`[CircuitBreaker:${this.name}] Failure threshold exceeded, opening circuit`, {
        consecutiveFailures: this.consecutiveFailures,
        failureRate: this.calculateFailureRate().toFixed(2),
        lastError: error.message,
      });
      this.transitionTo('OPEN');
    }
  }

  /**
   * Record a timeout
   */
  private recordTimeout(): void {
    // Timeouts count as failures for circuit breaker purposes
    this.failureCount++;
    this.consecutiveFailures++;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = Date.now();

    // Check if we should open the circuit due to timeout accumulation
    if (this.consecutiveFailures >= this.failureThreshold && this.state === 'CLOSED') {
      logger.error(`[CircuitBreaker:${this.name}] Timeout threshold exceeded, opening circuit`, {
        consecutiveFailures: this.consecutiveFailures,
      });
      this.transitionTo('OPEN');
    }
  }

  /**
   * Record a short-circuited request
   */
  private recordShortCircuit(): void {
    if (promMetrics) {
      promMetrics.shortCircuits.inc({ name: this.name });
    }
  }

  /**
   * Calculate current failure rate percentage
   */
  private calculateFailureRate(): number {
    const total = this.failureCount + this.successCount;
    if (total === 0) return 0;
    return (this.failureCount / total) * 100;
  }

  /**
   * Check if enough time has passed to attempt reset
   */
  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastFailureTime >= this.resetTimeout;
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitState): void {
    const previousState = this.state;
    this.state = newState;
    this.lastStateChangeTime = Date.now();

    // Reset counters when transitioning to CLOSED
    if (newState === 'CLOSED') {
      this.failureCount = 0;
      this.successCount = 0;
      this.consecutiveFailures = 0;
      this.consecutiveSuccesses = 0;
      this.halfOpenRequests = 0;
    }

    // Reset half-open counters when transitioning to HALF_OPEN
    if (newState === 'HALF_OPEN') {
      this.halfOpenRequests = 0;
    }

    // Schedule automatic reset if opening
    if (newState === 'OPEN') {
      this.scheduleReset();
    }

    // Clear reset timer if closing
    if (newState === 'CLOSED' && this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = undefined;
    }

    // Record metrics
    if (promMetrics) {
      promMetrics.stateChanges.inc({
        name: this.name,
        from_state: previousState,
        to_state: newState,
      });
    }

    // Log the transition
    logger.info(`[CircuitBreaker:${this.name}] State transition: ${previousState} -> ${newState}`);

    // Fire callback
    this.onStateChange?.(newState);
  }

  /**
   * Schedule automatic reset attempt
   */
  private scheduleReset(): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }

    this.resetTimer = setTimeout(() => {
      logger.info(`[CircuitBreaker:${this.name}] Reset timeout elapsed, preparing to test`, {
        resetTimeout: this.resetTimeout,
      });
      // The actual transition to HALF_OPEN happens on the next execute() call
      // This ensures thread-safety and allows for gradual traffic increase
    }, this.resetTimeout);
  }

  /**
   * Get the current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get detailed statistics about the circuit breaker
   */
  getStats(): CircuitBreakerStats {
    return {
      failures: this.failureCount,
      successes: this.successCount,
      timeouts: 0, // Track separately if needed
      shortCircuits: 0, // Track separately if needed
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

  /**
   * Force the circuit to a specific state (useful for manual intervention)
   */
  forceState(state: CircuitState): void {
    logger.warn(`[CircuitBreaker:${this.name}] Manual state override: ${this.state} -> ${state}`);
    this.transitionTo(state);
  }

  /**
   * Reset the circuit breaker to initial state
   */
  reset(): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = undefined;
    }
    this.transitionTo('CLOSED');
  }

  /**
   * Check if the circuit is allowing requests
   */
  isAllowingRequests(): boolean {
    return this.state !== 'OPEN' || (this.state === 'OPEN' && this.shouldAttemptReset());
  }
}

// ============================================================================
// Singleton Registry
// ============================================================================

/** Internal registry of circuit breaker instances */
const circuitRegistry = new Map<string, CircuitBreaker>();

/** Default configurations for known services */
const defaultConfigs: Record<string, Partial<CircuitBreakerConfig>> = {
  razorpay: {
    name: 'razorpay',
    failureThreshold: 3,
    failureRateThreshold: 50,
    resetTimeout: 60000,
    timeout: 15000,
  },
  twilio: {
    name: 'twilio',
    failureThreshold: 3,
    failureRateThreshold: 50,
    resetTimeout: 30000,
    timeout: 10000,
  },
  'twilio-push': {
    name: 'twilio-push',
    failureThreshold: 5,
    failureRateThreshold: 50,
    resetTimeout: 60000,
    timeout: 8000,
  },
  cloudinary: {
    name: 'cloudinary',
    failureThreshold: 5,
    failureRateThreshold: 50,
    resetTimeout: 30000,
    timeout: 30000,
  },
  stripe: {
    name: 'stripe',
    failureThreshold: 3,
    failureRateThreshold: 50,
    resetTimeout: 60000,
    timeout: 15000,
  },
  sendgrid: {
    name: 'sendgrid',
    failureThreshold: 3,
    failureRateThreshold: 50,
    resetTimeout: 30000,
    timeout: 15000,
  },
  'expo-push': {
    name: 'expo-push',
    failureThreshold: 5,
    failureRateThreshold: 50,
    resetTimeout: 30000,
    timeout: 10000,
  },
  'auth-service': {
    name: 'auth-service',
    failureThreshold: 5,
    failureRateThreshold: 50,
    resetTimeout: 30000,
    timeout: 5000,
  },
  redis: {
    name: 'redis',
    failureThreshold: 3,
    failureRateThreshold: 50,
    resetTimeout: 10000,
    timeout: 5000,
  },
  database: {
    name: 'database',
    failureThreshold: 5,
    failureRateThreshold: 50,
    resetTimeout: 30000,
    timeout: 10000,
  },
  'external-api': {
    name: 'external-api',
    failureThreshold: 5,
    failureRateThreshold: 50,
    resetTimeout: 30000,
    timeout: 10000,
  },
  'ocr-provider': {
    name: 'ocr-provider',
    failureThreshold: 3,
    failureRateThreshold: 50,
    resetTimeout: 30000,
    timeout: 30000,
  },
  'geocoding-provider': {
    name: 'geocoding-provider',
    failureThreshold: 3,
    failureRateThreshold: 50,
    resetTimeout: 30000,
    timeout: 10000,
  },
  default: {
    name: 'default',
    failureThreshold: 5,
    failureRateThreshold: 50,
    resetTimeout: 30000,
    timeout: 10000,
  },
};

/**
 * Get or create a circuit breaker instance for a service
 *
 * Returns the same instance for the same service name (singleton pattern).
 *
 * @param name - The name of the service
 * @param config - Optional custom configuration (merged with defaults)
 * @returns The circuit breaker instance
 */
export function getCircuitBreaker(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
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

/**
 * Alias for getCircuitBreaker for convenience
 */
export const getCircuit = getCircuitBreaker;

/**
 * Get all registered circuit breakers
 */
export function getAllCircuitBreakers(): Map<string, CircuitBreaker> {
  return new Map(circuitRegistry);
}

/**
 * Get stats for all registered circuit breakers
 */
export function getAllCircuitBreakerStats(): Record<string, CircuitBreakerStats> {
  const stats: Record<string, CircuitBreakerStats> = {};

  circuitRegistry.forEach((circuit, name) => {
    stats[name] = circuit.getStats();
  });

  return stats;
}

/**
 * Clear a specific circuit breaker from the registry
 */
export function clearCircuitBreaker(name: string): boolean {
  const circuit = circuitRegistry.get(name);
  if (circuit) {
    circuit.reset();
    return circuitRegistry.delete(name);
  }
  return false;
}

/**
 * Clear all circuit breakers from the registry
 */
export function clearAllCircuitBreakers(): void {
  circuitRegistry.forEach((circuit) => circuit.reset());
  circuitRegistry.clear();
}

/**
 * Check if prometheus metrics are enabled
 */
export function isMetricsEnabled(): boolean {
  return promMetrics !== null;
}

// ============================================================================
// Pre-configured instances for common services
// ============================================================================

export const razorpayCircuit = getCircuitBreaker('razorpay');
export const twilioCircuit = getCircuitBreaker('twilio');
export const cloudinaryCircuit = getCircuitBreaker('cloudinary');
export const stripeCircuit = getCircuitBreaker('stripe');
export const sendgridCircuit = getCircuitBreaker('sendgrid');
export const redisCircuit = getCircuitBreaker('redis');
export const databaseCircuit = getCircuitBreaker('database');
export const ocrCircuit = getCircuitBreaker('ocr-provider');
export const geocodingCircuit = getCircuitBreaker('geocoding-provider');

// ============================================================================
// Exports
// ============================================================================

export default CircuitBreaker;
