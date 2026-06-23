// Product Gallery API Service
// Handles all gallery-related API calls for product pages

import apiClient from './apiClient';

export interface ProductGalleryItem {
  id: string;
  url: string;
  thumbnail?: string;
  type: 'image' | 'video';
  category: string;
  title?: string;
  description?: string;
  variantId?: string;
  tags?: string[];
  order: number;
  isCover?: boolean;
  isVisible?: boolean;
  views: number;
  likes: number;
  shares: number;
  uploadedAt: string;
}

export interface ProductGalleryCategory {
  name: string;
  count: number;
  coverImage?: string;
}

export interface ProductGalleryResponse {
  items: ProductGalleryItem[];
  categories: ProductGalleryCategory[];
  total: number;
  limit: number;
  offset: number;
}

export interface ProductGalleryFilters {
  category?: string;
  variantId?: string;
  type?: 'image' | 'video';
  limit?: number;
  offset?: number;
  sortBy?: 'order' | 'uploadedAt' | 'views';
  sortOrder?: 'asc' | 'desc';
}

const productGalleryApi = {
  /**
   * Get gallery items for a product
   */
  async getGallery(
    productId: string,
    filters: ProductGalleryFilters = {}
  ): Promise<ProductGalleryResponse> {
    try {
      const queryParams = new URLSearchParams();

      if (filters.category) queryParams.append('category', filters.category);
      if (filters.variantId) queryParams.append('variantId', filters.variantId);
      if (filters.type) queryParams.append('type', filters.type);
      if (filters.limit) queryParams.append('limit', filters.limit.toString());
      if (filters.offset) queryParams.append('offset', filters.offset.toString());
      if (filters.sortBy) queryParams.append('sortBy', filters.sortBy);
      if (filters.sortOrder) queryParams.append('sortOrder', filters.sortOrder);

      const queryString = queryParams.toString();
      const url = `/products/${productId}/gallery${queryString ? `?${queryString}` : ''}`;

      const response = await apiClient.get<ProductGalleryResponse>(url);

      if (response.data) {
        const data = response.data;
        // Ensure all items have required fields with defaults
        return {
          items: (data.items || []).map(item => ({
            ...item,
            order: item.order ?? 0,
            isCover: item.isCover ?? false,
            isVisible: item.isVisible ?? true,
            views: item.views ?? 0,
            likes: item.likes ?? 0,
            shares: item.shares ?? 0,
          })),
          categories: data.categories || [],
          total: data.total || 0,
          limit: data.limit || 50,
          offset: data.offset || 0,
        };
      }

      throw new Error('Invalid response from server');
    } catch (error: any) {
      throw error;
    }
  },

  /**
   * Get gallery categories for a product
   */
  async getCategories(productId: string): Promise<ProductGalleryCategory[]> {
    try {
      const response = await apiClient.get<{ categories: ProductGalleryCategory[] }>(
        `/products/${productId}/gallery/categories`
      );
      return response.data?.categories || [];
    } catch (error) {
      return [];
    }
  },

  /**
   * Get single gallery item
   */
  async getItem(productId: string, itemId: string): Promise<ProductGalleryItem> {
    try {
      const response = await apiClient.get<{ item: ProductGalleryItem }>(
        `/products/${productId}/gallery/${itemId}`
      );

      if (response.data?.item) {
        return response.data.item;
      }

      throw new Error('Gallery item not found');
    } catch (error: any) {
      throw error;
    }
  },
};

export default productGalleryApi;
