// @ts-nocheck
/**
 * WhatsApp AI Routes (R6 Feature A)
 *
 * Endpoints for the Claude RAG-powered WhatsApp ordering bot.
 *
 * Routes:
 *   POST /api/webhook/whatsapp   — WhatsApp incoming webhook (verify + process)
 *   POST /api/whatsapp/send     — Send outbound WhatsApp message
 *
 * Security:
 *   - Webhook verifies X-Hub-Signature-256 HMAC using WHATSAPP_APP_SECRET
 *   - Outbound send requires WHATSAPP_TOKEN + WHATSAPP_PHONE_NUMBER_ID
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import axios from 'axios';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendError, sendBadRequest } from '../utils/response';
import { getWhatsAppAiService } from '../services/whatsappAiService';
import { logger } from '../config/logger';

const router = Router();

// ── Signature Verification ────────────────────────────────────────────────────

/**
 * Verify Meta's X-Hub-Signature-256 header.
 * MUST be called with the raw (unparsed) request body as a string.
 */
function verifyMetaSignature(rawBody: string, signatureHeader: string | undefined): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    logger.warn('[WhatsAppRoutes] WHATSAPP_APP_SECRET not configured — rejecting webhook');
    return false;
  }
  if (!signatureHeader) return false;

  const parts = signatureHeader.split('=');
  if (parts.length !== 2 || parts[0] !== 'sha256') return false;

  try {
    const receivedHex = parts[1];
    const expectedHex = crypto.createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex');
    return crypto.timingSafeEqual(Buffer.from(receivedHex, 'hex'), Buffer.from(expectedHex, 'hex'));
  } catch {
    return false;
  }
}

// ── GET /api/webhook/whatsapp — Webhook Verify ────────────────────────────────

/**
 * @route GET /api/webhook/whatsapp
 * @desc WhatsApp webhook verification (required by Meta when configuring webhook URL)
 * @access Public — validated by hub.verify_token
 */
router.get(
  '/webhook',
  asyncHandler(async (req: Request, res: Response) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'] as string | undefined;

    const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    if (!verifyToken) {
      logger.error('[WhatsAppRoutes] WHATSAPP_WEBHOOK_VERIFY_TOKEN not set');
      return sendError(res, 'Webhook not configured', 500);
    }

    if (mode === 'subscribe' && token === verifyToken) {
      logger.info('[WhatsAppRoutes] Webhook verified successfully');
      return res.status(200).send(challenge ?? '');
    }

    logger.warn('[WhatsAppRoutes] Webhook verification failed — invalid token');
    return sendError(res, 'Forbidden', 403);
  }),
);

// ── POST /api/webhook/whatsapp — Incoming Message Webhook ───────────────────

/**
 * @route POST /api/webhook/whatsapp
 * @desc Receive incoming WhatsApp messages from Meta Graph API
 * @access Public — verified by HMAC signature
 *
 * WhatsApp requires a fast 200 response — processing is done async after res.send().
 */
router.post(
  '/webhook',
  asyncHandler(async (req: Request, res: Response) => {
    // Grab raw body for HMAC verification (must be captured before express.json())
    const rawBody = (req as any).rawBody ?? JSON.stringify(req.body);
    const signatureHeader = req.headers['x-hub-signature-256'] as string | undefined;

    if (!verifyMetaSignature(rawBody, signatureHeader)) {
      logger.warn('[WhatsAppRoutes] Webhook signature verification failed', {
        ip: req.ip,
        hasSignature: !!signatureHeader,
      });
      return sendError(res, 'Invalid signature', 401);
    }

    const body = req.body;

    // Acknowledge receipt immediately (WhatsApp requires this)
    res.status(200).json({ received: true });

    // Only process whatsapp_business_account events
    if (body.object !== 'whatsapp_business_account') {
      logger.debug('[WhatsAppRoutes] Ignoring non-WhatsApp webhook object', { object: body.object });
      return;
    }

    if (!Array.isArray(body.entry)) return;

    // Process entries in background (after response sent)
    for (const entry of body.entry as any[]) {
      if (!Array.isArray(entry.changes)) continue;

      for (const change of entry.changes as any[]) {
        const value = change.value;
        if (!value) continue;

        // Handle incoming messages
        if (Array.isArray(value.messages)) {
          for (const message of value.messages as any[]) {
            void processIncomingEntry(message, value);
          }
        }

        // Log status updates (delivery receipts, etc.)
        if (Array.isArray(value.statuses)) {
          for (const status of value.statuses as any[]) {
            logger.debug('[WhatsAppRoutes] Status update', {
              messageId: status.id,
              status: status.status,
              timestamp: status.timestamp,
            });
          }
        }
      }
    }
  }),
);

