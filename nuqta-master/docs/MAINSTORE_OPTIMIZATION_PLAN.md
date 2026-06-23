# MainStorePage Optimization & Enhancement Plan

**Document Version**: 1.0
**Created**: 2025-11-14
**Status**: Approved - Awaiting Implementation Start

---

## Executive Summary

This document outlines a comprehensive 4-phase plan to optimize MainStorePage performance, architecture, UI/UX, and features. Current load time is 5 seconds; target is <2 seconds. Implementation timeline: 8 weeks.

### Current State Analysis
- **File**: `frontend/app/MainStorePage.tsx`
- **Size**: 1,708 lines
- **Load Time**: 5 seconds (target: <2s)
- **Bundle Size**: ~800KB (target: <500KB)
- **Issues**:
  - 61 React hooks creating performance bottlenecks
  - 15+ API calls with sequential waterfalls
  - 28+ console.log statements in production code
  - Missing features compared to Amazon/Flipkart
  - No skeleton loaders (poor perceived performance)
  - Artificial setTimeout delays (900ms wasted)

### Expected Outcomes
- ⚡ **Load Time**: 5s → 2s (60% improvement)
- 📦 **Bundle Size**: 800KB → 500KB (37.5% reduction)
- 📈 **Conversion Rate**: +30% expected increase
- ♿ **Accessibility**: WCAG 2.1 AA compliance
- 🎨 **UI/UX**: Match Amazon/Flipkart quality standards

---

## PHASE 1: Critical Performance Fixes (2 weeks)

### Objective
Fix immediate performance issues causing slow load times and poor user experience.

### Task 1.1: Parallelize API Calls ⚡ **QUICK WIN**
**Time**: 2 hours
**Impact**: -3 seconds load time

**Current Problem**:
```typescript
// Sequential - takes 3-5 seconds
await loadStoreData()      // 1-2s
await loadPromotions()     // 1s (waits for store)
await loadProducts()       // 2s (waits for store)
```

**Solution**:
```typescript
// Parallel - takes 2 seconds max
const [storeResponse, promotionsResponse, productsResponse] =
  await Promise.allSettled([
    storesApi.getStoreById(storeId),
    offersApi.getStorePromotions(storeId),
    productsApi.getProductsByStore(storeId)
  ]);

// Handle each response independently
if (storeResponse.status === 'fulfilled') {
  setStoreData(storeResponse.value);
}
if (promotionsResponse.status === 'fulfilled') {
  setPromotions(promotionsResponse.value);
}
if (productsResponse.status === 'fulfilled') {
  setProducts(productsResponse.value);
}
```

**Implementation Location**: `MainStorePage.tsx` lines 404-642

**Expected Result**: Load time 5s → 2s

---

### Task 1.2: Remove Console.log Statements 🔒 **SECURITY FIX**
**Time**: 1 hour
**Impact**: Security, professional polish

**Current Problem**:
- 28+ console.log statements exposing sensitive data
- Store IDs, product data, user actions logged to browser console
- Not production-ready

**Solution**:
```typescript
// REMOVE all instances of:
console.log('🏪 [MAINSTORE] ...');
console.log('📦 [PRODUCTS] ...');
console.log('🎯 [FILTERS] ...');

// REPLACE WITH proper error tracking:
import { errorReporter } from '@/utils/errorReporter';

errorReporter.addBreadcrumb({
  type: 'navigation',
  message: 'Store page loaded',
  data: { storeId }
});
```

**Files to Clean**:
- MainStorePage.tsx (28 instances)
- CategoryRecommendationsGrid.tsx (15 instances)

**Expected Result**: Production-ready logging, no sensitive data exposure

---

### Task 1.3: Add Skeleton Loaders 💀 **UX IMPROVEMENT**
**Time**: 6 hours
**Impact**: Dramatically better perceived performance

**Current Problem**:
- Blank white screen for 3-5 seconds while data loads
- Users think app is frozen/broken
- High bounce rate during loading

**Solution**: Create skeleton components

**File**: `components/skeletons/StoreHeaderSkeleton.tsx`
```typescript
export default function StoreHeaderSkeleton() {
  return (
    <View style={styles.container}>
      <ShimmerEffect width="100%" height={200} />
      <ShimmerEffect width="60%" height={32} style={{ marginTop: 16 }} />
      <ShimmerEffect width="40%" height={20} style={{ marginTop: 8 }} />
    </View>
  );
}
```

