/**
 * /b/checkin — Daily Check-In screen (Phase 3.1).
 *
 * Renders the daily check-in flow as a single scrollable page:
 *   1. Header with title + sub-title.
 *   2. Today's status card with the big "Claim today" button.
 *   3. The 7-day calendar strip (`<CheckinCalendar />`).
 *   4. Streak stats + total coins earned this week.
 *
 * States
 * ------
 *   - Loading:  skeleton placeholder.
 *   - Error:    "Couldn't load check-in status" + retry.
 *   - Empty:    never empty (we always have a 7-day window).
 *   - Claimed:  shows a celebration message instead of the button.
 *
 * Wrapping
 * --------
 *   - `FeatureFlagGate flag="b.dailyCheckin"` hides the screen entirely
 *     if the parent feature has been disabled.
 *   - `withErrorBoundary(CheckinPage, 'Daily Check-In')` keeps the
 *     rest of the app alive if this screen crashes.
 *
 * Telemetry
 * ---------
 *   - `screen_view` is logged on every focus.
 *   - `checkin_claim_attempted` / `checkin_claim_succeeded` log lines
 *     are emitted from inside the hook — the page just observes.
 */
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import FeatureFlagGate from '@/components/b/_shared/FeatureFlagGate';
import CheckinCalendar from '@/components/b/checkin/CheckinCalendar';
import CheckinRewardModal from '@/components/b/checkin/CheckinRewardModal';
import { useDailyCheckin } from '@/hooks/b/checkin/useDailyCheckin';
import type { CheckinReward } from '@/hooks/b/checkin/useDailyCheckin';
import logger from '@/utils/logger';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface SkeletonBlockProps {
  width?: number | string;
  height?: number;
  style?: object;
}

function SkeletonBlock({
  width = '100%',
  height = 16,
  style,
}: SkeletonBlockProps): React.ReactElement {
  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius: borderRadius.sm,
          backgroundColor: colors.border.light,
        },
        style,
      ]}
    />
  );
}

