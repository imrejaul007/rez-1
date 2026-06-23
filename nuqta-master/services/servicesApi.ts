// Services API Service
// Handles service catalog, availability, and staff management

import apiClient, { ApiResponse } from './apiClient';

const devLog = {
  log: __DEV__ ? console.log.bind(console) : () => {},
  warn: __DEV__ ? console.warn.bind(console) : () => {},
  error: __DEV__ ? console.error.bind(console) : () => {},
};

// ===== TYPE DEFINITIONS =====

export interface ServiceItem {
  id: string;
  storeId: string;
  name: string;
  description: string;
  price: number;
  duration: number; // minutes
  category: string;
  image?: string;
  rating?: number;
  reviewCount?: number;
}

export interface TimeSlot {
  time: string; // "09:00"
  available: boolean;
  staffAvailable?: number;
}

export interface StaffMember {
  id: string;
  name: string;
  image?: string;
  rating?: number;
  specialization?: string;
}

export interface ServiceAvailability {
  date: string;
  availableSlots: TimeSlot[];
}

export interface ServicesQueryParams {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
  sortBy?: 'price_low' | 'price_high' | 'rating' | 'popularity' | 'newest';
}

export interface ServicesResponse {
  services: ServiceItem[];
  pagination: {
    current: number;
    pages: number;
    total: number;
    limit: number;
  };
}

// ===== SERVICE CLASS =====

class ServicesService {
  /**
   * Get all services for a store with optional filtering and pagination
   */
  async getStoreServices(
    storeId: string,
    params?: ServicesQueryParams
  ): Promise<ApiResponse<ServicesResponse>> {
    try {
      const queryParams = {
        category: params?.category,
        minPrice: params?.minPrice,
        maxPrice: params?.maxPrice,
        page: params?.page || 1,
        limit: params?.limit || 20,
        sortBy: params?.sortBy || 'newest'
      };

      // Filter out undefined values
      const cleanParams = Object.fromEntries(
        Object.entries(queryParams).filter(([_, v]) => v !== undefined)
      );

      const response = await apiClient.get<ServicesResponse>(
        `/services/store/${storeId}`,
        cleanParams
      );

      if (!response.success) {
        devLog.error('❌ [SERVICES API] Failed to fetch store services:', response.error);
      }

      return response;
    } catch (error) {
      devLog.error('❌ [SERVICES API] Error fetching store services:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch store services'
      };
    }
  }

  /**
   * Get single service details by ID
   */
  async getServiceById(serviceId: string): Promise<ApiResponse<ServiceItem>> {
    try {
      if (!serviceId || serviceId.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(serviceId)) {
        devLog.warn(`⚠️ Invalid service ID format: ${serviceId}`);
        return {
          success: false,
          error: 'Invalid service ID format'
        };
      }

      const response = await apiClient.get<ServiceItem>(`/services/${serviceId}`);

      if (!response.success) {
        devLog.error('❌ [SERVICES API] Failed to fetch service details:', response.error);
      }

      return response;
    } catch (error) {
      devLog.error('❌ [SERVICES API] Error fetching service details:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch service details'
      };
    }
  }

  /**
   * Get service availability for a specific date
   */
  async getServiceAvailability(
    serviceId: string,
    date: string
  ): Promise<ApiResponse<ServiceAvailability>> {
    try {
      if (!serviceId || !date) {
        return {
          success: false,
          error: 'Service ID and date are required'
        };
      }

      const response = await apiClient.get<ServiceAvailability>(
        `/services/${serviceId}/availability`,
        { date }
      );

      if (!response.success) {
        devLog.error('❌ [SERVICES API] Failed to fetch service availability:', response.error);
      }

      return response;
    } catch (error) {
      devLog.error('❌ [SERVICES API] Error fetching service availability:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch service availability'
      };
    }
  }

  /**
   * Get staff members for a service
   */
  async getServiceStaff(serviceId: string): Promise<ApiResponse<StaffMember[]>> {
    try {
      if (!serviceId) {
        return {
          success: false,
          error: 'Service ID is required'
        };
      }

      const response = await apiClient.get<StaffMember[]>(
        `/services/${serviceId}/staff`
      );

      if (!response.success) {
        devLog.error('❌ [SERVICES API] Failed to fetch service staff:', response.error);
      }

      return response;
    } catch (error) {
      devLog.error('❌ [SERVICES API] Error fetching service staff:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch service staff'
      };
    }
  }

  /**
   * Get available service categories for a store
   */
  async getServiceCategories(storeId: string): Promise<ApiResponse<string[]>> {
    try {
      if (!storeId) {
        return {
          success: false,
          error: 'Store ID is required'
        };
      }

      const response = await apiClient.get<string[]>(
        `/services/store/${storeId}/categories`
      );

      if (!response.success) {
        devLog.error('❌ [SERVICES API] Failed to fetch service categories:', response.error);
      }

      return response;
    } catch (error) {
      devLog.error('❌ [SERVICES API] Error fetching service categories:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch service categories'
      };
    }
  }

