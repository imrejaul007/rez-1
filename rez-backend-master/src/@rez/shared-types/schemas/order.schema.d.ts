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
export declare const OBJECT_ID_REGEX: RegExp;
export declare const ObjectIdString: z.ZodString;
/** All 11 canonical order statuses. Must match `enums/index.ts` OrderStatus. */
export declare const ORDER_STATUS: z.ZodEnum<
  [
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
  ]
>;
export type OrderStatus = z.infer<typeof ORDER_STATUS>;
/** Order.payment.status — distinct from the Payment-entity status set. */
export declare const ORDER_PAYMENT_STATUS: z.ZodEnum<
  ['pending', 'awaiting_payment', 'processing', 'authorized', 'paid', 'partially_refunded', 'refunded', 'failed']
>;
export declare const FULFILLMENT_TYPE: z.ZodEnum<['delivery', 'pickup', 'drive_thru', 'dine_in']>;
export declare const ORDER_ITEM_TYPE: z.ZodEnum<['product', 'service', 'event']>;
export declare const ORDER_PAYMENT_METHOD: z.ZodEnum<
  ['wallet', 'card', 'upi', 'cod', 'netbanking', 'razorpay', 'stripe']
>;
export declare const ORDER_DELIVERY_METHOD: z.ZodEnum<
  ['standard', 'express', 'pickup', 'drive_thru', 'dine_in', 'scheduled']
>;
export declare const ORDER_DELIVERY_STATUS: z.ZodEnum<
  ['pending', 'confirmed', 'preparing', 'ready', 'dispatched', 'out_for_delivery', 'delivered', 'failed', 'returned']
>;
export declare const OrderItemSchema: z.ZodObject<
  {
    product: z.ZodString;
    store: z.ZodString;
    storeName: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    image: z.ZodString;
    itemType: z.ZodEnum<['product', 'service', 'event']>;
    quantity: z.ZodNumber;
    variant: z.ZodOptional<
      z.ZodObject<
        {
          type: z.ZodString;
          value: z.ZodString;
        },
        'strip',
        z.ZodTypeAny,
        {
          type?: string;
          value?: string;
        },
        {
          type?: string;
          value?: string;
        }
      >
    >;
    price: z.ZodNumber;
    originalPrice: z.ZodOptional<z.ZodNumber>;
    discount: z.ZodOptional<z.ZodNumber>;
    subtotal: z.ZodNumber;
    serviceBookingId: z.ZodOptional<z.ZodString>;
    sku: z.ZodOptional<z.ZodString>;
    specialInstructions: z.ZodOptional<z.ZodString>;
  },
  'strict',
  z.ZodTypeAny,
  {
    name?: string;
    discount?: number;
    product?: string;
    store?: string;
    sku?: string;
    storeName?: string;
    image?: string;
    itemType?: 'service' | 'product' | 'event';
    quantity?: number;
    variant?: {
      type?: string;
      value?: string;
    };
    price?: number;
    originalPrice?: number;
    subtotal?: number;
    serviceBookingId?: string;
    specialInstructions?: string;
  },
  {
    name?: string;
    discount?: number;
    product?: string;
    store?: string;
    sku?: string;
    storeName?: string;
    image?: string;
    itemType?: 'service' | 'product' | 'event';
    quantity?: number;
    variant?: {
      type?: string;
      value?: string;
    };
    price?: number;
    originalPrice?: number;
    subtotal?: number;
    serviceBookingId?: string;
    specialInstructions?: string;
  }
>;
export declare const OrderTotalsSchema: z.ZodObject<
  {
    subtotal: z.ZodNumber;
    tax: z.ZodNumber;
    delivery: z.ZodNumber;
    discount: z.ZodNumber;
    lockFeeDiscount: z.ZodOptional<z.ZodNumber>;
    cashback: z.ZodNumber;
    total: z.ZodNumber;
    paidAmount: z.ZodNumber;
    refundAmount: z.ZodOptional<z.ZodNumber>;
    platformFee: z.ZodNumber;
    merchantPayout: z.ZodNumber;
  },
  'strict',
  z.ZodTypeAny,
  {
    cashback?: number;
    total?: number;
    discount?: number;
    delivery?: number;
    subtotal?: number;
    tax?: number;
    lockFeeDiscount?: number;
    paidAmount?: number;
    refundAmount?: number;
    platformFee?: number;
    merchantPayout?: number;
  },
  {
    cashback?: number;
    total?: number;
    discount?: number;
    delivery?: number;
    subtotal?: number;
    tax?: number;
    lockFeeDiscount?: number;
    paidAmount?: number;
    refundAmount?: number;
    platformFee?: number;
    merchantPayout?: number;
  }
>;
export declare const OrderPaymentSchema: z.ZodObject<
  {
    method: z.ZodEnum<['wallet', 'card', 'upi', 'cod', 'netbanking', 'razorpay', 'stripe']>;
    status: z.ZodEnum<
      ['pending', 'awaiting_payment', 'processing', 'authorized', 'paid', 'partially_refunded', 'refunded', 'failed']
    >;
    transactionId: z.ZodOptional<z.ZodString>;
    paymentGateway: z.ZodOptional<z.ZodString>;
    failureReason: z.ZodOptional<z.ZodString>;
    paidAt: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
    refundId: z.ZodOptional<z.ZodString>;
    refundedAt: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
    coinsUsed: z.ZodOptional<
      z.ZodObject<
        {
          rezCoins: z.ZodOptional<z.ZodNumber>;
          wasilCoins: z.ZodOptional<z.ZodNumber>;
          promoCoins: z.ZodOptional<z.ZodNumber>;
          storePromoCoins: z.ZodOptional<z.ZodNumber>;
          totalCoinsValue: z.ZodOptional<z.ZodNumber>;
        },
        'strict',
        z.ZodTypeAny,
        {
          rezCoins?: number;
          wasilCoins?: number;
          promoCoins?: number;
          storePromoCoins?: number;
          totalCoinsValue?: number;
        },
        {
          rezCoins?: number;
          wasilCoins?: number;
          promoCoins?: number;
          storePromoCoins?: number;
          totalCoinsValue?: number;
        }
      >
    >;
  },
  'strict',
  z.ZodTypeAny,
  {
    status?:
      | 'pending'
      | 'refunded'
      | 'failed'
      | 'processing'
      | 'partially_refunded'
      | 'awaiting_payment'
      | 'authorized'
      | 'paid';
    method?: 'upi' | 'card' | 'wallet' | 'netbanking' | 'cod' | 'razorpay' | 'stripe';
    transactionId?: string;
    paymentGateway?: string;
    failureReason?: string;
    paidAt?: string | Date;
    refundId?: string;
    refundedAt?: string | Date;
    coinsUsed?: {
      rezCoins?: number;
      wasilCoins?: number;
      promoCoins?: number;
      storePromoCoins?: number;
      totalCoinsValue?: number;
    };
  },
  {
    status?:
      | 'pending'
      | 'refunded'
      | 'failed'
      | 'processing'
      | 'partially_refunded'
      | 'awaiting_payment'
      | 'authorized'
      | 'paid';
    method?: 'upi' | 'card' | 'wallet' | 'netbanking' | 'cod' | 'razorpay' | 'stripe';
    transactionId?: string;
    paymentGateway?: string;
    failureReason?: string;
    paidAt?: string | Date;
    refundId?: string;
    refundedAt?: string | Date;
    coinsUsed?: {
      rezCoins?: number;
      wasilCoins?: number;
      promoCoins?: number;
      storePromoCoins?: number;
      totalCoinsValue?: number;
    };
  }
