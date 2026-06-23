// Category Metadata API Service
// Handles vibes, occasions, and trending hashtags for category pages

import apiClient, { ApiResponse } from './apiClient';

export interface Vibe {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
}

export interface Occasion {
  id: string;
  name: string;
  icon: string;
  color: string;
  tag?: string | null;
  discount: number;
}

export interface TrendingHashtag {
  id: string;
  tag: string;
  count: number;
  color: string;
  trending: boolean;
}

class CategoryMetadataApiService {
  private baseUrl = '/categories';

  /**
   * Get vibes for a category
   */
  async getVibes(categorySlug: string): Promise<ApiResponse<{ vibes: Vibe[] }>> {
    return apiClient.get(`${this.baseUrl}/${categorySlug}/vibes`);
  }

  /**
   * Get occasions for a category
   */
  async getOccasions(categorySlug: string): Promise<ApiResponse<{ occasions: Occasion[] }>> {
    return apiClient.get(`${this.baseUrl}/${categorySlug}/occasions`);
  }

  /**
   * Get trending hashtags for a category
   */
  async getHashtags(categorySlug: string): Promise<ApiResponse<{ hashtags: TrendingHashtag[] }>> {
    return apiClient.get(`${this.baseUrl}/${categorySlug}/hashtags`);
  }

  /**
   * Get all category metadata at once
   */
  async getAllMetadata(categorySlug: string): Promise<{
    vibes: Vibe[];
    occasions: Occasion[];
    hashtags: TrendingHashtag[];
  }> {
    const [vibesRes, occasionsRes, hashtagsRes] = await Promise.all([
      this.getVibes(categorySlug),
      this.getOccasions(categorySlug),
      this.getHashtags(categorySlug)
    ]);

    return {
      vibes: vibesRes.success && vibesRes.data ? vibesRes.data.vibes : [],
      occasions: occasionsRes.success && occasionsRes.data ? occasionsRes.data.occasions : [],
      hashtags: hashtagsRes.success && hashtagsRes.data ? hashtagsRes.data.hashtags : []
    };
  }
}

// Export singleton instance
const categoryMetadataApi = new CategoryMetadataApiService();
export default categoryMetadataApi;
