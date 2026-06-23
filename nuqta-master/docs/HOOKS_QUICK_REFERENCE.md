# MainStore Hooks - Quick Reference Card

## Import

```typescript
// Individual imports
import { useStoreData } from '@/hooks/useStoreData';
import { useStoreProducts } from '@/hooks/useStoreProducts';
import { useStorePromotions } from '@/hooks/useStorePromotions';
import { useProductFilters } from '@/hooks/useProductFilters';

// Centralized import
import {
  useStoreData,
  useStoreProducts,
  useStorePromotions,
  useProductFilters
} from '@/hooks/mainstore';
```

---

## 1. useStoreData

**Fetches store details by ID**

```typescript
const { data, loading, error, refetch } = useStoreData(storeId);
```

| Property | Type | Description |
|----------|------|-------------|
| `data` | `any \| null` | Store data object |
| `loading` | `boolean` | Loading state |
| `error` | `Error \| null` | Error object if failed |
| `refetch` | `() => Promise<void>` | Manually refetch data |

---

## 2. useStoreProducts

**Fetches products with filtering and pagination**

```typescript
const {
  products,
  loading,
  error,
  totalCount,
  hasMore,
  loadMore,
  applyFilters,
  clearFilters,
  activeFilters,
  refetch
} = useStoreProducts(storeId, 20);
```

| Property | Type | Description |
|----------|------|-------------|
| `products` | `any[]` | Array of products |
| `loading` | `boolean` | Loading state |
| `error` | `Error \| null` | Error object |
| `totalCount` | `number` | Total product count |
| `hasMore` | `boolean` | More products available? |
| `loadMore` | `() => Promise<void>` | Load next page |
| `applyFilters` | `(filters) => void` | Apply filters |
| `clearFilters` | `() => void` | Clear all filters |
| `activeFilters` | `ProductFilters` | Current filters |
| `refetch` | `() => Promise<void>` | Refetch from start |

### Filter Options

```typescript
applyFilters({
  category: 'electronics',
  priceRange: { min: 100, max: 500 },
  sortBy: 'price_low', // 'price_low' | 'price_high' | 'rating' | 'newest'
  searchQuery: 'laptop'
});
```

---

## 3. useStorePromotions

**Fetches store promotions**

```typescript
const { promotions, loading, error, refetch } = useStorePromotions(storeId);
```

| Property | Type | Description |
|----------|------|-------------|
| `promotions` | `any[]` | Array of promotions |
| `loading` | `boolean` | Loading state |
| `error` | `Error \| null` | Error object (non-critical) |
| `refetch` | `() => Promise<void>` | Manually refetch |

---

## 4. useProductFilters

**Manages filter state**

```typescript
const {
  filters,
  setCategory,
  setPriceRange,
  setSortBy,
  setSearchQuery,
  clearFilters,
  hasActiveFilters
} = useProductFilters();
```

| Property | Type | Description |
|----------|------|-------------|
| `filters` | `FilterState` | Current filter state |
| `setCategory` | `(cat: string \| null) => void` | Set category |
| `setPriceRange` | `(range \| null) => void` | Set price range |
| `setSortBy` | `(sort) => void` | Set sort option |
| `setSearchQuery` | `(query: string) => void` | Set search |
| `clearFilters` | `() => void` | Clear all |
| `hasActiveFilters` | `() => boolean` | Check if active |

---

## Complete Example

```typescript
import React from 'react';
import { View, FlatList, ActivityIndicator } from 'react-native';
import {
  useStoreData,
  useStoreProducts,
  useStorePromotions,
  useProductFilters
} from '@/hooks/mainstore';

export default function StorePage({ storeId }: { storeId: string }) {
  // Fetch data
  const { data: store, loading: storeLoading } = useStoreData(storeId);
  const {
    products,
    loading: productsLoading,
    hasMore,
    loadMore,
    applyFilters
  } = useStoreProducts(storeId, 20);
  const { promotions } = useStorePromotions(storeId);
  const { filters, setCategory, setSortBy, clearFilters } = useProductFilters();

  // Combined loading
  const loading = storeLoading || productsLoading;

  // Handle filter changes
  const handleFilter = (category: string) => {
    setCategory(category);
    applyFilters({ category });
  };

  const handleSort = (sortBy: 'price_low' | 'price_high') => {
    setSortBy(sortBy);
    applyFilters({ sortBy });
  };

  if (loading) return <ActivityIndicator />;

  return (
    <View>
      {/* Store Header */}
      <StoreHeader store={store} />

      {/* Promotions */}
      {promotions.map(promo => (
        <PromotionBanner key={promo.id} promotion={promo} />
      ))}

      {/* Filters */}
      <FilterBar
        onCategoryChange={handleFilter}
        onSortChange={handleSort}
        onClear={clearFilters}
      />

      {/* Products */}
      <FlatList
        data={products}
        renderItem={({ item }) => <ProductCard product={item} />}
        onEndReached={hasMore ? loadMore : undefined}
        onEndReachedThreshold={0.5}
      />
    </View>
  );
}
```

---

## Error Handling

All hooks handle errors automatically and report to `errorReporter`. Access errors via the `error` property:

```typescript
const { data, loading, error, refetch } = useStoreData(storeId);

if (error) {
  return (
    <ErrorView
      message={error.message}
      onRetry={refetch}
    />
  );
}
```

---

## Performance Tips

1. **Pagination**: Use `loadMore()` for infinite scroll
2. **Filter debouncing**: Implement in UI layer
3. **Memoization**: Hook callbacks already memoized
4. **Conditional fetching**: Hooks only fetch when ID exists

---

## Common Patterns

### Pattern 1: Filter + Fetch
```typescript
const { applyFilters } = useStoreProducts(storeId);
const { setCategory } = useProductFilters();

const handleCategoryChange = (cat: string) => {
  setCategory(cat);
  applyFilters({ category: cat });
};
```

### Pattern 2: Load More
```typescript
const { products, hasMore, loadMore, loading } = useStoreProducts(storeId);

<FlatList
  data={products}
  onEndReached={hasMore && !loading ? loadMore : undefined}
/>
```

### Pattern 3: Combined Loading
```typescript
const { loading: storeLoading } = useStoreData(storeId);
const { loading: productsLoading } = useStoreProducts(storeId);
const loading = storeLoading || productsLoading;
```

### Pattern 4: Clear All
```typescript
const { clearFilters: clearProductFilters } = useProductFilters();
const { clearFilters: resetProducts } = useStoreProducts(storeId);

const handleReset = () => {
  clearProductFilters();
  resetProducts();
};
```

---

## TypeScript Types

```typescript
// Product Filters
interface ProductFilters {
  category?: string;
  priceRange?: { min: number; max: number };
  sortBy?: 'price_low' | 'price_high' | 'rating' | 'newest';
  searchQuery?: string;
}

// Filter State
interface FilterState {
  category: string | null;
  priceRange: { min: number; max: number } | null;
  sortBy: 'price_low' | 'price_high' | 'rating' | 'newest' | null;
  searchQuery: string;
}
```

---

**For detailed documentation, see**: `MAINSTORE_HOOKS_GUIDE.md`