**Components to Create**:
1. `StoreHeaderSkeleton.tsx` (header, logo, name, rating)
2. `ProductCardSkeleton.tsx` (image, title, price)
3. `PromotionBannerSkeleton.tsx` (banner placeholders)
4. `ProductGridSkeleton.tsx` (6-card grid)

**Integration in MainStorePage**:
```typescript
{loading ? (
  <>
    <StoreHeaderSkeleton />
    <PromotionBannerSkeleton />
    <ProductGridSkeleton count={6} />
  </>
) : (
  <ActualContent />
)}
```

**Expected Result**: Professional loading experience, 50% reduction in perceived load time

---

### Task 1.4: Remove Artificial Delays 🚫 **QUICK FIX**
**Time**: 1 hour
**Impact**: -900ms load time

**Current Problem**:
```typescript
// Lines 603-605 in MainStorePage.tsx
setTimeout(() => setShowFrequentlyBought(true), 300);
setTimeout(() => setShowRelatedProducts(true), 600);
setTimeout(() => setShowCategoryGrid(true), 900);
```
This adds 900ms of unnecessary delay!

**Solution**:
```typescript
// REMOVE all artificial staggering
// Components should render as soon as data is available
setShowFrequentlyBought(true);
setShowRelatedProducts(true);
setShowCategoryGrid(true);

// Use React.memo and proper key props for performance instead
```

**Expected Result**: Instant rendering when data available

---

### Task 1.5: Fix Touch Target Sizes ♿ **ACCESSIBILITY**
**Time**: 2 hours
**Impact**: WCAG 2.1 AA compliance

**Current Problem**:
- Product cards have 32x32px touch targets
- Filter chips have 24x24px touch targets
- Violates accessibility guidelines (44x44px minimum)

**Solution**:
```typescript
// In ProductCard.tsx
<Pressable
  style={styles.card}
  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} // Expands touch area
>

// In FilterChips.tsx
const styles = StyleSheet.create({
  chip: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 16,
    paddingVertical: 12,
  }
});
```

**Files to Update**:
- ProductCard.tsx
- FilterChips.tsx
- StoreActionButtons.tsx

**Expected Result**: All interactive elements meet 44x44px minimum

---

### Task 1.6: Implement Image Lazy Loading 🖼️ **PERFORMANCE**
**Time**: 4 hours
**Impact**: -400ms initial load, 50% less memory

**Current Problem**:
- All 20+ images load immediately on page render
- 5MB+ of image data loaded upfront
- Slow on mobile networks

**Solution**:

**File**: `components/common/LazyImage.tsx`
```typescript
export default function LazyImage({ uri, style, priority = false }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [inView, setInView] = useState(priority);

  return (
    <View>
      {loading && <BlurPlaceholder />}
      {inView && (
        <Image
          source={{ uri }}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={() => setError(true)}
          style={style}
        />
      )}
    </View>
  );
}
```

**Integration Strategy**:
- Hero images: `priority={true}` (load immediately)
- Above-fold products: `priority={true}`
- Below-fold products: `priority={false}` (lazy load)
- Use Cloudinary transformations for progressive loading

**Expected Result**: 50% faster initial render, better mobile performance

---

### Task 1.7: Add React.memo to Expensive Components 🧠 **OPTIMIZATION**
**Time**: 3 hours
**Impact**: Prevent unnecessary re-renders

**Current Problem**:
- Section3, Section4, Section6 re-render on every parent state change
- Each section makes API calls, processes data
- Causes jank during user interactions

**Solution**:
```typescript
// Section3.tsx
export default React.memo(function Section3({ storeData, products }) {
  // Component logic...
}, (prevProps, nextProps) => {
  // Custom comparison
  return (
    prevProps.storeData?.id === nextProps.storeData?.id &&
    prevProps.products?.length === nextProps.products?.length
  );
});

// CombinedSection78.tsx
export default React.memo(CombinedSection78);
```

**Components to Memoize**:
1. Section3 (product grid)
2. Section4 (filters)
3. Section6 (vouchers)
4. CombinedSection78 (reviews + UGC)
5. FrequentlyBoughtTogether
6. RelatedProductsSection

