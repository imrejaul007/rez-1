// Exclusive Offers API Service
// Handles exclusive offers for target audiences (student, women, senior, etc.)

import apiClient, { ApiResponse } from './apiClient';

export interface ExclusiveOffer {
  _id: string;
  title: string;
  icon: string;
  discount: string;
  description: string;
  color: string;
  gradient: string[];
  targetAudience: 'student' | 'women' | 'senior' | 'corporate' | 'birthday' | 'first' | 'all';
  validFrom: string;
  validTo: string;
  isActive: boolean;
  sortOrder: number;
}

interface GetExclusiveOffersParams {
  category?: string;
  targetAudience?: string;
  limit?: number;
}

class ExclusiveOffersApiService {
  private baseUrl = '/exclusive-offers';

  /**
   * Get all active exclusive offers
   */
  async getOffers(params?: GetExclusiveOffersParams): Promise<ApiResponse<{ offers: ExclusiveOffer[] }>> {
    return apiClient.get(this.baseUrl, params);
  }

  /**
   * Get exclusive offer by ID
   */
  async getOfferById(id: string): Promise<ApiResponse<{ offer: ExclusiveOffer }>> {
    return apiClient.get(`${this.baseUrl}/${id}`);
  }

  /**
   * Get exclusive offers for a specific category
   */
  async getOffersByCategory(categorySlug: string, limit: number = 10): Promise<ApiResponse<{ offers: ExclusiveOffer[] }>> {
    return apiClient.get(this.baseUrl, { category: categorySlug, limit });
  }

  /**
   * Get exclusive offers for a specific target audience
   */
  async getOffersByAudience(targetAudience: string, limit: number = 10): Promise<ApiResponse<{ offers: ExclusiveOffer[] }>> {
    return apiClient.get(this.baseUrl, { targetAudience, limit });
  }
}

// Export singleton instance
const exclusiveOffersApi = new ExclusiveOffersApiService();
export default exclusiveOffersApi;
