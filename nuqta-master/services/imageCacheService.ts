// @ts-nocheck
/**
 * Image Cache Service
 *
 * Advanced caching system with:
 * - LRU (Least Recently Used) eviction policy
 * - Disk and memory cache tiers
 * - TTL-based expiration
 * - Cache warming and preloading
 * - Cache statistics and monitoring
 * - Platform-specific optimizations
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import imagePreloadService, { PreloadPriority } from './imagePreloadService';

/**
 * Cache entry metadata
 */
interface CacheEntry {
  uri: string;
  localPath?: string;
  timestamp: number;
  lastAccessed: number;
  size: number;
  hits: number;
  ttl?: number;
}

/**
 * Cache statistics
 */
interface CacheStats {
  memorySize: number;
  diskSize: number;
  totalEntries: number;
  memoryEntries: number;
  diskEntries: number;
  hits: number;
  misses: number;
  evictions: number;
  hitRate: number;
}

/**
 * Cache configuration
 */
interface CacheConfig {
  maxMemorySize: number;    // 10MB default
  maxDiskSize: number;       // 50MB default
  maxMemoryEntries: number;  // 100 entries default
  defaultTTL: number;        // 7 days default
  enableDiskCache: boolean;
  enableMemoryCache: boolean;
}

/**
 * Image Cache Service Class
 */
class ImageCacheService {
  private memoryCache: Map<string, CacheEntry> = new Map();
  private diskCacheIndex: Map<string, CacheEntry> = new Map();
  private cacheDir: string = '';

  // Configuration
  private config: CacheConfig = {
    maxMemorySize: 10 * 1024 * 1024,      // 10MB
    maxDiskSize: 50 * 1024 * 1024,        // 50MB
    maxMemoryEntries: 100,
    defaultTTL: 7 * 24 * 60 * 60 * 1000,  // 7 days
    enableDiskCache: true,
    enableMemoryCache: true,
  };

