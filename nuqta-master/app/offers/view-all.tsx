// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// View All Offers Page
// Displays all offers in a grid layout with the same header as offers page

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Pressable,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { shareOffersPage } from '@/utils/shareUtils';
import { Offer } from '@/services/realOffersApi';
import { useAuthUser } from '@/stores/selectors';
import realOffersApi from '@/services/realOffersApi';
import { CardGridSkeleton } from '@/components/skeletons';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2; // 2 cards per row with padding
const PAGE_LIMIT = 20;

function ViewAllOffersScreen() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { category, discount, title } = useLocalSearchParams<{
    category?: string;
    discount?: string;
    title?: string;
  }>();
  const user = useAuthUser();
  const [allOffers, setAllOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [userPoints, setUserPoints] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Ref to track the current filter params and prevent stale appends
  const filterRef = useRef({ category, discount });

  // Get category display name
  const getCategoryTitle = () => {
    // Use custom title if provided
    if (title) return title;

    const categoryMap: { [key: string]: string } = {
      'mega': 'MEGA OFFERS',
      'student': 'Offer for the students',
      'new_arrival': 'New Arrivals',
      'trending': 'Trending Now',
      'discount': 'Discount Offers',
      'free-delivery': 'Free Delivery',
      'nearby': 'Nearby Offers',
      'bogo': 'Buy One Get One',
    };
    return categoryMap[category || ''] || 'All Offers';
  };

  // Fetch user points from API (same as offers page)
  const fetchUserPoints = async () => {
    try {
      const response = await realOffersApi.getOffersPageData();
      if (response.success && response.data) {
        const points = response.data.userEngagement?.userPoints ||
                       response.data.userPoints ||
                       user?.wallet?.balance || 0;
        if (!isMounted()) return;
        setUserPoints(points);
      }
    } catch {
      // Fallback to auth state
      if (!isMounted()) return;
      setUserPoints(user?.wallet?.balance || 0);
    }
  };

  const fetchOffers = useCallback(async (pageNum: number, append: boolean = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      // Capture filter state at the time of this request
      const currentFilter = { category, discount };

      const apiParams: Record<string, any> = {
        page: pageNum,
        limit: PAGE_LIMIT,
      };

      if (category) {
        apiParams.category = category;
      }

      const response = await realOffersApi.getOffers(apiParams);

      // If filters changed while we were fetching, discard this response
      if (filterRef.current.category !== currentFilter.category ||
          filterRef.current.discount !== currentFilter.discount) {
        return;
      }

      if (response.success && response.data) {
        const responseData = response.data as any;
        let offers: Offer[] = [];

        // Handle both paginated and array responses
        if (Array.isArray(responseData)) {
          offers = responseData;
        } else if (responseData.items && Array.isArray(responseData.items)) {
          offers = responseData.items;
          if (!isMounted()) return;
          setTotalCount(responseData.totalCount || 0);
        } else if (responseData.data && Array.isArray(responseData.data)) {
          offers = responseData.data;
        }

        // Apply client-side discount filter if needed
        if (discount) {
          offers = offers.filter((offer: any) => {
            if (discount === 'free_delivery') {
              return offer.isFreeDelivery === true;
            }
            const discountValue = parseInt(discount);
            if (discountValue === 25) {
              return offer.discountPercentage >= 25 && offer.discountPercentage < 50;
            } else if (discountValue === 50) {
              return offer.discountPercentage >= 50 && offer.discountPercentage < 80;
            } else if (discountValue === 80) {
              return offer.discountPercentage >= 80;
            }
            return offer.discountPercentage >= discountValue;
          });
        }

        const newHasMore = offers.length >= PAGE_LIMIT;
        if (!isMounted()) return;
        setHasMore(newHasMore);

        if (append) {
          if (!isMounted()) return;
          setAllOffers(prev => [...prev, ...offers]);
        } else {
          if (!isMounted()) return;
          setAllOffers(offers);
        }

        if (!append && offers.length === 0) {
          if (!isMounted()) return;
          setError('No offers found');
        }
      } else {
        if (pageNum === 1) {
          if (!isMounted()) return;
          setError((response as any).message || 'Failed to load offers');
        }
        if (!isMounted()) return;
        setHasMore(false);
      }
    } catch {
      if (pageNum === 1) {
        if (!isMounted()) return;
        setError('Failed to load offers');
      }
      if (!isMounted()) return;
      setHasMore(false);
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
      if (!isMounted()) return;
      setLoadingMore(false);
    }
  }, [category, discount]);

  // Reset and refetch when filters change
  useEffect(() => {
    filterRef.current = { category, discount };
    setPage(1);
    setHasMore(true);
    setAllOffers([]);
    fetchOffers(1, false);
    fetchUserPoints();
  }, [category, discount]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    fetchOffers(1, false);
  }, [fetchOffers]);

  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchOffers(nextPage, true);
  }, [page, loadingMore, hasMore, loading, fetchOffers]);

  const handleBack = () => {
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
  };

  const handleShare = async () => {
    try {
      await shareOffersPage();
    } catch {
      // silently handle
    }
  };

  const handleFavorite = () => {
    setIsFavorited(!isFavorited);
  };

  const handleOfferPress = useCallback((offer: Offer) => {
    router.push(`/offers/${offer._id}` as any);
  }, [router]);

  const ProductCard = React.memo(({ offer }: { offer: Offer }) => {
    const [imageError, setImageError] = React.useState(false);

    return (
      <Pressable
        style={styles.productCard}
        onPress={() => handleOfferPress(offer)}
      >
        {imageError || !offer.image ? (
          <View style={styles.productImagePlaceholder}>
            <Ionicons name="image-outline" size={32} color="#ccc" />
          </View>
        ) : (
          <CachedImage
            source={offer.image}
            style={styles.productImage}
            contentFit="cover"
            onError={() => {
              setImageError(true);
            }}
            onLoad={() => {
              setImageError(false);
            }}
          />
        )}

        <View style={styles.productInfo}>
          <ThemedText style={styles.productTitle} numberOfLines={2}>
            {offer.title}
          </ThemedText>
          <ThemedText style={styles.cashBack}>
            Upto {offer.cashbackPercentage}% cash back
          </ThemedText>
          {offer.store?.name && (
            <ThemedText style={styles.storeName} numberOfLines={1}>
              {offer.store.name}
            </ThemedText>
          )}
          {offer.distance && (
            <View style={styles.distanceContainer}>
              <Ionicons name="location-outline" size={12} color={colors.midGray} />
              <ThemedText style={styles.distance}>{offer.distance} km away</ThemedText>
            </View>
          )}
        </View>
      </Pressable>
    );
  });

  const renderItem = useCallback(({ item }: { item: Offer }) => (
    <ProductCard offer={item} />
  ), [handleOfferPress]);

  const ListHeader = useCallback(() => (
    <>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <ThemedText style={styles.sectionTitle}>{getCategoryTitle()}</ThemedText>
        <ThemedText style={styles.offersCount}>
          {totalCount > 0 ? `${totalCount} offers` : `${allOffers.length} offers`}
        </ThemedText>
      </View>

      {/* Loading State (initial load only) */}
      {loading && (
        <CardGridSkeleton />
      )}

      {/* Error State */}
      {error && !loading && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <Pressable style={styles.retryButton} onPress={() => { setPage(1); setHasMore(true); fetchOffers(1, false); }}>
            <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
          </Pressable>
        </View>
      )}
    </>
  ), [loading, error, allOffers.length, totalCount, category, title, discount]);

  const ListFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={Colors.brand.purple} />
      </View>
    );
  }, [loadingMore]);

  const ListEmpty = useCallback(() => {
    if (loading || error) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="ticket-outline" size={64} color="#ccc" />
        <ThemedText style={styles.emptyText}>No offers available</ThemedText>
      </View>
    );
  }, [loading, error]);

  const keyExtractor = useCallback((item: Offer) => item._id, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header - Same as Offers Page */}
      <LinearGradient
        colors={[colors.brand.purpleLight, colors.brand.purpleMedium]}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={Colors.text.inverse} />
          </Pressable>

          <View style={styles.headerCenter}>
            <Pressable
              style={styles.pointsContainer}
              onPress={() => router.push('/coins')}
            >
              <Ionicons name="star" size={16} color={colors.brand.goldBright} />
              <ThemedText style={styles.pointsText}>{userPoints}</ThemedText>
            </Pressable>
          </View>

          <View style={styles.headerRight}>
            <Pressable onPress={handleShare} style={styles.headerButton}>
              <Ionicons name="share-outline" size={20} color={Colors.text.inverse} />
            </Pressable>
            <Pressable onPress={handleFavorite} style={styles.headerButton}>
              <Ionicons
                name={isFavorited ? "heart" : "heart-outline"}
                size={20}
                color={isFavorited ? colors.error : "white"}
              />
            </Pressable>
          </View>
        </View>

        {/* Mega Offers Banner */}
        <View style={styles.bannerContainer}>
          <View style={styles.megaOffersBanner}>
            <ThemedText style={styles.megaOffersText}>MEGA</ThemedText>
            <View style={styles.offersTextContainer}>
              <ThemedText style={styles.offersText}>OFFERS</ThemedText>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Scalloped Edge */}
      <View style={styles.scalloped}>
        <View style={styles.scallopedInner} />
      </View>

      {/* Content - FlatList with virtualization */}
      <FlatList
        data={loading ? [] : allOffers}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.contentContainer}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        ListEmptyComponent={ListEmpty}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={8}
        windowSize={5}
        initialNumToRender={6}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        style={styles.content}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: 10,
    paddingBottom: 120,
    paddingHorizontal: Spacing.base,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.xl,
    gap: Spacing.xs,
  },
  pointsText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerContainer: {
    alignItems: 'center',
  },
  megaOffersBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  megaOffersText: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.text.inverse,
    backgroundColor: colors.brand.indigo,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    transform: [{ rotate: '-5deg' }],
  },
  offersTextContainer: {
    backgroundColor: colors.brand.goldBright,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    transform: [{ rotate: '5deg' }],
  },
  offersText: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.text.primary,
  },
  scalloped: {
    height: 20,
    backgroundColor: Colors.brand.purple,
    position: 'relative',
  },
  scallopedInner: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 20,
    backgroundColor: Colors.background.secondary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  content: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  contentContainer: {
    padding: Spacing.base,
    paddingBottom: 120,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  offersCount: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    gap: 15,
    marginBottom: 10,
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  productImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#f0f0f0',
  },
  productImagePlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  productTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  storeName: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginBottom: 2,
  },
  cashBack: {
    ...Typography.bodySmall,
    color: Colors.brand.purple,
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  distance: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: Spacing.md,
  },
  errorText: {
    ...Typography.bodyLarge,
    color: Colors.error,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.brand.purple,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: BorderRadius.sm,
    marginTop: 10,
  },
  retryButtonText: {
    color: Colors.text.inverse,
    ...Typography.body,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: Spacing.md,
  },
  emptyText: {
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});

export default withErrorBoundary(ViewAllOffersScreen, 'OffersViewAll');
