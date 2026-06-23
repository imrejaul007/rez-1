// Search API Service
// Handles search operations for products, stores, and general queries

import apiClient, { ApiResponse } from './apiClient';

// Product search interfaces
export interface ProductSearchParams {
  q: string; // Search query
  category?: string; // Category ID
  store?: string; // Store ID
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  inStock?: boolean;
  page?: number;
  limit?: number;
}

export interface ProductSearchResult {
  _id: string;
  title: string;
  name: string;
  slug: string;
  sku: string;
  brand?: string;
  description: string;
  image: string;
  price: {
    current: number;
    original: number;
    currency: string;
    discount: number;
  };
  category: {
    _id: string;
    name: string;
    slug: string;
  };
  rating: {
    value: number;
    count: number;
  };
  availabilityStatus: string;
  tags: string[];
  store: {
    _id: string;
    name: string;
    logo: string;
    location: {
      city: string;
    };
  };
  isRecommended?: boolean;
  isFeatured?: boolean;
}

export interface ProductSearchResponse {
  products: ProductSearchResult[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: {
    categories: Array<{ id: string; name: string; count: number }>;
    brands: Array<{ name: string; count: number }>;
    priceRange: { min: number; max: number };
  };
}

// Store search interfaces
export interface StoreSearchParams {
  q: string; // Search query
  page?: number;
  limit?: number;
}

export interface AdvancedStoreSearchParams {
  search?: string;
  category?: 'fastDelivery' | 'budgetFriendly' | 'premium' | 'organic' | 'alliance' | 'lowestPrice' | 'mall' | 'cashStore';
  deliveryTime?: string; // "15-30" format
  priceRange?: string; // "0-100" format
  rating?: number;
  paymentMethods?: string; // "cash,card,upi" format
  features?: string; // "freeDelivery,walletPayment,verified,featured" format
  sortBy?: 'rating' | 'distance' | 'name' | 'newest' | 'price';
  location?: string; // "lng,lat" format
  radius?: number;
  page?: number;
  limit?: number;
}

export interface StoreSearchResult {
  _id: string;
  name: string;
  slug: string;
  logo: string;
  description: string;
  rating: {
    value: number;
    count: number;
  };
  location: {
    address: string;
    city: string;
    state: string;
    coordinates?: {
      type: string;
      coordinates: [number, number];
    };
  };
  categories: string[];
  isOpen: boolean;
  deliveryTime?: number;
  minimumOrder?: number;
  tags: string[];
}

export interface StoreSearchResponse {
  stores: StoreSearchResult[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters?: {
    categories: Array<{ id: string; name: string; count: number }>;
    deliveryTimes: Array<{ range: string; count: number }>;
  };
}

// Search suggestions interface
export interface SearchSuggestion {
  text: string;
  type: 'product' | 'store' | 'category';
  productId?: string;
  storeId?: string;
  categoryId?: string;
  count?: number;
}

class SearchService {
  // Search products.
  //
  // Returns the unwrapped payload directly so callers (and integration
  // tests) can access `result.products`, `result.filters`, etc. without
  // going through `.data`.
  async searchProducts(
    queryOrParams: string | ProductSearchParams,
    filters?: { category?: string; minPrice?: number; maxPrice?: number }
  ): Promise<ProductSearchResponse> {
    try {
      const response = typeof queryOrParams === 'string'
        ? await apiClient.get('/products/search', { q: queryOrParams, ...(filters || {}) })
        : await apiClient.get('/products/search', queryOrParams);

      if (response && response.success && response.data) {
        return response.data as ProductSearchResponse;
      }
      if (response && (response as any).products) {
        return response as any;
      }
      return response as any;
    } catch (error: any) {
      throw error;
    }
  }

  // Search stores
  async searchStores(params: StoreSearchParams): Promise<ApiResponse<StoreSearchResponse>> {

    return apiClient.get('/stores/search', params);
  }

  // Advanced store search with filters
  async advancedStoreSearch(params: AdvancedStoreSearchParams): Promise<ApiResponse<StoreSearchResponse>> {

    return apiClient.get('/stores/search/advanced', params);
  }

  // Get search suggestions from autocomplete endpoint.
  //
  // Returns `{ suggestions: SearchSuggestion[] }` (unwrapping the API
  // envelope and exposing the suggestions array directly) so callers
  // (and integration tests) can use `result.suggestions` without going
  // through `.data`.
  async getSearchSuggestions(query: string): Promise<{ suggestions: SearchSuggestion[] }> {
    try {
      const response = await apiClient.get('/search/autocomplete', { q: query });
      const suggestions: SearchSuggestion[] = [];
      const data: any = response && response.success ? response.data : response;

      // If the backend already returned a `{ suggestions: [...] }` payload,
      // normalize each entry into the SearchSuggestion shape.
      if (data && Array.isArray(data.suggestions)) {
        data.suggestions.forEach((entry: any) => {
          if (typeof entry === 'string') {
            suggestions.push({ text: entry, type: 'product', count: 1 });
          } else if (entry && entry.text) {
            suggestions.push(entry as SearchSuggestion);
          }
        });
        return { suggestions };
      }

      // Map products
      if (data && data.products && Array.isArray(data.products)) {
        data.products.slice(0, 3).forEach((p: any) => {
          suggestions.push({
            text: p.name,
            type: 'product',
            productId: p._id,
            count: 1,
          });
        });
      }

      // Map stores
      if (data && data.stores && Array.isArray(data.stores)) {
        data.stores.slice(0, 2).forEach((s: any) => {
          suggestions.push({
            text: s.name,
            type: 'store',
            storeId: s._id,
            count: 1,
          });
        });
      }

      // Map categories
      if (data && data.categories && Array.isArray(data.categories)) {
        data.categories.slice(0, 2).forEach((c: any) => {
          suggestions.push({
            text: c.name,
            type: 'category',
            categoryId: c._id,
            count: 1,
          });
        });
      }

      return { suggestions };
    } catch {
      return { suggestions: [] };
    }
  }

