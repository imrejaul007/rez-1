/**
 * serviceClient.ts
 *
 * Axios wrapper for internal service-to-service HTTP calls.
 * Automatically propagates X-Correlation-ID and X-Internal-Token headers
 * from the current AsyncLocalStorage context (set by correlationIdMiddleware
 * in config/logger.ts via runWithCorrelation from correlationContext.ts).
 *
 * Usage:
 *   import { serviceClient } from '../utils/serviceClient';
 *   const res = await serviceClient.get('https://rez-gamification-service.onrender.com/api/...');
 *
 * The correlation ID is forwarded automatically — no manual header setting needed.
 *
 * Re-exports runWithCorrelation and getCurrentCorrelationId from correlationContext
 * so callers only need to import from this single file.
 */

import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { createServiceLogger } from '../config/logger';
import { correlationStorage, getCurrentCorrelationId, runWithCorrelation } from './correlationContext';
import { getCircuit } from './circuitBreaker';

const logger = createServiceLogger('service-client');

// Re-export so that logger.ts and sentry.ts can import from this file
// (backwards-compatible with the original instructions).
export { correlationStorage, getCurrentCorrelationId, runWithCorrelation } from './correlationContext';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

// Map URL hostname patterns to canonical service names used in INTERNAL_SERVICE_TOKENS_JSON
const SERVICE_NAME_MAP: [RegExp, string][] = [
  [/gamification/i, 'rez-gamification-service'],
  [/wallet/i, 'rez-wallet-service'],
  [/payment/i, 'rez-payment-service'],
  [/notification/i, 'rez-notification-events'],
  [/merchant/i, 'rez-merchant-service'],
  [/catalog/i, 'rez-catalog-service'],
  [/analytics/i, 'analytics-events'],
  [/auth/i, 'rez-auth-service'],
  [/order/i, 'rez-order-service'],
  [/marketing/i, 'rez-marketing-service'],
  [/search/i, 'rez-search-service'],
];

function getServiceNameFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    for (const [pattern, name] of SERVICE_NAME_MAP) {
      if (pattern.test(hostname)) return name;
    }
    return hostname;
  } catch {
    return 'unknown';
  }
}

// Cached parsed scoped tokens — avoids JSON.parse on every request
let _scopedTokens: Record<string, string> | null | undefined;
function getScopedTokens(): Record<string, string> | null {
  if (_scopedTokens !== undefined) return _scopedTokens;
  try {
    const raw = process.env.INTERNAL_SERVICE_TOKENS_JSON;
    const parsed = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    _scopedTokens = Object.keys(parsed).length > 0 ? parsed : null;
  } catch {
    _scopedTokens = null;
  }
  return _scopedTokens;
}

function resolveTokenForService(targetService: string): { token: string; service?: string } {
  const scoped = getScopedTokens();
  if (scoped) {
    // Look up the per-service token; the key in the JSON map is the caller's own
    // service name (rez-backend), which is the token the target will validate.
    const token = scoped['rez-backend'];
    if (token) return { token, service: 'rez-backend' };
  }
  // Fallback to legacy shared token
  return { token: process.env.INTERNAL_SERVICE_TOKEN ?? '' };
}

function buildInternalHeaders(url: string, extra?: Record<string, string>): Record<string, string> {
  const store = correlationStorage.getStore();
  const targetService = getServiceNameFromUrl(url);
  const { token, service } = resolveTokenForService(targetService);
  const headers: Record<string, string> = {
    'X-Correlation-ID': store?.correlationId ?? getCurrentCorrelationId(),
    'X-Request-ID': store?.requestId ?? `req-${Date.now()}`,
    'X-Internal-Token': token,
    'Content-Type': 'application/json',
    ...extra,
  };
  if (service) {
    headers['X-Internal-Service'] = service;
  }
  return headers;
}

// ---------------------------------------------------------------------------
// serviceClient — drop-in replacement for raw axios in inter-service calls
// ---------------------------------------------------------------------------

export const serviceClient = {
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    const start = Date.now();
    const circuit = getCircuit(getServiceNameFromUrl(url));
    try {
      const res = await circuit.exec(() =>
        axios.get<T>(url, {
          ...config,
          headers: { ...buildInternalHeaders(url), ...(config?.headers ?? {}) },
          timeout: config?.timeout ?? 10000,
        }),
      );
      logger.debug('[SERVICE_CLIENT] GET', {
        url,
        status: res.status,
        ms: Date.now() - start,
        correlationId: getCurrentCorrelationId(),
      });
      return res;
    } catch (err: any) {
      logger.error('[SERVICE_CLIENT] GET failed', err, {
        url,
        ms: Date.now() - start,
        correlationId: getCurrentCorrelationId(),
      });
      throw err;
    }
  },

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    const start = Date.now();
    const circuit = getCircuit(getServiceNameFromUrl(url));
    try {
      const res = await circuit.exec(() =>
        axios.post<T>(url, data, {
          ...config,
          headers: { ...buildInternalHeaders(url), ...(config?.headers ?? {}) },
          timeout: config?.timeout ?? 10000,
        }),
      );
      logger.debug('[SERVICE_CLIENT] POST', {
        url,
        status: res.status,
        ms: Date.now() - start,
        correlationId: getCurrentCorrelationId(),
      });
      return res;
    } catch (err: any) {
      logger.error('[SERVICE_CLIENT] POST failed', err, {
        url,
        ms: Date.now() - start,
        correlationId: getCurrentCorrelationId(),
      });
      throw err;
    }
  },

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    const start = Date.now();
    const circuit = getCircuit(getServiceNameFromUrl(url));
    try {
      const res = await circuit.exec(() =>
        axios.put<T>(url, data, {
          ...config,
          headers: { ...buildInternalHeaders(url), ...(config?.headers ?? {}) },
          timeout: config?.timeout ?? 10000,
        }),
      );
      logger.debug('[SERVICE_CLIENT] PUT', {
        url,
        status: res.status,
        ms: Date.now() - start,
        correlationId: getCurrentCorrelationId(),
      });
      return res;
    } catch (err: any) {
      logger.error('[SERVICE_CLIENT] PUT failed', err, {
        url,
        ms: Date.now() - start,
        correlationId: getCurrentCorrelationId(),
      });
      throw err;
    }
  },

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    const start = Date.now();
    const circuit = getCircuit(getServiceNameFromUrl(url));
    try {
      const res = await circuit.exec(() =>
        axios.patch<T>(url, data, {
          ...config,
          headers: { ...buildInternalHeaders(url), ...(config?.headers ?? {}) },
          timeout: config?.timeout ?? 10000,
        }),
      );
      logger.debug('[SERVICE_CLIENT] PATCH', {
        url,
        status: res.status,
        ms: Date.now() - start,
        correlationId: getCurrentCorrelationId(),
      });
      return res;
    } catch (err: any) {
      logger.error('[SERVICE_CLIENT] PATCH failed', err, {
        url,
        ms: Date.now() - start,
        correlationId: getCurrentCorrelationId(),
      });
      throw err;
    }
  },
};
