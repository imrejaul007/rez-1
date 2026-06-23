import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Prive Earnings Page
 * Shows earnings history and breakdown with real data
 *
 * Features:
 * - Time-range filter chips (7d / 30d / 90d / All)
 * - Source drill-down (collapsible bySource breakdown)
 * - Growth indicators (week-over-week comparison)
 * - Shimmer skeleton loading states
 * - Cursor-based pagination with Set-based dedup
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PRIVE_COLORS, PRIVE_SPACING, PRIVE_RADIUS } from '@/components/prive/priveTheme';
import { PriveSkeletonBlock } from '@/components/prive/PriveSkeletonBlock';
import priveApi, { EarningItem, EarningsSummary } from '@/services/priveApi';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

// --- Icon maps ---

const EARNING_ICONS: Record<string, string> = {
  campaign: '📢',
  purchase: '🛍️',
  referral: '👥',
  content: '✍️',
  check_in: '✅',
  review: '⭐',
  bonus: '🎁',
  cashback: '💰',
};

const SOURCE_ICONS: Record<string, string> = {
  videos: '🎬',
  projects: '📦',
  referrals: '👥',
  cashback: '💰',
  socialMedia: '📱',
  games: '🎮',
  dailyCheckIn: '📅',
  bonus: '🎁',
  programs: '📋',
  events: '🎫',
  socialImpact: '🌍',
  other: '💎',
};

const SOURCE_LABELS: Record<string, string> = {
  videos: 'Videos',
  projects: 'Projects',
  referrals: 'Referrals',
  cashback: 'Cashback',
  socialMedia: 'Social Media',
  games: 'Games',
  dailyCheckIn: 'Daily Check-In',
  bonus: 'Bonus',
  programs: 'Programs',
  events: 'Events',
  socialImpact: 'Social Impact',
  other: 'Other',
};

// --- Time range filter config ---

type TimeRangeOption = { label: string; value: number | undefined };

const TIME_RANGE_OPTIONS: TimeRangeOption[] = [
  { label: '7d', value: 7 },
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
  { label: 'All', value: undefined },
];

// --- Component ---

