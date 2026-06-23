// @ts-nocheck
/**
 * Order zod schemas — API-boundary validation.
 *
 * These schemas are STRICT: unknown fields are stripped (`.strip()`) rather
 * than silently forwarded (`.passthrough()` was the v1 escape hatch — v2
 * rejects it). If a new field needs to flow through, add it here first.
 *
 * TypeScript inference:
 *   type CreateOrderRequest = z.infer<typeof CreateOrderSchema>;
 *
 * Runtime usage:
 *   const parsed = CreateOrderSchema.safeParse(req.body);
 *   if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });
 */

import { z } from 'zod';

/** 24-char hex regex for MongoDB ObjectId. */
export const OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/;
export const ObjectIdString = z.string().regex(OBJECT_ID_REGEX, 'Invalid ObjectId');

/** All 11 canonical order statuses. Must match `enums/index.ts` OrderStatus. */
export const ORDER_STATUS = z.enum([
  'placed',
  'confirmed',
  'preparing',
  'ready',
  'dispatched',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'cancelling',
  'returned',
  'refunded',
]);
export type OrderStatus = z.infer<typeof ORDER_STATUS>;

/** Order.payment.status — distinct from the Payment-entity status set. */
export const ORDER_PAYMENT_STATUS = z.enum([
  'pending',
  'awaiting_payment',
  'processing',
  'authorized',
  'paid',
  'partially_refunded',
  'refunded',
  'failed',
]);

export const FULFILLMENT_TYPE = z.enum(['delivery', 'pickup', 'drive_thru', 'dine_in']);
export const ORDER_ITEM_TYPE = z.enum(['product', 'service', 'event']);
export const ORDER_PAYMENT_METHOD = z.enum(['wallet', 'card', 'upi', 'cod', 'netbanking', 'razorpay', 'stripe']);
export const ORDER_DELIVERY_METHOD = z.enum(['standard', 'express', 'pickup', 'drive_thru', 'dine_in', 'scheduled']);
export const ORDER_DELIVERY_STATUS = z.enum([
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'dispatched',
  'out_for_delivery',
  'delivered',
  'failed',
  'returned',
]);

export const OrderItemSchema = z
  .object({
    product: ObjectIdString,
    store: ObjectIdString,
    storeName: z.string().optional(),
    name: z.string().min(1),
    image: z.string(),
    itemType: ORDER_ITEM_TYPE,
    quantity: z.number().int().positive(),
    variant: z
      .object({
        type: z.string(),
        value: z.string(),
      })
      .optional(),
    price: z.number().min(0),
    originalPrice: z.number().min(0).optional(),
    discount: z.number().min(0).optional(),
    subtotal: z.number().min(0),
    serviceBookingId: ObjectIdString.optional(),
    sku: z.string().optional(),
    specialInstructions: z.string().optional(),
  })
  .strict();

export const OrderTotalsSchema = z
  .object({
    subtotal: z.number().min(0),
    tax: z.number().min(0),
    delivery: z.number().min(0),
    discount: z.number().min(0),
    lockFeeDiscount: z.number().min(0).optional(),
    cashback: z.number().min(0),
    total: z.number().min(0),
    paidAmount: z.number().min(0),
    refundAmount: z.number().min(0).optional(),
    platformFee: z.number().min(0),
    merchantPayout: z.number().min(0),
  })
  .strict();

export const OrderPaymentSchema = z
  .object({
    method: ORDER_PAYMENT_METHOD,
    status: ORDER_PAYMENT_STATUS,
    transactionId: z.string().optional(),
    paymentGateway: z.string().optional(),
    failureReason: z.string().optional(),
    paidAt: z.union([z.string(), z.date()]).optional(),
    refundId: z.string().optional(),
    refundedAt: z.union([z.string(), z.date()]).optional(),
    coinsUsed: z
      .object({
        rezCoins: z.number().min(0).optional(),
        wasilCoins: z.number().min(0).optional(),
        promoCoins: z.number().min(0).optional(),
        storePromoCoins: z.number().min(0).optional(),
        totalCoinsValue: z.number().min(0).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const OrderAddressSchema = z
  .object({
    name: z.string().min(1),
    phone: z.string().min(6),
    email: z.string().email().optional(),
    addressLine1: z.string().min(1),
    addressLine2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().min(1),
    pincode: z.string().min(3),
    country: z.string().min(1),
    coordinates: z.tuple([z.number(), z.number()]).optional(),
    landmark: z.string().optional(),
    addressType: z.enum(['home', 'work', 'other']).optional(),
  })
  .strict();

export const OrderDeliverySchema = z
  .object({
    method: ORDER_DELIVERY_METHOD,
    status: ORDER_DELIVERY_STATUS,
    address: OrderAddressSchema,
    estimatedTime: z.union([z.string(), z.date()]).optional(),
    actualTime: z.union([z.string(), z.date()]).optional(),
    dispatchedAt: z.union([z.string(), z.date()]).optional(),
    deliveredAt: z.union([z.string(), z.date()]).optional(),
    trackingId: z.string().optional(),
    deliveryPartner: z.string().optional(),
    deliveryFee: z.number().min(0),
    instructions: z.string().optional(),
    deliveryOTP: z.string().optional(),
  })
  .strict();

/** CreateOrder — what the consumer app POSTs to /api/orders. */
export const CreateOrderSchema = z
  .object({
    user: ObjectIdString,
    store: ObjectIdString,
    fulfillmentType: FULFILLMENT_TYPE.default('delivery'),
    items: z.array(OrderItemSchema).min(1, 'At least one item is required'),
    totals: OrderTotalsSchema,
    payment: OrderPaymentSchema,
    delivery: OrderDeliverySchema,
    couponCode: z.string().optional(),
    specialInstructions: z.string().optional(),
    idempotencyKey: z.string().min(8).optional(),
  })
  .strict();

/** UpdateOrderStatus — what the merchant app PATCHes to /api/orders/:id/status. */
export const UpdateOrderStatusSchema = z
  .object({
    status: ORDER_STATUS,
    reason: z.string().optional(),
    metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  })
  .strict();

export const OrderResponseSchema = z
  .object({
    _id: z.string().optional(),
    orderNumber: z.string(),
    status: ORDER_STATUS,
    user: ObjectIdString,
    store: ObjectIdString.optional(),
    fulfillmentType: FULFILLMENT_TYPE,
    items: z.array(OrderItemSchema),
    totals: OrderTotalsSchema,
    payment: OrderPaymentSchema,
    delivery: OrderDeliverySchema,
    couponCode: z.string().optional(),
    createdAt: z.union([z.date(), z.string()]),
    updatedAt: z.union([z.date(), z.string()]),
  })
  .strip(); // drop unknown keys rather than rejecting — safer for eventual-consistency reads

export const OrderListResponseSchema = z.array(OrderResponseSchema);

export type CreateOrderRequest = z.infer<typeof CreateOrderSchema>;
export type UpdateOrderStatusRequest = z.infer<typeof UpdateOrderStatusSchema>;
export type OrderResponse = z.infer<typeof OrderResponseSchema>;
export type OrderListResponse = z.infer<typeof OrderListResponseSchema>;
