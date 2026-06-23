/**
 * MemoryContinuityCard — single memory reference card (Phase 2.2).
 *
 * Visual contract
 * ---------------
 *   - Renders one short personalised sentence ("You saved ₹120 at
 *     Kaffa Story last week") with a category-coloured leading icon
 *     and a "X days ago" badge.
 *   - Dismissible: a small × button on the right calls `onDismiss`.
 *   - Pressable: tapping the body fires `onPress`. The parent decides
 *     whether to navigate, log, or no-op.
 *   - Long-press exposes a "Forget this memory" affordance that
 *     "calls a stub API" (logged) so the privacy contract is visible
 *     during demos.
 *
 * Feature flag
 * ------------
 *   Wrapped in `<FeatureFlagGate flag="b.memory">` so the whole card
 *   disappears when the B feature is disabled.
 *
 * Accessibility
 * -------------
 *   - Card body has `accessibilityRole="button"` and a descriptive
 *     label composed of the memory text + days-ago badge.
 *   - Dismiss and Forget affordances are independent `button` roles
 *     so screen-reader users can land on either action directly.
 */
import React, { useCallback } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import FeatureFlagGate from '@/components/b/_shared/FeatureFlagGate';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import logger from '@/utils/logger';
import type {
  MemoryCategory,
  MemoryReference,
} from '@/types/memory.types';

/**
 * Props for the swipeable memory card.
 */
export interface MemoryContinuityCardProps {
  /** The memory reference to render. */
  memory: MemoryReference;
  /**
   * Called when the user taps the dismiss (×) button. Parent should
   * remove the card from its list. Optional so the card can be
   * rendered in a "pinned" context where dismissal is not allowed.
   */
  onDismiss?: (id: string) => void;
  /**
   * Called when the user taps the card body. Parent decides whether
   * to navigate via `memory.ctaRoute`, log, or no-op.
   */
  onPress?: () => void;
}

/** Map from category → emoji icon used at the leading edge of the card. */
const CATEGORY_ICON: Record<MemoryCategory, string> = {
  spending: '🛍️',
  saving: '💰',
  preference: '⭐',
  streak: '🔥',
  social: '👥',
};

/** Map from category → background tint for the leading icon chip. */
const CATEGORY_TINT: Record<MemoryCategory, string> = {
  spending: colors.lightPeach,
  saving: colors.successScale[100],
  preference: colors.lavenderMist,
  streak: colors.warningScale[100],
  social: colors.infoScale[100],
};

/** Map from category → accent for the leading icon chip text. */
const CATEGORY_ACCENT: Record<MemoryCategory, string> = {
  spending: colors.brand.amberDeep,
  saving: colors.success,
  preference: colors.nileBlue,
  streak: colors.brand.orangeDark,
  social: colors.brand.indigo,
};

/** Format the "X days ago" badge. */
function daysAgoLabel(daysAgo: number): string {
  if (daysAgo <= 0) return 'today';
  if (daysAgo === 1) return '1 day ago';
  if (daysAgo < 7) return `${daysAgo} days ago`;
  if (daysAgo < 14) return 'last week';
  if (daysAgo < 30) return `${Math.floor(daysAgo / 7)} weeks ago`;
  return `${Math.floor(daysAgo / 30)} month${Math.floor(daysAgo / 30) === 1 ? '' : 's'} ago`;
}

function MemoryContinuityCardBase({
  memory,
  onDismiss,
  onPress,
}: MemoryContinuityCardProps): React.ReactElement {
  const handlePress = useCallback(() => {
    if (!onPress) return;
    try {
      onPress();
    } catch (err) {
      logger.warn(
        'memory_card_press_handler_threw',
        { id: memory.id, error: String(err) },
        'B Features',
      );
    }
  }, [onPress, memory.id]);

  const handleDismiss = useCallback(() => {
    logger.info(
      'memory_card_dismissed',
      { id: memory.id, category: memory.category },
      'B Features',
    );
    if (onDismiss) onDismiss(memory.id);
  }, [onDismiss, memory.id]);

  const handleForget = useCallback(() => {
    Alert.alert(
      'Forget this memory?',
      'REZ will stop showing this memory. This only affects what is displayed — your purchase history is unchanged.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Forget',
          style: 'destructive',
          onPress: () => {
            // Stub: real implementation will POST /api/b/memory/:id/forget.
            logger.info(
              'memory_card_forget_stub_call',
              { id: memory.id, category: memory.category },
              'B Features',
            );
            if (onDismiss) onDismiss(memory.id);
          },
        },
      ],
    );
  }, [onDismiss, memory.id, memory.category]);

  const onLongPress = useCallback(() => {
    handleForget();
  }, [handleForget]);

  const icon = CATEGORY_ICON[memory.category] ?? '✨';
  const tint = CATEGORY_TINT[memory.category] ?? colors.background.tertiary;
  const accent = CATEGORY_ACCENT[memory.category] ?? colors.nileBlue;

  const cardA11yLabel = `Memory: ${memory.text}. ${daysAgoLabel(memory.daysAgo)}.`;
  const dismissA11y = `Dismiss memory: ${memory.text}`;

  return (
    <View style={styles.cardWrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={cardA11yLabel}
        onPress={handlePress}
        onLongPress={onLongPress}
        delayLongPress={500}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        <View
          style={[styles.iconChip, { backgroundColor: tint }]}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          <Text style={[styles.iconText, { color: accent }]}>{icon}</Text>
        </View>
        <View style={styles.body}>
          <Text style={styles.text} numberOfLines={2}>
            {memory.text}
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{daysAgoLabel(memory.daysAgo)}</Text>
            </View>
            <Text style={styles.forgetHint} accessibilityElementsHidden importantForAccessibility="no">
              Long-press to forget
            </Text>
          </View>
        </View>
        {onDismiss ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={dismissA11y}
            hitSlop={12}
            onPress={handleDismiss}
            style={({ pressed }) => [styles.dismissBtn, pressed && styles.dismissBtnPressed]}
          >
            <Text style={styles.dismissText}>×</Text>
          </Pressable>
        ) : null}
      </Pressable>
    </View>
  );
}

/**
 * Public, feature-flag-gated wrapper. Mount this in lists.
 */
function MemoryContinuityCard(props: MemoryContinuityCardProps): React.ReactElement {
  return (
    <FeatureFlagGate flag="b.memory">
      <MemoryContinuityCardBase {...props} />
    </FeatureFlagGate>
  );
}

const styles = StyleSheet.create({
  cardWrap: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  cardPressed: {
    opacity: 0.92,
  },
  iconChip: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  iconText: {
    fontSize: 22,
  },
  body: {
    flex: 1,
  },
  text: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  badge: {
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginRight: spacing.sm,
  },
  badgeText: {
    ...typography.labelSmall,
    color: colors.text.secondary,
    fontWeight: '700',
  },
  forgetHint: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  dismissBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    marginLeft: spacing.sm,
  },
  dismissBtnPressed: {
    backgroundColor: colors.border.default,
  },
  dismissText: {
    color: colors.text.tertiary,
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '600',
  },
});

export default MemoryContinuityCard;
