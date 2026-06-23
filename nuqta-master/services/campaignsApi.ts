/**
 * Campaigns API Service
 * Handles campaigns for homepage exciting deals section
 */

import apiClient, { ApiResponse } from './apiClient';

const devLog = {
  log: __DEV__ ? console.log.bind(console) : () => {},
  warn: __DEV__ ? console.warn.bind(console) : () => {},
  error: __DEV__ ? console.error.bind(console) : () => {},
};

// Campaign Deal interface
export interface CampaignDeal {
  store?: string;
  storeId?: string;
  image: string;
  cashback?: string;
  coins?: string;
  bonus?: string;
  drop?: string;
  discount?: string;
  endsIn?: string;
  // Paid deal fields
  dealIndex?: number;
  price?: number;
  currency?: 'INR' | 'AED' | 'USD';
  isPaid?: boolean;
  purchaseLimit?: number;
  purchaseCount?: number;
  isSoldOut?: boolean;
}

// Campaign interface
export interface Campaign {
  _id: string;
  campaignId: string;
  title: string;
  subtitle: string;
  description?: string;
  badge: string;
  badgeBg: string;
  badgeColor: string;
  gradientColors: string[];
  type: 'cashback' | 'coins' | 'bank' | 'bill' | 'drop' | 'new-user' | 'flash' | 'general';
  deals: CampaignDeal[];
  startTime: string;
  endTime: string;
  isActive: boolean;
  priority: number;
  isRunning?: boolean;
  // Additional fields from backend
  terms?: string[];
  icon?: string;
  bannerImage?: string;
  minOrderValue?: number;
  maxBenefit?: number;
  eligibleCategories?: string[];
  region?: 'bangalore' | 'dubai' | 'all';
  exclusiveToProgramSlug?: string;
  userEligible?: boolean;
}

// Deal Category interface (for ExcitingDealsSection)
export interface DealCategory {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  gradientColors: string[];
  badgeBg?: string;
  badgeColor?: string;
  deals: CampaignDeal[];
}

// Redemption interface for My Deals
// Updated to match backend response format
export interface DealRedemption {
  id: string;
  code: string; // Backend returns 'code' instead of 'redemptionCode'
  redemptionCode?: string; // Keep for backward compatibility
  campaignId?: string;
  dealIndex?: number;
  // Deal snapshot from backend
  dealSnapshot: {
    store?: string;
    storeId?: string;
    image: string;
    cashback?: string;
    coins?: string;
    bonus?: string;
    drop?: string;
    discount?: string;
    price?: number;
    currency?: 'INR' | 'AED' | 'USD';
  };
  // Campaign snapshot from backend
  campaignSnapshot: {
    title: string;
    subtitle: string;
    type: string;
    badge: string;
    gradientColors?: string[];
    endTime?: string;
    minOrderValue?: number;
    maxBenefit?: number;
    terms?: string[];
  };
  // Status now includes 'pending' for paid deals awaiting payment
  status: 'pending' | 'active' | 'used' | 'expired' | 'cancelled';
  redeemedAt: string;
  expiresAt: string;
  usedAt?: string;
  benefitApplied?: number;
  // Purchase info for paid deals
  isPaid?: boolean;
  purchaseAmount?: number;
  purchaseCurrency?: 'INR' | 'AED' | 'USD';
  purchaseTransactionId?: string;
  purchasePaymentMethod?: 'razorpay' | 'stripe' | 'wallet' | 'cod';
  purchasedAt?: string;
}

export interface RedemptionSummary {
  active: number;
  used: number;
  expired: number;
  cancelled: number;
}

class CampaignsService {
  /**
   * Get active campaigns
   */
  async getActiveCampaigns(params?: {
    type?: string;
    limit?: number;
  }): Promise<ApiResponse<{
    campaigns: Campaign[];
    total: number;
  }>> {
    try {
      devLog.log('📢 [CAMPAIGNS API] Fetching active campaigns...');

      const response = await apiClient.get<{
        campaigns: Campaign[];
        total: number;
      }>('/campaigns/active', {
        ...(params?.type && { type: params.type }),
        limit: params?.limit || 10,
      });

      if (response.success && response.data) {
        devLog.log(`✅ [CAMPAIGNS API] Got ${response.data.campaigns?.length || 0} active campaigns`);
      }

      return response;
    } catch (error: any) {
      devLog.error('❌ [CAMPAIGNS API] Error fetching active campaigns:', error);
      return {
        success: false,
        error: error?.message || 'Failed to fetch campaigns',
        message: error?.message || 'Failed to fetch campaigns',
      };
    }
  }

