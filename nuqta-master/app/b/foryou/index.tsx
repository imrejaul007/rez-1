/**
 * /b/foryou — main "For You Today" screen.
 *
 * Renders 3-5 personalised action cards in priority order. Includes a
 * manual Refresh button, a "last updated" timestamp, and handles the
 * loading / error / empty states inline. Pull-to-refresh re-runs the
 * hook's `refresh`.
 *
 * Lifecycle
 * ---------
 *  - On focus, logs a `screen_view` analytics event.
 *  - Wrapped in `withErrorBoundary(ForYouPage, 'For You Today')` so a
 *    runtime error here never takes down the rest of the app.
 *  - Wrapped in `<FeatureFlagGate flag="b.forYouToday">` so the
 *    operator can disable the entire screen with a single flag flip.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import FeatureFlagGate from '@/components/b/_shared/FeatureFlagGate';
import ForYouActionCard from '@/components/b/foryou/ForYouActionCard';
import { useForYouToday } from '@/hooks/b/foryou/useForYouToday';
import type { ForYouAction } from '@/types/foryou.types';
import logger from '@/utils/logger';

/** Re-render the "Last updated …" caption at most once a minute. */
const RELATIVE_TICK_MS = 60 * 1000;

/** Format a Date as "X min ago" / "just now" / "1 hr ago". */
function formatRelative(date: Date, nowMs: number): string {
  const diffMs = Math.max(0, nowMs - date.getTime());
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 30) return 'just now';
  if (diffSec < 60) return `${diffSec} sec ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
}

function ForYouLoadingState() {
  return (
    <View
      style={styles.stateWrap}
      accessibilityLabel="Loading your daily feed"
      accessibilityRole="progressbar"
    >
      <View style={styles.skeleton} />
      <View style={[styles.skeleton, styles.skeletonShort]} />
      <View style={styles.skeleton} />
      <View style={[styles.skeleton, styles.skeletonShort]} />
      <View style={styles.skeleton} />
    </View>
  );
}

function ForYouErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View
      style={styles.stateWrap}
      accessibilityLabel={`Couldn't load your daily feed. ${message}`}
    >
      <Text style={styles.errorEmoji} accessibilityElementsHidden importantForAccessibility="no">
        {'⚠️'}
      </Text>
      <Text style={styles.errorTitle}>Couldn't load your daily feed</Text>
      <Text style={styles.errorMessage}>{message}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Retry loading your daily feed"
        onPress={onRetry}
        style={({ pressed }) => [styles.retryBtn, pressed && styles.retryBtnPressed]}
      >
        <Text style={styles.retryText}>Retry</Text>
      </Pressable>
    </View>
  );
}

function ForYouEmptyState() {
  return (
    <View
      style={styles.stateWrap}
      accessibilityLabel="No actions for you today. Check back tomorrow."
    >
      <Text style={styles.emptyEmoji} accessibilityElementsHidden importantForAccessibility="no">
        {'🌿'}
      </Text>
      <Text style={styles.emptyTitle}>All quiet for today</Text>
      <Text style={styles.emptySubtitle}>
        No actions for you today — check back tomorrow.
      </Text>
    </View>
  );
}

