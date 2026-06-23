/**
 * Privé Coin Conversion Rates — FALLBACK ONLY
 *
 * The canonical source of truth is the backend: GET /api/prive/redeem-config
 * These values are used ONLY when the API call fails or during offline mode.
 */

export const PRIVE_CONVERSION_RATES = {
  gift_card: 0.10,
  bill_pay: 0.10,
  experience: 0.12,
  charity: 0.15,
} as const;

export type RedeemVoucherType = keyof typeof PRIVE_CONVERSION_RATES;

/**
 * Convert coins to fiat value based on voucher type
 */
export const coinToFiatValue = (coins: number, type: RedeemVoucherType): number => {
  return Math.floor(coins * PRIVE_CONVERSION_RATES[type]);
};
