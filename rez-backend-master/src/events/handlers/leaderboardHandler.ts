import type { ActivityEvent } from '../gamificationEventBus';
import redisService from '../../services/redisService';
import { logger } from '../../config/logger';

/**
 * Leaderboard Handler
 *
 * Invalidates relevant leaderboard cache entries when
 * activity events occur that could affect rankings.
 * The actual leaderboard is recomputed by the refresh job.
 */

// Events that can affect leaderboard rankings
const LEADERBOARD_AFFECTING_EVENTS = new Set([
  'order_placed', 'order_delivered',
  'review_submitted',
  'referral_completed',
  'game_won',
  'daily_checkin',
  'bill_uploaded',
  'social_share'
]);

export function registerLeaderboardHandler(eventBus: any): void {
  eventBus.onAll(async (event: ActivityEvent) => {
    if (!LEADERBOARD_AFFECTING_EVENTS.has(event.type)) return;

    try {
      // Invalidate the user's cached rank (if we have per-user rank cache)
      const cacheKey = `leaderboard:user-rank:${event.userId}`;
      await redisService.del(cacheKey);
    } catch (error) {
      // Cache invalidation is best-effort
      logger.error(`[LEADERBOARD HANDLER] Cache invalidation error:`, error);
    }
  });

  logger.info('[LEADERBOARD HANDLER] Registered leaderboard handler');
}
