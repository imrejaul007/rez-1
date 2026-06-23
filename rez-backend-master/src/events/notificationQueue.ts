/**
 * Notification Queue — BullMQ-backed durable notification dispatcher
 *
 * WHY: Notification dispatch (push, SMS, email, WhatsApp) currently runs
 * in-process via QueueService. This queue provides a unified entry point
 * for ALL notification channels, enabling:
 *   1. Durable dispatch — survives process crashes
 *   2. Channel-aware routing — single event triggers the right channel(s)
 *   3. Extraction readiness — this queue becomes the notification microservice's inbound queue
 *
 * STRATEGY: Strangler Fig (Phase A — shadow/dual mode)
 *   - Existing QueueService push/email/sms queues continue to work as-is
 *   - This queue runs in parallel, processing the same events through a unified pipeline
 *   - Phase B: disable legacy QueueService notification paths, route all through here
 *   - Phase C: extract worker into `rez-notification-service` process
 */

import { Queue, Worker, Job } from 'bullmq';
import { bullmqRedis } from '../config/bullmq-connection';
import { createServiceLogger } from '../config/logger';
import { attachFailureHandler } from '../config/bullmqFailureHandler';

const logger = createServiceLogger('notification-queue');

export const NOTIFICATION_QUEUE_NAME = 'notification-events';

// ── Event types ────────────────────────────────────────────────────────────────

export type NotificationChannel = 'push' | 'email' | 'sms' | 'whatsapp' | 'in_app';

export interface NotificationEvent {
  /** Unique event ID for idempotency (e.g. `order-confirmed:<orderId>`) */
  eventId: string;
  /** Notification type key (maps to templates) */
  eventType: string;
  /** Target user ID */
  userId: string;
  /** Channels to deliver on (if empty, channel selection is automatic) */
  channels?: NotificationChannel[];
  /** Notification payload */
  payload: {
    title: string;
    body: string;
    data?: Record<string, any>;
    /** Push-specific */
    channelId?: string;
    priority?: 'default' | 'normal' | 'high';
    /** Email-specific */
    emailSubject?: string;
    emailHtml?: string;
    emailTemplateId?: string;
    emailTemplateData?: Record<string, any>;
    /** SMS-specific */
    smsMessage?: string;
    /** WhatsApp-specific */
    whatsappTemplateId?: string;
    whatsappTemplateVars?: unknown[];
  };
  /** Notification category for grouping and user preference checks */
  category?: string;
  /** Source system (for audit trail) */
  source?: 'system' | 'admin' | 'automated' | 'campaign' | 'merchant';
  /** Timestamp when event was created */
  createdAt: string;
}

// ── Queue (producer side) ───────────────────────────────────────────────────

let _queue: Queue | null = null;

export function getNotificationQueue(): Queue {
  if (!_queue) {
    _queue = new Queue(NOTIFICATION_QUEUE_NAME, {
      connection: bullmqRedis,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { age: 3600, count: 5000 }, // 1 hour / max 5k entries
        removeOnFail: { age: 7 * 24 * 3600 }, // 7 days for inspection
      },
    });
    _queue.on('error', (err) => {
      logger.error('[NotificationQueue] Queue error: ' + err.message);
    });
  }
  return _queue;
}

/**
 * Publish a notification event to the durable BullMQ queue.
 * Validates required fields at entry point.
 * Fail-open: if Redis/queue is unavailable, logs and returns without throwing.
 */
export async function publishNotificationEvent(event: NotificationEvent): Promise<void> {
  try {
    // Validate required fields
    if (!event.eventId || typeof event.eventId !== 'string' || event.eventId.trim() === '') {
      logger.error('[NotificationQueue] Invalid eventId', { event });
      return;
    }
    if (!event.userId || typeof event.userId !== 'string' || event.userId.trim() === '') {
      logger.error('[NotificationQueue] Invalid userId', { event });
      return;
    }

    const queue = getNotificationQueue();
    await queue.add(event.eventType, event, {
      jobId: event.eventId, // deduplication — same eventId is silently ignored
    });
    logger.info('[NotificationQueue] Event published', {
      eventId: event.eventId,
      eventType: event.eventType,
      userId: event.userId,
      channels: event.channels,
    });
  } catch (err: any) {
    // Fail-open: notification queue failure must not break the calling flow
    logger.error('[NotificationQueue] Publish failed (non-fatal)', {
      eventId: event.eventId,
      error: err.message,
    });
  }
}

// ── Worker (consumer side) ──────────────────────────────────────────────────

