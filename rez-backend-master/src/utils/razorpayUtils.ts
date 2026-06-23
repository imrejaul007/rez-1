/**
 * Razorpay Utility Functions
 * Centralized utilities for Razorpay payment processing, signature validation, and error handling
 */

import crypto from 'crypto';
import { PaymentLogger } from '../services/logging/paymentLogger';
import { logger } from '../config/logger';

/**
 * Razorpay signature validation result interface
 */
export interface IRazorpaySignatureValidationResult {
  isValid: boolean;
  error?: string;
  details?: {
    orderId: string;
    paymentId: string;
    signatureProvided: string;
    signatureGenerated?: string;
  };
}

/**
 * Payment verification data interface
 */
export interface IPaymentVerificationData {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

/**
 * Razorpay webhook signature validation result
 */
export interface IWebhookValidationResult {
  isValid: boolean;
  error?: string;
  eventType?: string;
}

/**
 * Validate Razorpay payment signature using HMAC-SHA256
 * This is the primary method for verifying payment authenticity
 *
 * @param orderId - Razorpay order ID
 * @param paymentId - Razorpay payment ID
 * @param signature - Signature received from Razorpay
 * @param secret - Razorpay key secret from environment
 * @returns Validation result with details
 */
export function validateRazorpayPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): IRazorpaySignatureValidationResult {
  try {
    // Input validation
    if (!orderId || !paymentId || !signature || !secret) {
      return {
        isValid: false,
        error: 'Missing required parameters for signature validation',
        details: {
          orderId,
          paymentId,
          signatureProvided: signature
        }
      };
    }

    // Check if secret is the default/dummy value
    if (secret === 'dummy_secret' || secret === 'your_razorpay_key_secret_here') {
      return {
        isValid: false,
        error: 'Razorpay secret is not configured properly. Please set RAZORPAY_KEY_SECRET in .env',
        details: {
          orderId,
          paymentId,
          signatureProvided: signature
        }
      };
    }

    // Create the text string as per Razorpay documentation
    // Format: razorpay_order_id + "|" + razorpay_payment_id
    const text = `${orderId}|${paymentId}`;

    // Generate HMAC SHA256 signature
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(text)
      .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(generatedSignature),
      Buffer.from(signature)
    );

    // Log the validation result
    if (isValid) {
      PaymentLogger.logPaymentSuccess(paymentId, orderId, 0, 'razorpay');
      logger.info('✅ [RAZORPAY UTILS] Signature validation successful:', {
        orderId,
        paymentId,
        timestamp: new Date().toISOString()
      });
    } else {
      logger.error('❌ [RAZORPAY UTILS] Signature validation failed:', {
        orderId,
        paymentId,
        signatureProvided: signature,
        signatureGenerated: generatedSignature,
        timestamp: new Date().toISOString()
      });
    }

    return {
      isValid,
      details: {
        orderId,
        paymentId,
        signatureProvided: signature,
        signatureGenerated: generatedSignature
      }
    };
  } catch (error: any) {
    logger.error('❌ [RAZORPAY UTILS] Error during signature validation:', error);
    return {
      isValid: false,
      error: `Signature validation error: ${error.message}`,
      details: {
        orderId,
        paymentId,
        signatureProvided: signature
      }
    };
  }
}

/**
 * Validate Razorpay webhook signature
 * Used to verify webhook events from Razorpay
 *
 * @param webhookBody - Raw webhook body as string
 * @param webhookSignature - Signature from x-razorpay-signature header
 * @param webhookSecret - Webhook secret from Razorpay dashboard
 * @returns Validation result
 */
export function validateRazorpayWebhookSignature(
  webhookBody: string,
  webhookSignature: string,
  webhookSecret: string
): IWebhookValidationResult {
  try {
    // Input validation
    if (!webhookBody || !webhookSignature || !webhookSecret) {
      return {
        isValid: false,
        error: 'Missing required parameters for webhook validation'
      };
    }

    // Check if webhook secret is configured
    if (webhookSecret === 'your_webhook_secret_here' || !webhookSecret) {
      logger.warn('⚠️ [RAZORPAY UTILS] Webhook secret not configured. Set RAZORPAY_WEBHOOK_SECRET in .env');
      return {
        isValid: false,
        error: 'Webhook secret not configured'
      };
    }

    // Generate expected signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(webhookBody)
      .digest('hex');

    // Use timing-safe comparison
    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(webhookSignature)
    );

    // Parse event type for logging
    let eventType: string | undefined;
    try {
      const payload = JSON.parse(webhookBody);
      eventType = payload.event;

      if (isValid && eventType) {
        PaymentLogger.logRazorpayEvent(eventType, payload.payload?.payment?.entity?.id || 'unknown', payload);
      }
    } catch (parseError) {
      logger.warn('⚠️ [RAZORPAY UTILS] Could not parse webhook body for event type');
    }

    if (isValid) {
      logger.info('✅ [RAZORPAY UTILS] Webhook signature validated:', {
        eventType,
        timestamp: new Date().toISOString()
      });
    } else {
      logger.error('❌ [RAZORPAY UTILS] Webhook signature validation failed:', {
        eventType,
        timestamp: new Date().toISOString()
      });
    }

    return {
      isValid,
      eventType
    };
  } catch (error: any) {
    logger.error('❌ [RAZORPAY UTILS] Webhook validation error:', error);
    return {
      isValid: false,
      error: `Webhook validation error: ${error.message}`
    };
  }
}

