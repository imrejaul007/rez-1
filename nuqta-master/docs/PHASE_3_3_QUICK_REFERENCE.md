# Phase 3.3: Quick Reference Card

## 📦 Quick Import Reference

```typescript
// Empty & Error States
import { EmptyState, ErrorState, EmptyProducts } from '@/components/common/states';

// Mobile Components
import { BottomSheet, SafeAreaContainer } from '@/components/common/mobile';

// Product Grid
import ResponsiveProductGrid from '@/components/product/ResponsiveProductGrid';

// Hooks
import { useResponsiveGrid, useResponsiveGridCustom } from '@/hooks';
```

---

## 🔧 Quick Usage Examples

### EmptyState
```typescript
<EmptyState
  icon="📦"
  title="No Items"
  message="There's nothing here yet"
  actionLabel="Add Items"
  onAction={() => navigate('/add')}
/>
```

### ErrorState
```typescript
<ErrorState
  error={error}
  onRetry={refetch}
  title="Failed to Load"
/>
```

### EmptyProducts
```typescript
<EmptyProducts
  hasFilters={true}
  onClearFilters={clearFilters}
/>
```

### BottomSheet
```typescript
<BottomSheet
  visible={show}
  onClose={() => setShow(false)}
  title="Options"
  snapPoints={['50%']}
>
  <Content />
</BottomSheet>
```

### SafeAreaContainer
```typescript
<SafeAreaContainer edges={['top', 'bottom']}>
  <Content />
</SafeAreaContainer>
```

### ResponsiveProductGrid
```typescript
<ResponsiveProductGrid
  products={products}
  renderProduct={(product, width) => (
    <ProductCard product={product} width={width} />
  )}
  onEndReached={loadMore}
/>
```

### useResponsiveGrid Hook
```typescript
const { numColumns, cardWidth, gap } = useResponsiveGrid(150, 16);
```

---

## 🎨 Design Tokens Quick Reference

```typescript
import { SPACING, TYPOGRAPHY, COLORS } from '@/constants/DesignTokens';

// Spacing
SPACING.xs   // 4
SPACING.sm   // 8
SPACING.md   // 16
SPACING.lg   // 24
SPACING.xl   // 32

// Typography
TYPOGRAPHY.h1
TYPOGRAPHY.h2
TYPOGRAPHY.body
TYPOGRAPHY.button

// Colors
COLORS.primary[500]
COLORS.error[500]
COLORS.text.primary
COLORS.background.primary
```

---

## 📱 Breakpoints

```typescript
xs:   0px    // Mobile portrait
sm:   576px  // Mobile landscape
md:   768px  // Tablet
lg:   992px  // Desktop
xl:   1200px // Large desktop
xxl:  1400px // XL desktop
```

---

## ✅ Component Props Summary

### EmptyState Props
- `title` (string, required)
- `message` (string, required)
- `icon` (string, default: '📦')
- `imageSource` (ImageSource, optional)
- `actionLabel` (string, optional)
- `onAction` (function, optional)

### ErrorState Props
- `error` (Error | string, required)
- `onRetry` (function, optional)
- `title` (string, default: "Oops! Something went wrong")

### EmptyProducts Props
- `hasFilters` (boolean, default: false)
- `onClearFilters` (function, optional)

### BottomSheet Props
- `visible` (boolean, required)
- `onClose` (function, required)
- `title` (string, optional)
- `children` (ReactNode, required)
- `snapPoints` (array, default: ['50%'])
- `scrollable` (boolean, default: true)

### SafeAreaContainer Props
- `children` (ReactNode, required)
- `edges` (array, default: ['top', 'bottom'])
- `backgroundColor` (string, default: 'transparent')

### ResponsiveProductGrid Props
- `products` (array, required)
- `renderProduct` (function, required)
- `onEndReached` (function, optional)
- `minCardWidth` (number, default: 150)
- `gap` (number, default: 16)

---

## 🚀 Common Patterns

### Full Page with States
```typescript
if (loading) return <LoadingSpinner />;
if (error) return <ErrorState error={error} onRetry={refetch} />;
if (data.length === 0) return <EmptyProducts />;
return <ResponsiveProductGrid products={data} />;
```

### Filter Bottom Sheet
```typescript
const [showFilters, setShowFilters] = useState(false);

<BottomSheet
  visible={showFilters}
  onClose={() => setShowFilters(false)}
  title="Filters"
>
  <FilterForm />
</BottomSheet>
```

### Safe Area Wrapper
```typescript
<SafeAreaContainer edges={['top', 'bottom']}>
  <Header />
  <Content />
</SafeAreaContainer>
```

---

## 📁 File Locations

| Component | Path |
|-----------|------|
| EmptyState | `components/common/EmptyState.tsx` |
| ErrorState | `components/common/ErrorState.tsx` |
| EmptyProducts | `components/common/EmptyProducts.tsx` |
| BottomSheet | `components/common/BottomSheet.tsx` |
| SafeAreaContainer | `components/common/SafeAreaContainer.tsx` |
| ResponsiveProductGrid | `components/product/ResponsiveProductGrid.tsx` |
| useResponsiveGrid | `hooks/useResponsiveGrid.ts` |
| States Export | `components/common/states.ts` |
| Mobile Export | `components/common/mobile.ts` |

---

## 🎯 Integration Checklist

- [ ] Replace hardcoded empty states with `<EmptyState />`
- [ ] Replace error handlers with `<ErrorState />`
- [ ] Use `<ResponsiveProductGrid />` for product lists
- [ ] Replace modals with `<BottomSheet />` on mobile
- [ ] Wrap pages in `<SafeAreaContainer />`
- [ ] Test on different screen sizes
- [ ] Verify accessibility
- [ ] Update existing product grids to use hook

---

**Created**: Phase 3.3 Mobile Optimizations
**Status**: Ready for use ✅
