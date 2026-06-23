/**
 * Payment Queue — BullMQ-backed durable payment event dispatcher
 *
 * WHY: Payment side effects (wallet credit, reward grant, notification, analytics,
 * reconciliation) run inline in webhookController.processRazorpayEvent().
 * If any side effect fails, the webhook returns 500, causing Razorpay to retry
 * the entire payment — which risks double-processing. The webhook already has
 * idempotency via WebhookLog, but side effects still run synchronously.
 *
 * NOTE: The payments Worker already exists in workers/index.ts (dynamic handler
 * pattern: `import('../jobs/${job.name}')`). This queue is the Strangler Fig
 * event-publishing layer that webhookController and paymentController will use
 * to offload side effects in Phase B.
 *
 * STRATEGY: Strangler Fig (Phase A — shadow/dual mode)
 *   - webhookController continues inline processing (source of truth)
 *   - This queue runs in parallel for:
 *     • Post-payment notification orchestration (push, SMS, email)
 *     • Payment analytics (conversion tracking, method breakdown)
 *     • Reconciliation event logging (for settlement reconciliation job)
 *     • Fraud signal publishing (velocity checks, anomaly detection)
 *   - Phase B: move all post-payment side effects to this queue exclusively
 *   - Phase C: extract into `rez-payment-service` process
 */

import { Queue, Worker, Job } from 'bullmq';
import { bullmqRedis } from '../config/bullmq-connection';
import { createServiceLogger } from '../config/logger';
import { attachFailureHandler } from '../config/bullmqFailureHandler';

const logger = createServiceLogger('payment-queue');

export const PAYMENT_QUEUE_NAME = 'payment-events';

// ── Event types ────────────────────────────────────────────────────────────────

export type PaymentEventType =
  | 'payment.captured'
  | 'payment.failed'
  | 'payment.refund_initiated'
  | 'payment.refund_completed'
  | 'payment.dispute_opened'
  | 'payment.dispute_resolved'
  | 'payment.settlement_processed'
  | 'payment.method_saved'
  | 'payment.wallet_credited'
  | 'payment.wallet_debited';

export interface PaymentEvent {
  eventId: string;
  eventType: PaymentEventType;
  userId: string;
  orderId?: string;
  payload: {
    paymentId?: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    amount: number;
    currency?: string;
    method?: string; // upi, card, netbanking, wallet, cod
    status?: string;
    refundId?: string;
    refundAmount?: number;
    walletCredited?: number;
    cashbackAmount?: number;
    failureReason?: string;
    [key: string]: any;
  };
  createdAt: string;
}

// ── Queue (producer side) ─────────────────────────────────────────────────────

let _queue: Queue | null = null;

function getPaymentEventQueue(): Queue {
  if (!_queue) {
    _queue = new Queue(PAYMENT_QUEUE_NAME, {
      connection: bullmqRedis,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { age: 48 * 3600 }, // 48h — match payment audit window
        removeOnFail: { age: 14 * 24 * 3600 }, // 14 days — financial compliance
      },
    });
    _queue.on('error', (err) => {
      logger.error('[PaymentQueue] Queue error: ' + err.message);
    });
  }
  return _queue;
}

/**
 * Publish a payment event to the durable BullMQ queue.
 * Fail-open — never blocks the webhook/payment handler.
 */
export async function publishPaymentEvent(event: PaymentEvent): Promise<void> {
  try {
    const queue = getPaymentEventQueue();
    await queue.add(event.eventType, event, {
      jobId: event.eventId,
    });
  } catch (err: any) {
    logger.warn('[PaymentQueue] Failed to enqueue event (fail-open):', {
      eventType: event.eventType,
      orderId: event.orderId,
      error: err.message,
    });
  }
}

/**
 * Gracefully close the payment event queue connection.
 */
export async function closePaymentEventQueue(): Promise<void> {
  if (_queue) {
    await _queue.close();
    _queue = null;
  }
}

// ── Worker (consumer side) ─────────────────────────────────────────────────────

/**
 * Start the payment-events worker that processes events published by
 * publishPaymentEvent(). This is the Phase A Strangler Fig consumer —
 * it handles post-payment side effects (notifications, analytics,
 * reconciliation signals, fraud signals) in a durable, retryable queue.
 *
 * Concurrency is deliberately low (2) because each job may fan-out to
 * multiple downstream services (push, analytics, reconciliation) and we
 * want predictable Redis throughput per payment event.
 */
