/**
 * Circuit Breaker Service — ARJUN's Infra Hardening
 *
 * Implements the circuit breaker pattern to prevent cascading failures.
 * Tracks failure rates and automatically opens (stops requests) when
 * failure threshold is exceeded, then gradually transitions to half-open
 * state to probe if the service has recovered.
 *
 * States:
 *   CLOSED (normal) — requests pass through, failures are tracked
 *   OPEN (failing) — fast-fail, reject all requests immediately
 *   HALF_OPEN (recovering) — allow probe requests to test recovery
 *
 * Configuration: See CircuitBreakerConfig interface
 */

import { logger } from '../config/logger';

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',      // Normal operation
  OPEN = 'OPEN',          // Failing, reject requests
  HALF_OPEN = 'HALF_OPEN' // Testing recovery
}

export interface CircuitBreakerConfig {
  // Failure threshold: open circuit if failure rate exceeds this %
  failureThreshold: number; // e.g., 50 for 50%

  // Minimum requests before evaluating failure threshold
  // Prevents opening on a single failure
  minRequests: number; // e.g., 10

  // Time in ms before transitioning from OPEN to HALF_OPEN
  resetTimeout: number; // e.g., 30000 for 30s

  // Maximum requests allowed in HALF_OPEN state
  // Limits probe requests while testing recovery
  maxProbeRequests: number; // e.g., 3

  // Exponential backoff multiplier for reset timeout
  // Each time circuit opens, next reset delay = previous * backoffMultiplier
  backoffMultiplier: number; // e.g., 2.0
}

export interface CircuitBreakerStatus {
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  totalRequests: number;
  failureRate: number;
  lastFailureTime?: Date;
  nextResetTime?: Date;
}

