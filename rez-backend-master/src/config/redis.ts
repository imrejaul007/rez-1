/**
 * Redis Configuration
 *
 * Configuration settings for Redis connection and caching
 */

export interface RedisConfig {
  url: string;
  password?: string;
  enabled: boolean;
  maxRetries: number;
  retryDelay: number;
  connectTimeout: number;
  keyPrefix: string;
}

/**
 * Get Redis configuration from environment variables
 */
export const getRedisConfig = (): RedisConfig => {
  return {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD,
    enabled: process.env.CACHE_ENABLED !== 'false', // Default to true
    maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
    retryDelay: parseInt(process.env.REDIS_RETRY_DELAY || '1000', 10),
    connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000', 10),
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'rez:',
  };
};

/**
 * Cache key version prefix (P-14: bump this when cache schema changes
 * to prevent serving stale / incompatible cached data).
 * All cache keys will be prefixed: "v{CACHE_VERSION}:{original_key}"
 */
export const CACHE_VERSION = 1;

/**
 * Cache TTL (Time To Live) constants in seconds
 */
export const CacheTTL = {
  // Product caching
  PRODUCT_DETAIL: 60 * 60, // 1 hour
  PRODUCT_LIST: 30 * 60, // 30 minutes
  PRODUCT_SEARCH: 15 * 60, // 15 minutes
  PRODUCT_FEATURED: 60 * 60, // 1 hour
  PRODUCT_NEW_ARRIVALS: 30 * 60, // 30 minutes
  PRODUCT_RECOMMENDATIONS: 30 * 60, // 30 minutes

  // Category caching
  CATEGORY_LIST: 60 * 60, // 1 hour
  CATEGORY_DETAIL: 60 * 60, // 1 hour

  // Store caching
  STORE_LIST: 30 * 60, // 30 minutes
  STORE_DETAIL: 60 * 60, // 1 hour
  STORE_PRODUCTS: 30 * 60, // 30 minutes

  // Cart caching — short TTL to avoid stale pricing / stock issues
  CART_DATA: 60, // 60 seconds (P-11: reduced from 5 min to prevent stale pricing)
  CART_SUMMARY: 30, // 30 seconds (P-11: reduced from 3 min to prevent stale pricing)

  // User caching — contains PII (P-15: shorter TTL for sensitive data)
  USER_PROFILE: 30, // 30 seconds (P-15: contains PII — name, email, phone)
  USER_ORDERS: 10 * 60, // 10 minutes

  // Offers and vouchers
  OFFER_LIST: 30 * 60, // 30 minutes
  VOUCHER_LIST: 30 * 60, // 30 minutes

  // Static data
  STATIC_DATA: 60 * 60 * 24, // 24 hours

  // Sensitive / PII data — keep very short to limit exposure window (P-15)
  WALLET_DATA: 300, // 5 minutes (invalidated on mutation via walletCacheService)
  SENSITIVE_DATA: 30, // 30 seconds (P-15: generic sensitive-data TTL)

  // Very short-lived cache
  SHORT_CACHE: 60, // 1 minute

  // Gamification caching
  LEADERBOARD: 5 * 60, // 5 minutes
  GAME_CONFIG: 10 * 60, // 10 minutes
  FEATURE_FLAGS: 5 * 60, // 5 minutes
  AVAILABLE_GAMES: 10 * 60, // 10 minutes
  CHALLENGES_ACTIVE: 5 * 60, // 5 minutes

  // Offers page aggregated data
  OFFERS_PAGE_DATA: 5 * 60, // 5 minutes
} as const;

export default {
  getRedisConfig,
  CacheTTL,
};