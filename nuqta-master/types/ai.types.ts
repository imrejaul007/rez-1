/**
 * AI Assistant — Type Definitions
 *
 * Shared contracts for the chat-only REZ AI Assistant (Phase 4.1).
 *
 * The frontend (`contexts/AIChatContext`, `components/b/ai/*`,
 * `app/b/ai-assistant.tsx`) and the backend (`src/routes/b/ai.ts`) both
 * rely on these shapes. Keep this file the single source of truth — do
 * NOT redeclare these interfaces inside service or component files.
 *
 * Scope
 * -----
 * Phase 4.1 is chat-only. There is no streaming, no tool-calling, and
 * no agent orchestration yet. The `ChatMessage` shape is therefore
 * intentionally narrow: a single content string, an optional typing
 * flag for the UI, and an optional list of quick-reply chips.
 *
 * Future phases (4.2+) will extend — not break — these shapes:
 *   - streaming: append-only `delta` payloads on a new event type
 *   - rich cards: a new `attachments` field on `ChatMessage`
 *   - tool calls: a new `toolCall` envelope on `ChatIntent`
 */

/**
 * Roles a message in the conversation can play.
 *
 *   - `'user'`       — message authored by the human
 *   - `'assistant'`  — message authored by the REZ AI assistant
 *   - `'system'`     — internal system note (e.g. session started)
 *
 * NOTE: we do NOT use `'tool'` here in 4.1 — tool-calls are a future
 *       phase and adding the role now would force a wider union.
 */
export type ChatMessageRole = 'user' | 'assistant' | 'system';

/**
 * A single message in an AI Assistant conversation.
 *
 * The shape is deliberately minimal so it round-trips cleanly between
 * the backend's keyword-mock and the frontend's bubble renderer.
 */
export interface ChatMessage {
  /** Stable client/server identifier (e.g. `msg_01HXY...`). */
  id: string;
  /** Who authored this message. */
  role: ChatMessageRole;
  /** Plain-text content. Markdown is NOT rendered in 4.1. */
  content: string;
  /** ISO-8601 timestamp at which the message was created. */
  timestamp: string;
  /**
   * When `true`, the bubble renders as a transient typing indicator
   * (3 animated dots) rather than the literal `content`. The frontend
   * uses this for the optimistic "assistant is typing" placeholder
   * that is shown while the network round-trip is in flight.
   */
  isTyping?: boolean;
  /**
   * Optional chips the user can tap to send a canned follow-up. Empty
   * / undefined means no chips for this message.
   */
  quickReplies?: string[];
}

/**
 * A full conversation thread between the user and the assistant.
 *
 * In 4.1 we don't persist conversations server-side yet — this shape
 * is what the `GET /api/b/ai/conversations` endpoint will return when
 * Phase 4.2 introduces persistence. For now the frontend keeps a
 * single in-memory conversation.
 */
export interface ChatConversation {
  /** Stable conversation id (e.g. `conv_01HXY...`). */
  id: string;
  /** Ordered list of messages — index 0 is the oldest. */
  messages: ChatMessage[];
  /** ISO-8601 timestamp of the first user message. */
  startedAt: string;
  /**
   * The intent the backend inferred from the most recent user
   * message, e.g. `'savings'`, `'offers'`. Useful for analytics and
   * for routing the user to a deeper page (see `suggestedRoute`).
   */
  detectedIntent?: string;
}

/**
 * Intent classification result for a single user turn.
 *
 * The mock backend returns these for keyword matches. In a future
 * phase this would come from an ML model; the contract stays the
 * same so the UI can bind to it without changes.
 */
export interface ChatIntent {
  /** Canonical intent slug, e.g. `'savings'`, `'offers'`, `'wallet'`. */
  intent: string;
  /**
   * Confidence in `[0, 1]`. The mock backend uses heuristic values
   * (0.6–0.95); a real classifier would emit a calibrated score.
   */
  confidence: number;
  /**
   * Optional app route the assistant suggests opening, e.g.
   * `'/b/savings'` for the savings intent. When the UI sees this it
   * can render a "Open dashboard" deep-link chip.
   */
  suggestedRoute?: string;
}

/**
 * Payload sent to `POST /api/b/ai/chat`.
 *
 * `sessionId` is optional — when omitted the backend mints a new
 * one and returns it via the `reply.id` (the message id encodes the
 * session for the mock). `context` lets the frontend pass hints like
 * `{ surface: 'ai-assistant' }` without leaking PII.
 */
export interface ChatRequestPayload {
  sessionId?: string;
  message: string;
  context?: Record<string, string | number | boolean>;
}

/**
 * Response envelope for `POST /api/b/ai/chat`.
 *
 * Shape mirrors what the backend's `bSuccess(res, ...)` helper emits
 * under `data` — the frontend can hand it straight to its state.
 */
export interface ChatResponse {
  /** The assistant's reply message. */
  reply: ChatMessage;
  /** Detected intent for the user's message, if any. */
  intent?: ChatIntent;
  /** Quick-reply chips to show alongside the assistant's reply. */
  quickReplies?: string[];
}

/**
 * Payload for `GET /api/b/ai/conversations`.
 *
 * Phase 4.1 returns a stub `{ conversations: [] }` — persistence
 * ships in 4.2. The shape is locked so the frontend list renderer
 * can ship today against the empty array.
 */
export interface ConversationsResponse {
  conversations: ChatConversation[];
}
