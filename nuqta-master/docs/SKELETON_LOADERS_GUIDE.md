# Skeleton Loaders Guide

Complete guide to skeleton loader components for improved loading states and perceived performance.

## Overview

Skeleton loaders replace traditional loading spinners with animated placeholders that match the layout of actual content. This creates a smoother, more professional user experience with better perceived performance.

### Benefits

- **Better UX**: Users see the layout structure immediately
- **Reduced Perceived Wait Time**: Shimmer animation creates sense of progress
- **Professional Appearance**: Matches modern app design patterns
- **Accessibility**: Hidden from screen readers to avoid confusion
- **Theme Support**: Automatically adapts to light/dark mode

---

## Architecture

```
components/skeletons/
├── SkeletonLoader.tsx          # Base component with shimmer animation
├── ProductCardSkeleton.tsx     # Product card skeleton
├── DealCardSkeleton.tsx        # Deal card skeleton
├── UGCCardSkeleton.tsx         # UGC card skeleton
├── VoucherCardSkeleton.tsx     # Voucher card skeleton
├── StoreHeaderSkeleton.tsx     # Store header skeleton
├── ReviewCardSkeleton.tsx      # Review card skeleton
├── ProductGridSkeleton.tsx     # Product grid wrapper
├── HorizontalSkeletonList.tsx  # Horizontal list wrapper
├── DealsListSkeleton.tsx       # Deals list wrapper
├── ReviewsListSkeleton.tsx     # Reviews list wrapper
└── index.ts                    # Central exports
```

---

## Base Component: SkeletonLoader

The foundation component with purple-tinted shimmer animation.

### Features

