/**
 * Mall API Service
 *
 * API integration layer for Nuqta Mall feature
 */

import apiClient from '@/services/apiClient';
import {
  MallBrand,
  MallCategory,
  MallCollection,
  MallOffer,
  MallBanner,
  MallHomepageData,
  MallBrandFilters
} from '../types/mall.types';
import { devLog } from '@/utils/devLogger';

/** Raw store data returned by the batch endpoint (before transform to MallBrand) */
interface MallStoreData {
  _id: string;
  name: string;
  slug?: string;
  description?: string;
  logo?: string;
  banner?: string[];
  category?: { _id: string; name: string; slug: string } | string;
  isFeatured?: boolean;
  isVerified?: boolean;
  isActive?: boolean;
  deliveryCategories?: Record<string, boolean>;
  rewardRules?: { baseCashbackPercent?: number; maxCashback?: number; minimumAmountForReward?: number };
  offers?: { cashback?: number; maxCashback?: number };
  ratings?: { average?: number; count?: number; distribution?: Record<string, number> };
  operationalInfo?: { minimumOrder?: number };
  analytics?: { views?: number; orders?: number };
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

/** Mall homepage batch response from backend */
interface MallHomepageBatchResponse {
  featuredStores: MallStoreData[];
  newStores: MallStoreData[];
  topRatedStores: MallStoreData[];
  premiumStores: MallStoreData[];
  categories: Array<{ _id: string; name: string; slug: string; icon?: string; color?: string; storeCount?: number; maxCoinReward?: number; sortOrder?: number; isActive?: boolean; isFeatured?: boolean }>;
  heroBanners: MallBanner[];
  trendingStores: MallStoreData[];
  rewardBoosters: MallStoreData[];
  dealsOfDay: MallOffer[];
  collections: Array<{ _id: string; name: string; slug: string; description?: string; image?: string; type?: string; sortOrder?: number; isActive?: boolean; brands?: string[]; validFrom?: string; validUntil?: string }>;
  exclusiveOffers: MallOffer[];
}

// API endpoints
const MALL_ENDPOINTS = {
  HOMEPAGE: '/mall/homepage',
  BRANDS: '/mall/brands',
  BRANDS_FEATURED: '/mall/brands/featured',
  BRANDS_NEW: '/mall/brands/new',
  BRANDS_TOP_RATED: '/mall/brands/top-rated',
  BRANDS_LUXURY: '/mall/brands/luxury',
  BRANDS_SEARCH: '/mall/brands/search',
  CATEGORIES: '/mall/categories',
  COLLECTIONS: '/mall/collections',
  OFFERS: '/mall/offers',
  OFFERS_EXCLUSIVE: '/mall/offers/exclusive',
  BANNERS: '/mall/banners',
  BANNERS_HERO: '/mall/banners/hero',
  // Affiliate tracking endpoints (legacy - use Cash Store instead)
  AFFILIATE_CLICK: '/mall/affiliate/click',
  AFFILIATE_CLICKS: '/mall/affiliate/clicks',
  AFFILIATE_PURCHASES: '/mall/affiliate/purchases',
  AFFILIATE_SUMMARY: '/mall/affiliate/summary',
  // Store-based mall endpoints (in-app delivery marketplace)
  STORES_HOMEPAGE: '/mall/stores/homepage',
  STORES: '/mall/stores',
  STORES_FEATURED: '/mall/stores/featured',
  STORES_NEW: '/mall/stores/new',
  STORES_TOP_RATED: '/mall/stores/top-rated',
  STORES_PREMIUM: '/mall/stores/premium',
  STORES_SEARCH: '/mall/stores/search',
  STORES_CATEGORIES: '/mall/stores/categories',
  STORES_ALLIANCE: '/mall/stores/alliance',
  STORES_TRENDING: '/mall/stores/trending',
  STORES_REWARD_BOOSTERS: '/mall/stores/reward-boosters',
  OFFERS_TODAY: '/mall/offers/today',
  HOMEPAGE_BATCH: '/mall/homepage-batch',
};

class MallApiService {
  private _homepageCache: { data: MallHomepageBatchResponse; timestamp: number } | null = null;
  private _homepageInflight: Promise<MallHomepageBatchResponse> | null = null;
  private readonly HOMEPAGE_CACHE_TTL = 2 * 60_000;

