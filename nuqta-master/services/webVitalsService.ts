/**
 * Web Vitals Service
 * Tracks Core Web Vitals for web platform performance monitoring
 *
 * Metrics tracked:
 * - LCP (Largest Contentful Paint) - Loading performance
 * - FID (First Input Delay) - Interactivity
 * - CLS (Cumulative Layout Shift) - Visual stability
 * - TTFB (Time to First Byte) - Server response time
 * - FCP (First Contentful Paint) - Initial render
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const devLog = {
  log: __DEV__ ? console.log.bind(console) : () => {},
  warn: __DEV__ ? console.warn.bind(console) : () => {},
  error: __DEV__ ? console.error.bind(console) : () => {},
};

// ============================================================================
// Types
// ============================================================================

export type WebVitalsMetricName = 'CLS' | 'FID' | 'LCP' | 'FCP' | 'TTFB' | 'INP';
export type WebVitalsRating = 'good' | 'needs-improvement' | 'poor';

export interface WebVitalsMetric {
  name: WebVitalsMetricName;
  value: number;
  rating: WebVitalsRating;
  delta: number;
  id: string;
  navigationType?: string;
  timestamp: number;
}

export interface WebVitalsSummary {
  lcp: number;
  fid: number;
  cls: number;
  fcp: number;
  ttfb: number;
  rating: WebVitalsRating;
  timestamp: number;
}

export interface WebVitalsThresholds {
  lcp: { good: number; poor: number };
  fid: { good: number; poor: number };
  cls: { good: number; poor: number };
  fcp: { good: number; poor: number };
  ttfb: { good: number; poor: number };
  inp: { good: number; poor: number };
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'web_vitals_metrics';
const MAX_STORED_METRICS = 100;

// Web Vitals Thresholds (from web.dev)
const THRESHOLDS: WebVitalsThresholds = {
  lcp: { good: 2500, poor: 4000 }, // Largest Contentful Paint (ms)
  fid: { good: 100, poor: 300 },   // First Input Delay (ms)
  cls: { good: 0.1, poor: 0.25 },  // Cumulative Layout Shift
  fcp: { good: 1800, poor: 3000 }, // First Contentful Paint (ms)
  ttfb: { good: 800, poor: 1800 }, // Time to First Byte (ms)
  inp: { good: 200, poor: 500 },   // Interaction to Next Paint (ms)
};

// ============================================================================
// Web Vitals Service Class
// ============================================================================

class WebVitalsService {
  private metrics: WebVitalsMetric[] = [];
  private isInitialized = false;
  private analyticsCallback?: (metric: WebVitalsMetric) => void;

  /**
   * Initialize Web Vitals tracking (web only)
   */
  async init(analyticsCallback?: (metric: WebVitalsMetric) => void): Promise<void> {
    if (Platform.OS !== 'web') {
      devLog.log('[WebVitals] Skipping - not running on web platform');
      return;
    }

    if (this.isInitialized) {
      devLog.warn('[WebVitals] Already initialized');
      return;
    }

    this.analyticsCallback = analyticsCallback;

    try {
      // Load stored metrics
      await this.loadMetrics();

      // Initialize web-vitals library dynamically
      if (typeof window !== 'undefined') {
        // Use dynamic import for web-vitals (web only)
        this.initializeWebVitals();
      }

      this.isInitialized = true;
      devLog.log('[WebVitals] Service initialized');
    } catch (error) {
      devLog.error('[WebVitals] Initialization failed:', error);
    }
  }

  /**
   * Initialize web-vitals library
   */
  private initializeWebVitals(): void {
    // For web platform, we'll use the Performance Observer API
    // This is a lightweight alternative to web-vitals library
    this.observeLCP();
    this.observeFID();
    this.observeCLS();
    this.observeFCP();
    this.observeTTFB();
  }

  /**
   * Observe Largest Contentful Paint (LCP)
   */
  private observeLCP(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];

        if (lastEntry && 'renderTime' in lastEntry) {
          const lcp = lastEntry.renderTime || (lastEntry as any).loadTime;
          this.handleMetric({
            name: 'LCP',
            value: lcp,
            rating: this.getRating('LCP', lcp),
            delta: lcp,
            id: this.generateId(),
            timestamp: Date.now(),
          });
        }
      });

      observer.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (error) {
      devLog.warn('[WebVitals] LCP observation failed:', error);
    }
  }

  /**
   * Observe First Input Delay (FID)
   */
  private observeFID(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (entry.processingStart && entry.startTime) {
            const fid = entry.processingStart - entry.startTime;
            this.handleMetric({
              name: 'FID',
              value: fid,
              rating: this.getRating('FID', fid),
              delta: fid,
              id: this.generateId(),
              timestamp: Date.now(),
            });
          }
        });
      });

      observer.observe({ type: 'first-input', buffered: true });
    } catch (error) {
      devLog.warn('[WebVitals] FID observation failed:', error);
    }
  }

  /**
   * Observe Cumulative Layout Shift (CLS)
   */
  private observeCLS(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    try {
      let clsValue = 0;
      let clsEntries: any[] = [];

      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            clsEntries.push(entry);
          }
        });

        // Report CLS periodically
        this.handleMetric({
          name: 'CLS',
          value: clsValue,
          rating: this.getRating('CLS', clsValue),
          delta: clsValue,
          id: this.generateId(),
          timestamp: Date.now(),
        });
      });

      observer.observe({ type: 'layout-shift', buffered: true });
    } catch (error) {
      devLog.warn('[WebVitals] CLS observation failed:', error);
    }
  }

  /**
   * Observe First Contentful Paint (FCP)
   */
  private observeFCP(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (entry.name === 'first-contentful-paint') {
            this.handleMetric({
              name: 'FCP',
              value: entry.startTime,
              rating: this.getRating('FCP', entry.startTime),
              delta: entry.startTime,
              id: this.generateId(),
              timestamp: Date.now(),
            });
          }
        });
      });

      observer.observe({ type: 'paint', buffered: true });
    } catch (error) {
      devLog.warn('[WebVitals] FCP observation failed:', error);
    }
  }

  /**
   * Observe Time to First Byte (TTFB)
   */
  private observeTTFB(): void {
    if (typeof window === 'undefined' || !('performance' in window)) return;

    try {
      const navigationTiming = performance.getEntriesByType('navigation')[0] as any;
      if (navigationTiming) {
        const ttfb = navigationTiming.responseStart - navigationTiming.requestStart;
        this.handleMetric({
          name: 'TTFB',
          value: ttfb,
          rating: this.getRating('TTFB', ttfb),
          delta: ttfb,
          id: this.generateId(),
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      devLog.warn('[WebVitals] TTFB observation failed:', error);
    }
  }

  /**
   * Handle metric collection
   */
  private handleMetric = (metric: WebVitalsMetric): void => {
    // Store metric
    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > MAX_STORED_METRICS) {
      this.metrics.shift();
    }

    // Log metric
    this.logMetric(metric);

    // Send to analytics
    if (this.analyticsCallback) {
      this.analyticsCallback(metric);
    }

    // Save to storage
    this.saveMetrics();
  };

  /**
   * Log metric to console
   */
  private logMetric(metric: WebVitalsMetric): void {
    const emoji = metric.rating === 'good' ? '✅' : metric.rating === 'needs-improvement' ? '⚠️' : '❌';
    devLog.log(
      `${emoji} [WebVitals] ${metric.name}: ${metric.value.toFixed(2)}${this.getUnit(metric.name)} (${metric.rating})`
    );
  }

  /**
   * Get unit for metric
   */
  private getUnit(name: WebVitalsMetricName): string {
    return name === 'CLS' ? '' : 'ms';
  }

  /**
   * Get rating for metric value
   */
  private getRating(name: Exclude<WebVitalsMetricName, 'INP'>, value: number): WebVitalsRating {
    const threshold = THRESHOLDS[name.toLowerCase() as keyof typeof THRESHOLDS];
    if (!threshold) return 'good';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get all metrics
   */
  getMetrics(): WebVitalsMetric[] {
    return [...this.metrics];
  }

  /**
   * Get latest metric by name
   */
  getLatestMetric(name: WebVitalsMetricName): WebVitalsMetric | null {
    const filtered = this.metrics.filter(m => m.name === name);
    return filtered.length > 0 ? filtered[filtered.length - 1] : null;
  }

  /**
   * Get summary of all metrics
   */
  getSummary(): WebVitalsSummary {
    const lcp = this.getLatestMetric('LCP')?.value || 0;
    const fid = this.getLatestMetric('FID')?.value || 0;
    const cls = this.getLatestMetric('CLS')?.value || 0;
    const fcp = this.getLatestMetric('FCP')?.value || 0;
    const ttfb = this.getLatestMetric('TTFB')?.value || 0;

    // Calculate overall rating
    const ratings = [
      this.getRating('LCP', lcp),
      this.getRating('FID', fid),
      this.getRating('CLS', cls),
      this.getRating('FCP', fcp),
      this.getRating('TTFB', ttfb),
    ];

    const overallRating = ratings.includes('poor')
      ? 'poor'
      : ratings.includes('needs-improvement')
      ? 'needs-improvement'
      : 'good';

    return {
      lcp,
      fid,
      cls,
      fcp,
      ttfb,
      rating: overallRating,
      timestamp: Date.now(),
    };
  }

  /**
   * Get performance score (0-100)
   */
  getPerformanceScore(): number {
    const summary = this.getSummary();
    let score = 100;

    // Deduct points based on ratings
    const metrics = [
      { value: summary.lcp, name: 'LCP' as const },
      { value: summary.fid, name: 'FID' as const },
      { value: summary.cls, name: 'CLS' as const },
      { value: summary.fcp, name: 'FCP' as const },
      { value: summary.ttfb, name: 'TTFB' as const },
    ];

    metrics.forEach(({ value, name }) => {
      const rating = this.getRating(name, value);
      if (rating === 'poor') score -= 20;
      else if (rating === 'needs-improvement') score -= 10;
    });

    return Math.max(0, score);
  }

  /**
   * Save metrics to storage
   */
  private async saveMetrics(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.metrics));
    } catch (error) {
      devLog.error('[WebVitals] Failed to save metrics:', error);
    }
  }

  /**
   * Load metrics from storage
   */
  private async loadMetrics(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.metrics = JSON.parse(stored);
        devLog.log(`[WebVitals] Loaded ${this.metrics.length} stored metrics`);
      }
    } catch (error) {
      devLog.error('[WebVitals] Failed to load metrics:', error);
    }
  }

  /**
   * Clear all metrics
   */
  async clearMetrics(): Promise<void> {
    this.metrics = [];
    await AsyncStorage.removeItem(STORAGE_KEY);
    devLog.log('[WebVitals] Metrics cleared');
  }

  /**
   * Print summary to console
   */
  printSummary(): void {
    const summary = this.getSummary();
    const score = this.getPerformanceScore();

    devLog.log('\n========================================');
    devLog.log('       WEB VITALS SUMMARY');
    devLog.log('========================================\n');
    devLog.log(`Overall Score: ${score}/100 (${summary.rating})\n`);
    devLog.log(`LCP: ${summary.lcp.toFixed(2)}ms (${this.getRating('LCP', summary.lcp)})`);
    devLog.log(`FID: ${summary.fid.toFixed(2)}ms (${this.getRating('FID', summary.fid)})`);
    devLog.log(`CLS: ${summary.cls.toFixed(3)} (${this.getRating('CLS', summary.cls)})`);
    devLog.log(`FCP: ${summary.fcp.toFixed(2)}ms (${this.getRating('FCP', summary.fcp)})`);
    devLog.log(`TTFB: ${summary.ttfb.toFixed(2)}ms (${this.getRating('TTFB', summary.ttfb)})\n`);
    devLog.log('========================================\n');
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

// Singleton pattern using globalThis to persist across SSR module re-evaluations
const WEB_VITALS_SERVICE_KEY = '__rezWebVitalsService__';

function getWebVitalsService(): WebVitalsService {
  if (typeof globalThis !== 'undefined') {
    if (!(globalThis as any)[WEB_VITALS_SERVICE_KEY]) {
      (globalThis as any)[WEB_VITALS_SERVICE_KEY] = new WebVitalsService();
    }
    return (globalThis as any)[WEB_VITALS_SERVICE_KEY];
  }
  return new WebVitalsService();
}

export const webVitalsService = getWebVitalsService();
export default webVitalsService;