/**
 * Verify payment data completeness before processing
 * Ensures all required fields are present and valid
 *
 * @param verificationData - Payment verification data from frontend
 * @returns Object with isValid flag and error message if invalid
 */
export function verifyPaymentDataCompleteness(
  verificationData: IPaymentVerificationData
): { isValid: boolean; error?: string } {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = verificationData;

  // Check for missing fields
  if (!razorpay_order_id) {
    return { isValid: false, error: 'Razorpay order ID is missing' };
  }

  if (!razorpay_payment_id) {
    return { isValid: false, error: 'Razorpay payment ID is missing' };
  }

  if (!razorpay_signature) {
    return { isValid: false, error: 'Razorpay signature is missing' };
  }

  // Validate format (basic checks)
  if (!razorpay_order_id.startsWith('order_')) {
    return { isValid: false, error: 'Invalid Razorpay order ID format' };
  }

  if (!razorpay_payment_id.startsWith('pay_')) {
    return { isValid: false, error: 'Invalid Razorpay payment ID format' };
  }

  // Signature should be 64 characters (SHA256 hex)
  if (razorpay_signature.length !== 64) {
    return { isValid: false, error: 'Invalid signature format' };
  }

  return { isValid: true };
}

/**
 * Convert amount from rupees to paise (smallest currency unit)
 * Razorpay requires amounts in paise (1 rupee = 100 paise)
 *
 * @param amountInRupees - Amount in rupees
 * @returns Amount in paise
 */
export function convertToPaise(amountInRupees: number): number {
  if (typeof amountInRupees !== 'number' || isNaN(amountInRupees)) {
    throw new Error('Invalid amount: must be a valid number');
  }

  if (amountInRupees < 0) {
    throw new Error('Invalid amount: cannot be negative');
  }

  // Round to avoid floating point issues
  return Math.round(amountInRupees * 100);
}

/**
 * Convert amount from paise to rupees
 *
 * @param amountInPaise - Amount in paise
 * @returns Amount in rupees
 */
export function convertToRupees(amountInPaise: number): number {
  if (typeof amountInPaise !== 'number' || isNaN(amountInPaise)) {
    throw new Error('Invalid amount: must be a valid number');
  }

  if (amountInPaise < 0) {
    throw new Error('Invalid amount: cannot be negative');
  }

  // Divide by 100 and round to 2 decimal places
  return Math.round(amountInPaise) / 100;
}

/**
 * Validate Razorpay order status
 * Checks if order is in a valid state for payment processing
 *
 * @param orderStatus - Razorpay order status
 * @returns Whether the order status is valid
 */
export function isValidOrderStatus(orderStatus: string): boolean {
  const validStatuses = ['created', 'attempted', 'paid'];
  return validStatuses.includes(orderStatus);
}

/**
 * Validate Razorpay payment status
 * Checks if payment is in a valid completed state
 *
 * @param paymentStatus - Razorpay payment status
 * @returns Whether the payment is successfully completed
 */
export function isPaymentSuccessful(paymentStatus: string): boolean {
  // Payment must be 'captured' or 'authorized' to be considered successful
  const successStatuses = ['captured', 'authorized'];
  return successStatuses.includes(paymentStatus);
}

/**
 * Format Razorpay error for logging and user display
 *
 * @param error - Error object from Razorpay
 * @returns Formatted error message
 */
export function formatRazorpayError(error: any): {
  userMessage: string;
  technicalMessage: string;
  code?: string;
} {
  // Handle Razorpay-specific errors
  if (error.error) {
    const razorpayError = error.error;
    return {
      userMessage: razorpayError.description || 'Payment processing failed',
      technicalMessage: `${razorpayError.code}: ${razorpayError.description}`,
      code: razorpayError.code
    };
  }

  // Handle generic errors
  return {
    userMessage: 'Payment processing failed. Please try again.',
    technicalMessage: error.message || 'Unknown error',
    code: error.code
  };
}

/**
 * Check if Razorpay is properly configured
 * Validates that all required environment variables are set
 *
 * @returns Configuration validation result
 */
