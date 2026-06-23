// Reel API Service
// Handles all reel/video related API calls using the video endpoints

import apiClient, { ApiResponse } from './apiClient';

// ============================================
// TYPES
// ============================================

export interface Reel {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  category: string;
  duration?: number;
  creator: {
    id: string;
    name: string;
    avatar?: string;
    isVerified?: boolean;
  };
  store?: {
    id: string;
    name: string;
    logo?: string;
  };
  products?: {
    id: string;
    name: string;
    price: number;
    image?: string;
  }[];
  stats: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
  };
  isLiked?: boolean;
  isBookmarked?: boolean;
  createdAt: string;
  tags?: string[];
}

export interface ReelComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  comment: string;
  createdAt: string;
  likes: number;
  isLiked?: boolean;
}

// ============================================
// REEL API SERVICE
// ============================================

class ReelApiService {
  /**
   * Get all reels with optional filters
   */
  async getReels(params?: {
    category?: string;
    page?: number;
    limit?: number;
    sortBy?: 'newest' | 'popular' | 'trending';
  }): Promise<ApiResponse<{ reels: Reel[]; pagination: any }>> {
    try {
      const response = await apiClient.get<any>('/videos', params);

      if (response.success && response.data) {
        const reels = (response.data.videos || response.data || []).map((video: any) => this.transformVideoToReel(video));

        return {
          success: true,
          data: {
            reels,
            pagination: response.data.pagination || response.meta?.pagination,
          },
        };
      }

      return response;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get trending reels
   */
  async getTrendingReels(params?: {
    limit?: number;
    timeframe?: '1d' | '7d' | '30d';
  }): Promise<ApiResponse<Reel[]>> {
    try {
      const response = await apiClient.get<any>('/videos/trending', params);

      if (response.success && response.data) {
        const reels = (response.data.videos || response.data || []).map((video: any) => this.transformVideoToReel(video));
        return { success: true, data: reels };
      }

      return response;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get reels by category
   */
  async getReelsByCategory(category: string, params?: {
    page?: number;
    limit?: number;
    sortBy?: 'newest' | 'popular' | 'trending';
  }): Promise<ApiResponse<{ reels: Reel[]; pagination: any }>> {
    try {
      const response = await apiClient.get<any>(`/videos/category/${category}`, params);

      if (response.success && response.data) {
        const reels = (response.data.videos || response.data || []).map((video: any) => this.transformVideoToReel(video));

        return {
          success: true,
          data: {
            reels,
            pagination: response.data.pagination,
          },
        };
      }

      return response;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get single reel by ID
   */
  async getReelById(reelId: string): Promise<ApiResponse<Reel>> {
    try {
      const response = await apiClient.get<any>(`/videos/${reelId}`);

      if (response.success && response.data) {
        const reel = this.transformVideoToReel(response.data.video || response.data);
        return { success: true, data: reel };
      }

      return response;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get reels by creator
   */
  async getReelsByCreator(creatorId: string, params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ reels: Reel[]; pagination: any }>> {
    try {
      const response = await apiClient.get<any>(`/videos/creator/${creatorId}`, params);

      if (response.success && response.data) {
        const reels = (response.data.videos || response.data || []).map((video: any) => this.transformVideoToReel(video));

        return {
          success: true,
          data: {
            reels,
            pagination: response.data.pagination,
          },
        };
      }

      return response;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get reels by store
   */
  async getReelsByStore(storeId: string, params?: {
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<Reel[]>> {
    try {
      const response = await apiClient.get<any>(`/videos/store/${storeId}`, params);

      if (response.success && response.data) {
        const reels = (response.data.videos || response.data || []).map((video: any) => this.transformVideoToReel(video));
        return { success: true, data: reels };
      }

      return response;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Search reels
   */
  async searchReels(query: string, params?: {
    category?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ reels: Reel[]; pagination: any }>> {
    try {
      const response = await apiClient.get<any>('/videos/search', { q: query, ...params });

      if (response.success && response.data) {
        const reels = (response.data.videos || response.data || []).map((video: any) => this.transformVideoToReel(video));

        return {
          success: true,
          data: {
            reels,
            pagination: response.data.pagination,
          },
        };
      }

      return response;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Like/Unlike a reel
   */
  async toggleLike(reelId: string): Promise<ApiResponse<{ liked: boolean; likesCount: number }>> {
    try {
      const response = await apiClient.post<any>(`/videos/${reelId}/like`);

      if (response.success && response.data) {
        return {
          success: true,
          data: {
            liked: response.data.liked ?? response.data.isLiked ?? true,
            likesCount: response.data.likesCount ?? response.data.likes ?? 0,
          },
        };
      }

      return response;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Bookmark/Unbookmark a reel
   */
  async toggleBookmark(reelId: string): Promise<ApiResponse<{ bookmarked: boolean }>> {
    try {
      const response = await apiClient.post<any>(`/videos/${reelId}/bookmark`);

      if (response.success && response.data) {
        return {
          success: true,
          data: {
            bookmarked: response.data.bookmarked ?? response.data.isBookmarked ?? true,
          },
        };
      }

      return response;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Track reel view
   */
  async trackView(reelId: string): Promise<ApiResponse<{ viewsCount: number }>> {
    try {
      const response = await apiClient.post<any>(`/videos/${reelId}/view`);

      if (response.success) {
        return {
          success: true,
          data: {
            viewsCount: response.data?.viewsCount ?? response.data?.views ?? 0,
          },
        };
      }

      return response;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get reel comments
   */
  async getComments(reelId: string, params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ comments: ReelComment[]; pagination: any }>> {
    try {
      const response = await apiClient.get<any>(`/videos/${reelId}/comments`, params);

      if (response.success && response.data) {
        const comments = (response.data.comments || response.data || []).map((comment: any) => ({
          id: comment._id || comment.id,
          userId: comment.user?._id || comment.userId,
          userName: comment.user?.name || comment.userName || 'Anonymous',
          userAvatar: comment.user?.avatar || comment.userAvatar,
          comment: comment.comment || comment.text || comment.content,
          createdAt: comment.createdAt,
          likes: comment.likes || 0,
          isLiked: comment.isLiked || false,
        }));

        return {
          success: true,
          data: {
            comments,
            pagination: response.data.pagination,
          },
        };
      }

      return response;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Add a comment to a reel
   */
  async addComment(reelId: string, comment: string): Promise<ApiResponse<ReelComment>> {
    try {
      const response = await apiClient.post<any>(`/videos/${reelId}/comments`, { comment });

      if (response.success && response.data) {
        const newComment = response.data.comment || response.data;
        return {
          success: true,
          data: {
            id: newComment._id || newComment.id,
            userId: newComment.user?._id || newComment.userId,
            userName: newComment.user?.name || newComment.userName,
            userAvatar: newComment.user?.avatar || newComment.userAvatar,
            comment: newComment.comment || newComment.text,
            createdAt: newComment.createdAt,
            likes: 0,
            isLiked: false,
          },
        };
      }

      return response;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Share a reel (tracks share event on backend)
   */
  async shareReel(reelId: string): Promise<ApiResponse<{ shares: number }>> {
    try {
      const response = await apiClient.post<any>(`/videos/${reelId}/share`);

      if (response.success && response.data) {
        return {
          success: true,
          data: {
            shares: response.data.shares ?? 0,
          },
        };
      }

      return response;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Like/Unlike a comment
   */
  async toggleCommentLike(reelId: string, commentId: string): Promise<ApiResponse<{ isLiked: boolean; likesCount: number }>> {
    try {
      const response = await apiClient.post<any>(`/videos/${reelId}/comments/${commentId}/like`);

      if (response.success && response.data) {
        return {
          success: true,
          data: {
            isLiked: response.data.isLiked ?? true,
            likesCount: response.data.likesCount ?? 0,
          },
        };
      }

      return response;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Report a reel
   */
  async reportReel(reelId: string, reason: string, details?: string): Promise<ApiResponse<{ reported: boolean }>> {
    try {
      const response = await apiClient.post<any>(`/videos/${reelId}/report`, { reason, details });

      if (response.success) {
        return { success: true, data: { reported: true } };
      }

      return response;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Transform backend video object to frontend Reel format
   */
  private transformVideoToReel(video: any): Reel {
    // Extract creator name from nested profile object
    let creatorName = 'Creator';
    if (video.creator?.profile?.firstName) {
      creatorName = `${video.creator.profile.firstName} ${video.creator.profile.lastName || ''}`.trim();
    } else if (video.creator?.name) {
      creatorName = video.creator.name;
    } else if (video.creator?.username) {
      creatorName = video.creator.username;
    }

    // Extract avatar from profile
    const creatorAvatar = video.creator?.profile?.avatar
      || video.creator?.avatar
      || video.creator?.profileImage;

    // Normalize stats from whichever backend format is present.
    // The backend may return video stats under `stats`, `metrics`, `engagement`, or `analytics`.
    // We pick one canonical source in priority order and extract all four fields from it,
    // falling back field-by-field only when the primary source is missing a value.
    const src = video.stats || video.metrics || video.engagement || video.analytics || {};

    const extractCount = (field: string, altField?: string): number => {
      const val = src[field] ?? src[altField ?? ''];
      if (Array.isArray(val)) return val.length; // likes may be an array of user IDs
      return typeof val === 'number' ? val : 0;
    };

    const stats = {
      likes: extractCount('likes'),
      comments: extractCount('comments'),
      views: extractCount('views', 'totalViews'),
      shares: extractCount('shares'),
    };

    return {
      id: video._id || video.id,
      title: video.title || '',
      description: video.description,
      videoUrl: video.videoUrl,
      thumbnailUrl: video.thumbnail || video.thumbnailUrl,
      category: video.category || 'general',
      duration: video.duration || video.metadata?.duration,
      creator: {
        id: video.creator?._id || video.creator?.id || video.creatorId,
        name: creatorName,
        avatar: creatorAvatar,
        isVerified: video.creator?.isVerified || false,
      },
      store: video.products?.[0]?.store ? {
        id: video.products[0].store._id || video.products[0].store.id,
        name: video.products[0].store.name,
        logo: video.products[0].store.logo,
      } : undefined,
      products: video.products?.map((p: any) => ({
        id: p._id || p.id,
        name: p.name,
        price: p.pricing?.selling || p.pricing?.salePrice || p.price || 0,
        image: p.images?.[0] || p.image,
      })),
      stats,
      isLiked: video.isLiked || false,
      isBookmarked: video.isBookmarked || false,
      createdAt: video.createdAt,
      tags: video.tags || [],
    };
  }
}

// Create singleton instance
const reelApi = new ReelApiService();

export default reelApi;
export { reelApi };
