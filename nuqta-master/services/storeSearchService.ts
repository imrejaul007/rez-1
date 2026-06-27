import { UserLocation } from '@/types/location.types';
import apiClient from './apiClient';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';

export interface StoreProduct {
  _id: string;
  name: string;
  title?: string;
  image?: string;
  price?: {
    current: number;
    original: number;
    currency: string;
    discount: number;
  };
  rating?: {
    value: number | string;
    count: number;
  };
  inventory?: {
    stock: number;
    isAvailable: boolean;
  };
  tags?: string[];
}

export interface Store {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  banner?: string;
  location: {
    address: string;
    city: string;
    state: string;
    pincode: string;
    coordinates: [number, number];
    deliveryRadius: number;
  };
  ratings: {
    average: number;
    count: number;
    distribution?: { [key: string]: number };
  };
  operationalInfo: {
    deliveryTime?: string;
    minimumOrder?: number;
    deliveryFee?: number;
    freeDeliveryAbove?: number;
    acceptsWalletPayment: boolean;
    paymentMethods: string[];
  };
  deliveryCategories: {
    fastDelivery: boolean;
    budgetFriendly: boolean;
    premium: boolean;
    organic: boolean;
    alliance: boolean;
    lowestPrice: boolean;
    mall: boolean;
    cashStore: boolean;
  };
  paymentSettings?: {
    acceptRezCoins?: boolean;
    acceptPromoCoins?: boolean;
    maxCoinRedemptionPercent?: number;
  };
  rewardRules?: {
    baseCashbackPercent?: number;
  };
  products?: StoreProduct[];
  distance?: number;
  isActive: boolean;
  isFeatured: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StoreSearchParams {
  category: string;
  location?: string; // "lng,lat" format
  radius?: number;
  page?: number;
  limit?: number;
  sortBy?: 'rating' | 'distance' | 'name' | 'newest';
  nuqtaPay?: boolean;
}

export interface StoreSearchResponse {
  success: boolean;
  data: {
    stores: Store[];
    category: string;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
  message: string;
}

export interface StoreCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  count: number;
  badgeText?: string;
  imageUrl?: string;
}

export interface StoreCategoriesResponse {
  success: boolean;
  data: {
    categories: StoreCategory[];
  };
  message: string;
}

export interface Review {
  _id: string;
  store: string;
  user: {
    _id: string;
    profile: {
      name: string;
      avatar?: string;
    };
  };
  rating: number;
  title?: string;
  comment: string;
  images?: string[];
  helpful: number;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewStats {
  average: number;
  count: number;
  distribution: { [key: string]: number };
}

export interface ReviewsResponse {
  success: boolean;
  data: {
    reviews: Review[];
    ratingStats: ReviewStats;
    pagination: {
      currentPage: number;
      totalPages: number;
      totalReviews: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  };
  message: string;
}

export interface Favorite {
  _id: string;
  user: string;
  store: Store;
  createdAt: string;
  updatedAt: string;
}

export interface FavoritesResponse {
  success: boolean;
  data: {
    favorites: Favorite[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalFavorites: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  };
  message: string;
}

export interface StoreComparison {
  _id: string;
  user: string;
  stores: Store[];
  name?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ComparisonResponse {
  success: boolean;
  data: {
    comparison: StoreComparison;
  };
  message: string;
}

export interface ComparisonsResponse {
  success: boolean;
  data: {
    comparisons: StoreComparison[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalComparisons: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  };
  message: string;
}

/** Helper: build query string from params object, skipping undefined/null values */
function buildQueryString(params: Record<string, string | number | boolean | undefined | null>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      qs.append(key, String(value));
    }
  }
  return qs.toString();
}

/** Empty search response factory for 404/error fallbacks */
function emptySearchResponse(category: string, page: number, limit: number): StoreSearchResponse {
  return {
    success: true,
    data: {
      stores: [],
      category,
      pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
    },
    message: 'No stores found for this category',
  };
}

class StoreSearchService {
  /**
   * Check if a string is a MongoDB ObjectId (24 hex characters)
   */
  private isMongoObjectId(str: string): boolean {
    return /^[a-fA-F0-9]{24}$/.test(str);
  }

  /**
   * Check if a string is a delivery category (fastDelivery, budgetFriendly, etc.)
   */
  private isDeliveryCategory(str: string): boolean {
    const deliveryCategories = [
      'all', 'fastDelivery', 'budgetFriendly', 'oneRupeeStore',
      'ninetyNineStore', 'premium', 'organic', 'alliance',
      'lowestPrice', 'mall', 'cashStore'
    ];
    return deliveryCategories.includes(str);
  }

