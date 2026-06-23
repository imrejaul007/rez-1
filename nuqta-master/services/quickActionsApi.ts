// Quick Actions API Service
// Fetches personalized quick action buttons from backend

import apiClient, { ApiResponse } from './apiClient';

export interface QuickAction {
  _id: string;
  slug: string;
  title: string;
  subtitle: string;
  icon: string;
  iconColor: string;
  deepLinkPath: string;
  targetAchievementTypes: string[];
  priority: number;
  // Personalized data (only from getPersonalized)
  achievementProgress?: {
    type: string;
    title: string;
    progress: number;
  };
}

class QuickActionsApi {
  /**
   * Get personalized quick actions for the current user.
   * Returns actions sorted by priority, with relevant achievement progress attached.
   */
  async getPersonalized(): Promise<ApiResponse<QuickAction[]>> {
    try {
      const response = await apiClient.get<any>('/gamification/quick-actions');
      if (response.success && response.data) {
        const actions = Array.isArray(response.data) ? response.data : response.data.actions || [];
        return { success: true, data: actions };
      }
      return { success: true, data: [] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all active quick actions (no personalization).
   */
  async getAll(): Promise<ApiResponse<QuickAction[]>> {
    try {
      const response = await apiClient.get<any>('/content/quick-actions');
      if (response.success && response.data) {
        const actions = Array.isArray(response.data) ? response.data : response.data.actions || [];
        return { success: true, data: actions };
      }
      return { success: true, data: [] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

export const quickActionsApi = new QuickActionsApi();
export default quickActionsApi;
