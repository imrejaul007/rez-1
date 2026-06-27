import asyncStorageService from './asyncStorageService';
// Lazy-loaded: pako (50KB compression lib) only loaded when compression is used
let _pako: typeof import('pako') | null = null;
const getPako = async () => {
  if (!_pako) _pako = await import('pako');
  return _pako;
};
import { FILE_SIZE_LIMITS } from '@/utils/fileUploadConstants';

/**
 * Cache Service
 * Generic caching service with TTL, compression, and intelligent eviction
 */

export interface CacheEntry<T = any> {
  key: string;
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  size: number; // Estimated size in bytes
  priority: 'low' | 'medium' | 'high' | 'critical';
  compressed: boolean;
  version: string; // For cache migration
  accessCount: number;
  lastAccessed: number;
}

// Lightweight index entry - stores metadata only, not actual data
// This prevents memory bloat from storing all cached data in memory
export interface CacheIndexEntry {
  key: string;
  timestamp: number;
  ttl: number;
  size: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  compressed: boolean;
  version: string;
  accessCount: number;
  lastAccessed: number;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds (default: 1 hour)
  priority?: 'low' | 'medium' | 'high' | 'critical';
  compress?: boolean; // Compress large data (default: true for data > 10KB)
  version?: string; // Cache version for migration
}

export interface CacheStats {
  totalEntries: number;
  totalSize: string;
  hitRate: number;
  oldestEntry: string | null;
  newestEntry: string | null;
  entriesByPriority: Record<string, number>;
}

const CACHE_PREFIX = 'cache_';
const CACHE_INDEX_KEY = 'cache_index';
const DEFAULT_TTL = 60 * 60 * 1000; // 1 hour
const MAX_CACHE_SIZE = 5 * 1024 * 1024; // 5MB - reduced from 10MB to prevent memory issues
const MAX_CACHE_ENTRIES = 100; // Maximum number of cache entries to prevent index bloat
const COMPRESSION_THRESHOLD = 10 * 1024; // 10KB
const CURRENT_CACHE_VERSION = '1.0.0';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

class CacheService {
  // Store only metadata in memory, NOT the actual cached data
  // This prevents memory bloat - actual data is loaded from AsyncStorage on demand
  private cacheIndex: Map<string, CacheIndexEntry> = new Map();
  private hits = 0;
  private misses = 0;
  private initialized = false;
  private initializing = false; // Prevent multiple initialization attempts

  constructor() {
    // Initialization deferred to first use (ensureInitialized) to avoid
    // AsyncStorage reads during app startup when cacheService is imported
  }

  /**
   * Initialize cache service
   */
  private async initialize(): Promise<void> {
    // Skip initialization during SSR
    if (!isBrowser || this.initialized || this.initializing) return;

    this.initializing = true;

    try {

      // Load cache index
      const index = await asyncStorageService.get<Record<string, CacheEntry>>(CACHE_INDEX_KEY);

      if (index) {
        this.cacheIndex = new Map(Object.entries(index));

        // Clean up expired entries
        await this.cleanupExpired();

        // Check cache size and evict if necessary
        await this.evictIfNeeded();
      }

      this.initialized = true;
      this.initializing = false;
    } catch (error) {
      this.cacheIndex = new Map();
      this.initialized = true;
      this.initializing = false;
    }
  }

  /**
   * Wait for initialization
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Generate cache key
   */
  private getCacheKey(key: string): string {
    return `${CACHE_PREFIX}${key}`;
  }

  /**
   * Save cache index to storage
   */
  private async saveCacheIndex(): Promise<void> {
    try {
      const indexObject = Object.fromEntries(this.cacheIndex.entries());
      await asyncStorageService.save(CACHE_INDEX_KEY, indexObject);
    } catch (_error) {
      // silently handle
    }
  }

