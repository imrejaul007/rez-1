/**
 * SavingsGoalCard — single goal tile for the horizontal goals scroller.
 *
 * Renders the goal's name, an emoji (if provided), progress bar, rupee
 * progress (saved / target) and a relative "days left" / "Completed" /
 * "Overdue" caption.
 *
 * Wrap in a `<Pressable>` only when an `onPress` is supplied, so this card
 * is reusable inside both tappable lists and purely decorative carousels.
 *
 * Accessibility
 * -------------
 *  - `accessibilityLabel` reads: "Goal: <name>, <pct>% complete".
 *  - When `onPress` is set, role = "button".
 */
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useRTL } from '@/hooks/useRTL';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { formatPrice } from '@/utils/priceFormatter';
import type { SavingsGoal } from '@/types/savings.types';

export interface SavingsGoalCardProps {
  goal: SavingsGoal;
  onPress?: () => void;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

/**
 * Derive a human-readable status from the goal's deadline + saved vs target.
 *
 * Returns one of:
 *   - "Completed!"      — `savedAmountPaise >= targetAmountPaise`.
 *   - "Overdue"         — deadline is in the past.
 *   - "Due today"       — deadline is today.
 *   - "X days left"     — deadline within the next year.
 *   - "X weeks left"    — for slightly longer ranges.
 *   - ""                — no deadline supplied.
 */
function buildDeadlineCaption(goal: SavingsGoal): string {
  if (goal.savedAmountPaise >= goal.targetAmountPaise) return 'Completed!';
  if (!goal.deadline) return '';

  const deadline = new Date(goal.deadline);
  if (Number.isNaN(deadline.getTime())) return '';

  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();

  if (diffMs < 0) return 'Overdue';

  const diffDays = Math.floor(diffMs / MS_PER_DAY);
  if (diffDays <= 0) return 'Due today';
  if (diffDays < 14) return `${diffDays} day${diffDays === 1 ? '' : 's'} left`;
  if (diffDays < 60) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks === 1 ? '' : 's'} left`;
  }
  const months = Math.floor(diffDays / 30);
  return `${months} month${months === 1 ? '' : 's'} left`;
}

function SavingsGoalCardBase({ goal, onPress }: SavingsGoalCardProps) {
  const { colors: themeColors, shadows, isDark } = useTheme();
  const target = Math.max(goal.targetAmountPaise ?? 0, 0);
  const saved = Math.max(goal.savedAmountPaise ?? 0, 0);
  const progressPct = useMemo(() => {
    if (target <= 0) return 0;
    return clamp(Math.round((saved / target) * 100), 0, 100);
  }, [saved, target]);

  const isComplete = saved >= target && target > 0;
  const progressColor = isComplete ? colors.success : colors.gold;
  const caption = useMemo(() => buildDeadlineCaption(goal), [goal]);

  const savedRupees = useMemo(() => {
    const result = formatPrice(saved / 100, 'INR', false);
    return result ?? '₹0';
  }, [saved]);
  const targetRupees = useMemo(() => {
    const result = formatPrice(target / 100, 'INR', false);
    return result ?? '₹0';
  }, [target]);

  const containerStyle = [styles.container, isComplete && styles.containerComplete];

  const accessibilityLabel = `Goal: ${goal.name}, ${progressPct}% complete`;

  const inner = (
    <View style={containerStyle}>
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>
          {goal.name}
        </Text>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${progressPct}%`, backgroundColor: progressColor },
          ]}
        />
      </View>

      <View style={styles.amountRow}>
        <Text style={styles.amountSaved}>{savedRupees}</Text>
        <Text style={styles.amountSeparator}> / </Text>
        <Text style={styles.amountTarget}>{targetRupees}</Text>
      </View>

      {caption ? (
        <Text
          style={[
            styles.caption,
            caption === 'Completed!' && styles.captionComplete,
            caption === 'Overdue' && styles.captionOverdue,
          ]}
        >
          {caption}
        </Text>
      ) : null}
    </View>
  );

  if (!onPress) {
    return (
      <View accessibilityLabel={accessibilityLabel} style={styles.pressable}>
        {inner}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressablePressed]}
    >
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    width: 220,
    marginRight: spacing.sm,
  },
  pressablePressed: {
    opacity: 0.85,
  },
  container: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  containerComplete: {
    borderColor: colors.success,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  icon: {
    fontSize: 22,
    marginRight: spacing.xs,
  },
  name: {
    ...typography.h4,
    color: colors.text.primary,
    flex: 1,
  },
  progressTrack: {
    height: 6,
    width: '100%',
    backgroundColor: colors.border.light,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.xs,
  },
  amountSaved: {
    ...typography.label,
    color: colors.text.primary,
  },
  amountSeparator: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
  amountTarget: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
  caption: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  captionComplete: {
    color: colors.success,
    fontWeight: '700',
  },
  captionOverdue: {
    color: colors.error,
    fontWeight: '600',
  },
});

const SavingsGoalCard = React.memo(SavingsGoalCardBase);
export default SavingsGoalCard;