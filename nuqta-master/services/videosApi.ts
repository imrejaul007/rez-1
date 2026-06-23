// Videos API Service
// Handles video content management, streaming, and engagement

import apiClient, { ApiResponse } from './apiClient';

export interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  videoUrl: string;
  duration: number;
  creator: {
    id: string;
    name: string;
    avatar?: string;
    username: string;
    verified: boolean;
  };
  category: {
    id: string;
    name: string;
    slug: string;
  };
  tags: string[];
  metrics: {
    views: number;
    likes: number;
    dislikes: number;
    comments: number;
    shares: number;
  };
  engagement: {
    liked: boolean;
    disliked: boolean;
    bookmarked: boolean;
    watchTime: number;
    completed: boolean;
  };
  visibility: 'public' | 'unlisted' | 'private';
  status: 'processing' | 'ready' | 'failed' | 'deleted';
  quality: Array<{
    resolution: string;
    url: string;
    size: number;
  }>;
  relatedProducts?: Array<{
    id: string;
    name: string;
    price: number;
    thumbnail: string;
    link: string;
  }>;
  chapters?: Array<{
    title: string;
    startTime: number;
    endTime: number;
    description?: string;
  }>;
  monetization?: {
    enabled: boolean;
    revenue: number;
    adBreaks: number[];
  };
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface VideosQuery {
  page?: number;
  limit?: number;
  category?: string;
  creator?: string;
  search?: string;
  tags?: string[];
  duration?: 'short' | 'medium' | 'long'; // <5min, 5-20min, >20min
  quality?: '360p' | '720p' | '1080p' | '4k';
  sort?: 'newest' | 'oldest' | 'popular' | 'trending' | 'views' | 'likes' | 'duration';
  order?: 'asc' | 'desc';
  visibility?: Video['visibility'];
  status?: Video['status'];
  dateFrom?: string;
  dateTo?: string;
}

export interface VideosResponse {
  videos: Video[];
  pagination: {
    current: number;
    pages: number;
    total: number;
    limit: number;
  };
  filters: {
    categories: Array<{ id: string; name: string; count: number }>;
    creators: Array<{ id: string; name: string; count: number }>;
    tags: Array<{ name: string; count: number }>;
    durations: Record<string, number>;
  };
}

export interface VideoUpload {
  id: string;
  title: string;
  description?: string;
  categoryId: string;
  tags: string[];
  thumbnail?: File;
  visibility: Video['visibility'];
  relatedProducts?: string[]; // product IDs
  chapters?: Video['chapters'];
}

export interface VideoComment {
  id: string;
  content: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
    username: string;
  };
  likes: number;
  dislikes: number;
  replies: VideoComment[];
  parentId?: string;
  liked: boolean;
  disliked: boolean;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VideoAnalytics {
  overview: {
    totalViews: number;
    totalWatchTime: number;
    averageWatchTime: number;
    engagement: number;
    subscribers: number;
  };
  demographics: {
    ageGroups: Record<string, number>;
    locations: Array<{ country: string; count: number }>;
    devices: Record<string, number>;
  };
  performance: {
    views: Array<{ date: string; count: number }>;
    watchTime: Array<{ date: string; minutes: number }>;
    engagement: Array<{ date: string; rate: number }>;
  };
  topVideos: Array<{
    id: string;
    title: string;
    views: number;
    watchTime: number;
  }>;
}

class VideosService {
  // Get videos with filtering and pagination
  async getVideos(query: VideosQuery = {}): Promise<ApiResponse<VideosResponse>> {
    return apiClient.get('/videos', query);
  }

  // Get single video by ID
  async getVideoById(videoId: string): Promise<ApiResponse<Video>> {
    return apiClient.get(`/videos/${videoId}`);
  }

  // Get trending videos
  async getTrendingVideos(
    limit: number = 20,
    category?: string
  ): Promise<ApiResponse<Video[]>> {
    return apiClient.get('/videos/trending', { limit, category });
  }

