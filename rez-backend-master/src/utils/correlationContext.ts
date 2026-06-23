/**
 * correlationContext.ts
 *
 * Thin module that owns the AsyncLocalStorage for request correlation IDs.
 * Kept separate from both logger.ts and serviceClient.ts to avoid circular
 * import chains (logger → serviceClient → logger).
 *
 * Import order in the middleware stack:
 *   1. correlationIdMiddleware (logger.ts) calls runWithCorrelation()
 *   2. Every outbound HTTP call via serviceClient reads getCurrentCorrelationId()
 *   3. Sentry's beforeSend reads getCurrentCorrelationId() to tag errors
 */

import crypto from 'crypto';
import { AsyncLocalStorage } from 'async_hooks';

export interface CorrelationStore {
  correlationId: string;
  requestId: string;
}

/**
 * AsyncLocalStorage instance that carries the correlation context across all
 * async operations within a single request's execution chain.
 */
export const correlationStorage = new AsyncLocalStorage<CorrelationStore>();

/**
 * Run a callback inside a correlation context. Call this once per inbound
 * request (inside correlationIdMiddleware) so that all downstream code —
 * service calls, logger helpers, Sentry breadcrumbs — can read the IDs
 * without needing them passed explicitly.
 */
export function runWithCorrelation<T>(correlationId: string, requestId: string, fn: () => T): T {
  return correlationStorage.run({ correlationId, requestId }, fn);
}

/**
 * Return the correlation ID for the current async context, or a generated
 * fallback for code that runs outside a request (cron jobs, workers, etc.).
 */
export function getCurrentCorrelationId(): string {
  return correlationStorage.getStore()?.correlationId ?? `gen-${Date.now()}-${crypto.randomUUID().replace(/-/g, '').slice(0, 6)}`;
}
