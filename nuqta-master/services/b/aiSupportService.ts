/**
 * AI Support Service — REZ AI Assistant (Phase 4.1)
 *
 * Thin wrapper around `apiClient` for the `/api/b/ai/*` endpoints.
 *
 *   POST /api/b/ai/chat          — send a user turn, get a reply
 *   GET  /api/b/ai/conversations — list the user's recent chats
 *
 * All methods unwrap the standard `{ success, data }` envelope that
 * the backend's `bSuccess` helper emits and throw a descriptive
 * `Error` on failure (after logging via `utils/logger`).
 *
 * Mirrors the conventions of `services/b/savingsApi.ts` so the AI
 * service slots into the same patterns the rest of the B migration
 * already uses.
 */
import apiClient from '../apiClient';
import logger from '@/utils/logger';
import type {
  ChatRequestPayload,
  ChatResponse,
  ConversationsResponse,
} from '@/types/ai.types';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Endpoint prefix for the B-feature AI surface. */
const B_AI_PREFIX = '/b/ai';

/**
 * Unwrap a standard `{ success, data }` envelope and throw on failure.
 *
 * The shared `apiClient` already unwraps the backend's `data` field,
 * so `response.data` is the typed payload. We additionally guard
 * against `{ success: false }` envelopes (rare but emitted by some
 * endpoints — and by 4xx/5xx paths).
 *
 * @throws Error with a descriptive message when the call did not succeed.
 */
function unwrap<T>(response: {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}): T {
  if (!response.success || response.data === undefined || response.data === null) {
    const message = response.error || response.message || 'Unknown AI chat error';
    throw new Error(message);
  }
  return response.data;
}

/** Narrow an unknown thrown value into a string suitable for logging. */
function errorToString(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return 'Unknown error';
  }
}

/**
 * Build an `Error` whose `message` carries both the event name and
 * the structured context object — the logger surfaces the message
 * verbatim and the monitoring layer receives a real `Error`.
 */
function buildLogError(
  eventName: string,
  context: Record<string, unknown>,
  original: unknown,
): Error {
  const detail = errorToString(original);
  const message = `${eventName} | ${JSON.stringify(context)} | cause: ${detail}`;
  const err = new Error(message);
  err.name = eventName;
  return err;
}

// ---------------------------------------------------------------------------
// Public service
// ---------------------------------------------------------------------------

/**
 * Send a user turn to the REZ AI Assistant and return the reply.
 *
 * The backend's keyword-mock decides what to answer; the response
 * shape is locked via `ChatResponse` so the UI doesn't have to
 * branch on `intent` or `quickReplies` being absent.
 *
 * @param payload `sessionId` is optional; pass an existing one to
 *   continue a thread, omit it to start a fresh conversation.
 * @returns The assistant reply plus any detected intent + chips.
 * @throws Error when the network call fails or the envelope is malformed.
 *
 * @example
 * const res = await aiSupportService.sendMessage({
 *   message: 'Show my savings',
 *   context: { surface: 'ai-assistant' },
 * });
 * console.log(res.reply.content);
 */
async function sendMessage(payload: ChatRequestPayload): Promise<ChatResponse> {
  try {
    const response = await apiClient.post<ChatResponse>(
      `${B_AI_PREFIX}/chat`,
      payload,
    );
    return unwrap(response);
  } catch (error: unknown) {
    logger.error(
      'ai_chat_send_failed',
      buildLogError(
        'ai_chat_send_failed',
        {
          hasSessionId: typeof payload.sessionId === 'string',
          messageLength: payload.message.length,
          error: errorToString(error),
        },
        error,
      ),
      'B Features',
    );
    throw error instanceof Error ? error : new Error(errorToString(error));
  }
}

/**
 * Fetch the user's recent AI Assistant conversations.
 *
 * Phase 4.1 returns an empty array — persistence ships in 4.2. The
 * contract is locked so the list renderer can ship today against
 * `[]` and never have to be updated when real data lands.
 *
 * @returns A `ConversationsResponse` payload (possibly empty).
 * @throws Error when the call fails.
 *
 * @example
 * const { conversations } = await aiSupportService.getConversations();
 * console.log(conversations.length); // 0 today
 */
async function getConversations(): Promise<ConversationsResponse> {
  try {
    const response = await apiClient.get<ConversationsResponse>(
      `${B_AI_PREFIX}/conversations`,
    );
    const data = unwrap(response);
    // Defensive: backend might omit the key in some edge paths.
    return {
      conversations: Array.isArray(data?.conversations) ? data.conversations : [],
    };
  } catch (error: unknown) {
    logger.error(
      'ai_chat_conversations_failed',
      buildLogError(
        'ai_chat_conversations_failed',
        { error: errorToString(error) },
        error,
      ),
      'B Features',
    );
    throw error instanceof Error ? error : new Error(errorToString(error));
  }
}

// ---------------------------------------------------------------------------
// Aggregate export
// ---------------------------------------------------------------------------

/**
 * The AI Support service object. Import as:
 *
 *   import { aiSupportService } from '@/services/b/aiSupportService';
 */
export const aiSupportService = {
  sendMessage,
  getConversations,
};

export default aiSupportService;