/**
 * Process a single incoming message entry (runs after response is sent).
 */
async function processIncomingEntry(message: any, value: any): Promise<void> {
  const fromPhone = message.from;
  const messageType = message.type;

  if (messageType !== 'text') {
    logger.debug('[WhatsAppRoutes] Ignoring non-text message type', {
      type: messageType,
      from: `***${fromPhone?.slice(-4)}`,
    });
    return;
  }

  const messageText = message.text?.body ?? '';
  if (!messageText.trim()) return;

  // The storeSlug comes from the webhook metadata (configured per phone number in Meta Business Manager)
  // For simplicity, we also check the WhatsApp number against Store.contact.whatsapp
  const storeSlugOverride = process.env.WHATSAPP_STORE_SLUG;

  try {
    const aiService = getWhatsAppAiService();
    const result = await aiService.processIncomingMessage(fromPhone, messageText, storeSlugOverride);

    // Send the AI reply back to the customer
    await sendWhatsAppMessage(fromPhone, result.reply);

    logger.info('[WhatsAppRoutes] Message processed', {
      from: `***${fromPhone?.slice(-4)}`,
      orderCreated: result.orderCreated,
    });
  } catch (err) {
    logger.error('[WhatsAppRoutes] Error processing incoming message', {
      from: `***${fromPhone?.slice(-4)}`,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ── POST /api/whatsapp/send — Outbound Message ───────────────────────────────

/**
 * @route POST /api/whatsapp/send
 * @desc Send an outbound WhatsApp message to a customer
 * @access Private — requires admin/auth token
 *
 * Body: { to: string, message: string }
 */
router.post(
  '/send',
  asyncHandler(async (req: Request, res: Response) => {
    const { to, message } = req.body as { to?: string; message?: string };

    if (!to || !message) {
      return sendBadRequest(res, 'Fields "to" and "message" are required');
    }

    if (message.length > 4096) {
      return sendBadRequest(res, 'Message exceeds WhatsApp max length (4096 chars)');
    }

    const sent = await sendWhatsAppMessage(to, message);
    if (sent) {
      return sendSuccess(res, { to, sent: true }, 'Message sent');
    } else {
      return sendError(res, 'Failed to send WhatsApp message', 500);
    }
  }),
);

// ── Helper: Send via Meta Graph API ──────────────────────────────────────────

/**
 * Send a text message via WhatsApp Business Cloud API.
 * Returns true on success, false on failure.
 */
async function sendWhatsAppMessage(to: string, message: string): Promise<boolean> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_TOKEN;

  if (!phoneNumberId || !accessToken) {
    logger.warn('[WhatsAppRoutes] WhatsApp credentials not configured — cannot send message');
    return false;
  }

  try {
    const response = await axios.post(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: normalisePhoneForApi(to),
        type: 'text',
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 10_000,
      },
    );

    const messageId = response.data?.messages?.[0]?.id;
    logger.info('[WhatsAppRoutes] Message sent', {
      to: `***${to.slice(-4)}`,
      messageId,
    });
    return !!messageId;
  } catch (err: any) {
    const errorDetail = err?.response?.data?.error?.message ?? err?.message ?? 'unknown';
    logger.error('[WhatsAppRoutes] Failed to send WhatsApp message', {
      to: `***${to.slice(-4)}`,
      error: errorDetail,
    });
    return false;
  }
}

function normalisePhoneForApi(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) return `91${cleaned}`;
  if (cleaned.startsWith('0')) return `91${cleaned.slice(1)}`;
  return cleaned;
}

export default router;
