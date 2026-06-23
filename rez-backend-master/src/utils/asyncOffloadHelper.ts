/**
 * ISSUE #8: Async Work Offload Helper
 *
 * Converts blocking async operations in request handlers to fire-and-forget queue jobs.
 * Prevents slow external service calls from blocking HTTP response times.
 *
 * Patterns supported:
 * - Push notifications
 * - Analytics event tracking
 * - Email sending
 * - SMS sending
 * - Reward updates / coin issuance
 * - Review request sends
 * - Reminders / Scheduling
 *
 * All jobs are enqueued with non-blocking error handling.
 */

import { logger } from '../config/logger';
import {
  notificationQueue,
  analyticsQueue,
  emailQueue,
  smsQueue,
  rewardQueue,
  integrationQueue,
} from '../config/bullmq-queues';

/**
 * Fire-and-forget push notification
 * Non-critical, safe to fail silently
 */
export async function offloadPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>,
): Promise<void> {
  try {
    await notificationQueue.add('send-push', { userId, title, body, data }, { priority: 5, attempts: 2 });
  } catch (err) {
    logger.warn('[AsyncOffload] Failed to enqueue push notification:', err);
    // Don't throw — queue failures shouldn't block request
  }
}

/**
 * Fire-and-forget analytics event tracking
 * Lowest priority — analytics failures don't affect user experience
 */
export async function offloadAnalyticsEvent(
  userId: string,
  eventType: string,
  properties?: Record<string, any>,
): Promise<void> {
  try {
    await analyticsQueue.add(
      'track-event',
      { userId, eventType, properties, timestamp: new Date().toISOString() },
      { priority: 1, attempts: 1 },
    );
  } catch (err) {
    logger.warn('[AsyncOffload] Failed to enqueue analytics event:', err);
  }
}

/**
 * Fire-and-forget merchant notification
 * Non-critical notifications — merchants can catch up later
 */
export async function offloadMerchantNotification(
  merchantId: string,
  type: string,
  title: string,
  message: string,
  data?: Record<string, any>,
): Promise<void> {
  try {
    await notificationQueue.add(
      'notify-merchant',
      { merchantId, type, title, message, data },
      { priority: 4, attempts: 3 },
    );
  } catch (err) {
    logger.warn('[AsyncOffload] Failed to enqueue merchant notification:', err);
  }
}

/**
 * Fire-and-forget email send
 * Transactional emails are queued for delivery
 */
export async function offloadEmail(
  to: string,
  subject: string,
  template: string,
  data?: Record<string, any>,
): Promise<void> {
  try {
    await emailQueue.add('send-email', { to, subject, template, data }, { priority: 6, attempts: 3 });
  } catch (err) {
    logger.warn('[AsyncOffload] Failed to enqueue email:', err);
  }
}

/**
 * Fire-and-forget SMS send (OTP, alerts, notifications)
 * Higher priority than email
 */
export async function offloadSMS(phone: string, message: string, type: string = 'notification'): Promise<void> {
  try {
    await smsQueue.add('send-sms', { phone, message, type }, { priority: 7, attempts: 4 });
  } catch (err) {
    logger.warn('[AsyncOffload] Failed to enqueue SMS:', err);
  }
}

/**
 * Fire-and-forget reward / coin issuance
 * Critical but can be retried — enqueue with medium priority
 */
export async function offloadRewardIssuance(
  userId: string,
  amount: number,
  reason: string,
  metadata?: Record<string, any>,
): Promise<void> {
  try {
    await rewardQueue.add(
      'issue-coins',
      { userId, amount, reason, metadata, timestamp: new Date().toISOString() },
      { priority: 8, attempts: 4 },
    );
  } catch (err) {
    logger.warn('[AsyncOffload] Failed to enqueue coin issuance:', err);
  }
}

/**
 * Fire-and-forget review request send
 * Non-critical follow-up — can be retried
 */
export async function offloadReviewRequest(
  userId: string,
  orderId: string,
  storeId: string,
  delayMs: number = 0,
): Promise<void> {
  try {
    await notificationQueue.add(
      'send-review-request',
      { userId, orderId, storeId },
      {
        priority: 3,
        attempts: 2,
        delay: delayMs, // Delay by N ms before delivery (e.g., 24h = 86400000)
      },
    );
  } catch (err) {
    logger.warn('[AsyncOffload] Failed to enqueue review request:', err);
  }
}

/**
 * Fire-and-forget reminder scheduling
 * Schedule reminders (appointment, payment due, etc.)
 */