  /**
   * Get exciting deals for homepage section
   */
  async getExcitingDeals(limit: number = 6): Promise<ApiResponse<{
    dealCategories: DealCategory[];
    total: number;
  }>> {
    try {
      devLog.log('📢 [CAMPAIGNS API] Fetching exciting deals...');

      const response = await apiClient.get<{
        dealCategories: DealCategory[];
        total: number;
      }>('/campaigns/exciting-deals', { limit });

      if (response.success && response.data) {
        devLog.log(`✅ [CAMPAIGNS API] Got ${response.data.dealCategories?.length || 0} deal categories`);
      }

      return response;
    } catch (error: any) {
      devLog.error('❌ [CAMPAIGNS API] Error fetching exciting deals:', error);
      return {
        success: false,
        error: error?.message || 'Failed to fetch exciting deals',
        message: error?.message || 'Failed to fetch exciting deals',
      };
    }
  }

  /**
   * Get campaigns by type
   */
  async getCampaignsByType(type: string, limit: number = 10): Promise<ApiResponse<{
    campaigns: Campaign[];
    total: number;
  }>> {
    try {
      devLog.log(`📢 [CAMPAIGNS API] Fetching ${type} campaigns...`);

      const response = await apiClient.get<{
        campaigns: Campaign[];
        total: number;
      }>(`/campaigns/type/${type}`, { limit });

      if (response.success && response.data) {
        devLog.log(`✅ [CAMPAIGNS API] Got ${response.data.campaigns?.length || 0} ${type} campaigns`);
      }

      return response;
    } catch (error: any) {
      devLog.error(`❌ [CAMPAIGNS API] Error fetching ${type} campaigns:`, error);
      return {
        success: false,
        error: error?.message || 'Failed to fetch campaigns',
        message: error?.message || 'Failed to fetch campaigns',
      };
    }
  }

  /**
   * Get single campaign by ID or slug
   */
  async getCampaignById(campaignId: string): Promise<ApiResponse<Campaign>> {
    try {
      devLog.log(`📢 [CAMPAIGNS API] Fetching campaign: ${campaignId}...`);

      const response = await apiClient.get<Campaign>(`/campaigns/${campaignId}`);

      if (response.success && response.data) {
        devLog.log(`✅ [CAMPAIGNS API] Got campaign: ${response.data.title}`);
      }

      return response;
    } catch (error: any) {
      devLog.error('❌ [CAMPAIGNS API] Error fetching campaign:', error);
      return {
        success: false,
        error: error?.message || 'Failed to fetch campaign',
        message: error?.message || 'Failed to fetch campaign',
      };
    }
  }

