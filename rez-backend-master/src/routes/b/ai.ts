/**
 * AI Assistant routes — REZ-vs-NUQTA migration (Phase 4.1)
 *
 * Sub-router mounted under `/api/b/ai`. Provides a chat-only surface
 * for the REZ AI Assistant screen.
 *
 * Endpoints
 * ---------
 *   POST /api/b/ai/chat
 *     Accepts `{ sessionId?, message, context? }`. Returns a keyword-
 *     mocked reply plus the detected intent and (optionally) a list
 *     of quick-reply chips the UI can surface. The mock is fully
 *     deterministic so the frontend can ship a happy-path before the
 *     real LLM is wired in.
 *
 *   GET  /api/b/ai/conversations
 *     Returns the user's recent conversations. Phase 4.1 returns an
 *     empty list — persistence ships in 4.2. The shape is locked so
 *     the list renderer can ship today against `[]`.
 *
 * Keyword map
 * -----------
 *   - "savings" / "saved"      → savings reply + /b/savings deep link
 *   - "offer" / "discount"     → offers reply
 *   - "wallet" / "coins" / "cash" → wallet reply
 *   - "help" / "support"       → help reply with a chip row
 *   - everything else          → default "connect you to support" reply
 *
 * Mounted in `src/routes/b/index.ts` as
 *     router.use('/ai', aiBRoutes);
 */
import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { bSuccess, bError } from '../../utils/bResponse';
import { logger } from '../../config/logger';

// ---------------------------------------------------------------------------
// Types (mirrors nuqta-master/types/ai.types.ts)
// ---------------------------------------------------------------------------

/** Roles a chat message can play. */
export type ChatMessageRole = 'user' | 'assistant' | 'system';

/** A single chat message in a conversation. */
export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  timestamp: string;
  isTyping?: boolean;
  quickReplies?: string[];
}

/** Detected intent for a user turn. */
export interface ChatIntent {
  intent: string;
  confidence: number;
  suggestedRoute?: string;
}

/** Request body for `POST /api/b/ai/chat`. */
export interface ChatRequestBody {
  sessionId?: string;
  message: string;
  context?: Record<string, string | number | boolean>;
}

/** Response payload for `POST /api/b/ai/chat`. */
export interface ChatResponse {
  reply: ChatMessage;
  intent?: ChatIntent;
  quickReplies?: string[];
}

/** A single conversation thread. */
export interface ChatConversation {
  id: string;
  messages: ChatMessage[];
  startedAt: string;
  detectedIntent?: string;
}

