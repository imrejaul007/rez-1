// @ts-nocheck
/**
 * EconGuard: Economics Configuration
 * Single source of truth for all cap enforcement, rates, and limits.
 * All values are CONFIGURABLE via environment variables with sensible defaults.
 *
 * DEV: To change any rate or cap, update the .env file and restart the service.
 * No code deployment required.
 *
 * STRUCTURE:
 * - COMMISSION: Platform fees (merchant payout calculation)
 * - CAPS: Hard limits on earning and spending
 * - REFERRAL: Referral program bounds
 * - CASHBACK: Cashback rate limits and transaction caps
 * - SIP: Subscription In-Plan bonus caps
 * - TRIAL: Free trial abuse prevention
 */

// ─── COMMISSION & MERCHANT RATES ──────────────────────────────────────────
// 2.5% REZ platform commission on merchant gross revenue
export const MERCHANT_COMMISSION_RATE = parseFloat(process.env.MERCHANT_COMMISSION_RATE || '0.025');

// 18% GST on the commission
export const COMMISSION_GST_RATE = parseFloat(process.env.COMMISSION_GST_RATE || '0.18');

// M22 FIX: Merchant settlement rate as a configurable constant.
// Represents the net fraction of gross that reaches the merchant after platform
// fee and GST are deducted. Default: ~0.9705 (100% - 2.5% commission - 18%
// GST-on-commission = 97.05%). Override via MERCHANT_SETTLEMENT_RATE env var.
//
// For admin tooling that prefers a single settlement multiplier rather than
// the two-step commission+GST calculation, use this constant. Both approaches
// MUST produce the same net amount; use validateMerchantPayoutMath() to verify.
//
// Example: ₹1,000 gross
//   Commission = 1000 × 0.025 = ₹25
//   GST on commission = 25 × 0.18 = ₹4.50
//   Net = 1000 - 25 - 4.50 = ₹970.50
//   Settlement rate = 970.50 / 1000 = 0.9705
export const MERCHANT_SETTLEMENT_RATE = parseFloat(process.env.MERCHANT_SETTLEMENT_RATE || '0.9705');

// Merchant discount/cashback safety limits
export const MERCHANT_MAX_DISCOUNT_PCT = parseFloat(process.env.MERCHANT_MAX_DISCOUNT_PCT || '30'); // 30% max discount on order value
export const MERCHANT_MAX_CASHBACK_PCT = parseFloat(process.env.MERCHANT_MAX_CASHBACK_PCT || '20'); // 20% max cashback rate

// ─── COIN ISSUANCE CAPS ────────────────────────────────────────────────────
// Daily earning cap per user (coins)
export const DAILY_EARNING_CAP_COINS = parseInt(process.env.DAILY_EARNING_CAP_COINS || '1000', 10);

// Monthly earning cap per user (coins)
export const MONTHLY_EARNING_CAP_COINS = parseInt(process.env.MONTHLY_EARNING_CAP_COINS || '50000', 10);

// Max cashback per individual transaction
export const MAX_CASHBACK_PER_TXN = parseInt(process.env.MAX_CASHBACK_PER_TXN || '200', 10);

// Per-order max coins issuable (prevents oversized rewards on single order)
export const MAX_COINS_PER_ORDER = parseInt(process.env.MAX_COINS_PER_ORDER || '500', 10);

// ─── CAMPAIGN BUDGET SAFETY ────────────────────────────────────────────────
// Campaign budget decrements must be atomic (enforced in campaignService)
// No negative budgets allowed. Enforcement happens at issuance time.
export const MIN_CAMPAIGN_BUDGET = parseInt(process.env.MIN_CAMPAIGN_BUDGET || '0', 10);

// ─── COIN REDEMPTION ───────────────────────────────────────────────────────
// Minimum order value required before coins can be redeemed
export const MIN_ORDER_VALUE_FOR_REDEMPTION = parseInt(process.env.MIN_ORDER_VALUE_FOR_REDEMPTION || '0', 10);

// Max coins that can be redeemed as percentage of order value
// (promo coins default to 20% usage cap per CURRENCY_RULES)
export const MAX_COIN_USAGE_PCT = parseFloat(process.env.MAX_COIN_USAGE_PCT || '100');

// ─── REFERRAL PROGRAM ──────────────────────────────────────────────────────
// Lifetime cap on total referral earnings per user (coins)
export const REFERRAL_LIFETIME_PAYOUT_CAP = parseInt(process.env.REFERRAL_LIFETIME_PAYOUT_CAP || '25000', 10);

// Max referral payouts per referrer per month
export const REFERRAL_MONTHLY_CAP = parseInt(process.env.REFERRAL_MONTHLY_CAP || '5000', 10);

// ─── SIP & SUBSCRIPTION BONUSES ────────────────────────────────────────────
// Gold SIP: Max lifetime bonus coins for subscription holders
export const SIP_LIFETIME_BONUS_CAP = parseInt(process.env.SIP_LIFETIME_BONUS_CAP || '10000', 10);

// Max bonus coins per SIP transaction
export const SIP_BONUS_PER_TRANSACTION = parseInt(process.env.SIP_BONUS_PER_TRANSACTION || '100', 10);

// ─── FREE TRIAL ABUSE PREVENTION ──────────────────────────────────────────
// Each business can offer ONE free trial per user (not multiple trials per user)
export const TRIAL_MAX_PER_USER_PER_MERCHANT = parseInt(process.env.TRIAL_MAX_PER_USER_PER_MERCHANT || '1', 10);

