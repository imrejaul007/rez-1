import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

/**
 * useLazyLoad - Intersection Observer Hook for Lazy Loading
 *
 * Only loads components when they're about to enter the viewport.
 * This further optimizes performance by delaying non-critical content.
 *
 * NOTE: IntersectionObserver is only available on web.
 * For React Native mobile, this falls back to immediate loading.
 *
 * @param offset - Distance in pixels before viewport to trigger load (default: 100px)
 *
 * @example
 * ```tsx
 * function LazySection({ children }) {
 *   const { ref, shouldLoad } = useLazyLoad(200);
 *
 *   return (
 *     <View ref={ref}>
 *       {shouldLoad ? children : <Skeleton />}
 *     </View>
 *   );
 * }
 * ```
 */
export function useLazyLoad(offset: number = 100) {
  const [shouldLoad, setShouldLoad] = useState(() => {
    // On mobile, load immediately since IntersectionObserver isn't available
    return Platform.OS !== 'web';
  });
  const ref = useRef<any>(null);

  useEffect(() => {
    // Only use IntersectionObserver on web
    if (Platform.OS !== 'web') {
      setShouldLoad(true);
      return;
    }

    if (!ref.current) return;

    // Check if IntersectionObserver is available
    if (typeof IntersectionObserver === 'undefined') {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect(); // Load once and disconnect
        }
      },
      {
        rootMargin: `${offset}px`, // Load before entering viewport
      }
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [offset]);

  return { ref, shouldLoad };
}
