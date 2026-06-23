# Expert Reviews Feature - Implementation Guide

## Overview

The Expert Reviews feature provides editorial content and professional product evaluations from verified industry experts. This feature builds trust and helps customers make informed purchase decisions by complementing user-generated reviews with professional insights.

---

## Components Created

### 1. ExpertReviews Component
**Location**: `components/product/ExpertReviews.tsx`

The main component that displays a list of expert reviews with full details including:
- Expert author information with verified badges
- Star ratings
- Review headlines and content
- Expandable content with "Read More" functionality
- Pros and cons visualization
- Expert verdict section
- Review images
- Helpful voting functionality
- Empty state handling

**Props**:
```typescript
interface ExpertReviewsProps {
  productId: string;           // Product identifier
  reviews?: ExpertReview[];    // Array of expert reviews
  onMarkHelpful?: (reviewId: string) => void;  // Callback for helpful votes
}
```

**Key Features**:
- ✅ Verified expert badges
- ✅ Expandable review content
- ✅ Visual pros/cons sections
- ✅ Expert verdict highlighting
- ✅ Image gallery support
- ✅ Helpful vote tracking
- ✅ Empty state design
- ✅ Full TypeScript support

---

### 2. ExpertReviewsSummary Component
**Location**: `components/product/ExpertReviewsSummary.tsx`

A compact summary widget showing expert rating statistics:
- Overall average rating (large display)
- Star visualization
- Rating distribution bar chart
- Total number of expert reviews
- "View All" action button

**Props**:
```typescript
interface ExpertReviewsSummaryProps {
  averageRating: number;        // Average rating (0-5)
  totalReviews: number;         // Total number of reviews
  ratingDistribution: number[]; // Array of counts per rating [5★, 4★, 3★, 2★, 1★]
  onViewAll?: () => void;       // Callback for view all button
}
```

**Key Features**:
- ✅ Large, prominent rating display
- ✅ Visual rating distribution
- ✅ Expert count badge
- ✅ Compact, mobile-friendly design
- ✅ Optional "View All" action

---

## Data Structure

### ExpertReview Interface

```typescript
interface ExpertReview {
  id: string;                  // Unique review identifier
  author: {
    name: string;              // Expert name
    title: string;             // Job title (e.g., "Senior Tech Reviewer")
    company: string;           // Company name (e.g., "TechRadar")
    avatar: string;            // Avatar image URL
    verified: boolean;         // Verification status
  };
  rating: number;              // Star rating (0-5)
  headline: string;            // Review headline
  content: string;             // Full review text
  pros: string[];              // Array of pros
  cons: string[];              // Array of cons
  verdict: string;             // Expert verdict/summary
  publishedAt: Date;           // Publication date
  helpful: number;             // Number of helpful votes
  images?: string[];           // Optional review images
}
```

---

## Integration Examples

### Basic Integration

```typescript
import { ExpertReviews, ExpertReviewsSummary } from '@/components/product';

function ProductPage({ productId }) {
  const { reviews, summary, loading } = useExpertReviews(productId);

  return (
    <ScrollView>
      {/* Summary Widget */}
      <ExpertReviewsSummary
        averageRating={summary.averageRating}
        totalReviews={summary.totalReviews}
        ratingDistribution={summary.ratingDistribution}
        onViewAll={() => navigateToReviews()}
      />

      {/* Full Reviews */}
      <ExpertReviews
        productId={productId}
        reviews={reviews}
        onMarkHelpful={handleMarkHelpful}
      />
    </ScrollView>
  );
}
```

### With State Management

```typescript
import { useState, useEffect } from 'react';
import { ExpertReviews } from '@/components/product';
import { expertReviewsApi } from '@/services/expertReviewsApi';

function ProductReviewsSection({ productId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReviews();
  }, [productId]);

  const loadReviews = async () => {
    try {
      const data = await expertReviewsApi.getReviews(productId);
      setReviews(data);
    } catch (error) {
      console.error('Failed to load reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkHelpful = async (reviewId) => {
    try {
      await expertReviewsApi.markHelpful(productId, reviewId);
      // Optimistic update
      setReviews(reviews.map(review =>
        review.id === reviewId
          ? { ...review, helpful: review.helpful + 1 }
          : review
      ));
    } catch (error) {
      console.error('Failed to mark helpful:', error);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <ExpertReviews
      productId={productId}
      reviews={reviews}
      onMarkHelpful={handleMarkHelpful}
    />
  );
}
```

---

## Mock Data Examples

### Sample Expert Review