  /**
   * Get aggregated mall homepage data
   */
  async getMallHomepage(): Promise<MallHomepageData> {
    try {
      const response = await apiClient.get(
        MALL_ENDPOINTS.HOMEPAGE
      );
      return response.data || {
        banners: [],
        featuredBrands: [],
        collections: [],
        categories: [],
        exclusiveOffers: [],
        newArrivals: [],
        topRatedBrands: [],
        luxuryBrands: []
      };
    } catch (error) {
      devLog.error('Error fetching mall homepage:', error);
      throw error;
    }
  }

  /**
   * Get all brands with filters
   */
  async getBrands(filters?: MallBrandFilters): Promise<{
    brands: MallBrand[];
    total: number;
    pages: number;
  }> {
    try {
      const params = new URLSearchParams();
      if (filters?.category) params.append('category', filters.category);
      if (filters?.tier) params.append('tier', filters.tier);
      if (filters?.collection) params.append('collection', filters.collection);
      if (filters?.minCashback) params.append('minCashback', filters.minCashback.toString());
      if (filters?.badges) params.append('badges', filters.badges.join(','));
      if (filters?.search) params.append('search', filters.search);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const response = await apiClient.get(
        `${MALL_ENDPOINTS.BRANDS}?${params.toString()}`
      );

      return {
        brands: response.data || [],
        total: response.meta?.pagination?.total || 0,
        pages: response.meta?.pagination?.pages || 0
      };
    } catch (error) {
      devLog.error('Error fetching brands:', error);
      throw error;
    }
  }

  /**
   * Get brand by ID
   */
  async getBrandById(brandId: string): Promise<MallBrand | null> {
    try {
      const response = await apiClient.get(
        `${MALL_ENDPOINTS.BRANDS}/${brandId}`
      );
      return response.data || null;
    } catch (error) {
      devLog.error('Error fetching brand:', error);
      throw error;
    }
  }

  /**
   * Get featured brands
   */
  async getFeaturedBrands(offset: number = 0, limit: number = 10): Promise<MallBrand[]> {
    try {
      const response = await apiClient.get(
        `${MALL_ENDPOINTS.BRANDS_FEATURED}?offset=${offset}&limit=${limit}`
      );
      return response.data || [];
    } catch (error) {
      devLog.error('Error fetching featured brands:', error);
      throw error;
    }
  }

  /**
   * Get new arrivals
   */
  async getNewArrivals(offset: number = 0, limit: number = 10): Promise<MallBrand[]> {
    try {
      const response = await apiClient.get(
        `${MALL_ENDPOINTS.BRANDS_NEW}?offset=${offset}&limit=${limit}`
      );
      return response.data || [];
    } catch (error) {
      devLog.error('Error fetching new arrivals:', error);
      throw error;
    }
  }

  /**
   * Get top rated brands
   */
  async getTopRatedBrands(limit: number = 10): Promise<MallBrand[]> {
    try {
      const response = await apiClient.get(
        `${MALL_ENDPOINTS.BRANDS_TOP_RATED}?limit=${limit}`
      );
      return response.data || [];
    } catch (error) {
      devLog.error('Error fetching top rated brands:', error);
      throw error;
    }
  }

  /**
   * Get luxury brands
   */
  async getLuxuryBrands(offset: number = 0, limit: number = 10): Promise<MallBrand[]> {
    try {
      const response = await apiClient.get(
        `${MALL_ENDPOINTS.BRANDS_LUXURY}?offset=${offset}&limit=${limit}`
      );
      return response.data || [];
    } catch (error) {
      devLog.error('Error fetching luxury brands:', error);
      throw error;
    }
  }

