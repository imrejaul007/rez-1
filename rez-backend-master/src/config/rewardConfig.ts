// @ts-nocheck
/**
 * Comprehensive Reward Economics Configuration
 * Single source of truth for all reward types, rates, caps, and expiry policies.
 *
 * Format: Environment variable with REWARD_ prefix maps to config key
 * Example: REWARD_DAILY_COIN_CAP=2000 overrides dailyCoinCap
 *
 * Audited: 2026-03-23 by Dev Malhotra (Economics Controller)
 */

// SECTION 1: COIN EARNING CAPS & LIMITS
export const COIN_EARNING_CAPS = {
  daily: parseInt(process.env.REWARD_DAILY_COIN_CAP || '1000', 10),
  monthly: parseInt(process.env.REWARD_MONTHLY_COIN_CAP || '50000', 10),
  perOrder: parseInt(process.env.REWARD_MAX_COINS_PER_ORDER || '500', 10),
  perMinute: parseInt(process.env.REWARD_MAX_COINS_PER_MINUTE || '100', 10),
  eventRateLimit: parseInt(process.env.REWARD_MAX_EVENTS_PER_DAY || '10', 10),
};

// SECTION 2: COIN TYPE DEFINITIONS
export interface CoinTypeConfig {
  expiryDays: number;
  maxUsagePercentage: number;
  priority: number;
  conversionRateINR: number;
  isEarned: boolean;
}

export const COIN_TYPES: Record<string, CoinTypeConfig> = {
  rez: {
    // REZ coins never expire — default is 0 per spec
    expiryDays: parseInt(process.env.REWARD_REZ_EXPIRY_DAYS || '0', 10),
    maxUsagePercentage: 100,
    priority: 4,
    conversionRateINR: parseFloat(process.env.REWARD_REZ_CONVERSION_RATE || '1.0'),
    isEarned: true,
  },
  promo: {
    expiryDays: parseInt(process.env.REWARD_PROMO_EXPIRY_DAYS || '90', 10),
    maxUsagePercentage: parseInt(process.env.REWARD_PROMO_MAX_USAGE_PCT || '20', 10),
    priority: 1,
    conversionRateINR: parseFloat(process.env.REWARD_PROMO_CONVERSION_RATE || '1.0'),
    isEarned: true,
  },
  branded: {
    expiryDays: parseInt(process.env.REWARD_BRANDED_EXPIRY_DAYS || '180', 10),
    maxUsagePercentage: 100,
    priority: 2,
    conversionRateINR: parseFloat(process.env.REWARD_BRANDED_CONVERSION_RATE || '1.0'),
    isEarned: true,
  },
  prive: {
    expiryDays: parseInt(process.env.REWARD_PRIVE_EXPIRY_DAYS || '365', 10),
    maxUsagePercentage: 100,
    priority: 3,
    conversionRateINR: parseFloat(process.env.REWARD_PRIVE_CONVERSION_RATE || '1.0'),
    isEarned: false,
  },
};

// SECTION 3: PURCHASE-BASED REWARDS
export const CASHBACK_CONFIG = {
  baseRate: parseFloat(process.env.REWARD_CASHBACK_RATE || '0.02'),
  maxPerTransaction: parseInt(process.env.REWARD_MAX_CASHBACK_PER_TXN || '200', 10),
  minOrderValue: parseInt(process.env.REWARD_MIN_ORDER_FOR_CASHBACK || '0', 10),
  merchantMaxRate: parseFloat(process.env.REWARD_MERCHANT_MAX_CASHBACK || '0.20'),
  merchantMaxDiscount: parseFloat(process.env.REWARD_MERCHANT_MAX_DISCOUNT || '0.30'),
};

export const PROMO_COIN_CONFIG = {
  baseRate: parseFloat(process.env.REWARD_PROMO_EARN_RATE || '0.05'),
  minOrderValue: parseInt(process.env.REWARD_PROMO_MIN_ORDER || '200', 10),
  maxPerOrder: parseInt(process.env.REWARD_PROMO_MAX_PER_ORDER || '500', 10),
  roundingRule: (process.env.REWARD_PROMO_ROUNDING || 'floor') as 'floor' | 'ceil' | 'round',
  tierMultipliers: {
    free: parseFloat(process.env.REWARD_TIER_FREE || '1.0'),
    bronze: parseFloat(process.env.REWARD_TIER_BRONZE || '1.25'),
    silver: parseFloat(process.env.REWARD_TIER_SILVER || '1.5'),
    gold: parseFloat(process.env.REWARD_TIER_GOLD || '1.75'),
    platinum: parseFloat(process.env.REWARD_TIER_PLATINUM || '2.0'),
  },
};

// SECTION 4: REFERRAL PROGRAM
export interface ReferralTierConfig {
  name: string;
  referralsRequired: number;
  coinPerReferral: number;
  tierBonus: number;
  voucher?: { type: string; amount: number };
  lifetimePremium: boolean;
}

