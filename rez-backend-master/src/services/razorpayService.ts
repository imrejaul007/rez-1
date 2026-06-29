import { logger } from '../config/logger';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { razorpayConfig, validateRazorpayConfig } from '../config/razorpay.config';
import { razorpayCircuit } from '../utils/circuitBreaker';
import { withTimeout, TimeoutError } from '../utils/timeout';

/**
 * Razorpay Service
 * Handles all payment gateway interactions
 */

// Default timeout for any Razorpay network call (10s).
// Override with RAZORPAY_HTTP_TIMEOUT_MS env var.
const RAZORPAY_TIMEOUT_MS = parseInt(process.env.RAZORPAY_HTTP_TIMEOUT_MS || '10000', 10);

/**
 * Execute a Razorpay API call with circuit breaker and timeout protection.
 * This prevents cascading failures when Razorpay is experiencing issues.
 */
async function withCircuitBreaker<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  try {
    return await razorpayCircuit.exec(async () => {
      return withTimeout(operation(), {
        timeout: RAZORPAY_TIMEOUT_MS,
        operation: `razorpay:${operationName}`,
      });
    });
  } catch (error) {
    // Log circuit breaker state changes
    if (error instanceof Error && error.message.includes('Circuit is OPEN')) {
      logger.error(`🔴 [CIRCUIT_BREAKER] Razorpay circuit is OPEN — request rejected: ${operationName}`);
    }
    if (error instanceof TimeoutError) {
      logger.error(`⏱️ [CIRCUIT_BREAKER] Razorpay timeout: ${operationName} exceeded ${RAZORPAY_TIMEOUT_MS}ms`);
    }
    throw error;
  }
}

// Initialize Razorpay instance
let razorpayInstance: Razorpay | null = null;

function getRazorpayInstance(): Razorpay {
  if (!razorpayInstance) {
    validateRazorpayConfig();
    
    razorpayInstance = new Razorpay({
      key_id: razorpayConfig.keyId,
      key_secret: razorpayConfig.keySecret,
    });
    
    logger.info('✅ [RAZORPAY] Instance initialized');
  }
  
  return razorpayInstance;
}

/**
 * Create a Razorpay order
 */
export async function createRazorpayOrder(
  amount: number, // Amount in rupees
  receipt: string,
  notes?: Record<string, any>
): Promise<{
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
  notes: Record<string, any>;
  created_at: number;
}> {
  try {
    const razorpay = getRazorpayInstance();

    // FIX [LOW-4]: Validate minimum amount (Razorpay requires minimum 1 INR = 100 paise)
    const amountInPaise = Math.round(amount * 100);
    if (amountInPaise < 100) {
      logger.error('❌ [RAZORPAY] Amount below minimum:', { amount, minimumRequired: 1 });
      throw new Error(`Minimum amount for Razorpay is 1 INR. Requested: ${amount} INR`);
    }

    // FIX [HIGH-1]: Add idempotency key to prevent duplicate orders on network retry
    const idempotencyKey = `razorpay_order_${receipt}_${Date.now()}`;

    const options: any = {
      amount: amountInPaise,
      currency: razorpayConfig.currency,
      receipt,
      notes: notes || {},
      idempotency_key: idempotencyKey,
    };

    logger.info('💳 [RAZORPAY] Creating order:', {
      amount: `₹${amount}`,
      receipt,
      notes,
    });
    
    const order = await withCircuitBreaker(
      () => razorpay.orders.create(options),
      'orders.create'
    );
    
    logger.info('✅ [RAZORPAY] Order created:', {
      orderId: order.id,
      amount: `₹${amount}`,
      status: order.status,
    });
    
    // Return with properly typed fields (convert to ensure correct types)
    return {
      ...order,
      amount: Number(order.amount),
      amount_paid: Number(order.amount_paid || 0),
      amount_due: Number(order.amount_due || order.amount),
      receipt: order.receipt || receipt, // Use original receipt if order.receipt is undefined
      notes: (order.notes as Record<string, any>) || {}, // Ensure notes is always an object
    };
  } catch (error: any) {
    logger.error('❌ [RAZORPAY] Order creation failed:', error);
    throw new Error(`Razorpay order creation failed: ${error.message}`);
  }
}

