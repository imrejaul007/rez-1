// @ts-nocheck
/**
 * Payment zod schemas — API-boundary validation.
 *
 * Strictness: `.strict()` on every object so unknown fields throw rather
 * than silently forwarding. This caught two drift bugs during rollout —
 * the consumer was shipping an extra `razorpayPaymentId` at the top level
 * that the backend was silently ignoring, and `PaymentGateway.COD` was
 * being sent where only {stripe, razorpay, paypal} is valid.
 *
 * Dates accept either Date or ISO string — backend serialization varies.
 */

import { z } from 'zod';

export const PAYMENT_STATUS = z.enum([
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled',
  'expired',
  'refund_initiated',
  'refund_processing',
  'refunded',
  'refund_failed',
  'partially_refunded',
]);

/** Payment method — HOW the customer pays (canonical 4-value set + cash-on-delivery extras). */
export const PAYMENT_METHOD = z.enum(['upi', 'card', 'wallet', 'netbanking', 'cod', 'bnpl', 'razorpay', 'stripe']);

/** Payment gateway — WHO processes the payment. Distinct from method. */
export const PAYMENT_GATEWAY = z.enum(['stripe', 'razorpay', 'paypal']);

export const PAYMENT_PURPOSE = z.enum(['wallet_topup', 'order_payment', 'event_booking', 'financial_service', 'other']);

export const PaymentUserDetailsSchema = z
  .object({
    name: z.string().optional(),
    email: z.string().email('Invalid email').optional(),
    phone: z.string().optional(),
  })
  .strict();

/** Metadata: known gateway keys are typed; index signature allows extras. */
export const PaymentMetadataSchema = z
  .object({
    razorpayOrderId: z.string().optional(),
    stripeWebhookId: z.string().optional(),
    paypalOrderId: z.string().optional(),
  })
  .catchall(z.union([z.string(), z.number(), z.boolean(), z.null()]));

const DateOrString = z.union([z.date(), z.string()]);

/** Discriminated gateway-response union. */
export const PaymentGatewayResponseSchema = z.discriminatedUnion('gateway', [
  z
    .object({
      gateway: z.literal('razorpay'),
      transactionId: z.string().optional(),
      paymentUrl: z.string().url().optional(),
      razorpayPaymentId: z.string().optional(),
      razorpaySignature: z.string().optional(),
      timestamp: DateOrString,
    })
    .strict(),
  z
    .object({
      gateway: z.literal('stripe'),
      transactionId: z.string().optional(),
      paymentIntentId: z.string().optional(),
      clientSecret: z.string().optional(),
      timestamp: DateOrString,
    })
    .strict(),
  z
    .object({
      gateway: z.literal('paypal'),
      transactionId: z.string().optional(),
      paypalOrderId: z.string().optional(),
      captureId: z.string().optional(),
      timestamp: DateOrString,
    })
    .strict(),
  z
    .object({
      gateway: z.literal('upi'),
      transactionId: z.string().optional(),
      upiId: z.string().optional(),
      qrCode: z.string().optional(),
      expiryTime: DateOrString.optional(),
      timestamp: DateOrString,
    })
    .strict(),
  z
    .object({
      gateway: z.enum(['wallet', 'cod']),
      transactionId: z.string().optional(),
      timestamp: DateOrString,
    })
    .strict(),
]);

export const CreatePaymentSchema = z
  .object({
    paymentId: z.string().min(1, 'Payment ID is required'),
    orderId: z.string().min(1, 'Order ID is required'),
    user: z.string().regex(/^[a-fA-F0-9]{24}$/, 'user must be an ObjectId'),
    amount: z.number().positive('Amount must be positive'),
    currency: z.string().min(1, 'Currency is required').default('INR'),
    paymentMethod: PAYMENT_METHOD,
    gateway: PAYMENT_GATEWAY.optional(),
    purpose: PAYMENT_PURPOSE.optional().default('order_payment'),
    userDetails: PaymentUserDetailsSchema,
    metadata: PaymentMetadataSchema.optional(),
    gatewayResponse: PaymentGatewayResponseSchema.optional(),
  })
  .strict();

export const UpdatePaymentStatusSchema = z
  .object({
    status: PAYMENT_STATUS,
    failureReason: z.string().optional(),
    walletCredited: z.boolean().optional(),
    refundedAmount: z.number().min(0).optional(),
    metadata: PaymentMetadataSchema.optional(),
  })
  .strict();

export const PaymentResponseSchema = z
  .object({
    _id: z.string().optional(),
    paymentId: z.string(),
    orderId: z.string(),
    user: z.string(),
    amount: z.number(),
    currency: z.string(),
    paymentMethod: PAYMENT_METHOD,
    gateway: PAYMENT_GATEWAY.optional(),
    purpose: PAYMENT_PURPOSE,
    status: PAYMENT_STATUS,
    userDetails: PaymentUserDetailsSchema,
    metadata: PaymentMetadataSchema.optional(),
    gatewayResponse: PaymentGatewayResponseSchema.optional(),
    failureReason: z.string().optional(),
    walletCredited: z.boolean().optional(),
    walletCreditedAt: DateOrString.optional(),
    completedAt: DateOrString.optional(),
    failedAt: DateOrString.optional(),
    expiresAt: DateOrString.optional(),
    refundedAmount: z.number().min(0).optional(),
    createdAt: DateOrString,
    updatedAt: DateOrString,
  })
  .strip(); // responses may include future-added fields; drop rather than reject

export const PaymentListResponseSchema = z.array(PaymentResponseSchema);

export type CreatePaymentRequest = z.infer<typeof CreatePaymentSchema>;
export type UpdatePaymentStatusRequest = z.infer<typeof UpdatePaymentStatusSchema>;
export type PaymentResponse = z.infer<typeof PaymentResponseSchema>;
export type PaymentListResponse = z.infer<typeof PaymentListResponseSchema>;
export type PaymentStatus = z.infer<typeof PAYMENT_STATUS>;
export type PaymentMethod = z.infer<typeof PAYMENT_METHOD>;
export type PaymentGateway = z.infer<typeof PAYMENT_GATEWAY>;
export type PaymentPurpose = z.infer<typeof PAYMENT_PURPOSE>;
export type PaymentMetadata = z.infer<typeof PaymentMetadataSchema>;
