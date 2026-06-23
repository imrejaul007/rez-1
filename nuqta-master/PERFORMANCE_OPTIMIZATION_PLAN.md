# App Performance Optimization Plan - rez-frontend

## Problem Statement
The app is slow with long loading times on homepage and other sections. Bundle has 2700+ modules, large components, waterfall API calls, and missing optimizations.

---

## Phase 1: Critical FlatList Optimizations (HIGH IMPACT)

### 1.1 StoreProductsPage.tsx FlatList
**File:** `app/StoreProductsPage.tsx` (Lines 1582-1601)
**Issue:** Missing optimization props causing frame drops on product scrolling

**Add these props:**
```tsx
<FlatList
  ...existing props
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  updateCellsBatchingPeriod={50}
  windowSize={10}
  initialNumToRender={8}
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
/>
```

### 1.2 Add useMemo for Filtered Products
**File:** `app/StoreProductsPage.tsx`
**Issue:** Filtering logic recalculates on every render

**Wrap with useMemo:**
```tsx
const filteredProducts = useMemo(() => {
  return products.filter(/* existing filter logic */);
}, [products, searchQuery, selectedCategory, priceRange, sortBy]);
```

### 1.3 Debounce Search History
**File:** `app/StoreProductsPage.tsx` (Line 533)
**Issue:** AsyncStorage.setItem called on every keystroke

**Add debounce:**
```tsx
const debouncedSaveHistory = useMemo(
  () => debounce((query) => AsyncStorage.setItem('searchHistory', query), 500),
  []
);
```

---

## Phase 2: API Call Optimization (HIGH IMPACT)

### 2.1 Parallelize loadUserStatistics
**File:** `app/(tabs)/index.tsx` (Lines 406-512)
**Issue:** 3 sequential API calls that should be parallel

**Current (Waterfall):**
```tsx
const statsResponse = await authService.getUserStatistics();
const walletResponse = await walletApi.getBalance();
const creditResponse = await walletApi.creditLoyaltyPoints();
```

**Change to (Parallel):**
```tsx
const [statsResponse, walletResponse] = await Promise.all([
  authService.getUserStatistics(),
  walletApi.getBalance(),
]);
// Then credit points if needed
```

### 2.2 Optimize Voucher Fetching
**File:** `app/(tabs)/index.tsx` (Lines 260-350)
**Issue:** Conditional double-fetch (active first, then all if empty)

**Change to single batch call with flag:**
```tsx
const response = await vouchersService.getUserVouchers({
  includeAll: true, // Backend returns both active and all
  limit: 50
});
```

---

## Phase 3: Context Provider Lazy Loading (MEDIUM IMPACT)

### 3.1 Use Existing LazyContexts Pattern
**File:** `contexts/LazyContexts.tsx` (exists but unused)
**File:** `app/_layout.tsx`

**Current:** 21 context providers loaded eagerly at startup

**Defer these contexts (not needed immediately):**
- SocketProvider (load when user opens chat/real-time features)
- NotificationProvider (load after auth)
- SecurityProvider (load on sensitive screens)
- GamificationProvider (load on games/challenges)
- SubscriptionProvider (load on subscription screens)
- SocialProvider (load on social features)

**Implementation:**
```tsx
// In _layout.tsx, wrap deferred contexts:
<LazyContextProvider contexts={[
  { Provider: SocketProvider, condition: isAuthenticated },
  { Provider: GamificationProvider, condition: () => pathname.includes('games') },
]}>
  {children}
</LazyContextProvider>
```

---

## Phase 4: Component Lazy Loading (MEDIUM IMPACT)

### 4.1 Homepage Sections Lazy Loading
**File:** `app/(tabs)/index.tsx`
**Issue:** 52 direct imports, many below-the-fold

**Already lazy (keep):**
- ProfileMenuModal
- NavigationShortcuts
- QuickAccessFAB
- FeatureHighlights
- CategoryIconGrid

**Add lazy loading for:**
```tsx
const RecentlyViewedSection = React.lazy(() => import('@/components/homepage/RecentlyViewedSection'));
const GoingOutSection = React.lazy(() => import('@/components/homepage/GoingOutSection'));
const ServiceSection = React.lazy(() => import('@/components/homepage/ServiceSection'));
const ExclusiveRewardsSection = React.lazy(() => import('@/components/homepage/ExclusiveRewardsSection'));
```

### 4.2 Large Component Code Splitting
**These components are too large and should be split:**

