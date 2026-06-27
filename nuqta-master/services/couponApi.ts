import apiClient, { ApiResponse } from './apiClient';

// ============================================================================
// COUPON API SERVICE
// ============================================================================

/**
 * Coupon Type
 */
export interface Coupon {
  _id: string;
  couponCode: string;
  title: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minOrderValue: number;
  maxDiscountCap: number;
  validFrom: string;
  validTo: string;
  usageLimit: {
    totalUsage: number;
    perUser: number;
    usedCount: number;
  };
  applicableTo: {
    categories: Array<string | { _id: string; name: string; slug?: string }>;
    products: string[];
    stores: Array<string | { _id: string; name: string; logo?: string }>;
    userTiers: string[];
  };
  autoApply: boolean;
  autoApplyPriority: number;
  status: 'active' | 'inactive' | 'expired';
  termsAndConditions: string[];
  createdBy: string;
  tags: string[];
  imageUrl?: string;
  isNewlyAdded: boolean;
  isFeatured: boolean;
  viewCount: number;
  claimCount: number;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * User Coupon Type
 */
export interface UserCoupon {
  _id: string;
  user: string;
  coupon: Coupon;
  claimedDate: string;
  expiryDate: string;
  usedDate: string | null;
  usedInOrder: string | null;
  status: 'available' | 'used' | 'expired';
  notifications: {
    expiryReminder: boolean;
    expiryReminderSent: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Get Coupons Filters
 */
export interface GetCouponsFilters {
  category?: string;
  tag?: string;
  featured?: boolean;
}

/**
 * Get Coupons Response
 */
export interface GetCouponsResponse {
  coupons: Coupon[];
  total: number;
}

/**
 * Get My Coupons Filters
 */
export interface GetMyCouponsFilters {
  status?: 'available' | 'used' | 'expired';
}

/**
 * Get My Coupons Response
 */
export interface GetMyCouponsResponse {
  coupons: UserCoupon[];
  summary: {
    total: number;
    available: number;
    used: number;
    expired: number;
  };
}

/**
 * Cart Item for Validation
 */
export interface CartItem {
  product: string;
  quantity: number;
  price: number;
  category?: string;
  store?: string;
}

/**
 * Cart Data for Validation
 */
export interface CartData {
  items: CartItem[];
  subtotal: number;
}

/**
 * Validate Coupon Request
 */
export interface ValidateCouponRequest {
  couponCode: string;
  cartData: CartData;
}

/**
 * Validate Coupon Response
 */
export interface ValidateCouponResponse {
  discount: number;
  coupon: {
    code: string;
    type: 'PERCENTAGE' | 'FIXED';
    value: number;
  };
}

/**
 * Best Offer Response
 */
export interface BestOfferResponse {
  coupon: Coupon;
  discount: number;
}

/**
 * Search Coupons Filters
 */
export interface SearchCouponsFilters {
  q: string;
  category?: string;
  tag?: string;
}

/**
 * Search Coupons Response
 */
export interface SearchCouponsResponse {
  coupons: Coupon[];
  total: number;
}

/**
 * Coupon API Service Class
 */
class CouponService {
  /**
   * Get all available coupons with optional filters
   */
  async getAvailableCoupons(
    filters?: GetCouponsFilters
  ): Promise<ApiResponse<GetCouponsResponse>> {

    return apiClient.get('/coupons', filters);
  }

  /**
   * Get featured coupons
   */
  async getFeaturedCoupons(): Promise<ApiResponse<GetCouponsResponse>> {

    return apiClient.get('/coupons/featured');
  }

  /**
   * Get user's claimed coupons
   */
  async getMyCoupons(
    filters?: GetMyCouponsFilters
  ): Promise<ApiResponse<GetMyCouponsResponse>> {
    try {
      const response = await apiClient.get<GetMyCouponsResponse>('/coupons/my-coupons', filters);

      if (response.data) {
        // Process response data if needed
      }

      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Claim a coupon
   */
  async claimCoupon(couponId: string): Promise<ApiResponse<{ userCoupon: UserCoupon }>> {

    return apiClient.post(`/coupons/${couponId}/claim`);
  }

  /**
   * Validate coupon for cart
   */
  async validateCoupon(
    couponCode: string,
    cartData: CartData
  ): Promise<ApiResponse<ValidateCouponResponse>> {

    try {
      const response = await apiClient.post('/coupons/validate', { couponCode, cartData });
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Validate voucher code (for unified voucher/coupon system)
   */
  async validateVoucherCode(
    voucherCode: string,
    cartData: CartData
  ): Promise<ApiResponse<ValidateCouponResponse>> {

    // Vouchers are treated as fixed-amount coupons
    return apiClient.post('/coupons/validate', {
      couponCode: voucherCode,
      cartData
    });
  }

  /**
   * Get best coupon offer for cart
   */
  async getBestOffer(
    cartData: CartData
  ): Promise<ApiResponse<BestOfferResponse | null>> {

    return apiClient.post('/coupons/best-offer', { cartData });
  }

  /**
   * Remove claimed coupon
   */
  async removeCoupon(couponId: string): Promise<ApiResponse<{ message: string }>> {

    return apiClient.delete(`/coupons/${couponId}`);
  }

  /**
   * Search coupons
   */
  async searchCoupons(
    filters: SearchCouponsFilters
  ): Promise<ApiResponse<SearchCouponsResponse>> {

    return apiClient.get('/coupons/search', filters);
  }

  /**
   * Get coupon details
   */
  async getCouponDetails(couponId: string): Promise<ApiResponse<Coupon>> {

    return apiClient.get(`/coupons/${couponId}`);
  }
}

// Export singleton instance
const couponService = new CouponService();
export default couponService;
