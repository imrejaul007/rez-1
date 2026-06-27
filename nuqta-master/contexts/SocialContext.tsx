import React, { createContext, useState, useContext, ReactNode, useMemo, useRef, useCallback } from 'react';
import * as activityFeedApi from '../services/activityFeedApi';
import { Activity, UserProfile, Comment } from '../services/activityFeedApi';
import { useToastStore } from '@/stores/toastStore';

interface SocialContextType {
  // Feed state
  activities: Activity[];
  isLoadingFeed: boolean;
  feedPage: number;
  hasMoreActivities: boolean;

  // Actions
  loadFeed: (refresh?: boolean) => Promise<void>;
  loadMoreActivities: () => Promise<void>;
  refreshFeed: () => Promise<void>;

  // Like/Comment actions
  likeActivity: (activityId: string) => Promise<void>;
  commentOnActivity: (activityId: string, comment: string) => Promise<void>;

  // Follow actions
  followUser: (userId: string) => Promise<void>;
  unfollowUser: (userId: string) => Promise<void>;

  // User activities
  loadUserActivities: (userId: string) => Promise<Activity[]>;

  // Follow lists
  loadFollowers: (userId: string) => Promise<UserProfile[]>;
  loadFollowing: (userId: string) => Promise<UserProfile[]>;

  // Suggested users
  suggestedUsers: UserProfile[];
  loadSuggestedUsers: () => Promise<void>;
}

const SocialContext = createContext<SocialContextType | undefined>(undefined);