| File | Lines | Action |
|------|-------|--------|
| MainStorePage.tsx | 2,804 | Split into: StoreHeader, StoreProducts, StoreReviews, StoreInfo |
| StoreProductsPage.tsx | 2,728 | Split into: ProductGrid, ProductFilters, ProductSearch |
| checkout.tsx | 2,566 | Split into: CheckoutSummary, PaymentSection, AddressSection |

**Priority:** Start with MainStorePage (most visited)

---

## Phase 5: Data Transformation Memoization (MEDIUM IMPACT)

### 5.1 Memoize transformOfferToTrendingDeal
**File:** `hooks/useCashStoreSection.ts` (Lines 185-252)
**Issue:** Transformation runs on every render

```tsx
const transformedDeals = useMemo(() => {
  return offers.map(transformOfferToTrendingDeal);
}, [offers]);
```

### 5.2 Memoize Price Extraction
**File:** `hooks/useHomepage.ts` (Lines 342-354)

```tsx
const extractPrice = useMemo(() => {
  return (item) => {
    // existing price extraction logic
  };
}, []);
```

---

## Phase 6: Image Optimization (LOW-MEDIUM IMPACT)

### 6.1 Add Image Preloading for Hero Banners
**File:** `app/(tabs)/index.tsx`

```tsx
useEffect(() => {
  // Preload critical images
  const criticalImages = [
    require('@/assets/images/hero-banner.png'),
    require('@/assets/images/promo-banner.png'),
  ];
  criticalImages.forEach(img => Image.prefetch(img));
}, []);
```

### 6.2 Use expo-image Everywhere
**Status:** expo-image is installed but not used consistently
**Action:** Replace React Native Image with expo-image in:
- Homepage hero section
- Store cards
- Product images

---

## Phase 7: Bundle Cleanup (LOW IMPACT)

### 7.1 Remove MongoDB from devDependencies
**File:** `package.json`
**Issue:** Backend library in frontend (50-100KB)

```bash
npm uninstall mongodb
```

### 7.2 Remove Demo Components from Exports
**File:** `components/bills/index.ts` (Lines 8-18)
**Remove exports:**
- BasicExample
- CustomMaxSizeExample
- UploadProgressExample
- BillImageUploaderDemo

---

## Execution Order (Quick Wins First)

### Step 1: FlatList + Product Scrolling Fix
**Target:** Fix laggy product scrolling
- Add FlatList optimization props to StoreProductsPage.tsx
- Add useMemo for filtered products
- Debounce search history AsyncStorage

### Step 2: Homepage Initial Load Fix
**Target:** Faster homepage load
- Parallelize loadUserStatistics API calls
- Add lazy loading for below-fold sections

### Step 3: Store Page Split
**Target:** Faster MainStorePage loading
- Split MainStorePage.tsx (2,804 lines) into:
  - `components/store/StoreHeader.tsx`
  - `components/store/StoreProductsGrid.tsx`
  - `components/store/StoreReviews.tsx`
  - `components/store/StoreInfo.tsx`
- Lazy load non-critical sections

### Step 4: Memoization & Context Optimization
**Target:** Reduce re-renders
- Memoize data transformations in hooks
- Defer non-critical context providers

### Step 5: Bundle Cleanup
**Target:** Smaller bundle
- Remove mongodb from dependencies
- Remove demo component exports

---

## Files to Modify

### Critical Files:
- `app/StoreProductsPage.tsx` - FlatList optimization, useMemo filters
- `app/(tabs)/index.tsx` - Parallelize API calls, lazy load sections
- `app/_layout.tsx` - Defer context providers

### Secondary Files:
- `hooks/useCashStoreSection.ts` - Memoize transformations
- `hooks/useHomepage.ts` - Memoize price extraction
- `app/MainStorePage.tsx` - Code splitting (later phase)
- `package.json` - Remove mongodb
- `components/bills/index.ts` - Remove demo exports

---

## Expected Impact

| Optimization | Load Time Reduction | Effort |
|--------------|---------------------|--------|
| FlatList + useMemo | 30-40% scroll perf | Low |
| Parallel API calls | 1-2s faster startup | Low |
| Context deferral | 200-400ms startup | Medium |
| Component lazy loading | 20-30% faster FCP | Medium |
| Memoization | 15-20% render perf | Low |
| Image preloading | Perceived speed | Low |
| Bundle cleanup | 100KB smaller | Low |

**Total Expected Improvement:** 40-50% faster initial load, significantly smoother scrolling

---

## Metrics to Track

Before/After measurements:
1. Time to First Contentful Paint (FCP)
2. Time to Interactive (TTI)
3. FlatList scroll frame rate (target: 60fps)
4. Bundle size (current vs optimized)
5. Memory usage during scrolling
