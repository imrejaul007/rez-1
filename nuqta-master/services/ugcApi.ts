// User Generated Content (UGC) API Service
// Handles user photos, videos, and content sharing

import apiClient, { ApiResponse } from './apiClient';

export interface UGCMedia {
  _id: string;
  userId: string;
  user: {
    _id: string;
    profile: {
      firstName: string;
      lastName: string;
      avatar?: string;
    };
  };
  type: 'photo' | 'video';
  url: string;
  thumbnail?: string;
  caption?: string;
  tags: string[];
  relatedProduct?: {
    _id: string;
    name: string;
    image: string;
  };
  relatedStore?: {
    _id: string;
    name: string;
    logo: string;
  };
  likes: number;
  comments: number;
  shares: number;
  views: number;
  isLiked: boolean;
  isBookmarked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UGCComment {
  _id: string;
  userId: string;
  user: {
    _id: string;
    profile: {
      firstName: string;
      lastName: string;
      avatar?: string;
    };
  };
  comment: string;
  likes: number;
  isLiked: boolean;
  replies: UGCComment[];
  createdAt: string;
}

export interface CreateUGCRequest {
  type: 'photo' | 'video';
  caption?: string;
  tags?: string[];
  relatedProductId?: string;
  relatedStoreId?: string;
}

export interface UGCFilters {
  type?: 'photo' | 'video';
  userId?: string;
  productId?: string;
  storeId?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

// ── Reel-specific types ──────────────────────────
export interface UgcReel {
  id: string;
  title: string;
  description?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration: number;
  creator?: {
    id: string;
    name: string;
    avatar?: string;
  } | null;
  store?: {
    id: string;
    name: string;
    logo?: string;
  } | null;
  moderationStatus: 'pending' | 'approved' | 'rejected';
  isPublished: boolean;
  likes: number;
  comments: number;
  views: number;
  shares: number;
  tags: string[];
  createdAt: string;
}

export interface CreateReelRequest {
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  tags?: string[];
  taggedProducts?: string[];
  taggedStores?: string[];
  storeId?: string;
  category?: string;
}

export interface CreateReelResponse {
  id: string;
  title: string;
  moderationStatus: string;
  coinReward?: {
    coinsAwarded: number;
    status: string;
    message: string;
  } | null;
}

export interface UgcPagination {
  current: number;
  pages: number;
  total: number;
  hasMore: boolean;
}

class UGCApiService {
  private baseUrl = '/ugc';

  /**
   * Get UGC feed
   */
  async getFeed(filters?: UGCFilters): Promise<ApiResponse<{
    content: UGCMedia[];
    total: number;
    hasMore: boolean;
  }>> {

    return apiClient.get(this.baseUrl, filters);
  }

  /**
   * Get UGC by ID
   */
  async getById(id: string): Promise<ApiResponse<{ content: UGCMedia }>> {

    return apiClient.get(`${this.baseUrl}/${id}`);
  }

  /**
   * Create new UGC (upload)
   */
  async create(data: CreateUGCRequest, file: FormData): Promise<ApiResponse<{
    content: UGCMedia;
    message: string;
  }>> {

    // Add metadata to FormData
    for (const key in data) {
      if (data[key as keyof CreateUGCRequest] !== undefined) {
        file.append(key, String(data[key as keyof CreateUGCRequest]));
      }
    }

    return apiClient.uploadFile(this.baseUrl, file);
  }

  /**
   * Update UGC
   */
  async update(id: string, data: {
    caption?: string;
    tags?: string[];
  }): Promise<ApiResponse<{ content: UGCMedia }>> {

    return apiClient.put(`${this.baseUrl}/${id}`, data);
  }

  /**
   * Delete UGC
   */
  async delete(id: string): Promise<ApiResponse<{ message: string }>> {

    return apiClient.delete(`${this.baseUrl}/${id}`);
  }

  /**
   * Like UGC content
   */
  async likeContent(id: string): Promise<ApiResponse<{
    isLiked: boolean;
    likes: number;
  }>> {
    return apiClient.post(`${this.baseUrl}/${id}/like`);
  }

  /**
   * Unlike UGC content
   */
  async unlikeContent(id: string): Promise<ApiResponse<{
    isLiked: boolean;
    likes: number;
  }>> {
    return apiClient.delete(`${this.baseUrl}/${id}/like`);
  }

  /**
   * Like/Unlike UGC (toggle)
   */
  async toggleLike(id: string): Promise<ApiResponse<{
    isLiked: boolean;
    likes: number;
  }>> {
    return apiClient.post(`${this.baseUrl}/${id}/like`);
  }

  /**
   * Bookmark UGC content
   */
  async bookmarkContent(id: string): Promise<ApiResponse<{
    isBookmarked: boolean;
  }>> {
    return apiClient.post(`${this.baseUrl}/${id}/bookmark`);
  }

  /**
   * Remove bookmark from UGC content
   */
  async removeBookmark(id: string): Promise<ApiResponse<{
    isBookmarked: boolean;
  }>> {
    return apiClient.delete(`${this.baseUrl}/${id}/bookmark`);
  }

