/**
 * Simple Circuit Breaker
 *
 * States: CLOSED (normal) → OPEN (failing, fast-fail) → HALF_OPEN (test one request)
 * No external dependency — lightweight implementation for wrapping external API calls.
 */

import { logger } from '../config/logger';

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerOptions {
  failureThreshold?: number;  // Failures before opening (default: 5)
  resetTimeoutMs?: number;    // Time before trying again (default: 30s)
  name?: string;              // Name for logging
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly name: string;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 30000;
    this.name = options.name ?? 'unknown';
  }

  async exec<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      // Check if reset timeout has elapsed → transition to HALF_OPEN
      if (Date.now() - this.lastFailureTime >= this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error(`[CircuitBreaker:${this.name}] Circuit is OPEN — service unavailable`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      logger.info(`[CircuitBreaker:${this.name}] Recovery confirmed — circuit CLOSED`);
    }
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      logger.error(`[CircuitBreaker:${this.name}] Threshold reached (${this.failureCount}) — circuit OPEN`);
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}

// Pre-configured circuit breakers for external services
export const razorpayCircuit = new CircuitBreaker({ name: 'razorpay', failureThreshold: 3, resetTimeoutMs: 60000 });
export const twilioCircuit = new CircuitBreaker({ name: 'twilio', failureThreshold: 3, resetTimeoutMs: 30000 });
export const cloudinaryCircuit = new CircuitBreaker({ name: 'cloudinary', failureThreshold: 5, resetTimeoutMs: 30000 });
export const stripeCircuit = new CircuitBreaker({ name: 'stripe', failureThreshold: 3, resetTimeoutMs: 60000 });

// Phase 4 stub replacement: lazy registry. Each service name gets a CircuitBreaker with
// sensible defaults cached in a Map. Returns the same instance for the same name.
const _circuitRegistry = new Map<string, CircuitBreaker>();
const _defaultThresholds: Record<string, { failureThreshold: number; resetTimeoutMs: number }> = {
  razorpay: { failureThreshold: 3, resetTimeoutMs: 60000 },
  twilio: { failureThreshold: 3, resetTimeoutMs: 30000 },
  cloudinary: { failureThreshold: 5, resetTimeoutMs: 30000 },
  stripe: { failureThreshold: 3, resetTimeoutMs: 60000 },
  sendgrid: { failureThreshold: 3, resetTimeoutMs: 30000 },
  'auth-service': { failureThreshold: 5, resetTimeoutMs: 30000 },
  backend: { failureThreshold: 5, resetTimeoutMs: 30000 },
  default: { failureThreshold: 5, resetTimeoutMs: 60000 },
};

export const getCircuit = (name: string): CircuitBreaker => {
  const cached = _circuitRegistry.get(name);
  if (cached) return cached;
  const config = _defaultThresholds[name] || _defaultThresholds.default;
  const circuit = new CircuitBreaker({ name, ...config });
  _circuitRegistry.set(name, circuit);
  return circuit;
};
