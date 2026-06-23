import Decimal from 'decimal.js';

// Configure Decimal.js for financial calculations
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * Safe currency math utilities using decimal.js.
 * All functions accept number inputs and return number outputs
 * to keep the rest of the codebase unchanged.
 */

/** Multiply two numbers with decimal precision, round to 2dp */
export function mul(a: number, b: number): number {
  return new Decimal(a).mul(b).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}

/** Divide two numbers with decimal precision, round to 2dp */
export function div(a: number, b: number): number {
  return new Decimal(a).div(b).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}

/** Add numbers with decimal precision */
export function add(...nums: number[]): number {
  return nums.reduce((acc, n) => new Decimal(acc).plus(n), new Decimal(0))
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}

/** Subtract b from a with decimal precision */
export function sub(a: number, b: number): number {
  return new Decimal(a).minus(b).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}

/** Calculate percentage: (amount * rate) / 100, rounded to 2dp */
export function pct(amount: number, rate: number): number {
  return new Decimal(amount).mul(rate).div(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}

/** Convert rupees to paise (integer) — safe from 19.99*100 = 1998.999... */
export function toPaise(rupees: number): number {
  return new Decimal(rupees).mul(100).round().toNumber();
}

/** Round to 2 decimal places */
export function round2(n: number): number {
  return new Decimal(n).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}

/** Round to nearest integer */
export function roundInt(n: number): number {
  return new Decimal(n).round().toNumber();
}
