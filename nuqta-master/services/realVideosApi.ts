// Real API implementation for Videos (Phase 5 - Social Features)
import apiClient from './apiClient';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

export interface Video {
  _id: string;
  title: string;
  description?: string;
  creator: {
    _id: string;
    profile: {
      firstName: string;
      lastName: string;
      avatar?: string;
    };
  };
  videoUrl: string;
  thumbnail: string;
  preview?: string;
  category: 'trending_me' | 'trending_her' | 'waist' | 'article' | 'featured' | 'challenge' | 'tutorial' | 'review';
  contentType?: 'merchant' | 'ugc' | 'article_video'; // Content type from backend
  tags: string[];
  hashtags: string[];
  products: any[];
  stores: any[];
  engagement: {
    views: number;
    likes: string[];
    shares: number;
    comments: number;
    saves: number;
  };
  metadata: {
    duration: number;
    resolution?: string;
    fileSize?: number;
    format?: string;
    aspectRatio?: string;
    fps?: number;
  };
  isPublished: boolean;
  isFeatured: boolean;
  isTrending: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const realVideosApi = {
  /**
   * Get all videos with filtering and pagination
   */
  async getVideos(params?: {
    category?: string;
    creator?: string;
    contentType?: 'merchant' | 'ugc' | 'article_video';
    hasProducts?: boolean;
    search?: string;
    sortBy?: 'newest' | 'popular' | 'trending' | 'likes';
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ videos: Video[]; pagination: any }>> {
    const queryParams = new URLSearchParams();

    if (params?.category) queryParams.append('category', params.category);
    if (params?.creator) queryParams.append('creator', params.creator);
    if (params?.contentType) queryParams.append('contentType', params.contentType);
    if (params?.hasProducts !== undefined) queryParams.append('hasProducts', String(params.hasProducts));
    if (params?.search) queryParams.append('search', params.search);
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));

    return apiClient.get(`/videos?${queryParams.toString()}`).then(response => response as ApiResponse<{ videos: Video[]; pagination: any }>);
  },

  /**
   * Get trending videos
   */
  async getTrendingVideos(params?: {
    limit?: number;
    timeframe?: '1d' | '7d' | '30d';
  }): Promise<ApiResponse<Video[]>> {
    const queryParams = new URLSearchParams();

    if (params?.limit) queryParams.append('limit', String(params.limit));
    if (params?.timeframe) queryParams.append('timeframe', params.timeframe);

    return apiClient.get(`/videos/trending?${queryParams.toString()}`).then(response => response as ApiResponse<Video[]>);
  },

  /**
   * Get videos by category
   */
  async getVideosByCategory(
    category: string,
    params?: {
      page?: number;
      limit?: number;
      sortBy?: 'newest' | 'popular' | 'trending';
    }
  ): Promise<ApiResponse<{ videos: Video[]; pagination: any }>> {
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);

    return apiClient.get(`/videos/category/${category}?${queryParams.toString()}`).then(response => response as ApiResponse<{ videos: Video[]; pagination: any }>);
  },

  /**
   * Get videos by creator
   */
  async getVideosByCreator(
    creatorId: string,
    params?: {
      page?: number;
      limit?: number;
    }
  ): Promise<ApiResponse<{ videos: Video[]; pagination: any }>> {
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));

    return apiClient.get(`/videos/creator/${creatorId}?${queryParams.toString()}`).then(response => response as ApiResponse<{ videos: Video[]; pagination: any }>);
  },

  /**
   * Get single video by ID
   */
  async getVideoById(videoId: string): Promise<any> {
    const response = await apiClient.get(`/videos/${videoId}`);
    return response;
  },

  /**
   * Like/Unlike a video (requires authentication)
   */
  async toggleVideoLike(videoId: string): Promise<ApiResponse<{ liked: boolean; likeCount: number; isLiked?: boolean; totalLikes?: number }>> {
    const response = await apiClient.post(`/videos/${videoId}/like`);
    return response as ApiResponse<{ liked: boolean; likeCount: number; isLiked?: boolean; totalLikes?: number }>;
  },

  /**
   * Bookmark/Unbookmark a video (requires authentication)
   */
  async toggleBookmark(videoId: string): Promise<ApiResponse<{ videoId: string; isBookmarked: boolean; totalBookmarks: number }>> {
    const response = await apiClient.post(`/videos/${videoId}/bookmark`);
    return response as ApiResponse<{ videoId: string; isBookmarked: boolean; totalBookmarks: number }>;
  },

  /**
   * Track video view (optional authentication)
   */
  async trackView(videoId: string): Promise<ApiResponse<{ videoId: string; views: number }>> {
    const response = await apiClient.post(`/videos/${videoId}/view`);
    return response as ApiResponse<{ videoId: string; views: number }>;
  },

  /**
   * Add comment to video (requires authentication)
   */
  async addVideoComment(videoId: string, comment: string): Promise<ApiResponse<any>> {
    return apiClient.post(`/videos/${videoId}/comments`, { comment }).then(response => response as ApiResponse<any>);
  },

  /**
   * Get video comments
   */
  async getVideoComments(
    videoId: string,
    params?: {
      page?: number;
      limit?: number;
    }
  ): Promise<ApiResponse<{ comments: any[]; pagination: any }>> {
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));

    return apiClient.get(`/videos/${videoId}/comments?${queryParams.toString()}`).then(response => response as ApiResponse<{ comments: any[]; pagination: any }>);
  },

  /**
   * Search videos
   */
  async searchVideos(params: {
    q: string;
    category?: string;
    creator?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ videos: Video[]; pagination: any }>> {
    const queryParams = new URLSearchParams();

    queryParams.append('q', params.q);
    if (params.category) queryParams.append('category', params.category);
    if (params.creator) queryParams.append('creator', params.creator);
    if (params.page) queryParams.append('page', String(params.page));
    if (params.limit) queryParams.append('limit', String(params.limit));

    return apiClient.get(`/videos/search?${queryParams.toString()}`).then(response => response as ApiResponse<{ videos: Video[]; pagination: any }>);
  },

  /**
   * Report a video (requires authentication)
   */
  async reportVideo(
    videoId: string,
    reason: 'inappropriate' | 'misleading' | 'spam' | 'copyright' | 'other',
    details?: string
  ): Promise<ApiResponse<{ videoId: string; reportCount: number; isReported: boolean }>> {
    return apiClient.post(`/videos/${videoId}/report`, { reason, details }).then(response => response as ApiResponse<{ videoId: string; reportCount: number; isReported: boolean }>);
  },
};

export default realVideosApi;
