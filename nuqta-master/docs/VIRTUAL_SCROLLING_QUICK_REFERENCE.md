# Virtual Scrolling Quick Reference Guide

## 🚀 Quick Start

### Basic FlatList Product Grid Template

```typescript
import React, { useCallback, memo } from 'react';
import { FlatList, View, StyleSheet, ListRenderItemInfo } from 'react-native';

const ESTIMATED_CARD_HEIGHT = 280;

export const ProductGrid = memo(function ProductGrid({ products, onProductPress }) {
  const renderItem = useCallback(({ item }: ListRenderItemInfo<Product>) => (
    <ProductCard product={item} onPress={() => onProductPress(item)} />
  ), [onProductPress]);

  const keyExtractor = useCallback((item: Product) => item.id, []);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: ESTIMATED_CARD_HEIGHT,
    offset: ESTIMATED_CARD_HEIGHT * Math.floor(index / 2), // 2 columns
    index,
  }), []);

  return (
    <FlatList
      data={products}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={2}
      initialNumToRender={6}
      maxToRenderPerBatch={6}
      windowSize={3}
      removeClippedSubviews={true}
      getItemLayout={getItemLayout}
      scrollEnabled={false}
    />
  );
});
```

## ⚙️ Configuration Cheat Sheet

| Prop | Recommended Value | Why |
|------|-------------------|-----|
| `initialNumToRender` | 6 | 3 rows (2-col grid), fast initial load |
| `maxToRenderPerBatch` | 6 | Load 3 more rows per scroll batch |
| `windowSize` | 3 | Current screen + 1.5 above/below |
| `removeClippedSubviews` | true | Unmount off-screen (Android) |
| `getItemLayout` | Required | Pre-calculate positions |
| `scrollEnabled` | false | Parent ScrollView handles it |

## 📐 Card Height Estimation Guide

### How to Measure Your Card Height

1. **Method 1: Console Log**
```typescript
const ProductCard = ({ product }) => {
  const onLayout = (event) => {
    const { height } = event.nativeEvent.layout;
    console.log('Card height:', height);
  };

  return <View onLayout={onLayout}>...</View>;
};
```

2. **Method 2: Visual Inspection**
- Open React Native Debugger
- Inspect element heights
- Round to nearest 10px

3. **Common Card Heights**:
- Compact card: 180-220px
- Medium card: 250-280px
- Large card: 300-350px
- Store card with products: 380-420px

## 🎯 Performance Targets

| Device Tier | Target FPS | Max Memory | windowSize |
|-------------|-----------|------------|------------|
| Low-end | 50fps | 60MB | 3 |
| Mid-range | 58fps | 80MB | 3 |
| High-end | 60fps | 100MB | 5 |

## 🐛 Common Issues & Fixes

### Issue 1: Janky Scrolling
```typescript
// ❌ BAD: No memoization
const renderItem = ({ item }) => <ProductCard product={item} />;

// ✅ GOOD: Memoized
const renderItem = useCallback(({ item }) => (
  <ProductCard product={item} />
), []);
```

### Issue 2: Unnecessary Re-renders
```typescript
// ❌ BAD: Not memoized
export function ProductGrid({ products }) { ... }

// ✅ GOOD: Memoized
export const ProductGrid = memo(function ProductGrid({ products }) { ... });
```

### Issue 3: Slow Initial Load
```typescript
// ❌ BAD: Too many items
initialNumToRender={20}

// ✅ GOOD: Only visible items
initialNumToRender={6}
```

### Issue 4: High Memory Usage
```typescript
// ❌ BAD: Large window
windowSize={10}

// ✅ GOOD: Smaller window
windowSize={3}
```

### Issue 5: Jumpy Scrolling
```typescript
// ❌ BAD: No layout calculation
// (omit getItemLayout prop)

// ✅ GOOD: Pre-calculated layout
getItemLayout={(data, index) => ({
  length: CARD_HEIGHT,
  offset: CARD_HEIGHT * Math.floor(index / numColumns),
  index,
})}
```

