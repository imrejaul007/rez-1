// Wallet Performance Monitor
// Monitors and optimizes wallet system performance

import AsyncStorage from '@react-native-async-storage/async-storage';

interface PerformanceMetrics {
  apiResponseTimes: number[];
  memoryUsage: number[];
  renderTimes: number[];
  errorCount: number;
  lastOptimization: string;
  optimizationCount: number;
}

interface PerformanceThresholds {
  maxApiResponseTime: number; // ms
  maxMemoryUsage: number; // MB
  maxRenderTime: number; // ms
  maxErrorRate: number; // percentage
}

class WalletPerformanceMonitor {
  private metrics: PerformanceMetrics = {
    apiResponseTimes: [],
    memoryUsage: [],
    renderTimes: [],
    errorCount: 0,
    lastOptimization: '',
    optimizationCount: 0
  };

  private thresholds: PerformanceThresholds = {
    maxApiResponseTime: 2000, // 2 seconds
    maxMemoryUsage: 100, // 100 MB
    maxRenderTime: 100, // 100 ms
    maxErrorRate: 5 // 5%
  };

  private readonly STORAGE_KEY = 'wallet_performance_metrics';
  private readonly MAX_METRICS_COUNT = 100;

  constructor() {
    this.loadMetrics();
  }

  // Load metrics from storage
  private async loadMetrics(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.metrics = { ...this.metrics, ...JSON.parse(stored) };
      }
    } catch (error) {
      // Failed to load performance metrics - using defaults
    }
  }

  // Save metrics to storage
  private async saveMetrics(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.metrics));
    } catch (error) {
      // Failed to save performance metrics - will retry next save
    }
  }

  // Record API response time
  recordApiResponseTime(responseTime: number): void {
    this.metrics.apiResponseTimes.push(responseTime);
    
    // Keep only the last N response times
    if (this.metrics.apiResponseTimes.length > this.MAX_METRICS_COUNT) {
      this.metrics.apiResponseTimes = this.metrics.apiResponseTimes.slice(-this.MAX_METRICS_COUNT);
    }

    this.saveMetrics();
    this.checkPerformanceThresholds();
  }

  // Record memory usage
  recordMemoryUsage(memoryUsage: number): void {
    this.metrics.memoryUsage.push(memoryUsage);
    
    // Keep only the last N memory readings
    if (this.metrics.memoryUsage.length > this.MAX_METRICS_COUNT) {
      this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-this.MAX_METRICS_COUNT);
    }

    this.saveMetrics();
    this.checkPerformanceThresholds();
  }

  // Record render time
  recordRenderTime(renderTime: number): void {
    this.metrics.renderTimes.push(renderTime);
    
    // Keep only the last N render times
    if (this.metrics.renderTimes.length > this.MAX_METRICS_COUNT) {
      this.metrics.renderTimes = this.metrics.renderTimes.slice(-this.MAX_METRICS_COUNT);
    }

    this.saveMetrics();
    this.checkPerformanceThresholds();
  }

  // Record error
  recordError(): void {
    this.metrics.errorCount++;
    this.saveMetrics();
    this.checkPerformanceThresholds();
  }

  // Check if performance thresholds are exceeded
  private checkPerformanceThresholds(): void {
    const issues: string[] = [];

    // Check API response time
    const avgApiResponseTime = this.getAverageApiResponseTime();
    if (avgApiResponseTime > this.thresholds.maxApiResponseTime) {
      issues.push(`API response time (${avgApiResponseTime}ms) exceeds threshold (${this.thresholds.maxApiResponseTime}ms)`);
    }

    // Check memory usage
    const avgMemoryUsage = this.getAverageMemoryUsage();
    if (avgMemoryUsage > this.thresholds.maxMemoryUsage) {
      issues.push(`Memory usage (${avgMemoryUsage}MB) exceeds threshold (${this.thresholds.maxMemoryUsage}MB)`);
    }

    // Check render time
    const avgRenderTime = this.getAverageRenderTime();
    if (avgRenderTime > this.thresholds.maxRenderTime) {
      issues.push(`Render time (${avgRenderTime}ms) exceeds threshold (${this.thresholds.maxRenderTime}ms)`);
    }

    // Check error rate
    const errorRate = this.getErrorRate();
    if (errorRate > this.thresholds.maxErrorRate) {
      issues.push(`Error rate (${errorRate}%) exceeds threshold (${this.thresholds.maxErrorRate}%)`);
    }

    // Trigger optimization if issues found
    if (issues.length > 0) {
      this.triggerOptimization(issues);
    }
  }

  // Trigger performance optimization
  private triggerOptimization(issues: string[]): void {
    // Performance issues detected - applying optimizations
    
    this.metrics.lastOptimization = new Date().toISOString();
    this.metrics.optimizationCount++;
    
    // Apply optimizations
    this.applyOptimizations(issues);
    
    this.saveMetrics();
  }

  // Apply performance optimizations
  private applyOptimizations(issues: string[]): void {
    issues.forEach(issue => {
      if (issue.includes('API response time')) {
        this.optimizeApiCalls();
      } else if (issue.includes('Memory usage')) {
        this.optimizeMemoryUsage();
      } else if (issue.includes('Render time')) {
        this.optimizeRendering();
      } else if (issue.includes('Error rate')) {
        this.optimizeErrorHandling();
      }
    });
  }

  // Optimize API calls
  private optimizeApiCalls(): void {
    // In a real app, you would:
    // - Implement request caching
    // - Add request debouncing
    // - Optimize query parameters
    // - Implement request batching
  }

  // Optimize memory usage
  private optimizeMemoryUsage(): void {
    // In a real app, you would:
    // - Clear unused caches
    // - Optimize image loading
    // - Implement lazy loading
    // - Clean up event listeners
  }

  // Optimize rendering
  private optimizeRendering(): void {
    // In a real app, you would:
    // - Implement React.memo
    // - Optimize re-renders
    // - Use useMemo and useCallback
    // - Implement virtual scrolling
  }

  // Optimize error handling
  private optimizeErrorHandling(): void {
    // In a real app, you would:
    // - Implement retry mechanisms
    // - Add circuit breakers
    // - Improve error boundaries
    // - Add fallback UI
  }

  // Get average API response time
  getAverageApiResponseTime(): number {
    if (this.metrics.apiResponseTimes.length === 0) return 0;
    return this.metrics.apiResponseTimes.reduce((sum, time) => sum + time, 0) / this.metrics.apiResponseTimes.length;
  }

  // Get average memory usage
  getAverageMemoryUsage(): number {
    if (this.metrics.memoryUsage.length === 0) return 0;
    return this.metrics.memoryUsage.reduce((sum, usage) => sum + usage, 0) / this.metrics.memoryUsage.length;
  }

  // Get average render time
  getAverageRenderTime(): number {
    if (this.metrics.renderTimes.length === 0) return 0;
    return this.metrics.renderTimes.reduce((sum, time) => sum + time, 0) / this.metrics.renderTimes.length;
  }

  // Get error rate
  getErrorRate(): number {
    const totalOperations = this.metrics.apiResponseTimes.length + this.metrics.renderTimes.length;
    if (totalOperations === 0) return 0;
    return (this.metrics.errorCount / totalOperations) * 100;
  }

  // Get performance report
  getPerformanceReport(): {
    metrics: PerformanceMetrics;
    averages: {
      apiResponseTime: number;
      memoryUsage: number;
      renderTime: number;
      errorRate: number;
    };
    thresholds: PerformanceThresholds;
    status: 'good' | 'warning' | 'critical';
  } {
    const averages = {
      apiResponseTime: this.getAverageApiResponseTime(),
      memoryUsage: this.getAverageMemoryUsage(),
      renderTime: this.getAverageRenderTime(),
      errorRate: this.getErrorRate()
    };

    let status: 'good' | 'warning' | 'critical' = 'good';
    
    if (averages.apiResponseTime > this.thresholds.maxApiResponseTime * 0.8 ||
        averages.memoryUsage > this.thresholds.maxMemoryUsage * 0.8 ||
        averages.renderTime > this.thresholds.maxRenderTime * 0.8 ||
        averages.errorRate > this.thresholds.maxErrorRate * 0.8) {
      status = 'warning';
    }
    
    if (averages.apiResponseTime > this.thresholds.maxApiResponseTime ||
        averages.memoryUsage > this.thresholds.maxMemoryUsage ||
        averages.renderTime > this.thresholds.maxRenderTime ||
        averages.errorRate > this.thresholds.maxErrorRate) {
      status = 'critical';
    }

    return {
      metrics: this.metrics,
      averages,
      thresholds: this.thresholds,
      status
    };
  }

  // Clear all metrics
  async clearMetrics(): Promise<void> {
    this.metrics = {
      apiResponseTimes: [],
      memoryUsage: [],
      renderTimes: [],
      errorCount: 0,
      lastOptimization: '',
      optimizationCount: 0
    };
    await this.saveMetrics();
  }

  // Update thresholds
  updateThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }
}

// Export singleton instance
export const walletPerformanceMonitor = new WalletPerformanceMonitor();
export default walletPerformanceMonitor;
