// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import bonusZoneApi, { BonusClaim } from '@/services/bonusZoneApi';
import { TransactionListSkeleton } from '@/components/skeletons';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

// ============================================
// STATUS HELPERS
// ============================================

const STATUS_CONFIG: Record<BonusClaim['status'], { label: string; color: string; bg: string; icon: string }> = {
  pending: { label: 'Pending', color: colors.brand.amberDark, bg: colors.tint.amberLight, icon: 'time-outline' },
  verified: { label: 'Verified', color: '#065F46', bg: colors.tint.green, icon: 'checkmark-circle-outline' },
  credited: { label: 'Credited', color: '#065F46', bg: colors.tint.green, icon: 'checkmark-done-outline' },
  rejected: { label: 'Rejected', color: '#991B1B', bg: colors.errorScale[100], icon: 'close-circle-outline' },
  expired: { label: 'Expired', color: colors.neutral[600], bg: colors.neutral[100], icon: 'hourglass-outline' },
};

const FILTER_TABS: Array<{ key: string; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'credited', label: 'Credited' },
  { key: 'pending', label: 'Pending' },
  { key: 'rejected', label: 'Rejected' },
];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ============================================
// CLAIM ROW COMPONENT
// ============================================

function ClaimRow({ claim, onPress }: { claim: BonusClaim; onPress: () => void }) {
  const statusInfo = STATUS_CONFIG[claim.status] || STATUS_CONFIG.pending;

  // campaignId may be populated with campaign object or just a string ID
  const campaignTitle =
    typeof claim.campaignId === 'object' && claim.campaignId?.title
      ? claim.campaignId.title
      : 'Bonus Campaign';

  const campaignSlug =
    typeof claim.campaignId === 'object' && claim.campaignId?.slug
      ? claim.campaignId.slug
      : null;

  return (
    <Pressable
      style={styles.claimCard}
      onPress={onPress}
     
    >
      <View style={styles.claimTop}>
        <View style={styles.claimInfo}>
          <Text style={styles.claimTitle} numberOfLines={1}>
            {campaignTitle}
          </Text>
          <Text style={styles.claimDate}>{formatDate(claim.createdAt)}</Text>
          {/* Rejection Reason */}
          {claim.status === 'rejected' && claim.rejectionReason && (
            <View style={styles.rejectionRow}>
              <Ionicons name="information-circle" size={13} color="#991B1B" />
              <Text style={styles.rejectionText} numberOfLines={2}>
                {claim.rejectionReason}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.claimRight}>
          <Text style={[
            styles.rewardAmount,
            claim.status === 'rejected' && styles.rewardAmountRejected,
          ]}>
            {claim.status === 'rejected' ? '' : '+'}{claim.rewardAmount} {claim.rewardType === 'branded' ? 'branded' : 'coins'}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
            <Ionicons
              name={statusInfo.icon as any}
              size={12}
              color={statusInfo.color}
            />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>
      </View>
      {/* Navigate hint */}
      {campaignSlug && (
        <View style={styles.navigateHint}>
          <Text style={styles.navigateHintText}>View campaign</Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.text.tertiary} />
        </View>
      )}
    </Pressable>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

function BonusZoneHistoryPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const [claims, setClaims] = useState<BonusClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  const PAGE_LIMIT = 20;

  const fetchHistory = useCallback(async (pageNum: number = 1, append: boolean = false, statusFilter?: string) => {
    try {
      setError(null);
      if (append) {
        setLoadingMore(true);
      }
      const params: any = { page: pageNum, limit: PAGE_LIMIT };
      const filterToUse = statusFilter !== undefined ? statusFilter : activeFilter;
      if (filterToUse && filterToUse !== 'all') {
        params.status = filterToUse;
      }
      const response = await bonusZoneApi.getMyClaimHistory(params);
      if (response.success && response.data?.claims) {
        if (append) {
          setClaims((prev) => [...prev, ...response.data!.claims]);
        } else {
          setClaims(response.data.claims);
        }
        setPage(pageNum);
        const pagination = response.data.pagination;
        setHasMore(pagination ? pagination.page < pagination.pages : false);
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Failed to load claim history');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
      if (!isMounted()) return;
      setLoadingMore(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    fetchHistory(1);
  }, [fetchHistory]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    fetchHistory(1);
  }, [fetchHistory]);

  const onLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchHistory(page + 1, true);
    }
  }, [loadingMore, hasMore, page, fetchHistory]);

  const onFilterChange = useCallback((filter: string) => {
    setActiveFilter(filter);
    setLoading(true);
    setClaims([]);
    setPage(1);
    fetchHistory(1, false, filter);
  }, [fetchHistory]);

  const handleClaimPress = useCallback((claim: BonusClaim) => {
    const slug = typeof claim.campaignId === 'object' && claim.campaignId?.slug
      ? claim.campaignId.slug
      : null;
    if (slug) {
      router.push({ pathname: '/bonus-zone/[slug]', params: { slug } } as any);
    }
  }, [router]);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Claim History',
          headerStyle: { backgroundColor: Colors.background.primary },
          headerTintColor: Colors.nileBlue,
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.orange} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="receipt-outline" size={28} color={colors.brand.orange} />
          <Text style={styles.headerTitle}>Claim History</Text>
          <Text style={styles.headerSubtitle}>
            Track the status of your bonus zone claims
          </Text>
        </View>

        {/* Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          {FILTER_TABS.map((tab) => (
            <Pressable
              key={tab.key}
              style={[
                styles.filterTab,
                activeFilter === tab.key && styles.filterTabActive,
              ]}
              onPress={() => onFilterChange(tab.key)}
            >
              <Text style={[
                styles.filterTabText,
                activeFilter === tab.key && styles.filterTabTextActive,
              ]}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Loading State */}
        {loading ? (
          <TransactionListSkeleton />
        ) : error ? (
          /* Error State */
          <View style={styles.emptyContainer}>
            <Ionicons name="warning-outline" size={48} color={Colors.error} />
            <Text style={styles.emptyTitle}>Something went wrong</Text>
            <Text style={styles.emptySubtitle}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={() => fetchHistory(1)}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : claims.length === 0 ? (
          /* Empty State */
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={48} color={Colors.border.default} />
            <Text style={styles.emptyTitle}>
              {activeFilter !== 'all' ? `No ${activeFilter} claims` : 'No claims yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeFilter !== 'all'
                ? `You don't have any ${activeFilter} claims. Try a different filter.`
                : 'Your bonus zone claim history will appear here once you claim rewards.'}
            </Text>
          </View>
        ) : (
          /* Claims List */
          <View style={styles.listSection}>
            {claims.map((claim) => (
              <ClaimRow
                key={claim.id}
                claim={claim}
                onPress={() => handleClaimPress(claim)}
              />
            ))}

            {/* Load More */}
            {hasMore && (
              <Pressable
                style={styles.loadMoreButton}
                onPress={onLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <ActivityIndicator size="small" color={colors.brand.orange} />
                ) : (
                  <Text style={styles.loadMoreText}>Load More</Text>
                )}
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>
    </>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  contentContainer: {
    paddingBottom: 120,
  },
  header: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.lg,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.secondary,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginTop: Spacing.sm,
  },
  headerSubtitle: {
    ...Typography.bodySmall,
    fontSize: 13,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },

  // ---- Filter Tabs ----
  filterContainer: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  filterTab: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.primary,
    borderWidth: 1,
    borderColor: Colors.border.default,
    marginRight: Spacing.sm,
  },
  filterTabActive: {
    backgroundColor: colors.tint.orange,
    borderColor: colors.brand.orange,
  },
  filterTabText: {
    ...Typography.bodySmall,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  filterTabTextActive: {
    color: colors.brand.orange,
  },

  // ---- Loading / Empty / Error ----
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginTop: Spacing.md,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  emptyTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginTop: Spacing.base,
  },
  emptySubtitle: {
    ...Typography.bodySmall,
    fontSize: 13,
    color: Colors.text.tertiary,
    marginTop: 6,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: Spacing.base,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    backgroundColor: colors.brand.orange,
    borderRadius: BorderRadius.sm,
  },
  retryButtonText: {
    color: Colors.text.inverse,
    fontWeight: '600',
    ...Typography.body,
  },

  // ---- Claims List ----
  listSection: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.xs,
    gap: 10,
  },
  claimCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  claimTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  claimInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  claimTitle: {
    ...Typography.body,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.nileBlue,
  },
  claimDate: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
  },
  claimRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  rewardAmount: {
    ...Typography.body,
    fontSize: 15,
    fontWeight: '700',
    color: colors.brand.orange,
  },
  rewardAmountRejected: {
    color: Colors.text.tertiary,
    textDecorationLine: 'line-through',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  statusText: {
    ...Typography.caption,
    fontWeight: '600',
  },

  // ---- Rejection Reason ----
  rejectionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    marginTop: 6,
    backgroundColor: Colors.errorScale[50],
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  rejectionText: {
    flex: 1,
    ...Typography.caption,
    color: '#991B1B',
    lineHeight: 15,
  },

  // ---- Navigate Hint ----
  navigateHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.background.secondary,
    gap: Spacing.xs,
  },
  navigateHintText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },

  // ---- Load More ----
  loadMoreButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: Spacing.xs,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  loadMoreText: {
    ...Typography.body,
    fontWeight: '600',
    color: colors.brand.orange,
  },
});

export default withErrorBoundary(BonusZoneHistoryPage, 'BonusZoneHistory');
