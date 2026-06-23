// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// AI Recommended Offers Page
// Personalized AI-curated offers

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { useAuthLoading, useGetCurrencySymbol, useIsAuthenticated } from '@/stores/selectors';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { CardGridSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import apiClient from '@/services/apiClient';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface BackendOffer {
  _id: string;
  title: string;
  store: { name: string; logo?: string };
  discount: { type: string; value: number; maxDiscount?: number };
  engagement: { viewsCount: number };
  validity: { endDate: string };
  category: string;
  description: string;
}

interface MappedOffer {
  id: string;
  title: string;
  storeName: string;
  storeLogo: string | null;
  discountLabel: string;
  discountValue: number;
  reason: string;
  category: string;
  expiresIn: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  Food: 'restaurant-outline',
  Electronics: 'phone-portrait-outline',
  Books: 'book-outline',
  Fashion: 'shirt-outline',
  Beauty: 'sparkles-outline',
  Health: 'fitness-outline',
  Travel: 'airplane-outline',
  Entertainment: 'film-outline',
};

const PAGE_LIMIT = 10;

function computeExpiresIn(endDate: string): string {
  const now = new Date();
  const end = new Date(endDate);
  const diffMs = end.getTime() - now.getTime();
  if (diffMs <= 0) return 'Expired';
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    return diffHours <= 1 ? 'Less than 1 hour' : `${diffHours} hours`;
  }
  if (diffDays === 1) return '1 day';
  if (diffDays < 7) return `${diffDays} days`;
  const weeks = Math.floor(diffDays / 7);
  return weeks === 1 ? '1 week' : `${weeks} weeks`;
}

function formatDiscount(discount: { type: string; value: number; maxDiscount?: number }): string {
  if (discount.type === 'percentage') return `${discount.value}%`;
  if (discount.type === 'flat' || discount.type === 'fixed') return `${discount.value}`;
  if (discount.type === 'bogo') return 'BOGO';
  if (discount.type === 'freeDelivery' || discount.type === 'free_delivery') return 'Free Delivery';
  return `${discount.value}`;
}

function mapOffer(offer: BackendOffer): MappedOffer {
  return {
    id: offer._id,
    title: offer.title,
    storeName: offer.store?.name || 'Unknown Store',
    storeLogo: offer.store?.logo || null,
    discountLabel: formatDiscount(offer.discount),
    discountValue: offer.discount?.value || 0,
    reason: offer.description || 'Recommended for you',
    category: offer.category || 'General',
    expiresIn: offer.validity?.endDate ? computeExpiresIn(offer.validity.endDate) : 'N/A',
  };
}

function AIRecommendedPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offers, setOffers] = useState<MappedOffer[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchOffers = useCallback(async (pageNum: number, append = false) => {
    try {
      setError(null);
      const response = await apiClient.get<{
        data: BackendOffer[];
        currentPage: number;
        totalPages: number;
        totalItems: number;
        hasNextPage: boolean;
      }>('/offers/recommendations', { page: pageNum, limit: PAGE_LIMIT });

      if (response.success && response.data) {
        const rawOffers = Array.isArray(response.data) ? response.data : (response.data as any).data || [];
        const mapped = rawOffers.map(mapOffer);
        if (!isMounted()) return;
        setOffers(prev => append ? [...prev, ...mapped] : mapped);

        // Handle pagination metadata
        if (Array.isArray(response.data)) {
          if (!isMounted()) return;
          setHasMore(rawOffers.length >= PAGE_LIMIT);
        } else {
          if (!isMounted()) return;
          setHasMore((response.data as any).hasNextPage ?? rawOffers.length >= PAGE_LIMIT);
        }
      } else {
        if (!isMounted()) return;
        if (!append) setOffers([]);
        if (!isMounted()) return;
        setError('Failed to load recommendations');
      }
    } catch (err: any) {
      if (!isMounted()) return;
      if (!append) setOffers([]);
      if (!isMounted()) return;
      setError(err?.message || 'Something went wrong');
    }
  }, []);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    setLoading(true);
    setPage(1);
    fetchOffers(1).finally(() => setLoading(false));
  }, [authLoading, isAuthenticated, fetchOffers]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    await fetchOffers(1);
    if (!isMounted()) return;
    setRefreshing(false);
  }, [fetchOffers]);

  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    fetchOffers(nextPage, true).finally(() => setLoadingMore(false));
  }, [loadingMore, hasMore, page, fetchOffers]);

  const getDiscountColor = (value: number) => {
    if (value >= 30) return Colors.success;
    if (value >= 15) return Colors.primary[600];
    return Colors.gold;
  };

  const computeStats = useMemo(() => {
    if (offers.length === 0) return { count: 0, avgDiscount: 0, totalSavings: 0 };
    const discounts = offers.map(o => o.discountValue);
    const avg = Math.round(discounts.reduce((a, b) => a + b, 0) / discounts.length);
    const totalSavings = discounts.reduce((a, b) => a + b, 0);
    return { count: offers.length, avgDiscount: avg, totalSavings };
  }, [offers]);

  const formatSavings = (value: number): string => {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return String(value);
  };

  const renderOffer = useCallback(({ item }: { item: MappedOffer }) => {
    const iconName = CATEGORY_ICONS[item.category] || 'pricetag-outline';
    const discountColor = getDiscountColor(item.discountValue);

    return (
      <Pressable
        style={styles.offerCard}
        onPress={() => router.push(`/offers/${item.id}` as any)}
      >
        <View style={styles.offerHeader}>
          {item.storeLogo ? (
            <CachedImage source={{ uri: item.storeLogo }} style={styles.offerImage as any} />
          ) : (
            <View style={styles.offerImage}>
              <Ionicons name={iconName as any} size={24} color={Colors.primary[600]} />
            </View>
          )}
          <View style={[styles.matchBadge, { backgroundColor: discountColor + '20' }]}>
            <Ionicons name="sparkles" size={12} color={discountColor} />
            <ThemedText style={[styles.matchScore, { color: discountColor }]}>
              {item.discountLabel} OFF
            </ThemedText>
          </View>
        </View>

        <ThemedText style={styles.offerTitle} numberOfLines={2}>{item.title}</ThemedText>
        <ThemedText style={styles.offerStore} numberOfLines={1}>{item.storeName}</ThemedText>

        <View style={styles.reasonContainer}>
          <Ionicons name="bulb-outline" size={14} color={Colors.info} />
          <ThemedText style={styles.reasonText} numberOfLines={2}>{item.reason}</ThemedText>
        </View>

        <View style={styles.offerFooter}>
          <View style={styles.discountBadge}>
            <ThemedText style={styles.discountText}>{item.discountLabel} OFF</ThemedText>
          </View>
          <View style={styles.expiryContainer}>
            <Ionicons name="time-outline" size={14} color={Colors.text.tertiary} />
            <ThemedText style={styles.expiryText}>{item.expiresIn}</ThemedText>
          </View>
        </View>
      </Pressable>
    );
  }, [router]);

  const headerComponent = () => (
    <LinearGradient
      colors={[Colors.primary[600], Colors.secondary[700]]}
      style={styles.header}
    >
      <View style={styles.headerContent}>
        <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
          <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>For You</ThemedText>
        <View style={styles.placeholder} />
      </View>
    </LinearGradient>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary[600]} />
        {headerComponent()}
        <CardGridSkeleton />
      </View>
    );
  }

  if (error && offers.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary[600]} />
        {headerComponent()}
        <View style={styles.errorContainer}>
          <View style={styles.errorIconWrap}>
            <Ionicons name="alert-circle-outline" size={48} color={Colors.text.tertiary} />
          </View>
          <ThemedText style={styles.errorTitle}>Could not load offers</ThemedText>
          <ThemedText style={styles.errorSubtitle}>{error}</ThemedText>
          <Pressable style={styles.retryButton} onPress={() => { setLoading(true); setPage(1); fetchOffers(1).finally(() => setLoading(false)); }}>
            <ThemedText style={styles.retryText}>Retry</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  const stats = computeStats;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary[600]} />

      {/* Header */}
      <LinearGradient
        colors={[Colors.primary[600], Colors.secondary[700]]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>For You</ThemedText>
          <View style={styles.placeholder} />
        </View>

        {/* AI Badge */}
        <View style={styles.aiBadge}>
          <Ionicons name="sparkles" size={20} color={Colors.gold} />
          <ThemedText style={styles.aiBadgeText}>
            Personalized offers based on your preferences
          </ThemedText>
        </View>
      </LinearGradient>

      <FlashList
        data={offers}
        renderItem={renderOffer}
        keyExtractor={(item) => item.id}
          estimatedItemSize={220}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        numColumns={2}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListHeaderComponent={
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <ThemedText style={styles.statValue}>{stats.count}</ThemedText>
              <ThemedText style={styles.statLabel}>Offers</ThemedText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <ThemedText style={styles.statValue}>{stats.avgDiscount}%</ThemedText>
              <ThemedText style={styles.statLabel}>Avg Discount</ThemedText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <ThemedText style={styles.statValue}>{currencySymbol}{formatSavings(stats.totalSavings)}</ThemedText>
              <ThemedText style={styles.statLabel}>Potential Savings</ThemedText>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="sparkles-outline" size={36} color={Colors.text.tertiary} />
            </View>
            <ThemedText style={styles.emptyTitle}>No recommendations yet</ThemedText>
            <ThemedText style={styles.emptySubtitle}>Check back later for personalized offers</ThemedText>
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={Colors.primary[600]} />
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 40,
    paddingBottom: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  backButton: {
    padding: Spacing.sm,
    marginRight: Spacing.sm,
  },
  headerTitle: {
    flex: 1,
    ...Typography.h3,
    color: colors.background.primary,
    textAlign: 'center',
    marginRight: 40,
  },
  placeholder: {
    width: 40,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  aiBadgeText: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.9)',
  },
  listContent: {
    padding: Spacing.base,
    paddingBottom: 120,
  },
  row: {
    justifyContent: 'space-between',
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
    ...Shadows.subtle,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...Typography.h3,
    color: Colors.primary[600],
  },
  statLabel: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border.light,
  },
  offerCard: {
    width: '48%',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.subtle,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  offerImage: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    gap: 2,
  },
  matchScore: {
    ...Typography.caption,
    fontWeight: '700',
  },
  offerTitle: {
    ...Typography.label,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  offerStore: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginBottom: Spacing.sm,
  },
  reasonContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.info + '10',
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  reasonText: {
    ...Typography.caption,
    color: Colors.info,
    flex: 1,
  },
  offerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  discountBadge: {
    backgroundColor: Colors.success + '20',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  discountText: {
    ...Typography.caption,
    color: Colors.success,
    fontWeight: '700',
  },
  expiryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  expiryText: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  errorIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  errorTitle: {
    ...Typography.label,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  errorSubtitle: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  retryButton: {
    backgroundColor: Colors.primary[600],
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  retryText: {
    ...Typography.label,
    color: colors.background.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    ...Typography.label,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  footerLoader: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
});

export default withErrorBoundary(AIRecommendedPage, 'OffersAiRecommended');
