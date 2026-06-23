import type { ActivityEvent } from '../gamificationEventBus';
import { logger } from '../../config/logger';

/**
 * Streak Handler
 *
 * Updates user streaks based on login and activity events.
 */

const EVENT_TO_STREAK_TYPE: Record<string, string> = {
  // Login streak
  login: 'login',
  daily_checkin: 'login',
  // Order streak
  order_placed: 'order',
  order_delivered: 'order',
  // Review streak
  review_submitted: 'review',
  // Savings streak — ANY saving action counts
  store_payment_confirmed: 'savings',
  bill_payment_confirmed: 'savings',
  bill_uploaded: 'savings',
  deal_locked: 'savings',
  cashback_earned: 'savings',
};

export function registerStreakHandler(eventBus: any): void {
  eventBus.onAll(async (event: ActivityEvent) => {
    const streakType = EVENT_TO_STREAK_TYPE[event.type];
    if (!streakType) return;

    try {
      const streakService = (await import('../../services/streakService')).default;

      if (streakService && typeof streakService.updateStreak === 'function') {
        await streakService.updateStreak(event.userId, streakType as 'login' | 'order' | 'review' | 'savings');
      }
    } catch (error) {
      logger.error(`[STREAK HANDLER] Error processing ${event.type} for user ${event.userId}:`, error);
    }
  });

  logger.info('[STREAK HANDLER] Registered streak handler');
}
