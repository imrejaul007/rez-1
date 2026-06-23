// @ts-nocheck
/**
 * usePerformance Hook
 *
 * Monitors and tracks performance metrics for components and operations
 *
 * Features:
 * - Component render time tracking
 * - API call performance monitoring
 * - Memory usage tracking
 * - FPS (Frames Per Second) monitoring
 * - Performance marks and measures
 */

import { useEffect, useRef, useCallback, useState } from 'react';

const devLog = {
  log: __DEV__ ? console.log.bind(console) : () => {},
  warn: __DEV__ ? console.warn.bind(console) : () => {},
  error: __DEV__ ? console.error.bind(console) : () => {},
};

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

interface PerformanceMetrics {
  renderCount: number;
  averageRenderTime: number;
  lastRenderTime: number;
  mountTime: number;
  totalRenderTime: number;
}

interface UsePerformanceOptions {
  componentName?: string;
  enableLogging?: boolean;
  trackRenders?: boolean;
  trackMemory?: boolean;
}

interface UsePerformanceReturn {
  metrics: PerformanceMetrics;
  startMeasure: (label: string) => void;
  endMeasure: (label: string) => number;
  trackOperation: <T>(label: string, operation: () => Promise<T>) => Promise<T>;
  logMetrics: () => void;
  resetMetrics: () => void;
}

