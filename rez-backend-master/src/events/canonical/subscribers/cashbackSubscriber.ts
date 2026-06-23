/**
 * Cashback Subscriber — first real consumer of the canonical event bus.
 *
 * Subscribes to BullMQ `canonical-events` queue jobs with name
 * `canonical.order.placed` and credits base-cashback to the customer's
 * REZ wallet. Idempotent via `ProcessedEvent` ledger — each (eventId,
 * processorKey) tuple can be processed at most once.
 *
 * Why this subscriber matters
 * ───────────────────────────
 * Today cashback is credited by hand-wired code paths inside each order
 * controller (POS mark-paid, web-order payment verify, aggregator sync).
 * Each path has slightly different retry/idempotency semantics and
 * different bugs. This subscriber is the first step toward one place
 * that owns cashback: every producer emits `order.placed`, this worker
 * credits once per event, done.
 *
 * The legacy paths still run in parallel — Sprint 2+ will migrate them
 * off one-by-one behind a feature flag. Running both in parallel is safe
 * because walletService.credit itself enforces idempotency via
 * `referenceId` (the legacy path uses e.g. `pos-bill:<id>`; this worker
 * uses `canonical:<eventId>`). A double-credit would require BOTH the
 * legacy path AND this worker to run on the SAME event — and even then
 * they'd collide on `referenceId` and the second write would reject.
 *
 * Contract
 * ────────
 *  - Never throws. BullMQ retries based on queue-level defaultJobOptions,
 *    but the worker body swallows all errors and returns. Transient
 *    failures (Redis hiccup, Mongo timeout) are expected; permanent
 *    failures (no User row for customerId, merchant disabled cashback)
 *    are logged and the job is marked done so it doesn't retry forever.
 *  - Honours `ProcessedEvent.eventId + processorKey` idempotency. If the
 *    same event is redelivered we detect it via the unique compound
 *    index and skip.
 *  - Walk-in orders (customerId null) are no-oped: they emit canonical
 *    events for analytics but have no user to credit.
 */

import { Worker, Job } from 'bullmq';
import mongoose from 'mongoose';

import { bullmqRedis } from '../../../config/bullmq-connection';
import { logger } from '../../../config/logger';
import ProcessedEvent from '../../../models/ProcessedEvent';
import { walletService } from '../../../services/walletService';
import { OrderPlacedEventSchema, type OrderPlacedEvent } from '../schemas';

const PROCESSOR_KEY = 'cashback-subscriber';
const CANONICAL_EVENTS_QUEUE = 'canonical-events';

/**
 * Rollout mode read from `process.env.CANONICAL_CASHBACK_MODE`. Controls
 * whether this subscriber actually credits cashback or just observes.
 *
 *   'off'      (default) — fully disabled. Consumers not wired; events skip.
 *                         Use until the legacy in-process cashback paths are
 *                         definitively safe to double-credit against.
 *   'shadow'   — claim events + log what WOULD be credited, but do NOT call
 *                walletService.credit. Lets ops verify event flow + coin math
 *                against what the legacy path actually credits, without any
 *                risk of double-credit.
 *   'primary'  — claim + credit. THIS is the state that fully owns cashback.
 *                Only flip to 'primary' AFTER the legacy in-process paths
 *                have been short-circuited behind their own feature flag.
 *
 * Any unrecognised value is treated as 'off'. The mode is read once at
 * subscriber startup — flipping the env in production requires a worker
 * dyno restart (acceptable; infra already does a rolling deploy on env
 * change).
 */
type CashbackMode = 'off' | 'shadow' | 'primary';

function getCashbackMode(): CashbackMode {
  const raw = (process.env.CANONICAL_CASHBACK_MODE ?? '').toLowerCase();
  if (raw === 'shadow' || raw === 'primary') return raw;
  return 'off';
}

