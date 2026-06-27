// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  Platform,
  StatusBar,
  KeyboardAvoidingView
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useGetCurrencySymbol } from '@/stores/selectors';

import realVouchersApi from '../../services/realVouchersApi';
import couponService from '../../services/couponApi';
import type { Coupon } from '../../services/couponApi';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

// ─── Types ──────────────────────────────────────────────────
type ActiveTab = 'gift-cards' | 'coupons';

interface VoucherBrandItem {
  _id: string;
  name: string;
  logo: string;
  category: string;
  cashbackRate: number;
  isFeatured: boolean;
  isNewlyAdded: boolean;
  denominations: number[];
  purchaseCount: number;
  rating?: number;
}

const PAGE_SIZE = 20;

// ─── Main Component ─────────────────────────────────────────
function BuyCouponsPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const isFirstSearch = useRef(true);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<ActiveTab>('gift-cards');

  // ─── Gift Cards State ───────────────────────────────────
  const [giftCards, setGiftCards] = useState<VoucherBrandItem[]>([]);
  const [giftCardCategories, setGiftCardCategories] = useState<string[]>([]);
  const [totalGiftCards, setTotalGiftCards] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [giftCardsPage, setGiftCardsPage] = useState(1);
  const [giftCardsHasMore, setGiftCardsHasMore] = useState(true);
  const [giftCardsLoading, setGiftCardsLoading] = useState(true);
  const [giftCardsRefreshing, setGiftCardsRefreshing] = useState(false);
  const [giftCardsLoadingMore, setGiftCardsLoadingMore] = useState(false);
  const [giftCardsError, setGiftCardsError] = useState<string | null>(null);
  const giftCardsLoaded = useRef(false);

  // ─── Coupons State ──────────────────────────────────────
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [couponsRefreshing, setCouponsRefreshing] = useState(false);
  const [couponsError, setCouponsError] = useState<string | null>(null);
  const [claimingCouponId, setClaimingCouponId] = useState<string | null>(null);
  const [claimedCoupons, setClaimedCoupons] = useState<Set<string>>(new Set());
  const couponsLoaded = useRef(false);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // ─── Debounced Search ─────────────────────────────────────
  useEffect(() => {
    if (isFirstSearch.current) {
      isFirstSearch.current = false;
      return;
    }
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchQuery]);

  // ─── Fetch Gift Card Categories ─────────────────────────
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await realVouchersApi.getVoucherCategories();
        if (response.success && response.data) {
          setGiftCardCategories(response.data as unknown as string[]);
        }
      } catch (err) {
        // silently handle
      }
    };
    loadCategories();
  }, []);

  // ─── Fetch Gift Cards ──────────────────────────────────────
  const fetchGiftCards = useCallback(async (pageNum: number, append: boolean) => {
    try {
      setGiftCardsError(null);
      const params: any = { limit: PAGE_SIZE, page: pageNum };

      if (debouncedSearch.length >= 2) {
        params.search = debouncedSearch;
      } else if (selectedCategory !== 'all') {
        params.category = selectedCategory;
      }

      const response = await realVouchersApi.getVoucherBrands(params);

      if (response.success && response.data) {
        const brands = (response.data as any)?.brands || response.data;
        const brandsArray = Array.isArray(brands) ? brands : [];
        const total = (response.data as any)?.total || brandsArray.length;

        const mapped: VoucherBrandItem[] = brandsArray.map((b: any) => ({
          _id: b._id,
          name: b.name || '',
          logo: b.logo || '',
          category: b.category || '',
          cashbackRate: b.cashbackRate || 0,
          isFeatured: b.isFeatured ?? false,
          isNewlyAdded: b.isNewlyAdded ?? false,
          denominations: b.denominations || [],
          purchaseCount: b.purchaseCount || 0,
          rating: b.rating,
        }));

        if (append) {
          if (!isMounted()) return;
          setGiftCards(prev => [...prev, ...mapped]);
        } else {
          if (!isMounted()) return;
          setGiftCards(mapped);
        }
        if (!isMounted()) return;
        setTotalGiftCards(total);
        if (!isMounted()) return;
        setGiftCardsHasMore(mapped.length >= PAGE_SIZE);
      }
    } catch (err) {
      if (!append) {
        if (!isMounted()) return;
        setGiftCardsError('Unable to load gift cards. Pull down to retry.');
      }
    }
  }, [debouncedSearch, selectedCategory]);

  // Trigger gift card fetch on filter/search changes
  useEffect(() => {
    if (activeTab !== 'gift-cards') return;
    setGiftCardsPage(1);
    setGiftCardsLoading(true);
    giftCardsLoaded.current = true;
    fetchGiftCards(1, false).finally(() => setGiftCardsLoading(false));
  }, [debouncedSearch, selectedCategory, activeTab]);

  // ─── Fetch Coupons ─────────────────────────────────────────
  const fetchCoupons = useCallback(async () => {
    try {
      setCouponsError(null);

      let response;
      if (debouncedSearch.length >= 2) {
        response = await couponService.searchCoupons({ q: debouncedSearch });
        if (response.success && response.data) {
          if (!isMounted()) return;
          setCoupons((response.data as any)?.coupons || []);
        }
      } else {
        response = await couponService.getAvailableCoupons();
        if (response.success && response.data) {
          if (!isMounted()) return;
          setCoupons((response.data as any)?.coupons || []);
        }
      }
    } catch (err) {
      if (!isMounted()) return;
      setCouponsError('Unable to load coupons. Pull down to retry.');
    }
  }, [debouncedSearch]);

  // Trigger coupon fetch on tab switch or search change
  useEffect(() => {
    if (activeTab !== 'coupons') return;
    setCouponsLoading(true);
    couponsLoaded.current = true;
    fetchCoupons().finally(() => setCouponsLoading(false));
  }, [activeTab, debouncedSearch]);

  // ─── Tab Switch Handler ────────────────────────────────────
  const handleTabSwitch = useCallback((tab: ActiveTab) => {
    setActiveTab(tab);
    setSearchQuery('');
    setDebouncedSearch('');
    isFirstSearch.current = true;
  }, []);

  // ─── Gift Card Handlers ────────────────────────────────────
  const handleGiftCardRefresh = useCallback(async () => {
    setGiftCardsRefreshing(true);
    setGiftCardsPage(1);
    await fetchGiftCards(1, false);
    if (!isMounted()) return;
    setGiftCardsRefreshing(false);
  }, [fetchGiftCards]);

  const handleGiftCardLoadMore = useCallback(() => {
    if (giftCardsLoadingMore || !giftCardsHasMore || debouncedSearch.length >= 2) return;
    setGiftCardsLoadingMore(true);
    const nextPage = giftCardsPage + 1;
    setGiftCardsPage(nextPage);
    fetchGiftCards(nextPage, true).finally(() => setGiftCardsLoadingMore(false));
  }, [giftCardsLoadingMore, giftCardsHasMore, giftCardsPage, fetchGiftCards, debouncedSearch]);

  const handleGiftCardPress = useCallback((brand: VoucherBrandItem) => {
    router.push(`/vouchers/brand/${brand._id}` as any);
  }, [router]);

  const handleCategorySelect = useCallback((cat: string) => {
    setSelectedCategory(cat);
    setSearchQuery('');
    setDebouncedSearch('');
    isFirstSearch.current = true;
  }, []);

  // ─── Coupon Handlers ───────────────────────────────────────
  const handleCouponRefresh = useCallback(async () => {
    setCouponsRefreshing(true);
    await fetchCoupons();
    if (!isMounted()) return;
    setCouponsRefreshing(false);
  }, [fetchCoupons]);

  const handleClaimCoupon = useCallback(async (couponId: string) => {
    if (claimingCouponId) return;
    setClaimingCouponId(couponId);
    try {
      const response = await couponService.claimCoupon(couponId);
      if (response.success) {
        setClaimedCoupons(prev => new Set(prev).add(couponId));
      }
    } catch (err: any) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setClaimingCouponId(null);
    }
  }, [claimingCouponId]);

  const handleViewMyCoupons = useCallback(() => {
    router.push('/account/coupons');
  }, [router]);

  // ─── Denomination Range Display ────────────────────────────
  const getDenominationRange = useCallback((denoms: number[]) => {
    if (!denoms || denoms.length === 0) return '';
    const sorted = [...denoms].sort((a, b) => a - b);
    if (sorted.length === 1) return `${currencySymbol}${sorted[0]}`;
    return `${currencySymbol}${sorted[0]} - ${currencySymbol}${sorted[sorted.length - 1]}`;
  }, [currencySymbol]);

  // ─── Render Gift Card ──────────────────────────────────────
  const renderGiftCard = useCallback(({ item, index }: { item: VoucherBrandItem; index: number }) => (
    <GiftCardCard
      brand={item}
      index={index}
      onPress={handleGiftCardPress}
      denominationRange={getDenominationRange(item.denominations)}
      currencySymbol={currencySymbol}
    />
  ), [handleGiftCardPress, getDenominationRange, currencySymbol]);

  // ─── Render Coupon ─────────────────────────────────────────
  const renderCoupon = useCallback(({ item, index }: { item: Coupon; index: number }) => (
    <CouponCard
      coupon={item}
      index={index}
      onClaim={handleClaimCoupon}
      isClaiming={claimingCouponId === item._id}
      isClaimed={claimedCoupons.has(item._id)}
      currencySymbol={currencySymbol}
      onViewMyCoupons={handleViewMyCoupons}
    />
  ), [handleClaimCoupon, claimingCouponId, claimedCoupons, currencySymbol, handleViewMyCoupons]);

  const giftCardKeyExtractor = useCallback((item: VoucherBrandItem) => item._id, []);
  const couponKeyExtractor = useCallback((item: Coupon) => item._id, []);

  // ─── Gift Card List Header ─────────────────────────────────
  const GiftCardListHeader = useMemo(() => (
    <View>
      {/* Category Filter Chips */}
      {giftCardCategories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContent}
          style={styles.chipsScroll}
        >
          <Pressable
            onPress={() => handleCategorySelect('all')}
            style={[styles.chip, selectedCategory === 'all' && styles.chipActive]}
          >
            <Ionicons name="apps" size={12} color={selectedCategory === 'all' ? Colors.text.inverse : '#7C8A97'} />
            <Text style={[styles.chipText, selectedCategory === 'all' && styles.chipTextActive]}>All</Text>
          </Pressable>
          {giftCardCategories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => handleCategorySelect(cat)}
                style={[styles.chip, isActive && styles.chipActive]}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Results Count */}
      <View style={styles.resultsRow}>
        <Text style={styles.resultsText}>
          {debouncedSearch.length >= 2
            ? `${giftCards.length} result${giftCards.length !== 1 ? 's' : ''}`
            : `${totalGiftCards > 0 ? totalGiftCards : '\u2014'} gift cards`
          }
        </Text>
      </View>
    </View>
  ), [giftCardCategories, selectedCategory, giftCards.length, debouncedSearch, totalGiftCards, handleCategorySelect]);

  // ─── Coupon List Header ────────────────────────────────────
  const CouponListHeader = useMemo(() => (
    <View style={styles.resultsRow}>
      <Text style={styles.resultsText}>
        {debouncedSearch.length >= 2
          ? `${coupons.length} result${coupons.length !== 1 ? 's' : ''}`
          : `${coupons.length > 0 ? coupons.length : '\u2014'} coupons available`
        }
      </Text>
    </View>
  ), [coupons.length, debouncedSearch]);

  // ─── List Footer ───────────────────────────────────────────
  const GiftCardListFooter = useMemo(() => {
    if (giftCardsLoadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={colors.brand.caramel} />
          <Text style={styles.footerText}>Loading more...</Text>
        </View>
      );
    }
    if (!giftCardsHasMore && giftCards.length > 0) {
      return (
        <View style={styles.footerEnd}>
          <View style={styles.footerDot} />
          <Text style={styles.footerEndText}>That's all</Text>
          <View style={styles.footerDot} />
        </View>
      );
    }
    return <View style={{ height: 20 }} />;
  }, [giftCardsLoadingMore, giftCardsHasMore, giftCards.length]);

  // ─── Empty States ──────────────────────────────────────────
  const GiftCardEmpty = useMemo(() => {
    if (giftCardsLoading) return null;
    if (giftCardsError && giftCards.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconWrap, { backgroundColor: 'rgba(232,116,79,0.1)' }]}>
            <Ionicons name="cloud-offline-outline" size={28} color="#E8744F" />
          </View>
          <Text style={styles.emptyTitle}>Something went wrong</Text>
          <Text style={styles.emptySubtitle}>{giftCardsError}</Text>
          <Pressable onPress={handleGiftCardRefresh} style={styles.emptyResetBtn}>
            <Text style={styles.emptyResetText}>Try Again</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name={debouncedSearch.length >= 2 ? 'search-outline' : 'gift-outline'} size={28} color={colors.brand.caramel} />
        </View>
        <Text style={styles.emptyTitle}>
          {debouncedSearch.length >= 2 ? 'No gift cards found' : 'No gift cards yet'}
        </Text>
        <Text style={styles.emptySubtitle}>
          {debouncedSearch.length >= 2 ? 'Try a different search term' : 'Gift cards will appear here soon.'}
        </Text>
        {(debouncedSearch.length >= 2 || selectedCategory !== 'all') && (
          <Pressable
            onPress={() => {
              setSearchQuery('');
              setDebouncedSearch('');
              setSelectedCategory('all');
              isFirstSearch.current = true;
            }}
            style={styles.emptyResetBtn}
          >
            <Text style={styles.emptyResetText}>Clear filters</Text>
          </Pressable>
        )}
      </View>
    );
  }, [giftCardsLoading, giftCardsError, giftCards.length, debouncedSearch, selectedCategory, handleGiftCardRefresh]);

  const CouponEmpty = useMemo(() => {
    if (couponsLoading) return null;
    if (couponsError) {
      return (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconWrap, { backgroundColor: 'rgba(232,116,79,0.1)' }]}>
            <Ionicons name="cloud-offline-outline" size={28} color="#E8744F" />
          </View>
          <Text style={styles.emptyTitle}>Something went wrong</Text>
          <Text style={styles.emptySubtitle}>{couponsError}</Text>
          <Pressable onPress={handleCouponRefresh} style={styles.emptyResetBtn}>
            <Text style={styles.emptyResetText}>Try Again</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name={debouncedSearch.length >= 2 ? 'search-outline' : 'pricetag-outline'} size={28} color={colors.brand.caramel} />
        </View>
        <Text style={styles.emptyTitle}>
          {debouncedSearch.length >= 2 ? 'No coupons found' : 'No coupons available'}
        </Text>
        <Text style={styles.emptySubtitle}>
          {debouncedSearch.length >= 2 ? 'Try a different search term' : 'Check back later for new coupons.'}
        </Text>
      </View>
    );
  }, [couponsLoading, couponsError, debouncedSearch, handleCouponRefresh]);

  // ─── Loading Skeleton ──────────────────────────────────────
  const isLoading = activeTab === 'gift-cards' ? giftCardsLoading : couponsLoading;
  const hasData = activeTab === 'gift-cards' ? giftCards.length > 0 : coupons.length > 0;

  if (isLoading && !hasData) {
    const skeletonTop = Platform.OS === 'web' ? 0 : insets.top;
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={[styles.stickyHeader, { paddingTop: skeletonTop }]}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={20} color={colors.nileBlue} />
            </Pressable>
            <Text style={styles.headerTitle}>Gift Cards & Coupons</Text>
            <View style={{ width: 36 }} />
          </View>
          {/* Tab Switcher */}
          <View style={styles.tabRow}>
            <Pressable style={[styles.tab, styles.tabActive]}>
              <Ionicons name="gift-outline" size={14} color={Colors.text.inverse} />
              <Text style={[styles.tabText, styles.tabTextActive]}>Gift Cards</Text>
            </Pressable>
            <Pressable style={styles.tab}>
              <Ionicons name="pricetag-outline" size={14} color="#7C8A97" />
              <Text style={styles.tabText}>Coupons</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.skeletonContainer}>
          <View style={styles.skeletonGrid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} index={i} />
            ))}
          </View>
        </View>
      </View>
    );
  }

  // ─── Main Render ───────────────────────────────────────────
  const headerTop = Platform.OS === 'web' ? 0 : insets.top;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Sticky Header */}
      <View style={[styles.stickyHeader, { paddingTop: headerTop }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={colors.nileBlue} />
          </Pressable>
          <Text style={styles.headerTitle}>Gift Cards & Coupons</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Search */}
        <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
          <Ionicons name="search" size={15} color={searchFocused ? colors.brand.caramel : '#94A3B8'} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder={activeTab === 'gift-cards' ? 'Search gift cards...' : 'Search coupons...'}
            placeholderTextColor="#94A3B8"
            returnKeyType="search"
            selectionColor="rgba(212,160,122,0.5)"
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => {
                setSearchQuery('');
                setDebouncedSearch('');
                isFirstSearch.current = true;
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </Pressable>
          )}
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabRow}>
          <Pressable
            onPress={() => handleTabSwitch('gift-cards')}
            style={[styles.tab, activeTab === 'gift-cards' && styles.tabActive]}
          >
            <Ionicons
              name="gift-outline"
              size={14}
              color={activeTab === 'gift-cards' ? Colors.text.inverse : '#7C8A97'}
            />
            <Text style={[styles.tabText, activeTab === 'gift-cards' && styles.tabTextActive]}>
              Gift Cards
            </Text>
          </Pressable>
          <Pressable
            onPress={() => handleTabSwitch('coupons')}
            style={[styles.tab, activeTab === 'coupons' && styles.tabActive]}
          >
            <Ionicons
              name="pricetag-outline"
              size={14}
              color={activeTab === 'coupons' ? Colors.text.inverse : '#7C8A97'}
            />
            <Text style={[styles.tabText, activeTab === 'coupons' && styles.tabTextActive]}>
              Coupons
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ─── Gift Cards Tab ─────────────────────────────────── */}
      {activeTab === 'gift-cards' && (
        <FlashList
          style={{ flex: 1 }}
          data={giftCards}
          renderItem={renderGiftCard}
          keyExtractor={giftCardKeyExtractor}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          ListHeaderComponent={GiftCardListHeader}
          ListFooterComponent={GiftCardListFooter}
          ListEmptyComponent={GiftCardEmpty}
          refreshControl={
            <RefreshControl
              refreshing={giftCardsRefreshing}
              onRefresh={handleGiftCardRefresh}
              tintColor={colors.brand.caramel}
              colors={[colors.brand.caramel]}
              estimatedItemSize={220}
            />
          }
          onEndReached={handleGiftCardLoadMore}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* ─── Coupons Tab ────────────────────────────────────── */}
      {activeTab === 'coupons' && (
        <FlashList
          style={{ flex: 1 }}
          data={coupons}
          renderItem={renderCoupon}
          keyExtractor={couponKeyExtractor}
          ListHeaderComponent={CouponListHeader}
          ListEmptyComponent={CouponEmpty}
          refreshControl={
            <RefreshControl
              refreshing={couponsRefreshing}
              onRefresh={handleCouponRefresh}
              tintColor={colors.brand.caramel}
              colors={[colors.brand.caramel]}
              estimatedItemSize={70}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.couponListContent}
        />
      )}
    </View>
    </KeyboardAvoidingView>
  );
}

