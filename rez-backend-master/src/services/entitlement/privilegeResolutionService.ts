/**
 * Privilege Resolution Service
 *
 * Single source of truth for a user's combined entitlements across:
 * - Subscription tier (free / premium / vip)
 * - Prive membership tier (none / entry / signature / elite)
 * - Zone verifications (student, corporate, etc.)
 *
 * Results are cached in Redis (5 min TTL) and invalidated on tier/status changes.
 */

import { Types } from 'mongoose';
import subscriptionBenefitsService from '../subscriptionBenefitsService';
import { priveMultiplierService } from '../priveMultiplierService';
import PriveAccess from '../../models/PriveAccess';
import UserZoneVerification from '../../models/UserZoneVerification';
import redisService from '../redisService';
import { logger } from '../../config/logger';

const CACHE_TTL = 300; // 5 minutes
const CACHE_PREFIX = 'privileges';

// ============================================================================
// Types
// ============================================================================

export interface UserPrivileges {
  subscriptionTier: 'free' | 'premium' | 'vip';
  cashbackMultiplier: number;
  hasFreeDelivery: boolean;
  hasEarlyFlashSale: boolean;
  hasExclusiveDeals: boolean;
  priveTier: 'none' | 'entry' | 'signature' | 'elite';
  priveCoinMultiplier: number;
  activeZones: string[];
  resolvedAt: number; // timestamp for staleness checks
}

const DEFAULT_PRIVILEGES: UserPrivileges = {
  subscriptionTier: 'free',
  cashbackMultiplier: 1,
  hasFreeDelivery: false,
  hasEarlyFlashSale: false,
  hasExclusiveDeals: false,
  priveTier: 'none',
  priveCoinMultiplier: 1.0,
  activeZones: [],
  resolvedAt: 0,
};

// ============================================================================
// Service
// ============================================================================

class PrivilegeResolutionService {

  /**
   * Resolve a user's full privilege snapshot.
   * Returns cached result if available, otherwise fetches from DB and caches.
   */
  async resolve(userId: string): Promise<UserPrivileges> {
    const cacheKey = `${CACHE_PREFIX}:${userId}`;

    // Try cache first
    try {
      const cached = await redisService.get<UserPrivileges>(cacheKey);
      if (cached) return cached;
    } catch {
      // Redis unavailable — continue with DB fetch
    }

    // Parallel fetch all entitlement dimensions
    const [cashbackMultiplier, priveResult, zones] = await Promise.all([
      subscriptionBenefitsService.getCashbackMultiplier(userId).catch(() => 1),
      priveMultiplierService.getMultiplier(userId).catch(() => ({ multiplier: 1.0, tier: 'none' })),
      UserZoneVerification.find({
        userId: new Types.ObjectId(userId),
        status: 'approved',
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
      }).select('verificationType').lean().catch(() => []),
    ]);

    // Fetch subscription for boolean benefits (getCashbackMultiplier only returns multiplier number)
    let subscriptionTier: UserPrivileges['subscriptionTier'] = 'free';
    let hasFreeDelivery = false;
    let hasEarlyFlashSale = false;
    let hasExclusiveDeals = false;

    try {
      const sub = await subscriptionBenefitsService.getUserSubscription(userId);
      if (sub && ['active', 'trial', 'grace_period'].includes(sub.status)) {
        subscriptionTier = (sub.tier as UserPrivileges['subscriptionTier']) || 'free';
        hasFreeDelivery = sub.benefits?.freeDelivery ?? false;
        hasEarlyFlashSale = sub.benefits?.earlyFlashSaleAccess ?? false;
        hasExclusiveDeals = sub.benefits?.exclusiveDeals ?? false;
      }
    } catch {
      // Subscription fetch failed — use defaults
    }

    const result: UserPrivileges = {
      subscriptionTier,
      cashbackMultiplier,
      hasFreeDelivery,
      hasEarlyFlashSale,
      hasExclusiveDeals,
      priveTier: (priveResult.tier as UserPrivileges['priveTier']) || 'none',
      priveCoinMultiplier: priveResult.multiplier,
      activeZones: (zones as Array<{ verificationType: string }>).map(z => z.verificationType),
      resolvedAt: Date.now(),
    };

    // Cache result (fire-and-forget)
    redisService.set(cacheKey, result, CACHE_TTL).catch((err) => logger.warn('[PrivilegeResolution] Cache set for resolved privileges failed', { error: err.message }));

    return result;
  }

  /**
   * Invalidate cached privileges for a user.
   * Call this after subscription upgrade/cancel, Prive grant/revoke, or zone approval.
   */
  async invalidate(userId: string): Promise<void> {
    try {
      await redisService.del(`${CACHE_PREFIX}:${userId}`);
      logger.info('[ENTITLEMENT] Privileges invalidated for user:', userId);
    } catch {
      // Redis unavailable — cache will expire naturally via TTL
    }
  }

  /**
   * Resolve with guaranteed fresh data (bypasses cache).
   * Use sparingly — for admin dashboards or audit contexts.
   */
  async resolveFresh(userId: string): Promise<UserPrivileges> {
    await this.invalidate(userId);
    return this.resolve(userId);
  }
}

export const privilegeResolutionService = new PrivilegeResolutionService();
export default privilegeResolutionService;
