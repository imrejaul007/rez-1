/**
 * KarmaMissionCard — single mission row.
 *
 * Shows:
 *   - A category emoji + label (drives the left icon).
 *   - The mission title + 1-line description.
 *   - A karma-reward pill (e.g. "+250 karma").
 *   - A progress bar (0-100%).
 *   - A "Complete" pressable (disabled when already completed or
 *     while a completion is in flight).
 *
 * Behaviour
 * ---------
 *   - Pure / stateless: parent owns the data and the completion flow.
 *     The card just renders + invokes `onComplete(id)` when the user
 *     taps the button.
 *   - Pressing the card body itself does NOT trigger completion —
 *     only the explicit button does, to avoid accidental awards.
 *
 * Accessibility
 * -------------
 *   - Outer `View` exposes an `accessibilityLabel` summarising category,
 *     title, reward, progress, and completion state.
 *   - The Complete button is its own accessible element with a
 *     state-dependent label ("Mark complete" vs. "Completed").
 */
import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import type {
  KarmaMission,
  KarmaMissionCategory,
} from '@/types/karma.types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_META: Record<
  KarmaMissionCategory,
  { emoji: string; label: string; tint: string }
> = {
  environment: { emoji: '🌿', label: 'Environment', tint: '#3F8F4F' },
  community: { emoji: '🤝', label: 'Community', tint: '#1A6FB8' },
  health: { emoji: '💪', label: 'Health', tint: '#C0504D' },
  education: { emoji: '📚', label: 'Education', tint: '#B0791C' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildAccessibilityLabel(mission: KarmaMission): string {
  const meta = CATEGORY_META[mission.category];
  const state = mission.isCompleted ? 'completed' : 'active';
  return `${meta.label} mission, ${mission.title}, reward ${mission.karmaReward} karma, ${mission.progressPct}% progress, ${state}`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface CompleteButtonProps {
  isCompleted: boolean;
  isSubmitting: boolean;
  onPress: () => void;
}

function CompleteButton({
  isCompleted,
  isSubmitting,
  onPress,
}: CompleteButtonProps): React.ReactElement {
  if (isCompleted) {
    return (
      <View
        style={[styles.btn, styles.btnCompleted]}
        accessibilityRole="text"
        accessibilityLabel="Mission completed"
      >
        <Text style={styles.btnCompletedText}>Completed</Text>
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Mark mission complete"
      accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
      onPress={onPress}
      disabled={isSubmitting}
      style={({ pressed }) => [
        styles.btn,
        styles.btnActive,
        pressed && styles.btnPressed,
        isSubmitting && styles.btnDisabled,
      ]}
    >
      {isSubmitting ? (
        <ActivityIndicator color={colors.nileBlue} />
      ) : (
        <Text style={styles.btnActiveText}>Complete</Text>
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export interface KarmaMissionCardProps {
  mission: KarmaMission;
  /**
   * Called when the user taps "Complete". If omitted, the button still
   * renders but tapping it is a no-op (useful for read-only previews).
   */
  onComplete?: (id: string) => void;
  /**
   * When `true`, the button shows an inline spinner instead of the
   * "Complete" label. Lets the page-level hook drive the in-flight
   * visual without each card knowing about other cards.
   */
  isSubmitting?: boolean;
}

/**
 * A single mission card. Pure render — completion is delegated to the
 * parent via `onComplete`.
 */
function KarmaMissionCardBase({
  mission,
  onComplete,
  isSubmitting = false,
}: KarmaMissionCardProps): React.ReactElement {
  const meta = CATEGORY_META[mission.category];
  const label = useMemo(() => buildAccessibilityLabel(mission), [mission]);

  const onPress = (): void => {
    if (typeof onComplete === 'function') {
      onComplete(mission.id);
    }
  };

  return (
    <View
      style={[styles.card, mission.isCompleted && styles.cardCompleted]}
      accessible
      accessibilityLabel={label}
    >
      <View style={styles.row}>
        <View
          style={[styles.iconWrap, { backgroundColor: meta.tint + '22' }]}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          <Text style={styles.iconEmoji}>{meta.emoji}</Text>
        </View>
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.categoryLabel}>{meta.label}</Text>
            <View style={[styles.rewardPill, { backgroundColor: meta.tint }]}>
              <Text style={styles.rewardText}>
                +{mission.karmaReward} karma
              </Text>
            </View>
          </View>
          <Text
            style={[
              styles.title,
              mission.isCompleted && styles.titleCompleted,
            ]}
          >
            {mission.title}
          </Text>
          <Text style={styles.description} numberOfLines={2}>
            {mission.description}
          </Text>

          <View style={styles.progressSection}>
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>Progress</Text>
              <Text style={styles.progressValue}>
                {mission.progressPct}%
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${mission.progressPct}%` },
                ]}
              />
            </View>
          </View>

          <View style={styles.actionRow}>
            <CompleteButton
              isCompleted={mission.isCompleted}
              isSubmitting={isSubmitting}
              onPress={onPress}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const KarmaMissionCard = React.memo(KarmaMissionCardBase);
export default KarmaMissionCard;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  cardCompleted: {
    opacity: 0.85,
    borderColor: colors.gold,
  },
  row: {
    flexDirection: 'row',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.base,
  },
  iconEmoji: {
    fontSize: 24,
  },
  body: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  categoryLabel: {
    ...typography.caption,
    color: colors.text.tertiary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rewardPill: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
  },
  rewardText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  title: {
    ...typography.h3,
    color: colors.nileBlue,
    marginBottom: spacing.xs,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.text.secondary,
  },
  description: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  progressSection: {
    marginTop: spacing.xs,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  progressLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  progressValue: {
    ...typography.caption,
    color: colors.nileBlue,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.border.light,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.gold,
  },
  actionRow: {
    marginTop: spacing.base,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  btn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnActive: {
    backgroundColor: colors.gold,
  },
  btnActiveText: {
    ...typography.h3,
    color: colors.nileBlue,
    fontWeight: '800',
  },
  btnCompleted: {
    backgroundColor: colors.background.accent,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  btnCompletedText: {
    ...typography.body,
    color: colors.nileBlue,
    fontWeight: '700',
  },
  btnPressed: {
    opacity: 0.85,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});