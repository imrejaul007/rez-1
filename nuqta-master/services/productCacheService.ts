/**
 * Product Cache Service
 *
 * Implements intelligent caching for product data to improve performance
 * and reduce API calls.
 *
 * Features:
 * - In-memory cache with TTL (Time To Live)
 * - LRU (Least Recently Used) eviction policy
 * - Cache size limits
 * - Cache invalidation
 * - Cache statistics
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

interface CacheOptions {
  maxSize?: number; // Maximum number of entries
  ttl?: number; // Time to live in milliseconds
  enableStats?: boolean;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
  evictions: number;
}

class ProductCacheService {
  private cache: Map<string, CacheEntry<any>>;
  private maxSize: number;
  private ttl: number;
  private stats: CacheStats;
  private enableStats: boolean;

  constructor(options: CacheOptions = {}) {
    this.cache = new Map();
    this.maxSize = options.maxSize || 100;
    this.ttl = options.ttl || 5 * 60 * 1000; // Default 5 minutes
    this.enableStats = options.enableStats !== false;
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      hitRate: 0,
      evictions: 0,
    };

  }

  /**
   * Get item from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.recordMiss();
      return null;
    }

    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      this.recordMiss();
      return null;
    }

    // Update access information
    entry.accessCount++;
    entry.lastAccessed = now;

    this.recordHit();

    return entry.data as T;
  }

  /**
   * Set item in cache
   */
  set<T>(key: string, data: T): void {
    // Evict if at max size
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now(),
    };

    this.cache.set(key, entry);
    this.updateSize();

  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    if (now - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete item from cache
   */
  delete(key: string): boolean {
    const result = this.cache.delete(key);
    this.updateSize();
    return result;
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.stats.size = 0;
  }

  /**
   * Invalidate cache entries matching pattern
   */
  invalidate(pattern: string | RegExp): number {
    let count = 0;
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }

    this.updateSize();

    return count;
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      this.stats.evictions++;
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let count = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
        count++;
      }
    }

    this.updateSize();

    return count;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      size: this.cache.size,
      hitRate: 0,
      evictions: 0,
    };
  }

  /**
   * Record cache hit
   */
  private recordHit(): void {
    if (!this.enableStats) return;
    this.stats.hits++;
    this.updateHitRate();
  }

  /**
   * Record cache miss
   */
  private recordMiss(): void {
    if (!this.enableStats) return;
    this.stats.misses++;
    this.updateHitRate();
  }

  /**
   * Update hit rate
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  /**
   * Update cache size
   */
  private updateSize(): void {
    this.stats.size = this.cache.size;
  }

  /**
   * Get cache keys matching pattern
   */
  getKeys(pattern?: string | RegExp): string[] {
    if (!pattern) {
      return Array.from(this.cache.keys());
    }

    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    return Array.from(this.cache.keys()).filter((key) => regex.test(key));
  }

  /**
   * Get cache size
   */
  getSize(): number {
    return this.cache.size;
  }

  /**
   * Check if cache is full
   */
  isFull(): boolean {
    return this.cache.size >= this.maxSize;
  }

  /**
   * Get TTL for key
   */
  getTTL(key: string): number | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const elapsed = Date.now() - entry.timestamp;
    return Math.max(0, this.ttl - elapsed);
  }

  /**
   * Update TTL for cache instance
   */
  setTTL(ttl: number): void {
    this.ttl = ttl;
  }
}

// Create singleton instances for different cache types
const productCache = new ProductCacheService({
  maxSize: 50,
  ttl: 10 * 60 * 1000, // 10 minutes for product details
  enableStats: true,
});

const reviewsCache = new ProductCacheService({
  maxSize: 30,
  ttl: 5 * 60 * 1000, // 5 minutes for reviews
  enableStats: true,
});

const priceCache = new ProductCacheService({
  maxSize: 100,
  ttl: 2 * 60 * 1000, // 2 minutes for prices (more volatile)
  enableStats: true,
});

const listCache = new ProductCacheService({
  maxSize: 20,
  ttl: 3 * 60 * 1000, // 3 minutes for product lists
  enableStats: true,
});

// Auto cleanup every 5 minutes (guarded against hot-reload duplication)
let cleanupInterval: ReturnType<typeof setInterval> | null = null;
if (!cleanupInterval) {
  cleanupInterval = setInterval(() => {
    productCache.cleanup();
    reviewsCache.cleanup();
    priceCache.cleanup();
    listCache.cleanup();
  }, 5 * 60 * 1000);
}

export { ProductCacheService, productCache, reviewsCache, priceCache, listCache };
export default productCache;
