// hooks/useUGCInteractions.ts
// Comprehensive optimistic update hook for UGC interactions (like, bookmark, share)

import { useState, useCallback, useRef, useMemo } from 'react';
import { useToastStore } from '@/stores/toastStore';
import ugcApi from '@/services/ugcApi';
import { UGCContent } from '@/types/reviews';

interface UGCInteractionState {
  likedContent: Set<string>;
  bookmarkedContent: Set<string>;
  likeCounts: Map<string, number>;
}

interface UseUGCInteractionsOptions {
  /** Initial content to initialize state from */
  initialContent?: UGCContent[];
  /** Callback when any interaction state changes */
  onStateChange?: (state: UGCInteractionState) => void;
}

interface UseUGCInteractionsReturn {
  /** State */
  likedContent: Set<string>;
  bookmarkedContent: Set<string>;
  likeCounts: Map<string, number>;
  /** Check if content is liked */
  isLiked: (contentId: string) => boolean;
  /** Check if content is bookmarked */
  isBookmarked: (contentId: string) => boolean;
  /** Get like count for content */
  getLikeCount: (contentId: string) => number;
  /** Check if a specific content is being processed */
  isProcessing: (contentId: string) => boolean;
  /** Toggle like with optimistic update */
  toggleLike: (contentId: string) => Promise<void>;
  /** Toggle bookmark with optimistic update */
  toggleBookmark: (contentId: string) => Promise<void>;
  /** Initialize state from content array */
  initializeState: (content: UGCContent[]) => void;
  /** Update a single content item in state */
  updateContentState: (contentId: string, updates: Partial<UGCContent>) => void;
  /** Reset all state */
  reset: () => void;
}

/**
 * Hook for managing UGC (User Generated Content) interactions with optimistic updates.
 *
 * Features:
 * - Optimistic updates for instant UI feedback
 * - Automatic rollback on failure
 * - Concurrent request prevention
 * - Toast notifications for success/error
 * - State synchronization with backend
 *
 * @example
 * ```tsx
 * const {
 *   toggleLike,
 *   toggleBookmark,
 *   isLiked,
 *   isBookmarked,
 *   getLikeCount,
 * } = useUGCInteractions({ initialContent: ugcContent });
 *
 * // In component
 * <Pressable onPress={() => toggleLike(content.id)}>
 *   <Ionicons name={isLiked(content.id) ? 'heart' : 'heart-outline'} />
 * </Pressable>
 * ```
 */
