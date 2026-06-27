// Brand API Service
// Handles brand partnerships and mall brand data

import apiClient, { ApiResponse } from './apiClient';

// Brand Partnership interface for homepage display
export interface BrandPartnership {
  id: string;
  name: string;
  slug: string;
  logo: string;
  tier: 'standard' | 'premium' | 'exclusive' | 'luxury';
  deal: string;
  cashback: {
    percentage: number;
    maxAmount?: number;
    minPurchase?: number;
  };
  badges: string[];
  rating: number;
  category?: string;
  gradientColors: [string, string];
}

// Full brand details interface
export interface BrandDetails extends BrandPartnership {
  description?: string;
  banner?: string[];
  externalUrl?: string;
  analytics?: {
    views: number;
    clicks: number;
    purchases: number;
  };
}

// API Response types
export interface BrandListResponse {
  success: boolean;
  data: BrandPartnership[];
  message?: string;
}

export interface BrandDetailsResponse {
  success: boolean;
  data: BrandDetails;
  message?: string;
}

class BrandApiService {
  private BASE_PATH = '/mall/brands';

  /**
   * Get featured brand partnerships for homepage
   * @param limit Number of brands to fetch (default: 6)
   */
  async getFeaturedBrands(limit: number = 6): Promise<BrandPartnership[]> {
    try {
      const response = await apiClient.get<BrandListResponse>(
        `${this.BASE_PATH}/featured`,
        { params: { limit } }
      );

      if (response.success && response.data) {
        return response.data;
      }

      return [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Get brand details by slug
   * @param slug Brand slug identifier
   */
  async getBrandBySlug(slug: string): Promise<BrandDetails | null> {
    try {
      const response = await apiClient.get<BrandDetailsResponse>(
        `${this.BASE_PATH}/${slug}`
      );

      if (response.success && response.data) {
        return response.data;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Track brand click for analytics
   * @param brandId Brand ID to track
   */
  async trackBrandClick(brandId: string): Promise<void> {
    try {
      await apiClient.post(`${this.BASE_PATH}/${brandId}/click`);
    } catch (error) {
      // Silently fail analytics tracking
    }
  }

  /**
   * Track brand view for analytics
   * @param brandId Brand ID to track
   */
  async trackBrandView(brandId: string): Promise<void> {
    try {
      await apiClient.post(`${this.BASE_PATH}/${brandId}/view`);
    } catch (error) {
      // Silently fail analytics tracking
    }
  }

  /**
   * Get brands by category
   * @param categorySlug Category slug
   * @param limit Number of brands to fetch
   */
  async getBrandsByCategory(categorySlug: string, limit: number = 10): Promise<BrandPartnership[]> {
    try {
      const response = await apiClient.get<BrandListResponse>(
        `${this.BASE_PATH}/category/${categorySlug}`,
        { params: { limit } }
      );

      if (response.success && response.data) {
        return response.data;
      }

      return [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Search brands by name
   * @param query Search query
   * @param limit Number of results
   */
  async searchBrands(query: string, limit: number = 20): Promise<BrandPartnership[]> {
    try {
      const response = await apiClient.get<BrandListResponse>(
        `${this.BASE_PATH}/search`,
        { params: { q: query, limit } }
      );

      if (response.success && response.data) {
        return response.data;
      }

      return [];
    } catch (error) {
      return [];
    }
  }
}

// Export singleton instance
export const brandApiService = new BrandApiService();
export default brandApiService;
