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
  Linking,
  Modal,
  StatusBar,
  Dimensions
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { platformAlertConfirm } from '@/utils/platformAlert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import cashStoreApi from '../../services/cashStoreApi';
import { CashStoreBrand, CashStoreCategoryFilter } from '../../types/cash-store.types';
import CashStoreBrandCard from '../../components/cash-store/pages/CashStoreBrandCard';
import { colors } from '@/constants/theme';
import { catchAndWarn } from '@/utils/catchAndReport';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Types ──────────────────────────────────────────────────
type SortOption = 'rating' | 'cashback-high' | 'cashback-low' | 'name-asc' | 'newest';

const SORT_OPTIONS: { key: SortOption; label: string; icon: string }[] = [
  { key: 'rating', label: 'Best Match', icon: 'star' },
  { key: 'cashback-high', label: 'Highest Cashback', icon: 'trending-up' },
  { key: 'cashback-low', label: 'Lowest Cashback', icon: 'trending-down' },
  { key: 'newest', label: 'Newest First', icon: 'time' },
  { key: 'name-asc', label: 'Name (A-Z)', icon: 'text' },
];

const PAGE_SIZE = 20;

// ─── Transform backend MallBrand → CashStoreBrand ───────────
function transformToCashStoreBrand(brand: any): CashStoreBrand {
  return {
    _id: brand._id,
    id: brand._id,
    name: brand.name || '',
    slug: brand.slug || '',
    logo: brand.logo || '',
    description: brand.description,
    category: brand.mallCategory?.name || brand.mallCategory?.slug || '',
    brandType: brand.externalUrl ? 'affiliate' : 'in-app',
    cashbackRate: brand.cashback?.percentage || 0,
    maxCashback: brand.cashback?.maxAmount,
    minPurchase: brand.cashback?.minPurchase,
    externalUrl: brand.externalUrl,
    storeId: brand.storeId,
    isActive: brand.isActive ?? true,
    isFeatured: brand.isFeatured ?? false,
    isTopBrand: brand.isFeatured ?? false,
    rating: brand.ratings?.average,
    ratingCount: brand.ratings?.count,
    successRate: brand.ratings?.successRate,
    createdAt: brand.createdAt,
    updatedAt: brand.updatedAt,
  };
}

