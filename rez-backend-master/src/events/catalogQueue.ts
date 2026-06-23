/**
 * Catalog Queue — BullMQ-backed durable catalog event dispatcher
 *
 * WHY: Product CRUD, stock changes, category updates, and menu mutations currently
 * run inline in merchant route handlers. Cache invalidation, search index updates,
 * and aggregator sync happen synchronously in the HTTP request path. If any of these
 * fail, the product state is inconsistent across systems.
 *
 * STRATEGY: Strangler Fig (Phase A — shadow/dual mode)
 *   - Merchant route handlers continue to do direct DB writes (the "source of truth")
 *   - This queue runs in parallel, handling async side effects:
 *     • Cache invalidation (Redis product/category caches)
 *     • Search index updates (future Typesense/Elasticsearch)
 *     • Aggregator sync (Swiggy/Zomato menu push)
 *     • Analytics (product lifecycle events)
 *   - Phase B: move all side effects exclusively to this queue
 *   - Phase C: extract into `rez-catalog-service` process
 */

import { Queue, Worker, Job } from 'bullmq';
import { bullmqRedis } from '../config/bullmq-connection';
import { createServiceLogger } from '../config/logger';
import { attachFailureHandler } from '../config/bullmqFailureHandler';

const logger = createServiceLogger('catalog-queue');

export const CATALOG_QUEUE_NAME = 'catalog-events';

// ── Event types ────────────────────────────────────────────────────────────────

export type CatalogEventType =
  | 'product.created'
  | 'product.updated'
  | 'product.deleted'
  | 'product.stock_changed'
  | 'product.eighty_sixed'
  | 'product.bulk_imported'
  | 'category.updated'
  | 'menu.updated';

export interface CatalogEvent {
  eventId: string;
  eventType: CatalogEventType;
  merchantId: string;
  storeId?: string;
  payload: {
    productId?: string;
    categoryId?: string;
    menuId?: string;
    productName?: string;
    changes?: Record<string, any>;
    stockDelta?: number;
    previousStock?: number;
    newStock?: number;
    bulkCount?: number;
    [key: string]: any;
  };
  createdAt: string;
}

// ── Queue (producer side) ─────────────────────────────────────────────────────

let _queue: Queue | null = null;

function getCatalogQueue(): Queue {
  if (!_queue) {
    _queue = new Queue(CATALOG_QUEUE_NAME, {
      connection: bullmqRedis,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { age: 24 * 3600 },
        removeOnFail: { age: 7 * 24 * 3600 },
      },
    });
    _queue.on('error', (err) => {
      logger.error('[CatalogQueue] Queue error: ' + err.message);
    });
  }
  return _queue;
}

/**
 * Publish a catalog event to the durable BullMQ queue.
 * Fail-open — never blocks the calling HTTP handler.
 */
export async function publishCatalogEvent(event: CatalogEvent): Promise<void> {
  try {
    const queue = getCatalogQueue();
    await queue.add(event.eventType, event, {
      jobId: event.eventId,
    });
  } catch (err: any) {
    logger.warn('[CatalogQueue] Failed to enqueue event (fail-open):', {
      eventType: event.eventType,
      productId: event.payload.productId,
      error: err.message,
    });
  }
}

// ── Worker (consumer side) ────────────────────────────────────────────────────

let _worker: Worker | null = null;

/**
 * Start the BullMQ catalog worker.
 * Handles async side effects for catalog mutations.
 */
