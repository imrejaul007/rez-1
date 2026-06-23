// @ts-nocheck
/**
 * Runtime guard tests — exercise the no-zod consumer-side validators.
 *
 * These guards are the ONLY type-safety layer on the consumer app, so
 * every permutation of malformed input must be rejected.
 */

import {
  isOrderResponse,
  isPaymentResponse,
  isWalletResponse,
  isUserResponse,
  isProductResponse,
  asOrderStatus,
  asPaymentStatus,
  asCoinType,
  isArrayOf,
} from '../guards/index';

const VALID_OID = '507f1f77bcf86cd799439011';

describe('isOrderResponse', () => {
  const valid = {
    orderNumber: 'ORD-001',
    user: VALID_OID,
    status: 'placed',
    items: [{ product: VALID_OID, quantity: 1 }],
    totals: { total: 100 },
  };

  test('accepts minimal valid order', () => {
    expect(isOrderResponse(valid)).toBe(true);
  });

  test('rejects null / undefined / primitives', () => {
    expect(isOrderResponse(null)).toBe(false);
    expect(isOrderResponse(undefined)).toBe(false);
    expect(isOrderResponse('string')).toBe(false);
    expect(isOrderResponse(42)).toBe(false);
    expect(isOrderResponse([])).toBe(false);
  });

  test('rejects missing orderNumber', () => {
    const { orderNumber, ...rest } = valid;
    expect(isOrderResponse(rest)).toBe(false);
  });

  test('rejects empty items array', () => {
    expect(isOrderResponse({ ...valid, items: [] })).toBe(false);
  });

  test('rejects unknown status', () => {
    expect(isOrderResponse({ ...valid, status: 'not-a-status' })).toBe(false);
  });

  test('rejects non-ObjectId user', () => {
    expect(isOrderResponse({ ...valid, user: 'not-an-oid' })).toBe(false);
  });

  test('rejects non-finite total', () => {
    expect(isOrderResponse({ ...valid, totals: { total: NaN } })).toBe(false);
    expect(isOrderResponse({ ...valid, totals: { total: Infinity } })).toBe(false);
  });
});

describe('isPaymentResponse', () => {
  const valid = {
    paymentId: 'pay_MkXyZ',
    orderId: 'ord_abc',
    user: VALID_OID,
    status: 'completed',
    amount: 250,
  };

  test('accepts minimal valid payment', () => {
    expect(isPaymentResponse(valid)).toBe(true);
  });

  test('rejects negative amount', () => {
    expect(isPaymentResponse({ ...valid, amount: -1 })).toBe(false);
  });

  test('rejects unknown status', () => {
    expect(isPaymentResponse({ ...valid, status: 'mystery' })).toBe(false);
  });

  test('rejects missing paymentId', () => {
    const { paymentId, ...rest } = valid;
    expect(isPaymentResponse(rest)).toBe(false);
  });
});

describe('isWalletResponse', () => {
  const valid = {
    user: VALID_OID,
    balance: { total: 500, available: 450, pending: 50, cashback: 0 },
    coins: [],
  };

  test('accepts minimal valid wallet', () => {
    expect(isWalletResponse(valid)).toBe(true);
  });

  test('rejects missing balance sub-fields', () => {
    expect(isWalletResponse({ ...valid, balance: { total: 500 } })).toBe(false);
  });

  test('rejects non-array coins', () => {
    expect(isWalletResponse({ ...valid, coins: {} })).toBe(false);
  });
});

describe('isUserResponse', () => {
  const valid = {
    phoneNumber: '+919876543210',
    profile: {},
    auth: {},
    referral: {},
    role: 'user',
  };

  test('accepts minimal valid user', () => {
    expect(isUserResponse(valid)).toBe(true);
  });

  test('rejects missing phoneNumber', () => {
    const { phoneNumber, ...rest } = valid;
    expect(isUserResponse(rest)).toBe(false);
  });
});

describe('isProductResponse', () => {
  const valid = {
    name: 'Latte',
    sku: 'LAT-001',
    pricing: { selling: 150, original: 200 },
  };

  test('accepts minimal valid product', () => {
    expect(isProductResponse(valid)).toBe(true);
  });

  test('rejects selling > original (MRP violation)', () => {
    expect(isProductResponse({ ...valid, pricing: { selling: 300, original: 200 } })).toBe(false);
  });

  test('rejects zero or negative selling', () => {
    expect(isProductResponse({ ...valid, pricing: { selling: 0, original: 200 } })).toBe(false);
    expect(isProductResponse({ ...valid, pricing: { selling: -10, original: 200 } })).toBe(false);
  });
});

describe('asOrderStatus / asPaymentStatus / asCoinType', () => {
  test('returns the canonical enum value on hit', () => {
    expect(asOrderStatus('placed')).toBe('placed');
    expect(asPaymentStatus('completed')).toBe('completed');
    expect(asCoinType('rez')).toBe('rez');
  });

  test('returns null on miss rather than throwing', () => {
    expect(asOrderStatus('bogus')).toBeNull();
    expect(asPaymentStatus(123)).toBeNull();
    expect(asCoinType(null)).toBeNull();
  });
});

describe('isArrayOf', () => {
  test('narrows an array of valid items', () => {
    const arr: unknown = [
      { orderNumber: 'A', user: VALID_OID, status: 'placed', items: [{}], totals: { total: 1 } },
      { orderNumber: 'B', user: VALID_OID, status: 'delivered', items: [{}], totals: { total: 2 } },
    ];
    expect(isArrayOf(arr, isOrderResponse)).toBe(true);
  });

  test('rejects if any item fails', () => {
    const arr: unknown = [
      { orderNumber: 'A', user: VALID_OID, status: 'placed', items: [{}], totals: { total: 1 } },
      { wrong: true },
    ];
    expect(isArrayOf(arr, isOrderResponse)).toBe(false);
  });

  test('rejects non-arrays', () => {
    expect(isArrayOf({}, isOrderResponse)).toBe(false);
    expect(isArrayOf(null, isOrderResponse)).toBe(false);
  });
});
