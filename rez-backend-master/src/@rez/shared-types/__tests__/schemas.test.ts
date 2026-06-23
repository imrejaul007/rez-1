// @ts-nocheck
/**
 * Zod schema tests — pin the v2 strictness contract.
 *
 * Every breaking change in these tests must also appear in MIGRATION.md.
 */

import {
  CreateOrderSchema,
  UpdateOrderStatusSchema,
  CreatePaymentSchema,
  PaymentGatewayResponseSchema,
  CreateProductSchema,
  ProductPricingSchema,
  WalletDebitSchema,
  WalletCreditSchema,
} from '../index';

const VALID_OID = '507f1f77bcf86cd799439011';

// ─── CreateOrderSchema ────────────────────────────────────────────────────────

describe('CreateOrderSchema', () => {
  const valid = {
    user: VALID_OID,
    store: VALID_OID,
    fulfillmentType: 'delivery',
    items: [
      {
        product: VALID_OID,
        store: VALID_OID,
        name: 'Espresso',
        image: 'https://cdn.rez.money/esp.jpg',
        itemType: 'product',
        quantity: 2,
        price: 150,
        subtotal: 300,
      },
    ],
    totals: {
      subtotal: 300,
      tax: 15,
      delivery: 40,
      discount: 0,
      cashback: 10,
      total: 355,
      paidAmount: 355,
      platformFee: 45,
      merchantPayout: 255,
    },
    payment: { method: 'upi', status: 'pending' },
    delivery: {
      method: 'standard',
      status: 'pending',
      address: {
        name: 'A Kumar',
        phone: '+919876543210',
        addressLine1: '42 MG Road',
        city: 'Bangalore',
        state: 'KA',
        pincode: '560001',
        country: 'IN',
      },
      deliveryFee: 40,
    },
  };

  test('accepts a fully-formed order', () => {
    const r = CreateOrderSchema.safeParse(valid);
    expect(r.success).toBe(true);
  });

  test('rejects an unknown top-level field (strict)', () => {
    const r = CreateOrderSchema.safeParse({ ...valid, bogus: 'xxx' });
    expect(r.success).toBe(false);
  });

  test('rejects empty items[]', () => {
    const r = CreateOrderSchema.safeParse({ ...valid, items: [] });
    expect(r.success).toBe(false);
  });

  test('rejects non-ObjectId user', () => {
    const r = CreateOrderSchema.safeParse({ ...valid, user: 'not-an-oid' });
    expect(r.success).toBe(false);
  });

  test('rejects unknown fulfillmentType', () => {
    const r = CreateOrderSchema.safeParse({ ...valid, fulfillmentType: 'airdrop' });
    expect(r.success).toBe(false);
  });
});

// ─── UpdateOrderStatusSchema ──────────────────────────────────────────────────

describe('UpdateOrderStatusSchema', () => {
  test('accepts canonical status + optional reason', () => {
    const r = UpdateOrderStatusSchema.safeParse({ status: 'cancelled', reason: 'oos' });
    expect(r.success).toBe(true);
  });

  test('rejects unknown status', () => {
    const r = UpdateOrderStatusSchema.safeParse({ status: 'magic' });
    expect(r.success).toBe(false);
  });
});

// ─── CreatePaymentSchema ──────────────────────────────────────────────────────

describe('CreatePaymentSchema', () => {
  const valid = {
    paymentId: 'pay_MkXyZ',
    orderId: 'ord_abc',
    user: VALID_OID,
    amount: 500,
    currency: 'INR',
    paymentMethod: 'upi',
    gateway: 'razorpay',
    userDetails: { phone: '+919876543210' },
  };

  test('happy path', () => {
    expect(CreatePaymentSchema.safeParse(valid).success).toBe(true);
  });

  test('rejects zero / negative amount', () => {
    expect(CreatePaymentSchema.safeParse({ ...valid, amount: 0 }).success).toBe(false);
    expect(CreatePaymentSchema.safeParse({ ...valid, amount: -10 }).success).toBe(false);
  });

  test('rejects non-ObjectId user', () => {
    expect(CreatePaymentSchema.safeParse({ ...valid, user: 'u123' }).success).toBe(false);
  });

  test('rejects unknown gateway', () => {
    expect(CreatePaymentSchema.safeParse({ ...valid, gateway: 'paytm' }).success).toBe(false);
  });
});