  // Get featured videos
  async getFeaturedVideos(limit: number = 10): Promise<ApiResponse<Video[]>> {
    return apiClient.get('/videos/featured', { limit });
  }

  // Search videos
  async searchVideos(
    query: string,
    filters?: Omit<VideosQuery, 'search'>
  ): Promise<ApiResponse<VideosResponse>> {
    return apiClient.get('/videos/search', {
      search: query,
      ...filters
    });
  }

  // Get recommended videos based on user preferences
  async getRecommendedVideos(
    userId?: string,
    limit: number = 20
  ): Promise<ApiResponse<Video[]>> {
    return apiClient.get('/videos/recommendations', { userId, limit });
  }

  // Get videos by category
  async getVideosByCategory(
    categorySlug: string,
    query: Omit<VideosQuery, 'category'> = {}
  ): Promise<ApiResponse<VideosResponse>> {
    return apiClient.get(`/videos/category/${categorySlug}`, query);
  }

  // Get videos by creator
  async getVideosByCreator(
    creatorId: string,
    query: Omit<VideosQuery, 'creator'> = {}
  ): Promise<ApiResponse<VideosResponse>> {
    return apiClient.get(`/videos/creator/${creatorId}`, query);
  }

  // Upload video
  async uploadVideo(
    videoFile: File,
    metadata: VideoUpload
  ): Promise<ApiResponse<{ videoId: string; uploadUrl: string }>> {
    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('metadata', JSON.stringify(metadata));
    
    return apiClient.uploadFile('/videos/upload', formData);
  }

  // Update video metadata
  async updateVideo(
    videoId: string,
    updates: Partial<VideoUpload>
  ): Promise<ApiResponse<Video>> {
    return apiClient.patch(`/videos/${videoId}`, updates);
  }

  // Delete video
  async deleteVideo(videoId: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete(`/videos/${videoId}`);
  }

  // Record video view
  async recordView(
    videoId: string,
    watchTime?: number,
    quality?: string
  ): Promise<ApiResponse<void>> {
    return apiClient.post(`/videos/${videoId}/view`, {
      watchTime,
      quality
    });
  }

  // Like video
  async likeVideo(videoId: string): Promise<ApiResponse<{ liked: boolean }>> {
    return apiClient.post(`/videos/${videoId}/like`);
  }

  // Unlike video
  async unlikeVideo(videoId: string): Promise<ApiResponse<{ liked: boolean }>> {
    return apiClient.delete(`/videos/${videoId}/like`);
  }

  // Dislike video
  async dislikeVideo(videoId: string): Promise<ApiResponse<{ disliked: boolean }>> {
    return apiClient.post(`/videos/${videoId}/dislike`);
  }

  // Remove dislike from video
  async removeDislike(videoId: string): Promise<ApiResponse<{ disliked: boolean }>> {
    return apiClient.delete(`/videos/${videoId}/dislike`);
  }

  // Bookmark video
  async bookmarkVideo(videoId: string): Promise<ApiResponse<{ bookmarked: boolean }>> {
    return apiClient.post(`/videos/${videoId}/bookmark`);
  }

  // Remove bookmark from video
  async removeBookmark(videoId: string): Promise<ApiResponse<{ bookmarked: boolean }>> {
    return apiClient.delete(`/videos/${videoId}/bookmark`);
  }

  // Get user's bookmarked videos
  async getBookmarkedVideos(
    page: number = 1,
    limit: number = 20
  ): Promise<ApiResponse<VideosResponse>> {
    return apiClient.get('/videos/bookmarks', { page, limit });
  }

  // Share video
  async shareVideo(
    videoId: string,
    platform: 'facebook' | 'twitter' | 'whatsapp' | 'copy_link',
    message?: string
  ): Promise<ApiResponse<{ shareUrl: string }>> {
    return apiClient.post(`/videos/${videoId}/share`, {
      platform,
      message
    });
  }