// ─── Gift Card Card ──────────────────────────────────────────
const GiftCardCard = React.memo(({
  brand,
  index,
  onPress,
  denominationRange,
  currencySymbol,
}: {
  brand: VoucherBrandItem;
  index: number;
  onPress: (brand: VoucherBrandItem) => void;
  denominationRange: string;
  currencySymbol: string;
}) => {
  const fadeAnim = useSharedValue(0);
  const pressAnim = useSharedValue(1);

  useEffect(() => {
    fadeAnim.value = withTiming(1, { duration: 300 });
  }, [index]);

  const handlePressIn = () => {
    pressAnim.value = withSpring(0.96);
  };

  const handlePressOut = () => {
    pressAnim.value = withSpring(1);
  };

  const [logoError, setLogoError] = useState(false);

  const cardAnimStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ scale: pressAnim.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        cardAnimStyle,
      ]}
    >
      <Pressable
        onPress={() => onPress(brand)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
       
        style={styles.card}
      >
        {/* Featured Badge */}
        {brand.isFeatured && (
          <View style={styles.featuredBadge}>
            <Ionicons name="star" size={9} color={Colors.text.inverse} />
            <Text style={styles.featuredText}>Featured</Text>
          </View>
        )}

        {/* New Badge */}
        {brand.isNewlyAdded && !brand.isFeatured && (
          <View style={[styles.featuredBadge, { backgroundColor: Colors.success }]}>
            <Ionicons name="sparkles" size={9} color={Colors.text.inverse} />
            <Text style={styles.featuredText}>New</Text>
          </View>
        )}

        {/* Logo */}
        <View style={styles.logoArea}>
          {brand.logo?.startsWith('http') && !logoError ? (
            <CachedImage
              source={brand.logo}
              style={styles.logo}
              contentFit="contain"
              onError={() => setLogoError(true)}
            />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoInitial}>
                {brand.logo && !brand.logo.startsWith('http') ? brand.logo : brand.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* Brand Name */}
        <Text style={styles.brandName} numberOfLines={1}>
          {brand.name}
        </Text>

        {/* Category */}
        {brand.category ? (
          <Text style={styles.categoryLabel} numberOfLines={1}>
            {brand.category}
          </Text>
        ) : null}

        {/* Denomination Range */}
        {denominationRange ? (
          <Text style={styles.denomRange} numberOfLines={1}>
            {denominationRange}
          </Text>
        ) : null}

        {/* Cashback Rate */}
        {brand.cashbackRate > 0 && (
          <View style={styles.cashbackRow}>
            <Text style={styles.cashbackRate}>{brand.cashbackRate}%</Text>
            <Text style={styles.cashbackLabel}> cashback</Text>
          </View>
        )}

        {/* Buy CTA */}
        <View style={styles.shopCta}>
          <Text style={styles.shopCtaText}>Buy Gift Card</Text>
          <Ionicons name="arrow-forward" size={12} color={Colors.text.inverse} />
        </View>
      </Pressable>
    </Animated.View>
  );
});