/**
 * Verify Razorpay payment signature
 * This is critical for security - always verify payment on server side
 */
export function verifyRazorpaySignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): boolean {
  try {
    const text = `${razorpayOrderId}|${razorpayPaymentId}`;
    
    const expectedSignature = crypto
      .createHmac('sha256', razorpayConfig.keySecret)
      .update(text)
      .digest('hex');
    
    // FIX [HIGH-2]: Use timing-safe comparison to prevent timing attacks
    let isValid = false;
    try {
      isValid = crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(razorpaySignature)
      );
    } catch (e) {
      // Buffers have different lengths - cannot be equal
      isValid = false;
    }

    if (isValid) {
      logger.info('✅ [RAZORPAY] Signature verified:', {
        orderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
      });
    } else {
      logger.error('❌ [RAZORPAY] Signature verification failed:', {
        orderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
        // FIX: Don't log expected/received signatures in production for security
      });
    }

    return isValid;
  } catch (error) {
    logger.error('❌ [RAZORPAY] Signature verification error:', error);
    return false;
  }
}

/**
 * Fetch payment details from Razorpay
 */
export async function fetchPaymentDetails(paymentId: string) {
  try {
    const razorpay = getRazorpayInstance();
    const payment = await withTimeout(
      razorpay.payments.fetch(paymentId),
      { timeout: RAZORPAY_TIMEOUT_MS, operation: `payments.fetch(${paymentId})` }
    );
    
    const paymentAmount = Number(payment.amount) / 100;
    
    logger.info('✅ [RAZORPAY] Payment details fetched:', {
      paymentId,
      status: payment.status,
      method: payment.method,
      amount: `₹${paymentAmount}`,
    });
    
    return payment;
  } catch (error: any) {
    logger.error('❌ [RAZORPAY] Failed to fetch payment details:', error);
    throw new Error(`Failed to fetch payment details: ${error.message}`);
  }
}

/**
 * Refund a payment
 */
export async function createRefund(
  paymentId: string,
  amount?: number, // Amount in rupees (optional, defaults to full refund)
  notes?: Record<string, any>
) {
  try {
    const razorpay = getRazorpayInstance();
    
    const options: any = {
      notes: notes || {},
    };
    
    if (amount) {
      options.amount = Math.round(amount * 100); // Convert to paise
    }
    
    logger.info('💰 [RAZORPAY] Creating refund:', {
      paymentId,
      amount: amount ? `₹${amount}` : 'Full refund',
    });
    
    const refund = await withTimeout(
      razorpay.payments.refund(paymentId, options),
      { timeout: RAZORPAY_TIMEOUT_MS, operation: `payments.refund(${paymentId})` }
    );
    
    const refundAmount = refund.amount ? Number(refund.amount) / 100 : 0;
    
    logger.info('✅ [RAZORPAY] Refund created:', {
      refundId: refund.id,
      status: refund.status,
      amount: `₹${refundAmount}`,
    });
    
    return refund;
  } catch (error: any) {
    logger.error('❌ [RAZORPAY] Refund creation failed:', error);
    throw new Error(`Refund creation failed: ${error.message}`);
  }
}

/**
 * Get Razorpay configuration for frontend
 * (Only sends safe, public information)
 */
export function getRazorpayConfigForFrontend() {
  return {
    keyId: razorpayConfig.keyId,
    currency: razorpayConfig.currency,
    checkout: razorpayConfig.checkout,
    isTestMode: razorpayConfig.isTestMode,
  };
}

/**
 * Validate webhook signature (for webhook endpoints)
 * FIX [HIGH-2]: Use timing-safe comparison to prevent timing attacks
 */
