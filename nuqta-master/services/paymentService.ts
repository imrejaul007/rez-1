// Payment Service
// Handles payment gateway integration for wallet topup

import apiClient, { ApiResponse } from './apiClient';

export interface PaymentMethod {
  id: string;
  name: string;
  type: 'upi' | 'card' | 'wallet' | 'netbanking';
  gateway: string; // 'stripe' | 'razorpay' | 'paypal'
  icon: string;
  isAvailable: boolean;
  processingFee?: number;
  processingTime?: string;
  description?: string;
}

export interface PaymentRequest {
  amount: number;
  currency: string;
  paymentMethod: string; // gateway name: 'stripe' | 'razorpay' | 'paypal'
  paymentMethodType: string; // method type: 'card' | 'upi' | 'wallet' | 'netbanking'
  purpose?: 'wallet_topup' | 'order_payment' | 'event_booking' | 'financial_service' | 'other';
  paymentMethodId?: string;
  userDetails?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  gateway: string;
  paymentUrl?: string;
  qrCode?: string;
  upiId?: string;
  expiryTime?: string;
  transactionId?: string;
  gatewayResponse?: any;
}

export interface PaymentStatusResponse {
  paymentId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  transactionId?: string;
  failureReason?: string;
  completedAt?: string;
}

export interface CashbackPreview {
  rechargeAmount: number;
  cashbackPercentage: number;
  cashback: number;
  maxCashback: number;
  cappedAt: number | null;
  // Discount fields (new)
  discountPercentage?: number;
  discountAmount?: number;
  payableAmount?: number;
}

class PaymentService {
  /**
   * Get available payment methods from backend
   */
  async getPaymentMethods(currency?: string, fiatCurrency?: string): Promise<ApiResponse<PaymentMethod[]>> {
    try {
      const params: Record<string, string> = {};
      if (currency) params.currency = currency;
      if (fiatCurrency) params.fiatCurrency = fiatCurrency;

      const response = await apiClient.get('/wallet/payment-methods', params);

      if (response.success && response.data) {
        return response as ApiResponse<PaymentMethod[]>;
      }

      // Fallback only for dev if backend is down
      if (__DEV__) {
        console.warn('[PAYMENT] Backend failed, using fallback methods (DEV)');
        return this.getFallbackPaymentMethods();
      }

      return {
        success: false,
        error: response.error || 'Failed to fetch payment methods.'
      };
    } catch (error) {

      if (__DEV__) {
        return this.getFallbackPaymentMethods();
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment service unavailable.'
      };
    }
  }

  /**
   * Fallback payment methods (dev only when backend is down)
   */
  private getFallbackPaymentMethods(): ApiResponse<PaymentMethod[]> {
    return {
      success: true,
      data: [
        {
          id: 'razorpay_upi',
          name: 'UPI',
          type: 'upi',
          gateway: 'razorpay',
          icon: '📱',
          isAvailable: true,
          processingFee: 0,
          processingTime: 'Instant'
        },
        {
          id: 'razorpay_card',
          name: 'Debit/Credit Card',
          type: 'card',
          gateway: 'razorpay',
          icon: '💳',
          isAvailable: true,
          processingFee: 2.0,
          processingTime: '2-3 minutes'
        },
        {
          id: 'razorpay_wallet',
          name: 'Digital Wallet',
          type: 'wallet',
          gateway: 'razorpay',
          icon: '👛',
          isAvailable: true,
          processingFee: 0,
          processingTime: 'Instant'
        },
        {
          id: 'razorpay_netbanking',
          name: 'Net Banking',
          type: 'netbanking',
          gateway: 'razorpay',
          icon: '🏦',
          isAvailable: true,
          processingFee: 0,
          processingTime: '5-10 minutes'
        }
      ]
    };
  }

  /**
   * Initiate payment — always calls the real backend
   */
  async initiatePayment(paymentRequest: PaymentRequest): Promise<ApiResponse<PaymentResponse>> {
    try {
      const response = await apiClient.post('/wallet/initiate-payment', paymentRequest);

      if (response.success && response.data) {
        return response as ApiResponse<PaymentResponse>;
      }

      return {
        success: false,
        error: response.error || 'Payment initiation failed. Please try again.'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment service error.'
      };
    }
  }

