// @ts-nocheck
// Products API Service
// Handles product catalog, search, and recommendations

import apiClient, { ApiResponse } from './apiClient';
import { ProductItem, RecommendationItem } from '@/types/homepage.types';
import { validateProduct, validateProductArray } from '@/utils/responseValidators';
import {
  Product as UnifiedProduct,
  toProduct,
  validateProduct as validateUnifiedProduct,
  isProductAvailable
} from '@/types/unified';

/**
 * @deprecated Use UnifiedProduct from '@/types/product-unified.types' instead
 *
 * This Product interface is kept for backwards compatibility during migration.
 * It contains verbose structure that doesn't match the actual API responses.
 *
 * Migration Guide:
 * - Replace: import { Product } from '@/services/productsApi'
 * - With: import { UnifiedProduct } from '@/types/product-unified.types'
 *
 * The UnifiedProduct type is more flexible, supports both _id and id,
 * and better handles API response variations.
 */
export interface Product {
  id: string;
  name: string;
  description: string;
  sku: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  store: {
    id: string;
    name: string;
    slug: string;
  };
  variants: Array<{
    id: string;
    name: string;
    sku: string;
    price: number;
    comparePrice?: number;
    inventory: {
      quantity: number;
      trackQuantity: boolean;
      allowBackorder: boolean;
    };
    attributes: Record<string, any>;
  }>;
  images: Array<{
    id: string;
    url: string;
    alt: string;
    isMain: boolean;
  }>;
  tags: string[];
  status: 'active' | 'draft' | 'archived';
  seo: {
    title: string;
    description: string;
    slug: string;
  };
  visibility: 'public' | 'private' | 'hidden';
  pricing: {
    basePrice: number;
    salePrice?: number;
    cost?: number;
    taxable: boolean;
  };
  ratings: {
    average: number;
    count: number;
    breakdown: Record<number, number>;
  };
  createdAt: string;
  updatedAt: string;
}

// Export UnifiedProduct for new code - this is the recommended type to use
export { UnifiedProduct } from '@/types/product-unified.types';

export interface ProductsQuery {
  page?: number;
  limit?: number;
  category?: string;
  store?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  tags?: string[];
  sort?: 'name' | 'price' | 'rating' | 'popularity' | 'newest' | 'oldest';
  order?: 'asc' | 'desc';
  status?: 'active' | 'draft' | 'archived';
  visibility?: 'public' | 'private' | 'hidden';
}

export interface ProductsResponse {
  products: Product[];
  pagination: {
    current: number;
    pages: number;
    total: number;
    limit: number;
  };
  filters: {
    categories: Array<{ id: string; name: string; count: number }>;
    stores: Array<{ id: string; name: string; count: number }>;
    priceRange: { min: number; max: number };
    tags: Array<{ name: string; count: number }>;
  };
}

export interface SearchQuery {
  q: string;
  page?: number;
  limit?: number;
  category?: string;
  store?: string;
  filters?: Record<string, any>;
}

export interface SearchResponse {
  products: Product[];
  suggestions: string[];
  filters: Array<{
    name: string;
    type: 'category' | 'brand' | 'price' | 'rating';
    options: Array<{ value: string; label: string; count: number }>;
  }>;
  pagination: {
    current: number;
    pages: number;
    total: number;
    limit: number;
  };
  query: string;
  searchTime: number;
}

class ProductsService {
  // Get products with filtering and pagination
  async getProducts(query: ProductsQuery = {}): Promise<any> {
    try {
      const response = await apiClient.get('/products', query);
      return response.success ? response.data : response;
    } catch (error: any) {
      // Re-throw so test mocks with rejected promises propagate correctly
      if (error?.response) throw error;
      throw error;
    }
  }

  // Get single product by ID
  //
  // Returns the unwrapped product payload directly so callers (and
  // integration tests) can use `productDetails.id`, `productDetails.name`,
  // etc. without going through `.data`.
  async getProductById(id: string): Promise<any> {
    try {
      const response = await apiClient.get<Product>(`/products/${id}`);

      if (response && response.success && response.data) {
        return response.data;
      }

      // Fallback for direct/mock payloads without a standard envelope.
      if (response && (response as any).id) {
        return response;
      }

      return response as any;
    } catch (error: any) {
      throw error;
    }
  }

