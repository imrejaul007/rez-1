/**
 * AI Response Parser
 * Extracts structured JSON from Claude's text output.
 * Claude wraps structured responses (orders, reservations) in ```json ... ``` blocks.
 * Plain conversational replies are returned as-is as type="text".
 */

export type AIResponseType = 'text' | 'order' | 'recommendation' | 'reservation' | 'handoff';

export interface ParsedOrderItem {
  name: string;
  qty: number;
}

export interface ParsedOrder {
  items: Array<{
    name: string;
    qty: number;
    unitPrice?: number;
    total?: number;
  }>;
}

export interface ParsedReservation {
  date: string;
  time: string;
  guests: number;
  name?: string;
  phone?: string;
}

export interface ParsedAIResponse {
  type: AIResponseType;
  content: string;
  items?: ParsedOrderItem[];
  reservationParams?: ParsedReservation;
  rawJson?: Record<string, unknown>;
}

/**
 * Attempt to extract and parse a JSON code block from the given text.
 * Returns null if no valid JSON block is found.
 */
function extractJsonBlock(text: string): Record<string, unknown> | null {
  // Match triple-backtick json blocks (with optional language tag)
  const jsonBlockPattern = /```(?:json)?\s*([\s\S]*?)```/i;
  const match = text.match(jsonBlockPattern);

  if (!match) return null;

  const jsonStr = match[1].trim();
  try {
    return JSON.parse(jsonStr) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Parse Claude's text output into a structured response.
 *
 * Strategy:
 * 1. Try to extract a ```json ... ``` block and parse it.
 * 2. If valid JSON found with a `type` field, return structured data.
 * 3. Otherwise, strip the json block from the text and return as type="text".
 * 4. For type="order", normalize items to always have qty.
 * 5. For type="reservation", ensure required fields exist.
 */
export function parse(text: string): ParsedAIResponse {
  if (!text || typeof text !== 'string') {
    return { type: 'text', content: '' };
  }

  const jsonData = extractJsonBlock(text);

  if (jsonData && jsonData.type && typeof jsonData.type === 'string') {
    const responseType = jsonData.type as AIResponseType;
    const content = text.replace(/```(?:json)?\s*[\s\S]*?```/i, '').trim();

    switch (responseType) {
      case 'order': {
        const rawItems = jsonData.items;
        const items: ParsedOrderItem[] = [];

        if (Array.isArray(rawItems)) {
          for (const item of rawItems) {
            if (item && typeof item === 'object' && typeof item.name === 'string') {
              items.push({
                name: item.name.trim(),
                qty: typeof item.qty === 'number' && item.qty > 0 ? item.qty : 1,
              });
            }
          }
        }

        return {
          type: 'order',
          content: content || 'I have your order ready.',
          items,
          rawJson: jsonData,
        };
      }

      case 'reservation': {
        const rp = jsonData as Record<string, unknown>;
        const reservationParams: ParsedReservation = {
          date: typeof rp.date === 'string' ? rp.date : '',
          time: typeof rp.time === 'string' ? rp.time : '',
          guests: typeof rp.guests === 'number' && rp.guests > 0 ? rp.guests : 1,
          name: typeof rp.name === 'string' ? rp.name : undefined,
          phone: typeof rp.phone === 'string' ? rp.phone : undefined,
        };

        return {
          type: 'reservation',
          content: content || 'I have your reservation details.',
          reservationParams,
          rawJson: jsonData,
        };
      }

      case 'recommendation':
      case 'handoff':
      case 'text':
        return {
          type: responseType,
          content: content || text.trim(),
          rawJson: jsonData,
        };

      default:
        // Unknown type — treat as text
        return {
          type: 'text',
          content: text.trim(),
          rawJson: jsonData,
        };
    }
  }

  // No structured JSON found — return as plain text
  // Strip any lingering json blocks that lack a type field
  const cleaned = jsonData ? text.replace(/```(?:json)?\s*[\s\S]*?```/i, '').trim() : text.trim();

  return {
    type: 'text',
    content: cleaned || text.trim(),
  };
}