// ─── PaymentGatewayResponseSchema (discriminated union) ───────────────────────

describe('PaymentGatewayResponseSchema', () => {
  test('razorpay variant accepts razorpayPaymentId', () => {
    const r = PaymentGatewayResponseSchema.safeParse({
      gateway: 'razorpay',
      razorpayPaymentId: 'pay_123',
      timestamp: new Date(),
    });
    expect(r.success).toBe(true);
  });

  test('upi variant accepts upiId, rejects razorpayPaymentId', () => {
    const r = PaymentGatewayResponseSchema.safeParse({
      gateway: 'upi',
      upiId: 'user@okhdfc',
      timestamp: new Date(),
      razorpayPaymentId: 'pay_123', // not allowed on upi variant
    });
    expect(r.success).toBe(false);
  });

  test('missing gateway discriminant fails', () => {
    const r = PaymentGatewayResponseSchema.safeParse({
      transactionId: 'tx',
      timestamp: new Date(),
    });
    expect(r.success).toBe(false);
  });
});

// ─── CreateProductSchema + ProductPricingSchema ───────────────────────────────

describe('ProductPricingSchema (selling ≤ original rule)', () => {
  test('accepts selling ≤ original', () => {
    const r = ProductPricingSchema.safeParse({ original: 200, selling: 150, currency: 'INR' });
    expect(r.success).toBe(true);
  });

  test('accepts selling === original', () => {
    const r = ProductPricingSchema.safeParse({ original: 200, selling: 200, currency: 'INR' });
    expect(r.success).toBe(true);
  });

  test('rejects selling > original', () => {
    const r = ProductPricingSchema.safeParse({ original: 100, selling: 200, currency: 'INR' });
    expect(r.success).toBe(false);
  });

  test('rejects zero / negative prices', () => {
    expect(ProductPricingSchema.safeParse({ original: 0, selling: 100, currency: 'INR' }).success).toBe(false);
    expect(ProductPricingSchema.safeParse({ original: -5, selling: 100, currency: 'INR' }).success).toBe(false);
  });
});

describe('CreateProductSchema', () => {
  const valid = {
    name: 'Masala Chai',
    productType: 'product',
    category: VALID_OID,
    store: VALID_OID,
    sku: 'MC-01',
    pricing: { original: 100, selling: 80, currency: 'INR' },
    inventory: { stock: 500, isAvailable: true, unlimited: false },
  };

  test('happy path', () => {
    expect(CreateProductSchema.safeParse(valid).success).toBe(true);
  });

  test('rejects unknown extra field', () => {
    const r = CreateProductSchema.safeParse({ ...valid, foo: 'bar' });
    expect(r.success).toBe(false);
  });
});

// ─── Wallet schemas — idempotencyKey is REQUIRED ──────────────────────────────

describe('WalletDebitSchema (idempotencyKey required)', () => {
  const base = {
    user: VALID_OID,
    amount: 50,
    source: 'order',
    description: 'Order checkout debit',
  };

  test('rejects when idempotencyKey is missing', () => {
    expect(WalletDebitSchema.safeParse(base).success).toBe(false);
  });

  test('rejects when idempotencyKey is too short', () => {
    expect(WalletDebitSchema.safeParse({ ...base, idempotencyKey: 'abc' }).success).toBe(false);
  });

  test('accepts an 8+ char idempotencyKey', () => {
    expect(WalletDebitSchema.safeParse({ ...base, idempotencyKey: 'dedup-key-12345' }).success).toBe(true);
  });
});

describe('WalletCreditSchema (idempotencyKey required)', () => {
  const base = {
    user: VALID_OID,
    coinType: 'cashback',
    amount: 20,
    source: 'order',
    description: 'Cashback credit',
  };

  test('rejects when idempotencyKey is missing', () => {
    expect(WalletCreditSchema.safeParse(base).success).toBe(false);
  });

  test('accepts with valid idempotencyKey', () => {
    expect(WalletCreditSchema.safeParse({ ...base, idempotencyKey: 'cashback-ord-xyz' }).success).toBe(true);
  });

  test('rejects unknown coinType', () => {
    expect(
      WalletCreditSchema.safeParse({
        ...base,
        coinType: 'doge',
        idempotencyKey: 'dedup-key-12345',
      }).success,
    ).toBe(false);
  });
});
