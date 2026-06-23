/**
 * /b/gamification/loyalty-hub — Phase 1.3 Loyalty Hub.
 *
 * The Loyalty Hub composes:
 *   1. A header ("Your loyalty").
 *   2. The big StreakFireIcon with the day count.
 *   3. The RezScoreCard (wrapped in a FeatureFlagGate on `b.rezScore`).
 *   4. A "Tier benefits" section that explains what each tier unlocks.
 *   5. A "Ways to boost your score" section with concrete, copy-driven tips.
 *   6. Pull-to-refresh wired to a no-op (UI-only — no network fetch yet).
 *
 * Wrapped in `withErrorBoundary(LoyaltyHub, 'Loyalty Hub')` so a runtime error
 * here never takes down the rest of the app.
 *
 * Screen view is logged via `logger.info('screen_view', { screen: '...' })`
 * on every focus.
 */
import React, { useCallback, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import { useStreakDisplay } from '@/hooks/b/gamification/useStreakDisplay';
import StreakFireIcon from '@/components/b/gamification/StreakFireIcon';
import RezScoreCard from '@/components/b/gamification/RezScoreCard';
import FeatureFlagGate from '@/components/b/_shared/FeatureFlagGate';
import { useLoyaltyTier } from '@/hooks/b/loyalty/useLoyaltyTier';
import LoyaltyTierCard from '@/components/b/loyalty/LoyaltyTierCard';
import LoyaltyBenefitsList from '@/components/b/loyalty/LoyaltyBenefitsList';
import TierProgressBar from '@/components/b/loyalty/TierProgressBar';
import WaysToBoostCard from '@/components/b/loyalty/WaysToBoostCard';
import { colors, spacing, borderRadius } from '@/constants/theme';
import logger from '@/utils/logger';

interface TierBenefit {
  tier: string;
  emoji: string;
  description: string;
  highlights: ReadonlyArray<string>;
}

const TIER_BENEFITS: ReadonlyArray<TierBenefit> = [
  {
    tier: 'Bronze',
    emoji: '🥉',
    description: '0–249 score',
    highlights: ['Free standard delivery on partner orders'],
  },
  {
    tier: 'Silver',
    emoji: '🥈',
    description: '250–499 score',
    highlights: ['Priority customer support', 'Early access to new offers'],
  },
  {
    tier: 'Gold',
    emoji: '🥇',
    description: '500–749 score',
    highlights: ['Exclusive member-only offers', 'Free express delivery'],
  },
  {
    tier: 'Platinum',
    emoji: '💎',
    description: '750–999 score',
    highlights: [
      'VIP events & early product drops',
      'Dedicated concierge support',
      'Highest cashback multiplier',
    ],
  },
];

interface ScoreBoost {
  title: string;
  description: string;
  points: number;
}

const SCORE_BOOSTS: ReadonlyArray<ScoreBoost> = [
  {
    title: 'Save 5% more this month',
    description: 'Hit your monthly savings target to bank bonus score.',
    points: 50,
  },
  {
    title: 'Maintain a 7-day streak',
    description: 'Seven consecutive days of activity counts as a streak.',
    points: 30,
  },
  {
    title: 'Complete a weekly challenge',
    description: 'Challenges rotate every Monday — finish one for a top-up.',
    points: 25,
  },
  {
    title: 'Unlock an achievement',
    description: 'New achievements drop in as you hit savings milestones.',
    points: 20,
  },
  {
    title: 'Upgrade to Premium',
    description: 'Premium unlocks free delivery and boosts your loyalty pillar.',
    points: 60,
  },
];

function LoyaltyHubBase() {
  const { currentStreakDays, longestStreakDays, isAtRisk, nextMilestoneDays, nextMilestoneReward } = useStreakDisplay();
  const { currentTier, nextTier, pointsToNextTier, progressPct, benefits, eligibleForUpgrade, daysToNextReview, tierHistory, score, tiers, currentTierLabel } = useLoyaltyTier();
  const [refreshing, setRefreshing] = useState<boolean>(false);

  useFocusEffect(
    useCallback(() => {
      logger.info('screen_view', { screen: 'Loyalty Hub' }, 'B Features');
      return () => {
        /* no cleanup */
      };
    }, []),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Phase 1.3 — UI only. No remote refresh; the parent (e.g. Savings
    // Dashboard refresh in a future phase) will trigger a real refresh.
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 400);
    });
    setRefreshing(false);
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.gold}
            colors={[colors.gold]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your loyalty</Text>
          <Text style={styles.headerSubtitle}>
            Streaks, score, and the perks you unlock along the way.
          </Text>
        </View>

        {/* Big streak block */}
        <View style={styles.streakBlock}>
          <StreakFireIcon streakDays={currentStreakDays} size={64} />
          <Text style={styles.streakCount}>
            {currentStreakDays} day{currentStreakDays === 1 ? '' : 's'} streak
          </Text>
          {longestStreakDays > currentStreakDays ? (
            <Text style={styles.streakMeta}>
              Longest so far: {longestStreakDays} days
            </Text>
          ) : null}
          {isAtRisk ? (
            <Text style={styles.streakAtRisk}>
              Your streak is at risk — log in today to keep it alive.
            </Text>
          ) : null}
          <Text style={styles.streakMilestone}>
            Next reward in {nextMilestoneDays} day{nextMilestoneDays === 1 ? '' : 's'}:
            {' '}
            <Text style={styles.streakMilestoneReward}>{nextMilestoneReward}</Text>
          </Text>
        </View>

        {/* REZ Score card (gated) */}
        <FeatureFlagGate flag="b.rezScore">
          <RezScoreCard />
        </FeatureFlagGate>

        {/* Tier benefits */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tier benefits</Text>
          {TIER_BENEFITS.map((benefit) => (
            <View key={benefit.tier} style={styles.tierRow}>
              <Text style={styles.tierEmoji}>{benefit.emoji}</Text>
              <View style={styles.tierBody}>
                <Text style={styles.tierName}>
                  {benefit.tier} <Text style={styles.tierRange}>· {benefit.description}</Text>
                </Text>
                {benefit.highlights.map((line) => (
                  <Text key={line} style={styles.tierHighlight}>
                    · {line}
                  </Text>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Ways to boost */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ways to boost your score</Text>
          {SCORE_BOOSTS.map((boost) => (
            <View key={boost.title} style={styles.boostRow}>
              <View style={styles.boostBody}>
                <Text style={styles.boostTitle}>{boost.title}</Text>
                <Text style={styles.boostDescription}>{boost.description}</Text>
              </View>
              <View style={styles.boostPointsPill}>
                <Text style={styles.boostPointsText}>+{boost.points} pts</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Tier progression hub — additive section (Phase 1.x). */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your tier</Text>
          <Text style={styles.sectionSubtitle}>
            {currentTierLabel} · {progressPct}% of this tier
            {nextTier ? ` · ${pointsToNextTier} pts to next` : ' · Top tier'}
          </Text>
          <View style={styles.tierProgressCard}>
            <TierProgressBar
              currentPoints={score}
              maxPoints={999}
              tier={currentTier}
            />
            {eligibleForUpgrade ? (
              <Text style={styles.upgradeHint}>
                You're eligible for an upgrade — keep stacking perks.
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tiers</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tiersScroller}
            accessibilityRole="list"
            accessibilityLabel="All loyalty tiers"
          >
            <LoyaltyTierCard
              tier={currentTier}
              isCurrentTier
              currentScore={score}
            />
            {tiers
              .filter((entry) => entry.key !== currentTier)
              .map((entry) => (
                <LoyaltyTierCard
                  key={entry.key}
                  tier={entry.key}
                  currentScore={score}
                />
              ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {currentTierLabel} benefits
          </Text>
          <LoyaltyBenefitsList tier={currentTier} />
          <Text style={styles.reviewHint}>
            Next tier review in {daysToNextReview} day{daysToNextReview === 1 ? '' : 's'}.
          </Text>
          {nextTier ? (
            <Text style={styles.reviewHint}>
              Goal: {pointsToNextTier} more pts to reach the next tier.
            </Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ways to boost (v2)</Text>
          <WaysToBoostCard currentScore={score} />
          <Text style={styles.reviewHint}>
            History: {tierHistory.length} tiers tracked.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing['3xl'],
  },
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    color: colors.nileBlue,
    fontSize: 24,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: colors.text.secondary,
    fontSize: 13,
    marginTop: 4,
  },
  streakBlock: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.base,
    marginHorizontal: spacing.base,
    marginVertical: spacing.sm,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  streakCount: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  streakMeta: {
    color: colors.text.secondary,
    fontSize: 12,
    marginTop: 2,
  },
  streakAtRisk: {
    color: colors.error,
    fontSize: 12,
    fontWeight: '600',
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  streakMilestone: {
    color: colors.text.secondary,
    fontSize: 12,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  streakMilestoneReward: {
    color: colors.gold,
    fontWeight: '700',
  },
  section: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.base,
  },
  sectionTitle: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.base,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginBottom: spacing.sm,
  },
  tierEmoji: {
    fontSize: 28,
    marginRight: spacing.md,
  },
  tierBody: {
    flex: 1,
  },
  tierName: {
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  tierRange: {
    color: colors.text.tertiary,
    fontSize: 12,
    fontWeight: '500',
  },
  tierHighlight: {
    color: colors.text.secondary,
    fontSize: 12,
    lineHeight: 18,
  },
  boostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginBottom: spacing.sm,
  },
  boostBody: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  boostTitle: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  boostDescription: {
    color: colors.text.secondary,
    fontSize: 12,
    lineHeight: 16,
  },
  boostPointsPill: {
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  boostPointsText: {
    color: colors.text.inverse,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  // Additive (Phase 1.x) tier-hub styles.
  sectionSubtitle: {
    color: colors.text.secondary,
    fontSize: 12,
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
  },
  tierProgressCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  upgradeHint: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  tiersScroller: {
    paddingRight: spacing.base,
  },
  reviewHint: {
    color: colors.text.tertiary,
    fontSize: 11,
    fontWeight: '500',
    marginTop: spacing.sm,
  },
});

const LoyaltyHub = LoyaltyHubBase;
export default withErrorBoundary(LoyaltyHub, 'Loyalty Hub');