/**
 * Money utilities — safe financial calculations using Decimal.js
 * All internal calculations use paise (1 rupee = 100 paise) or Decimal precision.
 *
 * MED-006 FIX: The previous implementation used native JS float arithmetic which has known
 * precision issues (e.g. Math.round(1.005 * 100) === 100 instead of 101 due to IEEE 754).
 * This module now delegates to Decimal.js (same as currency.ts) to ensure consistent results
 * across the codebase regardless of which utility file a caller imports.
 */
import Decimal from 'decimal.js';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/** Convert rupees to paise (integer) — safe from 19.99*100 = 1998.999... float drift */
export const toPaise = (rupees: number): number => new Decimal(rupees).mul(100).round().toNumber();

/** Convert paise to rupees */
export const toRupees = (paise: number): number =>
  new Decimal(paise).div(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();

/** Calculate percentage of an amount, returns floored integer (coins/paise safe) */
export const calculatePercentage = (amount: number, percent: number): number =>
  new Decimal(amount).mul(percent).div(100).floor().toNumber();

/** Round to 2 decimal places (for rupee display) */
export const roundToRupees = (amount: number): number =>
  new Decimal(amount).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();

/** Safe multiplication to 2 decimal places */
export const safeMultiply = (a: number, b: number): number =>
  new Decimal(a).mul(b).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();

export default { toPaise, toRupees, calculatePercentage, roundToRupees, safeMultiply };
