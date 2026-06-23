/**
 * Memory Monitoring Utility
 *
 * Provides utilities for monitoring and managing memory usage in React Native apps
 */

import { Platform, AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface MemoryStats {
  timestamp: number;
  jsHeapSizeLimit?: number;
  totalJSHeapSize?: number;
  usedJSHeapSize?: number;
  platform: string;
}

class MemoryMonitor {
  private static instance: MemoryMonitor;
  private memoryWarningCallbacks: Set<() => void> = new Set();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private lastMemoryWarning: number = 0;
  private readonly WARNING_THRESHOLD_MB = 100; // Warn if memory exceeds 100MB
  private readonly WARNING_COOLDOWN_MS = 30000; // 30 seconds between warnings
  private appStateSubscription: any = null;

  private constructor() {
    // Only auto-start monitoring in development to avoid memory overhead in production
    if (__DEV__) {
      this.setupMemoryWarningListener();
      this.setupAppStateListener();
    }
  }

  /**
   * Setup app state listener to pause monitoring when app is in background
   */
  private setupAppStateListener() {
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Stop monitoring when app goes to background to save resources
        this.stopMonitoring();
      } else if (nextAppState === 'active') {
        // Restart monitoring when app comes back to foreground
        if (Platform.OS !== 'web') {
          this.startMonitoring();
        }
      }
    });
  }

  static getInstance(): MemoryMonitor {
    if (!MemoryMonitor.instance) {
      MemoryMonitor.instance = new MemoryMonitor();
    }
    return MemoryMonitor.instance;
  }

  /**
   * Setup memory warning listener (iOS/Android specific)
   */
  private setupMemoryWarningListener() {
    if (Platform.OS !== 'web') {
      // React Native doesn't have built-in memory warning events
      // But we can poll periodically
      this.startMonitoring();
    }
  }

  /**
   * Start periodic memory monitoring
   */
  startMonitoring(intervalMs: number = 10000) {
    if (this.monitoringInterval) {
      return; // Already monitoring
    }

    this.monitoringInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, intervalMs);
  }

  /**
   * Stop periodic memory monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Cleanup all resources - call when app is being destroyed
   */
  destroy() {
    this.stopMonitoring();
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    this.memoryWarningCallbacks.clear();
  }

  /**
   * Check current memory usage
   */
  private checkMemoryUsage() {
    const stats = this.getMemoryStats();

    if (Platform.OS === 'web' && stats.usedJSHeapSize) {
      const usedMB = stats.usedJSHeapSize / (1024 * 1024);

      if (usedMB > this.WARNING_THRESHOLD_MB) {
        const now = Date.now();

        // Only trigger warning if cooldown has passed
        if (now - this.lastMemoryWarning > this.WARNING_COOLDOWN_MS) {
          this.lastMemoryWarning = now;
          this.triggerMemoryWarning();
        }
      }
    }
  }

  /**
   * Get current memory statistics
   */
  getMemoryStats(): MemoryStats {
    const stats: MemoryStats = {
      timestamp: Date.now(),
      platform: Platform.OS,
    };

    if (Platform.OS === 'web') {
      // @ts-ignore - performance.memory is Chrome-specific
      const memory = (performance as any).memory;
      if (memory) {
        stats.jsHeapSizeLimit = memory.jsHeapSizeLimit;
        stats.totalJSHeapSize = memory.totalJSHeapSize;
        stats.usedJSHeapSize = memory.usedJSHeapSize;
      }
    }

    return stats;
  }

  /**
   * Format memory stats for logging
   */
  formatMemoryStats(): string {
    const stats = this.getMemoryStats();

    if (stats.usedJSHeapSize && stats.jsHeapSizeLimit) {
      const usedMB = (stats.usedJSHeapSize / (1024 * 1024)).toFixed(2);
      const limitMB = (stats.jsHeapSizeLimit / (1024 * 1024)).toFixed(2);
      const percentage = ((stats.usedJSHeapSize / stats.jsHeapSizeLimit) * 100).toFixed(1);

      return `Memory: ${usedMB}MB / ${limitMB}MB (${percentage}%)`;
    }

    return `Memory stats not available on ${stats.platform}`;
  }

  /**
   * Register callback for memory warnings
   */
  onMemoryWarning(callback: () => void): () => void {
    this.memoryWarningCallbacks.add(callback);

    // Return unsubscribe function
    return () => {
      this.memoryWarningCallbacks.delete(callback);
    };
  }

  /**
   * Trigger memory warning callbacks
   */
  private triggerMemoryWarning() {
    this.memoryWarningCallbacks.forEach(callback => {
      try {
        callback();
      } catch (_error) {
        // silently handle callback errors
      }
    });
  }

  /**
   * Clear all AsyncStorage caches to free memory
   */
  async clearCaches(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();

      // Cache keys to clear (non-critical data)
      const cacheKeys = keys.filter(key =>
        key.includes('cache') ||
        key.includes('@errorReporter') ||
        key.includes('@billUpload:analytics') ||
        key.includes('preloaded_videos') ||
        key.includes('search_history')
      );

      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (_error) {
      // silently handle cache clear errors
    }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{ totalKeys: number; estimatedSize: string }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      let totalSize = 0;

      // Estimate size by sampling
      const sampleSize = Math.min(10, keys.length);
      const sampleKeys = keys.slice(0, sampleSize);

      for (const key of sampleKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }

      // Extrapolate total size
      const averageSize = totalSize / sampleSize;
      const estimatedTotal = averageSize * keys.length;
      const estimatedMB = (estimatedTotal / (1024 * 1024)).toFixed(2);

      return {
        totalKeys: keys.length,
        estimatedSize: `~${estimatedMB}MB`,
      };
    } catch (_error) {
      return {
        totalKeys: 0,
        estimatedSize: 'Unknown',
      };
    }
  }

  /**
   * Log detailed memory and storage report
   */
  async logMemoryReport(): Promise<{ memory: string; storage: { totalKeys: number; estimatedSize: string } }> {
    const memory = this.formatMemoryStats();
    const storage = await this.getStorageStats();
    if (__DEV__) {
      console.log(`[MemoryMonitor] ${memory} | Storage: ${storage.totalKeys} keys (${storage.estimatedSize})`);
    }
    return { memory, storage };
  }

  /**
   * Force garbage collection (development only, requires --expose-gc flag)
   */
  forceGC() {
    if (typeof global.gc === 'function') {
      global.gc();
    }
  }
}

export default MemoryMonitor.getInstance();
