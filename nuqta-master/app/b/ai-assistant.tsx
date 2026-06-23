/**
 * /b/ai-assistant — REZ AI Assistant chat screen (Phase 4.1)
 *
 * Full-screen chat surface that mounts inside the `/b/ai-assistant`
 * route. Responsibilities:
 *
 *   1. Wrap the screen in `<AIChatProvider>` so the in-memory session
 *      lives for the duration of the user's visit.
 *   2. Render a sticky header ("REZ Assistant" + online indicator +
 *      "Clear chat" action).
 *   3. Render the scrollable list of `<AIChatBubble />` messages with
 *      auto-scroll to bottom on new content.
 *   4. Render the composer (text input + send button) at the bottom.
 *   5. Handle the welcome state (chip row), loading state (typing
 *      indicator), and error state ("Couldn't reach assistant — try
 *      again") inline.
 *   6. Log every focus and every meaningful user action via
 *      `logger.info('ai_chat_*', ...)`.
 *
 * Safety
 * ------
 *   - Wrapped in `withErrorBoundary(AIAssistantPage, 'AI Assistant')`
 *     so a render-time crash cannot take down the B nav stack.
 *   - Wrapped in `<FeatureFlagGate flag="b.aiAssistant">` so QA can
 *     kill the surface at runtime via the existing feature-flag
 *     toggle in `subscriptionStore.featureFlags`.
 *   - `KeyboardAvoidingView` lifts the composer above the on-screen
 *     keyboard on iOS; Android handles its own window adjustment.
 */
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { ListRenderItem } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import AIChatProvider, { useAIChat } from '@/contexts/AIChatContext';
import AIChatBubble from '@/components/b/ai/AIChatBubble';
import FeatureFlagGate from '@/components/b/_shared/FeatureFlagGate';
import { borderRadius, colors, spacing, typography } from '@/constants/theme';
import logger from '@/utils/logger';
import type { ChatMessage } from '@/types/ai.types';

// ---------------------------------------------------------------------------
// Inner screen
// ---------------------------------------------------------------------------

/**
 * The visible AI Assistant screen. The export at the bottom of this
 * file wraps `AIAssistantPage` in `<AIChatProvider>` and the HOCs.
 */
