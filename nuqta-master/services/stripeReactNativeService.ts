import type { PaymentRequest, PaymentResponse } from '@/types/payment.types';

class StripeReactNativeService {
  private configured = false;

  isNativeSDKAvailable(): boolean {
    return true;
  }

  isConfigured(): boolean {
    return this.configured;
  }

  async initialize(): Promise<void> {
    this.configured = true;
  }

  async processPayment(
    _paymentRequest: PaymentRequest,
    _userDetails?: { name?: string; email?: string; phone?: string }
  ): Promise<PaymentResponse> {
    throw new Error('Stripe processing not implemented in this environment');
  }

  async checkPaymentStatus(_paymentId: string): Promise<PaymentResponse> {
    throw new Error('Stripe status check not implemented in this environment');
  }

  validateConfiguration(): { isValid: boolean; errors: string[] } {
    return {
      isValid: this.configured,
      errors: this.configured ? [] : ['Stripe not initialized'],
    };
  }
}

// Singleton pattern using globalThis to persist across SSR module re-evaluations
const STRIPE_REACT_NATIVE_SERVICE_KEY = '__rezStripeReactNativeService__';

function getStripeReactNativeService(): StripeReactNativeService {
  if (typeof globalThis !== 'undefined') {
    if (!(globalThis as any)[STRIPE_REACT_NATIVE_SERVICE_KEY]) {
      (globalThis as any)[STRIPE_REACT_NATIVE_SERVICE_KEY] = new StripeReactNativeService();
    }
    return (globalThis as any)[STRIPE_REACT_NATIVE_SERVICE_KEY];
  }
  return new StripeReactNativeService();
}

export default getStripeReactNativeService();


