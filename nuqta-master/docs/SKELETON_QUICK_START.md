# Skeleton Loaders - Quick Start Guide

## Quick Usage

### Import Skeletons
```tsx
// Individual imports
import { ProductCardSkeleton } from '@/components/homepage/skeletons';
import { StoreCardSkeleton } from '@/components/homepage/skeletons';
import { EventCardSkeleton } from '@/components/homepage/skeletons';
import { SectionSkeleton } from '@/components/homepage/skeletons';

// Base skeleton
import SkeletonCard from '@/components/common/SkeletonCard';
```

### 1. Automatic with HorizontalScrollSection
```tsx
import HorizontalScrollSection from '@/components/homepage/HorizontalScrollSection';

const [loading, setLoading] = useState(true);

<HorizontalScrollSection
  section={productsSection}
  renderCard={renderProductCard}
  cardWidth={180}
  isLoading={loading} // Shows skeleton automatically
/>
```

### 2. Manual Skeleton Display
```tsx
import { SectionSkeleton } from '@/components/homepage/skeletons';

{loading ? (
  <SectionSkeleton
    cardType="product"
    cardWidth={180}
    numCards={5}
  />
) : (
  <RealContent />
)}
```

## Component Reference

### ProductCardSkeleton
- Default width: 180px
- Height: 320px (fixed)
- Use for: Product listings, recommendations

### StoreCardSkeleton
- Default width: 280px
- Variable height
- Use for: Store listings

### EventCardSkeleton
- Default width: 280px
- Variable height
- Use for: Events, workshops

### SectionSkeleton
- Shows complete section with title and cards
- Auto-detects card type
- Configurable number of cards

### SkeletonCard (Base)
- Build custom skeletons
- Shimmer animation included
- Fully customizable
