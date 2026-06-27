import apiClient from './apiClient';

// Get Stripe publishable key from environment
const stripePublishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

if (!stripePublishableKey) {
}

// Stripe API service
export const stripeApi = {
  /**
   * Create a payment intent for wallet topup or regular payment
   * @param amount - Base amount to pay
   * @param bonusAmount - Bonus amount (for wallet topup)
   * @param paymentType - Payment type ('card' or 'upi')
   * @param metadata - Additional metadata for the payment
   * @returns Payment intent details
   */
  async createPaymentIntent(
    amount: number,
    bonusAmount: number = 0,
    paymentType: 'card' | 'upi' = 'card',
    metadata?: {
      storeId?: string;
      storeName?: string;
      bonusPercentage?: number;
      walletTopup?: boolean;
      productId?: string;
      productName?: string;
      autoAddToCart?: boolean;
    }
  ) {
    try {

      // Validate inputs
      if (amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      if (paymentType !== 'card' && paymentType !== 'upi') {
        throw new Error('Invalid payment type. Must be card or upi');
      }

      const response = await apiClient.post('/wallet/initiate-payment', {
        amount: Math.round(amount * 100) / 100, // Ensure 2 decimal places
        bonusAmount: Math.round(bonusAmount * 100) / 100,
        paymentType,
        currency: 'INR',
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
          platform: 'web'
        }
      });

      if (!response.success) {
        throw new Error(response.error || response.message || 'Failed to create payment intent');
      }

      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create payment intent',
        errors: error.errors
      };
    }
  },

  /**
   * Confirm payment with backend after successful Stripe payment
   * @param paymentIntentId - Stripe payment intent ID
   * @returns Confirmation details with wallet balance
   */
  async confirmPayment(paymentIntentId: string) {
    try {

      if (!paymentIntentId) {
        throw new Error('Payment intent ID is required');
      }

      const response = await apiClient.post('/wallet/confirm-payment', {
        paymentIntentId,
        timestamp: new Date().toISOString()
      });

      if (!response.success) {
        throw new Error(response.error || response.message || 'Failed to confirm payment');
      }

      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to confirm payment',
        errors: error.errors
      };
    }
  },

  /**
   * Get wallet balance for a user
   * @param storeId - Optional store ID for store-specific wallet
   * @returns Current wallet balance
   */
  async getWalletBalance(storeId?: string) {
    try {

      const response = await apiClient.get('/wallet/balance', {
        params: { storeId }
      });

      if (!response.success) {
        throw new Error(response.error || response.message || 'Failed to fetch wallet balance');
      }

      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch wallet balance',
        data: { balance: 0 }
      };
    }
  },

  /**
   * Get wallet transaction history
   * @param limit - Number of transactions to fetch
   * @param offset - Offset for pagination
   * @returns Transaction history
   */
  async getTransactionHistory(limit: number = 10, offset: number = 0) {
    try {

      const response = await apiClient.get('/wallet/transactions', {
        params: { limit, offset }
      });

      if (!response.success) {
        throw new Error(response.error || response.message || 'Failed to fetch transaction history');
      }

      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch transaction history',
        data: { transactions: [] }
      };
    }
  },

  /**
   * Load Stripe instance
   * @returns Stripe instance or null if failed
   */
  async getStripe() {
    try {

      if (!stripePublishableKey) {
        throw new Error('Stripe publishable key not configured');
      }

      const { loadStripe } = await import('@stripe/stripe-js');
      const stripe = await loadStripe(stripePublishableKey);

      if (!stripe) {
        throw new Error('Failed to load Stripe');
      }

      return stripe;
    } catch (error: any) {
      return null;
    }
  },

  /**
   * Validate Stripe configuration
   * @returns Boolean indicating if Stripe is properly configured
   */
  isConfigured(): boolean {
    return !!stripePublishableKey;
  }
};

export default stripeApi;
