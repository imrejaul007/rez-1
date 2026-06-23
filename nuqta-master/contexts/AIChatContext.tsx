/**
 * AIChatContext — REZ AI Assistant (Phase 4.1)
 *
 * Provider that owns the in-memory chat session for the AI Assistant
 * screen. It wraps `services/b/aiSupportService` so the screen and any
 * future widget that needs to talk to the assistant share one
 * session id and one message list.
 *
 * Responsibilities
 * ----------------
 *   - Mint a stable `sessionId` on mount (lives for the lifetime of
 *     the provider; we'll persist across reloads in Phase 4.2).
 *   - Hold `messages`, `isTyping`, `isConnected`, `error`.
 *   - Expose actions: `sendMessage`, `sendQuickReply`, `clearMessages`,
 *     `startSession`, `endSession`, `detectIntent`.
 *   - Log every meaningful transition via `logger.info('ai_chat_*', ...)`.
 *
 * Failure mode
 * ------------
 * If the backend is unreachable, the user sees an inline error bubble
 * ("Couldn't reach assistant — try again") and the typing indicator
 * is dismissed. The provider never throws to its consumer; all errors
 * are captured in `state.error` and a single error message is appended
 * to the visible message list so the conversation stays continuous.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import logger from '@/utils/logger';
import aiSupportService from '@/services/b/aiSupportService';
import type {
  ChatIntent,
  ChatMessage,
  ChatMessageRole,
} from '@/types/ai.types';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Width of the synthetic `msg_` prefix — keeps ids sortable by time. */
let _idCounter = 0;

/**
 * Mint a stable, monotonically-increasing local message id.
 *
 * We use a timestamp + counter rather than `Math.random()` so the
 * FlatList `keyExtractor` stays stable across re-renders and React
 * doesn't churn the bubble components.
 */
function makeLocalId(): string {
  _idCounter += 1;
  return `msg_${Date.now()}_${_idCounter}`;
}

/**
 * Best-effort intent heuristic on the frontend.
 *
 * The backend does the canonical keyword match, but the UI sometimes
 * wants to colour the user bubble or pre-load a deep link before the
 * network reply lands. This mirrors the backend's keyword list so the
 * two stay in lock-step.
 *
 * @returns A lightweight `ChatIntent` or `null` when no match.
 */
function detectIntentLocal(message: string): ChatIntent | null {
  const text = message.toLowerCase();
  if (text.includes('saving') || text.includes('saved')) {
    return { intent: 'savings', confidence: 0.85, suggestedRoute: '/b/savings' };
  }
  if (text.includes('offer') || text.includes('discount') || text.includes('deal')) {
    return { intent: 'offers', confidence: 0.85, suggestedRoute: '/b/near-u' };
  }
  if (text.includes('wallet') || text.includes('coin') || text.includes('cash')) {
    return { intent: 'wallet', confidence: 0.85, suggestedRoute: '/b/coin-expiry' };
  }
  if (text.includes('help') || text.includes('support')) {
    return { intent: 'help', confidence: 0.7 };
  }
  return null;
}

/** Stringify an unknown thrown value for logs / error UI. */
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
 * Build the welcome message the assistant posts on the first turn
 * of a new session. Phase 4.1 keeps the copy static — a real
 * personalised greeting arrives in 4.2.
 */
function buildWelcomeMessage(): ChatMessage {
  return {
    id: makeLocalId(),
    role: 'assistant',
    content:
      "Hi, I'm the REZ Assistant. I can help with savings, offers, wallet and orders. What would you like to know?",
    timestamp: new Date().toISOString(),
    quickReplies: [
      'Show my savings',
      'Find offers near me',
      "How do I earn more?",
    ],
  };
}