>;
export declare const OrderAddressSchema: z.ZodObject<
  {
    name: z.ZodString;
    phone: z.ZodString;
    email: z.ZodOptional<z.ZodString>;
    addressLine1: z.ZodString;
    addressLine2: z.ZodOptional<z.ZodString>;
    city: z.ZodString;
    state: z.ZodString;
    pincode: z.ZodString;
    country: z.ZodString;
    coordinates: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>>;
    landmark: z.ZodOptional<z.ZodString>;
    addressType: z.ZodOptional<z.ZodEnum<['home', 'work', 'other']>>;
  },
  'strict',
  z.ZodTypeAny,
  {
    name?: string;
    phone?: string;
    email?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
    coordinates?: [number, number, ...unknown[]];
    landmark?: string;
    addressType?: 'other' | 'home' | 'work';
  },
  {
    name?: string;
    phone?: string;
    email?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
    coordinates?: [number, number, ...unknown[]];
    landmark?: string;
    addressType?: 'other' | 'home' | 'work';
  }
>;
export declare const OrderDeliverySchema: z.ZodObject<
  {
    method: z.ZodEnum<['standard', 'express', 'pickup', 'drive_thru', 'dine_in', 'scheduled']>;
    status: z.ZodEnum<
      [
        'pending',
        'confirmed',
        'preparing',
        'ready',
        'dispatched',
        'out_for_delivery',
        'delivered',
        'failed',
        'returned',
      ]
    >;
    address: z.ZodObject<
      {
        name: z.ZodString;
        phone: z.ZodString;
        email: z.ZodOptional<z.ZodString>;
        addressLine1: z.ZodString;
        addressLine2: z.ZodOptional<z.ZodString>;
        city: z.ZodString;
        state: z.ZodString;
        pincode: z.ZodString;
        country: z.ZodString;
        coordinates: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>>;
        landmark: z.ZodOptional<z.ZodString>;
        addressType: z.ZodOptional<z.ZodEnum<['home', 'work', 'other']>>;
      },
      'strict',
      z.ZodTypeAny,
      {
        name?: string;
        phone?: string;
        email?: string;
        addressLine1?: string;
        addressLine2?: string;
        city?: string;
        state?: string;
        pincode?: string;
        country?: string;
        coordinates?: [number, number, ...unknown[]];
        landmark?: string;
        addressType?: 'other' | 'home' | 'work';
      },
      {
        name?: string;
        phone?: string;
        email?: string;
        addressLine1?: string;
        addressLine2?: string;
        city?: string;
        state?: string;
        pincode?: string;
        country?: string;
        coordinates?: [number, number, ...unknown[]];
        landmark?: string;
        addressType?: 'other' | 'home' | 'work';
      }
    >;
    estimatedTime: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
    actualTime: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
    dispatchedAt: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
    deliveredAt: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
    trackingId: z.ZodOptional<z.ZodString>;
    deliveryPartner: z.ZodOptional<z.ZodString>;
    deliveryFee: z.ZodNumber;
    instructions: z.ZodOptional<z.ZodString>;
    deliveryOTP: z.ZodOptional<z.ZodString>;
  },
  'strict',
  z.ZodTypeAny,
  {
    status?:
      | 'ready'
      | 'pending'
      | 'failed'
      | 'confirmed'
      | 'preparing'
      | 'dispatched'
      | 'out_for_delivery'
      | 'delivered'
      | 'returned';
    method?: 'scheduled' | 'pickup' | 'drive_thru' | 'dine_in' | 'standard' | 'express';
    address?: {
      name?: string;
      phone?: string;
      email?: string;
      addressLine1?: string;
      addressLine2?: string;
      city?: string;
      state?: string;
      pincode?: string;
      country?: string;
      coordinates?: [number, number, ...unknown[]];
      landmark?: string;
      addressType?: 'other' | 'home' | 'work';
    };
    estimatedTime?: string | Date;
    actualTime?: string | Date;
    dispatchedAt?: string | Date;
    deliveredAt?: string | Date;
    trackingId?: string;
    deliveryPartner?: string;
    deliveryFee?: number;
    instructions?: string;
    deliveryOTP?: string;
  },
  {
    status?:
      | 'ready'
      | 'pending'
      | 'failed'
      | 'confirmed'
      | 'preparing'
      | 'dispatched'
      | 'out_for_delivery'
      | 'delivered'
      | 'returned';
    method?: 'scheduled' | 'pickup' | 'drive_thru' | 'dine_in' | 'standard' | 'express';
    address?: {
      name?: string;
      phone?: string;
      email?: string;
      addressLine1?: string;
      addressLine2?: string;
      city?: string;
      state?: string;
      pincode?: string;
      country?: string;
      coordinates?: [number, number, ...unknown[]];
      landmark?: string;
      addressType?: 'other' | 'home' | 'work';
    };
    estimatedTime?: string | Date;
    actualTime?: string | Date;
    dispatchedAt?: string | Date;
    deliveredAt?: string | Date;
    trackingId?: string;
    deliveryPartner?: string;
    deliveryFee?: number;
    instructions?: string;
    deliveryOTP?: string;
  }
