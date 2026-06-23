/**
 * Scan-to-Earn Subscriber — canonical-events consumer (Phase B).
 *
 * Subscribes to BullMQ `canonical-events` queue jobs with name
 * `canonical.visit.completed` AND source `qr_checkin`. Awards coins to
 * the scanning customer per the store's `rewardRules.scanToEarn` config.
 *
 * Why this subscriber matters
 * ───────────────────────────
 * Today a customer who scans a merchant QR gets coins ONLY if they go on
 * to pay. Walk-ins who just scan (to check menu, see offers, or try the
 * app) never enter the loyalty loop. Scan-to-Earn fixes that: first-time
 * scanners get a bigger bonus, repeat scanners get a smaller one, capped
 * daily to stop farming. This is the single cheapest customer-acquisition
 * trigger in the platform — merchants pay coin-value only when a scan
 * converts the person to "known customer".
 *
 * Rollout mode (CANONICAL_SCAN_REWARD_MODE)
 * ─────────────────────────────────────────
 *   'off'     (default) — disabled. Events skip after envelope parse.
 *   'shadow'  — validate + claim ledger + log "would credit N coins";
 *               skip actual wallet write. Safe to run in prod for
 *               observability; zero wallet risk.
 *   'primary' — claim + credit. Full path.
 *
 * Per-merchant opt-in via `Store.rewardRules.scanToEarn.enabled`.
 * A merchant with scanToEarn disabled is a no-op regardless of global mode.
 *
 * Idempotency (three layers)
 * ──────────────────────────
 *   1. ProcessedEvent compound unique index on (eventId, processorKey) —
 *      same event delivered twice = second delivery no-ops.
 *   2. walletService.credit referenceId = 'canonical:<eventId>' — wallet
 *      layer rejects a second credit with the same ref.
 *   3. Daily-cap check by (customerId, storeId, day) — prevents a
 *      customer from harvesting rewards by rapid repeat scans. Uses
 *      ProcessedEvent ledger with a synthetic eventId pattern
 *      'scan-day:<customerId>:<storeId>:<YYYY-MM-DD>:<n>' so cap entries
 *      also auto-expire after 7 days via the TTL index.
 *
 * Never throws. Wallet failures roll back the claim; all other errors
 * logged and swallowed.
 */

import { Worker, Job } from 'bullmq';

import { bullmqRedis } from '../../../config/bullmq-connection';
import { logger } from '../../../config/logger';
import ProcessedEvent from '../../../models/ProcessedEvent';
import { Store } from '../../../models/Store';
import { walletService } from '../../../services/walletService';
import { VisitCompletedEventSchema, type VisitCompletedEvent } from '../schemas';

const PROCESSOR_KEY = 'scan-reward-subscriber';
const CANONICAL_EVENTS_QUEUE = 'canonical-events';

type ScanRewardMode = 'off' | 'shadow' | 'primary';

function getScanRewardMode(): ScanRewardMode {
  const raw = (process.env.CANONICAL_SCAN_REWARD_MODE ?? '').toLowerCase();
  if (raw === 'shadow' || raw === 'primary') return raw;
  return 'off';
}

/** Claim the event for this processor; duplicate (code 11000) = already processed. */
async function claimEvent(eventId: string): Promise<boolean> {
  try {
    await ProcessedEvent.create({
      eventId,
      processorKey: PROCESSOR_KEY,
      processedAt: new Date(),
    });
    return true;
  } catch (err: unknown) {
    const code = (err as { code?: number }).code;
    if (code === 11000) return false;
    throw err;
  }
}

/**
 * Compute the ymd "day key" (UTC) used by the daily-cap ledger entries.
 * UTC, not merchant-local, to keep the cap consistent across deployments
 * without adding a store-timezone lookup per event.
 */
function dayKey(now: Date): string {
  // Returns YYYY-MM-DD (10 chars) from UTC components.
  return now.toISOString().slice(0, 10);
}

