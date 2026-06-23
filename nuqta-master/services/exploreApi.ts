// Explore API Service
// Handles all explore page related API calls

import apiClient, { ApiResponse } from './apiClient';
import { colors } from '@/constants/theme';

// ============================================
// TYPES
// ============================================

export interface ExploreStore {
  id: string;
  name: string;
  category: string;
  image: string;
  logo?: string;
  rating: number;
  reviews: number;
  distance?: string;
  cashback: string;
  cashbackRate?: number;
  offer?: string;
  isOpen: boolean;
  activity?: string;
  badge?: string;
  badgeColor?: string;
  tags?: string[];
  isVerified?: boolean;
  location?: {
    coordinates: [number, number];
  };
}

export interface HotProduct {
  id: string;
  name: string;
  store: string;
  storeId?: string;
  image: string;
  offer: string;
  distance?: string;
  price: number;
  originalPrice: number;
  rating: number;
  reviews: number;
  buyers?: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  image?: string;
  storeCount?: number;
  productCount?: number;
}

export interface NearbyStore {
  id: string;
  name: string;
  distance: string;
  isLive: boolean;
  status: string;
  waitTime?: string;
  cashback: string;
  closingSoon?: boolean;
  location: {
    coordinates: [number, number];
  };
}

export interface ExploreStats {
  activeUsers: number;
  earnedToday: number;
  dealsLive: number;
  peopleNearby: number;
  peopleEarnedToday: number;
}

export interface VerifiedReview {
  id: string;
  user: string;
  avatar?: string;
  rating: number;
  review: string;
  store: string;
  storeId?: string;
  storeLogo?: string;
  cashback: number;
  verified: boolean;
  time: string;
}

export interface FeaturedComparison {
  id: string;
  name: string;
  stores: Array<{
    id: string;
    name: string;
    logo?: string;
    cashbackRate?: number;
    ratings?: { average: number; count: number };
  }>;
}

export interface CommunityActivity {
  id: string;
  type: string;
  user?: { name: string; avatar?: string };
  message: string;
  store?: string;
  amount?: number;
  time: string;
  isFriend: boolean;
}

export interface ExploreStatsSummary {
  partnerStores: number;
  maxCashback: number;
  totalUsers: number;
}

// ============================================
// EXPLORE API SERVICE
// ============================================

