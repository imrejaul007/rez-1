// Discounts API Client
// Handles all discount-related API calls

import apiClient, { ApiResponse } from './apiClient';

// Types
export interface Discount {
  _id: string;
  code?: string;
  name: string;
  description?: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrderValue: number;
  maxDiscountAmount?: number;
  applicableOn: 'bill_payment' | 'card_payment' | 'all' | 'specific_products' | 'specific_categories';
  validFrom: string;
  validUntil: string;
  usageLimit?: number;
  usageLimitPerUser?: number;
  usedCount: number;
  isActive: boolean;
  priority: number;
  metadata?: {
    displayText?: string;
    icon?: string;
    backgroundColor?: string;
    cardImageUrl?: string;
    bankLogoUrl?: string;
    offerBadge?: string;
  };
  // Card Offer Specific Fields
  paymentMethod?: 'upi' | 'card' | 'all';
  cardType?: 'credit' | 'debit' | 'all';
  bankNames?: string[];
  cardBins?: string[];
  restrictions?: {
    isOfflineOnly?: boolean;
    notValidAboveStoreDiscount?: boolean;
    singleVoucherPerBill?: boolean;
  };
  discountAmount?: number;
  canApply?: boolean;
}

export interface DiscountUsageHistory {
  _id: string;
  discount: {
    _id: string;
    name: string;
    code?: string;
    type: string;
    value: number;
  };
  order: {
    _id: string;
    orderNumber: string;
    status: string;
  };
  discountAmount: number;
  orderValue: number;
  usedAt: string;
}

export interface ValidateDiscountRequest {
  code: string;
  orderValue: number;
  productIds?: string[];
  categoryIds?: string[];
}

export interface ValidateDiscountResponse {
  valid: boolean;
  discount: {
    _id: string;
    code?: string;
    name: string;
    type: string;
    value: number;
    discountAmount: number;
    finalAmount: number;
  };
}

export interface ApplyDiscountRequest {
  discountId: string;
  orderId: string;
  orderValue: number;
}

export interface ApplyDiscountResponse {
  discountAmount: number;
  finalAmount: number;
  usageId: string;
}

class DiscountsApi {
  /**
   * Get all discounts with filters
   */
  async getDiscounts(params?: {
    applicableOn?: string;
    type?: string;
    minValue?: number;
    maxValue?: number;
    sortBy?: string;
    order?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ discounts: Discount[]; total: number; page: number; limit: number }>> {
    try {
      const response = await apiClient.get<any>('/discounts', params);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get single discount by ID
   */
  async getDiscountById(id: string): Promise<ApiResponse<Discount>> {
    try {
      const response = await apiClient.get<Discount>(`/discounts/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get discounts for a specific product
   */
  async getDiscountsForProduct(
    productId: string,
    orderValue?: number
  ): Promise<ApiResponse<Discount[]>> {
    try {
      const response = await apiClient.get<Discount[]>(
        `/discounts/product/${productId}`,
        orderValue ? { orderValue } : undefined
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get bill payment discounts
   * Phase 2: Added storeId parameter for store-specific filtering
   */
  async getBillPaymentDiscounts(
    orderValue?: number,
    storeId?: string
  ): Promise<ApiResponse<Discount[]>> {
    try {
      const params: any = {};
      if (orderValue !== undefined) params.orderValue = orderValue;
      if (storeId) params.storeId = storeId;
      
      const response = await apiClient.get<Discount[]>(
        '/discounts/bill-payment',
        Object.keys(params).length > 0 ? params : undefined
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Validate discount code
   */
  async validateDiscount(
    data: ValidateDiscountRequest
  ): Promise<ApiResponse<ValidateDiscountResponse>> {
    try {
      const response = await apiClient.post<ValidateDiscountResponse>(
        '/discounts/validate',
        data
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Apply discount to order (authenticated users only)
   */
  async applyDiscount(
    data: ApplyDiscountRequest
  ): Promise<ApiResponse<ApplyDiscountResponse>> {
    try {
      const response = await apiClient.post<ApplyDiscountResponse>('/discounts/apply', data);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user's discount usage history (authenticated users only)
   */
  async getUserDiscountHistory(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ history: DiscountUsageHistory[]; total: number }>> {
    try {
      const response = await apiClient.get<any>('/discounts/my-history', params);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get analytics for a discount (admin only)
   */
  async getDiscountAnalytics(id: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get<any>(`/discounts/${id}/analytics`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get card offers for a store
   */
  async getCardOffers(params?: {
    storeId?: string;
    orderValue?: number;
    cardType?: 'credit' | 'debit' | 'all';
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ discounts: Discount[]; total: number; page: number; limit: number }>> {
    try {
      const queryParams: any = {
        applicableOn: 'card_payment', // Card offers use card_payment, not bill_payment
        paymentMethod: 'card',
        ...params,
      };

      const response = await apiClient.get<any>('/discounts', queryParams);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Validate card for offers
   */
  async validateCardForOffers(data: {
    cardNumber: string;
    storeId: string;
    orderValue: number;
  }): Promise<ApiResponse<{ eligible: boolean; offers: Discount[]; bestOffer?: Discount }>> {
    try {
      const response = await apiClient.post<any>('/discounts/card-offers/validate', data);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Apply card offer
   */
  async applyCardOffer(data: {
    discountId: string;
    orderId?: string;
    cardLast4?: string;
  }): Promise<ApiResponse<{ success: boolean; discountAmount: number }>> {
    try {
      const response = await apiClient.post<any>('/discounts/card-offers/apply', data);
      return response;
    } catch (error) {
      throw error;
    }
  }
}

// Create singleton instance
const discountsApi = new DiscountsApi();

export default discountsApi;
