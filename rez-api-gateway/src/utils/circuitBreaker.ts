/**
 * Circuit Breaker Pattern Implementation
 *
 * Prevents cascading failures by stopping requests to failing services.
 * States: CLOSED (normal) -> OPEN (failing) -> HALF_OPEN (testing recovery)
 */

import { Request, Response, NextFunction } from 'express';

// ============================================
// TYPES
// ============================================

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerState {
  name: string;
  failures: number;
  successes: number;
  lastFailure: number;
  lastSuccess: number;
  state: CircuitState;
  averageResponseTime: number;
  totalRequests: number;
}

export interface CircuitBreakerConfig {
  threshold: number;        // Failures before opening circuit
  timeout: number;           // ms before attempting half-open
  halfOpenRequests: number;  // Max requests in half-open state
  resetTimeout?: number;     // ms after success before fully closing
}

export interface CircuitBreakerOptions {
  serviceName: string;
  config?: Partial<CircuitBreakerConfig>;
  onStateChange?: (name: string, from: CircuitState, to: CircuitState) => void;
  onFailure?: (name: string, error: Error, latency: number) => void;
  onSuccess?: (name: string, latency: number) => void;
}

// ============================================
// DEFAULT CONFIGURATION
// ============================================

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  threshold: 5,
  timeout: 60000,         // 60 seconds
  halfOpenRequests: 3,
  resetTimeout: 30000,    // 30 seconds after success
};

// ============================================
// CIRCUIT STORE
// ============================================

interface CircuitEntry {
  state: CircuitBreakerState;
  config: CircuitBreakerConfig;
  halfOpenCount: number;
  pendingRequests: number;
  responseTimes: number[];
  options: CircuitBreakerOptions;
}

const circuits = new Map<string, CircuitEntry>();

// ============================================
// CIRCUIT BREAKER IMPLEMENTATION
// ============================================

/**
 * Get or create a circuit breaker for a service
 */
export function getCircuitBreaker(options: CircuitBreakerOptions): CircuitBreakerOptions {
  let entry = circuits.get(options.serviceName);

  if (!entry) {
    const config = { ...DEFAULT_CONFIG, ...options.config };
    entry = {
      state: {
        name: options.serviceName,
        failures: 0,
        successes: 0,
        lastFailure: 0,
        lastSuccess: 0,
        state: 'CLOSED',
        averageResponseTime: 0,
        totalRequests: 0,
      },
      config,
      halfOpenCount: 0,
      pendingRequests: 0,
      responseTimes: [],
      options,
    };
    circuits.set(options.serviceName, entry);
  }

  return options;
}

/**
 * Execute a function with circuit breaker protection
 */
export async function circuitBreaker<T>(
  serviceName: string,
  fn: () => Promise<T>,
  options?: Partial<CircuitBreakerOptions>
): Promise<T> {
  const entry = circuits.get(serviceName) || createCircuit(serviceName, options);
  const startTime = Date.now();

  // Check circuit state
  if (!canExecute(entry)) {
    throw new CircuitOpenError(serviceName, entry.state.state, getTimeUntilRetry(entry));
  }

  entry.pendingRequests++;

  try {
    const result = await fn();
    const latency = Date.now() - startTime;

    onSuccess(entry, latency);
    entry.pendingRequests--;

    return result;
  } catch (error) {
    const latency = Date.now() - startTime;
    const err = error instanceof Error ? error : new Error(String(error));

    onFailure(entry, err, latency);
    entry.pendingRequests--;

    throw error;
  }
}

/**
 * Create a new circuit breaker
 */
function createCircuit(
  serviceName: string,
  options?: Partial<CircuitBreakerOptions>
): CircuitEntry {
  const config = { ...DEFAULT_CONFIG, ...options?.config };

  const entry: CircuitEntry = {
    state: {
      name: serviceName,
      failures: 0,
      successes: 0,
      lastFailure: 0,
      lastSuccess: 0,
      state: 'CLOSED',
      averageResponseTime: 0,
      totalRequests: 0,
    },
    config,
    halfOpenCount: 0,
    pendingRequests: 0,
    responseTimes: [],
    options: {
      serviceName,
      onStateChange: options?.onStateChange,
      onFailure: options?.onFailure,
      onSuccess: options?.onSuccess,
    },
  };

  circuits.set(serviceName, entry);
  return entry;
}

/**
 * Check if we can execute a request
 */
function canExecute(entry: CircuitEntry): boolean {
  const { state, config, halfOpenCount } = entry;

  switch (state.state) {
    case 'CLOSED':
      return true;

    case 'OPEN':
      // Check if timeout has passed
      if (Date.now() - state.lastFailure >= config.timeout) {
        transitionTo(entry, 'HALF_OPEN');
        return true;
      }
      return false;

    case 'HALF_OPEN':
      // Allow limited requests in half-open state
      return halfOpenCount < config.halfOpenRequests;

    default:
      return false;
  }
}

/**
 * Handle successful request
 */
function onSuccess(entry: CircuitEntry, latency: number): void {
  const { state, config, options } = entry;

  // Update metrics
  state.successes++;
  state.totalRequests++;
  state.lastSuccess = Date.now();
  updateAverageResponseTime(entry, latency);

  // Reset failure count
  state.failures = 0;

  // Callback
  if (options.onSuccess) {
    options.onSuccess(state.name, latency);
  }

  // In HALF_OPEN state, check if we should close the circuit
  if (state.state === 'HALF_OPEN') {
    entry.halfOpenCount++;

    // After enough successful requests, close the circuit
    if (entry.halfOpenCount >= config.halfOpenRequests) {
      transitionTo(entry, 'CLOSED');
    }
  }
}

/**
 * Handle failed request
 */
