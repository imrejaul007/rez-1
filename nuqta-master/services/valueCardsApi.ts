// Value Cards API Service
// Fetches admin-configurable "Why Nuqta Pays You More" value cards

import apiClient, { ApiResponse } from './apiClient';

export interface ValueCard {
  _id: string;
  title: string;
  subtitle: string;
  emoji: string;
  deepLinkPath?: string;
  sortOrder: number;
}

class ValueCardsApi {
  /**
   * Get all active value cards, sorted by sortOrder.
   * No auth required.
   */
  async getAll(): Promise<ApiResponse<ValueCard[]>> {
    try {
      const response = await apiClient.get<any>('/content/value-cards');
      if (response.success && response.data) {
        const cards = Array.isArray(response.data) ? response.data : response.data.cards || [];
        return { success: true, data: cards };
      }
      return { success: true, data: [] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

export const valueCardsApi = new ValueCardsApi();
export default valueCardsApi;
