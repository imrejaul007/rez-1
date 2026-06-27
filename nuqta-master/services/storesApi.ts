// Stores API Service
// Handles store listings, details, and management

import apiClient, { ApiResponse } from './apiClient';
import { validateStore, validateStoreArray } from '@/utils/responseValidators';
import {
  Store as UnifiedStore,
  toStore,
  validateStore as validateUnifiedStore,
  isStoreOpen,
  isStoreVerified
} from '@/types/unified';

// Keep the old Store interface for backwards compatibility during migration
export interface Store {
  id: string;
  name: string;
  description: string;
  slug: string;
  logo?: string;
  banner?: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  contact: {
    email: string;
    phone: string;
    website?: string;
  };
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    coordinates?: [number, number];
  };
  category: {
    id: string;
    name: string;
    slug: string;
  };
  mainCategorySlug?: string;
  settings: {
    isActive: boolean;
    acceptsOrders: boolean;
    minOrderAmount?: number;
    deliveryRadius?: number;
    processingTime: string;
  };
  ratings: {
    average: number;
    count: number;
    breakdown: Record<number, number>;
  };
  stats: {
    totalProducts: number;
    totalSales: number;
    totalOrders: number;
    joinedDate: string;
  };
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
  policies: {
    returnPolicy?: string;
    shippingPolicy?: string;
    privacyPolicy?: string;
  };
  hours?: Array<{
    day: string;
    open: string;
    close: string;
    closed: boolean;
  }>;
  tags: string[];
  // Action buttons configuration for ProductPage
  actionButtons?: {
    enabled: boolean;
    buttons: Array<{
      id: 'call' | 'product' | 'location' | 'custom';
      enabled: boolean;
      label?: string;
      destination?: {
        type: 'phone' | 'url' | 'maps' | 'internal';
        value: string;
      };
      order?: number;
    }>;
  };
  status: 'active' | 'pending' | 'suspended' | 'inactive';
  verification: {
    isVerified: boolean;
    verifiedAt?: string;
    badges: string[];
  };
  createdAt: string;
  updatedAt: string;
}

// Export unified Store type for new code
export { UnifiedStore };

export interface StoresQuery {
  page?: number;
  limit?: number;
  category?: string;
  location?: {
    latitude: number;
    longitude: number;
    radius?: number;
  };
  search?: string;
  rating?: number;
  verified?: boolean;
  tags?: string[];
  sort?: 'name' | 'rating' | 'distance' | 'popularity' | 'newest';
  order?: 'asc' | 'desc';
  status?: Store['status'];
}

export interface StoresResponse {
  stores: Store[];
  pagination: {
    current: number;
    pages: number;
    total: number;
    limit: number;
  };
  filters: {
    categories: Array<{ id: string; name: string; count: number }>;
    locations: Array<{ city: string; state: string; count: number }>;
    tags: Array<{ name: string; count: number }>;
    ratings: Record<number, number>;
  };
}

export interface StoreAnalytics {
  overview: {
    totalViews: number;
    totalFollowers: number;
    totalProducts: number;
    totalSales: number;
    averageRating: number;
  };
  sales: {
    thisMonth: number;
    lastMonth: number;
    thisYear: number;
    lastYear: number;
    growth: {
      monthly: number;
      yearly: number;
    };
  };
  topProducts: Array<{
    id: string;
    name: string;
    sales: number;
    revenue: number;
  }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    customer: string;
    total: number;
    status: string;
    createdAt: string;
  }>;
}

export interface StoreFollow {
  storeId: string;
  store: {
    id: string;
    name: string;
    logo?: string;
    slug: string;
  };
  followedAt: string;
}

class StoresService {
  // Get stores with filtering and pagination
  async getStores(query: StoresQuery = {}): Promise<ApiResponse<StoresResponse>> {
    return apiClient.get('/stores', query);
  }

