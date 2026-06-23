// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Sponsored Cashback Offers Page
// Brand-sponsored cashback offers (wired to GET /api/offers/bank-offers)

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { useAuthLoading, useGetCurrencySymbol, useIsAuthenticated } from '@/stores/selectors';
import apiClient from '@/services/apiClient';
import CachedImage from '@/components/ui/CachedImage';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface BankOfferRaw {
  _id: string;
  bankName: string;
  bankLogo?: string;
  offerTitle: string;
  offerDescription?: string;
  discountPercentage: number;
  maxDiscount: number;
  minTransactionAmount: number;
  cardType: string;
  validUntil: string;
  promoCode?: string;
  priority: number;
}

interface SponsoredOffer {
  id: string;
  brand: string;
  title: string;
  description: string;
  cashback: string;
  minPurchase: string;
  validTill: string;
  image: string;
  bankLogo?: string;
  sponsored: boolean;
}

const PAGE_LIMIT = 10;

const cardTypeEmoji: Record<string, string> = {
  credit: '💳',
  debit: '🏦',
  wallet: '👛',
  upi: '📲',
  all: '🏷️',
};

function mapBankOfferToSponsored(offer: BankOfferRaw, currencySymbol: string): SponsoredOffer {
  const cashbackStr = offer.discountPercentage > 0
    ? `${offer.discountPercentage}%`
    : `${currencySymbol}${offer.maxDiscount.toLocaleString()}`;
  const validDate = new Date(offer.validUntil);
  const validTillStr = validDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return {
    id: offer._id,
    brand: offer.bankName,
    title: offer.offerTitle,
    description: offer.offerDescription || `Up to ${currencySymbol}${offer.maxDiscount.toLocaleString()} off`,
    cashback: cashbackStr,
    minPurchase: `${currencySymbol}${offer.minTransactionAmount.toLocaleString()}`,
    validTill: validTillStr,
    image: cardTypeEmoji[offer.cardType] || '🏷️',
    bankLogo: offer.bankLogo,
    sponsored: true,
  };
}

function SponsoredCashbackPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const [filter, setFilter] = useState<'all' | 'highest' | 'expiring'>('all');
  const [offers, setOffers] = useState<SponsoredOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOffers = useCallback(async (pageNum: number, append: boolean = false) => {
    try {
      if (!append) setError(null);
      const params: Record<string, string | number> = {
        page: pageNum,
        limit: PAGE_LIMIT,
        sort: filter,
      };
      const response = await apiClient.get<any>('/offers/bank-offers', params);

      const rawOffers: BankOfferRaw[] = Array.isArray(response.data)
        ? response.data
        : response.data?.data || response.data?.offers || [];

      const mapped = rawOffers.map((o) => mapBankOfferToSponsored(o, currencySymbol));

      const pagination = response.data?.meta?.pagination;
      const hasNextPage = pagination
        ? pagination.page < pagination.pages
        : rawOffers.length >= PAGE_LIMIT;

      if (append) {
        if (!isMounted()) return;
        setOffers((prev) => [...prev, ...mapped]);
      } else {
        if (!isMounted()) return;
        setOffers(mapped);
      }
      if (!isMounted()) return;
      setHasMore(hasNextPage);
      if (!isMounted()) return;
      setPage(pageNum);
    } catch (err: any) {
      if (!append) {
        if (!isMounted()) return;
        setError(err?.message || 'Failed to load offers');
      }
    }
  }, [filter, currencySymbol]);

  // Initial load + filter change
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;

    setLoading(true);
    setPage(1);
    setHasMore(true);
    fetchOffers(1, false).finally(() => setLoading(false));
  }, [filter, isAuthenticated, authLoading, fetchOffers]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    await fetchOffers(1, false);
    if (!isMounted()) return;
    setRefreshing(false);
  }, [fetchOffers]);

  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    fetchOffers(page + 1, true).finally(() => setLoadingMore(false));
  }, [loadingMore, hasMore, page, fetchOffers]);

  const renderOffer = useCallback(({ item }: { item: SponsoredOffer }) => (
    <Pressable
      style={styles.offerCard}
      onPress={() => router.push(`/offers/${item.id}` as any)}
    >
      <View style={styles.sponsoredBadge}>
        <Ionicons name="megaphone" size={12} color={Colors.gold} />
        <ThemedText style={styles.sponsoredText}>Sponsored</ThemedText>
      </View>

      <View style={styles.offerHeader}>
        <View style={styles.brandImage}>
          {item.bankLogo ? (
            <CachedImage source={{ uri: item.bankLogo }} style={{ width: 40, height: 40, borderRadius: 8 }} />
          ) : (
            <ThemedText style={styles.brandEmoji}>{item.image}</ThemedText>
          )}
        </View>
        <View style={styles.brandInfo}>
          <ThemedText style={styles.brandName}>{item.brand}</ThemedText>
          <ThemedText style={styles.offerTitle}>{item.title}</ThemedText>
        </View>
      </View>

      <ThemedText style={styles.offerDescription}>{item.description}</ThemedText>

      <View style={styles.offerDetails}>
        <View style={styles.cashbackBadge}>
          <Ionicons name="wallet" size={14} color={colors.background.primary} />
          <ThemedText style={styles.cashbackText}>{item.cashback} Cashback</ThemedText>
        </View>
        <View style={styles.minPurchase}>
          <ThemedText style={styles.minPurchaseLabel}>Min:</ThemedText>
          <ThemedText style={styles.minPurchaseValue}>{item.minPurchase}</ThemedText>
        </View>
      </View>

      <View style={styles.offerFooter}>
        <View style={styles.validTill}>
          <Ionicons name="calendar-outline" size={14} color={Colors.text.tertiary} />
          <ThemedText style={styles.validTillText}>Valid till {item.validTill}</ThemedText>
        </View>
        <Pressable style={styles.claimButton}>
          <ThemedText style={styles.claimButtonText}>Claim</ThemedText>
          <Ionicons name="arrow-forward" size={16} color={colors.background.primary} />
        </Pressable>
      </View>
    </Pressable>
  ), [router]);

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.brand.indigo} />
      </View>
    );
  }, [loadingMore]);

  const renderEmpty = useCallback(() => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name="megaphone-outline" size={36} color={Colors.text.tertiary} />
        </View>
        <ThemedText style={styles.emptyTitle}>No Sponsored Offers</ThemedText>
        <ThemedText style={styles.emptySubtitle}>
          {error || 'Check back later for exclusive brand offers with enhanced cashback.'}
        </ThemedText>
      </View>
    );
  }, [loading, error]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.brand.indigo} />

      <LinearGradient
        colors={[colors.brand.indigo, colors.brand.purpleLight]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Brand Offers</ThemedText>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.heroSection}>
          <Ionicons name="megaphone" size={40} color={colors.background.primary} />
          <ThemedText style={styles.heroTitle}>Sponsored Cashback</ThemedText>
          <ThemedText style={styles.heroSubtitle}>
            Exclusive offers from top brands with enhanced cashback
          </ThemedText>
        </View>
      </LinearGradient>

      <View style={styles.filtersContainer}>
        {[
          { key: 'all', label: 'All Offers' },
          { key: 'highest', label: 'Highest Cashback' },
          { key: 'expiring', label: 'Expiring Soon' },
        ].map(f => (
          <Pressable
            key={f.key}
            style={[styles.filterButton, filter === f.key && styles.filterButtonActive]}
            onPress={() => setFilter(f.key as any)}
          >
            <ThemedText style={[
              styles.filterButtonText,
              filter === f.key && styles.filterButtonTextActive,
            ]}>
              {f.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIconWrap}>
            <Ionicons name="megaphone" size={32} color={colors.brand.indigo} />
          </View>
          <ActivityIndicator size="large" color={colors.brand.indigo} style={{ marginTop: 16 }} />
        </View>
      ) : (
        <FlashList
          data={offers}
          renderItem={renderOffer}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.listContent, offers.length === 0 && { flex: 1 }]}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          estimatedItemSize={120}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.brand.indigo]}
              tintColor={colors.brand.indigo}
            />
          }
        />
      )}
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
    paddingBottom: Spacing.xl,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
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
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  heroTitle: {
    ...Typography.h2,
    color: colors.background.primary,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  heroSubtitle: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  filtersContainer: {
    flexDirection: 'row',
    padding: Spacing.base,
    gap: Spacing.sm,
  },
  filterButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background.primary,
    alignItems: 'center',
    ...Shadows.subtle,
  },
  filterButtonActive: {
    backgroundColor: colors.brand.indigo,
  },
  filterButtonText: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  filterButtonTextActive: {
    color: colors.background.primary,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom: 120,
  },
  offerCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadows.subtle,
  },
  sponsoredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: Colors.gold + '20',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    marginBottom: Spacing.md,
  },
  sponsoredText: {
    ...Typography.caption,
    color: Colors.gold,
    fontWeight: '600',
  },
  offerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  brandImage: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  brandEmoji: {
    fontSize: 28,
  },
  brandInfo: {
    flex: 1,
  },
  brandName: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  offerTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
  },
  offerDescription: {
    ...Typography.body,
    color: Colors.text.secondary,
    marginBottom: Spacing.md,
  },
  offerDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  cashbackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.success,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  cashbackText: {
    ...Typography.label,
    color: colors.background.primary,
  },
  minPurchase: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  minPurchaseLabel: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
  minPurchaseValue: {
    ...Typography.label,
    color: Colors.text.primary,
  },
  offerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  validTill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  validTillText: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
  claimButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: colors.brand.indigo,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  claimButtonText: {
    ...Typography.label,
    color: colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  loadingIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.brand.indigo + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default withErrorBoundary(SponsoredCashbackPage, 'OffersSponsored');