function AIAssistantPageBase(): React.ReactElement {
  const {
    messages,
    isTyping,
    isConnected,
    error,
    sendMessage,
    sendQuickReply,
    clearMessages,
  } = useAIChat();

  // Composer state — local to the screen so a key-press doesn't have
  // to round-trip through context state.
  const [draft, setDraft] = useState<string>('');
  const listRef = useRef<FlatList<ChatMessage>>(null);

  // ---------------------------------------------------------------------
  // Logging
  // ---------------------------------------------------------------------

  useFocusEffect(
    useCallback(() => {
      try {
        logger.info(
          'screen_view',
          { screen: 'AI Assistant' },
          'B Features',
        );
      } catch {
        /* logger is a soft dependency */
      }
      return () => {
        /* no cleanup */
      };
    }, []),
  );

  // ---------------------------------------------------------------------
  // Auto-scroll to bottom
  // ---------------------------------------------------------------------

  useEffect(() => {
    // Scroll to the last message whenever a new one lands. We use a
    // microtask delay so the FlatList has time to render the row
    // first; otherwise scrollToIndex occasionally lands one short on
    // Android.
    const handle = setTimeout(() => {
      if (listRef.current && messages.length > 0) {
        try {
          listRef.current.scrollToEnd({ animated: true });
        } catch {
          /* scrollToEnd can throw before the list is laid out */
        }
      }
    }, 50);
    return () => {
      clearTimeout(handle);
    };
  }, [messages.length, isTyping]);

  // ---------------------------------------------------------------------
  // Composer handlers
  // ---------------------------------------------------------------------

  const onSend = useCallback((): void => {
    const text = draft.trim();
    if (text.length === 0) return;
    setDraft('');
    void sendMessage(text);
  }, [draft, sendMessage]);

  const onQuickReply = useCallback(
    (reply: string): void => {
      void sendQuickReply(reply);
    },
    [sendQuickReply],
  );

  const onClear = useCallback((): void => {
    try {
      logger.info('ai_chat_cleared_by_user', {}, 'B Features');
    } catch {
      /* never block */
    }
    clearMessages();
  }, [clearMessages]);

  // ---------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------

  const renderItem: ListRenderItem<ChatMessage> = useCallback(
    ({ item }) => (
      <AIChatBubble message={item} onQuickReply={onQuickReply} />
    ),
    [onQuickReply],
  );

  const keyExtractor = useCallback(
    (item: ChatMessage): string => item.id,
    [],
  );

  // ---------------------------------------------------------------------
  // Layout
  // ---------------------------------------------------------------------

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>REZ Assistant</Text>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusDot,
                  isConnected ? styles.statusDotOn : styles.statusDotOff,
                ]}
              />
              <Text style={styles.statusText}>
                {isConnected ? 'Online' : 'Reconnecting…'}
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear chat"
            onPress={onClear}
            style={({ pressed }) => [
              styles.clearBtn,
              pressed && styles.clearBtnPressed,
            ]}
          >
            <Text style={styles.clearText}>Clear chat</Text>
          </Pressable>
        </View>

        {/* Error banner — only shown when a send has failed. The
            screen keeps the message list visible so the user can
            retry without losing context. */}
        {error !== null ? (
          <View
            style={styles.errorBanner}
            accessibilityRole="alert"
            accessibilityLabel="Couldn't reach assistant"
          >
            <Text style={styles.errorText}>
              Couldn't reach assistant — try again
            </Text>
          </View>
        ) : null}

        {/* Message list */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />

        {/* Composer */}
        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask about savings, offers, wallet…"
            placeholderTextColor={colors.text.tertiary}
            multiline
            editable={!isTyping}
            accessibilityLabel="Message input"
            onSubmitEditing={onSend}
            blurOnSubmit={false}
            returnKeyType="send"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send message"
            onPress={onSend}
            disabled={isTyping || draft.trim().length === 0}
            style={({ pressed }) => [
              styles.sendBtn,
              (isTyping || draft.trim().length === 0) && styles.sendBtnDisabled,
              pressed && styles.sendBtnPressed,
            ]}
          >
            <Text style={styles.sendText}>Send</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Provider-wrapped page
// ---------------------------------------------------------------------------

/**
 * Wrap the base page in an AIChatProvider so the session lives for
 * the lifetime of the screen. The provider mints a session id on
 * mount and shows the welcome bubble automatically.
 */
function AIAssistantPageWithProvider(): React.ReactElement {
  return (
    <AIChatProvider>
      <AIAssistantPageBase />
    </AIChatProvider>
  );
}

// ---------------------------------------------------------------------------
// HOC stack
// ---------------------------------------------------------------------------

/**
 * Default export. Order of composition matters:
 *   1. Provider — owns the session
 *   2. Flag gate — QA can kill the surface
 *   3. Error boundary — last line of defence
 */
const AIAssistantPage = AIAssistantPageWithProvider;

const AIAssistantScreen: React.FC = () => (
  <FeatureFlagGate flag="b.aiAssistant">
    <AIAssistantPage />
  </FeatureFlagGate>
);

export default withErrorBoundary(AIAssistantScreen, 'AI Assistant');

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  kav: {
    flex: 1,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
    backgroundColor: colors.background.secondary,
  },
  headerLeft: {
    flexDirection: 'column',
  },
  headerTitle: {
    ...typography.h3,
    color: colors.nileBlue,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.circular(8),
    marginRight: spacing.xs,
  },
  statusDotOn: {
    backgroundColor: '#22C55E', // green
  },
  statusDotOff: {
    backgroundColor: colors.text.tertiary,
  },
  statusText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  clearBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.background.primary,
  },
  clearBtnPressed: {
    backgroundColor: colors.lavenderMist,
  },
  clearText: {
    ...typography.label,
    color: colors.nileBlue,
  },
  // Error banner
  errorBanner: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    backgroundColor: '#FEF2F2', // errorScale[50] — kept inline to avoid a theme import churn
    borderBottomWidth: 1,
    borderBottomColor: '#FECACA', // errorScale[200]
  },
  errorText: {
    ...typography.label,
    color: '#B91C1C', // errorScale[700]
    textAlign: 'center',
  },
  // Message list
  listContent: {
    paddingVertical: spacing.sm,
    paddingBottom: spacing.lg,
  },
  // Composer
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    backgroundColor: colors.background.secondary,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text.primary,
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 40,
    maxHeight: 120,
    marginRight: spacing.sm,
  },
  sendBtn: {
    backgroundColor: colors.nileBlue,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnPressed: {
    backgroundColor: colors.secondary[700],
  },
  sendBtnDisabled: {
    backgroundColor: colors.gray[300],
  },
  sendText: {
    ...typography.label,
    color: colors.text.inverse,
    fontWeight: '700',
  },
});