## 📊 Performance Checklist

### Before Deployment
- [ ] Wrapped component in `React.memo`
- [ ] All callbacks use `useCallback`
- [ ] `initialNumToRender` ≤ 6
- [ ] `windowSize` ≤ 3 (mobile) or ≤ 5 (tablet)
- [ ] `getItemLayout` implemented
- [ ] `removeClippedSubviews={true}` on Android
- [ ] Tested on low-end device
- [ ] Profiled memory usage
- [ ] Verified 60fps scrolling
- [ ] No console warnings

## 🔍 Debugging Commands

### Profile Memory Usage
```bash
# Open React DevTools
npx react-devtools

# Navigate to Profiler → Record → Scroll → Stop
# Check "Ranked" view for render counts
```

### Monitor Frame Rate
```typescript
// In app, shake device → "Show Perf Monitor"
// Or programmatically:
import { PerformanceMonitor } from 'react-native-performance-monitor';

PerformanceMonitor.startMonitoring();
```

### Log Render Counts
```typescript
const renderCount = useRef(0);
useEffect(() => {
  renderCount.current += 1;
  console.log('Render count:', renderCount.current);
});
```

## 🎨 Advanced Patterns

### Pattern: Dynamic Column Count
```typescript
const getNumColumns = (width: number) => {
  if (width > 1024) return 4;  // Desktop
  if (width > 768) return 3;   // Tablet
  return 2;                     // Mobile
};

const numColumns = getNumColumns(screenWidth);

<FlatList
  key={numColumns}  // Force re-render on column change
  numColumns={numColumns}
  ...
/>
```

### Pattern: Infinite Scroll
```typescript
const handleEndReached = useCallback(() => {
  if (hasMore && !loading) {
    loadMoreProducts();
  }
}, [hasMore, loading, loadMoreProducts]);

<FlatList
  onEndReached={handleEndReached}
  onEndReachedThreshold={0.3}  // Trigger 30% from bottom
  ListFooterComponent={loading ? <Spinner /> : null}
  ...
/>
```

### Pattern: Pull to Refresh
```typescript
const [refreshing, setRefreshing] = useState(false);

const handleRefresh = useCallback(async () => {
  setRefreshing(true);
  await refetchProducts();
  setRefreshing(false);
}, [refetchProducts]);

<FlatList
  refreshing={refreshing}
  onRefresh={handleRefresh}
  ...
/>
```

## 📱 Device-Specific Optimization

### iOS
```typescript
<FlatList
  scrollEventThrottle={16}  // Smooth scroll events
  decelerationRate="fast"    // Natural iOS feel
  bounces={true}             // iOS bounce effect
  ...
/>
```

### Android
```typescript
<FlatList
  removeClippedSubviews={true}  // Critical for Android
  maxToRenderPerBatch={4}        // Slightly lower for Android
  ...
/>
```

## 🔧 Troubleshooting Decision Tree

```
Janky scrolling?
├─ Yes → Check memoization (memo, useCallback)
└─ No → High memory?
    ├─ Yes → Reduce windowSize (10 → 3)
    └─ No → Slow initial load?
        ├─ Yes → Reduce initialNumToRender (20 → 6)
        └─ No → Items jump during scroll?
            ├─ Yes → Add getItemLayout
            └─ No → All good! 🎉
```

## 📚 Additional Resources

### Modified Components
- `components/store-search/ProductGrid.tsx`
- `components/store/StoreProductGrid.tsx`
- `components/home-delivery/ProductGrid.tsx`
- `components/going-out/ProductGrid.tsx`
- `components/store-search/ProductCard.tsx`

### Documentation
- Full implementation: `PHASE2.2_VIRTUAL_SCROLLING_IMPLEMENTATION_COMPLETE.md`
- React Native FlatList: https://reactnative.dev/docs/flatlist
- Performance Guide: https://reactnative.dev/docs/performance

---

**Need Help?** Contact Agent 2 - Virtual Scrolling Specialist

*Last Updated: 2025-11-14*