>;
/** CreateOrder — what the consumer app POSTs to /api/orders. */
export declare const CreateOrderSchema: z.ZodObject<
  {
    user: z.ZodString;
    store: z.ZodString;
    fulfillmentType: z.ZodDefault<z.ZodEnum<['delivery', 'pickup', 'drive_thru', 'dine_in']>>;
    items: z.ZodArray<
      z.ZodObject<
        {
          product: z.ZodString;
          store: z.ZodString;
          storeName: z.ZodOptional<z.ZodString>;
          name: z.ZodString;
          image: z.ZodString;
          itemType: z.ZodEnum<['product', 'service', 'event']>;
          quantity: z.ZodNumber;
          variant: z.ZodOptional<
            z.ZodObject<
              {
                type: z.ZodString;
                value: z.ZodString;
              },
              'strip',
              z.ZodTypeAny,
              {
                type?: string;
                value?: string;
              },
              {
                type?: string;
                value?: string;
              }
            >
          >;
          price: z.ZodNumber;
          originalPrice: z.ZodOptional<z.ZodNumber>;
          discount: z.ZodOptional<z.ZodNumber>;
          subtotal: z.ZodNumber;
          serviceBookingId: z.ZodOptional<z.ZodString>;
          sku: z.ZodOptional<z.ZodString>;
          specialInstructions: z.ZodOptional<z.ZodString>;
        },
        'strict',
        z.ZodTypeAny,
        {
          name?: string;
          discount?: number;
          product?: string;
          store?: string;
          sku?: string;
          storeName?: string;
          image?: string;
          itemType?: 'service' | 'product' | 'event';
          quantity?: number;
          variant?: {
            type?: string;
            value?: string;
          };
          price?: number;
          originalPrice?: number;
          subtotal?: number;
          serviceBookingId?: string;
          specialInstructions?: string;
        },
        {
          name?: string;
          discount?: number;
          product?: string;
          store?: string;
          sku?: string;
          storeName?: string;
          image?: string;
          itemType?: 'service' | 'product' | 'event';
          quantity?: number;
          variant?: {
            type?: string;
            value?: string;
          };
          price?: number;
          originalPrice?: number;
          subtotal?: number;
          serviceBookingId?: string;
          specialInstructions?: string;
        }
      >,
      'many'
    >;
    totals: z.ZodObject<
      {
        subtotal: z.ZodNumber;
        tax: z.ZodNumber;
        delivery: z.ZodNumber;
        discount: z.ZodNumber;
        lockFeeDiscount: z.ZodOptional<z.ZodNumber>;
        cashback: z.ZodNumber;
        total: z.ZodNumber;
        paidAmount: z.ZodNumber;
        refundAmount: z.ZodOptional<z.ZodNumber>;
        platformFee: z.ZodNumber;
        merchantPayout: z.ZodNumber;
      },
      'strict',
      z.ZodTypeAny,
      {
        cashback?: number;
        total?: number;
        discount?: number;
        delivery?: number;
        subtotal?: number;
        tax?: number;
        lockFeeDiscount?: number;
        paidAmount?: number;
        refundAmount?: number;
        platformFee?: number;
        merchantPayout?: number;
      },
      {
        cashback?: number;
        total?: number;
        discount?: number;
        delivery?: number;
        subtotal?: number;
        tax?: number;
        lockFeeDiscount?: number;
        paidAmount?: number;
        refundAmount?: number;
        platformFee?: number;
        merchantPayout?: number;
      }
    >;
    payment: z.ZodObject<
      {
        method: z.ZodEnum<['wallet', 'card', 'upi', 'cod', 'netbanking', 'razorpay', 'stripe']>;
        status: z.ZodEnum<
          [
            'pending',
            'awaiting_payment',
            'processing',
            'authorized',
            'paid',
            'partially_refunded',
            'refunded',
            'failed',
          ]
        >;
        transactionId: z.ZodOptional<z.ZodString>;
        paymentGateway: z.ZodOptional<z.ZodString>;
        failureReason: z.ZodOptional<z.ZodString>;
        paidAt: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
        refundId: z.ZodOptional<z.ZodString>;
        refundedAt: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
        coinsUsed: z.ZodOptional<
          z.ZodObject<
            {
              rezCoins: z.ZodOptional<z.ZodNumber>;
              wasilCoins: z.ZodOptional<z.ZodNumber>;
              promoCoins: z.ZodOptional<z.ZodNumber>;
              storePromoCoins: z.ZodOptional<z.ZodNumber>;
              totalCoinsValue: z.ZodOptional<z.ZodNumber>;
            },
            'strict',
            z.ZodTypeAny,
            {
              rezCoins?: number;
              wasilCoins?: number;
              promoCoins?: number;
              storePromoCoins?: number;
              totalCoinsValue?: number;
            },
            {
              rezCoins?: number;
              wasilCoins?: number;
              promoCoins?: number;
              storePromoCoins?: number;
              totalCoinsValue?: number;
            }
          >
        >;
      },
      'strict',
      z.ZodTypeAny,
      {
        status?:
          | 'pending'
          | 'refunded'
          | 'failed'
          | 'processing'
          | 'partially_refunded'
          | 'awaiting_payment'
          | 'authorized'
          | 'paid';
        method?: 'upi' | 'card' | 'wallet' | 'netbanking' | 'cod' | 'razorpay' | 'stripe';
        transactionId?: string;
        paymentGateway?: string;
        failureReason?: string;
        paidAt?: string | Date;
        refundId?: string;
        refundedAt?: string | Date;
        coinsUsed?: {
          rezCoins?: number;
          wasilCoins?: number;
          promoCoins?: number;
          storePromoCoins?: number;
          totalCoinsValue?: number;
        };
      },
      {
        status?:
          | 'pending'
          | 'refunded'
          | 'failed'
          | 'processing'
          | 'partially_refunded'
          | 'awaiting_payment'
          | 'authorized'
          | 'paid';
        method?: 'upi' | 'card' | 'wallet' | 'netbanking' | 'cod' | 'razorpay' | 'stripe';
        transactionId?: string;
        paymentGateway?: string;
        failureReason?: string;
        paidAt?: string | Date;
        refundId?: string;
        refundedAt?: string | Date;
        coinsUsed?: {
          rezCoins?: number;
          wasilCoins?: number;
          promoCoins?: number;
          storePromoCoins?: number;
          totalCoinsValue?: number;
        };
      }
    >;
    delivery: z.ZodObject<
      {
        method: z.ZodEnum<['standard', 'express', 'pickup', 'drive_thru', 'dine_in', 'scheduled']>;
        status: z.ZodEnum<
          [
            'pending',
            'confirmed',
            'preparing',
            'ready',
            'dispatched',
            'out_for_delivery',
            'delivered',
            'failed',
            'returned',
          ]
        >;
        address: z.ZodObject<
          {
            name: z.ZodString;
            phone: z.ZodString;
            email: z.ZodOptional<z.ZodString>;
            addressLine1: z.ZodString;
            addressLine2: z.ZodOptional<z.ZodString>;
            city: z.ZodString;
            state: z.ZodString;
            pincode: z.ZodString;
            country: z.ZodString;
            coordinates: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>>;
            landmark: z.ZodOptional<z.ZodString>;
            addressType: z.ZodOptional<z.ZodEnum<['home', 'work', 'other']>>;
          },
          'strict',
          z.ZodTypeAny,
          {
            name?: string;
            phone?: string;
            email?: string;
            addressLine1?: string;
            addressLine2?: string;
            city?: string;
            state?: string;
            pincode?: string;
            country?: string;
            coordinates?: [number, number, ...unknown[]];
            landmark?: string;
            addressType?: 'other' | 'home' | 'work';
          },
          {
            name?: string;
            phone?: string;
            email?: string;
            addressLine1?: string;
            addressLine2?: string;
            city?: string;
            state?: string;
            pincode?: string;
            country?: string;
            coordinates?: [number, number, ...unknown[]];
            landmark?: string;
            addressType?: 'other' | 'home' | 'work';
          }
        >;
        estimatedTime: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
        actualTime: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
        dispatchedAt: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
        deliveredAt: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
        trackingId: z.ZodOptional<z.ZodString>;
        deliveryPartner: z.ZodOptional<z.ZodString>;
        deliveryFee: z.ZodNumber;
        instructions: z.ZodOptional<z.ZodString>;
        deliveryOTP: z.ZodOptional<z.ZodString>;
      },
      'strict',
      z.ZodTypeAny,
      {
        status?:
          | 'ready'
          | 'pending'
          | 'failed'
          | 'confirmed'
          | 'preparing'
          | 'dispatched'
          | 'out_for_delivery'
          | 'delivered'
          | 'returned';
        method?: 'scheduled' | 'pickup' | 'drive_thru' | 'dine_in' | 'standard' | 'express';
        address?: {
          name?: string;
          phone?: string;
          email?: string;
          addressLine1?: string;
          addressLine2?: string;
          city?: string;
          state?: string;
          pincode?: string;
          country?: string;
          coordinates?: [number, number, ...unknown[]];
          landmark?: string;
          addressType?: 'other' | 'home' | 'work';
        };
        estimatedTime?: string | Date;
        actualTime?: string | Date;
        dispatchedAt?: string | Date;
        deliveredAt?: string | Date;
        trackingId?: string;
        deliveryPartner?: string;
        deliveryFee?: number;
        instructions?: string;
        deliveryOTP?: string;
      },
      {
        status?:
          | 'ready'
          | 'pending'
          | 'failed'
          | 'confirmed'
          | 'preparing'
          | 'dispatched'
          | 'out_for_delivery'
          | 'delivered'
          | 'returned';
        method?: 'scheduled' | 'pickup' | 'drive_thru' | 'dine_in' | 'standard' | 'express';
        address?: {
          name?: string;
          phone?: string;
          email?: string;
          addressLine1?: string;
          addressLine2?: string;
          city?: string;
          state?: string;
          pincode?: string;
          country?: string;
          coordinates?: [number, number, ...unknown[]];
          landmark?: string;
          addressType?: 'other' | 'home' | 'work';
        };
        estimatedTime?: string | Date;
        actualTime?: string | Date;
        dispatchedAt?: string | Date;
        deliveredAt?: string | Date;
        trackingId?: string;
        deliveryPartner?: string;
        deliveryFee?: number;
        instructions?: string;
        deliveryOTP?: string;
      }
    >;
    couponCode: z.ZodOptional<z.ZodString>;
    specialInstructions: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
  },
  'strict',
  z.ZodTypeAny,
  {
    user?: string;
    idempotencyKey?: string;
    payment?: {
      status?:
        | 'pending'
        | 'refunded'
        | 'failed'
        | 'processing'
        | 'partially_refunded'
        | 'awaiting_payment'
        | 'authorized'
        | 'paid';
      method?: 'upi' | 'card' | 'wallet' | 'netbanking' | 'cod' | 'razorpay' | 'stripe';
      transactionId?: string;
      paymentGateway?: string;
      failureReason?: string;
      paidAt?: string | Date;
      refundId?: string;
      refundedAt?: string | Date;
      coinsUsed?: {
        rezCoins?: number;
        wasilCoins?: number;
        promoCoins?: number;
        storePromoCoins?: number;
        totalCoinsValue?: number;
      };
    };
    delivery?: {
      status?:
        | 'ready'
        | 'pending'
        | 'failed'
        | 'confirmed'
        | 'preparing'
        | 'dispatched'
        | 'out_for_delivery'
        | 'delivered'
        | 'returned';
      method?: 'scheduled' | 'pickup' | 'drive_thru' | 'dine_in' | 'standard' | 'express';
      address?: {
        name?: string;
        phone?: string;
        email?: string;
        addressLine1?: string;
        addressLine2?: string;
        city?: string;
        state?: string;
        pincode?: string;
        country?: string;
        coordinates?: [number, number, ...unknown[]];
        landmark?: string;
        addressType?: 'other' | 'home' | 'work';
      };
      estimatedTime?: string | Date;
      actualTime?: string | Date;
      dispatchedAt?: string | Date;
      deliveredAt?: string | Date;
      trackingId?: string;
      deliveryPartner?: string;
      deliveryFee?: number;
      instructions?: string;
      deliveryOTP?: string;
    };
    store?: string;
    items?: {
      name?: string;
      discount?: number;
      product?: string;
      store?: string;
      sku?: string;
      storeName?: string;
      image?: string;
      itemType?: 'service' | 'product' | 'event';
      quantity?: number;
      variant?: {
        type?: string;
        value?: string;
      };
      price?: number;
      originalPrice?: number;
      subtotal?: number;
      serviceBookingId?: string;
      specialInstructions?: string;
    }[];
    totals?: {
      cashback?: number;
      total?: number;
      discount?: number;
      delivery?: number;
      subtotal?: number;
      tax?: number;
      lockFeeDiscount?: number;
      paidAmount?: number;
      refundAmount?: number;
      platformFee?: number;
      merchantPayout?: number;
    };
    specialInstructions?: string;
    fulfillmentType?: 'delivery' | 'pickup' | 'drive_thru' | 'dine_in';
    couponCode?: string;
  },
  {
    user?: string;
    idempotencyKey?: string;
    payment?: {
      status?:
        | 'pending'
        | 'refunded'
        | 'failed'
        | 'processing'
        | 'partially_refunded'
        | 'awaiting_payment'
        | 'authorized'
        | 'paid';
      method?: 'upi' | 'card' | 'wallet' | 'netbanking' | 'cod' | 'razorpay' | 'stripe';
      transactionId?: string;
      paymentGateway?: string;
      failureReason?: string;
      paidAt?: string | Date;
      refundId?: string;
      refundedAt?: string | Date;
      coinsUsed?: {
        rezCoins?: number;
        wasilCoins?: number;
        promoCoins?: number;
        storePromoCoins?: number;
        totalCoinsValue?: number;
      };
    };
    delivery?: {
      status?:
        | 'ready'
        | 'pending'
        | 'failed'
        | 'confirmed'
        | 'preparing'
        | 'dispatched'
        | 'out_for_delivery'
        | 'delivered'
        | 'returned';
      method?: 'scheduled' | 'pickup' | 'drive_thru' | 'dine_in' | 'standard' | 'express';
      address?: {
        name?: string;
        phone?: string;
        email?: string;
        addressLine1?: string;
        addressLine2?: string;
        city?: string;
        state?: string;
        pincode?: string;
        country?: string;
        coordinates?: [number, number, ...unknown[]];
        landmark?: string;
        addressType?: 'other' | 'home' | 'work';
      };
      estimatedTime?: string | Date;
      actualTime?: string | Date;
      dispatchedAt?: string | Date;
      deliveredAt?: string | Date;
      trackingId?: string;
      deliveryPartner?: string;
      deliveryFee?: number;
      instructions?: string;
      deliveryOTP?: string;
    };
    store?: string;
    items?: {
      name?: string;
      discount?: number;
      product?: string;
      store?: string;
      sku?: string;
      storeName?: string;
      image?: string;
      itemType?: 'service' | 'product' | 'event';
      quantity?: number;
      variant?: {
        type?: string;
        value?: string;
      };
      price?: number;
      originalPrice?: number;
      subtotal?: number;
      serviceBookingId?: string;
      specialInstructions?: string;
    }[];
    totals?: {
      cashback?: number;
      total?: number;
      discount?: number;
      delivery?: number;
      subtotal?: number;
      tax?: number;
      lockFeeDiscount?: number;
      paidAmount?: number;
      refundAmount?: number;
      platformFee?: number;
      merchantPayout?: number;
    };
    specialInstructions?: string;
    fulfillmentType?: 'delivery' | 'pickup' | 'drive_thru' | 'dine_in';
    couponCode?: string;
  }
