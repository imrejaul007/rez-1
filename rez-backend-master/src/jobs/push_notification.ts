/**
 * push_notification job handler
 *
 * Consumed by the 'notifications' BullMQ worker.
 * Enqueued by:
 *   - adminBroadcastRoutes (platform-wide admin broadcasts)
 *   - notificationManagement (template-based admin sends)
 *
 * Job data shape:
 *   { userId, title, body, data?, channelId?, source?, audience? }
 */

import pushNotificationService from '../services/pushNotificationService';
import { logger } from '../config/logger';

interface PushNotificationJobData {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channelId?: string;
  source?: string;
  audience?: string;
}

export default async function push_notification(jobData: PushNotificationJobData): Promise<boolean> {
  const { userId, title, body, data, channelId, source } = jobData;

  if (!userId || !title || !body) {
    logger.warn('[push_notification] Missing required fields — skipping', { userId, title });
    return false;
  }

  try {
    const sent = await pushNotificationService.sendPushToUser(userId, {
      title,
      body,
      data: data ?? {},
      channelId: channelId ?? 'promotions',
      sound: 'default',
      priority: 'high',
    });

    if (!sent) {
      logger.debug('[push_notification] User has no push tokens', { userId, source });
    }

    return sent;
  } catch (err: any) {
    logger.error('[push_notification] Failed', { userId, source, error: err.message });
    throw err; // rethrow so BullMQ retries on transient failures
  }
}
