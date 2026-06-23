// @ts-nocheck
/**
 * Branded ID constructor tests — exercise happy paths and the exact
 * validation errors at the boundary.
 */

import {
  isObjectIdLike,
  toOrderId,
  toUserId,
  toMerchantId,
  toStoreId,
  toProductId,
  toPaymentId,
  toWalletId,
} from '../branded/ids';

const VALID = '507f1f77bcf86cd799439011';
const VALID_2 = 'abcdef012345678901234567';

describe('isObjectIdLike', () => {
  test('24-char hex strings are accepted', () => {
    expect(isObjectIdLike(VALID)).toBe(true);
    expect(isObjectIdLike(VALID_2)).toBe(true);
  });

  test('non-hex or wrong length are rejected', () => {
    expect(isObjectIdLike('')).toBe(false);
    expect(isObjectIdLike('tooshort')).toBe(false);
    expect(isObjectIdLike('507f1f77bcf86cd79943901')).toBe(false); // 23 chars
    expect(isObjectIdLike('507f1f77bcf86cd7994390111')).toBe(false); // 25 chars
    expect(isObjectIdLike('ZZZf1f77bcf86cd799439011')).toBe(false); // non-hex
    expect(isObjectIdLike(123)).toBe(false);
    expect(isObjectIdLike(null)).toBe(false);
    expect(isObjectIdLike(undefined)).toBe(false);
  });
});

describe('ObjectId-shaped constructors', () => {
  test.each([
    ['OrderId', toOrderId],
    ['UserId', toUserId],
    ['MerchantId', toMerchantId],
    ['StoreId', toStoreId],
    ['ProductId', toProductId],
    ['WalletId', toWalletId],
  ])('%s accepts valid ObjectId', (_, ctor) => {
    expect(() => (ctor as (s: unknown) => string)(VALID)).not.toThrow();
  });

  test.each([
    ['OrderId', toOrderId],
    ['UserId', toUserId],
    ['MerchantId', toMerchantId],
    ['StoreId', toStoreId],
    ['ProductId', toProductId],
    ['WalletId', toWalletId],
  ])('%s throws with entity name in message on malformed input', (label, ctor) => {
    expect(() => (ctor as (s: unknown) => string)('bad')).toThrow(new RegExp(label));
  });
});

describe('toPaymentId — accepts opaque gateway identifiers', () => {
  test('accepts non-hex strings (payment IDs are gateway-opaque)', () => {
    expect(() => toPaymentId('pay_MkXyZ123')).not.toThrow();
    expect(() => toPaymentId('pi_1HxYzKLt2eZvKYlo0a1b2c3d')).not.toThrow();
  });

  test('rejects empty, whitespace-only, and non-strings', () => {
    expect(() => toPaymentId('')).toThrow();
    expect(() => toPaymentId('   ')).toThrow();
    expect(() => toPaymentId(123)).toThrow();
    expect(() => toPaymentId(null)).toThrow();
  });
});

describe('Compile-time brand safety (documentation test)', () => {
  test('branded types round-trip as strings at runtime', () => {
    const id = toOrderId(VALID);
    expect(typeof id).toBe('string');
    expect(String(id)).toBe(VALID);
    expect(JSON.stringify({ id })).toBe(`{"id":"${VALID}"}`);
  });
});
