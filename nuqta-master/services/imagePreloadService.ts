/**
 * Image Preload Service
 *
 * Intelligent image preloading system with:
 * - Priority-based preloading
 * - Network-aware loading
 * - Memory management
 * - Concurrent loading limits
 * - Preload cancellation
 * - Analytics tracking
 */

import { Platform } from 'react-native';
import { Image } from 'expo-image';
import NetInfo from '@react-native-community/netinfo';

/**
 * Priority levels for image preloading
 */
export enum PreloadPriority {
  CRITICAL = 'critical',    // Above-the-fold images
  HIGH = 'high',            // Immediately visible images
  MEDIUM = 'medium',        // Soon-to-be-visible images
  LOW = 'low',              // Background preloading
}

/**
 * Preload queue item
 */
interface PreloadQueueItem {
  uri: string;
  priority: PreloadPriority;
  componentId?: string;
  timestamp: number;
}

/**
 * Preload result
 */
interface PreloadResult {
  uri: string;
  success: boolean;
  duration: number;
  size?: number;
  fromCache?: boolean;
}

/**
 * Network quality levels
 */
enum NetworkQuality {
  OFFLINE = 'offline',
  SLOW_2G = 'slow-2g',
  FAST_3G = 'fast-3g',
  FAST_4G = 'fast-4g',
  WIFI = 'wifi',
}

/**
 * Image Preload Service Class
 */
class ImagePreloadService {
  private static readonly MAX_SET_SIZE = 2000;
  private preloadQueue: Map<string, PreloadQueueItem> = new Map();
  private loadingSet: Set<string> = new Set();
  private completedSet: Set<string> = new Set();
  private failedSet: Set<string> = new Set();
  private activePreloads: Map<string, Promise<void>> = new Map();
  private networkUnsubscribe: (() => void) | null = null;

  // Configuration
  private maxConcurrentPreloads = 3;
  private maxQueueSize = 50;
  private preloadTimeout = 30000; // 30 seconds
  private networkQuality: NetworkQuality = NetworkQuality.WIFI;

  // Statistics
  private stats = {
    totalPreloaded: 0,
    totalFailed: 0,
    totalDuration: 0,
    cacheHits: 0,
  };

  constructor() {
    this.initializeNetworkListener();
    this.adjustPreloadStrategy();
  }

  /**
   * Initialize network quality listener
   */
  private initializeNetworkListener() {
    // Clean up existing listener before adding new one
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
      this.networkUnsubscribe = null;
    }

