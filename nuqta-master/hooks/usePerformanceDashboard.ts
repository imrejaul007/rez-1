/**
 * Performance Dashboard Hook
 * Provides real-time performance data for developer tools and monitoring
 */

import { useState, useEffect, useCallback } from 'react';
import { webVitalsService, WebVitalsSummary } from '@/services/webVitalsService';
import { performanceMetricsService, AggregatedMetrics } from '@/services/performanceMetricsService';
import { errorTrackingService, ErrorStats } from '@/services/errorTrackingService';
import { performanceMonitor } from '@/utils/performanceMonitor';

// ============================================================================
// Types
// ============================================================================

export interface MemoryStats {
  used: number;
  limit: number;
  percentage: number;
}

export interface PerformanceDashboard {
  webVitals: WebVitalsSummary;
  customMetrics: AggregatedMetrics;
  errors: {
    total: number;
    recent: number;
    rate: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  };
  memory: MemoryStats | null;
  recommendations: string[];
  score: number;
  timestamp: Date;
}

export interface DashboardOptions {
  updateInterval?: number; // milliseconds
  autoRefresh?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_UPDATE_INTERVAL = 5000; // 5 seconds

// Performance thresholds for recommendations
const THRESHOLDS = {
  apiLatency: 1000, // 1 second
  renderTime: 16, // 16ms (60fps)
  loadTime: 3000, // 3 seconds
  cacheHitRate: 70, // 70%
  memoryUsage: 80, // 80%
  errorRate: 10, // 10 errors per hour
};

// ============================================================================
// Hook
// ============================================================================

export function usePerformanceDashboard(
  options: DashboardOptions = {}
): PerformanceDashboard | null {
  const {
    updateInterval = DEFAULT_UPDATE_INTERVAL,
    autoRefresh = true,
  } = options;

  const [dashboard, setDashboard] = useState<PerformanceDashboard | null>(null);

  /**
   * Generate recommendations based on metrics
   */
  const generateRecommendations = useCallback((
    webVitals: WebVitalsSummary,
    metrics: AggregatedMetrics,
    errors: ErrorStats
  ): string[] => {
    const recommendations: string[] = [];

    // Web Vitals recommendations
    if (webVitals.lcp > 2500) {
      recommendations.push(
        `LCP is ${(webVitals.lcp / 1000).toFixed(1)}s. Optimize largest content rendering.`
      );
    }

    if (webVitals.fid > 100) {
      recommendations.push(
        `FID is ${webVitals.fid.toFixed(0)}ms. Reduce JavaScript execution time.`
      );
    }

    if (webVitals.cls > 0.1) {
      recommendations.push(
        `CLS is ${webVitals.cls.toFixed(3)}. Fix layout shifts by reserving space for dynamic content.`
      );
    }

    // API latency recommendations
    if (metrics.avgAPILatency > THRESHOLDS.apiLatency) {
      recommendations.push(
        `Average API latency is ${metrics.avgAPILatency.toFixed(0)}ms. Consider caching or API optimization.`
      );
    }

    // Slow APIs
    if (metrics.slowAPIs.length > 0) {
      const slowest = metrics.slowAPIs[0];
      recommendations.push(
        `Slowest API: ${slowest.endpoint} (${slowest.avgTime.toFixed(0)}ms). Investigate backend performance.`
      );
    }

    // Render time recommendations
    if (metrics.avgRenderTime > THRESHOLDS.renderTime) {
      recommendations.push(
        `Average render time is ${metrics.avgRenderTime.toFixed(2)}ms. Consider memoization or virtualization.`
      );
    }

    // Slow components
    if (metrics.slowComponents.length > 0) {
      const slowest = metrics.slowComponents[0];
      recommendations.push(
        `Slowest component: ${slowest.name} (${slowest.avgTime.toFixed(2)}ms). Optimize component rendering.`
      );
    }

    // Page load recommendations
    if (metrics.avgLoadTime > THRESHOLDS.loadTime) {
      recommendations.push(
        `Average page load is ${(metrics.avgLoadTime / 1000).toFixed(1)}s. Implement code splitting or lazy loading.`
      );
    }

    // Cache recommendations
    if (metrics.cacheHitRate < THRESHOLDS.cacheHitRate) {
      recommendations.push(
        `Cache hit rate is ${metrics.cacheHitRate.toFixed(1)}%. Improve caching strategy.`
      );
    }

    // Memory recommendations
    if (metrics.memoryUsage && metrics.memoryUsage.percentage > THRESHOLDS.memoryUsage) {
      recommendations.push(
        `Memory usage is ${metrics.memoryUsage.percentage.toFixed(1)}%. Check for memory leaks.`
      );
    }

    // Error recommendations
    const errorRate = Object.values(errors.byType).reduce((sum, count) => sum + count, 0);
    if (errorRate > THRESHOLDS.errorRate) {
      recommendations.push(
        `High error rate: ${errorRate} errors in the last hour. Review error logs.`
      );
    }

    // Critical errors
    if (errors.bySeverity.critical > 0) {
      recommendations.push(
        `${errors.bySeverity.critical} critical errors detected. Immediate attention required.`
      );
    }

    // If no issues, add positive message
    if (recommendations.length === 0) {
      recommendations.push('All metrics are within optimal ranges. Great job!');
    }

    return recommendations;
  }, []);

  /**
   * Calculate overall performance score (0-100)
   */
  const calculatePerformanceScore = useCallback((
    webVitals: WebVitalsSummary,
    metrics: AggregatedMetrics,
    errors: ErrorStats
  ): number => {
    let score = 100;

    // Web Vitals score (40 points max)
    const webVitalsScore = webVitalsService.getPerformanceScore();
    score -= (100 - webVitalsScore) * 0.4;

    // API latency score (20 points max)
    if (metrics.avgAPILatency > THRESHOLDS.apiLatency) {
      const penalty = Math.min(20, (metrics.avgAPILatency / THRESHOLDS.apiLatency - 1) * 10);
      score -= penalty;
    }

    // Render time score (15 points max)
    if (metrics.avgRenderTime > THRESHOLDS.renderTime) {
      const penalty = Math.min(15, (metrics.avgRenderTime / THRESHOLDS.renderTime - 1) * 7.5);
      score -= penalty;
    }

    // Cache hit rate score (10 points max)
    if (metrics.cacheHitRate < THRESHOLDS.cacheHitRate) {
      const penalty = ((THRESHOLDS.cacheHitRate - metrics.cacheHitRate) / THRESHOLDS.cacheHitRate) * 10;
      score -= penalty;
    }

    // Error score (15 points max)
    const errorRate = Object.values(errors.byType).reduce((sum, count) => sum + count, 0);
    const errorPenalty = Math.min(15, (errorRate / THRESHOLDS.errorRate) * 10);
    score -= errorPenalty;

    // Critical errors (extra penalty)
    if (errors.bySeverity.critical > 0) {
      score -= errors.bySeverity.critical * 5;
    }

    return Math.max(0, Math.min(100, score));
  }, []);

  /**
   * Get memory stats
   */
  const getMemoryStats = useCallback((): MemoryStats | null => {
    const memoryMetric = performanceMetricsService.getMemoryStats();
    if (memoryMetric) {
      return {
        used: memoryMetric.used,
        limit: memoryMetric.limit,
        percentage: memoryMetric.percentage,
      };
    }

    // Fallback to performance.memory API (Chrome only)
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const { usedJSHeapSize, jsHeapSizeLimit } = (performance as any).memory;
      return {
        used: usedJSHeapSize,
        limit: jsHeapSizeLimit,
        percentage: (usedJSHeapSize / jsHeapSizeLimit) * 100,
      };
    }

    return null;
  }, []);