  /**
   * Search services by query
   */
  async searchServices(
    query: string,
    params?: Omit<ServicesQueryParams, 'category'>
  ): Promise<ApiResponse<ServicesResponse>> {
    try {
      if (!query) {
        return {
          success: false,
          error: 'Search query is required'
        };
      }

      const queryParams = {
        q: query,
        minPrice: params?.minPrice,
        maxPrice: params?.maxPrice,
        page: params?.page || 1,
        limit: params?.limit || 20,
        sortBy: params?.sortBy || 'newest'
      };

      // Filter out undefined values
      const cleanParams = Object.fromEntries(
        Object.entries(queryParams).filter(([_, v]) => v !== undefined)
      );

      const response = await apiClient.get<ServicesResponse>(
        '/services/search',
        cleanParams
      );

      if (!response.success) {
        devLog.error('❌ [SERVICES API] Failed to search services:', response.error);
      }

      return response;
    } catch (error) {
      devLog.error('❌ [SERVICES API] Error searching services:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search services'
      };
    }
  }

  /**
   * Get popular services
   */
  async getPopularServices(limit: number = 10): Promise<ApiResponse<ServiceItem[]>> {
    try {
      const response = await apiClient.get<ServiceItem[]>(
        '/services/popular',
        { limit }
      );

      if (!response.success) {
        devLog.error('❌ [SERVICES API] Failed to fetch popular services:', response.error);
      }

      return response;
    } catch (error) {
      devLog.error('❌ [SERVICES API] Error fetching popular services:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch popular services'
      };
    }
  }

  /**
   * Get featured services
   */
  async getFeaturedServices(limit: number = 10): Promise<ApiResponse<ServiceItem[]>> {
    try {
      const response = await apiClient.get<ServiceItem[]>(
        '/services/featured',
        { limit }
      );

      if (!response.success) {
        devLog.error('❌ [SERVICES API] Failed to fetch featured services:', response.error);
      }

      return response;
    } catch (error) {
      devLog.error('❌ [SERVICES API] Error fetching featured services:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch featured services'
      };
    }
  }

  /**
   * Get services by category
   */
  async getServicesByCategory(
    category: string,
    params?: Omit<ServicesQueryParams, 'category'>
  ): Promise<ApiResponse<ServicesResponse>> {
    try {
      if (!category) {
        return {
          success: false,
          error: 'Category is required'
        };
      }

      const queryParams = {
        minPrice: params?.minPrice,
        maxPrice: params?.maxPrice,
        page: params?.page || 1,
        limit: params?.limit || 20,
        sortBy: params?.sortBy || 'newest'
      };

      // Filter out undefined values
      const cleanParams = Object.fromEntries(
        Object.entries(queryParams).filter(([_, v]) => v !== undefined)
      );

      const response = await apiClient.get<ServicesResponse>(
        `/services/category/${category}`,
        cleanParams
      );

      if (!response.success) {
        devLog.error('❌ [SERVICES API] Failed to fetch services by category:', response.error);
      }

      return response;
    } catch (error) {
      devLog.error('❌ [SERVICES API] Error fetching services by category:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch services by category'
      };
    }
  }

  /**
   * Get service reviews
   */
  async getServiceReviews(
    serviceId: string,
    params?: {
      page?: number;
      limit?: number;
      sortBy?: 'newest' | 'helpful' | 'rating_high' | 'rating_low';
    }
  ): Promise<ApiResponse<any>> {
    try {
      if (!serviceId) {
        return {
          success: false,
          error: 'Service ID is required'
        };
      }

      const queryParams = {
        page: params?.page || 1,
        limit: params?.limit || 10,
        sortBy: params?.sortBy || 'newest'
      };

      const response = await apiClient.get(
        `/services/${serviceId}/reviews`,
        queryParams
      );

      if (!response.success) {
        devLog.error('❌ [SERVICES API] Failed to fetch service reviews:', response.error);
      }

      return response;
    } catch (error) {
      devLog.error('❌ [SERVICES API] Error fetching service reviews:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch service reviews'
      };
    }
  }

  /**
   * Check if backend API is available
   */
  async isBackendAvailable(): Promise<boolean> {
    try {
      const response = await apiClient.get('/services/featured', { limit: 1 });

      if (response.success) {
        return true;
      } else {
        devLog.warn('⚠️ [SERVICES API] Backend responded but with error:', response.error);
        return false;
      }
    } catch (error) {
      devLog.warn('⚠️ [SERVICES API] Backend not available:', error);
      return false;
    }
  }
}

// Create singleton instance
const servicesService = new ServicesService();

export default servicesService;
