# Lazy Loading Quick Reference Guide

## 1. Import Lazy Components

```tsx
import { Suspense } from 'react';
import {
  LazyAboutModal,
  LazyFrequentlyBoughtTogether,
  LazyRelatedProductsSection,
  LazySection,
  SectionLoader
} from '@/components/lazy';
```

## 2. Basic Usage Patterns

### Pattern A: Modal (Load on User Action)
```tsx
{showModal && (
  <Suspense fallback={<SectionLoader />}>
    <LazyModal visible={showModal} onClose={handleClose} />
  </Suspense>
)}
```

### Pattern B: Below-the-Fold Content (Load on Scroll)
```tsx
<LazySection offset={300}>
  <LazyHeavyComponent data={data} />
</LazySection>
```

### Pattern C: Conditional Content
```tsx
{hasData && (
  <Suspense fallback={<SectionLoader text="Loading recommendations..." />}>
    <LazyComponent data={data} />
  </Suspense>
)}
```

## 3. Adding New Lazy Component

**Step 1**: Register in `components/lazy/index.ts`
```tsx
export const LazyMyComponent = lazy(() =>
  import('@/components/MyComponent')
);
```

**Step 2**: Use in your page
```tsx
import { LazyMyComponent } from '@/components/lazy';

<Suspense fallback={<SectionLoader />}>
  <LazyMyComponent prop1="value" />
</Suspense>
```

## 4. Custom Loading States

### Spinner with Text
```tsx
<Suspense fallback={<SectionLoader text="Loading products..." />}>
  <LazyComponent />
</Suspense>
```

### Custom Fallback
```tsx
<Suspense fallback={<MyCustomSkeleton />}>
  <LazyComponent />
</Suspense>
```

## 5. Viewport-Aware Loading

```tsx
import { useLazyLoad } from '@/hooks/useLazyLoad';

const { ref, shouldLoad } = useLazyLoad(200); // Load 200px before viewport

<View ref={ref}>
  {shouldLoad ? <HeavyComponent /> : <Skeleton />}
</View>
```

## 6. Available Lazy Components

### Modals (50-60KB each)
- `LazyAboutModal`
- `LazyWalkInDealsModal`
- `LazyReviewModal`
- `LazySizeGuideModal`
- `LazyProductShareModal`

### Product Components (80-200KB)
- `LazyFrequentlyBoughtTogether` (120KB)
- `LazyRelatedProductsSection` (80KB)
- `LazyCombinedSection78` (200KB)
- `LazyCategoryRecommendationsGrid` (150KB)
- `LazyProductQuickView` (40KB)
- `LazyProductQASection` (50KB)

### Utility Components
- `LazySection` - Viewport-aware container
- `SectionLoader` - Loading spinner
- `LazyComponent` - Generic wrapper

## 7. Performance Tips

### DO ✅
- Lazy load modals and below-the-fold content
- Use conditional rendering (`showModal &&`)
- Provide meaningful loading states
- Keep critical above-the-fold content in main bundle

### DON'T ❌
- Lazy load critical above-the-fold content
- Nest too many Suspense boundaries
- Lazy load tiny components (<10KB)
- Forget to wrap lazy components in Suspense

## 8. Debugging

### Check if lazy loading is working:
```bash
# Web: Chrome DevTools → Network → Filter by JS
# Look for separate .chunk.js files loading on demand

# Production bundle analysis:
npx expo export --platform web
npx webpack-bundle-analyzer .expo-shared/web/bundle.json
```

### Common Issues:
```tsx
// ❌ Error: Missing Suspense boundary
<LazyComponent />

// ✅ Correct: Wrapped in Suspense
<Suspense fallback={<SectionLoader />}>
  <LazyComponent />
</Suspense>

// ❌ Error: Component always in bundle
import Component from '@/components/Component';

// ✅ Correct: Component lazy loaded
import { LazyComponent } from '@/components/lazy';
```

## 9. Full Example

```tsx
import React, { useState, Suspense } from 'react';
import { ScrollView, View } from 'react-native';
import {
  LazyFrequentlyBoughtTogether,
  LazyRelatedProductsSection,
  LazyAboutModal,
  LazySection,
  SectionLoader
} from '@/components/lazy';

export default function ProductPage() {
  const [showAboutModal, setShowAboutModal] = useState(false);

  return (
    <ScrollView>
      {/* CRITICAL: Load immediately */}
      <ProductHeader />
      <ProductImages />
      <ProductDetails />

      {/* NON-CRITICAL: Lazy load on scroll */}
      <LazySection offset={300}>
        <LazyFrequentlyBoughtTogether
          productId="123"
          currentProduct={{ id: "123", name: "Product", price: 999, image: "" }}
        />
      </LazySection>

      <LazySection offset={400}>
        <LazyRelatedProductsSection
          productId="123"
          title="Similar Products"
          type="similar"
        />
      </LazySection>

      {/* MODAL: Load only when opened */}
      {showAboutModal && (
        <Suspense fallback={<SectionLoader />}>
          <LazyAboutModal
            visible={showAboutModal}
            onClose={() => setShowAboutModal(false)}
            storeData={storeData}
          />
        </Suspense>
      )}
    </ScrollView>
  );
}
```

## 10. Bundle Size Targets

| Component Type | Size | Strategy |
|----------------|------|----------|
| Critical (above-fold) | <500KB | Main bundle |
| Modals | 50-80KB each | Lazy load on open |
| Product sections | 80-200KB | Lazy load on scroll |
| Recommendations | 150-200KB | Lazy load with delay |

**Target**: Reduce initial bundle from 800KB to 500KB (37.5% reduction)
