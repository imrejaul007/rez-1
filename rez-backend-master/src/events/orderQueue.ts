/**
 * Order Queue — BullMQ-backed durable order lifecycle event dispatcher
 *
 * WHY: Order lifecycle events (placed, confirmed, shipped, delivered, cancelled)
 * currently trigger inline side effects in controller handlers: SMS, email,
 * push notifications, merchant socket updates, analytics. These run in the HTTP
 * request path. If any side effect fails or is slow, it degrades order response time.
 *
 * STRATEGY: Strangler Fig (Phase A — shadow/dual mode)
 *   - Controllers continue to do direct DB writes + existing notification calls
 *   - This queue runs in parallel, providing a unified order event stream:
 *     • Merchant dashboard real-time updates (socket.io)
 *     • Delivery tracking status changes
 *     • Order analytics (conversion, fulfillment times)
 *     • Customer notification orchestration
 *   - Phase B: move all side effects exclusively to this queue
 *   - Phase C: extract into `rez-order-service` process with Saga coordinator
 */

import { Queue, Worker, Job } from 'bullmq';
import { bullmqRedis } from '../config/bullmq-connection';
import { createServiceLogger } from '../config/logger';
import { attachFailureHandler } from '../config/bullmqFailureHandler';

const logger = createServiceLogger('order-queue');

export const ORDER_QUEUE_NAME = 'order-events';

// ── Event types ────────────────────────────────────────────────────────────────

export type OrderEventType =
  | 'order.placed'
  | 'order.confirmed'
  | 'order.preparing'
  | 'order.ready'
  | 'order.shipped'
  | 'order.out_for_delivery'
  | 'order.delivered'
  | 'order.cancelled'
  | 'order.refunded'
  | 'order.payment_confirmed'
  | 'order.status_changed';

export interface OrderEvent {
  eventId: string;
  eventType: OrderEventType;
  userId: string;
  merchantId?: string;
  storeId?: string;
  payload: {
    orderId: string;
    orderNumber?: string;
    previousStatus?: string;
    newStatus?: string;
    amount?: number;
    items?: Array<{ productId: string; name: string; quantity: number; price: number }>;
    deliveryAddress?: Record<string, any>;
    cancelReason?: string;
    refundAmount?: number;
    [key: string]: any;
  };
  createdAt: string;
}

// ── Queue (producer side) ─────────────────────────────────────────────────────

let _queue: Queue | null = null;

function getOrderQueue(): Queue {
  if (!_queue) {
    _queue = new Queue(ORDER_QUEUE_NAME, {
      connection: bullmqRedis,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { age: 48 * 3600 }, // 48h — orders need longer audit trail
        removeOnFail: { age: 14 * 24 * 3600 }, // 14 days for failed order events
      },
    });
    _queue.on('error', (err) => {
      logger.error('[OrderQueue] Queue error: ' + err.message);
    });
  }
  return _queue;
}

/**
 * Publish an order event to the durable BullMQ queue.
 * Fail-open — never blocks the calling HTTP handler.
 */
export async function publishOrderEvent(event: OrderEvent): Promise<void> {
  try {
    const queue = getOrderQueue();
    await queue.add(event.eventType, event, {
      jobId: event.eventId,
    });
  } catch (err: any) {
    logger.warn('[OrderQueue] Failed to enqueue event (fail-open):', {
      eventType: event.eventType,
      orderId: event.payload.orderId,
      error: err.message,
    });
  }
}

// ── Worker (consumer side) ────────────────────────────────────────────────────

let _worker: Worker | null = null;

/**
 * Start the BullMQ order worker.
 * Handles async side effects for order lifecycle events.
 */