  // Search by category
  async searchByCategory(
    categorySlug: string,
    params?: {
      minPrice?: number;
      maxPrice?: number;
      rating?: number;
      sortBy?: 'price_low' | 'price_high' | 'rating' | 'newest';
      page?: number;
      limit?: number;
    }
  ): Promise<ApiResponse<ProductSearchResponse>> {

    return apiClient.get(`/products/category/${categorySlug}`, params);
  }

  // Search stores by category
  async searchStoresByCategory(
    category: string,
    params?: {
      location?: string;
      radius?: number;
      page?: number;
      limit?: number;
      sortBy?: 'rating' | 'distance' | 'name' | 'newest';
    }
  ): Promise<ApiResponse<StoreSearchResponse>> {

    return apiClient.get(`/stores/search-by-category/${category}`, params);
  }

  // Search stores by delivery time
  async searchStoresByDeliveryTime(
    params: {
      minTime?: number;
      maxTime?: number;
      location?: string;
      radius?: number;
      page?: number;
      limit?: number;
    }
  ): Promise<ApiResponse<StoreSearchResponse>> {

    return apiClient.get('/stores/search-by-delivery-time', params);
  }

  // Get nearby stores (useful for location-based search)
  async getNearbyStores(
    params: {
      lng: number;
      lat: number;
      radius?: number;
      limit?: number;
    }
  ): Promise<ApiResponse<StoreSearchResponse>> {

    return apiClient.get('/stores/nearby', params);
  }

  // Search products by store
  async searchProductsByStore(
    storeId: string,
    params?: {
      category?: string;
      search?: string;
      sortBy?: 'price_low' | 'price_high' | 'rating' | 'newest' | 'popular';
      page?: number;
      limit?: number;
    }
  ): Promise<ApiResponse<ProductSearchResponse>> {

    return apiClient.get(`/stores/${storeId}/products`, params);
  }

  // Get featured products (useful for search homepage)
  async getFeaturedProducts(limit: number = 10): Promise<ApiResponse<{ data: ProductSearchResult[] }>> {

    return apiClient.get('/products/featured', { limit });
  }

  // Get new arrivals (useful for search homepage)
  async getNewArrivals(limit: number = 10): Promise<ApiResponse<{ data: ProductSearchResult[] }>> {

    return apiClient.get('/products/new-arrivals', { limit });
  }

  // Get featured stores (useful for search homepage)
  async getFeaturedStores(limit: number = 10): Promise<ApiResponse<{ stores: StoreSearchResult[] }>> {

    return apiClient.get('/stores/featured', { limit });
  }

  // Search products grouped by name with seller comparison
  async searchProductsGrouped(
    params: {
      q: string;
      limit?: number;
      lat?: number;
      lon?: number;
      minPrice?: number;
      maxPrice?: number;
      rating?: number;
      categories?: string;
      cashbackMin?: number;
      inStock?: boolean;
    }
  ): Promise<ApiResponse<{
    groupedProducts: any[];
    matchingStores?: any[];
    summary: {
      sellerCount: number;
      minPrice: number;
      maxCashback: number;
      priceRange: { min: number; max: number };
    };
    total: number;
    hasMore: boolean;
  }>> {
    return apiClient.get('/search/products-grouped', params);
  }

  // Get "Did you mean?" typo correction suggestions
  async getDidYouMean(query: string): Promise<string[]> {
    try {
      const response = await apiClient.get<{ suggestions: string[] }>('/search/did-you-mean', { q: query });
      if (response.success && response.data?.suggestions) {
        return response.data.suggestions;
      }
      return [];
    } catch {
      return [];
    }
  }

  // Global search across products and stores (used by integration tests).
  //
  // Returns the payload directly (unwrapping the API envelope) so callers
  // (and integration tests) can access `results.products`, `results.stores`,
  // etc. without going through `.data`.
  async globalSearch(query: string): Promise<{ products: ProductSearchResult[]; stores: StoreSearchResult[]; filters?: any }> {
    try {
      const response = await apiClient.get<{ products: ProductSearchResult[]; stores: StoreSearchResult[]; filters?: any }>('/search/global', { q: query });
      if (response && response.success && response.data) {
        return response.data;
      }
      if (response && (response as any).products) {
        return response as any;
      }
      return response as any;
    } catch (error: any) {
      // Re-throw to preserve error shape for callers/tests
      throw error;
    }
  }

  // Save a search query to the user's history
  async saveSearchQuery(query: string): Promise<ApiResponse<{ saved: boolean }>> {
    try {
      const response = await apiClient.post<{ saved: boolean }>('/search/history', { query });
      return response;
    } catch (error: any) {
      throw error;
    }
  }
}

// Create singleton instance
const searchService = new SearchService();
// Alias used by some callers/tests
const searchApi = searchService;

export default searchService;
export { searchService, searchApi };