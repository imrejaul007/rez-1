"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderListResponseSchema = exports.OrderResponseSchema = exports.UpdateOrderStatusSchema = exports.CreateOrderSchema = exports.OrderDeliverySchema = exports.OrderAddressSchema = exports.OrderPaymentSchema = exports.OrderTotalsSchema = exports.OrderItemSchema = exports.ORDER_DELIVERY_STATUS = exports.ORDER_DELIVERY_METHOD = exports.ORDER_PAYMENT_METHOD = exports.ORDER_ITEM_TYPE = exports.FULFILLMENT_TYPE = exports.ORDER_PAYMENT_STATUS = exports.ORDER_STATUS = exports.ObjectIdString = exports.OBJECT_ID_REGEX = void 0;
const zod_1 = require("zod");
/** 24-char hex regex for MongoDB ObjectId. */
exports.OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/;
exports.ObjectIdString = zod_1.z.string().regex(exports.OBJECT_ID_REGEX, 'Invalid ObjectId');
/** All 11 canonical order statuses. Must match `enums/index.ts` OrderStatus. */
exports.ORDER_STATUS = zod_1.z.enum([
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
/** Order.payment.status — distinct from the Payment-entity status set. */
exports.ORDER_PAYMENT_STATUS = zod_1.z.enum([
    'pending',
    'awaiting_payment',
    'processing',
    'authorized',
    'paid',
    'partially_refunded',
    'refunded',
    'failed',
]);
exports.FULFILLMENT_TYPE = zod_1.z.enum(['delivery', 'pickup', 'drive_thru', 'dine_in']);
exports.ORDER_ITEM_TYPE = zod_1.z.enum(['product', 'service', 'event']);
exports.ORDER_PAYMENT_METHOD = zod_1.z.enum([
    'wallet',
    'card',
    'upi',
    'cod',
    'netbanking',
    'razorpay',
    'stripe',
]);
exports.ORDER_DELIVERY_METHOD = zod_1.z.enum([
    'standard',
    'express',
    'pickup',
    'drive_thru',
    'dine_in',
    'scheduled',
]);
exports.ORDER_DELIVERY_STATUS = zod_1.z.enum([
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
exports.OrderItemSchema = zod_1.z
    .object({
    product: exports.ObjectIdString,
    store: exports.ObjectIdString,
    storeName: zod_1.z.string().optional(),
    name: zod_1.z.string().min(1),
    image: zod_1.z.string(),
    itemType: exports.ORDER_ITEM_TYPE,
    quantity: zod_1.z.number().int().positive(),
    variant: zod_1.z
        .object({
        type: zod_1.z.string(),
        value: zod_1.z.string(),
    })
        .optional(),
    price: zod_1.z.number().min(0),
    originalPrice: zod_1.z.number().min(0).optional(),
    discount: zod_1.z.number().min(0).optional(),
    subtotal: zod_1.z.number().min(0),
    serviceBookingId: exports.ObjectIdString.optional(),
    sku: zod_1.z.string().optional(),
    specialInstructions: zod_1.z.string().optional(),
})
    .strict();
exports.OrderTotalsSchema = zod_1.z
    .object({
    subtotal: zod_1.z.number().min(0),
    tax: zod_1.z.number().min(0),
    delivery: zod_1.z.number().min(0),
    discount: zod_1.z.number().min(0),
    lockFeeDiscount: zod_1.z.number().min(0).optional(),
    cashback: zod_1.z.number().min(0),
    total: zod_1.z.number().min(0),
    paidAmount: zod_1.z.number().min(0),
    refundAmount: zod_1.z.number().min(0).optional(),
    platformFee: zod_1.z.number().min(0),
    merchantPayout: zod_1.z.number().min(0),
})
    .strict();
exports.OrderPaymentSchema = zod_1.z
    .object({
    method: exports.ORDER_PAYMENT_METHOD,
    status: exports.ORDER_PAYMENT_STATUS,
    transactionId: zod_1.z.string().optional(),
    paymentGateway: zod_1.z.string().optional(),
    failureReason: zod_1.z.string().optional(),
    paidAt: zod_1.z.union([zod_1.z.string(), zod_1.z.date()]).optional(),
    refundId: zod_1.z.string().optional(),
    refundedAt: zod_1.z.union([zod_1.z.string(), zod_1.z.date()]).optional(),
    coinsUsed: zod_1.z
        .object({
        rezCoins: zod_1.z.number().min(0).optional(),
        wasilCoins: zod_1.z.number().min(0).optional(),
        promoCoins: zod_1.z.number().min(0).optional(),
        storePromoCoins: zod_1.z.number().min(0).optional(),
        totalCoinsValue: zod_1.z.number().min(0).optional(),
    })
        .strict()
        .optional(),
})
    .strict();
exports.OrderAddressSchema = zod_1.z
    .object({
    name: zod_1.z.string().min(1),
    phone: zod_1.z.string().min(6),
    email: zod_1.z.string().email().optional(),
    addressLine1: zod_1.z.string().min(1),
    addressLine2: zod_1.z.string().optional(),
    city: zod_1.z.string().min(1),
    state: zod_1.z.string().min(1),
    pincode: zod_1.z.string().min(3),
    country: zod_1.z.string().min(1),
    coordinates: zod_1.z.tuple([zod_1.z.number(), zod_1.z.number()]).optional(),
    landmark: zod_1.z.string().optional(),
    addressType: zod_1.z.enum(['home', 'work', 'other']).optional(),
})
    .strict();
exports.OrderDeliverySchema = zod_1.z
    .object({
    method: exports.ORDER_DELIVERY_METHOD,
    status: exports.ORDER_DELIVERY_STATUS,
    address: exports.OrderAddressSchema,
    estimatedTime: zod_1.z.union([zod_1.z.string(), zod_1.z.date()]).optional(),
    actualTime: zod_1.z.union([zod_1.z.string(), zod_1.z.date()]).optional(),
    dispatchedAt: zod_1.z.union([zod_1.z.string(), zod_1.z.date()]).optional(),
    deliveredAt: zod_1.z.union([zod_1.z.string(), zod_1.z.date()]).optional(),
    trackingId: zod_1.z.string().optional(),
    deliveryPartner: zod_1.z.string().optional(),
    deliveryFee: zod_1.z.number().min(0),
    instructions: zod_1.z.string().optional(),
    deliveryOTP: zod_1.z.string().optional(),
})
    .strict();
/** CreateOrder — what the consumer app POSTs to /api/orders. */
exports.CreateOrderSchema = zod_1.z
    .object({
    user: exports.ObjectIdString,
    store: exports.ObjectIdString,
    fulfillmentType: exports.FULFILLMENT_TYPE.default('delivery'),
    items: zod_1.z.array(exports.OrderItemSchema).min(1, 'At least one item is required'),
    totals: exports.OrderTotalsSchema,
    payment: exports.OrderPaymentSchema,
    delivery: exports.OrderDeliverySchema,
    couponCode: zod_1.z.string().optional(),
    specialInstructions: zod_1.z.string().optional(),
    idempotencyKey: zod_1.z.string().min(8).optional(),
})
    .strict();
/** UpdateOrderStatus — what the merchant app PATCHes to /api/orders/:id/status. */
exports.UpdateOrderStatusSchema = zod_1.z
    .object({
    status: exports.ORDER_STATUS,
    reason: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.union([zod_1.z.string(), zod_1.z.number(), zod_1.z.boolean(), zod_1.z.null()])).optional(),
})
    .strict();
exports.OrderResponseSchema = zod_1.z
    .object({
    _id: zod_1.z.string().optional(),
    orderNumber: zod_1.z.string(),
    status: exports.ORDER_STATUS,
    user: exports.ObjectIdString,
    store: exports.ObjectIdString.optional(),
    fulfillmentType: exports.FULFILLMENT_TYPE,
    items: zod_1.z.array(exports.OrderItemSchema),
    totals: exports.OrderTotalsSchema,
    payment: exports.OrderPaymentSchema,
    delivery: exports.OrderDeliverySchema,
    couponCode: zod_1.z.string().optional(),
    createdAt: zod_1.z.union([zod_1.z.date(), zod_1.z.string()]),
    updatedAt: zod_1.z.union([zod_1.z.date(), zod_1.z.string()]),
})
    .strip(); // drop unknown keys rather than rejecting — safer for eventual-consistency reads
exports.OrderListResponseSchema = zod_1.z.array(exports.OrderResponseSchema);
//# sourceMappingURL=order.schema.js.map