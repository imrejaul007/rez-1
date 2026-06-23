// Share API Service
// Handles sharing stores, offers, products, purchases and earning coins

import apiClient from './apiClient';

export interface SharePurchaseRequest {
  orderId: string;
  platform: 'whatsapp' | 'facebook' | 'twitter' | 'instagram' | 'other';
}

export interface SharePurchaseResponse {
  success: boolean;
  message?: string;
  data?: {
    shareId: string;
    coinsEarned: number;
    orderTotal: number;
    shareUrl: string;
  };
  error?: string;
}

export interface CanShareOrderResponse {
  success: boolean;
  data?: {
    canShare: boolean;
    reason?: string;
    orderTotal?: number;
    potentialCoins?: number;
  };
  error?: string;
}

export interface ShareableItem {
  id: string;
  type: 'store' | 'product' | 'offer' | 'referral';
  name?: string;
  title?: string;
  description?: string;
  image: string | null;
  reward: { baseCoins: number; clickBonus: number; conversionBonus: number };
  price?: number;
  discount?: number;
  storeName?: string;
}

export interface ShareableContentResponse {
  stores: ShareableItem[];
  products: ShareableItem[];
  offers: ShareableItem[];
  referral: {
    code: string;
    reward: { baseCoins: number; clickBonus: number; conversionBonus: number };
    message: string;
  };
}

export interface ShareStats {
  totalShares: number;
  totalClicks: number;
  totalConversions: number;
  totalCoinsEarned: number;
  byType: Record<string, { shares: number; clicks: number; conversions: number; coins: number }>;
}

export interface DailyLimits {
  [contentType: string]: {
    used: number;
    limit: number;
    remaining: number;
  };
}

export interface ShareHistoryItem {
  _id: string;
  contentType: string;
  contentId: string;
  platform: string;
  shareUrl: string;
  trackingCode: string;
  clicks: number;
  conversions: number;
  coinsEarned: number;
  status: string;
  createdAt: string;
}

class ShareApiService {
  /**
   * Get shareable content (stores, offers, products) from backend
   */
  async getShareableContent(): Promise<{ success: boolean; data?: ShareableContentResponse; error?: string }> {
    try {
      const response = await apiClient.get<ShareableContentResponse>('/shares/content');
      if (response.success && response.data) {
        return { success: true, data: response.data };
      }
      return { success: false, error: response.message || 'Failed to fetch shareable content' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch shareable content' };
    }
  }

  /**
   * Create a share tracking record and get a trackable share link
   */
  async createShare(
    contentType: 'product' | 'store' | 'offer' | 'referral' | 'video' | 'article',
    contentId: string,
    platform: 'whatsapp' | 'facebook' | 'twitter' | 'instagram' | 'copy_link' | 'other'
  ): Promise<{ success: boolean; data?: { shareUrl: string; trackingCode: string; coinsEarned: number }; error?: string }> {
    try {
      const response = await apiClient.post<{ shareUrl: string; trackingCode: string; coinsEarned: number }>(
        '/shares/track',
        { contentType, contentId, platform }
      );
      if (response.success && response.data) {
        return { success: true, data: response.data };
      }
      return { success: false, error: response.message || 'Failed to create share' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to create share' };
    }
  }

  /**
   * Get user's share statistics
   */
  async getShareStats(): Promise<{ success: boolean; data?: ShareStats; error?: string }> {
    try {
      const response = await apiClient.get<ShareStats>('/shares/stats');
      if (response.success && response.data) {
        return { success: true, data: response.data };
      }
      return { success: false, error: response.message || 'Failed to fetch share stats' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch share stats' };
    }
  }

  /**
   * Get user's share history
   */
  async getShareHistory(
    contentType?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ success: boolean; data?: { shares: ShareHistoryItem[]; total: number }; error?: string }> {
    try {
      const params: Record<string, string> = { limit: String(limit), offset: String(offset) };
      if (contentType) params.contentType = contentType;

      const query = new URLSearchParams(params).toString();
      const response = await apiClient.get<{ shares: ShareHistoryItem[]; total: number }>(
        `/shares/history?${query}`
      );
      if (response.success && response.data) {
        return { success: true, data: response.data };
      }
      return { success: false, error: response.message || 'Failed to fetch share history' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch share history' };
    }
  }

  /**
   * Get daily share limits remaining
   */
  async getDailyLimits(): Promise<{ success: boolean; data?: DailyLimits; error?: string }> {
    try {
      const response = await apiClient.get<DailyLimits>('/shares/daily-limits');
      if (response.success && response.data) {
        return { success: true, data: response.data };
      }
      return { success: false, error: response.message || 'Failed to fetch daily limits' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch daily limits' };
    }
  }

  /**
   * Share a purchase and earn 5% coins
   */
  async sharePurchase(orderId: string, platform: SharePurchaseRequest['platform']): Promise<SharePurchaseResponse> {
    try {
      const response = await apiClient.post<SharePurchaseResponse['data']>(
        '/shares/purchase',
        { orderId, platform }
      );

      if (response.success && response.data) {
        return { success: true, data: response.data };
      }

      return { success: false, error: response.message || 'Failed to share purchase' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to share purchase' };
    }
  }

  /**
   * Check if an order can be shared (not already shared)
   */
  async canShareOrder(orderId: string): Promise<CanShareOrderResponse> {
    try {
      const response = await apiClient.get<CanShareOrderResponse['data']>(
        `/shares/can-share/${orderId}`
      );

      if (response.success && response.data) {
        return { success: true, data: response.data };
      }

      return { success: false, error: response.message || 'Failed to check share eligibility' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to check share eligibility' };
    }
  }
}

export const shareApi = new ShareApiService();
export default shareApi;
