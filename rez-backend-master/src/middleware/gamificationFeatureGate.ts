import { Request, Response, NextFunction } from 'express';
import { featureFlagService } from '../services/featureFlagService';
import { sendSuccess } from '../utils/response';

/**
 * Legacy feature name → DB flag key mapping.
 * Routes call requireGamificationFeature('miniGames', ...) which maps to
 * the FeatureFlag DB key 'games.mini_games' (or falls back to the hardcoded config).
 */
const FEATURE_KEY_MAP: Record<string, string> = {
  coins: 'gamification.coins',
  streaks: 'gamification.streaks',
  dailyCheckin: 'gamification.daily_checkin',
  bonusZones: 'gamification.bonus_zones',
  achievements: 'gamification.achievements',
  challenges: 'gamification.challenges',
  leaderboard: 'gamification.leaderboard',
  activityFeed: 'gamification.activity_feed',
  miniGames: 'games.mini_games',
  badges: 'gamification.badges',
  tournaments: 'gamification.tournaments',
  affiliate: 'gamification.affiliate',
};

// Re-export GamificationFeature type for backwards compatibility
export type GamificationFeature = keyof typeof FEATURE_KEY_MAP;

/**
 * Route-level middleware that short-circuits with 200 + empty data
 * when a gamification feature is disabled in the FeatureFlag DB.
 *
 * Uses featureFlagService (DB-backed, cached 60s) instead of
 * the old hardcoded config. Falls open if the flag doesn't exist
 * in the DB (feature stays enabled).
 */
export function requireGamificationFeature(
  feature: GamificationFeature,
  emptyResponse: Record<string, any> = {},
) {
  const flagKey = FEATURE_KEY_MAP[feature] || `gamification.${feature}`;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const context = {
        userId: (req as any).userId as string | undefined,
        city: (req as any).user?.profile?.location?.city
          || (req.headers['x-rez-region'] as string | undefined),
      };

      const enabled = await featureFlagService.isEnabled(flagKey, context);

      if (!enabled) {
        return sendSuccess(res, emptyResponse);
      }

      next();
    } catch {
      // Fail-open: don't block requests if flag service is down
      next();
    }
  };
}
