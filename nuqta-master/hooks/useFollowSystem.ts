/**
 * useFollowSystem Hook
 * Manages follow/unfollow functionality with optimistic updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import { useToastStore } from '@/stores/toastStore';
import * as followApi from '@/services/followApi';
import type { FollowUser, FollowStatus, FollowCounts, FollowRequest } from '@/services/followApi';

interface UseFollowSystemOptions {
  userId?: string;
  onFollowChange?: (userId: string, isFollowing: boolean) => void;
  onFollowersChange?: (count: number) => void;
  /** Show toast notifications for actions */
  showToasts?: boolean;
}

interface FollowSystemState {
  isFollowing: boolean;
  isFollower: boolean;
  isMutual: boolean;
  followersCount: number;
  followingCount: number;
  mutualCount: number;
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
}

export function useFollowSystem(targetUserId?: string, options: UseFollowSystemOptions = {}) {
  const {
    onFollowChange,
    onFollowersChange,
    showToasts = true,
  } = options;

  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const [state, setState] = useState<FollowSystemState>({
    isFollowing: false,
    isFollower: false,
    isMutual: false,
    followersCount: 0,
    followingCount: 0,
    mutualCount: 0,
    isLoading: false,
    isUpdating: false,
    error: null,
  });

  const [suggestions, setSuggestions] = useState<FollowUser[]>([]);
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [mutuals, setMutuals] = useState<FollowUser[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FollowRequest[]>([]);

  // Toast notifications
  const showSuccess = useToastStore((state) => state.showSuccess);
  const showError = useToastStore((state) => state.showError);

  // Ref for request race condition prevention
  const requestIdRef = useRef(0);

  // Load follow status
  const loadFollowStatus = useCallback(async () => {
    if (!targetUserId) return;

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const [statusResponse, countsResponse] = await Promise.all([
        followApi.checkFollowStatus(targetUserId),
        followApi.getFollowCounts(targetUserId),
      ]);

      if (statusResponse.success && countsResponse.success) {
        setState(prev => ({
          ...prev,
          isFollowing: statusResponse.data.isFollowing,
          isFollower: statusResponse.data.isFollower,
          isMutual: statusResponse.data.isMutual,
          followersCount: countsResponse.data.followersCount,
          followingCount: countsResponse.data.followingCount,
          mutualCount: countsResponse.data.mutualCount,
          isLoading: false,
        }));
      }
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to load follow status',
      }));
    }
  }, [targetUserId]);

  // Load follow status on mount
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    if (targetUserId) {
      loadFollowStatus();
    }
  }, [targetUserId, loadFollowStatus, authLoading, isAuthenticated]);

  // Follow user with optimistic update
  const follow = useCallback(async (userId: string): Promise<boolean> => {
    if (state.isUpdating) return false;

    const currentRequestId = ++requestIdRef.current;
    const previousState = {
      isFollowing: state.isFollowing,
      followersCount: state.followersCount,
      followingCount: state.followingCount,
    };

    try {
      // Set updating state
      setState(prev => ({ ...prev, isUpdating: true, error: null }));

      // Optimistic update - immediate UI feedback
      setState(prev => ({
        ...prev,
        isFollowing: true,
        followersCount: prev.followersCount + 1,
      }));

      const response = await followApi.followUser(userId);

      // Check if this request is still valid
      if (currentRequestId !== requestIdRef.current) {
        return false;
      }

      if (response.success) {
        setState(prev => ({
          ...prev,
          followersCount: response.data.followersCount,
          followingCount: response.data.followingCount,
          isUpdating: false,
        }));

        // Trigger callbacks
        if (onFollowChange) {
          onFollowChange(userId, true);
        }
        if (onFollowersChange) {
          onFollowersChange(response.data.followersCount);
        }

        // Show success toast
        if (showToasts) {
          showSuccess('Following', 2000);
        }

        return true;
      } else {
        throw new Error(response.error || 'Failed to follow user');
      }
    } catch (error: any) {
      // Check if this request is still valid
      if (currentRequestId !== requestIdRef.current) {
        return false;
      }

      // Rollback optimistic update
      setState(prev => ({
        ...prev,
        isFollowing: previousState.isFollowing,
        followersCount: previousState.followersCount,
        followingCount: previousState.followingCount,
        error: error.message || 'Failed to follow user',
        isUpdating: false,
      }));

      // Show error toast
      if (showToasts) {
        showError('Failed to follow user', 3000);
      }

      return false;
    }
  }, [state.isUpdating, state.isFollowing, state.followersCount, state.followingCount, onFollowChange, onFollowersChange, showToasts, showSuccess, showError]);

  // Unfollow user with optimistic update
  const unfollow = useCallback(async (userId: string): Promise<boolean> => {
    if (state.isUpdating) return false;

    const currentRequestId = ++requestIdRef.current;
    const previousState = {
      isFollowing: state.isFollowing,
      followersCount: state.followersCount,
      followingCount: state.followingCount,
    };

    try {
      // Set updating state
      setState(prev => ({ ...prev, isUpdating: true, error: null }));

      // Optimistic update - immediate UI feedback
      setState(prev => ({
        ...prev,
        isFollowing: false,
        followingCount: Math.max(0, prev.followingCount - 1),
      }));

      const response = await followApi.unfollowUser(userId);

      // Check if this request is still valid
      if (currentRequestId !== requestIdRef.current) {
        return false;
      }

      if (response.success) {
        setState(prev => ({
          ...prev,
          followersCount: response.data.followersCount,
          followingCount: response.data.followingCount,
          isUpdating: false,
        }));

        // Trigger callbacks
        if (onFollowChange) {
          onFollowChange(userId, false);
        }
        if (onFollowersChange) {
          onFollowersChange(response.data.followersCount);
        }

        // Show success toast
        if (showToasts) {
          showSuccess('Unfollowed', 2000);
        }

        return true;
      } else {
        throw new Error(response.error || 'Failed to unfollow user');
      }
    } catch (error: any) {
      // Check if this request is still valid
      if (currentRequestId !== requestIdRef.current) {
        return false;
      }

      // Rollback optimistic update
      setState(prev => ({
        ...prev,
        isFollowing: previousState.isFollowing,
        followersCount: previousState.followersCount,
        followingCount: previousState.followingCount,
        error: error.message || 'Failed to unfollow user',
        isUpdating: false,
      }));

      // Show error toast
      if (showToasts) {
        showError('Failed to unfollow user', 3000);
      }

      return false;
    }
  }, [state.isUpdating, state.isFollowing, state.followersCount, state.followingCount, onFollowChange, onFollowersChange, showToasts, showSuccess, showError]);

  // Toggle follow/unfollow
  const toggleFollow = useCallback(async (userId: string): Promise<boolean> => {
    if (state.isUpdating) return false;

    if (state.isFollowing) {
      return await unfollow(userId);
    } else {
      return await follow(userId);
    }
  }, [state.isUpdating, state.isFollowing, follow, unfollow]);

  // Load follow suggestions
  const loadSuggestions = useCallback(async (limit: number = 10) => {
    try {
      const response = await followApi.getFollowSuggestions(limit);
      if (response.success) {
        setSuggestions(response.data.suggestions || []);
      }
    } catch (error: any) {
      // silently handle
    }
  }, []);

  // Load followers list
  const loadFollowers = useCallback(async (userId: string, page: number = 1) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));

      const response = await followApi.getFollowers(userId, page, 50);

      if (response.success) {
        if (page === 1) {
          setFollowers(response.data.followers || []);
        } else {
          setFollowers(prev => [...prev, ...(response.data.followers || [])]);
        }
        setState(prev => ({ ...prev, isLoading: false }));
        return response.data.pagination;
      }

      setState(prev => ({ ...prev, isLoading: false }));
      return null;
    } catch (error: any) {
      setState(prev => ({ ...prev, isLoading: false, error: error.message }));
      return null;
    }
  }, []);

  // Load following list
  const loadFollowing = useCallback(async (userId: string, page: number = 1) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));

      const response = await followApi.getFollowing(userId, page, 50);

      if (response.success) {
        if (page === 1) {
          setFollowing(response.data.following || []);
        } else {
          setFollowing(prev => [...prev, ...(response.data.following || [])]);
        }
        setState(prev => ({ ...prev, isLoading: false }));
        return response.data.pagination;
      }

      setState(prev => ({ ...prev, isLoading: false }));
      return null;
    } catch (error: any) {
      setState(prev => ({ ...prev, isLoading: false, error: error.message }));
      return null;
    }
  }, []);

  // Load mutual followers
  const loadMutuals = useCallback(async (userId: string, page: number = 1) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));

      const response = await followApi.getMutualFollowers(userId, page, 50);

      if (response.success) {
        if (page === 1) {
          setMutuals(response.data.mutuals || []);
        } else {
          setMutuals(prev => [...prev, ...(response.data.mutuals || [])]);
        }
        setState(prev => ({ ...prev, isLoading: false }));
        return response.data.pagination;
      }

      setState(prev => ({ ...prev, isLoading: false }));
      return null;
    } catch (error: any) {
      setState(prev => ({ ...prev, isLoading: false, error: error.message }));
      return null;
    }
  }, []);

  // Load pending follow requests
  const loadPendingRequests = useCallback(async () => {
    try {
      const response = await followApi.getPendingFollowRequests();
      if (response.success) {
        setPendingRequests(response.data.requests || []);
      }
    } catch (error: any) {
      // silently handle
    }
  }, []);

  // Accept follow request
  const acceptRequest = useCallback(async (requestId: string) => {
    try {
      const response = await followApi.acceptFollowRequest(requestId);
      if (response.success) {
        // Remove from pending
        setPendingRequests(prev => prev.filter(req => req._id !== requestId));
        // Reload counts
        if (targetUserId) {
          loadFollowStatus();
        }
        return true;
      }
      return false;
    } catch (error: any) {
      return false;
    }
  }, [targetUserId, loadFollowStatus]);

  // Reject follow request
  const rejectRequest = useCallback(async (requestId: string) => {
    try {
      const response = await followApi.rejectFollowRequest(requestId);
      if (response.success) {
        // Remove from pending
        setPendingRequests(prev => prev.filter(req => req._id !== requestId));
        return true;
      }
      return false;
    } catch (error: any) {
      return false;
    }
  }, []);

  // Remove follower
  const removeFollower = useCallback(async (userId: string) => {
    try {
      const response = await followApi.removeFollower(userId);
      if (response.success) {
        // Remove from followers list
        setFollowers(prev => prev.filter(user => user._id !== userId));
        // Update count
        setState(prev => ({
          ...prev,
          followersCount: Math.max(0, prev.followersCount - 1),
        }));
        return true;
      }
      return false;
    } catch (error: any) {
      return false;
    }
  }, []);

  // Search users
  const searchUsers = useCallback(async (query: string, page: number = 1) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));

      const response = await followApi.searchUsers(query, page, 20);

      setState(prev => ({ ...prev, isLoading: false }));

      if (response.success) {
        return {
          users: response.data.users || [],
          pagination: response.data.pagination,
        };
      }
      return null;
    } catch (error: any) {
      setState(prev => ({ ...prev, isLoading: false, error: error.message }));
      return null;
    }
  }, []);

  return {
    // State
    ...state,
    suggestions,
    followers,
    following,
    mutuals,
    pendingRequests,

    // Actions
    follow,
    unfollow,
    toggleFollow,
    loadFollowStatus,
    loadSuggestions,
    loadFollowers,
    loadFollowing,
    loadMutuals,
    loadPendingRequests,
    acceptRequest,
    rejectRequest,
    removeFollower,
    searchUsers,
  };
}

export default useFollowSystem;
