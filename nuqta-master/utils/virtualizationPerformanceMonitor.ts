/**
 * Virtualization Performance Monitor
 *
 * Tracks and monitors app performance metrics specifically for virtualization
 * Features:
 * - FPS tracking
 * - Render performance
 * - Scroll performance
 * - Memory monitoring
 * - Time to interactive
 * - Performance reports
 */

import { Platform, InteractionManager } from 'react-native';
import memoryManager from './memoryManager';

interface RenderMetric {
  componentId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

interface ScrollMetric {
  timestamp: number;
  position: number;
  velocity?: number;
  fps?: number;
}

interface PerformanceReport {
  avgFPS: number;
  minFPS: number;
  maxFPS: number;
  memoryUsage: number;
  slowRenders: Array<{
    componentId: string;
    duration: number;
    timestamp: number;
  }>;
  scrollJank: number; // Percentage of frames dropped
  recommendations: string[];
  timeToInteractive: number;
  totalRenders: number;
  avgRenderTime: number;
}

/**
 * Virtualization Performance Monitor Class
 */
class VirtualizationPerformanceMonitor {
  private fpsHistory: number[] = [];
  private renderMetrics = new Map<string, RenderMetric>();
  private scrollMetrics: ScrollMetric[] = [];
  private slowRenderThreshold = 16.67; // 60fps = 16.67ms per frame
  private maxScrollMetrics = 100;
  private maxFPSHistory = 60;
  private appStartTime = Date.now();
  private interactiveTime?: number;
  private isMonitoring = false;
  private fpsInterval?: NodeJS.Timeout;
  private lastFrameTime = Date.now();
  private frameCount = 0;

  constructor() {
    this.init();
  }

  /**
   * Initialize performance monitoring
   */
  private init(): void {
    // Wait for app to be interactive
    InteractionManager.runAfterInteractions(() => {
      this.interactiveTime = Date.now();
    });
  }

  /**
   * Start monitoring
   */
  public startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;

    // Start FPS tracking
    this.startFPSTracking();
  }

  /**
   * Stop monitoring
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;

    // Stop FPS tracking
    this.stopFPSTracking();
  }

  /**
   * Start FPS tracking
   */
  private startFPSTracking(): void {
    if (Platform.OS === 'web') {
      // Use requestAnimationFrame for web
      this.trackFPSWeb();
    } else {
      // Use interval for native (less accurate but works)
      this.trackFPSNative();
    }
  }

  /**
   * Stop FPS tracking
   */
  private stopFPSTracking(): void {
    if (this.fpsInterval) {
      clearInterval(this.fpsInterval);
      this.fpsInterval = undefined;
    }
  }

  /**
   * Track FPS for web using requestAnimationFrame
   */
  private trackFPSWeb(): void {
    let lastTime = performance.now();
    let frames = 0;

    const measureFPS = () => {
      if (!this.isMonitoring) return;

      const now = performance.now();
      frames++;

      if (now >= lastTime + 1000) {
        const fps = Math.round((frames * 1000) / (now - lastTime));
        this.recordFPS(fps);

        frames = 0;
        lastTime = now;
      }

      requestAnimationFrame(measureFPS);
    };

    requestAnimationFrame(measureFPS);
  }

