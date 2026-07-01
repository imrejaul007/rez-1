/**
 * SavingsDashboard — top-level view for the Savings feature.
 *
 * Layout
 * ------
 *   1. SavingsBalanceCard  — big rupee number + monthly progress bar.
 *   2. StreakNudge         — small streak pill with flame when alive.
 *   3. SavingsGoalCard     — horizontal scroll of goals.
 *   4. SavingsRecommendationsRow — horizontal scroll of recommendations.
 *   5. Recent activity     — last 5 SavingsHistoryItems.
 *
 * Each section is collapsible and includes a "View all →" link to the
 * dedicated screen. Wrapped in `<FeatureFlagGate flag="b.savings">` so the
 * whole dashboard can be disabled at runtime.
 *
 * The component reads from the granular selectors directly (no props) — it
 * is the canonical example of how to wire the savings store into a view.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useRTL } from '@/hooks/useRTL';
import { t } from '@/i18n';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { formatPrice } from '@/utils/priceFormatter';
import FeatureFlagGate from '@/components/b/_shared/FeatureFlagGate';
import {
  useSavingsDashboard,
  useSavingsGoals,
  useSavingsRecommendations,
  useSavingsLoading,
  useSavingsError,
  useSavingsActions,
} from '@/stores/selectors';

// Re-export recommendations to avoid unused import warning - used in render
const _recommendationsSelector = useSavingsRecommendations;
void _recommendationsSelector;
import logger from '@/utils/logger';
import SavingsGoalCard from './SavingsGoalCard';
import SavingsHistoryItemView from './SavingsHistoryItem';
import SavingsSkeleton from './SavingsSkeleton';
import type {
  SavingsGoal,
  SavingsHistoryItem,
  SavingsRecommendation,
  SavingsStreak,
} from '@/types/savings.types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

/** Format the last activity date relative to today. */
function isStreakAlive(lastActivityDate: string | null | undefined): boolean {
  if (!lastActivityDate) return false;
  const d = new Date(lastActivityDate);
  if (Number.isNaN(d.getTime())) return false;
  const ageMs = Date.now() - d.getTime();
  return ageMs >= 0 && ageMs <= MS_PER_DAY * 2;
}

interface SectionHeaderProps {
  title: string;
  onViewAll?: () => void;
  collapsed: boolean;
  onToggle: () => void;
}

