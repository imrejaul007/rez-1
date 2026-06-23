/**
 * Follow API Service
 * Handles all follow/unfollow related API calls
 */

import apiClient, { ApiResponse } from './apiClient';

const API_PREFIX = '/social';

export interface FollowUser {
  _id: string;
  name: string;
  fullName?: string;
  profilePicture?: string;
  email?: string;
  bio?: string;
  isFollowing?: boolean;
  isFollower?: boolean;
  isMutual?: boolean;
}

export interface FollowStatus {
  following: boolean;
  followersCount: number;
  followingCount: number;
}

export interface FollowRequest {
  _id: string;
  requester: FollowUser;
  recipient: FollowUser;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface FollowCounts {
  followersCount: number;
  followingCount: number;
  mutualCount: number;
}

/**
 * Follow a user
 */
export async function followUser(userId: string): Promise<ApiResponse<FollowStatus>> {
  try {

    const response = await apiClient.post<FollowStatus>(`${API_PREFIX}/users/${userId}/follow`);
    return response;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to follow user');
  }
}

/**
 * Unfollow a user
 */
export async function unfollowUser(userId: string): Promise<ApiResponse<FollowStatus>> {
  try {

    const response = await apiClient.delete<FollowStatus>(`${API_PREFIX}/users/${userId}/follow`);
    return response;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to unfollow user');
  }
}

/**
 * Toggle follow/unfollow (smart toggle)
 */
export async function toggleFollow(userId: string): Promise<ApiResponse<FollowStatus>> {
  try {

    const response = await apiClient.post<FollowStatus>(`${API_PREFIX}/users/${userId}/follow`);
    return response;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to toggle follow');
  }
}

/**
 * Get followers list
 */
export async function getFollowers(
  userId: string,
  page: number = 1,
  limit: number = 50
): Promise<ApiResponse<{
  followers: FollowUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}>> {
  try {
    const response = await apiClient.get<{
      followers: FollowUser[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        hasMore: boolean;
      };
    }>(`${API_PREFIX}/users/${userId}/followers`, {
      page,
      limit,
    });
    return response;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to fetch followers');
  }
}

/**
 * Get following list
 */
export async function getFollowing(
  userId: string,
  page: number = 1,
  limit: number = 50
): Promise<ApiResponse<{
  following: FollowUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}>> {
  try {
    const response = await apiClient.get<{
      following: FollowUser[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        hasMore: boolean;
      };
    }>(`${API_PREFIX}/users/${userId}/following`, {
      page,
      limit,
    });
    return response;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to fetch following list');
  }
}

/**
 * Get suggested users to follow
 */
export async function getFollowSuggestions(limit: number = 10): Promise<ApiResponse<{
  suggestions: FollowUser[];
}>> {
  try {

    const response = await apiClient.get<{
      suggestions: FollowUser[];
    }>(`${API_PREFIX}/suggested-users`, {
      limit,
    });
    return response;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to fetch suggestions');
  }
}

/**
 * Check if following a user
 */
export async function checkFollowStatus(userId: string): Promise<ApiResponse<{
  isFollowing: boolean;
  isFollower: boolean;
  isMutual: boolean;
}>> {
  try {
    const response = await apiClient.get<{
      isFollowing: boolean;
      isFollower: boolean;
      isMutual: boolean;
    }>(`${API_PREFIX}/users/${userId}/is-following`);
    return response;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to check follow status');
  }
}

/**
 * Get follow counts for a user
 */
export async function getFollowCounts(userId: string): Promise<ApiResponse<FollowCounts>> {
  try {
    const response = await apiClient.get<FollowCounts>(`${API_PREFIX}/users/${userId}/follow-counts`);
    return response;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to fetch follow counts');
  }
}

/**
 * Get pending follow requests (for private accounts)
 */
export async function getPendingFollowRequests(): Promise<ApiResponse<{
  requests: FollowRequest[];
}>> {
  try {
    const response = await apiClient.get<{
      requests: FollowRequest[];
    }>(`${API_PREFIX}/follow-requests/pending`);
    return response;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to fetch follow requests');
  }
}

/**
 * Accept follow request
 */
export async function acceptFollowRequest(requestId: string): Promise<ApiResponse<{
  request: FollowRequest;
}>> {
  try {

    const response = await apiClient.post<{
      request: FollowRequest;
    }>(`${API_PREFIX}/follow-requests/${requestId}/accept`);
    return response;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to accept follow request');
  }
}

/**
 * Reject follow request
 */
export async function rejectFollowRequest(requestId: string): Promise<ApiResponse<{
  request: FollowRequest;
}>> {
  try {

    const response = await apiClient.post<{
      request: FollowRequest;
    }>(`${API_PREFIX}/follow-requests/${requestId}/reject`);
    return response;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to reject follow request');
  }
}

/**
 * Get mutual followers (friends)
 */
export async function getMutualFollowers(
  userId: string,
  page: number = 1,
  limit: number = 50
): Promise<ApiResponse<{
  mutuals: FollowUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}>> {
  try {
    const response = await apiClient.get<{
      mutuals: FollowUser[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        hasMore: boolean;
      };
    }>(`${API_PREFIX}/users/${userId}/mutuals`, {
      page,
      limit,
    });
    return response;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to fetch mutual followers');
  }
}

/**
 * Search users to follow
 */
export async function searchUsers(
  query: string,
  page: number = 1,
  limit: number = 20
): Promise<ApiResponse<{
  users: FollowUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}>> {
  try {
    const response = await apiClient.get<{
      users: FollowUser[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        hasMore: boolean;
      };
    }>(`${API_PREFIX}/users/search`, {
      q: query,
      page,
      limit,
    });
    return response;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to search users');
  }
}

/**
 * Remove follower
 */
export async function removeFollower(userId: string): Promise<ApiResponse<{
  success: boolean;
}>> {
  try {

    const response = await apiClient.delete<{
      success: boolean;
    }>(`${API_PREFIX}/followers/${userId}`);
    return response;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to remove follower');
  }
}

/**
 * Block user
 */
export async function blockUser(userId: string): Promise<ApiResponse<{
  success: boolean;
}>> {
  try {

    const response = await apiClient.post<{
      success: boolean;
    }>(`${API_PREFIX}/users/${userId}/block`);
    return response;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to block user');
  }
}

/**
 * Unblock user
 */
export async function unblockUser(userId: string): Promise<ApiResponse<{
  success: boolean;
}>> {
  try {

    const response = await apiClient.post<{
      success: boolean;
    }>(`${API_PREFIX}/users/${userId}/unblock`);
    return response;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to unblock user');
  }
}

/**
 * Get blocked users list
 */
export async function getBlockedUsers(): Promise<ApiResponse<{
  blocked: FollowUser[];
}>> {
  try {
    const response = await apiClient.get<{
      blocked: FollowUser[];
    }>(`${API_PREFIX}/blocked-users`);
    return response;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to fetch blocked users');
  }
}


// Default export for tests (unwrap data)
const followApi = {
  followUser: async (userId: string) => {
    const r: any = await followUser(userId);
    return r?.data ?? r;
  },
  unfollowUser: async (userId: string) => {
    const r: any = await unfollowUser(userId);
    return r?.data ?? r;
  },
  toggleFollow: async (userId: string) => {
    const r: any = await toggleFollow(userId);
    return r?.data ?? r;
  },
  getFollowers: async (userId?: string) => {
    // Phase 22 fix: pass empty string when userId is undefined; the inner
    // getFollowers handles the "current user" case when the arg is empty.
    const r: any = await getFollowers(userId ?? '');
    return r?.data ?? r;
  },
  getFollowing: async (userId?: string) => {
    const r: any = await getFollowing(userId ?? '');
    return r?.data ?? r;
  },
  getFollowSuggestions: async (limit?: number) => {
    const r: any = await getFollowSuggestions(limit);
    return r?.data ?? r;
  },
  getBlockedUsers: async () => {
    const r: any = await getBlockedUsers();
    return r?.data ?? r;
  },
};
export default followApi;
export { followApi };
