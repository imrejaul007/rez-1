// @ts-nocheck
/**
 * Lazy Component Registry
 *
 * Central location for all lazy-loaded components.
 * This approach:
 * - Reduces initial bundle size by code splitting
 * - Loads components only when needed
 * - Improves initial page load performance
 *
 * Usage:
 * ```tsx
 * import { LazyAboutModal, LazyFrequentlyBoughtTogether } from '@/components/lazy';
 *
 * <Suspense fallback={<SectionLoader />}>
 *   <LazyAboutModal visible={show} onClose={handleClose} />
 * </Suspense>
 * ```
 */

import { lazy } from 'react';
import { colors } from '@/constants/theme';

// ============================================================================
// MODALS (Large UI Components - 50-80KB each)
// ============================================================================

export const LazyAboutModal = lazy(() =>
  import('@/components/AboutModal')
);

export const LazyWalkInDealsModal = lazy(() =>
  import('@/components/WalkInDealsModal')
);

export const LazyReviewModal = lazy(() =>
  import('@/components/ReviewModal')
);

// ============================================================================
// PRODUCT RECOMMENDATION COMPONENTS (120-200KB each)
// ============================================================================

/**
 * FrequentlyBoughtTogether - ~120KB
 * Shows products commonly purchased together with current item
 */
export const LazyFrequentlyBoughtTogether = lazy(() =>
  import('@/components/product/FrequentlyBoughtTogether')
);

/**
 * RelatedProductsSection - ~80KB
 * Displays similar/related products in horizontal scroll
 */
export const LazyRelatedProductsSection = lazy(() =>
  import('@/components/product/RelatedProductsSection')
);

// ============================================================================
// STORE SECTION COMPONENTS (To be added when available)
// ============================================================================

/**
 * CombinedSection78 - ~200KB (estimated)
 * Reviews + UGC section combined
 */
export const LazyCombinedSection78 = lazy(() =>
  import('@/app/StoreSection/CombinedSection78').catch(() => ({
    default: () => null // Graceful fallback if component doesn't exist yet
  }))
);

/**
 * Section6 - ~60KB (estimated)
 * Vouchers and promotions section
 */
export const LazySection6 = lazy(() =>
  import('@/app/StoreSection/Section6').catch(() => ({
    default: () => null // Graceful fallback if component doesn't exist yet
  }))
);

// ============================================================================
// RECOMMENDATION ENGINE (150KB)
// ============================================================================

/**
 * CategoryRecommendationsGrid - ~150KB (estimated)
 * AI-powered product recommendations based on category
 */
export const LazyCategoryRecommendationsGrid = lazy(() =>
  import('@/components/homepage/CategoryRecommendationsGrid').catch(() => ({
    default: () => null // Graceful fallback if component doesn't exist yet
  }))
);

// ============================================================================
// PRODUCT COMPONENTS (Various sizes)
// ============================================================================

export const LazyProductQuickView = lazy(() =>
  import('@/components/product/ProductQuickView')
);

export const LazyProductImageGallery = lazy(() =>
  import('@/components/product/ProductImageGallery')
);

export const LazyProductQASection = lazy(() =>
  import('@/components/product/ProductQASection')
);

export const LazySizeGuideModal = lazy(() =>
  import('@/components/product/SizeGuideModal')
);

export const LazyProductShareModal = lazy(() =>
  import('@/components/product/ProductShareModal')
);

// ============================================================================
// UTILITY COMPONENTS
// ============================================================================

export { default as LazyComponent } from './LazyComponent';
export { default as SectionLoader } from './SectionLoader';
