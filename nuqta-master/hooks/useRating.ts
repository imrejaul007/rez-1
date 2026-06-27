// hooks/useRating.ts
// Optimistic update hook for rating functionality

import { useState, useCallback, useRef } from 'react';
import { useToastStore } from '@/stores/toastStore';
import reviewsApi from '@/services/reviewsApi';

interface UseRatingOptions {
  /** Initial rating value (1-5) */
  initialRating?: number;
  /** Callback when rating changes */
  onRatingChange?: (rating: number) => void;
  /** Custom error message */
  errorMessage?: string;
  /** Whether to show success toast on rating submission */
  showSuccessToast?: boolean;
}

interface UseRatingReturn {
  /** Current rating value */
  rating: number;
  /** Whether a request is in progress */
  isLoading: boolean;
  /** Set rating directly */
  setRating: (rating: number) => Promise<void>;
  /** Update rating for a specific review */
  updateReviewRating: (reviewId: string, rating: number) => Promise<void>;
  /** Submit a complete review with rating */
  submitReviewRating: (data: {
    targetType: 'product' | 'store' | 'video' | 'project';
    targetId: string;
    rating: number;
    title?: string;
    content: string;
    recommended?: boolean;
  }) => Promise<boolean>;
  /** Reset to initial state */
  reset: () => void;
}

/**
 * Hook for rating with optimistic updates.
 * Provides instant UI feedback with automatic rollback on failure.
 *
 * @example
 * ```tsx
 * const { rating, setRating, isLoading } = useRating({
 *   initialRating: 0,
 *   onRatingChange: (newRating) => setFormData({ rating: newRating }),
 * });
 *
 * // In your component
 * <RatingStars
 *   rating={rating}
 *   interactive
 *   onRatingChange={setRating}
 * />
 * ```
 */
export function useRating(options: UseRatingOptions = {}): UseRatingReturn {
  const {
    initialRating = 0,
    onRatingChange,
    errorMessage = 'Failed to submit rating',
    showSuccessToast = false,
  } = options;

  const [rating, setRatingState] = useState(initialRating);
  const [isLoading, setIsLoading] = useState(false);

  // Ref to track request validity for race condition prevention
  const requestIdRef = useRef(0);

  // Toast notifications
  const showSuccess = useToastStore((state) => state.showSuccess);
  const showError = useToastStore((state) => state.showError);

  /**
   * Set rating value (optimistic update)
   */
  const setRating = useCallback(async (newRating: number) => {
    // Validate rating range
    if (newRating < 1 || newRating > 5) return;

    const currentRequestId = ++requestIdRef.current;
    const previousRating = rating;

    try {
      setIsLoading(true);

      // Optimistic update - immediate UI feedback
      setRatingState(newRating);
      onRatingChange?.(newRating);

      // Check if this request is still valid (race condition prevention)
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      // Show success toast if enabled
      if (showSuccessToast) {
        showSuccess(`Rated ${newRating} stars`, 2000);
      }
    } catch (error) {
      // Check if this request is still valid
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      // Rollback optimistic update
      setRatingState(previousRating);
      onRatingChange?.(previousRating);

      // Show error toast
      showError(errorMessage, 3000);
    } finally {
      // Only update loading state if this is still the latest request
      if (currentRequestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [rating, onRatingChange, errorMessage, showSuccessToast, showSuccess, showError]);

  /**
   * Update rating for an existing review
   */
  const updateReviewRating = useCallback(async (reviewId: string, newRating: number) => {
    if (isLoading || newRating < 1 || newRating > 5) return;

    const currentRequestId = ++requestIdRef.current;
    const previousRating = rating;

    try {
      setIsLoading(true);

      // Optimistic update
      setRatingState(newRating);
      onRatingChange?.(newRating);

      // API call
      const response = await reviewsApi.updateReview(reviewId, { rating: newRating });

      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      if (response.success && response.data) {
        // Update with server-confirmed value
        setRatingState(response.data.rating);
        onRatingChange?.(response.data.rating);

        if (showSuccessToast) {
          showSuccess('Rating updated', 2000);
        }
      } else {
        throw new Error(response.error || 'Failed to update rating');
      }
    } catch (error) {
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      // Rollback
      setRatingState(previousRating);
      onRatingChange?.(previousRating);

      showError(errorMessage, 3000);
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [rating, isLoading, onRatingChange, errorMessage, showSuccessToast, showSuccess, showError]);

  /**
   * Submit a complete review with rating
   */
  const submitReviewRating = useCallback(async (data: {
    targetType: 'product' | 'store' | 'video' | 'project';
    targetId: string;
    rating: number;
    title?: string;
    content: string;
    recommended?: boolean;
  }): Promise<boolean> => {
    if (isLoading) return false;

    const currentRequestId = ++requestIdRef.current;
    const previousRating = rating;

    try {
      setIsLoading(true);

      // Optimistic update
      setRatingState(data.rating);
      onRatingChange?.(data.rating);

      // API call
      const response = await reviewsApi.createReview({
        targetType: data.targetType,
        targetId: data.targetId,
        rating: data.rating,
        title: data.title || '',
        content: data.content,
        recommended: data.recommended ?? true,
      });

      if (currentRequestId !== requestIdRef.current) {
        return false;
      }

      if (response.success && response.data) {
        // Update with server-confirmed value
        setRatingState(response.data.rating);
        onRatingChange?.(response.data.rating);

        showSuccess('Review submitted successfully!', 2000);
        return true;
      } else {
        throw new Error(response.error || 'Failed to submit review');
      }
    } catch (error) {
      if (currentRequestId !== requestIdRef.current) {
        return false;
      }

      // Rollback
      setRatingState(previousRating);
      onRatingChange?.(previousRating);

      showError(errorMessage, 3000);
      return false;
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [rating, isLoading, onRatingChange, errorMessage, showSuccess, showError]);

  /**
   * Reset to initial state
   */
  const reset = useCallback(() => {
    setRatingState(initialRating);
  }, [initialRating]);

  return {
    rating,
    isLoading,
    setRating,
    updateReviewRating,
    submitReviewRating,
    reset,
  };
}

export default useRating;