  /**
   * Bookmark/Unbookmark UGC (toggle)
   */
  async toggleBookmark(id: string): Promise<ApiResponse<{
    isBookmarked: boolean;
  }>> {
    return apiClient.post(`${this.baseUrl}/${id}/bookmark`);
  }

  /**
   * Check if user liked content
   */
  async checkLikeStatus(id: string): Promise<ApiResponse<{
    isLiked: boolean;
  }>> {
    return apiClient.get(`${this.baseUrl}/${id}/like/status`);
  }

  /**
   * Check if user bookmarked content
   */
  async checkBookmarkStatus(id: string): Promise<ApiResponse<{
    isBookmarked: boolean;
  }>> {
    return apiClient.get(`${this.baseUrl}/${id}/bookmark/status`);
  }

  /**
   * Share UGC
   */
  async share(id: string): Promise<ApiResponse<{ shares: number }>> {

    return apiClient.post(`${this.baseUrl}/${id}/share`);
  }

  /**
   * Get comments for UGC
   */
  async getComments(id: string, limit = 20, offset = 0): Promise<ApiResponse<{
    comments: UGCComment[];
    total: number;
    hasMore: boolean;
  }>> {

    return apiClient.get(`${this.baseUrl}/${id}/comments`, { limit, offset });
  }

  /**
   * Add comment to UGC
   */
  async addComment(id: string, comment: string, parentId?: string): Promise<ApiResponse<{
    comment: UGCComment;
  }>> {

    return apiClient.post(`${this.baseUrl}/${id}/comments`, { comment, parentId });
  }

  /**
   * Like/Unlike comment
   */
  async toggleCommentLike(ugcId: string, commentId: string): Promise<ApiResponse<{
    isLiked: boolean;
    likes: number;
  }>> {

    return apiClient.post(`${this.baseUrl}/${ugcId}/comments/${commentId}/like`);
  }

  /**
   * Delete comment
   */
  async deleteComment(ugcId: string, commentId: string): Promise<ApiResponse<{ message: string }>> {

    return apiClient.delete(`${this.baseUrl}/${ugcId}/comments/${commentId}`);
  }

  /**
   * Report comment
   */
  async reportComment(ugcId: string, commentId: string, reason: string, description?: string): Promise<ApiResponse<{
    message: string;
  }>> {

    return apiClient.post(`${this.baseUrl}/${ugcId}/comments/${commentId}/report`, { reason, description });
  }

  /**
   * Get user's UGC
   */
  async getUserContent(userId?: string, type?: 'photo' | 'video'): Promise<ApiResponse<{
    content: UGCMedia[];
    total: number;
  }>> {

    return apiClient.get(`${this.baseUrl}/user/${userId || 'me'}`, type ? { type } : undefined);
  }

  /**
   * Get UGC for product
   */
  async getProductContent(productId: string): Promise<ApiResponse<{
    content: UGCMedia[];
    total: number;
  }>> {

    return apiClient.get(`${this.baseUrl}/product/${productId}`);
  }

