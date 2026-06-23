/**
 * whatsappReorderService
 *
 * Sends a WhatsApp template message after order confirmation with a Reorder CTA.
 *
 * Template name : rez_reorder  (must be pre-approved in Meta Business Manager)
 * Language      : en
 * Body variables: {{1}} customerName, {{2}} storeName, {{3}} orderTotal
 * Button URL    : https://now.rez.money/<storeSlug>?reorder=<orderNumber>
 *
 * Only fires when WHATSAPP_REORDER_ENABLED=true.
 * All errors are caught silently — never blocks the order response.
 */

import axios from 'axios';
import { logger } from '../config/logger';

const META_API_VERSION = 'v19.0';
const META_BASE_URL = 'https://graph.facebook.com';
const SEND_TIMEOUT_MS = 10_000;

export interface ReorderWhatsAppParams {
  phone: string;
  customerName: string;
  storeName: string;
  orderTotal: string;
  storeSlug: string;
  orderNumber: string;
}

function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) return `91${cleaned}`;
  if (cleaned.startsWith('0')) return `91${cleaned.slice(1)}`;
  return cleaned;
}

/**
 * Sends a WhatsApp reorder message via Meta Cloud API.
 * Fire-and-forget — caller should `.catch(() => {})` if desired.
 */
export async function sendReorderWhatsApp(params: ReorderWhatsAppParams): Promise<void> {
  if (process.env.WHATSAPP_REORDER_ENABLED !== 'true') {
    return;
  }

  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;

  if (!token || !phoneId) {
    logger.warn('[WA:Reorder] WHATSAPP_TOKEN or WHATSAPP_PHONE_ID not configured — skipping reorder message');
    return;
  }

  const to = normalizePhone(params.phone);
  const reorderUrl = `https://now.rez.money/${params.storeSlug}?reorder=${params.orderNumber}`;

  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: 'rez_reorder',
      language: { code: 'en' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: params.customerName || 'there' },
            { type: 'text', text: params.storeName },
            { type: 'text', text: params.orderTotal },
          ],
        },
        {
          type: 'button',
          sub_type: 'url',
          index: '0',
          parameters: [
            // The dynamic URL suffix appended to the template's base button URL
            { type: 'text', text: `${params.storeSlug}?reorder=${params.orderNumber}` },
          ],
        },
      ],
    },
  };

  try {
    const response = await axios.post(`${META_BASE_URL}/${META_API_VERSION}/${phoneId}/messages`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: SEND_TIMEOUT_MS,
    });

    const messageId = response.data?.messages?.[0]?.id;
    logger.info('[WA:Reorder] Reorder message sent', {
      orderNumber: params.orderNumber,
      storeSlug: params.storeSlug,
      phone: `***${to.slice(-4)}`,
      reorderUrl,
      messageId,
    });
  } catch (err: unknown) {
    const axiosErr = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
    const errMsg = axiosErr?.response?.data?.error?.message || axiosErr?.message || 'unknown';
    logger.warn('[WA:Reorder] Failed to send reorder message (non-blocking)', {
      orderNumber: params.orderNumber,
      phone: `***${to.slice(-4)}`,
      error: errMsg,
    });
    // Intentionally swallowed — must never block the order response
  }
}
