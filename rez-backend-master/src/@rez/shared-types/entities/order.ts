// @ts-nocheck
/**
 * Order entity — canonical shape for the `orders` collection.
 *
 * Mirrors rezbackend/src/models/Order.ts. The Order.status FSM lives in
 * `../fsm/orderFsm.ts`; the Order.payment.status FSM lives in
 * `../fsm/orderPaymentFsm.ts`.
 *
 * Guiding choices:
 *   - Every enum value is a string literal, never `string`.
 *   - Optional vs. required matches the backend schema. Fields set by the
 *     post-payment pipeline (e.g. `postPaymentProcessed`) stay optional.
 *   - The legacy "Order.payment.status uses 'paid', Payment.status uses
 *     'completed'" gap is documented in-line so no one tries to unify them
 *     in passing. Cross-refs must go through `mapPaymentStatusToOrderPaymentStatus`.
 */

import { OrderStatus, PaymentStatus } from '../enums/index';
import type { OrderPaymentStatus } from '../fsm/orderPaymentFsm';

export type FulfillmentType = 'delivery' | 'pickup' | 'drive_thru' | 'dine_in';
export type OrderItemType = 'product' | 'service' | 'event';
export type OrderServiceLocation = 'home' | 'store' | 'online';
export type OrderPaymentMethod = 'wallet' | 'card' | 'upi' | 'cod' | 'netbanking' | 'razorpay' | 'stripe';
export type OrderDeliveryMethod = 'standard' | 'express' | 'pickup' | 'drive_thru' | 'dine_in' | 'scheduled';
export type OrderDeliveryStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'dispatched'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed'
  | 'returned';
export type OrderAnalyticsSource = 'app' | 'web' | 'social' | 'referral' | 'rendez';
export type OrderAddressType = 'home' | 'work' | 'other';
export type OrderPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface IOrderServiceBookingDetails {
  bookingDate: Date | string;
  timeSlot: { start: string; end: string };
  /** Minutes. */
  duration: number;
  serviceType: OrderServiceLocation;
  customerNotes?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
}

export interface IOrderItem {
  /** Product ObjectId hex. */
  product: string;
  /** Store ObjectId hex. */
  store: string;
  storeName?: string;
  /** Product name snapshotted at order time — do NOT read the live product. */
  name: string;
  /** Product image snapshotted at order time. */
  image: string;
  itemType: OrderItemType;
  quantity: number;
  variant?: { type: string; value: string };
  /** Unit price at time of order. */
  price: number;
  originalPrice?: number;
  discount?: number;
  /** price * quantity. */
  subtotal: number;
  serviceBookingId?: string;
  serviceBookingDetails?: IOrderServiceBookingDetails;
  smartSpendSource?: {
    smartSpendItemId: string;
    /** Coin reward rate snapshotted at order time. */
    coinRewardRate: number;
  };
  sku?: string;
  specialInstructions?: string;
}

export interface IOrderTotals {
  subtotal: number;
  tax: number;
  delivery: number;
  discount: number;
  lockFeeDiscount?: number;
  cashback: number;
  total: number;
  paidAmount: number;
  refundAmount?: number;
  /** 15% of subtotal — platform commission. */
  platformFee: number;
  /** subtotal − platformFee. */
  merchantPayout: number;
}

/**
 * Order.payment — the SUB-DOCUMENT on an order, NOT the Payment entity.
 * Status uses a distinct set of strings from the Payment FSM; map with
 * `mapPaymentStatusToOrderPaymentStatus()`.
 */
export interface IOrderPayment {
  method: OrderPaymentMethod;
  status: OrderPaymentStatus;
  transactionId?: string;
  paymentGateway?: string;
  failureReason?: string;
  paidAt?: Date | string;
  refundId?: string;
  refundedAt?: Date | string;
  coinsUsed?: {
    rezCoins?: number;
    /** @deprecated Legacy — still written by some older paths. */
    wasilCoins?: number;
    promoCoins?: number;
    storePromoCoins?: number;
    totalCoinsValue?: number;
  };
}

export interface IOrderAddress {
  name: string;
  phone: string;
  email?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  /** [longitude, latitude]. */
  coordinates?: [number, number];
  landmark?: string;
  addressType?: OrderAddressType;
}

export interface IFulfillmentDetails {
  storeAddress?: string;
  /** [longitude, latitude]. */
  storeCoordinates?: [number, number];
  tableNumber?: string;
  vehicleInfo?: string;
  estimatedReadyTime?: Date | string;
  pickupInstructions?: string;
  driveThruLane?: string;
}

export interface IOrderDeliveryAttempt {
  attemptNumber: number;
  attemptedAt: Date | string;
  status: 'successful' | 'failed';
  reason?: string;
  nextAttemptAt?: Date | string;
}

