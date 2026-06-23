// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * My Deals Page - Shows user's redeemed campaign deals
 * Route: /my-deals
 * Production ready - Full redemption tracking with premium UI
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Clipboard,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { CardGridSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { campaignsApi, DealRedemption, RedemptionSummary } from '@/services/campaignsApi';
import { useIsAuthenticated } from '@/stores/selectors';
import CoinIcon from '@/components/ui/CoinIcon';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');


const COLORS = {
  white: colors.background.primary,
  navy: colors.brand.navyDark,
  gray50: Colors.background.secondary,
  gray100: Colors.background.secondary,
  gray200: Colors.border.default,
  gray300: Colors.border.default,
  gray400: Colors.text.tertiary,
  gray600: Colors.text.tertiary,
  gray700: Colors.text.secondary,
  green50: Colors.successScale[50],
  green500: Colors.success,
  green600: Colors.success,
  emerald500: Colors.success,
  amber50: colors.tint.amber,
  amber500: Colors.warning,
  amber600: Colors.warning,
  blue50: colors.tint.blue,
  blue500: Colors.info,
  purple500: Colors.brand.purpleLight,
  pink500: colors.brand.pink,
  red50: Colors.errorScale[50],
  red500: Colors.error,
  cyan500: colors.brand.cyan,
};

const STATUS_CONFIG: Record<string, { color: string; bgColor: string; label: string; icon: string }> = {
  pending: {
    color: COLORS.amber500,
    bgColor: COLORS.amber50,
    label: 'Pending',
    icon: 'hourglass-outline',
  },
  active: {
    color: COLORS.green500,
    bgColor: COLORS.green50,
    label: 'Active',
    icon: 'checkmark-circle',
  },
  used: {
    color: COLORS.blue500,
    bgColor: COLORS.blue50,
    label: 'Used',
    icon: 'checkbox',
  },
  expired: {
    color: COLORS.gray400,
    bgColor: COLORS.gray100,
    label: 'Expired',
    icon: 'time-outline',
  },
  cancelled: {
    color: COLORS.red500,
    bgColor: COLORS.red50,
    label: 'Cancelled',
    icon: 'close-circle',
  },
};

type FilterStatus = 'all' | 'active' | 'used' | 'expired';

const MyDealsPage: React.FC = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();

  const [redemptions, setRedemptions] = useState<DealRedemption[]>([]);
  const [summary, setSummary] = useState<RedemptionSummary>({ active: 0, used: 0, expired: 0, cancelled: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<FilterStatus>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // AuthContext navigation guard handles unauthenticated redirect

  const fetchDeals = useCallback(async (reset = false) => {
    if (!isAuthenticated) return;

    try {
      if (reset) {
        setIsLoading(true);
        setPage(1);
      }

      const currentPage = reset ? 1 : page;
      const response = await campaignsApi.getMyDeals({
        status: selectedFilter === 'all' ? undefined : selectedFilter,
        page: currentPage,
        limit: 20,
      });

      if (response.success && response.data) {
        if (reset) {
          if (!isMounted()) return;
          setRedemptions(response.data.redemptions);
        } else {
          if (!isMounted()) return;
          setRedemptions(prev => [...prev, ...response.data!.redemptions]);
        }

        const redemptionList = reset ? response.data.redemptions : [...redemptions, ...response.data.redemptions];
        const calculatedSummary = redemptionList.reduce((acc, r) => {
          if (r.status === 'active') acc.active++;
          else if (r.status === 'used') acc.used++;
          else if (r.status === 'expired') acc.expired++;
          else if (r.status === 'cancelled') acc.cancelled++;
          return acc;
        }, { active: 0, used: 0, expired: 0, cancelled: 0 });
        if (!isMounted()) return;
        setSummary(calculatedSummary);

        const { page: currentPg, totalPages } = response.data.pagination;
        if (!isMounted()) return;
        setHasMore(currentPg < totalPages);
        setError(null);
      } else {
        if (!isMounted()) return;
        setError(response.message || 'Failed to load deals');
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Failed to load deals');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
      if (!isMounted()) return;
      setIsRefreshing(false);
    }
  }, [isAuthenticated, selectedFilter, page]);

  useEffect(() => {
    fetchDeals(true);
  }, [selectedFilter]);

  useEffect(() => {
    if (page > 1) {
      fetchDeals(false);
    }
  }, [page]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchDeals(true);
  };

  const handleFilterChange = (filter: FilterStatus) => {
    if (filter !== selectedFilter) {
      setSelectedFilter(filter);
    }
  };

  const handleDealPress = (redemption: DealRedemption) => {
    if (redemption.campaignId && redemption.dealIndex !== undefined) {
      router.push(`/deals/${redemption.campaignId}/${redemption.dealIndex}` as any);
    }
  };

  const handleCopyCode = (code: string) => {
    Clipboard.setString(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      setPage(prev => prev + 1);
    }
  }, [hasMore, isLoading]);

  const handleVisitStore = (storeId: string, redemptionCode: string, storeName: string) => {
    router.push({
      pathname: '/MainStorePage',
      params: {
        storeId,
        storeData: JSON.stringify({ id: storeId, name: storeName }),
        redemptionCode,
      }
    } as any);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();

    if (diff <= 0) return { text: 'Expired', urgent: true };

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 3) return { text: `${days} days left`, urgent: false };
    if (days > 0) return { text: `${days}d ${hours}h left`, urgent: true };
    if (hours > 0) return { text: `${hours}h left`, urgent: true };
    return { text: 'Expiring soon!', urgent: true };
  };

  const getDealValue = (dealSnapshot: DealRedemption['dealSnapshot']) => {
    if (!dealSnapshot) return null;
    if (dealSnapshot.cashback) return { type: 'Cashback', value: dealSnapshot.cashback, color: COLORS.green500 };
    if (dealSnapshot.coins) return { type: 'Coins', value: dealSnapshot.coins, color: COLORS.amber500 };
    if (dealSnapshot.bonus) return { type: 'Bonus', value: dealSnapshot.bonus, color: COLORS.purple500 };
    if (dealSnapshot.drop) return { type: 'Drop', value: dealSnapshot.drop, color: COLORS.cyan500 };
    if (dealSnapshot.discount) return { type: 'Discount', value: dealSnapshot.discount, color: COLORS.pink500 };
    return null;
  };

  const totalDeals = summary.active + summary.used + summary.expired + summary.cancelled;

  const renderDealCard = useCallback(({ item: redemption }: { item: DealRedemption }) => {
    const statusConfig = STATUS_CONFIG[redemption.status] || STATUS_CONFIG.active;
    const dealValue = getDealValue(redemption.dealSnapshot);
    const gradientColors = redemption.campaignSnapshot?.gradientColors?.length >= 2
      ? redemption.campaignSnapshot.gradientColors
      : [colors.brand.orange, '#FB923C'];
    const timeRemaining = redemption.status === 'active' ? getTimeRemaining(redemption.expiresAt) : null;
    const code = redemption.code || redemption.redemptionCode || '';
    const isCopied = copiedCode === code;

    return (
      <View key={redemption.id} style={styles.dealCard}>
        {/* Card Header with Gradient */}
        <LinearGradient
          colors={gradientColors as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.cardHeader}
        >
          <View style={styles.cardHeaderContent}>
            <View style={styles.campaignBadge}>
              <Text style={styles.campaignBadgeText}>
                {redemption.campaignSnapshot?.badge || 'DEAL'}
              </Text>
            </View>
            <Text style={styles.campaignTitle} numberOfLines={1}>
              {redemption.campaignSnapshot?.title || 'Deal'}
            </Text>
          </View>
          {redemption.dealSnapshot?.image && (
            <CachedImage
              source={redemption.dealSnapshot.image}
              style={styles.dealImage}
            />
          )}
        </LinearGradient>

        {/* Card Body */}
        <View style={styles.cardBody}>
          {/* Store & Status Row */}
          <View style={styles.storeStatusRow}>
            <View style={styles.storeInfo}>
              <Ionicons name="storefront" size={16} color={COLORS.navy} />
              <Text style={styles.storeName} numberOfLines={1}>
                {redemption.dealSnapshot?.store || 'Store'}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
              <Ionicons name={statusConfig.icon as any} size={12} color={statusConfig.color} />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
            </View>
          </View>

          {/* Deal Value */}
          {dealValue && (
            <View style={styles.dealValueRow}>
              <Text style={styles.dealValueLabel}>{dealValue.type}</Text>
              <View style={styles.dealValueContainer}>
                {dealValue.type === 'Coins' && <CoinIcon size={18} />}
                <Text style={[styles.dealValueText, { color: dealValue.color }]}>
                  {dealValue.value}
                </Text>
              </View>
            </View>
          )}

          {/* Redemption Code - Prominent Display */}
          <View style={styles.codeSection}>
            <Text style={styles.codeSectionLabel}>Redemption Code</Text>
            <Pressable
              style={styles.codeBox}
              onPress={() => handleCopyCode(code)}
             
            >
              <Text style={styles.codeText}>{code}</Text>
              <View style={styles.copyButton}>
                <Ionicons
                  name={isCopied ? 'checkmark' : 'copy-outline'}
                  size={16}
                  color={isCopied ? COLORS.green500 : COLORS.gray600}
                />
              </View>
            </Pressable>
            {isCopied && <Text style={styles.copiedText}>Copied!</Text>}
          </View>

          {/* Time Remaining for Active Deals */}
          {timeRemaining && (
            <View style={[styles.timeRow, timeRemaining.urgent && styles.timeRowUrgent]}>
              <Ionicons
                name="time-outline"
                size={14}
                color={timeRemaining.urgent ? COLORS.amber600 : COLORS.gray600}
              />
              <Text style={[styles.timeText, timeRemaining.urgent && styles.timeTextUrgent]}>
                {timeRemaining.text}
              </Text>
            </View>
          )}

          {/* Action Button for Active Deals */}
          {redemption.status === 'active' && redemption.dealSnapshot?.storeId && (
            <Pressable
              style={styles.visitStoreButton}
              onPress={() => handleVisitStore(
                redemption.dealSnapshot.storeId!,
                code,
                redemption.dealSnapshot.store || 'Store'
              )}
             
            >
              <Text style={styles.visitStoreText}>Visit Store</Text>
              <Ionicons name="arrow-forward" size={16} color={COLORS.white} />
            </Pressable>
          )}

          {/* Footer */}
          <View style={styles.cardFooter}>
            <Text style={styles.redeemedDate}>
              {redemption.status === 'used' ? 'Used' : 'Redeemed'} {formatDate(redemption.redeemedAt)}
            </Text>
            <Pressable onPress={() => handleDealPress(redemption)}>
              <Text style={styles.viewDetailsLink}>View Deal</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }, []);

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="gift-outline" size={56} color={COLORS.gray300} />
      </View>
      <Text style={styles.emptyTitle}>No Deals Yet</Text>
      <Text style={styles.emptySubtitle}>
        {selectedFilter === 'all'
          ? "You haven't redeemed any deals yet.\nExplore exciting offers and save!"
          : `No ${selectedFilter} deals found.`}
      </Text>
      <Pressable
        style={styles.exploreButton}
        onPress={() => router.push('/(tabs)' as any)}
      >
        <Ionicons name="flash" size={18} color={COLORS.white} />
        <Text style={styles.exploreButtonText}>Explore Deals</Text>
      </Pressable>
    </View>
  );

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.green500} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
          <Ionicons name="arrow-back" size={24} color={COLORS.navy} />
        </Pressable>
        <Text style={styles.headerTitle}>My Deals</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Summary Stats */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <LinearGradient colors={[COLORS.green500, COLORS.emerald500]} style={styles.summaryGradient}>
            <Ionicons name="checkmark-circle" size={22} color={COLORS.white} />
            <Text style={styles.summaryNumber}>{summary.active}</Text>
            <Text style={styles.summaryLabel}>Active</Text>
          </LinearGradient>
        </View>
        <View style={styles.summaryCard}>
          <LinearGradient colors={[COLORS.blue500, COLORS.purple500]} style={styles.summaryGradient}>
            <Ionicons name="checkbox" size={22} color={COLORS.white} />
            <Text style={styles.summaryNumber}>{summary.used}</Text>
            <Text style={styles.summaryLabel}>Used</Text>
          </LinearGradient>
        </View>
        <View style={styles.summaryCard}>
          <LinearGradient colors={[COLORS.amber500, COLORS.amber600]} style={styles.summaryGradient}>
            <Ionicons name="gift" size={22} color={COLORS.white} />
            <Text style={styles.summaryNumber}>{totalDeals}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </LinearGradient>
        </View>
      </View>

      {/* Filter Tabs - FIXED: Horizontal chips, not stretched */}
      <View style={styles.filterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        >
          {[
            { key: 'all' as FilterStatus, label: 'All', count: totalDeals },
            { key: 'active' as FilterStatus, label: 'Active', count: summary.active },
            { key: 'used' as FilterStatus, label: 'Used', count: summary.used },
            { key: 'expired' as FilterStatus, label: 'Expired', count: summary.expired },
          ].map(filter => (
            <Pressable
              key={filter.key}
              style={[
                styles.filterChip,
                selectedFilter === filter.key && styles.filterChipActive,
              ]}
              onPress={() => handleFilterChange(filter.key)}
             
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedFilter === filter.key && styles.filterChipTextActive,
                ]}
              >
                {filter.label}
              </Text>
              <View
                style={[
                  styles.filterBadge,
                  selectedFilter === filter.key && styles.filterBadgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterBadgeText,
                    selectedFilter === filter.key && styles.filterBadgeTextActive,
                  ]}
                >
                  {filter.count}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      {isLoading ? (
        <CardGridSkeleton />
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.red500} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={() => fetchDeals(true)}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      ) : redemptions.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlashList
          data={redemptions}
          renderItem={renderDealCard}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.green500} />
          }
          contentContainerStyle={[styles.dealsListContent, { paddingBottom: 120 }]}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            hasMore ? (
              <View style={{ padding: Spacing.base, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={COLORS.green500} />
              </View>
            ) : null
          }
          estimatedItemSize={120}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray50,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: Spacing.base,
    backgroundColor: COLORS.white,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: COLORS.navy,
  },
  headerRight: {
    width: 40,
  },

  // Summary Stats
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    gap: 10,
    backgroundColor: COLORS.white,
  },
  summaryCard: {
    flex: 1,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  summaryGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.white,
    marginTop: Spacing.xs,
  },
  summaryLabel: {
    ...Typography.caption,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },

  // Filter Section - FIXED
  filterSection: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  filtersContent: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    backgroundColor: COLORS.gray100,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: COLORS.navy,
  },
  filterChipText: {
    ...Typography.body,
    fontWeight: '500',
    color: COLORS.gray600,
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  filterBadge: {
    backgroundColor: COLORS.gray200,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  filterBadgeText: {
    ...Typography.caption,
    fontWeight: '600',
    color: COLORS.gray600,
  },
  filterBadgeTextActive: {
    color: COLORS.white,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: Spacing.md,
    ...Typography.body,
    color: COLORS.gray600,
  },

  // Error
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    marginTop: Spacing.md,
    ...Typography.body,
    color: COLORS.gray600,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: Spacing.base,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 10,
    backgroundColor: COLORS.green500,
    borderRadius: BorderRadius.xl,
  },
  retryButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: COLORS.white,
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    ...Typography.body,
    color: COLORS.gray600,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: COLORS.green500,
    borderRadius: BorderRadius['2xl'],
    gap: Spacing.sm,
  },
  exploreButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: COLORS.white,
  },

  // Deals List
  dealsList: {
    flex: 1,
  },
  dealsListContent: {
    padding: Spacing.base,
  },

  // Deal Card - Enhanced
  dealCard: {
    backgroundColor: COLORS.white,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.base,
  },
  cardHeaderContent: {
    flex: 1,
    marginRight: Spacing.md,
  },
  campaignBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  campaignBadgeText: {
    ...Typography.overline,
    fontWeight: '700',
    color: COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  campaignTitle: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: COLORS.white,
  },
  dealImage: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  cardBody: {
    padding: Spacing.base,
  },
  storeStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  storeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  storeName: {
    ...Typography.body,
    fontWeight: '600',
    color: COLORS.navy,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  statusText: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },

  dealValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  dealValueLabel: {
    ...Typography.bodySmall,
    color: COLORS.gray600,
  },
  dealValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dealValueText: {
    ...Typography.h4,
    fontWeight: '700',
  },

  // Code Section - Enhanced
  codeSection: {
    marginBottom: Spacing.md,
  },
  codeSectionLabel: {
    ...Typography.caption,
    fontWeight: '600',
    color: COLORS.gray400,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.gray50,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Spacing.md,
    borderStyle: 'dashed',
  },
  codeText: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: COLORS.navy,
    letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  copyButton: {
    padding: Spacing.xs,
  },
  copiedText: {
    ...Typography.caption,
    color: COLORS.green500,
    marginTop: Spacing.xs,
    textAlign: 'right',
  },

  // Time Remaining
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.gray50,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  timeRowUrgent: {
    backgroundColor: COLORS.amber50,
  },
  timeText: {
    ...Typography.bodySmall,
    fontWeight: '500',
    color: COLORS.gray600,
  },
  timeTextUrgent: {
    color: COLORS.amber600,
    fontWeight: '600',
  },

  // Visit Store Button
  visitStoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.green500,
    paddingVertical: Spacing.md,
    borderRadius: 10,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  visitStoreText: {
    ...Typography.body,
    fontWeight: '600',
    color: COLORS.white,
  },

  // Card Footer
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  redeemedDate: {
    ...Typography.bodySmall,
    color: COLORS.gray400,
  },
  viewDetailsLink: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: COLORS.blue500,
  },

  // Load More
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: Spacing.sm,
    backgroundColor: COLORS.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: COLORS.green500,
    gap: 6,
  },
  loadMoreText: {
    ...Typography.body,
    fontWeight: '600',
    color: COLORS.green500,
  },
});

export default withErrorBoundary(MyDealsPage, 'MyDeals');
