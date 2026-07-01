/**
 * /b/savings/history — full savings history list.
 *
 * - Period filter chips at top: 7d / 30d / 90d (default 30).
 * - `FlatList` of `SavingsHistoryItem` rows with infinite scroll
 *   (`onEndReached` → `loadMore`).
 * - Pull-to-refresh.
 * - Empty state.
 * - Wrapped in `withErrorBoundary`.
 */
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRTL } from '@/hooks/useRTL';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import SavingsHistoryItem from '@/components/b/savings/SavingsHistoryItem';
import { useSavingsHistory } from '@/hooks/b/savings/useSavingsHistory';
import logger from '@/utils/logger';
import type { SavingsHistoryItem as SavingsHistoryItemType } from '@/types/savings.types';

type Period = 7 | 30 | 90;

const PERIODS: Period[] = [7, 30, 90];

function SavingsHistoryScreen() {
  const router = useRouter();
  const { items, hasMore, isLoading, total, loadMore, refresh } = useSavingsHistory();
  const [period, setPeriod] = useState<Period>(30);

  useFocusEffect(
    useCallback(() => {
      logger.info('screen_view', { screen: 'Savings History' }, 'B Features');
      refresh().catch(() => {
        /* errors surface via store */
      });
      return () => {
        /* no cleanup */
      };
    }, [refresh]),
  );

  const changePeriod = useCallback(
    (next: Period) => {
      if (next === period) return;
      setPeriod(next);
      // Summary fetch + history refresh — keep them as fire-and-forget.
      // We don't have direct getSummary on the hook; emit a log so QA can
      // trace which period is being requested.
      logger.info('savings_history_period_changed', { period: next }, 'B Features');
      refresh().catch(() => {
        /* errors surface via store */
      });
    },
    [period, refresh],
  );

  const onEndReached = useCallback(() => {
    if (!hasMore || isLoading) return;
    loadMore().catch(() => {
      /* errors surface via store */
    });
  }, [hasMore, isLoading, loadMore]);

  const onItemPress = useCallback((item: SavingsHistoryItemType) => {
    logger.info('savings_history_item_pressed', { id: item.id }, 'B Features');
  }, []);

  const renderFooter = useCallback(() => {
    if (!hasMore) {
      if (items.length > 0) {
        return (
          <View style={styles.footer}>
            <Text style={styles.footerText}>You've reached the end ({total} entries).</Text>
          </View>
        );
      }
      return null;
    }
    if (isLoading) {
      return (
        <View style={styles.footer}>
          <ActivityIndicator color={colors.gold} />
        </View>
      );
    }
    return null;
  }, [hasMore, isLoading, items.length, total]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.push('/b/savings' as const);
          }}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Activity</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <View
        style={styles.filterRow}
        accessibilityRole="radiogroup"
        accessibilityLabel="Filter by time period"
      >
        {PERIODS.map((p) => {
          const selected = p === period;
          return (
            <Pressable
              key={p}
              accessibilityRole="radio"
              accessibilityLabel={`${p} days${selected ? ', selected' : ''}`}
              accessibilityState={{ selected }}
              onPress={() => changePeriod(p)}
              style={({ pressed }) => [
                styles.chip,
                selected && styles.chipSelected,
                pressed && styles.chipPressed,
              ]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {p}d
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={items}
        keyExtractor={(it) => it.id ?? (it as any)._id}
        renderItem={({ item }) => (
          <SavingsHistoryItem item={item} onPress={() => onItemPress(item)} />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && items.length === 0}
            onRefresh={refresh}
            tintColor={colors.gold}
            colors={[colors.gold]}
          />
        }
        onEndReachedThreshold={0.8}
        onEndReached={onEndReached}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          isLoading ? null : (
            <View
              style={styles.emptyWrap}
              accessibilityRole="alert"
              accessibilityLabel="No savings yet. Start shopping to earn cashback — entries appear here."
            >
              <Text style={styles.emptyTitle} accessibilityElementsHidden>
                No savings yet
              </Text>
              <Text style={styles.emptySub} accessibilityElementsHidden>
                Start shopping to earn cashback — entries appear here.
              </Text>
            </View>
          )
        }
        ListFooterComponent={renderFooter}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  backText: {
    ...typography.label,
    color: colors.nileBlue,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.nileBlue,
  },
  headerRightSpacer: {
    width: 64,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  chipSelected: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  chipPressed: {
    opacity: 0.8,
  },
  chipText: {
    ...typography.label,
    color: colors.nileBlue,
  },
  chipTextSelected: {
    color: colors.nileBlue,
    fontWeight: '700',
  },
  listContent: {
    padding: spacing.base,
    paddingBottom: spacing['3xl'],
    flexGrow: 1,
  },
  footer: {
    paddingVertical: spacing.base,
    alignItems: 'center',
  },
  footerText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['2xl'],
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.nileBlue,
    marginBottom: spacing.xs,
  },
  emptySub: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});

export default withErrorBoundary(SavingsHistoryScreen, 'Savings History');