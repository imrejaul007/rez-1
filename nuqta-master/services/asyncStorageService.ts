import AsyncStorage from '@react-native-async-storage/async-storage';

const devLog = {
  log: __DEV__ ? console.log.bind(console) : () => {},
  warn: __DEV__ ? console.warn.bind(console) : () => {},
  error: __DEV__ ? console.error.bind(console) : () => {},
};

/**
 * AsyncStorage Service
 * Centralized service for all AsyncStorage operations
 */

// Check if we're running in a browser environment (SSR safe)
const isClient = typeof window !== 'undefined';

import {
  RecentlyViewedItem,
  RecentlyViewedStore,
  RecentlyViewedProduct
} from '@/types/recentlyViewed.types';

import {
  FavoriteStore,
  FavoriteStoreInput,
  MAX_FAVORITE_STORES
} from '@/types/favoriteStore.types';

// Storage keys
export const STORAGE_KEYS = {
  CART: 'shopping_cart',
  CART_OFFLINE_QUEUE: 'cart_offline_queue',
  WISHLIST: 'wishlist',
  RECENTLY_VIEWED: 'recently_viewed',
  RECENTLY_VIEWED_UNIFIED: 'recently_viewed_unified', // New: stores + products combined
  FAVORITE_STORES: 'favorite_stores', // Bookmarked + most visited stores
  SEARCH_HISTORY: 'search_history',
  USER_PREFERENCES: 'user_preferences',
  USER_DATA: 'user_data',
  CART_LAST_SYNC: 'cart_last_sync',
  OFFLINE_MODE: 'offline_mode',
} as const;

