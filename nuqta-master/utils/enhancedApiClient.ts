/**
 * Enhanced API Client
 *
 * Wraps the base API client with additional features:
 * - Request deduplication (prevents duplicate concurrent requests)
 * - Automatic retry with exponential backoff
 * - Request timeout handling
 * - Offline detection and queue management
 * - Request/response logging (development mode)
 * - Request cancellation support
 *
 * @module enhancedApiClient
 */

import apiClient, { ApiResponse } from '@/services/apiClient';
import { globalDeduplicator, createRequestKey } from './requestDeduplicator';
import {
  retryWithBackoff,
  RetryConfig,
  DEFAULT_RETRY_CONFIG,
  isRetryableError,
  withTimeout,
} from './requestRetry';
import NetInfo from '@react-native-community/netinfo';

// ============================================================================
// Type Definitions
// ============================================================================

export interface EnhancedRequestOptions {
  /**
   * Enable/disable request deduplication
   * @default true for GET, false for others
   */
  deduplicate?: boolean;

  /**
   * Enable/disable automatic retry
   * @default true
   */
  retry?: boolean;

  /**
   * Retry configuration
   */
  retryConfig?: RetryConfig;

  /**
   * Request timeout in milliseconds
   * @default 30000 (30 seconds)
   */
  timeout?: number;

  /**
   * AbortController for request cancellation
   */
  controller?: AbortController;

  /**
   * Enable request/response logging
   * @default __DEV__
   */
  logging?: boolean;

  /**
   * Queue request if offline
   * @default false
   */
  queueIfOffline?: boolean;

  /**
   * Cache response
   * @default false
   */
  cache?: boolean;

  /**
   * Cache duration in milliseconds
   * @default 300000 (5 minutes)
   */
  cacheDuration?: number;
}

export interface RequestMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  attempts: number;
  deduplicated: boolean;
  cached: boolean;
  offline: boolean;
  success: boolean;
}

// ============================================================================
// Request Cache
// ============================================================================

interface CacheEntry<T> {
  data: ApiResponse<T>;
  timestamp: number;
  expiresAt: number;
}

class RequestCache {
  private static readonly MAX_CACHE_SIZE = 100;
  private cache = new Map<string, CacheEntry<any>>();
  private readonly defaultDuration = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: ApiResponse<T>, duration?: number): void {
    if (this.cache.size >= RequestCache.MAX_CACHE_SIZE && !this.cache.has(key)) {
      this.clearExpired();
      // If still over limit after clearing expired, delete oldest entries
      if (this.cache.size >= RequestCache.MAX_CACHE_SIZE) {
        const iterator = this.cache.keys();
        while (this.cache.size >= RequestCache.MAX_CACHE_SIZE) {
          const oldest = iterator.next();
          if (oldest.done) break;
          this.cache.delete(oldest.value);
        }
      }
    }

    const now = Date.now();
    const ttl = duration || this.defaultDuration;

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl,
    });
  }

  get<T>(key: string): ApiResponse<T> | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now >= entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(): void {
    this.cache.clear();
  }

  clearExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

const requestCache = new RequestCache();

// Clear expired cache entries every minute (run in all environments)
let _cacheCleanupInterval: ReturnType<typeof setInterval> | null = null;
if (!_cacheCleanupInterval) {
  _cacheCleanupInterval = setInterval(() => requestCache.clearExpired(), 60000);
}

// ============================================================================
// Network State Management
// ============================================================================

let isOnline = true;
let networkState: any = null;
let networkUnsubscribe: (() => void) | null = null;

// Initialize network state listener
NetInfo.fetch().then(state => {
  isOnline = state.isConnected ?? true;
  networkState = state;
});

// Store unsubscribe so it can be cleaned up
networkUnsubscribe = NetInfo.addEventListener(state => {
  isOnline = state.isConnected ?? true;
  networkState = state;
});

export function getNetworkState() {
  return {
    isOnline,
    state: networkState,
  };
}

// ============================================================================
// Enhanced API Client
// ============================================================================

class EnhancedApiClient {
  private static readonly MAX_METRICS_SIZE = 200;
  private metrics = new Map<string, RequestMetrics>();

  private recordMetrics(key: string, metrics: RequestMetrics): void {
    this.metrics.set(key, metrics);
    if (this.metrics.size > EnhancedApiClient.MAX_METRICS_SIZE) {
      const iterator = this.metrics.keys();
      while (this.metrics.size > EnhancedApiClient.MAX_METRICS_SIZE) {
        const oldest = iterator.next();
        if (oldest.done) break;
        this.metrics.delete(oldest.value);
      }
    }
  }

