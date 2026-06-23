// Payment Types and Interfaces for Nuqta App
// Comprehensive payment system types

export type PaymentMethodType = 'upi' | 'card' | 'wallet' | 'netbanking' | 'cod' | 'nuqtacoins';
export type PaymentGateway = 'razorpay' | 'stripe' | 'internal' | 'none';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';
export type CardType = 'visa' | 'mastercard' | 'amex' | 'rupay' | 'unknown';

/**
 * Payment Method Interface
 */
export interface PaymentMethod {
  id: string;
  name: string;
  type: PaymentMethodType;
  gateway: PaymentGateway;
  icon: string;
  isAvailable: boolean;
  processingFee?: number; // percentage
  processingTime?: string;
  description?: string;
  minAmount?: number;
  maxAmount?: number;
  supportedCurrencies?: string[];
  isDefault?: boolean;
}

/**
 * Saved Card Interface (Tokenized)
 */
export interface SavedCard {
  id: string;
  last4: string;
  brand: CardType;
  expiryMonth: number;
  expiryYear: number;
  holderName: string;
  isDefault: boolean;
  token: string; // Tokenized card reference
  gateway: PaymentGateway;
  createdAt: string;
}

/**
 * UPI Details
 */
export interface UPIDetails {
  vpa: string; // Virtual Payment Address (UPI ID)
  name?: string;
  app?: 'gpay' | 'phonepe' | 'paytm' | 'bhim' | 'other';
}

/**
 * Card Details (Never store actual card numbers)
 */
export interface CardDetails {
  number: string; // Only for payment processing, never stored
  expiry: string; // MM/YY format
  cvv: string;
  name: string;
  saveCard?: boolean;
}

/**
 * Net Banking Details
 */
export interface NetBankingDetails {
  bankCode: string;
  bankName: string;
}

/**
 * Payment Request
 */
export interface PaymentRequest {
  orderId: string; // MongoDB order ID
  amount: number;
  currency: string;
  paymentMethod: PaymentMethodType;
  gateway: PaymentGateway;

  // Method-specific details
  upiDetails?: UPIDetails;
  cardDetails?: CardDetails;
  savedCardId?: string;
  netBankingDetails?: NetBankingDetails;
  walletType?: string;

  // Additional metadata
  metadata?: {
    userId?: string;
    storeId?: string;
    storeName?: string;
    items?: any[];
    deliveryAddress?: any;
    couponCode?: string;
  };
}

/**
 * Payment Response
 */
export interface PaymentResponse {
  success: boolean;
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;

  // Gateway-specific data
  gatewayOrderId?: string; // Razorpay/Stripe order ID
  gatewayPaymentId?: string;
  transactionId?: string;

  // Payment details
  paymentMethod: PaymentMethodType;
  gateway: PaymentGateway;

  // Additional data
  paymentUrl?: string; // For redirect-based payments
  qrCode?: string; // For UPI QR code
  expiryTime?: string;
  failureReason?: string;

  // Timestamps
  createdAt: string;
  completedAt?: string;
}

/**
 * Razorpay Order Response
 */
export interface RazorpayOrder {
  id: string; // Razorpay order ID
  amount: number; // in paise
  currency: string;
  receipt: string;
  status: string;
  key: string; // Razorpay key ID
}

/**
 * Razorpay Payment Success Data
 */
export interface RazorpayPaymentData {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

/**
 * Stripe Payment Intent
 */
export interface StripePaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethodTypes: string[];
}

/**
 * COD Configuration
 */
export interface CODConfig {
  isAvailable: boolean;
  fee: number;
  minOrderAmount: number;
  maxOrderAmount: number;
  availableInPincodes?: string[];
  unavailableInPincodes?: string[];
}

/**
 * Payment Method Configuration
 */
export interface PaymentConfig {
  razorpay: {
    enabled: boolean;
    keyId: string;
  };
  stripe: {
    enabled: boolean;
    publishableKey: string;
  };
  cod: CODConfig;
  rezCoins: {
    enabled: boolean;
    maxUsagePercentage: number; // Max percentage of order that can be paid with coins
  };
}

/**
 * Payment Transaction
 */
export interface PaymentTransaction {
  id: string;
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethodType;
  gateway: PaymentGateway;
  status: PaymentStatus;

  // Gateway references
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  gatewayTransactionId?: string;

  // Payment details
  last4?: string; // For card payments
  upiVpa?: string; // For UPI payments
  bankName?: string; // For net banking

  // Fees and taxes
  processingFee: number;
  gatewayFee: number;
  taxes: number;
  netAmount: number;

  // Metadata
  metadata?: Record<string, any>;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  failedAt?: string;

  // Failure details
  failureReason?: string;
  failureCode?: string;

  // Refund details
  isRefunded?: boolean;
  refundAmount?: number;
  refundedAt?: string;
  refundReason?: string;
}

/**
 * Payment Validation Result
 */
export interface PaymentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Payment Method Preference
 */
export interface PaymentMethodPreference {
  userId: string;
  preferredMethod: PaymentMethodType;
  preferredGateway: PaymentGateway;
  savedCards: SavedCard[];
  savedUPIIds: string[];
  autoSaveCards: boolean;
  lastUsedMethod?: PaymentMethodType;
  updatedAt: string;
}

/**
 * Payment Analytics
 */
export interface PaymentAnalytics {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  successRate: number;
  totalAmount: number;
  averageAmount: number;
  methodBreakdown: Record<PaymentMethodType, number>;
  gatewayBreakdown: Record<PaymentGateway, number>;
}
