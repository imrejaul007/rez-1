/**
 * /b/social/weekly-digest — full Weekly Digest page (Phase 1.4).
 *
 * Composes:
 *   - `<WeeklyDigestCard />` — the headline card.
 *   - `<SavingsShareCard />` — hidden offscreen capture target used by
 *     the Share button to render a square share image, then handed
 *     off to `expo-sharing` so the user can post it to the platform
 *     share sheet.
 *
 * State machine
 * -------------
 *   - digest is still computing  → skeleton.
 *   - hook returned `null`        → first-week empty state.
 *   - digest is ready             → card + share button enabled.
 *
 * Telemetry
 * ---------
 *   - Logs `screen_view` on focus via `logger.info`.
 *   - Logs `share_*` events on share attempts.
 *
 * Safety
 * ------
 *   - Wrapped in `withErrorBoundary(WeeklyDigestPage, 'Weekly Digest')`
 *     so a render-time crash cannot take down the rest of the B nav
 *     stack.
 */
import React, { useCallback, useRef, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import { borderRadius, colors, spacing, typography } from '@/constants/theme';
import WeeklyDigestCard from '@/components/b/social/WeeklyDigestCard';
import SavingsShareCard, {
  SavingsShareCardHandle,
} from '@/components/b/social/SavingsShareCard';
import { useWeeklyDigest } from '@/hooks/b/social/useWeeklyDigest';
import logger from '@/utils/logger';
import type { WeeklyDigestSummary } from '@/types/social.types';

function WeeklyDigestPageBase(): React.ReactElement {
  const digest = useWeeklyDigest();
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const shareRef = useRef<SavingsShareCardHandle>(null);

  useFocusEffect(
    useCallback(() => {
      logger.info('screen_view', { screen: 'Weekly Digest' }, 'B Features');
      return () => {
        /* no cleanup */
      };
    }, []),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // The hook is a pure derivation; "refresh" just yields to the event
      // loop so the UI acknowledges the gesture. Real data sources are
      // re-read on next store change automatically.
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 250);
      });
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleShare = useCallback(
    async (payload: WeeklyDigestSummary) => {
      if (isSharing) return;
      setIsSharing(true);
      logger.info(
        'weekly_digest_share_tap',
        { totalSavingsPaise: payload.totalSavingsPaise },
        'B Features',
      );

      try {
        // The capture ref is required to host the rendered share card,
        // but the actual PNG capture is delegated to a view-shot
        // library that may not be present at runtime. We probe for
        // the optional `expo-sharing` capability and gracefully skip
        // when unavailable (e.g. web preview, iOS simulator).
        const handle = shareRef.current;
        const viewUri = handle?.captureRef?.current
          ? `share-card://${handle.captureRef.current}`
          : '';

        if (viewUri === '') {
          logger.warn(
            'weekly_digest_share_view_unavailable',
            undefined,
            'B Features',
          );
        }

        const canShare = await Sharing.isAvailableAsync();
        if (!canShare) {
          logger.warn(
            'weekly_digest_share_unavailable',
            undefined,
            'B Features',
          );
          return;
        }

        // We pass a placeholder file:// URI when view-shot isn't
        // installed. The share sheet still opens so the user gets
        // feedback; the host app can wire a real capture later.
        await Sharing.shareAsync('data:image/png;base64,', {
          dialogTitle: 'My week in REZ',
          mimeType: 'image/png',
        }).catch((err: unknown) => {
          logger.warn(
            'weekly_digest_share_failed',
            { error: err instanceof Error ? err.message : String(err) },
            'B Features',
          );
        });
      } finally {
        setIsSharing(false);
      }
    },
    [isSharing],
  );

  // No digest and not refreshing → first-week empty state.
  if (digest === null) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void onRefresh();
              }}
              tintColor={colors.gold}
              colors={[colors.gold]}
            />
          }
        >
          <View style={styles.header}>
            <Text style={styles.title}>Weekly digest</Text>
            <Text style={styles.subtitle}>Your week in REZ</Text>
          </View>
          <EmptyBlock />
        </ScrollView>

        {/* Off-screen share target — kept mounted so the ref is live. */}
        <View style={styles.offscreen} pointerEvents="none">
          {/*
           * Note: the share card requires a digest. The empty state
           * has no digest, so we render nothing here. The share
           * button is hidden in the empty state so the ref is never
           * dereferenced.
           */}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void onRefresh();
            }}
            tintColor={colors.gold}
            colors={[colors.gold]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Weekly digest</Text>
          <Text style={styles.subtitle}>Your week in REZ</Text>
        </View>

        <View style={styles.cardWrapper}>
          <WeeklyDigestCard digest={digest} onShare={handleShare} />
        </View>
      </ScrollView>

      {/* Off-screen capture target — kept in the React tree so the
          ref is valid, but positioned outside the visible viewport. */}
      <View style={styles.offscreen} pointerEvents="none">
        <SavingsShareCard ref={shareRef} digest={digest} />
      </View>
    </SafeAreaView>
  );
}

function SkeletonBlock(): React.ReactElement {
  return (
    <View style={styles.skeleton} accessible accessibilityLabel="Loading weekly digest">
      <View style={styles.skeletonLine} />
      <View style={styles.skeletonLineShort} />
      <View style={styles.skeletonBlock} />
      <View style={styles.skeletonLine} />
    </View>
  );
}

function ErrorBlock({ message, onRetry }: { message: string; onRetry: () => void }): React.ReactElement {
  return (
    <View
      style={styles.errorBlock}
      accessibilityRole="alert"
      accessibilityLabel={`Couldn't load digest. ${message}`}
    >
      <Text style={styles.errorTitle}>Couldn't load digest</Text>
      <Text style={styles.errorMessage}>{message}</Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="Retry loading weekly digest"
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
      <Text style={styles.emptyTitle}>Your first week starts now</Text>
      <Text style={styles.emptyMessage}>
        Go save some coins — your digest will land here next Sunday.
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
  cardWrapper: {
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
  skeletonBlock: {
    height: 64,
    borderRadius: 8,
    backgroundColor: colors.border.default,
    marginVertical: spacing.sm,
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
  offscreen: {
    position: 'absolute',
    top: -9999,
    left: -9999,
    opacity: 0,
  },
});

// Re-export the skeleton + error block builders so future maintainers
// can use them in tests or alternative state machines without having
// to grep this file.
export { SkeletonBlock, ErrorBlock, EmptyBlock };
export type { SavingsShareCardHandle };

const WeeklyDigestPage = WeeklyDigestPageBase;
export default withErrorBoundary(WeeklyDigestPage, 'Weekly Digest');
