// @ts-nocheck
/**
 * Job Queue Configuration
 *
 * Initializes Bull/BullMQ queues for:
 * - Email delivery
 * - SMS delivery
 * - Push notifications
 * - Webhook delivery
 * - Order processing
 *
 * Usage in server.ts:
 * ```typescript
 * const jobQueues = await initializeJobQueues(redis);
 * (app as any).jobQueues = jobQueues;
 * ```
 */

import * as crypto from 'crypto';
import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { logger } from './logger';

// PERF-B9: Default worker concurrency bumped 4 → 10 for I/O-bound queues
// (email, SMS, push, webhook — each job waits on an HTTP call). CPU-bound
// processing (order) stays conservative. Operators can still override via
// JOB_QUEUE_CONCURRENCY env.
const DEFAULT_IO_CONCURRENCY = parseInt(process.env.JOB_QUEUE_CONCURRENCY || '10', 10);
const DEFAULT_CPU_CONCURRENCY = parseInt(process.env.JOB_QUEUE_ORDER_CONCURRENCY || '4', 10);

export interface JobQueueServices {
  email: Queue;
  sms: Queue;
  push: Queue;
  webhook: Queue;
  order: Queue;
}

/**
 * Initialize all job queues
 */
export async function initializeJobQueues(redis: Redis): Promise<JobQueueServices> {
  const queueConfig = {
    connection: redis,
    defaultJobOptions: {
      attempts: parseInt(process.env.JOB_QUEUE_MAX_RETRIES || '5', 10),
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      // BULL-001 FIX: Changed from bare `true` (unbounded Redis accumulation) to
      // `{ count: 100 }` (keep last 100 completed jobs only). A bare `true` means BullMQ
      // retains all completed job data indefinitely — with high-throughput queues this causes
      // unbounded Redis memory growth. The count limit prevents this while still allowing
      // enough history for debugging and manual inspection.
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  };

  // Create queues
  const queues = {
    email: new Queue('email', queueConfig),
    sms: new Queue('sms', queueConfig),
    push: new Queue('push', queueConfig),
    webhook: new Queue('webhook', queueConfig),
    order: new Queue('order', queueConfig),
  };

  // Import service implementations
  const { emailService } = require('../services/emailService');
  const { smsService } = require('../services/smsService');
  const { pushService } = require('../services/pushService');

  // Setup workers/processors
  setupEmailProcessor(redis, emailService);
  setupSmsProcessor(redis, smsService);
  setupPushProcessor(redis, pushService);
  setupWebhookProcessor(redis);
  setupOrderProcessor(redis);

  logger.info('[JobQueues] All queues initialized with processors');

  return queues;
}

/**
 * Email delivery processor
 */
function setupEmailProcessor(redis: Redis, emailService: any) {
  const worker = new Worker(
    'email',
    async (job: Job) => {
      const { to, subject, body, templateId, variables, html } = job.data;

      try {
        logger.info('[Email Queue] Processing email job', { to, subject, attempt: job.attemptsMade });

        // Use email service for delivery
        const result = await emailService.send({
          to,
          subject,
          body,
          html: html || body,
          templateId,
          variables,
        });

        if (!result.success) {
          throw new Error(result.error || 'Email delivery failed');
        }

        return { success: true, messageId: result.messageId };
      } catch (error) {
        logger.error('[Email Queue] Failed to send email', {
          to,
          subject,
          error: error instanceof Error ? error.message : String(error),
          attempt: job.attemptsMade,
        });
        throw error;
      }
    },
    { connection: redis, concurrency: DEFAULT_IO_CONCURRENCY },
  );

  worker.on('completed', (job) => {
    logger.debug('[Email Queue] Job completed', { jobId: job.id });
  });

  worker.on('failed', (job, err) => {
    logger.warn('[Email Queue] Job failed after retries', {
      jobId: job?.id,
      error: err.message,
      attempts: job?.attemptsMade,
    });
  });
}

/**
 * SMS delivery processor
 */
function setupSmsProcessor(redis: Redis, smsService: any) {
  const worker = new Worker(
    'sms',
    async (job: Job) => {
      const { phone, message, templateId, variables } = job.data;

      try {
        logger.info('[SMS Queue] Processing SMS job', { phone: '****' + phone.slice(-4), attempt: job.attemptsMade });

        // Use SMS service for delivery
        const result = await smsService.send({
          phone,
          message,
          templateId,
          variables,
        });

        if (!result.success) {
          throw new Error(result.error || 'SMS delivery failed');
        }

        return { success: true, smsId: result.smsId };
      } catch (error) {
        logger.error('[SMS Queue] Failed to send SMS', {
          phone: '****' + phone.slice(-4),
          error: error instanceof Error ? error.message : String(error),
          attempt: job.attemptsMade,
        });
        throw error;
      }
    },
    { connection: redis, concurrency: DEFAULT_IO_CONCURRENCY },
  );

  worker.on('failed', (job, err) => {
    logger.warn('[SMS Queue] Job failed', { jobId: job?.id, error: err.message });
  });
}

/**
 * Push notification processor
 */
function setupPushProcessor(redis: Redis, pushService: any) {
  const worker = new Worker(
    'push',
    async (job: Job) => {
      const { userId, title, body, data, deepLink } = job.data;

      try {
        logger.info('[Push Queue] Processing push job', { userId, attempt: job.attemptsMade });

        // Use push service for delivery
        const result = await pushService.send({
          userId,
          title,
          body,
          data,
          deepLink,
        });

        if (!result.success) {
          throw new Error(result.error || 'Push delivery failed');
        }

        return { success: true, pushId: result.pushId, sentCount: result.sentCount };
      } catch (error) {
        logger.error('[Push Queue] Failed to send push', {
          userId,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
    { connection: redis, concurrency: DEFAULT_IO_CONCURRENCY },
  );

  worker.on('failed', (job, err) => {
    logger.warn('[Push Queue] Job failed', { jobId: job?.id, error: err.message });
  });
}

/**
 * Webhook delivery processor
 */
function setupWebhookProcessor(redis: Redis) {
  const worker = new Worker(
    'webhook',
    async (job: Job) => {
      const { webhookId, event, payload, url, secret, attempt } = job.data;

      try {
        logger.info('[Webhook Queue] Processing webhook job', {
          webhookId,
          event,
          attempt: job.attemptsMade,
        });

        if (!url || !payload) {
          throw new Error('Webhook job missing url or payload');
        }

        const signature = crypto
          .createHmac('sha256', secret || process.env.WEBHOOK_SECRET || '')
          .update(JSON.stringify(payload))
          .digest('hex');

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-REZ-Signature': `sha256=${signature}`,
            'X-REZ-Webhook-ID': webhookId || '',
            'X-REZ-Event': event || '',
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
          throw new Error(`Webhook delivery failed: ${response.status} ${response.statusText}`);
        }

        logger.info('[Webhook Queue] Webhook delivered successfully', {
          webhookId,
          event,
          status: response.status,
        });

        return { success: true, status: response.status, webhookId, attempt };
      } catch (error) {
        logger.error('[Webhook Queue] Failed to deliver webhook', {
          webhookId,
          event,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
    { connection: redis, concurrency: DEFAULT_IO_CONCURRENCY },
  );

  worker.on('failed', (job, err) => {
    logger.warn('[Webhook Queue] Job failed', { jobId: job?.id, error: err.message });
  });
}

/**
 * Order processing processor
 */
function setupOrderProcessor(redis: Redis) {
  const worker = new Worker(
    'order',
    async (job: Job) => {
      const { orderId, action, metadata } = job.data;

      try {
        logger.info('[Order Queue] Processing order job', { orderId, action, attempt: job.attemptsMade });

        if (!orderId || !action) {
          throw new Error(`Invalid order job data: missing orderId or action`);
        }

        const { Order } = require('../models/Order');
        const pushNotificationService = require('../services/pushNotificationService').default;

        const order = await Order.findById(orderId);
        if (!order) {
          throw new Error(`Order not found: ${orderId}`);
        }

        const phone: string = order.delivery?.address?.phone || '';

        switch (action) {
          case 'confirm':
            if (order.status === 'placed') {
              order.status = 'confirmed';
              await order.save();
              await pushNotificationService.sendPushToUser(String(order.user), {
                title: 'Order Confirmed!',
                body: `Your order #${order.orderNumber} has been confirmed.`,
                data: { type: 'order_confirmed', orderId },
              });
              if (phone) {
                await pushNotificationService.sendOrderConfirmed(
                  {
                    orderId,
                    orderNumber: order.orderNumber,
                    status: order.status,
                  },
                  phone,
                );
              }
            } else {
              logger.warn('[Order Queue] Skipping confirm — order not in placed status', {
                orderId,
                currentStatus: order.status,
              });
            }
            break;

          case 'notify_ready':
            if (phone) {
              await pushNotificationService.sendOrderUpdate(
                order.orderNumber,
                phone,
                'Order Ready!',
                `Your order #${order.orderNumber} is ready for pickup/dispatch.`,
              );
            }
            await pushNotificationService.sendPushToUser(String(order.user), {
              title: 'Order Ready!',
              body: `Your order #${order.orderNumber} is ready.`,
              data: { type: 'order_ready', orderId },
            });
            break;

          default:
            logger.warn(`[Order Queue] Unknown action: ${action}`, { orderId });
        }

        return { success: true, orderId, action, processedAt: new Date().toISOString() };
      } catch (error) {
        logger.error('[Order Queue] Failed to process order', {
          orderId,
          action,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
    { connection: redis, concurrency: DEFAULT_CPU_CONCURRENCY },
  );

  worker.on('failed', (job, err) => {
    logger.warn('[Order Queue] Job failed', { jobId: job?.id, error: err.message });
  });
}

/**
 * Get queue status
 */
export async function getQueueStatus(queues: JobQueueServices) {
  const status: Record<string, any> = {};

  for (const [name, queue] of Object.entries(queues)) {
    const counts = await queue.getJobCounts();
    status[name] = counts;
  }

  return status;
}
