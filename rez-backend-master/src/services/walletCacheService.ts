import { Wallet } from '../models/Wallet';
import { WalletConfig } from '../models/WalletConfig';
import { createServiceLogger } from '../config/logger';
import { walletCacheOps } from '../config/walletMetrics';
import redisService from './redisService';

const logger = createServiceLogger('wallet-cache');

const BALANCE_CACHE_TTL = 300; // 5 minutes (invalidated on every mutation via invalidateWalletCache)
const CONFIG_CACHE_TTL = 300; // 5 minutes

/**
 * Get cached wallet balance. Falls through to DB on cache miss.
 */
export async function getCachedWalletBalance(userId: string): Promise<any> {
  const cacheKey = `wallet:balance:${userId}`;

  try {
    const redis = redisService;
    const cached = await redis.get(cacheKey);
    if (cached) {
      walletCacheOps.inc({ operation: 'balance_read', result: 'hit' });
      return cached;
    }
  } catch (error) {
    logger.error('Cache read error', error, { userId });
  }

  walletCacheOps.inc({ operation: 'balance_read', result: 'miss' });

  // Fall through to DB
  const wallet = await Wallet.findOne({ user: userId }).lean();
  if (!wallet) return null;

  const balanceData = {
    balance: wallet.balance,
    coins: wallet.coins,
    brandedCoins: wallet.brandedCoins,
    statistics: wallet.statistics,
    isFrozen: wallet.isFrozen,
    lastTransactionAt: wallet.lastTransactionAt,
  };

  // Write to cache
  try {
    const redis = redisService;
    await redis.set(cacheKey, balanceData, BALANCE_CACHE_TTL);
  } catch (error) {
    logger.error('Cache write error', error, { userId });
  }

  return balanceData;
}

/**
 * Invalidate wallet balance cache for a user.
 * Call after any balance mutation (transfer, gift, payment, topup, etc.).
 */
export async function invalidateWalletCache(userId: string): Promise<void> {
  const cacheKey = `wallet:balance:${userId}`;
  try {
    const redis = redisService;
    await redis.del(cacheKey);
    walletCacheOps.inc({ operation: 'balance_invalidate', result: 'success' });
  } catch (error) {
    logger.error('Cache invalidation error', error, { userId });
    walletCacheOps.inc({ operation: 'balance_invalidate', result: 'error' });
  }
}

/**
 * Get cached WalletConfig. Falls through to DB on cache miss.
 */
export async function getCachedWalletConfig(): Promise<any> {
  const cacheKey = 'config:wallet';

  try {
    const redis = redisService;
    const cached = await redis.get(cacheKey);
    if (cached) {
      walletCacheOps.inc({ operation: 'config_read', result: 'hit' });
      return cached;
    }
  } catch (error) {
    logger.error('Config cache read error', error);
  }

  walletCacheOps.inc({ operation: 'config_read', result: 'miss' });

  const config = await WalletConfig.getOrCreate();
  const configData = config.toObject ? config.toObject() : config;

  try {
    const redis = redisService;
    await redis.set(cacheKey, configData, CONFIG_CACHE_TTL);
  } catch (error) {
    logger.error('Config cache write error', error);
  }

  return configData;
}

/**
 * Invalidate WalletConfig cache.
 * Call after admin updates the config.
 */
export async function invalidateWalletConfigCache(): Promise<void> {
  const cacheKey = 'config:wallet';
  try {
    const redis = redisService;
    await redis.del(cacheKey);
    walletCacheOps.inc({ operation: 'config_invalidate', result: 'success' });
  } catch (error) {
    logger.error('Config cache invalidation error', error);
    walletCacheOps.inc({ operation: 'config_invalidate', result: 'error' });
  }
}

/**
 * Invalidate partner earnings cache for a user.
 * Call after any partner-tagged CoinTransaction is created.
 */
export async function invalidatePartnerEarningsCache(userId: string): Promise<void> {
  const periods = ['7d', '30d', '90d', 'all'];
  try {
    const redis = redisService;
    for (const period of periods) {
      await redis.del(`partner-earnings:${userId}:${period}`);
    }
    walletCacheOps.inc({ operation: 'partner_earnings_invalidate', result: 'success' });
  } catch (error) {
    logger.error('Partner earnings cache invalidation error', error, { userId });
    walletCacheOps.inc({ operation: 'partner_earnings_invalidate', result: 'error' });
  }
}

/**
 * Invalidate partner earnings config cache.
 * Call after admin updates the partner earnings config.
 */
export async function invalidatePartnerEarningsConfigCache(): Promise<void> {
  try {
    const redis = redisService;
    await redis.del('partner-earnings-config');
    walletCacheOps.inc({ operation: 'partner_config_invalidate', result: 'success' });
  } catch (error) {
    logger.error('Partner config cache invalidation error', error);
    walletCacheOps.inc({ operation: 'partner_config_invalidate', result: 'error' });
  }
}
