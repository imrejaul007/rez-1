// What's New Stories API Service
// API service for What's New stories functionality

import apiClient, { ApiResponse } from './apiClient';
import {
  IWhatsNewStory,
  IWhatsNewStoriesResponse,
  IWhatsNewStoryResponse,
  IUnseenCountResponse,
  IUnseenCountApiResponse,
} from '@/types/whatsNew.types';

class WhatsNewApiService {
  private baseUrl = '/whats-new';

  /**
   * Get all active stories for the current user
   * @param includeViewed - Include already viewed stories (default: true)
   */
  async getStories(includeViewed: boolean = true): Promise<ApiResponse<IWhatsNewStory[]>> {
    try {
      const response = await apiClient.get<IWhatsNewStoriesResponse>(
        `${this.baseUrl}?includeViewed=${includeViewed}`
      );
      return {
        success: response.success,
        data: response.data || [],
        message: response.message,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get a single story by ID
   * @param storyId - The story ID
   */
  async getStoryById(storyId: string): Promise<ApiResponse<IWhatsNewStory>> {
    try {
      const response = await apiClient.get<IWhatsNewStoryResponse>(
        `${this.baseUrl}/${storyId}`
      );
      return {
        success: response.success,
        data: response.data,
        message: response.message,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get count of unseen stories for current user
   */
  async getUnseenCount(): Promise<ApiResponse<IUnseenCountResponse>> {
    try {
      const response = await apiClient.get<IUnseenCountApiResponse>(
        `${this.baseUrl}/unseen-count`
      );
      return {
        success: response.success,
        data: response.data || { count: 0, hasUnseen: false },
        message: response.message,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Track story view
   * @param storyId - The story ID
   */
  async trackView(storyId: string): Promise<void> {
    try {
      await apiClient.post(`${this.baseUrl}/${storyId}/view`, {});
    } catch (error) {
      // Don't throw - tracking failures shouldn't break the UX
    }
  }

  /**
   * Track CTA button click
   * @param storyId - The story ID
   */
  async trackClick(storyId: string): Promise<void> {
    try {
      await apiClient.post(`${this.baseUrl}/${storyId}/click`, {});
    } catch (error) {
      // Don't throw - tracking failures shouldn't break the UX
    }
  }

  /**
   * Track story completion (viewed all slides)
   * @param storyId - The story ID
   */
  async trackCompletion(storyId: string): Promise<void> {
    try {
      await apiClient.post(`${this.baseUrl}/${storyId}/complete`, {});
    } catch (error) {
      // Don't throw - tracking failures shouldn't break the UX
    }
  }
}

// Export singleton instance
const whatsNewApi = new WhatsNewApiService();
export default whatsNewApi;
