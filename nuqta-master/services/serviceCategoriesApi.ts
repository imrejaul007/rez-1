// @ts-nocheck
// Service Categories API Service
// Handles service categories with cashback offers for the homepage

import apiClient, { ApiResponse } from './apiClient';

// ===== TYPE DEFINITIONS =====

export interface ServiceCategory {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  icon: string;
  iconType: 'emoji' | 'url' | 'icon-name';
  image?: string;
  bannerImage?: string;
  cashbackPercentage: number;
  maxCashback?: number;
  isActive: boolean;
  sortOrder: number;
  serviceCount: number;
  metadata?: {
    color?: string;
    tags?: string[];
    seoTitle?: string;
    seoDescription?: string;
  };
  cashbackText?: string; // Virtual field: "Up to X% cash back"
}

export interface ServiceInCategory {
  _id: string;
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
  store: {
    _id: string;
    name: string;
    logo?: string;
    location?: any;
    contact?: any;
    operationalInfo?: any;
  };
  serviceCategory: {
    _id: string;
    name: string;
    icon: string;
    cashbackPercentage: number;
    slug?: string;
  };
  serviceDetails?: {
    duration: number;
    serviceType: 'home' | 'store' | 'online';
    maxBookingsPerSlot: number;
    requiresAddress: boolean;
    requiresPaymentUpfront: boolean;
  };
  cashback?: {
    percentage: number;
    maxAmount?: number;
    isActive: boolean;
  };
}

export interface ServicesInCategoryResponse {
  services: ServiceInCategory[];
  category: {
    _id: string;
    name: string;
    slug: string;
    icon: string;
    cashbackPercentage: number;
    description?: string;
  } | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ServiceCategoryQueryParams {
  page?: number;
  limit?: number;
  sortBy?: 'price_low' | 'price_high' | 'rating' | 'newest' | 'popular';
  minPrice?: number;
  maxPrice?: number;
  serviceType?: 'home' | 'store' | 'online';
}

// ===== SERVICE CLASS =====

class ServiceCategoriesService {
  /**
   * Get all service categories for the homepage
   */
  async getServiceCategories(includeCount: boolean = true): Promise<ApiResponse<ServiceCategory[]>> {
    try {
      const response = await apiClient.get<ServiceCategory[]>(
        '/service-categories',
        { includeCount: includeCount.toString() }
      );

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to fetch service categories'
        };
      }

      // apiClient already unwraps responseData.data, so response.data is the categories array
      const rawCategories = Array.isArray(response.data) ? response.data : [];
      const categories = rawCategories.map((cat: ServiceCategory) => ({
        ...cat,
        cashbackText: `Up to ${cat.cashbackPercentage}% cash back`
      }));

      return {
        success: true,
        data: categories
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch service categories'
      };
    }
  }

  /**
   * Get a single service category by slug
   */
  async getServiceCategoryBySlug(slug: string): Promise<ApiResponse<ServiceCategory>> {
    try {
      if (!slug) {
        return {
          success: false,
          error: 'Category slug is required'
        };
      }

      const response = await apiClient.get<ServiceCategory>(
        `/service-categories/${slug}`
      );

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to fetch service category'
        };
      }

      const category = response.data;
      if (category) {
        category.cashbackText = `Up to ${category.cashbackPercentage}% cash back`;
      }

      return {
        success: true,
        data: category
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch service category'
      };
    }
  }

  /**
   * Get services in a category
   */
  async getServicesInCategory(
    slug: string,
    params?: ServiceCategoryQueryParams
  ): Promise<ApiResponse<ServicesInCategoryResponse>> {
    try {
      if (!slug) {
        return {
          success: false,
          error: 'Category slug is required'
        };
      }

      const queryParams = {
        page: params?.page || 1,
        limit: params?.limit || 20,
        sortBy: params?.sortBy || 'rating',
        minPrice: params?.minPrice,
        maxPrice: params?.maxPrice,
        serviceType: params?.serviceType
      };

      // Filter out undefined values
      const cleanParams = Object.fromEntries(
        Object.entries(queryParams).filter(([_, v]) => v !== undefined)
      );

      const response = await apiClient.get<ServicesInCategoryResponse>(
        `/service-categories/${slug}/services`,
        cleanParams
      );

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to fetch services'
        };
      }

      // Backend returns: { data: { services, category, pagination } }
      // apiClient unwraps responseData.data, so response.data = { services, category, pagination }
      const rawData = response.data || {};

      return {
        success: true,
        data: {
          services: Array.isArray(rawData.services) ? rawData.services : [],
          category: rawData.category || null,
          pagination: rawData.pagination || { page: 1, limit: 20, total: 0, pages: 1 }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch services'
      };
    }
  }

  /**
   * Get child categories of a parent category
   */
  async getChildCategories(slug: string): Promise<ApiResponse<ServiceCategory[]>> {
    try {
      if (!slug) {
        return {
          success: false,
          error: 'Parent category slug is required'
        };
      }

      const response = await apiClient.get<ServiceCategory[]>(
        `/service-categories/${slug}/children`
      );

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to fetch child categories'
        };
      }

      return {
        success: true,
        data: Array.isArray(response.data) ? response.data : []
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch child categories'
      };
    }
  }
}

// Create singleton instance
const serviceCategoriesService = new ServiceCategoriesService();

export default serviceCategoriesService;