  // Statistics
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    memorySize: 0,
    diskSize: 0,
  };

  constructor() {
    this.initialize();
  }

  /**
   * Initialize cache service
   */
  private async initialize() {
    // Set up cache directory
    if (FileSystem.cacheDirectory) {
      this.cacheDir = `${FileSystem.cacheDirectory}images/`;

      // Create cache directory if it doesn't exist
      const dirInfo = await FileSystem.getInfoAsync(this.cacheDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.cacheDir, { intermediates: true });
      }
    }

    // Load disk cache index from storage
    await this.loadDiskCacheIndex();

    // Clean expired entries
    await this.cleanExpiredEntries();
  }

  /**
   * Get image from cache or fetch
   */
  async get(uri: string): Promise<string> {
    // Check memory cache first
    if (this.config.enableMemoryCache) {
      const memoryEntry = this.memoryCache.get(uri);
      if (memoryEntry && !this.isExpired(memoryEntry)) {
        this.updateAccess(memoryEntry);
        this.stats.hits++;
        return memoryEntry.localPath || uri;
      }
    }

    // Check disk cache
    if (this.config.enableDiskCache) {
      const diskEntry = this.diskCacheIndex.get(uri);
      if (diskEntry && !this.isExpired(diskEntry)) {
        // Verify file exists
        if (diskEntry.localPath) {
          const fileInfo = await FileSystem.getInfoAsync(diskEntry.localPath);
          if (fileInfo.exists) {
            // Promote to memory cache
            this.promoteToMemoryCache(diskEntry);
            this.updateAccess(diskEntry);
            this.stats.hits++;
            return diskEntry.localPath;
          }
        }
      }
    }

    // Cache miss - return original URI
    this.stats.misses++;
    return uri;
  }

  /**
   * Store image in cache
   */
  async set(uri: string, options: { ttl?: number; priority?: 'high' | 'normal' | 'low' } = {}): Promise<void> {
    const { ttl = this.config.defaultTTL, priority = 'normal' } = options;

    try {
      // Download and cache to disk
      if (this.config.enableDiskCache && this.cacheDir) {
        const filename = this.getFilenameFromUri(uri);
        const localPath = `${this.cacheDir}${filename}`;

        // Check if already cached
        const fileInfo = await FileSystem.getInfoAsync(localPath);
        if (!fileInfo.exists) {
          // Download file
          const downloadResult = await FileSystem.downloadAsync(uri, localPath);

          if (downloadResult.status === 200) {
            const size = (await FileSystem.getInfoAsync(localPath)).size || 0;

            // Create cache entry
            const entry: CacheEntry = {
              uri,
              localPath,
              timestamp: Date.now(),
              lastAccessed: Date.now(),
              size,
              hits: 0,
              ttl,
            };

            // Add to disk cache
            this.diskCacheIndex.set(uri, entry);
            this.stats.diskSize += size;

            // Promote to memory cache if high priority
            if (priority === 'high') {
              this.promoteToMemoryCache(entry);
            }

            // Ensure cache size limits
            await this.enforceMemoryLimit();
            await this.enforceDiskLimit();

            // Save disk cache index
            await this.saveDiskCacheIndex();
          }
        } else {
          // File exists, just update index
          const size = fileInfo.size || 0;
          const entry: CacheEntry = {
            uri,
            localPath,
            timestamp: Date.now(),
            lastAccessed: Date.now(),
            size,
            hits: 0,
            ttl,
          };
          this.diskCacheIndex.set(uri, entry);
        }
      }
    } catch (_error) {
      // silently handle
    }
  }

  /**
   * Preload and cache image
   */
  async preload(uri: string, priority: PreloadPriority = PreloadPriority.MEDIUM): Promise<boolean> {
    // Check if already cached
    const cached = await this.get(uri);
    if (cached !== uri) {
      return true; // Already cached
    }

    // Preload using preload service
    await imagePreloadService.preload(uri, priority);

    // Cache to disk
    await this.set(uri, {
      priority: priority === PreloadPriority.CRITICAL ? 'high' : 'normal',
    });

    return true;
  }

  /**
   * Preload batch of images
   */
  async preloadBatch(uris: string[], priority: PreloadPriority = PreloadPriority.MEDIUM): Promise<void> {
    await Promise.all(uris.map(uri => this.preload(uri, priority)));
  }

  /**
   * Check if image is cached
   */
  async isCached(uri: string): Promise<boolean> {
    const cached = await this.get(uri);
    return cached !== uri;
  }

  /**
   * Clear specific cache entry
   */
  async clear(uri: string): Promise<void> {
    // Remove from memory cache
    const memoryEntry = this.memoryCache.get(uri);
    if (memoryEntry) {
      this.stats.memorySize -= memoryEntry.size;
      this.memoryCache.delete(uri);
    }

    // Remove from disk cache
    const diskEntry = this.diskCacheIndex.get(uri);
    if (diskEntry && diskEntry.localPath) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(diskEntry.localPath);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(diskEntry.localPath);
          this.stats.diskSize -= diskEntry.size;
        }
      } catch (_error) {
        // silently handle
      }
      this.diskCacheIndex.delete(uri);
    }

    await this.saveDiskCacheIndex();
  }

  /**
   * Clear all cache
   */
  async clearAll(): Promise<void> {
    // Clear memory cache
    this.memoryCache.clear();
    this.stats.memorySize = 0;

    // Clear disk cache
    if (this.cacheDir) {
      try {
        const dirInfo = await FileSystem.getInfoAsync(this.cacheDir);
        if (dirInfo.exists) {
          await FileSystem.deleteAsync(this.cacheDir, { idempotent: true });
          await FileSystem.makeDirectoryAsync(this.cacheDir, { intermediates: true });
        }
      } catch (_error) {
        // silently handle
      }
    }

    this.diskCacheIndex.clear();
    this.stats.diskSize = 0;

    await this.saveDiskCacheIndex();

  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;

    return {
      memorySize: this.stats.memorySize,
      diskSize: this.stats.diskSize,
      totalEntries: this.memoryCache.size + this.diskCacheIndex.size,
      memoryEntries: this.memoryCache.size,
      diskEntries: this.diskCacheIndex.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      evictions: this.stats.evictions,
      hitRate: Math.round(hitRate * 100) / 100,
    };
  }

  /**
   * Warm cache with critical images
   */
  async warmCache(uris: string[]): Promise<void> {
    await this.preloadBatch(uris, PreloadPriority.CRITICAL);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Private helper methods

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    if (!entry.ttl) return false;
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Update access time and hits
   */
  private updateAccess(entry: CacheEntry): void {
    entry.lastAccessed = Date.now();
    entry.hits++;
  }

  /**
   * Promote disk cache entry to memory cache
   */
  private promoteToMemoryCache(entry: CacheEntry): void {
    if (!this.config.enableMemoryCache) return;

    this.memoryCache.set(entry.uri, entry);
    this.stats.memorySize += entry.size;
  }

  /**
   * Enforce memory cache size limit using LRU
   */
  private async enforceMemoryLimit(): Promise<void> {
    while (
      this.stats.memorySize > this.config.maxMemorySize ||
      this.memoryCache.size > this.config.maxMemoryEntries
    ) {
      // Find least recently used entry
      let lruEntry: CacheEntry | null = null;
      let lruUri: string | null = null;

      this.memoryCache.forEach((entry, uri) => {
        if (!lruEntry || entry.lastAccessed < lruEntry.lastAccessed) {
          lruEntry = entry;
          lruUri = uri;
        }
      });

      if (lruUri && lruEntry) {
        this.memoryCache.delete(lruUri);
        this.stats.memorySize -= lruEntry.size;
        this.stats.evictions++;
      } else {
        break;
      }
    }
  }

  /**
   * Enforce disk cache size limit using LRU
   */
  private async enforceDiskLimit(): Promise<void> {
    while (this.stats.diskSize > this.config.maxDiskSize) {
      // Find least recently used entry
      let lruEntry: CacheEntry | null = null;
      let lruUri: string | null = null;

      this.diskCacheIndex.forEach((entry, uri) => {
        if (!lruEntry || entry.lastAccessed < lruEntry.lastAccessed) {
          lruEntry = entry;
          lruUri = uri;
        }
      });

      if (lruUri && lruEntry) {
        await this.clear(lruUri);
        this.stats.evictions++;
      } else {
        break;
      }
    }
  }

  /**
   * Clean expired cache entries
   */
  private async cleanExpiredEntries(): Promise<void> {
    const expiredUris: string[] = [];

    // Check memory cache
    this.memoryCache.forEach((entry, uri) => {
      if (this.isExpired(entry)) {
        expiredUris.push(uri);
      }
    });

    // Check disk cache
    this.diskCacheIndex.forEach((entry, uri) => {
      if (this.isExpired(entry)) {
        expiredUris.push(uri);
      }
    });

    // Clear expired entries
    for (const uri of expiredUris) {
      await this.clear(uri);
    }

    if (expiredUris.length > 0) {
    }
  }

  /**
   * Generate filename from URI
   */
  private getFilenameFromUri(uri: string): string {
    // Use hash of URI as filename to avoid special characters
    const hash = this.simpleHash(uri);
    const ext = this.getFileExtension(uri);
    return `${hash}${ext}`;
  }

  /**
   * Simple hash function
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get file extension from URI
   */
  private getFileExtension(uri: string): string {
    const match = uri.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i);
    return match ? match[0] : '.jpg';
  }

  /**
   * Load disk cache index from storage
   */
  private async loadDiskCacheIndex(): Promise<void> {
    try {
      const indexJson = await AsyncStorage.getItem('@image_cache_index');
      if (indexJson) {
        const index = JSON.parse(indexJson);
        this.diskCacheIndex = new Map(Object.entries(index));

        // Calculate disk size
        this.stats.diskSize = 0;
        for (const entry of this.diskCacheIndex.values()) {
          this.stats.diskSize += entry.size;
        }
      }
    } catch (_error) {
      // silently handle
    }
  }

  /**
   * Save disk cache index to storage
   */
  private async saveDiskCacheIndex(): Promise<void> {
    try {
      const index = Object.fromEntries(this.diskCacheIndex);
      await AsyncStorage.setItem('@image_cache_index', JSON.stringify(index));
    } catch (_error) {
      // silently handle
    }
  }
}

// Singleton pattern using globalThis to persist across SSR module re-evaluations
const IMAGE_CACHE_SERVICE_KEY = '__rezImageCacheService__';

function getImageCacheService(): ImageCacheService {
  if (typeof globalThis !== 'undefined') {
    if (!(globalThis as any)[IMAGE_CACHE_SERVICE_KEY]) {
      (globalThis as any)[IMAGE_CACHE_SERVICE_KEY] = new ImageCacheService();
    }
    return (globalThis as any)[IMAGE_CACHE_SERVICE_KEY];
  }
  return new ImageCacheService();
}

// Export singleton instance
export default getImageCacheService();
