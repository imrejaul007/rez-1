/**
 * CPA Attribution Subscriber — Phase J canonical-events consumer.
 *
 * Subscribes to BullMQ `canonical-events` jobs with name
 * `canonical.payment.settled`. For each event, decides whether the
 * payment represents a chargeable outcome under the merchant's CPA
 * rate card and appends a CpaBillingEvent row if so.
 *
 * Rollout flag: CPA_PRICING_MODE=off|shadow|primary.
 *   off     — event skipped after envelope validation.
 *   shadow  — rows written with shadow:true so the merchant API hides
 *             them but analytics + backfill can still use them.
 *   primary — rows written shadow:false; merchant is truly billed.
 *
 * Attribution rules (MVP)
 * ───────────────────────
 *   1. Load merchant's CpaPricingPlan. If isActive=false, skip.
 *   2. Find customer's previous completed payments at this merchant.
 *      • Count 0  → new-customer-conversion
 *      • Most recent >= 60d ago → lapsed-reactivation
 *      • Otherwise → no charge (ordinary repeat visit)
 *   3. Idempotency: unique (merchantId, kind, sourceEventId=eventId).
 *   4. Monthly cap: skip if it would push MTD spend over plan.monthlyCap.
 *
 * Never throws.
 */

import { Worker, Job } from 'bullmq';
import { Types } from 'mongoose';

import { bullmqRedis } from '../../../config/bullmq-connection';
import { logger } from '../../../config/logger';
import { StorePayment } from '../../../models/StorePayment';
import { PosBill } from '../../../models/PosBill';
import { PaymentSettledEventSchema, type PaymentSettledEvent } from '../schemas';
import { CpaPricingPlan } from '../../../models/CpaPricingPlan';
import { CpaBillingEvent, type CpaBillingKind } from '../../../models/CpaBillingEvent';
import {
  computeCharge,
  dayKey,
  startOfUtcMonth,
  exceedsMonthlyCap,
  type AttributionOutcome,
} from '../../../services/cpaPricing/computeCharge';

const PROCESSOR_KEY = 'cpa-attribution-subscriber';
const CANONICAL_EVENTS_QUEUE = 'canonical-events';
const LAPSED_DAYS = 60;

type Mode = 'off' | 'shadow' | 'primary';

function getMode(): Mode {
  const raw = (process.env.CPA_PRICING_MODE ?? '').toLowerCase();
  if (raw === 'shadow' || raw === 'primary') return raw;
  return 'off';
}

/**
 * Decide which (if any) outcome applies. Needs the customer's prior
 * payment history at this merchant.
 *
 * FIX (Hard Risk #1): Queries BOTH PosBill (POS payments) AND
 * StorePayment (online QR payments) in parallel. Previously only
 * StorePayment was queried, so POS mark-paid events were attributed
 * as new-customer conversions even for returning customers.
 *
 * returns null → not chargeable (ordinary repeat, or data missing).
 */
