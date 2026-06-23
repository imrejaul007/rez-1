/**
 * Performance Monitor
 * Tracks app performance metrics including screen load times, API responses, and render times
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Cross-platform high-resolution time function
 * Uses getHighResTime() on web, Date.now() on native
 */
const getHighResTime = (): number => {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
};

// ============================================================================
// Types
// ============================================================================

export interface PerformanceMetric {
  name: string;
  type: 'screen' | 'api' | 'render' | 'interaction' | 'custom';
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
  timestamp: number;
}

export interface PerformanceReport {
  totalMetrics: number;
  averages: {
    screenLoad: number;
    apiResponse: number;
    renderTime: number;
    interactionTime: number;
  };
  slowest: PerformanceMetric[];
  byType: Record<string, PerformanceMetric[]>;
  recommendations: string[];
}

// ============================================================================
// Constants
// ============================================================================

const METRICS_STORAGE_KEY = 'performance_metrics';
const MAX_STORED_METRICS = 100;
const SLOW_SCREEN_THRESHOLD = 1000; // 1 second
const SLOW_API_THRESHOLD = 2000; // 2 seconds
const SLOW_RENDER_THRESHOLD = 16; // 16ms (60fps)
const SLOW_INTERACTION_THRESHOLD = 100; // 100ms