export const usePerformance = (options: UsePerformanceOptions = {}): UsePerformanceReturn => {
  const {
    componentName = 'Component',
    enableLogging = __DEV__,
    trackRenders = true,
    trackMemory = false,
  } = options;

  const mountTimeRef = useRef<number>(Date.now());
  const renderCountRef = useRef<number>(0);
  const renderTimesRef = useRef<number[]>([]);
  const lastRenderTimeRef = useRef<number>(0);
  const measuresRef = useRef<Map<string, number>>(new Map());

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderCount: 0,
    averageRenderTime: 0,
    lastRenderTime: 0,
    mountTime: 0,
    totalRenderTime: 0,
  });

  /**
   * Track component renders
   */
  useEffect(() => {
    if (!trackRenders) return;

    const renderStart = getHighResTime();

    return () => {
      const renderEnd = getHighResTime();
      const renderTime = renderEnd - renderStart;

      renderCountRef.current++;
      renderTimesRef.current.push(renderTime);
      lastRenderTimeRef.current = renderTime;

      // Keep only last 100 render times
      if (renderTimesRef.current.length > 100) {
        renderTimesRef.current.shift();
      }

      const totalRenderTime = renderTimesRef.current.reduce((sum, time) => sum + time, 0);
      const averageRenderTime = totalRenderTime / renderTimesRef.current.length;

      setMetrics({
        renderCount: renderCountRef.current,
        averageRenderTime,
        lastRenderTime: renderTime,
        mountTime: Date.now() - mountTimeRef.current,
        totalRenderTime,
      });

      if (enableLogging && renderTime > 16) {
        // Log slow renders (> 16ms = < 60fps)
        devLog.warn(
          `⚠️ [Performance] Slow render in ${componentName}:`,
          `${renderTime.toFixed(2)}ms`
        );
      }
    };
  });

  /**
   * Start a performance measure
   */
  const startMeasure = useCallback(
    (label: string) => {
      const timestamp = getHighResTime();
      measuresRef.current.set(label, timestamp);

      if (enableLogging) {
        devLog.log(`⏱️ [Performance] Started: ${componentName} - ${label}`);
      }
    },
    [componentName, enableLogging]
  );

  /**
   * End a performance measure and return duration
   */
  const endMeasure = useCallback(
    (label: string): number => {
      const startTime = measuresRef.current.get(label);

      if (!startTime) {
        devLog.warn(`⚠️ [Performance] No start time found for: ${label}`);
        return 0;
      }

      const endTime = getHighResTime();
      const duration = endTime - startTime;

      measuresRef.current.delete(label);

      if (enableLogging) {
        devLog.log(
          `✅ [Performance] Completed: ${componentName} - ${label}:`,
          `${duration.toFixed(2)}ms`
        );
      }

      return duration;
    },
    [componentName, enableLogging]
  );

  /**
   * Track an async operation's performance
   */
  const trackOperation = useCallback(
    async <T,>(label: string, operation: () => Promise<T>): Promise<T> => {
      startMeasure(label);

      try {
        const result = await operation();
        const duration = endMeasure(label);

        // Track in analytics
        if (typeof analyticsService !== 'undefined') {
          (window as any).analyticsService?.trackPerformance(
            `${componentName}_${label}`,
            duration
          );
        }

        return result;
      } catch (error) {
        endMeasure(label);
        throw error;
      }
    },
    [componentName, startMeasure, endMeasure]
  );

  /**
   * Log current metrics
   */
  const logMetrics = useCallback(() => {
    devLog.log(`📊 [Performance] ${componentName} Metrics`);
    devLog.log('Render count:', metrics.renderCount);
    devLog.log('Average render time:', `${metrics.averageRenderTime.toFixed(2)}ms`);
    devLog.log('Last render time:', `${metrics.lastRenderTime.toFixed(2)}ms`);
    devLog.log('Total render time:', `${metrics.totalRenderTime.toFixed(2)}ms`);
    devLog.log('Mount time:', `${metrics.mountTime}ms`);

    if (trackMemory && performance.memory) {
      devLog.log(
        'Memory used:',
        `${(performance.memory.usedJSHeapSize / 1048576).toFixed(2)}MB`
      );
      devLog.log(
        'Memory limit:',
        `${(performance.memory.jsHeapSizeLimit / 1048576).toFixed(2)}MB`
      );
    }

    // group end
  }, [componentName, metrics, trackMemory]);

  /**
   * Reset metrics
   */
  const resetMetrics = useCallback(() => {
    renderCountRef.current = 0;
    renderTimesRef.current = [];
    lastRenderTimeRef.current = 0;
    mountTimeRef.current = Date.now();
    measuresRef.current.clear();

    setMetrics({
      renderCount: 0,
      averageRenderTime: 0,
      lastRenderTime: 0,
      mountTime: 0,
      totalRenderTime: 0,
    });

    devLog.log(`🔄 [Performance] ${componentName} metrics reset`);
  }, [componentName]);

  /**
   * Log metrics on unmount if enabled
   */
  useEffect(() => {
    return () => {
      if (enableLogging && renderCountRef.current > 0) {
        devLog.log(`📊 [Performance] ${componentName} Final Metrics`);
        devLog.log('Total renders:', renderCountRef.current);
        devLog.log(
          'Average render time:',
          `${(renderTimesRef.current.reduce((sum, time) => sum + time, 0) / renderTimesRef.current.length).toFixed(2)}ms`
        );
        devLog.log('Total lifetime:', `${Date.now() - mountTimeRef.current}ms`);
        // group end
      }
    };
  }, [componentName, enableLogging]);

  return {
    metrics,
    startMeasure,
    endMeasure,
    trackOperation,
    logMetrics,
    resetMetrics,
  };
};

/**
 * Higher-order component to add performance tracking
 */
export function withPerformance<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  return function PerformanceTrackedComponent(props: P) {
    const { logMetrics } = usePerformance({
      componentName: componentName || Component.displayName || Component.name,
      enableLogging: __DEV__,
    });

    // Store logMetrics in ref to avoid interval recreation
    const logMetricsRef = useRef(logMetrics);
    useEffect(() => {
      logMetricsRef.current = logMetrics;
    }, [logMetrics]);

    useEffect(() => {
      // Log metrics every 10 seconds in dev mode
      if (__DEV__) {
        const interval = setInterval(() => {
          logMetricsRef.current();
        }, 10000);
        return () => clearInterval(interval);
      }
    }, []); // Empty deps - interval is stable

    return <Component {...props} />;
  };
}

export default usePerformance;