function ForYouHeader({
  lastUpdatedLabel,
  isStale,
  onRefresh,
  isRefreshing,
}: {
  lastUpdatedLabel: string | null;
  isStale: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  return (
    <View style={styles.headerWrap}>
      <Text style={styles.heading}>For You Today</Text>
      <Text style={styles.subheading}>
        A few things picked just for you.
      </Text>
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>
          {lastUpdatedLabel === null
            ? 'Updating…'
            : isStale
              ? `Last updated ${lastUpdatedLabel} — refresh for fresh picks`
              : `Last updated ${lastUpdatedLabel}`}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh daily feed"
          onPress={onRefresh}
          disabled={isRefreshing}
          style={({ pressed }) => [
            styles.refreshBtn,
            pressed && styles.refreshBtnPressed,
            isRefreshing && styles.refreshBtnDisabled,
          ]}
        >
          <Text style={styles.refreshBtnText}>
            {isRefreshing ? 'Refreshing…' : 'Refresh'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function ForYouPageBody() {
  const router = useRouter();
  const {
    feed,
    isLoading,
    error,
    refresh,
    lastUpdatedAt,
    isStale,
  } = useForYouToday();

  // Re-render the relative timestamp at most once a minute so "5 min ago"
  // becomes "6 min ago" without forcing a network refetch.
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => {
      setNowMs(Date.now());
    }, RELATIVE_TICK_MS);
    return () => {
      clearInterval(id);
    };
  }, []);

  const lastUpdatedLabel = useMemo(() => {
    if (lastUpdatedAt === null) return null;
    return formatRelative(lastUpdatedAt, nowMs);
  }, [lastUpdatedAt, nowMs]);

  // Pull-to-refresh — uses the hook's `refresh` so we don't need to
  // reach into internals.
  const onRefresh = useCallback(async () => {
    try {
      await refresh();
    } catch (err) {
      logger.error(
        'foryou_refresh_failed',
        err instanceof Error ? err : new Error(String(err)),
        'B Features',
      );
    }
  }, [refresh]);

  // Track CTA taps for analytics. The actual navigation is delegated to
  // expo-router; we just observe which cards get clicked.
  const handleActionPress = useCallback(
    (action: ForYouAction) => {
      logger.info(
        'foryou_action_pressed',
        {
          id: action.id,
          type: action.type,
          ctaRoute: action.ctaRoute,
        },
        'B Features',
      );
      try {
        router.push(action.ctaRoute as never);
      } catch (err) {
        logger.error(
          'foryou_navigation_failed',
          err instanceof Error ? err : new Error(String(err)),
          'B Features',
        );
      }
    },
    [router],
  );

  // Log a screen view on focus and lazily fetch if needed.
  useFocusEffect(
    useCallback(() => {
      logger.info('screen_view', { screen: 'For You Today' }, 'B Features');
      if (feed.actions.length === 0 && error === null) {
        onRefresh().catch(() => {
          /* logged above */
        });
      }
      return () => {
        /* nothing to clean up */
      };
      // We intentionally only depend on `feed.actions.length` / `error`
      // to avoid re-running the effect on every reference change of
      // `onRefresh`.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [feed.actions.length, error]),
  );

  if (isLoading && feed.actions.length === 0) {
    return <ForYouLoadingState />;
  }

  if (error !== null && feed.actions.length === 0) {
    return <ForYouErrorState message={error.message} onRetry={onRefresh} />;
  }

  if (feed.actions.length === 0) {
    return <ForYouEmptyState />;
  }

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
      <ForYouHeader
        lastUpdatedLabel={lastUpdatedLabel}
        isStale={isStale}
        onRefresh={onRefresh}
        isRefreshing={isLoading}
      />
      {feed.actions.map((action) => (
        <ForYouActionCard
          key={action.id}
          action={action}
          onPress={() => {
            handleActionPress(action);
          }}
        />
      ))}
      <View style={styles.footerSpacer} />
    </ScrollView>
  );
}

function ForYouPage() {
  return (
    <FeatureFlagGate flag="b.forYouToday">
      <View style={styles.container}>
        <ForYouPageBody />
      </View>
    </FeatureFlagGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scroll: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing['3xl'] ?? spacing.xl,
    flexGrow: 1,
  },
  headerWrap: {
    marginBottom: spacing.base,
  },
  heading: {
    ...typography.h1,
    color: colors.nileBlue,
  },
  subheading: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    marginBottom: spacing.base,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  metaText: {
    ...typography.caption,
    color: colors.text.tertiary,
    flex: 1,
    marginRight: spacing.sm,
  },
  refreshBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gold,
  },
  refreshBtnPressed: {
    opacity: 0.8,
  },
  refreshBtnDisabled: {
    opacity: 0.5,
  },
  refreshBtnText: {
    ...typography.label,
    color: colors.nileBlue,
    fontWeight: '700',
  },
  footerSpacer: {
    height: spacing.lg,
  },
  stateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background.primary,
  },
  skeleton: {
    width: '100%',
    height: 90,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.secondary,
    marginBottom: spacing.base,
  },
  skeletonShort: {
    height: 60,
    width: '85%',
  },
  errorEmoji: {
    fontSize: 40,
    marginBottom: spacing.base,
  },
  errorTitle: {
    ...typography.h3,
    color: colors.nileBlue,
    marginBottom: spacing.sm,
    textAlign: 'center',
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
  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing.base,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.nileBlue,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});

export default withErrorBoundary(ForYouPage, 'For You Today');