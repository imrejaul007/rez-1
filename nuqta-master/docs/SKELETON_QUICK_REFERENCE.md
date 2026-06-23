# Skeleton Loaders - Quick Reference

One-page reference for skeleton loader components.

---

## Import

```typescript
import {
  SkeletonLoader,
  ProductCardSkeleton,
  DealCardSkeleton,
  UGCCardSkeleton,
  VoucherCardSkeleton,
  StoreHeaderSkeleton,
  ReviewCardSkeleton,
  ProductGridSkeleton,
  HorizontalSkeletonList,
  DealsListSkeleton,
  ReviewsListSkeleton,
} from '@/components/skeletons';
```

---

## Components

### Base
```typescript
<SkeletonLoader width={200} height={20} borderRadius={8} />
<SkeletonLoader width={48} height={48} variant="circle" />
```

### Cards
```typescript
<ProductCardSkeleton />
<DealCardSkeleton />
<UGCCardSkeleton cardWidth={200} cardHeight={355} />
<VoucherCardSkeleton />
<StoreHeaderSkeleton />
<ReviewCardSkeleton />
```

### Grids & Lists
```typescript
<ProductGridSkeleton count={6} columns={2} />
<DealsListSkeleton count={5} />
<ReviewsListSkeleton count={5} />
<HorizontalSkeletonList SkeletonComponent={UGCCardSkeleton} count={4} />
```

---

## Usage Pattern

```typescript
{loading ? (
  <ProductGridSkeleton count={6} />
) : (
  <ProductGrid products={products} />
)}
```

---

## Best Practices

✅ Use for operations >300ms
✅ Show 3-6 skeletons max
✅ Disable scroll during loading
✅ Match exact layout

❌ Don't use for <200ms operations
❌ Don't mix skeleton + real content
❌ Don't show >10 skeletons

---

## Features

- 1.5s shimmer animation
- Purple theme (#7C3AED)
- Light/dark mode support
- Native driver optimized
- Accessibility compliant

---

Full documentation: `SKELETON_LOADERS_GUIDE.md`
