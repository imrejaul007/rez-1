import type { ActivityEvent } from '../gamificationEventBus';
import { logger } from '../../config/logger';

/**
 * Challenge Progress Handler
 *
 * Maps gamification events to challenge action types and
 * updates UserChallengeProgress atomically using $inc.
 */

const EVENT_TO_CHALLENGE_ACTION: Record<string, string> = {
  order_placed: 'order_count',
  order_delivered: 'order_count',
  review_submitted: 'review_count',
  referral_completed: 'refer_friends',
  login: 'login_streak',
  daily_checkin: 'login_streak',
  bill_uploaded: 'upload_bills',
  social_share: 'share_deals',
  offer_redeemed: 'visit_stores',
  video_created: 'review_count', // Videos count towards content challenges
};

export function registerChallengeHandler(eventBus: any): void {
  eventBus.onAll(async (event: ActivityEvent) => {
    const action = EVENT_TO_CHALLENGE_ACTION[event.type];
    if (!action) return;

    try {
      // Dynamic import to avoid circular deps
      const challengeService = (await import('../../services/challengeService')).default;

      if (challengeService && typeof challengeService.updateProgress === 'function') {
        await challengeService.updateProgress(event.userId, action, 1);
      }
    } catch (error) {
      logger.error(`[CHALLENGE HANDLER] Error processing ${event.type} for user ${event.userId}:`, error);
    }
  });

  logger.info('[CHALLENGE HANDLER] Registered challenge progress handler');
}
