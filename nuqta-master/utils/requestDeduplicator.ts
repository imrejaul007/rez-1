/**
 * Request Deduplicator
 * Prevents multiple simultaneous identical API calls
 *
 * Features:
 * - Deduplicates concurrent identical requests
 * - Returns same Promise for identical in-flight requests
 * - Auto-cleanup after request completion
 * - Request cancellation support
 * - Timeout handling
 * - Statistics tracking
 */

interface RequestStats {
  saved: number;
  active: number;
  totalRequests: number;
  deduplicatedRequests: number;
}

interface InFlightRequest<T> {
  promise: Promise<T>;
  timestamp: number;
  timeout?: NodeJS.Timeout;
  controller?: AbortController;
}

/**
 * Creates a stable key from URL and parameters
 * Ensures consistent ordering for cache key generation
 */
export function createRequestKey(url: string, params?: any): string {
  if (!params) return url;

  // Sort keys for consistent ordering
  const sortedKeys = Object.keys(params).sort();
  const paramString = JSON.stringify(params, sortedKeys);

  return `${url}::${paramString}`;
}

/**
 * Request Deduplication Error
 */
export class DeduplicationError extends Error {
  constructor(message: string, public reason: 'cancelled' | 'timeout') {
    super(message);
    this.name = 'DeduplicationError';
  }
}

/**
 * Request Deduplicator Class
 * Manages deduplication of concurrent API requests
 */
export class RequestDeduplicator {
  private inFlightRequests = new Map<string, InFlightRequest<any>>();
  private stats: RequestStats = {
    saved: 0,
    active: 0,
    totalRequests: 0,
    deduplicatedRequests: 0
  };

  // Configuration
  private readonly defaultTimeout: number;
  private readonly enableLogging: boolean;

  constructor(options: {
    defaultTimeout?: number;
    enableLogging?: boolean;
  } = {}) {
    this.defaultTimeout = options.defaultTimeout || 30000; // 30 seconds
    this.enableLogging = options.enableLogging || false;
  }

  /**
   * Deduplicate API calls
   * Returns cached promise if identical request is in-flight
   */
  async dedupe<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: {
      timeout?: number;
      controller?: AbortController;
    } = {}
  ): Promise<T> {
    this.stats.totalRequests++;

    // Check if identical request is already in-flight
    const existing = this.inFlightRequests.get(key);
    if (existing) {
      this.stats.saved++;
      this.stats.deduplicatedRequests++;

      if (this.enableLogging) {
      }

      return existing.promise;
    }

    // Create new request
    this.stats.active++;
    const timeout = options.timeout || this.defaultTimeout;
    const controller = options.controller;

    if (this.enableLogging) {
    }

    // Create timeout handler
    let timeoutId: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        this.cleanup(key);
        reject(new DeduplicationError(
          `Request timeout after ${timeout}ms: ${key}`,
          'timeout'
        ));
      }, timeout);
    });

    // Create the actual request promise
    const requestPromise = fetcher()
      .then((result) => {
        // Cleanup on success
        if (timeoutId) clearTimeout(timeoutId);
        this.cleanup(key);

        if (this.enableLogging) {
        }

        return result;
      })
      .catch((error) => {
        // Cleanup on error
        if (timeoutId) clearTimeout(timeoutId);
        this.cleanup(key);

        if (this.enableLogging) {
        }

        throw error;
      });

    // Race between request and timeout
    const promise = Promise.race([requestPromise, timeoutPromise]);

    // Store in-flight request
    this.inFlightRequests.set(key, {
      promise,
      timestamp: Date.now(),
      timeout: timeoutId,
      controller
    });

    return promise;
  }

  /**
   * Cancel specific request by key
   */
  cancel(key: string): void {
    const request = this.inFlightRequests.get(key);
    if (!request) return;

    // Clear timeout
    if (request.timeout) {
      clearTimeout(request.timeout);
    }

    // Abort controller if provided
    if (request.controller) {
      request.controller.abort();
    }

    this.cleanup(key);

    if (this.enableLogging) {
    }
  }

  /**
   * Cancel all in-flight requests
   */
  cancelAll(): void {
    const keys = Array.from(this.inFlightRequests.keys());

    if (this.enableLogging) {
    }

    keys.forEach(key => this.cancel(key));
  }

  /**
   * Check if request is currently in-flight
   */
  isInFlight(key: string): boolean {
    return this.inFlightRequests.has(key);
  }

  /**
   * Get current statistics
   */
  getStats(): RequestStats {
    return {
      ...this.stats,
      active: this.inFlightRequests.size
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      saved: 0,
      active: this.inFlightRequests.size,
      totalRequests: 0,
      deduplicatedRequests: 0
    };
  }

  /**
   * Get all in-flight request keys
   */
  getInFlightKeys(): string[] {
    return Array.from(this.inFlightRequests.keys());
  }

  /**
   * Get request age in milliseconds
   */
  getRequestAge(key: string): number | null {
    const request = this.inFlightRequests.get(key);
    if (!request) return null;

    return Date.now() - request.timestamp;
  }

  /**
   * Cleanup completed/failed request
   */
  private cleanup(key: string): void {
    const request = this.inFlightRequests.get(key);
    if (!request) return;

    // Clear timeout if exists
    if (request.timeout) {
      clearTimeout(request.timeout);
    }

    // Remove from map
    this.inFlightRequests.delete(key);
    this.stats.active = Math.max(0, this.stats.active - 1);
  }

  /**
   * Print statistics to console
   */
  printStats(): void {
    const stats = this.getStats();
  }
}

/**
 * Singleton instance for global use
 */
export const globalDeduplicator = new RequestDeduplicator({
  defaultTimeout: 60000, // 60s to handle Render cold starts
  enableLogging: false // Disabled to reduce console noise
});

/**
 * Helper function for deduplicating GET requests
 */
export function dedupeGet<T>(
  url: string,
  params?: any,
  fetcher?: () => Promise<T>
): Promise<T> {
  const key = createRequestKey(url, params);

  if (!fetcher) {
    throw new Error('Fetcher function is required for dedupeGet');
  }

  return globalDeduplicator.dedupe(key, fetcher);
}

/**
 * Higher-order function to wrap any async function with deduplication
 */
export function withDeduplication<TArgs extends any[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  keyGenerator: (...args: TArgs) => string,
  deduplicator: RequestDeduplicator = globalDeduplicator
): (...args: TArgs) => Promise<TResult> {
  return (...args: TArgs): Promise<TResult> => {
    const key = keyGenerator(...args);
    return deduplicator.dedupe(key, () => fn(...args));
  };
}

/**
 * Decorator for class methods (experimental)
 */
export function Deduplicate(keyGenerator: (...args: any[]) => string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const key = keyGenerator(...args);
      return globalDeduplicator.dedupe(key, () => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}

/**
 * Create a scoped deduplicator for specific use cases
 */
export function createScopedDeduplicator(
  scope: string,
  options?: {
    timeout?: number;
    enableLogging?: boolean;
  }
): RequestDeduplicator {
  const deduplicator = new RequestDeduplicator(options);

  // Add scope to logging
  if (options?.enableLogging) {
  }

  return deduplicator;
}

export default RequestDeduplicator;
