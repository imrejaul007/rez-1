# Performance Optimization Guide

Comprehensive guide to performance optimizations implemented in the Rez app, including lazy loading, caching, and monitoring strategies.

---

## Table of Contents

1. [Overview](#overview)
2. [Lazy Loading](#lazy-loading)
3. [Caching Strategy](#caching-strategy)
4. [Image Optimization](#image-optimization)
5. [FlatList Optimization](#flatlist-optimization)
6. [Component Memoization](#component-memoization)
7. [Performance Monitoring](#performance-monitoring)
8. [State Persistence](#state-persistence)
9. [Best Practices](#best-practices)
10. [Benchmarking](#benchmarking)

---

## Overview

The Rez app implements multiple performance optimization strategies to ensure fast load times, smooth scrolling, and minimal API calls:

- **Lazy Loading**: Code splitting and on-demand component loading
- **Caching**: Multi-layer caching with TTL and compression
- **Image Optimization**: Progressive loading with blur placeholders
- **List Virtualization**: Optimized FlatList rendering
- **Memoization**: Prevent unnecessary re-renders
- **Performance Monitoring**: Track and optimize slow operations
- **State Persistence**: Auto-save critical state

### Key Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Initial Load Time | < 2s | TBD |
| Screen Transition | < 500ms | TBD |
| FlatList FPS | 60fps | TBD |
| API Cache Hit Rate | > 80% | TBD |
| Bundle Size | < 5MB | TBD |

---

## Lazy Loading

### Component Lazy Loading

**Location**: `utils/lazyLoad.tsx`

Lazy loading delays the loading of components until they're needed, reducing initial bundle size.

#### Basic Usage

```typescript
import { lazyLoad } from '@/utils/lazyLoad';

// Lazy load a component
const ProductPage = lazyLoad(
  () => import('@/app/ProductPage'),
  { componentName: 'ProductPage' }
);

// Use normally
<ProductPage productId={id} />
```

#### With Preload

```typescript
const ProductPage = lazyWithPreload(() => import('@/app/ProductPage'));

// Preload before navigation
const handleProductClick = () => {
  ProductPage.preload(); // Start loading in background
  router.push(`/product/${productId}`);
};
```

#### Platform-Specific Loading

```typescript
const MapComponent = lazyLoadPlatform({
  web: () => import('./MapWeb'),
  native: () => import('./MapNative'),
  default: () => import('./MapDefault'),
});
```

### Route-Based Code Splitting

**Update `app/_layout.tsx`** to lazy load heavy screens:

```typescript
import { lazyLoad } from '@/utils/lazyLoad';

const ProductPage = lazyLoad(() => import('./product/[id]'), {
  componentName: 'ProductPage',
});

const StorePage = lazyLoad(() => import('./MainStorePage'), {
  componentName: 'StorePage',
});

const CartPage = lazyLoad(() => import('./CartPage'), {
  componentName: 'CartPage',
});
```

### Preload Critical Routes

```typescript
import { preloadManager } from '@/utils/preloadManager';

// On app start
useEffect(() => {
  preloadManager.add({
    components: [
      () => import('@/app/MainStorePage'),
      () => import('@/app/ProductPage'),
    ],
    priority: 'high',
  });

  preloadManager.preloadAll();
}, []);
```

---

## Caching Strategy

### Cache Service

**Location**: `services/cacheService.ts`

Multi-layer caching with compression, TTL, and intelligent eviction.

#### Cache Layers

1. **Memory Cache**: Fast in-memory access
2. **AsyncStorage Cache**: Persistent storage with compression
3. **API Cache**: Cached API responses

#### Cache TTLs

```typescript
import { CacheTTL, CacheNamespace } from '@/services/cacheService';

// Pre-defined TTLs
CacheTTL.SHORT     // 2 minutes
CacheTTL.MEDIUM    // 5 minutes
CacheTTL.LONG      // 10 minutes
CacheTTL.VERY_LONG // 30 minutes
CacheTTL.HOUR      // 1 hour
CacheTTL.DAY       // 1 day
```

#### Basic Usage

```typescript
import cacheService from '@/services/cacheService';

// Set cache
await cacheService.set('products', productsData, {
  ttl: CacheTTL.MEDIUM,
  priority: 'high',
  compress: true,
});

// Get cache
const products = await cacheService.get('products');

// Invalidate cache
await cacheService.remove('products');

// Clear all cache
await cacheService.clear();
```

### Cached Query Hook

**Location**: `hooks/useCachedQuery.ts`

React Query-like hook with automatic caching.

#### Usage

```typescript
import { useCachedQuery } from '@/hooks/useCachedQuery';

const { data, loading, error, refetch } = useCachedQuery(
  ['products', storeId],
  () => productsApi.getProductsByStore(storeId),
  {
    cacheTime: 5 * 60 * 1000, // 5 minutes
    staleTime: 2 * 60 * 1000, // 2 minutes (stale-while-revalidate)
    priority: 'high',
  }
);
```

#### Stale-While-Revalidate

The hook implements stale-while-revalidate pattern:
1. Returns cached data immediately (if available)
2. Checks if data is stale (older than `staleTime`)
3. If stale, revalidates in background
4. Updates UI when fresh data arrives

#### Mutations with Cache Invalidation

```typescript
import { useCachedMutation } from '@/hooks/useCachedQuery';

const { mutate, loading } = useCachedMutation(
  (productId) => productsApi.deleteProduct(productId),
  {
    invalidateQueries: [
      ['products'],
      ['product', productId],
    ],
    onSuccess: () => {
      console.log('Product deleted!');
    },
  }
);
```

### Cache Strategy by Resource

| Resource | TTL | Priority | Notes |
|----------|-----|----------|-------|
| Store Details | 10 min | High | Rarely changes |
| Products List | 5 min | Medium | Moderate changes |
| Store Offers | 2 min | Medium | Frequently changes |
| UGC Content | 3 min | Medium | User-generated |
| User Profile | 15 min | High | Rarely changes |
| Categories | 30 min | Critical | Static content |
| Static Assets | 1 hour | Critical | Never changes |

---

## Image Optimization

### LazyImage Component

**Location**: `components/common/LazyImage.tsx`

Progressive image loading with blur placeholders.

#### Features

- Low-quality placeholder (LQIP)
- Blurhash support
- Fade-in animation
- Error fallback
- Automatic caching
- Preloading

#### Basic Usage

```typescript
import LazyImage from '@/components/common/LazyImage';

<LazyImage
  source={product.imageUrl}
  style={styles.image}
  blurhash="LGF5]+Yk^6#M@-5c,1J5@[or[Q6."
  fadeInDuration={300}
  useCache={true}
/>
```

#### For Lists (Optimized)

```typescript
import { LazyImageListItem } from '@/components/common/LazyImage';

<FlatList
  data={products}
  renderItem={({ item, index }) => (
    <LazyImageListItem
      index={index}
      source={item.imageUrl}
      loadOffset={5} // Load 5 items ahead
    />
  )}
/>
```

### Image Preloading

**Location**: `hooks/useImagePreload.ts`

Preload critical images on app start.

```typescript
import { useImagePreload } from '@/hooks/useImagePreload';

const { preload, isPreloading, progress } = useImagePreload();

useEffect(() => {
  const imageUrls = products.map(p => p.imageUrl);
  preload(imageUrls, { cache: true });
}, [products]);
```

### Image Optimization Checklist

- [ ] Use expo-image instead of React Native Image
- [ ] Implement progressive loading with blur placeholders
- [ ] Preload critical images on app start
- [ ] Cache images for offline access
- [ ] Use appropriate image sizes (thumbnails vs full size)
- [ ] Lazy load images outside viewport

---

## FlatList Optimization

### Optimization Checklist

#### 1. Set Proper Props

```typescript
<FlatList
  data={items}
  renderItem={renderItem}

  // Initial render
  initialNumToRender={5} // Only render first 5 items

  // Batch rendering
  maxToRenderPerBatch={10} // Render 10 items per batch
  updateCellsBatchingPeriod={50} // Batch updates every 50ms

  // Window size
  windowSize={5} // Render 5 screens worth of content

  // Performance
  removeClippedSubviews={true} // Android optimization

  // Fixed height optimization
  getItemLayout={getItemLayout} // If items have fixed height

  // Unique keys
  keyExtractor={item => item.id}
/>
```

#### 2. Memoize renderItem

```typescript
import { memo } from 'react';
import { memoListItem } from '@/utils/memoHelpers';

// Memoize item component
const ProductCard = memoListItem(({ product }) => (
  <View>
    <Text>{product.name}</Text>
  </View>
), 'ProductCard');

// Use memoized render function
const renderItem = useCallback(({ item }) => (
  <ProductCard product={item} />
), []);
```

#### 3. Fixed Height Items

```typescript
const ITEM_HEIGHT = 100;

const getItemLayout = (data, index) => ({
  length: ITEM_HEIGHT,
  offset: ITEM_HEIGHT * index,
  index,
});
```

#### 4. Avoid Inline Functions

```typescript
// Bad ❌
<FlatList
  renderItem={({ item }) => <View onPress={() => navigate(item.id)} />}
/>

// Good ✅
const handlePress = useCallback((id) => navigate(id), []);

const renderItem = useCallback(({ item }) => (
  <ProductCard product={item} onPress={handlePress} />
), [handlePress]);
```

### Infinite Scroll

**Location**: `hooks/useInfiniteScroll.ts`

```typescript
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

const { data, loadingMore, hasMore, fetchMore } = useInfiniteScroll(
  (page, pageSize) => productsApi.getProducts({ page, limit: pageSize }),
  {
    pageSize: 20,
    cacheKey: 'products',
  }
);

<FlatList
  data={data}
  onEndReached={fetchMore}
  onEndReachedThreshold={0.5}
  ListFooterComponent={loadingMore && <ActivityIndicator />}
/>
```

---

## Component Memoization

### Memo Helpers

**Location**: `utils/memoHelpers.ts`

Prevent unnecessary re-renders with smart memoization.

#### Shallow Comparison

```typescript
import { memoShallow } from '@/utils/memoHelpers';

const ProductCard = memoShallow(({ product, onPress }) => {
  return <View>...</View>;
}, 'ProductCard');
```

#### Deep Comparison

```typescript
import { memoDeep } from '@/utils/memoHelpers';

// Use only when necessary (expensive)
const ComplexComponent = memoDeep(({ complexData }) => {
  return <View>...</View>;
}, 'ComplexComponent');
```

#### Compare Specific Props

```typescript
import { memoProps } from '@/utils/memoHelpers';

// Only re-render if id or name changes
const ProductCard = memoProps(
  ({ product }) => <View>...</View>,
  ['id', 'name'],
  'ProductCard'
);
```

#### Ignore Specific Props

```typescript
import { memoIgnoreProps } from '@/utils/memoHelpers';

// Ignore callback props
const ProductCard = memoIgnoreProps(
  ({ product, onPress }) => <View>...</View>,
  ['onPress'],
  'ProductCard'
);
```

#### List Items

```typescript
import { memoListItem } from '@/utils/memoHelpers';

// Optimized for FlatList renderItem
const ProductCard = memoListItem(({ product, id }) => {
  return <View>...</View>;
}, 'ProductCard');
```

### useMemo and useCallback

```typescript
// Expensive calculations
const sortedProducts = useMemo(() => {
  return products.sort((a, b) => a.price - b.price);
}, [products]);

// Event handlers
const handlePress = useCallback((productId) => {
  router.push(`/product/${productId}`);
}, [router]);

// Object/Array props
const style = useMemo(() => ({
  width: 100,
  height: 100,
}), []);
```

---

## Performance Monitoring

### Performance Monitor

**Location**: `utils/performanceMonitor.ts`

Track and analyze app performance.

#### Track Screen Load

```typescript
import { useScreenPerformance } from '@/hooks/usePerformanceMetrics';

function ProductScreen() {
  useScreenPerformance({
    screenName: 'ProductScreen',
    metadata: { productId: route.params.id },
  });

  return <View>...</View>;
}
```

#### Track Component Performance

```typescript
import { usePerformanceMetrics } from '@/hooks/usePerformanceMetrics';

function ProductList() {
  const { trackInteraction, getRenderCount } = usePerformanceMetrics({
    componentName: 'ProductList',
    trackRenders: true,
    logSlowRenders: true,
  });

  const handleScroll = () => {
    const endTracking = trackInteraction('scroll');
    // ... scroll logic
    endTracking();
  };

  return <FlatList onScroll={handleScroll} />;
}
```

#### Track API Calls

```typescript
import { trackApiCall } from '@/utils/performanceMonitor';

async function fetchProducts() {
  const endTracking = trackApiCall('/products', 'GET');

  try {
    const data = await productsApi.getProducts();
    return data;
  } finally {
    endTracking();
  }
}
```

#### Generate Performance Report

```typescript
import { performanceMonitor } from '@/utils/performanceMonitor';

// Generate report
const report = performanceMonitor.generateReport();

console.log('Total metrics:', report.totalMetrics);
console.log('Average screen load:', report.averages.screenLoad);
console.log('Slowest operations:', report.slowest);
console.log('Recommendations:', report.recommendations);

// Or print formatted report
performanceMonitor.printReport();
```

### Performance Thresholds

| Metric | Threshold | Action |
|--------|-----------|--------|
| Screen Load | > 1000ms | Code splitting, lazy loading |
| API Response | > 2000ms | Caching, query optimization |
| Render Time | > 16ms | Memoization, virtualization |
| Interaction | > 100ms | Optimize event handlers |

---

## State Persistence

### Persisted State Hook

**Location**: `utils/persistedState.ts`

Auto-save state to AsyncStorage with debouncing.

#### Basic Usage

```typescript
import { usePersistedState } from '@/utils/persistedState';

const [cart, setCart] = usePersistedState({
  key: 'cart',
  defaultValue: [],
  debounceMs: 500,
});

// Use like normal useState
setCart([...cart, newItem]);
```

#### Pre-defined Hooks

```typescript
import {
  usePersistedCart,
  usePersistedWishlist,
  usePersistedRecentSearches,
  usePersistedPreferences,
} from '@/utils/persistedState';

const [cart, setCart] = usePersistedCart([]);
const [wishlist, setWishlist] = usePersistedWishlist([]);
const [searches, setSearches] = usePersistedRecentSearches([]);
const [prefs, setPrefs] = usePersistedPreferences({});
```

#### Form Drafts

```typescript
import { usePersistedFormDraft } from '@/utils/persistedState';

const [formData, setFormData, forceSave] = usePersistedFormDraft('checkout', {
  name: '',
  email: '',
  address: '',
});

// Force immediate save
await forceSave();
```

---

## Best Practices

### 1. Code Splitting

- Lazy load screens and heavy components
- Split by route for better granularity
- Preload critical routes on app start

### 2. Caching

- Cache API responses with appropriate TTL
- Implement stale-while-revalidate pattern
- Invalidate cache on mutations

### 3. Image Optimization

- Use progressive loading with blur placeholders
- Preload critical images
- Implement lazy loading for images in lists

### 4. List Performance

- Set proper FlatList props
- Memoize renderItem
- Use getItemLayout for fixed-height items
- Implement infinite scroll for long lists

### 5. Component Optimization

- Memoize expensive components
- Use useCallback for event handlers
- Use useMemo for expensive calculations
- Avoid inline functions and objects in render

### 6. Bundle Size

- Analyze bundle with `npx expo-cli bundle-analyze`
- Remove unused dependencies
- Use tree-shaking friendly imports
- Implement code splitting

### 7. Monitoring

- Track screen load times
- Monitor slow operations
- Generate performance reports
- Set up alerts for performance regressions

### 8. State Management

- Persist critical state (cart, wishlist)
- Debounce save operations
- Clear old persisted data

---

## Benchmarking

### Before Optimization

| Metric | Value |
|--------|-------|
| Initial Load | TBD |
| Screen Transition | TBD |
| FlatList FPS | TBD |
| API Calls/Session | TBD |
| Cache Hit Rate | 0% |
| Bundle Size | TBD |

### After Optimization

| Metric | Target | Actual | Improvement |
|--------|--------|--------|-------------|
| Initial Load | < 2s | TBD | TBD |
| Screen Transition | < 500ms | TBD | TBD |
| FlatList FPS | 60fps | TBD | TBD |
| API Calls/Session | < 50 | TBD | TBD |
| Cache Hit Rate | > 80% | TBD | TBD |
| Bundle Size | < 5MB | TBD | TBD |

### Performance Testing Checklist

- [ ] Measure initial load time on low-end device
- [ ] Test FlatList scrolling at 60fps
- [ ] Verify cache hit rate > 80%
- [ ] Check bundle size analysis
- [ ] Test offline functionality
- [ ] Measure memory usage
- [ ] Test on slow network (3G)

---

## Implementation Checklist

### Phase 1: Foundation ✅

- [x] Lazy loading utilities
- [x] Cache service
- [x] Cached query hook
- [x] Image preload hook
- [x] LazyImage component
- [x] Memo helpers
- [x] Performance monitor
- [x] State persistence

### Phase 2: Integration

- [ ] Update app/_layout.tsx with lazy routes
- [ ] Optimize FlatList in MainStorePage
- [ ] Optimize FlatList in UGCSection
- [ ] Optimize FlatList in CartPage
- [ ] Implement infinite scroll where needed
- [ ] Replace Image with LazyImage
- [ ] Add performance tracking to screens

### Phase 3: Optimization

- [ ] Analyze and reduce bundle size
- [ ] Implement service worker for web
- [ ] Add image compression
- [ ] Optimize API payload sizes
- [ ] Implement request batching

### Phase 4: Monitoring

- [ ] Set up performance metrics dashboard
- [ ] Create performance alerts
- [ ] Generate weekly reports
- [ ] A/B test optimizations

---

## Resources

- [React Native Performance](https://reactnative.dev/docs/performance)
- [FlatList Performance](https://reactnative.dev/docs/optimizing-flatlist-configuration)
- [Expo Image](https://docs.expo.dev/versions/latest/sdk/image/)
- [React Memo](https://react.dev/reference/react/memo)
- [AsyncStorage Best Practices](https://react-native-async-storage.github.io/async-storage/)

---

## Support

For questions or issues related to performance optimization:

1. Check this guide first
2. Review implementation examples in the codebase
3. Check the performance monitor reports
4. Contact the development team

**Last Updated**: 2025-11-12
