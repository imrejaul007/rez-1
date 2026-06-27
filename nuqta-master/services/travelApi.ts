// Travel Services API Service
// Handles travel services specific endpoints (flights, hotels, trains, bus, cab, packages)

import apiClient, { ApiResponse } from './apiClient';

// ===== TYPE DEFINITIONS =====

export interface TravelServiceCategory {
  id: string;
  title: string;
  icon: string;
  color: string;
  count: string;
  cashback: number;
}

export interface TravelService {
  _id: string;
  id?: string;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  images: string[];
  pricing: {
    original: number;
    selling: number;
    discount?: number;
    currency: string;
  };
  ratings: {
    average: number;
    count: number;
  };
  cashback?: {
    percentage: number;
    isActive: boolean;
  };
  serviceDetails?: {
    duration: number;
    serviceType: 'home' | 'store' | 'online';
    maxBookingsPerSlot: number;
    requiresAddress: boolean;
    requiresPaymentUpfront: boolean;
    serviceArea?: {
      radius: number;
      cities?: string[];
    };
  };
  serviceCategory?: {
    _id: string;
    name: string;
    slug: string;
    icon: string;
    cashbackPercentage: number;
  };
  store?: {
    _id: string;
    name: string;
    logo?: string;
    location?: {
      address: string;
      city: string;
      coordinates?: [number, number];
    };
  };
  isFeatured?: boolean;
  isActive: boolean;
}

export interface TravelServicesByCategoryResponse {
  services: TravelService[];
  category: {
    id: string;
    name: string;
    slug: string;
    icon: string;
    description?: string;
    cashbackPercentage: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface TravelServicesStats {
  hotels: number;
  maxCashback: number;
  serviceCount: number;
  coinMultiplier?: number;
}

export interface TravelServicesQueryParams {
  page?: number;
  limit?: number;
  sortBy?: 'price_low' | 'price_high' | 'rating' | 'newest' | 'popular';
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
}

// ===== SERVICE CLASS =====

class TravelServicesService {
  /**
   * Get travel service categories for homepage
   */
  async getCategories(): Promise<ApiResponse<TravelServiceCategory[]>> {
    try {
      const response = await apiClient.get<TravelServiceCategory[]>('/travel-services/categories');
      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch travel service categories'
      };
    }
  }

  /**
   * Get featured travel services for homepage
   */
  async getFeatured(limit: number = 6): Promise<ApiResponse<TravelService[]>> {
    try {
      const response = await apiClient.get<TravelService[]>(`/travel-services/featured?limit=${limit}`);
      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch featured travel services'
      };
    }
  }

  /**
   * Get popular travel services
   */
  async getPopular(limit: number = 10): Promise<ApiResponse<TravelService[]>> {
    try {
      const response = await apiClient.get<TravelService[]>(`/travel-services/popular?limit=${limit}`);
      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch popular travel services'
      };
    }
  }

  /**
   * Get travel services statistics
   */
  async getStats(): Promise<ApiResponse<TravelServicesStats>> {
    try {
      const response = await apiClient.get<TravelServicesStats>('/travel-services/stats');
      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch travel services stats'
      };
    }
  }

  /**
   * Get travel services by category slug
   */
  async getByCategory(
    slug: string,
    params?: TravelServicesQueryParams
  ): Promise<ApiResponse<TravelServicesByCategoryResponse>> {
    try {
      const queryParams: any = {
        page: params?.page || 1,
        limit: params?.limit || 20,
        sortBy: params?.sortBy || 'rating'
      };

      if (params?.minPrice) queryParams.minPrice = params.minPrice;
      if (params?.maxPrice) queryParams.maxPrice = params.maxPrice;
      if (params?.rating) queryParams.rating = params.rating;

      // Filter out undefined values
      const cleanParams = Object.fromEntries(
        Object.entries(queryParams).filter(([_, v]) => v !== undefined)
      );

      const response = await apiClient.get<TravelServicesByCategoryResponse>(
        `/travel-services/category/${slug}`,
        cleanParams
      );

      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch travel services by category'
      };
    }
  }

  // ===== PAYMENT METHODS =====

  /**
   * Get available payment gateways for a currency
   */
  async getPaymentGateways(currency: string = 'INR'): Promise<ApiResponse<{
    currency: string;
    gateways: Array<{ id: string; name: string; isAvailable: boolean }>;
    defaultGateway: string;
  }>> {
    try {
      const response = await apiClient.get(`/travel-payment/gateways?currency=${currency}`);
      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch payment gateways'
      };
    }
  }

  // ----- RAZORPAY -----

  /**
   * Create Razorpay payment order for a travel booking (INR only)
   */
  async createPaymentOrder(
    bookingId: string,
    amount: number,
    currency: string = 'INR'
  ): Promise<ApiResponse<{
    razorpayOrderId: string;
    razorpayKeyId: string;
    amount: number;
    currency: string;
    bookingId: string;
    bookingNumber: string;
  }>> {
    try {
      const response = await apiClient.post('/travel-payment/create-order', {
        bookingId,
        amount,
        currency,
      });
      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create payment order'
      };
    }
  }

  /**
   * Verify Razorpay payment for a travel booking
   */
  async verifyRazorpayPayment(
    bookingId: string,
    razorpayData: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }
  ): Promise<ApiResponse<{ verified: boolean; booking: any }>> {
    try {
      const response = await apiClient.post('/travel-payment/verify', {
        bookingId,
        ...razorpayData,
      });
      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to verify payment'
      };
    }
  }

  // ----- STRIPE -----

  /**
   * Create Stripe checkout session for a travel booking (all currencies)
   */
  async createStripeSession(
    bookingId: string,
    amount: number,
    currency: string = 'INR',
    successUrl: string,
    cancelUrl: string
  ): Promise<ApiResponse<{
    sessionId: string;
    url: string;
    bookingId: string;
    bookingNumber: string;
    amount: number;
    currency: string;
  }>> {
    try {
      const response = await apiClient.post('/travel-payment/create-checkout-session', {
        bookingId,
        amount,
        currency,
        successUrl,
        cancelUrl,
      });
      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create Stripe checkout session'
      };
    }
  }

  /**
   * Verify Stripe checkout session for a travel booking
   */
  async verifyStripeSession(
    sessionId: string,
    bookingId: string
  ): Promise<ApiResponse<{
    verified: boolean;
    booking: any;
    paymentDetails?: {
      amount: number;
      currency: string;
      paymentIntentId: string;
    };
  }>> {
    try {
      const response = await apiClient.post('/travel-payment/verify-stripe-session', {
        sessionId,
        bookingId,
      });
      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to verify Stripe payment'
      };
    }
  }

  // ----- BACKWARD COMPAT -----

  /** @deprecated Use verifyRazorpayPayment instead */
  async verifyPayment(
    bookingId: string,
    razorpayData: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }
  ): Promise<ApiResponse<{ verified: boolean; booking: any }>> {
    return this.verifyRazorpayPayment(bookingId, razorpayData);
  }
}

// Export singleton instance
const travelApi = new TravelServicesService();
export default travelApi;