  /**
   * Search stores by delivery category type (e.g., 'fastDelivery', 'premium', etc.)
   * OR by category slug (e.g., 'food-dining', 'fashion', etc.)
   */
  async searchStoresByCategory(params: StoreSearchParams): Promise<StoreSearchResponse> {
    const {
      category,
      location,
      radius = 10,
      page = 1,
      limit = 20,
      sortBy = 'rating',
      nuqtaPay
    } = params;

    // If category is a MongoDB ObjectId, use the category endpoint
    if (this.isMongoObjectId(category)) {
      return this.getStoresByCategoryId({ categoryId: category, page, limit, sortBy });
    }

    // If category is a delivery category type (fastDelivery, premium, etc.), use search-by-category
    if (this.isDeliveryCategory(category)) {
      const qs = buildQueryString({
        page, limit, sortBy,
        ...(location && { location, radius }),
        ...(nuqtaPay && { nuqtaPay: 'true' }),
      });

      const response = await apiClient.get<StoreSearchResponse>(`/stores/search-by-category/${category}?${qs}`);

      if (!response.success) {
        // Return empty results for 404-like errors (category not found)
        return emptySearchResponse(category, page, limit);
      }

      return { success: true, data: response.data, message: response.message || '' } as StoreSearchResponse;
    }

    // Otherwise, treat it as a category slug (food-dining, fashion, etc.)
    return this.getStoresByCategorySlug({ slug: category, page, limit, sortBy });
  }

  /**
   * Get stores by category ObjectId (for actual product categories from database)
   */
  async getStoresByCategoryId(params: {
    categoryId: string;
    page?: number;
    limit?: number;
    sortBy?: 'rating' | 'name' | 'newest';
  }): Promise<StoreSearchResponse> {
    const { categoryId, page = 1, limit = 20, sortBy = 'rating' } = params;
    const qs = buildQueryString({ page, limit, sortBy });

    const response = await apiClient.get<StoreSearchResponse>(`/stores/category/${categoryId}?${qs}`);

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch stores by category');
    }

    return { success: true, data: response.data, message: response.message || '' } as StoreSearchResponse;
  }

  /**
   * Get stores by category slug (for frontend category pages like food-dining, fashion, etc.)
   */
  async getStoresByCategorySlug(params: {
    slug: string;
    page?: number;
    limit?: number;
    sortBy?: 'rating' | 'distance' | 'name' | 'newest';
  }): Promise<StoreSearchResponse> {
    const { slug, page = 1, limit = 20, sortBy = 'rating' } = params;
    const qs = buildQueryString({ page, limit, sortBy });

    const response = await apiClient.get<StoreSearchResponse>(`/stores/by-category-slug/${slug}?${qs}`);

    if (!response.success) {
      // Return empty results for 404-like errors (slug not found)
      return emptySearchResponse(slug, page, limit);
    }

    return { success: true, data: response.data, message: response.message || '' } as StoreSearchResponse;
  }

  /**
   * Search stores by delivery time range
   */
  async searchStoresByDeliveryTime(params: {
    minTime?: number;
    maxTime?: number;
    location?: string;
    radius?: number;
    page?: number;
    limit?: number;
  }): Promise<StoreSearchResponse> {
    const { minTime = 15, maxTime = 60, location, radius = 10, page = 1, limit = 20 } = params;
    const qs = buildQueryString({
      minTime, maxTime, page, limit,
      ...(location && { location, radius }),
    });

    const response = await apiClient.get<StoreSearchResponse>(`/stores/search-by-delivery-time?${qs}`);

    if (!response.success) {
      throw new Error(response.error || 'Failed to search stores by delivery time');
    }

    return { success: true, data: response.data, message: response.message || '' } as StoreSearchResponse;
  }

  /**
   * Get available store categories
   */
  async getStoreCategories(): Promise<StoreCategoriesResponse> {
    const response = await apiClient.get<StoreCategoriesResponse>('/stores/categories/list');

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch store categories');
    }

    return { success: true, data: response.data, message: response.message || '' } as StoreCategoriesResponse;
  }