export function startCatalogWorker(): Worker {
  if (_worker) return _worker;

  _worker = new Worker(
    CATALOG_QUEUE_NAME,
    async (job: Job<CatalogEvent>) => {
      const event = job.data;

      logger.debug('[CatalogWorker] Processing event', {
        type: event.eventType,
        merchantId: event.merchantId,
        productId: event.payload.productId,
        attempt: job.attemptsMade,
      });

      const errors: string[] = [];

      // 1. Cache invalidation — clear stale product/category caches
      try {
        const redisService = (await import('../services/redisService')).default;
        const keysToInvalidate: string[] = [];

        if (event.payload.productId) {
          keysToInvalidate.push(`product:${event.payload.productId}`);
        }
        if (event.payload.categoryId) {
          keysToInvalidate.push(`category:${event.payload.categoryId}`);
        }
        if (event.storeId) {
          keysToInvalidate.push(`products:store:${event.storeId}`);
        }
        // Always invalidate listing caches on mutations
        keysToInvalidate.push('products:list', 'products:featured', 'products:trending');

        for (const key of keysToInvalidate) {
          await redisService.del(key);
        }
      } catch (err: any) {
        errors.push(`cache:${err.message}`);
      }

      // 2. Product analytics tracking
      try {
        if (['product.created', 'product.updated', 'product.deleted'].includes(event.eventType)) {
          const { publishAnalyticsEvent } = await import('./analyticsQueue');
          await publishAnalyticsEvent({
            eventId: `catalog-analytics:${event.eventId}`,
            eventType: 'visit_event',
            userId: event.merchantId,
            data: {
              entityId: event.payload.productId,
              entityType: 'product',
              storeId: event.storeId,
              category: event.eventType,
              metadata: { catalogAction: event.eventType },
            },
            createdAt: event.createdAt,
          } as any);
        }
      } catch (err: any) {
        errors.push(`analytics:${err.message}`);
      }

      // 3. Stock alert — notify merchant if stock is critically low
      try {
        if (event.eventType === 'product.stock_changed' && event.payload.newStock !== undefined) {
          if (event.payload.newStock <= (event.payload.lowStockThreshold || 5)) {
            const { publishNotificationEvent } = await import('./notificationQueue');
            await publishNotificationEvent({
              eventId: `stock-alert:${event.eventId}`,
              eventType: 'catalog.low_stock_alert',
              userId: event.merchantId,
              channels: ['push', 'in_app'],
              payload: {
                title: 'Low Stock Alert',
                body: `${event.payload.productName || 'A product'} is running low (${event.payload.newStock} left)`,
                data: {
                  productId: event.payload.productId,
                  currentStock: event.payload.newStock,
                },
              },
              category: 'inventory',
              source: 'system' as const,
              createdAt: event.createdAt,
            });
          }
        }
      } catch (err: any) {
        errors.push(`stock-alert:${err.message}`);
      }

      // 4. Aggregator sync — push menu changes to Swiggy/Zomato
      // TODO(Phase C): Create AggregatorSyncService that pushes to delivery aggregator APIs.
      // This is deferred to Phase C because it requires:
      //   a) Aggregator API credentials per merchant (stored in MerchantIntegration model)
      //   b) Per-aggregator rate limiting (Swiggy: 10 req/min, Zomato: 5 req/min)
      //   c) Menu format translation layer (REZ catalog schema → aggregator schema)
      // When ready, uncomment and wire:
      //   const { aggregatorSyncService } = await import('../services/AggregatorSyncService');
      //   await aggregatorSyncService.syncProduct(event.merchantId, event.payload.productId, event.eventType);
      try {
        if (
          ['product.created', 'product.updated', 'product.deleted', 'product.eighty_sixed', 'menu.updated'].includes(
            event.eventType,
          )
        ) {
          logger.debug('[CatalogWorker] Aggregator sync pending Phase C service', {
            eventType: event.eventType,
            productId: event.payload.productId,
            merchantId: event.merchantId,
          });
        }
      } catch (err: any) {
        errors.push(`aggregator:${err.message}`);
      }

      if (errors.length > 0) {
        logger.warn('[CatalogWorker] Some handlers failed', {
          eventId: event.eventId,
          errors,
        });
      }
    },
    {
      connection: bullmqRedis,
      concurrency: 10,
      limiter: {
        max: 200,
        duration: 1000,
      },
    },
  );
  attachFailureHandler(_worker, CATALOG_QUEUE_NAME);

  _worker.on('completed', (job) => {
    logger.debug('[CatalogWorker] Job completed', { jobId: job.id, type: job.name });
  });

  _worker.on('failed', (job, err) => {
    logger.error('[CatalogWorker] Job failed', {
      jobId: job?.id,
      type: job?.name,
      error: err.message,
      attempts: job?.attemptsMade,
    });
  });

  _worker.on('error', (err) => {
    logger.error('[CatalogWorker] Worker error: ' + err.message);
  });

  logger.info('[CatalogWorker] Started — processing queue: ' + CATALOG_QUEUE_NAME);
  return _worker;
}

/**
 * Gracefully close queue and worker connections.
 */
export async function closeCatalogQueue(): Promise<void> {
  await Promise.allSettled([_worker?.close(), _queue?.close()]);
  _worker = null;
  _queue = null;
}