    this.networkUnsubscribe = NetInfo.addEventListener(state => {
      const { type, isConnected } = state;

      if (!isConnected) {
        this.networkQuality = NetworkQuality.OFFLINE;
        this.pausePreloading();
        return;
      }

      // Determine network quality
      if (type === 'wifi') {
        this.networkQuality = NetworkQuality.WIFI;
      } else if (type === 'cellular') {
        // Estimate quality based on connection type
        const effectiveType = (state as any).details?.cellularGeneration;
        if (effectiveType === '2g') {
          this.networkQuality = NetworkQuality.SLOW_2G;
        } else if (effectiveType === '3g') {
          this.networkQuality = NetworkQuality.FAST_3G;
        } else {
          this.networkQuality = NetworkQuality.FAST_4G;
        }
      }

      this.adjustPreloadStrategy();
      this.resumePreloading();
    });
  }

  /**
   * Destroy service and cleanup resources
   */
  destroy(): void {
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
      this.networkUnsubscribe = null;
    }
    this.preloadQueue.clear();
    this.loadingSet.clear();
    this.completedSet.clear();
    this.failedSet.clear();
    this.activePreloads.clear();
  }

  /**
   * Adjust preload strategy based on network quality
   */
  private adjustPreloadStrategy() {
    switch (this.networkQuality) {
      case NetworkQuality.WIFI:
        this.maxConcurrentPreloads = 4;
        break;
      case NetworkQuality.FAST_4G:
        this.maxConcurrentPreloads = 3;
        break;
      case NetworkQuality.FAST_3G:
        this.maxConcurrentPreloads = 2;
        break;
      case NetworkQuality.SLOW_2G:
        this.maxConcurrentPreloads = 1;
        break;
      case NetworkQuality.OFFLINE:
        this.maxConcurrentPreloads = 0;
        break;
    }
  }

  /**
   * Preload single image
   */
  async preload(
    uri: string,
    priority: PreloadPriority = PreloadPriority.MEDIUM,
    componentId?: string
  ): Promise<boolean> {
    // Check if already completed or loading
    if (this.completedSet.has(uri)) {
      this.stats.cacheHits++;
      return true;
    }

    if (this.loadingSet.has(uri)) {
      // Wait for existing preload to complete
      const existingPreload = this.activePreloads.get(uri);
      if (existingPreload) {
        await existingPreload;
        return this.completedSet.has(uri);
      }
    }

    // Add to queue
    this.addToQueue(uri, priority, componentId);

    // Process queue
    this.processQueue();

    // Wait for this specific image to load
    const preload = this.activePreloads.get(uri);
    if (preload) {
      await preload;
    }

    return this.completedSet.has(uri);
  }

  /**
   * Preload multiple images
   */
  async preloadBatch(
    uris: string[],
    priority: PreloadPriority = PreloadPriority.MEDIUM,
    componentId?: string
  ): Promise<PreloadResult[]> {
    const results: PreloadResult[] = [];

    for (const uri of uris) {
      const startTime = Date.now();
      const success = await this.preload(uri, priority, componentId);
      const duration = Date.now() - startTime;

      results.push({
        uri,
        success,
        duration,
        fromCache: this.completedSet.has(uri) && duration < 100,
      });
    }

    return results;
  }

  /**
   * Add image to preload queue
   */
  private addToQueue(
    uri: string,
    priority: PreloadPriority,
    componentId?: string
  ) {
    // Skip if already in queue or completed
    if (this.preloadQueue.has(uri) || this.completedSet.has(uri)) {
      return;
    }

    // Check queue size limit
    if (this.preloadQueue.size >= this.maxQueueSize) {
      // Remove lowest priority items
      this.trimQueue();
    }

    this.preloadQueue.set(uri, {
      uri,
      priority,
      componentId,
      timestamp: Date.now(),
    });
  }

  /**
   * Process preload queue
   */
  private async processQueue() {
    // Don't process if offline
    if (this.networkQuality === NetworkQuality.OFFLINE) {
      return;
    }

    // Don't exceed concurrent limit
    if (this.loadingSet.size >= this.maxConcurrentPreloads) {
      return;
    }

    // Get next item from queue based on priority
    const nextItem = this.getNextQueueItem();
    if (!nextItem) {
      return;
    }

    // Remove from queue and add to loading set
    this.preloadQueue.delete(nextItem.uri);
    this.loadingSet.add(nextItem.uri);

    // Create preload promise
    const preloadPromise = this.executePreload(nextItem);
    this.activePreloads.set(nextItem.uri, preloadPromise);

    // Execute preload
    await preloadPromise;

    // Clean up
    this.loadingSet.delete(nextItem.uri);
    this.activePreloads.delete(nextItem.uri);

    // Process next item
    if (this.preloadQueue.size > 0) {
      this.processQueue();
    }
  }

  /**
   * Execute actual image preload
   */
  private async executePreload(item: PreloadQueueItem): Promise<void> {
    const startTime = Date.now();

    try {
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Preload timeout')), this.preloadTimeout);
      });

      // Race between prefetch and timeout
      await Promise.race([
        Image.prefetch(item.uri),
        timeoutPromise,
      ]);

      // Mark as completed
      this.completedSet.add(item.uri);
      this.failedSet.delete(item.uri);

      // Cap completedSet size to prevent unbounded growth
      if (this.completedSet.size > ImagePreloadService.MAX_SET_SIZE) {
        const entries = Array.from(this.completedSet);
        this.completedSet = new Set(entries.slice(-ImagePreloadService.MAX_SET_SIZE));
      }

      // Update stats
      this.stats.totalPreloaded++;
      this.stats.totalDuration += Date.now() - startTime;

    } catch (error) {

      // Mark as failed
      this.failedSet.add(item.uri);
      this.stats.totalFailed++;

      // Cap failedSet size to prevent unbounded growth
      if (this.failedSet.size > ImagePreloadService.MAX_SET_SIZE) {
        const entries = Array.from(this.failedSet);
        this.failedSet = new Set(entries.slice(-ImagePreloadService.MAX_SET_SIZE));
      }
    }
  }

  /**
   * Get next queue item based on priority
   */
  private getNextQueueItem(): PreloadQueueItem | null {
    if (this.preloadQueue.size === 0) {
      return null;
    }

    // Sort by priority
    const priorityOrder = {
      [PreloadPriority.CRITICAL]: 0,
      [PreloadPriority.HIGH]: 1,
      [PreloadPriority.MEDIUM]: 2,
      [PreloadPriority.LOW]: 3,
    };

    let highestPriorityItem: PreloadQueueItem | null = null;
    let highestPriority = Infinity;

    this.preloadQueue.forEach(item => {
      const priorityValue = priorityOrder[item.priority];
      if (priorityValue < highestPriority) {
        highestPriority = priorityValue;
        highestPriorityItem = item;
      }
    });

    return highestPriorityItem;
  }

  /**
   * Trim queue to max size
   */
  private trimQueue() {
    // Remove low priority items first
    const lowPriorityItems = Array.from(this.preloadQueue.values())
      .filter(item => item.priority === PreloadPriority.LOW)
      .sort((a, b) => a.timestamp - b.timestamp);

    if (lowPriorityItems.length > 0) {
      this.preloadQueue.delete(lowPriorityItems[0].uri);
      return;
    }

    // Remove oldest items
    const oldestItem = Array.from(this.preloadQueue.values())
      .sort((a, b) => a.timestamp - b.timestamp)[0];

    if (oldestItem) {
      this.preloadQueue.delete(oldestItem.uri);
    }
  }

  /**
   * Cancel preloading for specific component
   */
  cancelPreloads(componentId: string) {
    // Remove from queue
    this.preloadQueue.forEach((item, uri) => {
      if (item.componentId === componentId) {
        this.preloadQueue.delete(uri);
      }
    });

    // Note: We don't cancel active preloads as they might be needed by other components
  }

  /**
   * Pause all preloading
   */
  private pausePreloading() {
    // Keep queue but stop processing
  }

  /**
   * Resume preloading
   */
  private resumePreloading() {
    this.processQueue();
  }

  /**
   * Clear completed cache
   */
  clearCache() {
    this.completedSet.clear();
    this.failedSet.clear();
    this.stats.cacheHits = 0;
  }

  /**
   * Clear all preloads
   */
  clearAll() {
    this.preloadQueue.clear();
    this.loadingSet.clear();
    this.completedSet.clear();
    this.failedSet.clear();
    this.activePreloads.clear();
    this.stats = {
      totalPreloaded: 0,
      totalFailed: 0,
      totalDuration: 0,
      cacheHits: 0,
    };
  }

  /**
   * Check if image is cached
   */
  isCached(uri: string): boolean {
    return this.completedSet.has(uri);
  }

  /**
   * Check if image failed to load
   */
  hasFailed(uri: string): boolean {
    return this.failedSet.has(uri);
  }

  /**
   * Get preload statistics
   */
  getStats() {
    const avgDuration = this.stats.totalPreloaded > 0
      ? this.stats.totalDuration / this.stats.totalPreloaded
      : 0;

    return {
      ...this.stats,
      queueSize: this.preloadQueue.size,
      loadingCount: this.loadingSet.size,
      cachedCount: this.completedSet.size,
      failedCount: this.failedSet.size,
      avgDuration: Math.round(avgDuration),
      networkQuality: this.networkQuality,
      maxConcurrent: this.maxConcurrentPreloads,
    };
  }

  /**
   * Preload images for next screen (predictive preloading)
   */
  async preloadNextScreen(
    screenName: string,
    imageUris: string[]
  ): Promise<void> {

    await this.preloadBatch(
      imageUris,
      PreloadPriority.MEDIUM,
      `screen:${screenName}`
    );
  }

  /**
   * Preload critical above-the-fold images
   */
  async preloadCritical(imageUris: string[]): Promise<void> {

    await this.preloadBatch(
      imageUris,
      PreloadPriority.CRITICAL
    );
  }
}

// Singleton pattern using globalThis to persist across SSR module re-evaluations
const IMAGE_PRELOAD_SERVICE_KEY = '__rezImagePreloadService__';

function getImagePreloadService(): ImagePreloadService {
  if (typeof globalThis !== 'undefined') {
    if (!(globalThis as any)[IMAGE_PRELOAD_SERVICE_KEY]) {
      (globalThis as any)[IMAGE_PRELOAD_SERVICE_KEY] = new ImagePreloadService();
    }
    return (globalThis as any)[IMAGE_PRELOAD_SERVICE_KEY];
  }
  return new ImagePreloadService();
}

// Export singleton instance
export default getImagePreloadService();