>;
/** UpdateOrderStatus — what the merchant app PATCHes to /api/orders/:id/status. */
export declare const UpdateOrderStatusSchema: z.ZodObject<
  {
    status: z.ZodEnum<
      [
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
      ]
    >;
    reason: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>>>;
  },
  'strict',
  z.ZodTypeAny,
  {
    status?:
      | 'ready'
      | 'refunded'
      | 'confirmed'
      | 'cancelled'
      | 'placed'
      | 'preparing'
      | 'dispatched'
      | 'out_for_delivery'
      | 'delivered'
      | 'cancelling'
      | 'returned';
    metadata?: Record<string, string | number | boolean>;
    reason?: string;
  },
  {
    status?:
      | 'ready'
      | 'refunded'
      | 'confirmed'
      | 'cancelled'
      | 'placed'
      | 'preparing'
      | 'dispatched'
      | 'out_for_delivery'
      | 'delivered'
      | 'cancelling'
      | 'returned';
    metadata?: Record<string, string | number | boolean>;
    reason?: string;
  }
>;
export declare const OrderResponseSchema: z.ZodObject<
  {
    _id: z.ZodOptional<z.ZodString>;
    orderNumber: z.ZodString;
    status: z.ZodEnum<
      [
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
      ]
    >;
    user: z.ZodString;
    store: z.ZodOptional<z.ZodString>;
    fulfillmentType: z.ZodEnum<['delivery', 'pickup', 'drive_thru', 'dine_in']>;
    items: z.ZodArray<
      z.ZodObject<
        {
          product: z.ZodString;
          store: z.ZodString;
          storeName: z.ZodOptional<z.ZodString>;
          name: z.ZodString;
          image: z.ZodString;
          itemType: z.ZodEnum<['product', 'service', 'event']>;
          quantity: z.ZodNumber;
          variant: z.ZodOptional<
            z.ZodObject<
              {
                type: z.ZodString;
                value: z.ZodString;
              },
              'strip',
              z.ZodTypeAny,
              {
                type?: string;
                value?: string;
              },
              {
                type?: string;
                value?: string;
              }
            >
          >;
          price: z.ZodNumber;
          originalPrice: z.ZodOptional<z.ZodNumber>;
          discount: z.ZodOptional<z.ZodNumber>;
          subtotal: z.ZodNumber;
          serviceBookingId: z.ZodOptional<z.ZodString>;
          sku: z.ZodOptional<z.ZodString>;
          specialInstructions: z.ZodOptional<z.ZodString>;
        },
        'strict',
        z.ZodTypeAny,
        {
          name?: string;
          discount?: number;
          product?: string;
          store?: string;
          sku?: string;
          storeName?: string;
          image?: string;
          itemType?: 'service' | 'product' | 'event';
          quantity?: number;
          variant?: {
            type?: string;
            value?: string;
          };
          price?: number;
          originalPrice?: number;
          subtotal?: number;
          serviceBookingId?: string;
          specialInstructions?: string;
        },
        {
          name?: string;
          discount?: number;
          product?: string;
          store?: string;
          sku?: string;
          storeName?: string;
          image?: string;
          itemType?: 'service' | 'product' | 'event';
          quantity?: number;
          variant?: {
            type?: string;
            value?: string;
          };
          price?: number;
          originalPrice?: number;
          subtotal?: number;
          serviceBookingId?: string;
          specialInstructions?: string;
        }
      >,
      'many'
    >;
    totals: z.ZodObject<
      {
        subtotal: z.ZodNumber;
        tax: z.ZodNumber;
        delivery: z.ZodNumber;
        discount: z.ZodNumber;
        lockFeeDiscount: z.ZodOptional<z.ZodNumber>;
        cashback: z.ZodNumber;
        total: z.ZodNumber;
        paidAmount: z.ZodNumber;
        refundAmount: z.ZodOptional<z.ZodNumber>;
        platformFee: z.ZodNumber;
        merchantPayout: z.ZodNumber;
      },
      'strict',
      z.ZodTypeAny,
      {
        cashback?: number;
        total?: number;
        discount?: number;
        delivery?: number;
        subtotal?: number;
        tax?: number;
        lockFeeDiscount?: number;
        paidAmount?: number;
        refundAmount?: number;
        platformFee?: number;
        merchantPayout?: number;
      },
      {
        cashback?: number;
        total?: number;
        discount?: number;
        delivery?: number;
        subtotal?: number;
        tax?: number;
        lockFeeDiscount?: number;
        paidAmount?: number;
        refundAmount?: number;
        platformFee?: number;
        merchantPayout?: number;
      }
    >;
    payment: z.ZodObject<
      {
        method: z.ZodEnum<['wallet', 'card', 'upi', 'cod', 'netbanking', 'razorpay', 'stripe']>;
        status: z.ZodEnum<
          [
            'pending',
            'awaiting_payment',
            'processing',
            'authorized',
            'paid',
            'partially_refunded',
            'refunded',
            'failed',
          ]
        >;
        transactionId: z.ZodOptional<z.ZodString>;
        paymentGateway: z.ZodOptional<z.ZodString>;
        failureReason: z.ZodOptional<z.ZodString>;
        paidAt: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
        refundId: z.ZodOptional<z.ZodString>;
        refundedAt: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
        coinsUsed: z.ZodOptional<
          z.ZodObject<
            {
              rezCoins: z.ZodOptional<z.ZodNumber>;
              wasilCoins: z.ZodOptional<z.ZodNumber>;
              promoCoins: z.ZodOptional<z.ZodNumber>;
              storePromoCoins: z.ZodOptional<z.ZodNumber>;
              totalCoinsValue: z.ZodOptional<z.ZodNumber>;
            },
            'strict',
            z.ZodTypeAny,
            {
              rezCoins?: number;
              wasilCoins?: number;
              promoCoins?: number;
              storePromoCoins?: number;
              totalCoinsValue?: number;
            },
            {
              rezCoins?: number;
              wasilCoins?: number;
              promoCoins?: number;
              storePromoCoins?: number;
              totalCoinsValue?: number;
            }
          >
        >;
      },
      'strict',
      z.ZodTypeAny,
      {
        status?:
          | 'pending'
          | 'refunded'
          | 'failed'
          | 'processing'
          | 'partially_refunded'
          | 'awaiting_payment'
          | 'authorized'
          | 'paid';
        method?: 'upi' | 'card' | 'wallet' | 'netbanking' | 'cod' | 'razorpay' | 'stripe';
        transactionId?: string;
        paymentGateway?: string;
        failureReason?: string;
        paidAt?: string | Date;
        refundId?: string;
        refundedAt?: string | Date;
        coinsUsed?: {
          rezCoins?: number;
          wasilCoins?: number;
          promoCoins?: number;
          storePromoCoins?: number;
          totalCoinsValue?: number;
        };
      },
      {
        status?:
          | 'pending'
          | 'refunded'
          | 'failed'
          | 'processing'
          | 'partially_refunded'
          | 'awaiting_payment'
          | 'authorized'
          | 'paid';
        method?: 'upi' | 'card' | 'wallet' | 'netbanking' | 'cod' | 'razorpay' | 'stripe';
        transactionId?: string;
        paymentGateway?: string;
        failureReason?: string;
        paidAt?: string | Date;
        refundId?: string;
        refundedAt?: string | Date;
        coinsUsed?: {
          rezCoins?: number;
          wasilCoins?: number;
          promoCoins?: number;
          storePromoCoins?: number;
          totalCoinsValue?: number;
        };
      }
    >;
    delivery: z.ZodObject<
      {
        method: z.ZodEnum<['standard', 'express', 'pickup', 'drive_thru', 'dine_in', 'scheduled']>;
        status: z.ZodEnum<
          [
            'pending',
            'confirmed',
            'preparing',
            'ready',
            'dispatched',
            'out_for_delivery',
            'delivered',
            'failed',
            'returned',
          ]
        >;
        address: z.ZodObject<
          {
            name: z.ZodString;
            phone: z.ZodString;
            email: z.ZodOptional<z.ZodString>;
            addressLine1: z.ZodString;
            addressLine2: z.ZodOptional<z.ZodString>;
            city: z.ZodString;
            state: z.ZodString;
            pincode: z.ZodString;
            country: z.ZodString;
            coordinates: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>>;
            landmark: z.ZodOptional<z.ZodString>;
            addressType: z.ZodOptional<z.ZodEnum<['home', 'work', 'other']>>;
          },
          'strict',
          z.ZodTypeAny,
          {
            name?: string;
            phone?: string;
            email?: string;
            addressLine1?: string;
            addressLine2?: string;
            city?: string;
            state?: string;
            pincode?: string;
            country?: string;
            coordinates?: [number, number, ...unknown[]];
            landmark?: string;
            addressType?: 'other' | 'home' | 'work';
          },
          {
            name?: string;
            phone?: string;
            email?: string;
            addressLine1?: string;
            addressLine2?: string;
            city?: string;
            state?: string;
            pincode?: string;
            country?: string;
            coordinates?: [number, number, ...unknown[]];
            landmark?: string;
            addressType?: 'other' | 'home' | 'work';
          }
        >;
        estimatedTime: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
        actualTime: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
        dispatchedAt: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
        deliveredAt: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
        trackingId: z.ZodOptional<z.ZodString>;
        deliveryPartner: z.ZodOptional<z.ZodString>;
        deliveryFee: z.ZodNumber;
        instructions: z.ZodOptional<z.ZodString>;
        deliveryOTP: z.ZodOptional<z.ZodString>;
      },
      'strict',
      z.ZodTypeAny,
      {
        status?:
          | 'ready'
          | 'pending'
          | 'failed'
          | 'confirmed'
          | 'preparing'
          | 'dispatched'
          | 'out_for_delivery'
          | 'delivered'
          | 'returned';
        method?: 'scheduled' | 'pickup' | 'drive_thru' | 'dine_in' | 'standard' | 'express';
        address?: {
          name?: string;
          phone?: string;
          email?: string;
          addressLine1?: string;
          addressLine2?: string;
          city?: string;
          state?: string;
          pincode?: string;
          country?: string;
          coordinates?: [number, number, ...unknown[]];
          landmark?: string;
          addressType?: 'other' | 'home' | 'work';
        };
        estimatedTime?: string | Date;
        actualTime?: string | Date;
        dispatchedAt?: string | Date;
        deliveredAt?: string | Date;
        trackingId?: string;
        deliveryPartner?: string;
        deliveryFee?: number;
        instructions?: string;
        deliveryOTP?: string;
      },
      {
        status?:
          | 'ready'
          | 'pending'
          | 'failed'
          | 'confirmed'
          | 'preparing'
          | 'dispatched'
          | 'out_for_delivery'
          | 'delivered'
          | 'returned';
        method?: 'scheduled' | 'pickup' | 'drive_thru' | 'dine_in' | 'standard' | 'express';
        address?: {
          name?: string;
          phone?: string;
          email?: string;
          addressLine1?: string;
          addressLine2?: string;
          city?: string;
          state?: string;
          pincode?: string;
          country?: string;
          coordinates?: [number, number, ...unknown[]];
          landmark?: string;
          addressType?: 'other' | 'home' | 'work';
        };
        estimatedTime?: string | Date;
        actualTime?: string | Date;
        dispatchedAt?: string | Date;
        deliveredAt?: string | Date;
        trackingId?: string;
        deliveryPartner?: string;
        deliveryFee?: number;
        instructions?: string;
        deliveryOTP?: string;
      }
    >;
    couponCode: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodUnion<[z.ZodDate, z.ZodString]>;
    updatedAt: z.ZodUnion<[z.ZodDate, z.ZodString]>;
  },
  'strip',
  z.ZodTypeAny,
  {
    _id?: string;
    createdAt?: string | Date;
    updatedAt?: string | Date;
    status?:
      | 'ready'
      | 'refunded'
      | 'confirmed'
      | 'cancelled'
      | 'placed'
      | 'preparing'
      | 'dispatched'
      | 'out_for_delivery'
      | 'delivered'
      | 'cancelling'
      | 'returned';
    user?: string;
    payment?: {
      status?:
        | 'pending'
        | 'refunded'
        | 'failed'
        | 'processing'
        | 'partially_refunded'
        | 'awaiting_payment'
        | 'authorized'
        | 'paid';
      method?: 'upi' | 'card' | 'wallet' | 'netbanking' | 'cod' | 'razorpay' | 'stripe';
      transactionId?: string;
      paymentGateway?: string;
      failureReason?: string;
      paidAt?: string | Date;
      refundId?: string;
      refundedAt?: string | Date;
      coinsUsed?: {
        rezCoins?: number;
        wasilCoins?: number;
        promoCoins?: number;
        storePromoCoins?: number;
        totalCoinsValue?: number;
      };
    };
    delivery?: {
      status?:
        | 'ready'
        | 'pending'
        | 'failed'
        | 'confirmed'
        | 'preparing'
        | 'dispatched'
        | 'out_for_delivery'
        | 'delivered'
        | 'returned';
      method?: 'scheduled' | 'pickup' | 'drive_thru' | 'dine_in' | 'standard' | 'express';
      address?: {
        name?: string;
        phone?: string;
        email?: string;
        addressLine1?: string;
        addressLine2?: string;
        city?: string;
        state?: string;
        pincode?: string;
        country?: string;
        coordinates?: [number, number, ...unknown[]];
        landmark?: string;
        addressType?: 'other' | 'home' | 'work';
      };
      estimatedTime?: string | Date;
      actualTime?: string | Date;
      dispatchedAt?: string | Date;
      deliveredAt?: string | Date;
      trackingId?: string;
      deliveryPartner?: string;
      deliveryFee?: number;
      instructions?: string;
      deliveryOTP?: string;
    };
    store?: string;
    orderNumber?: string;
    items?: {
      name?: string;
      discount?: number;
      product?: string;
      store?: string;
      sku?: string;
      storeName?: string;
      image?: string;
      itemType?: 'service' | 'product' | 'event';
      quantity?: number;
      variant?: {
        type?: string;
        value?: string;
      };
      price?: number;
      originalPrice?: number;
      subtotal?: number;
      serviceBookingId?: string;
      specialInstructions?: string;
    }[];
    totals?: {
      cashback?: number;
      total?: number;
      discount?: number;
      delivery?: number;
      subtotal?: number;
      tax?: number;
      lockFeeDiscount?: number;
      paidAmount?: number;
      refundAmount?: number;
      platformFee?: number;
      merchantPayout?: number;
    };
    fulfillmentType?: 'delivery' | 'pickup' | 'drive_thru' | 'dine_in';
    couponCode?: string;
  },
  {
    _id?: string;
    createdAt?: string | Date;
    updatedAt?: string | Date;
    status?:
      | 'ready'
      | 'refunded'
      | 'confirmed'
      | 'cancelled'
      | 'placed'
      | 'preparing'
      | 'dispatched'
      | 'out_for_delivery'
      | 'delivered'
      | 'cancelling'
      | 'returned';
    user?: string;
    payment?: {
      status?:
        | 'pending'
        | 'refunded'
        | 'failed'
        | 'processing'
        | 'partially_refunded'
        | 'awaiting_payment'
        | 'authorized'
        | 'paid';
      method?: 'upi' | 'card' | 'wallet' | 'netbanking' | 'cod' | 'razorpay' | 'stripe';
      transactionId?: string;
      paymentGateway?: string;
      failureReason?: string;
      paidAt?: string | Date;
      refundId?: string;
      refundedAt?: string | Date;
      coinsUsed?: {
        rezCoins?: number;
        wasilCoins?: number;
        promoCoins?: number;
        storePromoCoins?: number;
        totalCoinsValue?: number;
      };
    };
    delivery?: {
      status?:
        | 'ready'
        | 'pending'
        | 'failed'
        | 'confirmed'
        | 'preparing'
        | 'dispatched'
        | 'out_for_delivery'
        | 'delivered'
        | 'returned';
      method?: 'scheduled' | 'pickup' | 'drive_thru' | 'dine_in' | 'standard' | 'express';
      address?: {
        name?: string;
        phone?: string;
        email?: string;
        addressLine1?: string;
        addressLine2?: string;
        city?: string;
        state?: string;
        pincode?: string;
        country?: string;
        coordinates?: [number, number, ...unknown[]];
        landmark?: string;
        addressType?: 'other' | 'home' | 'work';
      };
      estimatedTime?: string | Date;
      actualTime?: string | Date;
      dispatchedAt?: string | Date;
      deliveredAt?: string | Date;
      trackingId?: string;
      deliveryPartner?: string;
      deliveryFee?: number;
      instructions?: string;
      deliveryOTP?: string;
    };
    store?: string;
    orderNumber?: string;
    items?: {
      name?: string;
      discount?: number;
      product?: string;
      store?: string;
      sku?: string;
      storeName?: string;
      image?: string;
      itemType?: 'service' | 'product' | 'event';
      quantity?: number;
      variant?: {
        type?: string;
        value?: string;
      };
      price?: number;
      originalPrice?: number;
      subtotal?: number;
      serviceBookingId?: string;
      specialInstructions?: string;
    }[];
    totals?: {
      cashback?: number;
      total?: number;
      discount?: number;
      delivery?: number;
      subtotal?: number;
      tax?: number;
      lockFeeDiscount?: number;
      paidAmount?: number;
      refundAmount?: number;
      platformFee?: number;
      merchantPayout?: number;
    };
    fulfillmentType?: 'delivery' | 'pickup' | 'drive_thru' | 'dine_in';
    couponCode?: string;
  }