/** Build the offline / transport-error bubble we show on failure. */
function buildErrorBubble(text: string): ChatMessage {
  return {
    id: makeLocalId(),
    role: 'assistant',
    content: text,
    timestamp: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

/**
 * Public state exposed by the AIChatContext. Read-only from the
 * consumer's point of view — mutate via the action functions below.
 */
export interface AIChatState {
  /** All messages in display order (oldest first). */
  messages: ChatMessage[];
  /** True while a network round-trip to the assistant is in flight. */
  isTyping: boolean;
  /** True when the most recent send succeeded (false after an error). */
  isConnected: boolean;
  /** Current session id — empty string until `startSession` runs. */
  sessionId: string;
  /** Last error message, or null. Cleared on the next successful send. */
  error: string | null;
  /** Most recently detected intent (from the local heuristic). */
  lastDetectedIntent: ChatIntent | null;
}

/**
 * Action surface for the AIChatContext. All actions are stable across
 * renders (memoised) so consumers can include them in dep arrays.
 */
export interface AIChatActions {
  /** Send a free-form user message and await the assistant's reply. */
  sendMessage: (text: string) => Promise<void>;
  /** Convenience wrapper that sends a quick-reply chip as a user turn. */
  sendQuickReply: (reply: string) => Promise<void>;
  /** Drop every message and reset to the welcome state. */
  clearMessages: () => void;
  /** Begin a fresh session (new id, empty message list, welcome shown). */
  startSession: () => void;
  /** End the current session — clears messages and resets state. */
  endSession: () => void;
  /** Run the local intent heuristic on a string (no network call). */
  detectIntent: (text: string) => ChatIntent | null;
}

export type AIChatContextValue = AIChatState & AIChatActions;

// ---------------------------------------------------------------------------
// Context + provider
// ---------------------------------------------------------------------------

const AIChatContext = createContext<AIChatContextValue | undefined>(undefined);

export interface AIChatProviderProps {
  children: React.ReactNode;
  /**
   * Optional initial session id. When omitted, the provider mints one
   * on mount via `startSession()`. Useful for tests / SSR.
   */
  initialSessionId?: string;
}

/**
 * Provider component. Mount once near the AI Assistant route so the
 * session survives in-screen navigation but resets when the user
 * leaves the AI tab.
 */
export function AIChatProvider({
  children,
  initialSessionId,
}: AIChatProviderProps): React.ReactElement {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [sessionId, setSessionId] = useState<string>(initialSessionId ?? '');
  const [error, setError] = useState<string | null>(null);
  const [lastDetectedIntent, setLastDetectedIntent] =
    useState<ChatIntent | null>(null);

  // Ref to guard against unmounted-state updates when the network
  // round-trip resolves after the user has navigated away.
  const isMountedRef = useRef<boolean>(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ---------------------------------------------------------------------
  // Session lifecycle
  // ---------------------------------------------------------------------

  /**
   * Begin a fresh session. Idempotent — calling it twice just resets
   * the message list and mints a new id. We log every transition so
   * analytics can later attribute messages to a session window.
   */
  const startSession = useCallback((): void => {
    const newId =
      initialSessionId && initialSessionId.length > 0
        ? initialSessionId
        : `sess_${Date.now().toString(36)}`;
    setSessionId(newId);
    setMessages([buildWelcomeMessage()]);
    setError(null);
    setIsConnected(true);
    setLastDetectedIntent(null);
    logger.info(
      'ai_chat_session_started',
      { sessionId: newId },
      'B Features',
    );
  }, [initialSessionId]);

  /**
   * Tear down the current session. Clears messages and the id; the
   * next `sendMessage` will lazily start a new session.
   */
  const endSession = useCallback((): void => {
    try {
      logger.info(
        'ai_chat_session_ended',
        { sessionId },
        'B Features',
      );
    } catch {
      /* never block teardown */
    }
    setMessages([]);
    setSessionId('');
    setIsTyping(false);
    setError(null);
    setLastDetectedIntent(null);
  }, [sessionId]);

  // Auto-start a session on first mount so the welcome bubble shows.
  useEffect(() => {
    if (sessionId.length === 0) {
      startSession();
    }
    // startSession is stable; we only want this to run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------
  // Message actions
  // ---------------------------------------------------------------------

  /**
   * Append a message authored by `role` to the in-memory list.
   * Pure helper — does NOT trigger any side-effects beyond setState.
   */
  const appendMessage = useCallback(
    (role: ChatMessageRole, content: string, isTypingMsg = false): ChatMessage => {
      const msg: ChatMessage = {
        id: makeLocalId(),
        role,
        content,
        timestamp: new Date().toISOString(),
        ...(isTypingMsg ? { isTyping: true } : {}),
      };
      setMessages((prev) => [...prev, msg]);
      return msg;
    },
    [],
  );

  /**
   * Replace a previously-appended message in-place. Used to swap the
   * typing placeholder for the real assistant reply.
   */
  const replaceMessage = useCallback(
    (id: string, patch: Partial<ChatMessage>): void => {
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...patch } : m)),
      );
    },
    [],
  );

  /**
   * Run the local intent heuristic and stash the result on state so
   * the UI can show a "I think you mean savings" hint immediately,
   * before the network reply comes back.
   */
  const detectIntent = useCallback((text: string): ChatIntent | null => {
    const intent = detectIntentLocal(text);
    setLastDetectedIntent(intent);
    return intent;
  }, []);

  /**
   * Send a free-form user message to the assistant.
   *
   * Flow:
   *   1. Append the user bubble optimistically.
   *   2. Drop a typing-placeholder bubble for the assistant.
   *   3. Hit the backend; on success, swap the placeholder for the
   *      real reply; on failure, replace it with an error bubble.
   */
  const sendMessage = useCallback(
    async (text: string): Promise<void> => {
      const trimmed = text.trim();
      if (trimmed.length === 0) return;

      // Make sure we have a session before we send — this is what
      // powers the "start chatting on first send" path.
      let activeSession = sessionId;
      if (activeSession.length === 0) {
        activeSession = `sess_${Date.now().toString(36)}`;
        setSessionId(activeSession);
        setMessages([buildWelcomeMessage()]);
      }

      // Pre-flight local intent for instant UI feedback.
      detectIntent(trimmed);

      appendMessage('user', trimmed);
      const placeholder = appendMessage('assistant', '', true);

      setIsTyping(true);
      setError(null);
      setIsConnected(true);

      try {
        logger.info(
          'ai_chat_message_sent',
          {
            sessionId: activeSession,
            messageLength: trimmed.length,
          },
          'B Features',
        );
        const response = await aiSupportService.sendMessage({
          sessionId: activeSession,
          message: trimmed,
          context: { surface: 'ai-assistant' },
        });
        if (!isMountedRef.current) return;
        replaceMessage(placeholder.id, {
          id: response.reply.id,
          content: response.reply.content,
          timestamp: response.reply.timestamp,
          isTyping: false,
          ...(response.reply.quickReplies
            ? { quickReplies: response.reply.quickReplies }
            : {}),
        });
        if (response.intent) {
          setLastDetectedIntent(response.intent);
        }
        setIsConnected(true);
        logger.info(
          'ai_chat_reply_received',
          {
            sessionId: activeSession,
            replyId: response.reply.id,
            intent: response.intent?.intent ?? null,
          },
          'B Features',
        );
      } catch (err: unknown) {
        if (!isMountedRef.current) return;
        const detail = errorToString(err);
        setError(detail);
        setIsConnected(false);
        replaceMessage(placeholder.id, {
          content: "Couldn't reach assistant — try again",
          isTyping: false,
        });
        // Also surface the error inline so the conversation reads as
        // continuous rather than dropping the user's question.
        appendMessage(
          'assistant',
          "I had trouble reaching the assistant. Tap send to retry.",
        );
        logger.error(
          'ai_chat_send_failed',
          err instanceof Error ? err : new Error(detail),
          'B Features',
        );
      } finally {
        if (isMountedRef.current) {
          setIsTyping(false);
        }
      }
    },
    [sessionId, appendMessage, replaceMessage, detectIntent],
  );

  /**
   * Convenience wrapper — exactly the same flow as `sendMessage`,
   * but typed for the quick-reply chip path so the call-site reads
   * more clearly in the screen.
   */
  const sendQuickReply = useCallback(
    async (reply: string): Promise<void> => {
      await sendMessage(reply);
    },
    [sendMessage],
  );

  /**
   * Drop every message and put the welcome bubble back. Keeps the
   * current session id so analytics still attribute the new turn
   * chain to the same window.
   */
  const clearMessages = useCallback((): void => {
    setMessages([buildWelcomeMessage()]);
    setError(null);
    setIsConnected(true);
    setLastDetectedIntent(null);
    try {
      logger.info(
        'ai_chat_cleared',
        { sessionId },
        'B Features',
      );
    } catch {
      /* never block */
    }
  }, [sessionId]);

  // ---------------------------------------------------------------------
  // Memoised value
  // ---------------------------------------------------------------------

  const value = useMemo<AIChatContextValue>(
    () => ({
      messages,
      isTyping,
      isConnected,
      sessionId,
      error,
      lastDetectedIntent,
      sendMessage,
      sendQuickReply,
      clearMessages,
      startSession,
      endSession,
      detectIntent,
    }),
    [
      messages,
      isTyping,
      isConnected,
      sessionId,
      error,
      lastDetectedIntent,
      sendMessage,
      sendQuickReply,
      clearMessages,
      startSession,
      endSession,
      detectIntent,
    ],
  );

  return (
    <AIChatContext.Provider value={value}>{children}</AIChatContext.Provider>
  );
}

/**
 * Hook for consuming the AI chat context. Throws when used outside
 * a provider so mis-mounts fail loudly in development.
 */
export function useAIChat(): AIChatContextValue {
  const ctx = useContext(AIChatContext);
  if (!ctx) {
    throw new Error('useAIChat must be used inside <AIChatProvider>.');
  }
  return ctx;
}

/**
 * Default export — the provider component. Import as:
 *
 *   import AIChatProvider from '@/contexts/AIChatContext';
 */
export default AIChatProvider;