export async function detectOutcome(
  merchantId: string,
  customerId: string,
  eventAt: Date,
): Promise<AttributionOutcome | null> {
  try {
    // Query both POS (PosBill) and online (StorePayment) payment history
    // in parallel. The current event's payment isn't in the DB yet (we may
    // be upstream of persistence) so we count "prior" as strictly before eventAt.
    const [posRows, onlineRows]: [any[], any[]] = await Promise.all([
      (PosBill as any).aggregate([
        {
          $match: {
            merchantId: new Types.ObjectId(merchantId),
            customerId: new Types.ObjectId(customerId),
            status: 'paid',
            paidAt: { $lt: eventAt },
          },
        },
        { $group: { _id: null, count: { $sum: 1 }, lastAt: { $max: '$paidAt' } } },
      ]),
      (StorePayment as any).aggregate([
        {
          $match: {
            merchantId,
            userId: customerId,
            status: 'completed',
            createdAt: { $lt: eventAt },
          },
        },
        { $group: { _id: null, count: { $sum: 1 }, lastAt: { $max: '$createdAt' } } },
      ]),
    ]);

    const pos = posRows[0] ?? { count: 0, lastAt: null };
    const online = onlineRows[0] ?? { count: 0, lastAt: null };

    const totalCount = pos.count + online.count;
    if (totalCount === 0) {
      return { kind: 'new-customer-conversion' };
    }

    // Use the most recent of the two last-visit timestamps.
    const posTime = pos.lastAt ? new Date(pos.lastAt).getTime() : 0;
    const onlineTime = online.lastAt ? new Date(online.lastAt).getTime() : 0;
    const lastAt = new Date(Math.max(posTime, onlineTime));

    const daysSinceLastVisit = (eventAt.getTime() - lastAt.getTime()) / (24 * 3600 * 1000);
    if (daysSinceLastVisit >= LAPSED_DAYS) {
      return { kind: 'lapsed-reactivation', daysSinceLastVisit };
    }

    return null;
  } catch (err) {
    logger.warn('[cpa-attribution] detectOutcome failed — returning null', {
      merchantId,
      customerId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Aggregate month-to-date billing spend for this merchant (excluding
 * shadow rows). Used by the monthly-cap guard.
 */
async function sumMonthToDate(merchantId: string, now: Date): Promise<number> {
  const monthStart = startOfUtcMonth(now);
  const startDay = dayKey(monthStart);
  const endDay = dayKey(now);
  const rows: { total: number }[] = await (CpaBillingEvent as any).aggregate([
    {
      $match: {
        merchantId,
        shadow: false,
        day: { $gte: startDay, $lte: endDay },
      },
    },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return rows[0]?.total ?? 0;
}

/**
 * Process a single payment.settled event. Never throws.
 */
export async function processPaymentSettled(rawEvent: unknown): Promise<void> {
  const mode = getMode();
  if (mode === 'off') return;

  let event: PaymentSettledEvent;
  try {
    event = PaymentSettledEventSchema.parse(rawEvent);
  } catch (err) {
    logger.error('[cpa-attribution] malformed payment.settled event — dropping', {
      error: err instanceof Error ? err.message : String(err),
    });
    return;
  }

  if (!event.customerId) return; // anonymous POS — can't attribute.

  // Plan lookup — only merchants with isActive:true get billed.
  let plan: any;
  try {
    plan = await CpaPricingPlan.findOne({ merchantId: event.merchantId }).lean();
  } catch (err) {
    logger.warn('[cpa-attribution] plan lookup failed', {
      merchantId: event.merchantId,
      error: err instanceof Error ? err.message : String(err),
    });
    return;
  }
  if (!plan || !plan.isActive) return;

  const eventAt = new Date(event.occurredAt);
  const outcome = await detectOutcome(event.merchantId, event.customerId, eventAt);
  if (!outcome) return;

  const charge = computeCharge(outcome, plan.rates);
  if (charge.amount <= 0) return; // merchant zero-rated this outcome — nothing to bill.

  // Monthly cap check (skipped under shadow so the shadow analytics
  // cohort is comparable across merchants regardless of cap state).
  if (mode === 'primary') {
    const mtd = await sumMonthToDate(event.merchantId, eventAt).catch(() => 0);
    if (exceedsMonthlyCap(mtd, plan.monthlyCap, charge)) {
      logger.info('[cpa-attribution] monthly cap reached — suppressing charge', {
        merchantId: event.merchantId,
        kind: charge.kind,
        mtd,
        cap: plan.monthlyCap,
      });
      return;
    }
  }

  // Write the ledger row.
  try {
    await CpaBillingEvent.create({
      merchantId: event.merchantId,
      kind: charge.kind as CpaBillingKind,
      amount: charge.amount,
      customerId: event.customerId,
      sourceEventId: event.eventId,
      day: dayKey(eventAt),
      shadow: mode === 'shadow',
      metadata: {
        orderId: event.orderId,
        paymentId: event.paymentId,
        gateway: event.gateway,
        source: 'payment.settled',
      },
    });

    // Best-effort plan lastBilledAt bump.
    CpaPricingPlan.updateOne({ merchantId: event.merchantId }, { $set: { lastBilledAt: new Date() } }).catch((err) => {
      logger.debug('[cpa-attribution] plan.lastBilledAt bump failed (non-fatal)', {
        error: err instanceof Error ? err.message : String(err),
      });
    });

    logger.info('[cpa-attribution] billed', {
      merchantId: event.merchantId,
      kind: charge.kind,
      amount: charge.amount,
      mode,
      shadow: mode === 'shadow',
    });
  } catch (err: any) {
    if (err?.code === 11000) {
      // Duplicate — same source event already billed. Safe to ignore.
      logger.debug('[cpa-attribution] duplicate billing row suppressed', {
        eventId: event.eventId,
        kind: charge.kind,
      });
      return;
    }
    logger.error('[cpa-attribution] ledger write failed', {
      merchantId: event.merchantId,
      kind: charge.kind,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ─── BullMQ worker wiring ─────────────────────────────────────────────────────

let _worker: Worker | null = null;

export function startCpaAttributionSubscriber(): Worker {
  if (_worker) return _worker;

  _worker = new Worker(
    CANONICAL_EVENTS_QUEUE,
    async (job: Job) => {
      if (job.name !== 'canonical.payment.settled') return;
      await processPaymentSettled(job.data);
    },
    { connection: bullmqRedis, concurrency: 10 },
  );

  _worker.on('error', (err) => {
    logger.error('[cpa-attribution] worker error (non-fatal)', {
      error: err instanceof Error ? err.message : String(err),
    });
  });

  _worker.on('failed', (job, err) => {
    logger.error('[cpa-attribution] job failed after retries', {
      jobId: job?.id,
      eventId: (job?.data as { eventId?: string })?.eventId,
      attemptsMade: job?.attemptsMade,
      error: err.message,
    });
  });

  logger.info('[cpa-attribution] started', {
    concurrency: 10,
    mode: getMode(),
  });
  return _worker;
}

export async function stopCpaAttributionSubscriber(): Promise<void> {
  if (_worker) {
    await _worker.close();
    _worker = null;
    logger.info('[cpa-attribution] stopped');
  }
}

export const __testOnly = {
  processPaymentSettled,
  detectOutcome,
  sumMonthToDate,
  getMode,
  PROCESSOR_KEY,
  LAPSED_DAYS,
};
