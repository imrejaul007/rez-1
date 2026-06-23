// @ts-nocheck
/**
 * Preload Manager
 * Manages preloading of critical resources (images, data, components)
 */

import { preloadCriticalImages } from '@/hooks/useImagePreload';
import { preloadComponent, preloadComponents } from '@/utils/lazyLoad';
import cacheService, { CacheTTL, CacheNamespace } from '@/services/cacheService';
import { ComponentType } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface PreloadConfig {
  images?: string[];
  components?: Array<() => Promise<{ default: ComponentType<any> }>>;
  data?: Array<{
    key: string;
    fetcher: () => Promise<any>;
    ttl?: number;
    priority?: 'low' | 'medium' | 'high' | 'critical';
  }>;
  priority?: 'low' | 'normal' | 'high';
}

export interface PreloadResult {
  images: {
    total: number;
    loaded: number;
    failed: number;
  };
  components: {
    total: number;
    loaded: number;
    failed: number;
  };
  data: {
    total: number;
    cached: number;
    failed: number;
  };
  duration: number;
}

// ============================================================================
// Preload Manager Class
// ============================================================================

class PreloadManager {
  private preloadQueue: PreloadConfig[] = [];
  private isPreloading: boolean = false;

  /**
   * Add items to preload queue
   */
  add(config: PreloadConfig): void {
    this.preloadQueue.push(config);
  }

  /**
   * Preload all queued items
   */
  async preloadAll(): Promise<PreloadResult> {
    if (this.isPreloading) {
      return this.createEmptyResult();
    }

    this.isPreloading = true;
    const startTime = performance.now();


    const result: PreloadResult = {
      images: { total: 0, loaded: 0, failed: 0 },
      components: { total: 0, loaded: 0, failed: 0 },
      data: { total: 0, cached: 0, failed: 0 },
      duration: 0,
    };

    // Sort queue by priority
    const sortedQueue = this.sortByPriority(this.preloadQueue);

    for (const config of sortedQueue) {
      // Preload images
      if (config.images && config.images.length > 0) {
        result.images.total += config.images.length;
        const imageResults = await this.preloadImages(config.images);
        result.images.loaded += imageResults.loaded;
        result.images.failed += imageResults.failed;
      }

      // Preload components
      if (config.components && config.components.length > 0) {
        result.components.total += config.components.length;
        const componentResults = await this.preloadComponentList(config.components);
        result.components.loaded += componentResults.loaded;
        result.components.failed += componentResults.failed;
      }

      // Preload data
      if (config.data && config.data.length > 0) {
        result.data.total += config.data.length;
        const dataResults = await this.preloadData(config.data);
        result.data.cached += dataResults.cached;
        result.data.failed += dataResults.failed;
      }
    }

    result.duration = performance.now() - startTime;

    this.preloadQueue = [];
    this.isPreloading = false;


    return result;
  }

  /**
   * Preload images
   */
  private async preloadImages(
    urls: string[]
  ): Promise<{ loaded: number; failed: number }> {
    try {
      await preloadCriticalImages(urls);
      return { loaded: urls.length, failed: 0 };
    } catch (error) {
      return { loaded: 0, failed: urls.length };
    }
  }

  /**
   * Preload components
   */
  private async preloadComponentList(
    components: Array<() => Promise<{ default: ComponentType<any> }>>
  ): Promise<{ loaded: number; failed: number }> {
    let loaded = 0;
    let failed = 0;

    for (const component of components) {
      try {
        await preloadComponent(component);
        loaded++;
      } catch (error) {
        failed++;
      }
    }

    return { loaded, failed };
  }

