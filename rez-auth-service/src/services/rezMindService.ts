/**
 * REZ Mind Integration Service - Auth Service
 * Sends auth events to Event Platform
 *
 * Protected by circuit breaker to prevent cascading failures when REZ Mind is unavailable.
 */

import axios from 'axios';
import { logger } from '../config/logger';
import { rezMindCircuit, CircuitBreakerError } from '../utils/circuitBreaker';

const REZ_MIND_URL = process.env.REZ_MIND_URL || 'http://localhost:4008';

// Circuit breaker timeout for REZ Mind calls (5 seconds)
const REZ_MIND_TIMEOUT_MS = parseInt(process.env.REZ_MIND_TIMEOUT_MS || '5000', 10);

interface AuthSignupEvent {
  user_id: string;
  method: 'email' | 'google' | 'phone' | 'apple';
}

interface AuthLoginEvent {
  user_id: string;
  method: 'email' | 'google' | 'phone' | 'apple';
  success: boolean;
}

interface AuthLogoutEvent {
  user_id: string;
}

/**
 * Execute REZ Mind API call with circuit breaker protection
 */
async function withCircuitBreaker<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  return rezMindCircuit.execute(operation, () => {
    logger.warn(`[REZ Mind] Circuit breaker fallback for: ${operationName}`);
    return undefined as T;
  });
}

export async function sendAuthSignupToRezMind(event: AuthSignupEvent): Promise<void> {
  try {
    await withCircuitBreaker(async () => {
      const response = await axios.post(
        `${REZ_MIND_URL}/webhook/auth/signup`,
        {
          user_id: event.user_id,
          method: event.method,
          source: 'auth_service',
        },
        { timeout: REZ_MIND_TIMEOUT_MS }
      );
      return response.data;
    }, 'signup');
    logger.info('[REZ Mind] Auth signup event sent', { user_id: event.user_id });
  } catch (error) {
    if (error instanceof CircuitBreakerError) {
      logger.warn('[REZ Mind] Circuit breaker open, signup event dropped', {
        user_id: event.user_id,
      });
      return;
    }
    const err = error as { message?: string };
    logger.warn('[REZ Mind] Failed to send auth signup', {
      user_id: event.user_id,
      error: err.message,
    });
  }
}

export async function sendAuthLoginToRezMind(event: AuthLoginEvent): Promise<void> {
  try {
    await withCircuitBreaker(async () => {
      const response = await axios.post(
        `${REZ_MIND_URL}/webhook/auth/login`,
        {
          user_id: event.user_id,
          method: event.method,
          success: event.success,
          source: 'auth_service',
        },
        { timeout: REZ_MIND_TIMEOUT_MS }
      );
      return response.data;
    }, 'login');
    logger.info('[REZ Mind] Auth login event sent', {
      user_id: event.user_id,
      success: event.success,
    });
  } catch (error) {
    if (error instanceof CircuitBreakerError) {
      logger.warn('[REZ Mind] Circuit breaker open, login event dropped', {
        user_id: event.user_id,
      });
      return;
    }
    const err = error as { message?: string };
    logger.warn('[REZ Mind] Failed to send auth login', {
      user_id: event.user_id,
      error: err.message,
    });
  }
}

export async function sendAuthLogoutToRezMind(event: AuthLogoutEvent): Promise<void> {
  try {
    await withCircuitBreaker(async () => {
      const response = await axios.post(
        `${REZ_MIND_URL}/webhook/auth/logout`,
        {
          user_id: event.user_id,
          source: 'auth_service',
        },
        { timeout: REZ_MIND_TIMEOUT_MS }
      );
      return response.data;
    }, 'logout');
    logger.info('[REZ Mind] Auth logout event sent', { user_id: event.user_id });
  } catch (error) {
    if (error instanceof CircuitBreakerError) {
      logger.warn('[REZ Mind] Circuit breaker open, logout event dropped', {
        user_id: event.user_id,
      });
      return;
    }
    const err = error as { message?: string };
    logger.warn('[REZ Mind] Failed to send auth logout', {
      user_id: event.user_id,
      error: err.message,
    });
  }
}
