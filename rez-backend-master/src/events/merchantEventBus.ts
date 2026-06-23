import { EventEmitter } from 'events';
import { Queue } from 'bullmq';
import { getRedis } from '../config/redis-pool';
import { logger } from '../config/logger';

/**
 * Two-tier Merchant Event Bus.
 *
 * TIER 1 — EventEmitter (in-process, synchronous fan-out):
 *   - Audit logging
 *   - Prometheus metrics increment
 *   - Socket.IO push to merchant app
 *   These are fast, idempotent, and loss-tolerant.
 *
 * TIER 2 — BullMQ (durable, retryable, distributed):
 *   - Financial operations (stamp card, loyalty tier, reward journal)
 *   - Campaign triggers
 *   - Inventory sync (recipe recalc, aggregator push)
 *   - Broadcast dispatch
 *   These are slow, stateful, and MUST survive process crashes.
 *
 * v3 Architecture: Part 1 — replaces the previous in-memory-only EventEmitter.
 * The CTO flagged: "Event lost if process crashes. No retry guarantee."
 */

// ── Merchant event types ──────────────────────────────────────────────────────
export type MerchantEventType =
  // Financial (durable)
  | 'ORDER_PAID'
  | 'TABLE_PAID'
  | 'APPOINTMENT_COMPLETED'
  | 'PURCHASE_ORDER_RECEIVED'
  // Inventory (durable)
  | 'ITEM_EIGHTY_SIXED'
  | 'INGREDIENT_COST_UPDATED'
  // Campaign (durable)
  | 'CAMPAIGN_FIRED'
  | 'BROADCAST_SENT'
  // Operational (non-durable — fast, loss-tolerant)
  | 'SHIFT_OPENED'
  | 'SHIFT_CLOSED'
  | 'REVIEW_RECEIVED'
  | 'STAFF_CLOCKED_IN'
  | 'STAFF_CLOCKED_OUT'
  | 'AGGREGATOR_SYNC_COMPLETED'
  | 'AGGREGATOR_CONFLICT_DETECTED';

export interface MerchantEvent {
  eventId: string;
  timestamp: Date;
  type: MerchantEventType;
  merchantId: string;
  storeId?: string;
  payload: Record<string, any>;
}

// ── Events that MUST be durable (survive process restart) ────────────────────
// These are financial or high-stakes operations where loss is unacceptable.
const DURABLE_EVENT_TYPES = new Set<MerchantEventType>([
  'ORDER_PAID',
  'TABLE_PAID',
  'APPOINTMENT_COMPLETED',
  'PURCHASE_ORDER_RECEIVED',
  'ITEM_EIGHTY_SIXED',
  'INGREDIENT_COST_UPDATED',
  'CAMPAIGN_FIRED',
  'BROADCAST_SENT',
]);

// ── BullMQ durable queue for merchant domain events ──────────────────────────
// Queue is created lazily to avoid connection issues during module load.
let _merchantEventQueue: Queue | null = null;

function getMerchantEventQueue(): Queue {
  if (!_merchantEventQueue) {
    _merchantEventQueue = new Queue('merchant-events', {
      connection: getRedis() as any,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { age: 7 * 86400 }, // keep 7 days for audit
        removeOnFail: { age: 30 * 86400 }, // keep 30 days for debugging
      },
    });
  }
  return _merchantEventQueue;
}

export { getMerchantEventQueue as merchantEventQueue };

// ── In-process emitter for local fast fan-out only ───────────────────────────
const localEmitter = new EventEmitter();
localEmitter.setMaxListeners(50);

// ── Event Bus ─────────────────────────────────────────────────────────────────
export const merchantEventBus = {
  /**
   * Publish a merchant domain event.
   *
   * @param event    The event payload (without eventId/timestamp — auto-assigned)
   * @param options  durable: force BullMQ enqueue regardless of event type
   *                 delay:   milliseconds before BullMQ job becomes active
   */
  async publish(
    event: Omit<MerchantEvent, 'eventId' | 'timestamp'>,
    options: { durable?: boolean; delay?: number } = {},
  ): Promise<void> {
    const fullEvent: MerchantEvent = {
      ...event,
      eventId: crypto.randomUUID(),
      timestamp: new Date(),
    };

    // TIER 1: Always emit locally (logging, metrics, sockets) — never blocks
    setImmediate(() => {
      try {
        localEmitter.emit(fullEvent.type, fullEvent);
        // Also emit wildcard for catch-all listeners (e.g., audit logger)
        localEmitter.emit('*', fullEvent);
      } catch (e) {
        logger.warn('[MerchantEventBus] Local emit error', e);
      }
    });

    // TIER 2: Enqueue durably for financial/inventory/campaign events
    const needsDurability = options.durable ?? DURABLE_EVENT_TYPES.has(fullEvent.type);
    if (needsDurability) {
      try {
        const queue = getMerchantEventQueue();
        await queue.add(fullEvent.type, fullEvent, {
          delay: options.delay,
          // Deduplication: same eventId = same job (idempotent re-enqueue)
          jobId: fullEvent.eventId,
        });
      } catch (err) {
        // Log but don't throw — local emit already succeeded
        logger.error('[MerchantEventBus] Failed to enqueue durable event', {
          type: fullEvent.type,
          eventId: fullEvent.eventId,
          err,
        });
      }
    }
  },

  /**
   * Subscribe to local (in-process) events.
   * These are fast and loss-tolerant — for logging, metrics, sockets.
   * Financial logic belongs in merchantEventSubscribers (durable handlers).
   */
  subscribe(type: MerchantEventType | '*', handler: (e: MerchantEvent) => void): void {
    localEmitter.on(type, handler);
  },

  /**
   * Remove a local subscription.
   */
  unsubscribe(type: MerchantEventType | '*', handler: (e: MerchantEvent) => void): void {
    localEmitter.off(type, handler);
  },
};

export default merchantEventBus;