export function useUGCInteractions(
  options: UseUGCInteractionsOptions = {}
): UseUGCInteractionsReturn {
  const {
    initialContent = [],
    onStateChange,
  } = options;

  // State
  const [likedContent, setLikedContent] = useState<Set<string>>(new Set());
  const [bookmarkedContent, setBookmarkedContent] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Map<string, number>>(new Map());
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  // Ref for request race condition prevention
  const requestIdRef = useRef(0);

  // Toast notifications
  const showSuccess = useToastStore((state) => state.showSuccess);
  const showError = useToastStore((state) => state.showError);

  // Notify parent of state changes
  const notifyStateChange = useCallback(() => {
    onStateChange?.({
      likedContent,
      bookmarkedContent,
      likeCounts,
    });
  }, [likedContent, bookmarkedContent, likeCounts, onStateChange]);

  /**
   * Initialize state from content array
   */
  const initializeState = useCallback((content: UGCContent[]) => {
    const newLiked = new Set<string>();
    const newBookmarked = new Set<string>();
    const newCounts = new Map<string, number>();

    content.forEach((item) => {
      if (item.isLiked) {
        newLiked.add(item.id);
      }
      if (item.isBookmarked) {
        newBookmarked.add(item.id);
      }
      newCounts.set(item.id, item.likes);
    });

    setLikedContent(newLiked);
    setBookmarkedContent(newBookmarked);
    setLikeCounts(newCounts);
  }, []);

  // Initialize from initial content
  useMemo(() => {
    if (initialContent.length > 0) {
      initializeState(initialContent);
    }
  }, [initialContent, initializeState]);

  /**
   * Check if content is liked
   */
  const isLiked = useCallback((contentId: string): boolean => {
    return likedContent.has(contentId);
  }, [likedContent]);

  /**
   * Check if content is bookmarked
   */
  const isBookmarked = useCallback((contentId: string): boolean => {
    return bookmarkedContent.has(contentId);
  }, [bookmarkedContent]);

  /**
   * Get like count for content
   */
  const getLikeCount = useCallback((contentId: string): number => {
    return likeCounts.get(contentId) ?? 0;
  }, [likeCounts]);

  /**
   * Check if content is being processed
   */
  const isProcessing = useCallback((contentId: string): boolean => {
    return processingIds.has(contentId);
  }, [processingIds]);

  /**
   * Toggle like for content
   */
  const toggleLike = useCallback(async (contentId: string) => {
    // Prevent concurrent requests for same content
    if (processingIds.has(contentId)) return;

    const currentRequestId = ++requestIdRef.current;
    const wasLiked = likedContent.has(contentId);
    const previousCount = likeCounts.get(contentId) ?? 0;

    try {
      // Add to processing set
      setProcessingIds((prev) => new Set(prev).add(contentId));

      // Optimistic update
      const newLiked = !wasLiked;
      const newCount = wasLiked ? Math.max(0, previousCount - 1) : previousCount + 1;

      setLikedContent((prev) => {
        const next = new Set(prev);
        if (newLiked) {
          next.add(contentId);
        } else {
          next.delete(contentId);
        }
        return next;
      });

      setLikeCounts((prev) => {
        const next = new Map(prev);
        next.set(contentId, newCount);
        return next;
      });

      // API call
      const response = await ugcApi.toggleLike(contentId);

      // Check if this request is still valid
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      if (response.success && response.data) {
        // Update with server-confirmed values
        setLikedContent((prev) => {
          const next = new Set(prev);
          if (response.data!.isLiked) {
            next.add(contentId);
          } else {
            next.delete(contentId);
          }
          return next;
        });

        setLikeCounts((prev) => {
          const next = new Map(prev);
          next.set(contentId, response.data!.likes);
          return next;
        });

        // Show success toast
        showSuccess(
          response.data!.isLiked ? 'Added to favorites' : 'Removed from favorites',
          2000
        );
      } else {
        throw new Error(response.error || 'Failed to update like');
      }
    } catch (error) {
      // Check if this request is still valid
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      // Rollback optimistic update
      setLikedContent((prev) => {
        const next = new Set(prev);
        if (wasLiked) {
          next.add(contentId);
        } else {
          next.delete(contentId);
        }
        return next;
      });

      setLikeCounts((prev) => {
        const next = new Map(prev);
        next.set(contentId, previousCount);
        return next;
      });

      // Show error toast
      showError('Failed to update like', 3000);
    } finally {
      // Remove from processing set
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(contentId);
        return next;
      });
    }
  }, [processingIds, likedContent, likeCounts, showSuccess, showError]);

  /**
   * Toggle bookmark for content
   */
  const toggleBookmark = useCallback(async (contentId: string) => {
    // Prevent concurrent requests for same content
    if (processingIds.has(contentId)) return;

    const currentRequestId = ++requestIdRef.current;
    const wasBookmarked = bookmarkedContent.has(contentId);

    try {
      // Add to processing set
      setProcessingIds((prev) => new Set(prev).add(contentId));

      // Optimistic update
      const newBookmarked = !wasBookmarked;

      setBookmarkedContent((prev) => {
        const next = new Set(prev);
        if (newBookmarked) {
          next.add(contentId);
        } else {
          next.delete(contentId);
        }
        return next;
      });

      // API call
      const response = await ugcApi.toggleBookmark(contentId);

      // Check if this request is still valid
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      if (response.success && response.data) {
        // Update with server-confirmed value
        setBookmarkedContent((prev) => {
          const next = new Set(prev);
          if (response.data!.isBookmarked) {
            next.add(contentId);
          } else {
            next.delete(contentId);
          }
          return next;
        });

        // Show success toast
        showSuccess(
          response.data!.isBookmarked ? 'Bookmarked' : 'Bookmark removed',
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
      setBookmarkedContent((prev) => {
        const next = new Set(prev);
        if (wasBookmarked) {
          next.add(contentId);
        } else {
          next.delete(contentId);
        }
        return next;
      });

      // Show error toast
      showError('Failed to update bookmark', 3000);
    } finally {
      // Remove from processing set
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(contentId);
        return next;
      });
    }
  }, [processingIds, bookmarkedContent, showSuccess, showError]);

  /**
   * Update a single content item's state
   */
  const updateContentState = useCallback((contentId: string, updates: Partial<UGCContent>) => {
    if (updates.isLiked !== undefined) {
      setLikedContent((prev) => {
        const next = new Set(prev);
        if (updates.isLiked) {
          next.add(contentId);
        } else {
          next.delete(contentId);
        }
        return next;
      });
    }
    if (updates.isBookmarked !== undefined) {
      setBookmarkedContent((prev) => {
        const next = new Set(prev);
        if (updates.isBookmarked) {
          next.add(contentId);
        } else {
          next.delete(contentId);
        }
        return next;
      });
    }
    if (updates.likes !== undefined) {
      setLikeCounts((prev) => {
        const next = new Map(prev);
        next.set(contentId, updates.likes!);
        return next;
      });
    }
    notifyStateChange();
  }, [notifyStateChange]);

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    setLikedContent(new Set());
    setBookmarkedContent(new Set());
    setLikeCounts(new Map());
    setProcessingIds(new Set());
  }, []);

  return {
    // State
    likedContent,
    bookmarkedContent,
    likeCounts,

    // Getters
    isLiked,
    isBookmarked,
    getLikeCount,
    isProcessing,

    // Actions
    toggleLike,
    toggleBookmark,
    initializeState,
    updateContentState,
    reset,
  };
}

export default useUGCInteractions;
