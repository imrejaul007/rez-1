# MainStorePage Custom Hooks - Implementation Guide

## Overview

This guide documents the custom hooks created for Phase 2.1 of the MainStorePage optimization plan. These hooks extract data fetching and state management logic from the component, making it cleaner, more maintainable, and reusable.

## Created Hooks

### 1. `useStoreData` - Store Information Fetching

**Location**: `hooks/useStoreData.ts`

**Purpose**: Fetches and manages store details by store ID

**Returns**:
```typescript
{
  data: any | null;           // Store data object
  loading: boolean;           // Loading state
  error: Error | null;        // Error state
  refetch: () => Promise<void>; // Manual refetch function
}
```

**Usage Example**:
```typescript
import { useStoreData } from '@/hooks/useStoreData';

function StoreDetailsPage() {
  const storeId = 'store-123';
  const { data: store, loading, error, refetch } = useStoreData(storeId);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} onRetry={refetch} />;

  return <StoreDetails store={store} />;
}
```

**Features**:
- Automatic fetching on mount and when storeId changes
- Built-in error handling with errorReporter integration
- Manual refetch capability
- Loading state management

---

### 2. `useStoreProducts` - Products with Filtering & Pagination

**Location**: `hooks/useStoreProducts.ts`

**Purpose**: Fetches and manages store products with filtering, sorting, and pagination

**Returns**:
```typescript
{
  products: any[];                          // Array of products
  loading: boolean;                         // Loading state
  error: Error | null;                      // Error state
  totalCount: number;                       // Total product count
  hasMore: boolean;                         // Pagination flag
  loadMore: () => Promise<void>;            // Load next page
  applyFilters: (filters) => void;          // Apply filters
  clearFilters: () => void;                 // Clear all filters
  activeFilters: ProductFilters;            // Current filters
  refetch: () => Promise<void>;             // Manual refetch
}
```

**Filter Options**:
```typescript
interface ProductFilters {
  category?: string;
  priceRange?: { min: number; max: number };
  sortBy?: 'price_low' | 'price_high' | 'rating' | 'newest';
  searchQuery?: string;
}
```

**Usage Example**:
```typescript
import { useStoreProducts } from '@/hooks/useStoreProducts';

function ProductsPage() {
  const storeId = 'store-123';
  const {
    products,
    loading,
    hasMore,
    loadMore,
    applyFilters,
    clearFilters,
    activeFilters
  } = useStoreProducts(storeId, 20); // 20 products per page

  const handleCategoryFilter = (category: string) => {
    applyFilters({ category });
  };

  const handleSortChange = (sortBy: 'price_low' | 'price_high') => {
    applyFilters({ sortBy });
  };

  return (
    <View>
      <FilterControls
        onCategoryChange={handleCategoryFilter}
        onSortChange={handleSortChange}
        onClear={clearFilters}
        activeFilters={activeFilters}
      />

      <FlatList
        data={products}
        renderItem={({ item }) => <ProductCard product={item} />}
        onEndReached={hasMore ? loadMore : undefined}
        ListFooterComponent={loading ? <LoadingSpinner /> : null}
      />
    </View>
  );
}
```

**Features**:
- Infinite scroll pagination
- Multiple filter types (category, price, sort, search)
- Filter merging (apply multiple filters)
- Automatic refetch when filters change
- Error handling and reporting

---

### 3. `useStorePromotions` - Store Promotions & Offers

**Location**: `hooks/useStorePromotions.ts`

**Purpose**: Fetches and manages store promotions and special offers

**Returns**:
```typescript
{
  promotions: any[];              // Array of promotions
  loading: boolean;               // Loading state
  error: Error | null;            // Error state
  refetch: () => Promise<void>;   // Manual refetch
}
```