  // Get product categories
  async getCategories(): Promise<any> {
    const response = await apiClient.get('/products/categories');
    return response.success ? response.data : response;
  }

  // Get homepage products (recommended, trending, new arrivals)
  async getHomepageProducts(): Promise<any> {
    const response = await apiClient.get('/products/homepage');
    return response.success ? response.data : response;
  }

  // Get featured products
  async getFeaturedProducts(limit: number = 10): Promise<ApiResponse<Product[]>> {
    try {
      const response = await apiClient.get<Product[]>('/products/featured', { limit });

      // Validate and normalize product array using unified types
      if (response.success && response.data && Array.isArray(response.data)) {
        try {
          // Convert each product to unified format
          const unifiedProducts = response.data.map(toProduct);

          // Validate all products
          const allValid = unifiedProducts.every(product => {
            const validation = validateUnifiedProduct(product);
            if (!validation.valid) {
            }
            return validation.valid;
          });

          if (allValid) {
            return {
              ...response,
              data: unifiedProducts as any, // Cast for backwards compatibility
            };
          }

          // If some products failed, filter to only valid ones
          const validProducts = unifiedProducts.filter(product => {
            const validation = validateUnifiedProduct(product);
            return validation.valid;
          });

          return {
            ...response,
            data: validProducts as any,
          };
        } catch (conversionError) {
          // Fallback to old validation
          const validatedProducts = validateProductArray(response.data);
          return {
            ...response,
            data: validatedProducts as Product[],
          };
        }
      }

      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Failed to fetch featured products',
        message: error?.message || 'Failed to fetch featured products',
      };
    }
  }

  // Search products
  async searchProducts(query: any): Promise<any> {
    const response = await apiClient.get('/products/search', typeof query === 'string' ? { q: query } : query);
    return response.success ? response.data : response;
  }

  // Get products by category
  async getProductsByCategory(
    categorySlug: string,
    query: Omit<ProductsQuery, 'category'> = {}
  ): Promise<ApiResponse<ProductsResponse>> {
    return apiClient.get(`/products/category/${categorySlug}`, query);
  }

  // Get products by subcategory slug (for Browse Categories slider)
  async getProductsBySubcategory(
    subcategorySlug: string,
    limit: number = 10
  ): Promise<ApiResponse<Product[]>> {
    try {
      const response = await apiClient.get<any>(`/products/subcategory/${subcategorySlug}`, { limit });

      if (response.success && response.data) {
        // Handle both array and paginated response formats
        const products = Array.isArray(response.data)
          ? response.data
          : (response.data.products || []);


        // Validate and normalize products
        const validatedProducts = validateProductArray(products);
        return {
          ...response,
          data: validatedProducts as Product[],
        };
      }

      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Failed to fetch products by subcategory',
        message: error?.message || 'Failed to fetch products by subcategory',
      };
    }
  }

  // Get products by store
  async getProductsByStore(
    storeId: string, 
    query: Omit<ProductsQuery, 'store'> = {}
  ): Promise<ApiResponse<ProductsResponse>> {
    return apiClient.get(`/products/store/${storeId}`, query);
  }

  // Get product recommendations
  async getRecommendations(
    productId: string, 
    limit: number = 5
  ): Promise<ApiResponse<Product[]>> {
    return apiClient.get(`/products/${productId}/recommendations`, { limit });
  }

  // Get related products
  async getRelatedProducts(
    productId: string,
    limit: number = 10
  ): Promise<ApiResponse<ProductItem[]>> {
    try {
      // Try to fetch from real API first
      const response = await apiClient.get<ProductItem[]>(`/products/${productId}/related`, { limit });

      if (response.success && response.data && Array.isArray(response.data)) {
        // Validate and normalize related products
        const validatedProducts = validateProductArray(response.data);
        return {
          success: true,
          data: validatedProducts,
          message: response.message,
        };
      }

      // If API response is not successful, return error
      if (!response.success) {
        // Don't return mock data on API errors in production
        return {
          success: false,
          error: response.error || 'Failed to fetch related products',
          message: response.error || 'Failed to fetch related products',
          data: [], // Return empty array instead of undefined
        };
      }

      // If API returns invalid data structure
      return {
        success: false,
        error: 'Invalid response format',
        message: 'Invalid response format from server',
        data: [],
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Failed to fetch related products',
        message: error?.message || 'Failed to fetch related products',
        data: [],
      };
    }
  }

  // Get search suggestions
  async getSearchSuggestions(query: string): Promise<ApiResponse<string[]>> {
    return apiClient.get('/products/suggestions', { q: query });
  }

  // Get popular search terms
  async getPopularSearches(limit: number = 10): Promise<ApiResponse<string[]>> {
    return apiClient.get('/products/popular-searches', { limit });
  }

  // Track product view (updated endpoint)
  async trackProductView(productId: string): Promise<ApiResponse<any>> {
    return apiClient.post(`/products/${productId}/track-view`);
  }

  // Get product analytics
  async getProductAnalytics(productId: string, location?: any): Promise<ApiResponse<any>> {
    const params = location ? { location: JSON.stringify(location) } : {};
    return apiClient.get(`/products/${productId}/analytics`, params);
  }

  // Get frequently bought together products
  async getFrequentlyBoughtTogether(productId: string, limit: number = 4): Promise<ApiResponse<Product[]>> {
    return apiClient.get(`/products/${productId}/frequently-bought`, { limit });
  }

  // Get bundle products
  async getBundleProducts(productId: string): Promise<ApiResponse<any>> {
    return apiClient.get(`/products/${productId}/bundles`);
  }

  // Get product availability
  async checkAvailability(
    productId: string, 
    variantId?: string, 
    quantity: number = 1
  ): Promise<ApiResponse<{ available: boolean; maxQuantity: number }>> {
    return apiClient.get(`/products/${productId}/availability`, {
      variantId,
      quantity
    });
  }

  // ===== FRONTEND HOMEPAGE INTEGRATION METHODS =====

  /**
   * Get featured products for "Just for You" section - Returns formatted RecommendationItems
   */
  async getFeaturedForHomepage(limit: number = 10): Promise<RecommendationItem[]> {
    try {

      const response = await apiClient.get('/products/featured', { limit });

      if (response.success && response.data && Array.isArray(response.data)) {
        // Validate and normalize products first
        const validatedProducts = validateProductArray(response.data);

        const recommendations = validatedProducts.map((product: ProductItem) => ({
          ...product,
          recommendationReason: this.generateRecommendationReason(product),
          recommendationScore: Math.random() * 0.5 + 0.5, // Generate score between 0.5-1.0
          personalizedFor: this.determinePersonalization(product)
        }));

        return recommendations;
      }

      throw new Error(response.message || 'Failed to fetch featured products');
    } catch (error) {
      // Return empty array on error to prevent homepage crash
      return [];
    }
  }

  /**
   * Get new arrival products for "New Arrivals" section - Returns formatted ProductItems
   */
  async getNewArrivalsForHomepage(limit: number = 10): Promise<ProductItem[]> {
    try {

      const response = await apiClient.get('/products/new-arrivals', { limit });

      if (response.success && response.data && Array.isArray(response.data)) {
        // Validate and normalize products
        const validatedProducts = validateProductArray(response.data);
        return validatedProducts;
      }

      throw new Error(response.message || 'Failed to fetch new arrivals');
    } catch (error) {
      // Return empty array on error to prevent homepage crash
      return [];
    }
  }

  /**
   * Get products by store for StorePage - Returns store and products data
   */
  async getStoreProducts(
    storeId: string, 
    options?: {
      category?: string;
      minPrice?: number;
      maxPrice?: number;
      sortBy?: 'price_low' | 'price_high' | 'rating' | 'newest';
      page?: number;
      limit?: number;
    }
  ): Promise<{ store: any; products: ProductItem[] } | null> {
    try {
      const queryParams = {
        category: options?.category,
        minPrice: options?.minPrice,
        maxPrice: options?.maxPrice,
        sortBy: options?.sortBy || 'newest',
        page: options?.page || 1,
        limit: options?.limit || 20
      };

      // Filter out undefined values
      const cleanParams = Object.fromEntries(
        Object.entries(queryParams).filter(([_, v]) => v !== undefined)
      );
      
      const response = await apiClient.get(`/products/store/${storeId}`, cleanParams);
      
      if (response.success && response.data) {
        // API returns paginated response, extract the first item which contains store and products
        const result = Array.isArray(response.data) ? response.data[0] : response.data;
        return result;
      }

      throw new Error(response.message || 'Failed to fetch store products');
    } catch (error) {
      return null;
    }
  }

  /**
   * Get single product details for StorePage dynamic content
   */
  async getProductDetails(productId: string): Promise<(ProductItem & { similarProducts?: ProductItem[] }) | null> {
    try {
      // Validate productId format (MongoDB ObjectIds are 24 hex characters)
      if (!productId || productId.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(productId)) {
        return null;
      }

      const response = await apiClient.get<ProductItem & { similarProducts?: ProductItem[] }>(`/products/${productId}`);

      if (response.success && response.data) {
        // Validate and normalize product
        const validatedProduct = validateProduct(response.data);

        if (validatedProduct) {
          // Validate similar products if they exist
          const result: ProductItem & { similarProducts?: ProductItem[] } = validatedProduct;

          if (response.data.similarProducts && Array.isArray(response.data.similarProducts)) {
            result.similarProducts = validateProductArray(response.data.similarProducts);
          }

          return result;
        }
      }

      throw new Error(response.message || 'Failed to fetch product details');
    } catch (error) {
      // Don't log errors for invalid IDs to avoid spam
      if ((error as any).message?.includes('Invalid MongoDB ObjectId')) {
      } else {
      }
      return null;
    }
  }

  /**
   * Check if backend API is available
   */
  async isBackendAvailable(): Promise<boolean> {
    try {
      // Use 10s timeout for health checks (Render cold starts can take 10-15s)
      const response = await apiClient.get('/products/featured', { limit: 1 }, { timeout: 10000 });
      return response.success === true;
    } catch (error) {
      return false;
    }
  }

  // ===== HELPER METHODS =====

  /**
   * Generate recommendation reason based on product data
   */
  private generateRecommendationReason(product: ProductItem): string {
    const reasons = [
      'Based on your recent purchases',
      'Popular in your area',
      'Trending in your interests',
      'Recommended for you',
      'Perfect for your preferences',
      'Others like you also bought this',
      'Based on your browsing history'
    ];

    // Use product category to generate contextual reasons
    const category = product.category?.toLowerCase() || '';
    if (category.includes('home') || category.includes('furniture')) {
      return 'Based on your home office setup';
    }
    if (category.includes('sports') || category.includes('fitness')) {
      return 'Perfect for your fitness goals';
    }
    if (category.includes('beauty')) {
      return 'Matches your beauty routine';
    }
    if (category.includes('candle') || category.includes('decor')) {
      return 'Based on your home decor interest';
    }

    return reasons[Math.floor(Math.random() * reasons.length)];
  }

  /**
   * Determine personalization category
   */
  private determinePersonalization(product: ProductItem): string {
    const category = product.category?.toLowerCase() || '';

    if (category.includes('home') || category.includes('furniture')) return 'home_office';
    if (category.includes('sports') || category.includes('fitness')) return 'fitness';
    if (category.includes('beauty') || category.includes('personal')) return 'beauty';
    if (category.includes('book') || category.includes('education')) return 'books';
    if (category.includes('health') || category.includes('wellness')) return 'wellness';
    if (category.includes('candle') || category.includes('decor')) return 'home_decor';

    return 'general';
  }

}

// Create singleton instance
const productsService = new ProductsService();

// Named export for compatibility
export { productsService as productsApi };

export default productsService;