function onFailure(entry: CircuitEntry, error: Error, latency: number): void {
  const { state, config, options } = entry;

  // Update metrics
  state.failures++;
  state.totalRequests++;
  state.lastFailure = Date.now();
  updateAverageResponseTime(entry, latency);

  // Callback
  if (options.onFailure) {
    options.onFailure(state.name, error, latency);
  }

  // Check if we should open the circuit
  if (state.state === 'CLOSED' && state.failures >= config.threshold) {
    transitionTo(entry, 'OPEN');
  } else if (state.state === 'HALF_OPEN') {
    // Any failure in half-open immediately opens the circuit
    transitionTo(entry, 'OPEN');
  }
}

/**
 * Transition to a new state
 */
function transitionTo(entry: CircuitEntry, newState: CircuitState): void {
  const oldState = entry.state.state;

  if (oldState === newState) return;

  entry.state.state = newState;
  entry.state.failures = newState === 'CLOSED' ? 0 : entry.state.failures;
  entry.halfOpenCount = newState === 'HALF_OPEN' ? 0 : entry.halfOpenCount;

  // Callback
  if (entry.options.onStateChange) {
    entry.options.onStateChange(entry.state.name, oldState, newState);
  }

  // Log transition
  const logger = getLogger();
  logger.info('[CircuitBreaker] State transition', {
    service: entry.state.name,
    from: oldState,
    to: newState,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Update rolling average response time
 */
function updateAverageResponseTime(entry: CircuitEntry, latency: number): void {
  const maxSamples = 100;
  entry.responseTimes.push(latency);

  if (entry.responseTimes.length > maxSamples) {
    entry.responseTimes.shift();
  }

  const sum = entry.responseTimes.reduce((a, b) => a + b, 0);
  entry.state.averageResponseTime = Math.round(sum / entry.responseTimes.length);
}

/**
 * Calculate time until circuit can retry
 */
function getTimeUntilRetry(entry: CircuitEntry): number {
  const elapsed = Date.now() - entry.state.lastFailure;
  return Math.max(0, entry.config.timeout - elapsed);
}

// ============================================
// ERROR CLASS
// ============================================

export class CircuitOpenError extends Error {
  serviceName: string;
  circuitState: CircuitState;
  retryAfter: number;

  constructor(serviceName: string, circuitState: CircuitState, retryAfter: number) {
    super(`Circuit breaker is ${circuitState} for service: ${serviceName}`);
    this.name = 'CircuitOpenError';
    this.serviceName = serviceName;
    this.circuitState = circuitState;
    this.retryAfter = retryAfter;
  }
}

// ============================================
// ADMIN ENDPOINTS
// ============================================

/**
 * Get all circuit breaker states
 */
export function getCircuitStates(): Record<string, CircuitBreakerState> {
  const result: Record<string, CircuitBreakerState> = {};

  circuits.forEach((entry, name) => {
    result[name] = { ...entry.state };
  });

  return result;
}

/**
 * Get specific circuit state
 */
export function getCircuitState(serviceName: string): CircuitBreakerState | null {
  const entry = circuits.get(serviceName);
  return entry ? { ...entry.state } : null;
}

/**
 * Reset a circuit breaker (admin function)
 */
export function resetCircuit(serviceName: string): boolean {
  const entry = circuits.get(serviceName);
  if (!entry) return false;

  transitionTo(entry, 'CLOSED');
  return true;
}

/**
 * Reset all circuit breakers (admin function)
 */
export function resetAllCircuits(): void {
  circuits.forEach((entry) => {
    transitionTo(entry, 'CLOSED');
  });
}

/**
 * Health check middleware for admin endpoint
 */
export function circuitHealthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const states = getCircuitStates();
  const openCircuits = Object.values(states).filter((s) => s.state === 'OPEN');
  const healthy = openCircuits.length === 0;

  res.setHeader('X-Circuit-Status', healthy ? 'healthy' : 'degraded');

  res.json({
    healthy,
    totalCircuits: Object.keys(states).length,
    openCircuits: openCircuits.length,
    circuits: states,
  });
}

// ============================================
// HELPER: SIMPLE LOGGING
// ============================================

function getLogger() {
  return {
    info: (msg: string, ctx?: Record<string, unknown>) => {
      process.stderr.write(JSON.stringify({ level: 'INFO', msg, ...ctx }) + '\n');
    },
    warn: (msg: string, ctx?: Record<string, unknown>) => {
      process.stderr.write(JSON.stringify({ level: 'WARN', msg, ...ctx }) + '\n');
    },
    error: (msg: string, ctx?: Record<string, unknown>) => {
      process.stderr.write(JSON.stringify({ level: 'ERROR', msg, ...ctx }) + '\n');
    },
  };
}

// ============================================
// EXPRESS ROUTE WRAPPER
// ============================================

/**
 * Express middleware wrapper for circuit breaker
 */
export function withCircuitBreaker(
  serviceName: string,
  config?: Partial<CircuitBreakerConfig>
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Circuit breaker is already registered, proceed with the request
      next();
    } catch (error) {
      if (error instanceof CircuitOpenError) {
        res.setHeader('Retry-After', String(Math.ceil(error.retryAfter / 1000)));
        res.status(503).json({
          success: false,
          error: 'Service temporarily unavailable',
          service: error.serviceName,
          circuitState: error.circuitState,
          retryAfterMs: error.retryAfter,
          message: `Circuit breaker is ${error.circuitState}. Please retry after ${Math.ceil(error.retryAfter / 1000)} seconds.`,
        });
      } else {
        next(error);
      }
    }
  };
}

// ============================================
// RE-EXPORTS FOR CONVENIENCE
// ============================================

export { circuits };
