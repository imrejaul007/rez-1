# Expert Reviews - Quick Reference Guide

## 🚀 Quick Start

### 1. Import Components
```typescript
import { ExpertReviews, ExpertReviewsSummary } from '@/components/product';
```

### 2. Basic Usage
```typescript
<ExpertReviewsSummary
  averageRating={4.5}
  totalReviews={12}
  ratingDistribution={[8, 3, 1, 0, 0]}
/>

<ExpertReviews
  productId="product-123"
  reviews={reviews}
  onMarkHelpful={(id) => console.log('Helpful:', id)}
/>
```

---

## 📦 Component Props

### ExpertReviews
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `productId` | `string` | ✅ | Product identifier |
| `reviews` | `ExpertReview[]` | ❌ | Array of reviews (empty array if none) |
| `onMarkHelpful` | `(id: string) => void` | ❌ | Callback for helpful votes |

### ExpertReviewsSummary
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `averageRating` | `number` | ✅ | Average rating (0-5) |
| `totalReviews` | `number` | ✅ | Total number of reviews |
| `ratingDistribution` | `number[]` | ✅ | Array: [5★, 4★, 3★, 2★, 1★] |
| `onViewAll` | `() => void` | ❌ | Callback for "View All" button |

---

## 📝 Data Structure

### Expert Review Object
```typescript
{
  id: "review-1",
  author: {
    name: "Sarah Johnson",
    title: "Senior Tech Reviewer",
    company: "TechRadar",
    avatar: "https://...",
    verified: true
  },
  rating: 4.5,
  headline: "Excellent product",
  content: "Full review text...",
  pros: ["Great performance", "Good value"],
  cons: ["Battery life could be better"],
  verdict: "Highly recommended",
  publishedAt: new Date("2024-01-15"),
  helpful: 127,
  images: ["https://..."]
}
```

---

## 🎨 Visual Examples

### Summary Widget Display
```
┌─────────────────────────────────────┐
│ Expert Rating    ✓ 12 Experts       │
│                                      │
│  4.5        5★ ████████████ 8        │
│  ⭐⭐⭐⭐⭐    4★ ██████       3        │
│ Based on    3★ ██           1        │
│ 12 reviews  2★               0        │
│             1★               0        │
│                                      │
│     [View All Expert Reviews]        │
└─────────────────────────────────────┘
```

### Review Card Display
```
┌─────────────────────────────────────┐
│ [Avatar]  Sarah Johnson        ✓    │
│           Senior Tech Reviewer      │
│           TechRadar                 │
│           January 15, 2024          │
│                                      │
│ ⭐⭐⭐⭐⭐ 4.5/5                        │
│                                      │
│ Impressive performance with minor   │
│ compromises                         │
│                                      │
│ After extensive testing...          │
│ [Read More]                         │
│                                      │
│ ✓ Pros              ✗ Cons          │
│ • Great build       • Higher price  │
│ • Long battery      • Low light     │
│                                      │
│ Expert Verdict:                     │
│ A well-rounded product...           │
│                                      │
│ [Image] [Image] [Image]             │
│                                      │
│                    👍 Helpful (127)  │
└─────────────────────────────────────┘
```

---

## 🔧 Common Patterns

### Pattern 1: Basic Implementation
```typescript
function ProductPage({ productId }) {
  const mockReviews = [/* ... */];

  return (
    <ScrollView>
      <ExpertReviews
        productId={productId}
        reviews={mockReviews}
      />
    </ScrollView>
  );
}
```

### Pattern 2: With API Integration
```typescript
function ProductPage({ productId }) {
  const { reviews, loading } = useExpertReviews(productId);

  if (loading) return <LoadingSpinner />;

  return (
    <ExpertReviews
      productId={productId}
      reviews={reviews}
      onMarkHelpful={handleVote}
    />
  );
}
```

### Pattern 3: With Summary Widget
```typescript
function ProductPage({ productId }) {
  const [showAll, setShowAll] = useState(false);
  const { reviews, summary } = useExpertReviews(productId);

  return (
    <View>
      <ExpertReviewsSummary
        averageRating={summary.averageRating}
        totalReviews={summary.totalReviews}
        ratingDistribution={summary.ratingDistribution}
        onViewAll={() => setShowAll(true)}
      />

      {showAll && (
        <ExpertReviews
          productId={productId}
          reviews={reviews}
        />
      )}
    </View>
  );
}
```

### Pattern 4: Conditional Rendering
```typescript
function ProductReviews({ productId, reviews }) {
  // Only show if there are reviews
  if (!reviews || reviews.length === 0) {
    return null; // Component handles empty state internally
  }

  return (
    <ExpertReviews
      productId={productId}
      reviews={reviews}
    />
  );
}
```

---

## 🎯 Key Features

### ✅ Included Features
- Verified expert badges
- Expandable content (Read More)
- Pros/Cons visualization
- Expert verdict section
- Image gallery support
- Helpful vote tracking
- Empty state handling
- Date formatting
- Star rating display
- Rating distribution chart

### 📱 Mobile Optimized
- Responsive design
- Touch-friendly buttons (44x44 minimum)
- Horizontal scrolling for images
- Nested ScrollView support

