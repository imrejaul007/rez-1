// Recommendation API Service
// Handles product recommendations, similar products, and bundles

import apiClient, { ApiResponse } from './apiClient';
import { ProductItem } from '@/types/homepage.types';

export interface ProductRecommendation {
  product: ProductItem;
  score: number;
  reasons: string[];
  confidence: number;
  similarity?: number;
}

export interface BundleItem {
  products: ProductItem[];
  combinedPrice: number;
  savings: number;
  frequency: number;
}

export interface SimilarProductsResponse {
  productId: string;
  similarProducts: ProductRecommendation[];
  total: number;
}

export interface FrequentlyBoughtResponse {
  productId: string;
  bundles: BundleItem[];
  total: number;
}

export interface BundleDealsResponse {
  productId: string;
  bundles: BundleItem[];
  total: number;
}

export interface PersonalizedRecommendationsResponse {
  recommendations: ProductRecommendation[];
  total: number;
  userId: string;
}

class RecommendationService {
  /**
   * Get similar products for a specific product
   */
  async getSimilarProducts(
    productId: string,
    limit: number = 6
  ): Promise<ApiResponse<SimilarProductsResponse>> {
    try {

      const response = await apiClient.get(`/recommendations/products/similar/${productId}`, {
        limit
      });

      if (response.success && response.data) {

        return response as ApiResponse<SimilarProductsResponse>;
      }

      throw new Error(response.message || 'Failed to fetch similar products');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get frequently bought together products
   */
  async getFrequentlyBoughtTogether(
    productId: string,
    limit: number = 4
  ): Promise<ApiResponse<FrequentlyBoughtResponse>> {
    try {

      const response = await apiClient.get(`/recommendations/products/frequently-bought/${productId}`, {
        limit
      });

      if (response.success && response.data) {

        return response as ApiResponse<FrequentlyBoughtResponse>;
      }

      throw new Error(response.message || 'Failed to fetch frequently bought together');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get bundle deals for a product
   */
  async getBundleDeals(
    productId: string,
    limit: number = 3
  ): Promise<ApiResponse<BundleDealsResponse>> {
    try {

      const response = await apiClient.get(`/recommendations/products/bundle/${productId}`, {
        limit
      });

      if (response.success && response.data) {

        return response as ApiResponse<BundleDealsResponse>;
      }

      throw new Error(response.message || 'Failed to fetch bundle deals');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get personalized product recommendations for the authenticated user
   */
  async getPersonalizedRecommendations(
    limit: number = 10,
    excludeProducts?: string[]
  ): Promise<ApiResponse<PersonalizedRecommendationsResponse>> {
    try {
      // Build params object, only include excludeProducts if it has values
      const params: Record<string, any> = { limit };
      if (excludeProducts && excludeProducts.length > 0) {
        params.excludeProducts = excludeProducts.join(',');
      }

      const response = await apiClient.get('/recommendations/products/personalized', params);

      if (response.success && response.data) {

        return response as ApiResponse<PersonalizedRecommendationsResponse>;
      }

      throw new Error(response.message || 'Failed to fetch personalized recommendations');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get "Picked For You" recommendations for homepage
   * Supports location-based filtering for hybrid recommendations (nearby + general)
   */
  async getPickedForYou(
    limit: number = 10,
    location?: { latitude: number; longitude: number }
  ): Promise<ApiResponse<{
    recommendations: Array<ProductItem & {
      recommendationScore: number;
      recommendationReason: string;
      personalizedFor?: string;
    }>;
    total: number;
  }>> {
    try {
      const params: Record<string, any> = { limit };

      // Pass location as "lng,lat" format if available
      if (location?.latitude && location?.longitude) {
        params.location = `${location.longitude},${location.latitude}`;
      }

      const response = await apiClient.get('/recommendations/picked-for-you', params);

      if (response.success && response.data) {
        return response as ApiResponse<{
          recommendations: Array<ProductItem & {
            recommendationScore: number;
            recommendationReason: string;
            personalizedFor?: string;
          }>;
          total: number;
        }>;
      }

      throw new Error(response.message || 'Failed to fetch picked for you recommendations');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Track product view for analytics
   */
  async trackProductView(productId: string): Promise<ApiResponse<{ productId: string; tracked: boolean }>> {
    try {

      const response = await apiClient.post(`/recommendations/products/${productId}/view`);

      if (response.success) {

        return response as ApiResponse<{ productId: string; tracked: boolean }>;
      }

      throw new Error(response.message || 'Failed to track product view');
    } catch (error) {
      // Don't throw - tracking failures shouldn't break the app
      return {
        success: false,
        data: { productId, tracked: false },
        message: 'Failed to track view'
      };
    }
  }

  /**
   * Get all recommendations for a product (similar, frequently bought, and bundles)
   */
  async getAllRecommendations(productId: string): Promise<{
    similar: ProductRecommendation[];
    frequentlyBought: BundleItem[];
    bundles: BundleItem[];
  }> {
    try {

      // Fetch all recommendation types in parallel
      const [similarResponse, frequentlyBoughtResponse, bundlesResponse] = await Promise.allSettled([
        this.getSimilarProducts(productId, 6),
        this.getFrequentlyBoughtTogether(productId, 4),
        this.getBundleDeals(productId, 3)
      ]);

      const result = {
        similar: similarResponse.status === 'fulfilled' && similarResponse.value.success
          ? similarResponse.value.data?.similarProducts || []
          : [],
        frequentlyBought: frequentlyBoughtResponse.status === 'fulfilled' && frequentlyBoughtResponse.value.success
          ? frequentlyBoughtResponse.value.data?.bundles || []
          : [],
        bundles: bundlesResponse.status === 'fulfilled' && bundlesResponse.value.success
          ? bundlesResponse.value.data?.bundles || []
          : []
      };

      return result;
    } catch (error) {
      return {
        similar: [],
        frequentlyBought: [],
        bundles: []
      };
    }
  }

  /**
   * Format recommendation for display
   */
  formatRecommendation(recommendation: ProductRecommendation): ProductItem & { reasons: string[] } {
    return {
      ...recommendation.product,
      reasons: recommendation.reasons
    };
  }

  /**
   * Format bundle for display
   */
  formatBundle(bundle: BundleItem): {
    products: ProductItem[];
    combinedPrice: number;
    originalPrice: number;
    savings: number;
    savingsPercentage: number;
  } {
    const originalPrice = bundle.products.reduce((sum, p) =>
      sum + (p.price?.original || p.price?.current || 0), 0
    );
    
    return {
      products: bundle.products,
      combinedPrice: bundle.combinedPrice,
      originalPrice,
      savings: bundle.savings,
      savingsPercentage: originalPrice > 0 ? Math.round((bundle.savings / originalPrice) * 100) : 0
    };
  }
}

// Create singleton instance
const recommendationService = new RecommendationService();

export default recommendationService;
