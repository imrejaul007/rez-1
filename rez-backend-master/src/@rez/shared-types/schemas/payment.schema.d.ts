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
export declare const PAYMENT_STATUS: z.ZodEnum<
  [
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
  ]
>;
/** Payment method — HOW the customer pays (canonical 4-value set + cash-on-delivery extras). */
export declare const PAYMENT_METHOD: z.ZodEnum<
  ['upi', 'card', 'wallet', 'netbanking', 'cod', 'bnpl', 'razorpay', 'stripe']
>;
/** Payment gateway — WHO processes the payment. Distinct from method. */
export declare const PAYMENT_GATEWAY: z.ZodEnum<['stripe', 'razorpay', 'paypal']>;
export declare const PAYMENT_PURPOSE: z.ZodEnum<
  ['wallet_topup', 'order_payment', 'event_booking', 'financial_service', 'other']
>;
export declare const PaymentUserDetailsSchema: z.ZodObject<
  {
    name: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
  },
  'strict',
  z.ZodTypeAny,
  {
    name?: string;
    phone?: string;
    email?: string;
  },
  {
    name?: string;
    phone?: string;
    email?: string;
  }
>;
/** Metadata: known gateway keys are typed; index signature allows extras. */
export declare const PaymentMetadataSchema: z.ZodObject<
  {
    razorpayOrderId: z.ZodOptional<z.ZodString>;
    stripeWebhookId: z.ZodOptional<z.ZodString>;
    paypalOrderId: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>,
  z.objectOutputType<
    {
      razorpayOrderId: z.ZodOptional<z.ZodString>;
      stripeWebhookId: z.ZodOptional<z.ZodString>;
      paypalOrderId: z.ZodOptional<z.ZodString>;
    },
    z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>,
    'strip'
  >,
  z.objectInputType<
    {
      razorpayOrderId: z.ZodOptional<z.ZodString>;
      stripeWebhookId: z.ZodOptional<z.ZodString>;
      paypalOrderId: z.ZodOptional<z.ZodString>;
    },
    z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>,
    'strip'
  >
>;
/** Discriminated gateway-response union. */
export declare const PaymentGatewayResponseSchema: z.ZodDiscriminatedUnion<
  'gateway',
  [
    z.ZodObject<
      {
        gateway: z.ZodLiteral<'razorpay'>;
        transactionId: z.ZodOptional<z.ZodString>;
        paymentUrl: z.ZodOptional<z.ZodString>;
        razorpayPaymentId: z.ZodOptional<z.ZodString>;
        razorpaySignature: z.ZodOptional<z.ZodString>;
        timestamp: z.ZodUnion<[z.ZodDate, z.ZodString]>;
      },
      'strict',
      z.ZodTypeAny,
      {
        timestamp?: string | Date;
        transactionId?: string;
        gateway?: 'razorpay';
        paymentUrl?: string;
        razorpayPaymentId?: string;
        razorpaySignature?: string;
      },
      {
        timestamp?: string | Date;
        transactionId?: string;
        gateway?: 'razorpay';
        paymentUrl?: string;
        razorpayPaymentId?: string;
        razorpaySignature?: string;
      }
    >,
    z.ZodObject<
      {
        gateway: z.ZodLiteral<'stripe'>;
        transactionId: z.ZodOptional<z.ZodString>;
        paymentIntentId: z.ZodOptional<z.ZodString>;
        clientSecret: z.ZodOptional<z.ZodString>;
        timestamp: z.ZodUnion<[z.ZodDate, z.ZodString]>;
      },
      'strict',
      z.ZodTypeAny,
      {
        timestamp?: string | Date;
        transactionId?: string;
        gateway?: 'stripe';
        paymentIntentId?: string;
        clientSecret?: string;
      },
      {
        timestamp?: string | Date;
        transactionId?: string;
        gateway?: 'stripe';
        paymentIntentId?: string;
        clientSecret?: string;
      }
    >,
    z.ZodObject<
      {
        gateway: z.ZodLiteral<'paypal'>;
        transactionId: z.ZodOptional<z.ZodString>;
        paypalOrderId: z.ZodOptional<z.ZodString>;
        captureId: z.ZodOptional<z.ZodString>;
        timestamp: z.ZodUnion<[z.ZodDate, z.ZodString]>;
      },
      'strict',
      z.ZodTypeAny,
      {
        timestamp?: string | Date;
        paypalOrderId?: string;
        transactionId?: string;
        gateway?: 'paypal';
        captureId?: string;
      },
      {
        timestamp?: string | Date;
        paypalOrderId?: string;
        transactionId?: string;
        gateway?: 'paypal';
        captureId?: string;
      }
    >,
    z.ZodObject<
      {
        gateway: z.ZodLiteral<'upi'>;
        transactionId: z.ZodOptional<z.ZodString>;
        upiId: z.ZodOptional<z.ZodString>;
        qrCode: z.ZodOptional<z.ZodString>;
        expiryTime: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
        timestamp: z.ZodUnion<[z.ZodDate, z.ZodString]>;
      },
      'strict',
      z.ZodTypeAny,
      {
        timestamp?: string | Date;
        transactionId?: string;
        gateway?: 'upi';
        upiId?: string;
        qrCode?: string;
        expiryTime?: string | Date;
      },
      {
        timestamp?: string | Date;
        transactionId?: string;
        gateway?: 'upi';
        upiId?: string;
        qrCode?: string;
        expiryTime?: string | Date;
      }
    >,
    z.ZodObject<
      {
        gateway: z.ZodEnum<['wallet', 'cod']>;
        transactionId: z.ZodOptional<z.ZodString>;
        timestamp: z.ZodUnion<[z.ZodDate, z.ZodString]>;
      },
      'strict',
      z.ZodTypeAny,
      {
        timestamp?: string | Date;
        transactionId?: string;
        gateway?: 'wallet' | 'cod';
      },
      {
        timestamp?: string | Date;
        transactionId?: string;
        gateway?: 'wallet' | 'cod';
      }
    >,
  ]
>;
export declare const CreatePaymentSchema: z.ZodObject<
  {
    paymentId: z.ZodString;
    orderId: z.ZodString;
    user: z.ZodString;
    amount: z.ZodNumber;
    currency: z.ZodDefault<z.ZodString>;
    paymentMethod: z.ZodEnum<['upi', 'card', 'wallet', 'netbanking', 'cod', 'bnpl', 'razorpay', 'stripe']>;
    gateway: z.ZodOptional<z.ZodEnum<['stripe', 'razorpay', 'paypal']>>;
    purpose: z.ZodDefault<
      z.ZodOptional<z.ZodEnum<['wallet_topup', 'order_payment', 'event_booking', 'financial_service', 'other']>>
    >;
    userDetails: z.ZodObject<
      {
        name: z.ZodOptional<z.ZodString>;
        email: z.ZodOptional<z.ZodString>;
        phone: z.ZodOptional<z.ZodString>;
      },
      'strict',
      z.ZodTypeAny,
      {
        name?: string;
        phone?: string;
        email?: string;
      },
      {
        name?: string;
        phone?: string;
        email?: string;
      }
    >;
    metadata: z.ZodOptional<
      z.ZodObject<
        {
          razorpayOrderId: z.ZodOptional<z.ZodString>;
          stripeWebhookId: z.ZodOptional<z.ZodString>;
          paypalOrderId: z.ZodOptional<z.ZodString>;
        },
        'strip',
        z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>,
        z.objectOutputType<
          {
            razorpayOrderId: z.ZodOptional<z.ZodString>;
            stripeWebhookId: z.ZodOptional<z.ZodString>;
            paypalOrderId: z.ZodOptional<z.ZodString>;
          },
          z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>,
          'strip'
        >,
        z.objectInputType<
          {
            razorpayOrderId: z.ZodOptional<z.ZodString>;
            stripeWebhookId: z.ZodOptional<z.ZodString>;
            paypalOrderId: z.ZodOptional<z.ZodString>;
          },
          z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>,
          'strip'
        >
      >
    >;
    gatewayResponse: z.ZodOptional<
      z.ZodDiscriminatedUnion<
        'gateway',
        [
          z.ZodObject<
            {
              gateway: z.ZodLiteral<'razorpay'>;
              transactionId: z.ZodOptional<z.ZodString>;
              paymentUrl: z.ZodOptional<z.ZodString>;
              razorpayPaymentId: z.ZodOptional<z.ZodString>;
              razorpaySignature: z.ZodOptional<z.ZodString>;
              timestamp: z.ZodUnion<[z.ZodDate, z.ZodString]>;
            },
            'strict',
            z.ZodTypeAny,
            {
              timestamp?: string | Date;
              transactionId?: string;
              gateway?: 'razorpay';
              paymentUrl?: string;
              razorpayPaymentId?: string;
              razorpaySignature?: string;
            },
            {
              timestamp?: string | Date;
              transactionId?: string;
              gateway?: 'razorpay';
              paymentUrl?: string;
              razorpayPaymentId?: string;
              razorpaySignature?: string;
            }
          >,
          z.ZodObject<
            {
              gateway: z.ZodLiteral<'stripe'>;
              transactionId: z.ZodOptional<z.ZodString>;
              paymentIntentId: z.ZodOptional<z.ZodString>;
              clientSecret: z.ZodOptional<z.ZodString>;
              timestamp: z.ZodUnion<[z.ZodDate, z.ZodString]>;
            },
            'strict',
            z.ZodTypeAny,
            {
              timestamp?: string | Date;
              transactionId?: string;
              gateway?: 'stripe';
              paymentIntentId?: string;
              clientSecret?: string;
            },
            {
              timestamp?: string | Date;
              transactionId?: string;
              gateway?: 'stripe';
              paymentIntentId?: string;
              clientSecret?: string;
            }
          >,
          z.ZodObject<
            {
              gateway: z.ZodLiteral<'paypal'>;
              transactionId: z.ZodOptional<z.ZodString>;
              paypalOrderId: z.ZodOptional<z.ZodString>;
              captureId: z.ZodOptional<z.ZodString>;
              timestamp: z.ZodUnion<[z.ZodDate, z.ZodString]>;
            },
            'strict',
            z.ZodTypeAny,
            {
              timestamp?: string | Date;
              paypalOrderId?: string;
              transactionId?: string;
              gateway?: 'paypal';
              captureId?: string;
            },
            {
              timestamp?: string | Date;
              paypalOrderId?: string;
              transactionId?: string;
              gateway?: 'paypal';
              captureId?: string;
            }
          >,
          z.ZodObject<
            {
              gateway: z.ZodLiteral<'upi'>;
              transactionId: z.ZodOptional<z.ZodString>;
              upiId: z.ZodOptional<z.ZodString>;
              qrCode: z.ZodOptional<z.ZodString>;
              expiryTime: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
              timestamp: z.ZodUnion<[z.ZodDate, z.ZodString]>;
            },
            'strict',
            z.ZodTypeAny,
            {
              timestamp?: string | Date;
              transactionId?: string;
              gateway?: 'upi';
              upiId?: string;
              qrCode?: string;
              expiryTime?: string | Date;
            },
            {
              timestamp?: string | Date;
              transactionId?: string;
              gateway?: 'upi';
              upiId?: string;
              qrCode?: string;
              expiryTime?: string | Date;
            }
          >,
          z.ZodObject<
            {
              gateway: z.ZodEnum<['wallet', 'cod']>;
              transactionId: z.ZodOptional<z.ZodString>;
              timestamp: z.ZodUnion<[z.ZodDate, z.ZodString]>;
            },
            'strict',
            z.ZodTypeAny,
            {
              timestamp?: string | Date;
              transactionId?: string;
              gateway?: 'wallet' | 'cod';
            },
            {
              timestamp?: string | Date;
              transactionId?: string;
              gateway?: 'wallet' | 'cod';
            }
          >,
        ]
      >
    >;
  },
  'strict',
  z.ZodTypeAny,
  {
    user?: string;
    currency?: string;
    amount?: number;
    metadata?: {
      razorpayOrderId?: string;
      stripeWebhookId?: string;
      paypalOrderId?: string;
    } & {
      [k: string]: string | number | boolean;
    };
    orderId?: string;
    paymentId?: string;
    gateway?: 'razorpay' | 'stripe' | 'paypal';
    paymentMethod?: 'upi' | 'card' | 'wallet' | 'netbanking' | 'cod' | 'bnpl' | 'razorpay' | 'stripe';
    purpose?: 'other' | 'wallet_topup' | 'order_payment' | 'event_booking' | 'financial_service';
    userDetails?: {
      name?: string;
      phone?: string;
      email?: string;
    };
    gatewayResponse?:
      | {
          timestamp?: string | Date;
          transactionId?: string;
          gateway?: 'razorpay';
          paymentUrl?: string;
          razorpayPaymentId?: string;
          razorpaySignature?: string;
        }
      | {
          timestamp?: string | Date;
          transactionId?: string;
          gateway?: 'stripe';
          paymentIntentId?: string;
          clientSecret?: string;
        }
      | {
          timestamp?: string | Date;
          paypalOrderId?: string;
          transactionId?: string;
          gateway?: 'paypal';
          captureId?: string;
        }
      | {
          timestamp?: string | Date;
          transactionId?: string;
          gateway?: 'upi';
          upiId?: string;
          qrCode?: string;
          expiryTime?: string | Date;
        }
      | {
          timestamp?: string | Date;
          transactionId?: string;
          gateway?: 'wallet' | 'cod';
        };
  },
  {
    user?: string;
    currency?: string;
    amount?: number;
    metadata?: {
      razorpayOrderId?: string;
      stripeWebhookId?: string;
      paypalOrderId?: string;
    } & {
      [k: string]: string | number | boolean;
    };
    orderId?: string;
    paymentId?: string;
    gateway?: 'razorpay' | 'stripe' | 'paypal';
    paymentMethod?: 'upi' | 'card' | 'wallet' | 'netbanking' | 'cod' | 'bnpl' | 'razorpay' | 'stripe';
    purpose?: 'other' | 'wallet_topup' | 'order_payment' | 'event_booking' | 'financial_service';
    userDetails?: {
      name?: string;
      phone?: string;
      email?: string;
    };
    gatewayResponse?:
      | {
          timestamp?: string | Date;
          transactionId?: string;
          gateway?: 'razorpay';
          paymentUrl?: string;
          razorpayPaymentId?: string;
          razorpaySignature?: string;
        }
      | {
          timestamp?: string | Date;
          transactionId?: string;
          gateway?: 'stripe';
          paymentIntentId?: string;
          clientSecret?: string;
        }
      | {
          timestamp?: string | Date;
          paypalOrderId?: string;
          transactionId?: string;
          gateway?: 'paypal';
          captureId?: string;
        }
      | {
          timestamp?: string | Date;
          transactionId?: string;
          gateway?: 'upi';
          upiId?: string;
          qrCode?: string;
          expiryTime?: string | Date;
        }
      | {
          timestamp?: string | Date;
          transactionId?: string;
          gateway?: 'wallet' | 'cod';
        };
  }
>;
export declare const UpdatePaymentStatusSchema: z.ZodObject<
  {
    status: z.ZodEnum<
      [
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
      ]
    >;
    failureReason: z.ZodOptional<z.ZodString>;
    walletCredited: z.ZodOptional<z.ZodBoolean>;
    refundedAmount: z.ZodOptional<z.ZodNumber>;
    metadata: z.ZodOptional<
      z.ZodObject<
        {
          razorpayOrderId: z.ZodOptional<z.ZodString>;
          stripeWebhookId: z.ZodOptional<z.ZodString>;
          paypalOrderId: z.ZodOptional<z.ZodString>;
        },
        'strip',
        z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>,
        z.objectOutputType<
          {
            razorpayOrderId: z.ZodOptional<z.ZodString>;
            stripeWebhookId: z.ZodOptional<z.ZodString>;
            paypalOrderId: z.ZodOptional<z.ZodString>;
          },
          z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>,
          'strip'
        >,
        z.objectInputType<
          {
            razorpayOrderId: z.ZodOptional<z.ZodString>;
            stripeWebhookId: z.ZodOptional<z.ZodString>;
            paypalOrderId: z.ZodOptional<z.ZodString>;
          },
          z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>,
          'strip'
        >
      >
    >;
  },
  'strict',
  z.ZodTypeAny,
  {
    status?:
      | 'pending'
      | 'expired'
      | 'refunded'
      | 'completed'
      | 'failed'
      | 'cancelled'
      | 'processing'
      | 'refund_initiated'
      | 'refund_processing'
      | 'refund_failed'
      | 'partially_refunded';
    metadata?: {
      razorpayOrderId?: string;
      stripeWebhookId?: string;
      paypalOrderId?: string;
    } & {
      [k: string]: string | number | boolean;
    };
    failureReason?: string;
    walletCredited?: boolean;
    refundedAmount?: number;
  },
  {
    status?:
      | 'pending'
      | 'expired'
      | 'refunded'
      | 'completed'
      | 'failed'
      | 'cancelled'
      | 'processing'
      | 'refund_initiated'
      | 'refund_processing'
      | 'refund_failed'
      | 'partially_refunded';
    metadata?: {
      razorpayOrderId?: string;
      stripeWebhookId?: string;
      paypalOrderId?: string;
    } & {
      [k: string]: string | number | boolean;
    };
    failureReason?: string;
    walletCredited?: boolean;
    refundedAmount?: number;
  }
>;
export declare const PaymentResponseSchema: z.ZodObject<
  {
    _id: z.ZodOptional<z.ZodString>;
    paymentId: z.ZodString;
    orderId: z.ZodString;
    user: z.ZodString;
    amount: z.ZodNumber;
    currency: z.ZodString;
    paymentMethod: z.ZodEnum<['upi', 'card', 'wallet', 'netbanking', 'cod', 'bnpl', 'razorpay', 'stripe']>;
    gateway: z.ZodOptional<z.ZodEnum<['stripe', 'razorpay', 'paypal']>>;
    purpose: z.ZodEnum<['wallet_topup', 'order_payment', 'event_booking', 'financial_service', 'other']>;
    status: z.ZodEnum<
      [
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
      ]
    >;
    userDetails: z.ZodObject<
      {
        name: z.ZodOptional<z.ZodString>;
        email: z.ZodOptional<z.ZodString>;
        phone: z.ZodOptional<z.ZodString>;
      },
      'strict',
      z.ZodTypeAny,
      {
        name?: string;
        phone?: string;
        email?: string;
      },
      {
        name?: string;
        phone?: string;
        email?: string;
      }
    >;
    metadata: z.ZodOptional<
      z.ZodObject<
        {
          razorpayOrderId: z.ZodOptional<z.ZodString>;
          stripeWebhookId: z.ZodOptional<z.ZodString>;
          paypalOrderId: z.ZodOptional<z.ZodString>;
        },
        'strip',
        z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>,
        z.objectOutputType<
          {
            razorpayOrderId: z.ZodOptional<z.ZodString>;
            stripeWebhookId: z.ZodOptional<z.ZodString>;
            paypalOrderId: z.ZodOptional<z.ZodString>;
          },
          z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>,
          'strip'
        >,
        z.objectInputType<
          {
            razorpayOrderId: z.ZodOptional<z.ZodString>;
            stripeWebhookId: z.ZodOptional<z.ZodString>;
            paypalOrderId: z.ZodOptional<z.ZodString>;
          },
          z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>,
          'strip'
        >
      >
    >;
    gatewayResponse: z.ZodOptional<
      z.ZodDiscriminatedUnion<
        'gateway',
        [
          z.ZodObject<
            {
              gateway: z.ZodLiteral<'razorpay'>;
              transactionId: z.ZodOptional<z.ZodString>;
              paymentUrl: z.ZodOptional<z.ZodString>;
              razorpayPaymentId: z.ZodOptional<z.ZodString>;
              razorpaySignature: z.ZodOptional<z.ZodString>;
              timestamp: z.ZodUnion<[z.ZodDate, z.ZodString]>;
            },
            'strict',
            z.ZodTypeAny,
            {
              timestamp?: string | Date;
              transactionId?: string;
              gateway?: 'razorpay';
              paymentUrl?: string;
              razorpayPaymentId?: string;
              razorpaySignature?: string;
            },
            {
              timestamp?: string | Date;
              transactionId?: string;
              gateway?: 'razorpay';
              paymentUrl?: string;
              razorpayPaymentId?: string;
              razorpaySignature?: string;
            }
          >,
          z.ZodObject<
            {
              gateway: z.ZodLiteral<'stripe'>;
              transactionId: z.ZodOptional<z.ZodString>;
              paymentIntentId: z.ZodOptional<z.ZodString>;
              clientSecret: z.ZodOptional<z.ZodString>;
              timestamp: z.ZodUnion<[z.ZodDate, z.ZodString]>;
            },
            'strict',
            z.ZodTypeAny,
            {
              timestamp?: string | Date;
              transactionId?: string;
              gateway?: 'stripe';
              paymentIntentId?: string;
              clientSecret?: string;
            },
            {
              timestamp?: string | Date;
              transactionId?: string;
              gateway?: 'stripe';
              paymentIntentId?: string;
              clientSecret?: string;
            }
          >,
          z.ZodObject<
            {
              gateway: z.ZodLiteral<'paypal'>;
              transactionId: z.ZodOptional<z.ZodString>;
              paypalOrderId: z.ZodOptional<z.ZodString>;
              captureId: z.ZodOptional<z.ZodString>;
              timestamp: z.ZodUnion<[z.ZodDate, z.ZodString]>;
            },
            'strict',
            z.ZodTypeAny,
            {
              timestamp?: string | Date;
              paypalOrderId?: string;
              transactionId?: string;
              gateway?: 'paypal';
              captureId?: string;
            },
            {
              timestamp?: string | Date;
              paypalOrderId?: string;
              transactionId?: string;
              gateway?: 'paypal';
              captureId?: string;
            }
          >,
          z.ZodObject<
            {
              gateway: z.ZodLiteral<'upi'>;
              transactionId: z.ZodOptional<z.ZodString>;
              upiId: z.ZodOptional<z.ZodString>;
              qrCode: z.ZodOptional<z.ZodString>;
              expiryTime: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
              timestamp: z.ZodUnion<[z.ZodDate, z.ZodString]>;
            },
            'strict',
            z.ZodTypeAny,
            {
              timestamp?: string | Date;
              transactionId?: string;
              gateway?: 'upi';
              upiId?: string;
              qrCode?: string;
              expiryTime?: string | Date;
            },
            {
              timestamp?: string | Date;
              transactionId?: string;
              gateway?: 'upi';
              upiId?: string;
              qrCode?: string;
              expiryTime?: string | Date;
            }
          >,
          z.ZodObject<
            {
              gateway: z.ZodEnum<['wallet', 'cod']>;
              transactionId: z.ZodOptional<z.ZodString>;
              timestamp: z.ZodUnion<[z.ZodDate, z.ZodString]>;
            },
            'strict',
            z.ZodTypeAny,
            {
              timestamp?: string | Date;
              transactionId?: string;
              gateway?: 'wallet' | 'cod';
            },
            {
              timestamp?: string | Date;
              transactionId?: string;
              gateway?: 'wallet' | 'cod';
            }
          >,
        ]
      >
    >;
    failureReason: z.ZodOptional<z.ZodString>;
    walletCredited: z.ZodOptional<z.ZodBoolean>;
    walletCreditedAt: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
    completedAt: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
    failedAt: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
    expiresAt: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
    refundedAmount: z.ZodOptional<z.ZodNumber>;
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
      | 'pending'
      | 'expired'
      | 'refunded'
      | 'completed'
      | 'failed'
      | 'cancelled'
      | 'processing'
      | 'refund_initiated'
      | 'refund_processing'
      | 'refund_failed'
      | 'partially_refunded';
    user?: string;
    currency?: string;
    amount?: number;
    expiresAt?: string | Date;
    metadata?: {
      razorpayOrderId?: string;
      stripeWebhookId?: string;
      paypalOrderId?: string;
    } & {
      [k: string]: string | number | boolean;
    };
    orderId?: string;
    paymentId?: string;
    failureReason?: string;
    gateway?: 'razorpay' | 'stripe' | 'paypal';
    paymentMethod?: 'upi' | 'card' | 'wallet' | 'netbanking' | 'cod' | 'bnpl' | 'razorpay' | 'stripe';
    purpose?: 'other' | 'wallet_topup' | 'order_payment' | 'event_booking' | 'financial_service';
    userDetails?: {
      name?: string;
      phone?: string;
      email?: string;
    };
    gatewayResponse?:
      | {
          timestamp?: string | Date;
          transactionId?: string;
          gateway?: 'razorpay';
          paymentUrl?: string;
          razorpayPaymentId?: string;
          razorpaySignature?: string;
        }
      | {
          timestamp?: string | Date;
          transactionId?: string;
          gateway?: 'stripe';
          paymentIntentId?: string;
          clientSecret?: string;
        }
      | {
          timestamp?: string | Date;
          paypalOrderId?: string;
          transactionId?: string;
          gateway?: 'paypal';
          captureId?: string;
        }
      | {
          timestamp?: string | Date;
          transactionId?: string;
          gateway?: 'upi';
          upiId?: string;
          qrCode?: string;
          expiryTime?: string | Date;
        }
      | {
          timestamp?: string | Date;
          transactionId?: string;
          gateway?: 'wallet' | 'cod';
        };
    walletCredited?: boolean;
    refundedAmount?: number;
    walletCreditedAt?: string | Date;
    completedAt?: string | Date;
    failedAt?: string | Date;
  },
  {
    _id?: string;
    createdAt?: string | Date;
    updatedAt?: string | Date;
    status?:
      | 'pending'
      | 'expired'
      | 'refunded'
      | 'completed'
      | 'failed'
      | 'cancelled'
      | 'processing'
      | 'refund_initiated'
      | 'refund_processing'
      | 'refund_failed'
      | 'partially_refunded';
    user?: string;
    currency?: string;
    amount?: number;
    expiresAt?: string | Date;
    metadata?: {
      razorpayOrderId?: string;
      stripeWebhookId?: string;
      paypalOrderId?: string;
    } & {
      [k: string]: string | number | boolean;
    };
    orderId?: string;
    paymentId?: string;
    failureReason?: string;
    gateway?: 'razorpay' | 'stripe' | 'paypal';
    paymentMethod?: 'upi' | 'card' | 'wallet' | 'netbanking' | 'cod' | 'bnpl' | 'razorpay' | 'stripe';
    purpose?: 'other' | 'wallet_topup' | 'order_payment' | 'event_booking' | 'financial_service';
    userDetails?: {
      name?: string;
      phone?: string;
      email?: string;
    };
    gatewayResponse?:
      | {
          timestamp?: string | Date;
          transactionId?: string;
          gateway?: 'razorpay';
          paymentUrl?: string;
          razorpayPaymentId?: string;
          razorpaySignature?: string;
        }
      | {
          timestamp?: string | Date;
          transactionId?: string;
          gateway?: 'stripe';
          paymentIntentId?: string;
          clientSecret?: string;
        }
      | {
          timestamp?: string | Date;
          paypalOrderId?: string;
          transactionId?: string;
          gateway?: 'paypal';
          captureId?: string;
        }
      | {
          timestamp?: string | Date;
          transactionId?: string;
          gateway?: 'upi';
          upiId?: string;
          qrCode?: string;
          expiryTime?: string | Date;
        }
      | {
          timestamp?: string | Date;
          transactionId?: string;
          gateway?: 'wallet' | 'cod';
        };
    walletCredited?: boolean;
    refundedAmount?: number;
    walletCreditedAt?: string | Date;
    completedAt?: string | Date;
    failedAt?: string | Date;
  }
>;
export declare const PaymentListResponseSchema: z.ZodArray<
  z.ZodObject<
    {
      _id: z.ZodOptional<z.ZodString>;
      paymentId: z.ZodString;
      orderId: z.ZodString;
      user: z.ZodString;
      amount: z.ZodNumber;
      currency: z.ZodString;
      paymentMethod: z.ZodEnum<['upi', 'card', 'wallet', 'netbanking', 'cod', 'bnpl', 'razorpay', 'stripe']>;
      gateway: z.ZodOptional<z.ZodEnum<['stripe', 'razorpay', 'paypal']>>;
      purpose: z.ZodEnum<['wallet_topup', 'order_payment', 'event_booking', 'financial_service', 'other']>;
      status: z.ZodEnum<
        [
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
        ]
      >;
      userDetails: z.ZodObject<
        {
          name: z.ZodOptional<z.ZodString>;
          email: z.ZodOptional<z.ZodString>;
          phone: z.ZodOptional<z.ZodString>;
        },
        'strict',
        z.ZodTypeAny,
        {
          name?: string;
          phone?: string;
          email?: string;
        },
        {
          name?: string;
          phone?: string;
          email?: string;
        }
      >;
      metadata: z.ZodOptional<
        z.ZodObject<
          {
            razorpayOrderId: z.ZodOptional<z.ZodString>;
            stripeWebhookId: z.ZodOptional<z.ZodString>;
            paypalOrderId: z.ZodOptional<z.ZodString>;
          },
          'strip',
          z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>,
          z.objectOutputType<
            {
              razorpayOrderId: z.ZodOptional<z.ZodString>;
              stripeWebhookId: z.ZodOptional<z.ZodString>;
              paypalOrderId: z.ZodOptional<z.ZodString>;
            },
            z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>,
            'strip'
          >,
          z.objectInputType<
            {
              razorpayOrderId: z.ZodOptional<z.ZodString>;
              stripeWebhookId: z.ZodOptional<z.ZodString>;
              paypalOrderId: z.ZodOptional<z.ZodString>;
            },
            z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>,
            'strip'
          >
        >
      >;
      gatewayResponse: z.ZodOptional<
        z.ZodDiscriminatedUnion<
          'gateway',
          [
            z.ZodObject<
              {
                gateway: z.ZodLiteral<'razorpay'>;
                transactionId: z.ZodOptional<z.ZodString>;
                paymentUrl: z.ZodOptional<z.ZodString>;
                razorpayPaymentId: z.ZodOptional<z.ZodString>;
                razorpaySignature: z.ZodOptional<z.ZodString>;
                timestamp: z.ZodUnion<[z.ZodDate, z.ZodString]>;
              },
              'strict',
              z.ZodTypeAny,
              {
                timestamp?: string | Date;
                transactionId?: string;
                gateway?: 'razorpay';
                paymentUrl?: string;
                razorpayPaymentId?: string;
                razorpaySignature?: string;
              },
              {
                timestamp?: string | Date;
                transactionId?: string;
                gateway?: 'razorpay';
                paymentUrl?: string;
                razorpayPaymentId?: string;
                razorpaySignature?: string;
              }
            >,
            z.ZodObject<
              {
                gateway: z.ZodLiteral<'stripe'>;
                transactionId: z.ZodOptional<z.ZodString>;
                paymentIntentId: z.ZodOptional<z.ZodString>;
                clientSecret: z.ZodOptional<z.ZodString>;
                timestamp: z.ZodUnion<[z.ZodDate, z.ZodString]>;
              },
              'strict',
              z.ZodTypeAny,
              {
                timestamp?: string | Date;
                transactionId?: string;
                gateway?: 'stripe';
                paymentIntentId?: string;
                clientSecret?: string;
              },
              {
                timestamp?: string | Date;
                transactionId?: string;
                gateway?: 'stripe';
                paymentIntentId?: string;
                clientSecret?: string;
              }
            >,
            z.ZodObject<
              {
                gateway: z.ZodLiteral<'paypal'>;
                transactionId: z.ZodOptional<z.ZodString>;
                paypalOrderId: z.ZodOptional<z.ZodString>;
                captureId: z.ZodOptional<z.ZodString>;
                timestamp: z.ZodUnion<[z.ZodDate, z.ZodString]>;
              },
              'strict',
              z.ZodTypeAny,
              {
                timestamp?: string | Date;
                paypalOrderId?: string;
                transactionId?: string;
                gateway?: 'paypal';
                captureId?: string;
              },
              {
                timestamp?: string | Date;
                paypalOrderId?: string;
                transactionId?: string;
                gateway?: 'paypal';
                captureId?: string;
              }
            >,
            z.ZodObject<
              {
                gateway: z.ZodLiteral<'upi'>;
                transactionId: z.ZodOptional<z.ZodString>;
                upiId: z.ZodOptional<z.ZodString>;
                qrCode: z.ZodOptional<z.ZodString>;
                expiryTime: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
                timestamp: z.ZodUnion<[z.ZodDate, z.ZodString]>;
              },
              'strict',
              z.ZodTypeAny,
              {
                timestamp?: string | Date;
                transactionId?: string;
                gateway?: 'upi';
                upiId?: string;
                qrCode?: string;
                expiryTime?: string | Date;
              },
              {
                timestamp?: string | Date;
                transactionId?: string;
                gateway?: 'upi';
                upiId?: string;
                qrCode?: string;
                expiryTime?: string | Date;
              }
            >,
            z.ZodObject<
              {
                gateway: z.ZodEnum<['wallet', 'cod']>;
                transactionId: z.ZodOptional<z.ZodString>;
                timestamp: z.ZodUnion<[z.ZodDate, z.ZodString]>;
              },
              'strict',
              z.ZodTypeAny,
              {
                timestamp?: string | Date;
                transactionId?: string;
                gateway?: 'wallet' | 'cod';
              },
              {
                timestamp?: string | Date;
                transactionId?: string;
                gateway?: 'wallet' | 'cod';
              }
            >,
          ]
        >
      >;
      failureReason: z.ZodOptional<z.ZodString>;
      walletCredited: z.ZodOptional<z.ZodBoolean>;
      walletCreditedAt: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
      completedAt: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
      failedAt: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
      expiresAt: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
      refundedAmount: z.ZodOptional<z.ZodNumber>;
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
        | 'pending'
        | 'expired'
        | 'refunded'
        | 'completed'
        | 'failed'
        | 'cancelled'
        | 'processing'
        | 'refund_initiated'
        | 'refund_processing'
        | 'refund_failed'
        | 'partially_refunded';
      user?: string;
      currency?: string;
      amount?: number;
      expiresAt?: string | Date;
      metadata?: {
        razorpayOrderId?: string;
        stripeWebhookId?: string;
        paypalOrderId?: string;
      } & {
        [k: string]: string | number | boolean;
      };
      orderId?: string;
      paymentId?: string;
      failureReason?: string;
      gateway?: 'razorpay' | 'stripe' | 'paypal';
      paymentMethod?: 'upi' | 'card' | 'wallet' | 'netbanking' | 'cod' | 'bnpl' | 'razorpay' | 'stripe';
      purpose?: 'other' | 'wallet_topup' | 'order_payment' | 'event_booking' | 'financial_service';
      userDetails?: {
        name?: string;
        phone?: string;
        email?: string;
      };
      gatewayResponse?:
        | {
            timestamp?: string | Date;
            transactionId?: string;
            gateway?: 'razorpay';
            paymentUrl?: string;
            razorpayPaymentId?: string;
            razorpaySignature?: string;
          }
        | {
            timestamp?: string | Date;
            transactionId?: string;
            gateway?: 'stripe';
            paymentIntentId?: string;
            clientSecret?: string;
          }
        | {
            timestamp?: string | Date;
            paypalOrderId?: string;
            transactionId?: string;
            gateway?: 'paypal';
            captureId?: string;
          }
        | {
            timestamp?: string | Date;
            transactionId?: string;
            gateway?: 'upi';
            upiId?: string;
            qrCode?: string;
            expiryTime?: string | Date;
          }
        | {
            timestamp?: string | Date;
            transactionId?: string;
            gateway?: 'wallet' | 'cod';
          };
      walletCredited?: boolean;
      refundedAmount?: number;
      walletCreditedAt?: string | Date;
      completedAt?: string | Date;
      failedAt?: string | Date;
    },
    {
      _id?: string;
      createdAt?: string | Date;
      updatedAt?: string | Date;
      status?:
        | 'pending'
        | 'expired'
        | 'refunded'
        | 'completed'
        | 'failed'
        | 'cancelled'
        | 'processing'
        | 'refund_initiated'
        | 'refund_processing'
        | 'refund_failed'
        | 'partially_refunded';
      user?: string;
      currency?: string;
      amount?: number;
      expiresAt?: string | Date;
      metadata?: {
        razorpayOrderId?: string;
        stripeWebhookId?: string;
        paypalOrderId?: string;
      } & {
        [k: string]: string | number | boolean;
      };
      orderId?: string;
      paymentId?: string;
      failureReason?: string;
      gateway?: 'razorpay' | 'stripe' | 'paypal';
      paymentMethod?: 'upi' | 'card' | 'wallet' | 'netbanking' | 'cod' | 'bnpl' | 'razorpay' | 'stripe';
      purpose?: 'other' | 'wallet_topup' | 'order_payment' | 'event_booking' | 'financial_service';
      userDetails?: {
        name?: string;
        phone?: string;
        email?: string;
      };
      gatewayResponse?:
        | {
            timestamp?: string | Date;
            transactionId?: string;
            gateway?: 'razorpay';
            paymentUrl?: string;
            razorpayPaymentId?: string;
            razorpaySignature?: string;
          }
        | {
            timestamp?: string | Date;
            transactionId?: string;
            gateway?: 'stripe';
            paymentIntentId?: string;
            clientSecret?: string;
          }
        | {
            timestamp?: string | Date;
            paypalOrderId?: string;
            transactionId?: string;
            gateway?: 'paypal';
            captureId?: string;
          }
        | {
            timestamp?: string | Date;
            transactionId?: string;
            gateway?: 'upi';
            upiId?: string;
            qrCode?: string;
            expiryTime?: string | Date;
          }
        | {
            timestamp?: string | Date;
            transactionId?: string;
            gateway?: 'wallet' | 'cod';
          };
      walletCredited?: boolean;
      refundedAmount?: number;
      walletCreditedAt?: string | Date;
      completedAt?: string | Date;
      failedAt?: string | Date;
    }
  >,
  'many'
>;
export type CreatePaymentRequest = z.infer<typeof CreatePaymentSchema>;
export type UpdatePaymentStatusRequest = z.infer<typeof UpdatePaymentStatusSchema>;
export type PaymentResponse = z.infer<typeof PaymentResponseSchema>;
export type PaymentListResponse = z.infer<typeof PaymentListResponseSchema>;
export type PaymentStatus = z.infer<typeof PAYMENT_STATUS>;
export type PaymentMethod = z.infer<typeof PAYMENT_METHOD>;
export type PaymentGateway = z.infer<typeof PAYMENT_GATEWAY>;
export type PaymentPurpose = z.infer<typeof PAYMENT_PURPOSE>;
export type PaymentMetadata = z.infer<typeof PaymentMetadataSchema>;
//# sourceMappingURL=payment.schema.d.ts.map