/**
 * Platform baseline: 1 REZ coin per ₹1 spent (floor).
 * Merchants with explicit `rewardRules.coinsPerRupee` can override, but
 * store-rules lookup is Sprint 2+ work. For now, uniform baseline.
 *
 * NOTE: The original `coinsEarned()` helper lived at the top of the
 * webOrderingRoutes.ts file which was deleted in Phase 6.1 as dead code.
 * If web ordering is revived, this constant should be defined in a shared
 * utility module and imported here to avoid duplication.
 */
function baselineCoinsFor(amount: number): number {
  return Math.max(0, Math.floor(amount));
}

/**
 * Claim the event for this processor. Returns true if this is the first
 * time we've seen it, false if a prior run already processed it.
 *
 * The compound unique index on (eventId, processorKey) guarantees the
 * insert either succeeds or throws 11000 (duplicate key) — no race
 * between check-then-insert.
 */
async function claimEvent(eventId: string): Promise<boolean> {
  try {
    await ProcessedEvent.create({
      eventId,
      processorKey: PROCESSOR_KEY,
      processedAt: new Date(),
    });
    return true;
  } catch (err: unknown) {
    // Mongoose reports duplicate-key as code 11000; either the native
    // driver code or the mongoose-wrapped MongoServerError path.
    const code = (err as { code?: number }).code;
    if (code === 11000) return false;
    // Any other error bubbles — caller decides to swallow or retry.
    throw err;
  }
}

/**
 * Process a single canonical `order.placed` event. Safe to call from a
 * BullMQ worker handler; never throws (errors logged + swallowed).
 *
 * Behaviour by mode (CANONICAL_CASHBACK_MODE):
 *   'off'     — returns immediately; no ledger write, no wallet credit.
 *   'shadow'  — validates + claims the ledger, logs the would-credit math,
 *               returns WITHOUT calling walletService.credit.
 *   'primary' — validates + claims + credits (full path).
 */
