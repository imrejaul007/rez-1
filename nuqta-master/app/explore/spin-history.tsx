// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import { colors } from '@/constants/theme';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { TransactionListSkeleton } from '@/components/skeletons';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import gamificationApi, { SpinHistoryEntry } from '@/services/gamificationApi';
import { useGetCurrencySymbol } from '@/stores/selectors';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { useIsMounted } from '@/hooks/useIsMounted';
const PRIZE_TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  coins: { icon: 'flash', color: Colors.warning, label: 'Coins' },
  cashback: { icon: 'cash', color: Colors.success, label: 'Cashback' },
  discount: { icon: 'pricetag', color: colors.brand.pink, label: 'Discount' },
  voucher: { icon: 'ticket', color: Colors.brand.purple, label: 'Voucher' },
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function SpinHistoryPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const [history, setHistory] = useState<SpinHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalSpins, setTotalSpins] = useState(0);
  const fetchingRef = useRef(false);

  const fetchHistory = useCallback(async (pageNum: number, isRefresh = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await gamificationApi.getSpinHistory({ page: pageNum, limit: 20 });

      if (response.success && response.data) {
        const { history: entries, pagination } = response.data;

        if (pageNum === 1 || isRefresh) {
          if (!isMounted()) return;
          setHistory(entries);
        } else {
          if (!isMounted()) return;
          setHistory(prev => [...prev, ...entries]);
        }

        if (!isMounted()) return;
        setTotalSpins(pagination.total);
        if (!isMounted()) return;
        setHasMore(pageNum < pagination.pages);
        if (!isMounted()) return;
        setPage(pageNum);
      }
    } catch (err) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
      if (!isMounted()) return;
      setLoadingMore(false);
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchHistory(1);
  }, [fetchHistory]);

  const onRefresh = useCallback(() => {
    fetchHistory(1, true);
  }, [fetchHistory]);

  const onEndReached = useCallback(() => {
    if (hasMore && !loadingMore) {
      fetchHistory(page + 1);
    }
  }, [hasMore, loadingMore, page, fetchHistory]);

  const getRewardDisplay = (entry: SpinHistoryEntry): string => {
    if (entry.reward?.coins) return `+${entry.reward.coins} Coins`;
    if (entry.reward?.cashback) return `${entry.reward.cashback}% Cashback`;
    if (entry.reward?.discount) return `${entry.reward.discount}% Off`;
    if (entry.reward?.voucher) return `${currencySymbol}${entry.reward.voucher} Voucher`;
    return entry.prize || 'Prize';
  };

  const renderItem = useCallback(({ item }: { item: SpinHistoryEntry }) => {
    const config = PRIZE_TYPE_CONFIG[item.type] || PRIZE_TYPE_CONFIG.coins;
    const rewardText = getRewardDisplay(item);
    const storeName = item.couponMetadata?.storeName;

    return (
      <View style={styles.historyItem}>
        <View style={[styles.iconContainer, { backgroundColor: `${config.color}15` }]}>
          <Ionicons name={config.icon as any} size={20} color={config.color} />
        </View>
        <View style={styles.itemContent}>
          <Text style={styles.itemPrize}>{rewardText}</Text>
          {storeName && (
            <Text style={styles.itemStore}>
              {item.couponMetadata?.isProductSpecific
                ? `${item.couponMetadata.productName} at ${storeName}`
                : `Valid at ${storeName}`}
            </Text>
          )}
          <Text style={styles.itemDate}>{formatDate(item.completedAt)}</Text>
        </View>
        <View style={[styles.typeBadge, { backgroundColor: `${config.color}15` }]}>
          <Text style={[styles.typeBadgeText, { color: config.color }]}>{config.label}</Text>
        </View>
      </View>
    );
  }, [currencySymbol]);

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="game-controller-outline" size={64} color={Colors.border.default} />
        <Text style={styles.emptyTitle}>No Spins Yet</Text>
        <Text style={styles.emptyText}>Play the Spin & Win game to see your history here</Text>
        <Pressable
          style={styles.playButton}
          onPress={() => router.push('/explore/spin-win' as any)}
        >
          <Text style={styles.playButtonText}>Play Now</Text>
        </Pressable>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={Colors.warning} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Spin History</Text>
        <View style={styles.totalBadge}>
          <Text style={styles.totalBadgeText}>{totalSpins} spins</Text>
        </View>
      </View>

      {/* Loading */}
      {loading && (
        <TransactionListSkeleton />
      )}

      {/* History List */}
      {!loading && (
        <FlashList
          data={history}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.warning]} />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          estimatedItemSize={80}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: 50,
    paddingBottom: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.secondary,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Typography.h4.fontSize,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  totalBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.xl,
  },
  totalBadgeText: {
    fontSize: Typography.bodySmall.fontSize,
    fontWeight: '600',
    color: Colors.warning,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.body.fontSize,
    color: Colors.text.tertiary,
  },
  listContent: {
    padding: Spacing.base,
    flexGrow: 1,
    paddingBottom: 120,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: Spacing.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
  },
  itemPrize: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  itemStore: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.text.tertiary,
    marginBottom: 2,
  },
  itemDate: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.text.tertiary,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  typeBadgeText: {
    fontSize: Typography.caption.fontSize,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: Colors.background.secondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: Typography.h3.fontSize,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: Spacing.sm,
  },
  emptyText: {
    fontSize: Typography.body.fontSize,
    color: Colors.text.tertiary,
    textAlign: 'center',
    maxWidth: 280,
  },
  playButton: {
    marginTop: Spacing.base,
    backgroundColor: Colors.warning,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  playButtonText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  footerLoader: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
});

export default withErrorBoundary(SpinHistoryPage, 'ExploreSpinHistory');
