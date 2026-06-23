/**
 * Performance Utilities
 *
 * Collection of utilities for optimizing performance:
 * - Debounce
 * - Throttle
 * - Memoization
 * - Lazy evaluation
 * - Request deduplication
 */

/**
 * Debounce function
 * Delays execution until after wait milliseconds have passed since last call
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 * Ensures function is called at most once every wait milliseconds
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  let lastResult: ReturnType<T>;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      lastResult = func(...args);
      inThrottle = true;

      setTimeout(() => {
        inThrottle = false;
      }, wait);
    }

    return lastResult;
  };
}

/**
 * Memoize function
 * Caches function results based on arguments
 */
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  resolver?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = resolver ? resolver(...args) : JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = func(...args);
    // Evict oldest entry if cache exceeds limit
    if (cache.size >= 200) {
      const firstKey = cache.keys().next().value;
      if (firstKey !== undefined) cache.delete(firstKey);
    }
    cache.set(key, result);

    return result;
  }) as T;
}

/**
 * Request deduplication
 * Prevents duplicate requests from being made simultaneously
 */
class RequestDeduplicator {
  private pendingRequests: Map<string, Promise<any>> = new Map();

  async deduplicate<T>(key: string, request: () => Promise<T>): Promise<T> {
    // If request is pending, return existing promise
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    // Create new request
    const promise = request()
      .then((result) => {
        this.pendingRequests.delete(key);
        return result;
      })
      .catch((error) => {
        this.pendingRequests.delete(key);
        throw error;
      });

    this.pendingRequests.set(key, promise);

    return promise;
  }

  clear(key?: string): void {
    if (key) {
      this.pendingRequests.delete(key);
    } else {
      this.pendingRequests.clear();
    }
  }

  getPendingCount(): number {
    return this.pendingRequests.size;
  }
}

export const requestDeduplicator = new RequestDeduplicator();

/**
 * Batch multiple operations
 * Combines multiple operations into a single batch
 */
export class BatchProcessor<T, R> {
  private queue: T[] = [];
  private pendingCallbacks: { resolve: (value: R) => void; reject: (error: any) => void; index: number }[] = [];
  private timeout: NodeJS.Timeout | null = null;
  private processor: (batch: T[]) => Promise<R[]>;
  private wait: number;

  constructor(processor: (batch: T[]) => Promise<R[]>, wait: number = 50) {
    this.processor = processor;
    this.wait = wait;
  }

  add(item: T): Promise<R> {
    return new Promise((resolve, reject) => {
      const index = this.queue.length;
      this.queue.push(item);
      this.pendingCallbacks.push({ resolve, reject, index });

      if (this.timeout) {
        clearTimeout(this.timeout);
      }

      this.timeout = setTimeout(() => {
        this.processBatch();
      }, this.wait);
    });
  }

  private async processBatch(): Promise<void> {
    const batch = [...this.queue];
    const callbacks = [...this.pendingCallbacks];
    this.queue = [];
    this.pendingCallbacks = [];
    this.timeout = null;

    try {
      const results = await this.processor(batch);
      callbacks.forEach(({ resolve, index }) => resolve(results[index]));
    } catch (error) {
      callbacks.forEach(({ reject }) => reject(error));
    }
  }

  flush(): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }

    // Reject all pending promises so callers are not left hanging
    const callbacks = [...this.pendingCallbacks];
    this.queue = [];
    this.pendingCallbacks = [];
    callbacks.forEach(({ reject }) => reject(new Error('BatchProcessor flushed before processing')));
  }
}

/**
 * Lazy loader for heavy operations
 * Delays execution until value is actually needed
 */
export class Lazy<T> {
  private value: T | null = null;
  private factory: () => T;
  private isEvaluated = false;

  constructor(factory: () => T) {
    this.factory = factory;
  }

  get(): T {
    if (!this.isEvaluated) {
      this.value = this.factory();
      this.isEvaluated = true;
    }

    return this.value!;
  }

  isReady(): boolean {
    return this.isEvaluated;
  }

  reset(): void {
    this.value = null;
    this.isEvaluated = false;
  }
}

/**
 * Performance measurement utilities
 */
export const measure = {
  /**
   * Measure execution time of a function
   */
  async time<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      throw error;
    }
  },

  /**
   * Mark a performance point
   */
  mark(label: string): void {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(label);
    }
  },

  /**
   * Measure between two marks
   */
  measureBetween(name: string, startMark: string, endMark: string): number {
    if (typeof performance !== 'undefined' && performance.measure) {
      performance.measure(name, startMark, endMark);

      const measures = performance.getEntriesByName(name);
      if (measures.length > 0) {
        const duration = measures[0].duration;
        return duration;
      }
    }

    return 0;
  },

  /**
   * Clear all marks and measures
   */
  clear(): void {
    if (typeof performance !== 'undefined') {
      performance.clearMarks();
      performance.clearMeasures();
    }
  },
};

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
  } = options;

  let lastError: any;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {

        await new Promise((resolve) => setTimeout(resolve, delay));
        delay = Math.min(delay * backoffFactor, maxDelay);
      }
    }
  }

  throw lastError;
}

/**
 * Chunk array for batch processing
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }

  return chunks;
}

/**
 * Sleep utility
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Rate limiter
 */
export class RateLimiter {
  private tokens: number;
  private maxTokens: number;
  private refillRate: number;
  private lastRefill: number;

  constructor(maxTokens: number, refillRate: number) {
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
    this.refillRate = refillRate; // tokens per second
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000; // seconds
    const tokensToAdd = elapsed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  async acquire(tokens: number = 1): Promise<void> {
    while (true) {
      this.refill();

      if (this.tokens >= tokens) {
        this.tokens -= tokens;
        return;
      }

      // Wait before trying again
      const waitTime = ((tokens - this.tokens) / this.refillRate) * 1000;
      await sleep(Math.min(waitTime, 1000));
    }
  }

  getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }
}

export default {
  debounce,
  throttle,
  memoize,
  requestDeduplicator,
  BatchProcessor,
  Lazy,
  measure,
  retryWithBackoff,
  chunkArray,
  sleep,
  RateLimiter,
};