export const REFERRAL_CONFIG = {
  lifetimeCap: parseInt(process.env.REWARD_REFERRAL_LIFETIME_CAP || '25000', 10),
  monthlyCap: parseInt(process.env.REWARD_REFERRAL_MONTHLY_CAP || '5000', 10),
  // Tier names MUST match the User model's referralTier enum:
  // 'STARTER' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND'
  // Old names (PRO / ELITE / CHAMPION / LEGEND) caused lookup misses —
  // any code keying into this map by user.referralTier got undefined.
  tiers: {
    STARTER: {
      name: 'REZ Starter',
      referralsRequired: 0,
      coinPerReferral: parseInt(process.env.REWARD_REF_STARTER_PER || '50', 10),
      tierBonus: 0,
      lifetimePremium: false,
    },
    BRONZE: {
      name: 'REZ Bronze',
      referralsRequired: 5,
      coinPerReferral: parseInt(process.env.REWARD_REF_BRONZE_PER || '100', 10),
      tierBonus: parseInt(process.env.REWARD_REF_BRONZE_BONUS || '500', 10),
      lifetimePremium: false,
    },
    SILVER: {
      name: 'REZ Silver',
      referralsRequired: 10,
      coinPerReferral: parseInt(process.env.REWARD_REF_SILVER_PER || '150', 10),
      tierBonus: parseInt(process.env.REWARD_REF_SILVER_BONUS || '1000', 10),
      voucher: { type: 'Amazon', amount: 200 },
      lifetimePremium: false,
    },
    GOLD: {
      name: 'REZ Gold',
      referralsRequired: 20,
      coinPerReferral: parseInt(process.env.REWARD_REF_GOLD_PER || '200', 10),
      tierBonus: parseInt(process.env.REWARD_REF_GOLD_BONUS || '2000', 10),
      voucher: { type: 'Amazon', amount: 1000 },
      lifetimePremium: false,
    },
    PLATINUM: {
      name: 'REZ Platinum',
      referralsRequired: 50,
      coinPerReferral: parseInt(process.env.REWARD_REF_PLATINUM_PER || '300', 10),
      tierBonus: parseInt(process.env.REWARD_REF_PLATINUM_BONUS || '5000', 10),
      voucher: { type: 'Amazon', amount: 5000 },
      lifetimePremium: true,
    },
    DIAMOND: {
      name: 'REZ Diamond',
      referralsRequired: 100,
      coinPerReferral: parseInt(process.env.REWARD_REF_DIAMOND_PER || '400', 10),
      tierBonus: parseInt(process.env.REWARD_REF_DIAMOND_BONUS || '10000', 10),
      voucher: { type: 'Amazon', amount: 10000 },
      lifetimePremium: true,
    },
  } as Record<string, ReferralTierConfig>,
  maxAccountsPerDevice: parseInt(process.env.REWARD_MAX_ACCOUNTS_PER_DEVICE || '3', 10),
  maxRewardsPerDevicePerDay: parseInt(process.env.REWARD_MAX_REF_REWARDS_PER_DEVICE || '5', 10),
  maxAccountsPerIP: parseInt(process.env.REWARD_MAX_ACCOUNTS_PER_IP || '5', 10),
  maxRewardsPerIPPerDay: parseInt(process.env.REWARD_MAX_REF_REWARDS_PER_IP || '10', 10),
  circularDetectionDepth: parseInt(process.env.REWARD_CIRCULAR_DEPTH || '3', 10),
  validityWindowDays: parseInt(process.env.REWARD_REFERRAL_VALIDITY_DAYS || '30', 10),
};

// SECTION 5: GAMIFICATION & ENGAGEMENT
export const ENGAGEMENT_REWARDS = {
  spinWheel: {
    maxCoinsPerSpin: parseInt(process.env.REWARD_SPIN_WHEEL_MAX || '50', 10),
    dailySpins: parseInt(process.env.REWARD_SPIN_WHEEL_DAILY || '5', 10),
  },
  scratchCard: {
    maxCoinsPerCard: parseInt(process.env.REWARD_SCRATCH_CARD_MAX || '100', 10),
    dailyCards: parseInt(process.env.REWARD_SCRATCH_CARD_DAILY || '3', 10),
  },
  quiz: {
    coinsPerCorrect: parseInt(process.env.REWARD_QUIZ_CORRECT || '20', 10),
    dailyQuizzes: parseInt(process.env.REWARD_QUIZ_DAILY || '2', 10),
  },
  dailyLogin: {
    baseCoins: parseInt(process.env.REWARD_DAILY_LOGIN || '5', 10),
    streakBonus: parseInt(process.env.REWARD_STREAK_BONUS || '10', 10),
    streakDays: parseInt(process.env.REWARD_STREAK_DAYS || '7', 10),
  },
  review: {
    coinsPerReview: parseInt(process.env.REWARD_REVIEW || '10', 10),
    maxPerMerchant: parseInt(process.env.REWARD_REVIEW_MAX_PER_MERCHANT || '2', 10),
  },
};

