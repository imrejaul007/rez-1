// Real Vouchers API - Connects to actual backend
import apiClient, { ApiResponse } from './apiClient';

interface VoucherBrand {
  _id: string;
  name: string;
  logo: string;
  backgroundColor?: string;
  logoColor?: string;
  description?: string;
  cashbackRate: number;
  rating?: number;
  ratingCount?: number;
  category: string;
  isNewlyAdded: boolean;
  isFeatured: boolean;
  isActive: boolean;
  denominations: number[];
  termsAndConditions: string[];
  purchaseCount: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

interface UserVoucher {
  _id: string;
  user: string;
  brand: VoucherBrand | string;
  voucherCode: string;
  denomination: number;
  purchasePrice: number;
  purchaseDate: string;
  expiryDate: string;
  validityDays: number;
  status: 'active' | 'used' | 'expired' | 'cancelled';
  usedDate?: string;
  usedAt?: string;
  deliveryMethod: 'email' | 'sms' | 'app' | 'physical';
  deliveryStatus: 'pending' | 'delivered' | 'failed';
  deliveredAt?: string;
  paymentMethod: 'wallet' | 'card' | 'upi' | 'netbanking';
  transactionId?: string;
  qrCode?: string;
  createdAt: string;
  updatedAt: string;
}

// Using ApiResponse from apiClient to keep response typing consistent across services

export const realVouchersApi = {
  /**
   * Get all voucher brands with filters
   */
  async getVoucherBrands(params?: {
    category?: string;
    featured?: boolean;
    newlyAdded?: boolean;
    search?: string;
    sortBy?: 'name' | 'cashbackRate' | 'purchaseCount' | 'rating' | 'createdAt';
    order?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<VoucherBrand[]>> {
    const queryParams = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }

    return apiClient.get(`/vouchers/brands?${queryParams.toString()}`);
  },

  /**
   * Get featured voucher brands
   */
  async getFeaturedBrands(limit: number = 10): Promise<ApiResponse<VoucherBrand[]>> {
    return apiClient.get(`/vouchers/brands/featured?limit=${limit}`);
  },

  /**
   * Get newly added voucher brands
   */
  async getNewlyAddedBrands(limit: number = 10): Promise<ApiResponse<VoucherBrand[]>> {
    return apiClient.get(`/vouchers/brands/newly-added?limit=${limit}`);
  },

  /**
   * Get voucher categories
   */
  async getVoucherCategories(): Promise<ApiResponse<string[]>> {
    return apiClient.get('/vouchers/categories');
  },

  /**
   * Get single voucher brand by ID
   */
  async getVoucherBrandById(id: string): Promise<ApiResponse<VoucherBrand>> {
    return apiClient.get(`/vouchers/brands/${id}`);
  },

  /**
   * Track brand view (analytics)
   */
  async trackBrandView(id: string): Promise<ApiResponse<any>> {
    return apiClient.post(`/vouchers/brands/${id}/track-view`);
  },

  /**
   * Purchase a voucher (requires authentication)
   */
  async purchaseVoucher(data: {
    brandId: string;
    denomination: number;
    paymentMethod?: 'wallet' | 'card' | 'upi' | 'netbanking';
  }): Promise<ApiResponse<{
    voucher: UserVoucher;
    transaction: any;
    wallet: {
      balance: number;
      available: number;
    };
  }>> {
    return apiClient.post('/vouchers/purchase', data);
  },

  /**
   * Get user's purchased vouchers (requires authentication)
   */
  async getUserVouchers(params?: {
    status?: 'active' | 'used' | 'expired' | 'cancelled';
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<UserVoucher[]>> {
    const queryParams = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }

    return apiClient.get(`/vouchers/my-vouchers?${queryParams.toString()}`);
  },

  /**
   * Get single user voucher by ID (requires authentication)
   */
  async getUserVoucherById(id: string): Promise<ApiResponse<UserVoucher>> {
    return apiClient.get(`/vouchers/my-vouchers/${id}`);
  },

  /**
   * Use a voucher - mark as used (requires authentication)
   */
  async useVoucher(
    id: string,
    data?: {
      usageLocation?: string;
    }
  ): Promise<ApiResponse<UserVoucher>> {
    return apiClient.post(`/vouchers/${id}/use`, data);
  },

  /**
   * Get hero carousel items for online voucher page
   */
  async getHeroCarousel(limit: number = 5): Promise<ApiResponse<any[]>> {
    return apiClient.get(`/vouchers/hero-carousel?limit=${limit}`);
  },
};

export default realVouchersApi;