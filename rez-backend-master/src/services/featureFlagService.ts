import FeatureFlag, { IFeatureFlag, FeatureFlagScope } from '../models/FeatureFlag';
import { createServiceLogger } from '../config/logger';

const logger = createServiceLogger('feature-flags');

// ─── Types ───────────────────────────────────────────────

export interface FlagContext {
  userId?: string;
  city?: string;
}

interface CachedFlag {
  enabled: boolean;
  scope: FeatureFlagScope;
  configJson: Record<string, any>;
  cachedAt: number;
}

// ─── In-memory cache (same pattern as walletFeatureService) ──

const flagCache = new Map<string, CachedFlag>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute

// ─── Service ─────────────────────────────────────────────

class FeatureFlagService {
  /**
   * Check if a flag is enabled for the given context.
   * Fail-open: returns true if flag doesn't exist or on error.
   */
  async isEnabled(flagKey: string, context?: FlagContext): Promise<boolean> {
    const flag = await this.getCachedFlag(flagKey);

    // Flag doesn't exist → fail-open
    if (!flag) return true;

    // Flag globally disabled
    if (!flag.enabled) return false;

    // Check scope
    return this.evaluateScope(flag, context);
  }

  /**
   * Get a flag's config (for frontend/controller config needs).
   */
  async getFlag(flagKey: string): Promise<{ enabled: boolean; configJson: Record<string, any> } | null> {
    const flag = await this.getCachedFlag(flagKey);
    if (!flag) return null;
    return { enabled: flag.enabled, configJson: flag.configJson };
  }

  /**
   * Get all flags evaluated for a user context (for frontend bulk fetch).
   * Returns a map of flagKey → { enabled, config }.
   */
  async getEnabledFlags(context?: FlagContext): Promise<Record<string, { enabled: boolean; config: Record<string, any> }>> {
    try {
      const flags = await FeatureFlag.find({}).lean() as any[];
      const result: Record<string, { enabled: boolean; config: Record<string, any> }> = {};

      for (const flag of flags) {
        const enabled = flag.enabled && this.evaluateScope({
          enabled: flag.enabled,
          scope: flag.scope || 'global',
          configJson: flag.configJson || {},
          cachedAt: 0,
        }, context);

        result[flag.key] = {
          enabled,
          config: flag.configJson || {},
        };

        // Warm the cache while we're at it
        flagCache.set(flag.key, {
          enabled: flag.enabled,
          scope: flag.scope || 'global',
          configJson: flag.configJson || {},
          cachedAt: Date.now(),
        });
      }

      return result;
    } catch (error) {
      logger.error('Failed to fetch all flags', error as Error);
      return {};
    }
  }

  /**
   * Invalidate cache for a specific flag or all flags.
   */
  invalidateCache(flagKey?: string): void {
    if (flagKey) {
      flagCache.delete(flagKey);
    } else {
      flagCache.clear();
    }
  }

  // ─── Private helpers ─────────────────────────────────

  private async getCachedFlag(flagKey: string): Promise<CachedFlag | null> {
    const cached = flagCache.get(flagKey);
    if (cached && (Date.now() - cached.cachedAt) < CACHE_TTL_MS) {
      return cached;
    }

    try {
      const flag = await FeatureFlag.findOne({ key: flagKey }).lean() as unknown as IFeatureFlag | null;
      if (!flag) return null;

      const entry: CachedFlag = {
        enabled: flag.enabled,
        scope: (flag.scope as FeatureFlagScope) || 'global',
        configJson: flag.configJson || {},
        cachedAt: Date.now(),
      };
      flagCache.set(flagKey, entry);
      return entry;
    } catch (error) {
      logger.error('Failed to fetch feature flag', error as Error, { flagKey });
      return null; // Fail-open handled by caller
    }
  }

  private evaluateScope(flag: CachedFlag, context?: FlagContext): boolean {
    switch (flag.scope) {
      case 'global':
        return true;

      case 'city': {
        const cities: string[] | undefined = flag.configJson?.cities;
        if (!cities || cities.length === 0) return true; // No cities restriction → enabled for all
        if (!context?.city) return false; // City-scoped but no city in context
        return cities.some((c) => c.toLowerCase() === context.city!.toLowerCase());
      }

      case 'user': {
        const userIds: string[] | undefined = flag.configJson?.userIds;
        if (!userIds || userIds.length === 0) return false; // User-scoped but no allowlist → disabled
        if (!context?.userId) return false;
        return userIds.includes(context.userId);
      }

      default:
        return true;
    }
  }

  /**
   * Seed default feature flags into the DB if they don't already exist.
   * Uses $setOnInsert so existing flags (with admin-modified values) are not overwritten.
   * Called once on server startup.
   */
  async seedDefaultFlags(): Promise<void> {
    const defaults: Array<Pick<IFeatureFlag, 'key' | 'label' | 'group' | 'enabled'>> = [
      // Games
      { key: 'games.mini_games', label: 'Mini Games (Spin/Scratch/Quiz)', group: 'games', enabled: true },
      { key: 'games.spin_wheel', label: 'Spin Wheel', group: 'games', enabled: true },
      { key: 'games.scratch_card', label: 'Scratch Card', group: 'games', enabled: true },
      { key: 'games.quiz', label: 'Quiz Game', group: 'games', enabled: true },
      { key: 'games.memory_match', label: 'Memory Match', group: 'games', enabled: true },
      // Gamification
      { key: 'gamification.coins', label: 'Coins on Purchase', group: 'gamification', enabled: true },
      { key: 'gamification.streaks', label: 'Daily Streaks', group: 'gamification', enabled: true },
      { key: 'gamification.daily_checkin', label: 'Daily Check-in', group: 'gamification', enabled: true },
      { key: 'gamification.bonus_zones', label: 'Bonus Zones', group: 'gamification', enabled: true },
      { key: 'gamification.achievements', label: 'Achievements', group: 'gamification', enabled: true },
      { key: 'gamification.challenges', label: 'Challenges', group: 'gamification', enabled: true },
      { key: 'gamification.leaderboard', label: 'Leaderboard', group: 'gamification', enabled: true },
      { key: 'gamification.activity_feed', label: 'Activity Feed', group: 'gamification', enabled: true },
      { key: 'gamification.badges', label: 'Badges', group: 'gamification', enabled: true },
      { key: 'gamification.tournaments', label: 'Tournaments', group: 'gamification', enabled: true },
      { key: 'gamification.affiliate', label: 'Affiliate Program', group: 'gamification', enabled: true },
    ];

    const bulkOps: any[] = defaults.map(flag => ({
      updateOne: {
        filter: { key: flag.key },
        update: {
          $setOnInsert: { ...flag, scope: 'global', configJson: {}, sortOrder: 0, metadata: {} },
        },
        upsert: true,
      },
    }));

    try {
      await FeatureFlag.bulkWrite(bulkOps, { ordered: false });
      logger.info(`Feature flags seeded: ${defaults.length} flags`);
    } catch (error) {
      logger.error('Failed to seed feature flags', error as Error);
    }
  }
}

export const featureFlagService = new FeatureFlagService();
export default featureFlagService;