**Expected Result**: 70% fewer re-renders, smoother interactions

---

## PHASE 2: Code Architecture Refactor (2 weeks)

### Objective
Improve code maintainability, reduce complexity, enable faster future development.

### Task 2.1: Extract Custom Hooks
**Time**: 1 week

**Current Problem**:
- 61 hooks in MainStorePage.tsx (unmanageable)
- Business logic mixed with UI logic
- Hard to test, hard to debug

**Solution**: Create focused custom hooks

**File**: `hooks/useStoreData.ts`
```typescript
export function useStoreData(storeId: string) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchStore() {
      try {
        setLoading(true);
        const response = await storesApi.getStoreById(storeId);
        setData(response.data);
      } catch (err) {
        setError(err);
        errorReporter.captureError(err, { context: 'useStoreData' });
      } finally {
        setLoading(false);
      }
    }

    if (storeId) fetchStore();
  }, [storeId]);

  return { data, loading, error, refetch: () => fetchStore() };
}
```

**Hooks to Create**:
1. `useStoreData(storeId)` - Store info, ratings, hours
2. `useStoreProducts(storeId, filters)` - Products with filters/sort
3. `useStorePromotions(storeId)` - Vouchers, deals, cashback
4. `useProductFilters()` - Filter state, apply/clear logic
5. `useRecommendations(context)` - Smart recommendations

**Usage in MainStorePage**:
```typescript
// BEFORE: 61 hooks, 200 lines of logic
const [storeData, setStoreData] = useState(null);
const [loading, setLoading] = useState(true);
useEffect(() => { /* 50 lines */ }, []);
// ... 58 more hooks

// AFTER: 5 clean hooks, 10 lines
const { data: store, loading: storeLoading } = useStoreData(storeId);
const { products, loading: productsLoading } = useStoreProducts(storeId, filters);
const { promotions } = useStorePromotions(storeId);
const { activeFilters, applyFilter, clearFilters } = useProductFilters();
const { recommendations } = useRecommendations('store_page');
```

**Expected Result**: Component size 1,708 lines → 300 lines

---

### Task 2.2: Implement Virtual Scrolling
**Time**: 3 days

**Current Problem**:
- Rendering 50+ product cards simultaneously
- High memory usage (200MB+)
- Janky scrolling on mid-range devices

**Solution**: Replace ScrollView with FlatList

**File**: `MainStorePage.tsx` (Section3 replacement)
```typescript
<FlatList
  data={products}
  renderItem={({ item }) => (
    <ProductCard
      product={item}
      onPress={() => handleProductPress(item)}
    />
  )}
  keyExtractor={(item) => item.id}
  numColumns={2}
  initialNumToRender={6}
  maxToRenderPerBatch={6}
  windowSize={3}
  removeClippedSubviews={true}
  getItemLayout={(data, index) => ({
    length: 280,
    offset: 280 * index,
    index,
  })}
/>
```

**Performance Settings**:
- `initialNumToRender={6}` - Only render 6 cards initially
- `maxToRenderPerBatch={6}` - Load 6 more as user scrolls
- `windowSize={3}` - Keep 3 screens in memory
- `removeClippedSubviews={true}` - Unmount off-screen items

**Expected Result**: Memory usage 200MB → 80MB, 60fps scrolling

---

### Task 2.3: Code Splitting
**Time**: 2 days

**Current Problem**:
- All sections loaded upfront (800KB bundle)
- User might only view 2-3 sections
- Wasted bandwidth

**Solution**: Lazy load components

**File**: `app/MainStorePage.tsx`
```typescript
// Lazy imports
const FrequentlyBoughtTogether = lazy(() => import('@/components/product/FrequentlyBoughtTogether'));
const RelatedProductsSection = lazy(() => import('@/components/product/RelatedProductsSection'));
const CombinedSection78 = lazy(() => import('@/app/StoreSection/CombinedSection78'));

// Render with Suspense
<Suspense fallback={<SectionSkeleton />}>
  <FrequentlyBoughtTogether products={products} />
</Suspense>
```

**Components to Split**:
1. FrequentlyBoughtTogether (120KB)
2. RelatedProductsSection (80KB)
3. CombinedSection78 (200KB)
4. CategoryRecommendationsGrid (150KB)