export function startNotificationWorker(): Worker | null {
  if (process.env.DISABLE_NOTIFICATION_WORKER === 'true') {
    logger.info('[NotificationQueue] Monolith worker disabled — standalone rez-notification-events handles events');
    return null;
  }

  const worker = new Worker(
    NOTIFICATION_QUEUE_NAME,
    async (job: Job<NotificationEvent>) => {
      const event = job.data;
      const channels = event.channels || ['in_app'];

      logger.info('[NotificationWorker] Processing', {
        eventId: event.eventId,
        eventType: event.eventType,
        userId: event.userId,
        channels,
      });

      // ── Event-type pre-processing ──────────────────────────────────────────
      // Enrich logging and validate brand-specific context before channel dispatch.
      if (event.eventType === 'branded_coin_expired') {
        const { brandName, coinsExpired, merchantId } = (event.payload.data ?? {}) as {
          brandName?: string;
          coinsExpired?: number;
          merchantId?: string;
        };
        logger.info('[NotificationWorker] branded_coin_expired — brand context', {
          userId: event.userId,
          brandName: brandName ?? 'unknown',
          coinsExpired: coinsExpired ?? 0,
          merchantId: merchantId ?? null,
          // merchantId enables the notification consumer to deep-link to the merchant page
          deepLinkAvailable: !!merchantId,
        });
      }

      // Route to appropriate channel handlers
      const results: Record<string, string> = {};

      for (const channel of channels) {
        try {
          switch (channel) {
            case 'push': {
              const pushService = (await import('../services/pushNotificationService')).default;
              await pushService.sendPushToUser(event.userId, {
                title: event.payload.title,
                body: event.payload.body,
                data: event.payload.data,
                channelId: event.payload.channelId,
                priority: event.payload.priority,
              });
              results.push = 'sent';
              break;
            }

            case 'email': {
              const { EmailService } = await import('../services/EmailService');
              if (event.payload.emailSubject) {
                await EmailService.send({
                  to: event.payload.data?.email || '',
                  subject: event.payload.emailSubject,
                  html: event.payload.emailHtml,
                  templateId: event.payload.emailTemplateId,
                  dynamicTemplateData: event.payload.emailTemplateData,
                });
                results.email = 'sent';
              } else {
                results.email = 'skipped:no-subject';
              }
              break;
            }

            case 'sms': {
              const { SMSService } = await import('../services/SMSService');
              const smsText = event.payload.smsMessage || event.payload.body;
              const rawPhone = event.payload.data?.phone;

              // Validate and sanitize phone number
              if (!rawPhone || typeof rawPhone !== 'string') {
                results.sms = 'skipped:invalid-phone-type';
                break;
              }

              const phone = String(rawPhone).replace(/[^\d+]/g, '');
              if (!phone || phone.length < 10) {
                results.sms = 'skipped:invalid-phone-format';
                break;
              }

              if (phone && smsText) {
                await SMSService.send({ to: phone, message: smsText });
                results.sms = 'sent';
              } else {
                results.sms = 'skipped:no-phone-or-message';
              }
              break;
            }

            case 'whatsapp': {
              const { whatsAppMarketingService } = await import('../services/WhatsAppMarketingService');
              const waPhone = event.payload.data?.phone;

              // Validate template variables
              const templateVars = event.payload.whatsappTemplateVars as unknown[];
              if (templateVars && !Array.isArray(templateVars)) {
                results.whatsapp = 'skipped:invalid-template-variables';
                break;
              }

              if (waPhone) {
                await whatsAppMarketingService.sendTemplate({
                  to: waPhone,
                  templateName: event.payload.whatsappTemplateId || 'generic_notification',
                  languageCode: 'en',
                  components: templateVars
                    ? [
                        {
                          type: 'body',
                          parameters: templateVars.filter((v) => v !== undefined).map((v) => ({ text: String(v) })),
                        },
                      ]
                    : [],
                  campaignId: event.eventId,
                  merchantId: event.payload.data?.merchantId || '',
                } as any);
                results.whatsapp = 'sent';
              } else {
                results.whatsapp = 'skipped:no-phone';
              }
              break;
            }

            case 'in_app': {
              // In-app notifications are already handled by NotificationService.createNotification()
              // (which persists to MongoDB + emits via Socket.IO). The queue handles delivery channels only.
              results.in_app = 'handled-by-caller';
              break;
            }

            default:
              results[channel] = 'unknown-channel';
          }
        } catch (channelErr: any) {
          logger.error(`[NotificationWorker] Channel ${channel} failed`, {
            eventId: event.eventId,
            channel,
            error: channelErr.message,
          });
          results[channel] = `failed:${channelErr.message}`;
        }
      }

      logger.info('[NotificationWorker] Completed', {
        eventId: event.eventId,
        results,
      });

      return results;
    },
    {
      connection: bullmqRedis,
      concurrency: 10,
      limiter: {
        max: 200,
        duration: 1000, // max 200 notifications/second
      },
    },
  );
  attachFailureHandler(worker, NOTIFICATION_QUEUE_NAME);

  worker.on('failed', (job, err) => {
    logger.error('[NotificationWorker] Job failed', {
      jobId: job?.id,
      eventId: (job?.data as NotificationEvent)?.eventId,
      error: err.message,
      attemptsMade: job?.attemptsMade,
    });
  });

  worker.on('error', (err) => {
    logger.error('[NotificationWorker] Worker error: ' + err.message);
  });

  logger.info('[NotificationWorker] Started (concurrency=10, rate=200/s)');
  return worker;
}

// ── Graceful shutdown ───────────────────────────────────────────────────────

export async function closeNotificationQueue(): Promise<void> {
  if (_queue) {
    await _queue.close();
    _queue = null;
  }
}
