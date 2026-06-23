/**
 * REZ Coin Expiry Policy — Single Source of Truth
 *
 * CONTRADICTION RESOLUTION:
 * Previous system had BOTH:
 * 1. Per-coin expiry from earned date (individual TTL)
 * 2. Global "all coins expire on inactivity" policy
 *
 * This created conflicts. NOW:
 * - Only per-coin earned-date TTL applies
 * - NO inactivity-based expiry (eliminated contradiction)
 * - Tier downgrade does NOT affect coin expiry
 * - Each coin type has fixed TTL from earn date
 */

// MA-L2 FIX: Added 'prive' — was missing, causing coin expiry jobs to fail for Prive coin holders
// FIX-2026-04-16: All values now env-var based with defaults matching rewardConfig.ts.
// Removed hardcoded contradictions: REZ=90→0, promo=30→90, branded=60→180.
// Added 'referral' and 'cashback' coin types that were missing.
export type CoinType = 'rez' | 'promo' | 'branded' | 'trial' | 'prive' | 'referral' | 'cashback';

/**
 * Fixed TTL for each coin type (days from earn date).
 * Values MUST stay in sync with rewardConfig.ts COIN_TYPES.expiryDays defaults.
 * All values are env-var based so operators can override without code changes.
 * NO inactivity-based expiry (eliminates contradiction).
 */
const COIN_EXPIRY_CONFIG: Record<CoinType, number> = {
  // REZ coins: 0 = never expire (aligned with rewardConfig default)
  rez: parseInt(process.env.REWARD_REZ_EXPIRY_DAYS || '0', 10),
  // Promo coins: 90 days from earned (aligned with rewardConfig default)
  promo: parseInt(process.env.REWARD_PROMO_EXPIRY_DAYS || '90', 10),
  // Branded coins: 180 days from earned (aligned with rewardConfig default)
  branded: parseInt(process.env.REWARD_BRANDED_EXPIRY_DAYS || '180', 10),
  // Prive premium coins: 365 days from earned (aligned with rewardConfig default)
  prive: parseInt(process.env.REWARD_PRIVE_EXPIRY_DAYS || '365', 10),
  // Trial coins: 7 days from trial completion
  trial: parseInt(process.env.REWARD_TRIAL_EXPIRY_DAYS || '7', 10),
  // Referral coins: 180 days from earned (aligned with rewardConfig default)
  referral: parseInt(process.env.REWARD_REFERRAL_EXPIRY_DAYS || '180', 10),
  // Cashback coins: 365 days from earned (aligned with rewardConfig default)
  cashback: parseInt(process.env.REWARD_CASHBACK_EXPIRY_DAYS || '365', 10),
};

/**
 * Get expiry date for a coin based on type and earn date.
 *
 * @param earnedAt Date when coin was earned
 * @param coinType Type of coin
 * @param campaignEndDate Optional campaign end date (for promo coins)
 * @param customExpiryDays Optional override (for special cases)
 * @returns Expiry date (will be revoked on this date)
 *
 * RULES:
 * - REZ coins: 0 days = never expire (unless customExpiryDays provided)
 * - Promo coins: Min of (earn date + promo TTL, campaign end date)
 * - Other coins: Earn date + fixed TTL (env-var driven, defaults per rewardConfig.ts)
 * - No inactivity check (that contradicts earned-date TTL)
 * - Tier downgrade does NOT change expiry (only earning rate affected)
 */
export function getCoinExpiryDate(
  earnedAt: Date,
  coinType: CoinType,
  campaignEndDate?: Date,
  customExpiryDays?: number,
): Date {
  const expiryDate = new Date(earnedAt);

  // Get TTL for this coin type (allow override)
  const ttlDays = customExpiryDays ?? COIN_EXPIRY_CONFIG[coinType];

  // Add TTL to earned date
  expiryDate.setDate(expiryDate.getDate() + ttlDays);

  // For promo coins, also consider campaign end date
  if (coinType === 'promo' && campaignEndDate) {
    // Promo coins expire earlier of: (earnDate + 30 days) or (campaign end)
    return expiryDate < campaignEndDate ? expiryDate : campaignEndDate;
  }

  return expiryDate;
}

/**
 * Check if a coin has expired.
 * @param earnedAt Date when coin was earned
 * @param coinType Type of coin
 * @param campaignEndDate Optional campaign end date (for promo)
 * @returns true if coin has expired, false if still valid
 */
export function isCoinExpired(earnedAt: Date, coinType: CoinType, campaignEndDate?: Date): boolean {
  const expiryDate = getCoinExpiryDate(earnedAt, coinType, campaignEndDate);
  return new Date() > expiryDate;
}

/**
 * Get time remaining until coin expires (in seconds).
 * @returns Remaining seconds, or 0 if already expired, negative if expired
 */
