import { logger } from '../config/logger';

export interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  expiresAt: Date;
  accessCount: number;
  lastAccessed: Date;
  tags: string[];
}

export interface CacheConfig {
  defaultTTL: number; // Time to live in seconds
  maxEntries: number;
  cleanupInterval: number; // Cleanup interval in seconds
  persistToDisk: boolean;
}

export interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  memoryUsage: number;
  oldestEntry?: Date;
  newestEntry?: Date;
}

export class CacheService {
  private static cache: Map<string, CacheEntry<any>> = new Map();
  private static stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0
  };
  private static cleanupInterval: NodeJS.Timeout | null = null;
  private static config: CacheConfig = {
    defaultTTL: 300, // 5 minutes
    maxEntries: 1000,
    cleanupInterval: 60, // 1 minute
    persistToDisk: false
  };

  // Initialize cache service
  static initialize(config?: Partial<CacheConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval * 1000);

    logger.info('💾 Cache service initialized');
  }

  // Get item from cache
  static get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (entry.expiresAt < new Date()) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access info
    entry.accessCount++;
    entry.lastAccessed = new Date();
    this.stats.hits++;

    return entry.data;
  }

  // Set item in cache
  static set<T>(key: string, data: T, ttlSeconds?: number, tags: string[] = []): void {
    const now = new Date();
    const ttl = ttlSeconds || this.config.defaultTTL;
    const expiresAt = new Date(now.getTime() + ttl * 1000);

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt,
      accessCount: 0,
      lastAccessed: now,
      tags
    };

    // Check if we need to evict entries
    if (this.cache.size >= this.config.maxEntries) {
      this.evictLRU();
    }

    this.cache.set(key, entry);
    this.stats.sets++;
  }

  // Delete item from cache
  static delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
    }
    return deleted;
  }

  // Check if key exists in cache
  static has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Check if expired
    if (entry.expiresAt < new Date()) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  // Clear entire cache
  static clear(): void {
    this.cache.clear();
    this.resetStats();
  }

  // Clear cache by tags
  static clearByTag(tag: string): number {
    let cleared = 0;
    for (const [key, entry] of this.cache) {
      if (entry.tags.includes(tag)) {
        this.cache.delete(key);
        cleared++;
      }
    }
    return cleared;
  }

  // Get or set pattern (with callback for miss)
  static async getOrSet<T>(
    key: string, 
    factory: () => Promise<T> | T, 
    ttlSeconds?: number,
    tags: string[] = []
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await factory();
    this.set(key, data, ttlSeconds, tags);
    return data;
  }

  // Batch get multiple keys
  static getBatch<T>(keys: string[]): Record<string, T | null> {
    const result: Record<string, T | null> = {};
    for (const key of keys) {
      result[key] = this.get<T>(key);
    }
    return result;
  }

  // Batch set multiple key-value pairs
  static setBatch<T>(items: Record<string, T>, ttlSeconds?: number, tags: string[] = []): void {
    for (const [key, data] of Object.entries(items)) {
      this.set(key, data, ttlSeconds, tags);
    }
  }

  // Update TTL for existing key
  static updateTTL(key: string, ttlSeconds: number): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    entry.expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    return true;
  }

  // Get cache statistics
  static getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalEntries = entries.length;
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;

    let oldestEntry: Date | undefined;
    let newestEntry: Date | undefined;

    if (entries.length > 0) {
      oldestEntry = entries.reduce((oldest, entry) => 
        entry.timestamp < oldest ? entry.timestamp : oldest, entries[0].timestamp);
      newestEntry = entries.reduce((newest, entry) => 
        entry.timestamp > newest ? entry.timestamp : newest, entries[0].timestamp);
    }

    return {
      totalEntries,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      hitRate: parseFloat(hitRate.toFixed(2)),
      memoryUsage: this.estimateMemoryUsage(),
      oldestEntry,
      newestEntry
    };
  }

  // Cleanup expired entries
  private static cleanup(): void {
    const now = new Date();
    let cleaned = 0;

    for (const [key, entry] of this.cache) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info(`🧹 Cache cleanup: removed ${cleaned} expired entries`);
    }
  }

  // Evict least recently used entry
  private static evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = new Date();

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      logger.info(`🗑️ Cache eviction: removed LRU entry ${lruKey}`);
    }
  }

  // Estimate memory usage (rough calculation)
  private static estimateMemoryUsage(): number {
    let bytes = 0;
    for (const [key, entry] of this.cache) {
      bytes += key.length * 2; // String chars are 2 bytes
      bytes += JSON.stringify(entry.data).length * 2;
      bytes += 200; // Rough estimate for entry metadata
    }
    return bytes;
  }

  // Reset statistics
  private static resetStats(): void {
    this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
  }

  // Shutdown cache service
  static shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
    logger.info('💾 Cache service shut down');
  }
}

