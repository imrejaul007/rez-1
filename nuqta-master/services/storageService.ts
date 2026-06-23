import AsyncStorage from '@react-native-async-storage/async-storage';
import { FILE_SIZE_LIMITS } from '@/utils/fileUploadConstants';

// Types
export interface StorageOptions {
  encrypt?: boolean;
  compress?: boolean;
  expiration?: number; // TTL in milliseconds
}

export interface StorageItem<T = any> {
  data: T;
  timestamp: number;
  expiration?: number;
  version?: string;
}

export interface StorageStats {
  totalKeys: number;
  totalSize: number; // Approximate size in bytes
  oldestItem: number;
  newestItem: number;
}

export interface CacheConfig {
  maxSize: number; // Maximum cache size in bytes
  maxAge: number; // Maximum age in milliseconds
  cleanupInterval: number; // Cleanup interval in milliseconds
}

// Storage namespaces
export const STORAGE_NAMESPACES = {
  USER: 'user',
  CART: 'cart',
  OFFERS: 'offers',
  ONBOARDING: 'onboarding',
  APP_SETTINGS: 'app_settings',
  CACHE: 'cache',
  OFFLINE: 'offline',
  ANALYTICS: 'analytics',
} as const;

// Default cache configuration
const DEFAULT_CACHE_CONFIG: CacheConfig = {
  maxSize: 50 * 1024 * 1024, // 50MB
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  cleanupInterval: 60 * 60 * 1000, // 1 hour
};

