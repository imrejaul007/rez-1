/**
 * Store Payment API Service
 *
 * Handles all API calls for the store payment flow including:
 * - QR code lookup
 * - Offers retrieval
 * - Payment initiation and confirmation
 * - Transaction history
 */

import apiClient from './apiClient';
import walletApi from './walletApi';
import {
  StorePaymentInfo,
  OffersResponse,
  StorePaymentRequest,
  StorePaymentInitResponse,
  StorePaymentConfirmRequest,
  StorePaymentConfirmResponse,
  PaymentHistoryResponse,
  QRLookupResponse,
  OffersApiResponse,
  PaymentInitApiResponse,
  PaymentConfirmApiResponse,
  PaymentHistoryApiResponse,
  AppliedCoins,
  EnhancedPaymentMethod,
  StoreMembership,
  AutoOptimizeResponse,
} from '@/types/storePayment.types';

const STORE_PAYMENT_BASE = '/store-payment';

/**
 * Map backend rezCoins to frontend nuqtaCoins
 * Backend uses 'rezCoins', frontend uses 'nuqtaCoins'
 */
function mapRezToNuqtaCoins(backendData: any): AppliedCoins {
  // Handle if data is null/undefined
  if (!backendData) {
    return {
      nuqtaCoins: { available: 0, using: 0, enabled: true },
      promoCoins: { available: 0, using: 0, enabled: true, expiringToday: false },
      brandedCoins: null,
      totalApplied: 0,
    };
  }

  // Map rezCoins to nuqtaCoins
  const nuqtaCoins = backendData.rezCoins || backendData.nuqtaCoins || { available: 0, using: 0, enabled: true };
  const promoCoins = backendData.promoCoins || { available: 0, using: 0, enabled: true, expiringToday: false };
  const brandedCoins = backendData.brandedCoins || null;

  return {
    nuqtaCoins: {
      available: nuqtaCoins.available || 0,
      using: nuqtaCoins.using || 0,
      enabled: nuqtaCoins.enabled !== false,
      color: nuqtaCoins.color || '#ffcd57',
      icon: nuqtaCoins.icon,
      description: nuqtaCoins.description,
      expiryDays: nuqtaCoins.expiryDays,
      redemptionCap: nuqtaCoins.redemptionCap,
    },
    promoCoins: {
      available: promoCoins.available || 0,
      using: promoCoins.using || 0,
      enabled: promoCoins.enabled !== false,
      expiringToday: promoCoins.expiringToday || false,
      expiresIn: promoCoins.expiresIn,
      color: promoCoins.color || '#FFC857',
      icon: promoCoins.icon,
      description: promoCoins.description,
      redemptionCap: promoCoins.redemptionCap || 20,
    },
    brandedCoins: brandedCoins ? {
      available: brandedCoins.available || 0,
      using: brandedCoins.using || 0,
      enabled: brandedCoins.enabled !== false,
      storeName: brandedCoins.storeName || 'Store',
      storeId: brandedCoins.storeId || '',
      color: brandedCoins.color || '#6366F1',
      logo: brandedCoins.logo,
      icon: brandedCoins.icon,
      description: brandedCoins.description,
      redemptionCap: brandedCoins.redemptionCap,
    } : null,
    totalApplied: backendData.totalApplied || 0,
    usageOrder: backendData.usageOrder,
    usageOrderDescription: backendData.usageOrderDescription,
  };
}

/**
 * Store Payment API Service
 */