// ─── Main Component ─────────────────────────────────────────
function CashStoreBrandsPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { filter } = useLocalSearchParams<{ filter?: string }>();
  const insets = useSafeAreaInsets();
  const isFirstSearch = useRef(true);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const clickingRef = useRef(false);
  const [searchFocused, setSearchFocused] = useState(false);

  // Data
  const [brands, setBrands] = useState<CashStoreBrand[]>([]);
  const [categories, setCategories] = useState<CashStoreCategoryFilter[]>([]);
  const [totalBrands, setTotalBrands] = useState(0);

  // Filters — apply URL filter param as initial category
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(filter || 'all');
  const [sortBy, setSortBy] = useState<SortOption>(filter === 'high-cashback' ? 'cashback-high' : 'rating');
  const [showSortModal, setShowSortModal] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Debounced Search ─────────────────────────────────────
  useEffect(() => {
    if (isFirstSearch.current) {
      isFirstSearch.current = false;
      return;
    }
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [searchQuery]);

  // ─── Fetch Categories ─────────────────────────────────────
  useEffect(() => {
    const loadCategories = async () => {
      const cats = await cashStoreApi.getCategories();
      if (!isMounted()) return;
      setCategories(cats);
    };
    loadCategories();
  }, []);

  // ─── Fetch Brands ─────────────────────────────────────────
  const fetchBrands = useCallback(async (pageNum: number, append: boolean) => {
    try {
      setError(null);
      let data: any[] = [];
      let total = 0;

      if (debouncedSearch.length >= 2) {
        const result = await cashStoreApi.searchBrands(debouncedSearch, PAGE_SIZE);
        data = result.brands;
        total = result.total;
      } else {
        const params: any = { limit: PAGE_SIZE, page: pageNum, sort: sortBy };
        if (selectedCategory === 'most-popular') {
          params.filter = 'popular';
        } else if (selectedCategory === 'high-cashback') {
          params.filter = 'high-cashback';
        } else if (selectedCategory !== 'all') {
          params.category = selectedCategory;
        }
        const result = await cashStoreApi.getBrands(params);
        data = result.brands;
        total = result.total;
      }

      const mapped = data.map(transformToCashStoreBrand);
      if (append) {
        setBrands(prev => [...prev, ...mapped]);
      } else {
        if (!isMounted()) return;
        setBrands(mapped);
      }
      if (!isMounted()) return;
      setTotalBrands(total);
      if (!isMounted()) return;
      setHasMore(mapped.length >= PAGE_SIZE);
    } catch (err) {
      if (!append) {
        if (!isMounted()) return;
        setError('Unable to load brands. Pull down to retry.');
      }
    }
  }, [debouncedSearch, selectedCategory, sortBy]);

  // Trigger fetch on filter changes
  useEffect(() => {
    setPage(1);
    setIsLoading(true);
    fetchBrands(1, false).finally(() => setIsLoading(false));
  }, [debouncedSearch, selectedCategory, sortBy]);

  // ─── Handlers ─────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setPage(1);
    await fetchBrands(1, false);
    if (!isMounted()) return;
    setIsRefreshing(false);
  }, [fetchBrands]);

  const handleLoadMore = useCallback(() => {
    if (isLoadingMore || !hasMore || debouncedSearch.length >= 2) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    fetchBrands(nextPage, true).finally(() => setIsLoadingMore(false));
  }, [isLoadingMore, hasMore, page, fetchBrands, debouncedSearch]);

  const handleBrandPress = useCallback(async (brand: CashStoreBrand) => {
    if (clickingRef.current) return;
    clickingRef.current = true;

    try {
      if (brand.externalUrl) {
        // Retry up to 2 times for tracking
        let trackingUrl: string | undefined;
        for (let attempt = 0; attempt <= 2; attempt++) {
          try {
            const result = await cashStoreApi.trackAffiliateClick(brand._id);
            trackingUrl = result?.trackingUrl || brand.externalUrl;
            break;
          } catch (err) {
            if (attempt === 2) throw err;
            await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 500));
          }
        }

        const url = trackingUrl || brand.externalUrl;
        if (!url) throw new Error('No URL available');

        await WebBrowser.openBrowserAsync(url, {
          toolbarColor: Colors.nileBlue,
          controlsColor: colors.background.primary,
        });
      } else if (brand.storeId) {
        router.push(`/MainStorePage?storeId=${brand.storeId}` as any);
      }
    } catch (error) {
      if (brand.externalUrl) {
        platformAlertConfirm(
          'Tracking Issue',
          'Your cashback may not be tracked. Open anyway?',
          () => { try { Linking.openURL(brand.externalUrl!); } catch (e) { catchAndWarn(e, 'CashStoreBrands/openURL'); } },
          'Open Anyway'
        );
      }
    } finally {
      setTimeout(() => { clickingRef.current = false; }, 1000);
    }
  }, [router]);

  const handleCategorySelect = useCallback((slug: string) => {
    setSelectedCategory(slug);
    setSearchQuery('');
    setDebouncedSearch('');
    isFirstSearch.current = true;
  }, []);

  const handleSortSelect = useCallback((sort: SortOption) => {
    setSortBy(sort);
    setShowSortModal(false);
  }, []);

  const currentSortLabel = useMemo(() => {
    return SORT_OPTIONS.find(s => s.key === sortBy)?.label || 'Best Match';
  }, [sortBy]);

  // ─── Render Brand Card ────────────────────────────────────
  const renderBrandCard = useCallback(({ item, index }: { item: CashStoreBrand; index: number }) => (
    <CashStoreBrandCard brand={item} index={index} onPress={handleBrandPress} />
  ), [handleBrandPress]);

  const keyExtractor = useCallback((item: CashStoreBrand) => item._id, []);

  // ─── List Header (scrolls with content) ─────────────────
  const ListHeader = useMemo(() => (
    <View>
      {/* Category Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsContent}
        style={styles.chipsScroll}
      >
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.slug;
          return (
            <Pressable
              key={cat._id}
              onPress={() => handleCategorySelect(cat.slug)}
             
              style={styles.chipTouchable}
            >
              {isActive ? (
                <LinearGradient
                  colors={[colors.nileBlue, colors.brand.nileBlueLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.chip, styles.chipActive]}
                >
                  {cat.icon ? (
                    <Ionicons name={cat.icon as any} size={12} color={Colors.text.inverse} />
                  ) : null}
                  <Text style={[styles.chipText, styles.chipTextActive]}>
                    {cat.name}
                  </Text>
                </LinearGradient>
              ) : (
                <View style={styles.chip}>
                  {cat.icon ? (
                    <Ionicons name={cat.icon as any} size={12} color="#7C8A97" />
                  ) : null}
                  <Text style={styles.chipText}>
                    {cat.name}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Sort + Results Count */}
      <View style={styles.sortRow}>
        <View style={styles.resultsWrap}>
          <Text style={styles.resultsText}>
            {debouncedSearch.length >= 2
              ? `${brands.length} result${brands.length !== 1 ? 's' : ''}`
              : `${totalBrands > 0 ? totalBrands : '—'} brands`
            }
          </Text>
          {selectedCategory !== 'all' && (
            <Pressable
              onPress={() => handleCategorySelect('all')}
              style={styles.clearFilterBtn}
            >
              <Ionicons name="close-circle" size={12} color={Colors.text.tertiary} />
              <Text style={styles.clearFilterText}>Clear</Text>
            </Pressable>
          )}
        </View>
        <Pressable
          onPress={() => setShowSortModal(true)}
          style={styles.sortBtn}
        >
          <Ionicons name="swap-vertical" size={13} color={Colors.nileBlue} />
          <Text style={styles.sortBtnText}>{currentSortLabel}</Text>
          <Ionicons name="chevron-down" size={11} color="#B0B8C1" />
        </Pressable>
      </View>
    </View>
  ), [categories, selectedCategory, sortBy, currentSortLabel, brands.length, debouncedSearch, totalBrands, handleCategorySelect]);

  // ─── List Footer ──────────────────────────────────────────
  const ListFooter = useMemo(() => {
    if (isLoadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={Colors.nileBlue} />
          <Text style={styles.footerText}>Loading more brands...</Text>
        </View>
      );
    }
    if (!hasMore && brands.length > 0) {
      return (
        <View style={styles.footerEnd}>
          <View style={styles.footerLine} />
          <View style={styles.footerEndBadge}>
            <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
            <Text style={styles.footerEndText}>You've seen all brands</Text>
          </View>
          <View style={styles.footerLine} />
        </View>
      );
    }
    return <View style={{ height: 20 }} />;
  }, [isLoadingMore, hasMore, brands.length]);

  // ─── Empty State ──────────────────────────────────────────
  const ListEmpty = useMemo(() => {
    if (isLoading) return null;

    // Error state with retry
    if (error && brands.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconWrap, { backgroundColor: 'rgba(232,116,79,0.1)' }]}>
            <Ionicons name="cloud-offline-outline" size={28} color="#E8744F" />
          </View>
          <Text style={styles.emptyTitle}>Something went wrong</Text>
          <Text style={styles.emptySubtitle}>{error}</Text>
          <Pressable
            onPress={handleRefresh}
            style={styles.emptyResetBtn}
          >
            <Text style={styles.emptyResetText}>Try Again</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconWrap}>
          <Ionicons
            name={debouncedSearch.length >= 2 ? 'search-outline' : 'storefront-outline'}
            size={28}
            color="#C4956A"
          />
        </View>
        <Text style={styles.emptyTitle}>
          {debouncedSearch.length >= 2 ? 'No brands found' : 'No brands yet'}
        </Text>
        <Text style={styles.emptySubtitle}>
          {debouncedSearch.length >= 2
            ? `Try a different search term`
            : 'Brands will appear here soon.'
          }
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
  }, [isLoading, debouncedSearch, selectedCategory, error, brands.length, handleRefresh]);

  // ─── Loading Skeleton ─────────────────────────────────────
  if (isLoading && brands.length === 0) {
    const skeletonTop = Platform.OS === 'web' ? 0 : insets.top;
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={[styles.stickyHeader, { paddingTop: skeletonTop }]}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={20} color={Colors.nileBlue} />
            </Pressable>
            <Text style={styles.headerTitle}>Brands</Text>
            <View style={{ width: 36 }} />
          </View>
          {/* Skeleton search bar */}
          <View style={styles.searchBarSkeleton} />
        </View>
        {/* Skeleton chips */}
        <View style={styles.skeletonChipsRow}>
          {Array.from({ length: 5 }).map((_, i) => (
            <View key={i} style={[styles.skeletonChip, { width: 70 + (i % 3) * 20 }]} />
          ))}
        </View>
        <View style={styles.skeletonContainer}>
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} index={i} />
          ))}
        </View>
      </View>
    );
  }

  // ─── Main Render ──────────────────────────────────────────
  const headerTop = Platform.OS === 'web' ? 0 : insets.top;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Sticky Header */}
      <View style={[styles.stickyHeader, { paddingTop: headerTop }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={Colors.nileBlue} />
          </Pressable>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Brands</Text>
            {totalBrands > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>
                  {totalBrands >= 1000 ? '1K+' : totalBrands}
                </Text>
              </View>
            )}
          </View>
          <Pressable
            onPress={() => setShowSortModal(true)}
            style={styles.headerSortBtn}
          >
            <Ionicons name="options-outline" size={18} color={Colors.nileBlue} />
          </Pressable>
        </View>

        {/* Search */}
        <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
          <Ionicons name="search" size={16} color={searchFocused ? colors.nileBlue : '#94A3B8'} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search brands, stores..."
            placeholderTextColor="#94A3B8"
            returnKeyType="search"
            selectionColor="rgba(26,58,82,0.3)"
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
              <View style={styles.searchClearBtn}>
                <Ionicons name="close" size={12} color={Colors.text.inverse} />
              </View>
            </Pressable>
          )}
        </View>
      </View>

      <FlashList
        data={brands}
        renderItem={renderBrandCard}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        ListEmptyComponent={ListEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.nileBlue}
            colors={[Colors.nileBlue]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        estimatedItemSize={100}
      />

      {/* Sort Modal — Premium Bottom Sheet */}
      <Modal
        visible={showSortModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSortModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
         
          onPress={() => setShowSortModal(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sort By</Text>
              <Pressable
                onPress={() => setShowSortModal(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={18} color={Colors.text.tertiary} />
              </Pressable>
            </View>
            {SORT_OPTIONS.map((option, index) => {
              const isActive = sortBy === option.key;
              return (
                <Pressable
                  key={option.key}
                  onPress={() => handleSortSelect(option.key)}
                  style={[styles.modalOption, isActive && styles.modalOptionActive]}
                >
                  <View style={[styles.modalOptionIcon, isActive && styles.modalOptionIconActive]}>
                    <Ionicons
                      name={option.icon as any}
                      size={16}
                      color={isActive ? colors.background.primary : colors.neutral[400]}
                    />
                  </View>
                  <Text style={[styles.modalOptionText, isActive && styles.modalOptionTextActive]}>
                    {option.label}
                  </Text>
                  {isActive && (
                    <View style={styles.modalCheckCircle}>
                      <Ionicons name="checkmark" size={14} color={Colors.text.inverse} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Skeleton Card ──────────────────────────────────────────
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

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.3, 0.8]),
  }));

  return (
    <Animated.View style={[styles.skeletonCard, animatedStyle]}>
      <View style={styles.skeletonLogo} />
      <View style={styles.skeletonInfo}>
        <View style={[styles.skeletonLine, { width: '60%', height: 12 }]} />
        <View style={[styles.skeletonLine, { width: '40%', height: 8, marginTop: 8 }]} />
        <View style={[styles.skeletonLine, { width: '25%', height: 8, marginTop: 6 }]} />
      </View>
      <View style={styles.skeletonCashback}>
        <View style={[styles.skeletonLine, { width: 36, height: 18, borderRadius: 4 }]} />
        <View style={[styles.skeletonLine, { width: 24, height: 24, borderRadius: 12, marginTop: 6 }]} />
      </View>
    </Animated.View>
  );
});

// ─── Styles ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F5F0',
  },
  listContent: {
    paddingBottom: 120,
  },

  // ── Sticky Header ──
  stickyHeader: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: colors.nileBlue,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 8px rgba(26,58,82,0.06)',
      },
    }),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    marginBottom: Spacing.md,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: '#F4F1ED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    ...Typography.h3,
    fontWeight: '800',
    color: Colors.text.primary,
    letterSpacing: -0.5,
  },
  countBadge: {
    backgroundColor: '#F0F4F8',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: colors.slateGray,
  },
  headerSortBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: '#F4F1ED',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Search (inside header) ──
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F1ED',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 11 : 9,
    gap: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  searchBarFocused: {
    borderColor: Colors.nileBlue,
    backgroundColor: Colors.background.primary,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    fontWeight: '500',
    color: Colors.nileBlue,
    paddingVertical: 0,
  },
  searchClearBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBarSkeleton: {
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F0EBE4',
  },

  // ── Category Chips ──
  chipsScroll: {
    marginTop: 4,
  },
  chipsContent: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  chipTouchable: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.primary,
    borderWidth: 1,
    borderColor: '#E8E2DB',
  },
  chipActive: {
    borderColor: 'transparent',
  },
  chipText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: '#7C8A97',
  },
  chipTextActive: {
    color: Colors.text.inverse,
  },
  skeletonChipsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  skeletonChip: {
    height: 34,
    borderRadius: BorderRadius.xl,
    backgroundColor: '#EFEBE6',
  },

  // ── Sort Row ──
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingBottom: 8,
    paddingTop: 2,
  },
  resultsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultsText: {
    ...Typography.bodySmall,
    fontWeight: '500',
    color: '#94A3B8',
  },
  clearFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: '#F4F1ED',
  },
  clearFilterText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.primary,
    borderWidth: 1,
    borderColor: '#EDEAE6',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: { elevation: 1 },
      web: { boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
    }),
  },
  sortBtnText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.nileBlue,
  },

  // ── Footer ──
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 24,
  },
  footerText: {
    ...Typography.bodySmall,
    color: '#94A3B8',
    fontWeight: '500',
  },
  footerEnd: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    paddingHorizontal: 24,
    gap: 12,
  },
  footerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E8E2DB',
  },
  footerEndBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.successScale[50],
  },
  footerEndText: {
    ...Typography.bodySmall,
    color: Colors.success,
    fontWeight: '600',
  },

  // ── Empty ──
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: Spacing['2xl'],
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(196,149,106,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 6,
  },
  emptySubtitle: {
    ...Typography.body,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  emptyResetBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: Colors.nileBlue,
  },
  emptyResetText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.inverse,
  },

  // ── Sort Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    paddingHorizontal: Spacing.lg,
    paddingBottom: 44,
    paddingTop: 10,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.border.default,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.base,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    ...Typography.h4,
    fontWeight: '800',
    color: Colors.text.primary,
    letterSpacing: -0.3,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.lg,
    backgroundColor: '#F4F1ED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 4,
  },
  modalOptionActive: {
    backgroundColor: '#F0F4F8',
  },
  modalOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: '#F4F1ED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOptionIconActive: {
    backgroundColor: Colors.nileBlue,
  },
  modalOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#7C8A97',
  },
  modalOptionTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  modalCheckCircle: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Skeleton ──
  skeletonContainer: {
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.base,
    gap: 10,
  },
  skeletonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    backgroundColor: Colors.background.primary,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F0EBE4',
  },
  skeletonLogo: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#F0EBE4',
  },
  skeletonInfo: {
    flex: 1,
    gap: 0,
  },
  skeletonLine: {
    height: 10,
    backgroundColor: '#F0EBE4',
    borderRadius: 5,
  },
  skeletonCashback: {
    alignItems: 'center',
    gap: 0,
  },
});

export default withErrorBoundary(CashStoreBrandsPage, 'CashStoreBrands');