**Usage Example**:
```typescript
import { useStorePromotions } from '@/hooks/useStorePromotions';

function PromotionsSection({ storeId }: { storeId: string }) {
  const { promotions, loading, error, refetch } = useStorePromotions(storeId);

  if (loading) return <SkeletonLoader />;
  if (error) return null; // Promotions are optional, fail silently

  return (
    <View>
      {promotions.map(promo => (
        <PromotionCard key={promo.id} promotion={promo} />
      ))}
    </View>
  );
}
```

**Features**:
- Graceful error handling (non-critical)
- Automatic refetch on storeId change
- Multiple response format support
- Error reporting (warning level)

---

### 4. `useProductFilters` - Filter State Management

**Location**: `hooks/useProductFilters.ts`

**Purpose**: Manages product filter state with clean interface

**Returns**:
```typescript
{
  filters: FilterState;                        // Current filter state
  setCategory: (category: string | null) => void;
  setPriceRange: (range: {...} | null) => void;
  setSortBy: (sortBy: ...) => void;
  setSearchQuery: (query: string) => void;
  clearFilters: () => void;
  hasActiveFilters: () => boolean;
}
```

**Filter State**:
```typescript
interface FilterState {
  category: string | null;
  priceRange: { min: number; max: number } | null;
  sortBy: 'price_low' | 'price_high' | 'rating' | 'newest' | null;
  searchQuery: string;
}
```

**Usage Example**:
```typescript
import { useProductFilters } from '@/hooks/useProductFilters';

function FilterPanel() {
  const {
    filters,
    setCategory,
    setPriceRange,
    setSortBy,
    setSearchQuery,
    clearFilters,
    hasActiveFilters
  } = useProductFilters();

  return (
    <View>
      <SearchInput
        value={filters.searchQuery}
        onChangeText={setSearchQuery}
      />

      <CategoryPicker
        selected={filters.category}
        onSelect={setCategory}
      />

      <PriceRangeSlider
        value={filters.priceRange}
        onChange={setPriceRange}
      />

      <SortOptions
        selected={filters.sortBy}
        onSelect={setSortBy}
      />

      {hasActiveFilters() && (
        <Button title="Clear All Filters" onPress={clearFilters} />
      )}
    </View>
  );
}
```

**Features**:
- Clean individual filter setters
- Bulk clear functionality
- Active filter detection
- Memoized callbacks for performance

---

## Integration with MainStorePage

### Current Status

The hooks are **imported and documented** in `MainStorePage.tsx` but not actively used because the component currently uses static/mock data passed through navigation params.

### Future Integration (When Backend is Ready)

Replace the current static data logic with hook-based data fetching:

```typescript
export default function MainStorePage({ productId, initialProduct }: MainStorePageProps = {}) {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Extract storeId from params
  const storeId = params.storeId as string;

  // ✅ USE CUSTOM HOOKS FOR DATA FETCHING
  const {
    data: storeDetails,
    loading: storeLoading,
    error: storeError,
    refetch: refetchStore
  } = useStoreData(storeId);

  const {
    products,
    loading: productsLoading,
    loadMore,
    hasMore,
    applyFilters,
    clearFilters
  } = useStoreProducts(storeId, 20);

  const {
    promotions,
    loading: promotionsLoading
  } = useStorePromotions(storeId);

  const {
    filters,
    setCategory,
    setSortBy,
    clearFilters: clearProductFilters,
    hasActiveFilters
  } = useProductFilters();

  // Combined loading state
  const loading = storeLoading || productsLoading || promotionsLoading;

  // Handle errors
  if (storeError) {
    return <ErrorScreen error={storeError} onRetry={refetchStore} />;
  }

  // Show loading skeleton
  if (loading) {
    return <StorePageSkeleton />;
  }

  // Rest of component renders with real data
  return (
    <ThemedView>
      <StoreHeader store={storeDetails} />
      <ProductGrid
        products={products}
        onLoadMore={loadMore}
        hasMore={hasMore}
      />
      <PromotionsSection promotions={promotions} />
    </ThemedView>
  );
}
```

