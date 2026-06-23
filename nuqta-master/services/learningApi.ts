import apiClient, { ApiResponse } from './apiClient';

export interface LearningContent {
  _id: string;
  slug: string;
  title: string;
  category: 'coin-system' | 'earning-tips' | 'platform-guide' | 'coin-types';
  contentType: 'article' | 'video';
  body: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  coinReward: number;
  estimatedMinutes: number;
  sortOrder: number;
  isPublished: boolean;
  completed: boolean;
  rewardClaimed: boolean;
  timeSpentSeconds: number;
  createdAt: string;
  updatedAt: string;
}

export interface CompleteContentResult {
  completed: boolean;
  coinsAwarded: number;
  alreadyClaimed: boolean;
}

const learningApi = {
  /**
   * Get all published learning content (with user progress if authenticated)
   */
  getContent: async (): Promise<ApiResponse<{ content: LearningContent[] }>> => {
    return apiClient.get('/learning');
  },

  /**
   * Get a single content item by slug
   */
  getContentBySlug: async (slug: string): Promise<ApiResponse<{ content: LearningContent }>> => {
    return apiClient.get(`/learning/${slug}`);
  },

  /**
   * Mark content as completed and claim coin reward
   */
  completeContent: async (
    contentId: string,
    timeSpentSeconds: number
  ): Promise<ApiResponse<CompleteContentResult>> => {
    return apiClient.post(`/learning/${contentId}/complete`, { timeSpentSeconds });
  },
};

export default learningApi;
