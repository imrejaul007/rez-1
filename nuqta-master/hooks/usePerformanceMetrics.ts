/**
 * Performance Metrics Hook
 * React hook for tracking component performance metrics
 */

import { useEffect, useRef, useCallback } from 'react';
import { performanceMonitor, trackRender, trackInteraction } from '@/utils/performanceMonitor';

// ============================================================================
// Types
// ============================================================================

export interface UsePerformanceMetricsOptions {
  componentName: string;
  trackMount?: boolean;
  trackRenders?: boolean;
  trackInteractions?: boolean;
  logSlowRenders?: boolean;
  slowRenderThreshold?: number; // in ms
}

export interface UsePerformanceMetricsResult {
  trackInteraction: (name: string, metadata?: Record<string, any>) => () => void;
  trackCustomMetric: (name: string, metadata?: Record<string, any>) => () => void;
  getRenderCount: () => number;
  getAverageRenderTime: () => number;
  reset: () => void;
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * Hook for tracking component performance
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { trackInteraction } = usePerformanceMetrics({
 *     componentName: 'MyComponent',
 *     trackRenders: true,
 *   });
 *
 *   const handleClick = () => {
 *     const endTracking = trackInteraction('button_click');
 *     // ... do work
 *     endTracking();
 *   };
 * }
 * ```
 */
export function usePerformanceMetrics(
  options: UsePerformanceMetricsOptions
): UsePerformanceMetricsResult {
  const {
    componentName,
    trackMount = true,
    trackRenders = false,
    trackInteractions = false,
    logSlowRenders = true,
    slowRenderThreshold = 16, // 60fps = 16ms per frame
  } = options;

  const renderCount = useRef(0);
  const renderTimes = useRef<number[]>([]);
  const mountTime = useRef<number>(0);
  const isMounted = useRef(false);

  // Track component mount
  useEffect(() => {
    if (!performanceMonitor.isEnabled()) return;

    isMounted.current = true;
    const startTime = performance.now();
    mountTime.current = startTime;

    if (trackMount) {
      performanceMonitor.start(`mount:${componentName}`, 'render');
    }

    return () => {
      if (trackMount) {
        performanceMonitor.end(`mount:${componentName}`, {
          renderCount: renderCount.current,
        });
      }

      isMounted.current = false;

      // Log final stats on unmount
      if (__DEV__ && renderCount.current > 0) {
        const avgRenderTime = getAverageRenderTime();
        console.log(
          `[Performance] ${componentName} stats:`,
          `\n  Total renders: ${renderCount.current}`,
          `\n  Avg render time: ${avgRenderTime.toFixed(2)}ms`,
          `\n  Lifetime: ${(performance.now() - mountTime.current).toFixed(2)}ms`
        );
      }
    };
  }, [componentName, trackMount]);

  // Track renders
  useEffect(() => {
    if (!performanceMonitor.isEnabled() || !trackRenders) return;

    const renderStartTime = performance.now();
    renderCount.current++;

    // Measure render time in next tick
    requestAnimationFrame(() => {
      if (!isMounted.current) return;

      const renderTime = performance.now() - renderStartTime;
      renderTimes.current.push(renderTime);

      // Keep only last 100 render times
      if (renderTimes.current.length > 100) {
        renderTimes.current.shift();
      }

      // Log slow renders
      if (logSlowRenders && renderTime > slowRenderThreshold) {
      }

      // Track every 10th render
      if (renderCount.current % 10 === 0) {
        performanceMonitor.mark(`render:${componentName}:${renderCount.current}`, {
          renderTime,
          renderCount: renderCount.current,
        });
      }
    });
  });

  /**
   * Track user interaction
   */
  const trackInteractionCallback = useCallback(
    (name: string, metadata?: Record<string, any>): (() => void) => {
      if (!performanceMonitor.isEnabled()) {
        return () => {};
      }

      const fullName = `${componentName}:${name}`;
      return trackInteraction(fullName, metadata);
    },
    [componentName]
  );

  /**
   * Track custom metric
   */
  const trackCustomMetric = useCallback(
    (name: string, metadata?: Record<string, any>): (() => void) => {
      if (!performanceMonitor.isEnabled()) {
        return () => {};
      }

      const fullName = `${componentName}:${name}`;
      performanceMonitor.start(fullName, 'custom', metadata);

      return () => {
        performanceMonitor.end(fullName);
      };
    },
    [componentName]
  );

  /**
   * Get total render count
   */
  const getRenderCount = useCallback((): number => {
    return renderCount.current;
  }, []);

  /**
   * Get average render time
   */
  const getAverageRenderTime = useCallback((): number => {
    if (renderTimes.current.length === 0) return 0;

    const total = renderTimes.current.reduce((sum, time) => sum + time, 0);
    return total / renderTimes.current.length;
  }, []);

  /**
   * Reset metrics
   */
  const reset = useCallback((): void => {
    renderCount.current = 0;
    renderTimes.current = [];
  }, []);

  return {
    trackInteraction: trackInteractionCallback,
    trackCustomMetric,
    getRenderCount,
    getAverageRenderTime,
    reset,
  };
}

// ============================================================================
// Screen Performance Hook
// ============================================================================

export interface UseScreenPerformanceOptions {
  screenName: string;
  trackScreenLoad?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Hook for tracking screen/page performance
 *
 * @example
 * ```tsx
 * function ProductScreen() {
 *   useScreenPerformance({
 *     screenName: 'ProductScreen',
 *     metadata: { productId: route.params.id },
 *   });
 * }
 * ```
 */
export function useScreenPerformance(options: UseScreenPerformanceOptions): void {
  const { screenName, trackScreenLoad = true, metadata } = options;

  useEffect(() => {
    if (!performanceMonitor.isEnabled() || !trackScreenLoad) return;

    const startTime = performance.now();
    performanceMonitor.start(`screen:${screenName}`, 'screen', metadata);


    return () => {
      const duration = performance.now() - startTime;
      performanceMonitor.end(`screen:${screenName}`, {
        ...metadata,
        totalTime: duration,
      });

    };
  }, [screenName, trackScreenLoad]);
}

// ============================================================================
// API Call Performance Hook
// ============================================================================

export interface UseApiPerformanceResult {
  trackApiCall: <T>(
    endpoint: string,
    method: string,
    apiCall: () => Promise<T>
  ) => Promise<T>;
}

/**
 * Hook for tracking API call performance
 *
 * @example
 * ```tsx
 * function useProducts() {
 *   const { trackApiCall } = useApiPerformance();
 *
 *   const fetchProducts = async () => {
 *     return trackApiCall('/products', 'GET', () =>
 *       productsApi.getProducts()
 *     );
 *   };
 * }
 * ```
 */
export function useApiPerformance(): UseApiPerformanceResult {
  const trackApiCallCallback = useCallback(
    async <T,>(endpoint: string, method: string, apiCall: () => Promise<T>): Promise<T> => {
      if (!performanceMonitor.isEnabled()) {
        return apiCall();
      }

      const name = `api:${method}:${endpoint}`;
      performanceMonitor.start(name, 'api', { endpoint, method });

      try {
        const result = await apiCall();
        performanceMonitor.end(name, { success: true });
        return result;
      } catch (error) {
        performanceMonitor.end(name, { success: false, error: true });
        throw error;
      }
    },
    []
  );

  return {
    trackApiCall: trackApiCallCallback,
  };
}

// ============================================================================
// List Performance Hook
// ============================================================================

export interface UseListPerformanceOptions {
  listName: string;
  itemCount: number;
  trackScrollPerformance?: boolean;
}

export interface UseListPerformanceResult {
  onScrollBegin: () => void;
  onScrollEnd: () => void;
  onItemRender: (index: number) => void;
  getStats: () => {
    totalScrolls: number;
    averageScrollDuration: number;
    renderedItems: number;
  };
}

/**
 * Hook for tracking FlatList/ScrollView performance
 *
 * @example
 * ```tsx
 * function ProductList({ products }) {
 *   const { onScrollBegin, onScrollEnd, onItemRender } = useListPerformance({
 *     listName: 'ProductList',
 *     itemCount: products.length,
 *   });
 *
 *   return (
 *     <FlatList
 *       data={products}
 *       onScrollBeginDrag={onScrollBegin}
 *       onScrollEndDrag={onScrollEnd}
 *       renderItem={({ item, index }) => {
 *         onItemRender(index);
 *         return <ProductCard product={item} />;
 *       }}
 *     />
 *   );
 * }
 * ```
 */
export function useListPerformance(
  options: UseListPerformanceOptions
): UseListPerformanceResult {
  const { listName, itemCount, trackScrollPerformance = true } = options;

  const scrollStartTime = useRef<number>(0);
  const scrollCount = useRef<number>(0);
  const scrollDurations = useRef<number[]>([]);
  const renderedItems = useRef<Set<number>>(new Set());

  const onScrollBegin = useCallback(() => {
    if (!performanceMonitor.isEnabled() || !trackScrollPerformance) return;

    scrollStartTime.current = performance.now();
    scrollCount.current++;
  }, [trackScrollPerformance]);

  const onScrollEnd = useCallback(() => {
    if (!performanceMonitor.isEnabled() || !trackScrollPerformance) return;
    if (scrollStartTime.current === 0) return;

    const duration = performance.now() - scrollStartTime.current;
    scrollDurations.current.push(duration);

    // Keep only last 50 scroll durations
    if (scrollDurations.current.length > 50) {
      scrollDurations.current.shift();
    }

    scrollStartTime.current = 0;

  }, [listName, trackScrollPerformance]);

  const onItemRender = useCallback((index: number) => {
    renderedItems.current.add(index);
  }, []);

  const getStats = useCallback(() => {
    const totalScrolls = scrollCount.current;
    const averageScrollDuration =
      scrollDurations.current.length > 0
        ? scrollDurations.current.reduce((a, b) => a + b, 0) / scrollDurations.current.length
        : 0;

    return {
      totalScrolls,
      averageScrollDuration,
      renderedItems: renderedItems.current.size,
    };
  }, []);

  return {
    onScrollBegin,
    onScrollEnd,
    onItemRender,
    getStats,
  };
}

export default usePerformanceMetrics;