export function startOrderWorker(): Worker | null {
  if (process.env.DISABLE_ORDER_WORKER === 'true') {
    logger.info('[OrderQueue] Monolith worker disabled — standalone rez-order-service handles events');
    return null;
  }

  if (_worker) return _worker;

  _worker = new Worker(
    ORDER_QUEUE_NAME,
    async (job: Job<OrderEvent>) => {
      const event = job.data;

      logger.debug('[OrderWorker] Processing event', {
        type: event.eventType,
        orderId: event.payload.orderId,
        userId: event.userId,
        attempt: job.attemptsMade,
      });

      const errors: string[] = [];

      // 1. Order analytics — track lifecycle events for conversion/fulfillment metrics
      try {
        const { publishAnalyticsEvent } = await import('./analyticsQueue');
        await publishAnalyticsEvent({
          eventId: `order-analytics:${event.eventId}`,
          eventType: 'visit_event',
          userId: event.userId,
          data: {
            entityId: event.payload.orderId,
            entityType: 'order',
            amount: event.payload.amount,
            storeId: event.storeId,
            category: event.eventType,
            metadata: {
              orderNumber: event.payload.orderNumber,
              status: event.payload.newStatus,
            },
          },
          createdAt: event.createdAt,
        } as any);
      } catch (err: any) {
        errors.push(`analytics:${err.message}`);
      }

      // 2. Merchant dashboard cache — invalidate order counts/revenue caches
      try {
        if (event.merchantId) {
          const redisService = (await import('../services/redisService')).default;
          await redisService.del(`merchant:orders:${event.merchantId}`);
          await redisService.del(`merchant:revenue:${event.merchantId}`);
          if (event.storeId) {
            await redisService.del(`store:orders:${event.storeId}`);
          }
        }
      } catch (err: any) {
        errors.push(`cache:${err.message}`);
      }

      // 3. Customer order history cache invalidation
      try {
        const redisService = (await import('../services/redisService')).default;
        await redisService.del(`user:orders:${event.userId}`);
        await redisService.del(`user:recent-orders:${event.userId}`);
      } catch (err: any) {
        errors.push(`user-cache:${err.message}`);
      }

      // 4. Delivery tracking — update delivery status aggregation
      try {
        if (['order.shipped', 'order.out_for_delivery', 'order.delivered'].includes(event.eventType)) {
          logger.debug('[OrderWorker] Delivery tracking update', {
            orderId: event.payload.orderId,
            status: event.payload.newStatus,
          });
          // BUG-007 FIX: Phase B stub documented for future implementation
          // DeliveryTrackingService will:
          // - Track real-time delivery status updates
          // - Integrate with delivery aggregator APIs (Shiprocket, Delhivery, etc.)
          // - Update customer notifications on status changes
          // Expected timeline: Phase B (2-3 days estimated effort)
          // Status: PENDING — awaiting DeliveryTrackingService implementation
        }
      } catch (err: any) {
        errors.push(`delivery:${err.message}`);
      }

      // 5. Order completion — trigger merchant settlement calculation
      try {
        if (event.eventType === 'order.delivered' && event.merchantId) {
          logger.debug('[OrderWorker] Settlement trigger for delivered order', {
            orderId: event.payload.orderId,
            merchantId: event.merchantId,
            amount: event.payload.amount,
          });
          // BUG-008 FIX: Phase B stub documented for future implementation
          // SettlementService will:
          // - Calculate payout amount (order total - platform fee - chargebacks)
          // - Execute merchant payouts (daily/weekly batch settlement)
          // - Generate settlement reports and reconciliation ledgers
          // - Handle GST calculation and tax compliance
          // Expected timeline: Phase B (2-3 days estimated effort)
          // Status: PENDING — awaiting SettlementService implementation
        }
      } catch (err: any) {
        errors.push(`settlement:${err.message}`);
      }

      // 6. Cancellation handling — trigger refund orchestration
      try {
        if (event.eventType === 'order.cancelled' && event.payload.refundAmount && event.payload.refundAmount > 0) {
          const { refundOrchestratorService } = await import('../services/RefundOrchestratorService');
          await refundOrchestratorService.processRefund({
            userId: event.userId,
            paymentId: event.payload.paymentId || event.payload.orderId,
            requestedAmount: event.payload.refundAmount,
            reason: event.payload.cancelReason || 'order_cancelled',
            idempotencyKey: `cancel-refund:${event.eventId}`,
            refundType: 'full',
            referenceId: event.payload.orderId,
            referenceModel: 'Order',
          });
        }
      } catch (err: any) {
        errors.push(`cancellation:${err.message}`);
      }

      if (errors.length > 0) {
        logger.warn('[OrderWorker] Some handlers failed', {
          eventId: event.eventId,
          errors,
        });
      }
    },
    {
      connection: bullmqRedis,
      concurrency: 10,
      limiter: {
        max: 300, // orders are high-priority — allow more throughput
        duration: 1000,
      },
    },
  );
  attachFailureHandler(_worker, ORDER_QUEUE_NAME);

  _worker.on('completed', (job) => {
    logger.debug('[OrderWorker] Job completed', { jobId: job.id, type: job.name });
  });

  _worker.on('failed', (job, err) => {
    logger.error('[OrderWorker] Job failed', {
      jobId: job?.id,
      type: job?.name,
      orderId: (job?.data as OrderEvent)?.payload?.orderId,
      error: err.message,
      attempts: job?.attemptsMade,
    });
  });

  _worker.on('error', (err) => {
    logger.error('[OrderWorker] Worker error: ' + err.message);
  });

  logger.info('[OrderWorker] Started — processing queue: ' + ORDER_QUEUE_NAME);
  return _worker;
}

/**
 * Gracefully close queue and worker connections.
 */
export async function closeOrderQueue(): Promise<void> {
  await Promise.allSettled([_worker?.close(), _queue?.close()]);
  _worker = null;
  _queue = null;
}
