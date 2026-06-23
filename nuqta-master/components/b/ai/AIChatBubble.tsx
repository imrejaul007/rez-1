/**
 * AIChatBubble — REZ AI Assistant (Phase 4.1)
 *
 * A single message bubble rendered inside the AI Assistant screen.
 *
 * Visual contract
 * ---------------
 *   - User bubbles:     right-aligned, nileBlue background, inverse text
 *   - Assistant bubbles: left-aligned, gold background, nileBlue text
 *   - System bubbles:   centered, muted — used in 4.2 for session notes
 *
 * Behaviour
 * ---------
 *   - When `message.isTyping === true`, the bubble renders the
 *     three-dot typing indicator (animated, opacity 0→1 in a loop)
 *     rather than the literal content. This is the same primitive
 *     used by iMessage / WhatsApp and matches what the
 *     `<AIAssistantPage />` appends optimistically before the network
 *     reply lands.
 *   - Quick-reply chips at the bottom of an assistant bubble are
 *     rendered as tappable pills. Tapping a chip fires the supplied
 *     `onQuickReply` callback so the screen can dispatch the chip
 *     text as a user turn.
 *   - The bubble is fully accessible: it has an `accessibilityLabel`
 *     summarising the role + content and the quick-reply chips are
 *     tagged as `button` for screen readers.
 *
 * No business logic lives here — this is a pure renderer that takes
 * a `ChatMessage` and emits a tree of `<View>` / `<Text>` nodes.
 */
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import type { ChatMessage } from '@/types/ai.types';

// ---------------------------------------------------------------------------
// Public surface
// ---------------------------------------------------------------------------

export interface AIChatBubbleProps {
  /** The message this bubble renders. */
  message: ChatMessage;
  /**
   * Optional callback fired when a quick-reply chip is tapped. When
   * omitted, chips are rendered as non-interactive (still visible —
   * the screen may want to disable them in a "thinking" state).
   */
  onQuickReply?: (reply: string) => void;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * The animated three-dot typing indicator. Each dot is a small
 * `<Animated.View>` whose opacity is sequenced in a 600ms loop.
 */
function TypingDots(): React.ReactElement {
  // Three independent opacity values, animated in sequence.
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = (dot: Animated.Value, delay: number): Animated.CompositeAnimation => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
    };
    const a = loop(dot1, 0);
    const b = loop(dot2, 200);
    const c = loop(dot3, 400);
    a.start();
    b.start();
    c.start();
    return () => {
      a.stop();
      b.stop();
      c.stop();
    };
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.dotsRow} accessibilityLabel="Assistant is typing">
      <Animated.View style={[styles.dot, { opacity: dot1 }]} />
      <Animated.View style={[styles.dot, { opacity: dot2 }]} />
      <Animated.View style={[styles.dot, { opacity: dot3 }]} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * Render a single chat bubble. Stateless — the screen owns the
 * message array; this component just paints one entry.
 */
function AIChatBubbleBase({
  message,
  onQuickReply,
}: AIChatBubbleProps): React.ReactElement {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isTyping = message.isTyping === true;

  // System messages render centered with no bubble chrome.
  if (isSystem) {
    return (
      <View
        style={styles.systemRow}
        accessibilityRole="text"
        accessibilityLabel={`System note: ${message.content}`}
      >
        <Text style={styles.systemText}>{message.content}</Text>
      </View>
    );
  }

  // Build the a11y label up front — used by both the bubble and the
  // screen reader's "announce" path.
  const a11yLabel = isUser
    ? `You said: ${message.content}`
    : `Assistant says: ${message.content}`;

  return (
    <View
      style={[
        styles.row,
        isUser ? styles.rowUser : styles.rowAssistant,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAssistant,
        ]}
        accessibilityRole="text"
        accessibilityLabel={a11yLabel}
      >
        {isTyping ? (
          <TypingDots />
        ) : (
          <Text
            style={[
              styles.bubbleText,
              isUser ? styles.bubbleTextUser : styles.bubbleTextAssistant,
            ]}
          >
            {message.content}
          </Text>
        )}
      </View>

      {/* Quick-reply chips. Only attached to assistant bubbles and only
          rendered when the message isn't the typing placeholder. */}
      {!isUser && !isTyping && message.quickReplies && message.quickReplies.length > 0 ? (
        <View style={styles.chipsRow} accessibilityLabel="Quick replies">
          {message.quickReplies.map((reply) => (
            <Pressable
              key={reply}
              accessibilityRole="button"
              accessibilityLabel={`Send quick reply: ${reply}`}
              disabled={onQuickReply === undefined}
              onPress={() => {
                if (onQuickReply) onQuickReply(reply);
              }}
              style={({ pressed }) => [
                styles.chip,
                pressed && styles.chipPressed,
                onQuickReply === undefined && styles.chipDisabled,
              ]}
            >
              <Text style={styles.chipText}>{reply}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const MAX_BUBBLE_WIDTH = 0.78; // 78% of the row — keeps the bubble from
                              // spanning the full screen on tablets.

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.base,
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  rowAssistant: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: `${MAX_BUBBLE_WIDTH * 100}%`,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  bubbleUser: {
    backgroundColor: colors.nileBlue,
    borderTopRightRadius: borderRadius.xs,
  },
  bubbleAssistant: {
    backgroundColor: colors.gold,
    borderTopLeftRadius: borderRadius.xs,
  },
  bubbleText: {
    ...typography.body,
    lineHeight: 20,
  },
  bubbleTextUser: {
    color: colors.text.inverse,
  },
  bubbleTextAssistant: {
    color: colors.nileBlue,
  },
  // Typing indicator
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.circular(8),
    backgroundColor: colors.nileBlue,
    marginHorizontal: 3,
  },
  // Quick reply chips
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.xs,
    maxWidth: `${MAX_BUBBLE_WIDTH * 100}%`,
  },
  chip: {
    backgroundColor: colors.background.secondary,
    borderColor: colors.nileBlue,
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  chipPressed: {
    backgroundColor: colors.lavenderMist,
  },
  chipDisabled: {
    opacity: 0.5,
  },
  chipText: {
    ...typography.label,
    color: colors.nileBlue,
  },
  // System bubble
  systemRow: {
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
  },
  systemText: {
    ...typography.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
});

/**
 * Memoised default export. The screen can wrap its map in a
 * `React.memo` if it wants, but the bubble itself is already a
 * pure function of its props and re-renders cheaply.
 */
const AIChatBubble = React.memo(AIChatBubbleBase);
export default AIChatBubble;
