// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Mall Stores Listing Page (Nuqta Mall)
 *
 * Premium design with gradient header, background, and proper spacing
 * Displays all mall stores with search and filter functionality.
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Text,
  Pressable,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

import { mallApi } from '../../../services/mallApi';
import { MallBrand } from '../../../types/mall.types';
import SearchBar from '../../../components/mall/pages/SearchBar';
import FilterChips, { FilterType } from '../../../components/mall/pages/FilterChips';
import BrandFullWidthCard from '../../../components/mall/pages/BrandFullWidthCard';
import MallEmptyState from '../../../components/mall/pages/MallEmptyState';
import MallLoadingSkeleton from '../../../components/mall/pages/MallLoadingSkeleton';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

// Filter config for header styling
const FILTER_CONFIG: Record<FilterType, {
  title: string;
  icon: string;
  colors: [string, string];
  description: string;
  isLuxury?: boolean;
  accentColor?: string;
}> = {
  'all': {
    title: 'All Stores',
    icon: 'storefront',
    colors: [Colors.warning, Colors.nileBlue],
    description: `Browse all ${BRAND.APP_NAME} Mall stores`
  },
  'featured': {
    title: 'Featured Stores',
    icon: 'star',
    colors: [Colors.warning, colors.warningScale[700]],
    description: 'Hand-picked stores with best deals'
  },
  'new': {
    title: 'New Stores',
    icon: 'sparkles',
    colors: [colors.brand.pink, colors.deepPink],
    description: `Recently added to ${BRAND.APP_NAME} Mall`
  },
  'top-rated': {
    title: 'Top Rated',
    icon: 'trophy',
    colors: [Colors.info, colors.brand.blue],
    description: 'Highest rated by our users'
  },
  'luxury': {
    title: 'Luxury Zone',
    icon: 'diamond',
    colors: ['#0F172A', '#1E293B'],
    description: 'Exclusive access to world-class luxury brands',
    isLuxury: true,
    accentColor: colors.brand.goldBright
  },
  'trending': {
    title: 'Trending Stores',
    icon: 'flame',
    colors: [Colors.error, colors.error],
    description: 'Most popular stores right now'
  },
  'reward-boosters': {
    title: 'Reward Boosters',
    icon: 'gift',
    colors: [Colors.brand.purpleLight, Colors.brand.purple],
    description: 'Stores with the best coin rewards'
  },
};

/**
 * Transform store data to MallBrand format for compatibility
 */