// Cooldown between trial completions (days)
export const TRIAL_COOLDOWN_DAYS = parseInt(process.env.TRIAL_COOLDOWN_DAYS || '7', 10);

// ─── RATE LIMITS & DAILY CAPS ─────────────────────────────────────────────
// Max reward events per user per day (prevents farming loops)
export const MAX_REWARD_EVENTS_PER_DAY = parseInt(process.env.MAX_REWARD_EVENTS_PER_DAY || '10', 10);

// ─── VALIDATION HELPERS ───────────────────────────────────────────────────

/**
 * Validate merchant discount does not exceed max allowed
 * @param discountPct Discount as percentage (0-100)
 * @returns { isValid, error }
 */
export function validateMerchantDiscount(discountPct: number): {
  isValid: boolean;
  error?: string;
} {
  if (discountPct > MERCHANT_MAX_DISCOUNT_PCT) {
    return {
      isValid: false,
      error: `Discount ${discountPct}% exceeds max allowed ${MERCHANT_MAX_DISCOUNT_PCT}%`,
    };
  }
  return { isValid: true };
}

/**
 * Validate merchant cashback does not exceed max allowed
 * @param cashbackPct Cashback as percentage (0-100)
 * @returns { isValid, error }
 */
export function validateMerchantCashback(cashbackPct: number): {
  isValid: boolean;
  error?: string;
} {
  if (cashbackPct > MERCHANT_MAX_CASHBACK_PCT) {
    return {
      isValid: false,
      error: `Cashback ${cashbackPct}% exceeds max allowed ${MERCHANT_MAX_CASHBACK_PCT}%`,
    };
  }
  return { isValid: true };
}

/**
 * Calculate merchant payout after commission and GST
 * @param grossAmount Gross transaction amount
 * @returns { netAmount, commission, gst }
 */
export function calculateMerchantPayout(grossAmount: number): {
  netAmount: number;
  commission: number;
  gst: number;
} {
  const commission = grossAmount * MERCHANT_COMMISSION_RATE;
  const gst = commission * COMMISSION_GST_RATE;
  const netAmount = grossAmount - commission - gst;

  return {
    netAmount: parseFloat(netAmount.toFixed(2)),
    commission: parseFloat(commission.toFixed(2)),
    gst: parseFloat(gst.toFixed(2)),
  };
}

/**
 * AHMED FIX: Validate merchant payout calculation is correct.
 * Verifies that: gross = commission + gst + net (T+2 settlement formula)
 * @param grossAmount Gross transaction amount
 * @param commission Platform commission
 * @param gst GST on commission
 * @param netAmount Net payout to merchant
 * @returns { isValid, error }
 */
export function validateMerchantPayoutMath(
  grossAmount: number,
  commission: number,
  gst: number,
  netAmount: number,
): { isValid: boolean; error?: string } {
  // AHMED: The formula is: gross = commission + gst + net
  // So: gross - commission - gst = net
  const expectedNet = parseFloat((grossAmount - commission - gst).toFixed(2));
  const tolerance = 0.01; // Allow 1 paise tolerance for rounding

  if (Math.abs(netAmount - expectedNet) > tolerance) {
    return {
      isValid: false,
      error: `Payout math mismatch: Expected net ₹${expectedNet}, got ₹${netAmount}. Gross ₹${grossAmount} - Commission ₹${commission} - GST ₹${gst}`,
    };
  }

  // Verify commission is 2.5% of gross
  const expectedCommission = parseFloat((grossAmount * MERCHANT_COMMISSION_RATE).toFixed(2));
  if (Math.abs(commission - expectedCommission) > tolerance) {
    return {
      isValid: false,
      error: `Commission mismatch: Expected ₹${expectedCommission} (2.5%), got ₹${commission}`,
    };
  }

  // Verify GST is 18% of commission
  const expectedGst = parseFloat((commission * COMMISSION_GST_RATE).toFixed(2));
  if (Math.abs(gst - expectedGst) > tolerance) {
    return {
      isValid: false,
      error: `GST mismatch: Expected ₹${expectedGst} (18%), got ₹${gst}`,
    };
  }

  return { isValid: true };
}

export default {
  MERCHANT_COMMISSION_RATE,
  COMMISSION_GST_RATE,
  MERCHANT_SETTLEMENT_RATE,
  MERCHANT_MAX_DISCOUNT_PCT,
  MERCHANT_MAX_CASHBACK_PCT,
  DAILY_EARNING_CAP_COINS,
  MONTHLY_EARNING_CAP_COINS,
  MAX_CASHBACK_PER_TXN,
  MAX_COINS_PER_ORDER,
  MIN_CAMPAIGN_BUDGET,
  MIN_ORDER_VALUE_FOR_REDEMPTION,
  MAX_COIN_USAGE_PCT,
  REFERRAL_LIFETIME_PAYOUT_CAP,
  REFERRAL_MONTHLY_CAP,
  SIP_LIFETIME_BONUS_CAP,
  SIP_BONUS_PER_TRANSACTION,
  TRIAL_MAX_PER_USER_PER_MERCHANT,
  TRIAL_COOLDOWN_DAYS,
  MAX_REWARD_EVENTS_PER_DAY,
  validateMerchantDiscount,
  validateMerchantCashback,
  calculateMerchantPayout,
  validateMerchantPayoutMath,
};
