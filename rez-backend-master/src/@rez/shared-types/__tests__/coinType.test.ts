// @ts-nocheck
/**
 * CoinType normalization + canonical-check tests.
 *
 * Covers the legacy → canonical mapping surface used by the wallet and
 * cashback subscribers. Any new legacy alias added to COIN_TYPE_ALIASES
 * in src/enums/coinType.ts should grow a row here so we don't silently
 * regress the mapping table.
 */

import {
  CoinType,
  COIN_TYPE_VALUES,
  isCanonicalCoinType,
  normalizeCoinType,
  normalizeCoinTypeAs,
} from '../enums/index';
import { getValidNextWalletDebitCoin, COIN_PRIORITY_ORDER } from '../entities/wallet';

describe('CoinType enum + COIN_TYPE_VALUES', () => {
  test('exactly 6 canonical types', () => {
    expect(COIN_TYPE_VALUES.length).toBe(6);
    expect(new Set(COIN_TYPE_VALUES).size).toBe(6);
  });

  test('values are the canonical string literals', () => {
    expect(new Set(COIN_TYPE_VALUES)).toEqual(new Set(['rez', 'prive', 'branded', 'promo', 'cashback', 'referral']));
  });
});

describe('isCanonicalCoinType', () => {
  test.each(['rez', 'prive', 'branded', 'promo', 'cashback', 'referral'])('%s is canonical', (value) => {
    expect(isCanonicalCoinType(value)).toBe(true);
  });

  test.each(['nuqta', 'karma_points', 'REZ', 'rez_coins', '', 'doge'])('%s is NOT canonical', (value) => {
    expect(isCanonicalCoinType(value)).toBe(false);
  });
});

describe('normalizeCoinType — legacy alias mapping', () => {
  test('canonical values round-trip unchanged', () => {
    expect(normalizeCoinType('rez')).toBe(CoinType.REZ);
    expect(normalizeCoinType('promo')).toBe(CoinType.PROMO);
    expect(normalizeCoinType('branded')).toBe(CoinType.BRANDED);
    expect(normalizeCoinType('cashback')).toBe(CoinType.CASHBACK);
    expect(normalizeCoinType('referral')).toBe(CoinType.REFERRAL);
    expect(normalizeCoinType('prive')).toBe(CoinType.PRIVE);
  });

  test('legacy ruFlo naming maps to REZ', () => {
    expect(normalizeCoinType('nuqta')).toBe(CoinType.REZ);
    expect(normalizeCoinType('wasil_coins')).toBe(CoinType.REZ);
    expect(normalizeCoinType('wasil_bonus')).toBe(CoinType.REZ);
    expect(normalizeCoinType('earning')).toBe(CoinType.REZ);
    expect(normalizeCoinType('earnings')).toBe(CoinType.REZ);
  });

  test('karma variants map to REZ', () => {
    expect(normalizeCoinType('karma_points')).toBe(CoinType.REZ);
    expect(normalizeCoinType('karma_coins')).toBe(CoinType.REZ);
  });

  test('consumer display names map to their canonical', () => {
    expect(normalizeCoinType('rez_coins')).toBe(CoinType.REZ);
    expect(normalizeCoinType('branded_coin')).toBe(CoinType.BRANDED);
    expect(normalizeCoinType('branded_coins')).toBe(CoinType.BRANDED);
    expect(normalizeCoinType('prive_coins')).toBe(CoinType.PRIVE);
  });

  test('loyalty and reward variants', () => {
    expect(normalizeCoinType('loyalty')).toBe(CoinType.REZ);
    expect(normalizeCoinType('reward')).toBe(CoinType.PROMO);
    expect(normalizeCoinType('bonus')).toBe(CoinType.PROMO);
    expect(normalizeCoinType('promotional')).toBe(CoinType.PROMO);
    expect(normalizeCoinType('promotional_coins')).toBe(CoinType.PROMO);
  });

  test('is case-insensitive with whitespace trimming', () => {
    expect(normalizeCoinType('  NUQTA  ')).toBe(CoinType.REZ);
    expect(normalizeCoinType('Promo')).toBe(CoinType.PROMO);
  });

  test('null / undefined / empty string returns fallback (default REZ)', () => {
    expect(normalizeCoinType(null)).toBe(CoinType.REZ);
    expect(normalizeCoinType(undefined)).toBe(CoinType.REZ);
    expect(normalizeCoinType('')).toBe(CoinType.REZ);
  });

  test('unknown value returns supplied fallback', () => {
    expect(normalizeCoinType('doge', CoinType.PROMO)).toBe(CoinType.PROMO);
    expect(normalizeCoinType('unknown', CoinType.PRIVE)).toBe(CoinType.PRIVE);
  });

  test('canonical fallback still works for missing values', () => {
    expect(normalizeCoinType(undefined, CoinType.CASHBACK)).toBe(CoinType.CASHBACK);
  });
});

describe('normalizeCoinTypeAs — assert-and-narrow', () => {
  test('returns the asserted type when normalized matches', () => {
    expect(normalizeCoinTypeAs('branded_coin', CoinType.BRANDED)).toBe(CoinType.BRANDED);
    expect(normalizeCoinTypeAs('nuqta', CoinType.REZ)).toBe(CoinType.REZ);
  });

  test('throws when normalized value does not match the assertion', () => {
    expect(() => normalizeCoinTypeAs('promo', CoinType.REZ)).toThrow(/Expected coin type rez/);
  });

  test('null input uses assertType as fallback (round-trips)', () => {
    expect(normalizeCoinTypeAs(null, CoinType.CASHBACK)).toBe(CoinType.CASHBACK);
  });
});

describe('COIN_PRIORITY_ORDER + getValidNextWalletDebitCoin', () => {
  test('priority order is promo → branded → prive → cashback → referral → rez', () => {
    expect(COIN_PRIORITY_ORDER).toEqual([
      CoinType.PROMO,
      CoinType.BRANDED,
      CoinType.PRIVE,
      CoinType.CASHBACK,
      CoinType.REFERRAL,
      CoinType.REZ,
    ]);
  });

  test('picks the highest-priority type in the set', () => {
    // All present → promo wins
    const all = new Set<CoinType>([
      CoinType.PROMO,
      CoinType.BRANDED,
      CoinType.PRIVE,
      CoinType.CASHBACK,
      CoinType.REFERRAL,
      CoinType.REZ,
    ]);
    expect(getValidNextWalletDebitCoin(all)).toBe(CoinType.PROMO);
  });

  test('skips absent types and returns the next one in priority', () => {
    // No promo/branded/prive → cashback wins
    const subset = new Set<CoinType>([CoinType.CASHBACK, CoinType.REZ]);
    expect(getValidNextWalletDebitCoin(subset)).toBe(CoinType.CASHBACK);
  });

  test("falls through to REZ when it's the only option", () => {
    expect(getValidNextWalletDebitCoin(new Set<CoinType>([CoinType.REZ]))).toBe(CoinType.REZ);
  });

  test('returns null when every bucket is empty', () => {
    expect(getValidNextWalletDebitCoin(new Set<CoinType>())).toBeNull();
  });
});
