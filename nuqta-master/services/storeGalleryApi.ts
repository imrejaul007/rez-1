// Store Gallery API Service
// Handles all gallery-related API calls for the user app

import apiClient from './apiClient';

export interface GalleryItem {
  id: string;
  url: string;
  thumbnail?: string;
  type: 'image' | 'video';
  category: string;
  title?: string;
  description?: string;
  tags?: string[];
  order: number;
  isCover?: boolean;
  views: number;
  likes: number;
  shares: number;
  uploadedAt: string;
}

export interface GalleryCategory {
  name: string;
  count: number;
  coverImage?: string; // Cover image URL for the category
}

export interface GalleryResponse {
  items: GalleryItem[];
  categories: GalleryCategory[];
  total: number;
  limit: number;
  offset: number;
}

export interface GalleryFilters {
  category?: string;
  type?: 'image' | 'video';
  limit?: number;
  offset?: number;
  sortBy?: 'order' | 'uploadedAt' | 'views';
  sortOrder?: 'asc' | 'desc';
}

const storeGalleryApi = {
  /**
   * Get gallery items for a store
   */
  async getGallery(
    storeId: string,
    filters: GalleryFilters = {}
  ): Promise<GalleryResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.type) queryParams.append('type', filters.type);
      if (filters.limit) queryParams.append('limit', filters.limit.toString());
      if (filters.offset) queryParams.append('offset', filters.offset.toString());
      if (filters.sortBy) queryParams.append('sortBy', filters.sortBy);
      if (filters.sortOrder) queryParams.append('sortOrder', filters.sortOrder);

      const queryString = queryParams.toString();
      const url = `/stores/${storeId}/gallery${queryString ? `?${queryString}` : ''}`;

      const response = await apiClient.get<GalleryResponse>(url);
      
      if (response.data) {
        const data = response.data;
        // Ensure all items have required fields with defaults
        return {
          items: (data.items || []).map(item => ({
            ...item,
            order: item.order ?? 0,
            isCover: item.isCover ?? false,
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
      
      throw new Error('Invalid response format');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch gallery');
    }
  },

  /**
   * Get gallery categories for a store
   */
  async getCategories(storeId: string): Promise<GalleryCategory[]> {
    try {
      const response = await apiClient.get<{ categories: GalleryCategory[] }>(
        `/stores/${storeId}/gallery/categories`
      );
      
      if (response.data) {
        // Handle both response formats
        let categories: GalleryCategory[] = [];
        if (Array.isArray(response.data)) {
          categories = response.data;
        } else if (response.data.categories && Array.isArray(response.data.categories)) {
          categories = response.data.categories;
        }
        
        // Ensure coverImage is included in each category
        return categories.map(cat => ({
          name: cat.name,
          count: cat.count,
          coverImage: cat.coverImage || undefined,
        }));
      }
      
      return [];
    } catch (error: any) {
      return [];
    }
  },

  /**
   * Track view for a gallery item
   */
  async trackView(storeId: string, itemId: string): Promise<number> {
    try {
      const response = await apiClient.post<{ views: number }>(`/stores/${storeId}/gallery/${itemId}/view`);
      return response.data?.views ?? 0;
    } catch (error: any) {
      // Silently fail - view tracking is not critical
      return 0;
    }
  },
};

export default storeGalleryApi;

