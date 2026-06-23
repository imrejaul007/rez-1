// Stripe React Native Service for REZ App
// Handles Stripe payment integration using @stripe/stripe-react-native

import { Platform } from 'react-native';
import apiClient from './apiClient';
import type {
  PaymentRequest,
  PaymentResponse,
  StripePaymentIntent,
} from '@/types/payment.types';
import { colors } from '@/constants/theme';

// Import Stripe React Native - Only on native platforms
// The module contains native-only code that cannot be imported on web
let StripeSDK: any = null;

// Only attempt to import on native platforms to avoid web bundler errors
if (Platform.OS !== 'web') {
  try {
    // Use dynamic import for better platform separation
    const loadStripeSDK = () => {
      try {
        return require('@stripe/stripe-react-native');
      } catch (e) {

        return null;
      }
    };
    StripeSDK = loadStripeSDK();
  } catch (error) {

  }
}

// Get Stripe configuration from environment
const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
const STRIPE_ENABLED = process.env.EXPO_PUBLIC_ENABLE_STRIPE === 'true';

/**
 * Stripe React Native Service Class
 */
class StripeReactNativeService {
  private publishableKey: string;
  private isNativeAvailable: boolean;
  private stripe: any;

  constructor() {
    this.publishableKey = STRIPE_PUBLISHABLE_KEY;
    this.isNativeAvailable = !!StripeSDK && Platform.OS !== 'web';

    if (!STRIPE_ENABLED) {
    }

    if (!this.publishableKey || this.publishableKey.includes('pk_test_your')) {
    }
  }

  /**
   * Initialize Stripe SDK
   * Call this in your app root before using Stripe
   */
  async initialize(): Promise<void> {
    if (!this.isNativeAvailable) {
      return;
    }

    try {
      if (StripeSDK && StripeSDK.initStripe) {
        await StripeSDK.initStripe({
          publishableKey: this.publishableKey,
          merchantIdentifier: 'merchant.com.rez.app', // For Apple Pay — matches app.config.js
          urlScheme: 'rez', // For payment redirects — matches app.config.js scheme
        });

      }
    } catch (_error) {
      // silently handle
    }
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
   * Check if native Stripe SDK is available
   */
  isNativeSDKAvailable(): boolean {
    return this.isNativeAvailable;
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
   * Present Payment Sheet (React Native only)
   */
  async presentPaymentSheet(
    paymentIntent: StripePaymentIntent,
    customerInfo?: {
      name?: string;
      email?: string;
      phone?: string;
    }
  ): Promise<{ success: boolean; error?: any }> {

    if (!this.isNativeSDKAvailable()) {
      throw new Error('Stripe React Native SDK not available');
    }

    try {
      // Initialize payment sheet
      const { error: initError } = await StripeSDK.initPaymentSheet({
        merchantDisplayName: 'REZ App',
        paymentIntentClientSecret: paymentIntent.clientSecret,
        defaultBillingDetails: {
          name: customerInfo?.name,
          email: customerInfo?.email,
          phone: customerInfo?.phone,
        },
        allowsDelayedPaymentMethods: true,
        appearance: {
          colors: {
            primary: colors.brand.purpleLight,
            background: '#FFFFFF',
            componentBackground: '#F3F4F6',
            componentBorder: '#E5E7EB',
            componentDivider: '#E5E7EB',
            primaryText: '#1F2937',
            secondaryText: '#6B7280',
            componentText: '#111827',
            placeholderText: '#9CA3AF',
          },
        },
      });

      if (initError) {
        return { success: false, error: initError };
      }

      // Present payment sheet
      const { error: presentError } = await StripeSDK.presentPaymentSheet();

      if (presentError) {
        if (presentError.code === 'Canceled') {

          return { success: false, error: { message: 'Payment cancelled by user' } };
        } else {
          return { success: false, error: presentError };
        }
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error };
    }
  }

  /**
   * Confirm Payment (alternative to Payment Sheet)
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

    if (!this.isNativeSDKAvailable()) {
      throw new Error('Stripe React Native SDK not available');
    }

    try {
      const { error, paymentIntent: confirmedIntent } = await StripeSDK.confirmPayment(
        paymentIntent.clientSecret,
        {
          paymentMethodType: 'Card',
          paymentMethodData: {
            billingDetails: billingDetails || {},
          },
        }
      );
      if (error) {
        return { success: false, error };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error };
    }
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
   * Process complete payment flow with Payment Sheet
   */
  async processPayment(
    paymentRequest: PaymentRequest,
    customerInfo?: {
      name?: string;
      email?: string;
      phone?: string;
    }
  ): Promise<PaymentResponse> {

    try {
      // Step 1: Create payment intent
      const paymentIntent = await this.createPaymentIntent(
        paymentRequest.orderId,
        paymentRequest.amount,
        paymentRequest.currency,
        paymentRequest.metadata
      );
      // Step 2: Present payment sheet
      const paymentResult = await this.presentPaymentSheet(paymentIntent, customerInfo);

      if (!paymentResult.success) {
        throw new Error(paymentResult.error?.message || 'Payment failed');
      }

      // Step 3: Verify payment on backend
      const paymentResponse = await this.verifyPayment(
        paymentRequest.orderId,
        paymentIntent.id
      );
      return paymentResponse;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Create payment method from card details
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

    if (!this.isNativeSDKAvailable()) {
      throw new Error('Stripe React Native SDK not available');
    }

    try {
      const { paymentMethod, error } = await StripeSDK.createPaymentMethod({
        paymentMethodType: 'Card',
        paymentMethodData: {
          billingDetails: billingDetails || {},
        },
        card: {
          number: cardDetails.number,
          expMonth: cardDetails.expMonth,
          expYear: cardDetails.expYear,
          cvc: cardDetails.cvc,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to create payment method');
      }

      return { paymentMethodId: paymentMethod.id };
    } catch (error: any) {
      throw error;
    }
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
   * Handle 3D Secure authentication
   */
  async handle3DSAuthentication(
    paymentIntentClientSecret: string
  ): Promise<{ success: boolean; error?: any }> {

    if (!this.isNativeSDKAvailable()) {
      throw new Error('Stripe React Native SDK not available');
    }

    try {
      const { paymentIntent, error } = await StripeSDK.handleNextAction(
        paymentIntentClientSecret
      );
      if (error) {
        return { success: false, error };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error };
    }
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

    if (!this.isNativeSDKAvailable() && Platform.OS !== 'web') {
      errors.push(
        'Native Stripe SDK not available. Ensure @stripe/stripe-react-native is installed'
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get Stripe SDK instance (for advanced usage)
   */
  getSDK() {
    return StripeSDK;
  }
}

// Export singleton instance
const stripeReactNativeService = new StripeReactNativeService();
export default stripeReactNativeService;
