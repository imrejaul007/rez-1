# Phase 3.3: Enhanced Empty/Error States & Mobile Optimizations - Integration Guide

## Overview

This guide shows how to integrate the newly created empty/error state components and mobile optimizations into the MainStorePage and other pages.

---

## 📦 Components Created

### State Components (in `components/common/`)

1. **EmptyState.tsx** - Generic empty state with customizable icon, message, and action
2. **ErrorState.tsx** - Enhanced error display with retry functionality
3. **EmptyProducts.tsx** - Specialized empty state for product listings

### Mobile Components (in `components/common/`)

4. **BottomSheet.tsx** - Mobile-optimized modal that slides from bottom
5. **SafeAreaContainer.tsx** - Safe area handling for notches and device UI

### Product Components (in `components/product/`)

6. **ResponsiveProductGrid.tsx** - Auto-adjusting product grid with FlatList

### Hooks (in `hooks/`)

7. **useResponsiveGrid.ts** - Calculate responsive grid layout

### Export Files

8. **components/common/states.ts** - Export index for state components
9. **components/common/mobile.ts** - Export index for mobile components
10. **hooks/index.ts** - Export index for hooks

---

## 🚀 Integration Examples

### 1. Using Empty/Error States in MainStorePage

```typescript
// app/MainStorePage.tsx
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { EmptyProducts, ErrorState } from '@/components/common/states';

export default function MainStorePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [products, setProducts] = useState([]);
  const [hasActiveFilters, setHasActiveFilters] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch products logic
      const data = await api.getProducts();
      setProducts(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setHasActiveFilters(false);
    // Clear filter logic
    fetchProducts();
  };

  if (loading) {
    return <ActivityIndicator size="large" />;
  }

  if (error) {
    return (
      <ErrorState
        error={error}
        onRetry={fetchProducts}
        title="Failed to Load Store"
      />
    );
  }

  if (products.length === 0) {
    return (
      <EmptyProducts
        hasFilters={hasActiveFilters}
        onClearFilters={clearFilters}
      />
    );
  }

  return (
    <View>
      {/* Product list rendering */}
    </View>
  );
}
```

### 2. Using ResponsiveProductGrid

```typescript
// app/MainStorePage.tsx
import React from 'react';
import ResponsiveProductGrid from '@/components/product/ResponsiveProductGrid';
import ProductCard from '@/components/MainStoreSection/ProductCard';

export default function MainStorePage() {
  const [products, setProducts] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadMoreProducts = () => {
    if (!loadingMore) {
      setLoadingMore(true);
      // Fetch more products
    }
  };

  return (
    <ResponsiveProductGrid
      products={products}
      renderProduct={(product, width) => (
        <ProductCard
          product={product}
          width={width}
          onPress={() => navigateToProduct(product.id)}
        />
      )}
      onEndReached={loadMoreProducts}
      minCardWidth={150}
      gap={16}
      ListEmptyComponent={<EmptyProducts />}
      isLoadingMore={loadingMore}
    />
  );
}
```

### 3. Using BottomSheet for Filters

```typescript
// app/MainStorePage.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { BottomSheet } from '@/components/common/mobile';
import FilterContent from '@/components/filters/FilterContent';

export default function MainStorePage() {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <View>
      <TouchableOpacity onPress={() => setShowFilters(true)}>
        <Text>Show Filters</Text>
      </TouchableOpacity>

      <BottomSheet
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        title="Filter Options"
        snapPoints={['75%']}
        scrollable={true}
      >
        <FilterContent onApply={() => setShowFilters(false)} />
      </BottomSheet>
    </View>
  );
}
```

### 4. Using SafeAreaContainer

```typescript
// app/MainStorePage.tsx
import React from 'react';
import { SafeAreaContainer } from '@/components/common/mobile';
import { COLORS } from '@/constants/DesignTokens';

export default function MainStorePage() {
  return (
    <SafeAreaContainer
      edges={['top', 'bottom']}
      backgroundColor={COLORS.background.primary}
    >
      {/* Your page content */}
    </SafeAreaContainer>
  );
}
```

### 5. Using useResponsiveGrid Hook

```typescript
// components/custom/CustomProductList.tsx
import React from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { useResponsiveGrid } from '@/hooks';
import { SPACING } from '@/constants/DesignTokens';

export default function CustomProductList({ products }) {
  const { numColumns, cardWidth, gap } = useResponsiveGrid(150, SPACING.md);

  return (
    <FlatList
      data={products}
      numColumns={numColumns}
      key={numColumns}
      renderItem={({ item }) => (
        <View style={{ width: cardWidth, padding: gap / 2 }}>
          <ProductCard product={item} />
        </View>
      )}
    />
  );
}
```

### 6. Custom Grid Configuration

