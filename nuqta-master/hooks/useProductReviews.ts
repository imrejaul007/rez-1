// Product Reviews Hook
// Manages review fetching, submission, and interactions for products

import { useState, useEffect, useCallback } from 'react';
import reviewsApi from '@/services/reviewsApi';
import type { Review, ReviewsResponse } from '@/services/reviewsApi';
import { platformAlertSimple } from '@/utils/platformAlert';

interface UseProductReviewsParams {
  productId: string;
  autoLoad?: boolean;
}

interface UseProductReviewsReturn {
  reviews: Review[];
  summary: ReviewsResponse['summary'] | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
  sortBy: 'newest' | 'oldest' | 'rating_high' | 'rating_low' | 'helpful' | 'featured';
  filterRating: number | null;

  // Actions
  loadReviews: () => Promise<void>;
  refreshReviews: () => Promise<void>;
  loadMoreReviews: () => Promise<void>;
  setSortBy: (sort: UseProductReviewsReturn['sortBy']) => void;
  setFilterRating: (rating: number | null) => void;
  submitReview: (data: {
    rating: number;
    title: string;
    content: string;
    images?: string[];
    recommended: boolean;
    wouldBuyAgain?: boolean;
    usageTime?: string;
  }) => Promise<void>;
  updateReview: (reviewId: string, updates: Partial<Review>) => Promise<void>;
  deleteReview: (reviewId: string) => Promise<void>;
  markHelpful: (reviewId: string) => Promise<void>;
  canUserReview: () => Promise<boolean>;
}

export function useProductReviews({
  productId,
  autoLoad = true
}: UseProductReviewsParams): UseProductReviewsReturn {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<ReviewsResponse['summary'] | null>(null);
  const [isLoading, setIsLoading] = useState(autoLoad);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState<UseProductReviewsReturn['sortBy']>('newest');
  const [filterRating, setFilterRating] = useState<number | null>(null);

  const loadReviews = useCallback(async (page: number = 1, append: boolean = false) => {
    try {
      setError(null);

      const query: any = {
        page,
        limit: 10,
        sort: sortBy,
      };

      if (filterRating) {
        query.rating = filterRating;
      }

      const response = await reviewsApi.getTargetReviews('product', productId, query);

      if (response.success && response.data) {
        const newReviews = response.data.reviews || [];

        if (append) {
          setReviews(prev => [...prev, ...newReviews]);
        } else {
          setReviews(newReviews);
        }

        setSummary(response.data.summary);
        setCurrentPage(response.data.pagination.current);
        setTotalPages(response.data.pagination.pages);

      } else {
        throw new Error(response.error || 'Failed to load reviews');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load reviews');

      // Set empty state on error
      if (!append) {
        setReviews([]);
        setSummary({
          totalReviews: 0,
          averageRating: 0,
          ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          recommendationRate: 0,
          verifiedReviews: 0,
          featuredReviews: 0,
        });
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [productId, sortBy, filterRating]);

  const refreshReviews = useCallback(async () => {
    setIsRefreshing(true);
    await loadReviews(1, false);
  }, [loadReviews]);

  const loadMoreReviews = useCallback(async () => {
    if (currentPage < totalPages && !isLoading) {
      await loadReviews(currentPage + 1, true);
    }
  }, [currentPage, totalPages, isLoading, loadReviews]);

  const submitReview = useCallback(async (data: {
    rating: number;
    title: string;
    content: string;
    images?: string[];
    recommended: boolean;
    wouldBuyAgain?: boolean;
    usageTime?: string;
  }) => {
    try {

      const response = await reviewsApi.createReview({
        targetType: 'product',
        targetId: productId,
        rating: data.rating,
        title: data.title,
        content: data.content,
        recommended: data.recommended,
        wouldBuyAgain: data.wouldBuyAgain,
        usageTime: data.usageTime,
      });

      if (response.success && response.data) {

        // Refresh reviews to show the new one
        await refreshReviews();

        platformAlertSimple(
          'Success',
          'Your review has been submitted successfully!'
        );
      } else {
        throw new Error(response.error || 'Failed to submit review');
      }
    } catch (err: any) {
      platformAlertSimple(
        'Error',
        err.message || 'Failed to submit review. Please try again.'
      );
      throw err;
    }
  }, [productId, refreshReviews]);

  const updateReview = useCallback(async (reviewId: string, updates: Partial<Review>) => {
    try {

      const response = await reviewsApi.updateReview(reviewId, updates as any);

      if (response.success && response.data) {

        // Update local state
        setReviews(prev => prev.map(review =>
          review.id === reviewId ? response.data! : review
        ));

        platformAlertSimple('Success', 'Review updated successfully!');
      } else {
        throw new Error(response.error || 'Failed to update review');
      }
    } catch (err: any) {
      platformAlertSimple('Error', err.message || 'Failed to update review');
      throw err;
    }
  }, []);

  const deleteReview = useCallback(async (reviewId: string) => {
    try {

      const response = await reviewsApi.deleteReview(reviewId);

      if (response.success) {

        // Remove from local state
        setReviews(prev => prev.filter(review => review.id !== reviewId));

        // Update summary
        if (summary) {
          setSummary(prev => prev ? {
            ...prev,
            totalReviews: prev.totalReviews - 1,
          } : null);
        }

        platformAlertSimple('Success', 'Review deleted successfully!');
      } else {
        throw new Error(response.error || 'Failed to delete review');
      }
    } catch (err: any) {
      platformAlertSimple('Error', err.message || 'Failed to delete review');
      throw err;
    }
  }, [summary]);

  const markHelpful = useCallback(async (reviewId: string) => {
    try {

      const response = await reviewsApi.markHelpful(reviewId);

      if (response.success && response.data) {

        // Update local state
        setReviews(prev => prev.map(review => {
          if (review.id === reviewId) {
            return {
              ...review,
              helpful: {
                ...review.helpful,
                count: response.data!.count,
                userVoted: response.data!.helpful,
                voteType: response.data!.helpful ? 'helpful' : null,
              }
            };
          }
          return review;
        }));
      } else {
        throw new Error(response.error || 'Failed to mark review as helpful');
      }
    } catch (err: any) {
      // Don't show alert for this, just log the error
    }
  }, []);

  const canUserReview = useCallback(async (): Promise<boolean> => {
    try {
      const response = await reviewsApi.canReview('product', productId);
      return response.success && response.data?.canReview || false;
    } catch (err) {
      return false;
    }
  }, [productId]);

  // Auto-load reviews on mount and when dependencies change
  useEffect(() => {
    if (autoLoad && productId) {
      setIsLoading(true);
      loadReviews(1, false);
    }
  }, [productId, sortBy, filterRating, autoLoad]);

  return {
    reviews,
    summary,
    isLoading,
    isRefreshing,
    error,
    currentPage,
    totalPages,
    hasMore: currentPage < totalPages,
    sortBy,
    filterRating,

    // Actions
    loadReviews: () => loadReviews(1, false),
    refreshReviews,
    loadMoreReviews,
    setSortBy,
    setFilterRating,
    submitReview,
    updateReview,
    deleteReview,
    markHelpful,
    canUserReview,
  };
}
