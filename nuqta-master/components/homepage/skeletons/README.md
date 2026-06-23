# Skeleton Loaders Documentation

This directory contains skeleton loader components that provide better perceived performance during loading states.

## Components

### 1. SkeletonCard (Base Component)
**Location:** `components/common/SkeletonCard.tsx`

A reusable base skeleton component with shimmer animation.

**Props:**
- `width`: number | string (default: '100%') - Width of the skeleton
- `height`: number (default: 20) - Height of the skeleton
- `borderRadius`: number (default: 8) - Border radius
- `style`: any - Additional styles
- `variant`: 'rectangle' | 'circle' | 'rounded' (default: 'rectangle') - Shape variant

**Example:**
```tsx
import SkeletonCard from '@/components/common/SkeletonCard';

<SkeletonCard width={100} height={20} borderRadius={4} />
<SkeletonCard width={40} height={40} variant="circle" />
```

### 2. ProductCardSkeleton
**Location:** `components/homepage/skeletons/ProductCardSkeleton.tsx`

Matches the layout of ProductCard component.

**Features:**
- Product image placeholder (120px height)
- Brand text skeleton
- Product name skeleton (2 lines)
- Rating stars skeleton
- Price information skeleton
- Cashback badge skeleton
- Add to Cart button skeleton

**Props:**
- `width`: number (default: 180) - Card width

**Example:**
```tsx
import { ProductCardSkeleton } from '@/components/homepage/skeletons';

<ProductCardSkeleton width={180} />
```

### 3. StoreCardSkeleton
**Location:** `components/homepage/skeletons/StoreCardSkeleton.tsx`

Matches the layout of StoreCard component.

**Features:**
- Store image placeholder (140px height)
- Store name and rating skeleton
- Description skeleton (2 lines)
- Location and delivery time skeleton
- Cashback badge and minimum order skeleton

**Props:**
- `width`: number (default: 280) - Card width

**Example:**
```tsx
import { StoreCardSkeleton } from '@/components/homepage/skeletons';

<StoreCardSkeleton width={280} />
```

### 4. EventCardSkeleton
**Location:** `components/homepage/skeletons/EventCardSkeleton.tsx`

Matches the layout of EventCard component.

**Features:**
- Event image placeholder (160px height)
- Online badge skeleton
- Price badge skeleton
- Event title skeleton (2 lines)
- Event subtitle skeleton
- Location, date, and time skeleton
- Category badge skeleton

**Props:**
- `width`: number (default: 280) - Card width

**Example:**
```tsx
import { EventCardSkeleton } from '@/components/homepage/skeletons';

<EventCardSkeleton width={280} />
```

### 5. SectionSkeleton
**Location:** `components/homepage/skeletons/SectionSkeleton.tsx`

Shows skeleton for an entire horizontal section.

**Features:**
- Section title skeleton with accent line
- Horizontal row of card skeletons
- Auto-detects and renders correct card type
- Supports all card variants

**Props:**
- `cardType`: 'product' | 'store' | 'event' | 'recommendation' (default: 'product')
- `cardWidth`: number (default: 280)
- `spacing`: number (default: 16)
- `numCards`: number (default: 4)
- `showIndicator`: boolean (default: true)

**Example:**
```tsx
import { SectionSkeleton } from '@/components/homepage/skeletons';

<SectionSkeleton
  cardType="product"
  cardWidth={180}
  numCards={5}
/>
```

## Usage in HorizontalScrollSection

The `HorizontalScrollSection` component automatically shows skeleton loaders when:
1. `isLoading` prop is true
2. Section has no items (`section.items.length === 0`)

**Example:**
```tsx
import HorizontalScrollSection from '@/components/homepage/HorizontalScrollSection';

<HorizontalScrollSection
  section={section}
  renderCard={renderProductCard}
  cardWidth={180}
  spacing={16}
  isLoading={loading} // Will show ProductCardSkeleton when true
/>
```

## Features

### Shimmer Animation
All skeleton components include a smooth shimmer animation:
- Duration: 1200ms per cycle
- Colors: Gradient from #E5E7EB → #F9FAFB → #E5E7EB
- Translation: -300px to +300px

### Accessibility
All skeleton components are properly hidden from screen readers:
- `accessibilityElementsHidden={true}`
- `importantForAccessibility="no-hide-descendants"`
- Labeled as "Loading content" for context

### Performance
- Uses native driver for animations
- Minimal re-renders
- Efficient layout calculations
- Matches card dimensions exactly

## Customization

### Creating Custom Skeleton Cards

1. Import the base SkeletonCard component
2. Create a layout matching your card component
3. Use SkeletonCard for each element

**Example:**
```tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonCard from '@/components/common/SkeletonCard';

export default function CustomCardSkeleton({ width = 200 }) {
  return (
    <View style={[styles.container, { width }]}>
      <View style={styles.card}>
        <SkeletonCard width="100%" height={100} />
        <View style={styles.content}>
          <SkeletonCard width="80%" height={16} style={styles.title} />
          <SkeletonCard width="60%" height={14} style={styles.subtitle} />
        </View>
      </View>
    </View>
  );
}
```

## Best Practices

1. **Match Real Card Dimensions**: Skeleton should have same dimensions as real card
2. **Match Layout Structure**: Keep same padding, margins, and spacing
3. **Preserve Visual Hierarchy**: Show important elements (images, titles) prominently
4. **Consistent Animation**: Use the same shimmer animation across all skeletons
5. **Accessibility**: Always hide from screen readers to avoid confusion
6. **Loading States**: Show skeletons during initial load and data refresh

## Integration Checklist

- [ ] Import skeleton component in parent
- [ ] Pass `isLoading` prop to section component
- [ ] Match skeleton card width to real card width
- [ ] Test loading state appearance
- [ ] Verify smooth transition to real content
- [ ] Check accessibility with screen readers
- [ ] Test on multiple screen sizes

## Files Created

```
components/
├── common/
│   └── SkeletonCard.tsx          # Base skeleton component
└── homepage/
    ├── skeletons/
    │   ├── ProductCardSkeleton.tsx    # Product card skeleton
    │   ├── StoreCardSkeleton.tsx      # Store card skeleton
    │   ├── EventCardSkeleton.tsx      # Event card skeleton
    │   ├── SectionSkeleton.tsx        # Full section skeleton
    │   ├── index.ts                    # Exports
    │   └── README.md                   # This file
    ├── HorizontalScrollSection.tsx     # Updated with skeleton support
    └── SkeletonLoader.tsx              # Full page skeleton
```

## Related Components

- `HorizontalScrollSection`: Main section component with skeleton integration
- `ProductCard`: Real product card component
- `StoreCard`: Real store card component
- `EventCard`: Real event card component