**Expected Result**: Initial bundle 800KB → 500KB (37.5% reduction)

---

### Task 2.4: Extract Utility Functions
**Time**: 1 day

**Current Problem**:
- Data transformation logic scattered throughout component
- Repeated code (price formatting, date formatting)
- Hard to test business logic

**Solution**: Create utility files

**File**: `utils/storeTransformers.ts`
```typescript
export function transformStoreData(apiResponse: any): StoreData {
  return {
    id: apiResponse._id,
    name: apiResponse.name,
    rating: calculateAverageRating(apiResponse.reviews),
    formattedHours: formatBusinessHours(apiResponse.hours),
    // ... all transformation logic
  };
}

export function calculatePriceRange(products: Product[]): string {
  const prices = products.map(p => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return `₹${min} - ₹${max}`;
}
```

**File**: `constants/storeConstants.ts`
```typescript
export const FILTER_OPTIONS = {
  SORT_BY: ['price_low', 'price_high', 'rating', 'newest'],
  CATEGORIES: ['All', 'Electronics', 'Fashion', 'Food', 'Beauty'],
  PRICE_RANGES: [
    { label: 'Under ₹500', min: 0, max: 500 },
    { label: '₹500-₹1000', min: 500, max: 1000 },
    // ...
  ]
};
```

**Expected Result**: Cleaner code, testable logic, better maintainability

---

### Task 2.5: Fix TypeScript Types
**Time**: 2 days

**Current Problem**:
```typescript
const storeData: any;  // Used 47 times!
const products: any[];
```

**Solution**: Strict type definitions

**File**: `types/store.types.ts`
```typescript
export interface StoreData {
  id: string;
  name: string;
  description: string;
  rating: number;
  reviewCount: number;
  hours: BusinessHours;
  location: Location;
  products: Product[];
  promotions: Promotion[];
}

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  images: string[];
  category: Category;
  inventory: {
    isAvailable: boolean;
    quantity: number;
  };
  ratings: {
    average: number;
    count: number;
  };
}
```

**Expected Result**: Zero `any` types, full IDE autocomplete, catch errors at compile time

---

## PHASE 3: UI/UX Enhancement (2 weeks)

### Objective
Make MainStorePage visually competitive with Amazon/Flipkart, add missing critical features.

### Task 3.1: Implement Design System
**Time**: 1 week

**Create design tokens**:

**File**: `constants/DesignTokens.ts`
```typescript
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const TYPOGRAPHY = {
  h1: { fontSize: 32, fontWeight: '700', lineHeight: 40 },
  h2: { fontSize: 24, fontWeight: '600', lineHeight: 32 },
  h3: { fontSize: 20, fontWeight: '600', lineHeight: 28 },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  caption: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
} as const;

export const COLORS = {
  primary: '#6366F1',
  secondary: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  success: '#22C55E',
  neutral: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    // ...
    900: '#111827',
  },
} as const;
```

**Usage**:
```typescript
import { SPACING, TYPOGRAPHY, COLORS } from '@/constants/DesignTokens';

const styles = StyleSheet.create({
  header: {
    ...TYPOGRAPHY.h2,
    color: COLORS.neutral[900],
    marginBottom: SPACING.md,
  }
});
```

---

### Task 3.2: Add Missing Critical Sections
**Time**: 1 week

**Section 1: Product Specifications Table**
```typescript
<View style={styles.specsSection}>
  <Text style={styles.sectionTitle}>Specifications</Text>
  <View style={styles.specsTable}>
    <SpecRow label="Brand" value={product.brand} />
    <SpecRow label="Material" value={product.material} />
    <SpecRow label="Dimensions" value={product.dimensions} />
    <SpecRow label="Weight" value={product.weight} />
    <SpecRow label="Color" value={product.color} />
  </View>
</View>
```

**Section 2: Delivery Estimator**
```typescript
<View style={styles.deliverySection}>
  <TextInput
    placeholder="Enter PIN code"
    value={pincode}
    onChangeText={setPincode}
  />
  <Button onPress={checkDelivery}>Check</Button>

  {deliveryInfo && (
    <View>
      <Text>Delivery by {deliveryInfo.estimatedDate}</Text>
      <Text>₹{deliveryInfo.charge} shipping</Text>
    </View>
  )}
</View>
```