class StorageService {
  private cacheConfig: CacheConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config?: Partial<CacheConfig>) {
    this.cacheConfig = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.startCleanupTimer();
  }

  // Set item with options
  async setItem<T>(
    key: string,
    value: T,
    options: StorageOptions = {}
  ): Promise<void> {
    try {
      const item: StorageItem<T> = {
        data: value,
        timestamp: Date.now(),
        expiration: options.expiration ? Date.now() + options.expiration : undefined,
        version: '1.0',
      };

      let serializedData = JSON.stringify(item);

      // Apply compression if requested (simplified)
      if (options.compress) {
        // In a real implementation, you'd use a compression library
        // For now, just flag it
        serializedData = `COMPRESSED:${serializedData}`;
      }

      // Apply encryption if requested (simplified)
      if (options.encrypt) {
        // In a real implementation, you'd use proper encryption
        // For now, just base64 encode as a placeholder
        serializedData = `ENCRYPTED:${btoa(serializedData)}`;
      }

      await AsyncStorage.setItem(key, serializedData);
    } catch (error) {
      throw new Error(`Failed to set item: ${key}`);
    }
  }

  // Get item with automatic expiration handling
  async getItem<T>(
    key: string,
    defaultValue?: T
  ): Promise<T | undefined> {
    try {
      let serializedData = await AsyncStorage.getItem(key);
      
      if (!serializedData) {
        return defaultValue;
      }

      // Handle encryption
      if (serializedData.startsWith('ENCRYPTED:')) {
        serializedData = atob(serializedData.substring(10));
      }

      // Handle compression
      if (serializedData.startsWith('COMPRESSED:')) {
        serializedData = serializedData.substring(11);
      }

      const item: StorageItem<T> = JSON.parse(serializedData);

      // Check expiration
      if (item.expiration && Date.now() > item.expiration) {
        await this.removeItem(key);
        return defaultValue;
      }

      return item.data;
    } catch (error) {
      return defaultValue;
    }
  }

  // Remove item
  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      throw new Error(`Failed to remove item: ${key}`);
    }
  }

  // Check if item exists and is not expired
  async hasItem(key: string): Promise<boolean> {
    try {
      const item = await this.getItem(key);
      return item !== undefined;
    } catch (error) {
      return false;
    }
  }

  // Get multiple items
  async getMultipleItems<T>(keys: string[]): Promise<Record<string, T | undefined>> {
    try {
      const results: Record<string, T | undefined> = {};
      
      // Get all items in parallel
      const promises = keys.map(async (key) => {
        const value = await this.getItem<T>(key);
        return { key, value };
      });

      const resolvedItems = await Promise.all(promises);
      
      resolvedItems.forEach(({ key, value }) => {
        results[key] = value;
      });

      return results;
    } catch (error) {
      return {};
    }
  }

  // Set multiple items
  async setMultipleItems<T>(
    items: Record<string, T>,
    options: StorageOptions = {}
  ): Promise<void> {
    try {
      const promises = Object.entries(items).map(([key, value]) =>
        this.setItem(key, value, options)
      );
      await Promise.all(promises);
    } catch (error) {
      throw new Error('Failed to set multiple items');
    }
  }

  // Clear all items with a specific prefix
  async clearNamespace(namespace: string): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const namespacedKeys = allKeys.filter(key => key.startsWith(`${namespace}_`));
      
      if (namespacedKeys.length > 0) {
        await AsyncStorage.multiRemove(namespacedKeys);
      }
    } catch (error) {
      throw new Error(`Failed to clear namespace: ${namespace}`);
    }
  }

  // Get all keys with optional prefix filter
  async getAllKeys(prefix?: string): Promise<string[]> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      
      if (prefix) {
        return allKeys.filter(key => key.startsWith(prefix));
      }
      
      return [...allKeys];
    } catch (error) {
      return [];
    }
  }

  // Get storage statistics
  async getStorageStats(): Promise<StorageStats> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      let totalSize = 0;
      let oldestTimestamp = Date.now();
      let newestTimestamp = 0;

      // Get all items to calculate stats
      const promises = allKeys.map(async (key) => {
        try {
          const serializedData = await AsyncStorage.getItem(key);
          if (serializedData) {
            totalSize += serializedData.length;
            
            try {
              const item: StorageItem = JSON.parse(serializedData);
              if (item.timestamp) {
                oldestTimestamp = Math.min(oldestTimestamp, item.timestamp);
                newestTimestamp = Math.max(newestTimestamp, item.timestamp);
              }
            } catch {
              // Not a StorageItem, skip timestamp tracking
            }
          }
        } catch (_error) {
          // silently handle
        }
      });

      await Promise.all(promises);

      return {
        totalKeys: allKeys.length,
        totalSize,
        oldestItem: oldestTimestamp,
        newestItem: newestTimestamp,
      };
    } catch (error) {
      return {
        totalKeys: 0,
        totalSize: 0,
        oldestItem: Date.now(),
        newestItem: Date.now(),
      };
    }
  }

  // Clean up expired items
  async cleanupExpiredItems(): Promise<number> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      let cleanedCount = 0;

      const promises = allKeys.map(async (key) => {
        try {
          const serializedData = await AsyncStorage.getItem(key);
          if (serializedData) {
            try {
              const item: StorageItem = JSON.parse(serializedData);
              
              // Check if item is expired
              if (item.expiration && Date.now() > item.expiration) {
                await AsyncStorage.removeItem(key);
                cleanedCount++;
              }
            } catch {
              // Not a StorageItem or malformed, skip
            }
          }
        } catch (_error) {
          // silently handle
        }
      });

      await Promise.all(promises);

      return cleanedCount;
    } catch (error) {
      return 0;
    }
  }

  // Cache management methods
  async setCacheItem<T>(
    key: string,
    value: T,
    ttl: number = this.cacheConfig.maxAge
  ): Promise<void> {
    const cacheKey = `${STORAGE_NAMESPACES.CACHE}_${key}`;
    await this.setItem(cacheKey, value, { expiration: ttl });
  }

  async getCacheItem<T>(key: string): Promise<T | undefined> {
    const cacheKey = `${STORAGE_NAMESPACES.CACHE}_${key}`;
    return this.getItem<T>(cacheKey);
  }

  async removeCacheItem(key: string): Promise<void> {
    const cacheKey = `${STORAGE_NAMESPACES.CACHE}_${key}`;
    await this.removeItem(cacheKey);
  }

  async clearCache(): Promise<void> {
    await this.clearNamespace(STORAGE_NAMESPACES.CACHE);
  }

  // Offline data management
  async setOfflineData<T>(key: string, value: T): Promise<void> {
    const offlineKey = `${STORAGE_NAMESPACES.OFFLINE}_${key}`;
    await this.setItem(offlineKey, value);
  }

  async getOfflineData<T>(key: string): Promise<T | undefined> {
    const offlineKey = `${STORAGE_NAMESPACES.OFFLINE}_${key}`;
    return this.getItem<T>(offlineKey);
  }

  async getAllOfflineData<T>(): Promise<Record<string, T>> {
    const keys = await this.getAllKeys(STORAGE_NAMESPACES.OFFLINE);
    const results: Record<string, T> = {};
    
    const promises = keys.map(async (key) => {
      const data = await this.getItem<T>(key);
      if (data !== undefined) {
        const cleanKey = key.replace(`${STORAGE_NAMESPACES.OFFLINE}_`, '');
        results[cleanKey] = data;
      }
    });

    await Promise.all(promises);
    return results;
  }

  async clearOfflineData(): Promise<void> {
    await this.clearNamespace(STORAGE_NAMESPACES.OFFLINE);
  }

  // Migration support
  async migrateData(
    oldKey: string,
    newKey: string,
    transformer?: (data: any) => any
  ): Promise<boolean> {
    try {
      const oldData = await this.getItem(oldKey);
      
      if (oldData !== undefined) {
        const newData = transformer ? transformer(oldData) : oldData;
        await this.setItem(newKey, newData);
        await this.removeItem(oldKey);
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  // Batch operations
  async batchOperation<T>(
    operations: Array<{
      type: 'set' | 'get' | 'remove';
      key: string;
      value?: T;
      options?: StorageOptions;
    }>
  ): Promise<Array<T | undefined>> {
    const results: Array<T | undefined> = [];

    for (const operation of operations) {
      try {
        switch (operation.type) {
          case 'set':
            if (operation.value !== undefined) {
              await this.setItem(operation.key, operation.value, operation.options);
              results.push(operation.value);
            }
            break;
          case 'get':
            const value = await this.getItem<T>(operation.key);
            results.push(value);
            break;
          case 'remove':
            await this.removeItem(operation.key);
            results.push(undefined);
            break;
        }
      } catch (error) {
        results.push(undefined);
      }
    }

    return results;
  }

  // Private methods
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredItems();
    }, this.cacheConfig.cleanupInterval) as any;
  }

  // Cleanup
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// Create and export singleton instance
export const storageService = new StorageService();

// Utility functions
export const StorageUtils = {
  // Create namespaced key
  createKey: (namespace: string, key: string): string => {
    return `${namespace}_${key}`;
  },

  // Parse namespaced key
  parseKey: (namespacedKey: string): { namespace: string; key: string } => {
    const parts = namespacedKey.split('_');
    return {
      namespace: parts[0],
      key: parts.slice(1).join('_'),
    };
  },

  // Format storage size for display
  formatSize: (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Check if storage is near capacity
  isNearCapacity: (stats: StorageStats, threshold: number = 0.8): boolean => {
    const maxSize = FILE_SIZE_LIMITS.MAX_DOCUMENT_SIZE; // Assume 10MB limit for mobile
    return stats.totalSize > (maxSize * threshold);
  },
};

export default storageService;
