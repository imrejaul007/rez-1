/**
 * LiveActivityStrip — horizontal scroller of recent activity cards.
 *
 * Visual contract
 * ---------------
 *   - Renders one card per event with avatar (or initial), action copy,
 *     money amount (highlighted in `colors.success`) and a "time ago" tag.
 *   - When `isLive` is true (passed from parent), a pulsing dot is shown
 *     at the top-left of the strip header.
 *   - Auto-scrolls to the newest event whenever the list grows. The
 *     scroll uses an `onContentSizeChange` callback rather than
 *     `scrollToOffset` to avoid timing issues when content is first laid
 *     out.
 *   - Tap-anywhere-card fires `onEventPress?.(event)`.
 *
 * Feature flag
 * ------------
 *   - Wrapped in `<FeatureFlagGate flag="b.liveActivity">` so the whole
 *     strip disappears when the B feature is disabled in
 *     `subscriptionStore.featureFlags`.
 *
 * Accessibility
 * -------------
 *   - The container has `accessibilityRole="list"` and an
 *     `accessibilityLabel` summarizing the count + live status.
 *   - Each card is a `button` with a fully-spoken label.
 */
import React, { useCallback, useRef } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import FeatureFlagGate from '@/components/b/_shared/FeatureFlagGate';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { formatPrice } from '@/utils/priceFormatter';
import logger from '@/utils/logger';
import type {
  LiveActivityEvent,
  LiveActivityStripProps,
} from '@/types/activity.types';

const AMOUNT_INVISIBLE_THRESHOLD_PAISE = 0;
const STRIP_HEADER_TITLE = 'Live activity';
const AUTO_SCROLL_THRESHOLD = 0.5;
const SCROLL_ANIMATION_DURATION_MS = 250;

/** Build a short time-ago string ("3m ago", "2h ago", "1d ago"). */
function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const delta = Date.now() - t;
  if (delta < 60_000) return 'just now';
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Derive a 1–2 character initial from a user name. */
function initialsFor(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

/** Pick a deterministic background tint for a user-initial chip. */
function avatarBgFor(seed: string): string {
  const palette: ReadonlyArray<string> = [
    colors.primary[200],
    colors.secondary[200],
    colors.lightPeach,
    colors.lavenderMist,
    colors.successScale[100],
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const idx = hash % palette.length;
  return palette[idx]!;
}

interface CardProps {
  event: LiveActivityEvent;
  onPress: (event: LiveActivityEvent) => void;
}

function ActivityCard({ event, onPress }: CardProps): React.ReactElement {
  const handlePress = useCallback(() => {
    onPress(event);
  }, [event, onPress]);

  const amountLabel =
    typeof event.amountPaise === 'number' && event.amountPaise > AMOUNT_INVISIBLE_THRESHOLD_PAISE
      ? formatPrice(event.amountPaise / 100, 'INR', false)
      : null;

  const accessibilityLabelText = [
    `${event.userName}`,
    event.action,
    amountLabel ? `${amountLabel}` : null,
    timeAgo(event.timestamp),
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabelText}
      onPress={handlePress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View
        style={[styles.avatar, { backgroundColor: avatarBgFor(event.userName) }]}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        <Text style={styles.avatarInitial}>{initialsFor(event.userName)}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.actionText} numberOfLines={2}>
          <Text style={styles.userName}>{event.userName}</Text>
          {' '}
          {event.action}
        </Text>
        <View style={styles.cardMetaRow}>
          {amountLabel ? (
            <Text style={styles.amount}>{amountLabel}</Text>
          ) : event.storeName ? (
            <Text style={styles.store}>{event.storeName}</Text>
          ) : null}
          <Text style={styles.timeAgo}>{timeAgo(event.timestamp)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

interface StripProps extends LiveActivityStripProps {
  /** Reflects the upstream socket connection; shows the "live" dot. */
  isLive: boolean;
}

function LiveActivityStripBase({
  events,
  onEventPress,
  isLive,
}: StripProps): React.ReactElement {
  const scrollRef = useRef<ScrollView | null>(null);
  const previousLengthRef = useRef<number>(0);

  const handlePress = useCallback(
    (event: LiveActivityEvent) => {
      if (!onEventPress) return;
      try {
        onEventPress(event);
      } catch (err) {
        logger.warn(
          'live_activity_strip_press_handler_threw',
          { error: String(err), eventId: event.id },
          'B Features',
        );
      }
    },
    [onEventPress],
  );

  const handleContentSizeChange = useCallback(
    (_contentWidth: number, _contentHeight: number) => {
      const grew = events.length > previousLengthRef.current;
      previousLengthRef.current = events.length;
      if (!grew) return;
      if (!scrollRef.current) return;
      // Scroll the strip to its right edge so the newest event is visible.
      scrollRef.current.scrollToEnd({
        animated: true,
      });
    },
    [events.length],
  );

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    if (contentSize.width <= layoutMeasurement.width) return;
    const distanceFromEnd = contentSize.width - contentOffset.x - layoutMeasurement.width;
    if (distanceFromEnd < 1) return;
    // Track scroll position for analytics in future iterations. No-op for now.
    void AUTO_SCROLL_THRESHOLD;
    void SCROLL_ANIMATION_DURATION_MS;
  }, []);

  const headerSummary = `${events.length} recent event${events.length === 1 ? '' : 's'}`;

  return (
    <View style={styles.container} accessible={false}>
      <View style={styles.headerRow}>
        <View style={styles.headerTitleGroup}>
          {isLive ? <View style={styles.liveDot} /> : <View style={styles.offlineDot} />}
          <Text style={styles.headerTitle}>{STRIP_HEADER_TITLE}</Text>
        </View>
        <Text style={styles.headerCount}>{headerSummary}</Text>
      </View>
      {events.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No recent activity</Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onContentSizeChange={handleContentSizeChange}
          onScroll={handleScroll}
          scrollEventThrottle={32}
          accessibilityRole="list"
          accessibilityLabel={`${STRIP_HEADER_TITLE}. ${headerSummary}`}
          contentContainerStyle={styles.scrollContent}
        >
          {events.map((event) => (
            <ActivityCard key={event.id} event={event} onPress={handlePress} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

/**
 * LiveActivityStrip — public, feature-flag-gated wrapper.
 *
 * Auto-scroll, accessibility wiring, and feature gating live here so
 * the inner `LiveActivityStripBase` can be unit-tested in isolation.
 */
function LiveActivityStrip({
  events,
  onEventPress,
}: LiveActivityStripProps): React.ReactElement {
  return (
    <FeatureFlagGate flag="b.liveActivity">
      <LiveActivityStripBase events={events} onEventPress={onEventPress} isLive={false} />
    </FeatureFlagGate>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginRight: spacing.sm,
  },
  offlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gray[300],
    marginRight: spacing.sm,
  },
  headerTitle: {
    ...typography.label,
    color: colors.text.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  headerCount: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm,
    minWidth: 220,
    maxWidth: 280,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  cardPressed: {
    opacity: 0.85,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  avatarInitial: {
    ...typography.label,
    color: colors.nileBlue,
    fontWeight: '800',
  },
  cardBody: {
    flex: 1,
  },
  actionText: {
    ...typography.bodySmall,
    color: colors.text.primary,
    lineHeight: 16,
  },
  userName: {
    fontWeight: '700',
    color: colors.nileBlue,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  amount: {
    ...typography.labelSmall,
    color: colors.success,
    fontWeight: '800',
  },
  store: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  timeAgo: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginLeft: spacing.sm,
  },
  emptyState: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.base,
  },
  emptyText: {
    ...typography.body,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
});

export default LiveActivityStrip;
