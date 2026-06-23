/**
 * WhatsApp Receipt Subscriber — canonical-events consumer (Phase D).
 *
 * Subscribes to BullMQ `canonical-events` jobs with name
 * `canonical.payment.settled` and sends the paying customer a WhatsApp
 * receipt. DPDP-aware: only sends when the user has active
 * `whatsapp_transactional` consent in the UserConsent ledger.
 *
 * Why this subscriber matters
 * ───────────────────────────
 * Today no automatic customer-facing receipt fires on a successful
 * payment. A WhatsApp receipt is the single highest-leverage re-engagement
 * surface we have: open-rate on transactional WhatsApp in India is
 * >90%, vs. 22% for email and 4% for SMS. This subscriber closes the
 * transactional loop without making the POS or web-order path responsible
 * for delivery.
 *
 * Rollout mode (CANONICAL_WHATSAPP_RECEIPT_MODE)
 * ──────────────────────────────────────────────
 *   'off'     (default) — disabled. Events skip after envelope parse.
 *   'shadow'  — validate + claim + lookup + log "would send to phone X";
 *               skip actual Meta API call. Safe to run in prod for
 *               observability; zero send risk.
 *   'primary' — claim + send. Full path.
 *
 * Idempotency
 * ───────────
 *   1. ProcessedEvent compound unique index on (eventId, processorKey) —
 *      same event delivered twice = second delivery no-ops.
 *   2. WhatsAppMarketingService uses Redis SETNX dedup on
 *      (campaignId, phone) for a 24h window as a belt-and-braces layer.
 *      The campaignId we pass is `receipt:<eventId>` so a duplicate send
 *      to the same phone for the same payment event is rejected even if
 *      our ProcessedEvent row was rolled back.
 *
 * Never throws. WhatsApp delivery failures roll back the ProcessedEvent
 * claim so a BullMQ retry has a chance to succeed; all other errors
 * logged and swallowed.
 */

import { Worker, Job } from 'bullmq';

import { bullmqRedis } from '../../../config/bullmq-connection';
import { logger } from '../../../config/logger';
import ProcessedEvent from '../../../models/ProcessedEvent';
import UserConsent from '../../../models/UserConsent';
import { PaymentSettledEventSchema, type PaymentSettledEvent } from '../schemas';

const PROCESSOR_KEY = 'whatsapp-receipt-subscriber';
const CANONICAL_EVENTS_QUEUE = 'canonical-events';

type WhatsAppReceiptMode = 'off' | 'shadow' | 'primary';