  /**
   * Convert Uint8Array to base64 string (web-compatible)
   */
  private uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert base64 string to Uint8Array (web-compatible)
   */
  private base64ToUint8Array(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Compress data using pako
   */
  private async compress(data: any): Promise<string> {
    try {
      const jsonString = JSON.stringify(data);
      const pako = await getPako();
      const compressed = pako.deflate(jsonString, { level: 6 });
      return this.uint8ArrayToBase64(compressed);
    } catch (error) {
      return JSON.stringify(data);
    }
  }

  /**
   * Decompress data using pako
   * Handles both new base64 format and legacy uncompressed JSON
   */
  private async decompress(compressedData: string): Promise<any> {
    try {
      // First, try to parse as plain JSON (legacy uncompressed format)
      if (compressedData.startsWith('{') || compressedData.startsWith('[')) {
        return JSON.parse(compressedData);
      }
      
      // Try new base64 + pako format
      const bytes = this.base64ToUint8Array(compressedData);
      const pakoLib = await getPako();
      const decompressed = pakoLib.inflate(bytes, { to: 'string' });
      return JSON.parse(decompressed);
    } catch (error) {
      // If decompression fails, try parsing as plain JSON
      try {
        return JSON.parse(compressedData);
      } catch {
        // Return null to indicate cache miss, triggering fresh fetch
        return null;
      }
    }
  }

  /**
   * Estimate data size in bytes
   */
  private estimateSize(data: any): number {
    const jsonString = JSON.stringify(data);
    return new Blob([jsonString]).size;
  }

  /**
   * Get total cache size
   */
  private getTotalCacheSize(): number {
    let total = 0;
    this.cacheIndex.forEach(entry => {
      total += entry.size;
    });
    return total;
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    const now = Date.now();
    return now - entry.timestamp > entry.ttl;
  }

  /**
   * Clean up expired entries
   */
  private async cleanupExpired(): Promise<number> {
    const expiredKeys: string[] = [];

    this.cacheIndex.forEach((entry, key) => {
      if (this.isExpired(entry)) {
        expiredKeys.push(key);
      }
    });

    if (expiredKeys.length > 0) {

      for (const key of expiredKeys) {
        await this.remove(key);
      }
    }

    return expiredKeys.length;
  }

  /**
   * Evict entries if cache size or entry count exceeds limit
   */
  private async evictIfNeeded(): Promise<void> {
    const totalSize = this.getTotalCacheSize();
    const entryCount = this.cacheIndex.size;

    // Check if we need to evict based on size or entry count
    const needsSizeEviction = totalSize > MAX_CACHE_SIZE;
    const needsCountEviction = entryCount > MAX_CACHE_ENTRIES;

    if (!needsSizeEviction && !needsCountEviction) {
      return;
    }

    // Sort entries by priority and last accessed time
    const entries = Array.from(this.cacheIndex.entries()).sort((a, b) => {
      const [, entryA] = a;
      const [, entryB] = b;

      // Priority order: low < medium < high < critical
      const priorityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
      const priorityDiff = priorityOrder[entryA.priority] - priorityOrder[entryB.priority];

      if (priorityDiff !== 0) {
        return priorityDiff; // Lower priority first
      }

      // If same priority, evict least recently accessed
      return entryA.lastAccessed - entryB.lastAccessed;
    });

    // Evict entries until we're under 80% of max size AND under max entry count
    const targetSize = MAX_CACHE_SIZE * 0.8;
    const targetCount = Math.floor(MAX_CACHE_ENTRIES * 0.8);
    let currentSize = totalSize;
    let currentCount = entryCount;
    let evicted = 0;

    for (const [key, entry] of entries) {
      if (currentSize <= targetSize && currentCount <= targetCount) {
        break;
      }

      // Don't evict critical entries
      if (entry.priority === 'critical') {
        continue;
      }

      await this.remove(key);
      currentSize -= entry.size;
      currentCount--;
      evicted++;
    }

  }

  /**
   * Format size in human-readable format
   */
  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  /**
   * Set cache entry
   */
  async set<T>(key: string, data: T, options: CacheOptions = {}): Promise<void> {
    await this.ensureInitialized();

    try {
      const {
        ttl = DEFAULT_TTL,
        priority = 'medium',
        compress,
        version = CURRENT_CACHE_VERSION
      } = options;

      const estimatedSize = this.estimateSize(data);
      const shouldCompress = compress !== undefined ? compress : estimatedSize > COMPRESSION_THRESHOLD;

      let dataToStore: any;
      let actualSize: number;

      if (shouldCompress) {
        dataToStore = await this.compress(data);
        actualSize = new Blob([dataToStore]).size;
      } else {
        dataToStore = data;
        actualSize = estimatedSize;
      }

      const now = Date.now();

      // Full entry with data - saved to AsyncStorage only
      const cacheEntry: CacheEntry<T> = {
        key,
        data: dataToStore,
        timestamp: now,
        ttl,
        size: actualSize,
        priority,
        compressed: shouldCompress,
        version,
        accessCount: 0,
        lastAccessed: now
      };

      // Lightweight index entry - stored in memory (no data to prevent memory bloat)
      const indexEntry: CacheIndexEntry = {
        key,
        timestamp: now,
        ttl,
        size: actualSize,
        priority,
        compressed: shouldCompress,
        version,
        accessCount: 0,
        lastAccessed: now
      };

      // Save full entry to storage
      const cacheKey = this.getCacheKey(key);
      await asyncStorageService.save(cacheKey, cacheEntry);

      // Update index with metadata only (no data)
      this.cacheIndex.set(key, indexEntry);
      await this.saveCacheIndex();

      // Check if we need to evict
      await this.evictIfNeeded();

    } catch (_error) {
      // silently handle
    }
  }

  /**
   * Get cache entry
   */
  async get<T>(key: string): Promise<T | null> {
    await this.ensureInitialized();

    try {
      // Check if entry exists in index
      const indexEntry = this.cacheIndex.get(key);

      if (!indexEntry) {
        this.misses++;
        return null;
      }

      // Check if expired
      if (this.isExpired(indexEntry)) {
        this.misses++;
        await this.remove(key);
        return null;
      }

      // Load from storage
      const cacheKey = this.getCacheKey(key);
      const cacheEntry = await asyncStorageService.get<CacheEntry<T>>(cacheKey);

      if (!cacheEntry) {
        this.misses++;
        this.cacheIndex.delete(key);
        await this.saveCacheIndex();
        return null;
      }

      // Check version compatibility
      if (cacheEntry.version !== CURRENT_CACHE_VERSION) {
        await this.remove(key);
        return null;
      }

      // Update access stats in index (metadata only, no data)
      const now = Date.now();
      indexEntry.accessCount++;
      indexEntry.lastAccessed = now;
      this.cacheIndex.set(key, indexEntry);
      // Don't save index on every get - too expensive, just update in memory

      // Decompress if needed
      let data: T;
      if (cacheEntry.compressed) {
        data = await this.decompress(cacheEntry.data as string) as T;
      } else {
        data = cacheEntry.data as T;
      }

      this.hits++;

      return data;
    } catch (error) {
      this.misses++;
      return null;
    }
  }

  /**
   * Check if cache has entry
   */
  async has(key: string): Promise<boolean> {
    await this.ensureInitialized();

    const indexEntry = this.cacheIndex.get(key);

    if (!indexEntry) {
      return false;
    }

    if (this.isExpired(indexEntry)) {
      await this.remove(key);
      return false;
    }

    return true;
  }

  /**
   * Remove cache entry
   */
  async remove(key: string): Promise<void> {
    await this.ensureInitialized();

    try {
      const cacheKey = this.getCacheKey(key);
      await asyncStorageService.remove(cacheKey);
      this.cacheIndex.delete(key);
      await this.saveCacheIndex();
    } catch (_error) {
      // silently handle
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    await this.ensureInitialized();

    try {

      // Remove all cache entries from storage
      const keys = Array.from(this.cacheIndex.keys());
      for (const key of keys) {
        const cacheKey = this.getCacheKey(key);
        await asyncStorageService.remove(cacheKey);
      }

      // Clear index
      this.cacheIndex.clear();
      await asyncStorageService.remove(CACHE_INDEX_KEY);

      // Reset stats
      this.hits = 0;
      this.misses = 0;

    } catch (_error) {
      // silently handle
    }
  }

  /**
   * Clear expired entries
   */
  async clearExpired(): Promise<number> {
    await this.ensureInitialized();
    return await this.cleanupExpired();
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    await this.ensureInitialized();

    const entries = Array.from(this.cacheIndex.values());
    const totalSize = this.getTotalCacheSize();

    const entriesByPriority = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };

    let oldestTimestamp = Infinity;
    let newestTimestamp = 0;
    let oldestKey: string | null = null;
    let newestKey: string | null = null;

    entries.forEach(entry => {
      entriesByPriority[entry.priority]++;

      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = entry.key;
      }

      if (entry.timestamp > newestTimestamp) {
        newestTimestamp = entry.timestamp;
        newestKey = entry.key;
      }
    });

    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0 ? (this.hits / totalRequests) * 100 : 0;

    return {
      totalEntries: this.cacheIndex.size,
      totalSize: this.formatSize(totalSize),
      hitRate: Math.round(hitRate * 100) / 100,
      oldestEntry: oldestKey,
      newestEntry: newestKey,
      entriesByPriority
    };
  }

