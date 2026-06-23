// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Privé Activity History Page
 * Campaign and activity history with real data from API
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { PRIVE_COLORS, PRIVE_SPACING, PRIVE_RADIUS } from '@/components/prive/priveTheme';
import { TransactionListSkeleton } from '@/components/skeletons';
import priveApi, { TransactionItem } from '@/services/priveApi';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

function ActivityHistoryScreen() {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [stats, setStats] = useState({ active: 0, completed: 0, avgRating: null as number | null });

  const fetchData = useCallback(async (pageNum: number) => {
    try {
      if (pageNum > 1) setLoadingMore(true);
      const response = await priveApi.getTransactions({ page: pageNum, limit: 20 });
      if (response.success && response.data) {
        const newItems = response.data.transactions || [];
        if (pageNum === 1) {
          setTransactions(newItems);
        } else {
          setTransactions(prev => [...prev, ...newItems]);
        }
        setHasMore(newItems.length === 20);
      }
    } catch (err) {
      if (!isMounted()) return;
      setError('Failed to load activity data');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
      if (!isMounted()) return;
      setLoadingMore(false);
    }
  }, []);
  const isMounted = useIsMounted();

  useEffect(() => {
    // Fetch stats from dashboard
    const fetchStats = async () => {
      try {
        const response = await priveApi.getDashboard();
        if (response.success && response.data?.stats) {
          setStats({
            active: response.data.stats.activeCampaigns || 0,
            completed: response.data.stats.completedCampaigns || 0,
            avgRating: response.data.stats.avgRating ?? null,
          });
        }
      } catch (_) {
        // Stats are supplementary — don't block page
      }
    };
    fetchStats();
    fetchData(1);
  }, [fetchData]);

  const loadMore = () => {
    if (!isLoading && !loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchData(nextPage);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return PRIVE_COLORS.status.success;
      case 'active':
        return PRIVE_COLORS.status.info;
      case 'pending':
        return PRIVE_COLORS.status.warning;
      default:
        return PRIVE_COLORS.text.tertiary;
    }
  };

  const renderActivityItem = useCallback(({ item }: { item: TransactionItem }) => (
    <View style={styles.activityCard}>
      <View style={styles.activityLeft}>
        <Text style={styles.activityTitle}>{item.description}</Text>
        <Text style={styles.activityDate}>{item.date}</Text>
      </View>
      <View style={styles.activityRight}>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
        <Text style={[styles.rewardText, item.type === 'spent' && styles.spentText]}>
          {item.type === 'spent' ? '-' : '+'}{item.amount}
        </Text>
      </View>
    </View>
  ), []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.neutral[800], colors.neutral[900], colors.midGrayAlt]}
        style={StyleSheet.absoluteFill}
      />

        {isLoading && transactions.length === 0 ? (
          <TransactionListSkeleton />
        ) : error && transactions.length === 0 ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <FlashList
            data={transactions}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
            estimatedItemSize={80}
            ListHeaderComponent={
              <>
                <View style={styles.statsCard}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{stats.active}</Text>
                    <Text style={styles.statLabel}>Active</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{stats.completed}</Text>
                    <Text style={styles.statLabel}>Completed</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{stats.avgRating != null ? stats.avgRating.toFixed(1) : 'N/A'}</Text>
                    <Text style={styles.statLabel}>Avg Rating</Text>
                  </View>
                </View>
                {transactions.length > 0 && (
                  <Text style={styles.sectionTitle}>All Activity</Text>
                )}
              </>
            }
            ListEmptyComponent={
              !isLoading ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No activity yet</Text>
                  <Text style={styles.emptySubtext}>Your transaction history will appear here</Text>
                </View>
              ) : null
            }
            renderItem={renderActivityItem}
            onEndReached={loadMore}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              hasMore && transactions.length > 0 ? (
                <View style={{ padding: 16, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={PRIVE_COLORS.gold.primary} />
                </View>
              ) : null
            }
          />
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: PRIVE_SPACING.xl,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: PRIVE_COLORS.background.card,
    borderRadius: PRIVE_RADIUS.xl,
    padding: PRIVE_SPACING.xl,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.goldMuted,
    marginBottom: PRIVE_SPACING.xl,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '300',
    color: PRIVE_COLORS.gold.primary,
  },
  statLabel: {
    fontSize: 12,
    color: PRIVE_COLORS.text.tertiary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: PRIVE_COLORS.transparent.white10,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: PRIVE_SPACING.xxxl,
  },
  loadingText: {
    color: PRIVE_COLORS.text.secondary,
    marginTop: PRIVE_SPACING.md,
    fontSize: 13,
  },
  errorContainer: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.lg,
  },
  errorText: {
    color: PRIVE_COLORS.status.error,
    fontSize: 13,
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: PRIVE_SPACING.xxxl,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: PRIVE_COLORS.text.secondary,
  },
  emptySubtext: {
    fontSize: 13,
    color: PRIVE_COLORS.text.tertiary,
    marginTop: PRIVE_SPACING.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
    marginBottom: PRIVE_SPACING.lg,
  },
  activityCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: PRIVE_COLORS.background.card,
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.lg,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
    marginBottom: PRIVE_SPACING.md,
  },
  activityLeft: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: PRIVE_COLORS.text.primary,
  },
  activityDate: {
    fontSize: 12,
    color: PRIVE_COLORS.text.tertiary,
    marginTop: 4,
  },
  activityRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: PRIVE_SPACING.sm,
  },
  statusBadge: {
    paddingHorizontal: PRIVE_SPACING.md,
    paddingVertical: PRIVE_SPACING.xs,
    borderRadius: PRIVE_RADIUS.full,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  rewardText: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIVE_COLORS.status.success,
  },
  spentText: {
    color: PRIVE_COLORS.status.error,
  },
});

export default withErrorBoundary(ActivityHistoryScreen, 'PriveActivityHistory');