**Section 3: Size/Variant Selector**
```typescript
<View style={styles.variantSection}>
  <Text>Select Size:</Text>
  <View style={styles.sizeButtons}>
    {sizes.map(size => (
      <Pressable
        key={size}
        style={[
          styles.sizeButton,
          selectedSize === size && styles.sizeButtonActive
        ]}
        onPress={() => setSelectedSize(size)}
      >
        <Text>{size}</Text>
      </Pressable>
    ))}
  </View>
</View>
```

**Section 4: Trust Badges**
```typescript
<View style={styles.trustBadges}>
  <Badge icon="shield-check" text="Secure Payments" />
  <Badge icon="truck" text="Free Delivery" />
  <Badge icon="refresh" text="Easy Returns" />
  <Badge icon="check-circle" text="Verified Seller" />
</View>
```

**Section 5: Stock Availability Indicator**
```typescript
<View style={styles.stockIndicator}>
  {stock > 10 && <Text style={styles.inStock}>In Stock</Text>}
  {stock <= 10 && stock > 0 && (
    <Text style={styles.lowStock}>Only {stock} left!</Text>
  )}
  {stock === 0 && <Text style={styles.outOfStock}>Out of Stock</Text>}
</View>
```

**Section 6: Recently Viewed Products**
```typescript
<View style={styles.recentlyViewed}>
  <Text style={styles.sectionTitle}>Recently Viewed</Text>
  <ScrollView horizontal>
    {recentProducts.map(product => (
      <ProductCard key={product.id} product={product} compact />
    ))}
  </ScrollView>
</View>
```

---

### Task 3.3: Enhanced Empty & Error States
**Time**: 2 days

**Empty State Component**:
```typescript
export function EmptyProducts() {
  return (
    <View style={styles.empty}>
      <Image source={require('@/assets/empty-box.png')} style={styles.emptyImage} />
      <Text style={styles.emptyTitle}>No Products Found</Text>
      <Text style={styles.emptyMessage}>
        Try adjusting your filters or check back later
      </Text>
      <Button onPress={clearFilters}>Clear Filters</Button>
    </View>
  );
}
```

**Error State Component**:
```typescript
export function ErrorState({ error, onRetry }) {
  return (
    <View style={styles.error}>
      <Icon name="alert-circle" size={64} color={COLORS.error} />
      <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
      <Text style={styles.errorMessage}>{error.message}</Text>
      <Button onPress={onRetry}>Try Again</Button>
    </View>
  );
}
```

---

### Task 3.4: Mobile Optimization
**Time**: 3 days

**Responsive Grid**:
```typescript
const numColumns = useWindowDimensions().width < 768 ? 2 : 4;

<FlatList
  data={products}
  numColumns={numColumns}
  key={numColumns} // Force re-render on column change
/>
```

**Bottom Sheets for Filters** (better mobile UX):
```typescript
import { BottomSheet } from '@gorhom/bottom-sheet';

<BottomSheet
  snapPoints={['25%', '50%', '90%']}
  index={-1}
  ref={filterSheetRef}
>
  <FilterContent />
</BottomSheet>
```

**Safe Area Handling**:
```typescript
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const insets = useSafeAreaInsets();

<View style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
  <Content />
</View>
```

---

## PHASE 4: Advanced Features (2 weeks)

### Task 4.1: Q&A Section
**Time**: 1 week

**Component**: `components/product/QASection.tsx`
```typescript
export default function QASection({ productId }) {
  const { questions, askQuestion, answerQuestion } = useProductQuestions(productId);

  return (
    <View>
      <Text style={styles.title}>Questions & Answers</Text>

      <Pressable onPress={() => setShowAskModal(true)}>
        <Text>Ask a question</Text>
      </Pressable>

      {questions.map(q => (
        <View key={q.id} style={styles.question}>
          <Text style={styles.questionText}>Q: {q.text}</Text>
          {q.answers.map(a => (
            <Text key={a.id} style={styles.answer}>A: {a.text}</Text>
          ))}
        </View>
      ))}
    </View>
  );
}
```

**Backend Integration**:
- GET `/api/products/:id/questions`
- POST `/api/products/:id/questions`
- POST `/api/questions/:id/answers`

---

### Task 4.2: Customer Photos Section
**Time**: 3 days

