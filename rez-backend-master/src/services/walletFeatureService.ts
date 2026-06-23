import FeatureFlag from '../models/FeatureFlag';
import { createServiceLogger } from '../config/logger';
import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';

const logger = createServiceLogger('wallet-features');

// Cache: in-memory with TTL (avoids Redis dependency for feature checks)
let flagCache: Map<string, { enabled: boolean; cachedAt: number }> = new Map();
const CACHE_TTL_MS = 60 * 1000; // 1 minute

// Wallet feature flag keys
export const WALLET_FEATURES = {
  TRANSFERS: 'wallet.transfers.enabled',
  GIFTS: 'wallet.gifts.enabled',
  GIFT_CARDS: 'wallet.gift_cards.enabled',
  WITHDRAWALS: 'wallet.withdrawals.enabled',
  RECHARGE: 'wallet.recharge.enabled',
  PARTNER_EARNINGS: 'wallet.partner_earnings.enabled',
  PARTNER_CLAIMS: 'wallet.partner_claims.enabled',
} as const;

/**
 * Check if a wallet feature is enabled.
 * Uses in-memory cache with 1-minute TTL.
 */
export async function isWalletFeatureEnabled(featureKey: string): Promise<boolean> {
  // Check cache first
  const cached = flagCache.get(featureKey);
  if (cached && (Date.now() - cached.cachedAt) < CACHE_TTL_MS) {
    return cached.enabled;
  }

  try {
    const flag = await FeatureFlag.findOne({ key: featureKey }).lean();
    const enabled = flag ? flag.enabled : true; // Default to enabled if flag doesn't exist
    flagCache.set(featureKey, { enabled, cachedAt: Date.now() });
    return enabled;
  } catch (error) {
    logger.error('Failed to check feature flag', error, { featureKey });
    return true; // Fail open — don't block operations if flag check fails
  }
}

/**
 * Middleware factory: require a wallet feature to be enabled.
 * Returns 503 Service Unavailable if the feature is disabled.
 */
export function requireWalletFeature(featureKey: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const enabled = await isWalletFeatureEnabled(featureKey);
    if (!enabled) {
      logger.warn('Wallet feature disabled, blocking request', {
        featureKey,
        userId: (req as any).userId,
        path: req.path,
      });
      return sendError(res, 'This feature is temporarily unavailable', 503);
    }
    next();
  };
}

/**
 * Invalidate the feature flag cache (call after admin updates a flag).
 */
export function invalidateFeatureCache(featureKey?: string): void {
  if (featureKey) {
    flagCache.delete(featureKey);
  } else {
    flagCache.clear();
  }
}

/**
 * Seed default wallet feature flags if they don't exist.
 * Call once during server startup.
 */
export async function seedWalletFeatureFlags(): Promise<void> {
  const flags = [
    { key: WALLET_FEATURES.TRANSFERS, label: 'Wallet Transfers', group: 'wallet', enabled: true, sortOrder: 1 },
    { key: WALLET_FEATURES.GIFTS, label: 'Wallet Gifts', group: 'wallet', enabled: true, sortOrder: 2 },
    { key: WALLET_FEATURES.GIFT_CARDS, label: 'Gift Cards', group: 'wallet', enabled: true, sortOrder: 3 },
    { key: WALLET_FEATURES.WITHDRAWALS, label: 'Wallet Withdrawals', group: 'wallet', enabled: true, sortOrder: 4 },
    { key: WALLET_FEATURES.RECHARGE, label: 'Wallet Recharge', group: 'wallet', enabled: true, sortOrder: 5 },
    { key: WALLET_FEATURES.PARTNER_EARNINGS, label: 'Partner Earnings Summary', group: 'wallet', enabled: true, sortOrder: 6 },
    { key: WALLET_FEATURES.PARTNER_CLAIMS, label: 'Partner Reward Claims', group: 'wallet', enabled: true, sortOrder: 7 },
  ];

  for (const flag of flags) {
    await FeatureFlag.findOneAndUpdate(
      { key: flag.key },
      { $setOnInsert: flag },
      { upsert: true }
    );
  }
  logger.info('Wallet feature flags seeded');
}