// ============================================================================
// Performance Monitor Class
// ============================================================================

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private completedMetrics: PerformanceMetric[] = [];
  private enabled: boolean = __DEV__; // Only enable in development by default

  /**
   * Enable or disable performance monitoring
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if monitoring is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Start tracking a metric
   */
  start(name: string, type: PerformanceMetric['type'], metadata?: Record<string, any>): void {
    if (!this.enabled) return;

    const metric: PerformanceMetric = {
      name,
      type,
      startTime: getHighResTime(),
      timestamp: Date.now(),
      metadata,
    };

    this.metrics.set(name, metric);
  }

  /**
   * End tracking a metric
   */
  end(name: string, metadata?: Record<string, any>): void {
    if (!this.enabled) return;

    const metric = this.metrics.get(name);
    if (!metric) {
      return;
    }

    const endTime = getHighResTime();
    const duration = endTime - metric.startTime;

    const completedMetric: PerformanceMetric = {
      ...metric,
      endTime,
      duration,
      metadata: { ...metric.metadata, ...metadata },
    };

    this.completedMetrics.push(completedMetric);
    // Cap in-memory array to prevent unbounded growth
    if (this.completedMetrics.length > MAX_STORED_METRICS * 2) {
      this.completedMetrics = this.completedMetrics.slice(-MAX_STORED_METRICS);
    }
    this.metrics.delete(name);

    // Log slow operations
    this.logSlowOperation(completedMetric);

    // Store metrics periodically
    if (this.completedMetrics.length % 10 === 0) {
      this.saveMetrics();
    }

  }

  /**
   * Log slow operations
   */
  private logSlowOperation(metric: PerformanceMetric): void {
    if (!metric.duration) return;

    let threshold = 0;
    switch (metric.type) {
      case 'screen':
        threshold = SLOW_SCREEN_THRESHOLD;
        break;
      case 'api':
        threshold = SLOW_API_THRESHOLD;
        break;
      case 'render':
        threshold = SLOW_RENDER_THRESHOLD;
        break;
      case 'interaction':
        threshold = SLOW_INTERACTION_THRESHOLD;
        break;
      default:
        return;
    }

    if (metric.duration > threshold) {
    }
  }

  /**
   * Mark a specific time point
   */
  mark(name: string, metadata?: Record<string, any>): void {
    if (!this.enabled) return;

    const metric: PerformanceMetric = {
      name,
      type: 'custom',
      startTime: getHighResTime(),
      timestamp: Date.now(),
      metadata,
    };

    this.completedMetrics.push(metric);
  }

  /**
   * Measure time between two marks
   */
  measure(name: string, startMark: string, endMark?: string): number | null {
    if (!this.enabled) return null;

    const start = this.completedMetrics.find((m) => m.name === startMark);
    if (!start) {
      return null;
    }

    const end = endMark
      ? this.completedMetrics.find((m) => m.name === endMark)
      : { startTime: getHighResTime() };

    if (!end) {
      return null;
    }

    const duration = end.startTime - start.startTime;

    return duration;
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.completedMetrics];
  }

  /**
   * Get metrics by type
   */
  getMetricsByType(type: PerformanceMetric['type']): PerformanceMetric[] {
    return this.completedMetrics.filter((m) => m.type === type);
  }

  /**
   * Get slowest metrics
   */
  getSlowestMetrics(count: number = 10): PerformanceMetric[] {
    return [...this.completedMetrics]
      .filter((m) => m.duration !== undefined)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, count);
  }

  /**
   * Calculate average duration by type
   */
  getAverageDuration(type: PerformanceMetric['type']): number {
    const metrics = this.getMetricsByType(type).filter((m) => m.duration !== undefined);

    if (metrics.length === 0) return 0;

    const total = metrics.reduce((sum, m) => sum + (m.duration || 0), 0);
    return total / metrics.length;
  }

  /**
   * Generate performance report
   */
  generateReport(): PerformanceReport {
    const byType: Record<string, PerformanceMetric[]> = {
      screen: this.getMetricsByType('screen'),
      api: this.getMetricsByType('api'),
      render: this.getMetricsByType('render'),
      interaction: this.getMetricsByType('interaction'),
      custom: this.getMetricsByType('custom'),
    };

    const averages = {
      screenLoad: this.getAverageDuration('screen'),
      apiResponse: this.getAverageDuration('api'),
      renderTime: this.getAverageDuration('render'),
      interactionTime: this.getAverageDuration('interaction'),
    };

    const recommendations: string[] = [];

    // Generate recommendations
    if (averages.screenLoad > SLOW_SCREEN_THRESHOLD) {
      recommendations.push(
        `Screen load time (${averages.screenLoad.toFixed(0)}ms) exceeds threshold. Consider code splitting or lazy loading.`
      );
    }

    if (averages.apiResponse > SLOW_API_THRESHOLD) {
      recommendations.push(
        `API response time (${averages.apiResponse.toFixed(0)}ms) is slow. Consider implementing caching or optimizing queries.`
      );
    }

    if (averages.renderTime > SLOW_RENDER_THRESHOLD) {
      recommendations.push(
        `Render time (${averages.renderTime.toFixed(2)}ms) exceeds 16ms frame budget. Consider memoization or virtualization.`
      );
    }

    return {
      totalMetrics: this.completedMetrics.length,
      averages,
      slowest: this.getSlowestMetrics(10),
      byType,
      recommendations,
    };
  }

  /**
   * Save metrics to storage
   */
  private async saveMetrics(): Promise<void> {
    try {
      // Keep only recent metrics
      const metricsToSave = this.completedMetrics.slice(-MAX_STORED_METRICS);

      await AsyncStorage.setItem(METRICS_STORAGE_KEY, JSON.stringify(metricsToSave));
    } catch (_error) {
      // silently handle
    }
  }

  /**
   * Load metrics from storage
   */
  async loadMetrics(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(METRICS_STORAGE_KEY);
      if (stored) {
        this.completedMetrics = JSON.parse(stored);
      }
    } catch (_error) {
      // silently handle
    }
  }

  /**
   * Clear all metrics
   */
  async clearMetrics(): Promise<void> {
    this.metrics.clear();
    this.completedMetrics = [];
    await AsyncStorage.removeItem(METRICS_STORAGE_KEY);
  }

  /**
   * Export metrics as JSON
   */
  exportMetrics(): string {
    return JSON.stringify(this.completedMetrics, null, 2);
  }

  /**
   * Print performance report to console
   */
  printReport(): void {
    // No-op: console output removed for production
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const performanceMonitor = new PerformanceMonitor();

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Track screen load time
 */
export function trackScreenLoad(screenName: string, metadata?: Record<string, any>): () => void {
  performanceMonitor.start(`screen:${screenName}`, 'screen', metadata);

  return () => {
    performanceMonitor.end(`screen:${screenName}`);
  };
}

/**
 * Track API call
 */
export function trackApiCall(
  endpoint: string,
  method: string = 'GET',
  metadata?: Record<string, any>
): () => void {
  const name = `api:${method}:${endpoint}`;
  performanceMonitor.start(name, 'api', { method, endpoint, ...metadata });

  return () => {
    performanceMonitor.end(name);
  };
}

/**
 * Track component render
 */
export function trackRender(componentName: string, metadata?: Record<string, any>): () => void {
  performanceMonitor.start(`render:${componentName}`, 'render', metadata);

  return () => {
    performanceMonitor.end(`render:${componentName}`);
  };
}

/**
 * Track user interaction
 */
export function trackInteraction(
  interactionName: string,
  metadata?: Record<string, any>
): () => void {
  performanceMonitor.start(`interaction:${interactionName}`, 'interaction', metadata);

  return () => {
    performanceMonitor.end(`interaction:${interactionName}`);
  };
}

/**
 * Measure async operation
 */
export async function measureAsync<T>(
  name: string,
  operation: () => Promise<T>,
  type: PerformanceMetric['type'] = 'custom'
): Promise<T> {
  performanceMonitor.start(name, type);

  try {
    const result = await operation();
    performanceMonitor.end(name);
    return result;
  } catch (error) {
    performanceMonitor.end(name, { error: true });
    throw error;
  }
}

/**
 * Measure sync operation
 */
export function measureSync<T>(
  name: string,
  operation: () => T,
  type: PerformanceMetric['type'] = 'custom'
): T {
  performanceMonitor.start(name, type);

  try {
    const result = operation();
    performanceMonitor.end(name);
    return result;
  } catch (error) {
    performanceMonitor.end(name, { error: true });
    throw error;
  }
}

export default performanceMonitor;
