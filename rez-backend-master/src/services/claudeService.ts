/**
 * Claude AI Service
 * Wraps the Anthropic Messages API with retry logic and cost tracking.
 */

import { logger } from '../config/logger';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-3-5-sonnet-20241022';
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 500;

interface ChatParams {
  systemPrompt: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  newMessage: string;
}

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicRequestBody {
  model: string;
  max_tokens: number;
  system: string;
  messages: AnthropicMessage[];
  temperature: number;
}

interface AnthropicErrorResponse {
  type: string;
  error: {
    type: string;
    message: string;
  };
}

/**
 * Sleep for a given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Log cost and latency to analytics. Currently logs to logger —
 * replace with a dedicated analytics service in production.
 */
function logAnalytics(model: string, inputTokens: number, outputTokens: number, latencyMs: number): void {
  logger.info('[ClaudeService] API call', {
    model,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    latencyMs,
  });
}

export class ClaudeService {
  private apiKey: string;
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor() {
    this.apiKey = process.env.CLAUDE_API_KEY ?? '';
    this.model = process.env.CLAUDE_MODEL ?? DEFAULT_MODEL;
    this.maxTokens = Number(process.env.CLAUDE_MAX_TOKENS ?? '1024');
    this.temperature = Number(process.env.CLAUDE_TEMPERATURE ?? '0.7');

    if (!this.apiKey) {
      logger.warn('[ClaudeService] CLAUDE_API_KEY is not set — AI chat will return fallback responses.');
    }
  }

  /**
   * Send a chat message to Claude with exponential-backoff retry on transient failures.
   */
  async chat(params: ChatParams): Promise<string> {
    const { systemPrompt, conversationHistory, newMessage } = params;

    if (!this.apiKey) {
      logger.warn('[ClaudeService] No API key — returning fallback response.');
      return 'Our assistant is taking a short break. Please try again shortly.';
    }

    // Build messages array: all prior messages + the new user message
    const messages: AnthropicMessage[] = [
      ...conversationHistory.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content: newMessage },
    ];

    const body: AnthropicRequestBody = {
      model: this.model,
      max_tokens: this.maxTokens,
      system: systemPrompt,
      messages,
      temperature: this.temperature,
    };

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const startMs = Date.now();

      try {
        const response = await fetch(ANTHROPIC_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(30_000), // 30s timeout per request
        });

        const latencyMs = Date.now() - startMs;

        if (response.ok) {
          const data = (await response.json()) as {
            content: Array<{ type: string; text: string }>;
            usage: { input_tokens: number; output_tokens: number };
          };

          logAnalytics(this.model, data.usage.input_tokens, data.usage.output_tokens, latencyMs);

          const textContent = data.content?.[0];
          if (textContent?.type === 'text' && textContent.text) {
            return textContent.text;
          }

          logger.warn('[ClaudeService] Unexpected response shape', { content: data.content });
          return 'Our assistant is taking a short break. Please try again shortly.';
        }

        if (response.status === 429) {
          // Rate limited — retry with backoff
          const retryAfter = response.headers.get('retry-after-ms');
          const waitMs = retryAfter ? Number(retryAfter) : INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
          logger.warn(`[ClaudeService] Rate limited (429), attempt ${attempt}/${MAX_RETRIES}, waiting ${waitMs}ms`);
          if (attempt < MAX_RETRIES) {
            await sleep(waitMs);
            continue;
          }
        }

        const errorBody = (await response.json().catch(() => ({}))) as AnthropicErrorResponse;
        const errorMessage = errorBody?.error?.message ?? `HTTP ${response.status}`;

        // 4xx errors (except 429) are not retried
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          logger.error(`[ClaudeService] Non-retryable HTTP ${response.status}: ${errorMessage}`);
          return `Our assistant encountered an issue (${response.status}). Please try again shortly.`;
        }

        lastError = new Error(`HTTP ${response.status}: ${errorMessage}`);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        logger.error(`[ClaudeService] Fetch error on attempt ${attempt}/${MAX_RETRIES}: ${lastError.message}`);
      }

      if (attempt < MAX_RETRIES) {
        const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
        await sleep(backoffMs);
      }
    }

    // All retries exhausted
    logger.error('[ClaudeService] All retries exhausted', { error: lastError?.message });
    return 'Our assistant is taking a short break. Please try again shortly.';
  }
}

// Singleton instance
let claudeServiceInstance: ClaudeService | null = null;

export function getClaudeService(): ClaudeService {
  if (!claudeServiceInstance) {
    claudeServiceInstance = new ClaudeService();
  }
  return claudeServiceInstance;
}

export default getClaudeService;