// SECTION 6: SUBSCRIPTION & LOYALTY
export const SUBSCRIPTION_BONUSES = {
  free: { name: 'Free', welcomeBonus: 0, monthlyBonus: 0 },
  premium: {
    name: 'Premium',
    welcomeBonus: parseInt(process.env.REWARD_PREMIUM_WELCOME || '200', 10),
    monthlyBonus: parseInt(process.env.REWARD_PREMIUM_MONTHLY || '50', 10),
  },
  vip: {
    name: 'VIP',
    welcomeBonus: parseInt(process.env.REWARD_VIP_WELCOME || '500', 10),
    monthlyBonus: parseInt(process.env.REWARD_VIP_MONTHLY || '100', 10),
  },
};

export const SIP_CONFIG = {
  lifetimeBonusCap: parseInt(process.env.REWARD_SIP_LIFETIME_CAP || '10000', 10),
  maxPerTransaction: parseInt(process.env.REWARD_SIP_MAX_PER_TXN || '100', 10),
  baseBonus: parseInt(process.env.REWARD_SIP_BASE || '10', 10),
  tierMultipliers: {
    free: parseFloat(process.env.REWARD_SIP_TIER_FREE || '1.0'),
    silver: parseFloat(process.env.REWARD_SIP_TIER_SILVER || '1.25'),
    gold: parseFloat(process.env.REWARD_SIP_TIER_GOLD || '1.5'),
  },
};

// SECTION 7: KILL SWITCHES
export const KILL_SWITCHES = {
  allRewards: process.env.REWARD_KILL_SWITCH_ALL === 'true',
  referrals: process.env.REWARD_KILL_SWITCH_REFERRALS === 'true',
  cashback: process.env.REWARD_KILL_SWITCH_CASHBACK === 'true',
  promos: process.env.REWARD_KILL_SWITCH_PROMOS === 'true',
  gamification: process.env.REWARD_KILL_SWITCH_GAMIFICATION === 'true',
  dailyLogin: process.env.REWARD_KILL_SWITCH_DAILY_LOGIN === 'true',
  sipBonuses: process.env.REWARD_KILL_SWITCH_SIP === 'true',
  subscriptionBonuses: process.env.REWARD_KILL_SWITCH_SUBSCRIPTION === 'true',
};

// UTILITY FUNCTIONS
export function getCoinTypeConfig(coinType: string): CoinTypeConfig | null {
  return COIN_TYPES[coinType.toLowerCase()] || null;
}

export function convertCoinsToINR(coins: number, coinType: string = 'rez'): number {
  const config = getCoinTypeConfig(coinType);
  return coins * (config?.conversionRateINR || 1.0);
}

export function isRewardKillSwitched(rewardType: string): boolean {
  const killSwitchMap: Record<string, boolean> = {
    referral: KILL_SWITCHES.referrals,
    cashback: KILL_SWITCHES.cashback,
    promo: KILL_SWITCHES.promos,
    gamification: KILL_SWITCHES.gamification,
    daily_login: KILL_SWITCHES.dailyLogin,
    sip: KILL_SWITCHES.sipBonuses,
    subscription: KILL_SWITCHES.subscriptionBonuses,
  };
  return KILL_SWITCHES.allRewards || killSwitchMap[rewardType.toLowerCase()] || false;
}

export function validateMerchantCashback(rate: number): { isValid: boolean; error?: string } {
  // CFG-004 FIX: Normalize — accept both decimal (0.20) and percentage (20) formats.
  const rateAsPercent = rate <= 1 ? rate * 100 : rate;

  if (rateAsPercent < 0 || rateAsPercent > 100) {
    return { isValid: false, error: `Cashback rate must be 0-100, got ${rate}` };
  }

  const maxPercent =
    CASHBACK_CONFIG.merchantMaxRate <= 1 ? CASHBACK_CONFIG.merchantMaxRate * 100 : CASHBACK_CONFIG.merchantMaxRate;

  if (rateAsPercent > maxPercent) {
    return {
      isValid: false,
      error: `Cashback ${rateAsPercent.toFixed(2)}% exceeds max allowed ${maxPercent.toFixed(2)}%`,
    };
  }
  return { isValid: true };
}

export default {
  COIN_EARNING_CAPS,
  COIN_TYPES,
  CASHBACK_CONFIG,
  PROMO_COIN_CONFIG,
  REFERRAL_CONFIG,
  ENGAGEMENT_REWARDS,
  SUBSCRIPTION_BONUSES,
  SIP_CONFIG,
  KILL_SWITCHES,
  getCoinTypeConfig,
  convertCoinsToINR,
  isRewardKillSwitched,
  validateMerchantCashback,
};
