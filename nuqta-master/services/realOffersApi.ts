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

// Additional types for API responses
export interface Redemption {
  _id: string;
  offer: {
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
  redemptionCode: string;
  status: 'pending' | 'used' | 'expired' | 'cancelled';
  redemptionType: 'online' | 'instore';
  verificationCode?: string;
  cashbackAmount?: number;
  orderAmount?: number;
  orderId?: string;
  usedDate?: string;
  createdAt: string;
  expiryDate: string;
}

export interface Hotspot {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  offerCount: number;
  category?: string;
}

export interface BankOffer {
  _id: string;
  title: string;
  description?: string;
  bankName: string;
  cardType: 'credit' | 'debit' | 'wallet' | 'upi' | 'bnpl';
  discountType: 'percentage' | 'fixed' | 'cashback';
  discountValue: number;
  maxDiscount?: number;
  minOrderValue?: number;
  promoCode?: string;
  validUntil: string;
  isActive: boolean;
  terms?: string[];
}

export interface FlashSale {
  _id: string;
  title: string;
  description?: string;
  image: string;
  originalPrice: number;
  flashSalePrice: number;
  discountPercentage: number;
  stock: number;
  sold: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  store?: {
    id: string;
    name: string;
    logo?: string;
  };
}

export interface DiscountBucket {
  id: string;
  label: string;
  icon: string;
  count: number;
  filterValue: string;
  backgroundColor?: string;
  textColor?: string;
  iconColor?: string;
}

export interface StoreDealsResponse {
  deals: Offer[];
  totalCount: number;
  storeInfo: {
    id: string;
    name?: string;
    logo?: string;
    rating?: number;
  };
  pagination?: {
    page: number;
    pageSize: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface CoinDrop {
  _id: string;
  title: string;
  description?: string;
  coins: number;
  minOrderValue?: number;
  expiresAt: string;
  isActive: boolean;
}

export interface UploadBillStore {
  _id: string;
  name: string;
  logo?: string;
  category: string;
  cashbackPercentage: number;
  minBillAmount?: number;
  maxCashback?: number;
}

export interface SuperCashbackStore {
  _id: string;
  name: string;
  logo?: string;
  cashbackPercentage: number;
  category: string;
  isVerified?: boolean;
}

export interface LoyaltyMilestone {
  _id: string;
  level: string;
  title: string;
  description: string;
  minPoints: number;
  maxPoints?: number;
  benefits: string[];
  icon?: string;
  isActive: boolean;
}

export interface LoyaltyProgress {
  _id: string;
  currentLevel: string;
  nextLevel?: string;
  points: number;
  pointsToNextLevel: number;
  milestones: {
    milestoneId: string;
    isCompleted: boolean;
    completedAt?: string;
  }[];
}

export interface FlashSalePurchase {
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
}

export interface ZoneVerification {
  _id: string;
  zoneSlug: string;
  status: 'pending' | 'approved' | 'rejected';
  documentType?: string;
  submittedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
  expiresAt?: string;
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
  }): Promise<ApiResponse<PaginatedResponse<Redemption>>> {
    try {
      const response = await apiClient.get<PaginatedResponse<Redemption>>('/offers/user/redemptions', params);
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching user redemptions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user redemptions',
        data: {
          items: [],
          totalCount: 0,
          page: params?.page || 1,
          pageSize: params?.limit || 20,
          hasNext: false,
          hasPrevious: false
        }
      };
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
      const response = await apiClient.post<{
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
      }>('/offers/redemptions/validate', { code });
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error validating redemption code:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate redemption code',
        data: { valid: false }
      };
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
      const response = await apiClient.post<{
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
      }>(`/offers/redemptions/${redemptionId}/use`, params);
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error marking redemption as used:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark redemption as used',
        data: {
          success: false,
          redemption: {
            _id: redemptionId,
            status: 'error',
            usedDate: '',
            usedAmount: 0
          },
          cashback: {
            amount: 0,
            percentage: 0,
            orderAmount: params.orderAmount
          }
        }
      };
    }
  }

  /**
   * Get single redemption details
   */
  async getRedemptionById(redemptionId: string): Promise<ApiResponse<Redemption>> {
    try {
      const response = await apiClient.get<Redemption>(`/offers/redemptions/${redemptionId}`);
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching redemption:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch redemption',
        data: {
          _id: redemptionId,
          offer: {
            _id: '',
            title: '',
            cashbackPercentage: 0,
            type: '',
            restrictions: {
              minOrderValue: 0,
              maxDiscountAmount: null
            }
          },
          redemptionCode: '',
          status: 'pending',
          redemptionType: 'online',
          createdAt: '',
          expiryDate: ''
        }
      };
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
  }): Promise<ApiResponse<StoreDealsResponse>> {
    try {
      const queryParams: Record<string, unknown> = {
        page: params?.page || 1,
        limit: params?.limit || 20,
      };

      // Map active filter (only if explicitly set, default to true for active offers)
      if (params?.active !== undefined) {
        queryParams.active = params.active;
      } else {
        queryParams.active = true; // Default to active offers
      }

      // Use the store-specific endpoint which accepts active parameter
      const response = await apiClient.get<PaginatedResponse<Offer>>(`/offers/store/${storeId}`, queryParams);

      if (response.success && response.data) {
        // Backend returns: { success: true, data: [offers array], meta: { pagination: {...} } }
        const offers = Array.isArray(response.data) ? response.data : [];

        // Try to get pagination from response if available
        const pagination = (response as Record<string, unknown>).meta?.pagination || (response as Record<string, unknown>).pagination || {};

        return {
          ...response,
          data: {
            deals: offers,
            totalCount: pagination.total || offers.length,
            storeInfo: {
              id: storeId,
            },
            pagination: {
              page: params?.page || 1,
              pageSize: params?.limit || 20,
              hasNext: Boolean((pagination as Record<string, boolean>).hasNext),
              hasPrevious: Boolean((pagination as Record<string, boolean>).hasPrevious)
            }
          }
        };
      }

      // Return error response if API did not succeed
      return {
        success: false,
        error: response.error || 'Failed to fetch store offers',
        data: {
          deals: [],
          totalCount: 0,
          storeInfo: {
            id: storeId,
          }
        }
      };
    } catch (error) {
      devLog.error(`[OFFERS API] Error fetching store offers for ${storeId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch store offers',
        data: {
          deals: [],
          totalCount: 0,
          storeInfo: {
            id: storeId,
          }
        }
      };
    }
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
  }): Promise<ApiResponse<Hotspot[]>> {
    try {
      const response = await apiClient.get<Hotspot[]>('/offers/hotspots', params);
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching hotspots:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch hotspots',
        data: []
      };
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
  }): Promise<ApiResponse<BankOffer[]>> {
    try {
      const response = await apiClient.get<BankOffer[]>('/offers/bank-offers', params);
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching bank offers:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch bank offers',
        data: []
      };
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
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch exclusive zones',
        data: []
      };
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
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch special profiles',
        data: []
      };
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
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch friends redeemed',
        data: []
      };
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
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch double cashback campaigns',
        data: []
      };
    }
  }

  /**
   * Get coin drop events
   */
  async getCoinDrops(params?: {
    category?: string;
    limit?: number;
  }): Promise<ApiResponse<CoinDrop[]>> {
    try {
      const response = await apiClient.get<CoinDrop[]>('/cashback/coin-drops', params);
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching coin drops:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch coin drops',
        data: []
      };
    }
  }

  /**
   * Get upload bill stores
   */
  async getUploadBillStores(params?: {
    category?: string;
    limit?: number;
  }): Promise<ApiResponse<UploadBillStore[]>> {
    try {
      const response = await apiClient.get<UploadBillStore[]>('/cashback/upload-bill-stores', params);
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching upload bill stores:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch upload bill stores',
        data: []
      };
    }
  }

  /**
   * Get super cashback stores (stores with 10%+ cashback)
   */
  async getSuperCashbackStores(params?: {
    minCashback?: number;
    limit?: number;
  }): Promise<ApiResponse<SuperCashbackStore[]>> {
    try {
      const response = await apiClient.get<SuperCashbackStore[]>('/cashback/super-cashback-stores', params);
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching super cashback stores:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch super cashback stores',
        data: []
      };
    }
  }

  /**
   * Get loyalty milestones
   */
  async getLoyaltyMilestones(): Promise<ApiResponse<LoyaltyMilestone[]>> {
    try {
      const response = await apiClient.get<LoyaltyMilestone[]>('/loyalty/milestones');
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching loyalty milestones:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch loyalty milestones',
        data: []
      };
    }
  }

  /**
   * Get user's loyalty progress
   */
  async getLoyaltyProgress(): Promise<ApiResponse<LoyaltyProgress[]>> {
    try {
      const response = await apiClient.get<LoyaltyProgress[]>('/loyalty/progress');
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching loyalty progress:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch loyalty progress',
        data: []
      };
    }
  }

  /**
   * Get discount buckets (real-time aggregation counts)
   * Returns counts for 25% OFF, 50% OFF, 80% OFF, and Free Delivery
   */
  async getDiscountBuckets(): Promise<ApiResponse<DiscountBucket[]>> {
    try {
      devLog.log('📊 [OFFERS API] Fetching discount buckets');
      const response = await apiClient.get<DiscountBucket[]>('/offers/discount-buckets');

      if (response.success && response.data) {
        // Add default colors if not provided by backend
        const bucketsWithColors = (Array.isArray(response.data) ? response.data : []).map((bucket) => ({
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

      return {
        success: false,
        error: response.error || 'Failed to fetch discount buckets',
        data: []
      };
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching discount buckets:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch discount buckets',
        data: []
      };
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
  async getFlashSales(limit?: number): Promise<ApiResponse<FlashSale[]>> {
    try {
      devLog.log('⚡ [OFFERS API] Fetching flash sales (lightning deals)');
      const response = await apiClient.get<FlashSale[]>('/flash-sales/active', { limit });

      if (response.success && response.data) {
        const flashSales = Array.isArray(response.data) ? response.data : [];

        devLog.log(`✅ [OFFERS API] Got ${flashSales.length} flash sales`);
        return {
          ...response,
          data: flashSales,
        };
      }

      return {
        success: false,
        error: response.error || 'Failed to fetch flash sales',
        data: []
      };
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching flash sales:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch flash sales',
        data: []
      };
    }
  }

  /**
   * Get flash sale by ID
   * Fetches a single flash sale with full details
   */
  async getFlashSaleById(flashSaleId: string): Promise<ApiResponse<FlashSale>> {
    try {
      devLog.log('⚡ [OFFERS API] Fetching flash sale by ID:', flashSaleId);
      const response = await apiClient.get<FlashSale>(`/flash-sales/${flashSaleId}`);

      if (response.success && response.data) {
        devLog.log('✅ [OFFERS API] Got flash sale:', response.data.title);
        return response;
      }

      return {
        success: false,
        error: response.error || 'Failed to fetch flash sale',
        data: {} as FlashSale
      };
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching flash sale by ID:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch flash sale',
        data: {} as FlashSale
      };
    }
  }

  /**
   * Get new arrival offers (New Today)
   * Offers marked as new and recently added
   */
  async getNewArrivals(limit: number = 10): Promise<ApiResponse<Offer[]>> {
    try {
      devLog.log('🆕 [OFFERS API] Fetching new arrivals');
      const response = await apiClient.get<Offer[]>('/offers/new-arrivals', { limit });

      if (response.success && response.data) {
        const offers = Array.isArray(response.data) ? response.data : [];

        devLog.log(`✅ [OFFERS API] Got ${offers.length} new arrivals`);
        return {
          ...response,
          data: offers,
        };
      }

      return {
        success: false,
        error: response.error || 'Failed to fetch new arrivals',
        data: []
      };
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching new arrivals:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch new arrivals',
        data: []
      };
    }
  }

  /**
   * Get AI recommended offers for user
   * Personalized recommendations based on user behavior
   */
  async getRecommendedOffers(limit: number = 10): Promise<ApiResponse<Offer[]>> {
    try {
      devLog.log('🤖 [OFFERS API] Fetching AI recommended offers');
      const response = await apiClient.get<Offer[]>('/offers/user/recommendations', { limit });

      if (response.success && response.data) {
        const offers = Array.isArray(response.data) ? response.data : [];

        devLog.log(`✅ [OFFERS API] Got ${offers.length} recommended offers`);
        return {
          ...response,
          data: offers,
        };
      }

      return {
        success: false,
        error: response.error || 'Failed to fetch recommended offers',
        data: []
      };
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching recommended offers:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch recommended offers',
        data: []
      };
    }
  }

  /**
   * Get expiring soon offers (Last Chance)
   * Offers that are about to expire within 24 hours
   */
  async getExpiringSoonOffers(limit: number = 10): Promise<ApiResponse<FlashSale[]>> {
    try {
      devLog.log('⏰ [OFFERS API] Fetching expiring soon offers');
      const response = await apiClient.get<FlashSale[]>('/flash-sales/expiring-soon', { limit, minutes: 1440 });

      if (response.success && response.data) {
        const offers = Array.isArray(response.data) ? response.data : [];

        devLog.log(`✅ [OFFERS API] Got ${offers.length} expiring soon offers`);
        return {
          ...response,
          data: offers,
        };
      }

      return {
        success: false,
        error: response.error || 'Failed to fetch expiring offers',
        data: []
      };
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching expiring offers:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch expiring offers',
        data: []
      };
    }
  }

  /**
   * Get today's offers
   * Active flash sale offers for today
   */
  async getTodaysOffers(limit: number = 10): Promise<ApiResponse<FlashSale[]>> {
    try {
      devLog.log('📅 [OFFERS API] Fetching today\'s offers');
      const response = await apiClient.get<FlashSale[]>('/offers/flash-sales', { limit });

      if (response.success && response.data) {
        const offers = Array.isArray(response.data) ? response.data : [];

        devLog.log(`✅ [OFFERS API] Got ${offers.length} today's offers`);
        return {
          ...response,
          data: offers,
        };
      }

      return {
        success: false,
        error: response.error || 'Failed to fetch today\'s offers',
        data: []
      };
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching today\'s offers:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch today\'s offers',
        data: []
      };
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
  async getFlashSalePurchaseById(purchaseId: string): Promise<ApiResponse<FlashSalePurchase>> {
    try {
      devLog.log('🔍 [OFFERS API] Fetching flash sale purchase:', purchaseId);
      const response = await apiClient.get<FlashSalePurchase>(`/flash-sales/purchases/${purchaseId}`);
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching flash sale purchase:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch flash sale purchase',
        data: {} as FlashSalePurchase
      };
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
      const response = await apiClient.get<{
        hasVerification: boolean;
        status: 'pending' | 'approved' | 'rejected' | null;
        submittedAt?: string;
        reviewedAt?: string;
        rejectionReason?: string;
        expiresAt?: string;
      }>(`/zones/${slug}/status`);
      return response;
    } catch (error) {
      devLog.error(`[OFFERS API] Error getting zone verification status for ${slug}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get zone verification status',
        data: {
          hasVerification: false,
          status: null
        }
      };
    }
  }

  /**
   * Get all user's verifications
   */
  async getMyVerifications(): Promise<ApiResponse<ZoneVerification[]>> {
    try {
      const response = await apiClient.get<ZoneVerification[]>('/zones/my-verifications');
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error getting user verifications:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch verifications',
        data: []
      };
    }
  }
  /**
   * Get aggregated offers page data (single endpoint replaces 21 parallel calls)
   */
  async getAggregatedPageData(params?: {
    lat?: number;
    lng?: number;
    tab?: 'offers' | 'cashback' | 'exclusive' | 'all';
  }): Promise<ApiResponse<OffersPageData>> {
    try {
      devLog.log('[OFFERS API] Fetching aggregated page data');
      const response = await apiClient.get<OffersPageData>('/offers/page-data-v2', params);
      return response;
    } catch (error) {
      devLog.error('[OFFERS API] Error fetching aggregated page data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch aggregated page data',
        data: {} as OffersPageData
      };
    }
  }
}

// Create and export singleton instance
const realOffersApi = new RealOffersApi();
export default realOffersApi;