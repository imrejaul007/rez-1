import { eventStreamService } from '../../services/eventStreamService';
import type { ActivityEvent } from '../gamificationEventBus';
import { logger } from '../../config/logger';

/**
 * Analytics stream handler — persists gamification events to AnalyticsEvent collection
 * for warehouse export. Listens to all events and maps relevant ones to analytics types.
 */
export function registerAnalyticsStreamHandler(eventBus: { onAll: (handler: (event: ActivityEvent) => Promise<void> | void) => void }): void {
  eventBus.onAll(async (event: ActivityEvent) => {
    await eventStreamService.handleEvent(event);
  });

  logger.info('[ANALYTICS STREAM] Handler registered');
}
