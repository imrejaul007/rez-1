/**
 * Cash Store API Service
 *
 * API integration for Cash Store affiliate tracking feature.
 * Cash Store = Affiliate cashback for external websites (Amazon, Myntra, etc.)
 * Users earn real cashback (rupees) by shopping through tracking links.
 *
 * This is different from Nuqta Mall which is an in-app delivery marketplace
 * where users earn Nuqta Coins.
 */

import apiClient from '@/services/apiClient';

// API endpoints
const CASH_STORE_ENDPOINTS = {
  // Browsing
  CATEGORIES: '/cashstore/categories',
  BRANDS: '/cashstore/brands',
  BRANDS_SEARCH: '/cashstore/brands/search',
  HOMEPAGE: '/cashstore/homepage',
  GIFT_CARDS: '/cashstore/gift-cards',
  TRENDING: '/cashstore/trending',
  // External (cashback service)
  DOUBLE_CAMPAIGNS: '/cashback/double-campaigns',
  COIN_DROPS: '/cashback/coin-drops',
  // Affiliate tracking
  AFFILIATE_CLICK: '/cashstore/affiliate/click',
  AFFILIATE_CLICKS: '/cashstore/affiliate/clicks',
  AFFILIATE_PURCHASES: '/cashstore/affiliate/purchases',
  AFFILIATE_SUMMARY: '/cashstore/affiliate/summary',
};

// Types
export interface AffiliateClickResult {
  clickId: string;
  trackingUrl: string;
  brandName: string;
  cashbackPercentage: number;
  coinsPerHundred: number;
  displayText: string;
  brand?: {
    name: string;
    cashback: number;
  };
}

export interface AffiliateClick {
  _id: string;
  clickId: string;
  brand: {
    _id: string;
    name: string;
    logo: string;
  };
  status: 'clicked' | 'converted' | 'expired';
  brandSnapshot: {
    name: string;
    cashbackPercentage: number;
    maxCashback: number;
  };
  createdAt: string;
  expiresAt: string;
}

export interface AffiliatePurchase {
  _id: string;
  purchaseId: string;
  brand: {
    _id: string;
    name: string;
    logo: string;
  };
  externalOrderId: string;
  orderAmount: number;
  cashbackRate: number;
  actualCashback: number;
  status: 'pending' | 'confirmed' | 'credited' | 'rejected' | 'refunded';
  purchasedAt: string;
  creditedAt?: string;
}

export interface AffiliateCashbackSummary {
  totalCoinsEarned: number;
  pendingCoins: number;
  confirmedCoins: number;
  creditedCoins: number;
  totalEarned: number;
  pending: number;
  confirmed: number;
  credited: number;
  totalClicks: number;
  totalPurchases: number;
  conversionRate: number;
  displayLabel: string;
  coinValue: number;
  recentActivity: Array<{
    type: 'click' | 'purchase' | 'credit';
    brand: string;
    amount?: number;
    date: string;
  }>;
}

