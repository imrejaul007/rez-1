/**
 * /b/khata — main Khata (Split-Bill Ledger) screen.
 *
 * Renders the summary card plus a vertical list of merchant rows. Pull-
 * to-refresh re-runs the hook's `refresh`. Loading / error / empty states
 * are handled inline.
 *
 * Lifecycle
 * ---------
 *  - On focus, logs a `screen_view` analytics event and kicks off a
 *    refresh if the hook hasn't loaded yet.
 *  - Wrapped in `withErrorBoundary(KhataPage, 'Khata')` so a runtime
 *    error here never takes down the rest of the app.
 *  - Wrapped in `<FeatureFlagGate flag="b.khata">` so the operator can
 *    disable the entire screen with a single flag flip.
 */
import React, { useCallback } from 'react';
import {
  FlatList,
  ListRenderItem,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import FeatureFlagGate from '@/components/b/_shared/FeatureFlagGate';
import { TransactionListSkeleton } from '@/components/skeletons';
import KhataSummaryCard from '@/components/b/khata/KhataSummaryCard';
import KhataEntryCard from '@/components/b/khata/KhataEntryCard';
import { useKhata, type KhataEntry } from '@/hooks/b/khata/useKhata';
import logger from '@/utils/logger';

/** Stable sort key: most-recent activity first. */
function sortByRecency(a: KhataEntry, b: KhataEntry): number {
  const ta = new Date(a.lastTransactionAt).getTime();
  const tb = new Date(b.lastTransactionAt).getTime();
  // Defensive: invalid timestamps sink to the bottom.
  const safeA = Number.isFinite(ta) ? ta : 0;
  const safeB = Number.isFinite(tb) ? tb : 0;
  return safeB - safeA;
}

const renderKhataItem: ListRenderItem<KhataEntry> = ({ item }) => {
  return (
    <KhataEntryCard
      entry={item}
      onPress={() => {
        logger.info(
          'khata_entry_pressed',
          { merchantId: item.merchantId },
          'B Features',
        );
        // Future enhancement: navigate to a per-merchant detail page.
        // Intentionally a no-op for now — the API surface is ready
        // (`GET /api/b/khata/:merchantId`) but no screen consumes it yet.
      }}
    />
  );
};

const keyExtractor = (item: KhataEntry): string => item.merchantId;

function KhataLoadingState() {
  return (
    <View
      style={styles.stateWrap}
      accessibilityLabel="Loading khata ledger"
      accessibilityRole="progressbar"
    >
      <TransactionListSkeleton count={5} />
    </View>
  );
}

function KhataErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View
      style={styles.stateWrap}
      accessibilityLabel={`Couldn't load ledger. ${message}`}
    >
      <Text style={styles.errorTitle}>Couldn't load ledger</Text>
      <Text style={styles.errorMessage}>{message}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Retry"
        onPress={onRetry}
        style={({ pressed }) => [styles.retryBtn, pressed && styles.retryBtnPressed]}
      >
        <Text style={styles.retryText}>Retry</Text>
      </Pressable>
    </View>
  );
}

function KhataEmptyState() {
  return (
    <View
      style={styles.emptyWrap}
      accessibilityLabel="All settled up. Nothing to pay or collect."
    >
      <Text
        style={styles.emptyEmoji}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        🎉
      </Text>
      <Text style={styles.emptyTitle}>All settled up!</Text>
      <Text style={styles.emptySubtitle}>
        You don't owe anyone, and nobody owes you.
      </Text>
    </View>
  );
}

function KhataHeader({
  totalOwedPaise,
  totalOwedToYouPaise,
  netBalancePaise,
}: {
  totalOwedPaise: number;
  totalOwedToYouPaise: number;
  netBalancePaise: number;
}) {
  return (
    <View style={styles.headerWrap}>
      <KhataSummaryCard
        totalOwedPaise={totalOwedPaise}
        totalOwedToYouPaise={totalOwedToYouPaise}
        netBalancePaise={netBalancePaise}
      />
      <Text style={styles.sectionTitle}>Merchants</Text>
    </View>
  );
}

function KhataPageBody() {
  const {
    entries,
    totalOwedPaise,
    totalOwedToYouPaise,
    netBalancePaise,
    isLoading,
    error,
    refresh,
  } = useKhata();

  // Pull-to-refresh — uses the hook's `refresh` so we don't need to
  // reach into internals.
  const onRefresh = useCallback(async () => {
    try {
      await refresh();
    } catch (err) {
      logger.error(
        'khata_refresh_failed',
        err instanceof Error ? err : new Error(String(err)),
        'B Features',
      );
    }
  }, [refresh]);

  // Log a screen view on focus and lazily fetch if needed.
  useFocusEffect(
    useCallback(() => {
      logger.info('screen_view', { screen: 'Khata' }, 'B Features');
      if (entries.length === 0 && error === null) {
        onRefresh().catch(() => {
          /* logged above */
        });
      }
      return () => {
        /* nothing to clean up */
      };
      // We intentionally only depend on `entries.length` / `error` to
      // avoid re-running the effect on every reference change of
      // `onRefresh`.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entries.length, error]),
  );

  // Sort once per render — `entries` is already a new array reference
  // when the hook updates, so this is cheap.
  const sorted = React.useMemo(() => [...entries].sort(sortByRecency), [entries]);

  if (isLoading && entries.length === 0) {
    return <KhataLoadingState />;
  }

  if (error !== null && entries.length === 0) {
    return <KhataErrorState message={error.message} onRetry={onRefresh} />;
  }

  if (entries.length === 0) {
    return <KhataEmptyState />;
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.listContent}
      data={sorted}
      keyExtractor={keyExtractor}
      renderItem={renderKhataItem}
      ListHeaderComponent={
        <KhataHeader
          totalOwedPaise={totalOwedPaise}
          totalOwedToYouPaise={totalOwedToYouPaise}
          netBalancePaise={netBalancePaise}
        />
      }
      ListFooterComponent={<View style={styles.footerSpacer} />}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={onRefresh}
          tintColor={colors.gold}
          colors={[colors.gold]}
        />
      }
      showsVerticalScrollIndicator={false}
    />
  );
}

function KhataPage() {
  return (
    <FeatureFlagGate flag="b.khata">
      <View style={styles.container}>
        <KhataPageBody />
      </View>
    </FeatureFlagGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  list: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  listContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing['3xl'],
    flexGrow: 1,
  },
  headerWrap: {
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.nileBlue,
    marginTop: spacing.base,
    marginBottom: spacing.sm,
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
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing.base,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.nileBlue,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});

export default withErrorBoundary(KhataPage, 'Khata');