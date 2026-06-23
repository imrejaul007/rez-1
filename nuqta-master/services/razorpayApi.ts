import { Platform } from 'react-native';
import apiClient, { ApiResponse } from './apiClient';

/**
 * Razorpay Payment Gateway API Service
 */

export interface RazorpayConfig {
  keyId: string;
  currency: string;
  checkout: {
    name: string;
    description: string;
    image: string;
    theme: {
      color: string;
    };
  };
  isTestMode: boolean;
}

export interface RazorpayOrderResponse {
  razorpayOrderId: string;
  amount: number;
  currency: string;
  receipt: string;
  notes: Record<string, any>;
}

export interface RazorpayPaymentVerificationResponse {
  verified: boolean;
  paymentId: string;
  orderId: string;
  paymentMethod: string;
  amount: number;
  status: string;
  transactionId: string;
}

export interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  image?: string;
  order_id: string;
  handler: (response: RazorpaySuccessResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, any>;
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

// Declare Razorpay on window for TypeScript
declare global {
  interface Window {
    Razorpay: any;
  }
}

/**
 * Load Razorpay checkout script dynamically (Web only)
 * For native platforms, use react-native-razorpay SDK instead
 */
export async function loadRazorpayScript(): Promise<boolean> {
  // Guard: Only available on web platform
  if (Platform.OS !== 'web' || typeof document === 'undefined' || typeof window === 'undefined') {
    return false;
  }

  return new Promise((resolve) => {
    // Check if already loaded
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }

    // Create script element
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;

    script.onload = () => {
      resolve(true);
    };

    script.onerror = () => {
      resolve(false);
    };

    document.body.appendChild(script);
  });
}

export const razorpayApi = {
  /**
   * Get Razorpay configuration
   */
  async getConfig(): Promise<ApiResponse<RazorpayConfig>> {
    return apiClient.get('/razorpay/config');
  },

  /**
   * Create a Razorpay order
   */
  async createOrder(data: {
    amount: number;
    orderId?: string;
    notes?: Record<string, any>;
  }): Promise<ApiResponse<RazorpayOrderResponse>> {
    return apiClient.post('/razorpay/create-order', data);
  },

  /**
   * Verify Razorpay payment
   */
  async verifyPayment(data: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    orderData?: any;
  }): Promise<ApiResponse<RazorpayPaymentVerificationResponse>> {
    return apiClient.post('/razorpay/verify-payment', data);
  },

  /**
   * Open Razorpay checkout
   */
  async openCheckout(options: RazorpayCheckoutOptions): Promise<void> {
    // Load script if not already loaded
    const scriptLoaded = await loadRazorpayScript();
    
    if (!scriptLoaded) {
      throw new Error('Failed to load Razorpay checkout script');
    }

    // Create Razorpay instance and open checkout
    const razorpay = new window.Razorpay(options);
    razorpay.open();
  },

  /**
   * Request refund
   */
  async requestRefund(data: {
    paymentId: string;
    amount?: number;
    notes?: Record<string, any>;
  }): Promise<ApiResponse<any>> {
    return apiClient.post('/razorpay/refund', data);
  },
};

/**
 * Helper function to create Razorpay payment
 * This wraps the entire flow: create order → open checkout → verify payment
 */
export async function createRazorpayPayment(config: {
  amount: number;
  orderId?: string;
  notes?: Record<string, any>;
  userInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  onSuccess: (response: RazorpayPaymentVerificationResponse) => void;
  onError: (error: Error) => void;
}): Promise<void> {
  try {
    // Step 1: Get Razorpay config
    const configResponse = await razorpayApi.getConfig();
    if (!configResponse.success || !configResponse.data) {
      throw new Error('Failed to get Razorpay configuration');
    }
    const razorpayConfig = configResponse.data;

    // Step 2: Create Razorpay order
    const orderResponse = await razorpayApi.createOrder({
      amount: config.amount,
      orderId: config.orderId,
      notes: config.notes,
    });

    if (!orderResponse.success || !orderResponse.data) {
      throw new Error(orderResponse.message || 'Failed to create Razorpay order');
    }
    const razorpayOrder = orderResponse.data;
    // Step 3: Open Razorpay checkout
    await razorpayApi.openCheckout({
      key: razorpayConfig.keyId,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      name: razorpayConfig.checkout.name,
      description: razorpayConfig.checkout.description,
      image: razorpayConfig.checkout.image,
      order_id: razorpayOrder.razorpayOrderId,
      prefill: {
        name: config.userInfo?.name,
        email: config.userInfo?.email,
        contact: config.userInfo?.phone,
      },
      notes: config.notes,
      theme: {
        color: razorpayConfig.checkout.theme.color,
      },
      handler: async (response: RazorpaySuccessResponse) => {
        // Step 4: Verify payment on backend
        try {
          // If card payment was used, try to auto-apply card offer
          // Note: Razorpay doesn't expose card number, but we can check payment method
          // The offer should already be applied via CardOffersSection before payment
          
          const verifyResponse = await razorpayApi.verifyPayment({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
            orderData: config.notes,
          });

          if (!verifyResponse.success || !verifyResponse.data) {
            throw new Error(verifyResponse.message || 'Payment verification failed');
          }
          config.onSuccess(verifyResponse.data);
        } catch (error) {
          config.onError(error instanceof Error ? error : new Error('Payment verification failed'));
        }
      },
      modal: {
        ondismiss: () => {
          config.onError(new Error('Payment cancelled by user'));
        },
      },
    });

  } catch (error) {
    config.onError(error instanceof Error ? error : new Error('Payment failed'));
  }
}

