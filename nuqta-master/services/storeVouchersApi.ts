// Store Vouchers API Client
// Handles all store visit voucher-related API calls

import apiClient, { ApiResponse } from './apiClient';

// Types
export interface StoreVoucher {
  _id: string;
  code: string;
  store: {
    _id: string;
    name: string;
    logo?: string;
  };
  name: string;
  description?: string;
  type: 'store_visit' | 'first_purchase' | 'referral' | 'promotional';
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minBillAmount: number;
  maxDiscountAmount?: number;
  validFrom: string;
  validUntil: string;
  restrictions: {
    isOfflineOnly: boolean;
    notValidAboveStoreDiscount: boolean;
    singleVoucherPerBill: boolean;
    minItemCount?: number;
    maxItemCount?: number;
  };
  usageLimit: number;
  usedCount: number;
  usageLimitPerUser?: number;
  isActive: boolean;
  metadata?: {
    displayText?: string;
    badgeText?: string;
    backgroundColor?: string;
  };
  canRedeem?: boolean;
  redeemReason?: string;
  isAssigned?: boolean;
  userVoucherStatus?: 'assigned' | 'used' | 'expired';
}

export interface UserStoreVoucher {
  _id: string;
  user: string;
  voucher: StoreVoucher | string;
  assignedAt: string;
  usedAt?: string;
  order?: {
    _id: string;
    orderNumber: string;
    status: string;
  };
  status: 'assigned' | 'used' | 'expired';
}

export interface ValidateVoucherRequest {
  code: string;
  storeId: string;
  billAmount: number;
}

export interface ValidateVoucherResponse {
  valid: boolean;
  voucher: {
    _id: string;
    code: string;
    name: string;
    discountType: string;
    discountValue: number;
    minBillAmount: number;
    restrictions: any;
  };
  discountAmount: number;
  finalAmount: number;
}

export interface RedeemVoucherRequest {
  orderId: string;
  billAmount: number;
}

export interface RedeemVoucherResponse {
  discountAmount: number;
  finalAmount: number;
  voucher: {
    code: string;
    name: string;
    discountType: string;
    discountValue: number;
  };
}

class StoreVouchersApi {
  /**
   * Get store vouchers for a specific store
   */
  async getStoreVouchers(
    storeId: string,
    params?: {
      page?: number;
      limit?: number;
    }
  ): Promise<ApiResponse<{ vouchers: StoreVoucher[]; total: number }>> {
    try {
      const response = await apiClient.get<any>(`/store-vouchers/store/${storeId}`, params);

      // Normalize response - backend returns data as array directly
      // Component expects { vouchers: [], total: number }
      if (response.success && Array.isArray(response.data)) {
        return {
          ...response,
          data: {
            vouchers: response.data,
            total: response.meta?.pagination?.total || response.data.length,
          },
        };
      }

      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get single store voucher by ID
   */
  async getStoreVoucherById(id: string): Promise<ApiResponse<StoreVoucher>> {
    try {
      const response = await apiClient.get<StoreVoucher>(`/store-vouchers/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Validate store voucher code
   */
  async validateVoucher(
    data: ValidateVoucherRequest
  ): Promise<ApiResponse<ValidateVoucherResponse>> {
    try {
      const response = await apiClient.post<ValidateVoucherResponse>(
        '/store-vouchers/validate',
        data
      );
      
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Claim a store voucher (assign to user) - authenticated users only
   */
  async claimVoucher(id: string): Promise<ApiResponse<UserStoreVoucher>> {
    try {
      const response = await apiClient.post<UserStoreVoucher>(`/store-vouchers/${id}/claim`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Redeem a claimed store voucher - authenticated users only
   */
  async redeemVoucher(
    id: string,
    data: RedeemVoucherRequest
  ): Promise<ApiResponse<RedeemVoucherResponse>> {
    try {
      const response = await apiClient.post<RedeemVoucherResponse>(
        `/store-vouchers/${id}/redeem`,
        data
      );
      
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user's claimed store vouchers - authenticated users only
   */
  async getMyVouchers(params?: {
    status?: 'assigned' | 'used' | 'expired';
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ vouchers: UserStoreVoucher[]; total: number }>> {
    try {
      const response = await apiClient.get<any>('/store-vouchers/my-vouchers', params);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get single user voucher details - authenticated users only
   */
  async getMyVoucherById(id: string): Promise<ApiResponse<UserStoreVoucher>> {
    try {
      const response = await apiClient.get<UserStoreVoucher>(`/store-vouchers/my-vouchers/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Remove a claimed voucher (only if not used) - authenticated users only
   */
  async removeClaimedVoucher(id: string): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const response = await apiClient.delete<{ success: boolean }>(
        `/store-vouchers/my-vouchers/${id}`
      );
      
      return response;
    } catch (error) {
      throw error;
    }
  }
}

// Create singleton instance
const storeVouchersApi = new StoreVouchersApi();

export default storeVouchersApi;