/**
 * Circuit Breaker class
 * Usage: new CircuitBreaker('redis', { failureThreshold: 50, ... })
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private probeRequests: number = 0;
  private lastFailureTime?: Date;
  private nextResetTime?: Date;
  private resetTimeoutId?: NodeJS.Timeout;
  private currentResetTimeout: number;

  constructor(
    private name: string,
    private config: CircuitBreakerConfig
  ) {
    this.currentResetTimeout = config.resetTimeout;
    logger.info(`[CircuitBreaker] ${name} initialized`, {
      state: this.state,
      failureThreshold: config.failureThreshold,
      resetTimeout: config.resetTimeout,
    });
  }

  /**
   * Record a successful request
   */
  public recordSuccess(): void {
    this.successCount++;

    // ARJUN: Auto-heal when in HALF_OPEN state
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.probeRequests++;
      logger.info(`[CircuitBreaker] ${this.name} probe success (${this.probeRequests}/${this.config.maxProbeRequests})`, {
        state: this.state,
      });

      // Close circuit if enough successful probes
      if (this.probeRequests >= this.config.maxProbeRequests) {
        this.close();
      }
    }
  }

  /**
   * Record a failed request
   * Returns true if circuit should open, false if still within threshold
   */
  public recordFailure(): boolean {
    this.failureCount++;
    this.lastFailureTime = new Date();

    // ARJUN: Immediate fail-open in HALF_OPEN state (one failure closes recovery)
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      logger.warn(`[CircuitBreaker] ${this.name} probe failed — reopening circuit`, {
        probeRequests: this.probeRequests,
      });
      this.open();
      return true; // Reject request
    }

    // Evaluate if we should open
    if (this.state === CircuitBreakerState.CLOSED) {
      const failureRate = this.getFailureRate();
      const totalRequests = this.failureCount + this.successCount;

      if (totalRequests >= this.config.minRequests && failureRate > this.config.failureThreshold) {
        logger.error(`[CircuitBreaker] ${this.name} threshold exceeded`, {
          failureRate: `${failureRate.toFixed(1)}%`,
          failureThreshold: this.config.failureThreshold,
          totalRequests,
        });
        this.open();
        return true; // Reject request
      }
    }

    return false; // Request allowed
  }

  /**
   * Check if circuit is open (reject requests immediately)
   */
  public isOpen(): boolean {
    return this.state === CircuitBreakerState.OPEN;
  }

  /**
   * Manually close the circuit (reset state)
   */
  private close(): void {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.probeRequests = 0;
    this.nextResetTime = undefined;
    this.currentResetTimeout = this.config.resetTimeout;

    logger.info(`[CircuitBreaker] ${this.name} circuit CLOSED (recovered)`, {
      state: this.state,
    });
  }

  /**
   * Open the circuit (start rejecting requests)
   * Schedules transition to HALF_OPEN after resetTimeout
   */
  private open(): void {
    if (this.state === CircuitBreakerState.OPEN) {
      return; // Already open
    }

    this.state = CircuitBreakerState.OPEN;
    this.nextResetTime = new Date(Date.now() + this.currentResetTimeout);
    this.probeRequests = 0;

    logger.error(`[CircuitBreaker] ${this.name} circuit OPEN (failing)`, {
      state: this.state,
      nextResetIn: `${this.currentResetTimeout}ms`,
    });

    // ARJUN: Schedule transition to HALF_OPEN with exponential backoff
    // If service keeps failing, reset timeouts increase to avoid hammering it
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    this.resetTimeoutId = setTimeout(() => {
      this.transitionToHalfOpen();
      // Increase timeout for next cycle (exponential backoff)
      this.currentResetTimeout = Math.min(
        this.currentResetTimeout * this.config.backoffMultiplier,
        300000 // Cap at 5 minutes
      );
    }, this.currentResetTimeout);
  }

  /**
   * Transition from OPEN to HALF_OPEN (probe state)
   */
  private transitionToHalfOpen(): void {
    this.state = CircuitBreakerState.HALF_OPEN;
    this.failureCount = 0;
    this.successCount = 0;
    this.probeRequests = 0;

    logger.warn(`[CircuitBreaker] ${this.name} circuit HALF_OPEN (testing recovery)`, {
      state: this.state,
      maxProbeRequests: this.config.maxProbeRequests,
    });
  }

  /**
   * Get current failure rate (0-100)
   */
  public getFailureRate(): number {
    const total = this.failureCount + this.successCount;
    if (total === 0) return 0;
    return (this.failureCount / total) * 100;
  }

  /**
   * Get circuit status
   */
  public getStatus(): CircuitBreakerStatus {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalRequests: this.failureCount + this.successCount,
      failureRate: this.getFailureRate(),
      lastFailureTime: this.lastFailureTime,
      nextResetTime: this.nextResetTime,
    };
  }

  /**
   * Cleanup on shutdown
   */
  public destroy(): void {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }
}

/**
 * Global circuit breaker registry
 * Usage: CircuitBreakerRegistry.get('redis')
 */
export class CircuitBreakerRegistry {
  private static breakers = new Map<string, CircuitBreaker>();

  static create(
    name: string,
    config: Partial<CircuitBreakerConfig> = {}
  ): CircuitBreaker {
    const defaultConfig: CircuitBreakerConfig = {
      failureThreshold: 50,          // Open if >50% failures
      minRequests: 10,               // Evaluate after 10 requests
      resetTimeout: 30000,           // 30 seconds before probing
      maxProbeRequests: 3,           // Allow 3 successful probes to close
      backoffMultiplier: 2.0,        // Double timeout on each failure cycle
    };

    const breaker = new CircuitBreaker(name, { ...defaultConfig, ...config });
    this.breakers.set(name, breaker);
    return breaker;
  }

  static get(name: string): CircuitBreaker | undefined {
    return this.breakers.get(name);
  }

  static getAll(): Record<string, any> {
    const result: Record<string, any> = {};
    this.breakers.forEach((breaker, name) => {
      result[name] = breaker.getStatus();
    });
    return result;
  }

  static destroy(name: string): void {
    const breaker = this.breakers.get(name);
    if (breaker) {
      breaker.destroy();
      this.breakers.delete(name);
    }
  }

  static destroyAll(): void {
    this.breakers.forEach((breaker) => breaker.destroy());
    this.breakers.clear();
  }
}

export default {
  CircuitBreaker,
  CircuitBreakerRegistry,
  CircuitBreakerState,
};
