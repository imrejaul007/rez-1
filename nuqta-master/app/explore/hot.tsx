// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { CardGridSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import exploreApi, { HotProduct } from '@/services/exploreApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import apiClient from '@/services/apiClient';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width } = Dimensions.get('window');

const sortOptions = [
  { id: 'trending', label: 'Trending' },
  { id: 'nearby', label: 'Nearby' },
  { id: 'cashback', label: 'Highest Cashback' },
  { id: 'price', label: 'Price: Low to High' },
];

const ExploreHotPage = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [selectedSort, setSelectedSort] = useState('trending');
  // hotItems is derived from rawHotItems + selectedSort via useMemo (instant sort, no API refetch)
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_LIMIT = 20;

  // Raw data from API — sorting is done via useMemo (no refetch on sort change)
  const [rawHotItems, setRawHotItems] = useState<HotProduct[]>([]);

  // Fetch hot deals from API — no dependency on selectedSort (sort is client-side only)
  const fetchHotDeals = useCallback(async (isRefresh = false, pageNum = 1) => {
    try {
      if (isRefresh || pageNum === 1) {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const response = await exploreApi.getHotDeals({ limit: PAGE_LIMIT, page: pageNum });

      if (response.success && response.data) {
        const products = response.data.products || [];
        if (!isMounted()) return;
        if (pageNum === 1) {
          setRawHotItems(products);
        } else {
          setRawHotItems(prev => [...prev, ...products]);
        }
        setPage(pageNum);
        setHasMore(products.length >= PAGE_LIMIT);
      } else {
        if (!isMounted()) return;
        setError(response.error || 'Failed to fetch hot deals');
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Something went wrong');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchHotDeals(false, 1);
  }, [fetchHotDeals]);

  const onRefresh = useCallback(() => {
    setPage(1);
    setHasMore(true);
    fetchHotDeals(true, 1);
  }, [fetchHotDeals]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    fetchHotDeals(false, page + 1);
  }, [loadingMore, hasMore, page, fetchHotDeals]);

  // Sorted view of raw data — instant sort without API refetch
  const hotItems = useMemo(() => {
    if (selectedSort === 'price') {
      return [...rawHotItems].sort((a, b) => a.price - b.price);
    }
    if (selectedSort === 'cashback') {
      return [...rawHotItems].sort((a, b) => {
        const aDiscount = ((a.originalPrice - a.price) / a.originalPrice) * 100;
        const bDiscount = ((b.originalPrice - b.price) / b.originalPrice) * 100;
        return bDiscount - aDiscount;
      });
    }
    return rawHotItems;
  }, [rawHotItems, selectedSort]);

  // Wishlist state
  const [wishlistedIds, setWishlistedIds] = useState<Set<string>>(new Set());

  const handleToggleWishlist = async (productId: string) => {
    const isWishlisted = wishlistedIds.has(productId);

    // Optimistic update
    setWishlistedIds(prev => {
      const next = new Set(prev);
      if (isWishlisted) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });

    try {
      if (isWishlisted) {
        await apiClient.delete(`/wishlists/items/${productId}`);
      } else {
        await apiClient.post('/wishlists/items', {
          itemType: 'product',
          itemId: productId,
        });
      }
    } catch (err) {
      // Revert on error
      if (!isMounted()) return;
      setWishlistedIds(prev => {
        const next = new Set(prev);
        if (isWishlisted) {
          next.add(productId);
        } else {
          next.delete(productId);
        }
        return next;
      });
    }
  };

  const navigateTo = (path: string) => {
    router.push(path as any);
  };

  const renderHotItem = useCallback(({ item }: { item: HotProduct }) => (
    <Pressable
      style={styles.itemCard}
      onPress={() => navigateTo(`/product-page?cardId=${item.id}&cardType=product`)}
    >
      <View style={styles.imageContainer}>
        {item.image && <CachedImage source={item.image} style={styles.itemImage} />}
        {item.offer && (
          <View style={styles.offerBadge}>
            <Text style={styles.offerText}>{item.offer}</Text>
          </View>
        )}
        {item.buyers && item.buyers > 0 && (
          <View style={styles.hotBadge}>
            <Ionicons name="flame" size={12} color={Colors.text.inverse} />
            <Text style={styles.hotText}>{item.buyers} bought</Text>
          </View>
        )}
        <Pressable
          style={styles.wishlistButton}
          onPress={(e) => {
            e.stopPropagation();
            handleToggleWishlist(item.id);
          }}
        >
          <Ionicons
            name={wishlistedIds.has(item.id) ? 'heart' : 'heart-outline'}
            size={20}
            color={wishlistedIds.has(item.id) ? Colors.error : Colors.text.inverse}
          />
        </Pressable>
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
        {item.store && (
          <View style={styles.storeRow}>
            <Ionicons name="storefront" size={12} color={Colors.text.tertiary} />
            <Text style={styles.storeName}>{item.store}</Text>
          </View>
        )}
        <View style={styles.priceRow}>
          {item.price > 0 && <Text style={styles.price}>{currencySymbol}{item.price.toLocaleString()}</Text>}
          {item.originalPrice > 0 && item.originalPrice !== item.price && (
            <Text style={styles.originalPrice}>{currencySymbol}{item.originalPrice.toLocaleString()}</Text>
          )}
        </View>
        <View style={styles.bottomRow}>
          {item.rating > 0 && (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={12} color={Colors.warning} />
              <Text style={styles.ratingText}>{item.rating}</Text>
              {item.reviews > 0 && <Text style={styles.reviewsText}>({item.reviews})</Text>}
            </View>
          )}
          {item.distance && (
            <View style={styles.distanceBadge}>
              <Ionicons name="location" size={12} color={Colors.text.tertiary} />
              <Text style={styles.distanceText}>{item.distance}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  ), [navigateTo, handleToggleWishlist, wishlistedIds, currencySymbol]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.nileBlue} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>What's Hot</Text>
          <Text style={styles.headerSubtitle}>{hotItems.length} items trending</Text>
        </View>
        <Pressable
          style={[styles.filterButton, selectedSort !== 'trending' && { backgroundColor: Colors.nileBlue }]}
          onPress={() => setSelectedSort('trending')}
        >
          <Ionicons name="options" size={22} color={selectedSort !== 'trending' ? Colors.text.inverse : Colors.nileBlue} />
        </Pressable>
      </View>

      {/* Sort Options */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.sortScroll}
        contentContainerStyle={styles.sortContainer}
      >
        {sortOptions.map((option) => (
          <Pressable
            key={option.id}
            style={[
              styles.sortChip,
              selectedSort === option.id && styles.sortChipActive,
            ]}
            onPress={() => setSelectedSort(option.id)}
          >
            <Text
              style={[
                styles.sortLabel,
                selectedSort === option.id && styles.sortLabelActive,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Hot Items Grid */}
      {loading && !refreshing ? (
        <CardGridSkeleton />
      ) : error ? (
        <View style={[styles.itemsScroll, styles.errorContainer]}>
          <Ionicons name="alert-circle" size={48} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={() => fetchHotDeals()}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      ) : (
        <FlashList
          data={hotItems}
          keyExtractor={(item) => item.id}
          estimatedItemSize={220}
          numColumns={2}
          style={styles.itemsScroll}
          contentContainerStyle={[styles.itemsContainer, { paddingBottom: 120 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.gold]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="flame-outline" size={48} color={Colors.text.tertiary} />
              <Text style={styles.emptyText}>No hot deals available</Text>
              <Text style={styles.emptySubtext}>Check back later for trending items</Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={Colors.gold} />
              </View>
            ) : null
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          renderItem={renderHotItem}
        />
      )}
      </SafeAreaView>
    </>
  );
};

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
    paddingVertical: Spacing.md,
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
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.nileBlue,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.neutral[500],
    marginTop: 2,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortScroll: {
    maxHeight: 50,
  },
  sortContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  sortChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.neutral[100],
    marginRight: 8,
  },
  sortChipActive: {
    backgroundColor: colors.nileBlue,
  },
  sortLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.neutral[500],
  },
  sortLabelActive: {
    color: colors.background.primary,
  },
  itemsScroll: {
    flex: 1,
  },
  itemsContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    minHeight: 200,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.neutral[500],
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: colors.lightMustard,
    borderRadius: 20,
  },
  retryButtonText: {
    color: colors.background.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[700],
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 14,
    color: colors.neutral[400],
  },
  grid: {
    justifyContent: 'space-between',
  },
  itemCard: {
    width: (width - 44) / 2,
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    overflow: 'hidden',
  },
  imageContainer: {
    height: 140,
    position: 'relative',
  },
  itemImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.neutral[100],
  },
  offerBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: colors.lightMustard,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  offerText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.background.primary,
  },
  hotBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  hotText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.background.primary,
  },
  wishlistButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContent: {
    padding: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.nileBlue,
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  storeName: {
    fontSize: 12,
    color: colors.neutral[500],
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.nileBlue,
  },
  originalPrice: {
    fontSize: 12,
    color: colors.neutral[400],
    textDecorationLine: 'line-through',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.warningScale[400],
  },
  reviewsText: {
    fontSize: 10,
    color: colors.neutral[400],
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  distanceText: {
    fontSize: 11,
    color: colors.neutral[500],
  },
});

export default withErrorBoundary(ExploreHotPage, 'ExploreHot');