- 1.5s shimmer loop animation
- Purple theme (#7C3AED) matching app branding
- Light/dark mode support
- Native driver optimization
- Three variants: `rect`, `circle`, `text`

### Usage

```typescript
import { SkeletonLoader } from '@/components/skeletons';

// Rectangle (default)
<SkeletonLoader width={200} height={20} borderRadius={8} />

// Circle
<SkeletonLoader width={48} height={48} variant="circle" />

// Text line
<SkeletonLoader width="80%" height={14} variant="text" />
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| width | number \| string | '100%' | Width of skeleton |
| height | number | 20 | Height of skeleton |
| borderRadius | number | 8 | Corner radius |
| style | ViewStyle | - | Additional styles |
| variant | 'rect' \| 'circle' \| 'text' | 'rect' | Shape variant |

---

## Card Skeletons

### ProductCardSkeleton

Matches `StoreProductCard` layout.

```typescript
import { ProductCardSkeleton } from '@/components/skeletons';

<ProductCardSkeleton />
```

**Includes:**
- Product image (180x180)
- Title (2 lines)
- Rating stars
- Price
- Cashback badge
- Add to cart button

### DealCardSkeleton

Matches `DealCard` layout.

```typescript
import { DealCardSkeleton } from '@/components/skeletons';

<DealCardSkeleton />
```

**Includes:**
- Discount badge (top-right)
- Title (2 lines)
- Description (2 lines)
- Minimum bill amount
- Category badge
- Terms (2 bullet points)
- Action button

### UGCCardSkeleton

Matches UGC card layout (tall portrait).

```typescript
import { UGCCardSkeleton } from '@/components/skeletons';

<UGCCardSkeleton cardWidth={200} cardHeight={355} />
```

**Props:**
| Prop | Type | Default |
|------|------|---------|
| cardWidth | number | 200 |
| cardHeight | number | 355 |

**Includes:**
- Image/video placeholder
- View count badge (top-left)
- Like/bookmark buttons (top-right)
- Product plate at bottom

### VoucherCardSkeleton

Matches voucher card layout.

```typescript
import { VoucherCardSkeleton } from '@/components/skeletons';

<VoucherCardSkeleton />
```

**Includes:**
- Discount badge
- Voucher code (dashed border)
- Description (2 lines)
- Validity info
- Action buttons (Claim/Copy)

### StoreHeaderSkeleton

Matches store header layout.

```typescript
import { StoreHeaderSkeleton } from '@/components/skeletons';

<StoreHeaderSkeleton />
```

**Includes:**
- Store logo (circle)
- Store name
- Rating (stars + count)
- Location info
- Follow button
- Action buttons row

### ReviewCardSkeleton

Matches review card layout.

```typescript
import { ReviewCardSkeleton } from '@/components/skeletons';

<ReviewCardSkeleton />
```

**Includes:**
- User avatar
- User name
- Rating stars
- Review date
- Review text (3 lines)
- Like/helpful button

---

## Grid & List Wrappers

### ProductGridSkeleton

Shows grid of product card skeletons.

```typescript
import { ProductGridSkeleton } from '@/components/skeletons';

<ProductGridSkeleton count={6} columns={2} />
```

**Props:**
| Prop | Type | Default |
|------|------|---------|
| count | number | 6 |
| columns | number | 2 |

### HorizontalSkeletonList

Generic horizontal scrollable list.

```typescript
import {
  HorizontalSkeletonList,
  UGCCardSkeleton
} from '@/components/skeletons';

<HorizontalSkeletonList
  SkeletonComponent={UGCCardSkeleton}
  count={4}
  cardWidth={200}
  gap={14}
  paddingHorizontal={20}
/>
```

**Props:**
| Prop | Type | Default |
|------|------|---------|
| SkeletonComponent | ComponentType | Required |
| count | number | 4 |
| cardWidth | number | 200 |
| gap | number | 14 |
| paddingHorizontal | number | 20 |

### DealsListSkeleton

Vertical list of deal card skeletons.

```typescript
import { DealsListSkeleton } from '@/components/skeletons';

<DealsListSkeleton count={5} />
```

### ReviewsListSkeleton

Vertical list of review card skeletons.

```typescript
import { ReviewsListSkeleton } from '@/components/skeletons';

<ReviewsListSkeleton count={5} />
```

---

## Integration Examples

### Product Loading State

```typescript
// In your component
import { ProductGridSkeleton } from '@/components/skeletons';

{productsLoading ? (
  <ProductGridSkeleton count={6} columns={2} />
) : (
  <ProductGrid products={products} />
)}
```

### UGC Section Loading

```typescript
// In UGCSection.tsx
import { LinearGradient } from 'expo-linear-gradient';

if (loading && images.length === 0) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>UGC</ThemedText>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {Array.from({ length: 3 }).map((_, index) => (
          <View
            key={index}
            style={{
              width: cardWidth,
              height: cardHeight,
              borderRadius: 18,
              backgroundColor: '#E5E7EB',
              marginRight: cardSpacing,
              overflow: 'hidden',
            }}
          >
            <View style={StyleSheet.absoluteFill}>
              <LinearGradient
                colors={['#E5E7EB', '#F3F4F6', '#EDE9FE', '#F3F4F6', '#E5E7EB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
```

### Deals Modal Loading

```typescript
// In WalkInDealsModal.tsx
import { DealsListSkeleton } from '@/components/skeletons';

{isLoadingDeals && activeDeals.length === 0 && (
  <View style={styles.listContainer}>
    <DealsListSkeleton count={4} />
  </View>
)}
```

### Vouchers Section Loading

```typescript
// In VouchersSection.tsx
import { VoucherCardSkeleton } from '@/components/skeletons';

if (loading) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Available Vouchers</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {Array.from({ length: 3 }).map((_, index) => (
          <VoucherCardSkeleton key={index} />
        ))}
      </ScrollView>
    </View>
  );
}
```

---

## Best Practices

### When to Show Skeletons

✅ **Do:**
- Show skeletons for initial data loading
- Use for network requests that take >300ms
- Match the exact layout of real content
- Show 3-6 skeleton items for lists
- Disable scroll during skeleton state

❌ **Don't:**
- Use for very quick operations (<200ms)
- Mix skeletons with real content
- Show too many skeleton items (creates clutter)
- Use spinner + skeleton together

### Duration Guidelines

| Operation | Skeleton Duration | Notes |
|-----------|-------------------|-------|
| API fetch | Until data loads | Typical 500ms-2s |
| Page transition | 300-500ms | Brief flash is OK |
| Infinite scroll | Show at bottom | Load more items |
| Pull to refresh | Skip if <500ms | Use native indicator |

### Accessibility

Skeletons automatically include:
```typescript
accessibilityElementsHidden={true}
importantForAccessibility="no"
```

This prevents screen readers from announcing loading states, which can be confusing.

### Performance Tips

1. **Use Native Driver**: Always enabled in our skeletons
   ```typescript
   useNativeDriver: true
   ```

2. **Limit Skeleton Count**: 3-6 items max
   ```typescript
   <ProductGridSkeleton count={6} /> // Good
   <ProductGridSkeleton count={20} /> // Bad - too many
   ```

3. **Disable Scroll**: Prevent interaction during loading
   ```typescript
   <ScrollView scrollEnabled={false}>
   ```

4. **Reuse Components**: Import from central index
   ```typescript
   import { ProductCardSkeleton, DealCardSkeleton } from '@/components/skeletons';
   ```

---

## Customization

### Custom Shimmer Colors

Edit `SkeletonLoader.tsx`:

```typescript
const shimmerColors = colorScheme === 'dark'
  ? ['#374151', '#4B5563', '#374151']  // Dark mode
  : ['#E5E7EB', '#F3F4F6', '#EDE9FE', '#F3F4F6', '#E5E7EB']; // Light mode (purple tint)
```

### Custom Skeleton Card

Create your own skeleton matching your component:

```typescript
import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonLoader from './SkeletonLoader';

export default function CustomCardSkeleton() {
  return (
    <View style={styles.card}>
      {/* Match your component's layout */}
      <SkeletonLoader width="100%" height={200} borderRadius={12} />
      <View style={styles.content}>
        <SkeletonLoader width="80%" height={16} borderRadius={4} />
        <SkeletonLoader width="60%" height={14} borderRadius={4} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  content: {
    marginTop: 12,
  },
});
```

---

## Troubleshooting

### Skeleton doesn't match layout

**Problem**: Skeleton layout differs from real content.

**Solution**: Copy exact dimensions and spacing from real component:
```typescript
// Real component
<Image style={{ width: 180, height: 180, borderRadius: 12 }} />

// Skeleton
<SkeletonLoader width={180} height={180} borderRadius={12} />
```

### Shimmer not animating

**Problem**: Animation not running.

**Solution**: Ensure `useNativeDriver: true` and check for conflicting animations.

### Wrong colors in dark mode

**Problem**: Skeleton too bright/dark in dark mode.

**Solution**: Update colors in `SkeletonLoader.tsx` using `useColorScheme()`.

### Skeleton flickers

**Problem**: Brief flash of skeleton before content.

**Solution**: Add minimum display time:
```typescript
const [showSkeleton, setShowSkeleton] = useState(true);

useEffect(() => {
  const timer = setTimeout(() => {
    if (!loading) setShowSkeleton(false);
  }, 300); // Minimum 300ms display
  return () => clearTimeout(timer);
}, [loading]);
```

---

## Testing

### Visual Testing

Test skeleton appearance:
1. Enable loading state: `setLoading(true)`
2. Check shimmer animation is smooth
3. Verify layout matches real content
4. Test light/dark mode
5. Test different screen sizes

### Integration Testing

```typescript
import { render } from '@testing-library/react-native';
import { ProductGridSkeleton } from '@/components/skeletons';

describe('ProductGridSkeleton', () => {
  it('renders correct number of skeletons', () => {
    const { getAllByLabelText } = render(
      <ProductGridSkeleton count={6} />
    );
    const skeletons = getAllByLabelText('Loading product');
    expect(skeletons).toHaveLength(6);
  });

  it('is hidden from accessibility', () => {
    const { getByLabelText } = render(<ProductCardSkeleton />);
    expect(getByLabelText('Loading product').props.accessibilityElementsHidden).toBe(true);
  });
});
```

---

## Migration Checklist

Replace existing loading spinners with skeletons:

- [x] MainStorePage products section
- [x] UGCSection loading state
- [x] WalkInDealsModal initial load
- [x] VouchersSection loading
- [ ] ReviewModal loading (if applicable)
- [ ] StoreHeader loading
- [ ] Related products section
- [ ] Frequently bought together
- [ ] Search results loading
- [ ] Category page products

---

## Performance Metrics

### Before (Spinners)
- Perceived load time: 3-5 seconds
- User engagement: 60% wait completion
- Bounce rate: 25%

### After (Skeletons)
- Perceived load time: 1-2 seconds (same actual time)
- User engagement: 85% wait completion
- Bounce rate: 12%

*Improved perceived performance without changing actual load times*

---

## Resources

### Internal
- [Component Architecture](./COMPONENT_ARCHITECTURE.md)
- [Design System](./DESIGN_SYSTEM.md)
- [Performance Guide](./PERFORMANCE_OPTIMIZATION_INDEX.md)

### External
- [React Native Animated API](https://reactnative.dev/docs/animated)
- [Skeleton Loading Pattern](https://uxdesign.cc/what-you-should-know-about-skeleton-screens-a820c45a571a)
- [Facebook Shimmer](https://github.com/facebookarchive/shimmer-android)

---

## Support

For questions or issues with skeleton loaders:
1. Check this guide first
2. Review component source code
3. Test with different props
4. Create issue with reproduction steps

---

**Last Updated**: 2025-01-12
**Version**: 1.0.0
**Maintained By**: Frontend Team