  /**
   * Enhanced GET request with deduplication, retry, and caching
   */
  async get<T>(
    endpoint: string,
    params?: Record<string, any>,
    options: EnhancedRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      deduplicate = true, // Default: deduplicate GET requests
      retry = true,
      retryConfig = DEFAULT_RETRY_CONFIG,
      timeout = 30000,
      controller,
      logging = __DEV__,
      cache = false,
      cacheDuration,
    } = options;

    const url = endpoint;
    const requestKey = createRequestKey(`GET:${url}`, params);

    // Check cache first
    if (cache) {
      const cached = requestCache.get<T>(requestKey);
      if (cached) {
        if (logging) {
          console.log(`💾 [CACHE HIT] ${endpoint}`);
        }
        return cached;
      }
    }

    // Create request metrics
    const metrics: RequestMetrics = {
      startTime: Date.now(),
      attempts: 0,
      deduplicated: false,
      cached: false,
      offline: !isOnline,
      success: false,
    };

    // Define the actual request function
    const makeRequest = async (): Promise<ApiResponse<T>> => {
      metrics.attempts++;

      if (logging) {
        console.log(`\n📤 [REQUEST] GET ${endpoint}`);
        if (params) console.log(`   Params:`, params);
      }

      // Use timeout wrapper
      const timeoutPromise = withTimeout(
        apiClient.get<T>(endpoint, params),
        timeout,
        `Request timeout after ${timeout}ms`
      );

      const response = await timeoutPromise;

      if (logging) {
        console.log(`📥 [RESPONSE] GET ${endpoint}`, {
          success: response.success,
          hasData: !!response.data,
        });
      }

      return response;
    };

