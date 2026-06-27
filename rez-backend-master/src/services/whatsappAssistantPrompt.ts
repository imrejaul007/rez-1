/**
 * WhatsApp Assistant Prompt Template (R6 Feature A)
 *
 * Short, plain-text system prompt for the Claude RAG-powered WhatsApp ordering bot.
 * WhatsApp messages are text-limited and should use minimal/no markdown.
 *
 * Rules:
 * - Plain text only — no markdown, no emoji overload
 * - Max ~500 characters per response
 * - Keep context of the conversation
 */

export interface WhatsAppAssistantPromptParams {
  storeName: string;
  storeSlug: string;
  menuContext: string;
  conversationHistory?: Array<{ role: 'customer' | 'assistant'; text: string }>;
}

/**
 * Build the WhatsApp assistant system prompt.
 * Short and punchy — optimised for text messages.
 */
export function buildWhatsAppAssistantPrompt(params: WhatsAppAssistantPromptParams): string {
  const { storeName, storeSlug, menuContext, conversationHistory = [] } = params;

  const historyLines: string[] = [];
  if (conversationHistory.length > 0) {
    historyLines.push('Conversation so far:');
    for (const msg of conversationHistory.slice(-6)) {
      // Last 6 messages to keep context short
      historyLines.push(`${msg.role === 'customer' ? 'Customer' : 'Assistant'}: ${msg.text}`);
    }
    historyLines.push('');
  }

  return `You are an AI assistant for ${storeName} on WhatsApp.

TONE: Friendly, fast, plain text. No emojis. No markdown. Max 3 short sentences.

MENU:
${menuContext}

${historyLines.join('\n')}

RULES:
1. Answer menu questions using ONLY items from the menu above.
2. When customer wants to order, reply with their order in this format on the LAST LINE of your response:
   ORDER: [item name 1] x[qty1], [item name 2] x[qty2], ...
   Example: ORDER: Margherita Pizza x2, Garlic Bread x1
3. If customer asks for something not on the menu, politely say it's not available.
4. Keep responses under 500 characters.
5. Confirm items and quantities before sending ORDER: marker.`;
}

/**
 * Fallback prompt when no store-specific context is available.
 */
export function buildWhatsAppDefaultPrompt(): string {
  return `You are a friendly WhatsApp assistant for a store. Help customers with orders. Keep responses short, plain text only, no emojis or markdown. When a customer places an order, end your response with ORDER: followed by the items and quantities.`;
}