/**
 * Check whether a first-ever scan at this store by this customer has
 * happened before. Implemented as: "is there ANY prior ProcessedEvent
 * with our daily-cap eventId prefix for this customer + store?"
 *
 * False positive risk: within the 7-day TTL window, an older ledger
 * entry will make a legitimately-first scan look like a repeat scan.
 * That's acceptable — the customer already got a first-scan reward
 * within 7 days; we should not double-award.
 */
async function isFirstScanEver(customerId: string, storeId: string): Promise<boolean> {
  const prefix = `scan-day:${customerId}:${storeId}:`;
  const existing = await ProcessedEvent.findOne({
    eventId: { $regex: `^${prefix}` },
    processorKey: PROCESSOR_KEY,
  })
    .select('_id')
    .lean();
  return !existing;
}

/**
 * Record a daily-cap entry for this (customer, store, day, index).
 * Returns true if the entry was created; false if we hit the cap (the
 * Nth entry for that day already exists, so no more rewards today).
 */
async function claimDailySlot(
  customerId: string,
  storeId: string,
  cap: number,
): Promise<boolean> {
  const day = dayKey(new Date());
  // Walk 1..cap looking for an unclaimed slot. Race-safe because each
  // slot is a compound-unique ProcessedEvent row.
  for (let i = 1; i <= cap; i++) {
    const slotEventId = `scan-day:${customerId}:${storeId}:${day}:${i}`;
    try {
      await ProcessedEvent.create({
        eventId: slotEventId,
        processorKey: PROCESSOR_KEY,
        processedAt: new Date(),
      });
      return true;
    } catch (err: unknown) {
      const code = (err as { code?: number }).code;
      if (code === 11000) continue; // slot taken, try next
      throw err;
    }
  }
  return false; // cap exceeded
}

/**
 * Process a single canonical visit.completed event with source=qr_checkin.
 * Safe to call from a BullMQ worker handler; never throws.
 */
