// Bank Offers API Service
// Handles bank/card discount offers for category pages

import apiClient, { ApiResponse } from './apiClient';

export interface BankOffer {
  _id: string;
  bank: string;
  icon: string;
  offer: string;
  maxDiscount: number;
  minOrder: number;
  cardType: string;
  validFrom: string;
  validTo: string;
  isActive: boolean;
  sortOrder: number;
}

interface GetBankOffersParams {
  category?: string;
  limit?: number;
}

class BankOffersApiService {
  private baseUrl = '/bank-offers';

  /**
   * Get all active bank offers
   */
  async getOffers(params?: GetBankOffersParams): Promise<ApiResponse<{ offers: BankOffer[] }>> {
    return apiClient.get(this.baseUrl, params);
  }

  /**
   * Get bank offer by ID
   */
  async getOfferById(id: string): Promise<ApiResponse<{ offer: BankOffer }>> {
    return apiClient.get(`${this.baseUrl}/${id}`);
  }

  /**
   * Get bank offers for a specific category
   */
  async getOffersByCategory(categorySlug: string, limit: number = 10): Promise<ApiResponse<{ offers: BankOffer[] }>> {
    return apiClient.get(this.baseUrl, { category: categorySlug, limit });
  }
}

// Export singleton instance
const bankOffersApi = new BankOffersApiService();
export default bankOffersApi;