  /**
   * Get all cache keys
   */
  async getKeys(): Promise<string[]> {
    await this.ensureInitialized();
    return Array.from(this.cacheIndex.keys());
  }

  /**
   * Stale-while-revalidate pattern
   * Returns cached data immediately and optionally revalidates in background
   */
  async getWithRevalidation<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    await this.ensureInitialized();

    // Try to get cached data
    const cachedData = await this.get<T>(key);

    if (cachedData) {
      // Return cached data immediately

      // Check if cache is stale (older than 50% of TTL)
      const indexEntry = this.cacheIndex.get(key);
      if (indexEntry) {
        const age = Date.now() - indexEntry.timestamp;
        const isStale = age > (indexEntry.ttl * 0.5);

        if (isStale) {
          // Revalidate in background
          fetchFn()
            .then(freshData => {
              this.set(key, freshData, options);
            })
            .catch(() => {});
        }
      }

      return cachedData;
    }

    // No cached data, fetch fresh
    const freshData = await fetchFn();
    await this.set(key, freshData, options);
    return freshData;
  }

  /**
   * Redis-style caching pattern for leaderboards
   * Automatically invalidates and refreshes data
   */
  async getLeaderboard<T>(
    period: string,
    fetchFn: () => Promise<T>,
    options: { ttl?: number; forceRefresh?: boolean } = {}
  ): Promise<T> {
    const key = `leaderboard_${period}`;
    const ttl = options.ttl || 5 * 60 * 1000; // 5 minutes default

    // Force refresh if requested
    if (options.forceRefresh) {
      const freshData = await fetchFn();
      await this.set(key, freshData, { ttl, priority: 'high' });
      return freshData;
    }

    // Try cache first with stale-while-revalidate
    return this.getWithRevalidation(key, fetchFn, { ttl, priority: 'high' });
  }

  /**
   * Cache invalidation for leaderboard on new game completion
   */
  async invalidateLeaderboard(period?: string): Promise<void> {
    if (period) {
      await this.remove(`leaderboard_${period}`);
    } else {
      // Invalidate all leaderboard caches
      const keys = await this.getKeys();
      const leaderboardKeys = keys.filter(k => k.startsWith('leaderboard_'));
      for (const key of leaderboardKeys) {
        await this.remove(key);
      }
    }
  }

  /**
   * Cache achievements with 10-minute TTL
   */
  async getAchievements<T>(
    userId: string,
    fetchFn: () => Promise<T>,
    forceRefresh?: boolean
  ): Promise<T> {
    const key = `achievements_${userId}`;
    const ttl = 10 * 60 * 1000; // 10 minutes

    if (forceRefresh) {
      const freshData = await fetchFn();
      await this.set(key, freshData, { ttl, priority: 'medium' });
      return freshData;
    }

    return this.getWithRevalidation(key, fetchFn, { ttl, priority: 'medium' });
  }

  /**
   * Cache challenges with 5-minute TTL
   */
  async getChallenges<T>(
    fetchFn: () => Promise<T>,
    forceRefresh?: boolean
  ): Promise<T> {
    const key = 'challenges_active';
    const ttl = 5 * 60 * 1000; // 5 minutes

    if (forceRefresh) {
      const freshData = await fetchFn();
      await this.set(key, freshData, { ttl, priority: 'medium' });
      return freshData;
    }

    return this.getWithRevalidation(key, fetchFn, { ttl, priority: 'medium' });
  }

  /**
   * Invalidate achievement cache when new achievement is unlocked
   */
  async invalidateAchievements(userId: string): Promise<void> {
    await this.remove(`achievements_${userId}`);
  }

  /**
   * Invalidate challenge cache when challenge is completed
   */
  async invalidateChallenges(): Promise<void> {
    await this.remove('challenges_active');
  }

  /**
   * Batch set multiple entries
   */
  async setMany(entries: Array<{ key: string; data: any; options?: CacheOptions }>): Promise<void> {
    await this.ensureInitialized();


    for (const entry of entries) {
      await this.set(entry.key, entry.data, entry.options);
    }
  }

  /**
   * Batch get multiple entries
   */
  async getMany<T>(keys: string[]): Promise<Record<string, T | null>> {
    await this.ensureInitialized();

    const results: Record<string, T | null> = {};

    for (const key of keys) {
      results[key] = await this.get<T>(key);
    }

    return results;
  }

  /**
   * Get entries by priority
   */
  async getByPriority(priority: CacheEntry['priority']): Promise<string[]> {
    await this.ensureInitialized();

    const keys: string[] = [];

    this.cacheIndex.forEach((entry, key) => {
      if (entry.priority === priority) {
        keys.push(key);
      }
    });

    return keys;
  }

  /**
   * Update entry TTL
   */
  async updateTTL(key: string, newTTL: number): Promise<boolean> {
    await this.ensureInitialized();

    const indexEntry = this.cacheIndex.get(key);

    if (!indexEntry) {
      return false;
    }

    indexEntry.ttl = newTTL;
    this.cacheIndex.set(key, indexEntry);
    await this.saveCacheIndex();

    return true;
  }

  /**
   * Migrate cache to new version
   */
  async migrate(migrationFn: (oldData: any) => any): Promise<void> {
    await this.ensureInitialized();


    const keys = Array.from(this.cacheIndex.keys());
    let migrated = 0;

    for (const key of keys) {
      const data = await this.get(key);

      if (data) {
        try {
          const migratedData = migrationFn(data);
          await this.set(key, migratedData, {
            version: CURRENT_CACHE_VERSION
          });
          migrated++;
        } catch (_error) {
          // silently handle
        }
      }
    }

  }

  /**
   * Smart Cache Invalidation Strategies
   */

  /**
   * Invalidate cache entries by pattern matching
   * @param pattern - Glob-like pattern (e.g., "products:*", "homepage:*")
   */
  async invalidatePattern(pattern: string): Promise<number> {
    await this.ensureInitialized();

    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const keysToInvalidate: string[] = [];

    this.cacheIndex.forEach((entry, key) => {
      if (regex.test(key)) {
        keysToInvalidate.push(key);
      }
    });


    for (const key of keysToInvalidate) {
      await this.remove(key);
    }

    return keysToInvalidate.length;
  }

  /**
   * Invalidate cache entries by dependency
   * @param dependencies - Map of cache keys to dependent keys
   */
  async invalidateDependencies(key: string, dependencies: string[]): Promise<void> {
    await this.ensureInitialized();


    // Invalidate the main key
    await this.remove(key);

    // Invalidate all dependent keys
    for (const dependentKey of dependencies) {
      await this.remove(dependentKey);
    }

  }

  /**
   * Invalidate cache entries by event
   * Event-based invalidation for specific user actions
   */
  async invalidateByEvent(event: CacheInvalidationEvent): Promise<void> {
    await this.ensureInitialized();


    switch (event.type) {
      case 'cart:add':
      case 'cart:remove':
      case 'cart:update':
      case 'cart:clear':
        // Invalidate cart-related caches
        await this.invalidatePattern('cart:*');
        await this.invalidatePattern('checkout:*');
        // Also invalidate homepage "Just for You" (recommendations may change)
        await this.remove('homepage:justForYou');
        break;

      case 'order:placed':
        // Invalidate cart, checkout, and order-related caches
        await this.invalidatePattern('cart:*');
        await this.invalidatePattern('checkout:*');
        await this.invalidatePattern('orders:*');
        // Invalidate user stats
        await this.invalidatePattern('userStats:*');
        // Invalidate homepage sections (they may show different data)
        await this.invalidatePattern('homepage:*');
        break;

      case 'product:purchased':
        // Invalidate product and homepage caches
        await this.invalidatePattern('products:*');
        await this.invalidatePattern('homepage:*');
        if (event.productId) {
          await this.remove(`product:${event.productId}`);
        }
        break;

      case 'user:login':
      case 'user:logout':
        // Clear all user-specific caches
        await this.invalidatePattern('cart:*');
        await this.invalidatePattern('wishlist:*');
        await this.invalidatePattern('orders:*');
        await this.invalidatePattern('userStats:*');
        await this.invalidatePattern('profile:*');
        break;

      case 'profile:updated':
        // Invalidate profile and related caches
        await this.invalidatePattern('profile:*');
        await this.invalidatePattern('userStats:*');
        break;

      case 'wishlist:add':
      case 'wishlist:remove':
        // Invalidate wishlist caches
        await this.invalidatePattern('wishlist:*');
        break;

      case 'refresh:pull':
        // User pulled to refresh - invalidate current screen caches
        if (event.screen) {
          await this.invalidatePattern(`${event.screen}:*`);
        }
        break;

      default:
    }
  }

  /**
   * Check if cache entry is stale (older than 50% of TTL)
   */
  async isStale(key: string): Promise<boolean> {
    await this.ensureInitialized();

    const entry = this.cacheIndex.get(key);

    if (!entry) {
      return true; // Not in cache = stale
    }

    const age = Date.now() - entry.timestamp;
    const staleness = age / entry.ttl;

    return staleness > 0.5;
  }

  /**
   * Get all stale cache entries
   */
  async getStaleEntries(): Promise<string[]> {
    await this.ensureInitialized();

    const staleKeys: string[] = [];

    for (const [key, entry] of this.cacheIndex.entries()) {
      const age = Date.now() - entry.timestamp;
      const staleness = age / entry.ttl;

      if (staleness > 0.5) {
        staleKeys.push(key);
      }
    }

    return staleKeys;
  }

  /**
   * Background refresh for stale entries
   * Returns a promise that resolves with the fresh data
   */
  async backgroundRefresh<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<void> {
    await this.ensureInitialized();

    try {
      // Fetch fresh data in background
      const freshData = await fetchFn();

      // Update cache
      await this.set(key, freshData, options);

    } catch (_error) {
      // silently handle
    }
  }

  /**
   * Invalidate all entries modified before a specific date
   */
  async invalidateBefore(date: Date): Promise<number> {
    await this.ensureInitialized();

    const timestamp = date.getTime();
    const keysToInvalidate: string[] = [];

    this.cacheIndex.forEach((entry, key) => {
      if (entry.timestamp < timestamp) {
        keysToInvalidate.push(key);
      }
    });


    for (const key of keysToInvalidate) {
      await this.remove(key);
    }

    return keysToInvalidate.length;
  }

  /**
   * Invalidate entries by tag/category
   */
  async invalidateByTag(tag: string): Promise<number> {
    await this.ensureInitialized();

    // Extract tag from key (format: "tag:category:id")
    const keysToInvalidate: string[] = [];

    this.cacheIndex.forEach((entry, key) => {
      const parts = key.split(':');
      if (parts[0] === tag) {
        keysToInvalidate.push(key);
      }
    });


    for (const key of keysToInvalidate) {
      await this.remove(key);
    }

    return keysToInvalidate.length;
  }

  /**
   * Warm cache with pre-specified keys
   * Useful for preloading critical data on app start
   */
  async warmCacheWithKeys(keysAndFetchers: Array<{ key: string; fetchFn: () => Promise<any>; options?: CacheOptions }>): Promise<void> {
    await this.ensureInitialized();


    const promises = keysAndFetchers.map(async ({ key, fetchFn, options }) => {
      try {
        // Check if already cached and valid
        const exists = await this.has(key);
        if (exists) {
          return;
        }

        // Fetch and cache
        const data = await fetchFn();
        await this.set(key, data, options);
      } catch (_error) {
        // silently handle
      }
    });

    await Promise.all(promises);
  }

  /**
   * Get or set pattern - returns cached value or fetches and caches
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    await this.ensureInitialized();

    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const fresh = await fetchFn();
    await this.set(key, fresh, options);
    return fresh;
  }
}

/**
 * Cache invalidation event types
 */
export interface CacheInvalidationEvent {
  type:
    | 'cart:add'
    | 'cart:remove'
    | 'cart:update'
    | 'cart:clear'
    | 'order:placed'
    | 'product:purchased'
    | 'user:login'
    | 'user:logout'
    | 'profile:updated'
    | 'wishlist:add'
    | 'wishlist:remove'
    | 'refresh:pull';
  productId?: string;
  userId?: string;
  screen?: string;
}

// Singleton pattern using globalThis to persist across SSR module re-evaluations
const CACHE_SERVICE_KEY = '__rezCacheService__';

function getCacheService(): CacheService {
  if (typeof globalThis !== 'undefined') {
    if (!(globalThis as any)[CACHE_SERVICE_KEY]) {
      (globalThis as any)[CACHE_SERVICE_KEY] = new CacheService();
    }
    return (globalThis as any)[CACHE_SERVICE_KEY];
  }
  return new CacheService();
}

export default getCacheService();
