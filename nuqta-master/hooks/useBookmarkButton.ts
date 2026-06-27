// hooks/useBookmarkButton.ts
// Optimistic update hook for bookmark functionality

import { useState, useCallback, useRef } from 'react';
import { useToastStore } from '@/stores/toastStore';
import ugcApi from '@/services/ugcApi';

interface UseBookmarkButtonOptions {
  /** Initial bookmarked state */
  initialBookmarked?: boolean;
  /** Callback when bookmark state changes */
  onBookmarkChange?: (isBookmarked: boolean) => void;
  /** Custom success message for bookmark */
  bookmarkSuccessMessage?: string;
  /** Custom success message for remove bookmark */
  removeSuccessMessage?: string;
  /** Custom error message */
  errorMessage?: string;
}

interface UseBookmarkButtonReturn {
  /** Current bookmarked state */
  isBookmarked: boolean;
  /** Whether a request is in progress */
  isLoading: boolean;
  /** Toggle bookmark state */
  toggleBookmark: (contentId: string) => Promise<void>;
  /** Directly set bookmark state */
  setBookmark: (contentId: string, bookmarked: boolean) => Promise<void>;
  /** Reset to initial state */
  reset: () => void;
}

/**
 * Hook for optimistic bookmark button updates.
 * Provides instant UI feedback with automatic rollback on failure.
 *
 * @example
 * ```tsx
 * const { isBookmarked, toggleBookmark, isLoading } = useBookmarkButton({
 *   initialBookmarked: content.isBookmarked,
 *   onBookmarkChange: (bookmarked) => updateContent({ isBookmarked: bookmarked }),
 * });
 *
 * // In your component
 * <Pressable onPress={() => toggleBookmark(content.id)}>
 *   <Ionicons name={isBookmarked ? 'bookmark' : 'bookmark-outline'} />
 * </Pressable>
 * ```
 */
export function useBookmarkButton(options: UseBookmarkButtonOptions = {}): UseBookmarkButtonReturn {
  const {
    initialBookmarked = false,
    onBookmarkChange,
    bookmarkSuccessMessage = 'Bookmarked',
    removeSuccessMessage = 'Bookmark removed',
    errorMessage = 'Failed to update bookmark',
  } = options;

  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
  const [isLoading, setIsLoading] = useState(false);

  // Ref to track request validity for race condition prevention
  const requestIdRef = useRef(0);

  // Toast notifications
  const showSuccess = useToastStore((state) => state.showSuccess);
  const showError = useToastStore((state) => state.showError);

  /**
   * Toggle bookmark state for content
   */
  const toggleBookmark = useCallback(async (contentId: string) => {
    // Prevent multiple concurrent requests
    if (isLoading) return;

    const currentRequestId = ++requestIdRef.current;
    const previousBookmarked = isBookmarked;

    try {
      setIsLoading(true);

      // Optimistic update - immediate UI feedback
      const newBookmarked = !previousBookmarked;
      setIsBookmarked(newBookmarked);

      // Notify parent of optimistic change
      onBookmarkChange?.(newBookmarked);

      // API call
      const response = await ugcApi.toggleBookmark(contentId);

      // Check if this request is still valid (race condition prevention)
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      if (response.success && response.data) {
        // Update with server-confirmed value
        setIsBookmarked(response.data.isBookmarked);
        onBookmarkChange?.(response.data.isBookmarked);

        // Show success toast
        showSuccess(
          response.data.isBookmarked ? bookmarkSuccessMessage : removeSuccessMessage,
          2000
        );
      } else {
        throw new Error(response.error || 'Failed to update bookmark');
      }
    } catch (error) {
      // Check if this request is still valid
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      // Rollback optimistic update
      setIsBookmarked(previousBookmarked);
      onBookmarkChange?.(previousBookmarked);

      // Show error toast
      showError(errorMessage, 3000);
    } finally {
      // Only update loading state if this is still the latest request
      if (currentRequestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [isBookmarked, isLoading, onBookmarkChange, bookmarkSuccessMessage, removeSuccessMessage, errorMessage, showSuccess, showError]);

  /**
   * Directly set bookmark state
   */
  const setBookmark = useCallback(async (contentId: string, bookmarked: boolean) => {
    if (isLoading || isBookmarked === bookmarked) return;

    const currentRequestId = ++requestIdRef.current;
    const previousBookmarked = isBookmarked;

    try {
      setIsLoading(true);

      // Optimistic update
      setIsBookmarked(bookmarked);
      onBookmarkChange?.(bookmarked);

      // API call
      const response = bookmarked
        ? await ugcApi.bookmarkContent(contentId)
        : await ugcApi.removeBookmark(contentId);

      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      if (response.success && response.data) {
        setIsBookmarked(response.data.isBookmarked);
        onBookmarkChange?.(response.data.isBookmarked);
        showSuccess(
          response.data.isBookmarked ? bookmarkSuccessMessage : removeSuccessMessage,
          2000
        );
      } else {
        throw new Error(response.error || 'Failed to update bookmark');
      }
    } catch (error) {
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      // Rollback
      setIsBookmarked(previousBookmarked);
      onBookmarkChange?.(previousBookmarked);

      showError(errorMessage, 3000);
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [isBookmarked, isLoading, onBookmarkChange, bookmarkSuccessMessage, removeSuccessMessage, errorMessage, showSuccess, showError]);

  /**
   * Reset to initial state
   */
  const reset = useCallback(() => {
    setIsBookmarked(initialBookmarked);
  }, [initialBookmarked]);

  return {
    isBookmarked,
    isLoading,
    toggleBookmark,
    setBookmark,
    reset,
  };
}

export default useBookmarkButton;