class AsyncStorageService {
  /**
   * Save data to AsyncStorage
   */
  async save<T>(key: string, data: T): Promise<void> {
    if (!isClient) {
      devLog.warn('💾 [STORAGE] Skipping save during SSR:', key);
      return;
    }
    try {
      const jsonValue = JSON.stringify(data);
      await AsyncStorage.setItem(key, jsonValue);

    } catch (error) {
      devLog.error('💾 [STORAGE] Failed to save data:', key, error);
      throw new Error(`Failed to save data to ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get data from AsyncStorage
   */
  async get<T>(key: string): Promise<T | null> {
    if (!isClient) {
      // Silently skip during SSR - this is expected behavior
      return null;
    }
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      if (jsonValue === null) {
        return null;
      }
      const data = JSON.parse(jsonValue) as T;

      return data;
    } catch (error) {
      devLog.error('💾 [STORAGE] Failed to get data:', key, error);
      return null;
    }
  }

  /**
   * Remove data from AsyncStorage
   */
  async remove(key: string): Promise<void> {
    if (!isClient) {
      devLog.warn('💾 [STORAGE] Skipping remove during SSR:', key);
      return;
    }
    try {
      await AsyncStorage.removeItem(key);

    } catch (error) {
      devLog.error('💾 [STORAGE] Failed to remove data:', key, error);
      throw new Error(`Failed to remove data from ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clear all AsyncStorage data
   */
  async clear(): Promise<void> {
    if (!isClient) {
      devLog.warn('💾 [STORAGE] Skipping clear during SSR');
      return;
    }
    try {
      await AsyncStorage.clear();

    } catch (error) {
      devLog.error('💾 [STORAGE] Failed to clear storage:', error);
      throw new Error(`Failed to clear storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all keys in AsyncStorage
   */
  async getAllKeys(): Promise<string[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      // Ensure we return a mutable array (AsyncStorage types may be readonly)
      return [...keys];
    } catch (error) {
      devLog.error('💾 [STORAGE] Failed to get all keys:', error);
      return [];
    }
  }

  /**
   * Get multiple items at once
   */
  async multiGet<T>(keys: string[]): Promise<Record<string, T | null>> {
    try {
      const result = await AsyncStorage.multiGet(keys);
      const data: Record<string, T | null> = {};

      result.forEach(([key, value]) => {
        if (value !== null) {
          try {
            data[key] = JSON.parse(value) as T;
          } catch {
            data[key] = null;
          }
        } else {
          data[key] = null;
        }
      });

      return data;
    } catch (error) {
      devLog.error('💾 [STORAGE] Failed to get multiple items:', error);
      return {};
    }
  }

  /**
   * Save multiple items at once
   */
  async multiSave(items: Array<[string, any]>): Promise<void> {
    try {
      const stringifiedItems = items.map(([key, value]) => [
        key,
        JSON.stringify(value)
      ]) as Array<[string, string]>;

      await AsyncStorage.multiSet(stringifiedItems);
      devLog.log('💾 [STORAGE] Saved multiple items:', items.map(([key]) => key));
    } catch (error) {
      devLog.error('💾 [STORAGE] Failed to save multiple items:', error);
      throw new Error(`Failed to save multiple items: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if key exists
   */
  async has(key: string): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value !== null;
    } catch (error) {
      devLog.error('💾 [STORAGE] Failed to check if key exists:', key, error);
      return false;
    }
  }

  // Specialized methods for common operations

  /**
   * Save cart data
   */
  async saveCart(cart: any): Promise<void> {
    await this.save(STORAGE_KEYS.CART, cart);
    await this.save(STORAGE_KEYS.CART_LAST_SYNC, new Date().toISOString());
  }

  /**
   * Get cart data
   */
  async getCart(): Promise<any | null> {
    return this.get(STORAGE_KEYS.CART);
  }

  /**
   * Get last cart sync time
   */
  async getCartLastSync(): Promise<string | null> {
    return this.get(STORAGE_KEYS.CART_LAST_SYNC);
  }

  /**
   * Save offline queue
   */
  async saveOfflineQueue(queue: any[]): Promise<void> {
    await this.save(STORAGE_KEYS.CART_OFFLINE_QUEUE, queue);
  }

  /**
   * Get offline queue
   */
  async getOfflineQueue(): Promise<any[]> {
    const queue = await this.get<any[]>(STORAGE_KEYS.CART_OFFLINE_QUEUE);
    return queue || [];
  }

  /**
   * Clear offline queue
   */
  async clearOfflineQueue(): Promise<void> {
    await this.remove(STORAGE_KEYS.CART_OFFLINE_QUEUE);
  }

  /**
   * Save user preferences
   */
  async saveUserPreferences(preferences: any): Promise<void> {
    await this.save(STORAGE_KEYS.USER_PREFERENCES, preferences);
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(): Promise<any | null> {
    return this.get(STORAGE_KEYS.USER_PREFERENCES);
  }

  /**
   * Save recently viewed products
   */
  async saveRecentlyViewed(products: any[]): Promise<void> {
    // Keep only last 20 items
    const limited = products.slice(0, 20);
    await this.save(STORAGE_KEYS.RECENTLY_VIEWED, limited);
  }

  /**
   * Get recently viewed products
   */
  async getRecentlyViewed(): Promise<any[]> {
    const items = await this.get<any[]>(STORAGE_KEYS.RECENTLY_VIEWED);
    return items || [];
  }

  /**
   * Add to recently viewed
   */
  async addRecentlyViewed(product: any): Promise<void> {
    const current = await this.getRecentlyViewed();
    // Remove if already exists
    const filtered = current.filter(p => p.id !== product.id);
    // Add to beginning
    const updated = [product, ...filtered].slice(0, 20);
    await this.saveRecentlyViewed(updated);
  }

  // ============================================================================
  // UNIFIED RECENTLY VIEWED (Stores + Products)
  // ============================================================================

  private readonly MAX_RECENTLY_VIEWED_UNIFIED = 20;

  /**
   * Save unified recently viewed items (stores + products)
   */
  async saveRecentlyViewedUnified(items: RecentlyViewedItem[]): Promise<void> {
    const limited = items.slice(0, this.MAX_RECENTLY_VIEWED_UNIFIED);
    await this.save(STORAGE_KEYS.RECENTLY_VIEWED_UNIFIED, limited);
  }

  /**
   * Get unified recently viewed items
   */
  async getRecentlyViewedUnified(): Promise<RecentlyViewedItem[]> {
    const items = await this.get<RecentlyViewedItem[]>(STORAGE_KEYS.RECENTLY_VIEWED_UNIFIED);
    return items || [];
  }

  /**
   * Add a store to recently viewed (unified)
   */
  async addRecentlyViewedStore(store: RecentlyViewedStore): Promise<void> {
    try {
      const current = await this.getRecentlyViewedUnified();

      // Get image from multiple possible sources
      let image = '';
      if (store.banner) {
        image = Array.isArray(store.banner) ? store.banner[0] : store.banner;
      } else if (store.coverImage) {
        image = store.coverImage;
      } else if (store.logo) {
        image = store.logo;
      }

      // Get address from multiple possible sources
      let address = '';
      if (store.address) {
        address = [store.address.street, store.address.city].filter(Boolean).join(', ');
      } else if (store.location) {
        address = [store.location.address, store.location.city].filter(Boolean).join(', ');
      }

      // Transform store to unified format
      const item: RecentlyViewedItem = {
        id: store._id,
        type: 'store',
        name: store.name,
        image,
        rating: {
          value: store.ratings?.average || 0,
          count: store.ratings?.count || 0,
        },
        address: address || undefined,
        cashbackPercentage: store.offers?.cashback,
        slug: store.slug,
        viewedAt: Date.now(),
      };

      // Remove if already exists (by id AND type)
      const filtered = current.filter(p => !(p.id === item.id && p.type === 'store'));

      // Add to beginning, limit to max
      const updated = [item, ...filtered].slice(0, this.MAX_RECENTLY_VIEWED_UNIFIED);
      await this.saveRecentlyViewedUnified(updated);
    } catch (error) {
      devLog.error('💾 [STORAGE] Failed to add recently viewed store:', error);
    }
  }

  /**
   * Add a product to recently viewed (unified)
   */
  async addRecentlyViewedProduct(product: RecentlyViewedProduct): Promise<void> {
    try {
      const current = await this.getRecentlyViewedUnified();

      const productId = product._id || product.id || '';
      if (!productId) {
        devLog.warn('💾 [STORAGE] Cannot add product without ID to recently viewed');
        return;
      }

      // Get image from multiple sources
      const image = product.images?.[0] || product.image || '';

      // Get rating from multiple sources
      let ratingValue = 0;
      let ratingCount = 0;
      if (product.rating) {
        ratingValue = typeof product.rating.value === 'string'
          ? parseFloat(product.rating.value) || 0
          : (product.rating.value || 0);
        ratingCount = product.rating.count || 0;
      } else if (product.ratings) {
        ratingValue = product.ratings.average || 0;
        ratingCount = product.ratings.count || 0;
      }

      // Transform product to unified format
      const item: RecentlyViewedItem = {
        id: productId,
        type: 'product',
        name: product.name || product.title || '',
        image,
        rating: {
          value: ratingValue,
          count: ratingCount,
        },
        price: product.price,
        cashbackPercentage: product.cashback?.percentage,
        slug: product.slug,
        viewedAt: Date.now(),
      };

      // Remove if already exists (by id AND type)
      const filtered = current.filter(p => !(p.id === item.id && p.type === 'product'));

      // Add to beginning, limit to max
      const updated = [item, ...filtered].slice(0, this.MAX_RECENTLY_VIEWED_UNIFIED);
      await this.saveRecentlyViewedUnified(updated);
    } catch (error) {
      devLog.error('💾 [STORAGE] Failed to add recently viewed product:', error);
    }
  }

  /**
   * Clear all unified recently viewed items
   */
  async clearRecentlyViewedUnified(): Promise<void> {
    await this.remove(STORAGE_KEYS.RECENTLY_VIEWED_UNIFIED);
  }

  // ============================================================================
  // FAVORITE STORES (Bookmarked + Most Visited)
  // ============================================================================

  /**
   * Get all favorite stores (sorted: bookmarked first, then by visit count)
   */
  async getFavoriteStores(): Promise<FavoriteStore[]> {
    const stores = await this.get<FavoriteStore[]>(STORAGE_KEYS.FAVORITE_STORES);
    if (!stores) return [];

    // Sort: bookmarked first (by addedAt desc), then by visitCount desc
    return stores.sort((a, b) => {
      // Bookmarked stores come first
      if (a.isFavorited && !b.isFavorited) return -1;
      if (!a.isFavorited && b.isFavorited) return 1;

      // If both bookmarked, sort by when they were added
      if (a.isFavorited && b.isFavorited) {
        return (b.addedAt || 0) - (a.addedAt || 0);
      }

      // If neither bookmarked, sort by visit count
      return b.visitCount - a.visitCount;
    });
  }

  /**
   * Save favorite stores
   */
  async saveFavoriteStores(stores: FavoriteStore[]): Promise<void> {
    const limited = stores.slice(0, MAX_FAVORITE_STORES);
    await this.save(STORAGE_KEYS.FAVORITE_STORES, limited);
  }

  /**
   * Track a store visit (for "most visited" functionality)
   */
  async trackStoreVisit(store: FavoriteStoreInput): Promise<void> {
    try {
      const current = await this.get<FavoriteStore[]>(STORAGE_KEYS.FAVORITE_STORES) || [];

      // Get image from multiple possible sources
      let image = '';
      if (store.banner) {
        image = Array.isArray(store.banner) ? store.banner[0] : store.banner;
      } else if (store.coverImage) {
        image = store.coverImage;
      } else if (store.logo) {
        image = store.logo;
      }

      // Format full address
      let address = '';
      if (store.address) {
        const parts = [
          store.address.street,
          store.address.landmark,
          store.address.city,
          store.address.state,
          store.address.pincode
        ].filter(Boolean);
        address = parts.join(', ');
      } else if (store.location) {
        const parts = [
          store.location.address,
          store.location.city,
          store.location.state,
          store.location.pincode
        ].filter(Boolean);
        address = parts.join(', ');
      }

      // Check if store already exists
      const existingIndex = current.findIndex(s => s.id === store._id);

      if (existingIndex >= 0) {
        // Update existing store
        current[existingIndex].visitCount += 1;
        current[existingIndex].lastVisited = Date.now();
        // Update image/address/description if newer data available
        if (image) current[existingIndex].image = image;
        if (address) current[existingIndex].address = address;
        if (store.description) current[existingIndex].description = store.description;
        if (store.operationalInfo?.deliveryTime) current[existingIndex].deliveryTime = store.operationalInfo.deliveryTime;
        if (store.ratings) {
          current[existingIndex].rating = {
            value: store.ratings.average || 0,
            count: store.ratings.count || 0
          };
        }
        if (store.offers?.cashback) {
          current[existingIndex].cashbackPercentage = store.offers.cashback;
        }
      } else {
        // Add new store
        const newStore: FavoriteStore = {
          id: store._id,
          name: store.name,
          image,
          rating: {
            value: store.ratings?.average || 0,
            count: store.ratings?.count || 0
          },
          address,
          description: store.description || '',
          deliveryTime: store.operationalInfo?.deliveryTime || '',
          cashbackPercentage: store.offers?.cashback,
          slug: store.slug,
          isFavorited: false,
          visitCount: 1,
          lastVisited: Date.now()
        };
        current.unshift(newStore);
      }

      // Limit and save
      const limited = current.slice(0, MAX_FAVORITE_STORES);
      await this.save(STORAGE_KEYS.FAVORITE_STORES, limited);
    } catch (error) {
      devLog.error('💾 [STORAGE] Failed to track store visit:', error);
    }
  }

  /**
   * Toggle favorite (bookmark) status for a store
   */
  async toggleFavoriteStore(storeId: string): Promise<boolean> {
    try {
      const current = await this.get<FavoriteStore[]>(STORAGE_KEYS.FAVORITE_STORES) || [];
      const storeIndex = current.findIndex(s => s.id === storeId);

      if (storeIndex >= 0) {
        // Toggle favorite status
        const newStatus = !current[storeIndex].isFavorited;
        current[storeIndex].isFavorited = newStatus;
        current[storeIndex].addedAt = newStatus ? Date.now() : undefined;
        await this.save(STORAGE_KEYS.FAVORITE_STORES, current);
        return newStatus;
      }

      return false;
    } catch (error) {
      devLog.error('💾 [STORAGE] Failed to toggle favorite store:', error);
      return false;
    }
  }

  /**
   * Check if a store is favorited (bookmarked)
   */
  async isFavoriteStore(storeId: string): Promise<boolean> {
    try {
      const stores = await this.get<FavoriteStore[]>(STORAGE_KEYS.FAVORITE_STORES) || [];
      const store = stores.find(s => s.id === storeId);
      return store?.isFavorited || false;
    } catch (error) {
      devLog.error('💾 [STORAGE] Failed to check favorite store:', error);
      return false;
    }
  }

  /**
   * Clear all favorite stores
   */
  async clearFavoriteStores(): Promise<void> {
    await this.remove(STORAGE_KEYS.FAVORITE_STORES);
  }

  /**
   * Save search history
   */
  async saveSearchHistory(searches: string[]): Promise<void> {
    // Keep only last 10 searches
    const limited = searches.slice(0, 10);
    await this.save(STORAGE_KEYS.SEARCH_HISTORY, limited);
  }

  /**
   * Get search history
   */
  async getSearchHistory(): Promise<string[]> {
    const history = await this.get<string[]>(STORAGE_KEYS.SEARCH_HISTORY);
    return history || [];
  }

  /**
   * Add to search history
   */
  async addSearchHistory(query: string): Promise<void> {
    const current = await this.getSearchHistory();
    // Remove if already exists
    const filtered = current.filter(q => q !== query);
    // Add to beginning
    const updated = [query, ...filtered].slice(0, 10);
    await this.saveSearchHistory(updated);
  }

  /**
   * Clear search history
   */
  async clearSearchHistory(): Promise<void> {
    await this.remove(STORAGE_KEYS.SEARCH_HISTORY);
  }

  /**
   * Save wishlist
   */
  async saveWishlist(wishlist: any[]): Promise<void> {
    await this.save(STORAGE_KEYS.WISHLIST, wishlist);
  }

  /**
   * Get wishlist
   */
  async getWishlist(): Promise<any[]> {
    const wishlist = await this.get<any[]>(STORAGE_KEYS.WISHLIST);
    return wishlist || [];
  }

  /**
   * Set offline mode status
   */
  async setOfflineMode(isOffline: boolean): Promise<void> {
    await this.save(STORAGE_KEYS.OFFLINE_MODE, isOffline);
  }

  /**
   * Get offline mode status
   */
  async getOfflineMode(): Promise<boolean> {
    const mode = await this.get<boolean>(STORAGE_KEYS.OFFLINE_MODE);
    return mode || false;
  }

  /**
   * Clear all user-specific data (for logout)
   */
  async clearUserData(): Promise<void> {
    try {
      await this.multiSave([
        [STORAGE_KEYS.CART, []],
        [STORAGE_KEYS.CART_OFFLINE_QUEUE, []],
        [STORAGE_KEYS.WISHLIST, []],
        [STORAGE_KEYS.USER_DATA, null],
      ]);

    } catch (error) {
      devLog.error('💾 [STORAGE] Failed to clear user data:', error);
    }
  }

  /**
   * Get storage size estimate (for debugging)
   */
  async getStorageSize(): Promise<{ totalKeys: number; estimatedSize: string }> {
    try {
      const keys = await this.getAllKeys();
      const values = await AsyncStorage.multiGet(keys);

      let totalSize = 0;
      values.forEach(([_, value]) => {
        if (value) {
          totalSize += value.length;
        }
      });

      const sizeInKB = (totalSize / 1024).toFixed(2);
      const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);

      return {
        totalKeys: keys.length,
        estimatedSize: totalSize < 1024 * 1024
          ? `${sizeInKB} KB`
          : `${sizeInMB} MB`
      };
    } catch (error) {
      devLog.error('💾 [STORAGE] Failed to get storage size:', error);
      return { totalKeys: 0, estimatedSize: '0 KB' };
    }
  }
}

// Singleton pattern using globalThis to persist across SSR module re-evaluations
const ASYNC_STORAGE_SERVICE_KEY = '__rezAsyncStorageService__';

function getAsyncStorageService(): AsyncStorageService {
  if (typeof globalThis !== 'undefined') {
    if (!(globalThis as any)[ASYNC_STORAGE_SERVICE_KEY]) {
      (globalThis as any)[ASYNC_STORAGE_SERVICE_KEY] = new AsyncStorageService();
    }
    return (globalThis as any)[ASYNC_STORAGE_SERVICE_KEY];
  }
  return new AsyncStorageService();
}

export default getAsyncStorageService();
