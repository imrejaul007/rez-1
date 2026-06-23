// Store Comparison API Service
// Handles store comparison operations (create, read, update, delete, add/remove stores)

import apiClient, { ApiResponse } from './apiClient';

// ===== TYPE DEFINITIONS =====

export interface ComparisonStore {
  _id: string;
  id?: string;
  name: string;
  slug?: string;
  logo?: string;
  banner?: string | string[];
  tags?: string[];
  ratings?: {
    average?: number;
    count?: number;
  };
  operationalInfo?: {
    deliveryTime?: string;
    minimumOrder?: number;
    [key: string]: any;
  };
  offers?: {
    cashback?: number;
    [key: string]: any;
  };
  priceForTwo?: number;
  location?: {
    city?: string;
    coordinates?: { lat: number; lng: number };
    [key: string]: any;
  };
  category?: {
    _id?: string;
    name?: string;
    slug?: string;
  };
  isVerified?: boolean;
}

export interface StoreComparison {
  _id: string;
  id?: string;
  user: string;
  stores: ComparisonStore[];
  name?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoreComparisonsResponse {
  comparisons: StoreComparison[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalComparisons: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface StoreComparisonResponse {
  comparison: StoreComparison;
}

export interface ComparisonStats {
  totalComparisons: number;
  averageStoresPerComparison: number;
  mostComparedStore: ComparisonStore | null;
}

// ===== API METHODS =====

class StoreComparisonApi {
  private basePath = '/comparisons';

  /**
   * Create a new store comparison
   */
  async createComparison(storeIds: string[], name?: string): Promise<ApiResponse<StoreComparisonResponse>> {
    try {
      const response = await apiClient.post<StoreComparisonResponse>(
        this.basePath,
        { storeIds, name }
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create store comparison',
        message: 'Failed to create store comparison',
      };
    }
  }

  /**
   * Get user's store comparisons
   */
  async getUserComparisons(params: { page?: number; limit?: number } = {}): Promise<ApiResponse<StoreComparisonsResponse>> {
    try {
      const response = await apiClient.get<StoreComparisonsResponse>(
        `${this.basePath}/user/my-comparisons`,
        params
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch user comparisons',
        message: 'Failed to fetch user comparisons',
      };
    }
  }

  /**
   * Get specific store comparison by ID
   */
  async getComparisonById(comparisonId: string): Promise<ApiResponse<StoreComparisonResponse>> {
    try {
      const response = await apiClient.get<StoreComparisonResponse>(
        `${this.basePath}/${comparisonId}`
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch comparison',
        message: 'Failed to fetch comparison',
      };
    }
  }

  /**
   * Update store comparison
   */
  async updateComparison(
    comparisonId: string,
    updates: { storeIds?: string[]; name?: string }
  ): Promise<ApiResponse<StoreComparisonResponse>> {
    try {
      const response = await apiClient.put<StoreComparisonResponse>(
        `${this.basePath}/${comparisonId}`,
        updates
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update comparison',
        message: 'Failed to update comparison',
      };
    }
  }

  /**
   * Delete store comparison
   */
  async deleteComparison(comparisonId: string): Promise<ApiResponse<null>> {
    try {
      const response = await apiClient.delete<null>(
        `${this.basePath}/${comparisonId}`
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to delete comparison',
        message: 'Failed to delete comparison',
      };
    }
  }

  /**
   * Add store to comparison
   */
  async addStoreToComparison(
    comparisonId: string,
    storeId: string
  ): Promise<ApiResponse<StoreComparisonResponse>> {
    try {
      const response = await apiClient.post<StoreComparisonResponse>(
        `${this.basePath}/${comparisonId}/stores`,
        { storeId }
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to add store to comparison',
        message: 'Failed to add store to comparison',
      };
    }
  }

  /**
   * Remove store from comparison
   */
  async removeStoreFromComparison(
    comparisonId: string,
    storeId: string
  ): Promise<ApiResponse<StoreComparisonResponse>> {
    try {
      const response = await apiClient.delete<StoreComparisonResponse>(
        `${this.basePath}/${comparisonId}/stores/${storeId}`
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to remove store from comparison',
        message: 'Failed to remove store from comparison',
      };
    }
  }

  /**
   * Get store comparison statistics
   */
  async getComparisonStats(): Promise<ApiResponse<{ stats: ComparisonStats }>> {
    try {
      const response = await apiClient.get<{ stats: ComparisonStats }>(
        `${this.basePath}/user/stats`
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch comparison statistics',
        message: 'Failed to fetch comparison statistics',
      };
    }
  }

  /**
   * Clear all store comparisons for user
   */
  async clearAllComparisons(): Promise<ApiResponse<{ deletedCount: number }>> {
    try {
      const response = await apiClient.delete<{ deletedCount: number }>(
        `${this.basePath}/user/clear-all`
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to clear comparisons',
        message: 'Failed to clear comparisons',
      };
    }
  }
}

const storeComparisonApi = new StoreComparisonApi();
export default storeComparisonApi;