    try {
      let response: ApiResponse<T>;

      // Apply deduplication if enabled
      if (deduplicate) {
        response = await globalDeduplicator.dedupe(
          requestKey,
          retry
            ? () => retryWithBackoff(makeRequest, {
                ...retryConfig,
                enableLogging: logging,
              })
            : makeRequest,
          { timeout, controller }
        );
        metrics.deduplicated = globalDeduplicator.isInFlight(requestKey);
      } else if (retry) {
        // Retry without deduplication
        response = await retryWithBackoff(makeRequest, {
          ...retryConfig,
          enableLogging: logging,
        });
      } else {
        // No deduplication, no retry
        response = await makeRequest();
      }

      // Cache successful response
      if (cache && response.success) {
        requestCache.set(requestKey, response, cacheDuration);
        if (logging) {
          console.log(`💾 [CACHED] ${endpoint}`);
        }
      }

      // Record success metrics
      metrics.success = response.success;
      metrics.endTime = Date.now();
      metrics.duration = metrics.endTime - metrics.startTime;

      if (logging) {
        console.log(`✅ [SUCCESS] ${endpoint} (${metrics.duration}ms, ${metrics.attempts} attempts)`);
      }

      this.recordMetrics(requestKey, metrics);

      return response;

    } catch (error: any) {
      // Record failure metrics
      metrics.success = false;
      metrics.endTime = Date.now();
      metrics.duration = metrics.endTime - metrics.startTime;

      if (logging) {
        console.error(`❌ [FAILED] ${endpoint}`, error);
      }

      this.recordMetrics(requestKey, metrics);

      // Return error as ApiResponse
      return {
        success: false,
        error: error?.message || 'Request failed',
        message: error?.message || 'Request failed',
      };
    }
  }

  /**
   * Enhanced POST request with optional retry
   */
  async post<T>(
    endpoint: string,
    data?: any,
    options: EnhancedRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      deduplicate = false, // Default: don't deduplicate POST
      retry = true,
      retryConfig = DEFAULT_RETRY_CONFIG,
      timeout = 30000,
      logging = __DEV__,
    } = options;

    const requestKey = createRequestKey(`POST:${endpoint}`, data);

    // Create request metrics
    const metrics: RequestMetrics = {
      startTime: Date.now(),
      attempts: 0,
      deduplicated: false,
      cached: false,
      offline: !isOnline,
      success: false,
    };

    const makeRequest = async (): Promise<ApiResponse<T>> => {
      metrics.attempts++;

      if (logging) {
        console.log(`\n📤 [REQUEST] POST ${endpoint}`);
      }

      const timeoutPromise = withTimeout(
        apiClient.post<T>(endpoint, data),
        timeout,
        `Request timeout after ${timeout}ms`
      );

      const response = await timeoutPromise;

      if (logging) {
        console.log(`📥 [RESPONSE] POST ${endpoint}`, {
          success: response.success,
        });
      }

      return response;
    };

    try {
      let response: ApiResponse<T>;

      if (deduplicate) {
        response = await globalDeduplicator.dedupe(
          requestKey,
          retry
            ? () => retryWithBackoff(makeRequest, {
                ...retryConfig,
                enableLogging: logging,
              })
            : makeRequest
        );
      } else if (retry) {
        response = await retryWithBackoff(makeRequest, {
          ...retryConfig,
          enableLogging: logging,
        });
      } else {
        response = await makeRequest();
      }

      metrics.success = response.success;
      metrics.endTime = Date.now();
      metrics.duration = metrics.endTime - metrics.startTime;

      this.recordMetrics(requestKey, metrics);

      return response;

    } catch (error: any) {
      metrics.success = false;
      metrics.endTime = Date.now();
      metrics.duration = metrics.endTime - metrics.startTime;

      if (logging) {
        console.error(`❌ [FAILED] POST ${endpoint}`, error);
      }

      this.recordMetrics(requestKey, metrics);

      return {
        success: false,
        error: error?.message || 'Request failed',
        message: error?.message || 'Request failed',
      };
    }
  }

  /**
   * Enhanced PUT request
   */
  async put<T>(
    endpoint: string,
    data?: any,
    options: EnhancedRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.post<T>(endpoint, data, { ...options, deduplicate: false });
  }

  /**
   * Enhanced PATCH request
   */
  async patch<T>(
    endpoint: string,
    data?: any,
    options: EnhancedRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.post<T>(endpoint, data, { ...options, deduplicate: false });
  }

  /**
   * Enhanced DELETE request
   */
  async delete<T>(
    endpoint: string,
    data?: any,
    options: EnhancedRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      retry = true,
      retryConfig = DEFAULT_RETRY_CONFIG,
      timeout = 30000,
      logging = __DEV__,
    } = options;

    const makeRequest = async (): Promise<ApiResponse<T>> => {
      if (logging) {
        console.log(`\n📤 [REQUEST] DELETE ${endpoint}`);
      }

      const timeoutPromise = withTimeout(
        apiClient.delete<T>(endpoint, data),
        timeout,
        `Request timeout after ${timeout}ms`
      );

      return await timeoutPromise;
    };

    try {
      if (retry) {
        return await retryWithBackoff(makeRequest, {
          ...retryConfig,
          enableLogging: logging,
        });
      }
      return await makeRequest();

    } catch (error: any) {
      if (logging) {
        console.error(`❌ [FAILED] DELETE ${endpoint}`, error);
      }

      return {
        success: false,
        error: error?.message || 'Request failed',
        message: error?.message || 'Request failed',
      };
    }
  }

  /**
   * Clear request cache
   */
  clearCache(): void {
    requestCache.clear();
    if (__DEV__) {
      console.log(`🗑️  [CACHE] Cleared`);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return requestCache.getStats();
  }

  /**
   * Get request metrics
   */
  getMetrics(key?: string) {
    if (key) {
      return this.metrics.get(key);
    }
    return Array.from(this.metrics.entries());
  }

  /**
   * Clear metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
  }

  /**
   * Print statistics
   */
  printStats(): void {
    if (!__DEV__) return;

    console.log('\n┌─────────────────────────────────────────┐');
    console.log('│     ENHANCED API CLIENT STATISTICS     │');
    console.log('└─────────────────────────────────────────┘');

    // Deduplication stats
    const dedupeStats = globalDeduplicator.getStats();
    console.log('\n📊 Deduplication:');
    console.log(`   Total Requests:    ${dedupeStats.totalRequests}`);
    console.log(`   Deduplicated:      ${dedupeStats.deduplicatedRequests}`);
    console.log(`   Requests Saved:    ${dedupeStats.saved}`);
    console.log(`   Active:            ${dedupeStats.active}`);

    // Cache stats
    const cacheStats = requestCache.getStats();
    console.log('\n💾 Cache:');
    console.log(`   Cached Entries:    ${cacheStats.size}`);

    // Request metrics
    const allMetrics = Array.from(this.metrics.values());
    const successCount = allMetrics.filter(m => m.success).length;
    const avgDuration = allMetrics.length > 0
      ? allMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) / allMetrics.length
      : 0;

    console.log('\n📈 Requests:');
    console.log(`   Total:             ${allMetrics.length}`);
    console.log(`   Successful:        ${successCount}`);
    console.log(`   Failed:            ${allMetrics.length - successCount}`);
    console.log(`   Avg Duration:      ${avgDuration.toFixed(0)}ms`);

    console.log('─────────────────────────────────────────\n');
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

const enhancedApiClient = new EnhancedApiClient();

export default enhancedApiClient;
export { EnhancedApiClient, requestCache };