### ♿ Accessibility
- Semantic structure
- Proper heading hierarchy
- Accessible labels
- High contrast colors
- Screen reader support

---

## 💾 Mock Data Generator

```typescript
// Quick mock data for testing
const mockReview = {
  id: '1',
  author: {
    name: 'John Doe',
    title: 'Product Reviewer',
    company: 'Tech Magazine',
    avatar: 'https://i.pravatar.cc/150?img=1',
    verified: true,
  },
  rating: 4,
  headline: 'Great product overall',
  content: 'Lorem ipsum dolor sit amet...',
  pros: ['Feature 1', 'Feature 2'],
  cons: ['Issue 1'],
  verdict: 'Recommended for most users',
  publishedAt: new Date(),
  helpful: 42,
};

const mockSummary = {
  averageRating: 4.3,
  totalReviews: 12,
  ratingDistribution: [5, 4, 2, 1, 0],
};
```

---

## 🐛 Troubleshooting

### Reviews Not Showing
```typescript
// ❌ Wrong
<ExpertReviews reviews={undefined} />

// ✅ Correct
<ExpertReviews reviews={reviews || []} />
```

### Images Not Loading
```typescript
// Ensure valid URLs
images: [
  'https://example.com/image.jpg', // ✅ Full URL
  '/images/photo.jpg',             // ❌ Relative path won't work
]
```

### Rating Distribution Wrong
```typescript
// Order matters! [5★, 4★, 3★, 2★, 1★]
ratingDistribution={[8, 3, 1, 0, 0]} // ✅ Correct
ratingDistribution={[0, 0, 1, 3, 8]} // ❌ Wrong order
```

### Helpful Votes Not Updating
```typescript
// Implement optimistic updates
const handleVote = async (reviewId) => {
  // Update UI immediately
  setReviews(prev => prev.map(r =>
    r.id === reviewId
      ? { ...r, helpful: r.helpful + 1 }
      : r
  ));

  // Then send to API
  try {
    await api.markHelpful(reviewId);
  } catch (err) {
    // Rollback on error
    setReviews(originalReviews);
  }
};
```

---

## 📊 Analytics Events

```typescript
// Track user interactions
analytics.track('expert_review_viewed', { productId, reviewId });
analytics.track('expert_review_expanded', { productId, reviewId });
analytics.track('expert_review_helpful_clicked', { productId, reviewId });
analytics.track('expert_review_image_viewed', { productId, reviewId, imageIndex });
```

---

## 🎨 Styling

### Using Design Tokens
```typescript
import { SPACING, COLORS, TYPOGRAPHY } from '@/constants/DesignTokens';

// Components use these automatically:
marginBottom: SPACING.md        // 16px
color: COLORS.primary[500]      // Brand color
fontSize: TYPOGRAPHY.h3.fontSize // 20px
```

### Custom Styling
```typescript
<ExpertReviews
  productId="123"
  reviews={reviews}
  style={{
    backgroundColor: '#F5F5F5',
    padding: 20
  }}
/>
```

---

## 🔗 Related Components

```typescript
// Other product components that work well together
import {
  ExpertReviews,           // This component
  ProductQASection,        // User questions
  RelatedProductsSection,  // Similar items
  FrequentlyBoughtTogether, // Bundle deals
  ProductImageGallery,     // Product photos
} from '@/components/product';
```

---

## ⚡ Performance Tips

1. **Lazy Load**: Only render when visible
   ```typescript
   const { ref, inView } = useInView({ triggerOnce: true });
   return <View ref={ref}>{inView && <ExpertReviews />}</View>;
   ```

2. **Pagination**: Load reviews in batches
   ```typescript
   const [page, setPage] = useState(1);
   const { reviews } = useExpertReviews(productId, { page, limit: 5 });
   ```

3. **Memoization**: Prevent unnecessary re-renders
   ```typescript
   const reviewsList = useMemo(() => (
     <ExpertReviews reviews={reviews} />
   ), [reviews]);
   ```

4. **Image Optimization**: Use CDN with resize params
   ```typescript
   images: reviews.map(r =>
     r.images.map(img => `${img}?w=400&h=400&fit=crop`)
   )
   ```

---

## 📚 Type Definitions

```typescript
import type {
  ExpertReview,
  ExpertReviewsProps,
  ExpertReviewsSummaryProps
} from '@/types/expertReviews.types';
```

---

## ✅ Checklist

Before going to production:

- [ ] Replace mock data with real API calls
- [ ] Implement error boundaries
- [ ] Add loading states
- [ ] Test on multiple devices
- [ ] Verify image URLs are valid
- [ ] Test helpful vote functionality
- [ ] Add analytics tracking
- [ ] Test with no reviews (empty state)
- [ ] Test with long content
- [ ] Verify accessibility with screen reader
- [ ] Test date formatting in different locales
- [ ] Implement caching strategy

---

## 🆘 Need Help?

- **Examples**: See `ExpertReviewsExample.tsx`
- **Full Guide**: See `EXPERT_REVIEWS_IMPLEMENTATION_GUIDE.md`
- **Types**: See `types/expertReviews.types.ts`
- **Source**: See `components/product/ExpertReviews.tsx`