  /**
   * Search brands
   */
  async searchBrands(query: string, limit: number = 20): Promise<MallBrand[]> {
    try {
      if (!query || query.length < 2) return [];

      const response = await apiClient.get(
        `${MALL_ENDPOINTS.BRANDS_SEARCH}?q=${encodeURIComponent(query)}&limit=${limit}`
      );
      return response.data || [];
    } catch (error) {
      devLog.error('Error searching brands:', error);
      throw error;
    }
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<MallCategory[]> {
    try {
      const response = await apiClient.get(
        MALL_ENDPOINTS.CATEGORIES
      );
      return response.data || [];
    } catch (error) {
      devLog.error('Error fetching categories:', error);
      throw error;
    }
  }

  /**
   * Get brands by category
   */
  async getBrandsByCategory(
    categorySlug: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    category: MallCategory | null;
    brands: MallBrand[];
    total: number;
  }> {
    try {
      const response = await apiClient.get(
        `${MALL_ENDPOINTS.CATEGORIES}/${categorySlug}/brands?page=${page}&limit=${limit}`
      );

      return {
        category: response.data?.category || null,
        brands: response.data?.brands || [],
        total: response.meta?.pagination?.total || 0
      };
    } catch (error) {
      devLog.error('Error fetching brands by category:', error);
      throw error;
    }
  }

  /**
   * Get all collections
   */
  async getCollections(limit: number = 10): Promise<MallCollection[]> {
    try {
      const response = await apiClient.get(
        `${MALL_ENDPOINTS.COLLECTIONS}?limit=${limit}`
      );
      return response.data || [];
    } catch (error) {
      devLog.error('Error fetching collections:', error);
      throw error;
    }
  }

  /**
   * Get brands by collection
   */
  async getBrandsByCollection(
    collectionSlug: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    collection: MallCollection | null;
    brands: MallBrand[];
    total: number;
  }> {
    try {
      const response = await apiClient.get(
        `${MALL_ENDPOINTS.COLLECTIONS}/${collectionSlug}/brands?page=${page}&limit=${limit}`
      );

      return {
        collection: response.data?.collection || null,
        brands: response.data?.brands || [],
        total: response.meta?.pagination?.total || 0
      };
    } catch (error) {
      devLog.error('Error fetching brands by collection:', error);
      throw error;
    }
  }

  /**
   * Get exclusive offers
   */
  async getExclusiveOffers(offset: number = 0, limit: number = 10): Promise<MallOffer[]> {
    try {
      const response = await apiClient.get(
        `${MALL_ENDPOINTS.OFFERS_EXCLUSIVE}?offset=${offset}&limit=${limit}`
      );
      return response.data || [];
    } catch (error) {
      devLog.error('Error fetching exclusive offers:', error);
      throw error;
    }
  }

  /**
   * Get all offers
   */
  async getOffers(page: number = 1, limit: number = 20): Promise<{
    offers: MallOffer[];
    total: number;
  }> {
    try {
      const response = await apiClient.get(
        `${MALL_ENDPOINTS.OFFERS}?page=${page}&limit=${limit}`
      );

      return {
        offers: response.data || [],
        total: response.meta?.pagination?.total || 0
      };
    } catch (error) {
      devLog.error('Error fetching offers:', error);
      throw error;
    }
  }

  /**
   * Get hero banners
   */
  async getHeroBanners(limit: number = 5): Promise<MallBanner[]> {
    try {
      const response = await apiClient.get(
        `${MALL_ENDPOINTS.BANNERS_HERO}?limit=${limit}`
      );
      return response.data || [];
    } catch (error) {
      devLog.error('Error fetching hero banners:', error);
      throw error;
    }
  }

  /**
   * Get all banners
   */
  async getBanners(): Promise<MallBanner[]> {
    try {
      const response = await apiClient.get(
        MALL_ENDPOINTS.BANNERS
      );
      return response.data || [];
    } catch (error) {
      devLog.error('Error fetching banners:', error);
      throw error;
    }
  }

  /**
   * Track brand click for affiliate cashback tracking
   * Returns tracking URL to redirect user through
   * @deprecated Use Cash Store instead — Mall is now an in-app delivery marketplace
   */
  async trackAffiliateClick(brandId: string): Promise<{
    clickId: string;
    trackingUrl: string;
    brand: { name: string; cashback: number };
  } | null> {
    try {
      // Validate brandId is a 24-char hex string (MongoDB ObjectId) before calling API
      if (!brandId || !/^[0-9a-fA-F]{24}$/.test(brandId)) {
        return null;
      }

      const response = await apiClient.post(MALL_ENDPOINTS.AFFILIATE_CLICK, { brandId });
      return response.data || null;
    } catch (error) {
      devLog.warn('Failed to track affiliate click:', error);
      return null;
    }
  }

  /**
   * Track brand click (legacy - for view tracking only)
   */
  async trackBrandClick(brandId: string): Promise<void> {
    try {
      await apiClient.post(`${MALL_ENDPOINTS.BRANDS}/${brandId}/click`);
    } catch (error) {
      // Silently fail for analytics tracking
      devLog.warn('Failed to track brand click:', error);
    }
  }

  /**
   * Track brand purchase
   */
  async trackBrandPurchase(brandId: string, cashbackAmount: number = 0): Promise<void> {
    try {
      await apiClient.post(`${MALL_ENDPOINTS.BRANDS}/${brandId}/purchase`, {
        cashbackAmount
      });
    } catch (error) {
      devLog.warn('Failed to track brand purchase:', error);
    }
  }

  /**
   * Get user's click history
   * @deprecated Use Cash Store instead — Mall is now an in-app delivery marketplace
   */
  async getUserClicks(page: number = 1, limit: number = 20): Promise<{
    clicks: any[];
    total: number;
    pages: number;
  }> {
    try {
      const response = await apiClient.get(
        `${MALL_ENDPOINTS.AFFILIATE_CLICKS}?page=${page}&limit=${limit}`
      );
      return {
        clicks: response.data || [],
        total: response.meta?.pagination?.total || 0,
        pages: response.meta?.pagination?.pages || 0
      };
    } catch (error) {
      devLog.error('Error fetching user clicks:', error);
      throw error;
    }
  }

  /**
   * Get user's purchase history
   * @deprecated Use Cash Store instead — Mall is now an in-app delivery marketplace
   */
  async getUserPurchases(page: number = 1, limit: number = 20): Promise<{
    purchases: any[];
    total: number;
    pages: number;
  }> {
    try {
      const response = await apiClient.get(
        `${MALL_ENDPOINTS.AFFILIATE_PURCHASES}?page=${page}&limit=${limit}`
      );
      return {
        purchases: response.data || [],
        total: response.meta?.pagination?.total || 0,
        pages: response.meta?.pagination?.pages || 0
      };
    } catch (error) {
      devLog.error('Error fetching user purchases:', error);
      throw error;
    }
  }

  /**
   * Get user's cashback summary
   * @deprecated Use Cash Store instead — Mall is now an in-app delivery marketplace
   */
  async getCashbackSummary(): Promise<{
    totalEarned: number;
    pending: number;
    credited: number;
    totalClicks: number;
    totalPurchases: number;
    conversionRate: number;
    recentActivity: any[];
  } | null> {
    try {
      const response = await apiClient.get(MALL_ENDPOINTS.AFFILIATE_SUMMARY);
      return response.data || null;
    } catch (error) {
      devLog.error('Error fetching cashback summary:', error);
      return null;
    }
  }

  // ==================== STORE-BASED MALL METHODS ====================
  // These methods fetch from Store model where deliveryCategories.mall === true
  // For the in-app delivery marketplace (users earn Nuqta Coins)

  /**
   * Get ALL mall homepage data in one call (batch endpoint)
   * Returns stores + banners + trending + reward boosters + deals
   * Uses client-side cache + inflight dedup to avoid redundant calls.
   */
  async getMallHomepageBatch(): Promise<MallHomepageBatchResponse> {
    if (this._homepageCache && Date.now() - this._homepageCache.timestamp < this.HOMEPAGE_CACHE_TTL) {
      return this._homepageCache.data;
    }
    if (this._homepageInflight) return this._homepageInflight;
    this._homepageInflight = this._fetchMallHomepageBatch()
      .then(data => {
        this._homepageCache = { data, timestamp: Date.now() };
        this._homepageInflight = null;
        return data;
      })
      .catch(err => {
        this._homepageInflight = null;
        throw err;
      });
    return this._homepageInflight;
  }

  private async _fetchMallHomepageBatch(): Promise<MallHomepageBatchResponse> {
    try {
      const response = await apiClient.get(MALL_ENDPOINTS.HOMEPAGE_BATCH);
      return response.data || {
        featuredStores: [],
        newStores: [],
        topRatedStores: [],
        premiumStores: [],
        categories: [],
        heroBanners: [],
        trendingStores: [],
        rewardBoosters: [],
        dealsOfDay: [],
        collections: [],
        exclusiveOffers: [],
      };
    } catch (error) {
      devLog.error('Error fetching mall homepage batch:', error);
      throw error;
    }
  }

  /**
   * Get mall stores homepage data
   * Returns featured, new, top-rated, and premium stores
   */
  async getMallStoresHomepage(): Promise<Pick<MallHomepageBatchResponse, 'featuredStores' | 'newStores' | 'topRatedStores' | 'premiumStores' | 'categories'>> {
    try {
      const response = await apiClient.get(MALL_ENDPOINTS.STORES_HOMEPAGE);
      return response.data || {
        featuredStores: [],
        newStores: [],
        topRatedStores: [],
        premiumStores: [],
        categories: [],
      };
    } catch (error) {
      devLog.error('Error fetching mall stores homepage:', error);
      throw error;
    }
  }

  /**
   * Get all mall stores with filters
   */
  async getMallStores(filters?: {
    category?: string;
    premium?: boolean;
    minCoinReward?: number;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    stores: MallStoreData[];
    total: number;
    pages: number;
  }> {
    try {
      const params = new URLSearchParams();
      if (filters?.category) params.append('category', filters.category);
      if (filters?.premium) params.append('premium', 'true');
      if (filters?.minCoinReward) params.append('minCoinReward', filters.minCoinReward.toString());
      if (filters?.search) params.append('search', filters.search);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const response = await apiClient.get(
        `${MALL_ENDPOINTS.STORES}?${params.toString()}`
      );

      return {
        stores: response.data || [],
        total: response.meta?.pagination?.total || 0,
        pages: response.meta?.pagination?.pages || 0,
      };
    } catch (error) {
      devLog.error('Error fetching mall stores:', error);
      throw error;
    }
  }

  /**
   * Get featured mall stores
   */
  async getFeaturedMallStores(offset: number = 0, limit: number = 10): Promise<MallStoreData[]> {
    try {
      const response = await apiClient.get(
        `${MALL_ENDPOINTS.STORES_FEATURED}?offset=${offset}&limit=${limit}`
      );
      return response.data || [];
    } catch (error) {
      devLog.error('Error fetching featured mall stores:', error);
      throw error;
    }
  }

  /**
   * Get new mall stores
   */
  async getNewMallStores(offset: number = 0, limit: number = 10): Promise<MallStoreData[]> {
    try {
      const response = await apiClient.get(
        `${MALL_ENDPOINTS.STORES_NEW}?offset=${offset}&limit=${limit}`
      );
      return response.data || [];
    } catch (error) {
      devLog.error('Error fetching new mall stores:', error);
      throw error;
    }
  }

  /**
   * Get top rated mall stores
   */
  async getTopRatedMallStores(offset: number = 0, limit: number = 10): Promise<MallStoreData[]> {
    try {
      const response = await apiClient.get(
        `${MALL_ENDPOINTS.STORES_TOP_RATED}?offset=${offset}&limit=${limit}`
      );
      return response.data || [];
    } catch (error) {
      devLog.error('Error fetching top rated mall stores:', error);
      throw error;
    }
  }

  /**
   * Get premium mall stores
   */
  async getPremiumMallStores(offset: number = 0, limit: number = 10): Promise<MallStoreData[]> {
    try {
      const response = await apiClient.get(
        `${MALL_ENDPOINTS.STORES_PREMIUM}?offset=${offset}&limit=${limit}`
      );
      return response.data || [];
    } catch (error) {
      devLog.error('Error fetching premium mall stores:', error);
      throw error;
    }
  }

  /**
   * Search mall stores
   */
  async searchMallStores(query: string, limit: number = 20): Promise<MallStoreData[]> {
    try {
      if (!query || query.length < 2) return [];

      const response = await apiClient.get(
        `${MALL_ENDPOINTS.STORES_SEARCH}?q=${encodeURIComponent(query)}&limit=${limit}`
      );
      return response.data || [];
    } catch (error) {
      devLog.error('Error searching mall stores:', error);
      throw error;
    }
  }

  /**
   * Get mall store categories
   */
  async getMallStoreCategories(): Promise<MallHomepageBatchResponse['categories']> {
    try {
      const response = await apiClient.get(
        MALL_ENDPOINTS.STORES_CATEGORIES
      );
      return response.data || [];
    } catch (error) {
      devLog.error('Error fetching mall store categories:', error);
      throw error;
    }
  }

  /**
   * Get mall store by ID
   */
  async getMallStoreById(storeId: string): Promise<MallStoreData | null> {
    try {
      const response = await apiClient.get(
        `${MALL_ENDPOINTS.STORES}/${storeId}`
      );
      return response.data || null;
    } catch (error) {
      devLog.error('Error fetching mall store:', error);
      throw error;
    }
  }

  /**
   * Get mall stores by category
   */
  async getMallStoresByCategory(
    categoryId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    stores: MallStoreData[];
    total: number;
  }> {
    try {
      const response = await apiClient.get(
        `${MALL_ENDPOINTS.STORES}/category/${categoryId}?page=${page}&limit=${limit}`
      );

      return {
        stores: response.data || [],
        total: response.meta?.pagination?.total || 0,
      };
    } catch (error) {
      devLog.error('Error fetching mall stores by category:', error);
      throw error;
    }
  }

  /**
   * Get mall stores by category slug
   * Used by frontend category pages that use slug in URL
   */
  async getMallStoresByCategorySlug(
    categorySlug: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    category: { _id: string; name: string; slug: string; icon?: string; color?: string; description?: string } | null;
    stores: MallStoreData[];
    total: number;
    pages: number;
  }> {
    try {
      const response = await apiClient.get(`${MALL_ENDPOINTS.STORES}/category-slug/${categorySlug}?page=${page}&limit=${limit}`);

      const data = response.data;
      return {
        category: data?.category || null,
        stores: data?.stores || [],
        total: data?.pagination?.total || 0,
        pages: data?.pagination?.pages || 0,
      };
    } catch (error) {
      devLog.error('Error fetching mall stores by category slug:', error);
      throw error;
    }
  }
  /**
   * Get alliance mall stores (partner stores)
   */
  async getAllianceStores(limit: number = 20): Promise<MallStoreData[]> {
    try {
      const response = await apiClient.get(
        `${MALL_ENDPOINTS.STORES_ALLIANCE}?limit=${limit}`
      );
      return response.data || [];
    } catch (error) {
      devLog.error('Error fetching alliance stores:', error);
      throw error;
    }
  }

  /**
   * Get trending mall stores
   */
  async getTrendingStores(limit: number = 10): Promise<any[]> {
    try {
      const response = await apiClient.get(
        `${MALL_ENDPOINTS.STORES_TRENDING}?limit=${limit}`
      );
      return response.data || [];
    } catch (error) {
      devLog.error('Error fetching trending stores:', error);
      throw error;
    }
  }

  /**
   * Get reward booster stores (highest coin rewards)
   */
  async getRewardBoosterStores(limit: number = 10): Promise<any[]> {
    try {
      const response = await apiClient.get(
        `${MALL_ENDPOINTS.STORES_REWARD_BOOSTERS}?limit=${limit}`
      );
      return response.data || [];
    } catch (error) {
      devLog.error('Error fetching reward booster stores:', error);
      throw error;
    }
  }

  /**
   * Get deals of the day (flash sale offers)
   */
  async getDealsOfDay(limit: number = 10): Promise<any[]> {
    try {
      const response = await apiClient.get(
        `${MALL_ENDPOINTS.OFFERS_TODAY}?limit=${limit}`
      );
      return response.data || [];
    } catch (error) {
      devLog.error('Error fetching deals of the day:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const mallApi = new MallApiService();
export default mallApi;