// Specialized caching for different data types
export class MerchantCacheService {
  private static readonly CACHE_PREFIXES = {
    DASHBOARD_METRICS: 'dashboard_metrics:',
    PRODUCT_LIST: 'product_list:',
    ORDER_LIST: 'order_list:',
    CASHBACK_LIST: 'cashback_list:',
    MERCHANT_PROFILE: 'merchant_profile:',
    BUSINESS_METRICS: 'business_metrics:',
    TIME_SERIES: 'time_series:',
    CATEGORY_PERFORMANCE: 'category_performance:',
    CUSTOMER_INSIGHTS: 'customer_insights:'
  };

  private static readonly CACHE_TTL = {
    DASHBOARD_METRICS: 300, // 5 minutes
    PRODUCT_LIST: 600, // 10 minutes
    ORDER_LIST: 180, // 3 minutes
    CASHBACK_LIST: 300, // 5 minutes
    MERCHANT_PROFILE: 1800, // 30 minutes
    BUSINESS_METRICS: 600, // 10 minutes
    TIME_SERIES: 900, // 15 minutes
    CATEGORY_PERFORMANCE: 1800, // 30 minutes
    CUSTOMER_INSIGHTS: 1200 // 20 minutes
  };

  // Cache dashboard metrics
  static async getDashboardMetrics(merchantId: string, factory: () => Promise<any>): Promise<any> {
    const key = `${this.CACHE_PREFIXES.DASHBOARD_METRICS}${merchantId}`;
    return CacheService.getOrSet(
      key, 
      factory, 
      this.CACHE_TTL.DASHBOARD_METRICS,
      ['dashboard', 'metrics', merchantId]
    );
  }

  // Cache product list
  static async getProductList(merchantId: string, filters: string, factory: () => Promise<any>): Promise<any> {
    const key = `${this.CACHE_PREFIXES.PRODUCT_LIST}${merchantId}:${this.hashFilters(filters)}`;
    return CacheService.getOrSet(
      key, 
      factory, 
      this.CACHE_TTL.PRODUCT_LIST,
      ['products', merchantId]
    );
  }

  // Cache order list
  static async getOrderList(merchantId: string, filters: string, factory: () => Promise<any>): Promise<any> {
    const key = `${this.CACHE_PREFIXES.ORDER_LIST}${merchantId}:${this.hashFilters(filters)}`;
    return CacheService.getOrSet(
      key, 
      factory, 
      this.CACHE_TTL.ORDER_LIST,
      ['orders', merchantId]
    );
  }

  // Cache cashback list
  static async getCashbackList(merchantId: string, filters: string, factory: () => Promise<any>): Promise<any> {
    const key = `${this.CACHE_PREFIXES.CASHBACK_LIST}${merchantId}:${this.hashFilters(filters)}`;
    return CacheService.getOrSet(
      key, 
      factory, 
      this.CACHE_TTL.CASHBACK_LIST,
      ['cashback', merchantId]
    );
  }

  // Cache merchant profile
  static async getMerchantProfile(merchantId: string, factory: () => Promise<any>): Promise<any> {
    const key = `${this.CACHE_PREFIXES.MERCHANT_PROFILE}${merchantId}`;
    return CacheService.getOrSet(
      key, 
      factory, 
      this.CACHE_TTL.MERCHANT_PROFILE,
      ['merchant', merchantId]
    );
  }

  // Cache business metrics
  static async getBusinessMetrics(merchantId: string, factory: () => Promise<any>): Promise<any> {
    const key = `${this.CACHE_PREFIXES.BUSINESS_METRICS}${merchantId}`;
    return CacheService.getOrSet(
      key, 
      factory, 
      this.CACHE_TTL.BUSINESS_METRICS,
      ['metrics', merchantId]
    );
  }