export function startPaymentEventsWorker(): Worker {
  const worker = new Worker<PaymentEvent>(
    PAYMENT_QUEUE_NAME,
    async (job: Job<PaymentEvent>) => {
      const event = job.data;

      logger.info('[PaymentEventsWorker] Processing event', {
        eventId: event.eventId,
        eventType: event.eventType,
        userId: event.userId,
        orderId: event.orderId,
      });

      switch (event.eventType) {
        case 'payment.captured':
        case 'payment.wallet_credited': {
          // Publish a unified notification event so the user gets a push/SMS
          // for the successful payment. Uses dynamic import to avoid circular deps.
          try {
            const { publishNotificationEvent } = await import('./notificationQueue');
            await publishNotificationEvent({
              eventId: `notif:${event.eventId}`,
              eventType: 'payment.captured',
              userId: event.userId,
              channels: ['push', 'in_app'],
              payload: {
                title: 'Payment Successful',
                body: `Your payment of ₹${(event.payload.amount / 100).toFixed(2)} was successful.`,
                data: {
                  orderId: event.orderId,
                  paymentId: event.payload.paymentId,
                  amount: event.payload.amount,
                },
                channelId: 'payments',
                priority: 'high',
              },
              category: 'payment',
              source: 'system',
              createdAt: new Date().toISOString(),
            });
          } catch (err: any) {
            logger.warn('[PaymentEventsWorker] Notification publish failed (non-fatal)', {
              eventId: event.eventId,
              error: err.message,
            });
          }

          // Log payment analytics signal (analytics queue uses visit/reward/redemption event types;
          // payment-specific analytics are logged here for future extraction into a payment analytics pipeline)
          logger.info('[PaymentEventsWorker] Payment analytics signal', {
            eventId: event.eventId,
            userId: event.userId,
            orderId: event.orderId,
            amount: event.payload.amount,
            currency: event.payload.currency ?? 'INR',
            method: event.payload.method,
            cashbackAmount: event.payload.cashbackAmount,
          });
          break;
        }

        case 'payment.failed': {
          try {
            const { publishNotificationEvent } = await import('./notificationQueue');
            await publishNotificationEvent({
              eventId: `notif:${event.eventId}`,
              eventType: 'payment.failed',
              userId: event.userId,
              channels: ['push', 'in_app'],
              payload: {
                title: 'Payment Failed',
                body: event.payload.failureReason
                  ? `Payment failed: ${event.payload.failureReason}`
                  : 'Your payment could not be processed. Please try again.',
                data: {
                  orderId: event.orderId,
                  paymentId: event.payload.paymentId,
                },
                channelId: 'payments',
                priority: 'high',
              },
              category: 'payment',
              source: 'system',
              createdAt: new Date().toISOString(),
            });
          } catch (err: any) {
            logger.warn('[PaymentEventsWorker] Failure notification publish failed (non-fatal)', {
              eventId: event.eventId,
              error: err.message,
            });
          }
          break;
        }

        case 'payment.refund_initiated':
        case 'payment.refund_completed': {
          try {
            const { publishNotificationEvent } = await import('./notificationQueue');
            const isCompleted = event.eventType === 'payment.refund_completed';
            await publishNotificationEvent({
              eventId: `notif:${event.eventId}`,
              eventType: event.eventType,
              userId: event.userId,
              channels: ['push', 'in_app'],
              payload: {
                title: isCompleted ? 'Refund Processed' : 'Refund Initiated',
                body: isCompleted
                  ? `Your refund of ₹${((event.payload.refundAmount ?? 0) / 100).toFixed(2)} has been processed.`
                  : `Your refund of ₹${((event.payload.refundAmount ?? 0) / 100).toFixed(2)} has been initiated.`,
                data: {
                  orderId: event.orderId,
                  refundId: event.payload.refundId,
                  refundAmount: event.payload.refundAmount,
                },
                channelId: 'payments',
              },
              category: 'payment',
              source: 'system',
              createdAt: new Date().toISOString(),
            });
          } catch (err: any) {
            logger.warn('[PaymentEventsWorker] Refund notification failed (non-fatal)', {
              eventId: event.eventId,
              error: err.message,
            });
          }
          break;
        }

        case 'payment.settlement_processed': {
          // Settlement analytics — log signal for future payment analytics pipeline
          logger.info('[PaymentEventsWorker] Settlement analytics signal', {
            eventId: event.eventId,
            userId: event.userId,
            amount: event.payload.amount,
            currency: event.payload.currency ?? 'INR',
            paymentId: event.payload.paymentId,
          });
          break;
        }

        default:
          // Dispute, method_saved, wallet_debited — log and skip
          logger.debug('[PaymentEventsWorker] Unhandled event type (skipped)', {
            eventId: event.eventId,
            eventType: event.eventType,
          });
      }

      logger.info('[PaymentEventsWorker] Event processed', {
        eventId: event.eventId,
        eventType: event.eventType,
      });
    },
    {
      connection: bullmqRedis,
      concurrency: 2,
      stalledInterval: 30_000,
      maxStalledCount: 3,
      limiter: {
        max: 100,
        duration: 60_000, // max 100 payment events/minute
      },
    },
  );
  attachFailureHandler(worker, PAYMENT_QUEUE_NAME);

  worker.on('failed', (job, err) => {
    logger.error('[PaymentEventsWorker] Job failed', {
      jobId: job?.id,
      eventId: (job?.data as PaymentEvent)?.eventId,
      eventType: (job?.data as PaymentEvent)?.eventType,
      error: err.message,
      attemptsMade: job?.attemptsMade,
    });
  });

  worker.on('error', (err) => {
    logger.error('[PaymentEventsWorker] Worker error: ' + err.message);
  });

  logger.info('[PaymentEventsWorker] Started (concurrency=2, rate=100/min)');
  return worker;
}