export interface IOrderDelivery {
  method: OrderDeliveryMethod;
  status: OrderDeliveryStatus;
  address: IOrderAddress;
  estimatedTime?: Date | string;
  actualTime?: Date | string;
  dispatchedAt?: Date | string;
  deliveredAt?: Date | string;
  trackingId?: string;
  deliveryPartner?: string;
  deliveryFee: number;
  instructions?: string;
  deliveryOTP?: string;
  attempts?: IOrderDeliveryAttempt[];
}

export interface IOrderTimelineEntry {
  /** Any status string (order, delivery, or custom). */
  status: string;
  message: string;
  timestamp: Date | string;
  updatedBy?: string;
  metadata?: Record<string, string | number | boolean | null>;
  location?: { latitude: number; longitude: number; address?: string };
  deliveryPartner?: {
    name: string;
    phone: string;
    vehicleNumber?: string;
    photo?: string;
  };
}

export interface IOrderAnalytics {
  source: OrderAnalyticsSource;
  campaign?: string;
  referralCode?: string;
  /** ObjectId hex of the creator pick that drove this purchase, if any. */
  attributionPickId?: string;
  deviceInfo?: {
    platform: string;
    version: string;
    userAgent?: string;
  };
}

/** Canonical Order document. */
export interface IOrder {
  _id?: string;
  orderNumber: string;
  /** User ObjectId hex. */
  user: string;
  /** Primary Store ObjectId hex (first item's store by default). */
  store?: string;
  fulfillmentType: FulfillmentType;
  fulfillmentDetails?: IFulfillmentDetails;
  items: IOrderItem[];
  totals: IOrderTotals;
  payment: IOrderPayment;
  delivery: IOrderDelivery;
  timeline: IOrderTimelineEntry[];
  analytics?: IOrderAnalytics;
  /** 11-state lifecycle status — see `fsm/orderFsm.ts`. */
  status: OrderStatus;
  couponCode?: string;
  redemption?: { code: string; discount: number; dealTitle?: string };
  offerRedemption?: { code: string; cashback: number; offerTitle?: string };
  notes?: string;
  specialInstructions?: string;
  cancelReason?: string;
  cancelledAt?: Date | string;
  /** ObjectId hex of user/admin/merchant who cancelled. */
  cancelledBy?: string;
  returnReason?: string;
  returnedAt?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;

  invoiceUrl?: string;
  invoiceGeneratedAt?: Date | string;
  shippingLabelUrl?: string;
  packingSlipUrl?: string;

  cancellation?: {
    reason?: string;
    cancelledAt?: Date | string;
    cancelledBy?: string;
    refundAmount?: number;
    refundStatus?: 'pending' | 'completed' | 'failed' | 'not_applicable';
  };
  paymentStatus?: string;
  tracking?: {
    trackingId?: string;
    estimatedDelivery?: Date | string;
    deliveredAt?: Date | string;
  };
  estimatedDeliveryTime?: Date | string;
  deliveredAt?: Date | string;
  /** Alias for totals.total; some consumers read the flat form. */
  totalAmount?: number;
  rating?: { score: number; review?: string; ratedAt: Date | string };

  paymentGateway?: {
    gatewayOrderId?: string;
    gatewayPaymentId?: string;
    gatewaySignature?: string;
    gateway: 'razorpay' | 'cod' | 'wallet';
    currency?: string;
    amountPaid?: number;
    paidAt?: Date | string;
    failureReason?: string;
    refundId?: string;
    refundedAt?: Date | string;
    refundAmount?: number;
  };

  idempotencyKey?: string;

  cashback?: {
    amount: number;
    status: 'pending' | 'credited' | 'reversed';
  };
  priority?: OrderPriority;

  deletedAt?: Date | string | null;
  isDeleted?: boolean;

  pendingOfferCashback?: number;
  disputeHold?: boolean;
  /** Cashback rate snapshotted at order-creation time (see FT-D002). */
  snapshotCashbackRate?: number;
  refundRetryCount?: number;
  flags?: string[];
  paymentRetryCount?: number;
  stateVersion?: number;
  stateTransitionHistory?: Array<{ from: string; to: string; at: Date | string; by?: string }>;
  kitchenItemStatus?: Record<string, string>;
  merchantCredit?: {
    status?: 'pending' | 'succeeded' | 'failed';
    failedAt?: Date | string;
    failureReason?: string;
    idempotencyKey?: string;
    retriedAt?: Date | string;
    retryCount?: number;
  };
  postPaymentProcessed?: boolean;
}

/**
 * Re-export the enum-valued sub-status so callers can import this one
 * canonical copy: `import { PaymentStatus } from './@rez/shared-types'`.
 */
export type { PaymentStatus };