class ExploreApiService {
  /**
   * Get all stores with optional filters
   */
  async getStores(params?: {
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: 'rating' | 'distance' | 'name' | 'newest';
  }): Promise<ApiResponse<{ stores: ExploreStore[]; pagination: any }>> {
    try {
      const response = await apiClient.get<any>('/stores', params);

      if (response.success && response.data) {
        // Transform backend data to frontend format - only use real data
        const stores = (response.data.stores || response.data || []).map((store: any) => ({
          id: store._id || store.id,
          name: store.name,
          category: store.category?.name || (store.deliveryCategories?.premium ? 'Premium' : null),
          image: store.banner?.[0] || store.image || store.logo || null,
          rating: store.rating?.average || store.ratings?.average || null,
          reviews: store.rating?.count || store.ratings?.count || null,
          distance: store.distance ? `${store.distance.toFixed(1)} km` : null,
          cashback: store.cashbackRate ? `${store.cashbackRate}%` : (store.offers?.[0]?.discount ? `${store.offers[0].discount}%` : null),
          cashbackRate: store.cashbackRate || store.offers?.cashback || null,
          offer: store.offers?.[0]?.title || (store.cashbackRate ? `${store.cashbackRate}% Cashback` : null),
          isOpen: store.isOpen ?? store.operationalInfo?.isOpen ?? null,
          activity: store.activity || (store.visitCount ? `${store.visitCount} people visited` : null),
          badge: store.isFeatured ? 'Featured' : (store.isTrending ? 'Trending' : null),
          badgeColor: store.isFeatured ? '#F59E0B' : (store.isTrending ? colors.error : null),
        }));

        return {
          success: true,
          data: {
            stores,
            pagination: response.data.pagination || response.meta?.pagination,
          },
        };
      }

      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch stores',
      };
    }
  }

  /**
   * Search stores
   */
  async searchStores(query: string, params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ stores: ExploreStore[]; pagination: any }>> {
    try {
      const response = await apiClient.get<any>('/stores/search', { q: query, ...params });

      if (response.success && response.data) {
        const stores = (response.data.stores || response.data || []).map((store: any) => ({
          id: store._id || store.id,
          name: store.name,
          category: store.category?.name || null,
          image: store.banner?.[0] || store.image || store.logo || null,
          rating: store.rating?.average || store.ratings?.average || null,
          reviews: store.rating?.count || store.ratings?.count || null,
          cashback: store.cashbackRate ? `${store.cashbackRate}%` : null,
          cashbackRate: store.cashbackRate || store.offers?.cashback || null,
          isOpen: store.isOpen ?? store.operationalInfo?.isOpen ?? null,
          distance: store.distance ? `${store.distance.toFixed(1)} km` : null,
        }));

        return {
          success: true,
          data: { stores, pagination: response.data.pagination },
        };
      }

      return response;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get hot deals/trending products
   */
  async getHotDeals(params?: {
    limit?: number;
    page?: number;
  }): Promise<ApiResponse<{ products: HotProduct[]; pagination: any }>> {
    try {
      const response = await apiClient.get<any>('/products/hot-deals', params);

      if (response.success && response.data) {
        const products = (response.data.products || response.data || []).map((product: any) => {
          // Determine the offer text - only if real data exists
          let offer: string | null = null;
          if (product.cashbackPercentage && product.cashbackPercentage > 0) {
            offer = `${product.cashbackPercentage}% Cashback`;
          } else if (product.cashback?.percentage && product.cashback.percentage > 0) {
            offer = `${product.cashback.percentage}% Cashback`;
          } else if (product.discount && product.discount > 0) {
            offer = `${product.discount}% Off`;
          } else if (product.pricing?.discount && product.pricing.discount > 0) {
            offer = `Flat ${product.pricing.discount}% Off`;
          }

          return {
            id: product._id || product.id,
            name: product.name,
            store: product.store?.name || null,
            storeId: product.store?._id || product.store?.id || product.storeId || null,
            image: product.image || product.images?.[0]?.url || product.images?.[0] || null,
            offer,
            distance: product.distance ? `${product.distance} km` : null,
            price: product.price || product.pricing?.selling || product.pricing?.salePrice || 0,
            originalPrice: product.originalPrice || product.pricing?.original || product.pricing?.basePrice || 0,
            rating: product.rating || product.ratings?.average || null,
            reviews: product.reviewCount || product.ratings?.count || null,
            buyers: product.soldCount || null,
          };
        });

        return {
          success: true,
          data: {
            products,
            pagination: response.data.pagination || response.meta?.pagination,
          },
        };
      }

      return response;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get trending products
   */
  async getTrendingProducts(params?: {
    limit?: number;
    page?: number;
    days?: number;
  }): Promise<ApiResponse<{ products: HotProduct[]; pagination: any }>> {
    try {
      const response = await apiClient.get<any>('/products/trending', params);

      if (response.success && response.data) {
        const products = (response.data.products || response.data || []).map((product: any) => ({
          id: product._id || product.id,
          name: product.name,
          store: product.store?.name || null,
          storeId: product.store?._id || product.storeId || null,
          image: product.images?.[0]?.url || product.image || null,
          offer: product.discount ? `${product.discount}% Off` : (product.isTrending ? 'Trending' : null),
          price: product.pricing?.salePrice || product.price || 0,
          originalPrice: product.pricing?.basePrice || product.originalPrice || 0,
          rating: product.ratings?.average || product.rating || null,
          reviews: product.ratings?.count || product.reviewCount || null,
          buyers: product.soldCount || null,
        }));

        return {
          success: true,
          data: { products, pagination: response.data.pagination },
        };
      }

      return response;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all categories
   */
  async getCategories(params?: {
    type?: string;
    featured?: boolean;
  }): Promise<ApiResponse<Category[]>> {
    try {
      const response = await apiClient.get<any>('/categories', params);

      if (response.success && response.data) {
        const categories = (response.data.categories || response.data || []).map((cat: any) => ({
          id: cat._id || cat.id,
          name: cat.name,
          slug: cat.slug,
          icon: cat.icon,
          image: cat.image,
          storeCount: cat.storeCount,
          productCount: cat.productCount,
        }));

        return { success: true, data: categories };
      }

      return response;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get category details by slug
   */
  async getCategoryBySlug(slug: string): Promise<ApiResponse<Category & { stores?: ExploreStore[] }>> {
    try {
      const response = await apiClient.get<any>(`/categories/${slug}`);

      if (response.success && response.data) {
        const category = response.data.category || response.data;
        return {
          success: true,
          data: {
            id: category._id || category.id,
            name: category.name,
            slug: category.slug,
            icon: category.icon,
            image: category.image,
            storeCount: category.storeCount,
          },
        };
      }

      return response;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get stores by category slug
   */
  async getStoresByCategory(slug: string, params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    lat?: number;
    lng?: number;
  }): Promise<ApiResponse<{ stores: ExploreStore[]; pagination: any; category?: any }>> {
    try {
      const response = await apiClient.get<any>(`/stores/by-category-slug/${slug}`, params);

      if (response.success && response.data) {
        const stores = (response.data.stores || response.data || []).map((store: any) => ({
          id: store._id || store.id,
          name: store.name,
          category: store.category?.name || null,
          image: store.banner?.[0] || store.image || store.logo || null,
          rating: store.rating?.average || store.ratings?.average || null,
          reviews: store.rating?.count || store.ratings?.count || null,
          distance: store.distance ? `${store.distance} km` : null,
          cashback: store.cashbackRate ? `${store.cashbackRate}%` : (store.offers?.cashback ? `${store.offers.cashback}%` : null),
          offer: store.offers?.[0]?.title || (store.cashbackRate ? `${store.cashbackRate}% Cashback` : null),
          isOpen: store.isOpen ?? store.operationalInfo?.isOpen ?? null,
          deliveryTime: store.operationalInfo?.deliveryTime || store.deliveryTime || null,
          badge: store.badge || (store.isTrending ? 'Trending' : (store.isFeatured ? 'Featured' : null)),
          badgeColor: store.badgeColor || (store.isTrending ? colors.error : (store.isFeatured ? '#F97316' : null)),
        }));

        return {
          success: true,
          data: {
            stores,
            pagination: response.data.pagination,
            category: response.data.category,
          },
        };
      }

      return response;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get stores by tag (halal, vegan, veg, etc.)
   */
  async getStoresByTag(tag: string, params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
  }): Promise<ApiResponse<{ stores: ExploreStore[]; tag: string; pagination: any }>> {
    try {
      const response = await apiClient.get<any>(`/stores/by-tag/${tag}`, params);

      if (response.success && response.data) {
        const stores = (response.data.stores || response.data || []).map((store: any) => ({
          id: store._id || store.id,
          name: store.name,
          category: store.category?.name || null,
          image: store.banner?.[0] || store.image || store.logo || null,
          logo: store.logo || null,
          rating: store.rating?.average || store.ratings?.average || null,
          reviews: store.rating?.count || store.ratings?.count || null,
          distance: store.distance ? `${store.distance} km` : null,
          cashback: store.cashbackRate ? `${store.cashbackRate}%` : (store.offers?.cashback ? `${store.offers.cashback}%` : null),
          offer: store.offers?.[0]?.title || (store.cashbackRate ? `${store.cashbackRate}% Cashback` : null),
          isOpen: store.isOpen ?? store.operationalInfo?.isOpen ?? null,
          tags: store.tags || [],
          isVerified: store.isVerified || false,
          badge: store.badge || (store.isTrending ? 'Trending' : (store.isFeatured ? 'Featured' : null)),
          badgeColor: store.badgeColor || (store.isTrending ? colors.error : (store.isFeatured ? '#F97316' : null)),
        }));

        return {
          success: true,
          data: {
            stores,
            tag: response.data.tag || tag,
            pagination: response.data.pagination,
          },
        };
      }

      return response;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get nearby stores for map view
   */
  async getNearbyStores(params: {
    latitude: number;
    longitude: number;
    radius?: number;
    limit?: number;
  }): Promise<ApiResponse<NearbyStore[]>> {
    try {
      // Backend accepts lat/lng or latitude/longitude
      const queryParams: any = {
        lat: params.latitude,
        lng: params.longitude,
      };
      if (params.radius) queryParams.radius = params.radius;
      if (params.limit) queryParams.limit = params.limit;

      const response = await apiClient.get<any>('/stores/nearby', queryParams);

      if (response.success && response.data) {
        const stores = (response.data.stores || response.data || []).map((store: any) => ({
          id: store._id || store.id,
          name: store.name,
          distance: store.distance ? `${typeof store.distance === 'number' ? store.distance.toFixed(1) : store.distance} km` : null,
          isLive: store.isOpen ?? store.operationalInfo?.isOpen ?? true, // Default to open
          status: store.isOpen === true ? 'Open' : (store.isOpen === false ? 'Closed' : 'Open'),
          waitTime: store.waitTime || store.operationalInfo?.waitTime || 'No wait',
          cashback: store.cashbackRate ? `${store.cashbackRate}%` : (store.offers?.cashback ? `${store.offers.cashback}%` : '5%'),
          closingSoon: store.closingSoon || false,
          location: {
            coordinates: store.location?.coordinates || null,
          },
        }));

        return { success: true, data: stores };
      }

      return response;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get trending stores
   */
  async getTrendingStores(params?: {
    limit?: number;
    page?: number;
    days?: number;
    category?: string;
  }): Promise<ApiResponse<{ stores: ExploreStore[]; pagination: any }>> {
    try {
      // Only send allowed params: category, limit, page, days
      const allowedParams = {
        ...(params?.limit && { limit: params.limit }),
        ...(params?.page && { page: params.page }),
        ...(params?.days && { days: params.days }),
        ...(params?.category && { category: params.category }),
      };
      const response = await apiClient.get<any>('/stores/trending', allowedParams);

      if (response.success && response.data) {
        const stores = (response.data.stores || response.data || []).map((store: any) => ({
          id: store._id || store.id,
          name: store.name,
          category: store.category?.name || 'General',
          image: store.banner?.[0] || store.image || store.logo,
          rating: store.rating?.average || store.ratings?.average || null,
          reviews: store.rating?.count || store.ratings?.count || null,
          cashback: store.cashbackRate ? `${store.cashbackRate}% Cashback` : (store.offers?.cashback ? `${store.offers.cashback}% Cashback` : null),
          distance: store.distance ? `${store.distance} km` : null,
          isOpen: store.isOpen ?? store.operationalInfo?.isOpen ?? null,
          badge: store.badge || (store.isTrending ? 'Trending' : (store.isFeatured ? 'Featured' : null)),
          badgeColor: store.badgeColor || (store.isTrending ? colors.error : (store.isFeatured ? '#F97316' : null)),
          activity: store.activity || (store.visitCount ? `${store.visitCount} people visited` : null),
        }));

        return {
          success: true,
          data: { stores, pagination: response.data.pagination },
        };
      }

      return response;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get products with optional filters (for SmartPicks and general product listings)
   */
  async getProducts(params?: {
    limit?: number;
    page?: number;
    category?: string;
    sortBy?: string;
  }): Promise<ApiResponse<HotProduct[]>> {
    try {
      const response = await apiClient.get<any>('/products', params);

      if (response.success && response.data) {
        const products = (response.data.products || response.data || []).map((product: any) => ({
          id: product._id || product.id,
          name: product.name,
          store: product.store?.name || null,
          storeId: product.store?._id || product.storeId || null,
          image: product.image || product.images?.[0]?.url || product.images?.[0] || null,
          offer: product.cashbackPercentage ? `${product.cashbackPercentage}% Cashback` : null,
          distance: product.distance ? `${product.distance} km` : null,
          price: product.price || product.pricing?.selling || 0,
          originalPrice: product.originalPrice || product.pricing?.original || 0,
          rating: product.rating || product.ratings?.average || null,
          reviews: product.reviewCount || product.ratings?.count || null,
          buyers: product.soldCount || null,
          cashbackPercentage: product.cashbackPercentage || product.cashback?.percentage || null,
        }));

        return { success: true, data: products };
      }

      return response;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get personalized recommendations (Smart Picks)
   */
  async getSmartPicks(params?: {
    limit?: number;
    location?: string;
  }): Promise<ApiResponse<{ stores: ExploreStore[]; products: HotProduct[] }>> {
    try {
      const response = await apiClient.get<any>('/recommendations/personalized', params);

      if (response.success && response.data) {
        return {
          success: true,
          data: {
            stores: response.data.stores || [],
            products: response.data.products || [],
          },
        };
      }

      return response;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ============================================
  // EXPLORE PAGE LIVE STATS
  // ============================================

  /**
   * Get live stats for explore page (active users, earned today, deals live)
   */
  async getLiveStats(): Promise<ApiResponse<ExploreStats>> {
    try {
      const response = await apiClient.get<any>('/explore/live-stats');

      if (response.success && response.data) {
        return {
          success: true,
          data: {
            activeUsers: response.data.activeUsers || 0,
            earnedToday: response.data.earnedToday || 0,
            dealsLive: response.data.dealsLive || 0,
            peopleNearby: response.data.peopleNearby || 0,
            peopleEarnedToday: response.data.peopleEarnedToday || 0,
          },
        };
      }

      return response;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get verified reviews for explore page
   */
  async getVerifiedReviews(params?: { limit?: number; page?: number }): Promise<ApiResponse<{ reviews: VerifiedReview[]; total?: number; hasMore?: boolean }>> {
    try {
      const response = await apiClient.get<any>('/explore/verified-reviews', params);

      if (response.success && response.data) {
        return {
          success: true,
          data: {
            reviews: response.data.reviews || [],
            total: response.data.total || response.data.reviews?.length || 0,
            hasMore: response.data.hasMore || false,
          },
        };
      }

      return response;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get featured comparison for explore page
   */
  async getFeaturedComparison(): Promise<ApiResponse<{ comparison: FeaturedComparison | null }>> {
    try {
      const response = await apiClient.get<any>('/explore/featured-comparison');

      if (response.success && response.data) {
        const comp = response.data.comparison;
        if (!comp) {
          return { success: true, data: { comparison: null } };
        }

        return {
          success: true,
          data: {
            comparison: {
              id: comp._id || comp.id,
              name: comp.name || 'Store Comparison',
              stores: (comp.stores || []).map((store: any) => ({
                id: store._id || store.id,
                name: store.name,
                logo: store.logo,
                cashbackRate: store.cashbackRate,
                ratings: store.ratings,
              })),
            },
          },
        };
      }

      return response;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get friends/community activity for explore page
   */
  async getCommunityActivity(params?: { limit?: number }): Promise<ApiResponse<{ activities: CommunityActivity[] }>> {
    try {
      const response = await apiClient.get<any>('/explore/friends-activity', params);

      if (response.success && response.data) {
        return {
          success: true,
          data: {
            activities: response.data.activities || [],
          },
        };
      }

      return response;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get explore stats summary (partner stores count, max cashback, etc)
   */
  async getStatsSummary(): Promise<ApiResponse<ExploreStatsSummary>> {
    try {
      const response = await apiClient.get<any>('/explore/stats-summary');

      if (response.success && response.data) {
        return {
          success: true,
          data: {
            partnerStores: response.data.partnerStores || 0,
            maxCashback: response.data.maxCashback || 0,
            totalUsers: response.data.totalUsers || 0,
          },
        };
      }

      return response;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

// Create singleton instance
const exploreApi = new ExploreApiService();

export default exploreApi;
export { exploreApi };