```typescript
import { useResponsiveGridCustom } from '@/hooks';

// Inside component
const { numColumns, cardWidth } = useResponsiveGridCustom({
  xs: 1,  // 1 column on extra small screens
  sm: 2,  // 2 columns on small screens
  md: 3,  // 3 columns on medium screens
  lg: 4,  // 4 columns on large screens
  xl: 5,  // 5 columns on extra large screens
}, 16);
```

---

## 🎨 Design Token Usage

All components use design tokens from `constants/DesignTokens.ts`:

```typescript
import {
  SPACING,
  TYPOGRAPHY,
  COLORS,
  BORDER_RADIUS,
  SHADOWS,
  Z_INDEX,
  ANIMATION,
  LAYOUT,
} from '@/constants/DesignTokens';

// Examples:
const padding = SPACING.md; // 16
const textStyle = TYPOGRAPHY.h2;
const primaryColor = COLORS.primary[500];
const radius = BORDER_RADIUS.lg; // 12
const shadow = SHADOWS.md;
```

---

## 📱 Responsive Breakpoints

From `LAYOUT.breakpoints`:

- **xs**: 0px (Mobile portrait)
- **sm**: 576px (Mobile landscape)
- **md**: 768px (Tablets)
- **lg**: 992px (Desktop)
- **xl**: 1200px (Large desktop)
- **xxl**: 1400px (Extra large desktop)

---

## ♿ Accessibility Features

All components include:

- ✅ Proper `accessible` props
- ✅ `accessibilityRole` for semantic meaning
- ✅ `accessibilityLabel` for screen readers
- ✅ `accessibilityHint` for action guidance
- ✅ `accessibilityLiveRegion` for dynamic content

---

## 🔄 Import Patterns

### Recommended Imports

```typescript
// State components
import { EmptyState, ErrorState, EmptyProducts } from '@/components/common/states';

// Mobile components
import { BottomSheet, SafeAreaContainer } from '@/components/common/mobile';

// Hooks
import { useResponsiveGrid } from '@/hooks';

// Product components
import ResponsiveProductGrid from '@/components/product/ResponsiveProductGrid';
```

---

## 🧪 Testing Responsive Grid

To test the responsive grid on different screen sizes:

1. Use React Native Debugger's device selector
2. Test on physical devices with different screen sizes
3. Use Expo's web version and resize browser window
4. Test in landscape and portrait orientations

---

## 📊 Performance Optimizations

### ResponsiveProductGrid Optimizations

- ✅ `removeClippedSubviews` for better memory usage
- ✅ `maxToRenderPerBatch` limits render batch size
- ✅ `windowSize` controls viewport rendering
- ✅ `initialNumToRender` optimizes initial load
- ✅ `keyExtractor` for efficient list updates

### BottomSheet Optimizations

- ✅ Native driver animations for 60fps
- ✅ Spring animations for natural feel
- ✅ Proper cleanup on unmount

---

## 🐛 Common Issues & Solutions

### Issue: Grid not updating on screen rotation

**Solution**: The `key={numColumns}` prop forces FlatList re-render when columns change.

### Issue: Bottom sheet backdrop not dismissing

**Solution**: Ensure `onRequestClose` is set in Modal and `onPress` is set on backdrop Pressable.

### Issue: Safe area not working

**Solution**: Ensure `SafeAreaProvider` is wrapped around your app root (already in `app/_layout.tsx`).

---

## 📝 Additional Empty States

You can create more specific empty states following the same pattern:

```typescript
// components/common/EmptyOrders.tsx
import React from 'react';
import EmptyState from './EmptyState';

export default function EmptyOrders({ onBrowseProducts }) {
  return (
    <EmptyState
      icon="🛒"
      title="No Orders Yet"
      message="Start shopping to see your orders here"
      actionLabel="Browse Products"
      onAction={onBrowseProducts}
    />
  );
}
```

---

## ✅ Checklist for Integration

- [ ] Import state components where needed
- [ ] Replace loading states with proper components
- [ ] Add error boundaries with ErrorState
- [ ] Implement ResponsiveProductGrid for product lists
- [ ] Use BottomSheet for mobile filters/modals
- [ ] Wrap pages in SafeAreaContainer
- [ ] Test on different screen sizes
- [ ] Verify accessibility features
- [ ] Test error and empty states
- [ ] Optimize FlatList performance settings

---

## 🎯 Next Steps

1. Integrate components into MainStorePage
2. Test on multiple devices and screen sizes
3. Verify accessibility with screen readers
4. Measure performance improvements
5. Create additional specialized empty states as needed

---

## 📚 Related Documentation

- `constants/DesignTokens.ts` - Design system tokens
- `ACCESSIBILITY_QUICK_REFERENCE.md` - Accessibility guidelines
- `PERFORMANCE_OPTIMIZATION_GUIDE.md` - Performance best practices

---

**Created**: Phase 3.3 Implementation
**Components**: 10 files created
**Status**: Ready for integration ✅