  /**
   * Update dashboard data
   */
  const updateDashboard = useCallback(() => {
    try {
      // Get Web Vitals
      const webVitals = webVitalsService.getSummary();

      // Get custom metrics
      const customMetrics = performanceMetricsService.getAggregatedMetrics('hour');

      // Get error stats
      const errorStats = errorTrackingService.getErrorStats('hour');

      // Get memory stats
      const memory = getMemoryStats();

      // Generate recommendations
      const recommendations = generateRecommendations(webVitals, customMetrics, errorStats);

      // Calculate score
      const score = calculatePerformanceScore(webVitals, customMetrics, errorStats);

      // Build dashboard
      const dashboardData: PerformanceDashboard = {
        webVitals,
        customMetrics,
        errors: {
          total: errorStats.total,
          recent: errorStats.recentErrors.length,
          rate: errorStats.total / 60, // errors per minute
          byType: errorStats.byType,
          bySeverity: errorStats.bySeverity,
        },
        memory,
        recommendations,
        score,
        timestamp: new Date(),
      };

      setDashboard(dashboardData);
    } catch (_error) {
      // silently handle
    }
  }, [generateRecommendations, calculatePerformanceScore, getMemoryStats]);

  /**
   * Manual refresh
   */
  const refresh = useCallback(() => {
    updateDashboard();
  }, [updateDashboard]);

  /**
   * Setup auto-refresh
   */
  useEffect(() => {
    if (!autoRefresh) return;

    // Initial update
    updateDashboard();

    // Setup interval
    const interval = setInterval(updateDashboard, updateInterval);

    return () => {
      clearInterval(interval);
    };
  }, [autoRefresh, updateInterval, updateDashboard]);

  return dashboard;
}

/**
 * Lightweight hook that only returns the performance score
 */
export function usePerformanceScore(): number {
  const [score, setScore] = useState(100);

  useEffect(() => {
    const updateScore = () => {
      const webVitals = webVitalsService.getSummary();
      const metrics = performanceMetricsService.getAggregatedMetrics('hour');
      const errors = errorTrackingService.getErrorStats('hour');

      let calculatedScore = 100;

      // Simplified scoring
      const webVitalsScore = webVitalsService.getPerformanceScore();
      calculatedScore -= (100 - webVitalsScore) * 0.5;

      if (metrics.avgAPILatency > 1000) {
        calculatedScore -= 10;
      }

      if (errors.total > 10) {
        calculatedScore -= 10;
      }

      setScore(Math.max(0, Math.min(100, calculatedScore)));
    };

    updateScore();
    const interval = setInterval(updateScore, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  return score;
}

export default usePerformanceDashboard;
