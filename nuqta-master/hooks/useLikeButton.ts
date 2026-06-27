// hooks/useLikeButton.ts
// Optimistic update hook for like/favorite functionality

import { useState, useCallback, useRef } from 'react';
import { useToastStore } from '@/stores/toastStore';
import ugcApi from '@/services/ugcApi';

interface UseLikeButtonOptions {
  /** Initial liked state */
  initialLiked?: boolean;
  /** Initial like count */
  initialCount?: number;
  /** Callback when like state changes */
  onLikeChange?: (isLiked: boolean, count: number) => void;
  /** Custom success message */
  successMessage?: string;
  /** Custom error message */
  errorMessage?: string;
}

interface UseLikeButtonReturn {
  /** Current liked state */
  isLiked: boolean;
  /** Current like count */
  likeCount: number;
  /** Whether a request is in progress */
  isLoading: boolean;
  /** Toggle like state */
  toggleLike: (contentId: string) => Promise<void>;
  /** Directly set like state */
  setLike: (contentId: string, liked: boolean) => Promise<void>;
  /** Reset to initial state */
  reset: () => void;
}

/**
 * Hook for optimistic like button updates.
 * Provides instant UI feedback with automatic rollback on failure.
 *
 * @example
 * ```tsx
 * const { isLiked, likeCount, toggleLike, isLoading } = useLikeButton({
 *   initialLiked: content.isLiked,
 *   initialCount: content.likes,
 *   onLikeChange: (liked, count) => updateContent(liked, count),
 * });
 *
 * // In your component
 * <Pressable onPress={() => toggleLike(content.id)}>
 *   <Ionicons name={isLiked ? 'heart' : 'heart-outline'} />
 * </Pressable>
 * ```
 */
export function useLikeButton(options: UseLikeButtonOptions = {}): UseLikeButtonReturn {
  const {
    initialLiked = false,
    initialCount = 0,
    onLikeChange,
    successMessage,
    errorMessage = 'Failed to update like',
  } = options;

  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(false);

  // Ref to track request validity for race condition prevention
  const requestIdRef = useRef(0);

  // Toast notifications
  const showSuccess = useToastStore((state) => state.showSuccess);
  const showError = useToastStore((state) => state.showError);

  /**
   * Toggle like state for content
   */
  const toggleLike = useCallback(async (contentId: string) => {
    // Prevent multiple concurrent requests
    if (isLoading) return;

    const currentRequestId = ++requestIdRef.current;
    const previousLiked = isLiked;
    const previousCount = likeCount;

    try {
      setIsLoading(true);

      // Optimistic update - immediate UI feedback
      const newLiked = !previousLiked;
      const newCount = previousLiked ? Math.max(0, previousCount - 1) : previousCount + 1;

      setIsLiked(newLiked);
      setLikeCount(newCount);

      // Notify parent of optimistic change
      onLikeChange?.(newLiked, newCount);

      // API call
      const response = await ugcApi.toggleLike(contentId);

      // Check if this request is still valid (race condition prevention)
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      if (response.success && response.data) {
        // Update with server-confirmed values
        setIsLiked(response.data.isLiked);
        setLikeCount(response.data.likes);
        onLikeChange?.(response.data.isLiked, response.data.likes);

        // Show success toast
        if (successMessage) {
          showSuccess(successMessage, 2000);
        }
      } else {
        throw new Error(response.error || 'Failed to update like');
      }
    } catch (error) {
      // Check if this request is still valid
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      // Rollback optimistic update
      setIsLiked(previousLiked);
      setLikeCount(previousCount);
      onLikeChange?.(previousLiked, previousCount);

      // Show error toast
      showError(errorMessage, 3000);
    } finally {
      // Only update loading state if this is still the latest request
      if (currentRequestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [isLiked, likeCount, isLoading, onLikeChange, successMessage, errorMessage, showSuccess, showError]);

  /**
   * Directly set like state
   */
  const setLike = useCallback(async (contentId: string, liked: boolean) => {
    if (isLoading || isLiked === liked) return;

    const currentRequestId = ++requestIdRef.current;
    const previousLiked = isLiked;
    const previousCount = likeCount;

    try {
      setIsLoading(true);

      // Optimistic update
      const newCount = liked ? previousCount + 1 : Math.max(0, previousCount - 1);
      setIsLiked(liked);
      setLikeCount(newCount);
      onLikeChange?.(liked, newCount);

      // API call
      const response = liked
        ? await ugcApi.likeContent(contentId)
        : await ugcApi.unlikeContent(contentId);

      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      if (response.success && response.data) {
        setIsLiked(response.data.isLiked);
        setLikeCount(response.data.likes);
        onLikeChange?.(response.data.isLiked, response.data.likes);
      } else {
        throw new Error(response.error || 'Failed to update like');
      }
    } catch (error) {
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      // Rollback
      setIsLiked(previousLiked);
      setLikeCount(previousCount);
      onLikeChange?.(previousLiked, previousCount);

      showError(errorMessage, 3000);
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [isLiked, likeCount, isLoading, onLikeChange, errorMessage, showError]);

  /**
   * Reset to initial state
   */
  const reset = useCallback(() => {
    setIsLiked(initialLiked);
    setLikeCount(initialCount);
  }, [initialLiked, initialCount]);

  return {
    isLiked,
    likeCount,
    isLoading,
    toggleLike,
    setLike,
    reset,
  };
}

export default useLikeButton;
