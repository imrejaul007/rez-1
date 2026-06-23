// Financial Services API Service
// Handles financial services endpoints (bills, OTT, recharge, gold, insurance, offers)

import apiClient, { ApiResponse } from './apiClient';

// ===== TYPE DEFINITIONS =====

export interface FinancialServiceCategory {
  _id: string;
  id: string;
  name: string;
  slug: string;
  icon: string;
  iconType: 'emoji' | 'url' | 'icon-name';
  color: string;
  cashbackPercentage: number;
  maxCashback?: number;
  serviceCount: number;
  metadata?: {
    color?: string;
    tags?: string[];
    seoTitle?: string;
    seoDescription?: string;
  };
}

export interface FinancialService {
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
    distribution?: {
      5: number;
      4: number;
      3: number;
      2: number;
      1: number;
    };
  };
  cashback?: {
    percentage: number;
    maxAmount?: number;
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

export interface FinancialServicesByCategoryResponse {
  services: FinancialService[];
  category: {
    _id: string;
    name: string;
    slug: string;
    icon: string;
    iconType: 'emoji' | 'url' | 'icon-name';
    description?: string;
    cashbackPercentage: number;
    maxCashback?: number;
    metadata?: {
      color?: string;
      tags?: string[];
    };
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface FinancialServicesStats {
  totalServices: number;
  totalCategories: number;
  maxCashback: number;
  totalBillers: number;
}

export interface FinancialServicesQueryParams {
  page?: number;
  limit?: number;
  sortBy?: 'price_low' | 'price_high' | 'rating' | 'newest' | 'popular';
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
}

export interface FinancialServicesSearchParams extends FinancialServicesQueryParams {
  q: string;
  category?: string;
}

// ===== API METHODS =====

class FinancialServicesApi {
  private basePath = '/financial-services';

  /**
   * Get all financial service categories
   */
  async getCategories(): Promise<ApiResponse<FinancialServiceCategory[]>> {
    try {
      const response = await apiClient.get<FinancialServiceCategory[]>(
        `${this.basePath}/categories`
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch categories',
        message: 'Failed to fetch financial service categories',
      };
    }
  }

  /**
   * Get featured financial services
   */
  async getFeatured(limit: number = 6): Promise<ApiResponse<FinancialService[]>> {
    try {
      const response = await apiClient.get<FinancialService[]>(
        `${this.basePath}/featured`,
        { limit }
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch featured services',
        message: 'Failed to fetch featured financial services',
      };
    }
  }

  /**
   * Get financial services statistics
   */
  async getStats(): Promise<ApiResponse<FinancialServicesStats>> {
    try {
      const response = await apiClient.get<FinancialServicesStats>(
        `${this.basePath}/stats`
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch stats',
        message: 'Failed to fetch financial services statistics',
      };
    }
  }

  /**
   * Get financial services by category slug
   */
  async getByCategory(
    slug: string,
    params?: FinancialServicesQueryParams
  ): Promise<ApiResponse<FinancialServicesByCategoryResponse>> {
    try {
      const queryParams: any = {};
      if (params?.page) queryParams.page = params.page;
      if (params?.limit) queryParams.limit = params.limit;
      if (params?.sortBy) queryParams.sortBy = params.sortBy;
      if (params?.minPrice) queryParams.minPrice = params.minPrice;
      if (params?.maxPrice) queryParams.maxPrice = params.maxPrice;
      if (params?.rating) queryParams.rating = params.rating;

      const response = await apiClient.get<FinancialServicesByCategoryResponse>(
        `${this.basePath}/category/${slug}`,
        queryParams
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch services',
        message: 'Failed to fetch financial services',
      };
    }
  }

  /**
   * Get financial service by ID
   */
  async getById(id: string): Promise<ApiResponse<FinancialService>> {
    try {
      const response = await apiClient.get<FinancialService>(
        `${this.basePath}/${id}`
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch service',
        message: 'Failed to fetch financial service',
      };
    }
  }

  /**
   * Search financial services
   */
  async search(
    params: FinancialServicesSearchParams
  ): Promise<ApiResponse<{ services: FinancialService[]; pagination: any; query: string }>> {
    try {
      const queryParams: any = { q: params.q };
      if (params.category) queryParams.category = params.category;
      if (params.page) queryParams.page = params.page;
      if (params.limit) queryParams.limit = params.limit;
      if (params.sortBy) queryParams.sortBy = params.sortBy;
      if (params.minPrice) queryParams.minPrice = params.minPrice;
      if (params.maxPrice) queryParams.maxPrice = params.maxPrice;
      if (params.rating) queryParams.rating = params.rating;

      const response = await apiClient.get<{ services: FinancialService[]; pagination: any; query: string }>(
        `${this.basePath}/search`,
        queryParams
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to search services',
        message: 'Failed to search financial services',
      };
    }
  }
}

// Export singleton instance
const financialServicesApi = new FinancialServicesApi();
export default financialServicesApi;
