/**
 * External Wallet API Service
 *
 * Handles API calls for third-party wallet integrations:
 * - Paytm
 * - Amazon Pay
 * - Mobikwik
 * - PhonePe
 */

import apiClient from './apiClient';
import { ExternalWallet, ExternalWalletProvider } from '@/types/storePayment.types';

const EXTERNAL_WALLET_BASE = '/wallets/external';

// ==================== RESPONSE TYPES ====================

interface ExternalWalletStatusResponse {
  wallets: ExternalWallet[];
  message?: string;
}

interface PaytmPaymentResponse {
  provider: 'paytm';
  orderId: string;
  amount: number;
  status: string;
  message?: string;
  redirectUrl?: string;
  txnToken?: string;
}

interface AmazonPayResponse {
  provider: 'amazonpay';
  orderId: string;
  amount: number;
  status: string;
  message?: string;
  checkoutSessionId?: string;
}

interface MobikwikResponse {
  provider: 'mobikwik';
  orderId: string;
  amount: number;
  status: string;
  message?: string;
  paymentUrl?: string;
}

interface ExternalPaymentStatusResponse {
  provider: string;
  orderId: string;
  status: 'pending' | 'success' | 'failed' | 'cancelled';
  message?: string;
}

// ==================== API SERVICE ====================

const externalWalletApi = {
  /**
   * Get status of all linked external wallets
   */
  async getLinkedWallets(): Promise<ExternalWallet[]> {
    try {
      const response = await apiClient.get(`${EXTERNAL_WALLET_BASE}/status`);

      if (!response.success || !response.data) {
        return [];
      }

      return response.data.wallets || [];
    } catch (error) {
      return [];
    }
  },

  /**
   * Link an external wallet
   */
  async linkWallet(
    provider: ExternalWalletProvider,
    options?: { phone?: string; email?: string }
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post(`${EXTERNAL_WALLET_BASE}/link`, {
        provider,
        ...options,
      });

      return {
        success: response.success,
        message: response.data?.message || response.error || 'Unknown error',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to link wallet',
      };
    }
  },

  /**
   * Unlink an external wallet
   */
  async unlinkWallet(provider: ExternalWalletProvider): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.delete(`${EXTERNAL_WALLET_BASE}/unlink/${provider}`);

      return {
        success: response.success,
        message: response.message || 'Wallet unlinked successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to unlink wallet',
      };
    }
  },

  /**
   * Initiate Paytm payment
   */
  async initiatePaytmPayment(
    amount: number,
    orderId: string,
    storeId?: string
  ): Promise<PaytmPaymentResponse> {
    try {
      const response = await apiClient.post(`${EXTERNAL_WALLET_BASE}/paytm/initiate`, {
        amount,
        orderId,
        storeId,
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to initiate Paytm payment');
      }

      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to initiate Paytm payment');
    }
  },

  /**
   * Initiate Amazon Pay payment
   */
  async initiateAmazonPayment(
    amount: number,
    orderId: string,
    storeId?: string
  ): Promise<AmazonPayResponse> {
    try {
      const response = await apiClient.post(`${EXTERNAL_WALLET_BASE}/amazonpay/initiate`, {
        amount,
        orderId,
        storeId,
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to initiate Amazon Pay payment');
      }

      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to initiate Amazon Pay payment');
    }
  },

  /**
   * Initiate Mobikwik payment
   */
  async initiateMobikwikPayment(
    amount: number,
    orderId: string,
    storeId?: string
  ): Promise<MobikwikResponse> {
    try {
      const response = await apiClient.post(`${EXTERNAL_WALLET_BASE}/mobikwik/initiate`, {
        amount,
        orderId,
        storeId,
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to initiate Mobikwik payment');
      }

      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to initiate Mobikwik payment');
    }
  },

  /**
   * Check external payment status
   */
  async checkPaymentStatus(
    provider: ExternalWalletProvider,
    orderId: string
  ): Promise<ExternalPaymentStatusResponse> {
    try {
      const response = await apiClient.get(`${EXTERNAL_WALLET_BASE}/status/${provider}/${orderId}`);

      if (!response.success || !response.data) {
        return {
          provider,
          orderId,
          status: 'pending',
          message: response.error || 'Unable to get status',
        };
      }

      return response.data;
    } catch (error: any) {
      return {
        provider,
        orderId,
        status: 'pending',
        message: error.message || 'Failed to check payment status',
      };
    }
  },
};

export default externalWalletApi;

// Named exports for tree-shaking
export const {
  getLinkedWallets,
  linkWallet,
  unlinkWallet,
  initiatePaytmPayment,
  initiateAmazonPayment,
  initiateMobikwikPayment,
  checkPaymentStatus,
} = externalWalletApi;
