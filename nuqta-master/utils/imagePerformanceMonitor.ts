/**
 * Image Performance Monitor
 *
 * Comprehensive performance monitoring for image loading:
 * - Load time tracking
 * - Cache hit rate analysis
 * - Memory usage monitoring
 * - Network bandwidth estimation
 * - Performance recommendations
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Performance metric
 */
interface PerformanceMetric {
  imageUri: string;
  loadStartTime: number;
  loadEndTime: number;
  loadDuration: number;
  imageSize?: number;
  fromCache: boolean;
  quality: 'low' | 'medium' | 'high' | 'auto';
  networkType: 'wifi' | 'cellular' | 'offline' | 'unknown';
  success: boolean;
  errorMessage?: string;
  dimensions?: { width: number; height: number };
}

/**
 * Aggregated statistics
 */
interface AggregatedStats {
  totalImages: number;
  successfulLoads: number;
  failedLoads: number;
  cacheHitRate: number;
  avgLoadDuration: number;
  avgImageSize: number;
  totalBandwidth: number;
  performanceScore: number;
  recommendations: string[];
}

/**
 * Storage key for performance data
 */
const STORAGE_KEY = '@image_performance_metrics';
const MAX_STORED_METRICS = 500;

/**
 * Image Performance Monitor Class
 */
class ImagePerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private enabled: boolean = true;
  private initialized: boolean = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize monitor
   */
  private async initialize(): Promise<void> {
    try {
      // Load persisted metrics
      const storedData = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedData) {
        this.metrics = JSON.parse(storedData);
      }
      this.initialized = true;
    } catch (error) {
      this.initialized = true;
    }
  }

  /**
   * Record image load start
   */
  startLoad(imageUri: string): number {
    if (!this.enabled) return 0;
    return Date.now();
  }

  /**
   * Record image load completion
   */
  async endLoad(
    imageUri: string,
    startTime: number,
    options: {
      fromCache?: boolean;
      quality?: 'low' | 'medium' | 'high' | 'auto';
      networkType?: 'wifi' | 'cellular' | 'offline' | 'unknown';
      imageSize?: number;
      dimensions?: { width: number; height: number };
      error?: string;
    } = {}
  ): Promise<void> {
    if (!this.enabled || !startTime) return;

    const endTime = Date.now();
    const loadDuration = endTime - startTime;

    const metric: PerformanceMetric = {
      imageUri,
      loadStartTime: startTime,
      loadEndTime: endTime,
      loadDuration,
      fromCache: options.fromCache ?? false,
      quality: options.quality ?? 'high',
      networkType: options.networkType ?? 'unknown',
      imageSize: options.imageSize,
      dimensions: options.dimensions,
      success: !options.error,
      errorMessage: options.error,
    };

    // Add to metrics
    this.metrics.push(metric);

    // Trim if exceeds max
    if (this.metrics.length > MAX_STORED_METRICS) {
      this.metrics = this.metrics.slice(-MAX_STORED_METRICS);
    }

    // Persist metrics periodically (every 10 loads)
    if (this.metrics.length % 10 === 0) {
      await this.persistMetrics();
    }

    // Log slow loads
    if (loadDuration > 3000 && !options.fromCache) {
    }
  }

  /**
   * Persist metrics to storage
   */
  private async persistMetrics(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.metrics));
    } catch (_error) {
      // silently handle
    }
  }

  /**
   * Get aggregated statistics
   */
  getStats(timeWindow?: number): AggregatedStats {
    let metricsToAnalyze = this.metrics;

    // Filter by time window if provided
    if (timeWindow) {
      const cutoffTime = Date.now() - timeWindow;
      metricsToAnalyze = this.metrics.filter(m => m.loadEndTime >= cutoffTime);
    }

    if (metricsToAnalyze.length === 0) {
      return {
        totalImages: 0,
        successfulLoads: 0,
        failedLoads: 0,
        cacheHitRate: 0,
        avgLoadDuration: 0,
        avgImageSize: 0,
        totalBandwidth: 0,
        performanceScore: 0,
        recommendations: ['No data available yet'],
      };
    }

    // Calculate statistics
    const totalImages = metricsToAnalyze.length;
    const successfulLoads = metricsToAnalyze.filter(m => m.success).length;
    const failedLoads = totalImages - successfulLoads;
    const cachedLoads = metricsToAnalyze.filter(m => m.fromCache).length;
    const cacheHitRate = (cachedLoads / totalImages) * 100;

    const totalLoadDuration = metricsToAnalyze.reduce((sum, m) => sum + m.loadDuration, 0);
    const avgLoadDuration = totalLoadDuration / totalImages;

    const imagesWithSize = metricsToAnalyze.filter(m => m.imageSize);
    const totalImageSize = imagesWithSize.reduce((sum, m) => sum + (m.imageSize || 0), 0);
    const avgImageSize = imagesWithSize.length > 0 ? totalImageSize / imagesWithSize.length : 0;
    const totalBandwidth = totalImageSize;

    // Calculate performance score (0-100)
    const performanceScore = this.calculatePerformanceScore({
      avgLoadDuration,
      cacheHitRate,
      failureRate: (failedLoads / totalImages) * 100,
    });

    // Generate recommendations
    const recommendations = this.generateRecommendations({
      avgLoadDuration,
      cacheHitRate,
      failureRate: (failedLoads / totalImages) * 100,
      avgImageSize,
    });

    return {
      totalImages,
      successfulLoads,
      failedLoads,
      cacheHitRate: Math.round(cacheHitRate * 10) / 10,
      avgLoadDuration: Math.round(avgLoadDuration),
      avgImageSize: Math.round(avgImageSize),
      totalBandwidth,
      performanceScore,
      recommendations,
    };
  }

  /**
   * Calculate performance score
   */
  private calculatePerformanceScore(stats: {
    avgLoadDuration: number;
    cacheHitRate: number;
    failureRate: number;
  }): number {
    let score = 100;

    // Deduct points for slow load times
    if (stats.avgLoadDuration > 2000) {
      score -= 20;
    } else if (stats.avgLoadDuration > 1000) {
      score -= 10;
    } else if (stats.avgLoadDuration > 500) {
      score -= 5;
    }

    // Deduct points for low cache hit rate
    if (stats.cacheHitRate < 30) {
      score -= 20;
    } else if (stats.cacheHitRate < 50) {
      score -= 10;
    } else if (stats.cacheHitRate < 70) {
      score -= 5;
    }

    // Deduct points for failures
    if (stats.failureRate > 10) {
      score -= 20;
    } else if (stats.failureRate > 5) {
      score -= 10;
    } else if (stats.failureRate > 2) {
      score -= 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(stats: {
    avgLoadDuration: number;
    cacheHitRate: number;
    failureRate: number;
    avgImageSize: number;
  }): string[] {
    const recommendations: string[] = [];

    // Load duration recommendations
    if (stats.avgLoadDuration > 2000) {
      recommendations.push('Average load time is slow (>2s). Consider reducing image quality or implementing better preloading.');
    } else if (stats.avgLoadDuration > 1000) {
      recommendations.push('Average load time is acceptable but could be improved. Consider preloading critical images.');
    } else if (stats.avgLoadDuration < 300) {
      recommendations.push('Excellent load times! Current optimization strategy is working well.');
    }

    // Cache hit rate recommendations
    if (stats.cacheHitRate < 30) {
      recommendations.push('Low cache hit rate (<30%). Implement more aggressive caching or preloading.');
    } else if (stats.cacheHitRate < 50) {
      recommendations.push('Moderate cache hit rate. Consider increasing cache size or preloading frequently accessed images.');
    } else if (stats.cacheHitRate > 70) {
      recommendations.push('Excellent cache hit rate! Caching strategy is effective.');
    }

    // Failure rate recommendations
    if (stats.failureRate > 10) {
      recommendations.push('High failure rate (>10%). Check network connectivity and image URL validity.');
    } else if (stats.failureRate > 5) {
      recommendations.push('Moderate failure rate. Implement better error handling and fallback images.');
    } else if (stats.failureRate < 2) {
      recommendations.push('Low failure rate. Image loading is reliable.');
    }

    // Image size recommendations
    if (stats.avgImageSize > 500000) {
      recommendations.push('Large average image size (>500KB). Consider using lower quality settings or better compression.');
    } else if (stats.avgImageSize > 200000) {
      recommendations.push('Moderate image size. Consider optimizing for mobile networks.');
    } else if (stats.avgImageSize > 0) {
      recommendations.push('Good image size optimization. Keep up the current strategy.');
    }

    // Network-specific recommendations
    const cellularLoads = this.metrics.filter(m => m.networkType === 'cellular' && !m.fromCache);
    if (cellularLoads.length > 10) {
      const avgCellularDuration = cellularLoads.reduce((sum, m) => sum + m.loadDuration, 0) / cellularLoads.length;
      if (avgCellularDuration > 3000) {
        recommendations.push('Slow load times on cellular network. Consider reducing image quality on cellular.');
      }
    }

    return recommendations.length > 0 ? recommendations : ['Performance metrics look good!'];
  }

  /**
   * Get detailed breakdown by quality setting
   */
  getQualityBreakdown(): Record<string, { count: number; avgDuration: number }> {
    const breakdown: Record<string, { count: number; totalDuration: number }> = {
      low: { count: 0, totalDuration: 0 },
      medium: { count: 0, totalDuration: 0 },
      high: { count: 0, totalDuration: 0 },
      auto: { count: 0, totalDuration: 0 },
    };

    this.metrics.forEach(metric => {
      if (metric.quality) {
        breakdown[metric.quality].count++;
        breakdown[metric.quality].totalDuration += metric.loadDuration;
      }
    });

    return Object.entries(breakdown).reduce((result, [quality, data]) => {
      result[quality] = {
        count: data.count,
        avgDuration: data.count > 0 ? Math.round(data.totalDuration / data.count) : 0,
      };
      return result;
    }, {} as Record<string, { count: number; avgDuration: number }>);
  }

  /**
   * Get network type breakdown
   */
  getNetworkBreakdown(): Record<string, { count: number; avgDuration: number; failureRate: number }> {
    const breakdown: Record<string, { count: number; totalDuration: number; failures: number }> = {
      wifi: { count: 0, totalDuration: 0, failures: 0 },
      cellular: { count: 0, totalDuration: 0, failures: 0 },
      offline: { count: 0, totalDuration: 0, failures: 0 },
      unknown: { count: 0, totalDuration: 0, failures: 0 },
    };

    this.metrics.forEach(metric => {
      const network = metric.networkType || 'unknown';
      breakdown[network].count++;
      breakdown[network].totalDuration += metric.loadDuration;
      if (!metric.success) {
        breakdown[network].failures++;
      }
    });

    return Object.entries(breakdown).reduce((result, [network, data]) => {
      result[network] = {
        count: data.count,
        avgDuration: data.count > 0 ? Math.round(data.totalDuration / data.count) : 0,
        failureRate: data.count > 0 ? Math.round((data.failures / data.count) * 100 * 10) / 10 : 0,
      };
      return result;
    }, {} as Record<string, { count: number; avgDuration: number; failureRate: number }>);
  }

  /**
   * Clear all metrics
   */
  async clearMetrics(): Promise<void> {
    this.metrics = [];
    await AsyncStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Enable/disable monitoring
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
   * Export metrics as JSON
   */
  exportMetrics(): string {
    return JSON.stringify({
      metrics: this.metrics,
      stats: this.getStats(),
      qualityBreakdown: this.getQualityBreakdown(),
      networkBreakdown: this.getNetworkBreakdown(),
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }

  /**
   * Get performance report
   */
  getPerformanceReport(): string {
    const stats = this.getStats();
    const qualityBreakdown = this.getQualityBreakdown();
    const networkBreakdown = this.getNetworkBreakdown();

    return `
IMAGE PERFORMANCE REPORT
========================

Overall Statistics:
- Total Images: ${stats.totalImages}
- Successful Loads: ${stats.successfulLoads}
- Failed Loads: ${stats.failedLoads}
- Cache Hit Rate: ${stats.cacheHitRate}%
- Avg Load Duration: ${stats.avgLoadDuration}ms
- Avg Image Size: ${(stats.avgImageSize / 1024).toFixed(2)}KB
- Total Bandwidth: ${(stats.totalBandwidth / (1024 * 1024)).toFixed(2)}MB
- Performance Score: ${stats.performanceScore}/100

Quality Breakdown:
${Object.entries(qualityBreakdown)
  .map(([quality, data]) => `- ${quality}: ${data.count} images, ${data.avgDuration}ms avg`)
  .join('\n')}

Network Breakdown:
${Object.entries(networkBreakdown)
  .map(([network, data]) =>
    `- ${network}: ${data.count} images, ${data.avgDuration}ms avg, ${data.failureRate}% failure rate`
  )
  .join('\n')}

Recommendations:
${stats.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}
    `.trim();
  }
}

// Export singleton instance
export default new ImagePerformanceMonitor();