  /**
   * Check payment status — always calls the real backend
   */
  async checkPaymentStatus(paymentId: string, gateway: string): Promise<ApiResponse<PaymentStatusResponse>> {
    try {
      const response = await apiClient.get(`/wallet/payment-status/${paymentId}`, { gateway });

      if (response.success && response.data) {
        return response as ApiResponse<PaymentStatusResponse>;
      }

      return {
        success: false,
        error: response.error || 'Failed to check payment status'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check payment status.'
      };
    }
  }

  /**
   * Poll payment status until terminal state
   */
  async pollPaymentStatus(
    paymentId: string,
    gateway: string,
    options?: { maxAttempts?: number; intervalMs?: number; onStatusChange?: (status: string) => void; shouldAbort?: () => boolean }
  ): Promise<ApiResponse<PaymentStatusResponse>> {
    const maxAttempts = options?.maxAttempts ?? 30;
    const intervalMs = options?.intervalMs ?? 3000;

    for (let i = 0; i < maxAttempts; i++) {
      // Check if polling was aborted (e.g., component unmounted)
      if (options?.shouldAbort?.()) {
        return { success: false, error: 'Payment polling aborted.' };
      }

      const response = await this.checkPaymentStatus(paymentId, gateway);

      if (!response.success) {
        // On transient failure, keep polling
        if (i < maxAttempts - 1) {
          await new Promise(r => setTimeout(r, intervalMs));
          continue;
        }
        return response;
      }

      const status = response.data?.status;
      options?.onStatusChange?.(status || 'unknown');

      if (status === 'completed' || status === 'failed' || status === 'cancelled') {
        return response;
      }

      await new Promise(r => setTimeout(r, intervalMs));
    }

    return {
      success: false,
      error: 'Payment status check timed out. Please check your transaction history.'
    };
  }

  /**
   * Process UPI payment — sends correct gateway and method type
   */
  async processPayment(
    amount: number,
    currency: string,
    method: PaymentMethod,
    purpose: PaymentRequest['purpose'] = 'wallet_topup',
    metadata?: Record<string, any>
  ): Promise<ApiResponse<PaymentResponse>> {
    const paymentRequest: PaymentRequest = {
      amount,
      currency,
      paymentMethod: method.gateway, // 'razorpay' / 'stripe' / 'paypal'
      paymentMethodType: method.type, // 'upi' / 'card' / 'wallet' / 'netbanking'
      purpose,
      metadata: metadata || {}
    };

    return this.initiatePayment(paymentRequest);
  }

  /**
   * Confirm payment after Stripe.js confirmCardPayment succeeds
   * This tells the backend to verify with Stripe and credit the wallet
   *
   * Returns the payment result payload directly (unwrapping the API
   * envelope) so callers can access `status`, `paymentMethod`, etc.
   * Errors from the API are re-thrown to preserve their shape (e.g.
   * 402 declined card responses).
   */
  async confirmPayment(paymentIntentIdOrArgs: string | { paymentIntentId: string; paymentMethodId?: string; paymentMethodType?: string; token?: string }): Promise<{ status: string; paymentIntentId?: string; paymentMethod?: string; nextAction?: any }> {
    const args = typeof paymentIntentIdOrArgs === 'string'
      ? { paymentIntentId: paymentIntentIdOrArgs }
      : paymentIntentIdOrArgs;
    const paymentIntentId = args.paymentIntentId;
    try {
      const response = await apiClient.post('/wallet/confirm-payment', { paymentIntentId, ...args });
      if (response && response.success && response.data) {
        return response.data;
      }
      if (response && (response as any).status) {
        return response as any;
      }
      return { status: 'unknown' };
    } catch (error: any) {
      // For 402 declined payments, re-throw to preserve error shape for callers/tests
      if (error?.response?.status === 402) {
        throw error;
      }
      throw error;
    }
  }

