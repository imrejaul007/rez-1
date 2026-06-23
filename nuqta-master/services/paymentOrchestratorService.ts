// @ts-nocheck
// Payment Orchestrator Service
// Central service to manage all payment methods for REZ App

import razorpayService from './razorpayService';
import stripeReactNativeService from './stripeReactNativeService';
import apiClient from './apiClient';
import type {
  PaymentMethod,
  PaymentRequest,
  PaymentResponse,
  PaymentMethodType,
  PaymentGateway,
  CODConfig,
  SavedCard,
  PaymentMethodPreference,
} from '@/types/payment.types';

// Environment configuration
const ENABLE_RAZORPAY = process.env.EXPO_PUBLIC_ENABLE_RAZORPAY === 'true';
const ENABLE_STRIPE = process.env.EXPO_PUBLIC_ENABLE_STRIPE === 'true';
const ENABLE_COD = process.env.EXPO_PUBLIC_ENABLE_COD === 'true';
const COD_FEE = Number(process.env.EXPO_PUBLIC_COD_FEE) || 50;
const COD_MIN_ORDER = Number(process.env.EXPO_PUBLIC_COD_MIN_ORDER) || 0;
const COD_MAX_ORDER = Number(process.env.EXPO_PUBLIC_COD_MAX_ORDER) || 50000;

/**
 * Payment Orchestrator Service
 * Manages all payment methods and routes payments to appropriate gateways
 */
class PaymentOrchestratorService {
  private initialized = false;

  /**
   * Initialize payment services
   */
  async initialize(): Promise<void> {
    if (this.initialized) {

      return;
    }

    try {
      // Initialize Stripe if enabled
      if (ENABLE_STRIPE && stripeReactNativeService.isNativeSDKAvailable()) {
        await stripeReactNativeService.initialize();
      }

      this.initialized = true;

    } catch (error) {
      // Continue even if initialization fails - fallback methods will still work
    }
  }

  /**
   * Get all available payment methods
   */
  async getAvailablePaymentMethods(
    amount: number,
    currency: string = 'INR'
  ): Promise<PaymentMethod[]> {

    const methods: PaymentMethod[] = [];

    // REZ Wallet - Always available
    methods.push({
      id: 'wallet',
      name: 'ReZ Wallet',
      type: 'wallet',
      gateway: 'internal',
      icon: 'wallet',
      isAvailable: true,
      processingFee: 0,
      processingTime: 'Instant',
      description: 'Pay using your ReZ wallet balance',
      isDefault: true,
    });

    // REZ Coins - Always available
    methods.push({
      id: 'rezcoins',
      name: 'REZ Coins',
      type: 'rezcoins',
      gateway: 'internal',
      icon: 'diamond',
      isAvailable: true,
      processingFee: 0,
      processingTime: 'Instant',
      description: 'Use your REZ coins for payment',
    });

    // Razorpay methods
    if (ENABLE_RAZORPAY && razorpayService.isConfigured()) {
      // UPI via Razorpay
      methods.push({
        id: 'razorpay_upi',
        name: 'UPI',
        type: 'upi',
        gateway: 'razorpay',
        icon: 'phone-portrait',
        isAvailable: true,
        processingFee: 0,
        processingTime: 'Instant',
        description: 'Pay using any UPI app (GPay, PhonePe, Paytm)',
        supportedCurrencies: ['INR'],
      });

      // Cards via Razorpay
      methods.push({
        id: 'razorpay_card',
        name: 'Credit/Debit Card',
        type: 'card',
        gateway: 'razorpay',
        icon: 'card',
        isAvailable: true,
        processingFee: 2,
        processingTime: '2-3 minutes',
        description: 'Visa, Mastercard, Amex, RuPay',
        supportedCurrencies: ['INR'],
      });

      // Net Banking via Razorpay
      methods.push({
        id: 'razorpay_netbanking',
        name: 'Net Banking',
        type: 'netbanking',
        gateway: 'razorpay',
        icon: 'business',
        isAvailable: true,
        processingFee: 0,
        processingTime: '5-10 minutes',
        description: 'Pay using your bank account',
        supportedCurrencies: ['INR'],
      });

      // Wallets via Razorpay
      methods.push({
        id: 'razorpay_wallet',
        name: 'Digital Wallets',
        type: 'wallet',
        gateway: 'razorpay',
        icon: 'wallet-outline',
        isAvailable: true,
        processingFee: 1.5,
        processingTime: 'Instant',
        description: 'Paytm, PhonePe, Amazon Pay, etc.',
        supportedCurrencies: ['INR'],
      });
    }

    // Stripe methods (for international payments)
    if (ENABLE_STRIPE && stripeReactNativeService.isConfigured()) {
      methods.push({
        id: 'stripe_card',
        name: 'International Card',
        type: 'card',
        gateway: 'stripe',
        icon: 'card',
        isAvailable: true,
        processingFee: 2.9,
        processingTime: '2-3 minutes',
        description: 'Visa, Mastercard, Amex (International)',
        supportedCurrencies: ['USD', 'EUR', 'GBP', 'INR'],
      });
    }

    // Cash on Delivery
    if (ENABLE_COD) {
      const codConfig = await this.getCODConfiguration();
      const isCODAvailable =
        codConfig.isAvailable &&
        amount >= codConfig.minOrderAmount &&
        amount <= codConfig.maxOrderAmount;

      methods.push({
        id: 'cod',
        name: 'Cash on Delivery',
        type: 'cod',
        gateway: 'none',
        icon: 'cash',
        isAvailable: isCODAvailable,
        processingFee: codConfig.fee,
        processingTime: 'On delivery',
        description: `₹${codConfig.fee} COD charges apply`,
        minAmount: codConfig.minOrderAmount,
        maxAmount: codConfig.maxOrderAmount,
      });
    }

    return methods;
  }

