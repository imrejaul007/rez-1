/**
 * Rendez Outbound Webhook Dispatcher
 *
 * Fires events FROM rezbackend → Rendez backend over HTTPS.
 * All outbound calls are fire-and-forget (non-blocking) — a failure
 * here never interrupts the main request flow.
 *
 * Events dispatched:
 *   gift-redeemed      — user claimed a CoinGift sent by another REZ user
 *   gift-expired       — a CoinGift passed its expiresAt without being claimed
 *   payment-completed  — user successfully paid for an order (Razorpay verified)
 *   reward-triggered   — coins were credited via the reward engine (partner_bonus type)
 *
 * Required env vars:
 *   RENDEZ_BACKEND_URL     — base URL of Rendez backend  e.g. https://rendez-backend.onrender.com
 *   RENDEZ_WEBHOOK_SECRET  — shared HMAC-SHA256 secret (same value as in Rendez env)
 *
 * Rendez receiver validates signature via the `x-rez-signature: sha256=<hex>` header.
 */

import * as crypto from 'crypto';
import { createServiceLogger } from '../config/logger';

const logger = createServiceLogger('rendez-webhook-dispatch');

// ── Helpers ────────────────────────────────────────────────────────────────────

function getConfig(): { url: string; secret: string } | null {
  const url = process.env.RENDEZ_BACKEND_URL;
  const secret = process.env.RENDEZ_WEBHOOK_SECRET;
  if (!url || !secret) {
    logger.warn('[RendezDispatch] RENDEZ_BACKEND_URL or RENDEZ_WEBHOOK_SECRET not set — webhook not sent');
    return null;
  }
  return { url, secret };
}

function sign(bodyStr: string, secret: string): string {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(bodyStr).digest('hex');
}

async function dispatch(event: string, payload: Record<string, unknown>): Promise<void> {
  const cfg = getConfig();
  if (!cfg) return;

  const bodyStr = JSON.stringify(payload);
  const signature = sign(bodyStr, cfg.secret);

  const url = `${cfg.url}/api/v1/webhooks/rez/${event}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rez-signature': signature,
      },
      body: bodyStr,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '(unreadable)');
      logger.warn(`[RendezDispatch] Non-2xx from Rendez for event "${event}"`, {
        status: res.status,
        body,
      });
      return;
    }

    logger.info(`[RendezDispatch] Event "${event}" dispatched to Rendez`, { payload });
  } catch (err: any) {
    // Network / DNS errors — non-blocking
    logger.error(`[RendezDispatch] Failed to dispatch event "${event}" to Rendez`, {
      error: err.message,
    });
  }
}

// ── Public dispatch functions ─────────────────────────────────────────────────

/**
 * Fire when a CoinGift is claimed by its recipient.
 */
export function dispatchGiftRedeemed(params: {
  giftId: string;
  senderRezUserId: string;
  recipientRezUserId: string;
  amount: number;
  claimedAt: Date;
}): void {
  dispatch('gift-redeemed', {
    event: 'gift-redeemed',
    gift_id: params.giftId,
    sender_rez_user_id: params.senderRezUserId,
    recipient_rez_user_id: params.recipientRezUserId,
    amount: params.amount,
    claimed_at: params.claimedAt.toISOString(),
    timestamp: new Date().toISOString(),
  }).catch(() => {});
}

/**
 * Fire when a CoinGift is marked expired without being claimed.
 */
export function dispatchGiftExpired(params: {
  giftId: string;
  senderRezUserId: string;
  recipientRezUserId: string;
  amount: number;
  expiredAt: Date;
}): void {
  dispatch('gift-expired', {
    event: 'gift-expired',
    gift_id: params.giftId,
    sender_rez_user_id: params.senderRezUserId,
    recipient_rez_user_id: params.recipientRezUserId,
    amount: params.amount,
    expired_at: params.expiredAt.toISOString(),
    timestamp: new Date().toISOString(),
  }).catch(() => {});
}

/**
 * Fire when a user's Razorpay payment is verified and order is confirmed.
 */
export function dispatchPaymentCompleted(params: {
  orderId: string;
  rezUserId: string;
  amountPaise: number;
  merchantId?: string;
  paymentId: string;
  paidAt: Date;
}): void {
  dispatch('payment-completed', {
    event: 'payment-completed',
    order_id: params.orderId,
    rez_user_id: params.rezUserId,
    amount_paise: params.amountPaise,
    merchant_id: params.merchantId,
    payment_id: params.paymentId,
    paid_at: params.paidAt.toISOString(),
    timestamp: new Date().toISOString(),
  }).catch(() => {});
}

/**
 * Fire when partner-type coins are awarded to a user (e.g. from meetup rewards).
 * Only fires for 'partner_bonus' reward type to avoid flooding Rendez with every REZ coin issuance.
 */
export function dispatchRewardTriggered(params: {
  transactionId: string;
  rezUserId: string;
  coins: number;
  rewardType: string;
  source: string;
  awardedAt: Date;
}): void {
  if (params.rewardType !== 'partner_bonus') return; // Only partner events go to Rendez
  dispatch('reward-triggered', {
    event: 'reward-triggered',
    transaction_id: params.transactionId,
    rez_user_id: params.rezUserId,
    coins: params.coins,
    reward_type: params.rewardType,
    source: params.source,
    awarded_at: params.awardedAt.toISOString(),
    timestamp: new Date().toISOString(),
  }).catch(() => {});
}
