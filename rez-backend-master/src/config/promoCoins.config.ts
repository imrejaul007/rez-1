// Store Promo Coins Configuration
// Configure how users earn store-specific promo coins

// Subscription tier multipliers for promo coin earning
// Higher tiers earn more coins per order
export const TIER_PROMO_COIN_MULTIPLIERS: Record<string, number> = {
  free: 1.0,       // 5% base earning
  bronze: 1.25,    // 6.25% effective
  silver: 1.5,     // 7.5% effective
  gold: 1.75,      // 8.75% effective
  platinum: 2.0    // 10% effective
};

export interface PromoCoinsConfig {
  enabled: boolean;
  earningRate: {
    percentage: number;           // % of order value converted to coins (e.g., 5% of ₹1000 = 50 coins)
    minOrderValue: number;         // Minimum order value to earn coins (in INR)
    maxCoinsPerOrder: number;      // Maximum coins that can be earned per order
    roundingRule: 'floor' | 'ceil' | 'round'; // How to round coin amounts
  };
  redemption: {
    minRedemptionAmount: number;   // Minimum coins required to use (e.g., 10 coins)
    maxUsagePercentage: number;    // Max % of order value that can be paid with coins (e.g., 30%)
    conversionRate: number;        // 1 coin = X rupees (default 1:1)
  };
  expiry: {
    enabled: boolean;
    expiryDays: number;            // Days after which coins expire (0 = no expiry)
  };
  restrictions: {
    allowCombineWithCoupons: boolean; // Can promo coins be used with coupons?
    allowCombineWithREZCoins: boolean; // Can promo coins be used with REZ coins?
    onlyForPaidOrders: boolean;    // Only award coins for paid orders (not COD)?
  };
}

// Default configuration
export const DEFAULT_PROMO_COINS_CONFIG: PromoCoinsConfig = {
  enabled: true,
  earningRate: {
    percentage: 5,                 // 5% of order value
    minOrderValue: 200,            // Minimum ₹200 order to earn coins
    maxCoinsPerOrder: 500,         // Max 500 coins per order
    roundingRule: 'floor'          // Always round down (₹205 * 5% = 10.25 → 10 coins)
  },
  redemption: {
    minRedemptionAmount: 10,       // Need at least 10 coins to use
    maxUsagePercentage: 30,        // Can use up to 30% of order value in coins
    conversionRate: 1              // 1 coin = ₹1
  },
  expiry: {
    enabled: true,
    expiryDays: 90                 // Coins expire after 90 days
  },
  restrictions: {
    allowCombineWithCoupons: true, // Can use with coupons
    allowCombineWithREZCoins: true, // CAN use with REZ coins
    onlyForPaidOrders: false       // Award for all successful orders including COD
  }
};

/**
 * Calculate promo coins to be earned from an order
 * @param orderValue Order total in INR
 * @param config Optional custom config (uses default if not provided)
 * @returns Number of promo coins to be awarded
 */
export function calculatePromoCoinsEarned(
  orderValue: number,
  config: PromoCoinsConfig = DEFAULT_PROMO_COINS_CONFIG
): number {
  if (!config.enabled) {
    return 0;
  }

  // Check minimum order value
  if (orderValue < config.earningRate.minOrderValue) {
    return 0;
  }

  // Calculate coins based on percentage
  let coins = (orderValue * config.earningRate.percentage) / 100;

  // Apply rounding rule
  switch (config.earningRate.roundingRule) {
    case 'floor':
      coins = Math.floor(coins);
      break;
    case 'ceil':
      coins = Math.ceil(coins);
      break;
    case 'round':
      coins = Math.round(coins);
      break;
  }

  // Cap at maximum
  coins = Math.min(coins, config.earningRate.maxCoinsPerOrder);

  return coins;
}

/**
 * Calculate maximum promo coins that can be used for an order
 * @param orderValue Order total in INR
 * @param availableCoins User's available promo coins for this store
 * @param config Optional custom config
 * @returns Maximum number of coins that can be used
 */
export function calculateMaxPromoCoinsUsage(
  orderValue: number,
  availableCoins: number,
  config: PromoCoinsConfig = DEFAULT_PROMO_COINS_CONFIG
): number {
  if (!config.enabled || availableCoins < config.redemption.minRedemptionAmount) {
    return 0;
  }

  // Calculate max coins based on order value percentage
  const maxByPercentage = Math.floor(
    (orderValue * config.redemption.maxUsagePercentage) / 100
  );

  // Return the minimum of available coins and max allowed
  return Math.min(availableCoins, maxByPercentage);
}

/**
 * Convert promo coins to INR value
 * @param coins Number of promo coins
 * @param config Optional custom config
 * @returns Value in INR
 */
export function convertCoinsToINR(
  coins: number,
  config: PromoCoinsConfig = DEFAULT_PROMO_COINS_CONFIG
): number {
  return coins * config.redemption.conversionRate;
}

/**
 * Get expiry date for promo coins
 * @param config Optional custom config
 * @returns Expiry date or undefined if no expiry
 */
export function getCoinsExpiryDate(
  config: PromoCoinsConfig = DEFAULT_PROMO_COINS_CONFIG
): Date | undefined {
  if (!config.expiry.enabled || config.expiry.expiryDays === 0) {
    return undefined;
  }

  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + config.expiry.expiryDays);
  return expiryDate;
}

/**
 * Get the tier multiplier for promo coin earning
 * @param tier Subscription tier name
 * @returns Multiplier value (1.0 for free tier)
 */
export function getTierMultiplier(tier: string = 'free'): number {
  const normalizedTier = tier.toLowerCase();
  return TIER_PROMO_COIN_MULTIPLIERS[normalizedTier] || TIER_PROMO_COIN_MULTIPLIERS.free;
}

/**
 * Calculate promo coins with tier bonus applied
 * @param orderValue Order total in INR
 * @param tier User's subscription tier
 * @param config Optional custom config
 * @returns Number of promo coins to be awarded (with tier bonus)
 */
export function calculatePromoCoinsWithTierBonus(
  orderValue: number,
  tier: string = 'free',
  config: PromoCoinsConfig = DEFAULT_PROMO_COINS_CONFIG
): number {
  const baseCoins = calculatePromoCoinsEarned(orderValue, config);
  const multiplier = getTierMultiplier(tier);

  // Apply tier multiplier and floor the result
  const bonusCoins = Math.floor(baseCoins * multiplier);

  // Still respect the max coins per order limit
  return Math.min(bonusCoins, config.earningRate.maxCoinsPerOrder);
}