export const SocialProvider = ({ children }: { children: ReactNode }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [feedPage, setFeedPage] = useState(1);
  const [hasMoreActivities, setHasMoreActivities] = useState(true);
  const [suggestedUsers, setSuggestedUsers] = useState<UserProfile[]>([]);
  const showError = useToastStore((state) => state.showError);

  // Ref for request race condition prevention
  const requestIdRef = useRef(0);

  /**
   * Load activity feed
   */
  const loadFeed = async (refresh: boolean = false, explicitPage?: number) => {
    if (isLoadingFeed) return;

    try {
      setIsLoadingFeed(true);
      const page = refresh ? 1 : (explicitPage ?? feedPage);

      const { activities: newActivities, pagination } = await activityFeedApi.getActivityFeed(page, 20);

      if (refresh) {
        setActivities(newActivities);
        setFeedPage(1);
      } else {
        setActivities(prev => {
          const merged = [...prev, ...newActivities];
          // Cap at 500 items to prevent unbounded memory growth
          return merged.length > 500 ? merged.slice(-500) : merged;
        });
      }

      setHasMoreActivities(pagination.hasMore);
    } catch (error) {
      // silently handle
    } finally {
      setIsLoadingFeed(false);
    }
  };

  /**
   * Load more activities (pagination)
   */
  const loadMoreActivities = async () => {
    if (!hasMoreActivities || isLoadingFeed) return;

    const nextPage = feedPage + 1;
    setFeedPage(nextPage);
    await loadFeed(false, nextPage);
  };

  /**
   * Refresh feed
   */
  const refreshFeed = async () => {
    await loadFeed(true);
  };

  /**
   * Like/Unlike an activity with optimistic update
   */
  const likeActivity = async (activityId: string) => {
    const currentRequestId = ++requestIdRef.current;

    // Find the activity and store previous state for rollback
    const activity = activities.find(a => a._id === activityId);
    if (!activity) return;

    const previousLiked = activity.hasLiked;
    const previousLikesCount = activity.likesCount || 0;

    // Optimistic update - immediately toggle like
    setActivities(prev =>
      prev.map(a =>
        a._id === activityId
          ? {
              ...a,
              hasLiked: !previousLiked,
              likesCount: previousLiked
                ? Math.max(0, previousLikesCount - 1)
                : previousLikesCount + 1
            }
          : a
      )
    );

    try {
      const { liked, likesCount } = await activityFeedApi.toggleLike(activityId);

      // Check if this request is still valid (race condition prevention)
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      // Update with server-confirmed values
      setActivities(prev =>
        prev.map(a =>
          a._id === activityId
            ? { ...a, hasLiked: liked, likesCount }
            : a
        )
      );
    } catch (error) {
      // Check if this request is still valid
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      // Rollback optimistic update
      setActivities(prev =>
        prev.map(a =>
          a._id === activityId
            ? { ...a, hasLiked: previousLiked, likesCount: previousLikesCount }
            : a
        )
      );
      showError('Failed to update like', 3000);
    }
  };

  /**
   * Comment on an activity
   */
  const commentOnActivity = async (activityId: string, comment: string) => {
    try {
      await activityFeedApi.addComment(activityId, comment);

      // Update local state to show comment was added
      setActivities(prev =>
        prev.map(activity =>
          activity._id === activityId
            ? { ...activity, hasCommented: true }
            : activity
        )
      );
    } catch (error) {
      throw error;
    }
  };

  /**
   * Follow a user with optimistic update
   */
  const followUser = async (userId: string) => {
    const currentRequestId = ++requestIdRef.current;

    // Find the suggested user and store previous state
    const suggestedUser = suggestedUsers.find(u => u._id === userId);
    const wasFollowing = suggestedUser?.isFollowing || false;

    // Optimistic update - immediately update suggested users list
    setSuggestedUsers(prev =>
      prev.map(u =>
        u._id === userId ? { ...u, isFollowing: true } : u
      )
    );

    try {
      await activityFeedApi.toggleFollow(userId);

      // Check if this request is still valid
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      // Reload suggested users to get updated list
      await loadSuggestedUsers();
    } catch (error) {
      // Check if this request is still valid
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      // Rollback optimistic update
      setSuggestedUsers(prev =>
        prev.map(u =>
          u._id === userId ? { ...u, isFollowing: wasFollowing } : u
        )
      );
      showError('Failed to follow user', 3000);
    }
  };

  /**
   * Unfollow a user with optimistic update
   */
  const unfollowUser = async (userId: string) => {
    const currentRequestId = ++requestIdRef.current;

    // Find the suggested user and store previous state
    const suggestedUser = suggestedUsers.find(u => u._id === userId);
    const wasFollowing = suggestedUser?.isFollowing || false;

    // Optimistic update - immediately update suggested users list
    setSuggestedUsers(prev =>
      prev.map(u =>
        u._id === userId ? { ...u, isFollowing: false } : u
      )
    );

    try {
      await activityFeedApi.toggleFollow(userId);

      // Check if this request is still valid
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      // Reload suggested users to get updated list
      await loadSuggestedUsers();
    } catch (error) {
      // Check if this request is still valid
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      // Rollback optimistic update
      setSuggestedUsers(prev =>
        prev.map(u =>
          u._id === userId ? { ...u, isFollowing: wasFollowing } : u
        )
      );
      showError('Failed to unfollow user', 3000);
    }
  };

  /**
   * Load user's activities
   */
  const loadUserActivities = async (userId: string): Promise<Activity[]> => {
    try {
      const { activities } = await activityFeedApi.getUserActivities(userId, 1, 20);
      return activities;
    } catch (error) {
      return [];
    }
  };

  /**
   * Load followers
   */
  const loadFollowers = async (userId: string): Promise<UserProfile[]> => {
    try {
      const { followers } = await activityFeedApi.getFollowers(userId, 1, 50);
      return followers;
    } catch (error) {
      return [];
    }
  };

  /**
   * Load following
   */
  const loadFollowing = async (userId: string): Promise<UserProfile[]> => {
    try {
      const { following } = await activityFeedApi.getFollowing(userId, 1, 50);
      return following;
    } catch (error) {
      return [];
    }
  };

  /**
   * Load suggested users
   */
  const loadSuggestedUsers = async () => {
    try {
      const users = await activityFeedApi.getSuggestedUsers(10);
      setSuggestedUsers(users);
    } catch (error) {
      // silently handle
    }
  };

  const value = useMemo<SocialContextType>(() => ({
    activities,
    isLoadingFeed,
    feedPage,
    hasMoreActivities,
    loadFeed,
    loadMoreActivities,
    refreshFeed,
    likeActivity,
    commentOnActivity,
    followUser,
    unfollowUser,
    loadUserActivities,
    loadFollowers,
    loadFollowing,
    suggestedUsers,
    loadSuggestedUsers
  }), [activities, isLoadingFeed, feedPage, hasMoreActivities, suggestedUsers]);

  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>;
};

/**
 * Hook to access social context.
 * Now backed by Zustand store — works with or without SocialProvider in tree.
 */
export const useSocial = () => {
  const context = useContext(SocialContext);
  const store = __useSocialStore();
  if (context) return context;
  return store as unknown as SocialContextType;
};

// Lazy import to avoid circular deps
let __useSocialStore: () => any;
try {
  const { useSocialStore } = require('@/stores/socialStore');
  __useSocialStore = useSocialStore;
} catch {
  __useSocialStore = () => ({});
}

export default SocialContext;
