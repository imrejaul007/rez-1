import { useState, useCallback } from 'react';
import { useIsAuthenticated } from '@/stores/selectors';
import { useToast } from '@/hooks/useToast';
import ugcApi from '@/services/ugcApi';

interface UGCInteractionState {
  likedContent: Set<string>;
  bookmarkedContent: Set<string>;
  likeCounts: Map<string, number>;
  isLoading: Set<string>;
}

/**
 * Hook for managing UGC like and bookmark interactions with backend synchronization
 * Includes optimistic updates and rollback on error
 */
export function useUGCInteractions() {
  const isAuthenticated = useIsAuthenticated();
  const { showSuccess, showError } = useToast();

  const [state, setState] = useState<UGCInteractionState>({
    likedContent: new Set(),
    bookmarkedContent: new Set(),
    likeCounts: new Map(),
    isLoading: new Set(),
  });

  /**
   * Check if user is authenticated
   */
  const requireAuth = useCallback(() => {
    if (!isAuthenticated) {
      showError('Please sign in to interact with content');
      return false;
    }
    return true;
  }, [isAuthenticated, showError]);

  /**
   * Initialize state from UGC content array
   */
  const initializeState = useCallback((content: any[]) => {
    const likedSet = new Set<string>();
    const bookmarkedSet = new Set<string>();
    const countsMap = new Map<string, number>();

    content.forEach((item) => {
      if (item.isLiked) likedSet.add(item.id);
      if (item.isBookmarked) bookmarkedSet.add(item.id);
      countsMap.set(item.id, item.likes || 0);
    });

    setState({
      likedContent: likedSet,
      bookmarkedContent: bookmarkedSet,
      likeCounts: countsMap,
      isLoading: new Set(),
    });
  }, []);

  /**
   * Toggle like on UGC content
   */
  const toggleLike = useCallback(
    async (contentId: string) => {
      if (!requireAuth()) return;

      // Check if already processing this content
      if (state.isLoading.has(contentId)) return;

      // Optimistic update
      const wasLiked = state.likedContent.has(contentId);
      const currentCount = state.likeCounts.get(contentId) || 0;
      const newCount = wasLiked ? currentCount - 1 : currentCount + 1;

      setState((prev) => {
        const newLiked = new Set(prev.likedContent);
        const newCounts = new Map(prev.likeCounts);
        const newLoading = new Set(prev.isLoading);

        if (wasLiked) {
          newLiked.delete(contentId);
        } else {
          newLiked.add(contentId);
        }
        newCounts.set(contentId, newCount);
        newLoading.add(contentId);

        return {
          ...prev,
          likedContent: newLiked,
          likeCounts: newCounts,
          isLoading: newLoading,
        };
      });

      try {
        // Call backend API
        const response = await ugcApi.toggleLike(contentId);

        if (response.success && response.data) {
          // Update with actual backend data
          setState((prev) => {
            const newLiked = new Set(prev.likedContent);
            const newCounts = new Map(prev.likeCounts);
            const newLoading = new Set(prev.isLoading);

            if (response.data!.isLiked) {
              newLiked.add(contentId);
            } else {
              newLiked.delete(contentId);
            }
            newCounts.set(contentId, response.data!.likes);
            newLoading.delete(contentId);

            return {
              ...prev,
              likedContent: newLiked,
              likeCounts: newCounts,
              isLoading: newLoading,
            };
          });

          // Show toast
          showSuccess(
            response.data.isLiked ? 'Added to favorites' : 'Removed from favorites',
            2000
          );
        } else {
          throw new Error(response.error || 'Failed to update like status');
        }
      } catch (error: any) {

        // Rollback optimistic update
        setState((prev) => {
          const newLiked = new Set(prev.likedContent);
          const newCounts = new Map(prev.likeCounts);
          const newLoading = new Set(prev.isLoading);

          if (wasLiked) {
            newLiked.add(contentId);
          } else {
            newLiked.delete(contentId);
          }
          newCounts.set(contentId, currentCount);
          newLoading.delete(contentId);

          return {
            ...prev,
            likedContent: newLiked,
            likeCounts: newCounts,
            isLoading: newLoading,
          };
        });

        showError(error?.message || 'Failed to update like', 3000);
      }
    },
    [state, requireAuth, showSuccess, showError]
  );

  /**
   * Toggle bookmark on UGC content
   */
  const toggleBookmark = useCallback(
    async (contentId: string) => {
      if (!requireAuth()) return;

      // Check if already processing this content
      if (state.isLoading.has(contentId)) return;

      // Optimistic update
      const wasBookmarked = state.bookmarkedContent.has(contentId);

      setState((prev) => {
        const newBookmarked = new Set(prev.bookmarkedContent);
        const newLoading = new Set(prev.isLoading);

        if (wasBookmarked) {
          newBookmarked.delete(contentId);
        } else {
          newBookmarked.add(contentId);
        }
        newLoading.add(contentId);

        return {
          ...prev,
          bookmarkedContent: newBookmarked,
          isLoading: newLoading,
        };
      });

      try {
        // Call backend API
        const response = await ugcApi.toggleBookmark(contentId);

        if (response.success && response.data) {
          // Update with actual backend data
          setState((prev) => {
            const newBookmarked = new Set(prev.bookmarkedContent);
            const newLoading = new Set(prev.isLoading);

            if (response.data!.isBookmarked) {
              newBookmarked.add(contentId);
            } else {
              newBookmarked.delete(contentId);
            }
            newLoading.delete(contentId);

            return {
              ...prev,
              bookmarkedContent: newBookmarked,
              isLoading: newLoading,
            };
          });

          // Show toast
          showSuccess(
            response.data.isBookmarked ? 'Bookmarked' : 'Bookmark removed',
            2000
          );
        } else {
          throw new Error(response.error || 'Failed to update bookmark status');
        }
      } catch (error: any) {

        // Rollback optimistic update
        setState((prev) => {
          const newBookmarked = new Set(prev.bookmarkedContent);
          const newLoading = new Set(prev.isLoading);

          if (wasBookmarked) {
            newBookmarked.add(contentId);
          } else {
            newBookmarked.delete(contentId);
          }
          newLoading.delete(contentId);

          return {
            ...prev,
            bookmarkedContent: newBookmarked,
            isLoading: newLoading,
          };
        });

        showError(error?.message || 'Failed to update bookmark', 3000);
      }
    },
    [state, requireAuth, showSuccess, showError]
  );

  /**
   * Check if content is liked
   */
  const isLiked = useCallback(
    (contentId: string) => {
      return state.likedContent.has(contentId);
    },
    [state.likedContent]
  );

  /**
   * Check if content is bookmarked
   */
  const isBookmarked = useCallback(
    (contentId: string) => {
      return state.bookmarkedContent.has(contentId);
    },
    [state.bookmarkedContent]
  );

  /**
   * Get like count for content
   */
  const getLikeCount = useCallback(
    (contentId: string) => {
      return state.likeCounts.get(contentId) || 0;
    },
    [state.likeCounts]
  );

  /**
   * Check if content is being processed
   */
  const isProcessing = useCallback(
    (contentId: string) => {
      return state.isLoading.has(contentId);
    },
    [state.isLoading]
  );

  return {
    toggleLike,
    toggleBookmark,
    isLiked,
    isBookmarked,
    getLikeCount,
    isProcessing,
    initializeState,
  };
}
