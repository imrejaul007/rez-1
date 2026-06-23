// Home Services API Service
// Handles home services specific endpoints

import apiClient, { ApiResponse } from './apiClient';

// ===== TYPE DEFINITIONS =====

export interface HomeServiceCategory {
  id: string;
  title: string;
  icon: string;
  iconType: 'emoji' | 'url' | 'icon-name';
  color: string;
  count: string;
  cashback: number;
}

export interface HomeService {
  _id: string;
  id?: string;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  images: string[];
  pricing: {
    original: number;
    selling: number;
    discount?: number;
    currency: string;
  };
  ratings: {
    average: number;
    count: number;
  };
  cashback?: {
    percentage: number;
    isActive: boolean;
  };
  serviceDetails?: {
    duration: number;
    serviceType: 'home' | 'store' | 'online';
    maxBookingsPerSlot: number;
    requiresAddress: boolean;
    requiresPaymentUpfront: boolean;
    serviceArea?: {
      radius: number;
      cities?: string[];
    };
  };
  serviceCategory?: {
    _id: string;
    name: string;
    slug: string;
    icon: string;
    cashbackPercentage: number;
  };
  store?: {
    _id: string;
    name: string;
    logo?: string;
    location?: {
      address: string;
      city: string;
      coordinates?: [number, number];
    };
  };
  isFeatured?: boolean;
  isActive: boolean;
}

export interface HomeServicesByCategoryResponse {
  services: HomeService[];
  category: {
    id: string;
    name: string;
    slug: string;
    icon: string;
    description?: string;
    cashbackPercentage: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface HomeServicesStats {
  professionals: number;
  maxCashback: number;
  sameDayService: boolean;
  serviceCount: number;
}

export interface HomeServicesQueryParams {
  page?: number;
  limit?: number;
  sortBy?: 'price_low' | 'price_high' | 'rating' | 'newest' | 'popular';
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
}

// ===== SERVICE CLASS =====

class HomeServicesService {
  /**
   * Get home services categories for homepage
   */
  async getCategories(): Promise<ApiResponse<HomeServiceCategory[]>> {
    try {
      const response = await apiClient.get<HomeServiceCategory[]>('/home-services/categories');
      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch home services categories'
      };
    }
  }

  /**
   * Get featured home services for homepage
   */
  async getFeatured(limit: number = 6): Promise<ApiResponse<HomeService[]>> {
    try {
      const response = await apiClient.get<HomeService[]>(`/home-services/featured?limit=${limit}`);
      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch featured home services'
      };
    }
  }

  /**
   * Get popular home services
   */
  async getPopular(limit: number = 10): Promise<ApiResponse<HomeService[]>> {
    try {
      const response = await apiClient.get<HomeService[]>(`/home-services/popular?limit=${limit}`);
      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch popular home services'
      };
    }
  }

  /**
   * Get home services statistics
   */
  async getStats(): Promise<ApiResponse<HomeServicesStats>> {
    try {
      const response = await apiClient.get<HomeServicesStats>('/home-services/stats');
      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch home services stats'
      };
    }
  }

  /**
   * Get home services by category slug
   */
  async getByCategory(
    slug: string,
    params?: HomeServicesQueryParams
  ): Promise<ApiResponse<HomeServicesByCategoryResponse>> {
    try {
      const queryParams: any = {
        page: params?.page || 1,
        limit: params?.limit || 20,
        sortBy: params?.sortBy || 'rating'
      };

      if (params?.minPrice) queryParams.minPrice = params.minPrice;
      if (params?.maxPrice) queryParams.maxPrice = params.maxPrice;
      if (params?.rating) queryParams.rating = params.rating;

      // Filter out undefined values
      const cleanParams = Object.fromEntries(
        Object.entries(queryParams).filter(([_, v]) => v !== undefined)
      );

      const response = await apiClient.get<HomeServicesByCategoryResponse>(
        `/home-services/category/${slug}`,
        cleanParams
      );

      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch home services by category'
      };
    }
  }
}

// Export singleton instance
const homeServicesApi = new HomeServicesService();
export default homeServicesApi;