  /**
   * Refund a payment intent (alias used by checkout integration tests
   * for the order-creation-failure rollback flow).
   *
   * Returns the refund payload directly (unwrapping the API envelope).
   */
  async refundPayment(paymentIntentId: string): Promise<{ status: string; paymentIntentId: string }> {
    const response = await apiClient.post<{ status: string; paymentIntentId: string }>(
      '/wallet/refund',
      { paymentIntentId }
    );
    if (response && response.success && response.data) {
      return response.data;
    }
    if (response && (response as any).status) {
      return response as any;
    }
    return response as any;
  }

  /**
   * Create a Stripe payment intent (alias used by integration tests).
   *
   * Returns the payment intent payload directly (unwrapping the API
   * envelope) so callers can access `clientSecret`, `paymentIntentId`,
   * `amount`, etc. without going through `.data`.
   */
  async createPaymentIntent(args: { amount: number; currency?: string }): Promise<{ paymentIntentId: string; clientSecret: string; amount: number; currency?: string }> {
    const response = await apiClient.post<{ paymentIntentId: string; clientSecret: string; amount: number; currency?: string }>(
      '/wallet/stripe/create-payment-intent',
      args
    );

    if (response && response.success && response.data) {
      return response.data;
    }

    // If the API call returned the payment intent directly (e.g. mocked), return as-is
    if (response && (response as any).clientSecret) {
      return response as any;
    }

    return response as any;
  }

  /**
   * Create a Razorpay order (alias used by integration tests).
   *
   * Returns the order payload directly (unwrapping the API envelope).
   */
  async createRazorpayOrder(args: { amount: number; currency?: string }): Promise<{ orderId: string; amount: number; currency?: string }> {
    const response = await apiClient.post<{ orderId: string; amount: number; currency?: string }>(
      '/wallet/razorpay/create-order',
      args
    );

    if (response && response.success && response.data) {
      return response.data;
    }

    if (response && (response as any).orderId) {
      return response as any;
    }

    return response as any;
  }

  /**
   * Verify a payment signature (Stripe / Razorpay).
   *
   * Returns the verification payload directly (unwrapping the API
   * envelope) so callers (and integration tests) can access
   * `verification.verified`, `verification.paymentId`, etc. without
   * going through `.data`.
   */
  async verifyPayment(args: { orderId: string; paymentId: string; signature: string }): Promise<{ verified: boolean; paymentId: string }> {
    try {
      const response = await apiClient.post('/wallet/verify-payment', args);
      if (response && response.success && response.data) {
        return response.data as { verified: boolean; paymentId: string };
      }
      if (response && typeof (response as any).verified === 'boolean') {
        return response as any;
      }
      return response as any;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Preview recharge cashback
   */
  async previewCashback(amount: number): Promise<ApiResponse<CashbackPreview>> {
    try {
      const response = await apiClient.get('/wallet/recharge/preview', { amount: amount.toString() });
      if (response.success && response.data) {
        return response as ApiResponse<CashbackPreview>;
      }
      return { success: false, error: response.error || 'Failed to preview cashback' };
    } catch (error) {
      return { success: false, error: 'Failed to preview cashback' };
    }
  }

  /**
   * Detect card type from card number
   */
  detectCardType(cardNumber: string): string {
    const number = cardNumber.replace(/\D/g, '');
    if (number.startsWith('4')) return 'visa';
    if (number.startsWith('5') || number.startsWith('2')) return 'mastercard';
    if (number.startsWith('3')) return 'amex';
    if (number.startsWith('6')) return 'discover';
    return 'unknown';
  }

  /**
   * Validate UPI ID format
   */
  validateUPIId(upiId: string): boolean {
    const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/;
    return upiRegex.test(upiId);
  }

  /**
   * Validate card number (Luhn algorithm)
   */
  validateCardNumber(cardNumber: string): boolean {
    const number = cardNumber.replace(/\D/g, '');
    if (number.length < 13 || number.length > 19) return false;
    let sum = 0;
    let isEven = false;
    for (let i = number.length - 1; i >= 0; i--) {
      let digit = parseInt(number[i]);
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      isEven = !isEven;
    }
    return sum % 10 === 0;
  }

  /**
   * Format card number for display
   */
  formatCardNumber(cardNumber: string): string {
    const number = cardNumber.replace(/\D/g, '');
    return number.replace(/(\d{4})(?=\d)/g, '$1 ');
  }
}

const paymentService = new PaymentService();
export default paymentService;
export { paymentService };
