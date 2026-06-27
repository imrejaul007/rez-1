import apiClient, { ApiResponse } from './apiClient';
import { colors } from '@/constants/theme';
import { devLog } from '@/utils/devLogger';

// Types for the new offers API
export interface Offer {
  _id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image: string;
  category: 'mega' | 'student' | 'new_arrival' | 'trending' | 'food' | 'fashion' | 'electronics' | 'general';
  type: 'cashback' | 'discount' | 'voucher' | 'combo' | 'special';
  cashbackPercentage: number;
  originalPrice?: number;
  discountedPrice?: number;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  distance?: number;
  store: {
    id: string;
    name: string;
    logo?: string;
    rating?: number;
    verified?: boolean;
  };
  validity: {
    startDate: string;
    endDate: string;
    isActive: boolean;
  };
  engagement: {
    likesCount: number;
    sharesCount: number;
    viewsCount: number;
    isLikedByUser?: boolean;
  };
  restrictions: {
    minOrderValue?: number;
    maxDiscountAmount?: number;
    applicableOn?: string[];
    excludedProducts?: string[];
    ageRestriction?: {
      minAge?: number;
      maxAge?: number;
    };
    userTypeRestriction?: 'student' | 'new_user' | 'premium' | 'all';
  };
  metadata: {
    isNew?: boolean;
    isTrending?: boolean;
    isBestSeller?: boolean;
    isSpecial?: boolean;
    priority: number;
    tags: string[];
    featured?: boolean;
    flashSale?: {
      isActive: boolean;
      endTime?: string;
      originalPrice?: number;
      salePrice?: number;
    };
  };
  // Exclusive zone fields
  exclusiveZone?: 'corporate' | 'women' | 'birthday' | 'student' | 'senior' | 'defence' | 'healthcare' | 'teacher' | 'government' | 'differently-abled' | 'first-time';
  eligibilityRequirement?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OfferCategory {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color: string;
  backgroundColor?: string;
  isActive: boolean;
  priority: number;
  offers: string[];
  metadata: {
    displayOrder: number;
    isFeatured: boolean;
    parentCategory?: string;
    subcategories?: string[];
    tags: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface HeroBanner {
  _id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image: string;
  ctaText: string;
  ctaAction: string;
  ctaUrl?: string;
  backgroundColor: string;
  textColor?: string;
  isActive: boolean;
  priority: number;
  validFrom: string;
  validUntil: string;
  targetAudience: {
    userTypes?: ('student' | 'new_user' | 'premium' | 'all')[];
    ageRange?: {
      min?: number;
      max?: number;
    };
    locations?: string[];
    categories?: string[];
  };
  analytics: {
    views: number;
    clicks: number;
    conversions: number;
  };
  metadata: {
    page: 'offers' | 'home' | 'category' | 'product' | 'all';
    position: 'top' | 'middle' | 'bottom';
    size: 'small' | 'medium' | 'large' | 'full';
    animation?: string;
    tags: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface OfferSection {
  id: string;
  title: string;
  offers: Offer[];
  viewAllEnabled?: boolean;
}

export interface OffersPageData {
  heroBanner: HeroBanner | null;
  sections: {
    mega: {
      title: string;
      offers: Offer[];
    };
    students: {
      title: string;
      offers: Offer[];
    };
    newArrivals: {
      title: string;
      offers: Offer[];
    };
    trending: {
      title: string;
      offers: Offer[];
    };
  };
  userEngagement: {
    likedOffers: string[];
    userPoints: number;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

class RealOffersApi {
  /**
   * Get complete offers page data
   */
  async getOffersPageData(params?: {
    lat?: number;
    lng?: number;
  }): Promise<ApiResponse<OffersPageData>> {
    try {
      const response = await apiClient.get<OffersPageData>('/offers/page-data-v2', params);
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching offers page data:', error);
      throw error;
    }
  }

  /**
   * Get all offers with filters
   */
  async getOffers(params?: {
    category?: string;
    store?: string;
    type?: string;
    tags?: string;
    featured?: boolean;
    trending?: boolean;
    isNew?: boolean;
    minCashback?: number;
    maxCashback?: number;
    sortBy?: string;
    order?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<Offer> | Offer[]>> {
    try {
      const response = await apiClient.get<PaginatedResponse<Offer>>('/offers', params);
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching offers:', error);
      throw error;
    }
  }

  /**
   * Get mega offers
   */
  async getMegaOffers(limit?: number): Promise<ApiResponse<Offer[]>> {
    try {
      const response = await apiClient.get<Offer[]>('/offers/mega', { limit });
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching mega offers:', error);
      throw error;
    }
  }

  /**
   * Get student offers
   */
  async getStudentOffers(limit?: number): Promise<ApiResponse<Offer[]>> {
    try {
      const response = await apiClient.get<Offer[]>('/offers/students', { limit });
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching student offers:', error);
      throw error;
    }
  }

  /**
   * Get new arrival offers
   */
  async getNewArrivalOffers(limit?: number): Promise<ApiResponse<Offer[]>> {
    try {
      const response = await apiClient.get<Offer[]>('/offers/new-arrivals', { limit });
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching new arrival offers:', error);
      throw error;
    }
  }

  /**
   * Get trending offers
   */
  async getTrendingOffers(limit?: number): Promise<ApiResponse<Offer[]>> {
    try {
      const response = await apiClient.get<Offer[]>('/offers/trending', { limit });
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching trending offers:', error);
      throw error;
    }
  }

  /**
   * Get nearby offers
   */
  async getNearbyOffers(params: {
    lat: number;
    lng: number;
    maxDistance?: number;
    limit?: number;
  }): Promise<ApiResponse<Offer[]>> {
    try {
      const response = await apiClient.get<Offer[]>('/offers/nearby', params);
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching nearby offers:', error);
      throw error;
    }
  }

  /**
   * Get single offer by ID
   */
  async getOfferById(id: string): Promise<ApiResponse<Offer>> {
    try {
      const response = await apiClient.get<Offer>(`/offers/${id}`);
      return response;
    } catch (error) {
      devLog.error(`[OFFERS API] Error fetching offer ${id}:`, error);
      throw error;
    }
  }

  /**
   * Search offers
   */
  async searchOffers(params: {
    q: string;
    category?: string;
    store?: string;
    minCashback?: number;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<Offer>>> {
    try {
      const response = await apiClient.get<PaginatedResponse<Offer>>('/offers/search', params);
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error searching offers:', error);
      throw error;
    }
  }

  /**
   * Like/unlike an offer
   */
  async toggleOfferLike(id: string): Promise<ApiResponse<{ isLiked: boolean; likesCount: number }>> {
    try {
      const response = await apiClient.post<{ isLiked: boolean; likesCount: number }>(`/offers/${id}/like`);
      return response;
    } catch (error) {
      devLog.error(`[OFFERS API] Error toggling like for offer ${id}:`, error);
      throw error;
    }
  }

  /**
   * Share an offer
   */
  async shareOffer(id: string, params?: {
    platform?: string;
    message?: string;
  }): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const response = await apiClient.post<{ success: boolean }>(`/offers/${id}/share`, params);
      return response;
    } catch (error) {
      devLog.error(`[OFFERS API] Error sharing offer ${id}:`, error);
      throw error;
    }
  }

  /**
   * Track offer view
   */
  async trackOfferView(id: string): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const response = await apiClient.post<{ success: boolean }>(`/offers/${id}/view`);
      return response;
    } catch (error) {
      devLog.error(`[OFFERS API] Error tracking view for offer ${id}:`, error);
      throw error;
    }
  }

  /**
   * Track offer click
   */
  async trackOfferClick(id: string): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const response = await apiClient.post<{ success: boolean }>(`/offers/${id}/click`);
      return response;
    } catch (error) {
      devLog.error(`[OFFERS API] Error tracking click for offer ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get offer categories
   */
  async getOfferCategories(): Promise<ApiResponse<OfferCategory[]>> {
    try {
      const response = await apiClient.get<OfferCategory[]>('/offer-categories');
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching offer categories:', error);
      throw error;
    }
  }

  /**
   * Get offer category by slug
   */
  async getOfferCategoryBySlug(slug: string): Promise<ApiResponse<OfferCategory>> {
    try {
      const response = await apiClient.get<OfferCategory>(`/offer-categories/${slug}`);
      return response;
    } catch (error) {
      devLog.error(`[OFFERS API] Error fetching category ${slug}:`, error);
      throw error;
    }
  }

  /**
   * Get offers by category slug
   */
  async getOffersByCategorySlug(slug: string, params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    order?: string;
    lat?: number;
    lng?: number;
  }): Promise<ApiResponse<PaginatedResponse<Offer>>> {
    try {
      const response = await apiClient.get<PaginatedResponse<Offer>>(`/offer-categories/${slug}/offers`, params);
      return response;
    } catch (error) {
      devLog.error(`[OFFERS API] Error fetching offers for category ${slug}:`, error);
      throw error;
    }
  }

  /**
   * Get hero banners
   */
  async getHeroBanners(params?: {
    page?: string;
    position?: string;
  }): Promise<ApiResponse<HeroBanner[]>> {
    try {
      const response = await apiClient.get<HeroBanner[]>('/hero-banners', params);
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching hero banners:', error);
      throw error;
    }
  }

  /**
   * Track hero banner view
   */
  async trackHeroBannerView(id: string, params?: {
    source?: string;
    device?: string;
      location?: {
        type: 'Point';
        coordinates: [number, number];
      };
  }): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const response = await apiClient.post<{ success: boolean }>(`/hero-banners/${id}/view`, params);
      return response;
    } catch (error) {
      devLog.error(`[OFFERS API] Error tracking hero banner view ${id}:`, error);
      throw error;
    }
  }

  /**
   * Track hero banner click
   */
  async trackHeroBannerClick(id: string, params?: {
    source?: string;
    device?: string;
    location?: {
      type: 'Point';
      coordinates: [number, number];
    };
  }): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const response = await apiClient.post<{ success: boolean }>(`/hero-banners/${id}/click`, params);
      return response;
    } catch (error) {
      devLog.error(`[OFFERS API] Error tracking hero banner click ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get user's favorite offers
   */
  async getUserFavoriteOffers(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<Offer>>> {
    try {
      const response = await apiClient.get<PaginatedResponse<Offer>>('/offers/user/favorites', params);
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching user favorite offers:', error);
      throw error;
    }
  }

  /**
   * Add offer to favorites
   */
  async addOfferToFavorites(id: string): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const response = await apiClient.post<{ success: boolean }>(`/offers/${id}/favorite`);
      return response;
    } catch (error) {
      devLog.error(`[OFFERS API] Error adding offer ${id} to favorites:`, error);
      throw error;
    }
  }

  /**
   * Remove offer from favorites
   */
  async removeOfferFromFavorites(id: string): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const response = await apiClient.delete<{ success: boolean }>(`/offers/${id}/favorite`);
      return response;
    } catch (error) {
      devLog.error(`[OFFERS API] Error removing offer ${id} from favorites:`, error);
      throw error;
    }
  }

  /**
   * Redeem an offer - generates a voucher for the user
   */
  async redeemOffer(id: string, redemptionType: 'online' | 'instore' = 'online'): Promise<ApiResponse<{
    offer: Offer;
    voucher: {
      voucherCode: string;
      cashbackAmount: number;
      expiresAt: string;
    };
  }>> {
    try {
      const response = await apiClient.post<{
        offer: Offer;
        voucher: {
          voucherCode: string;
          cashbackAmount: number;
          expiresAt: string;
        };
      }>(`/offers/${id}/redeem`, { redemptionType });
      return response;
    } catch (error) {
      devLog.error(`[OFFERS API] Error redeeming offer ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get user's offer redemptions
   */
  async getUserRedemptions(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get<any>('/offers/user/redemptions', params);
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching user redemptions:', error);
      throw error;
    }
  }

  /**
   * Validate a redemption code before use
   * Returns offer details and restrictions if valid
   */
  async validateRedemptionCode(code: string): Promise<ApiResponse<{
    valid: boolean;
    redemption?: {
      _id: string;
      redemptionCode: string;
      status: string;
      expiryDate: string;
      redemptionType: string;
      verificationCode?: string;
    };
    offer?: {
      _id: string;
      title: string;
      image?: string;
      cashbackPercentage: number;
      type: string;
      restrictions: {
        minOrderValue: number;
        maxDiscountAmount: number | null;
      };
    };
  }>> {
    try {
      const response = await apiClient.post<any>('/offers/redemptions/validate', { code });
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error validating redemption code:', error);
      throw error;
    }
  }

  /**
   * Mark a redemption as used and credit cashback
   */
  async markRedemptionAsUsed(redemptionId: string, params: {
    orderAmount: number;
    orderId?: string;
    storeId?: string;
  }): Promise<ApiResponse<{
    success: boolean;
    redemption: {
      _id: string;
      status: string;
      usedDate: string;
      usedAmount: number;
    };
    cashback: {
      amount: number;
      percentage: number;
      orderAmount: number;
    };
    wallet?: {
      balance: number;
      available: number;
    };
  }>> {
    try {
      const response = await apiClient.post<any>(`/offers/redemptions/${redemptionId}/use`, params);
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error marking redemption as used:', error);
      throw error;
    }
  }

  /**
   * Get single redemption details
   */
  async getRedemptionById(redemptionId: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get<any>(`/offers/redemptions/${redemptionId}`);
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching redemption:', error);
      throw error;
    }
  }

  /**
   * Get store-specific deals/offers (Walk-in deals)
   * Uses /offers endpoint with store filter
   */
  async getStoreOffers(storeId: string, params?: {
    type?: 'walk_in' | 'online' | 'combo' | 'cashback' | 'flash_sale' | 'all';
    category?: string;
    active?: boolean;
    featured?: boolean;
    sortBy?: 'priority' | 'discount' | 'expiry' | 'newest';
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<any>> {
    try {
      // Use /offers/store/:storeId endpoint which accepts active parameter
      const queryParams: any = {
        page: params?.page || 1,
        limit: params?.limit || 20,
      };
      
      // Map active filter (only if explicitly set, default to true for active offers)
      if (params?.active !== undefined) {
        queryParams.active = params.active;
      } else {
        queryParams.active = true; // Default to active offers
      }
      
      // Note: /offers/store/:storeId endpoint doesn't support sortBy/order
      // It returns offers sorted by default (likely by creation date)
      
      // Use the store-specific endpoint which accepts active parameter
      const response = await apiClient.get<PaginatedResponse<Offer>>(`/offers/store/${storeId}`, queryParams);
      
      if (response.success && response.data) {
        // Backend returns: { success: true, data: [offers array], meta: { pagination: {...} } }
        // apiClient extracts responseData.data, so response.data is the array of offers
        // But apiClient doesn't preserve meta, so we need to get it from the raw response
        // For now, we'll use the array length as fallback for totalCount
        const offers = Array.isArray(response.data) ? response.data : [];
        
        // Try to get pagination from response if available (apiClient might not preserve it)
        const pagination = (response as Record<string, any>).meta?.pagination || (response as Record<string, any>).pagination || {};
        
        return {
          ...response,
          data: {
            deals: offers,
            totalCount: pagination.total || offers.length,
            storeInfo: {
              id: storeId,
            }
          }
        };
      }
      
      // Fallback to mock data if API fails
      const mockDeals = this.generateMockStoreDeals(storeId, params);
      return {
        success: true,
        data: {
          deals: mockDeals,
          totalCount: mockDeals.length,
          storeInfo: {
            id: storeId,
            name: 'Store Name',
          }
        },
        message: 'Store deals retrieved successfully (fallback)',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      devLog.error(`[OFFERS API] Error fetching store offers for ${storeId}:`, error);
      throw error;
    }
  }

  /**
   * Generate comprehensive mock store deals
   */
  private generateMockStoreDeals(storeId: string, params?: any): any[] {
    const allMockDeals = [
      {
        id: 'deal-001',
        storeId,
        title: 'Mega Weekend Sale',
        description: 'Get flat 30% off on all products this weekend',
        type: 'walk_in',
        discountType: 'percentage',
        discountValue: 30,
        minPurchase: 2000,
        maxDiscount: 1500,
        validFrom: new Date().toISOString(),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        terms: ['Valid on weekends only', 'Not applicable on sale items', 'Cannot be combined with other offers'],
        applicableProducts: ['Fashion', 'Electronics', 'Home'],
        isActive: true,
        isFeatured: true,
        category: 'instant-discount',
        priority: 1,
        usageLimit: 100,
        usedCount: 23,
        badge: { text: 'Save 30%', backgroundColor: '#E5E7EB', textColor: '#374151' }
      },
      {
        id: 'deal-002',
        storeId,
        title: 'Flash Sale - Limited Time',
        description: 'Grab amazing deals before they expire',
        type: 'flash_sale',
        discountType: 'percentage',
        discountValue: 50,
        minPurchase: 1500,
        maxDiscount: 2000,
        validFrom: new Date().toISOString(),
        validUntil: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        terms: ['Valid for 48 hours only', 'While stocks last', 'Limited to 5 items per customer'],
        applicableProducts: ['Fashion', 'Accessories'],
        isActive: true,
        isFeatured: true,
        category: 'seasonal',
        priority: 2,
        usageLimit: 50,
        usedCount: 31,
        badge: { text: '50% OFF', backgroundColor: colors.errorScale[100], textColor: '#991B1B' }
      },
      {
        id: 'deal-003',
        storeId,
        title: 'Buy 2 Get 1 Free',
        description: 'Purchase any 2 items and get the lowest priced item absolutely free',
        type: 'combo',
        discountType: 'bogo',
        discountValue: 0,
        minPurchase: 3000,
        validFrom: new Date().toISOString(),
        validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        terms: ['Lowest priced item will be free', 'Valid on marked products only', 'Maximum 3 free items per transaction'],
        applicableProducts: ['Fashion', 'Personal Care'],
        isActive: true,
        isFeatured: false,
        category: 'buy-one-get-one',
        priority: 3,
        usageLimit: 75,
        usedCount: 12,
        badge: { text: 'BOGO', backgroundColor: '#FEF3C7', textColor: '#92400E' }
      },
      {
        id: 'deal-004',
        storeId,
        title: 'Cashback Bonanza',
        description: 'Earn 15% cashback on all purchases',
        type: 'cashback',
        discountType: 'percentage',
        discountValue: 15,
        minPurchase: 1000,
        maxDiscount: 500,
        validFrom: new Date().toISOString(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        terms: ['Cashback credited within 24 hours', 'Valid on all payment methods', 'Maximum 2 transactions per day'],
        applicableProducts: ['All Categories'],
        isActive: true,
        isFeatured: true,
        category: 'cashback',
        priority: 4,
        usageLimit: 200,
        usedCount: 87,
        badge: { text: '15% Cashback', backgroundColor: '#D1FAE5', textColor: '#065F46' }
      },
      {
        id: 'deal-005',
        storeId,
        title: 'First Time Customer Special',
        description: 'Exclusive 25% discount for new customers',
        type: 'walk_in',
        discountType: 'percentage',
        discountValue: 25,
        minPurchase: 1500,
        maxDiscount: 1000,
        validFrom: new Date().toISOString(),
        validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        terms: ['Valid for first-time customers only', 'ID verification required', 'One-time use only'],
        applicableProducts: ['Fashion', 'Electronics', 'Home'],
        isActive: true,
        isFeatured: true,
        category: 'first-time',
        priority: 5,
        usageLimit: 150,
        usedCount: 45,
        badge: { text: 'New Customer', backgroundColor: '#DBEAFE', textColor: '#1E40AF' }
      },
      {
        id: 'deal-006',
        storeId,
        title: 'VIP Member Exclusive',
        description: 'Special discount for our loyal VIP members',
        type: 'walk_in',
        discountType: 'percentage',
        discountValue: 20,
        minPurchase: 5000,
        maxDiscount: 2500,
        validFrom: new Date().toISOString(),
        validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        terms: ['Valid for VIP members only', 'Show membership card', 'Earn double loyalty points'],
        applicableProducts: ['All Categories'],
        isActive: true,
        isFeatured: false,
        category: 'loyalty',
        priority: 6,
        usageLimit: 300,
        usedCount: 156,
        badge: { text: 'VIP 20%', backgroundColor: '#F3E8FF', textColor: colors.brand.purple }
      },
      {
        id: 'deal-007',
        storeId,
        title: 'Clearance Mega Sale',
        description: 'Massive discounts on clearance items',
        type: 'walk_in',
        discountType: 'percentage',
        discountValue: 60,
        minPurchase: 500,
        maxDiscount: 3000,
        validFrom: new Date().toISOString(),
        validUntil: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        terms: ['Clearance items only', 'No returns or exchanges', 'While stocks last'],
        applicableProducts: ['Fashion', 'Home'],
        isActive: true,
        isFeatured: true,
        category: 'clearance',
        priority: 7,
        usageLimit: 100,
        usedCount: 67,
        badge: { text: '60% OFF', backgroundColor: colors.errorScale[100], textColor: '#991B1B' }
      },
      {
        id: 'deal-008',
        storeId,
        title: 'Student Discount',
        description: 'Special offer for students with valid ID',
        type: 'walk_in',
        discountType: 'percentage',
        discountValue: 18,
        minPurchase: 1200,
        maxDiscount: 800,
        validFrom: new Date().toISOString(),
        validUntil: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString(),
        terms: ['Valid student ID required', 'Available all days', 'Not valid on sale items'],
        applicableProducts: ['Fashion', 'Electronics', 'Books'],
        isActive: true,
        isFeatured: false,
        category: 'instant-discount',
        priority: 8,
        usageLimit: 250,
        usedCount: 98,
        badge: { text: 'Student 18%', backgroundColor: '#E0E7FF', textColor: '#3730A3' }
      },
      {
        id: 'deal-009',
        storeId,
        title: 'Online Exclusive Deal',
        description: 'Order online and get extra 10% off',
        type: 'online',
        discountType: 'percentage',
        discountValue: 10,
        minPurchase: 800,
        maxDiscount: 400,
        validFrom: new Date().toISOString(),
        validUntil: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
        terms: ['Online orders only', 'Free home delivery', 'Prepaid orders only'],
        applicableProducts: ['All Categories'],
        isActive: true,
        isFeatured: false,
        category: 'instant-discount',
        priority: 9,
        usageLimit: 500,
        usedCount: 234,
        badge: { text: 'Online 10%', backgroundColor: '#E0F2FE', textColor: '#075985' }
      },
      {
        id: 'deal-010',
        storeId,
        title: 'Festive Season Offer',
        description: 'Celebrate with amazing festive discounts',
        type: 'walk_in',
        discountType: 'percentage',
        discountValue: 35,
        minPurchase: 3500,
        maxDiscount: 2000,
        validFrom: new Date().toISOString(),
        validUntil: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
        terms: ['Valid during festive season', 'Special gift with purchase', 'Limited period offer'],
        applicableProducts: ['Fashion', 'Jewelry', 'Home Decor'],
        isActive: true,
        isFeatured: true,
        category: 'seasonal',
        priority: 10,
        usageLimit: 120,
        usedCount: 54,
        badge: { text: 'Festive 35%', backgroundColor: '#FED7AA', textColor: '#9A3412' }
      },
      {
        id: 'deal-011',
        storeId,
        title: 'Combo Deal Special',
        description: 'Save more when you buy in combo',
        type: 'combo',
        discountType: 'percentage',
        discountValue: 25,
        minPurchase: 2500,
        maxDiscount: 1200,
        validFrom: new Date().toISOString(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        terms: ['Buy any 3 products', 'Get 25% off on total', 'Selected products only'],
        applicableProducts: ['Fashion', 'Accessories', 'Personal Care'],
        isActive: true,
        isFeatured: false,
        category: 'buy-one-get-one',
        priority: 11,
        usageLimit: 80,
        usedCount: 34,
        badge: { text: 'Combo 25%', backgroundColor: '#FEF3C7', textColor: '#78350F' }
      },
      {
        id: 'deal-012',
        storeId,
        title: 'Early Bird Discount',
        description: 'Shop before 12 PM and get extra discount',
        type: 'walk_in',
        discountType: 'percentage',
        discountValue: 12,
        minPurchase: 1000,
        maxDiscount: 600,
        validFrom: new Date().toISOString(),
        validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        terms: ['Valid before 12 PM only', 'All days of the week', 'Show this offer at billing'],
        applicableProducts: ['All Categories'],
        isActive: true,
        isFeatured: false,
        category: 'instant-discount',
        priority: 12,
        usageLimit: 180,
        usedCount: 89,
        badge: { text: 'Early Bird', backgroundColor: '#FEF9C3', textColor: '#713F12' }
      },
      {
        id: 'deal-013',
        storeId,
        title: 'Birthday Month Special',
        description: 'Celebrate your birthday month with extra savings',
        type: 'walk_in',
        discountType: 'percentage',
        discountValue: 22,
        minPurchase: 2000,
        maxDiscount: 1100,
        validFrom: new Date().toISOString(),
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        terms: ['Valid ID required', 'Valid throughout birthday month', 'One-time use per year'],
        applicableProducts: ['All Categories'],
        isActive: true,
        isFeatured: true,
        category: 'loyalty',
        priority: 13,
        usageLimit: 400,
        usedCount: 167,
        badge: { text: 'Birthday 22%', backgroundColor: '#FCE7F3', textColor: '#9F1239' }
      },
      {
        id: 'deal-014',
        storeId,
        title: 'Senior Citizen Discount',
        description: 'Special discount for senior citizens',
        type: 'walk_in',
        discountType: 'percentage',
        discountValue: 15,
        minPurchase: 800,
        maxDiscount: 700,
        validFrom: new Date().toISOString(),
        validUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
        terms: ['Age 60+ required', 'Valid ID proof needed', 'Available all days'],
        applicableProducts: ['All Categories'],
        isActive: true,
        isFeatured: false,
        category: 'instant-discount',
        priority: 14,
        usageLimit: 300,
        usedCount: 134,
        badge: { text: 'Senior 15%', backgroundColor: '#E0E7FF', textColor: '#4338CA' }
      },
      {
        id: 'deal-015',
        storeId,
        title: 'Referral Bonus',
        description: 'Refer a friend and both get discount',
        type: 'cashback',
        discountType: 'fixed',
        discountValue: 500,
        minPurchase: 2500,
        validFrom: new Date().toISOString(),
        validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        terms: ['Both referrer and referee get bonus', 'Valid on first purchase of referee', 'No maximum limit'],
        applicableProducts: ['All Categories'],
        isActive: true,
        isFeatured: true,
        category: 'cashback',
        priority: 15,
        usageLimit: 1000,
        usedCount: 312,
        badge: { text: 'Refer & Earn', backgroundColor: '#D1FAE5', textColor: '#064E3B' }
      },
      {
        id: 'deal-016',
        storeId,
        title: 'Midnight Sale',
        description: 'Exclusive deals available only at midnight',
        type: 'flash_sale',
        discountType: 'percentage',
        discountValue: 40,
        minPurchase: 2000,
        maxDiscount: 1800,
        validFrom: new Date().toISOString(),
        validUntil: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        terms: ['Valid between 12 AM to 2 AM only', 'Limited quantity', 'First come first serve'],
        applicableProducts: ['Electronics', 'Fashion'],
        isActive: true,
        isFeatured: true,
        category: 'seasonal',
        priority: 16,
        usageLimit: 60,
        usedCount: 41,
        badge: { text: 'Midnight 40%', backgroundColor: '#1F2937', textColor: '#F9FAFB' }
      },
      {
        id: 'deal-017',
        storeId,
        title: 'Bulk Purchase Discount',
        description: 'Buy more, save more with bulk discounts',
        type: 'walk_in',
        discountType: 'percentage',
        discountValue: 28,
        minPurchase: 10000,
        maxDiscount: 5000,
        validFrom: new Date().toISOString(),
        validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        terms: ['Minimum 10 items required', 'Bulk orders only', 'Prior intimation preferred'],
        applicableProducts: ['All Categories'],
        isActive: true,
        isFeatured: false,
        category: 'instant-discount',
        priority: 17,
        usageLimit: 40,
        usedCount: 18,
        badge: { text: 'Bulk 28%', backgroundColor: '#E0E7FF', textColor: '#3730A3' }
      },
      {
        id: 'deal-018',
        storeId,
        title: 'App Exclusive Deal',
        description: 'Download our app and get instant discount',
        type: 'online',
        discountType: 'percentage',
        discountValue: 20,
        minPurchase: 1500,
        maxDiscount: 1000,
        validFrom: new Date().toISOString(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        terms: ['Valid for app users only', 'One-time offer', 'Prepaid orders preferred'],
        applicableProducts: ['All Categories'],
        isActive: true,
        isFeatured: true,
        category: 'instant-discount',
        priority: 18,
        usageLimit: 200,
        usedCount: 127,
        badge: { text: 'App 20%', backgroundColor: '#DBEAFE', textColor: '#1E40AF' }
      },
      {
        id: 'deal-019',
        storeId,
        title: 'Weekend Flash Deal',
        description: 'Super saver weekend deals',
        type: 'flash_sale',
        discountType: 'percentage',
        discountValue: 45,
        minPurchase: 3000,
        maxDiscount: 2200,
        validFrom: new Date().toISOString(),
        validUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        terms: ['Weekend only', 'Saturday and Sunday', 'Limited stock available'],
        applicableProducts: ['Fashion', 'Home', 'Electronics'],
        isActive: true,
        isFeatured: true,
        category: 'seasonal',
        priority: 19,
        usageLimit: 90,
        usedCount: 62,
        badge: { text: 'Weekend 45%', backgroundColor: colors.errorScale[100], textColor: '#7F1D1D' }
      },
      {
        id: 'deal-020',
        storeId,
        title: 'Loyalty Points 2X',
        description: 'Earn double loyalty points on all purchases',
        type: 'cashback',
        discountType: 'percentage',
        discountValue: 10,
        minPurchase: 1000,
        maxDiscount: 500,
        validFrom: new Date().toISOString(),
        validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        terms: ['Loyalty members only', 'Points credited instantly', 'Valid on all purchases'],
        applicableProducts: ['All Categories'],
        isActive: true,
        isFeatured: false,
        category: 'loyalty',
        priority: 20,
        usageLimit: 400,
        usedCount: 245,
        badge: { text: '2X Points', backgroundColor: '#F3E8FF', textColor: '#6B21A8' }
      }
    ];

    // Apply filters if provided
    let filteredDeals = allMockDeals;

    if (params?.type && params.type !== 'all') {
      filteredDeals = filteredDeals.filter(deal => deal.type === params.type);
    }

    if (params?.category) {
      filteredDeals = filteredDeals.filter(deal => deal.category === params.category);
    }

    if (params?.active !== undefined) {
      filteredDeals = filteredDeals.filter(deal => deal.isActive === params.active);
    }

    if (params?.featured !== undefined) {
      filteredDeals = filteredDeals.filter(deal => deal.isFeatured === params.featured);
    }

    // Apply sorting
    if (params?.sortBy) {
      switch (params.sortBy) {
        case 'priority':
          filteredDeals.sort((a, b) => a.priority - b.priority);
          break;
        case 'discount':
          filteredDeals.sort((a, b) => b.discountValue - a.discountValue);
          break;
        case 'expiry':
          filteredDeals.sort((a, b) => new Date(a.validUntil).getTime() - new Date(b.validUntil).getTime());
          break;
        case 'newest':
          filteredDeals.sort((a, b) => new Date(b.validFrom).getTime() - new Date(a.validFrom).getTime());
          break;
      }
    }

    // Apply pagination
    const limit = params?.limit || 20;
    const page = params?.page || 1;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    return filteredDeals.slice(startIndex, endIndex);
  }

  // =====================
  // NEW OFFERS PAGE ENDPOINTS
  // =====================

  /**
   * Get hotspot areas
   */
  async getHotspots(params?: {
    lat?: number;
    lng?: number;
    limit?: number;
  }): Promise<ApiResponse<any[]>> {
    try {
      const response = await apiClient.get<any[]>('/offers/hotspots', params);
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching hotspots:', error);
      throw error;
    }
  }

  /**
   * Get offers for a specific hotspot
   */
  async getHotspotOffers(slug: string, limit?: number): Promise<ApiResponse<{ hotspot: any; offers: Offer[] }>> {
    try {
      const response = await apiClient.get<{ hotspot: any; offers: Offer[] }>(`/offers/hotspots/${slug}/offers`, { limit });
      return response;
    } catch (error) {
      devLog.error(`[OFFERS API] Error fetching hotspot ${slug} offers:`, error);
      throw error;
    }
  }

  /**
   * Get BOGO (Buy One Get One) offers
   */
  async getBOGOOffers(params?: {
    bogoType?: 'buy1get1' | 'buy2get1' | 'buy1get50' | 'buy2get50';
    limit?: number;
  }): Promise<ApiResponse<Offer[]>> {
    try {
      const response = await apiClient.get<Offer[]>('/offers/bogo', params);
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching BOGO offers:', error);
      throw error;
    }
  }

  /**
   * Get sale and clearance offers
   */
  async getSaleOffers(params?: {
    saleTag?: 'clearance' | 'sale' | 'last_pieces' | 'mega_sale';
    limit?: number;
  }): Promise<ApiResponse<Offer[]>> {
    try {
      const response = await apiClient.get<Offer[]>('/offers/sales-clearance', params);
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching sale offers:', error);
      throw error;
    }
  }

  /**
   * Get free delivery offers
   */
  async getFreeDeliveryOffers(limit?: number): Promise<ApiResponse<Offer[]>> {
    try {
      const response = await apiClient.get<Offer[]>('/offers/free-delivery', { limit });
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching free delivery offers:', error);
      throw error;
    }
  }

  /**
   * Get bank and wallet offers
   */
  async getBankOffers(params?: {
    cardType?: 'credit' | 'debit' | 'wallet' | 'upi' | 'bnpl';
    limit?: number;
  }): Promise<ApiResponse<any[]>> {
    try {
      const response = await apiClient.get<any[]>('/offers/bank-offers', params);
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching bank offers:', error);
      throw error;
    }
  }

  /**
   * Get homepage deals section config and items
   */
  async getHomepageDealsSection(region?: string): Promise<ApiResponse<{
    section: { title: string; subtitle: string; icon: string };
    enabledTabs: { key: string; displayName: string; sortOrder: number }[];
    tabs: {
      offers: { isEnabled: boolean; displayName: string; items: any[] };
      cashback: { isEnabled: boolean; displayName: string; items: any[] };
      exclusive: { isEnabled: boolean; displayName: string; items: any[] };
    };
  } | null>> {
    try {
      const headers: Record<string, string> = {};
      if (region) {
        headers['X-Rez-Region'] = region;
      }
      const response = await apiClient.get<any>('/offers/homepage-deals-section', {}, { headers });
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching homepage deals section:', error);
      throw error;
    }
  }

  /**
   * Get exclusive zones
   */
  async getExclusiveZones(): Promise<ApiResponse<any[]>> {
    try {
      const response = await apiClient.get<any[]>('/offers/exclusive-zones');
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching exclusive zones:', error);
      throw error;
    }
  }

  /**
   * Get offers for a specific exclusive zone
   */
  async getExclusiveZoneOffers(slug: string, limit?: number): Promise<ApiResponse<{ zone: any; offers: Offer[] }>> {
    try {
      const response = await apiClient.get<{ zone: any; offers: Offer[] }>(`/offers/exclusive-zones/${slug}/offers`, { limit });
      return response;
    } catch (error) {
      devLog.error(`[OFFERS API] Error fetching exclusive zone ${slug} offers:`, error);
      throw error;
    }
  }

  /**
   * Get special profiles (Defence, Healthcare, etc.)
   */
  async getSpecialProfiles(): Promise<ApiResponse<any[]>> {
    try {
      const response = await apiClient.get<any[]>('/offers/special-profiles');
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching special profiles:', error);
      throw error;
    }
  }

  /**
   * Get offers for a specific special profile
   */
  async getSpecialProfileOffers(slug: string, limit?: number): Promise<ApiResponse<{ profile: any; offers: Offer[] }>> {
    try {
      const response = await apiClient.get<{ profile: any; offers: Offer[] }>(`/offers/special-profiles/${slug}/offers`, { limit });
      return response;
    } catch (error) {
      devLog.error(`[OFFERS API] Error fetching special profile ${slug} offers:`, error);
      throw error;
    }
  }

  /**
   * Get friends' redeemed offers (social proof)
   */
  async getFriendsRedeemed(limit?: number): Promise<ApiResponse<any[]>> {
    try {
      const response = await apiClient.get<any[]>('/offers/friends-redeemed', { limit });
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching friends redeemed:', error);
      throw error;
    }
  }

  /**
   * Get double cashback campaigns
   */
  async getDoubleCashbackCampaigns(limit?: number): Promise<ApiResponse<any[]>> {
    try {
      const response = await apiClient.get<any[]>('/cashback/double-campaigns', { limit });
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching double cashback campaigns:', error);
      throw error;
    }
  }

  /**
   * Get coin drop events
   */
  async getCoinDrops(params?: {
    category?: string;
    limit?: number;
  }): Promise<ApiResponse<any[]>> {
    try {
      const response = await apiClient.get<any[]>('/cashback/coin-drops', params);
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching coin drops:', error);
      throw error;
    }
  }

  /**
   * Get upload bill stores
   */
  async getUploadBillStores(params?: {
    category?: string;
    limit?: number;
  }): Promise<ApiResponse<any[]>> {
    try {
      const response = await apiClient.get<any[]>('/cashback/upload-bill-stores', params);
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching upload bill stores:', error);
      throw error;
    }
  }

  /**
   * Get super cashback stores (stores with 10%+ cashback)
   */
  async getSuperCashbackStores(params?: {
    minCashback?: number;
    limit?: number;
  }): Promise<ApiResponse<any[]>> {
    try {
      const response = await apiClient.get<any[]>('/cashback/super-cashback-stores', params);
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching super cashback stores:', error);
      throw error;
    }
  }

  /**
   * Get loyalty milestones
   */
  async getLoyaltyMilestones(): Promise<ApiResponse<any[]>> {
    try {
      const response = await apiClient.get<any[]>('/loyalty/milestones');
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching loyalty milestones:', error);
      throw error;
    }
  }

  /**
   * Get user's loyalty progress
   */
  async getLoyaltyProgress(): Promise<ApiResponse<any[]>> {
    try {
      const response = await apiClient.get<any[]>('/loyalty/progress');
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching loyalty progress:', error);
      throw error;
    }
  }

  /**
   * Get discount buckets (real-time aggregation counts)
   * Returns counts for 25% OFF, 50% OFF, 80% OFF, and Free Delivery
   */
  async getDiscountBuckets(): Promise<ApiResponse<{
    id: string;
    label: string;
    icon: string;
    count: number;
    filterValue: string;
  }[]>> {
    try {
      devLog.log('📊 [OFFERS API] Fetching discount buckets');
      const response = await apiClient.get<any[]>('/offers/discount-buckets');

      if (response.success && response.data) {
        // Add default colors if not provided by backend
        const bucketsWithColors = (Array.isArray(response.data) ? response.data : []).map((bucket: any) => ({
          ...bucket,
          backgroundColor: bucket.backgroundColor || this.getDefaultBucketColor(bucket.filterValue).bg,
          textColor: bucket.textColor || this.getDefaultBucketColor(bucket.filterValue).text,
          iconColor: bucket.iconColor || this.getDefaultBucketColor(bucket.filterValue).icon,
        }));

        devLog.log(`✅ [OFFERS API] Got ${bucketsWithColors.length} discount buckets`);
        return {
          ...response,
          data: bucketsWithColors,
        };
      }

      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching discount buckets:', error);
      throw error;
    }
  }

  // Helper to get default colors for discount buckets
  private getDefaultBucketColor(filterValue: string): { bg: string; text: string; icon: string } {
    switch (filterValue) {
      case '25':
        return { bg: '#D1FAE5', text: '#059669', icon: '#10B981' };
      case '50':
        return { bg: '#FEF3C7', text: '#D97706', icon: '#F59E0B' };
      case '80':
        return { bg: colors.errorScale[100], text: '#DC2626', icon: colors.error };
      case 'free_delivery':
        return { bg: '#DBEAFE', text: '#2563EB', icon: '#3B82F6' };
      default:
        return { bg: '#F3F4F6', text: '#374151', icon: '#6B7280' };
    }
  }

  /**
   * Get active flash sales (Lightning Deals)
   * Uses the FlashSale model directly (not offers with flash sale metadata)
   */
  async getFlashSales(limit?: number): Promise<ApiResponse<any[]>> {
    try {
      devLog.log('⚡ [OFFERS API] Fetching flash sales (lightning deals)');
      const response = await apiClient.get<any[]>('/flash-sales/active', { limit });

      if (response.success && response.data) {
        const flashSales = Array.isArray(response.data) ? response.data : [];

        devLog.log(`✅ [OFFERS API] Got ${flashSales.length} flash sales`);
        return {
          ...response,
          data: flashSales,
        };
      }

      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching flash sales:', error);
      throw error;
    }
  }

  /**
   * Get flash sale by ID
   * Fetches a single flash sale with full details
   */
  async getFlashSaleById(flashSaleId: string): Promise<ApiResponse<any>> {
    try {
      devLog.log('⚡ [OFFERS API] Fetching flash sale by ID:', flashSaleId);
      const response = await apiClient.get<any>(`/flash-sales/${flashSaleId}`);

      if (response.success && response.data) {
        devLog.log('✅ [OFFERS API] Got flash sale:', response.data.title);
        return response;
      }

      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching flash sale by ID:', error);
      throw error;
    }
  }

  /**
   * Get new arrival offers (New Today)
   * Offers marked as new and recently added
   */
  async getNewArrivals(limit: number = 10): Promise<ApiResponse<any[]>> {
    try {
      devLog.log('🆕 [OFFERS API] Fetching new arrivals');
      const response = await apiClient.get<any[]>('/offers/new-arrivals', { limit });

      if (response.success && response.data) {
        const offers = Array.isArray(response.data) ? response.data : [];

        devLog.log(`✅ [OFFERS API] Got ${offers.length} new arrivals`);
        return {
          ...response,
          data: offers,
        };
      }

      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching new arrivals:', error);
      throw error;
    }
  }

  /**
   * Get AI recommended offers for user
   * Personalized recommendations based on user behavior
   */
  async getRecommendedOffers(limit: number = 10): Promise<ApiResponse<any[]>> {
    try {
      devLog.log('🤖 [OFFERS API] Fetching AI recommended offers');
      const response = await apiClient.get<any[]>('/offers/user/recommendations', { limit });

      if (response.success && response.data) {
        const offers = Array.isArray(response.data) ? response.data : [];

        devLog.log(`✅ [OFFERS API] Got ${offers.length} recommended offers`);
        return {
          ...response,
          data: offers,
        };
      }

      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching recommended offers:', error);
      throw error;
    }
  }

  /**
   * Get expiring soon offers (Last Chance)
   * Offers that are about to expire within 24 hours
   */
  async getExpiringSoonOffers(limit: number = 10): Promise<ApiResponse<any[]>> {
    try {
      devLog.log('⏰ [OFFERS API] Fetching expiring soon offers');
      const response = await apiClient.get<any[]>('/flash-sales/expiring-soon', { limit, minutes: 1440 });

      if (response.success && response.data) {
        const offers = Array.isArray(response.data) ? response.data : [];

        devLog.log(`✅ [OFFERS API] Got ${offers.length} expiring soon offers`);
        return {
          ...response,
          data: offers,
        };
      }

      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching expiring offers:', error);
      throw error;
    }
  }

  /**
   * Get today's offers
   * Active flash sale offers for today
   */
  async getTodaysOffers(limit: number = 10): Promise<ApiResponse<any[]>> {
    try {
      devLog.log('📅 [OFFERS API] Fetching today\'s offers');
      const response = await apiClient.get<any[]>('/offers/flash-sales', { limit });

      if (response.success && response.data) {
        const offers = Array.isArray(response.data) ? response.data : [];

        devLog.log(`✅ [OFFERS API] Got ${offers.length} today's offers`);
        return {
          ...response,
          data: offers,
        };
      }

      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching today\'s offers:', error);
      throw error;
    }
  }

  // ============================================
  // FLASH SALE PURCHASE METHODS (Stripe)
  // ============================================

  /**
   * Initiate flash sale purchase - creates Stripe checkout session
   */
  async initiateFlashSalePurchase(
    flashSaleId: string,
    quantity: number = 1,
    options?: { successUrl?: string; cancelUrl?: string }
  ): Promise<ApiResponse<{
    purchaseId: string;
    stripeSessionId: string;
    stripeCheckoutUrl: string;
    amount: number;
    currency: string;
    flashSale: {
      title: string;
      image: string;
      originalPrice: number;
      flashSalePrice: number;
      discountPercentage: number;
    };
  }>> {
    try {
      devLog.log('💳 [OFFERS API] Initiating flash sale purchase with Stripe:', flashSaleId);
      const response = await apiClient.post<{
        purchaseId: string;
        stripeSessionId: string;
        stripeCheckoutUrl: string;
        amount: number;
        currency: string;
        flashSale: {
          title: string;
          image: string;
          originalPrice: number;
          flashSalePrice: number;
          discountPercentage: number;
        };
      }>('/flash-sales/purchase/initiate', {
        flashSaleId,
        quantity,
        successUrl: options?.successUrl,
        cancelUrl: options?.cancelUrl,
      });

      if (response.success) {
        devLog.log('✅ [OFFERS API] Flash sale purchase initiated:', response.data?.purchaseId);
      }
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error initiating flash sale purchase:', error);
      throw error;
    }
  }

  /**
   * Verify flash sale payment - completes the purchase (for Stripe)
   */
  async verifyFlashSalePayment(data: {
    purchaseId: string;
    stripeSessionId: string;
  }): Promise<ApiResponse<{
    voucherCode: string;
    promoCode?: string;
    expiresAt: string;
    amount: number;
  }>> {
    try {
      devLog.log('✔️ [OFFERS API] Verifying flash sale payment:', data.purchaseId);
      const response = await apiClient.post<{
        voucherCode: string;
        promoCode?: string;
        expiresAt: string;
        amount: number;
      }>('/flash-sales/purchase/verify', data);

      if (response.success) {
        devLog.log('✅ [OFFERS API] Flash sale payment verified, voucher:', response.data?.voucherCode);
      }
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error verifying flash sale payment:', error);
      throw error;
    }
  }

  /**
   * Mark flash sale purchase as failed
   */
  async failFlashSalePurchase(purchaseId: string, reason: string): Promise<ApiResponse<void>> {
    try {
      devLog.log('❌ [OFFERS API] Marking flash sale purchase as failed:', purchaseId);
      const response = await apiClient.post<void>('/flash-sales/purchase/fail', { purchaseId, reason });
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error failing flash sale purchase:', error);
      throw error;
    }
  }

  /**
   * Get user's flash sale purchases
   */
  async getMyFlashSalePurchases(): Promise<ApiResponse<Array<{
    _id: string;
    flashSale: {
      _id: string;
      title: string;
      image: string;
      discountPercentage: number;
    };
    amount: number;
    voucherCode: string;
    promoCode?: string;
    paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
    isRedeemed: boolean;
    voucherExpiresAt: string;
    purchasedAt: string;
  }>>> {
    try {
      devLog.log('📋 [OFFERS API] Fetching user flash sale purchases');
      const response = await apiClient.get<Array<any>>('/flash-sales/purchases');

      if (response.success) {
        const purchases = Array.isArray(response.data) ? response.data : [];
        devLog.log(`✅ [OFFERS API] Got ${purchases.length} flash sale purchases`);
        return { ...response, data: purchases };
      }
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching flash sale purchases:', error);
      throw error;
    }
  }

  /**
   * Get flash sale purchase by ID
   */
  async getFlashSalePurchaseById(purchaseId: string): Promise<ApiResponse<any>> {
    try {
      devLog.log('🔍 [OFFERS API] Fetching flash sale purchase:', purchaseId);
      const response = await apiClient.get<any>(`/flash-sales/purchases/${purchaseId}`);
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching flash sale purchase:', error);
      throw error;
    }
  }

  // ============================================
  // ZONE VERIFICATION
  // ============================================

  /**
   * Check user's eligibility for a zone
   */
  async getZoneEligibility(slug: string): Promise<ApiResponse<{
    zone: {
      name: string;
      slug: string;
      description: string;
      eligibilityType: string;
      eligibilityDetails: string;
      verificationRequired: boolean;
    };
    isEligible: boolean;
    autoVerified: boolean;
    verificationStatus: 'pending' | 'approved' | 'rejected' | null;
    requiresAuth: boolean;
    message: string;
  }>> {
    try {
      const response = await apiClient.get<any>(`/zones/${slug}/eligibility`);
      return response;
    } catch (error) {
      devLog.error(`[OFFERS API] Error checking zone eligibility for ${slug}:`, error);
      throw error;
    }
  }

  /**
   * Submit verification request for a zone
   */
  async submitZoneVerification(slug: string, data: {
    documentType?: string;
    email?: string;
    instituteName?: string;
    companyName?: string;
    serviceNumber?: string;
  }): Promise<ApiResponse<{
    id: string;
    status: string;
    zoneSlug: string;
    createdAt: string;
  }>> {
    try {
      const response = await apiClient.post<any>(`/zones/${slug}/verify`, data);
      return response;
    } catch (error) {
      devLog.error(`[OFFERS API] Error submitting zone verification for ${slug}:`, error);
      throw error;
    }
  }

  /**
   * Get user's verification status for a zone
   */
  async getZoneVerificationStatus(slug: string): Promise<ApiResponse<{
    hasVerification: boolean;
    status: 'pending' | 'approved' | 'rejected' | null;
    submittedAt?: string;
    reviewedAt?: string;
    rejectionReason?: string;
    expiresAt?: string;
  }>> {
    try {
      const response = await apiClient.get<any>(`/zones/${slug}/status`);
      return response;
    } catch (error) {
      devLog.error(`[OFFERS API] Error getting zone verification status for ${slug}:`, error);
      throw error;
    }
  }

  /**
   * Get all user's verifications
   */
  async getMyVerifications(): Promise<ApiResponse<any[]>> {
    try {
      const response = await apiClient.get<any[]>('/zones/my-verifications');
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error getting user verifications:', error);
      throw error;
    }
  }
  /**
   * Get aggregated offers page data (single endpoint replaces 21 parallel calls)
   */
  async getAggregatedPageData(params?: {
    lat?: number;
    lng?: number;
    tab?: 'offers' | 'cashback' | 'exclusive' | 'all';
  }): Promise<ApiResponse<any>> {
    try {
      devLog.log('[OFFERS API] Fetching aggregated page data');
      const response = await apiClient.get<any>('/offers/page-data-v2', params);
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching aggregated page data:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
const realOffersApi = new RealOffersApi();
export default realOffersApi;