import type GamificationEventBus from '../gamificationEventBus';
import type { ActivityEvent } from '../gamificationEventBus';
import achievementEngine from '../../services/achievementEngine';
import { EVENT_TO_METRICS } from '../../config/achievementMetrics';
import { logger } from '../../config/logger';

/**
 * Achievement Progress Handler
 *
 * Listens to all gamification events and updates achievement progress
 * for the affected user. Only evaluates achievements that track the
 * metrics affected by the event type.
 */
export function registerAchievementHandler(eventBus: any): void {
  const bus = eventBus as any;

  bus.onAll(async (event: ActivityEvent) => {
    const affectedMetrics = EVENT_TO_METRICS[event.type];
    if (!affectedMetrics || affectedMetrics.length === 0) return;

    try {
      // Compute metrics for this event type
      const metrics = await achievementEngine.computeMetricsForEvent(
        event.userId,
        event.type
      );

      if (Object.keys(metrics).length === 0) return;

      // Process the metric update through the achievement engine
      const result = await achievementEngine.processMetricUpdate(
        event.userId,
        metrics,
        event.data.metadata
      );

      if (result.unlocked.length > 0) {
        logger.info(`[ACHIEVEMENT HANDLER] User ${event.userId} unlocked: ${result.unlocked.join(', ')}`);
      }
    } catch (error) {
      logger.error(`[ACHIEVEMENT HANDLER] Error processing ${event.type} for user ${event.userId}:`, error);
    }
  });

  logger.info('[ACHIEVEMENT HANDLER] Registered achievement progress handler');
}
