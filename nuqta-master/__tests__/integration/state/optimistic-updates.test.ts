/**
 * Optimistic Updates Integration Tests
 * Tests for like, bookmark, rating, and follow optimistic updates
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Text, Pressable } from 'react-native';
import apiClient from '@/services/apiClient';
import { cleanupAfterTest } from '../utils/testHelpers';

// Mock the toast store
jest.mock('@/stores/toastStore', () => ({
  useToastStore: () => ({
    showSuccess: jest.fn(),
    showError: jest.fn(),
  }),
}));

// Mock the auth selectors
jest.mock('@/stores/selectors', () => ({
  useIsAuthenticated: () => true,
  useAuthLoading: () => false,
  useAuthUser: () => ({ id: 'user_1' }),
  useGetCurrencySymbol: () => () => '$',
}));

// Mock ugcApi
jest.mock('@/services/ugcApi', () => ({
  default: {
    toggleLike: jest.fn(),
    toggleBookmark: jest.fn(),
    likeContent: jest.fn(),
    unlikeContent: jest.fn(),
    bookmarkContent: jest.fn(),
    removeBookmark: jest.fn(),
  },
  ugcApi: {
    toggleLike: jest.fn(),
    toggleBookmark: jest.fn(),
  },
}));

// Mock followApi
jest.mock('@/services/followApi', () => ({
  checkFollowStatus: jest.fn().mockResolvedValue({ success: true, data: { isFollowing: false } }),
  getFollowCounts: jest.fn().mockResolvedValue({ success: true, data: { followersCount: 0, followingCount: 0, mutualCount: 0 } }),
  followUser: jest.fn(),
  unfollowUser: jest.fn(),
  getFollowSuggestions: jest.fn().mockResolvedValue({ success: true, data: { suggestions: [] } }),
  getFollowers: jest.fn().mockResolvedValue({ success: true, data: { followers: [], pagination: {} } }),
  getFollowing: jest.fn().mockResolvedValue({ success: true, data: { following: [], pagination: {} } }),
  getMutualFollowers: jest.fn().mockResolvedValue({ success: true, data: { mutuals: [], pagination: {} } }),
  getPendingFollowRequests: jest.fn().mockResolvedValue({ success: true, data: { requests: [] } }),
  acceptFollowRequest: jest.fn().mockResolvedValue({ success: true }),
  rejectFollowRequest: jest.fn().mockResolvedValue({ success: true }),
  removeFollower: jest.fn().mockResolvedValue({ success: true }),
  searchUsers: jest.fn().mockResolvedValue({ success: true, data: { users: [], pagination: {} } }),
}));

// Mock reviewsApi
jest.mock('@/services/reviewsApi', () => ({
  default: {
    updateReview: jest.fn(),
    createReview: jest.fn(),
    markHelpful: jest.fn(),
  },
}));

// Import hooks after mocking
import { useLikeButton } from '@/hooks/useLikeButton';
import { useBookmarkButton } from '@/hooks/useBookmarkButton';
import { useRating } from '@/hooks/useRating';
import { useFollowSystem } from '@/hooks/useFollowSystem';
import { useUGCInteractions } from '@/hooks/useUGCInteractions';
import ugcApi from '@/services/ugcApi';
import * as followApi from '@/services/followApi';

describe('Optimistic Updates Tests', () => {
  afterEach(async () => {
    await cleanupAfterTest();
    jest.clearAllMocks();
  });

  // ── useLikeButton Tests ──────────────────────────────

  describe('useLikeButton', () => {
    it('should optimistically update like state immediately', async () => {
      const mockToggleLike = ugcApi.toggleLike as jest.Mock;
      mockToggleLike.mockResolvedValue({
        success: true,
        data: { isLiked: true, likes: 11 },
      });

      const { result } = renderHook(() => useLikeButton({
        initialLiked: false,
        initialCount: 10,
      }));

      expect(result.current.isLiked).toBe(false);
      expect(result.current.likeCount).toBe(10);

      await act(async () => {
        await result.current.toggleLike('content_1');
      });

      // Optimistic update - state changes immediately
      expect(result.current.isLiked).toBe(true);
      expect(result.current.likeCount).toBe(11);

      await waitFor(() => {
        expect(mockToggleLike).toHaveBeenCalledWith('content_1');
      });
    });

    it('should rollback on API failure', async () => {
      const mockToggleLike = ugcApi.toggleLike as jest.Mock;
      mockToggleLike.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useLikeButton({
        initialLiked: false,
        initialCount: 10,
      }));

      await act(async () => {
        await result.current.toggleLike('content_1');
      });

      // Should rollback to original state
      expect(result.current.isLiked).toBe(false);
      expect(result.current.likeCount).toBe(10);
    });

    it('should prevent concurrent requests', async () => {
      const mockToggleLike = ugcApi.toggleLike as jest.Mock;
      mockToggleLike.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({
        success: true,
        data: { isLiked: true, likes: 11 },
      }), 500)));

      const { result } = renderHook(() => useLikeButton({
        initialLiked: false,
        initialCount: 10,
      }));

      await act(async () => {
        // Start first request
        const promise1 = result.current.toggleLike('content_1');
        // Try second request immediately
        const promise2 = result.current.toggleLike('content_1');

        await Promise.all([promise1, promise2]);
      });

      // Should only call API once
      expect(mockToggleLike).toHaveBeenCalledTimes(1);
    });
  });

  // ── useBookmarkButton Tests ──────────────────────────────

  describe('useBookmarkButton', () => {
    it('should optimistically update bookmark state', async () => {
      const mockToggleBookmark = ugcApi.toggleBookmark as jest.Mock;
      mockToggleBookmark.mockResolvedValue({
        success: true,
        data: { isBookmarked: true },
      });

      const { result } = renderHook(() => useBookmarkButton({
        initialBookmarked: false,
      }));

      expect(result.current.isBookmarked).toBe(false);

      await act(async () => {
        await result.current.toggleBookmark('content_1');
      });

      // Optimistic update
      expect(result.current.isBookmarked).toBe(true);
    });

    it('should rollback on API failure', async () => {
      const mockToggleBookmark = ugcApi.toggleBookmark as jest.Mock;
      mockToggleBookmark.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useBookmarkButton({
        initialBookmarked: false,
      }));

      await act(async () => {
        await result.current.toggleBookmark('content_1');
      });

      // Should rollback
      expect(result.current.isBookmarked).toBe(false);
    });
  });

  // ── useRating Tests ──────────────────────────────

  describe('useRating', () => {
    it('should optimistically update rating value', async () => {
      const { result } = renderHook(() => useRating({
        initialRating: 0,
      }));

      expect(result.current.rating).toBe(0);

      await act(async () => {
        await result.current.setRating(4);
      });

      expect(result.current.rating).toBe(4);
    });
  });

  // ── useFollowSystem Tests ──────────────────────────────

  describe('useFollowSystem', () => {
    beforeEach(() => {
      (followApi.checkFollowStatus as jest.Mock).mockResolvedValue({
        success: true,
        data: { isFollowing: false, isFollower: false, isMutual: false },
      });
      (followApi.getFollowCounts as jest.Mock).mockResolvedValue({
        success: true,
        data: { followersCount: 100, followingCount: 50, mutualCount: 10 },
      });
    });

    it('should optimistically update follow state', async () => {
      const mockFollowUser = followApi.followUser as jest.Mock;
      mockFollowUser.mockResolvedValue({
        success: true,
        data: { followersCount: 101, followingCount: 51 },
      });

      const { result } = renderHook(() => useFollowSystem('user_2'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isFollowing).toBe(false);

      await act(async () => {
        await result.current.follow('user_2');
      });

      // Optimistic update
      expect(result.current.isFollowing).toBe(true);
    });

    it('should rollback on follow failure', async () => {
      const mockFollowUser = followApi.followUser as jest.Mock;
      mockFollowUser.mockRejectedValue(new Error('Failed to follow'));

      const { result } = renderHook(() => useFollowSystem('user_2'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.follow('user_2');
      });

      // Should rollback
      expect(result.current.isFollowing).toBe(false);
    });

    it('should rollback on unfollow failure', async () => {
      (followApi.checkFollowStatus as jest.Mock).mockResolvedValue({
        success: true,
        data: { isFollowing: true, isFollower: false, isMutual: false },
      });

      const mockUnfollowUser = followApi.unfollowUser as jest.Mock;
      mockUnfollowUser.mockRejectedValue(new Error('Failed to unfollow'));

      const { result } = renderHook(() => useFollowSystem('user_2'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isFollowing).toBe(true);
      });

      await act(async () => {
        await result.current.unfollow('user_2');
      });

      // Should rollback
      expect(result.current.isFollowing).toBe(true);
    });
  });

  // ── useUGCInteractions Tests ──────────────────────────────

  describe('useUGCInteractions', () => {
    const mockContent = [
      { id: 'content_1', isLiked: false, isBookmarked: false, likes: 10, userName: 'User 1' },
      { id: 'content_2', isLiked: true, isBookmarked: false, likes: 20, userName: 'User 2' },
    ];

    it('should initialize state from content array', () => {
      const { result } = renderHook(() => useUGCInteractions({
        initialContent: mockContent as any,
      }));

      expect(result.current.isLiked('content_1')).toBe(false);
      expect(result.current.isLiked('content_2')).toBe(true);
      expect(result.current.getLikeCount('content_1')).toBe(10);
    });

    it('should optimistically toggle like for content', async () => {
      const mockToggleLike = ugcApi.toggleLike as jest.Mock;
      mockToggleLike.mockResolvedValue({
        success: true,
        data: { isLiked: true, likes: 11 },
      });

      const { result } = renderHook(() => useUGCInteractions({
        initialContent: mockContent as any,
      }));

      expect(result.current.isLiked('content_1')).toBe(false);

      await act(async () => {
        await result.current.toggleLike('content_1');
      });

      // Optimistic update
      expect(result.current.isLiked('content_1')).toBe(true);
      expect(result.current.getLikeCount('content_1')).toBe(11);
    });

    it('should optimistically toggle bookmark for content', async () => {
      const mockToggleBookmark = ugcApi.toggleBookmark as jest.Mock;
      mockToggleBookmark.mockResolvedValue({
        success: true,
        data: { isBookmarked: true },
      });

      const { result } = renderHook(() => useUGCInteractions({
        initialContent: mockContent as any,
      }));

      expect(result.current.isBookmarked('content_1')).toBe(false);

      await act(async () => {
        await result.current.toggleBookmark('content_1');
      });

      // Optimistic update
      expect(result.current.isBookmarked('content_1')).toBe(true);
    });

    it('should rollback like on API failure', async () => {
      const mockToggleLike = ugcApi.toggleLike as jest.Mock;
      mockToggleLike.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useUGCInteractions({
        initialContent: mockContent as any,
      }));

      await act(async () => {
        await result.current.toggleLike('content_1');
      });

      // Should rollback
      expect(result.current.isLiked('content_1')).toBe(false);
    });
  });

  // ── Race Condition Tests ──────────────────────────────

  describe('Race condition handling', () => {
    it('should handle rapid successive clicks correctly', async () => {
      const mockToggleLike = ugcApi.toggleLike as jest.Mock;
      let callCount = 0;
      mockToggleLike.mockImplementation(() => {
        callCount++;
        return new Promise(resolve => setTimeout(() => resolve({
          success: true,
          data: { isLiked: true, likes: 11 },
        }), 100));
      });

      const { result } = renderHook(() => useLikeButton({
        initialLiked: false,
        initialCount: 10,
      }));

      await act(async () => {
        // Rapid clicks - should only process one
        result.current.toggleLike('content_1');
        result.current.toggleLike('content_1');
        result.current.toggleLike('content_1');
      });

      // Wait for API to settle
      await new Promise(resolve => setTimeout(resolve, 200));

      // Should only call API once due to concurrent request prevention
      expect(callCount).toBeLessThanOrEqual(1);
    });
  });
});
