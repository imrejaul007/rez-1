// @ts-nocheck
import { Router } from 'express';
import * as crypto from 'crypto';
import { logger } from '../config/logger';
import whatsappOrderingService from '../services/whatsappOrderingService';

const router = Router();

/**
 * WS-004 FIX: Verify the X-Hub-Signature-256 header that Meta sends with every
 * incoming webhook POST.  Without this check, anyone who can reach the endpoint
 * can inject arbitrary WhatsApp messages (e.g. forge orders, drain wallet actions).
 *
 * Setup: set WHATSAPP_APP_SECRET in env to the App Secret from Meta Developer
 * Console → App → Settings → Basic.
 */
function verifyMetaSignature(rawBody: string, signatureHeader: string | undefined): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    logger.warn('[WhatsApp] WHATSAPP_APP_SECRET not configured — rejecting webhook request');
    return false; // Always reject if secret not configured
  }

  if (!signatureHeader) {
    return false;
  }

  // Header format: "sha256=<hex_digest>"
  const parts = signatureHeader.split('=');
  if (parts.length !== 2 || parts[0] !== 'sha256') {
    return false;
  }

  const receivedHex = parts[1];
  const expectedHex = crypto.createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(receivedHex, 'hex'), Buffer.from(expectedHex, 'hex'));
  } catch {
    // timingSafeEqual throws if lengths differ (malformed hex in header)
    return false;
  }
}

/**
 * WhatsApp Business API Ordering Webhook
 *
 * SETUP REQUIRED:
 * 1. Apply for Meta Business API approval: https://developers.facebook.com/docs/whatsapp
 * 2. Set env vars: WHATSAPP_VERIFY_TOKEN, WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_STORE_ID
 * 3. Configure webhook URL in Meta Business Manager: https://<your-domain>/api/whatsapp/webhook
 *
 * Flow: Customer sends message → State machine routes to appropriate handler → Bot responds
 * States: idle → browsing → item_selected → cart → confirming → awaiting_payment → completed
 */

// Webhook verification (required by Meta)
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    logger.info('[WhatsApp] Webhook verified successfully');
    return res.status(200).send(challenge);
  }

  logger.warn('[WhatsApp] Webhook verification failed — invalid token');
  res.status(403).json({ error: 'Forbidden' });
});

// Incoming messages and status updates
router.post('/webhook', async (req, res) => {
  // WS-004 FIX: Verify Meta HMAC signature before processing any payload.
  // rawBody must be captured before express.json() parses the buffer.
  const rawBody = (req as any).rawBody ?? JSON.stringify(req.body);
  const signatureHeader = req.headers['x-hub-signature-256'] as string | undefined;

  if (!verifyMetaSignature(rawBody, signatureHeader)) {
    logger.warn('[WhatsApp] Webhook signature verification failed — rejecting request', {
      ip: req.ip,
      hasSignature: !!signatureHeader,
    });
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  const body = req.body;

  // Acknowledge receipt immediately (required by Meta)
  res.status(200).json({ received: true });

  if (body.object !== 'whatsapp_business_account') {
    logger.warn('[WhatsApp] Invalid webhook object type', { object: body.object });
    return;
  }

  try {
    // Process entries (can be multiple)
    if (!Array.isArray(body.entry)) {
      return;
    }

    for (const entry of body.entry) {
      if (!entry.changes || !Array.isArray(entry.changes)) {
        continue;
      }

      for (const change of entry.changes) {
        const value = change.value;

        if (!value) {
          continue;
        }

        // Handle incoming messages
        if (value.messages && Array.isArray(value.messages)) {
          for (const message of value.messages) {
            await handleIncomingMessage(message, value);
          }
        }

        // Handle status updates (delivery, read, etc.)
        if (value.statuses && Array.isArray(value.statuses)) {
          for (const status of value.statuses) {
            logger.debug('[WhatsApp] Status update', {
              messageId: status.id,
              status: status.status,
              timestamp: status.timestamp,
            });
          }
        }
      }
    }
  } catch (error) {
    logger.error('[WhatsApp] Webhook processing error', { error });
  }
});

/**
 * Handle incoming WhatsApp message
 */
async function handleIncomingMessage(message: any, value: any): Promise<void> {
  try {
    const fromPhone = message.from; // Customer's phone number
    const messageType = message.type;
    const timestamp = message.timestamp;

    logger.debug('[WhatsApp] Incoming message', {
      from: fromPhone,
      type: messageType,
      timestamp,
    });

    // Only handle text messages for now
    if (messageType !== 'text') {
      return;
    }

    const messageText = message.text?.body || '';

    if (!messageText.trim()) {
      return;
    }

    // Get store from the webhook context
    // The store ID should be configured in the webhook setup
    const storeId = process.env.WHATSAPP_STORE_ID;

    if (!storeId) {
      logger.error('[WhatsApp] WHATSAPP_STORE_ID not configured');
      return;
    }

    // Route to the ordering service state machine
    await whatsappOrderingService.handleIncomingMessage(fromPhone, storeId, messageText);
  } catch (error) {
    logger.error('[WhatsApp] Failed to handle incoming message', { error });
  }
}

export default router;