>;
export declare const OrderListResponseSchema: z.ZodArray<
  z.ZodObject<
    {
      _id: z.ZodOptional<z.ZodString>;
      orderNumber: z.ZodString;
      status: z.ZodEnum<
        [
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
        ]
      >;
      user: z.ZodString;
      store: z.ZodOptional<z.ZodString>;
      fulfillmentType: z.ZodEnum<['delivery', 'pickup', 'drive_thru', 'dine_in']>;
      items: z.ZodArray<
        z.ZodObject<
          {
            product: z.ZodString;
            store: z.ZodString;
            storeName: z.ZodOptional<z.ZodString>;
            name: z.ZodString;
            image: z.ZodString;
            itemType: z.ZodEnum<['product', 'service', 'event']>;
            quantity: z.ZodNumber;
            variant: z.ZodOptional<
              z.ZodObject<
                {
                  type: z.ZodString;
                  value: z.ZodString;
                },
                'strip',
                z.ZodTypeAny,
                {
                  type?: string;
                  value?: string;
                },
                {
                  type?: string;
                  value?: string;
                }
              >
            >;
            price: z.ZodNumber;
            originalPrice: z.ZodOptional<z.ZodNumber>;
            discount: z.ZodOptional<z.ZodNumber>;
            subtotal: z.ZodNumber;
            serviceBookingId: z.ZodOptional<z.ZodString>;
            sku: z.ZodOptional<z.ZodString>;
            specialInstructions: z.ZodOptional<z.ZodString>;
          },
          'strict',
          z.ZodTypeAny,
          {
            name?: string;
            discount?: number;
            product?: string;
            store?: string;
            sku?: string;
            storeName?: string;
            image?: string;
            itemType?: 'service' | 'product' | 'event';
            quantity?: number;
            variant?: {
              type?: string;
              value?: string;
            };
            price?: number;
            originalPrice?: number;
            subtotal?: number;
            serviceBookingId?: string;
            specialInstructions?: string;
          },
          {
            name?: string;
            discount?: number;
            product?: string;
            store?: string;
            sku?: string;
            storeName?: string;
            image?: string;
            itemType?: 'service' | 'product' | 'event';
            quantity?: number;
            variant?: {
              type?: string;
              value?: string;
            };
            price?: number;
            originalPrice?: number;
            subtotal?: number;
            serviceBookingId?: string;
            specialInstructions?: string;
          }
        >,
        'many'
      >;
      totals: z.ZodObject<
        {
          subtotal: z.ZodNumber;
          tax: z.ZodNumber;
          delivery: z.ZodNumber;
          discount: z.ZodNumber;
          lockFeeDiscount: z.ZodOptional<z.ZodNumber>;
          cashback: z.ZodNumber;
          total: z.ZodNumber;
          paidAmount: z.ZodNumber;
          refundAmount: z.ZodOptional<z.ZodNumber>;
          platformFee: z.ZodNumber;
          merchantPayout: z.ZodNumber;
        },
        'strict',
        z.ZodTypeAny,
        {
          cashback?: number;
          total?: number;
          discount?: number;
          delivery?: number;
          subtotal?: number;
          tax?: number;
          lockFeeDiscount?: number;
          paidAmount?: number;
          refundAmount?: number;
          platformFee?: number;
          merchantPayout?: number;
        },
        {
          cashback?: number;
          total?: number;
          discount?: number;
          delivery?: number;
          subtotal?: number;
          tax?: number;
          lockFeeDiscount?: number;
          paidAmount?: number;
          refundAmount?: number;
          platformFee?: number;
          merchantPayout?: number;
        }
      >;
      payment: z.ZodObject<
        {
          method: z.ZodEnum<['wallet', 'card', 'upi', 'cod', 'netbanking', 'razorpay', 'stripe']>;
          status: z.ZodEnum<
            [
              'pending',
              'awaiting_payment',
              'processing',
              'authorized',
              'paid',
              'partially_refunded',
              'refunded',
              'failed',
            ]
          >;
          transactionId: z.ZodOptional<z.ZodString>;
          paymentGateway: z.ZodOptional<z.ZodString>;
          failureReason: z.ZodOptional<z.ZodString>;
          paidAt: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
          refundId: z.ZodOptional<z.ZodString>;
          refundedAt: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
          coinsUsed: z.ZodOptional<
            z.ZodObject<
              {
                rezCoins: z.ZodOptional<z.ZodNumber>;
                wasilCoins: z.ZodOptional<z.ZodNumber>;
                promoCoins: z.ZodOptional<z.ZodNumber>;
                storePromoCoins: z.ZodOptional<z.ZodNumber>;
                totalCoinsValue: z.ZodOptional<z.ZodNumber>;
              },
              'strict',
              z.ZodTypeAny,
              {
                rezCoins?: number;
                wasilCoins?: number;
                promoCoins?: number;
                storePromoCoins?: number;
                totalCoinsValue?: number;
              },
              {
                rezCoins?: number;
                wasilCoins?: number;
                promoCoins?: number;
                storePromoCoins?: number;
                totalCoinsValue?: number;
              }
            >
          >;
        },
        'strict',
        z.ZodTypeAny,
        {
          status?:
            | 'pending'
            | 'refunded'
            | 'failed'
            | 'processing'
            | 'partially_refunded'
            | 'awaiting_payment'
            | 'authorized'
            | 'paid';
          method?: 'upi' | 'card' | 'wallet' | 'netbanking' | 'cod' | 'razorpay' | 'stripe';
          transactionId?: string;
          paymentGateway?: string;
          failureReason?: string;
          paidAt?: string | Date;
          refundId?: string;
          refundedAt?: string | Date;
          coinsUsed?: {
            rezCoins?: number;
            wasilCoins?: number;
            promoCoins?: number;
            storePromoCoins?: number;
            totalCoinsValue?: number;
          };
        },
        {
          status?:
            | 'pending'
            | 'refunded'
            | 'failed'
            | 'processing'
            | 'partially_refunded'
            | 'awaiting_payment'
            | 'authorized'
            | 'paid';
          method?: 'upi' | 'card' | 'wallet' | 'netbanking' | 'cod' | 'razorpay' | 'stripe';
          transactionId?: string;
          paymentGateway?: string;
          failureReason?: string;
          paidAt?: string | Date;
          refundId?: string;
          refundedAt?: string | Date;
          coinsUsed?: {
            rezCoins?: number;
            wasilCoins?: number;
            promoCoins?: number;
            storePromoCoins?: number;
            totalCoinsValue?: number;
          };
        }
      >;
      delivery: z.ZodObject<
        {
          method: z.ZodEnum<['standard', 'express', 'pickup', 'drive_thru', 'dine_in', 'scheduled']>;
          status: z.ZodEnum<
            [
              'pending',
              'confirmed',
              'preparing',
              'ready',
              'dispatched',
              'out_for_delivery',
              'delivered',
              'failed',
              'returned',
            ]
          >;
          address: z.ZodObject<
            {
              name: z.ZodString;
              phone: z.ZodString;
              email: z.ZodOptional<z.ZodString>;
              addressLine1: z.ZodString;
              addressLine2: z.ZodOptional<z.ZodString>;
              city: z.ZodString;
              state: z.ZodString;
              pincode: z.ZodString;
              country: z.ZodString;
              coordinates: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>>;
              landmark: z.ZodOptional<z.ZodString>;
              addressType: z.ZodOptional<z.ZodEnum<['home', 'work', 'other']>>;
            },
            'strict',
            z.ZodTypeAny,
            {
              name?: string;
              phone?: string;
              email?: string;
              addressLine1?: string;
              addressLine2?: string;
              city?: string;
              state?: string;
              pincode?: string;
              country?: string;
              coordinates?: [number, number, ...unknown[]];
              landmark?: string;
              addressType?: 'other' | 'home' | 'work';
            },
            {
              name?: string;
              phone?: string;
              email?: string;
              addressLine1?: string;
              addressLine2?: string;
              city?: string;
              state?: string;
              pincode?: string;
              country?: string;
              coordinates?: [number, number, ...unknown[]];
              landmark?: string;
              addressType?: 'other' | 'home' | 'work';
            }
          >;
          estimatedTime: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
          actualTime: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
          dispatchedAt: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
          deliveredAt: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
          trackingId: z.ZodOptional<z.ZodString>;
          deliveryPartner: z.ZodOptional<z.ZodString>;
          deliveryFee: z.ZodNumber;
          instructions: z.ZodOptional<z.ZodString>;
          deliveryOTP: z.ZodOptional<z.ZodString>;
        },
        'strict',
        z.ZodTypeAny,
        {
          status?:
            | 'ready'
            | 'pending'
            | 'failed'
            | 'confirmed'
            | 'preparing'
            | 'dispatched'
            | 'out_for_delivery'
            | 'delivered'
            | 'returned';
          method?: 'scheduled' | 'pickup' | 'drive_thru' | 'dine_in' | 'standard' | 'express';
          address?: {
            name?: string;
            phone?: string;
            email?: string;
            addressLine1?: string;
            addressLine2?: string;
            city?: string;
            state?: string;
            pincode?: string;
            country?: string;
            coordinates?: [number, number, ...unknown[]];
            landmark?: string;
            addressType?: 'other' | 'home' | 'work';
          };
          estimatedTime?: string | Date;
          actualTime?: string | Date;
          dispatchedAt?: string | Date;
          deliveredAt?: string | Date;
          trackingId?: string;
          deliveryPartner?: string;
          deliveryFee?: number;
          instructions?: string;
          deliveryOTP?: string;
        },
        {
          status?:
            | 'ready'
            | 'pending'
            | 'failed'
            | 'confirmed'
            | 'preparing'
            | 'dispatched'
            | 'out_for_delivery'
            | 'delivered'
            | 'returned';
          method?: 'scheduled' | 'pickup' | 'drive_thru' | 'dine_in' | 'standard' | 'express';
          address?: {
            name?: string;
            phone?: string;
            email?: string;
            addressLine1?: string;
            addressLine2?: string;
            city?: string;
            state?: string;
            pincode?: string;
            country?: string;
            coordinates?: [number, number, ...unknown[]];
            landmark?: string;
            addressType?: 'other' | 'home' | 'work';
          };
          estimatedTime?: string | Date;
          actualTime?: string | Date;
          dispatchedAt?: string | Date;
          deliveredAt?: string | Date;
          trackingId?: string;
          deliveryPartner?: string;
          deliveryFee?: number;
          instructions?: string;
          deliveryOTP?: string;
        }
      >;
      couponCode: z.ZodOptional<z.ZodString>;
      createdAt: z.ZodUnion<[z.ZodDate, z.ZodString]>;
      updatedAt: z.ZodUnion<[z.ZodDate, z.ZodString]>;
    },
    'strip',
    z.ZodTypeAny,
    {
      _id?: string;
      createdAt?: string | Date;
      updatedAt?: string | Date;
      status?:
        | 'ready'
        | 'refunded'
        | 'confirmed'
        | 'cancelled'
        | 'placed'
        | 'preparing'
        | 'dispatched'
        | 'out_for_delivery'
        | 'delivered'
        | 'cancelling'
        | 'returned';
      user?: string;
      payment?: {
        status?:
          | 'pending'
          | 'refunded'
          | 'failed'
          | 'processing'
          | 'partially_refunded'
          | 'awaiting_payment'
          | 'authorized'
          | 'paid';
        method?: 'upi' | 'card' | 'wallet' | 'netbanking' | 'cod' | 'razorpay' | 'stripe';
        transactionId?: string;
        paymentGateway?: string;
        failureReason?: string;
        paidAt?: string | Date;
        refundId?: string;
        refundedAt?: string | Date;
        coinsUsed?: {
          rezCoins?: number;
          wasilCoins?: number;
          promoCoins?: number;
          storePromoCoins?: number;
          totalCoinsValue?: number;
        };
      };
      delivery?: {
        status?:
          | 'ready'
          | 'pending'
          | 'failed'
          | 'confirmed'
          | 'preparing'
          | 'dispatched'
          | 'out_for_delivery'
          | 'delivered'
          | 'returned';
        method?: 'scheduled' | 'pickup' | 'drive_thru' | 'dine_in' | 'standard' | 'express';
        address?: {
          name?: string;
          phone?: string;
          email?: string;
          addressLine1?: string;
          addressLine2?: string;
          city?: string;
          state?: string;
          pincode?: string;
          country?: string;
          coordinates?: [number, number, ...unknown[]];
          landmark?: string;
          addressType?: 'other' | 'home' | 'work';
        };
        estimatedTime?: string | Date;
        actualTime?: string | Date;
        dispatchedAt?: string | Date;
        deliveredAt?: string | Date;
        trackingId?: string;
        deliveryPartner?: string;
        deliveryFee?: number;
        instructions?: string;
        deliveryOTP?: string;
      };
      store?: string;
      orderNumber?: string;
      items?: {
        name?: string;
        discount?: number;
        product?: string;
        store?: string;
        sku?: string;
        storeName?: string;
        image?: string;
        itemType?: 'service' | 'product' | 'event';
        quantity?: number;
        variant?: {
          type?: string;
          value?: string;
        };
        price?: number;
        originalPrice?: number;
        subtotal?: number;
        serviceBookingId?: string;
        specialInstructions?: string;
      }[];
      totals?: {
        cashback?: number;
        total?: number;
        discount?: number;
        delivery?: number;
        subtotal?: number;
        tax?: number;
        lockFeeDiscount?: number;
        paidAmount?: number;
        refundAmount?: number;
        platformFee?: number;
        merchantPayout?: number;
      };
      fulfillmentType?: 'delivery' | 'pickup' | 'drive_thru' | 'dine_in';
      couponCode?: string;
    },
    {
      _id?: string;
      createdAt?: string | Date;
      updatedAt?: string | Date;
      status?:
        | 'ready'
        | 'refunded'
        | 'confirmed'
        | 'cancelled'
        | 'placed'
        | 'preparing'
        | 'dispatched'
        | 'out_for_delivery'
        | 'delivered'
        | 'cancelling'
        | 'returned';
      user?: string;
      payment?: {
        status?:
          | 'pending'
          | 'refunded'
          | 'failed'
          | 'processing'
          | 'partially_refunded'
          | 'awaiting_payment'
          | 'authorized'
          | 'paid';
        method?: 'upi' | 'card' | 'wallet' | 'netbanking' | 'cod' | 'razorpay' | 'stripe';
        transactionId?: string;
        paymentGateway?: string;
        failureReason?: string;
        paidAt?: string | Date;
        refundId?: string;
        refundedAt?: string | Date;
        coinsUsed?: {
          rezCoins?: number;
          wasilCoins?: number;
          promoCoins?: number;
          storePromoCoins?: number;
          totalCoinsValue?: number;
        };
      };
      delivery?: {
        status?:
          | 'ready'
          | 'pending'
          | 'failed'
          | 'confirmed'
          | 'preparing'
          | 'dispatched'
          | 'out_for_delivery'
          | 'delivered'
          | 'returned';
        method?: 'scheduled' | 'pickup' | 'drive_thru' | 'dine_in' | 'standard' | 'express';
        address?: {
          name?: string;
          phone?: string;
          email?: string;
          addressLine1?: string;
          addressLine2?: string;
          city?: string;
          state?: string;
          pincode?: string;
          country?: string;
          coordinates?: [number, number, ...unknown[]];
          landmark?: string;
          addressType?: 'other' | 'home' | 'work';
        };
        estimatedTime?: string | Date;
        actualTime?: string | Date;
        dispatchedAt?: string | Date;
        deliveredAt?: string | Date;
        trackingId?: string;
        deliveryPartner?: string;
        deliveryFee?: number;
        instructions?: string;
        deliveryOTP?: string;
      };
      store?: string;
      orderNumber?: string;
      items?: {
        name?: string;
        discount?: number;
        product?: string;
        store?: string;
        sku?: string;
        storeName?: string;
        image?: string;
        itemType?: 'service' | 'product' | 'event';
        quantity?: number;
        variant?: {
          type?: string;
          value?: string;
        };
        price?: number;
        originalPrice?: number;
        subtotal?: number;
        serviceBookingId?: string;
        specialInstructions?: string;
      }[];
      totals?: {
        cashback?: number;
        total?: number;
        discount?: number;
        delivery?: number;
        subtotal?: number;
        tax?: number;
        lockFeeDiscount?: number;
        paidAmount?: number;
        refundAmount?: number;
        platformFee?: number;
        merchantPayout?: number;
      };
      fulfillmentType?: 'delivery' | 'pickup' | 'drive_thru' | 'dine_in';
      couponCode?: string;
    }
  >,
  'many'
>;
export type CreateOrderRequest = z.infer<typeof CreateOrderSchema>;
export type UpdateOrderStatusRequest = z.infer<typeof UpdateOrderStatusSchema>;
export type OrderResponse = z.infer<typeof OrderResponseSchema>;
export type OrderListResponse = z.infer<typeof OrderListResponseSchema>;
//# sourceMappingURL=order.schema.d.ts.map
