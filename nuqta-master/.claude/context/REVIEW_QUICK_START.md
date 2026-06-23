# Review System - Quick Start Guide

## For Developers

### Using Review Components

#### 1. Display Reviews on Any Page

```tsx
import { ReviewList } from '@/components/reviews';

function MyPage() {
  return (
    <ReviewList
      storeId="store-id-here"
      onWriteReviewPress={() => setShowReviewForm(true)}
      showWriteButton={true}
      currentUserId={user?.id}
    />
  );
}
```

#### 2. Show Rating Stars

```tsx
import { RatingStars } from '@/components/reviews';

function MyComponent() {
  return (
    <RatingStars
      rating={4.5}
      size={16}
      showCount={true}
      count={245}
    />
  );
}
```

#### 3. Review Form Modal

```tsx
import { ReviewForm } from '@/components/reviews';
import { Modal } from 'react-native';

function MyPage() {
  const [showForm, setShowForm] = useState(false);

  return (
    <Modal visible={showForm}>
      <ReviewForm
        storeId="store-id"
        onSubmit={(review) => {
          setShowForm(false);
          // Handle success
        }}
        onCancel={() => setShowForm(false)}
      />
    </Modal>
  );
}
```

#### 4. Call Review API Directly

```tsx
import reviewService from '@/services/reviewApi';

// Get reviews
const response = await reviewService.getStoreReviews(storeId, {
  page: 1,
  limit: 20,
  sortBy: 'newest'
});

// Create review
await reviewService.createReview(storeId, {
  rating: 5,
  title: 'Great store!',
  comment: 'Amazing products and service',
  images: []
});

// Update review
await reviewService.updateReview(reviewId, {
  rating: 4,
  comment: 'Updated my review'
});

// Delete review
await reviewService.deleteReview(reviewId);

// Mark helpful
await reviewService.markReviewHelpful(reviewId);
```

#### 5. Use Review Stats Hook

```tsx
import { useReviewStats } from '@/hooks/useReviewStats';

function MyComponent({ stats }) {
  const {
    averageRating,
    totalReviews,
    ratingDistribution,
    formattedAverage,
    hasReviews
  } = useReviewStats(stats);

  return (
    <View>
      <Text>{formattedAverage} stars</Text>
      <Text>{totalReviews} reviews</Text>
    </View>
  );
}
```

---

## Component Props Reference

### RatingStars
```tsx
<RatingStars
  rating={4.5}              // Current rating (required)
  maxRating={5}             // Maximum stars (default: 5)
  size={16}                 // Star size (default: 16)
  color="#F59E0B"           // Filled color (default: gold)
  emptyColor="#D1D5DB"      // Empty color (default: gray)
  showCount={true}          // Show review count (default: false)
  count={100}               // Number of reviews
  interactive={false}       // Enable selection (default: false)
  onRatingChange={fn}       // Callback when rating changes
/>
```

### ReviewList
```tsx
<ReviewList
  storeId="store-id"        // Store ID (required)
  onWriteReviewPress={fn}   // Write review callback
  showWriteButton={true}    // Show write button (default: true)
  currentUserId="user-id"   // Current user ID for ownership check
/>
```

### ReviewForm
```tsx
<ReviewForm
  storeId="store-id"        // Store ID (required)
  existingReview={review}   // Review to edit (optional)
  onSubmit={fn}             // Success callback
  onCancel={fn}             // Cancel callback
  isEdit={false}            // Edit mode (default: false)
/>
```

### ReviewItem
```tsx
<ReviewItem
  review={reviewData}       // Review data (required)
  onHelpfulPress={fn}       // Helpful callback
  onReportPress={fn}        // Report callback
  onEditPress={fn}          // Edit callback
  onDeletePress={fn}        // Delete callback
  showActions={true}        // Show actions (default: true)
  isOwnReview={false}       // Is user's review (default: false)
/>
```

---

## API Service Methods

```typescript
reviewService.getStoreReviews(storeId, filters?)
reviewService.createReview(storeId, reviewData)
reviewService.updateReview(reviewId, updates)
reviewService.deleteReview(reviewId)
reviewService.markReviewHelpful(reviewId)
reviewService.getUserReviews(page?, limit?)
reviewService.canUserReviewStore(storeId)
reviewService.reportReview(reviewId, reason)
```

