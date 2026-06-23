# MainStorePage - Complete Integration Example

This is a complete example showing how to integrate all Phase 3.3 components into the MainStorePage.

## Complete Implementation

```typescript
/**
 * app/MainStorePage.tsx
 */

import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

// State Components
import { EmptyProducts, ErrorState } from '@/components/common/states';

// Mobile Components
import { BottomSheet, SafeAreaContainer } from '@/components/common/mobile';

// Product Components
import ResponsiveProductGrid from '@/components/product/ResponsiveProductGrid';
import ProductCard from '@/components/MainStoreSection/ProductCard';
import LoadingSpinner from '@/components/common/LoadingSpinner';

// Design Tokens
import { SPACING, COLORS, TYPOGRAPHY } from '@/constants/DesignTokens';

// API
import { getStoreProducts } from '@/services/storesApi';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
}

export default function MainStorePage() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const storeId = params.id as string;

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [filters, setFilters] = useState({
    category: 'all',
    priceRange: [0, 1000],
    sortBy: 'popular',
  });
  const [showFilters, setShowFilters] = useState(false);

  // Check if filters are active
  const hasActiveFilters = () => {
    return (
      filters.category !== 'all' ||
      filters.priceRange[0] > 0 ||
      filters.priceRange[1] < 1000 ||
      filters.sortBy !== 'popular'
    );
  };

  // Fetch products
  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getStoreProducts(storeId, {
        category: filters.category,
        minPrice: filters.priceRange[0],
        maxPrice: filters.priceRange[1],
        sortBy: filters.sortBy,
      });

      setProducts(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      category: 'all',
      priceRange: [0, 1000],
      sortBy: 'popular',
    });
  };

  // Initial load
  useEffect(() => {
    fetchProducts();
  }, [storeId, filters]);

  // Render product card
  const renderProduct = (product: Product, width: number) => (
    <ProductCard
      product={product}
      width={width}
      onPress={() => router.push(`/product/${product.id}`)}
    />
  );

  // Loading state
  if (loading) {
    return (
      <SafeAreaContainer edges={['top', 'bottom']}>
        <View style={styles.centerContainer}>
          <LoadingSpinner size="large" />
        </View>
      </SafeAreaContainer>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaContainer edges={['top', 'bottom']}>
        <ErrorState
          error={error}
          onRetry={fetchProducts}
          title="Failed to Load Store"
        />
      </SafeAreaContainer>
    );
  }

  // Empty state
  if (products.length === 0) {
    return (
      <SafeAreaContainer edges={['top', 'bottom']}>
        <EmptyProducts
          hasFilters={hasActiveFilters()}
          onClearFilters={clearFilters}
        />
      </SafeAreaContainer>
    );
  }

  // Main content
  return (
    <SafeAreaContainer edges={['top', 'bottom']}>
      <View style={styles.container}>
        {/* Header with Filter Button */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Products</Text>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilters(true)}
          >
            <Text style={styles.filterButtonText}>Filters</Text>
            {hasActiveFilters() && <View style={styles.filterBadge} />}
          </TouchableOpacity>
        </View>

        {/* Product Grid */}
        <ResponsiveProductGrid
          products={products}
          renderProduct={renderProduct}
          minCardWidth={150}
          gap={SPACING.md}
        />

        {/* Filter Bottom Sheet */}
        <BottomSheet
          visible={showFilters}
          onClose={() => setShowFilters(false)}
          title="Filter Options"
          snapPoints={['75%']}
        >
          <FilterContent
            filters={filters}
            onApply={(newFilters) => {
              setFilters(newFilters);
              setShowFilters(false);
            }}
            onClear={() => {
              clearFilters();
              setShowFilters(false);
            }}
          />
        </BottomSheet>
      </View>
    </SafeAreaContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  headerTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
  },
  filterButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.primary[50],
    borderRadius: 8,
  },
  filterButtonText: {
    ...TYPOGRAPHY.buttonSmall,
    color: COLORS.primary[600],
  },
  filterBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.error[500],
    position: 'absolute',
    top: 4,
    right: 4,
  },
});
```

## Filter Content Component

Create this in `components/filters/FilterContent.tsx`:

```typescript
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react';
import { SPACING, TYPOGRAPHY, COLORS } from '@/constants/DesignTokens';

interface FilterContentProps {
  filters: any;
  onApply: (filters: any) => void;
  onClear: () => void;
}

export default function FilterContent({ filters, onApply, onClear }: FilterContentProps) {
  const [localFilters, setLocalFilters] = useState(filters);

  return (
    <View style={styles.container}>
      {/* Category Filter */}
      <View style={styles.section}>
        <Text style={styles.label}>Category</Text>
        {/* Add your category selection UI */}
      </View>

      {/* Price Range Filter */}
      <View style={styles.section}>
        <Text style={styles.label}>Price Range</Text>
        {/* Add your price range slider UI */}
      </View>

      {/* Sort By Filter */}
      <View style={styles.section}>
        <Text style={styles.label}>Sort By</Text>
        {/* Add your sort options UI */}
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.clearButton} onPress={onClear}>
          <Text style={styles.clearText}>Clear All</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.applyButton} onPress={() => onApply(localFilters)}>
          <Text style={styles.applyText}>Apply Filters</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  label: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.xl,
  },
  clearButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.neutral[100],
    borderRadius: 8,
    alignItems: 'center',
  },
  clearText: {
    ...TYPOGRAPHY.button,
    color: COLORS.text.secondary,
  },
  applyButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.primary[500],
    borderRadius: 8,
    alignItems: 'center',
  },
  applyText: {
    ...TYPOGRAPHY.button,
    color: COLORS.text.inverse,
  },
});
```

## Key Features Demonstrated

1. ✅ **Loading State** - Shows spinner while fetching
2. ✅ **Error State** - Shows error with retry button
3. ✅ **Empty State** - Shows context-aware empty message
4. ✅ **Responsive Grid** - Auto-adjusts to screen size
5. ✅ **Bottom Sheet** - Mobile-optimized filter modal
6. ✅ **Safe Area** - Handles device notches/UI
7. ✅ **Filter Badge** - Shows when filters are active
8. ✅ **Design Tokens** - Consistent styling throughout

## Usage Notes

- Copy relevant sections into your actual MainStorePage implementation
- Customize the FilterContent component with your actual filter UI
- Adjust ProductCard props based on your implementation
- Add additional states (loading more, refreshing) as needed