function transformStoreToMallBrand(store: any): MallBrand {
  let mallCategory = null;
  if (store.category) {
    if (typeof store.category === 'string') {
      mallCategory = { _id: store.category, id: store.category, name: store.category, slug: store.category.toLowerCase() };
    } else if (store.category.name) {
      mallCategory = store.category;
    }
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const isNewArrival = store.createdAt ? new Date(store.createdAt) > thirtyDaysAgo : false;

  return {
    _id: store._id,
    id: store._id,
    name: store.name,
    slug: store.slug || store.name.toLowerCase().replace(/\s+/g, '-'),
    description: store.description || '',
    logo: store.logo,
    banner: store.banner?.[0] || '',
    externalUrl: '',
    storeId: store._id,
    isInAppStore: true,
    mallCategory,
    tier: store.deliveryCategories?.premium ? 'premium' : 'standard',
    badges: [
      ...(store.isFeatured ? ['exclusive' as const] : []),
      ...(store.isVerified ? ['verified' as const] : []),
    ],
    cashback: {
      percentage: store.rewardRules?.baseCashbackPercent || store.offers?.cashback || 0,
      maxAmount: store.rewardRules?.maxCashback || store.offers?.maxCashback,
      minPurchase: store.operationalInfo?.minimumOrder || store.rewardRules?.minimumAmountForReward,
    },
    ratings: {
      average: store.ratings?.average || 0,
      count: store.ratings?.count || 0,
      successRate: store.ratings?.successRate || Math.min(Math.round((store.ratings?.average || 0) / 5 * 100), 100),
      distribution: store.ratings?.distribution || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    },
    isFeatured: store.isFeatured || false,
    isActive: store.isActive !== false,
    isNewArrival,
    isLuxury: store.deliveryCategories?.premium || false,
    tags: store.tags || [],
    collections: [],
    createdAt: store.createdAt,
    updatedAt: store.updatedAt,
  };
}

function BrandsListingPage() {
  const { filter: initialFilter } = useLocalSearchParams<{ filter?: string }>();
  const isMounted = useIsMounted();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [brands, setBrands] = useState<MallBrand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>(
    (initialFilter as FilterType) || 'all'
  );
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const filterConfig = FILTER_CONFIG[activeFilter] || FILTER_CONFIG.all;

  const fetchBrands = useCallback(async (
    pageNum: number = 1,
    append: boolean = false
  ) => {
    try {
      setError(null);
      let data: MallBrand[] = [];
      let total = 0;

      if (searchQuery.length >= 2) {
        const stores = await mallApi.searchMallStores(searchQuery, 50);
        data = stores.map(transformStoreToMallBrand);
        total = data.length;
      } else if (activeFilter === 'featured') {
        const stores = await mallApi.getFeaturedMallStores(50);
        data = stores.map(transformStoreToMallBrand);
        total = data.length;
      } else if (activeFilter === 'new') {
        const stores = await mallApi.getNewMallStores(50);
        data = stores.map(transformStoreToMallBrand);
        total = data.length;
      } else if (activeFilter === 'top-rated') {
        const stores = await mallApi.getTopRatedMallStores(50);
        data = stores.map(transformStoreToMallBrand);
        total = data.length;
      } else if (activeFilter === 'luxury') {
        const stores = await mallApi.getPremiumMallStores(50);
        data = stores.map(transformStoreToMallBrand);
        total = data.length;
      } else if (activeFilter === 'trending') {
        const stores = await mallApi.getTrendingStores(50);
        data = stores.map(transformStoreToMallBrand);
        total = data.length;
      } else if (activeFilter === 'reward-boosters') {
        const stores = await mallApi.getRewardBoosterStores(50);
        data = stores.map(transformStoreToMallBrand);
        total = data.length;
      } else {
        const result = await mallApi.getMallStores({ page: pageNum, limit: 20 });
        data = result.stores.map(transformStoreToMallBrand);
        total = result.total;
        if (!isMounted()) return;
        setTotalPages(result.pages);
      }

      if (append) {
        if (!isMounted()) return;
        setBrands(prev => [...prev, ...data]);
      } else {
        if (!isMounted()) return;
        setBrands(data);
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Failed to load stores');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
      if (!isMounted()) return;
      setIsRefreshing(false);
      if (!isMounted()) return;
      setIsLoadingMore(false);
    }
  }, [searchQuery, activeFilter]);

  useEffect(() => {
    setIsLoading(true);
    setPage(1);
    fetchBrands(1, false);
  }, [searchQuery, activeFilter]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setPage(1);
    fetchBrands(1, false);
  }, [fetchBrands]);

  const handleLoadMore = useCallback(() => {
    if (isLoadingMore || page >= totalPages || activeFilter !== 'all' || searchQuery) {
      return;
    }
    setIsLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    fetchBrands(nextPage, true);
  }, [page, totalPages, isLoadingMore, activeFilter, searchQuery, fetchBrands]);

  const handleBrandPress = useCallback((brand: MallBrand) => {
    router.push(`/MainStorePage?storeId=${brand.id || brand._id}` as any);
  }, [router]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleFilterChange = useCallback((filter: FilterType) => {
    setActiveFilter(filter);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setActiveFilter('all');
  }, []);

  const renderItem = useCallback(({ item }: { item: MallBrand }) => (
    <BrandFullWidthCard brand={item} onPress={handleBrandPress} />
  ), [handleBrandPress]);

  const keyExtractor = useCallback((item: MallBrand) =>
    item.id || item._id, []);

  const isLuxuryTheme = filterConfig.isLuxury;
  const accentColor = filterConfig.accentColor || Colors.background.primary;

  const ListHeader = useMemo(() => (
    <View style={styles.listHeaderContainer}>
      {/* Premium Header */}
      <LinearGradient
        colors={filterConfig.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { paddingTop: insets.top + 10 }]}
      >
        {/* Decorative Elements */}
        <View style={styles.headerDecor}>
          {isLuxuryTheme ? (
            <>
              <LinearGradient
                colors={['rgba(255, 215, 0, 0.15)', 'rgba(255, 215, 0, 0)']}
                style={[styles.decorCircle, styles.decorCircle1, { backgroundColor: 'transparent' }]}
              />
              <LinearGradient
                colors={['rgba(255, 215, 0, 0.1)', 'rgba(255, 215, 0, 0)']}
                style={[styles.decorCircle, styles.decorCircle2, { backgroundColor: 'transparent' }]}
              />
              <View style={styles.luxuryDecorLine1} />
              <View style={styles.luxuryDecorLine2} />
            </>
          ) : (
            <>
              <View style={[styles.decorCircle, styles.decorCircle1]} />
              <View style={[styles.decorCircle, styles.decorCircle2]} />
            </>
          )}
        </View>

        {/* Back Button */}
        <Pressable
          style={[styles.backButton, isLuxuryTheme && styles.luxuryBackButton]}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
         
        >
          <Ionicons name="arrow-back" size={22} color={Colors.text.inverse} />
        </Pressable>

        {/* Header Content */}
        <View style={styles.headerContent}>
          {isLuxuryTheme ? (
            <LinearGradient
              colors={[colors.brand.goldBright, Colors.warning]}
              style={styles.luxuryIconWrapper}
            >
              <Ionicons name={filterConfig.icon as any} size={28} color="#0F172A" />
            </LinearGradient>
          ) : (
            <View style={styles.headerIconWrapper}>
              <Ionicons name={filterConfig.icon as any} size={28} color={Colors.text.inverse} />
            </View>
          )}
          <Text style={styles.headerTitle}>{filterConfig.title}</Text>
          {isLuxuryTheme && (
            <View style={styles.luxuryPremiumBadge}>
              <Ionicons name="star" size={10} color={colors.brand.goldBright} />
              <Text style={styles.luxuryPremiumText}>PREMIUM</Text>
            </View>
          )}
          <Text style={[styles.headerDescription, isLuxuryTheme && styles.luxuryDescription]}>
            {filterConfig.description}
          </Text>
        </View>

        {/* Stats Row */}
        <View style={[styles.statsRow, isLuxuryTheme && styles.luxuryStatsRow]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, isLuxuryTheme && styles.luxuryStatValue]}>
              {brands.length}
            </Text>
            <Text style={styles.statLabel}>Stores</Text>
          </View>
          <View style={[styles.statDivider, isLuxuryTheme && styles.luxuryStatDivider]} />
          <View style={styles.statItem}>
            <Ionicons name="gift" size={18} color={colors.brand.goldBright} />
            <Text style={styles.statLabel}>{isLuxuryTheme ? 'Premium Rewards' : 'Earn Coins'}</Text>
          </View>
          {isLuxuryTheme && (
            <>
              <View style={[styles.statDivider, styles.luxuryStatDivider]} />
              <View style={styles.statItem}>
                <Ionicons name="shield-checkmark" size={18} color={colors.brand.goldBright} />
                <Text style={styles.statLabel}>Verified</Text>
              </View>
            </>
          )}
        </View>
      </LinearGradient>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <SearchBar
          placeholder="Search stores..."
          value={searchQuery}
          onSearch={handleSearch}
        />
      </View>

      {/* Filter Chips */}
      <FilterChips
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
      />

      {/* Results Count */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsTitle}>Results</Text>
        <View style={[styles.resultsCountBadge, isLuxuryTheme && styles.luxuryResultsBadge]}>
          <Text style={[styles.resultsCount, isLuxuryTheme && styles.luxuryResultsCount]}>
            {brands.length} stores
          </Text>
        </View>
      </View>
    </View>
  ), [brands.length, filterConfig, searchQuery, activeFilter, insets.top, router, handleSearch, handleFilterChange, isLuxuryTheme]);

  const ListFooter = useMemo(() => {
    if (isLoadingMore) {
      return (
        <View style={styles.loadingMore}>
          <ActivityIndicator size="small" color={Colors.warning} />
          <Text style={styles.loadingMoreText}>Loading more...</Text>
        </View>
      );
    }
    // Add padding for tab bar
    return <View style={{ height: insets.bottom + 100 }} />;
  }, [isLoadingMore, insets.bottom]);

  const ListEmpty = useMemo(() => {
    if (isLoading) return null;

    return (
      <MallEmptyState
        title={searchQuery ? 'No stores found' : 'No stores available'}
        message={
          searchQuery
            ? `No stores match "${searchQuery}"`
            : 'Try adjusting your filters'
        }
        icon={searchQuery ? 'search-outline' : 'storefront-outline'}
        actionLabel="Clear Filters"
        onAction={handleClearFilters}
      />
    );
  }, [isLoading, searchQuery, handleClearFilters]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.container}>
        {/* Background Gradient */}
        <LinearGradient
          colors={[colors.linen, colors.linen, Colors.background.secondary]}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Loading State */}
        {isLoading ? (
          <View style={styles.loadingWrapper}>
            <LinearGradient
              colors={filterConfig.colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.headerGradient, styles.loadingHeader, { paddingTop: insets.top + 10 }]}
            >
              <Pressable
                style={styles.backButton}
                onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
               
              >
                <Ionicons name="arrow-back" size={22} color={Colors.text.inverse} />
              </Pressable>
              <View style={styles.headerContent}>
                <View style={styles.headerIconWrapper}>
                  <Ionicons name={filterConfig.icon as any} size={28} color={Colors.text.inverse} />
                </View>
                <Text style={styles.headerTitle}>{filterConfig.title}</Text>
              </View>
            </LinearGradient>
            <MallLoadingSkeleton count={6} type="list" />
          </View>
        ) : error ? (
          <View style={styles.errorWrapper}>
            <LinearGradient
              colors={filterConfig.colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.headerGradient, styles.loadingHeader, { paddingTop: insets.top + 10 }]}
            >
              <Pressable
                style={styles.backButton}
                onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
               
              >
                <Ionicons name="arrow-back" size={22} color={Colors.text.inverse} />
              </Pressable>
            </LinearGradient>
            <MallEmptyState
              title="Something went wrong"
              message={error}
              icon="alert-circle-outline"
              actionLabel="Try Again"
              onAction={handleRefresh}
            />
          </View>
        ) : (
          <FlashList
            data={brands}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={ListHeader}
            ListFooterComponent={ListFooter}
            ListEmptyComponent={ListEmpty}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={Colors.warning}
                colors={[Colors.warning]}
              />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            estimatedItemSize={100}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  loadingWrapper: {
    flex: 1,
  },
  errorWrapper: {
    flex: 1,
  },
  headerGradient: {
    paddingBottom: Spacing.xl,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    position: 'relative',
  },
  loadingHeader: {
    paddingBottom: 30,
  },
  headerDecor: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  decorCircle1: {
    width: 200,
    height: 200,
    top: -60,
    right: -40,
  },
  decorCircle2: {
    width: 120,
    height: 120,
    bottom: -30,
    left: -30,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.base,
    marginBottom: Spacing.base,
  },
  headerContent: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  headerIconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text.inverse,
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerDescription: {
    ...Typography.body,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.base,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginHorizontal: 40,
    borderRadius: 14,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text.inverse,
  },
  statLabel: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  listHeaderContainer: {
    backgroundColor: 'transparent',
  },
  searchSection: {
    marginTop: -20,
    zIndex: 10,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  resultsTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  resultsCountBadge: {
    backgroundColor: colors.linen,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.xl,
  },
  resultsCount: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.nileBlue,
  },
  listContent: {
    paddingBottom: 120,
  },
  loadingMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    gap: 10,
  },
  loadingMoreText: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  // Luxury Theme Styles
  luxuryDecorLine1: {
    position: 'absolute',
    top: 60,
    right: 0,
    width: 80,
    height: 1,
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
  },
  luxuryDecorLine2: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    width: 60,
    height: 1,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
  },
  luxuryBackButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  luxuryIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: colors.brand.goldBright,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  luxuryPremiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  luxuryPremiumText: {
    ...Typography.overline,
    fontWeight: '800',
    color: colors.brand.goldBright,
    letterSpacing: 1.5,
  },
  luxuryDescription: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  luxuryStatsRow: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    marginHorizontal: Spacing.lg,
  },
  luxuryStatValue: {
    color: colors.brand.goldBright,
  },
  luxuryStatDivider: {
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
  },
  luxuryResultsBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  luxuryResultsCount: {
    color: colors.brand.amberDeep,
  },
});

export default withErrorBoundary(BrandsListingPage, 'MallBrandsIndex');
