// Product Comparison API Service
// Handles product comparison operations (create, read, update, delete, add/remove products)

import apiClient, { ApiResponse } from './apiClient';

// ===== TYPE DEFINITIONS =====

export interface ComparisonProduct {
  _id: string;
  id?: string;
  name: string;
  description?: string;
  images?: string[];
  pricing?: {
    original?: number;
    selling?: number;
    basePrice?: number;
  };
  ratings?: {
    average?: number;
    count?: number;
  };
  inventory?: {
    isAvailable?: boolean;
    quantity?: number;
  };
  cashback?: {
    percentage?: number;
    amount?: number;
  };
  store?: {
    _id?: string;
    id?: string;
    name?: string;
    logo?: string;
  };
  category?: {
    _id?: string;
    id?: string;
    name?: string;
    slug?: string;
  };
  brand?: string;
  weight?: number;
  specifications?: Array<{ key: string; value: string; group?: string }>;
  deliveryInfo?: {
    estimatedDays?: string;
    expressAvailable?: boolean;
    standardDeliveryTime?: string;
    expressDeliveryTime?: string;
  };
}

export interface ProductComparison {
  _id: string;
  id?: string;
  user: string;
  products: ComparisonProduct[];
  name?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductComparisonsResponse {
  comparisons: ProductComparison[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalComparisons: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface ProductComparisonResponse {
  comparison: ProductComparison;
}

export interface ComparisonStats {
  totalComparisons: number;
  averageProductsPerComparison: number;
  mostComparedProduct: ComparisonProduct | null;
}

// ===== API METHODS =====

class ProductComparisonApi {
  private basePath = '/product-comparisons';

  /**
   * Create a new product comparison
   */
  async createComparison(productIds: string[], name?: string): Promise<ApiResponse<ProductComparisonResponse>> {
    try {
      const response = await apiClient.post<ProductComparisonResponse>(
        this.basePath,
        {
          productIds,
          name,
        }
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create product comparison',
        message: 'Failed to create product comparison',
      };
    }
  }

  /**
   * Get user's product comparisons
   */
  async getUserComparisons(params: { page?: number; limit?: number } = {}): Promise<ApiResponse<ProductComparisonsResponse>> {
    try {
      const response = await apiClient.get<ProductComparisonsResponse>(
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
   * Get specific product comparison by ID
   */
  async getComparisonById(comparisonId: string): Promise<ApiResponse<ProductComparisonResponse>> {
    try {
      const response = await apiClient.get<ProductComparisonResponse>(
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
   * Update product comparison
   */
  async updateComparison(
    comparisonId: string,
    updates: { productIds?: string[]; name?: string }
  ): Promise<ApiResponse<ProductComparisonResponse>> {
    try {
      const response = await apiClient.put<ProductComparisonResponse>(
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
   * Delete product comparison
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
   * Add product to comparison
   */
  async addProductToComparison(
    comparisonId: string,
    productId: string
  ): Promise<ApiResponse<ProductComparisonResponse>> {
    try {
      const response = await apiClient.post<ProductComparisonResponse>(
        `${this.basePath}/${comparisonId}/products`,
        {
          productId,
        }
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to add product to comparison',
        message: 'Failed to add product to comparison',
      };
    }
  }

  /**
   * Remove product from comparison
   */
  async removeProductFromComparison(
    comparisonId: string,
    productId: string
  ): Promise<ApiResponse<ProductComparisonResponse>> {
    try {
      const response = await apiClient.delete<ProductComparisonResponse>(
        `${this.basePath}/${comparisonId}/products/${productId}`
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to remove product from comparison',
        message: 'Failed to remove product from comparison',
      };
    }
  }

  /**
   * Get product comparison statistics
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
   * Clear all product comparisons for user
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

const productComparisonApi = new ProductComparisonApi();
export default productComparisonApi;
