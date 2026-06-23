// Outlets API Client
// Handles all outlet-related API calls

import apiClient, { ApiResponse } from './apiClient';

// Types
export interface Outlet {
  _id: string;
  store: {
    _id: string;
    name: string;
    logo?: string;
    category?: string;
  };
  name: string;
  address: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  phone: string;
  email?: string;
  openingHours?: {
    day: string;
    open: string;
    close: string;
    isClosed: boolean;
  }[];
  isActive: boolean;
  offers?: any[];
  metadata?: {
    manager?: string;
    capacity?: number;
  };
  distance?: number;
  distanceUnit?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OpeningHoursInfo {
  outlet: {
    _id: string;
    name: string;
  };
  openingHours: {
    day: string;
    open: string;
    close: string;
    isClosed: boolean;
  }[];
  isOpenNow: boolean;
  currentDay: string;
  currentTime: string;
}

export interface NearbyOutletsResponse {
  outlets: Outlet[];
  count: number;
  searchCenter: {
    lng: number;
    lat: number;
  };
  searchRadius: number;
}

export interface OutletOffersResponse {
  outlet: {
    _id: string;
    name: string;
    address: string;
  };
  offers: any[];
  offersCount: number;
}

class OutletsApi {
  /**
   * Get all outlets with filters
   */
  async getOutlets(params?: {
    store?: string;
    isActive?: boolean;
    sortBy?: string;
    order?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ outlets: Outlet[]; total: number }>> {
    try {
      const response = await apiClient.get<any>('/outlets', params);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get single outlet by ID
   */
  async getOutletById(id: string): Promise<ApiResponse<Outlet>> {
    try {
      const response = await apiClient.get<Outlet>(`/outlets/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get outlets for a specific store
   */
  async getOutletsByStore(
    storeId: string,
    params?: {
      isActive?: boolean;
      page?: number;
      limit?: number;
    }
  ): Promise<ApiResponse<{ outlets: Outlet[]; total: number }>> {
    try {
      const response = await apiClient.get<any>(`/outlets/store/${storeId}`, params);

      // Normalize response - backend returns data as array directly
      // Component expects { outlets: [], total: number }
      if (response.success && Array.isArray(response.data)) {
        return {
          ...response,
          data: {
            outlets: response.data,
            total: response.meta?.pagination?.total || response.data.length,
          },
        };
      }

      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get outlet count for a store
   */
  async getStoreOutletCount(storeId: string): Promise<ApiResponse<{ storeId: string; outletCount: number }>> {
    try {
      const response = await apiClient.get<{ storeId: string; outletCount: number }>(
        `/outlets/store/${storeId}/count`
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find nearby outlets based on location
   */
  async getNearbyOutlets(params: {
    lng: number;
    lat: number;
    radius?: number;
    limit?: number;
    store?: string;
  }): Promise<ApiResponse<NearbyOutletsResponse>> {
    try {
      const response = await apiClient.get<NearbyOutletsResponse>('/outlets/nearby', params);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Search outlets by name or address
   */
  async searchOutlets(data: {
    query: string;
    store?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ outlets: Outlet[]; total: number }>> {
    try {
      const response = await apiClient.post<any>('/outlets/search', data);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get opening hours for a specific outlet
   */
  async getOutletOpeningHours(id: string): Promise<ApiResponse<OpeningHoursInfo>> {
    try {
      const response = await apiClient.get<OpeningHoursInfo>(`/outlets/${id}/opening-hours`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get offers available at a specific outlet
   */
  async getOutletOffers(id: string): Promise<ApiResponse<OutletOffersResponse>> {
    try {
      const response = await apiClient.get<OutletOffersResponse>(`/outlets/${id}/offers`);
      return response;
    } catch (error) {
      throw error;
    }
  }
}

// Create singleton instance
const outletsApi = new OutletsApi();

export default outletsApi;
