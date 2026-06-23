/**
 * /b/social/live-activity — full Live Activity page (Phase 2.1).
 *
 * Composes:
 *   - `<LiveActivityStrip />` — horizontal scroller with the "live" pulse.
 *   - `<FriendsActivityFeed />` — vertical list of friend-only activity.
 *
 * State machine
 * -------------
 *   - `isLoading && events.length === 0` → skeleton.
 *   - `error && events.length === 0`   → error UI with retry button.
 *   - otherwise empty (no events)      → empty state copy.
 *   - happy path                       → strip + friends list.
 *
 * Telemetry
 * ---------
 *   - Logs `screen_view` on focus via `logger.info`.
 *   - Pull-to-refresh triggers `refresh()` from the underlying hook.
 *
 * Safety
 * ------
 *   - Wrapped in `withErrorBoundary(LiveActivityPage, 'Live Activity')` so
 *     a render-time crash inside the strip or friends list cannot take
 *     down the rest of the B nav stack.
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
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import LiveActivityStrip from '@/components/b/social/LiveActivityStrip';
import FriendsActivityFeed from '@/components/b/social/FriendsActivityFeed';
import { useLiveActivity } from '@/hooks/b/social/useLiveActivity';
import logger from '@/utils/logger';
import type { LiveActivityEvent } from '@/types/activity.types';

function LiveActivityPageBase(): React.ReactElement {
  const { events, isLoading, error, isLive, refresh, totalToday, lastUpdatedAt } =
    useLiveActivity();
  const [refreshing, setRefreshing] = useState<boolean>(false);

  useFocusEffect(
    useCallback(() => {
      logger.info('screen_view', { screen: 'Live Activity' }, 'B Features');
      return () => {
        /* no cleanup */
      };
    }, []),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const handleEventPress = useCallback((event: LiveActivityEvent) => {
    logger.info(
      'live_activity_event_tap',
      { eventId: event.id, type: event.type },
      'B Features',
    );
  }, []);

  const showSkeleton = isLoading && events.length === 0;
  const showError = error !== null && events.length === 0;
  const showEmpty = !showSkeleton && !showError && events.length === 0;

  const headerSubtitle = isLive
    ? `Live • ${totalToday} event${totalToday === 1 ? '' : 's'} today`
    : `${totalToday} event${totalToday === 1 ? '' : 's'} today`;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.gold}
            colors={[colors.gold]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Live activity</Text>
          <Text style={styles.subtitle}>{headerSubtitle}</Text>
          {lastUpdatedAt ? (
            <Text style={styles.timestamp}>
              Updated {new Date(lastUpdatedAt).toLocaleTimeString()}
            </Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <LiveActivityStrip events={events} onEventPress={handleEventPress} />
        </View>

        <View style={styles.section}>
          <FriendsActivityFeed events={events} onEventPress={handleEventPress} />
        </View>

        {showSkeleton ? <SkeletonBlock /> : null}
        {showError ? (
          <ErrorBlock
            message={error?.message ?? 'Unknown error'}
            onRetry={() => {
              void refresh();
            }}
          />
        ) : null}
        {showEmpty ? <EmptyBlock /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function SkeletonBlock(): React.ReactElement {
  return (
    <View style={styles.skeleton} accessible accessibilityLabel="Loading activity">
      <View style={styles.skeletonLine} />
      <View style={styles.skeletonLineShort} />
      <View style={styles.skeletonLine} />
    </View>
  );
}

interface ErrorBlockProps {
  message: string;
  onRetry: () => void;
}

function ErrorBlock({ message, onRetry }: ErrorBlockProps): React.ReactElement {
  return (
    <View style={styles.errorBlock} accessibilityRole="alert" accessibilityLabel={`Couldn't load activity. ${message}`}>
      <Text style={styles.errorTitle}>Couldn't load activity</Text>
      <Text style={styles.errorMessage}>{message}</Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="Retry loading activity"
        onPress={onRetry}
        style={styles.retryButton}
      >
        Tap to retry
      </Text>
    </View>
  );
}

function EmptyBlock(): React.ReactElement {
  return (
    <View style={styles.emptyBlock} accessibilityRole="text">
      <Text style={styles.emptyTitle}>No activity yet</Text>
      <Text style={styles.emptyMessage}>
        Be the first to save some coins!
      </Text>
    </View>
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
  title: {
    color: colors.nileBlue,
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.text.secondary,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  timestamp: {
    color: colors.text.tertiary,
    fontSize: 11,
    marginTop: 2,
  },
  section: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
  },
  skeleton: {
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
    padding: spacing.base,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  skeletonLine: {
    height: 14,
    borderRadius: 4,
    backgroundColor: colors.border.default,
    marginVertical: spacing.xs,
  },
  skeletonLineShort: {
    height: 14,
    width: '60%',
    borderRadius: 4,
    backgroundColor: colors.border.default,
    marginVertical: spacing.xs,
  },
  errorBlock: {
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
    padding: spacing.base,
    backgroundColor: colors.errorScale[50],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.errorScale[200],
  },
  errorTitle: {
    ...typography.label,
    color: colors.error,
    fontWeight: '800',
  },
  errorMessage: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  retryButton: {
    ...typography.label,
    color: colors.nileBlue,
    marginTop: spacing.sm,
    fontWeight: '800',
  },
  emptyBlock: {
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.base,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.nileBlue,
    fontWeight: '800',
  },
  emptyMessage: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});

export default withErrorBoundary(LiveActivityPageBase, 'Live Activity');