```typescript
const sampleReview = {
  id: '1',
  author: {
    name: 'Sarah Johnson',
    title: 'Senior Tech Reviewer',
    company: 'TechRadar',
    avatar: 'https://i.pravatar.cc/150?img=1',
    verified: true,
  },
  rating: 4.5,
  headline: 'Impressive performance with minor compromises',
  content: 'After extensive testing over three weeks, this product has proven to be a solid performer...',
  pros: [
    'Exceptional build quality with premium materials',
    'Outstanding battery life - easily lasts full day',
    'Intuitive and user-friendly interface',
  ],
  cons: [
    'Price is higher than some competitors',
    'Camera quality could be improved in low light',
  ],
  verdict: 'A well-rounded product that delivers on most fronts...',
  publishedAt: new Date('2024-01-15'),
  helpful: 127,
  images: [
    'https://picsum.photos/400/400?random=1',
    'https://picsum.photos/400/400?random=2',
  ],
};
```

### Sample Rating Distribution

```typescript
// Index 0 = 5 stars, Index 1 = 4 stars, etc.
const ratingDistribution = [8, 3, 1, 0, 0]; // 8 five-star, 3 four-star, 1 three-star
```

---

## API Integration

### Recommended API Endpoints

```typescript
// services/expertReviewsApi.ts

export const expertReviewsApi = {
  /**
   * Get all expert reviews for a product
   */
  getReviews: async (productId: string): Promise<ExpertReview[]> => {
    const response = await fetch(`/api/products/${productId}/expert-reviews`);
    return response.json();
  },

  /**
   * Get expert reviews summary statistics
   */
  getSummary: async (productId: string) => {
    const response = await fetch(`/api/products/${productId}/expert-reviews/summary`);
    return response.json();
  },

  /**
   * Mark a review as helpful
   */
  markHelpful: async (productId: string, reviewId: string) => {
    const response = await fetch(
      `/api/products/${productId}/expert-reviews/${reviewId}/helpful`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }
    );
    return response.json();
  },

  /**
   * Get expert reviews with pagination
   */
  getReviewsPaginated: async (
    productId: string,
    page: number = 1,
    limit: number = 10
  ) => {
    const response = await fetch(
      `/api/products/${productId}/expert-reviews?page=${page}&limit=${limit}`
    );
    return response.json();
  },
};
```

---

## Custom Hook Implementation

### useExpertReviews Hook

```typescript
// hooks/useExpertReviews.ts

import { useState, useEffect } from 'react';
import { expertReviewsApi } from '@/services/expertReviewsApi';

export function useExpertReviews(productId: string) {
  const [reviews, setReviews] = useState<ExpertReview[]>([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadData();
  }, [productId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reviewsData, summaryData] = await Promise.all([
        expertReviewsApi.getReviews(productId),
        expertReviewsApi.getSummary(productId),
      ]);
      setReviews(reviewsData);
      setSummary(summaryData);
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error('Failed to load expert reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const markHelpful = async (reviewId: string) => {
    try {
      await expertReviewsApi.markHelpful(productId, reviewId);
      // Optimistic update
      setReviews(reviews.map(review =>
        review.id === reviewId
          ? { ...review, helpful: review.helpful + 1 }
          : review
      ));
    } catch (err) {
      console.error('Failed to mark helpful:', err);
      throw err;
    }
  };

  const refresh = () => loadData();

  return {
    reviews,
    summary,
    loading,
    error,
    markHelpful,
    refresh,
  };
}
```

---

## Design Tokens Used

The components use design tokens for consistency:

- **Spacing**: `SPACING.xs` to `SPACING.xxl`
- **Typography**: `TYPOGRAPHY.h3`, `TYPOGRAPHY.h4`, `TYPOGRAPHY.body`, etc.
- **Colors**:
  - Primary: `COLORS.primary[500]`
  - Success: `COLORS.success[50]`, `COLORS.success[500]`, `COLORS.success[700]`
  - Error: `COLORS.error[50]`, `COLORS.error[500]`, `COLORS.error[700]`
  - Warning: `COLORS.warning[500]`, `COLORS.warning[700]`
  - Text: `COLORS.text.primary`, `COLORS.text.secondary`, `COLORS.text.tertiary`
  - Background: `COLORS.background.primary`, `COLORS.background.secondary`
- **Border Radius**: `BORDER_RADIUS.md`, `BORDER_RADIUS.lg`, `BORDER_RADIUS.full`

---

## Styling Customization

### Custom Styles Example

```typescript
import { ExpertReviews } from '@/components/product';
import { StyleSheet } from 'react-native';

function CustomExpertReviews() {
  return (
    <ExpertReviews
      productId="123"
      reviews={reviews}
      // Apply custom styles to the container
      style={styles.customContainer}
    />
  );
}

const styles = StyleSheet.create({
  customContainer: {
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
});
```

---

## Best Practices

### 1. Performance Optimization