/** Response payload for `GET /api/b/ai/conversations`. */
export interface ConversationsResponse {
  conversations: ChatConversation[];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Monotonically-increasing local counter for message ids. */
let _idCounter = 0;

/**
 * Mint a stable, sortable message id of the form
 * `msg_<base36-timestamp>_<counter>`. Counter is included so two
 * messages created in the same millisecond still get distinct ids.
 */
function makeMessageId(): string {
  _idCounter += 1;
  return `msg_${Date.now().toString(36)}_${_idCounter.toString(36)}`;
}

/** Mint a new session id when the client doesn't supply one. */
function makeSessionId(): string {
  return `sess_${Date.now().toString(36)}_${_idCounter.toString(36)}`;
}

/** Lowercase, trimmed copy of the user message for keyword matching. */
function normalise(message: string): string {
  return message.trim().toLowerCase();
}

/** Build an assistant `ChatMessage` with sensible defaults. */
function buildAssistantMessage(
  content: string,
  options: { quickReplies?: string[] } = {},
): ChatMessage {
  return {
    id: makeMessageId(),
    role: 'assistant',
    content,
    timestamp: new Date().toISOString(),
    ...(options.quickReplies && options.quickReplies.length > 0
      ? { quickReplies: options.quickReplies }
      : {}),
  };
}

/**
 * Classify a user message into an intent slug. Returns `null` when no
 * keyword fires — the caller will then return the default reply.
 *
 * The keyword set is intentionally narrow in 4.1 (the UI ships three
 * starter chips + a help chip). Phase 4.2 will replace this with an
 * LLM call while keeping the same response shape.
 */
function classifyIntent(
  text: string,
): { intent: string; confidence: number; suggestedRoute?: string } | null {
  if (
    text.includes('saving') ||
    text.includes('saved') ||
    text.includes('savings')
  ) {
    return { intent: 'savings', confidence: 0.92, suggestedRoute: '/b/savings' };
  }
  if (
    text.includes('offer') ||
    text.includes('discount') ||
    text.includes('deal') ||
    text.includes('cashback')
  ) {
    return { intent: 'offers', confidence: 0.9, suggestedRoute: '/b/near-u' };
  }
  if (
    text.includes('wallet') ||
    text.includes('coin') ||
    text.includes('coins') ||
    text.includes('cash') ||
    text.includes('balance')
  ) {
    return { intent: 'wallet', confidence: 0.88, suggestedRoute: '/b/coin-expiry' };
  }
  if (text.includes('help') || text.includes('support')) {
    return { intent: 'help', confidence: 0.75 };
  }
  if (text.includes('order') || text.includes('track')) {
    return { intent: 'orders', confidence: 0.8 };
  }
  return null;
}

/** Build the canned reply for a given intent slug. */
function buildReplyForIntent(
  intent: string,
): { content: string; quickReplies?: string[] } {
  switch (intent) {
    case 'savings':
      return {
        content: 'Your total savings: ₹12,450. Open dashboard.',
        quickReplies: ['Open savings', 'Show streak', 'Help'],
      };
    case 'offers':
      return {
        content: '5 offers near you. Tap to explore.',
        quickReplies: ['Show my savings', 'Help'],
      };
    case 'wallet':
      return {
        content: 'Your REZ wallet has ₹8,200.',
        quickReplies: ['Expiring coins', 'Show my savings', 'Help'],
      };
    case 'orders':
      return {
        content: "What's the order id? I can pull the latest status for you.",
        quickReplies: ['Help'],
      };
    case 'help':
    default:
      return {
        content:
          'I can help with savings, offers, wallet, orders. What do you need?',
        quickReplies: [
          'Show my savings',
          'Find offers near me',
          'How do I earn more?',
        ],
      };
  }
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = Router();

/** Every AI endpoint requires authentication. */
router.use(authenticate);

/**
 * POST /api/b/ai/chat
 *
 * Sends a user turn through the keyword-mock and returns the
 * assistant's reply. When `sessionId` is omitted a fresh one is
 * minted and returned via the `reply.id` prefix is not guaranteed,
 * so the frontend should keep the original `sessionId` it sent in.
 *
 * Body: `{ sessionId?, message, context? }`
 * Returns: `{ reply, intent?, quickReplies? }`
 */
router.post('/chat', (req, res) => {
  const body = req.body as Partial<ChatRequestBody> | undefined;
  const rawMessage = body?.message;
  if (typeof rawMessage !== 'string' || rawMessage.trim().length === 0) {
    return bError(res, 'message is required and must be a non-empty string', 400);
  }

  const message = rawMessage.trim();
  const sessionId =
    typeof body?.sessionId === 'string' && body.sessionId.length > 0
      ? body.sessionId
      : makeSessionId();

  const text = normalise(message);
  const classification = classifyIntent(text);
  const intentSlug = classification?.intent ?? 'fallback';
  const canned = buildReplyForIntent(intentSlug);

  const reply = buildAssistantMessage(canned.content, {
    ...(canned.quickReplies ? { quickReplies: canned.quickReplies } : {}),
  });

  const responsePayload: ChatResponse = {
    reply,
    ...(classification
      ? {
          intent: {
            intent: classification.intent,
            confidence: classification.confidence,
            ...(classification.suggestedRoute
              ? { suggestedRoute: classification.suggestedRoute }
              : {}),
          },
        }
      : {}),
    ...(canned.quickReplies ? { quickReplies: canned.quickReplies } : {}),
  };

  try {
    logger.info('b_ai_chat', {
      userId: req.userId ?? null,
      sessionId,
      intent: intentSlug,
      messageLength: message.length,
      confidence: classification?.confidence ?? null,
    });
  } catch {
    /* logger must never block the response */
  }

  return bSuccess(res, responsePayload);
});

/**
 * GET /api/b/ai/conversations
 *
 * Returns the user's recent AI Assistant conversations. Phase 4.1
 * returns an empty list — persistence ships in 4.2. The contract
 * is locked so the frontend can ship today against `[]` and never
 * needs to change when real data lands.
 *
 * Returns: `{ conversations: ChatConversation[] }`
 */
router.get('/conversations', (req, res) => {
  try {
    logger.info('b_ai_conversations', {
      userId: req.userId ?? null,
      count: 0,
    });
  } catch {
    /* logger must never block the response */
  }

  const payload: ConversationsResponse = { conversations: [] };
  return bSuccess(res, payload);
});

/**
 * Fallback: an unknown sub-route under `/api/b/ai/*` returns a 404
 * with the standard B-namespace error envelope.
 */
router.use((req, res) => {
  void req;
  return bError(
    res,
    `Unknown AI endpoint: ${req.method} ${req.originalUrl}`,
    404,
  );
});

export default router;