**Component**: `components/product/CustomerPhotos.tsx`
```typescript
export default function CustomerPhotos({ productId }) {
  const { photos, uploadPhoto } = useCustomerPhotos(productId);

  const handleUpload = async (image) => {
    const formData = new FormData();
    formData.append('photo', {
      uri: image.uri,
      type: 'image/jpeg',
      name: 'customer-photo.jpg',
    });

    await uploadPhoto(formData);
  };

  return (
    <View>
      <Text style={styles.title}>Customer Photos</Text>

      <FlatList
        data={photos}
        horizontal
        renderItem={({ item }) => (
          <Image source={{ uri: item.url }} style={styles.photo} />
        )}
      />

      <Button onPress={pickImage}>Add Photo</Button>
    </View>
  );
}
```

---

### Task 4.3: Image Zoom Functionality
**Time**: 2 days

**Component**: `components/common/ZoomableImage.tsx`
```typescript
import { PinchGestureHandler } from 'react-native-gesture-handler';
import Animated, { useAnimatedGestureHandler, useAnimatedStyle } from 'react-native-reanimated';

export default function ZoomableImage({ uri }) {
  const scale = useSharedValue(1);

  const pinchHandler = useAnimatedGestureHandler({
    onActive: (event) => {
      scale.value = event.scale;
    },
    onEnd: () => {
      scale.value = withSpring(1);
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <PinchGestureHandler onGestureEvent={pinchHandler}>
      <Animated.Image
        source={{ uri }}
        style={[styles.image, animatedStyle]}
      />
    </PinchGestureHandler>
  );
}
```

---

### Task 4.4: Product Comparison
**Time**: 1 week

**Feature**: Compare up to 4 products side-by-side

**Component**: `components/product/ComparisonTable.tsx`
```typescript
export default function ComparisonTable({ productIds }) {
  const { products } = useProducts(productIds);

  return (
    <ScrollView horizontal>
      <View style={styles.table}>
        <View style={styles.headerRow}>
          <Text>Feature</Text>
          {products.map(p => (
            <Image key={p.id} source={{ uri: p.image }} />
          ))}
        </View>

        <ComparisonRow label="Price" values={products.map(p => p.price)} />
        <ComparisonRow label="Rating" values={products.map(p => p.rating)} />
        <ComparisonRow label="Brand" values={products.map(p => p.brand)} />
        {/* ... more rows */}
      </View>
    </ScrollView>
  );
}
```

**User Flow**:
1. Click "Add to Compare" on product cards
2. Comparison badge shows count (e.g., "2 items to compare")
3. Click badge to open comparison modal
4. View side-by-side table

---

### Task 4.5: Expert Reviews
**Time**: 3 days

**Component**: `components/product/ExpertReviews.tsx`
```typescript
export default function ExpertReviews({ productId }) {
  const { reviews } = useExpertReviews(productId);

  return (
    <View>
      <Text style={styles.title}>Expert Reviews</Text>

      {reviews.map(review => (
        <View key={review.id} style={styles.review}>
          <View style={styles.reviewHeader}>
            <Image source={{ uri: review.author.avatar }} />
            <View>
              <Text style={styles.authorName}>{review.author.name}</Text>
              <Text style={styles.authorTitle}>{review.author.title}</Text>
            </View>
          </View>

          <View style={styles.rating}>
            <StarRating value={review.rating} />
            <Text>{review.rating}/5</Text>
          </View>

          <Text style={styles.reviewText}>{review.content}</Text>

          <View style={styles.proscons}>
            <View>
              <Text style={styles.label}>Pros:</Text>
              {review.pros.map((pro, i) => (
                <Text key={i}>• {pro}</Text>
              ))}
            </View>
            <View>
              <Text style={styles.label}>Cons:</Text>
              {review.cons.map((con, i) => (
                <Text key={i}>• {con}</Text>
              ))}
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}
```

---

## Implementation Timeline

### Week 1-2: Phase 1 (Critical Fixes)
- **Day 1-2**: Parallelize API calls, remove console.logs
- **Day 3-5**: Build skeleton loaders
- **Day 6-8**: Remove delays, fix touch targets
- **Day 9-10**: Image lazy loading, React.memo

### Week 3-4: Phase 2 (Architecture)
- **Day 1-5**: Extract custom hooks
- **Day 6-8**: Virtual scrolling
- **Day 9-10**: Code splitting, utilities, types

