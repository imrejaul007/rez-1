// Offer Comment API Service
// Handles commenting on offers and earning coins

import apiClient from './apiClient';

export interface CommentableOffer {
  id: string;
  title: string;
  description?: string;
  store?: { id: string; name: string; logo?: string } | null;
  commentCount: number;
  endDate?: string;
}

export interface OfferCommentItem {
  id: string;
  text: string;
  likes: number;
  replies: {
    id: string;
    text: string;
    likes: number;
    user: { id: string; name: string; avatar?: string } | null;
    createdAt: string;
  }[];
  user: { id: string; name: string; avatar?: string } | null;
  createdAt: string;
}

export interface MyCommentItem {
  id: string;
  text: string;
  moderationStatus: 'pending' | 'approved' | 'rejected';
  coinsAwarded: number;
  qualityScore: number;
  likes: number;
  offer: { id: string; title: string } | null;
  createdAt: string;
}

export interface CommentPagination {
  current: number;
  pages: number;
  total: number;
  hasMore: boolean;
}

class OfferCommentApiService {
  /**
   * Get offers available for commenting
   */
  async getCommentableOffers(
    page: number = 1,
    limit: number = 20
  ): Promise<{ success: boolean; data?: { offers: CommentableOffer[]; pagination: CommentPagination }; error?: string }> {
    try {
      const response = await apiClient.get<{ offers: CommentableOffer[]; pagination: CommentPagination }>(
        `/offers/commentable?page=${page}&limit=${limit}`
      );
      if (response.success && response.data) {
        return { success: true, data: response.data };
      }
      return { success: false, error: response.message || 'Failed to fetch offers' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch offers' };
    }
  }

  /**
   * Post a comment on an offer
   */
  async createComment(
    offerId: string,
    text: string
  ): Promise<{ success: boolean; data?: any; message?: string; error?: string }> {
    try {
      const response = await apiClient.post<any>(`/offers/${offerId}/comments`, { text });
      if (response.success) {
        return { success: true, data: response.data, message: response.message };
      }
      return { success: false, error: response.message || 'Failed to post comment' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to post comment' };
    }
  }

  /**
   * Get approved comments for an offer
   */
  async getOfferComments(
    offerId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ success: boolean; data?: { comments: OfferCommentItem[]; pagination: CommentPagination }; error?: string }> {
    try {
      const response = await apiClient.get<{ comments: OfferCommentItem[]; pagination: CommentPagination }>(
        `/offers/${offerId}/comments?page=${page}&limit=${limit}`
      );
      if (response.success && response.data) {
        return { success: true, data: response.data };
      }
      return { success: false, error: response.message || 'Failed to fetch comments' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch comments' };
    }
  }

  /**
   * Get user's own comments with moderation status
   */
  async getMyComments(
    page: number = 1,
    limit: number = 20,
    status?: string
  ): Promise<{ success: boolean; data?: { comments: MyCommentItem[]; pagination: CommentPagination }; error?: string }> {
    try {
      let url = `/offers/comments/my-comments?page=${page}&limit=${limit}`;
      if (status) url += `&status=${status}`;

      const response = await apiClient.get<{ comments: MyCommentItem[]; pagination: CommentPagination }>(url);
      if (response.success && response.data) {
        return { success: true, data: response.data };
      }
      return { success: false, error: response.message || 'Failed to fetch comments' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch comments' };
    }
  }

  /**
   * Toggle like on a comment
   */
  async toggleLike(
    offerId: string,
    commentId: string
  ): Promise<{ success: boolean; data?: { isLiked: boolean; likes: number }; error?: string }> {
    try {
      const response = await apiClient.post<{ isLiked: boolean; likes: number }>(
        `/offers/${offerId}/comments/${commentId}/like`
      );
      if (response.success && response.data) {
        return { success: true, data: response.data };
      }
      return { success: false, error: response.message || 'Failed to update like' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to update like' };
    }
  }

  /**
   * Reply to a comment
   */
  async reply(
    offerId: string,
    commentId: string,
    text: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await apiClient.post<any>(
        `/offers/${offerId}/comments/${commentId}/reply`,
        { text }
      );
      if (response.success) {
        return { success: true, data: response.data };
      }
      return { success: false, error: response.message || 'Failed to post reply' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to post reply' };
    }
  }
}

export const offerCommentApi = new OfferCommentApiService();
export default offerCommentApi;