  /**
   * Preload data
   */
  private async preloadData(
    dataList: Array<{
      key: string;
      fetcher: () => Promise<any>;
      ttl?: number;
      priority?: 'low' | 'medium' | 'high' | 'critical';
    }>
  ): Promise<{ cached: number; failed: number }> {
    let cached = 0;
    let failed = 0;

    for (const item of dataList) {
      try {
        const data = await item.fetcher();
        await cacheService.set(item.key, data, {
          ttl: item.ttl || CacheTTL.MEDIUM,
          priority: item.priority || 'medium',
        });
        cached++;
      } catch (error) {
        failed++;
      }
    }

    return { cached, failed };
  }

  /**
   * Sort queue by priority
   */
  private sortByPriority(queue: PreloadConfig[]): PreloadConfig[] {
    const priorityOrder = { high: 0, normal: 1, low: 2 };

    return [...queue].sort((a, b) => {
      const aPriority = priorityOrder[a.priority || 'normal'];
      const bPriority = priorityOrder[b.priority || 'normal'];
      return aPriority - bPriority;
    });
  }

  /**
   * Create empty result
   */
  private createEmptyResult(): PreloadResult {
    return {
      images: { total: 0, loaded: 0, failed: 0 },
      components: { total: 0, loaded: 0, failed: 0 },
      data: { total: 0, cached: 0, failed: 0 },
      duration: 0,
    };
  }

  /**
   * Clear preload queue
   */
  clear(): void {
    this.preloadQueue = [];
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const preloadManager = new PreloadManager();

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Preload store data
 */
export async function preloadStoreData(storeId: string): Promise<void> {

  preloadManager.add({
    data: [
      {
        key: `store:${storeId}`,
        fetcher: async () => {
          // This would call your actual API
          // const response = await storesApi.getStoreById(storeId);
          // return response.data;
          return null;
        },
        ttl: CacheTTL.LONG,
        priority: 'high',
      },
      {
        key: `products:store:${storeId}`,
        fetcher: async () => {
          // const response = await productsApi.getProductsByStore(storeId);
          // return response.data;
          return null;
        },
        ttl: CacheTTL.MEDIUM,
        priority: 'medium',
      },
    ],
    priority: 'high',
  });
}

/**
 * Preload product images
 */
export async function preloadProductImages(products: any[]): Promise<void> {
  const imageUrls = products
    .map((p) => p.imageUrl || p.image)
    .filter(Boolean);

  if (imageUrls.length === 0) return;


  preloadManager.add({
    images: imageUrls,
    priority: 'normal',
  });
}

/**
 * Preload categories
 */
export async function preloadCategories(): Promise<void> {

  preloadManager.add({
    data: [
      {
        key: 'categories:all',
        fetcher: async () => {
          // const response = await categoriesApi.getCategories();
          // return response.data;
          return null;
        },
        ttl: CacheTTL.VERY_LONG,
        priority: 'critical',
      },
    ],
    priority: 'high',
  });
}

/**
 * Preload user data
 */
export async function preloadUserData(userId: string): Promise<void> {

  preloadManager.add({
    data: [
      {
        key: `user:${userId}:profile`,
        fetcher: async () => {
          // const response = await profileApi.getProfile(userId);
          // return response.data;
          return null;
        },
        ttl: CacheTTL.LONG,
        priority: 'high',
      },
      {
        key: `user:${userId}:wishlist`,
        fetcher: async () => {
          // const response = await wishlistApi.getWishlist(userId);
          // return response.data;
          return null;
        },
        ttl: CacheTTL.MEDIUM,
        priority: 'medium',
      },
    ],
    priority: 'normal',
  });
}

/**
 * Preload critical app resources on startup
 */
export async function preloadCriticalResources(): Promise<PreloadResult> {

  // Add critical components
  preloadManager.add({
    components: [
      // These would be your actual lazy-loaded components
      // () => import('@/app/MainStorePage'),
      // () => import('@/app/product-page'),
      // () => import('@/app/cart'),
    ],
    priority: 'high',
  });

  // Add critical data
  await preloadCategories();

  // Start preloading
  return preloadManager.preloadAll();
}

export default preloadManager;