  /**
   * Get UGC for store
   */
  async getStoreContent(storeId: string, params?: {
    type?: 'photo' | 'video';
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<{
    content: UGCMedia[];
    total: number;
  }>> {

    try {
      // First, try to get videos from the videos endpoint
      const videosResponse = await apiClient.get(`/videos/store/${storeId}`, {
        limit: params?.limit || 20,
        offset: params?.offset || 0
      });

      let allContent: UGCMedia[] = [];

      // Process videos if available
      if (videosResponse.success && videosResponse.data?.content) {
        allContent = [...videosResponse.data.content];
      } else {
      }

      // Then try to get UGC content
      const ugcResponse = await apiClient.get(`${this.baseUrl}/store/${storeId}`, params);

      // Add UGC content if available (deduplicate by _id)
      if (ugcResponse.success && ugcResponse.data?.content) {

        // Get existing IDs to avoid duplicates
        const existingIds = new Set(allContent.map(item => item._id));
        const uniqueUGC = ugcResponse.data.content.filter((item: any) => !existingIds.has(item._id));

        allContent = [...allContent, ...uniqueUGC];
      } else {
      }


      // Return combined content (NO MOCK DATA)
      return {
        success: true,
        data: {
          content: allContent,
          total: allContent.length
        }
      };

    } catch (error) {
      // Return empty array on error (NO MOCK DATA)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch content',
        data: {
          content: [],
          total: 0
        }
      };
    }
  }


  // ── Reel-specific methods ─────────────────────────

  /**
   * Create a new UGC reel
   */
  async createReel(data: CreateReelRequest): Promise<{ success: boolean; data?: CreateReelResponse; message?: string; error?: string }> {
    try {
      const response = await apiClient.post('/ugc/create', data);
      if (response.success && response.data) {
        return { success: true, data: response.data as CreateReelResponse, message: (response as any).message };
      }
      return { success: false, error: (response as any).message || 'Failed to create reel' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to create reel' };
    }
  }

  /**
   * Create a new UGC post or story (photo-based content)
   */
  async createPost(data: {
    type: 'post' | 'story';
    imageUrls: string[];
    caption?: string;
    tags?: string[];
    taggedProducts?: string[];
    taggedStores?: string[];
    storeId?: string;
  }): Promise<{ success: boolean; data?: any; message?: string; error?: string }> {
    try {
      const response = await apiClient.post('/ugc/create-post', data);
      if (response.success && response.data) {
        return { success: true, data: response.data, message: (response as any).message };
      }
      return { success: false, error: (response as any).message || 'Failed to create post' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to create post' };
    }
  }

  /**
   * Get user's UGC reels with moderation status
   */
  async getMyReels(
    page: number = 1,
    limit: number = 20
  ): Promise<{ success: boolean; data?: { reels: UgcReel[]; pagination: UgcPagination }; error?: string }> {
    try {
      const response = await apiClient.get(`/ugc/my-reels?page=${page}&limit=${limit}`);
      if (response.success && response.data) {
        return { success: true, data: response.data as { reels: UgcReel[]; pagination: UgcPagination } };
      }
      return { success: false, error: (response as any).message || 'Failed to fetch reels' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch reels' };
    }
  }

  /**
   * Get public UGC reel feed (approved reels only)
   */
  async getReelFeed(
    page: number = 1,
    limit: number = 20
  ): Promise<{ success: boolean; data?: { reels: UgcReel[]; pagination: UgcPagination }; error?: string }> {
    try {
      const response = await apiClient.get(`/ugc/feed?page=${page}&limit=${limit}`);
      if (response.success && response.data) {
        return { success: true, data: response.data as { reels: UgcReel[]; pagination: UgcPagination } };
      }
      return { success: false, error: (response as any).message || 'Failed to fetch UGC feed' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch UGC feed' };
    }
  }

  /**
   * Get bookmarked UGC
   */
  async getBookmarked(type?: 'photo' | 'video'): Promise<ApiResponse<{
    content: UGCMedia[];
    total: number;
  }>> {

    return apiClient.get(`${this.baseUrl}/bookmarked`, type ? { type } : undefined);
  }

  /**
   * Report UGC
   */
  async report(id: string, reason: string, description?: string): Promise<ApiResponse<{
    message: string;
  }>> {

    return apiClient.post(`${this.baseUrl}/${id}/report`, { reason, description });
  }
}

// Export singleton instance
const ugcApiInstance = new UGCApiService();
export default ugcApiInstance;

// Named export for tests (unwrap data)
export const ugcApi = {
  ...ugcApiInstance,
  getUGCFeed: async (filters?: any) => {
    const r: any = await ugcApiInstance.getFeed(filters);
    return r?.data ?? r;
  },
  getFollowingFeed: async () => {
    const r: any = await ugcApiInstance.getFeed({ following: true });
    return r?.data ?? r;
  },
  searchByHashtag: async (tag: string) => {
    const r: any = await ugcApiInstance.getFeed({ hashtag: tag });
    return r?.data ?? r;
  },
  getContentByProduct: async (productId: string) => {
    const r: any = await ugcApiInstance.getFeed({ productId });
    return r?.data ?? r;
  },
  getTrendingContent: async () => {
    const r: any = await ugcApiInstance.getFeed({ trending: true });
    return r?.data ?? r;
  },
  uploadContent: async (data: any, file?: any) => {
    // If no FormData provided, just post as JSON
    if (!file) {
      const r: any = await apiClient.post('/ugc', data);
      return r?.data ?? r;
    }
    if (typeof ugcApiInstance.create === 'function') {
      const r: any = await ugcApiInstance.create(data, file);
      return r?.data ?? r;
    }
    return { id: `ugc_${Date.now()}`, ...data };
  },
  likeContent: async (id: string) => {
    const r: any = await ugcApiInstance.likeContent(id);
    return r?.data ?? r;
  },
  addComment: async (id: string, comment: string, parentId?: string) => {
    const r: any = await ugcApiInstance.addComment(id, comment, parentId);
    return r?.data ?? r;
  },
  shareContent: async (id: string, platform: string) => {
    const r: any = await ugcApiInstance.share(id);
    return r?.data ?? r;
  },
  reportContent: async (id: string, data: any) => {
    if (typeof ugcApiInstance.report === 'function') {
      const r: any = await ugcApiInstance.report(id, data);
      return r?.data ?? r;
    }
    return { success: true, data: { reported: true } };
  },
  trackVideoView: async (id: string, data: any) => {
    if (typeof ugcApiInstance.trackView === 'function') {
      const r: any = await ugcApiInstance.trackView(id, data);
      return r?.data ?? r;
    }
    // Fallback: call apiClient.post directly
    const r: any = await apiClient.post(`/ugc/${id}/track-view`, data);
    return r?.data ?? r;
  },
};

// Aliases for backward compat
export const getUGCFeed = ugcApi.getUGCFeed;
export const getFollowingFeed = ugcApi.getFollowingFeed;
export const searchByHashtag = ugcApi.searchByHashtag;
export const getContentByProduct = ugcApi.getContentByProduct;
export const reportContent = ugcApi.reportContent;
export const trackVideoView = ugcApi.trackVideoView;
export const shareContent = ugcApi.shareContent;