---

## Type Imports

```typescript
import {
  Review,
  ReviewStats,
  ReviewsResponse,
  CreateReviewData,
  UpdateReviewData,
  ReviewFilters,
  UserReview,
  CanReviewResponse,
  RatingDistribution
} from '@/types/review.types';
```

---

## Common Patterns

### Pattern 1: Full Page Reviews
```tsx
import { ReviewList, ReviewForm } from '@/components/reviews';

function StoreReviews({ storeId }) {
  const [showForm, setShowForm] = useState(false);

  return (
    <>
      <ReviewList
        storeId={storeId}
        onWriteReviewPress={() => setShowForm(true)}
      />

      <Modal visible={showForm}>
        <ReviewForm
          storeId={storeId}
          onSubmit={() => setShowForm(false)}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </>
  );
}
```

### Pattern 2: Compact Rating Display
```tsx
import { RatingStars } from '@/components/reviews';

function ProductCard({ product }) {
  return (
    <View>
      <RatingStars
        rating={product.rating.average}
        size={12}
        showCount
        count={product.rating.count}
      />
    </View>
  );
}
```

### Pattern 3: Custom Review Stats
```tsx
import { useReviewStats, getRatingDescription } from '@/hooks/useReviewStats';

function ReviewSummary({ stats }) {
  const { averageRating, totalReviews, ratingDistribution } = useReviewStats(stats);
  const description = getRatingDescription(averageRating);

  return (
    <View>
      <Text>{averageRating}/5 - {description}</Text>
      <Text>{totalReviews} reviews</Text>
      {ratingDistribution.map(({ rating, percentage }) => (
        <Text key={rating}>{rating}: {percentage}%</Text>
      ))}
    </View>
  );
}
```

---

## Testing Checklist

- [ ] Reviews load on page
- [ ] Sorting and filtering work
- [ ] Can submit new review
- [ ] Can edit own review
- [ ] Can delete own review
- [ ] Can mark review helpful
- [ ] Ratings display correctly
- [ ] Empty states show properly
- [ ] Loading states work
- [ ] Error handling works
- [ ] Authentication required for protected actions
- [ ] Modal opens and closes
- [ ] Form validation works

---

## Troubleshooting

### Reviews not loading?
1. Check backend is running on correct port
2. Verify `EXPO_PUBLIC_API_BASE_URL` in .env
3. Check network tab for API errors
4. Verify storeId is valid

### Can't submit review?
1. Check user is authenticated
2. Verify all required fields filled
3. Check comment length (min 10 chars)
4. Ensure rating is selected

### Rating stars not showing?
1. Import from correct path: `@/components/reviews`
2. Verify rating value is a number
3. Check data structure matches props

### Modal not closing?
1. Verify onCancel/onSubmit callbacks update state
2. Check visible prop bound to state correctly
3. Ensure Modal component imported from react-native

---

## Best Practices

1. **Always validate storeId** before passing to components
2. **Handle loading states** for better UX
3. **Show empty states** when no reviews
4. **Use error boundaries** to catch component errors
5. **Test with real data** from backend
6. **Optimize images** for review photos (when implemented)
7. **Debounce search/filter** for performance
8. **Cache review data** to reduce API calls
9. **Show loading skeletons** instead of spinners
10. **Implement pull-to-refresh** for better UX

---

## Next Features to Add

1. Review image viewer (full screen)
2. Image picker for photo upload
3. Review reactions (=M =N d = =. =" =!)
4. Store owner reply to reviews
5. Review editing history
6. Review report moderation UI
7. Verified purchase badge logic
8. Review sharing to social media
9. Review rewards (REZ Coins)
10. Review analytics dashboard

---

## Support

For issues or questions:
1. Check `REVIEW_INTEGRATION_COMPLETE.md` for detailed docs
2. Review backend API documentation
3. Check console logs for errors
4. Verify environment variables
5. Test backend endpoints directly

---

**Quick tip:** All review components are designed to work standalone or together. Mix and match as needed!