  // Get video comments
  async getVideoComments(
    videoId: string,
    page: number = 1,
    limit: number = 20,
    sort: 'newest' | 'oldest' | 'popular' = 'newest'
  ): Promise<ApiResponse<{
    comments: VideoComment[];
    pagination: {
      current: number;
      pages: number;
      total: number;
      limit: number;
    };
  }>> {
    return apiClient.get(`/videos/${videoId}/comments`, {
      page,
      limit,
      sort
    });
  }

  // Add comment to video
  async addComment(
    videoId: string,
    content: string,
    parentId?: string
  ): Promise<ApiResponse<VideoComment>> {
    return apiClient.post(`/videos/${videoId}/comments`, {
      content,
      parentId
    });
  }

  // Update comment
  async updateComment(
    commentId: string,
    content: string
  ): Promise<ApiResponse<VideoComment>> {
    return apiClient.patch(`/comments/${commentId}`, { content });
  }

  // Delete comment
  async deleteComment(commentId: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete(`/comments/${commentId}`);
  }

  // Like comment
  async likeComment(commentId: string): Promise<ApiResponse<{ liked: boolean }>> {
    return apiClient.post(`/comments/${commentId}/like`);
  }

  // Get video analytics (creator only)
  async getVideoAnalytics(
    videoId: string,
    dateRange?: {
      from: string;
      to: string;
    }
  ): Promise<ApiResponse<VideoAnalytics>> {
    return apiClient.get(`/videos/${videoId}/analytics`, dateRange);
  }

  // Get video categories
  async getVideoCategories(): Promise<ApiResponse<Array<{
    id: string;
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    videoCount: number;
  }>>> {
    return apiClient.get('/videos/categories');
  }

  // Get video streaming URL with quality options
  async getStreamingUrl(
    videoId: string,
    quality?: string
  ): Promise<ApiResponse<{
    streamingUrl: string;
    qualities: Video['quality'];
    subtitles?: Array<{
      language: string;
      url: string;
    }>;
  }>> {
    return apiClient.get(`/videos/${videoId}/stream`, { quality });
  }

  // Report video
  async reportVideo(
    videoId: string,
    reason: string,
    description?: string
  ): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post(`/videos/${videoId}/report`, {
      reason,
      description
    });
  }

  // Get watch history
  async getWatchHistory(
    page: number = 1,
    limit: number = 20
  ): Promise<ApiResponse<{
    videos: Array<{
      video: Video;
      watchedAt: string;
      watchTime: number;
      completed: boolean;
    }>;
    pagination: {
      current: number;
      pages: number;
      total: number;
      limit: number;
    };
  }>> {
    return apiClient.get('/videos/history', { page, limit });
  }

  // Clear watch history
  async clearWatchHistory(): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete('/videos/history');
  }
}

// Import real API
import realVideosApi from './realVideosApi';

// Feature toggle: use real API or mock API
const USE_REAL_API = process.env.EXPO_PUBLIC_MOCK_API !== 'true';

// Create singleton instance
const videosService = new VideosService();

// Export real API if enabled, otherwise mock
export default USE_REAL_API ? realVideosApi : videosService;

/**
 * Fetch videos for the play page. Delegates to the active service
 * (`realVideosApi` in production, `videosService` in mock mode) and returns
 * a flat array of video items regardless of the underlying response shape.
 *
 * This is a convenience wrapper used by `usePlayPageData` and is also the
 * function mocked in `__tests__/hooks/usePlayPageData.test.ts`.
 */
export async function fetchVideos(params?: { category?: string; page?: number; limit?: number }) {
  const category = params?.category || 'trending_me';
  const limit = params?.limit || 20;
  try {
    const response = await (USE_REAL_API
      ? realVideosApi.getVideosByCategory(category, { page: params?.page || 1, limit, sortBy: 'newest' })
      : videosService.getVideosByCategory(category, { page: params?.page || 1, limit }));
    if (response && (response as any).success && (response as any).data) {
      return ((response as any).data.videos ?? (response as any).data) || [];
    }
    if (Array.isArray(response)) return response;
    return [];
  } catch {
    return [];
  }
}