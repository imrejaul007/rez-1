// @ts-nocheck
/**
 * Payment entity — canonical shape for the `payments` collection.
 *
 * Mirrors rezbackend/src/models/Payment.ts (authoritative writer is the
 * rez-payment-service; backend reads only).
 *
 * The status enum covers all 11 states the FSM understands; see
 * `../fsm/paymentFsm.ts` for transition rules. Convenience helpers are
 * re-exported from `../index.ts`.
 *
 * Design choices worth reading:
 *   - `metadata` is typed as `PaymentMetadata` with KNOWN gateway keys,
 *     not `Record<string, any>`. Unknown keys still pass through via
 *     index signature, but at least razorpayOrderId / stripeWebhookId /
 *     paypalOrderId get IDE completion.
 *   - `gatewayResponse` is a discriminated union on `gateway` so upi-
 *     specific fields (upiId) don't appear on card responses.
 *   - Timestamps are `Date` (node) or `string` (serialized). The schema
 *     accepts either; callers should normalize on ingress.
 */
import { PaymentStatus, PaymentMethod, PaymentGateway } from '../enums/index';
export type PaymentPurpose = 'wallet_topup' | 'order_payment' | 'event_booking' | 'financial_service' | 'other';
export interface IPaymentUserDetails {
  name?: string;
  email?: string;
  phone?: string;
}
/**
 * Gateway metadata. Known keys are typed; additional provider-specific
 * keys (e.g. stripePaymentIntentId) are tolerated via index signature.
 */
export interface PaymentMetadata {
  /** Razorpay order_id stamped at payment creation (idempotency key). */
  razorpayOrderId?: string;
  /** Stripe Event ID (evt_xxx) — used for webhook dedup. */
  stripeWebhookId?: string;
  /** PayPal Order ID — used for capture dedup. */
  paypalOrderId?: string;
  /** Any additional gateway-specific string metadata. */
  [key: string]: string | number | boolean | null | undefined;
}
/**
 * Gateway-specific response payload. Discriminated on `gateway`.
 * Use `gatewayResponse.gateway === 'razorpay'` to narrow safely.
 */
export type IPaymentGatewayResponse =
  | {
      gateway: 'razorpay';
      transactionId?: string;
      paymentUrl?: string;
      razorpayPaymentId?: string;
      razorpaySignature?: string;
      timestamp: Date | string;
    }
  | {
      gateway: 'stripe';
      transactionId?: string;
      paymentIntentId?: string;
      clientSecret?: string;
      timestamp: Date | string;
    }
  | {
      gateway: 'paypal';
      transactionId?: string;
      paypalOrderId?: string;
      captureId?: string;
      timestamp: Date | string;
    }
  | {
      gateway: 'upi';
      transactionId?: string;
      upiId?: string;
      qrCode?: string;
      expiryTime?: Date | string;
      timestamp: Date | string;
    }
  | {
      gateway: 'wallet' | 'cod';
      transactionId?: string;
      timestamp: Date | string;
    };
/** Canonical Payment document — what the API returns. */
export interface IPayment {
  _id?: string;
  /** Gateway-visible payment identifier, usually from the provider. */
  paymentId: string;
  /** Order this payment is for. Always a string (24-char ObjectId hex). */
  orderId: string;
  /** User id (ObjectId hex). */
  user: string;
  /** Amount in the smallest currency unit's **rupee** equivalent (backend uses ₹, not paise). */
  amount: number;
  /** ISO-4217 currency code — defaults to INR. Uppercased. */
  currency: string;
  /** How the customer paid (HOW, not WHO processed). */
  paymentMethod: PaymentMethod;
  /** Which gateway processed the payment (WHO, not HOW). */
  gateway?: PaymentGateway;
  /** Business reason for the charge. */
  purpose: PaymentPurpose;
  /** 11-state lifecycle status — see `fsm/paymentFsm.ts`. */
  status: PaymentStatus;
  userDetails: IPaymentUserDetails;
  metadata: PaymentMetadata;
  gatewayResponse?: IPaymentGatewayResponse;
  failureReason?: string;
  /** True once the Wallet credit for this payment has been written. */
  walletCredited?: boolean;
  walletCreditedAt?: Date | string;
  completedAt?: Date | string;
  failedAt?: Date | string;
  /**
   * Optional — set only for non-terminal states. The TTL partial-filter
   * index auto-deletes rows whose `expiresAt` is in the past AND whose
   * status is in {pending, processing, failed, cancelled, expired}.
   * Completed payments MUST have this field unset (never expire).
   */
  expiresAt?: Date | string;
  /** Running total refunded against this payment (0 if no refunds). */
  refundedAmount?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}
/**
 * Re-export the FSM transition map for backward compatibility with
 * callers that imported `PAYMENT_STATE_TRANSITIONS` from the entity
 * file before the FSM helpers were split out.
 */
export { PAYMENT_STATE_TRANSITIONS } from '../fsm/paymentFsm';
//# sourceMappingURL=payment.d.ts.map