  // Cache time series data
  static async getTimeSeriesData(merchantId: string, days: number, factory: () => Promise<any>): Promise<any> {
    const key = `${this.CACHE_PREFIXES.TIME_SERIES}${merchantId}:${days}`;
    return CacheService.getOrSet(
      key, 
      factory, 
      this.CACHE_TTL.TIME_SERIES,
      ['timeseries', merchantId]
    );
  }

  // Cache category performance
  static async getCategoryPerformance(merchantId: string, factory: () => Promise<any>): Promise<any> {
    const key = `${this.CACHE_PREFIXES.CATEGORY_PERFORMANCE}${merchantId}`;
    return CacheService.getOrSet(
      key, 
      factory, 
      this.CACHE_TTL.CATEGORY_PERFORMANCE,
      ['categories', merchantId]
    );
  }

  // Cache customer insights
  static async getCustomerInsights(merchantId: string, factory: () => Promise<any>): Promise<any> {
    const key = `${this.CACHE_PREFIXES.CUSTOMER_INSIGHTS}${merchantId}`;
    return CacheService.getOrSet(
      key, 
      factory, 
      this.CACHE_TTL.CUSTOMER_INSIGHTS,
      ['customers', merchantId]
    );
  }

  // Invalidate cache for merchant
  static invalidateMerchantCache(merchantId: string): void {
    CacheService.clearByTag(merchantId);
  }

  // Invalidate specific data type for merchant
  static invalidateDataType(merchantId: string, dataType: 'products' | 'orders' | 'cashback' | 'metrics' | 'merchant'): void {
    CacheService.clearByTag(dataType);
    if (dataType === 'products' || dataType === 'orders' || dataType === 'cashback') {
      // Also invalidate related metrics
      CacheService.clearByTag('metrics');
      CacheService.clearByTag('dashboard');
    }
  }

  // Hash filters for consistent cache keys
  private static hashFilters(filters: string): string {
    // Simple hash function for cache key consistency
    let hash = 0;
    for (let i = 0; i < filters.length; i++) {
      const char = filters.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

// Memory-efficient cache for large datasets
export class StreamingCacheService {
  private static readonly CHUNK_SIZE = 100;
  private static chunkedCache: Map<string, Map<number, any>> = new Map();

  // Cache large dataset in chunks
  static setChunkedData<T>(key: string, data: T[], ttlSeconds?: number): void {
    const chunks = new Map<number, T[]>();
    
    for (let i = 0; i < data.length; i += this.CHUNK_SIZE) {
      const chunk = data.slice(i, i + this.CHUNK_SIZE);
      const chunkIndex = Math.floor(i / this.CHUNK_SIZE);
      chunks.set(chunkIndex, chunk);
      
      const chunkKey = `${key}:chunk:${chunkIndex}`;
      CacheService.set(chunkKey, chunk, ttlSeconds, ['chunked', key]);
    }
    
    this.chunkedCache.set(key, chunks);
    
    // Store metadata
    const metaKey = `${key}:meta`;
    CacheService.set(metaKey, {
      totalItems: data.length,
      totalChunks: chunks.size,
      chunkSize: this.CHUNK_SIZE
    }, ttlSeconds, ['chunked', key]);
  }

  // Get chunked data with pagination
  static getChunkedData<T>(key: string, page: number = 1, pageSize: number = this.CHUNK_SIZE): T[] | null {
    const metaKey = `${key}:meta`;
    const meta = CacheService.get<any>(metaKey);
    
    if (!meta) return null;
    
    const startChunk = Math.floor((page - 1) * pageSize / this.CHUNK_SIZE);
    const endChunk = Math.floor((page * pageSize - 1) / this.CHUNK_SIZE);
    
    let result: T[] = [];
    
    for (let chunkIndex = startChunk; chunkIndex <= endChunk; chunkIndex++) {
      const chunkKey = `${key}:chunk:${chunkIndex}`;
      const chunk = CacheService.get<T[]>(chunkKey);
      if (chunk) {
        result = result.concat(chunk);
      }
    }
    
    // Trim to exact page size
    const startIndex = (page - 1) * pageSize % this.CHUNK_SIZE;
    const endIndex = startIndex + pageSize;
    
    return result.slice(startIndex, Math.min(endIndex, result.length));
  }

  // Clear chunked data
  static clearChunkedData(key: string): void {
    CacheService.clearByTag(key);
    this.chunkedCache.delete(key);
  }
}