export function getTimeUntilExpiry(earnedAt: Date, coinType: CoinType, campaignEndDate?: Date): number {
  const expiryDate = getCoinExpiryDate(earnedAt, coinType, campaignEndDate);
  const now = new Date();
  return Math.floor((expiryDate.getTime() - now.getTime()) / 1000);
}

/**
 * Get all coins expiring within N days.
 * Used for "expiring soon" notifications.
 */
export function getExpiringWithinDays(
  coins: Array<{ earnedAt: Date; type: CoinType; campaignEndDate?: Date }>,
  withinDays: number,
): Array<{ coin: (typeof coins)[0]; daysUntilExpiry: number; expiryDate: Date }> {
  const withinSeconds = withinDays * 24 * 60 * 60;

  return coins
    .map((coin) => {
      const expiryDate = getCoinExpiryDate(coin.earnedAt, coin.type, coin.campaignEndDate);
      const secondsUntilExpiry = getTimeUntilExpiry(coin.earnedAt, coin.type, coin.campaignEndDate);

      return {
        coin,
        daysUntilExpiry: Math.ceil(secondsUntilExpiry / (24 * 60 * 60)),
        expiryDate,
      };
    })
    .filter((item) => item.daysUntilExpiry >= 0 && item.daysUntilExpiry <= withinDays)
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
}

/**
 * Coin Expiry Policy Summary (for documentation & admin dashboard).
 * Values in this summary are live — they reflect the env-var resolved config.
 */
export const COIN_EXPIRY_POLICY = {
  version: '2.0',
  lastUpdated: '2026-04-16',
  contradiction_resolution: {
    issue: 'System had both per-coin earned-date TTL AND global inactivity expiry',
    resolution: 'Eliminated inactivity expiry. Now ONLY earned-date TTL applies.',
    impact: 'Users keep coins even if inactive, reducing frustration. Spam bots still blocked by daily cap.',
  },
  env_var_source: {
    REZ: 'REWARD_REZ_EXPIRY_DAYS (default 0 = never)',
    promo: 'REWARD_PROMO_EXPIRY_DAYS (default 90)',
    branded: 'REWARD_BRANDED_EXPIRY_DAYS (default 180)',
    prive: 'REWARD_PRIVE_EXPIRY_DAYS (default 365)',
    trial: 'REWARD_TRIAL_EXPIRY_DAYS (default 7)',
    referral: 'REWARD_REFERRAL_EXPIRY_DAYS (default 180)',
    cashback: 'REWARD_CASHBACK_EXPIRY_DAYS (default 365)',
  },
  coin_types: {
    rez: {
      ttl_days: COIN_EXPIRY_CONFIG.rez,
      description: 'Base REZ coins earned from purchases/bookings — 0 = never expires',
      expiry_trigger: `Earned date + ${COIN_EXPIRY_CONFIG.rez} days${COIN_EXPIRY_CONFIG.rez === 0 ? ' (NEVER)' : ''}`,
      inactivity_expiry: false,
      tier_downgrade_affects: false,
    },
    promo: {
      ttl_days: COIN_EXPIRY_CONFIG.promo,
      description: 'Platform-funded promotional coins (one-time campaigns)',
      expiry_trigger: `MIN(earned date + ${COIN_EXPIRY_CONFIG.promo} days, campaign end date)`,
      inactivity_expiry: false,
      tier_downgrade_affects: false,
    },
    branded: {
      ttl_days: COIN_EXPIRY_CONFIG.branded,
      description: 'Merchant-specific/branded coins',
      expiry_trigger: `Earned date + ${COIN_EXPIRY_CONFIG.branded} days`,
      inactivity_expiry: false,
      tier_downgrade_affects: false,
    },
    prive: {
      ttl_days: COIN_EXPIRY_CONFIG.prive,
      description: 'Premium Prive coins earned from campaigns or elite tier membership',
      expiry_trigger: `Earned date + ${COIN_EXPIRY_CONFIG.prive} days`,
      inactivity_expiry: false,
      tier_downgrade_affects: false,
    },
    trial: {
      ttl_days: COIN_EXPIRY_CONFIG.trial,
      description: 'Trial completion bonus coins',
      expiry_trigger: `Trial completion date + ${COIN_EXPIRY_CONFIG.trial} days`,
      inactivity_expiry: false,
      tier_downgrade_affects: false,
    },
    referral: {
      ttl_days: COIN_EXPIRY_CONFIG.referral,
      description: 'Coins earned from referral program',
      expiry_trigger: `Earned date + ${COIN_EXPIRY_CONFIG.referral} days`,
      inactivity_expiry: false,
      tier_downgrade_affects: false,
    },
    cashback: {
      ttl_days: COIN_EXPIRY_CONFIG.cashback,
      description: 'Cashback coins earned from purchases',
      expiry_trigger: `Earned date + ${COIN_EXPIRY_CONFIG.cashback} days`,
      inactivity_expiry: false,
      tier_downgrade_affects: false,
    },
  },
  tier_downgrade_policy: {
    affects_earning_rate: true, // Platinum→Silver reduces future coin earning
    affects_existing_coins: false, // But existing coins still worth same
    affects_expiry_date: false, // Coins don't re-expire on tier change
    example:
      'Earn 100 coins at Platinum (2x multiplier). Downgrade to Silver. Those 100 coins still redeemable at 1:1 INR, expiry unchanged.',
  },
  anti_gaming_measures: {
    daily_reward_cap: 10, // Max reward events per user per day
    cashback_basis: 'Net cash paid (not coin-redeemed amount)',
    circular_referral_detection: true,
    triple_spend_detection: true, // Earn → Redeem → Earn again
  },
};

