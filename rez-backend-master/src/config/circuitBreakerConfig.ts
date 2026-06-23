// @ts-nocheck
/**
 * Circuit Breaker Configuration
 *
 * Protects against cascading failures in:
 * - Redis connections
 * - Database queries
 * - External API calls
 *
 * Usage:
 * ```typescript
 * const breakers = initializeCircuitBreakers(redis, mongoose);
 * (app as any).circuitBreakers = breakers;
 * ```
 */

import { Redis } from 'ioredis';
import mongoose from 'mongoose';
import axios from 'axios';
import { logger } from './logger';

export interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  successCount: number;
  lastFailureTime?: Date;
}

/**
 * Simple circuit breaker implementation
 */
export class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: Date;
  private readonly failureThreshold: number;
  private readonly resetTimeout: number;
  private resetTimer?: NodeJS.Timeout;

  constructor(
    private readonly name: string,
    private readonly testFn: () => Promise<any>,
    private readonly onFailure?: (error: Error) => void,
  ) {
    this.failureThreshold = parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD || '50', 10);
    this.resetTimeout = parseInt(process.env.CIRCUIT_BREAKER_RESET || '30000', 10);
  }

  async call<T>(fallback?: () => T): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN';
        this.failureCount = 0;
        this.successCount = 0;
      } else {
        throw new Error(`Circuit breaker [${this.name}] is OPEN`);
      }
    }

    try {
      const result = await this.testFn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onError(error as Error);

      if (fallback) {
        logger.warn(`[CircuitBreaker] ${this.name} using fallback`, {
          error: (error as Error).message,
        });
        return fallback();
      }

      throw error;
    }
  }

  private onSuccess() {
    this.successCount++;

    if (this.state === 'HALF_OPEN') {
      logger.info(`[CircuitBreaker] ${this.name} recovered`, { successCount: this.successCount });
      this.reset();
    }
  }

  private onError(error: Error) {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.onFailure) {
      this.onFailure(error);
    }

    const failureRate = (this.failureCount / (this.failureCount + this.successCount)) * 100;

    if (failureRate >= this.failureThreshold) {
      logger.warn(`[CircuitBreaker] ${this.name} OPEN`, {
        failureRate: `${failureRate.toFixed(2)}%`,
        failureCount: this.failureCount,
      });
      this.state = 'OPEN';
      this.scheduleReset();
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return true;
    return Date.now() - this.lastFailureTime.getTime() >= this.resetTimeout;
  }

  private scheduleReset() {
    if (this.resetTimer) clearTimeout(this.resetTimer);

    this.resetTimer = setTimeout(() => {
      logger.info(`[CircuitBreaker] ${this.name} attempting reset`, {
        resetTimeout: this.resetTimeout,
      });
      // Will be set to HALF_OPEN on next call
    }, this.resetTimeout);
  }

  private reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;

    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = undefined;
    }

    logger.info(`[CircuitBreaker] ${this.name} CLOSED`, { reset: true });
  }

  getStatus(): CircuitBreakerState {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

/**
 * Initialize all circuit breakers
 */
export function initializeCircuitBreakers(redis: Redis, mongooseInstance: typeof mongoose) {
  const breakers = {
    redis: new CircuitBreaker(
      'Redis',
      async () => {
        await redis.ping();
      },
      (error) => {
        logger.error('[CircuitBreaker] Redis failed', { error: error.message });
      },
    ),

    database: new CircuitBreaker(
      'Database',
      async () => {
        if (mongooseInstance.connection.db) {
          await mongooseInstance.connection.db.admin().ping();
        }
      },
      (error) => {
        logger.error('[CircuitBreaker] Database failed', { error: error.message });
      },
    ),

    externalApi: new CircuitBreaker(
      'ExternalAPI',
      async () => {
        // Generic health check for external APIs
        // In production, ping a critical external service
        await Promise.resolve();
      },
      (error) => {
        logger.error('[CircuitBreaker] External API failed', { error: error.message });
      },
    ),
  };

  logger.info('[CircuitBreakers] All circuit breakers initialized');

  return breakers;
}

/**
 * Get all circuit breaker statuses
 */
export function getCircuitBreakerStatus(breakers: ReturnType<typeof initializeCircuitBreakers>) {
  const status: Record<string, CircuitBreakerState> = {};

  for (const [name, breaker] of Object.entries(breakers)) {
    status[name] = breaker.getStatus();
  }

  return status;
}
