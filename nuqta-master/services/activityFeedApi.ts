import apiClient from './apiClient';

// Note: apiClient already unwraps responseData.data, so response.data IS the backend's data field directly.
// For paginated endpoints, pagination is at the top level of the backend response but the apiClient
// doesn't carry it through, so we compute hasMore from the result count.

const API_PREFIX = '/api';

export interface Activity {
  _id: string;
  user: {
    _id: string;
    name: string;
    profilePicture?: string;
    email?: string;
  };
  type: string;
  feedContent: {
    title: string;
    description?: string;
    amount?: number;
    icon: string;
    color: string;
    type: string;
  };
  relatedEntity?: {
    id: string;
    type: string;
  };
  hasLiked: boolean;
  hasCommented: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  _id: string;
  user: {
    _id: string;
    name: string;
    profilePicture?: string;
  };
  comment: string;
  createdAt: string;
}

export interface UserProfile {
  _id: string;
  name: string;
  profilePicture?: string;
  email?: string;
}

export interface FollowStatus {
  following: boolean;
  followersCount: number;
}

export interface ActivityStats {
  likes: number;
  comments: number;
  shares: number;
}

/**
 * Get activity feed for authenticated user
 */
export async function getActivityFeed(page: number = 1, limit: number = 20): Promise<{
  activities: Activity[];
  pagination: { page: number; limit: number; hasMore: boolean };
}> {
  try {
    const response = await apiClient.get<Activity[]>(`${API_PREFIX}/social/feed`, { page, limit });

    const activities = Array.isArray(response.data) ? response.data : [];

    return {
      activities,
      pagination: { page, limit, hasMore: activities.length === limit }
    };
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to fetch activity feed');
  }
}

/**
 * Get user's activities
 */
export async function getUserActivities(
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<{
  activities: Activity[];
  pagination: { page: number; limit: number; hasMore: boolean };
}> {
  try {
    const response = await apiClient.get<Activity[]>(`${API_PREFIX}/social/users/${userId}/activities`, { page, limit });

    const activities = Array.isArray(response.data) ? response.data : [];

    return {
      activities,
      pagination: { page, limit, hasMore: activities.length === limit }
    };
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to fetch user activities');
  }
}

/**
 * Create a new activity
 */
export async function createActivity(data: {
  type: string;
  title: string;
  description?: string;
  amount?: number;
  icon?: string;
  color?: string;
  relatedEntity?: { id: string; type: string };
  metadata?: Record<string, any>;
}): Promise<Activity> {
  try {
    const response = await apiClient.post<Activity>(`${API_PREFIX}/social/activities`, data);
    return response.data as Activity;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to create activity');
  }
}

/**
 * Like/Unlike an activity
 */
export async function toggleLike(activityId: string): Promise<{ liked: boolean; likesCount: number }> {
  try {
    const response = await apiClient.post<{ liked: boolean; likesCount: number }>(`${API_PREFIX}/social/activities/${activityId}/like`);
    return response.data as { liked: boolean; likesCount: number };
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to like activity');
  }
}

/**
 * Get comments for an activity
 */
export async function getActivityComments(
  activityId: string,
  page: number = 1,
  limit: number = 20
): Promise<{
  comments: Comment[];
  pagination: { page: number; limit: number; hasMore: boolean };
}> {
  try {
    const response = await apiClient.get<Comment[]>(`${API_PREFIX}/social/activities/${activityId}/comments`, { page, limit });

    const comments = Array.isArray(response.data) ? response.data : [];

    return {
      comments,
      pagination: { page, limit, hasMore: comments.length === limit }
    };
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to fetch comments');
  }
}

/**
 * Comment on an activity
 */
export async function addComment(activityId: string, comment: string): Promise<Comment> {
  try {
    const response = await apiClient.post<Comment>(`${API_PREFIX}/social/activities/${activityId}/comment`, {
      comment
    });
    return response.data as Comment;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to add comment');
  }
}

/**
 * Follow/Unfollow a user
 */
export async function toggleFollow(userId: string): Promise<FollowStatus> {
  try {
    const response = await apiClient.post<FollowStatus>(`${API_PREFIX}/social/users/${userId}/follow`);
    return response.data as FollowStatus;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to follow/unfollow user');
  }
}

/**
 * Check if following a user
 */
export async function checkFollowStatus(userId: string): Promise<boolean> {
  try {
    const response = await apiClient.get<{ isFollowing: boolean }>(`${API_PREFIX}/social/users/${userId}/is-following`);
    return response.data?.isFollowing ?? false;
  } catch (error: any) {
    return false;
  }
}

/**
 * Get user's followers
 */
export async function getFollowers(
  userId: string,
  page: number = 1,
  limit: number = 50
): Promise<{
  followers: UserProfile[];
  pagination: { page: number; limit: number; hasMore: boolean };
}> {
  try {
    const response = await apiClient.get<UserProfile[]>(`${API_PREFIX}/social/users/${userId}/followers`, { page, limit });

    const followers = Array.isArray(response.data) ? response.data : [];

    return {
      followers,
      pagination: { page, limit, hasMore: followers.length === limit }
    };
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to fetch followers');
  }
}

/**
 * Get user's following list
 */
export async function getFollowing(
  userId: string,
  page: number = 1,
  limit: number = 50
): Promise<{
  following: UserProfile[];
  pagination: { page: number; limit: number; hasMore: boolean };
}> {
  try {
    const response = await apiClient.get<UserProfile[]>(`${API_PREFIX}/social/users/${userId}/following`, { page, limit });

    const following = Array.isArray(response.data) ? response.data : [];

    return {
      following,
      pagination: { page, limit, hasMore: following.length === limit }
    };
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to fetch following list');
  }
}

/**
 * Get follow counts for a user
 */
export async function getFollowCounts(userId: string): Promise<{ followersCount: number; followingCount: number }> {
  try {
    const response = await apiClient.get<{ followersCount: number; followingCount: number }>(`${API_PREFIX}/social/users/${userId}/follow-counts`);
    return response.data ?? { followersCount: 0, followingCount: 0 };
  } catch (error: any) {
    return { followersCount: 0, followingCount: 0 };
  }
}

/**
 * Get suggested users to follow
 */
export async function getSuggestedUsers(limit: number = 10): Promise<UserProfile[]> {
  try {
    const response = await apiClient.get<UserProfile[]>(`${API_PREFIX}/social/suggested-users`, { limit });
    return Array.isArray(response.data) ? response.data : [];
  } catch (error: any) {
    return [];
  }
}

/**
 * Share an activity
 */
export async function shareActivity(activityId: string): Promise<void> {
  try {
    await apiClient.post(`${API_PREFIX}/social/activities/${activityId}/share`);
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to share activity');
  }
}

/**
 * Get activity statistics
 */
export async function getActivityStats(activityId: string): Promise<ActivityStats> {
  try {
    const response = await apiClient.get<ActivityStats>(`${API_PREFIX}/social/activities/${activityId}/stats`);
    return response.data ?? { likes: 0, comments: 0, shares: 0 };
  } catch (error: any) {
    return { likes: 0, comments: 0, shares: 0 };
  }
}
