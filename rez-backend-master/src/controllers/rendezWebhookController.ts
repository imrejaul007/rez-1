/**
 * Rendez Webhook Controller
 *
 * Handles inbound events from the Rendez backend when a Rendez user
 * books a REZ-registered venue through the Rendez app.
 *
 * Security: every request is verified using HMAC-SHA256 over the raw body,
 * signed with RENDEZ_WEBHOOK_SECRET (shared secret set in both systems).
 *
 * Events:
 *   booking.created  — Rendez booking confirmed; find the REZ order by
 *                       rendezBookingId and stamp analytics.source = 'rendez'.
 *                       If the order doesn't exist yet (race condition), store
 *                       the hint in a pending map — not needed for MVP since
 *                       Rendez creates the booking via the REZ order API first.
 *   booking.cancelled — Mark the REZ order as cancelled.
 */

import { Request, Response } from 'express';
import * as crypto from 'crypto';
import { Order } from '../models/Order';
import { logger } from '../config/logger';

const RENDEZ_WEBHOOK_SECRET = process.env.RENDEZ_WEBHOOK_SECRET || '';

function verifySignature(rawBody: string, signatureHeader: string): boolean {
  if (!RENDEZ_WEBHOOK_SECRET) return false;
  const expected = crypto.createHmac('sha256', RENDEZ_WEBHOOK_SECRET).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signatureHeader, 'hex'));
  } catch {
    return false;
  }
}

export async function handleRendezWebhook(req: Request, res: Response): Promise<void> {
  const sig = (req.headers['x-rendez-signature'] as string) || '';
  const rawBody = (req as any).rawBody as string;

  if (!verifySignature(rawBody, sig)) {
    logger.warn('[RendezWebhook] Invalid or missing signature');
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  const { event, data } = req.body as { event: string; data: Record<string, unknown> };
  logger.info('[RendezWebhook] Received event:', { event });

  try {
    if (event === 'booking.created') {
      const { rezOrderId, rendezBookingId, storeId } = data as {
        rezOrderId?: string;
        rendezBookingId: string;
        storeId?: string;
      };

      if (rezOrderId) {
        await Order.findByIdAndUpdate(rezOrderId, {
          $set: {
            'analytics.source': 'rendez',
            'analytics.campaign': rendezBookingId,
          },
        });
        logger.info('[RendezWebhook] Stamped rendez source on order', { rezOrderId, rendezBookingId });
      } else {
        // No REZ order ID supplied — log and skip (order may not exist yet)
        logger.warn('[RendezWebhook] booking.created with no rezOrderId', { rendezBookingId, storeId });
      }
    } else if (event === 'booking.cancelled') {
      const { rezOrderId, reason } = data as { rezOrderId?: string; reason?: string };
      if (rezOrderId) {
        // Guard: do not force-cancel orders that are already in a terminal state.
        // Raw findByIdAndUpdate bypasses the Order pre-save state machine, so we
        // validate here before writing to avoid corrupting delivered/refunded orders.
        const existing = await Order.findById(rezOrderId).select('status').lean();
        if (!existing) {
          logger.warn('[RendezWebhook] booking.cancelled: order not found', { rezOrderId });
        } else {
          const TERMINAL_STATES = [
            'delivered',
            'return_requested',
            'returned',
            'return_rejected',
            'refunded',
            'cancelled',
          ];
          if (TERMINAL_STATES.includes(existing.status as string)) {
            logger.warn('[RendezWebhook] booking.cancelled: order already in terminal state — skipping cancellation', {
              rezOrderId,
              currentStatus: existing.status,
            });
          } else {
            await Order.findByIdAndUpdate(rezOrderId, {
              $set: { status: 'cancelled' },
              $push: {
                timeline: {
                  status: 'cancelled',
                  timestamp: new Date(),
                  note: `Cancelled via Rendez: ${reason || 'no reason'}`,
                },
              },
            });
            logger.info('[RendezWebhook] Cancelled REZ order from Rendez', { rezOrderId });
          }
        }
      }
    } else {
      logger.info('[RendezWebhook] Unhandled event type', { event });
    }

    res.status(200).json({ received: true });
  } catch (err: any) {
    logger.error('[RendezWebhook] Error processing event', { event, error: err?.message });
    res.status(500).json({ error: 'Internal error' });
  }
}
