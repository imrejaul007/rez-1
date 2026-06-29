// Connectivity Service
// App-launch health check that pings the API and reports reachability.
//
// Why: in production, every screen failing with "Network error" is a poor UX.
// Instead, run a single short health-check on launch and surface a clear banner
// when the API is unreachable so users know it's a backend / connectivity
// problem, not a per-screen bug.

import apiClient from './apiClient';
import { getConnectivityPingUrls } from '@/utils/connectionUtils';

export type ConnectivityStatus = 'unknown' | 'online' | 'offline';

export interface ConnectivityResult {
  status: ConnectivityStatus;
  latencyMs: number | null;
  checkedAt: string;
  baseURL: string;
  error?: string;
}

type Listener = (result: ConnectivityResult) => void;

const DEFAULT_TIMEOUT_MS = 4000;
// Cache successful pings for 30s so we don't fire one on every navigation.
const SUCCESS_CACHE_MS = 30_000;
// Re-check on cache miss, but never more than once every 5s.
const MIN_RECHECK_MS = 5_000;

class ConnectivityService {
  private status: ConnectivityStatus = 'unknown';
  private lastResult: ConnectivityResult | null = null;
  private lastCheckedAt = 0;
  private inflight: Promise<ConnectivityResult> | null = null;
  private listeners = new Set<Listener>();

  /** Subscribe to connectivity changes. Returns an unsubscribe fn. */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    // Push current snapshot immediately so the UI can render synchronously.
    if (this.lastResult) listener(this.lastResult);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSnapshot(): ConnectivityResult | null {
    return this.lastResult;
  }

  getStatus(): ConnectivityStatus {
    return this.status;
  }

  /**
   * Ping the API. Returns the cached result if we checked recently.
   * Pass `force: true` to bypass the cache (e.g. user pulled-to-refresh).
   */
  async check(options: { force?: boolean; timeoutMs?: number } = {}): Promise<ConnectivityResult> {
    const { force = false, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
    const now = Date.now();

    if (
      !force &&
      this.lastResult &&
      this.status === 'online' &&
      now - this.lastCheckedAt < SUCCESS_CACHE_MS
    ) {
      return this.lastResult;
    }
    if (!force && this.inflight) return this.inflight;
    if (!force && now - this.lastCheckedAt < MIN_RECHECK_MS && this.lastResult) {
      return this.lastResult;
    }

    this.inflight = this.ping(timeoutMs);
    try {
      const result = await this.inflight;
      this.applyResult(result);
      return result;
    } finally {
      this.inflight = null;
    }
  }

  /** Mark the service as offline (e.g. when a request fails with a network error). */
  markOffline(error?: string): void {
    const result: ConnectivityResult = {
      status: 'offline',
      latencyMs: null,
      checkedAt: new Date().toISOString(),
      baseURL: apiClient.getBaseURL(),
      error,
    };
    this.applyResult(result);
  }

  /** Reset to unknown (e.g. when the user logs in / network type changes). */
  reset(): void {
    this.status = 'unknown';
    this.lastResult = null;
    this.lastCheckedAt = 0;
  }

  private async ping(timeoutMs: number): Promise<ConnectivityResult> {
    const baseURL = apiClient.getBaseURL();
    const pingUrls = getConnectivityPingUrls(baseURL);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const started = Date.now();
    try {
      let res: Response | null = null;
      for (const healthURL of pingUrls) {
        try {
          const attempt = await fetch(healthURL, { method: 'GET', signal: controller.signal });
          if (attempt.ok) {
            res = attempt;
            break;
          }
        } catch {
          // try next URL
        }
      }
      const latencyMs = Date.now() - started;
      if (!res?.ok) {
        return {
          status: 'offline',
          latencyMs,
          checkedAt: new Date().toISOString(),
          baseURL,
          error: res ? `HTTP ${res.status}` : 'Server unreachable',
        };
      }
      return {
        status: 'online',
        latencyMs,
        checkedAt: new Date().toISOString(),
        baseURL,
      };
    } catch (err) {
      return {
        status: 'offline',
        latencyMs: null,
        checkedAt: new Date().toISOString(),
        baseURL,
        error: err instanceof Error ? err.message : 'Network error',
      };
    } finally {
      clearTimeout(timer);
    }
  }

  private applyResult(result: ConnectivityResult): void {
    this.status = result.status;
    this.lastResult = result;
    this.lastCheckedAt = Date.now();
    for (const listener of this.listeners) {
      try {
        listener(result);
      } catch {
        // listener errors must not break the service
      }
    }
  }
}

export const connectivityService = new ConnectivityService();
export default connectivityService;
