// Stripe Web Service for REZ App
// Web-safe version that doesn't import native modules

import apiClient from './apiClient';
import type {
  PaymentRequest,
  PaymentResponse,
  StripePaymentIntent,
} from '@/types/payment.types';

// Get Stripe configuration from environment
const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
const STRIPE_ENABLED = process.env.EXPO_PUBLIC_ENABLE_STRIPE === 'true';

/**
 * Stripe Web Service Class (for web platform)
 */
class StripeReactNativeService {
  private publishableKey: string;

  constructor() {
    this.publishableKey = STRIPE_PUBLISHABLE_KEY;

    if (!STRIPE_ENABLED) {
    }

    if (!this.publishableKey || this.publishableKey.includes('pk_test_your')) {
    }
  }

  /**
   * Initialize Stripe SDK (no-op on web)
   */
  async initialize(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Check if Stripe is properly configured
   */
  isConfigured(): boolean {
    return (
      STRIPE_ENABLED &&
      !!this.publishableKey &&
      !this.publishableKey.includes('pk_test_your')
    );
  }

  /**
   * Check if native Stripe SDK is available (always false on web)
   */
  isNativeSDKAvailable(): boolean {
    return false;
  }

  /**
   * Create Payment Intent on backend
   */
  async createPaymentIntent(
    orderId: string,
    amount: number,
    currency: string = 'INR',
    metadata?: Record<string, any>
  ): Promise<StripePaymentIntent> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Stripe is not properly configured');
      }

      const response = await apiClient.post('/payment/create-checkout-session', {
        orderId,
        amount: Math.round(amount * 100), // Convert to cents/paise
        currency: currency.toLowerCase(),
        metadata,
        payment_method_types: ['card'], // Add more as needed
      });

      if (response.success && response.data) {
        const data = response.data as any;
        return {
          id: data.id,
          clientSecret: data.clientSecret,
          amount: data.amount,
          currency: data.currency,
          status: data.status,
          paymentMethodTypes: data.paymentMethodTypes || ['card'],
        };
      } else {
        throw new Error(response.error || 'Failed to create payment intent');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create payment intent');
    }
  }

  /**
   * Present Payment Sheet (not available on web)
   */
  async presentPaymentSheet(
    paymentIntent: StripePaymentIntent,
    customerInfo?: {
      name?: string;
      email?: string;
      phone?: string;
    }
  ): Promise<{ success: boolean; error?: any }> {
    // For web, we can use Stripe.js or redirect to a hosted checkout page
    // This is a placeholder - you would implement actual Stripe.js integration here
    return {
      success: false,
      error: { message: 'Stripe payment sheet not available on web. Please use Stripe.js integration.' }
    };
  }

  /**
   * Confirm Payment (not available on web)
   */
  async confirmPayment(
    paymentIntent: StripePaymentIntent,
    paymentMethodId?: string,
    billingDetails?: {
      name?: string;
      email?: string;
      phone?: string;
      address?: any;
    }
  ): Promise<{ success: boolean; error?: any }> {
    return {
      success: false,
      error: { message: 'Direct payment confirmation not available on web. Please use Stripe.js.' }
    };
  }

  /**
   * Verify payment on backend
   */
  async verifyPayment(
    orderId: string,
    paymentIntentId: string
  ): Promise<PaymentResponse> {
    try {
      const response = await apiClient.post('/payment/verify-stripe-payment', {
        orderId,
        paymentIntentId,
      });

      if (response.success && response.data) {
        return response.data as PaymentResponse;
      } else {
        throw new Error(response.error || 'Payment verification failed');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Payment verification failed');
    }
  }

  /**
   * Process complete payment flow (limited on web)
   */
  async processPayment(
    paymentRequest: PaymentRequest,
    customerInfo?: {
      name?: string;
      email?: string;
      phone?: string;
    }
  ): Promise<PaymentResponse> {

    throw new Error('Stripe React Native payment flow not available on web. Please use Stripe.js integration.');
  }

  /**
   * Create payment method from card details (not available on web)
   */
  async createPaymentMethod(
    cardDetails: {
      number: string;
      expMonth: number;
      expYear: number;
      cvc: string;
    },
    billingDetails?: {
      name?: string;
      email?: string;
      phone?: string;
      address?: any;
    }
  ): Promise<{ paymentMethodId: string }> {
    throw new Error('Payment method creation not available on web. Please use Stripe.js.');
  }

  /**
   * Check payment status
   */
  async checkPaymentStatus(paymentIntentId: string): Promise<PaymentResponse> {
    try {
      const response = await apiClient.get(`/payment/status/${paymentIntentId}`);

      if (response.success && response.data) {
        return response.data as PaymentResponse;
      } else {
        throw new Error(response.error || 'Failed to check payment status');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Failed to check payment status');
    }
  }

  /**
   * Handle 3D Secure authentication (not available on web)
   */
  async handle3DSAuthentication(
    paymentIntentClientSecret: string
  ): Promise<{ success: boolean; error?: any }> {
    return {
      success: false,
      error: { message: '3DS authentication not available on web. Please use Stripe.js.' }
    };
  }

  /**
   * Validate Stripe configuration
   */
  validateConfiguration(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!STRIPE_ENABLED) {
      errors.push('Stripe is disabled in environment configuration');
    }

    if (!this.publishableKey || this.publishableKey.includes('pk_test_your')) {
      errors.push('Stripe publishable key is not configured properly');
    }

    errors.push('Stripe React Native SDK is not available on web platform');

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get Stripe SDK instance (null on web)
   */
  getSDK() {
    return null;
  }
}

// Export singleton instance
const stripeReactNativeService = new StripeReactNativeService();
export default stripeReactNativeService;