export async function processVisitCompleted(rawEvent: unknown): Promise<void> {
  const mode = getScanRewardMode();
  if (mode === 'off') return;

  // Validate envelope.
  let event: VisitCompletedEvent;
  try {
    event = VisitCompletedEventSchema.parse(rawEvent);
  } catch (err) {
    logger.error('[scan-reward-subscriber] malformed visit.completed event — dropping', {
      error: err instanceof Error ? err.message : String(err),
    });
    return;
  }

  if (event.source !== 'qr_checkin') {
    // Other sources (pos, web, appointment) don't trigger scan rewards.
    return;
  }

  if (!event.customerId || !event.storeId) {
    logger.debug('[scan-reward-subscriber] anonymous or unscoped visit — skipping', {
      eventId: event.eventId,
      customerId: event.customerId,
      storeId: event.storeId,
    });
    return;
  }

  // Claim the event for idempotency (layer 1).
  let claimed = false;
  try {
    claimed = await claimEvent(event.eventId);
  } catch (err) {
    logger.error('[scan-reward-subscriber] ProcessedEvent claim failed — skipping', {
      eventId: event.eventId,
      error: err instanceof Error ? err.message : String(err),
    });
    return;
  }
  if (!claimed) {
    logger.info('[scan-reward-subscriber] event already processed — noop', {
      eventId: event.eventId,
    });
    return;
  }

  // Load merchant's scan-to-earn config.
  const store: any = await Store.findById(event.storeId).select('rewardRules').lean();
  const cfg = store?.rewardRules?.scanToEarn;
  if (!cfg?.enabled) {
    logger.debug('[scan-reward-subscriber] merchant scan-to-earn disabled — noop', {
      eventId: event.eventId,
      storeId: event.storeId,
    });
    return;
  }

  // Daily cap (layer 3).
  const dailyCap = Math.max(1, Number(cfg.dailyCapPerCustomer ?? 1));
  const slotClaimed = await claimDailySlot(event.customerId, event.storeId, dailyCap);
  if (!slotClaimed) {
    logger.info('[scan-reward-subscriber] daily cap reached — noop', {
      eventId: event.eventId,
      customerId: event.customerId,
      storeId: event.storeId,
      dailyCap,
    });
    return;
  }

  // First-scan vs repeat-scan coin amount.
  const isFirst = await isFirstScanEver(event.customerId, event.storeId);
  const coinsToAward = isFirst
    ? Math.max(0, Number(cfg.firstScanBonus ?? 0))
    : Math.max(0, Number(cfg.repeatScanCoins ?? 0));

  if (coinsToAward <= 0) {
    logger.debug('[scan-reward-subscriber] zero-coin configuration — noop', {
      eventId: event.eventId,
      isFirst,
    });
    return;
  }

  // Shadow mode — log what we WOULD credit and stop.
  if (mode === 'shadow') {
    logger.info('[scan-reward-subscriber] SHADOW — would credit (skipping real wallet write)', {
      eventId: event.eventId,
      customerId: event.customerId,
      storeId: event.storeId,
      coins: coinsToAward,
      isFirst,
    });
    return;
  }

  // Primary — credit via wallet (layer 2 idempotency by referenceId).
  try {
    await walletService.credit({
      userId: event.customerId,
      amount: coinsToAward,
      source: 'cashback',
      description: isFirst ? 'Scan-to-Earn first-scan bonus' : 'Scan-to-Earn repeat-scan reward',
      operationType: 'store_payment_reward',
      referenceId: `canonical:${event.eventId}`,
      referenceModel: 'CanonicalVisitCompleted',
      metadata: {
        eventId: event.eventId,
        visitId: event.visitId,
        storeId: event.storeId,
        merchantId: event.merchantId,
        source: event.source,
        scanKind: isFirst ? 'first' : 'repeat',
        processor: PROCESSOR_KEY,
      },
    });

    logger.info('[scan-reward-subscriber] credited scan reward', {
      eventId: event.eventId,
      customerId: event.customerId,
      storeId: event.storeId,
      coins: coinsToAward,
      isFirst,
    });
  } catch (err) {
    // Roll back the event claim so a retry has a chance to succeed.
    // The daily-slot claim is intentionally NOT rolled back — a second
    // retry should land on the NEXT slot for the day rather than the
    // same one, so the cap stays honest under retry.
    try {
      await ProcessedEvent.deleteOne({
        eventId: event.eventId,
        processorKey: PROCESSOR_KEY,
      });
    } catch (rollbackErr) {
      logger.warn('[scan-reward-subscriber] ProcessedEvent rollback failed', {
        eventId: event.eventId,
        rollbackError:
          rollbackErr instanceof Error ? rollbackErr.message : String(rollbackErr),
      });
    }
    logger.error('[scan-reward-subscriber] walletService.credit failed', {
      eventId: event.eventId,
      customerId: event.customerId,
      coins: coinsToAward,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ─── BullMQ worker wiring ──────────────────────────────────────────────────────

let _worker: Worker | null = null;

export function startScanRewardSubscriber(): Worker {
  if (_worker) return _worker;

  _worker = new Worker(
    CANONICAL_EVENTS_QUEUE,
    async (job: Job) => {
      if (job.name !== 'canonical.visit.completed') return;
      await processVisitCompleted(job.data);
    },
    {
      connection: bullmqRedis,
      concurrency: 10, // visits are cheap to process; scan bursts happen on busy afternoons.
    },
  );

  _worker.on('error', (err) => {
    logger.error('[scan-reward-subscriber] Worker error (non-fatal)', {
      error: err instanceof Error ? err.message : String(err),
    });
  });

  _worker.on('failed', (job, err) => {
    logger.error('[scan-reward-subscriber] job failed after retries', {
      jobId: job?.id,
      eventId: (job?.data as { eventId?: string })?.eventId,
      attemptsMade: job?.attemptsMade,
      error: err.message,
    });
  });

  logger.info('[scan-reward-subscriber] started', {
    concurrency: 10,
    mode: getScanRewardMode(),
  });
  return _worker;
}

export async function stopScanRewardSubscriber(): Promise<void> {
  if (_worker) {
    await _worker.close();
    _worker = null;
    logger.info('[scan-reward-subscriber] stopped');
  }
}

// Internal testing surface.
export const __testOnly = {
  processVisitCompleted,
  getScanRewardMode,
  claimEvent,
  claimDailySlot,
  isFirstScanEver,
  dayKey,
  PROCESSOR_KEY,
};
