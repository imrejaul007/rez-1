/**
 * WhatsAppMarketingService
 *
 * Handles WhatsApp broadcast delivery for merchant campaigns via Meta Graph API.
 * Uses the same WHATSAPP_TOKEN / WHATSAPP_PHONE_ID as the ordering bot.
 *
 * Two delivery modes:
 *   1. Text message — plain promotional text (works for opted-in users in same 24h window)
 *   2. Template message — pre-approved Meta template (works anytime, required outside 24h)
 *
 * Rate limits enforced:
 *   - 80 messages/second (Meta tier-1 default)
 *   - 1000 unique conversations/day on free tier
 *   - Per-campaign Redis dedup to prevent double-sends on worker retry
 */

import axios from 'axios';
import { logger } from '../config/logger';
import { getRedis } from '../config/redis-pool';

const META_API_VERSION = 'v19.0';
const META_BASE_URL = 'https://graph.facebook.com';
const SEND_TIMEOUT_MS = 15_000;
// Inter-message delay to stay within Meta's 80 msg/s rate limit
const MESSAGE_DELAY_MS = 15;

export interface WhatsAppTextPayload {
  to: string;
  message: string;
  campaignId: string;
  merchantId: string;
}

export interface WhatsAppTemplatePayload {
  to: string;
  templateName: string;
  languageCode: string;
  components: MetaTemplateComponent[];
  campaignId: string;
  merchantId: string;
}

export interface MetaTemplateComponent {
  type: 'header' | 'body' | 'button';
  parameters: MetaTemplateParameter[];
}

export interface MetaTemplateParameter {
  type: 'text' | 'image' | 'document' | 'video';
  text?: string;
  image?: { link: string };
}

export interface WhatsAppDeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
  deduped?: boolean;
}

class WhatsAppMarketingService {
  private get token(): string | undefined {
    return process.env.WHATSAPP_TOKEN;
  }

  private get phoneId(): string | undefined {
    return process.env.WHATSAPP_PHONE_ID;
  }

  get isConfigured(): boolean {
    return !!(this.token && this.phoneId);
  }

  // ── Phone normalisation ───────────────────────────────────────────────────

  normalizePhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) return `91${cleaned}`;
    if (cleaned.startsWith('0')) return `91${cleaned.slice(1)}`;
    return cleaned;
  }

  // ── Deduplication ─────────────────────────────────────────────────────────

  private dedupKey(campaignId: string, phone: string): string {
    return `wa:mkt:dedup:${campaignId}:${phone}`;
  }

  private async isDuplicate(campaignId: string, phone: string): Promise<boolean> {
    try {
      const redis = getRedis();
      const key = this.dedupKey(campaignId, phone);
      const result = await redis.set(key, '1', 'EX', 86400, 'NX');
      // NX means "only set if not exists" — if null, key already existed = duplicate
      return result === null;
    } catch {
      // Redis failure — allow send rather than block campaign
      return false;
    }
  }

  // ── Meta API call ─────────────────────────────────────────────────────────

  private async callMetaApi(payload: object): Promise<{ messageId?: string }> {
    if (!this.isConfigured) {
      throw new Error('WhatsApp not configured: WHATSAPP_TOKEN or WHATSAPP_PHONE_ID missing');
    }

    const response = await axios.post(`${META_BASE_URL}/${META_API_VERSION}/${this.phoneId}/messages`, payload, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      timeout: SEND_TIMEOUT_MS,
    });

    const messageId = response.data?.messages?.[0]?.id;
    return { messageId };
  }

  // ── Send plain text ───────────────────────────────────────────────────────

  async sendText(options: WhatsAppTextPayload): Promise<WhatsAppDeliveryResult> {
    const phone = this.normalizePhone(options.to);

    const deduped = await this.isDuplicate(options.campaignId, phone);
    if (deduped) {
      logger.debug('[WA:Marketing] Deduped — already sent this campaign to user', {
        campaignId: options.campaignId,
        phone: `***${phone.slice(-4)}`,
      });
      return { success: true, deduped: true };
    }

    try {
      const { messageId } = await this.callMetaApi({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: options.message, preview_url: false },
      });

      logger.info('[WA:Marketing] Text sent', {
        campaignId: options.campaignId,
        merchantId: options.merchantId,
        phone: `***${phone.slice(-4)}`,
        messageId,
      });

      return { success: true, messageId };
    } catch (err: any) {
      const error = err?.response?.data?.error?.message || err?.message || 'unknown';
      logger.error('[WA:Marketing] Text send failed', {
        campaignId: options.campaignId,
        phone: `***${phone.slice(-4)}`,
        error,
      });
      return { success: false, error };
    }
  }

  // ── Send template ─────────────────────────────────────────────────────────

  async sendTemplate(options: WhatsAppTemplatePayload): Promise<WhatsAppDeliveryResult> {
    const phone = this.normalizePhone(options.to);

    const deduped = await this.isDuplicate(options.campaignId, phone);
    if (deduped) {
      return { success: true, deduped: true };
    }

    try {
      const { messageId } = await this.callMetaApi({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'template',
        template: {
          name: options.templateName,
          language: { code: options.languageCode || 'en' },
          components: options.components,
        },
      });

      logger.info('[WA:Marketing] Template sent', {
        campaignId: options.campaignId,
        merchantId: options.merchantId,
        template: options.templateName,
        phone: `***${phone.slice(-4)}`,
        messageId,
      });

      return { success: true, messageId };
    } catch (err: any) {
      const error = err?.response?.data?.error?.message || err?.message || 'unknown';
      logger.error('[WA:Marketing] Template send failed', {
        campaignId: options.campaignId,
        phone: `***${phone.slice(-4)}`,
        error,
      });
      return { success: false, error };
    }
  }

  // ── Batch send (used by broadcastWorker) ──────────────────────────────────

  /**
   * Send to a batch of customers with rate limiting.
   * Returns { sent, failed, deduped } counts.
   */
  async sendBatch(
    customers: Array<{ phone: string; name?: string }>,
    campaign: { _id: string; merchantId: string; message: string; templateName?: string; name: string },
  ): Promise<{ sent: number; failed: number; deduped: number }> {
    const counts = { sent: 0, failed: 0, deduped: 0 };

    for (const customer of customers) {
      if (!customer.phone) {
        counts.failed++;
        continue;
      }

      // Personalise message — replace {{name}} with customer name
      const message = campaign.message.replace(/\{\{name\}\}/g, customer.name || 'valued customer');

      let result: WhatsAppDeliveryResult;

      if (campaign.templateName) {
        result = await this.sendTemplate({
          to: customer.phone,
          templateName: campaign.templateName,
          languageCode: 'en',
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: customer.name || 'valued customer' },
                { type: 'text', text: message },
              ],
            },
          ],
          campaignId: campaign._id.toString(),
          merchantId: campaign.merchantId.toString(),
        });
      } else {
        result = await this.sendText({
          to: customer.phone,
          message,
          campaignId: campaign._id.toString(),
          merchantId: campaign.merchantId.toString(),
        });
      }

      if (result.deduped) counts.deduped++;
      else if (result.success) counts.sent++;
      else counts.failed++;

      // Rate limit — 80 msg/s max per Meta tier-1
      await new Promise((r) => setTimeout(r, MESSAGE_DELAY_MS));
    }

    return counts;
  }
}

export const whatsAppMarketingService = new WhatsAppMarketingService();
export default whatsAppMarketingService;