  /**
   * Track FPS for native using interval
   */
  private trackFPSNative(): void {
    let frameCount = 0;
    let lastTime = Date.now();

    this.fpsInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastTime;

      if (elapsed >= 1000) {
        const fps = Math.round((frameCount * 1000) / elapsed);
        this.recordFPS(fps);

        frameCount = 0;
        lastTime = now;
      }

      frameCount++;
    }, 16); // ~60fps
  }

  /**
   * Record FPS measurement
   */
  private recordFPS(fps: number): void {
    this.fpsHistory.push(fps);

    // Keep only recent history
    if (this.fpsHistory.length > this.maxFPSHistory) {
      this.fpsHistory.shift();
    }

    // Warn on low FPS
    if (fps < 30) {
    }
  }

  /**
   * Measure FPS manually
   */
  public measureFPS(): number {
    if (this.fpsHistory.length === 0) return 60; // Default to 60 if no data

    const recentFPS = this.fpsHistory.slice(-10); // Last 10 measurements
    return Math.round(recentFPS.reduce((sum, fps) => sum + fps, 0) / recentFPS.length);
  }

  /**
   * Start render tracking for a component
   */
  public startRender(componentId: string): void {
    // Cap render metrics to prevent unbounded growth
    if (this.renderMetrics.size > 200) {
      const firstKey = this.renderMetrics.keys().next().value;
      if (firstKey !== undefined) this.renderMetrics.delete(firstKey);
    }
    this.renderMetrics.set(componentId, {
      componentId,
      startTime: Date.now(),
    });
  }

  /**
   * End render tracking for a component
   */
  public endRender(componentId: string): void {
    const metric = this.renderMetrics.get(componentId);

    if (metric) {
      const endTime = Date.now();
      const duration = endTime - metric.startTime;

      metric.endTime = endTime;
      metric.duration = duration;

      this.renderMetrics.set(componentId, metric);

      // Warn on slow renders
      if (duration > this.slowRenderThreshold) {
      }
    }
  }

  /**
   * Track scroll performance
   */
  public trackScroll(scrollPosition: number, velocity?: number): void {
    const now = Date.now();
    const timeSinceLastFrame = now - this.lastFrameTime;

    // Calculate FPS from frame time
    const fps = timeSinceLastFrame > 0 ? 1000 / timeSinceLastFrame : 60;

    const metric: ScrollMetric = {
      timestamp: now,
      position: scrollPosition,
      velocity,
      fps,
    };

    this.scrollMetrics.push(metric);

    // Keep only recent metrics
    if (this.scrollMetrics.length > this.maxScrollMetrics) {
      this.scrollMetrics.shift();
    }

    // Detect scroll jank
    if (fps < 45) {
    }

    this.lastFrameTime = now;
    this.frameCount++;
  }

  /**
   * Get time to interactive
   */
  public getTimeToInteractive(): number {
    if (!this.interactiveTime) return 0;
    return this.interactiveTime - this.appStartTime;
  }

  /**
   * Calculate scroll jank percentage
   */
  private calculateScrollJank(): number {
    if (this.scrollMetrics.length === 0) return 0;

    const droppedFrames = this.scrollMetrics.filter(
      m => m.fps && m.fps < 55 // Below 55fps is considered jank
    ).length;

    return (droppedFrames / this.scrollMetrics.length) * 100;
  }

  /**
   * Get slow renders
   */
  private getSlowRenders(): Array<{
    componentId: string;
    duration: number;
    timestamp: number;
  }> {
    const slowRenders: Array<{
      componentId: string;
      duration: number;
      timestamp: number;
    }> = [];

    for (const [componentId, metric] of this.renderMetrics.entries()) {
      if (metric.duration && metric.duration > this.slowRenderThreshold) {
        slowRenders.push({
          componentId,
          duration: metric.duration,
          timestamp: metric.startTime,
        });
      }
    }

    // Sort by duration (slowest first)
    return slowRenders.sort((a, b) => b.duration - a.duration);
  }

  /**
   * Generate recommendations based on metrics
   */
  private generateRecommendations(report: Partial<PerformanceReport>): string[] {
    const recommendations: string[] = [];

    // FPS recommendations
    if (report.avgFPS && report.avgFPS < 50) {
      recommendations.push(
        `Low average FPS (${report.avgFPS.toFixed(1)}). Consider reducing component complexity or implementing virtualization.`
      );
    }

    // Memory recommendations
    if (report.memoryUsage && report.memoryUsage > 100) {
      recommendations.push(
        `High memory usage (${report.memoryUsage.toFixed(1)}MB). Consider implementing lazy loading and memory cleanup.`
      );
    }

    // Render recommendations
    if (report.slowRenders && report.slowRenders.length > 10) {
      recommendations.push(
        `${report.slowRenders.length} slow renders detected. Consider memoization and React.memo optimization.`
      );
    }

    // Scroll recommendations
    if (report.scrollJank && report.scrollJank > 10) {
      recommendations.push(
        `High scroll jank (${report.scrollJank.toFixed(1)}%). Implement FlatList virtualization and optimize scroll handlers.`
      );
    }

    // Time to interactive
    if (report.timeToInteractive && report.timeToInteractive > 3000) {
      recommendations.push(
        `Slow time to interactive (${(report.timeToInteractive / 1000).toFixed(1)}s). Consider code splitting and lazy loading.`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance is good! All metrics are within acceptable ranges.');
    }

    return recommendations;
  }

  /**
   * Get performance report
   */
  public getReport(): PerformanceReport {
    const avgFPS =
      this.fpsHistory.length > 0
        ? this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length
        : 60;

    const minFPS = this.fpsHistory.length > 0 ? Math.min(...this.fpsHistory) : 60;
    const maxFPS = this.fpsHistory.length > 0 ? Math.max(...this.fpsHistory) : 60;

    const memoryStats = memoryManager.getMemoryStats();
    const slowRenders = this.getSlowRenders();
    const scrollJank = this.calculateScrollJank();

    const renderDurations = Array.from(this.renderMetrics.values())
      .filter(m => m.duration !== undefined)
      .map(m => m.duration!);

    const avgRenderTime =
      renderDurations.length > 0
        ? renderDurations.reduce((sum, d) => sum + d, 0) / renderDurations.length
        : 0;

    const report: PerformanceReport = {
      avgFPS: Math.round(avgFPS),
      minFPS,
      maxFPS,
      memoryUsage: memoryStats.estimatedMemoryUsage,
      slowRenders: slowRenders.slice(0, 10), // Top 10 slowest
      scrollJank: Math.round(scrollJank * 100) / 100,
      recommendations: [],
      timeToInteractive: this.getTimeToInteractive(),
      totalRenders: this.renderMetrics.size,
      avgRenderTime: Math.round(avgRenderTime * 100) / 100,
    };

    report.recommendations = this.generateRecommendations(report);

    return report;
  }

  /**
   * Reset all metrics
   */
  public reset(): void {
    this.fpsHistory = [];
    this.renderMetrics.clear();
    this.scrollMetrics = [];
    this.frameCount = 0;
    this.lastFrameTime = Date.now();

  }

  /**
   * Log performance report to console
   */
  public logReport(): void {
    // No-op: console output removed for production
  }
}

// Export singleton instance
const virtualizationPerformanceMonitor = new VirtualizationPerformanceMonitor();
export default virtualizationPerformanceMonitor;

// Export types
export type { PerformanceReport, RenderMetric, ScrollMetric };