  /**
   * Process payment using appropriate gateway
   */
  async processPayment(
    paymentRequest: PaymentRequest,
    userDetails?: {
      name?: string;
      email?: string;
      contact?: string;
    }
  ): Promise<PaymentResponse> {

    await this.initialize();

    try {
      // Route to appropriate gateway
      switch (paymentRequest.gateway) {
        case 'razorpay':
          return await this.processRazorpayPayment(paymentRequest, userDetails);

        case 'stripe':
          return await this.processStripePayment(paymentRequest, userDetails);

        case 'internal':
          return await this.processInternalPayment(paymentRequest);

        case 'none':
          if (paymentRequest.paymentMethod === 'cod') {
            return await this.processCODPayment(paymentRequest);
          }
          throw new Error('Invalid payment gateway');

        default:
          throw new Error(`Unsupported payment gateway: ${paymentRequest.gateway}`);
      }
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Process Razorpay payment
   */
  private async processRazorpayPayment(
    paymentRequest: PaymentRequest,
    userDetails?: {
      name?: string;
      email?: string;
      contact?: string;
    }
  ): Promise<PaymentResponse> {

    try {
      return await razorpayService.processPayment(paymentRequest, userDetails);
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Process Stripe payment
   */
  private async processStripePayment(
    paymentRequest: PaymentRequest,
    userDetails?: {
      name?: string;
      email?: string;
      phone?: string;
    }
  ): Promise<PaymentResponse> {

    try {
      return await stripeReactNativeService.processPayment(paymentRequest, userDetails);
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Process internal payment (ReZ Wallet, REZ Coins)
   */
  private async processInternalPayment(
    paymentRequest: PaymentRequest
  ): Promise<PaymentResponse> {

    try {
      const response = await apiClient.post('/payment/internal/process', paymentRequest);

      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.error || 'Internal payment failed');
      }
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Process COD payment
   */
  private async processCODPayment(
    paymentRequest: PaymentRequest
  ): Promise<PaymentResponse> {

    try {
      const response = await apiClient.post('/payment/cod/create', paymentRequest);

      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.error || 'COD order creation failed');
      }
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Get COD configuration
   */
  async getCODConfiguration(): Promise<CODConfig> {
    try {
      const response = await apiClient.get('/payment/cod/config');

      if (response.success && response.data) {
        return response.data;
      }
    } catch (_error) {
      // silently handle
    }

    // Fallback to environment config
    return {
      isAvailable: ENABLE_COD,
      fee: COD_FEE,
      minOrderAmount: COD_MIN_ORDER,
      maxOrderAmount: COD_MAX_ORDER,
    };
  }

  /**
   * Get saved payment methods for user
   */
  async getSavedPaymentMethods(): Promise<{
    cards: SavedCard[];
    upiIds: string[];
  }> {

    try {
      const response = await apiClient.get('/payment/saved-methods');

      if (response.success && response.data) {
        return response.data;
      }
    } catch (_error) {
      // silently handle
    }

    return { cards: [], upiIds: [] };
  }

  /**
   * Save payment method
   */
  async savePaymentMethod(
    type: PaymentMethodType,
    details: {
      cardToken?: string;
      last4?: string;
      brand?: string;
      expiryMonth?: number;
      expiryYear?: number;
      holderName?: string;
      upiId?: string;
      gateway?: PaymentGateway;
    }
  ): Promise<{ success: boolean; id?: string }> {

    try {
      const response = await apiClient.post('/payment/save-method', {
        type,
        details,
      });

      if (response.success) {
        return { success: true, id: response.data?.id };
      }

      return { success: false };
    } catch (error) {
      return { success: false };
    }
  }

  /**
   * Delete saved payment method
   */
  async deleteSavedPaymentMethod(methodId: string): Promise<boolean> {

    try {
      const response = await apiClient.delete(`/payment/saved-methods/${methodId}`);
      return response.success;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get user's payment preferences
   */
  async getPaymentPreferences(): Promise<PaymentMethodPreference | null> {

    try {
      const response = await apiClient.get('/payment/preferences');

      if (response.success && response.data) {
        return response.data;
      }
    } catch (_error) {
      // silently handle
    }

    return null;
  }

  /**
   * Update payment preferences
   */
  async updatePaymentPreferences(
    preferences: Partial<PaymentMethodPreference>
  ): Promise<boolean> {

    try {
      const response = await apiClient.put('/payment/preferences', preferences);
      return response.success;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check payment status
   */
  async checkPaymentStatus(paymentId: string, gateway: PaymentGateway): Promise<PaymentResponse> {

    try {
      switch (gateway) {
        case 'razorpay':
          return await razorpayService.checkPaymentStatus(paymentId);

        case 'stripe':
          return await stripeReactNativeService.checkPaymentStatus(paymentId);

        case 'internal':
        case 'none':
          const response = await apiClient.get(`/payment/status/${paymentId}`);
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error('Failed to check payment status');

        default:
          throw new Error(`Unsupported gateway: ${gateway}`);
      }
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Validate payment configuration
   */
  validateConfiguration(): {
    razorpay: { isValid: boolean; errors: string[] };
    stripe: { isValid: boolean; errors: string[] };
    cod: { isValid: boolean; errors: string[] };
  } {
    const razorpayValidation = razorpayService.validateConfiguration();
    const stripeValidation = stripeReactNativeService.validateConfiguration();
    const codValidation = {
      isValid: ENABLE_COD,
      errors: ENABLE_COD ? [] : ['COD is disabled'],
    };

    return {
      razorpay: razorpayValidation,
      stripe: stripeValidation,
      cod: codValidation,
    };
  }

  /**
   * Get recommended payment method for user
   */
  async getRecommendedPaymentMethod(
    amount: number,
    currency: string = 'INR'
  ): Promise<PaymentMethod | null> {
    const methods = await this.getAvailablePaymentMethods(amount, currency);
    const preferences = await this.getPaymentPreferences();

    if (!methods.length) {
      return null;
    }

    // If user has a preferred method, use it
    if (preferences?.preferredMethod) {
      const preferredMethod = methods.find(
        (m) => m.type === preferences.preferredMethod && m.isAvailable
      );
      if (preferredMethod) {
        return preferredMethod;
      }
    }

    // If user has last used method, use it
    if (preferences?.lastUsedMethod) {
      const lastUsedMethod = methods.find(
        (m) => m.type === preferences.lastUsedMethod && m.isAvailable
      );
      if (lastUsedMethod) {
        return lastUsedMethod;
      }
    }

    // Return first available method (usually ReZ Wallet)
    return methods.find((m) => m.isAvailable && m.isDefault) || methods[0];
  }
}

// Export singleton instance
const paymentOrchestratorService = new PaymentOrchestratorService();
export default paymentOrchestratorService;