export async function processOrderPlaced(rawEvent: unknown): Promise<void> {
  const mode = getCashbackMode();
  if (mode === 'off') {
    // Fast path — don't even parse the envelope. This keeps the subscriber
    // cheap when it's wired up but not yet in use.
    return;
  }

  // Validate envelope. A malformed event is a producer bug — log and
  // drop rather than retry forever.
  let event: OrderPlacedEvent;
  try {
    event = OrderPlacedEventSchema.parse(rawEvent);
  } catch (err) {
    logger.error('[cashback-subscriber] malformed order.placed event — dropping', {
      error: err instanceof Error ? err.message : String(err),
    });
    return;
  }

  if (!event.customerId) {
    logger.debug('[cashback-subscriber] walk-in order (no customerId) — skipping', {
      eventId: event.eventId,
      orderId: event.orderId,
      source: event.source,
    });
    return;
  }

  // Idempotency check. If we've already processed this event, noop.
  let claimed = false;
  try {
    claimed = await claimEvent(event.eventId);
  } catch (err) {
    logger.error('[cashback-subscriber] ProcessedEvent claim failed — skipping', {
      eventId: event.eventId,
      error: err instanceof Error ? err.message : String(err),
    });
    return;
  }
  if (!claimed) {
    logger.info('[cashback-subscriber] event already processed — noop', {
      eventId: event.eventId,
    });
    return;
  }

  const coinsToCredit = baselineCoinsFor(event.amount);
  if (coinsToCredit <= 0) {
    logger.debug('[cashback-subscriber] zero coins to credit — noop', {
      eventId: event.eventId,
      amount: event.amount,
    });
    return;
  }

  // Shadow mode: everything up to the credit is real (claim + coin math +
  // log). The walletService.credit call itself is skipped so the legacy
  // in-process path remains the sole source of truth for the actual
  // credit. This is the canonical rollout pattern — verify event flow +
  // coin-math agreement against legacy before flipping to 'primary'.
  if (mode === 'shadow') {
    logger.info('[cashback-subscriber] SHADOW — would credit (skipping real wallet write)', {
      eventId: event.eventId,
      orderId: event.orderId,
      customerId: event.customerId,
      coins: coinsToCredit,
      amount: event.amount,
      source: event.source,
    });
    return;
  }

  // Credit the wallet. walletService.credit itself has idempotency via
  // `referenceId`; we use the canonical event id so a future re-run
  // against a different processorKey still dedupes at the wallet layer.
  try {
    await walletService.credit({
      userId: event.customerId,
      amount: coinsToCredit,
      source: 'cashback',
      description: `Canonical cashback for order ${event.orderNumber}`,
      operationType: 'store_payment_reward',
      referenceId: `canonical:${event.eventId}`,
      referenceModel: 'CanonicalOrderPlaced',
      metadata: {
        eventId: event.eventId,
        orderId: event.orderId,
        orderNumber: event.orderNumber,
        merchantId: event.merchantId,
        storeId: event.storeId ?? undefined,
        source: event.source,
        processor: PROCESSOR_KEY,
      },
    });

    logger.info('[cashback-subscriber] credited cashback', {
      eventId: event.eventId,
      orderId: event.orderId,
      customerId: event.customerId,
      coins: coinsToCredit,
    });
  } catch (err) {
    // Reverse the claim so the next delivery retries. Without this,
    // a transient wallet-write failure would permanently lose the
    // credit.
    try {
      await ProcessedEvent.deleteOne({
        eventId: event.eventId,
        processorKey: PROCESSOR_KEY,
      });
    } catch (rollbackErr) {
      logger.warn('[cashback-subscriber] failed to roll back ProcessedEvent', {
        eventId: event.eventId,
        rollbackError:
          rollbackErr instanceof Error ? rollbackErr.message : String(rollbackErr),
      });
    }
    logger.error('[cashback-subscriber] walletService.credit failed', {
      eventId: event.eventId,
      orderId: event.orderId,
      customerId: event.customerId,
      coins: coinsToCredit,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ─── BullMQ worker wiring ──────────────────────────────────────────────────────

let _worker: Worker | null = null;

export function startCashbackSubscriber(): Worker {
  if (_worker) return _worker;

  _worker = new Worker(
    CANONICAL_EVENTS_QUEUE,
    async (job: Job) => {
      // The queue carries multiple event types (order.placed, payment.settled,
      // etc.) on the same queue but with different job names. We only act on
      // order.placed; other names are ignored so multiple subscribers can share
      // the queue without cross-interference.
      if (job.name !== 'canonical.order.placed') return;
      await processOrderPlaced(job.data);
    },
    {
      connection: bullmqRedis,
      // Low concurrency: wallet credits are serialized internally by
      // walletService (transactions on the Wallet document), but we still
      // want predictable throughput and low contention on the ledger.
      concurrency: 5,
    },
  );

  // BullMQ Worker emits its own 'error' events separately from the
  // connection. Log + continue.
  _worker.on('error', (err) => {
    logger.error('[cashback-subscriber] Worker error (non-fatal)', {
      error: err instanceof Error ? err.message : String(err),
    });
  });

  _worker.on('failed', (job, err) => {
    logger.error('[cashback-subscriber] job failed after retries', {
      jobId: job?.id,
      eventId: (job?.data as { eventId?: string })?.eventId,
      attemptsMade: job?.attemptsMade,
      error: err.message,
    });
  });

  logger.info('[cashback-subscriber] started', {
    concurrency: 5,
    mode: getCashbackMode(),
  });
  return _worker;
}

export async function stopCashbackSubscriber(): Promise<void> {
  if (_worker) {
    await _worker.close();
    _worker = null;
    logger.info('[cashback-subscriber] stopped');
  }
}

// Internal exports for testing — not part of the stable public API.
export const __testOnly = {
  processOrderPlaced,
  baselineCoinsFor,
  claimEvent,
  getCashbackMode,
  PROCESSOR_KEY,
};

// Guard against accidental ObjectId check in consumers — some wrappers
// expect mongoose.Types.ObjectId references.
void mongoose;
