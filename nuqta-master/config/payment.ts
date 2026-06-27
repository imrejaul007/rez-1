/**
 * Payment Configuration
 * Centralized payment provider configuration for the app
 */

import { EXTERNAL_SERVICES } from './env';

// Stripe Configuration
export const STRIPE_PUBLISHABLE_KEY = EXTERNAL_SERVICES.payment.stripe.publishableKey;

// Razorpay Configuration (legacy - kept for backward compatibility)
export const RAZORPAY_KEY = EXTERNAL_SERVICES.payment.razorpay.keyId;

// Payment Provider Types
export type PaymentProvider = 'stripe' | 'razorpay';

// Default payment provider
export const DEFAULT_PAYMENT_PROVIDER: PaymentProvider = 'stripe';

// Currency configuration
export const CURRENCY_CONFIG = {
  INR: { symbol: '₹', code: 'INR', name: 'Indian Rupee' },
  AED: { symbol: 'AED ', code: 'AED', name: 'UAE Dirham' },
  USD: { symbol: '$', code: 'USD', name: 'US Dollar' },
} as const;

export type SupportedCurrency = keyof typeof CURRENCY_CONFIG;

/**
 * Get currency symbol for display
 */
export const getCurrencySymbol = (currency: string): string => {
  const config = CURRENCY_CONFIG[currency as SupportedCurrency];
  return config?.symbol || '₹';
};

/**
 * Check if Stripe is configured
 */
export const isStripeConfigured = (): boolean => {
  return Boolean(STRIPE_PUBLISHABLE_KEY && STRIPE_PUBLISHABLE_KEY.length > 0);
};

/**
 * Check if Razorpay is configured
 */
export const isRazorpayConfigured = (): boolean => {
  return Boolean(RAZORPAY_KEY && RAZORPAY_KEY.length > 0);
};

export default {
  STRIPE_PUBLISHABLE_KEY,
  RAZORPAY_KEY,
  DEFAULT_PAYMENT_PROVIDER,
  CURRENCY_CONFIG,
  getCurrencySymbol,
  isStripeConfigured,
  isRazorpayConfigured,
};