```typescript
// Lazy load reviews when component becomes visible
import { useInView } from 'react-intersection-observer';

function LazyExpertReviews({ productId }) {
  const { ref, inView } = useInView({ triggerOnce: true });
  const { reviews } = useExpertReviews(productId, { enabled: inView });

  return (
    <View ref={ref}>
      {inView && <ExpertReviews productId={productId} reviews={reviews} />}
    </View>
  );
}
```

### 2. Error Handling

```typescript
function ExpertReviewsWithError({ productId }) {
  const { reviews, loading, error } = useExpertReviews(productId);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message="Failed to load reviews" />;
  if (!reviews.length) return <EmptyState />;

  return <ExpertReviews productId={productId} reviews={reviews} />;
}
```

### 3. Caching

```typescript
// Use React Query for automatic caching
import { useQuery } from '@tanstack/react-query';

function useCachedExpertReviews(productId: string) {
  return useQuery({
    queryKey: ['expertReviews', productId],
    queryFn: () => expertReviewsApi.getReviews(productId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  });
}
```

---

## Analytics Integration

### Track User Interactions

```typescript
import { analytics } from '@/services/analytics';

function ProductPageWithAnalytics({ productId }) {
  const handleMarkHelpful = (reviewId: string) => {
    // Track the interaction
    analytics.track('expert_review_helpful_clicked', {
      productId,
      reviewId,
      timestamp: Date.now(),
    });

    // Process the vote
    markHelpful(reviewId);
  };

  const handleReadMore = (reviewId: string) => {
    analytics.track('expert_review_expanded', {
      productId,
      reviewId,
    });
  };

  return (
    <ExpertReviews
      productId={productId}
      reviews={reviews}
      onMarkHelpful={handleMarkHelpful}
    />
  );
}
```

---

## Accessibility Features

The components include built-in accessibility support:

- ✅ Semantic HTML structure
- ✅ Proper heading hierarchy
- ✅ Accessible button labels
- ✅ Screen reader announcements
- ✅ Keyboard navigation support
- ✅ High contrast text colors
- ✅ Touch target sizes (44x44 minimum)

---

## Testing

### Unit Tests Example

```typescript
import { render, fireEvent } from '@testing-library/react-native';
import ExpertReviews from '../ExpertReviews';

describe('ExpertReviews', () => {
  const mockReviews = [/* mock data */];

  it('renders reviews correctly', () => {
    const { getByText } = render(
      <ExpertReviews productId="123" reviews={mockReviews} />
    );

    expect(getByText('Expert Reviews')).toBeTruthy();
    expect(getByText(mockReviews[0].author.name)).toBeTruthy();
  });

  it('handles helpful vote', () => {
    const onMarkHelpful = jest.fn();
    const { getByText } = render(
      <ExpertReviews
        productId="123"
        reviews={mockReviews}
        onMarkHelpful={onMarkHelpful}
      />
    );

    fireEvent.press(getByText(/Helpful/));
    expect(onMarkHelpful).toHaveBeenCalledWith(mockReviews[0].id);
  });

  it('shows empty state when no reviews', () => {
    const { getByText } = render(
      <ExpertReviews productId="123" reviews={[]} />
    );

    expect(getByText('No Expert Reviews Yet')).toBeTruthy();
  });
});
```

---

## Troubleshooting

### Common Issues

**Issue**: Reviews not displaying
- **Solution**: Check that the `reviews` prop is an array and not undefined
- Verify the data structure matches the `ExpertReview` interface

**Issue**: Images not loading
- **Solution**: Ensure image URLs are valid and accessible
- Check network connectivity
- Add error boundaries for image loading failures

**Issue**: Helpful votes not updating
- **Solution**: Implement optimistic updates in your state management
- Add error handling and rollback on API failure

---

## Future Enhancements

Potential improvements for future iterations:

1. **Filtering**: Add ability to filter reviews by rating
2. **Sorting**: Sort by date, helpfulness, or rating
3. **Pagination**: Load reviews in batches for better performance
4. **Search**: Search within review content
5. **Comparison**: Compare expert opinions side-by-side
6. **Video Reviews**: Support for video content
7. **Expert Profiles**: Link to expert profile pages
8. **Reply System**: Allow brands to respond to reviews
9. **Share Functionality**: Share individual reviews
10. **Translation**: Multi-language support

---

## Support

For questions or issues:
- Check the example file: `components/product/ExpertReviewsExample.tsx`
- Review the component source code for inline documentation
- Test with mock data before integrating with real API

---

## Version History

- **v1.0.0** (2024-01-28): Initial implementation
  - ExpertReviews component
  - ExpertReviewsSummary component
  - Full TypeScript support
  - Design tokens integration
  - Mock data examples
