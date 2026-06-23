/**
 * Experiences API Service
 * Handles store experiences for homepage sections
 */

import apiClient, { ApiResponse } from './apiClient';

// Store Experience interface
export interface StoreExperience {
  _id: string;
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  icon: string;
  iconType: 'emoji' | 'url' | 'icon-name';
  type: string;
  badge?: string;
  badgeBg?: string;
  badgeColor?: string;
  backgroundColor?: string;
  storeCount?: number;
  sortOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  benefits?: string[];
}

// Homepage Experience format
export interface HomepageExperience {
  icon: string;
  title: string;
  type: string;
  badge?: string;
  subtitle?: string;
}

class ExperiencesService {
  /**
   * Get all active experiences
   */
  async getExperiences(params?: {
    featured?: boolean;
    limit?: number;
    category?: string;
  }): Promise<ApiResponse<{
    experiences: StoreExperience[];
    total: number;
  }>> {
    try {
      const response = await apiClient.get<{
        experiences: StoreExperience[];
        total: number;
      }>('/experiences', {
        ...(params?.featured && { featured: 'true' }),
        ...(params?.category && { category: params.category }),
        limit: params?.limit || 10,
      });

      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Failed to fetch experiences',
        message: error?.message || 'Failed to fetch experiences',
      };
    }
  }

  /**
   * Get experiences for homepage section
   */
  async getHomepageExperiences(limit: number = 4): Promise<ApiResponse<{
    experiences: HomepageExperience[];
    total: number;
  }>> {
    try {
      const response = await apiClient.get<{
        experiences: HomepageExperience[];
        total: number;
      }>('/experiences/homepage', { limit });

      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Failed to fetch experiences',
        message: error?.message || 'Failed to fetch experiences',
      };
    }
  }

  /**
   * Get experience by ID or slug
   */
  async getExperienceById(experienceId: string): Promise<ApiResponse<StoreExperience>> {
    try {
      const response = await apiClient.get<StoreExperience>(`/experiences/${experienceId}`);

      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Failed to fetch experience',
        message: error?.message || 'Failed to fetch experience',
      };
    }
  }

  /**
   * Get stores by experience
   */
  async getStoresByExperience(experienceId: string, params?: {
    page?: number;
    limit?: number;
    location?: string;
    q?: string;
  }): Promise<ApiResponse<{
    experience: StoreExperience;
    stores: any[];
    pagination: any;
  }>> {
    try {
      const response = await apiClient.get<{
        experience: StoreExperience;
        stores: any[];
        pagination: any;
      }>(`/experiences/${experienceId}/stores`, {
        page: params?.page || 1,
        limit: params?.limit || 20,
        ...(params?.location && { location: params.location }),
        ...(params?.q && { q: params.q }),
      });

      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Failed to fetch stores',
        message: error?.message || 'Failed to fetch stores',
      };
    }
  }

  /**
   * Get unique finds
   */
  async getUniqueFinds(limit: number = 10, experience?: string): Promise<ApiResponse<any[]>> {
    try {
      const response = await apiClient.get<any[]>('/experiences/unique-finds', {
        limit,
        ...(experience && { experience }),
      });
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Failed to fetch unique finds',
        message: error?.message || 'Failed to fetch unique finds',
      };
    }
  }
}

// Create singleton instance
const experiencesService = new ExperiencesService();

// Named export for compatibility
export { experiencesService as experiencesApi };

export default experiencesService;