  /**
   * Get user's redeemed deals (My Deals)
   * Updated to match backend endpoint: /campaigns/my-redemptions
   */
  async getMyDeals(params?: {
    status?: 'active' | 'used' | 'expired' | 'cancelled' | 'pending';
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{
    redemptions: DealRedemption[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>> {
    try {
      devLog.log('📢 [CAMPAIGNS API] Fetching my deals...');

      const response = await apiClient.get<{
        redemptions: DealRedemption[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      }>('/campaigns/my-redemptions', {
        ...(params?.status && { status: params.status }),
        page: params?.page || 1,
        limit: params?.limit || 20,
      });

      if (response.success && response.data) {
        devLog.log(`✅ [CAMPAIGNS API] Got ${response.data.redemptions?.length || 0} redeemed deals`);
      }

      return response;
    } catch (error: any) {
      devLog.error('❌ [CAMPAIGNS API] Error fetching my deals:', error);
      return {
        success: false,
        error: error?.message || 'Failed to fetch my deals',
        message: error?.message || 'Failed to fetch my deals',
      };
    }
  }

  /**
   * Get single redemption by code
   * Updated to match backend endpoint: /campaigns/redemptions/:code
   */
  async getRedemptionByCode(code: string): Promise<ApiResponse<DealRedemption>> {
    try {
      devLog.log(`📢 [CAMPAIGNS API] Fetching redemption: ${code}...`);

      const response = await apiClient.get<DealRedemption>(`/campaigns/redemptions/${code}`);

      if (response.success && response.data) {
        devLog.log(`✅ [CAMPAIGNS API] Got redemption: ${response.data.redemptionCode}`);
      }

      return response;
    } catch (error: any) {
      devLog.error('❌ [CAMPAIGNS API] Error fetching redemption:', error);
      return {
        success: false,
        error: error?.message || 'Failed to fetch redemption',
        message: error?.message || 'Failed to fetch redemption',
      };
    }
  }

  /**
   * Mark a redemption as used (after order/booking completion)
   */
  async useRedemption(code: string, params?: {
    orderId?: string;
    benefitApplied?: number;
  }): Promise<ApiResponse<{
    id: string;
    redemptionCode: string;
    status: string;
    usedAt: string;
    orderId?: string;
    benefitApplied?: number;
  }>> {
    try {
      devLog.log(`📢 [CAMPAIGNS API] Marking redemption as used: ${code}...`);

      const response = await apiClient.post<{
        id: string;
        redemptionCode: string;
        status: string;
        usedAt: string;
        orderId?: string;
        benefitApplied?: number;
      }>(`/campaigns/redemptions/${code}/use`, params || {});

      if (response.success && response.data) {
        devLog.log(`✅ [CAMPAIGNS API] Redemption marked as used: ${response.data.redemptionCode}`);
      }

      return response;
    } catch (error: any) {
      devLog.error('❌ [CAMPAIGNS API] Error marking redemption as used:', error);
      return {
        success: false,
        error: error?.message || 'Failed to mark deal as used',
        message: error?.message || 'Failed to mark deal as used',
      };
    }
  }

  /**
   * Cancel a redemption
   * Updated to match backend endpoint: DELETE /campaigns/redemptions/:id
   */
  async cancelRedemption(redemptionId: string): Promise<ApiResponse<{
    message: string;
  }>> {
    try {
      devLog.log(`📢 [CAMPAIGNS API] Cancelling redemption: ${redemptionId}...`);

      const response = await apiClient.delete<{
        message: string;
      }>(`/campaigns/redemptions/${redemptionId}`);

      if (response.success) {
        devLog.log(`✅ [CAMPAIGNS API] Redemption cancelled`);
      }

      return response;
    } catch (error: any) {
      devLog.error('❌ [CAMPAIGNS API] Error cancelling redemption:', error);
      return {
        success: false,
        error: error?.message || 'Failed to cancel deal',
        message: error?.message || 'Failed to cancel deal',
      };
    }
  }

  /**
   * Redeem a deal (free or paid)
   * New unified endpoint that handles both types
   */
  async redeemDeal(params: {
    campaignId: string;
    dealIndex: number;
    successUrl?: string;
    cancelUrl?: string;
  }): Promise<ApiResponse<{
    type: 'free' | 'paid';
    // Free deal response
    redemption?: {
      id: string;
      code: string;
      status: string;
      expiresAt: string;
      dealSnapshot: any;
      campaignSnapshot: any;
    };
    // Paid deal response
    checkoutUrl?: string;
    sessionId?: string;
    redemptionId?: string;
    amount?: number;
    currency?: string;
  }>> {
    try {
      devLog.log(`📢 [CAMPAIGNS API] Redeeming deal: campaign=${params.campaignId}, index=${params.dealIndex}...`);

      const response = await apiClient.post<{
        type: 'free' | 'paid';
        redemption?: {
          id: string;
          code: string;
          status: string;
          expiresAt: string;
          dealSnapshot: any;
          campaignSnapshot: any;
        };
        checkoutUrl?: string;
        sessionId?: string;
        redemptionId?: string;
        amount?: number;
        currency?: string;
      }>(`/campaigns/${params.campaignId}/deals/${params.dealIndex}/redeem`, {
        successUrl: params.successUrl,
        cancelUrl: params.cancelUrl,
      });

      if (response.success && response.data) {
        if (response.data.type === 'free') {
          devLog.log(`✅ [CAMPAIGNS API] Free deal redeemed: ${response.data.redemption?.code}`);
        } else {
          devLog.log(`✅ [CAMPAIGNS API] Paid deal - checkout URL created`);
        }
      }

      return response;
    } catch (error: any) {
      devLog.error('❌ [CAMPAIGNS API] Error redeeming deal:', error);
      return {
        success: false,
        error: error?.message || 'Failed to redeem deal',
        message: error?.message || 'Failed to redeem deal',
      };
    }
  }

  /**
   * Verify Stripe payment for paid deal
   */
  async verifyDealPayment(params: {
    sessionId: string;
    redemptionId?: string;
  }): Promise<ApiResponse<{
    redemption: {
      id: string;
      code: string;
      status: string;
      expiresAt: string;
      dealSnapshot: any;
      campaignSnapshot: any;
      purchaseAmount?: number;
      purchaseCurrency?: string;
    };
  }>> {
    try {
      devLog.log(`📢 [CAMPAIGNS API] Verifying payment: session=${params.sessionId}...`);

      const response = await apiClient.post<{
        redemption: {
          id: string;
          code: string;
          status: string;
          expiresAt: string;
          dealSnapshot: any;
          campaignSnapshot: any;
          purchaseAmount?: number;
          purchaseCurrency?: string;
        };
      }>('/campaigns/deals/verify-payment', params);

      if (response.success && response.data) {
        devLog.log(`✅ [CAMPAIGNS API] Payment verified: ${response.data.redemption?.code}`);
      }

      return response;
    } catch (error: any) {
      devLog.error('❌ [CAMPAIGNS API] Error verifying payment:', error);
      return {
        success: false,
        error: error?.message || 'Failed to verify payment',
        message: error?.message || 'Failed to verify payment',
      };
    }
  }
}

// Create singleton instance
const campaignsService = new CampaignsService();

// Named export for compatibility
export { campaignsService as campaignsApi };

export default campaignsService;