  // Get stores filtered by category slug and service type (e.g. homeDelivery, dineIn)
  async getStoresByServiceType(
    categorySlug: string,
    serviceType: string,
    page: number = 1,
    limit: number = 10
  ): Promise<ApiResponse<StoresResponse>> {
    try {
      const response = await apiClient.get<StoresResponse>('/stores', {
        category: categorySlug,
        serviceType,
        page,
        limit,
      });

      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Failed to fetch stores by service type',
        message: error?.message || 'Failed to fetch stores by service type',
      };
    }
  }

  // Get single store by ID
  async getStoreById(storeId: string): Promise<ApiResponse<Store>> {
    try {
      const response = await apiClient.get<any>(`/stores/${storeId}`);

      // Validate and normalize store data using unified types
      if (response.success && response.data) {
        // Extract store from nested structure (API returns { store: {...}, products: [...], productsCount: ... })
        const storeData = (response.data as any).store || response.data;

        if (!storeData) {
          return {
            success: false,
            error: 'Store not found',
            message: 'Store data not found in response',
          };
        }

        try {
          // Convert to unified Store format
          const unifiedStore = toStore(storeData);

          // Validate using unified validator
          const validation = validateUnifiedStore(unifiedStore);
          if (validation.valid) {
            // Preserve all original fields that might be lost in conversion
            // The toStore() function converts some fields but we need to keep the original structure
            const finalStoreData = {
              ...unifiedStore,
              // Preserve original fields that toStore() might not handle correctly
              description: storeData.description || unifiedStore.description || '',
              contact: storeData.contact || unifiedStore.contact,
              operationalInfo: storeData.operationalInfo || undefined, // Keep original operationalInfo structure
              // Preserve the raw location object with all fields (state, pincode, etc.)
              location: storeData.location || unifiedStore.location,
              // Preserve banner and logo fields explicitly
              banner: storeData.banner || (unifiedStore as any).banner || '',
              logo: storeData.logo || (unifiedStore as any).logo || '',
              image: storeData.image || storeData.banner || (unifiedStore as any).image || (unifiedStore as any).banner || '',
              // Also preserve any other fields that might be useful
              tags: storeData.tags || unifiedStore.tags || [],
              deliveryCategories: storeData.deliveryCategories,
              offers: storeData.offers,
              createdAt: storeData.createdAt,
              updatedAt: storeData.updatedAt,
            };

            return {
              ...response,
              data: finalStoreData as any, // Cast to Store for backwards compatibility
            };
          } else {
            // Return raw data with preserved fields if validation fails but data exists
            const fallbackData = {
              ...storeData,
              // Ensure we have at least the basic structure
              description: storeData.description || '',
              contact: storeData.contact || undefined,
              operationalInfo: storeData.operationalInfo || undefined,
            };
            return {
              ...response,
              data: fallbackData as any,
            };
          }
        } catch (conversionError: any) {
          // Fallback to old validation or return raw data
          const validatedStore = validateStore(storeData);
          if (validatedStore) {
            return {
              ...response,
              data: validatedStore as Store,
            };
          } else {
            // Return raw data as fallback
            return {
              ...response,
              data: storeData as any,
            };
          }
        }
      }

      return {
        success: false,
        error: 'Store not found',
        message: 'No store data in response',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Failed to fetch store',
        message: error?.message || 'Failed to fetch store',
      };
    }
  }

  // Get store by slug
  async getStoreBySlug(slug: string): Promise<ApiResponse<Store>> {
    try {
      const response = await apiClient.get<Store>(`/stores/slug/${slug}`);

      // Validate and normalize store data
      if (response.success && response.data) {
        const validatedStore = validateStore(response.data);
        if (validatedStore) {
          return {
            ...response,
            data: validatedStore as Store,
          };
        } else {
          return {
            success: false,
            error: 'Store validation failed',
            message: 'Invalid store data received from server',
          };
        }
      }

      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Failed to fetch store',
        message: error?.message || 'Failed to fetch store',
      };
    }
  }

  // Get stores by subcategory slug
  async getStoresBySubcategorySlug(subcategorySlug: string, limit: number = 10, page: number = 1): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get<any>(`/stores/by-category-slug/${subcategorySlug}`, { limit, page });

      if (response.success && response.data) {
        return {
          ...response,
          data: response.data.stores || [],
        };
      }

      return {
        success: false,
        error: 'No stores found',
        message: `No stores found for subcategory: ${subcategorySlug}`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Failed to fetch stores',
        message: error?.message || 'Failed to fetch stores',
      };
    }
  }

  // Get featured stores
  async getFeaturedStores(limit: number = 10): Promise<ApiResponse<Store[]>> {
    try {
      const response = await apiClient.get<Store[]>('/stores/featured', { limit });

      // Validate and normalize store array
      if (response.success && response.data && Array.isArray(response.data)) {
        const validatedStores = validateStoreArray(response.data);
        return {
          ...response,
          data: validatedStores as Store[],
        };
      }

      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Failed to fetch featured stores',
        message: error?.message || 'Failed to fetch featured stores',
      };
    }
  }

  // Get stores near location
  async getNearbyStores(
    latitude: number,
    longitude: number,
    radius: number = 10,
    limit: number = 20
  ): Promise<ApiResponse<Store[]>> {
    return apiClient.get('/stores/nearby', {
      latitude,
      longitude,
      radius,
      limit
    });
  }

  // Get nearby stores for homepage - optimized endpoint with computed fields
  async getNearbyStoresForHomepage(
    latitude: number,
    longitude: number,
    radius: number = 2,
    limit: number = 5
  ): Promise<ApiResponse<{
    stores: Array<{
      id: string;
      name: string;
      distance: string;
      isLive: boolean;
      status: string;
      waitTime: string;
      cashback: string;
      closingSoon?: boolean;
    }>;
  }>> {
    try {

      const response = await apiClient.get<{
        stores: Array<{
          id: string;
          name: string;
          distance: string;
          isLive: boolean;
          status: string;
          waitTime: string;
          cashback: string;
          closingSoon?: boolean;
        }>;
      }>('/stores/nearby-homepage', {
        latitude,
        longitude,
        radius,
        limit
      });

      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Failed to fetch nearby stores',
        message: error?.message || 'Failed to fetch nearby stores',
      };
    }
  }

  // Search stores
  async searchStores(
    query: string,
    filters?: Omit<StoresQuery, 'search'>
  ): Promise<ApiResponse<StoresResponse>> {
    return apiClient.get('/stores/search', {
      search: query,
      ...filters
    });
  }

  // Get cuisine counts for Browse by Cuisine section
  async getCuisineCounts(): Promise<ApiResponse<{ cuisines: any[]; total: number }>> {
    return apiClient.get('/stores/cuisine-counts');
  }

  // Get top cashback stores
  async getTopCashbackStores(params?: any): Promise<ApiResponse<any>> {
    return apiClient.get('/stores/top-cashback', params);
  }

  // Get BNPL stores
  async getBNPLStores(params?: any): Promise<ApiResponse<any>> {
    return apiClient.get('/stores/bnpl', params);
  }

  // Get store categories
  async getStoreCategories(): Promise<ApiResponse<Array<{
    id: string;
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    storeCount: number;
  }>>> {
    return apiClient.get('/stores/categories');
  }

  // Follow/unfollow a store (toggle)
  async followStore(storeId: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post(`/favorites/store/${storeId}/toggle`);
  }

  // Unfollow a store (same toggle endpoint)
  async unfollowStore(storeId: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post(`/favorites/store/${storeId}/toggle`);
  }

  // Get user's followed/favorited stores
  async getFollowedStores(
    page: number = 1,
    limit: number = 20
  ): Promise<ApiResponse<{
    stores: StoreFollow[];
    pagination: {
      current: number;
      pages: number;
      total: number;
      limit: number;
    };
  }>> {
    return apiClient.get('/favorites/user/my-favorites', { type: 'store', page, limit });
  }

  // Check if user follows a store
  async checkFollowStatus(storeId: string): Promise<ApiResponse<{
    following: boolean;
    followedAt?: string;
  }>> {
    return apiClient.get(`/favorites/store/${storeId}/status`);
  }

  // Get store products
  async getStoreProducts(
    storeId: string,
    query: {
      page?: number;
      limit?: number;
      category?: string;
      search?: string;
      sort?: string;
    } = {}
  ): Promise<ApiResponse<{
    products: Array<{
      id: string;
      name: string;
      description: string;
      images: Array<{ url: string; alt: string }>;
      pricing: { basePrice: number; salePrice?: number };
      ratings: { average: number; count: number };
    }>;
    pagination: {
      current: number;
      pages: number;
      total: number;
      limit: number;
    };
  }>> {
    return apiClient.get(`/stores/${storeId}/products`, query);
  }

  // Get store reviews
  async getStoreReviews(
    storeId: string,
    query: {
      page?: number;
      limit?: number;
      rating?: number;
      sort?: 'newest' | 'oldest' | 'rating_high' | 'rating_low';
    } = {}
  ): Promise<ApiResponse<{
    reviews: Array<{
      id: string;
      user: {
        id: string;
        name: string;
        avatar?: string;
      };
      rating: number;
      title: string;
      comment: string;
      helpful: number;
      createdAt: string;
    }>;
    pagination: {
      current: number;
      pages: number;
      total: number;
      limit: number;
    };
    summary: {
      averageRating: number;
      totalReviews: number;
      ratingBreakdown: Record<number, number>;
    };
  }>> {
    return apiClient.get(`/stores/${storeId}/reviews`, query);
  }

  // Add store review
  async addStoreReview(
    storeId: string,
    review: {
      rating: number;
      title: string;
      comment: string;
    }
  ): Promise<ApiResponse<{
    id: string;
    message: string;
  }>> {
    return apiClient.post(`/stores/${storeId}/reviews`, review);
  }

  // Get store analytics (store owner only)
  async getStoreAnalytics(
    storeId: string,
    dateRange?: {
      from: string;
      to: string;
    }
  ): Promise<ApiResponse<StoreAnalytics>> {
    return apiClient.get(`/stores/${storeId}/analytics`, dateRange);
  }

  // Update store information (store owner only)
  async updateStore(
    storeId: string,
    updates: Partial<{
      name: string;
      description: string;
      contact: Store['contact'];
      address: Store['address'];
      settings: Store['settings'];
      hours: Store['hours'];
      policies: Store['policies'];
      socialMedia: Store['socialMedia'];
    }>
  ): Promise<ApiResponse<Store>> {
    return apiClient.patch(`/stores/${storeId}`, updates);
  }

  // Upload store logo
  async uploadStoreLogo(
    storeId: string,
    logoFile: File
  ): Promise<ApiResponse<{ logoUrl: string }>> {
    const formData = new FormData();
    formData.append('logo', logoFile);
    return apiClient.uploadFile(`/stores/${storeId}/logo`, formData);
  }

  // Upload store banner
  async uploadStoreBanner(
    storeId: string,
    bannerFile: File
  ): Promise<ApiResponse<{ bannerUrl: string }>> {
    const formData = new FormData();
    formData.append('banner', bannerFile);
    return apiClient.uploadFile(`/stores/${storeId}/banner`, formData);
  }

  // Get store performance metrics
  async getStoreMetrics(
    storeId: string,
    period: 'day' | 'week' | 'month' | 'year' = 'month'
  ): Promise<ApiResponse<{
    views: number;
    followers: number;
    orders: number;
    revenue: number;
    conversion: number;
    growth: {
      views: number;
      followers: number;
      orders: number;
      revenue: number;
    };
  }>> {
    return apiClient.get(`/stores/${storeId}/metrics`, { period });
  }

  // Get store followers list
  async getFollowers(
    storeId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<ApiResponse<{
    followers: Array<{
      id: string;
      name: string;
      avatar?: string;
      followedAt: string;
    }>;
    pagination: {
      current: number;
      pages: number;
      total: number;
      limit: number;
    };
  }>> {
    return apiClient.get(`/stores/${storeId}/followers`, { page, limit });
  }

  // Get follower count for a store
  async getFollowerCount(storeId: string): Promise<ApiResponse<{ count: number }>> {
    return apiClient.get(`/stores/${storeId}/followers/count`);
  }

  // Get user's store visits history
  async getUserVisitHistory(
    page: number = 1,
    limit: number = 20,
    status?: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  ): Promise<ApiResponse<{
    visits: Array<{
      id: string;
      store: {
        id: string;
        name: string;
        logo?: string;
        address: any;
      };
      visitDate: string;
      visitType: string;
      status: string;
      queueNumber?: string;
      isQueue: boolean;
    }>;
    pagination: {
      total: number;
      page: number;
      pages: number;
      limit: number;
    };
  }>> {
    return apiClient.get('/store-visits/user', { page, limit, status });
  }

  // ===== FRONTEND HOMEPAGE INTEGRATION METHODS =====

  /**
   * Get featured stores for homepage sections - Returns formatted StoreItems
   */
  async getFeaturedForHomepage(limit: number = 10): Promise<any[]> {
    try {
      const response = await apiClient.get('/stores/featured', { limit });

      // Handle both response formats:
      // 1. { success: true, data: [...] } - direct array
      // 2. { success: true, data: { stores: [...] } } - nested stores array
      const storesData = Array.isArray(response.data)
        ? response.data
        : (response.data?.stores || []);

      if (response.success && storesData.length > 0) {

        // Validate and normalize stores first
        const validatedStores = validateStoreArray(storesData);

        // Transform backend store data to frontend StoreItem format
        const stores = validatedStores.map((store: any) => {
          // Handle banner field - can be array or string
          let imageField: string | string[] = '';
          const bannerData = store.banner;

          if (bannerData) {
            // If banner is an array, use the first image for the image field
            // but also preserve the banner array for the StoreCard component
            if (Array.isArray(bannerData) && bannerData.length > 0) {
              imageField = bannerData[0]; // First banner for image field
            } else if (typeof bannerData === 'string') {
              imageField = bannerData;
            }
          } else if (store.image) {
            imageField = store.image;
          }

          return {
            ...store,
            // Ensure ID is set (handle both _id and id)
            id: store.id || store._id,
            // Map banner to image field for HomepageSectionItem interface
            image: imageField,
            // CRITICAL: Explicitly preserve banner array for StoreCard component
            // Don't overwrite if it's already an array
            banner: bannerData || (Array.isArray(store.image) ? store.image : (store.image || '')),
            // Add any additional transformations needed for homepage display
            isTrending: true, // Featured stores are considered trending
          };
        });

        return stores;
      }

      // Throw error to trigger fallback mechanism
      throw new Error(response.error || response.message || 'Failed to fetch featured stores - API returned no data');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if backend API is available
   */
  async isBackendAvailable(): Promise<boolean> {
    try {
      // Use 10s timeout for health checks (Render cold starts can take 10-15s)
      const response = await apiClient.get('/stores/featured', { limit: 1 }, { timeout: 10000 });
      return response.success === true;
    } catch (error) {
      return false;
    }
  }

  // ===== HELPER METHODS =====

  /**
   * Determine category based on delivery categories
   */
  /**
   * Get user's visit count and loyalty info for a specific store
   */
  async getUserStoreVisits(storeId: string): Promise<ApiResponse<{
    storeId: string;
    storeName: string;
    visitsCompleted: number;
    totalVisitsRequired: number;
    nextReward: string;
    visitsRemaining: number;
    progress: number;
    hasCompletedMilestone: boolean;
    loyaltyConfig: any[];
  }>> {
    try {

      const response = await apiClient.get<{
        storeId: string;
        storeName: string;
        visitsCompleted: number;
        totalVisitsRequired: number;
        nextReward: string;
        visitsRemaining: number;
        progress: number;
        hasCompletedMilestone: boolean;
        loyaltyConfig: any[];
      }>(`/stores/${storeId}/user-visits`);

      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch user visits',
        data: {
          storeId,
          storeName: '',
          visitsCompleted: 0,
          totalVisitsRequired: 5,
          nextReward: 'Free Coffee',
          visitsRemaining: 5,
          progress: 0,
          hasCompletedMilestone: false,
          loyaltyConfig: []
        }
      };
    }
  }

  /**
   * Get recent earnings by users at a specific store
   * Shows "People are earning here" section data
   */
  async getRecentEarnings(storeId: string): Promise<ApiResponse<Array<{
    id: string;
    name: string;
    avatar?: string;
    amountEarned: number;
    coinsEarned: number;
    timeAgo: string;
  }>>> {
    try {

      const response = await apiClient.get<Array<{
        id: string;
        name: string;
        avatar?: string;
        amountEarned: number;
        coinsEarned: number;
        timeAgo: string;
      }>>(`/stores/${storeId}/recent-earnings`);

      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch recent earnings',
        data: []
      };
    }
  }

  /**
   * Get trending stores for homepage "Trending Near You" section
   * Fetches stores sorted by trending score (orders, views, revenue, rating)
   */
  async getTrendingStores(params?: {
    category?: string;
    limit?: number;
    page?: number;
    days?: number;
  }): Promise<ApiResponse<{
    stores: any[];
    pagination: { total: number; page: number; limit: number; pages: number };
  }>> {
    try {

      const response = await apiClient.get<{
        stores: any[];
        pagination: { total: number; page: number; limit: number; pages: number };
      }>('/stores/trending', {
        limit: params?.limit || 4,
        page: params?.page || 1,
        days: params?.days || 7,
        ...(params?.category && { category: params.category }),
      });

      if (response.success && response.data) {
        return response;
      }

      return {
        success: false,
        error: 'No trending stores found',
        message: 'Failed to fetch trending stores',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Failed to fetch trending stores',
        message: error?.message || 'Failed to fetch trending stores',
      };
    }
  }

  /**
   * Get new stores for homepage NewOnRezSection
   */
  async getNewStores(params?: {
    limit?: number;
    days?: number;
    latitude?: number;
    longitude?: number;
  }): Promise<ApiResponse<{
    stores: Array<{
      id: string;
      name: string;
      slug: string;
      category: string;
      image: string;
      people: number;
      cashback: string;
      rating: number;
      distance?: number;
      isNew: boolean;
    }>;
    total: number;
    featuredStore: any;
    smallStores: any[];
    horizontalStore: any;
  }>> {
    try {

      const response = await apiClient.get<{
        stores: Array<{
          id: string;
          name: string;
          slug: string;
          category: string;
          image: string;
          people: number;
          cashback: string;
          rating: number;
          distance?: number;
          isNew: boolean;
        }>;
        total: number;
        featuredStore: any;
        smallStores: any[];
        horizontalStore: any;
      }>('/stores/new', {
        limit: params?.limit || 4,
        days: params?.days || 30,
        ...(params?.latitude && { latitude: params.latitude }),
        ...(params?.longitude && { longitude: params.longitude }),
      });

      if (response.success && response.data) {
        return response;
      }

      return {
        success: false,
        error: 'No new stores found',
        message: 'Failed to fetch new stores',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Failed to fetch new stores',
        message: error?.message || 'Failed to fetch new stores',
      };
    }
  }

  private determineCategory(deliveryCategories: any): string {
    if (deliveryCategories?.premium) return 'Premium';
    if (deliveryCategories?.organic) return 'Organic';
    if (deliveryCategories?.fastDelivery) return 'Fast Food';
    if (deliveryCategories?.budgetFriendly) return 'Budget';
    if (deliveryCategories?.alliance) return 'Alliance';
    return 'General';
  }

  /**
   * Calculate display distance using Haversine formula
   * Returns formatted distance string (e.g., "2.3 km") or empty string if coordinates missing
   */
  calculateDistance(
    userLat: number,
    userLng: number,
    storeLat?: number,
    storeLng?: number
  ): string {
    if (!storeLat || !storeLng || !userLat || !userLng) return '';
    const R = 6371; // Earth's radius in km
    const dLat = ((storeLat - userLat) * Math.PI) / 180;
    const dLng = ((storeLng - userLng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((userLat * Math.PI) / 180) *
        Math.cos((storeLat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    if (distance < 1) return `${Math.round(distance * 1000)} m`;
    return `${distance.toFixed(1)} km`;
  }
}

// Create singleton instance
const storesService = new StoresService();

// Named export for compatibility
export { storesService as storesApi };

export default storesService;
