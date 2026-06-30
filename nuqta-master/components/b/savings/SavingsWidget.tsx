/**
 * SavingsWidget — compact savings card for the home tab.
 *
 * Renders a tap-target with:
 *   - "Total saved: ₹X,XXX" (from the dashboard payload).
 *   - A thin progress bar toward this month's target.
 *   - A "Tap to see more" hint.
 *
 * Pressing the card navigates to the full `/b/savings` dashboard.
 *
 * Reads from selectors directly — no props, no parent wiring. The widget
 * is wrapped by `<FeatureFlagGate flag="b.savings">` at the call site so
 * it disappears entirely when the B feature is disabled.
 *
 * No internal fetch — the widget trusts the parent screen to have already
 * triggered the dashboard load (or lazily reads whatever the store has).
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSavingsDashboard } from '@/stores/selectors';
import { useSavingsStore } from '@/stores/savingsStore';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { formatPrice } from '@/utils/priceFormatter';
import logger from '@/utils/logger';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function isStreakAlive(lastActivityAt: string | null | undefined): boolean {
  if (!lastActivityAt) return false;
  const d = new Date(lastActivityAt);
  if (Number.isNaN(d.getTime())) return false;
  const ageMs = Date.now() - d.getTime();
  return ageMs >= 0 && ageMs <= MS_PER_DAY * 2;
}

function SavingsWidgetBase() {
  const router = useRouter();
  const dashboard = useSavingsDashboard();
  const fetchDashboard = useSavingsStore((s) => s.actions.fetchDashboard);
  const fetchAttemptedRef = useRef(false);

  // Lazy-fetch: if the parent screen didn't already load the dashboard,
  // kick off a background load once. Idempotent via module-level ref.
  useEffect(() => {
    if (dashboard !== null || fetchAttemptedRef.current) return;
    fetchAttemptedRef.current = true;
    fetchDashboard().catch((err: unknown) => {
      logger.warn(
        'savings_widget_fetch_failed',
        { error: String(err) },
        'B Features',
      );
    });
  }, [dashboard, fetchDashboard]);

  const totalSavedLabel = useMemo(() => {
    const rupees = (dashboard?.totalSavedPaise ?? 0) / 100;
    return formatPrice(rupees, 'INR', false) ?? '₹0';
  }, [dashboard?.totalSavedPaise]);

  const targetLabel = useMemo(() => {
    const rupees = (dashboard?.thisMonthTargetPaise ?? 0) / 100;
    return formatPrice(rupees, 'INR', false) ?? '₹0';
  }, [dashboard?.thisMonthTargetPaise]);

  const progressPct = useMemo(() => {
    const saved = dashboard?.thisMonthSavedPaise ?? 0;
    const target = dashboard?.thisMonthTargetPaise ?? 0;
    if (target <= 0) return 0;
    return clamp(Math.round((saved / target) * 100), 0, 100);
  }, [dashboard?.thisMonthSavedPaise, dashboard?.thisMonthTargetPaise]);

  const streakDays = dashboard?.streak?.currentStreakDays ?? 0;
  const streakAlive = isStreakAlive(dashboard?.streak?.lastActivityDate ?? null);

  const accessibilityLabel = `Total saved ${totalSavedLabel}. ${
    streakDays > 0
      ? `${streakDays} day${streakDays === 1 ? '' : 's'} streak. `
      : ''
  }Tap to see more.`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        router.push('/b/savings' as const);
      }}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      <View style={styles.headerRow}>
        <Text style={styles.title}>Your savings</Text>
        {streakDays > 0 && streakAlive ? (
          <View style={styles.streakBadge}>
            <Text style={styles.streakEmoji} accessibilityElementsHidden importantForAccessibility="no">
              🔥
            </Text>
            <Text style={styles.streakText}>
              {streakDays}d
            </Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.amount}>
        <Text style={styles.amountLabel}>Total saved: </Text>
        {totalSavedLabel}
      </Text>

      <View style={styles.progressTrack}>
        <View
          style={[styles.progressFill, { width: `${progressPct}%` }]}
        />
      </View>

      <Text style={styles.progressMeta}>
        {progressPct}% of {targetLabel} this month
      </Text>

      <Text style={styles.hint}>Tap to see more →</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginHorizontal: spacing.base,
    marginVertical: spacing.sm,
  },
  pressed: {
    opacity: 0.85,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.label,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.accent,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  streakEmoji: {
    fontSize: 12,
    marginRight: 4,
  },
  streakText: {
    ...typography.caption,
    color: colors.text.primary,
    fontWeight: '700',
  },
  amount: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  amountLabel: {
    ...typography.body,
    color: colors.text.secondary,
    fontWeight: '400',
  },
  progressTrack: {
    height: 6,
    width: '100%',
    backgroundColor: colors.border.light,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.gold,
    borderRadius: borderRadius.full,
  },
  progressMeta: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  hint: {
    ...typography.caption,
    color: colors.gold,
    fontWeight: '600',
    textAlign: 'right',
  },
});

const SavingsWidget = React.memo(SavingsWidgetBase);
export default SavingsWidget;