---

## Benefits

### 1. **Reduced Complexity**
- Extracted data fetching logic from component
- Cleaner component code focused on UI
- Easier to understand and maintain

### 2. **Reusability**
- Hooks can be used in other components
- `useStoreProducts` can be used in any product listing
- `useProductFilters` can be shared across pages

### 3. **Better Testing**
- Hooks can be tested independently
- Mock data easily injected
- Isolated state management

### 4. **Error Handling**
- Centralized error reporting
- Consistent error handling patterns
- Better user experience

### 5. **Performance**
- Optimized with useCallback and useMemo
- Prevent unnecessary re-renders
- Efficient data fetching

---

## Line Count Comparison

### Before (Original MainStorePage.tsx)
- **Total Lines**: 467 lines
- **State Management**: Mixed with UI logic
- **Data Fetching**: None (currently static)

### After (With Hooks)
- **MainStorePage.tsx**: 520 lines (with documentation comments)
- **Extracted Hooks**:
  - `useStoreData.ts`: 84 lines
  - `useStoreProducts.ts`: 197 lines
  - `useStorePromotions.ts`: 100 lines
  - `useProductFilters.ts`: 128 lines
- **Total Hook Lines**: 509 lines
- **Effective Component Lines**: ~400 lines (when hooks are actively used)

### When Fully Integrated
- MainStorePage will be **~300-350 lines** of pure UI logic
- All data management extracted to reusable hooks
- **30% reduction** in component complexity

---

## Testing Checklist

When integrating these hooks with real backend data:

- [ ] Store data loads correctly from API
- [ ] Products display with proper filtering
- [ ] Pagination (load more) works correctly
- [ ] Category filtering applies correctly
- [ ] Price range filtering works
- [ ] Sort options work (price low/high, rating, newest)
- [ ] Search query filters products
- [ ] Promotions display (or fail gracefully)
- [ ] Error states show proper messages
- [ ] Loading states work smoothly
- [ ] Refetch functionality works
- [ ] Filter clearing resets to initial state
- [ ] Multiple filters can be applied together
- [ ] Error reporting captures issues

---

## Migration Path

### Step 1: Test Hooks in Isolation
Create a test page to verify hooks work with real backend:

```typescript
// app/test-hooks.tsx
import { useStoreData, useStoreProducts } from '@/hooks';

export default function TestHooksPage() {
  const { data, loading, error } = useStoreData('real-store-id-here');

  if (loading) return <Text>Loading...</Text>;
  if (error) return <Text>Error: {error.message}</Text>;

  return <Text>{JSON.stringify(data, null, 2)}</Text>;
}
```

### Step 2: Gradual Integration
Start with one hook at a time:
1. First integrate `useStoreData`
2. Then `useStoreProducts`
3. Then `useStorePromotions`
4. Finally `useProductFilters`

### Step 3: Remove Static Data
Once all hooks are working, remove the static/mock data logic.

### Step 4: Verify All Features
Run through the testing checklist above.

---

## API Requirements

These hooks expect the following API endpoints to exist:

1. **Store Details**: `GET /api/stores/:storeId`
2. **Store Products**: `GET /api/products/store/:storeId?page=1&limit=20&category=...&sort=...`
3. **Store Promotions**: `GET /api/offers/store/:storeId`

Ensure these endpoints are implemented in the backend before full integration.

---

## Support

For questions or issues with these hooks:
1. Check this guide first
2. Review the hook source code (well-commented)
3. Test with backend API using test page
4. Check error logs in errorReporter

---

## Next Steps

1. ✅ Hooks created and ready to use
2. ⏳ Backend API endpoints need to be implemented
3. ⏳ Integration testing with real data
4. ⏳ Full migration from static to dynamic data
5. ⏳ Performance optimization and caching

---

**Created**: Phase 2.1 MainStorePage Optimization
**Status**: Ready for Integration
**Version**: 1.0.0