  /**
   * Get store by ID
   */
  async getStoreById(storeId: string): Promise<{ success: boolean; data: Store; message: string }> {
    const response = await apiClient.get<{ success: boolean; data: Store; message: string }>(`/stores/${storeId}`);

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch store');
    }

    return { success: true, data: response.data, message: response.message || '' } as { success: boolean; data: Store; message: string };
  }

  /**
   * Get nearby stores
   */
  async getNearbyStores(params: {
    location: string; // "lng,lat" format
    radius?: number;
    limit?: number;
  }): Promise<StoreSearchResponse> {
    const { location, radius = 10, limit = 20 } = params;

    // Parse location string to get separate lat/lng values
    const [lng, lat] = location.split(',').map(coord => coord.trim());
    const qs = buildQueryString({ lng, lat, radius, limit });

    const response = await apiClient.get<StoreSearchResponse>(`/stores/nearby?${qs}`);

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch nearby stores');
    }

    return { success: true, data: response.data, message: response.message || '' } as StoreSearchResponse;
  }

  /**
   * Get featured stores
   */
  async getFeaturedStores(params?: {
    location?: string;
    radius?: number;
    limit?: number;
  }): Promise<StoreSearchResponse> {
    const { location, radius = 10, limit = 20 } = params || {};
    const qs = buildQueryString({
      limit,
      ...(location && { location, radius }),
    });

    const response = await apiClient.get<StoreSearchResponse>(`/stores/featured?${qs}`);

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch featured stores');
    }