const storePaymentApi = {
  /**
   * Lookup store by QR code
   */
  async lookupByQR(qrCode: string): Promise<StorePaymentInfo> {
    const response = await apiClient.get<QRLookupResponse>(
      `${STORE_PAYMENT_BASE}/lookup/${encodeURIComponent(qrCode)}`
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Store not found');
    }

    return response.data;
  },

  /**
   * Lookup store by QR code (POST method - for JSON payload)
   */
  async lookupByQRPost(qrCode: string): Promise<StorePaymentInfo> {
    const response = await apiClient.post<QRLookupResponse>(
      `${STORE_PAYMENT_BASE}/lookup`,
      { qrCode }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Store not found');
    }

    return response.data;
  },

  /**
   * Get available offers for a store payment
   */
  async getOffers(storeId: string, amount: number): Promise<OffersResponse> {
    const response = await apiClient.get<OffersApiResponse>(
      `${STORE_PAYMENT_BASE}/offers/${storeId}`,
      { params: { amount } }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to load offers');
    }

    return response.data;
  },

  /**
   * Initiate a store payment
   */
  async initiatePayment(request: StorePaymentRequest): Promise<StorePaymentInitResponse> {
    const response = await apiClient.post<PaymentInitApiResponse>(
      `${STORE_PAYMENT_BASE}/initiate`,
      request
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to initiate payment');
    }

    return response.data;
  },

  /**
   * Confirm a store payment
   */
  async confirmPayment(request: StorePaymentConfirmRequest): Promise<StorePaymentConfirmResponse> {
    const response = await apiClient.post<PaymentConfirmApiResponse>(
      `${STORE_PAYMENT_BASE}/confirm`,
      request
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to confirm payment');
    }

    return response.data;
  },

  /**
   * Get payment transaction history
   */
  async getHistory(params?: {
    page?: number;
    limit?: number;
    storeId?: string;
  }): Promise<PaymentHistoryResponse> {
    try {
      const response = await apiClient.get<PaymentHistoryApiResponse>(
        `${STORE_PAYMENT_BASE}/history`,
        params
      );

      if (!response.success || !response.data) {
        // Return empty history instead of throwing - no history is valid
        return {
          transactions: [],
          pagination: {
            page: 1,
            limit: params?.limit || 10,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
        };
      }

      return response.data;
    } catch (error) {
      // Return empty history on error - API might not be implemented yet
      return {
        transactions: [],
        pagination: {
          page: 1,
          limit: params?.limit || 10,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };
    }
  },

  /**
   * Get store payment details by paymentId
   */
  async getPaymentDetails(paymentId: string): Promise<{
    id: string;
    paymentId: string;
    storeId: string;
    storeName: string;
    storeLogo?: string;
    billAmount: number;
    discountAmount: number;
    coinRedemption: {
      rezCoins: number;
      promoCoins: number;
      totalAmount: number;
    };
    coinsUsed: number;
    remainingAmount: number;
    paymentMethod: string;
    offersApplied: string[];
    status: string;
    rewards?: {
      cashbackEarned: number;
      coinsEarned: number;
      bonusCoins: number;
    };
    transactionId?: string;
    createdAt: string;
    completedAt?: string;
  }> {
    const url = `${STORE_PAYMENT_BASE}/details/${encodeURIComponent(paymentId)}`;

    const response = await apiClient.get(url);

    if (!response.success || !response.data) {
      throw new Error(response.error || response.message || 'Payment not found');
    }

    return response.data;
  },

  /**
   * Get store payment info by store ID
   */
  async getStorePaymentInfo(storeId: string): Promise<StorePaymentInfo> {
    const response = await apiClient.get<QRLookupResponse>(
      `/stores/${storeId}`
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Store not found');
    }

    return response.data;
  },

  /**
   * Get user's coin balances for payment
   * Uses /wallet/balance endpoint which returns coin balances
   */
  async getCoinBalances(): Promise<{
    rezCoins: number;
    promoCoins: number;
  }> {
    try {
      const response = await walletApi.getBalance();

      if (!response.success) {
        // Return default values if endpoint fails
        return {
          rezCoins: 0,
          promoCoins: 0,
        };
      }

      // Backend returns: { balance: { total, available, pending, cashback }, coins: [...] }
      // The coins array contains 'rez' and 'promo' coin types
      const coins = response.data?.coins || [];

      // Get ReZ coins and Promo coins from the coins array
      const rezCoin = coins.find((c: any) => c.type === 'rez');
      const promoCoin = coins.find((c: any) => c.type === 'promo');

      return {
        rezCoins: rezCoin?.amount || 0,
        promoCoins: promoCoin?.amount || 0,
      };
    } catch (error) {
      // Return default values on error
      return {
        rezCoins: 0,
        promoCoins: 0,
      };
    }
  },

  /**
   * Calculate payment summary
   */
  calculatePaymentSummary(
    billAmount: number,
    discountAmount: number,
    coinsRedeemed: number,
    maxCoinPercent: number = 100
  ): {
    afterDiscount: number;
    maxCoinsAllowed: number;
    amountToPay: number;
    totalSavings: number;
  } {
    const afterDiscount = Math.max(0, billAmount - discountAmount);
    const maxCoinsAllowed = Math.floor((afterDiscount * maxCoinPercent) / 100);
    const effectiveCoins = Math.min(coinsRedeemed, maxCoinsAllowed);
    const amountToPay = Math.max(0, afterDiscount - effectiveCoins);
    const totalSavings = discountAmount + effectiveCoins;

    return {
      afterDiscount,
      maxCoinsAllowed,
      amountToPay,
      totalSavings,
    };
  },

  // ==================== NEW PREMIUM PAYMENT METHODS ====================

  /**
   * Get all available coins for user at a specific store
   * Maps backend rezCoins to frontend nuqtaCoins
   */
  async getCoinsForStore(storeId: string): Promise<AppliedCoins> {
    try {
      const response = await apiClient.get(`${STORE_PAYMENT_BASE}/coins/${storeId}`);

      if (!response.success || !response.data) {
        return mapRezToNuqtaCoins(null);
      }

      // Map rezCoins from backend to nuqtaCoins for frontend
      return mapRezToNuqtaCoins(response.data);
    } catch (error) {
      return mapRezToNuqtaCoins(null);
    }
  },

  /**
   * Get enhanced payment methods with bank-specific offers
   */
  async getEnhancedPaymentMethods(storeId: string, amount?: number): Promise<EnhancedPaymentMethod[]> {
    try {
      const response = await apiClient.get(
        `${STORE_PAYMENT_BASE}/payment-methods/${storeId}`,
        { params: amount ? { amount } : undefined }
      );

      if (!response.success || !response.data) {
        return [];
      }

      return response.data;
    } catch (error) {
      return [];
    }
  },

  /**
   * Auto-optimize coin allocation for maximum savings
   * Maps backend rezCoins to frontend nuqtaCoins
   */
  async autoOptimizeCoins(storeId: string, billAmount: number): Promise<AutoOptimizeResponse> {
    const defaultResponse: AutoOptimizeResponse = {
      nuqtaCoins: { available: 0, using: 0, enabled: false },
      promoCoins: { available: 0, using: 0, enabled: false, expiringToday: false },
      brandedCoins: null,
      totalApplied: 0,
      maxAllowed: 0,
      optimizationStrategy: 'none',
      savings: { coinsUsed: 0, percentOfBill: 0 },
    };

    try {
      const response = await apiClient.post(`${STORE_PAYMENT_BASE}/auto-optimize`, {
        storeId,
        billAmount,
      });

      if (!response.success || !response.data) {
        return defaultResponse;
      }

      // Map rezCoins from backend to nuqtaCoins for frontend
      const mappedCoins = mapRezToNuqtaCoins(response.data);
      return {
        ...mappedCoins,
        maxAllowed: response.data.maxAllowed || 0,
        optimizationStrategy: response.data.optimizationStrategy || 'none',
        savings: response.data.savings || { coinsUsed: 0, percentOfBill: 0 },
      };
    } catch (error) {
      return defaultResponse;
    }
  },

  /**
   * Get user's membership tier for a store
   */
  async getStoreMembership(storeId: string): Promise<StoreMembership | null> {
    try {
      const response = await apiClient.get(`${STORE_PAYMENT_BASE}/membership/${storeId}`);

      if (!response.success || !response.data) {
        return null;
      }

      return response.data;
    } catch (error) {
      return null;
    }
  },
};

export default storePaymentApi;

// Named exports for tree-shaking
export const {
  lookupByQR,
  lookupByQRPost,
  getOffers,
  initiatePayment,
  confirmPayment,
  getHistory,
  getPaymentDetails,
  getStorePaymentInfo,
  getCoinBalances,
  calculatePaymentSummary,
} = storePaymentApi;
