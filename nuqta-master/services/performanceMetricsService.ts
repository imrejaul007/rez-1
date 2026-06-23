/**
 * Performance Metrics Service
 * Tracks custom performance metrics beyond Web Vitals
 *
 * Metrics tracked:
 * - API latency (per endpoint)
 * - Component render time
 * - Homepage load time
 * - Section load time
 * - Image load time
 * - Cache hit/miss rate
 * - Memory usage
 * - Battery usage (mobile)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ============================================================================
// Types
// ============================================================================

export type MetricUnit = 'ms' | 'bytes' | 'percent' | 'count';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: MetricUnit;
  timestamp: Date;
  context?: Record<string, any>;
}

export interface APILatencyMetric {
  endpoint: string;
  method: string;
  duration: number;
  statusCode?: number;
  success: boolean;
  timestamp: Date;
}

export interface RenderMetric {
  componentName: string;
  duration: number;
  renderCount: number;
  timestamp: Date;
}

export interface PageLoadMetric {
  pageName: string;
  totalTime: number;
  apiTime: number;
  renderTime: number;
  sectionsLoaded: number;
  timestamp: Date;
}

export interface CacheMetric {
  operation: 'hit' | 'miss';
  key: string;
  timestamp: Date;
}

export interface MemoryMetric {
  used: number;
  limit: number;
  percentage: number;
  timestamp: Date;
}

export interface AggregatedMetrics {
  avgAPILatency: number;
  avgRenderTime: number;
  avgLoadTime: number;
  cacheHitRate: number;
  slowAPIs: Array<{ endpoint: string; avgTime: number; count: number }>;
  slowComponents: Array<{ name: string; avgTime: number; renderCount: number }>;
  memoryUsage: MemoryMetric | null;
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'performance_metrics';
const MAX_STORED_METRICS = 500;
const API_LATENCY_THRESHOLD = 1000; // 1 second
const RENDER_TIME_THRESHOLD = 16; // 16ms (60fps)
const PAGE_LOAD_THRESHOLD = 3000; // 3 seconds

// ============================================================================
// Performance Metrics Service Class
// ============================================================================

class PerformanceMetricsService {
  private metrics: PerformanceMetric[] = [];
  private apiMetrics: APILatencyMetric[] = [];
  private renderMetrics: RenderMetric[] = [];
  private pageLoadMetrics: PageLoadMetric[] = [];
  private cacheMetrics: CacheMetric[] = [];
  private memoryMetrics: MemoryMetric[] = [];
  private isEnabled = __DEV__;
  private memoryMonitoringInterval: NodeJS.Timeout | null = null;
  private saveDebounceTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.init();
  }

  /**
   * Initialize service
   */
  private async init(): Promise<void> {
    await this.loadMetrics();

    // Start memory monitoring
    if (this.isEnabled) {
      this.startMemoryMonitoring();
    }
  }

  /**
   * Enable or disable metrics collection
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;

    if (!enabled) {
      // Stop memory monitoring when disabled
      this.stopMemoryMonitoring();
    } else if (!this.memoryMonitoringInterval) {
      // Start memory monitoring if not already running
      this.startMemoryMonitoring();
    }

  }

  // ============================================================================
  // API Latency Tracking
  // ============================================================================

  /**
   * Track API latency
   */
  trackAPILatency(
    endpoint: string,
    duration: number,
    method: string = 'GET',
    statusCode?: number,
    success: boolean = true
  ): void {
    if (!this.isEnabled) return;

    const metric: APILatencyMetric = {
      endpoint,
      method,
      duration,
      statusCode,
      success,
      timestamp: new Date(),
    };

    this.apiMetrics.push(metric);
    this.limitArraySize(this.apiMetrics, MAX_STORED_METRICS);

    // Log slow APIs
    if (duration > API_LATENCY_THRESHOLD) {
    }

    // Track as generic metric
    this.trackMetric(`api_latency:${endpoint}`, duration, 'ms', {
      method,
      statusCode,
      success,
    });

    this.saveMetrics();
  }

  /**
   * Get API latency stats
   */
  getAPILatencyStats(endpoint?: string): {
    avgLatency: number;
    minLatency: number;
    maxLatency: number;
    totalCalls: number;
    successRate: number;
  } {
    const filtered = endpoint
      ? this.apiMetrics.filter(m => m.endpoint === endpoint)
      : this.apiMetrics;

    if (filtered.length === 0) {
      return {
        avgLatency: 0,
        minLatency: 0,
        maxLatency: 0,
        totalCalls: 0,
        successRate: 100,
      };
    }

    const durations = filtered.map(m => m.duration);
    const successCount = filtered.filter(m => m.success).length;

    return {
      avgLatency: durations.reduce((a, b) => a + b, 0) / durations.length,
      minLatency: Math.min(...durations),
      maxLatency: Math.max(...durations),
      totalCalls: filtered.length,
      successRate: (successCount / filtered.length) * 100,
    };
  }

  // ============================================================================
  // Render Time Tracking
  // ============================================================================

  /**
   * Track component render time
   */
  trackRenderTime(componentName: string, duration: number, renderCount: number = 1): void {
    if (!this.isEnabled) return;

    const metric: RenderMetric = {
      componentName,
      duration,
      renderCount,
      timestamp: new Date(),
    };

    this.renderMetrics.push(metric);
    this.limitArraySize(this.renderMetrics, MAX_STORED_METRICS);

    // Log slow renders
    if (duration > RENDER_TIME_THRESHOLD) {
    }

    // Track as generic metric
    this.trackMetric(`render:${componentName}`, duration, 'ms', { renderCount });

    this.saveMetrics();
  }

  /**
   * Get render stats for component
   */
  getRenderStats(componentName?: string): {
    avgRenderTime: number;
    totalRenders: number;
    slowRenders: number;
  } {
    const filtered = componentName
      ? this.renderMetrics.filter(m => m.componentName === componentName)
      : this.renderMetrics;

    if (filtered.length === 0) {
      return {
        avgRenderTime: 0,
        totalRenders: 0,
        slowRenders: 0,
      };
    }

    const durations = filtered.map(m => m.duration);
    const slowRenders = filtered.filter(m => m.duration > RENDER_TIME_THRESHOLD).length;

    return {
      avgRenderTime: durations.reduce((a, b) => a + b, 0) / durations.length,
      totalRenders: filtered.reduce((sum, m) => sum + m.renderCount, 0),
      slowRenders,
    };
  }

  // ============================================================================
  // Page Load Tracking
  // ============================================================================

  /**
   * Track page load metrics
   */
  trackPageLoad(metrics: {
    pageName: string;
    totalTime: number;
    apiTime: number;
    renderTime: number;
    sectionsLoaded: number;
  }): void {
    if (!this.isEnabled) return;

    const metric: PageLoadMetric = {
      ...metrics,
      timestamp: new Date(),
    };

    this.pageLoadMetrics.push(metric);
    this.limitArraySize(this.pageLoadMetrics, MAX_STORED_METRICS);

    // Log slow page loads
    if (metrics.totalTime > PAGE_LOAD_THRESHOLD) {
    }

    // Track as generic metric
    this.trackMetric(`page_load:${metrics.pageName}`, metrics.totalTime, 'ms', {
      apiTime: metrics.apiTime,
      renderTime: metrics.renderTime,
      sectionsLoaded: metrics.sectionsLoaded,
    });

    this.saveMetrics();
  }

  /**
   * Get page load stats
   */
  getPageLoadStats(pageName?: string): {
    avgTotalTime: number;
    avgAPITime: number;
    avgRenderTime: number;
    totalLoads: number;
  } {
    const filtered = pageName
      ? this.pageLoadMetrics.filter(m => m.pageName === pageName)
      : this.pageLoadMetrics;

    if (filtered.length === 0) {
      return {
        avgTotalTime: 0,
        avgAPITime: 0,
        avgRenderTime: 0,
        totalLoads: 0,
      };
    }

    return {
      avgTotalTime: filtered.reduce((sum, m) => sum + m.totalTime, 0) / filtered.length,
      avgAPITime: filtered.reduce((sum, m) => sum + m.apiTime, 0) / filtered.length,
      avgRenderTime: filtered.reduce((sum, m) => sum + m.renderTime, 0) / filtered.length,
      totalLoads: filtered.length,
    };
  }

  // ============================================================================
  // Cache Performance Tracking
  // ============================================================================

  /**
   * Track cache operation
   */
  trackCacheOperation(operation: 'hit' | 'miss', key: string): void {
    if (!this.isEnabled) return;

    const metric: CacheMetric = {
      operation,
      key,
      timestamp: new Date(),
    };

    this.cacheMetrics.push(metric);
    this.limitArraySize(this.cacheMetrics, MAX_STORED_METRICS);

    this.saveMetrics();
  }

  /**
   * Get cache hit rate
   */
  getCacheHitRate(timeRange?: 'hour' | 'day' | 'week'): number {
    const filtered = this.filterByTimeRange(this.cacheMetrics, timeRange);

    if (filtered.length === 0) return 0;

    const hits = filtered.filter(m => m.operation === 'hit').length;
    return (hits / filtered.length) * 100;
  }

  // ============================================================================
  // Memory Tracking
  // ============================================================================

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    // Clear existing interval before starting new one
    this.stopMemoryMonitoring();

    // Monitor memory every 30 seconds
    this.memoryMonitoringInterval = setInterval(() => {
      this.trackMemoryUsage();
    }, 30000);
  }

  /**
   * Stop memory monitoring
   */
  private stopMemoryMonitoring(): void {
    if (this.memoryMonitoringInterval) {
      clearInterval(this.memoryMonitoringInterval);
      this.memoryMonitoringInterval = null;
    }
  }

  /**
   * Destroy service and cleanup resources
   */
  destroy(): void {
    this.stopMemoryMonitoring();
    this.isEnabled = false;
  }

  /**
   * Track memory usage
   */
  trackMemoryUsage(): void {
    if (!this.isEnabled) return;

    try {
      // @ts-ignore - performance.memory is Chrome-specific
      if (typeof performance !== 'undefined' && performance.memory) {
        // @ts-ignore
        const { usedJSHeapSize, jsHeapSizeLimit } = performance.memory;

        const metric: MemoryMetric = {
          used: usedJSHeapSize,
          limit: jsHeapSizeLimit,
          percentage: (usedJSHeapSize / jsHeapSizeLimit) * 100,
          timestamp: new Date(),
        };

        this.memoryMetrics.push(metric);
        this.limitArraySize(this.memoryMetrics, 100);

        // Warn if memory usage is high
        if (metric.percentage > 80) {
        }

        this.saveMetrics();
      }
    } catch (error) {
      // Memory API not available
    }
  }

  /**
   * Get latest memory stats
   */
  getMemoryStats(): MemoryMetric | null {
    if (this.memoryMetrics.length === 0) return null;
    return this.memoryMetrics[this.memoryMetrics.length - 1];
  }

  // ============================================================================
  // Generic Metric Tracking
  // ============================================================================

  /**
   * Track generic metric
   */
  trackMetric(name: string, value: number, unit: MetricUnit, context?: Record<string, any>): void {
    if (!this.isEnabled) return;

    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date(),
      context,
    };

    this.metrics.push(metric);
    this.limitArraySize(this.metrics, MAX_STORED_METRICS);
  }

  // ============================================================================
  // Aggregated Metrics
  // ============================================================================

  /**
   * Get aggregated metrics
   */
  getAggregatedMetrics(timeRange: 'hour' | 'day' | 'week' = 'hour'): AggregatedMetrics {
    const filteredAPIs = this.filterByTimeRange(this.apiMetrics, timeRange);
    const filteredRenders = this.filterByTimeRange(this.renderMetrics, timeRange);
    const filteredPageLoads = this.filterByTimeRange(this.pageLoadMetrics, timeRange);

    // Calculate averages
    const avgAPILatency = filteredAPIs.length > 0
      ? filteredAPIs.reduce((sum, m) => sum + m.duration, 0) / filteredAPIs.length
      : 0;

    const avgRenderTime = filteredRenders.length > 0
      ? filteredRenders.reduce((sum, m) => sum + m.duration, 0) / filteredRenders.length
      : 0;

    const avgLoadTime = filteredPageLoads.length > 0
      ? filteredPageLoads.reduce((sum, m) => sum + m.totalTime, 0) / filteredPageLoads.length
      : 0;

    const cacheHitRate = this.getCacheHitRate(timeRange);

    // Get slow operations
    const slowAPIs = this.getSlowAPIs(filteredAPIs);
    const slowComponents = this.getSlowComponents(filteredRenders);

    return {
      avgAPILatency,
      avgRenderTime,
      avgLoadTime,
      cacheHitRate,
      slowAPIs,
      slowComponents,
      memoryUsage: this.getMemoryStats(),
    };
  }

  /**
   * Get slow APIs
   */
  private getSlowAPIs(metrics: APILatencyMetric[]): Array<{
    endpoint: string;
    avgTime: number;
    count: number;
  }> {
    const grouped = new Map<string, number[]>();

    metrics.forEach(m => {
      const key = `${m.method} ${m.endpoint}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(m.duration);
    });

    const result = Array.from(grouped.entries())
      .map(([endpoint, durations]) => ({
        endpoint,
        avgTime: durations.reduce((a, b) => a + b, 0) / durations.length,
        count: durations.length,
      }))
      .filter(item => item.avgTime > API_LATENCY_THRESHOLD)
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 10);

    return result;
  }

  /**
   * Get slow components
   */
  private getSlowComponents(metrics: RenderMetric[]): Array<{
    name: string;
    avgTime: number;
    renderCount: number;
  }> {
    const grouped = new Map<string, { durations: number[]; renders: number }>();

    metrics.forEach(m => {
      if (!grouped.has(m.componentName)) {
        grouped.set(m.componentName, { durations: [], renders: 0 });
      }
      const entry = grouped.get(m.componentName)!;
      entry.durations.push(m.duration);
      entry.renders += m.renderCount;
    });

    const result = Array.from(grouped.entries())
      .map(([name, data]) => ({
        name,
        avgTime: data.durations.reduce((a, b) => a + b, 0) / data.durations.length,
        renderCount: data.renders,
      }))
      .filter(item => item.avgTime > RENDER_TIME_THRESHOLD)
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 10);

    return result;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Filter metrics by time range
   */
  private filterByTimeRange<T extends { timestamp: Date }>(
    metrics: T[],
    timeRange?: 'hour' | 'day' | 'week'
  ): T[] {
    if (!timeRange) return metrics;

    const now = Date.now();
    const ranges = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
    };

    const cutoff = now - ranges[timeRange];
    return metrics.filter(m => m.timestamp.getTime() > cutoff);
  }

  /**
   * Limit array size
   */
  private limitArraySize<T>(array: T[], maxSize: number): void {
    while (array.length > maxSize) {
      array.shift();
    }
  }

  /**
   * Save metrics to storage
   */
  private saveMetrics(): void {
    // Debounce saves to avoid excessive AsyncStorage writes
    if (this.saveDebounceTimer) clearTimeout(this.saveDebounceTimer);
    this.saveDebounceTimer = setTimeout(async () => {
      try {
        const data = {
          metrics: this.metrics.slice(-MAX_STORED_METRICS),
          apiMetrics: this.apiMetrics.slice(-MAX_STORED_METRICS),
          renderMetrics: this.renderMetrics.slice(-MAX_STORED_METRICS),
          pageLoadMetrics: this.pageLoadMetrics.slice(-MAX_STORED_METRICS),
          cacheMetrics: this.cacheMetrics.slice(-MAX_STORED_METRICS),
          memoryMetrics: this.memoryMetrics.slice(-100),
        };

        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (_error) {
        // silently handle
      }
    }, 5000);
  }

  /**
   * Load metrics from storage
   */
  private async loadMetrics(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);

        // Convert timestamp strings back to Date objects
        this.metrics = (data.metrics || []).map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));

        this.apiMetrics = (data.apiMetrics || []).map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));

        this.renderMetrics = (data.renderMetrics || []).map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));

        this.pageLoadMetrics = (data.pageLoadMetrics || []).map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));

        this.cacheMetrics = (data.cacheMetrics || []).map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));

        this.memoryMetrics = (data.memoryMetrics || []).map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));

      }
    } catch (_error) {
      // silently handle
    }
  }

  /**
   * Clear all metrics
   */
  async clearMetrics(): Promise<void> {
    this.metrics = [];
    this.apiMetrics = [];
    this.renderMetrics = [];
    this.pageLoadMetrics = [];
    this.cacheMetrics = [];
    this.memoryMetrics = [];

    await AsyncStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Export metrics as JSON
   */
  exportMetrics(): string {
    return JSON.stringify({
      metrics: this.metrics,
      apiMetrics: this.apiMetrics,
      renderMetrics: this.renderMetrics,
      pageLoadMetrics: this.pageLoadMetrics,
      cacheMetrics: this.cacheMetrics,
      memoryMetrics: this.memoryMetrics,
    }, null, 2);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const performanceMetricsService = new PerformanceMetricsService();
export default performanceMetricsService;