### Week 5-6: Phase 3 (UI/UX)
- **Day 1-5**: Design system, 6 new sections
- **Day 6-8**: Empty/error states
- **Day 9-10**: Mobile optimization

### Week 7-8: Phase 4 (Advanced)
- **Day 1-5**: Q&A section, product comparison
- **Day 6-8**: Customer photos, image zoom
- **Day 9-10**: Expert reviews, final testing

---

## Success Metrics

### Performance Metrics
- ✅ Load time: 5s → 2s (60% improvement)
- ✅ Bundle size: 800KB → 500KB (37.5% reduction)
- ✅ Memory usage: 200MB → 80MB (60% reduction)
- ✅ FPS during scroll: 30fps → 60fps (100% improvement)

### Code Quality Metrics
- ✅ Component size: 1,708 lines → 300 lines (82% reduction)
- ✅ Number of hooks: 61 → 5 (92% reduction)
- ✅ TypeScript `any` types: 47 → 0 (100% elimination)
- ✅ Console.log statements: 28 → 0 (100% removal)

### Business Metrics
- ✅ Conversion rate: +30% expected
- ✅ Bounce rate during load: -50% expected
- ✅ Time to first interaction: -60%
- ✅ User satisfaction score: +40% expected

### Accessibility Metrics
- ✅ WCAG 2.1 AA compliance: 100%
- ✅ Touch target sizes: 100% meet 44x44px minimum
- ✅ Screen reader support: Full compatibility
- ✅ Color contrast ratios: 100% pass AAA standard

---

## Testing Strategy

### Unit Tests
```typescript
// hooks/useStoreData.test.ts
describe('useStoreData', () => {
  it('should fetch store data on mount', async () => {
    const { result } = renderHook(() => useStoreData('store-123'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeDefined();
  });
});
```

### Integration Tests
```typescript
// app/MainStorePage.test.tsx
describe('MainStorePage', () => {
  it('should load store, products, and promotions in parallel', async () => {
    render(<MainStorePage />);

    await waitFor(() => {
      expect(screen.getByText(/Store Name/i)).toBeInTheDocument();
      expect(screen.getByText(/Products/i)).toBeInTheDocument();
    });
  });
});
```

### Performance Tests
```typescript
// MainStorePage.perf.test.tsx
describe('MainStorePage Performance', () => {
  it('should render initial view in <2 seconds', async () => {
    const start = performance.now();
    render(<MainStorePage />);
    await waitFor(() => screen.getByText(/Store Name/i));
    const end = performance.now();

    expect(end - start).toBeLessThan(2000);
  });
});
```

---

## Rollback Plan

If any phase causes critical issues:

1. **Immediate Rollback**: Use git to revert to previous commit
```bash
git revert HEAD
git push origin main
```

2. **Feature Flags**: Implement gradual rollout
```typescript
const FEATURE_FLAGS = {
  VIRTUAL_SCROLLING: process.env.ENABLE_VIRTUAL_SCROLL === 'true',
  CODE_SPLITTING: process.env.ENABLE_CODE_SPLIT === 'true',
};

{FEATURE_FLAGS.VIRTUAL_SCROLLING ? <FlatList /> : <ScrollView />}
```

3. **A/B Testing**: Test with 10% of users first
```typescript
const showNewVersion = user.id % 10 === 0;
```

---

## Maintenance

### Monthly Reviews
- Check bundle size (should stay <500KB)
- Review performance metrics (load time <2s)
- Update dependencies
- Review error logs

### Quarterly Updates
- Conduct user testing sessions
- Review analytics (conversion rates, bounce rates)
- Plan new features based on user feedback
- Security audit

---

## Conclusion

This 4-phase plan transforms MainStorePage from a slow, monolithic component into a fast, maintainable, feature-rich store page competitive with Amazon and Flipkart.

**Quick Wins** (Phase 1): Can be completed in 2 weeks for immediate 60% performance improvement.

**Long-term Value** (Phases 2-4): Establishes solid architecture, design system, and advanced features for sustainable growth.

**Total Investment**: 8 weeks of development time
**Expected ROI**: 30% increase in conversion rate, 50% reduction in bounce rate

---

**Status**: Ready for implementation. Awaiting confirmation to start Phase 1.