function EarningsScreen() {
  const router = useRouter();

  // Data state
  const [earnings, setEarnings] = useState<EarningItem[]>([]);
  const [summary, setSummary] = useState<EarningsSummary>({ thisWeek: 0, thisMonth: 0, allTime: 0 });
  const [bySource, setBySource] = useState<Record<string, number>>({});

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSourceBreakdown, setShowSourceBreakdown] = useState(false);

  // Pagination (cursor-based)
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());

  // Filter state
  const [selectedTimeRange, setSelectedTimeRange] = useState<number | undefined>(undefined);
  const isMounted = useIsMounted();

  // --- Data fetching ---

  const fetchEarnings = useCallback(async (opts: {
    nextCursor?: string;
    refresh?: boolean;
    timeRange?: number;
  } = {}) => {
    const { nextCursor, refresh = false, timeRange } = opts;
    const isInitial = !nextCursor;

    try {
      if (refresh) {
        setIsRefreshing(true);
      } else if (isInitial) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);

      const response = await priveApi.getEarnings({
        limit: 20,
        cursor: nextCursor,
        timeRange,
      });

      if (response.success && response.data) {
        const {
          earnings: newEarnings,
          summary: newSummary,
          bySource: newBySource,
          pagination,
        } = response.data;

        if (isInitial) {
          // Fresh load — reset seen set
          const ids = new Set(newEarnings.map(e => e.id));
          setSeenIds(ids);
          setEarnings(newEarnings);
        } else {
          // Append with dedup
          setSeenIds(prev => {
            const next = new Set(prev);
            newEarnings.forEach(e => next.add(e.id));
            return next;
          });
          setEarnings(prev => {
            const existingIds = new Set(prev.map(e => e.id));
            const deduped = newEarnings.filter(e => !existingIds.has(e.id));
            return [...prev, ...deduped];
          });
        }

        setSummary(newSummary);
        if (newBySource) setBySource(newBySource);
        setHasMore(pagination.hasMore ?? pagination.page < pagination.pages);
        setCursor(pagination.nextCursor);
      } else {
        setError('Failed to load earnings');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load earnings');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchEarnings({ timeRange: selectedTimeRange });
  }, [fetchEarnings, selectedTimeRange]);

  // --- Handlers ---

  const handleRefresh = () => {
    fetchEarnings({ refresh: true, timeRange: selectedTimeRange });
  };

  const handleLoadMore = () => {
    if (!isLoading && !isLoadingMore && hasMore && cursor) {
      fetchEarnings({ nextCursor: cursor, timeRange: selectedTimeRange });
    }
  };

  const handleTimeRangeChange = (value: number | undefined) => {
    if (value === selectedTimeRange) return;
    setSelectedTimeRange(value);
    // Reset pagination state — useEffect will re-fetch
    setCursor(undefined);
    setHasMore(true);
    setSeenIds(new Set());
    setEarnings([]);
  };

  // --- Helpers ---

  const formatAmount = (amount: number): string => {
    return amount > 0 ? `+${amount.toLocaleString()}` : amount.toLocaleString();
  };

  const getEarningIcon = (type: string): string => {
    return EARNING_ICONS[type] || '💎';
  };

  const getRelativeDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Growth indicator: compare thisWeek vs derived "last week" (thisMonth - thisWeek)
  const lastWeekProxy = Math.max(summary.thisMonth - summary.thisWeek, 0);
  const growthDiff = lastWeekProxy > 0
    ? ((summary.thisWeek - lastWeekProxy) / lastWeekProxy) * 100
    : summary.thisWeek > 0 ? 100 : 0;
  const isGrowthPositive = summary.thisWeek >= lastWeekProxy;

  // --- Render helpers ---

  const renderSkeleton = () => (
    <View style={styles.content}>
      {/* Summary skeleton */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <PriveSkeletonBlock width={60} height={12} style={{ marginBottom: PRIVE_SPACING.sm }} />
          <PriveSkeletonBlock width={80} height={28} />
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <PriveSkeletonBlock width={70} height={12} style={{ marginBottom: PRIVE_SPACING.sm }} />
          <PriveSkeletonBlock width={80} height={28} />
        </View>
      </View>

      {/* All-time skeleton */}
      <View style={styles.allTimeCard}>
        <PriveSkeletonBlock width={100} height={12} style={{ marginBottom: PRIVE_SPACING.xs }} />
        <PriveSkeletonBlock width={140} height={18} />
      </View>

      {/* Source breakdown skeleton */}
      <View style={[styles.listCard, styles.skeletonSourceCard]}>
        <PriveSkeletonBlock width={140} height={14} style={{ marginBottom: PRIVE_SPACING.lg }} />
        {[1, 2, 3, 4].map(i => (
          <View key={i} style={styles.skeletonSourceRow}>
            <PriveSkeletonBlock width={36} height={36} borderRadius={18} style={{ marginRight: PRIVE_SPACING.md }} />
            <PriveSkeletonBlock width={100} height={14} style={{ flex: 1 }} />
            <PriveSkeletonBlock width={50} height={14} />
          </View>
        ))}
      </View>

      {/* Earnings list skeleton */}
      <View style={styles.listCard}>
        <PriveSkeletonBlock width={120} height={14} style={{ marginBottom: PRIVE_SPACING.lg }} />
        {[1, 2, 3, 4, 5].map(i => (
          <View key={i} style={styles.skeletonEarningRow}>
            <PriveSkeletonBlock width={40} height={40} borderRadius={20} style={{ marginRight: PRIVE_SPACING.md }} />
            <View style={styles.skeletonFlex1}>
              <PriveSkeletonBlock width={160} height={14} style={{ marginBottom: PRIVE_SPACING.xs }} />
              <PriveSkeletonBlock width={80} height={12} />
            </View>
            <PriveSkeletonBlock width={50} height={16} />
          </View>
        ))}
      </View>
    </View>
  );

  const renderTimeRangeFilters = () => (
    <View style={styles.filterRow}>
      {TIME_RANGE_OPTIONS.map(opt => {
        const isActive = opt.value === selectedTimeRange;
        return (
          <Pressable
            key={opt.label}
            style={[styles.filterChip, isActive && styles.filterChipActive]}
            onPress={() => handleTimeRangeChange(opt.value)}
          >
            <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const renderSourceBreakdown = () => {
    const sourceEntries = Object.entries(bySource).filter(([, val]) => val > 0);
    if (sourceEntries.length === 0) return null;

    return (
      <View style={styles.sourceCard}>
        <Pressable
          style={styles.sourceHeader}
          onPress={() => setShowSourceBreakdown(prev => !prev)}
         
        >
          <Text style={styles.sectionTitle}>Earnings by Source</Text>
          <Ionicons
            name={showSourceBreakdown ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={PRIVE_COLORS.text.secondary}
          />
        </Pressable>

        {showSourceBreakdown && (
          <View style={styles.sourceList}>
            {sourceEntries
              .sort(([, a], [, b]) => b - a)
              .map(([source, amount]) => (
                <View key={source} style={styles.sourceRow}>
                  <View style={styles.sourceIconContainer}>
                    <Text style={styles.sourceEmoji}>{SOURCE_ICONS[source] || '💎'}</Text>
                  </View>
                  <Text style={styles.sourceName}>
                    {SOURCE_LABELS[source] || source.charAt(0).toUpperCase() + source.slice(1)}
                  </Text>
                  <Text style={styles.sourceAmount}>{formatAmount(amount)}</Text>
                </View>
              ))}
          </View>
        )}
      </View>
    );
  };

  const renderGrowthIndicator = () => {
    if (summary.thisWeek === 0 && lastWeekProxy === 0) return null;

    const absPercent = Math.abs(growthDiff);
    const displayPercent = absPercent > 999 ? '999+' : absPercent.toFixed(0);

    return (
      <View style={styles.growthContainer}>
        <Ionicons
          name={isGrowthPositive ? 'arrow-up' : 'arrow-down'}
          size={14}
          color={isGrowthPositive ? PRIVE_COLORS.status.success : PRIVE_COLORS.status.error}
        />
        <Text style={[
          styles.growthText,
          { color: isGrowthPositive ? PRIVE_COLORS.status.success : PRIVE_COLORS.status.error },
        ]}>
          {displayPercent}%
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.neutral[800], colors.neutral[900], colors.midGrayAlt]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={PRIVE_COLORS.text.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Earnings</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Time-range filter chips */}
        {renderTimeRangeFilters()}

        {isLoading && !isRefreshing ? (
          renderSkeleton()
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              style={styles.retryButton}
              onPress={() => fetchEarnings({ timeRange: selectedTimeRange })}
            >
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContentPadding}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={PRIVE_COLORS.gold.primary}
              />
            }
            onScroll={({ nativeEvent }) => {
              const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
              const isNearEnd = layoutMeasurement.height + contentOffset.y >= contentSize.height - 100;
              if (isNearEnd && hasMore && !isLoading && !isLoadingMore) {
                handleLoadMore();
              }
            }}
            scrollEventThrottle={400}
          >
            {/* Summary Card */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryItem}>
                <View style={styles.summaryLabelRow}>
                  <Text style={styles.summaryLabel}>This Week</Text>
                  {renderGrowthIndicator()}
                </View>
                <Text style={styles.summaryValue}>{formatAmount(summary.thisWeek)}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>This Month</Text>
                <Text style={styles.summaryValue}>{formatAmount(summary.thisMonth)}</Text>
              </View>
            </View>

            {/* All-time earnings */}
            <View style={styles.allTimeCard}>
              <Text style={styles.allTimeLabel}>All-Time Earnings</Text>
              <Text style={styles.allTimeValue}>{summary.allTime.toLocaleString()} coins</Text>
            </View>

            {/* Source Breakdown (collapsible) */}
            {renderSourceBreakdown()}

            {/* Earnings List */}
            <View style={styles.listCard}>
              <Text style={styles.sectionTitle}>Recent Earnings</Text>
              {earnings.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>📊</Text>
                  <Text style={styles.emptyText}>No earnings yet</Text>
                  <Text style={styles.emptySubtext}>
                    Start earning coins through purchases, referrals, and campaigns!
                  </Text>
                </View>
              ) : (
                earnings.map((item, index) => (
                  <View
                    key={item.id}
                    style={[
                      styles.earningRow,
                      index === earnings.length - 1 && styles.earningRowLast,
                    ]}
                  >
                    <View style={styles.earningIcon}>
                      <Text style={styles.earningEmoji}>{getEarningIcon(item.type)}</Text>
                    </View>
                    <View style={styles.earningInfo}>
                      <Text style={styles.earningTitle}>{item.description}</Text>
                      <Text style={styles.earningDate}>{getRelativeDate(item.createdAt)}</Text>
                    </View>
                    <Text style={styles.earningAmount}>{formatAmount(item.amount)}</Text>
                  </View>
                ))
              )}

              {hasMore && earnings.length > 0 && (
                <Pressable style={styles.loadMoreButton} onPress={handleLoadMore}>
                  {isLoadingMore ? (
                    <PriveSkeletonBlock width={80} height={14} />
                  ) : (
                    <Text style={styles.loadMoreText}>Load More</Text>
                  )}
                </Pressable>
              )}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

// --- Styles ---

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: PRIVE_SPACING.xl,
    paddingVertical: PRIVE_SPACING.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
  },
  headerSpacer: {
    width: 40,
  },

  // Time-range filter chips
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: PRIVE_SPACING.xl,
    marginBottom: PRIVE_SPACING.lg,
    gap: PRIVE_SPACING.sm,
  },
  filterChip: {
    paddingHorizontal: PRIVE_SPACING.lg,
    paddingVertical: PRIVE_SPACING.sm,
    borderRadius: PRIVE_RADIUS.full,
    backgroundColor: PRIVE_COLORS.transparent.white10,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
  },
  filterChipActive: {
    backgroundColor: PRIVE_COLORS.gold.primary,
    borderColor: PRIVE_COLORS.gold.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: PRIVE_COLORS.text.secondary,
  },
  filterChipTextActive: {
    color: PRIVE_COLORS.text.inverse,
    fontWeight: '600',
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: PRIVE_SPACING.xl,
  },

  // Loading / Error
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: PRIVE_SPACING.xl,
  },
  errorText: {
    fontSize: 14,
    color: PRIVE_COLORS.status.error,
    textAlign: 'center',
    marginBottom: PRIVE_SPACING.lg,
  },
  retryButton: {
    paddingHorizontal: PRIVE_SPACING.xl,
    paddingVertical: PRIVE_SPACING.md,
    backgroundColor: PRIVE_COLORS.gold.primary,
    borderRadius: PRIVE_RADIUS.lg,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIVE_COLORS.background.primary,
  },

  // Summary card
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: PRIVE_COLORS.background.card,
    borderRadius: PRIVE_RADIUS.xl,
    padding: PRIVE_SPACING.xl,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.goldMuted,
    marginBottom: PRIVE_SPACING.lg,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: PRIVE_SPACING.sm,
    gap: PRIVE_SPACING.xs,
  },
  summaryLabel: {
    fontSize: 12,
    color: PRIVE_COLORS.text.tertiary,
    marginBottom: PRIVE_SPACING.sm,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '300',
    color: PRIVE_COLORS.gold.primary,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: PRIVE_COLORS.transparent.white10,
  },

  // Growth indicator
  growthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  growthText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // All-time card
  allTimeCard: {
    backgroundColor: PRIVE_COLORS.transparent.gold10,
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.lg,
    alignItems: 'center',
    marginBottom: PRIVE_SPACING.xl,
  },
  allTimeLabel: {
    fontSize: 12,
    color: PRIVE_COLORS.text.tertiary,
    marginBottom: PRIVE_SPACING.xs,
  },
  allTimeValue: {
    fontSize: 18,
    fontWeight: '600',
    color: PRIVE_COLORS.gold.primary,
  },

  // Source breakdown card
  sourceCard: {
    backgroundColor: PRIVE_COLORS.background.card,
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.xl,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
    marginBottom: PRIVE_SPACING.lg,
  },
  sourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sourceList: {
    marginTop: PRIVE_SPACING.lg,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: PRIVE_SPACING.sm,
  },
  sourceIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PRIVE_COLORS.transparent.white10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: PRIVE_SPACING.md,
  },
  sourceEmoji: {
    fontSize: 16,
  },
  sourceName: {
    flex: 1,
    fontSize: 14,
    color: PRIVE_COLORS.text.primary,
  },
  sourceAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIVE_COLORS.gold.primary,
  },

  // Earnings list card
  listCard: {
    backgroundColor: PRIVE_COLORS.background.card,
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.xl,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
    marginBottom: PRIVE_SPACING.xxl,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
    marginBottom: PRIVE_SPACING.lg,
  },
  earningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: PRIVE_SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: PRIVE_COLORS.transparent.white08,
  },
  earningRowLast: {
    borderBottomWidth: 0,
  },
  earningIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PRIVE_COLORS.transparent.white10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: PRIVE_SPACING.md,
  },
  earningEmoji: {
    fontSize: 18,
  },
  earningInfo: {
    flex: 1,
  },
  earningTitle: {
    fontSize: 14,
    color: PRIVE_COLORS.text.primary,
  },
  earningDate: {
    fontSize: 12,
    color: PRIVE_COLORS.text.tertiary,
  },
  earningAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: PRIVE_COLORS.status.success,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: PRIVE_SPACING.xxl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: PRIVE_SPACING.md,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
    marginBottom: PRIVE_SPACING.sm,
  },
  emptySubtext: {
    fontSize: 13,
    color: PRIVE_COLORS.text.tertiary,
    textAlign: 'center',
    paddingHorizontal: PRIVE_SPACING.lg,
  },

  // Load more
  loadMoreButton: {
    alignItems: 'center',
    paddingVertical: PRIVE_SPACING.lg,
    marginTop: PRIVE_SPACING.md,
  },
  loadMoreText: {
    fontSize: 14,
    color: PRIVE_COLORS.gold.primary,
    fontWeight: '500',
  },

  // Extracted inline styles
  scrollContentPadding: { paddingBottom: 120 },
  skeletonSourceCard: { marginBottom: PRIVE_SPACING.lg },
  skeletonSourceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: PRIVE_SPACING.md },
  skeletonEarningRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: PRIVE_SPACING.md },
  skeletonFlex1: { flex: 1 },
});

export default withErrorBoundary(EarningsScreen, 'PriveEarnings');