// ─── Coupon Card ─────────────────────────────────────────────
const CouponCard = React.memo(({
  coupon,
  index,
  onClaim,
  isClaiming,
  isClaimed,
  currencySymbol,
  onViewMyCoupons,
}: {
  coupon: Coupon;
  index: number;
  onClaim: (id: string) => void;
  isClaiming: boolean;
  isClaimed: boolean;
  currencySymbol: string;
  onViewMyCoupons: () => void;
}) => {
  const fadeAnim = useSharedValue(0);

  useEffect(() => {
    fadeAnim.value = withTiming(1, { duration: 300 });
  }, [index]);

  const couponAnimStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  const discountDisplay = coupon.discountType === 'PERCENTAGE'
    ? `${coupon.discountValue}% OFF`
    : `${currencySymbol}${coupon.discountValue} OFF`;

  const maskedCode = coupon.couponCode.length > 4
    ? `${coupon.couponCode.slice(0, 4)}${'•'.repeat(Math.min(coupon.couponCode.length - 4, 4))}`
    : coupon.couponCode;

  const validUntil = coupon.validTo
    ? new Date(coupon.validTo).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <Animated.View style={[styles.couponCardWrapper, couponAnimStyle]}>
      <View style={styles.couponCard}>
        {/* Left accent strip */}
        <View style={[styles.couponAccent, isClaimed && { backgroundColor: Colors.success }]} />

        <View style={styles.couponContent}>
          {/* Top row: discount + badge */}
          <View style={styles.couponTopRow}>
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{discountDisplay}</Text>
            </View>
            {coupon.isFeatured && (
              <View style={styles.couponFeaturedBadge}>
                <Ionicons name="star" size={10} color={colors.brand.sand} />
                <Text style={styles.couponFeaturedText}>Featured</Text>
              </View>
            )}
          </View>

          {/* Title & description */}
          <Text style={styles.couponTitle} numberOfLines={1}>{coupon.title}</Text>
          {coupon.description ? (
            <Text style={styles.couponDescription} numberOfLines={2}>{coupon.description}</Text>
          ) : null}

          {/* Details row */}
          <View style={styles.couponDetailsRow}>
            {coupon.minOrderValue > 0 && (
              <Text style={styles.couponDetail}>
                Min. order: {currencySymbol}{coupon.minOrderValue}
              </Text>
            )}
            {coupon.maxDiscountCap > 0 && coupon.discountType === 'PERCENTAGE' && (
              <Text style={styles.couponDetail}>
                Max: {currencySymbol}{coupon.maxDiscountCap}
              </Text>
            )}
            {validUntil && (
              <Text style={styles.couponDetail}>
                Valid till {validUntil}
              </Text>
            )}
          </View>

          {/* Bottom row: code + claim button */}
          <View style={styles.couponBottomRow}>
            <View style={styles.couponCodeBox}>
              <Ionicons name="ticket-outline" size={13} color={isClaimed ? Colors.success : colors.brand.caramel} />
              <Text style={styles.couponCodeText}>
                {isClaimed ? coupon.couponCode : maskedCode}
              </Text>
            </View>

            <Pressable
              onPress={() => onClaim(coupon._id)}
              style={[
                styles.claimBtn,
                isClaimed && styles.claimBtnClaimed,
              ]}
             
              disabled={isClaiming || isClaimed}
            >
              {isClaiming ? (
                <ActivityIndicator size="small" color={Colors.text.inverse} />
              ) : (
                <>
                  <Ionicons
                    name={isClaimed ? 'checkmark-circle' : 'download-outline'}
                    size={14}
                    color={Colors.text.inverse}
                  />
                  <Text style={styles.claimBtnText}>
                    {isClaimed ? 'Claimed' : 'Claim'}
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          {/* Post-claim guidance */}
          {isClaimed && (
            <Pressable
              onPress={onViewMyCoupons}
              style={styles.claimedGuide}
            >
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={styles.claimedGuideText}>
                Coupon saved! Apply it at checkout or
              </Text>
              <Text style={styles.claimedGuideLink}> view my coupons</Text>
              <Ionicons name="chevron-forward" size={12} color={colors.brand.sand} />
            </Pressable>
          )}
        </View>
      </View>
    </Animated.View>
  );
});

// ─── Skeleton Card ───────────────────────────────────────────
const SkeletonCard = React.memo(({ index }: { index: number }) => {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0, { duration: 1000 })
      ),
      -1
    );
  }, [index]);

  const skeletonAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.3, 0.7]),
  }));

  return (
    <Animated.View style={[styles.skeletonCard, skeletonAnimStyle]}>
      <View style={styles.skeletonLogo} />
      <View style={[styles.skeletonLine, { width: '60%', marginTop: 12 }]} />
      <View style={[styles.skeletonLine, { width: '40%', marginTop: 8 }]} />
      <View style={[styles.skeletonLine, { width: '50%', marginTop: 8 }]} />
      <View style={styles.skeletonCta} />
    </Animated.View>
  );
});

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1ED',
  },
  listContent: {
    paddingBottom: 120,
  },
  couponListContent: {
    paddingBottom: 40,
    paddingHorizontal: Spacing.base,
  },

  // ── Sticky Header ──
  stickyHeader: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.base,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EDEAE6',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    marginBottom: 10,
    gap: 10,
  },
  backBtn: {
    width: Spacing['2xl'],
    height: Spacing['2xl'],
    borderRadius: Spacing.base,
    backgroundColor: '#F4F1ED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    ...Typography.h4,
    fontSize: 17,
    fontWeight: '700',
    color: Colors.nileBlue,
    letterSpacing: -0.3,
  },

  // ── Tab Switcher ──
  tabRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: BorderRadius.md,
    backgroundColor: '#F4F1ED',
  },
  tabActive: {
    backgroundColor: Colors.nileBlue,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C8A97',
  },
  tabTextActive: {
    color: Colors.text.inverse,
  },

  // ── Search ──
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F1ED',
    borderRadius: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 9 : 7,
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  searchBarFocused: {
    borderColor: colors.brand.sand,
    backgroundColor: '#FBF9F6',
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.nileBlue,
    paddingVertical: 0,
  },

  // ── Category Chips ──
  chipsScroll: {
    marginTop: 2,
  },
  chipsContent: {
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.primary,
    borderWidth: 1,
    borderColor: '#E8E2DB',
  },
  chipActive: {
    backgroundColor: Colors.nileBlue,
    borderColor: Colors.nileBlue,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C8A97',
  },
  chipTextActive: {
    color: Colors.text.inverse,
  },

  // ── Results Row ──
  resultsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  resultsText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#A0A8B1',
  },

  // ── Grid ──
  gridRow: {
    paddingHorizontal: Spacing.base,
    gap: 10,
  },

  // ── Gift Card ──
  cardWrapper: {
    flex: 1,
    marginBottom: 10,
  },
  card: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: 14,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#8B7355',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 6px rgba(139,115,85,0.07)' },
    }),
  },
  featuredBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.brand.sand,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    zIndex: 1,
  },
  featuredText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.text.inverse,
    letterSpacing: 0.2,
  },
  logoArea: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    backgroundColor: '#F8F6F3',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  logo: {
    width: 40,
    height: 40,
  },
  logoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.nileBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoInitial: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  brandName: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.nileBlue,
    textAlign: 'center',
    marginBottom: 2,
  },
  categoryLabel: {
    ...Typography.caption,
    fontWeight: '500',
    color: Colors.text.tertiary,
    textAlign: 'center',
    textTransform: 'capitalize',
    marginBottom: Spacing.xs,
  },
  denomRange: {
    ...Typography.caption,
    fontWeight: '500',
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  cashbackRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  cashbackRate: {
    ...Typography.h4,
    fontWeight: '800',
    color: colors.brand.sand,
    letterSpacing: -0.5,
  },
  cashbackLabel: {
    ...Typography.caption,
    fontWeight: '500',
    color: '#B0B8C1',
  },
  shopCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.nileBlue,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    width: '100%',
  },
  shopCtaText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.text.inverse,
  },

  // ── Coupon Card ──
  couponCardWrapper: {
    marginBottom: 10,
  },
  couponCard: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#8B7355',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 6px rgba(139,115,85,0.07)' },
    }),
  },
  couponAccent: {
    width: 5,
    backgroundColor: colors.brand.sand,
  },
  couponContent: {
    flex: 1,
    padding: 14,
  },
  couponTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  discountBadge: {
    backgroundColor: Colors.nileBlue,
    paddingHorizontal: 10,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  discountText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.text.inverse,
    letterSpacing: -0.3,
  },
  couponFeaturedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  couponFeaturedText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.brand.sand,
  },
  couponTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginBottom: 2,
  },
  couponDescription: {
    ...Typography.bodySmall,
    color: '#7C8A97',
    lineHeight: 17,
    marginBottom: Spacing.sm,
  },
  couponDetailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  couponDetail: {
    ...Typography.caption,
    fontWeight: '500',
    color: Colors.text.tertiary,
  },
  couponBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  couponCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FBF9F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: '#EDEAE6',
    borderStyle: 'dashed',
  },
  couponCodeText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.nileBlue,
    letterSpacing: 0.5,
  },
  claimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.nileBlue,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: 10,
  },
  claimBtnClaimed: {
    backgroundColor: Colors.success,
  },
  claimBtnText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  claimedGuide: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0EDE8',
    gap: 4,
  },
  claimedGuideText: {
    fontSize: 11,
    color: '#7C8A97',
    flex: 1,
  },
  claimedGuideLink: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.brand.sand,
  },

  // ── Footer ──
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  footerText: {
    fontSize: 13,
    color: '#A0A8B1',
    fontWeight: '500',
  },
  footerEnd: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    gap: 10,
  },
  footerDot: {
    width: Spacing.xs,
    height: Spacing.xs,
    borderRadius: 2,
    backgroundColor: '#D5CFC7',
  },
  footerEndText: {
    ...Typography.bodySmall,
    color: '#B0A99F',
    fontWeight: '500',
  },

  // ── Empty ──
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: Spacing['2xl'],
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(212,160,122,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#A0A8B1',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
  },
  emptyResetBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 9,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.nileBlue,
  },
  emptyResetText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.inverse,
  },

  // ── Skeleton ──
  skeletonContainer: {
    paddingTop: Spacing.base,
    paddingHorizontal: Spacing.base,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  skeletonCard: {
    width: '48.5%' as any,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  skeletonLogo: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    backgroundColor: '#EFEBE6',
  },
  skeletonLine: {
    height: 10,
    backgroundColor: '#EFEBE6',
    borderRadius: 5,
    alignSelf: 'center',
  },
  skeletonCta: {
    width: '100%',
    height: 32,
    borderRadius: 10,
    backgroundColor: '#EFEBE6',
    marginTop: 12,
  },
});

export default withErrorBoundary(BuyCouponsPage, 'CashStoreBuyCoupons');
