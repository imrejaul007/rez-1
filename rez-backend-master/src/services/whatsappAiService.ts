/**
 * WhatsApp AI Service (R6 Feature A)
 *
 * Powers the Claude RAG-powered WhatsApp ordering bot.
 * Integrates with menuRagService (R3) for menu context and claudeService for AI responses.
 *
 * Flow:
 *   1. Look up store by phone number (contact.whatsapp on Store model)
 *   2. Build RAG context from menuRagService
 *   3. Call Claude with WhatsApp-optimised prompt
 *   4. Parse response for ORDER: marker
 *   5. If order detected → whatsappOrderService.createOrderFromWhatsApp()
 *   6. Return reply text + optional payment link
 */

import { logger } from '../config/logger';
import { getClaudeService } from './claudeService';
import { getMenuRagService } from './menuRagService';
import mongoose from 'mongoose';
import { buildWhatsAppAssistantPrompt, buildWhatsAppDefaultPrompt } from '../prompts/whatsappAssistantPrompt';
import { Store } from '../models/Store';
import WhatsAppAiSession, { IWhatsAppMessage } from '../models/WhatsAppAiSession';
import whatsappOrderService from './whatsappOrderService';

export interface IncomingMessageResult {
  reply: string;
  orderCreated: boolean;
  paymentLink?: string;
  orderId?: string;
}

const MAX_RESPONSE_CHARS = 500;

export class WhatsAppAiService {
  /**
   * Normalise phone number: strip non-digits, prefix with 91 if 10-digit Indian number.
   */
  normalizePhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) return `91${cleaned}`;
    if (cleaned.startsWith('0')) return `91${cleaned.slice(1)}`;
    return cleaned;
  }

  /**
   * Process an incoming WhatsApp message from a customer.
   *
   * @param phone  - Customer's phone number (as received from WhatsApp webhook)
   * @param messageText - The text of the customer's message
   * @param storeSlugOverride - Optional store slug (used when phone lookup fails)
   */
  async processIncomingMessage(
    phone: string,
    messageText: string,
    storeSlugOverride?: string,
  ): Promise<IncomingMessageResult> {
    const normalisedPhone = this.normalizePhone(phone);
    const trimmedMessage = messageText.trim();

    if (!trimmedMessage) {
      return { reply: 'Please send a message and we will help you right away.', orderCreated: false };
    }

    logger.info('[WhatsAppAI] Processing message', {
      phone: `***${normalisedPhone.slice(-4)}`,
      messageLength: trimmedMessage.length,
      storeOverride: storeSlugOverride,
    });

    // Step 1: Look up store by WhatsApp number
    let storeSlug = storeSlugOverride;
    let storeName = 'our store';

    if (!storeSlug) {
      const store = await Store.findOne({
        $or: [{ whatsappNumber: normalisedPhone }, { 'contact.whatsapp': normalisedPhone }],
      })
        .select('slug name')
        .lean()
        .exec();

      if (store) {
        storeSlug = (store as any).slug;
        storeName = (store as any).name ?? storeSlug;
      }
    }

    if (!storeSlug) {
      logger.warn('[WhatsAppAI] No store found for phone', { phone: `***${normalisedPhone.slice(-4)}` });
      return {
        reply: "I don't recognise this number. Visit now.rez.money to find a store near you.",
        orderCreated: false,
      };
    }

    // Step 2: Get or create session
    let session = await WhatsAppAiSession.findOne({
      phone: normalisedPhone,
      storeSlug,
    }).exec();

    const now = new Date();

    if (!session) {
      session = new WhatsAppAiSession({
        phone: normalisedPhone,
        storeSlug,
        state: 'greeting',
        messages: [],
        lastInteractionAt: now,
      });
    } else {
      session.lastInteractionAt = now;
    }

    // Step 3: Add customer message to history
    const customerMessage: IWhatsAppMessage = {
      role: 'customer',
      text: trimmedMessage,
      timestamp: now,
    };
    session.messages.push(customerMessage);

    // Step 4: Build RAG context
    const menuRagService = getMenuRagService();
    const menuContext = await menuRagService.buildContext(storeSlug);

    // Step 5: Build conversation history for prompt (last 8 messages)
    const recentHistory = session.messages
      .slice(-8)
      .map((m) => ({ role: m.role as 'customer' | 'assistant', text: m.text }));

    // Step 6: Build prompt and call Claude
    const systemPrompt = storeName
      ? buildWhatsAppAssistantPrompt({ storeName, storeSlug, menuContext, conversationHistory: recentHistory })
      : buildWhatsAppDefaultPrompt();

    const claudeService = getClaudeService();
    const aiResponse = await claudeService.chat({
      systemPrompt,
      conversationHistory: recentHistory.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.text,
      })),
      newMessage: trimmedMessage,
    });

    // Step 7: Truncate to max chars
    let replyText = aiResponse.trim();
    if (replyText.length > MAX_RESPONSE_CHARS) {
      replyText = replyText.slice(0, MAX_RESPONSE_CHARS - 3) + '...';
    }

    // Step 8: Parse ORDER: marker
    let orderCreated = false;
    let orderId: string | undefined;
    let paymentLink: string | undefined;

    const orderMatch = aiResponse.match(/ORDER:\s*(.+)/i);
    if (orderMatch) {
      const orderItemsStr = orderMatch[1].trim();
      logger.info('[WhatsAppAI] Order detected from Claude', {
        phone: `***${normalisedPhone.slice(-4)}`,
        items: orderItemsStr,
      });

      try {
        const orderResult = await whatsappOrderService.createOrderFromWhatsApp(
          normalisedPhone,
          orderItemsStr,
          storeSlug,
        );

        if (orderResult) {
          orderCreated = true;
          orderId = orderResult.orderId;
          paymentLink = orderResult.paymentLink;
          session.pendingOrderId = new mongoose.Types.ObjectId(orderResult.orderId) as any;
          session.pendingPaymentLink = orderResult.paymentLink;
          session.state = 'confirmed';

          // Append payment link to the reply
          replyText += `\n\nClick to pay: ${orderResult.paymentLink}`;
        }
      } catch (err) {
        logger.error('[WhatsAppAI] Failed to create order from WhatsApp', {
          phone: `***${normalisedPhone.slice(-4)}`,
          error: err instanceof Error ? err.message : String(err),
        });
        replyText += '\n\nWe had trouble creating your order. Please try again or visit the store directly.';
      }
    } else {
      session.state = 'ordering';
    }

    // Step 9: Save assistant message to history
    const assistantMessage: IWhatsAppMessage = {
      role: 'assistant',
      text: replyText,
      timestamp: new Date(),
    };
    session.messages.push(assistantMessage);

    // Keep only last 20 messages to prevent unbounded growth
    if (session.messages.length > 20) {
      session.messages = session.messages.slice(-20);
    }

    await session.save();

    logger.info('[WhatsAppAI] Response sent', {
      phone: `***${normalisedPhone.slice(-4)}`,
      orderCreated,
      replyLength: replyText.length,
    });

    return { reply: replyText, orderCreated, paymentLink, orderId };
  }
}

// Singleton instance
let whatsappAiServiceInstance: WhatsAppAiService | null = null;

export function getWhatsAppAiService(): WhatsAppAiService {
  if (!whatsappAiServiceInstance) {
    whatsappAiServiceInstance = new WhatsAppAiService();
  }
  return whatsappAiServiceInstance;
}

export default getWhatsAppAiService;