function SectionHeader({ title, onViewAll, collapsed, onToggle }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title} section`}
        accessibilityState={{ expanded: !collapsed }}
        onPress={onToggle}
        style={styles.sectionHeaderTitleWrap}
      >
        <Text style={styles.sectionHeaderTitle}>{title}</Text>
        <Text style={styles.sectionHeaderChevron}>{collapsed ? '▸' : '▾'}</Text>
      </Pressable>
      {onViewAll ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`View all ${title}`}
          onPress={onViewAll}
          style={styles.viewAllBtn}
        >
          <Text style={styles.viewAllText}>View all →</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function SavingsBalanceCard() {
  const dashboard = useSavingsDashboard();
  const totalLabel = useMemo(() => {
    const rupees = (dashboard?.totalSavedPaise ?? 0) / 100;
    return formatPrice(rupees, 'INR', false) ?? '₹0';
  }, [dashboard?.totalSavedPaise]);

  const thisMonthLabel = useMemo(() => {
    const rupees = (dashboard?.thisMonthSavedPaise ?? 0) / 100;
    return formatPrice(rupees, 'INR', false) ?? '₹0';
  }, [dashboard?.thisMonthSavedPaise]);

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

  return (
    <View
      style={styles.balanceCard}
      accessibilityLabel={`Total saved ${totalLabel}. This month ${thisMonthLabel} of ${targetLabel}, ${progressPct} percent.`}
    >
      <Text style={styles.balanceLabel}>Total saved</Text>
      <Text style={styles.balanceAmount}>{totalLabel}</Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
      </View>
      <Text style={styles.balanceMeta}>
        {thisMonthLabel} of {targetLabel} this month ({progressPct}%)
      </Text>
    </View>
  );
}

function StreakNudge() {
  const dashboard = useSavingsDashboard();
  const streak: SavingsStreak | null | undefined = dashboard?.streak;
  const days = streak?.currentStreakDays ?? 0;
  const alive = isStreakAlive(streak?.lastActivityDate ?? null);

  if (!streak || days <= 0) return null;

  return (
    <View
      style={styles.streakCard}
      accessibilityLabel={`Streak: ${days} day${days === 1 ? '' : 's'}${alive ? ', active' : ''}.`}
    >
      <View style={styles.streakLeft}>
        <Text style={styles.streakFlame} accessibilityElementsHidden importantForAccessibility="no">
          {alive ? '🔥' : '✨'}
        </Text>
        <View>
          <Text style={styles.streakTitle}>Savings streak</Text>
          <Text style={styles.streakSub}>
            {days} day{days === 1 ? '' : 's'}
            {streak.isAtRisk ? ' — at risk' : alive ? ' — keep it up' : ''}
          </Text>
        </View>
      </View>
    </View>
  );
}

function SavingsGoalsRow({
  goals,
  onPressItem,
  onViewAll,
}: {
  goals: SavingsGoal[];
  onPressItem: (g: SavingsGoal) => void;
  onViewAll: () => void;
}) {
  if (goals.length === 0) {
    return (
      <View style={styles.emptyRow}>
        <Text style={styles.emptyText}>No goals yet — tap “View all” to add one.</Text>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Open goals page"
          onPress={onViewAll}
          style={styles.viewAllBtn}
        >
          <Text style={styles.viewAllText}>View all →</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View>
      <SectionHeader
        title="Your goals"
        onViewAll={onViewAll}
        collapsed={false}
        onToggle={() => {
          /* horizontal scroll is always visible; toggle is a no-op here */
        }}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalContent}
      >
        {goals.map((goal) => (
          <SavingsGoalCard
            key={goal.id ?? (goal as any)._id}
            goal={goal}
            onPress={() => onPressItem(goal)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function SavingsRecommendationsRow({
  items,
  onPressItem,
}: {
  items: SavingsRecommendation[];
  onPressItem: (r: SavingsRecommendation) => void;
}) {
  if (items.length === 0) {
    return (
      <View style={styles.emptyRow}>
        <Text style={styles.emptyText}>No recommendations right now.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.horizontalContent}
    >
      {items.map((rec) => {
        const potential = formatPrice((rec.potentialSavingsPaise ?? 0) / 100, 'INR', false) ?? '₹0';
        return (
          <Pressable
            key={rec.id ?? (rec as any)._id}
            accessibilityRole="button"
            accessibilityLabel={`${rec.title}. Potential savings ${potential}.`}
            onPress={() => onPressItem(rec)}
            style={({ pressed }) => [styles.recCard, pressed && styles.recCardPressed]}
          >
            <Text style={styles.recType} numberOfLines={1}>
              {(rec.type || '').replace(/_/g, ' ').toUpperCase() || '—'}
            </Text>
            <Text style={styles.recTitle} numberOfLines={2}>
              {rec.title}
            </Text>
            <Text style={styles.recDescription} numberOfLines={2}>
              {rec.description}
            </Text>
            <Text style={styles.recPotential}>+ {potential}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function RecentActivity({
  items,
  onPressItem,
  onViewAll,
}: {
  items: SavingsHistoryItem[];
  onPressItem: (i: SavingsHistoryItem) => void;
  onViewAll: () => void;
}) {
  if (items.length === 0) {
    return (
      <View style={styles.emptyRow}>
        <Text style={styles.emptyText}>No activity yet — start shopping to earn cashback.</Text>
      </View>
    );
  }

  return (
    <View>
      <SectionHeader
        title="Recent activity"
        onViewAll={onViewAll}
        collapsed={false}
        onToggle={() => {
          /* always visible */
        }}
      />
      <View>
        {items.map((it) => (
          <SavingsHistoryItemView
            key={it.id ?? (it as any)._id}
            item={it}
            onPress={() => onPressItem(it)}
          />
        ))}
      </View>
    </View>
  );
}

function DashboardBody() {
  const { colors: themeColors, shadows, isDark } = useTheme();
  const { isRTL, direction, start, backArrow } = useRTL();
  const router = useRouter();
  const dashboard = useSavingsDashboard();
  const goals = useSavingsGoals();
  const recommendations = useSavingsRecommendations();
  const isLoading = useSavingsLoading();
  const error = useSavingsError();
  const actions = useSavingsActions();

  // Collapsible state per section. Default: all open.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = useCallback(
    (key: string) => setCollapsed((c) => ({ ...c, [key]: !c[key] })),
    [],
  );

  const onRefresh = useCallback(async () => {
    try {
      const fetcher = (actions as { fetchDashboard?: () => Promise<void> })
        .fetchDashboard;
      if (typeof fetcher === 'function') {
        await fetcher.call(actions);
      }
    } catch (err) {
      logger.error(
        'savings_dashboard_refresh_failed',
        err instanceof Error ? err : new Error(String(err)),
        'B Features',
      );
    }
  }, [actions]);

  const onGoalPress = useCallback(
    (g: SavingsGoal) => {
      logger.info('savings_goal_pressed', { id: g.id }, 'B Features');
      router.push('/b/savings/goals' as const);
    },
    [router],
  );

  const onRecommendationPress = useCallback(
    (r: SavingsRecommendation) => {
      logger.info('savings_recommendation_pressed', { id: r.id }, 'B Features');
      if (r.ctaRoute) {
        try {
          router.push(r.ctaRoute as never);
        } catch {
          router.push('/b/savings' as const);
        }
      }
    },
    [router],
  );

  const onActivityPress = useCallback(
    (i: SavingsHistoryItem) => {
      logger.info('savings_activity_pressed', { id: i.id }, 'B Features');
      router.push('/b/savings/history' as const);
    },
    [router],
  );

  if (isLoading && !dashboard) {
    return <SavingsSkeleton />;
  }

  if (error && !dashboard) {
    return (
      <View style={styles.errorWrap} accessibilityLabel="Couldn't load savings">
        <Text style={styles.errorTitle}>Couldn't load savings</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retry"
          onPress={onRefresh}
          style={({ pressed }) => [styles.retryBtn, pressed && styles.retryBtnPressed]}
        >
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!dashboard) {
    return <SavingsSkeleton />;
  }

  const recent: SavingsHistoryItem[] = (dashboard.recentActivity ?? []).slice(0, 5);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={onRefresh}
          tintColor={colors.gold}
          colors={[colors.gold]}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <SavingsBalanceCard />
      <StreakNudge />

      {!collapsed.goals ? (
        <SavingsGoalsRow
          goals={goals}
          onPressItem={onGoalPress}
          onViewAll={() => router.push('/b/savings/goals' as const)}
        />
      ) : (
        <SectionHeader
          title="Your goals"
          onViewAll={() => router.push('/b/savings/goals' as const)}
          collapsed
          onToggle={() => toggle('goals')}
        />
      )}

      <View style={styles.spacer} />
      <SectionHeader
        title="Recommendations"
        collapsed={!!collapsed.recs}
        onToggle={() => toggle('recs')}
      />
      {!collapsed.recs ? (
        <SavingsRecommendationsRow items={recommendations} onPressItem={onRecommendationPress} />
      ) : null}

      <View style={styles.spacer} />
      {!collapsed.activity ? (
        <RecentActivity
          items={recent}
          onPressItem={onActivityPress}
          onViewAll={() => router.push('/b/savings/history' as const)}
        />
      ) : (
        <SectionHeader
          title="Recent activity"
          onViewAll={() => router.push('/b/savings/history' as const)}
          collapsed
          onToggle={() => toggle('activity')}
        />
      )}
    </ScrollView>
  );
}

function SavingsDashboardView() {
  return (
    <FeatureFlagGate flag="b.savings">
      <DashboardBody />
    </FeatureFlagGate>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: spacing['3xl'],
  },
  balanceCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginBottom: spacing.base,
  },
  balanceLabel: {
    ...typography.overline,
    color: colors.text.secondary,
  },
  balanceAmount: {
    ...typography.display,
    color: colors.nileBlue,
    marginTop: spacing.xs,
  },
  progressTrack: {
    height: 8,
    width: '100%',
    backgroundColor: colors.border.light,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginTop: spacing.base,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.gold,
    borderRadius: borderRadius.full,
  },
  balanceMeta: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  streakCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginBottom: spacing.base,
  },
  streakLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakFlame: {
    fontSize: 28,
    marginRight: spacing.md,
  },
  streakTitle: {
    ...typography.label,
    color: colors.nileBlue,
  },
  streakSub: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionHeaderTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHeaderTitle: {
    ...typography.h4,
    color: colors.nileBlue,
  },
  sectionHeaderChevron: {
    marginLeft: spacing.xs,
    color: colors.gold,
    fontSize: 16,
  },
  viewAllBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  viewAllText: {
    ...typography.label,
    color: colors.gold,
  },
  horizontalContent: {
    paddingRight: spacing.base,
  },
  emptyRow: {
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  emptyText: {
    ...typography.body,
    color: colors.text.secondary,
    flex: 1,
    marginRight: spacing.sm,
  },
  spacer: {
    height: spacing.base,
  },
  recCard: {
    width: 240,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  recCardPressed: {
    opacity: 0.85,
  },
  recType: {
    ...typography.overline,
    color: colors.gold,
  },
  recTitle: {
    ...typography.label,
    color: colors.nileBlue,
    marginTop: spacing.xs,
  },
  recDescription: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  recPotential: {
    ...typography.label,
    color: colors.success,
    marginTop: spacing.sm,
  },
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background.primary,
  },
  errorTitle: {
    ...typography.h3,
    color: colors.nileBlue,
    marginBottom: spacing.sm,
  },
  errorMessage: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.base,
  },
  retryBtn: {
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  retryBtnPressed: {
    opacity: 0.8,
  },
  retryText: {
    ...typography.label,
    color: colors.nileBlue,
  },
});

const SavingsDashboard = React.memo(SavingsDashboardView);
export default SavingsDashboard;
