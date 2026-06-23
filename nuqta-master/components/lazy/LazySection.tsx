import React, { Suspense } from 'react';
import { View, Platform } from 'react-native';
import { useLazyLoad } from '@/hooks/useLazyLoad';
import SectionLoader from './SectionLoader';

interface LazySectionProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  offset?: number;
  enabled?: boolean;
}

/**
 * LazySection - Viewport-aware lazy loading container
 *
 * Combines Suspense with intersection observer for optimal lazy loading:
 * 1. Only loads when component is near viewport (web only)
 * 2. Wraps in Suspense for React.lazy() support
 *
 * On mobile: Loads immediately since IntersectionObserver isn't available
 * On web: Loads when section is 200px from viewport
 *
 * @example
 * ```tsx
 * <LazySection offset={300}>
 *   <LazyFrequentlyBoughtTogether products={products} />
 * </LazySection>
 * ```
 */
export default function LazySection({
  children,
  fallback,
  offset = 200,
  enabled = true
}: LazySectionProps) {
  const { ref, shouldLoad } = useLazyLoad(offset);

  // If lazy loading is disabled, render immediately
  if (!enabled) {
    return <Suspense fallback={fallback || <SectionLoader />}>{children}</Suspense>;
  }

  return (
    <View ref={ref}>
      {shouldLoad ? (
        <Suspense fallback={fallback || <SectionLoader />}>{children}</Suspense>
      ) : (
        fallback || <SectionLoader />
      )}
    </View>
  );
}