class CashStoreApiService {
  /**
   * Get dynamic categories for filter row
   * Returns MallCategories with virtual filters (All, Popular, High Cashback) prepended
   */
  async getCategories(): Promise<any[]> {
    try {
      const response = await apiClient.get(CASH_STORE_ENDPOINTS.CATEGORIES);
      return response.data || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Get brands filtered by category or special filter
   */
  async getBrands(params: {
    category?: string;
    filter?: 'popular' | 'high-cashback';
    sort?: 'rating' | 'cashback-high' | 'cashback-low' | 'name-asc' | 'newest';
    limit?: number;
    page?: number;
  } = {}): Promise<{ brands: any[]; total: number }> {
    try {
      const query = new URLSearchParams();
      if (params.category) query.set('category', params.category);
      if (params.filter) query.set('filter', params.filter);
      if (params.sort) query.set('sort', params.sort);
      if (params.limit) query.set('limit', String(params.limit));
      if (params.page) query.set('page', String(params.page));

      const response = await apiClient.get(
        `${CASH_STORE_ENDPOINTS.BRANDS}?${query.toString()}`
      );
      return {
        brands: response.data?.brands || [],
        total: response.data?.total || 0,
      };
    } catch (error) {
      return { brands: [], total: 0 };
    }
  }

  /**
   * Get aggregated homepage data (single call)
   * Returns categories + top brands + trending + high cashback
   */
  async getHomepageData(): Promise<{
    categories: any[];
    topBrands: any[];
    trendingBrands: any[];
    highCashbackBrands: any[];
  } | null> {
    try {
      const response = await apiClient.get(CASH_STORE_ENDPOINTS.HOMEPAGE);
      return response.data || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Search brands by name
   */
  async searchBrands(query: string, limit: number = 20): Promise<{ brands: any[]; total: number }> {
    try {
      if (!query || query.length < 2) return { brands: [], total: 0 };

      const response = await apiClient.get(
        `${CASH_STORE_ENDPOINTS.BRANDS_SEARCH}?q=${encodeURIComponent(query)}&limit=${limit}`
      );
      return {
        brands: response.data?.brands || [],
        total: response.data?.total || 0,
      };
    } catch (error) {
      return { brands: [], total: 0 };
    }
  }

  /**
   * Track affiliate click and get tracking URL
   * Called when user taps "Shop Now" on an external brand
   *
   * @param brandId - The ID of the cash store brand
   * @returns Tracking URL and click ID
   */
  async trackAffiliateClick(brandId: string): Promise<AffiliateClickResult | null> {
    try {
      // Validate brandId is a 24-char hex string (MongoDB ObjectId) before calling API
      if (!brandId || !/^[0-9a-fA-F]{24}$/.test(brandId)) {
        return null;
      }

      const response = await apiClient.post(
        CASH_STORE_ENDPOINTS.AFFILIATE_CLICK,
        { brandId }
      );

      const data = response.data;
      if (!data) return null;

      const coins = data.coinsPerHundred ?? data.cashbackPercentage ?? 5;
      return {
        clickId: data.clickId || '',
        trackingUrl: data.trackingUrl || '',
        brandName: data.brandName || data.brand?.name || '',
        cashbackPercentage: data.cashbackPercentage || 0,
        coinsPerHundred: coins,
        displayText: `${coins} REZ coins per ₹100`,
        brand: { name: data.brandName || '', cashback: data.cashbackPercentage || 0 },
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get user's click history
   * Shows all affiliate clicks made by the user
   */
  async getUserClicks(page: number = 1, limit: number = 20): Promise<{
    clicks: AffiliateClick[];
    total: number;
    pages: number;
  }> {
    try {
      const response = await apiClient.get(
        `${CASH_STORE_ENDPOINTS.AFFILIATE_CLICKS}?page=${page}&limit=${limit}`
      );
      return {
        clicks: response.data || [],
        total: response.meta?.pagination?.total || 0,
        pages: response.meta?.pagination?.pages || 0,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user's purchase history
   * Shows all purchases made through affiliate links
   */
  async getUserPurchases(page: number = 1, limit: number = 20): Promise<{
    purchases: AffiliatePurchase[];
    total: number;
    pages: number;
  }> {
    try {
      const response = await apiClient.get(
        `${CASH_STORE_ENDPOINTS.AFFILIATE_PURCHASES}?page=${page}&limit=${limit}`
      );
      return {
        purchases: response.data || [],
        total: response.meta?.pagination?.total || 0,
        pages: response.meta?.pagination?.pages || 0,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get gift card brands sorted by cashback rate
   */
  async getGiftCards(params: {
    category?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ brands: any[]; total: number }> {
    try {
      const query = new URLSearchParams();
      if (params.category) query.set('category', params.category);
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));

      const response = await apiClient.get(
        `${CASH_STORE_ENDPOINTS.GIFT_CARDS}?${query.toString()}`
      );
      return {
        brands: response.data?.brands || [],
        total: response.data?.total || 0,
      };
    } catch (error) {
      return { brands: [], total: 0 };
    }
  }

  /**
   * Get aggregated trending data (popular + offers + high cashback)
   */
  async getTrending(): Promise<{
    popularBrands: any[];
    activeOffers: any[];
    highCashbackBrands: any[];
  }> {
    try {
      const response = await apiClient.get(CASH_STORE_ENDPOINTS.TRENDING);
      return {
        popularBrands: response.data?.popularBrands || [],
        activeOffers: response.data?.activeOffers || [],
        highCashbackBrands: response.data?.highCashbackBrands || [],
      };
    } catch (error) {
      return { popularBrands: [], activeOffers: [], highCashbackBrands: [] };
    }
  }

  /**
   * Get active double/multiplier cashback campaigns
   */
  async getDoubleCampaigns(): Promise<any[]> {
    try {
      const response = await apiClient.get(CASH_STORE_ENDPOINTS.DOUBLE_CAMPAIGNS);
      return response.data || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Get active coin drop (boosted reward) events
   */
  async getCoinDrops(): Promise<any[]> {
    try {
      const response = await apiClient.get(CASH_STORE_ENDPOINTS.COIN_DROPS);
      return response.data || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Get user's cashback summary
   * Shows total earned, pending, confirmed, credited amounts
   */
  async getCashbackSummary(): Promise<AffiliateCashbackSummary | null> {
    try {
      const response = await apiClient.get(
        CASH_STORE_ENDPOINTS.AFFILIATE_SUMMARY
      );
      return response.data || null;
    } catch (error) {
      return null;
    }
  }
}

// Export singleton instance
export const cashStoreApi = new CashStoreApiService();
export default cashStoreApi;
