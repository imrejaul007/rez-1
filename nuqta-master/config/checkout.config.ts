/**
 * Checkout Configuration
 *
 * Centralized configuration for all checkout-related constants.
 * These values were previously hardcoded throughout the checkout system.
 */

/**
 * Tax rate applied to orders (5%)
 */
export const TAX_RATE = 0.05;

/**
 * Fixed platform fee charged per order (in currency units)
 */
export const PLATFORM_FEE = 2;

/**
 * Maximum percentage of order value that can be paid using REZ coins (100%)
 * REZ coins can cover the entire order amount
 */
export const REZ_COIN_MAX_USAGE_PERCENTAGE = 100;

/**
 * Maximum percentage of order value that can be paid using promo coins (20%)
 * Promo coins are limited to 20% of the remaining order value
 */
export const PROMO_COIN_MAX_USAGE_PERCENTAGE = 20;

/**
 * Maximum percentage of order value that can be paid using store promo coins (30%)
 * Store promo coins are limited to 30% of the remaining order value
 */
export const STORE_PROMO_COIN_MAX_USAGE_PERCENTAGE = 30;

/**
 * Conversion rate for coins to currency (1 coin = 1 currency unit)
 */
export const COIN_CONVERSION_RATE = 1;

/**
 * Checkout configuration object for convenient access to all values
 */
export const CHECKOUT_CONFIG = {
  TAX_RATE,
  PLATFORM_FEE,
  REZ_COIN_MAX_USAGE_PERCENTAGE,
  PROMO_COIN_MAX_USAGE_PERCENTAGE,
  STORE_PROMO_COIN_MAX_USAGE_PERCENTAGE,
  COIN_CONVERSION_RATE,
} as const;

export default CHECKOUT_CONFIG;