function getWhatsAppReceiptMode(): WhatsAppReceiptMode {
  const raw = (process.env.CANONICAL_WHATSAPP_RECEIPT_MODE ?? '').toLowerCase();
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
 * Build the receipt message body. Keeping it plain-text for MVP — a
 * template-based flow is the production path but requires registering
 * approved templates with Meta (follow-up task).
 */
function buildReceiptMessage(args: {
  amount: number;
  orderNumber?: string;
  gateway: PaymentSettledEvent['gateway'];
}): string {
  const amountStr = `₹${args.amount.toLocaleString('en-IN')}`;
  const ref = args.orderNumber ? ` for order ${args.orderNumber}` : '';
  const gatewayLabel =
    args.gateway === 'cash'
      ? 'cash'
      : args.gateway === 'razorpay'
        ? 'card/UPI'
        : args.gateway;
  return `Thanks for your payment of ${amountStr}${ref} via ${gatewayLabel}. This is your ReZ receipt. Reply HELP for support.`;
}

/**
 * Lazy-load the User + WhatsAppMarketingService modules so the subscriber
 * can be unit-tested without dragging in their transitive deps.
 */
async function resolveUserPhone(userId: string): Promise<string | null> {
  try {
    const { User } = await import('../../../models/User');
    const user: any = await User.findById(userId).select('phoneNumber phone').lean();
    return user?.phoneNumber || user?.phone || null;
  } catch (err) {
    logger.warn('[whatsapp-receipt-subscriber] User lookup failed', {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

async function resolveOrderNumber(orderId: string | undefined): Promise<string | undefined> {
  if (!orderId) return undefined;
  try {
    const { Order } = await import('../../../models/Order');
    const order: any = await Order.findById(orderId).select('orderNumber').lean();
    return order?.orderNumber || undefined;
  } catch (err) {
    logger.debug('[whatsapp-receipt-subscriber] Order lookup failed — proceeding without orderNumber', {
      orderId,
      error: err instanceof Error ? err.message : String(err),
    });
    return undefined;
  }
}

/**
 * Process a single canonical payment.settled event.
 * Safe to call from a BullMQ worker handler; never throws.
 */
export async function processPaymentSettled(rawEvent: unknown): Promise<void> {
  const mode = getWhatsAppReceiptMode();
  if (mode === 'off') return;

  // Validate envelope.
  let event: PaymentSettledEvent;
  try {
    event = PaymentSettledEventSchema.parse(rawEvent);
  } catch (err) {
    logger.error('[whatsapp-receipt-subscriber] malformed payment.settled event — dropping', {
      error: err instanceof Error ? err.message : String(err),
    });
    return;
  }

  if (!event.customerId) {
    // Anonymous payment (POS walk-in without identity capture) — no receipt recipient.
    logger.debug('[whatsapp-receipt-subscriber] anonymous payment — skipping', {
      eventId: event.eventId,
    });
    return;
  }

  // DPDP consent check — transactional receipts still need active consent
  // unless the merchant has recorded a contract-basis consent at signup.
  // hasActiveConsent returns true in both cases.
  let hasConsent = false;
  try {
    hasConsent = await UserConsent.hasActiveConsent(event.customerId, 'whatsapp_transactional');
  } catch (err) {
    logger.warn('[whatsapp-receipt-subscriber] consent check failed — defaulting to NO consent', {
      eventId: event.eventId,
      customerId: event.customerId,
      error: err instanceof Error ? err.message : String(err),
    });
    return;
  }
  if (!hasConsent) {
    logger.info('[whatsapp-receipt-subscriber] no whatsapp_transactional consent — skipping', {
      eventId: event.eventId,
      customerId: event.customerId,
    });
    return;
  }

  // Claim the event for idempotency (layer 1).
  let claimed = false;
  try {
    claimed = await claimEvent(event.eventId);
  } catch (err) {
    logger.error('[whatsapp-receipt-subscriber] ProcessedEvent claim failed — skipping', {
      eventId: event.eventId,
      error: err instanceof Error ? err.message : String(err),
    });
    return;
  }
  if (!claimed) {
    logger.info('[whatsapp-receipt-subscriber] event already processed — noop', {
      eventId: event.eventId,
    });
    return;
  }

  // Resolve recipient phone.
  const phone = await resolveUserPhone(event.customerId);
  if (!phone) {
    logger.warn('[whatsapp-receipt-subscriber] no phone for user — skipping (claim stays)', {
      eventId: event.eventId,
      customerId: event.customerId,
    });
    return;
  }

  // Resolve order number for nicer copy (optional — best-effort).
  const orderNumber = await resolveOrderNumber(event.orderId);

  const message = buildReceiptMessage({
    amount: event.amount,
    orderNumber,
    gateway: event.gateway,
  });

  // Shadow — log what we WOULD send and stop.
  if (mode === 'shadow') {
    logger.info('[whatsapp-receipt-subscriber] SHADOW — would send receipt (skipping Meta API)', {
      eventId: event.eventId,
      customerId: event.customerId,
      phoneSuffix: phone.slice(-4),
      amount: event.amount,
      orderNumber,
    });
    return;
  }

  // Primary — dispatch via WhatsAppMarketingService.
  try {
    const { whatsAppMarketingService } = await import('../../../services/WhatsAppMarketingService');
    const result = await whatsAppMarketingService.sendText({
      to: phone,
      message,
      // `receipt:<eventId>` gives the service-level dedup a stable campaignId.
      campaignId: `receipt:${event.eventId}`,
      merchantId: event.merchantId,
    });

    if (result.success) {
      logger.info('[whatsapp-receipt-subscriber] receipt sent', {
        eventId: event.eventId,
        customerId: event.customerId,
        messageId: result.messageId,
        deduped: result.deduped,
      });
    } else {
      // Delivery failure — roll back the claim so a retry can try again.
      try {
        await ProcessedEvent.deleteOne({
          eventId: event.eventId,
          processorKey: PROCESSOR_KEY,
        });
      } catch (rollbackErr) {
        logger.warn('[whatsapp-receipt-subscriber] ProcessedEvent rollback failed', {
          eventId: event.eventId,
          rollbackError:
            rollbackErr instanceof Error ? rollbackErr.message : String(rollbackErr),
        });
      }
      logger.error('[whatsapp-receipt-subscriber] send failed', {
        eventId: event.eventId,
        customerId: event.customerId,
        error: result.error,
      });
    }
  } catch (err) {
    // Unexpected service-layer throw — roll back claim + swallow.
    try {
      await ProcessedEvent.deleteOne({
        eventId: event.eventId,
        processorKey: PROCESSOR_KEY,
      });
    } catch (rollbackErr) {
      logger.warn('[whatsapp-receipt-subscriber] ProcessedEvent rollback failed (exception path)', {
        eventId: event.eventId,
        rollbackError:
          rollbackErr instanceof Error ? rollbackErr.message : String(rollbackErr),
      });
    }
    logger.error('[whatsapp-receipt-subscriber] unexpected error during send', {
      eventId: event.eventId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ─── BullMQ worker wiring ─────────────────────────────────────────────────────

let _worker: Worker | null = null;

export function startWhatsAppReceiptSubscriber(): Worker {
  if (_worker) return _worker;

  _worker = new Worker(
    CANONICAL_EVENTS_QUEUE,
    async (job: Job) => {
      if (job.name !== 'canonical.payment.settled') return;
      await processPaymentSettled(job.data);
    },
    {
      connection: bullmqRedis,
      // Meta's 80 msg/s rate limit is enforced inside WhatsAppMarketingService;
      // keep worker concurrency modest so we don't pile up outbound calls.
      concurrency: 5,
    },
  );

  _worker.on('error', (err) => {
    logger.error('[whatsapp-receipt-subscriber] Worker error (non-fatal)', {
      error: err instanceof Error ? err.message : String(err),
    });
  });

  _worker.on('failed', (job, err) => {
    logger.error('[whatsapp-receipt-subscriber] job failed after retries', {
      jobId: job?.id,
      eventId: (job?.data as { eventId?: string })?.eventId,
      attemptsMade: job?.attemptsMade,
      error: err.message,
    });
  });

  logger.info('[whatsapp-receipt-subscriber] started', {
    concurrency: 5,
    mode: getWhatsAppReceiptMode(),
  });
  return _worker;
}

export async function stopWhatsAppReceiptSubscriber(): Promise<void> {
  if (_worker) {
    await _worker.close();
    _worker = null;
    logger.info('[whatsapp-receipt-subscriber] stopped');
  }
}

// Internal testing surface.
export const __testOnly = {
  processPaymentSettled,
  getWhatsAppReceiptMode,
  claimEvent,
  buildReceiptMessage,
  PROCESSOR_KEY,
};