export async function offloadReminder(
  userId: string,
  reminderType: string,
  metadata: Record<string, any>,
  fireAtMs: number, // Unix timestamp in milliseconds
): Promise<void> {
  try {
    const delay = Math.max(0, fireAtMs - Date.now());
    await notificationQueue.add(
      'send-reminder',
      { userId, reminderType, metadata },
      {
        priority: 5,
        attempts: 2,
        delay,
      },
    );
  } catch (err) {
    logger.warn('[AsyncOffload] Failed to enqueue reminder:', err);
  }
}

/**
 * Fire-and-forget webhook call
 * Third-party integrations — can retry on failure
 */
export async function offloadWebhookCall(
  url: string,
  payload: Record<string, any>,
  method: string = 'POST',
): Promise<void> {
  try {
    await integrationQueue.add('call-webhook', { url, payload, method }, { priority: 5, attempts: 3 });
  } catch (err) {
    logger.warn('[AsyncOffload] Failed to enqueue webhook call:', err);
  }
}

/**
 * Fire-and-forget coin expiry notification
 * Reminder for users when coins are about to expire
 */
export async function offloadCoinExpiryNotification(
  userId: string,
  expiringCoins: Array<{ amount: number; expiresAt: string }>,
): Promise<void> {
  try {
    await notificationQueue.add('coin-expiry-reminder', { userId, expiringCoins }, { priority: 5, attempts: 2 });
  } catch (err) {
    logger.warn('[AsyncOffload] Failed to enqueue coin expiry notification:', err);
  }
}

/**
 * Batch offload multiple async operations
 * Useful when creating/updating complex entities
 */
export async function offloadBatch(
  operations: Array<{
    type: 'push' | 'email' | 'sms' | 'analytics' | 'reward' | 'notification';
    params: Record<string, any>;
  }>,
): Promise<void> {
  const batches = {
    push: [] as any[],
    email: [] as any[],
    sms: [] as any[],
    analytics: [] as any[],
    reward: [] as any[],
    notification: [] as any[],
  };

  // Group operations by type
  for (const op of operations) {
    batches[op.type].push(op.params);
  }

  // Enqueue each type in parallel
  const promises = [];

  if (batches.push.length > 0) {
    promises.push(
      notificationQueue
        .addBulk(
          batches.push.map((p) => ({
            name: 'send-push',
            data: p,
            opts: { priority: 5, attempts: 2 },
          })),
        )
        .catch((err) => logger.warn('[AsyncOffload] Batch push failed:', err)),
    );
  }

  if (batches.email.length > 0) {
    promises.push(
      emailQueue
        .addBulk(
          batches.email.map((p) => ({
            name: 'send-email',
            data: p,
            opts: { priority: 6, attempts: 3 },
          })),
        )
        .catch((err) => logger.warn('[AsyncOffload] Batch email failed:', err)),
    );
  }

  if (batches.sms.length > 0) {
    promises.push(
      smsQueue
        .addBulk(
          batches.sms.map((p) => ({
            name: 'send-sms',
            data: p,
            opts: { priority: 7, attempts: 4 },
          })),
        )
        .catch((err) => logger.warn('[AsyncOffload] Batch SMS failed:', err)),
    );
  }

  if (batches.analytics.length > 0) {
    promises.push(
      analyticsQueue
        .addBulk(
          batches.analytics.map((p) => ({
            name: 'track-event',
            data: p,
            opts: { priority: 1, attempts: 1 },
          })),
        )
        .catch((err) => logger.warn('[AsyncOffload] Batch analytics failed:', err)),
    );
  }

  if (batches.reward.length > 0) {
    promises.push(
      rewardQueue
        .addBulk(
          batches.reward.map((p) => ({
            name: 'issue-coins',
            data: p,
            opts: { priority: 8, attempts: 4 },
          })),
        )
        .catch((err) => logger.warn('[AsyncOffload] Batch reward failed:', err)),
    );
  }

  if (batches.notification.length > 0) {
    promises.push(
      notificationQueue
        .addBulk(
          batches.notification.map((p) => ({
            name: 'notify-merchant',
            data: p,
            opts: { priority: 4, attempts: 3 },
          })),
        )
        .catch((err) => logger.warn('[AsyncOffload] Batch notification failed:', err)),
    );
  }

  await Promise.all(promises);
}

export default {
  offloadPushNotification,
  offloadAnalyticsEvent,
  offloadMerchantNotification,
  offloadEmail,
  offloadSMS,
  offloadRewardIssuance,
  offloadReviewRequest,
  offloadReminder,
  offloadWebhookCall,
  offloadCoinExpiryNotification,
  offloadBatch,
};