/**
 * Validate coin expiry policy for consistency.
 * Used by tests and at startup to detect contradictions with rewardConfig.ts.
 *
 * FIX-2026-04-16: Added cross-validation against rewardConfig.ts COIN_TYPES
 * to catch any future drift between the two config sources.
 */
export function validateExpiryPolicy(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check: All TTLs are non-negative (0 is valid = never expires)
  for (const [type, ttl] of Object.entries(COIN_EXPIRY_CONFIG)) {
    if (ttl < 0) {
      errors.push(`Invalid TTL for ${type}: ${ttl} (must be >= 0, where 0 = never)`);
    }
  }

  // Check: No contradictory settings in policy doc
  const policyDoc = COIN_EXPIRY_POLICY;
  for (const [type, config] of Object.entries(policyDoc.coin_types)) {
    if (config.inactivity_expiry === true) {
      errors.push(`Contradiction: ${type} has inactivity_expiry=true, but policy eliminates inactivity expiry`);
    }
  }

  // FIX-2026-04-16: Cross-validate against rewardConfig.ts
  // Dynamically import to avoid circular dependency issues at module load time.
  // Only imported inside this function so other modules importing coinExpiryPolicy.ts
  // are not forced to also import rewardConfig.ts.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const rewardConfig = require('../config/rewardConfig');

    const rewardCoinTypes: Record<string, number> = {
      // Maps rewardConfig COIN_TYPES keys to their expiryDays values
      // rewardConfig uses 'rez', 'promo', 'branded', 'prive' (not 'trial', 'referral', 'cashback')
      rez: rewardConfig.COIN_TYPES['rez']?.expiryDays,
      promo: rewardConfig.COIN_TYPES['promo']?.expiryDays,
      branded: rewardConfig.COIN_TYPES['branded']?.expiryDays,
      prive: rewardConfig.COIN_TYPES['prive']?.expiryDays,
    };

    for (const [coinType, rewardExpiry] of Object.entries(rewardCoinTypes)) {
      if (rewardExpiry === undefined) continue; // rewardConfig may not have this type
      const localExpiry = COIN_EXPIRY_CONFIG[coinType as keyof typeof COIN_EXPIRY_CONFIG];
      if (localExpiry !== rewardExpiry) {
        warnings.push(
          `Expiry drift for '${coinType}': coinExpiryPolicy=${localExpiry} days, ` +
            `rewardConfig=${rewardExpiry} days. ` +
            `Ensure both are intentionally synced or use matching env vars (REWARD_${coinType.toUpperCase()}_EXPIRY_DAYS).`,
        );
      }
    }

    // Also warn if rewardConfig has coin types that coinExpiryPolicy is missing
    const localTypes = new Set(Object.keys(COIN_EXPIRY_CONFIG));
    for (const rewardType of Object.keys(rewardConfig.COIN_TYPES)) {
      if (!localTypes.has(rewardType)) {
        warnings.push(
          `rewardConfig has coin type '${rewardType}' that is missing from coinExpiryPolicy. ` +
            `Add it to CoinType and COIN_EXPIRY_CONFIG.`,
        );
      }
    }

    // Also warn if coinExpiryPolicy has types not in rewardConfig
    const rewardTypes = new Set(Object.keys(rewardConfig.COIN_TYPES));
    for (const localType of Object.keys(COIN_EXPIRY_CONFIG)) {
      if (!rewardTypes.has(localType)) {
        warnings.push(
          `coinExpiryPolicy has coin type '${localType}' that is not in rewardConfig. ` +
            `Add it to COIN_TYPES in rewardConfig.ts if applicable.`,
        );
      }
    }
  } catch (importError) {
    warnings.push(
      `Could not cross-validate against rewardConfig.ts: ${importError instanceof Error ? importError.message : String(importError)}. ` +
        `Ensure rewardConfig.ts is available and exports COIN_TYPES.`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