export function validateRazorpayConfiguration(): {
  isValid: boolean;
  missingVars: string[];
  warnings: string[];
} {
  const missingVars: string[] = [];
  const warnings: string[] = [];

  // Check key ID
  const keyId = process.env.RAZORPAY_KEY_ID;
  if (!keyId || keyId === 'rzp_test_your_key_id_here') {
    missingVars.push('RAZORPAY_KEY_ID');
  }

  // Check key secret
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret || keySecret === 'your_razorpay_key_secret_here') {
    missingVars.push('RAZORPAY_KEY_SECRET');
  }

  // Check webhook secret (warning only, not critical)
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret || webhookSecret === 'your_webhook_secret_here') {
    warnings.push('RAZORPAY_WEBHOOK_SECRET is not configured. Webhook events will not be verified.');
  }

  // Check if using test keys in production
  if (process.env.NODE_ENV === 'production' && keyId && keyId.startsWith('rzp_test_')) {
    warnings.push('Using test Razorpay keys in production environment. Please use live keys.');
  }

  return {
    isValid: missingVars.length === 0,
    missingVars,
    warnings
  };
}

/**
 * Generate a unique receipt ID for Razorpay order
 * Format: order_rcpt_<timestamp>_<random>
 *
 * @param orderNumber - Optional order number to include
 * @returns Unique receipt ID
 */
export function generateReceiptId(orderNumber?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);

  if (orderNumber) {
    return `rcpt_${orderNumber}_${timestamp}_${random}`;
  }

  return `rcpt_${timestamp}_${random}`;
}

/**
 * Log payment verification attempt for audit purposes
 *
 * @param orderId - MongoDB order ID
 * @param userId - User ID
 * @param razorpayOrderId - Razorpay order ID
 * @param razorpayPaymentId - Razorpay payment ID
 * @param isValid - Whether signature validation passed
 */
export function logPaymentVerificationAttempt(
  orderId: string,
  userId: string,
  razorpayOrderId: string,
  razorpayPaymentId: string,
  isValid: boolean
): void {
  const logData = {
    orderId,
    userId,
    razorpayOrderId,
    razorpayPaymentId,
    isValid,
    timestamp: new Date().toISOString(),
    ipAddress: 'N/A' // Can be added from request object if available
  };

  if (isValid) {
    logger.info('✅ [AUDIT] Payment verification successful:', logData);
  } else {
    logger.error('❌ [AUDIT] Payment verification failed:', logData);
  }
}

/**
 * Sanitize payment data for logging (remove sensitive information)
 *
 * @param data - Payment data object
 * @returns Sanitized data safe for logging
 */
export function sanitizePaymentData(data: any): any {
  const sanitized = { ...data };

  // Remove or mask sensitive fields
  const sensitiveFields = [
    'razorpay_signature',
    'signature',
    'card_number',
    'cvv',
    'card',
    'token'
  ];

  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      // Mask the value (show only first 4 and last 4 characters)
      const value = String(sanitized[field]);
      if (value.length > 8) {
        sanitized[field] = `${value.substring(0, 4)}****${value.substring(value.length - 4)}`;
      } else {
        sanitized[field] = '****';
      }
    }
  });

  return sanitized;
}

/**
 * Constants for Razorpay integration
 */
export const RAZORPAY_CONSTANTS = {
  CURRENCY: 'INR',
  PAYMENT_CAPTURE_AUTO: 1,
  PAYMENT_CAPTURE_MANUAL: 0,
  MIN_AMOUNT_PAISE: 100, // Minimum 1 rupee
  MAX_AMOUNT_PAISE: 1000000000, // Maximum 10,00,00,000 rupees (10 crores)
  ORDER_STATUS: {
    CREATED: 'created',
    ATTEMPTED: 'attempted',
    PAID: 'paid'
  },
  PAYMENT_STATUS: {
    CREATED: 'created',
    AUTHORIZED: 'authorized',
    CAPTURED: 'captured',
    REFUNDED: 'refunded',
    FAILED: 'failed'
  },
  WEBHOOK_EVENTS: {
    PAYMENT_AUTHORIZED: 'payment.authorized',
    PAYMENT_CAPTURED: 'payment.captured',
    PAYMENT_FAILED: 'payment.failed',
    ORDER_PAID: 'order.paid',
    REFUND_CREATED: 'refund.created',
    REFUND_PROCESSED: 'refund.processed'
  }
} as const;

export default {
  validateRazorpayPaymentSignature,
  validateRazorpayWebhookSignature,
  verifyPaymentDataCompleteness,
  convertToPaise,
  convertToRupees,
  isValidOrderStatus,
  isPaymentSuccessful,
  formatRazorpayError,
  validateRazorpayConfiguration,
  generateReceiptId,
  logPaymentVerificationAttempt,
  sanitizePaymentData,
  RAZORPAY_CONSTANTS
};