    return { success: true, data: response.data, message: response.message || '' } as StoreSearchResponse;
  }

  /**
   * Advanced store search with filters
   */
  async advancedStoreSearch(params: {
    search?: string;
    category?: string;
    deliveryTime?: { min: number; max: number };
    priceRange?: { min: number; max: number };
    rating?: number;
    paymentMethods?: string[];
    nuqtaPay?: boolean;
    features?: {
      freeDelivery?: boolean;
      walletPayment?: boolean;
      verified?: boolean;
      featured?: boolean;
    };
    sortBy?: 'rating' | 'distance' | 'name' | 'newest' | 'price';
    location?: string;
    radius?: number;
    page?: number;
    limit?: number;
  }): Promise<StoreSearchResponse> {
    const {
      search, category, deliveryTime, priceRange, rating,
      paymentMethods, nuqtaPay, features,
      sortBy = 'rating', location, radius = 10, page = 1, limit = 20
    } = params;

    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sortBy,
      ...(location && { location, radius: radius.toString() }),
    });

    if (search) queryParams.append('search', search);
    if (category) queryParams.append('category', category);
    if (deliveryTime) {
      queryParams.append('deliveryTime', `${deliveryTime.min}-${deliveryTime.max}`);
    }
    if (priceRange) {
      queryParams.append('priceRange', `${priceRange.min}-${priceRange.max}`);
    }
    if (rating !== undefined) queryParams.append('rating', rating.toString());
    if (paymentMethods && paymentMethods.length > 0) {
      queryParams.append('paymentMethods', paymentMethods.join(','));
    }

    // Build features list
    const featuresList: string[] = [];
    if (features) {
      if (features.freeDelivery) featuresList.push('freeDelivery');
      if (features.walletPayment) featuresList.push('walletPayment');
      if (features.verified) featuresList.push('verified');
      if (features.featured) featuresList.push('featured');
    }
    if (nuqtaPay) featuresList.push('nuqtaPay');
    if (featuresList.length > 0) {
      queryParams.append('features', featuresList.join(','));
    }

    const response = await apiClient.get<StoreSearchResponse>(`/stores/search/advanced?${queryParams}`);

    if (!response.success) {
      throw new Error(response.error || 'Failed to search stores');
    }

    return { success: true, data: response.data, message: response.message || '' } as StoreSearchResponse;
  }

  /**
   * Helper method to format location for API calls
   */
  formatLocationForAPI(location: UserLocation): string {
    if (!location?.coordinates) {
      throw new Error('Location coordinates are required');
    }
    return `${location.coordinates.longitude},${location.coordinates.latitude}`;
  }

  /**
   * Get reviews for a store
   */
  async getStoreReviews(params: {
    storeId: string;
    page?: number;
    limit?: number;
    rating?: number;
    sortBy?: 'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful';
  }): Promise<ReviewsResponse> {
    const { storeId, page = 1, limit = 20, rating, sortBy = 'newest' } = params;
    const qs = buildQueryString({ page, limit, sortBy, ...(rating && { rating }) });

    const response = await apiClient.get<ReviewsResponse>(`/reviews/store/${storeId}?${qs}`);

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch reviews');
    }

    return { success: true, data: response.data, message: response.message || '' } as ReviewsResponse;
  }

  /**
   * Create a new review
   */
  async createReview(params: {
    storeId: string;
    rating: number;
    title?: string;
    comment: string;
    images?: string[];
  }): Promise<{ success: boolean; data: { review: Review }; message: string }> {
    const { storeId, rating, title, comment, images } = params;

    const response = await apiClient.post<{ success: boolean; data: { review: Review }; message: string }>(
      `/reviews/store/${storeId}`,
      { rating, title, comment, images: images || [] }
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to create review');
    }

    return { success: true, data: response.data, message: response.message || '' } as { success: boolean; data: { review: Review }; message: string };
  }

  /**
   * Check if user can review a store
   */
  async canUserReviewStore(storeId: string): Promise<{ success: boolean; data: { canReview: boolean; hasReviewed: boolean } }> {
    const response = await apiClient.get<{ success: boolean; data: { canReview: boolean; hasReviewed: boolean } }>(
      `/reviews/store/${storeId}/can-review`
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to check review eligibility');
    }

    return { success: true, data: response.data } as { success: boolean; data: { canReview: boolean; hasReviewed: boolean } };
  }

  /**
   * Mark review as helpful
   */
  async markReviewHelpful(reviewId: string): Promise<{ success: boolean; data: { helpful: number }; message: string }> {
    const response = await apiClient.post<{ success: boolean; data: { helpful: number }; message: string }>(
      `/reviews/${reviewId}/helpful`
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to mark review as helpful');
    }

    return { success: true, data: response.data, message: response.message || '' } as { success: boolean; data: { helpful: number }; message: string };
  }

  /**
   * Add store to favorites
   */
  async addToFavorites(storeId: string): Promise<{ success: boolean; data: { favorite: Favorite }; message: string }> {
    const response = await apiClient.post<{ success: boolean; data: { favorite: Favorite }; message: string }>(
      `/favorites/store/${storeId}`
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to add to favorites');
    }

    return { success: true, data: response.data, message: response.message || '' } as { success: boolean; data: { favorite: Favorite }; message: string };
  }

  /**
   * Remove store from favorites
   */
  async removeFromFavorites(storeId: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete<{ success: boolean; message: string }>(
      `/favorites/store/${storeId}`
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to remove from favorites');
    }

    return { success: true, message: response.message || '' } as { success: boolean; message: string };
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite(storeId: string): Promise<{ success: boolean; data: { isFavorited: boolean; favorite?: Favorite }; message: string }> {
    const response = await apiClient.post<{ success: boolean; data: { isFavorited: boolean; favorite?: Favorite }; message: string }>(
      `/favorites/store/${storeId}/toggle`
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to toggle favorite');
    }

    return { success: true, data: response.data, message: response.message || '' } as { success: boolean; data: { isFavorited: boolean; favorite?: Favorite }; message: string };
  }

  /**
   * Check if store is favorited
   */
  async isStoreFavorited(storeId: string): Promise<{ success: boolean; data: { isFavorited: boolean } }> {
    const response = await apiClient.get<{ success: boolean; data: { isFavorited: boolean } }>(
      `/favorites/store/${storeId}/status`
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to check favorite status');
    }

    return { success: true, data: response.data } as { success: boolean; data: { isFavorited: boolean } };
  }

  /**
   * Get user's favorite stores
   */
  async getUserFavorites(params?: {
    page?: number;
    limit?: number;
  }): Promise<FavoritesResponse> {
    const { page = 1, limit = 20 } = params || {};
    const qs = buildQueryString({ page, limit });

    const response = await apiClient.get<FavoritesResponse>(`/favorites/user/my-favorites?${qs}`);

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch favorites');
    }

    return { success: true, data: response.data, message: response.message || '' } as FavoritesResponse;
  }

  /**
   * Get favorite statuses for multiple stores
   */
  async getFavoriteStatuses(storeIds: string[]): Promise<{ success: boolean; data: { statuses: { [key: string]: boolean } } }> {
    const response = await apiClient.post<{ success: boolean; data: { statuses: { [key: string]: boolean } } }>('/favorites/statuses', { storeIds });

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch favorite statuses');
    }

    return { success: true, data: response.data } as { success: boolean; data: { statuses: { [key: string]: boolean } } };
  }

  /**
   * Clear all favorites
   */
  async clearAllFavorites(): Promise<{ success: boolean; data: { deletedCount: number }; message: string }> {
    const response = await apiClient.delete<{ success: boolean; data: { deletedCount: number }; message: string }>(
      '/favorites/clear-all'
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to clear favorites');
    }

    return { success: true, data: response.data, message: response.message || '' } as { success: boolean; data: { deletedCount: number }; message: string };
  }

  /**
   * Create a new store comparison
   */
  async createComparison(params: {
    storeIds: string[];
    name?: string;
  }): Promise<ComparisonResponse> {
    const response = await apiClient.post<ComparisonResponse>('/comparisons', params);

    if (!response.success) {
      throw new Error(response.error || 'Failed to create comparison');
    }

    return { success: true, data: response.data, message: response.message || '' } as ComparisonResponse;
  }

  /**
   * Get user's store comparisons
   */
  async getUserComparisons(params?: {
    page?: number;
    limit?: number;
  }): Promise<ComparisonsResponse> {
    const { page = 1, limit = 20 } = params || {};
    const qs = buildQueryString({ page, limit });

    const response = await apiClient.get<ComparisonsResponse>(`/comparisons/user/my-comparisons?${qs}`);

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch comparisons');
    }

    return { success: true, data: response.data, message: response.message || '' } as ComparisonsResponse;
  }

  /**
   * Get specific comparison by ID
   */
  async getComparisonById(comparisonId: string): Promise<ComparisonResponse> {
    const response = await apiClient.get<ComparisonResponse>(`/comparisons/${comparisonId}`);

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch comparison');
    }

    return { success: true, data: response.data, message: response.message || '' } as ComparisonResponse;
  }

  /**
   * Update comparison
   */
  async updateComparison(params: {
    comparisonId: string;
    storeIds?: string[];
    name?: string;
  }): Promise<ComparisonResponse> {
    const { comparisonId, storeIds, name } = params;

    const response = await apiClient.put<ComparisonResponse>(
      `/comparisons/${comparisonId}`,
      { storeIds, name }
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to update comparison');
    }

    return { success: true, data: response.data, message: response.message || '' } as ComparisonResponse;
  }

  /**
   * Delete comparison
   */
  async deleteComparison(comparisonId: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete<{ success: boolean; message: string }>(`/comparisons/${comparisonId}`);

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete comparison');
    }

    return { success: true, message: response.message || '' } as { success: boolean; message: string };
  }

  /**
   * Add store to comparison
   */
  async addStoreToComparison(params: {
    comparisonId: string;
    storeId: string;
  }): Promise<ComparisonResponse> {
    const { comparisonId, storeId } = params;

    const response = await apiClient.post<ComparisonResponse>(
      `/comparisons/${comparisonId}/stores`,
      { storeId }
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to add store to comparison');
    }

    return { success: true, data: response.data, message: response.message || '' } as ComparisonResponse;
  }

  /**
   * Remove store from comparison
   */
  async removeStoreFromComparison(params: {
    comparisonId: string;
    storeId: string;
  }): Promise<ComparisonResponse> {
    const { comparisonId, storeId } = params;

    const response = await apiClient.delete<ComparisonResponse>(
      `/comparisons/${comparisonId}/stores/${storeId}`
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to remove store from comparison');
    }

    return { success: true, data: response.data, message: response.message || '' } as ComparisonResponse;
  }

  /**
   * Clear all comparisons
   */
  async clearAllComparisons(): Promise<{ success: boolean; data: { deletedCount: number }; message: string }> {
    const response = await apiClient.delete<{ success: boolean; data: { deletedCount: number }; message: string }>(
      '/comparisons/user/clear-all'
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to clear comparisons');
    }

    return { success: true, data: response.data, message: response.message || '' } as { success: boolean; data: { deletedCount: number }; message: string };
  }

  /**
   * Track analytics event
   */
  async trackEvent(params: {
    storeId: string;
    eventType: 'view' | 'search' | 'favorite' | 'unfavorite' | 'compare' | 'review' | 'click' | 'share';
    eventData?: {
      searchQuery?: string;
      category?: string;
      source?: string;
      location?: {
        coordinates: [number, number];
        address?: string;
      };
      metadata?: any;
    };
  }): Promise<{ success: boolean; data: { analyticsId: string }; message: string }> {
    const response = await apiClient.post<{ success: boolean; data: { analyticsId: string }; message: string }>(
      '/analytics/track',
      params
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to track event');
    }

    return { success: true, data: response.data, message: response.message || '' } as { success: boolean; data: { analyticsId: string }; message: string };
  }

  /**
   * Get store analytics
   */
  async getStoreAnalytics(params: {
    storeId: string;
    startDate?: Date;
    endDate?: Date;
    eventType?: string;
    groupBy?: 'hour' | 'day' | 'week' | 'month';
  }): Promise<{ success: boolean; data: any }> {
    const { storeId, startDate, endDate, eventType, groupBy = 'day' } = params;
    const qs = buildQueryString({
      groupBy,
      ...(startDate && { startDate: startDate.toISOString() }),
      ...(endDate && { endDate: endDate.toISOString() }),
      ...(eventType && { eventType }),
    });

    const response = await apiClient.get<{ success: boolean; data: any }>(`/analytics/store/${storeId}?${qs}`);

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch store analytics');
    }

    return { success: true, data: response.data } as { success: boolean; data: any };
  }

  /**
   * Get popular stores
   */
  async getPopularStores(params?: {
    startDate?: Date;
    endDate?: Date;
    eventType?: string;
    limit?: number;
  }): Promise<{ success: boolean; data: any }> {
    const { startDate, endDate, eventType, limit = 10 } = params || {};
    const qs = buildQueryString({
      limit,
      ...(startDate && { startDate: startDate.toISOString() }),
      ...(endDate && { endDate: endDate.toISOString() }),
      ...(eventType && { eventType }),
    });

    const response = await apiClient.get<{ success: boolean; data: any }>(`/analytics/popular?${qs}`);

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch popular stores');
    }

    return { success: true, data: response.data } as { success: boolean; data: any };
  }

  /**
   * Get user analytics
   */
  async getUserAnalytics(params?: {
    startDate?: Date;
    endDate?: Date;
    eventType?: string;
  }): Promise<{ success: boolean; data: any }> {
    const { startDate, endDate, eventType } = params || {};
    const qs = buildQueryString({
      ...(startDate && { startDate: startDate.toISOString() }),
      ...(endDate && { endDate: endDate.toISOString() }),
      ...(eventType && { eventType }),
    });

    const response = await apiClient.get<{ success: boolean; data: any }>(`/analytics/user/my-analytics?${qs}`);

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch user analytics');
    }

    return { success: true, data: response.data } as { success: boolean; data: any };
  }

  /**
   * Helper method to get category display info
   */
  getCategoryDisplayInfo(categoryId: string): { name: string; icon: string; color: string } {
    const categoryInfo: { [key: string]: { name: string; icon: string; color: string } } = {
      fastDelivery: { name: '30 min delivery', icon: '🚀', color: '#7B61FF' },
      budgetFriendly: { name: '1 rupees store', icon: '💰', color: '#6E56CF' },
      premium: { name: 'Luxury store', icon: '👑', color: '#A78BFA' },
      organic: { name: 'Organic Store', icon: '🌱', color: colors.successScale[400] },
      alliance: { name: 'Alliance Store', icon: '🤝', color: '#9F7AEA' },
      lowestPrice: { name: 'Lowest Price', icon: '💸', color: '#22D3EE' },
      mall: { name: `${BRAND.APP_NAME} Mall`, icon: '🏬', color: '#1a3a52' },
      cashStore: { name: 'Cash Store', icon: '💵', color: colors.brand.purpleLight },
    };

    return categoryInfo[categoryId] || { name: 'Store', icon: '🏪', color: '#666' };
  }
}

// Singleton pattern using globalThis to persist across SSR module re-evaluations
const STORE_SEARCH_SERVICE_KEY = '__nuqtaStoreSearchService__';

function getStoreSearchService(): StoreSearchService {
  // Use globalThis to persist across module re-evaluations in SSR
  if (typeof globalThis !== 'undefined') {
    if (!(globalThis as any)[STORE_SEARCH_SERVICE_KEY]) {
      (globalThis as any)[STORE_SEARCH_SERVICE_KEY] = new StoreSearchService();
    }
    return (globalThis as any)[STORE_SEARCH_SERVICE_KEY];
  }
  // Fallback for environments without globalThis
  return new StoreSearchService();
}

export const storeSearchService = getStoreSearchService();
export default storeSearchService;