function CheckinSkeleton(): React.ReactElement {
  return (
    <View style={styles.skeletonWrap} accessibilityLabel="Loading check-in status">
      <SkeletonBlock height={120} style={styles.skeletonSpace} />
      <SkeletonBlock height={140} style={styles.skeletonSpace} />
      <SkeletonBlock height={80} style={styles.skeletonSpace} />
    </View>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

function ErrorState({ message, onRetry }: ErrorStateProps): React.ReactElement {
  return (
    <View style={styles.errorWrap} accessibilityLabel="Check-in status error">
      <Text style={styles.errorEmoji}>😕</Text>
      <Text style={styles.errorTitle}>Couldn't load check-in status</Text>
      <Text style={styles.errorMessage}>{message}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Retry loading check-in status"
        onPress={onRetry}
        style={({ pressed }) => [styles.retryBtn, pressed && styles.btnPressed]}
      >
        <Text style={styles.retryText}>Try again</Text>
      </Pressable>
    </View>
  );
}

interface ClaimButtonProps {
  isClaiming: boolean;
  onPress: () => void;
  isClaimedToday: boolean;
}

function ClaimButton({
  isClaiming,
  onPress,
  isClaimedToday,
}: ClaimButtonProps): React.ReactElement {
  if (isClaimedToday) {
    return (
      <View
        style={styles.claimedBadge}
        accessibilityLabel="Today's reward already claimed"
      >
        <Text style={styles.claimedEmoji}>🎉</Text>
        <Text style={styles.claimedText}>All set for today!</Text>
        <Text style={styles.claimedSub}>Come back tomorrow for more</Text>
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Claim today's reward"
      onPress={onPress}
      disabled={isClaiming}
      style={({ pressed }) => [
        styles.claimBtn,
        pressed && styles.btnPressed,
        isClaiming && styles.btnDisabled,
      ]}
    >
      {isClaiming ? (
        <ActivityIndicator color={colors.nileBlue} />
      ) : (
        <Text style={styles.claimText}>Claim today</Text>
      )}
    </Pressable>
  );
}

interface StatsRowProps {
  currentStreakDays: number;
  nextMilestoneDays: number;
  nextMilestoneReward: string;
  totalCoinsEarnedThisWeek: number;
}

function StatsRow({
  currentStreakDays,
  nextMilestoneDays,
  nextMilestoneReward,
  totalCoinsEarnedThisWeek,
}: StatsRowProps): React.ReactElement {
  return (
    <View style={styles.statsRow}>
      <View
        style={styles.statCell}
        accessible
        accessibilityLabel={`Current streak ${currentStreakDays} days`}
      >
        <Text style={styles.statValue}>{currentStreakDays}</Text>
        <Text style={styles.statLabel}>Day streak</Text>
      </View>
      <View
        style={styles.statCell}
        accessible
        accessibilityLabel={`Next milestone in ${nextMilestoneDays} days: ${nextMilestoneReward}`}
      >
        <Text style={styles.statValue}>{nextMilestoneDays}</Text>
        <Text style={styles.statLabel}>Days to next reward</Text>
      </View>
      <View
        style={styles.statCell}
        accessible
        accessibilityLabel={`${totalCoinsEarnedThisWeek} coins earned this week`}
      >
        <Text style={styles.statValue}>{totalCoinsEarnedThisWeek}</Text>
        <Text style={styles.statLabel}>Coins this week</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function CheckinPageBase(): React.ReactElement {
  const { status, isLoading, isClaiming, error, claim, refresh } = useDailyCheckin();
  const [activeReward, setActiveReward] = useState<CheckinReward | null>(null);

  useFocusEffect(
    useCallback(() => {
      logger.info('screen_view', { screen: 'Daily Check-In' }, 'B Features');
      // Refresh on focus so the page is always current when the user
      // navigates back from another screen.
      refresh().catch(() => {
        /* errors are surfaced via the `error` state */
      });
      return () => {
        /* no cleanup needed */
      };
    }, [refresh]),
  );

  const onClaim = useCallback(async (): Promise<void> => {
    const result = await claim();
    if (result !== null) {
      setActiveReward(result.reward);
    }
  }, [claim]);

  const closeModal = useCallback((): void => {
    setActiveReward(null);
  }, []);

  // Render content based on lifecycle state.
  let body: React.ReactElement;
  if (isLoading && status === null) {
    body = <CheckinSkeleton />;
  } else if (error !== null && status === null) {
    body = <ErrorState message={error.message} onRetry={refresh} />;
  } else if (status === null) {
    // Defensive: both loading and error are clear but we still don't
    // have data — treat as an error so the user can retry.
    body = (
      <ErrorState
        message="No data available right now."
        onRetry={refresh}
      />
    );
  } else {
    const {
      isClaimedToday,
      currentStreakDays,
      weekData,
      totalCoinsEarnedThisWeek,
      nextMilestoneDays,
      nextMilestoneReward,
    } = status;

    body = (
      <View style={styles.contentWrap}>
        {/* Today's status card */}
        <View
          style={styles.todayCard}
          accessibilityLabel={
            isClaimedToday
              ? "Today's reward claimed"
              : "Today's reward available to claim"
          }
        >
          <Text style={styles.todayCardTitle}>
            {isClaimedToday ? 'You’re all caught up' : 'Ready to claim?'}
          </Text>
          <Text style={styles.todayCardSub}>
            {isClaimedToday
              ? 'You’ve already grabbed today’s reward. See you tomorrow!'
              : 'Tap the button below to collect today’s coin reward.'}
          </Text>
          <View style={styles.claimBtnWrap}>
            <ClaimButton
              isClaiming={isClaiming}
              isClaimedToday={isClaimedToday}
              onPress={onClaim}
            />
          </View>
        </View>

        {/* 7-day calendar */}
        <View style={styles.calendarWrap}>
          <CheckinCalendar weekData={weekData} />
        </View>

        {/* Stats row */}
        <View style={styles.statsWrap}>
          <StatsRow
            currentStreakDays={currentStreakDays}
            nextMilestoneDays={nextMilestoneDays}
            nextMilestoneReward={nextMilestoneReward}
            totalCoinsEarnedThisWeek={totalCoinsEarnedThisWeek}
          />
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refresh}
            tintColor={colors.gold}
            colors={[colors.gold]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Daily Check-In</Text>
          <Text style={styles.headerSubtitle}>
            Tap in every day to keep your streak and earn coins.
          </Text>
        </View>

        {body}
      </ScrollView>

      {activeReward !== null ? (
        <CheckinRewardModal
          reward={activeReward}
          streakDays={status?.currentStreakDays ?? 0}
          onClose={closeModal}
        />
      ) : null}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Feature-flagged, error-bounded entry point
// ---------------------------------------------------------------------------

/**
 * The exported screen is wrapped in:
 *   - `FeatureFlagGate` so the whole page disappears when the B
 *     dailyCheckin flag is off;
 *   - `withErrorBoundary` so a runtime error here never crashes the
 *     rest of the app.
 */
function GatedCheckinPage(): React.ReactElement {
  return (
    <FeatureFlagGate flag="b.dailyCheckin">
      <CheckinPageBase />
    </FeatureFlagGate>
  );
}

const CheckinPage = withErrorBoundary(GatedCheckinPage, 'Daily Check-In');
export default CheckinPage;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing['3xl'],
  },
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    paddingBottom: spacing.base,
  },
  headerTitle: {
    ...typography.h1,
    color: colors.nileBlue,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    ...typography.body,
    color: colors.text.secondary,
  },
  contentWrap: {
    paddingHorizontal: spacing.base,
  },
  todayCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.base,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginBottom: spacing.base,
  },
  todayCardTitle: {
    ...typography.h2,
    color: colors.nileBlue,
    marginBottom: spacing.xs,
  },
  todayCardSub: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.base,
  },
  claimBtnWrap: {
    alignItems: 'flex-start',
  },
  claimBtn: {
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    minWidth: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimText: {
    ...typography.h3,
    color: colors.nileBlue,
    fontWeight: '800',
  },
  btnPressed: {
    opacity: 0.85,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  claimedBadge: {
    backgroundColor: colors.background.accent,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: colors.gold,
  },
  claimedEmoji: {
    fontSize: 22,
    marginBottom: spacing.xs,
  },
  claimedText: {
    ...typography.h3,
    color: colors.nileBlue,
    fontWeight: '700',
    marginBottom: 2,
  },
  claimedSub: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  calendarWrap: {
    marginBottom: spacing.base,
  },
  statsWrap: {
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.base,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.nileBlue,
    marginBottom: 2,
  },
  statLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  // Skeleton
  skeletonWrap: {
    paddingHorizontal: spacing.base,
  },
  skeletonSpace: {
    marginBottom: spacing.base,
  },
  // Error
  errorWrap: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing['2xl'],
    alignItems: 'center',
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: spacing.base,
  },
  errorTitle: {
    ...typography.h2,
    color: colors.nileBlue,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  errorMessage: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryBtn: {
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
  },
  retryText: {
    ...typography.h3,
    color: colors.nileBlue,
    fontWeight: '800',
  },
});