export function validateWebhookSignature(
  webhookBody: string,
  webhookSignature: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', razorpayConfig.keySecret)
      .update(webhookBody)
      .digest('hex');

    // FIX [HIGH-2]: Use timing-safe comparison to prevent timing attacks
    try {
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(webhookSignature)
      );
    } catch (e) {
      // If buffers have different lengths, they can't be equal
      return false;
    }
  } catch (error) {
    logger.error('❌ [RAZORPAY] Webhook signature validation failed:', error);
    return false;
  }
}

/**
 * Create a Razorpay payout (for cashback payments)
 */
export async function createRazorpayPayout(params: {
  amount: number; // Amount in rupees
  currency?: string;
  accountNumber: string;
  ifsc: string;
  name: string;
  purpose: string;
  reference: string;
}): Promise<{
  id: string;
  entity: string;
  amount: number;
  currency: string;
  status: string;
  purpose: string;
  utr?: string;
  mode: string;
  reference_id: string;
  narration?: string;
  created_at: number;
}> {
  try {
    const razorpay = getRazorpayInstance();

    const payoutData: any = {
      account_number: params.accountNumber,
      fund_account: {
        account_type: 'bank_account',
        bank_account: {
          name: params.name,
          ifsc: params.ifsc,
          account_number: params.accountNumber
        },
        contact: {
          name: params.name,
          type: 'customer'
        }
      },
      amount: Math.round(params.amount * 100), // Convert to paise
      currency: params.currency || 'INR',
      mode: 'IMPS', // Can be NEFT, RTGS, IMPS, or UPI
      purpose: params.purpose,
      queue_if_low_balance: true,
      reference_id: params.reference,
      narration: `Cashback payment - ${params.reference}`
    };

    logger.info('💸 [RAZORPAY] Creating payout:', {
      amount: `₹${params.amount}`,
      account: `****${params.accountNumber.slice(-4)}`,
      ifsc: params.ifsc,
      reference: params.reference
    });

    // CRITICAL: Production must use real Razorpay X API - never simulate
    const isProduction = process.env.NODE_ENV === 'production';

    let payout: any;

    if (isProduction) {
      // Production: Call actual Razorpay X Payouts API
      logger.info('💸 [RAZORPAY] Calling real Razorpay X Payouts API');
      payout = await withTimeout(
        (razorpay as any).payouts.create(payoutData),
        { timeout: RAZORPAY_TIMEOUT_MS, operation: `payouts.create(${params.reference})` }
      );
      logger.info('✅ [RAZORPAY] Real payout created:', {
        payoutId: payout.id,
        amount: `₹${params.amount}`,
        status: payout.status
      });
    } else {
      // Development/Testing: Use simulated response with clear marking
      logger.warn('⚠️ [RAZORPAY] Using SIMULATED payout (NOT production)');

      payout = {
        id: `pout_${Date.now()}`,
        entity: 'payout',
        amount: Math.round(params.amount * 100),
        currency: params.currency || 'INR',
        status: 'simulated',
        purpose: params.purpose,
        mode: 'IMPS',
        reference_id: params.reference,
        narration: `Cashback payment - ${params.reference}`,
        created_at: Math.floor(Date.now() / 1000),
        _simulated: true, // Always marked as simulated
        _warning: 'DO NOT use simulated payouts in production'
      };

      logger.info('✅ [RAZORPAY] Simulated payout created (DEV ONLY):', {
        payoutId: payout.id,
        amount: `₹${params.amount}`
      });
    }

    return payout;
  } catch (error: any) {
    logger.error('❌ [RAZORPAY] Payout creation failed:', error);
    throw new Error(`Payout creation failed: ${error.message}`);
  }
}

/**
 * Alias for createRefund - used by merchant order controller
 */
export const createRazorpayRefund = createRefund;

export const razorpayService = {
  createOrder: createRazorpayOrder,
  verifySignature: verifyRazorpaySignature,
  fetchPaymentDetails,
  createRefund,
  createRazorpayRefund,
  createPayout: createRazorpayPayout,
  getConfigForFrontend: getRazorpayConfigForFrontend,
  validateWebhookSignature,
};

