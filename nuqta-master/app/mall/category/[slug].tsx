// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Category Stores Page
 *
 * Displays stores within a specific category for Nuqta Mall
 * Modern, premium design with smooth animations
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Text,
  Pressable,
  Platform,
  Dimensions,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import CachedImage from '@/components/ui/CachedImage';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

import { mallApi } from '../../../services/mallApi';
import MallEmptyState from '../../../components/mall/pages/MallEmptyState';
import MallLoadingSkeleton from '../../../components/mall/pages/MallLoadingSkeleton';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Modern Store Card Component
interface StoreCardProps {
  store: any;
  onPress: (store: any) => void;
  index: number;
}

const StoreCard: React.FC<StoreCardProps> = ({ store, onPress, index }) => {
  const [imageError, setImageError] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const storeImage = store.logo || (store.banner && store.banner[0]);

  // Calculate coin reward
  const coinReward = store.deliveryCategories?.mall?.coinRewardPercentage || 5;

  return (
    <Pressable
      style={styles.storeCard}
      onPress={() => onPress(store)}
     
    >
      {/* Card Background Gradient */}
      <LinearGradient
        colors={[Colors.background.primary, Colors.background.secondary]}
        style={styles.cardGradient}
      >
        {/* Top Row: Image + Info */}
        <View style={styles.cardTopRow}>
          {/* Store Image */}
          <View style={styles.imageWrapper}>
            {!imageError && storeImage ? (
              <CachedImage
                source={storeImage}
                style={styles.storeImage}
                contentFit="cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <LinearGradient
                colors={[Colors.warning, colors.warningScale[700]]}
                style={styles.imageFallback}
              >
                <Text style={styles.fallbackText}>{getInitials(store.name)}</Text>
              </LinearGradient>
            )}
            {/* Coin Badge */}
            <View style={styles.coinBadge}>
              <Text style={styles.coinBadgeText}>{coinReward}%</Text>
            </View>
          </View>

          {/* Store Info */}
          <View style={styles.storeInfo}>
            <View style={styles.nameContainer}>
              <Text style={styles.storeName} numberOfLines={1}>
                {store.name}
              </Text>
              {store.isVerified && (
                <Ionicons name="checkmark-circle" size={16} color={Colors.warning} />
              )}
            </View>

            {/* Rating Row */}
            <View style={styles.ratingContainer}>
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={12} color={Colors.text.inverse} />
                <Text style={styles.ratingValue}>
                  {store.ratings?.average?.toFixed(1) || '4.5'}
                </Text>
              </View>
              <Text style={styles.ratingCount}>
                ({store.ratings?.count || 0} reviews)
              </Text>
            </View>

            {/* Location */}
            {store.location?.city && (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color={Colors.text.tertiary} />
                <Text style={styles.locationText}>{store.location.city}</Text>
              </View>
            )}

            {/* Reward Text */}
            <View style={styles.rewardContainer}>
              <Ionicons name="gift-outline" size={14} color={Colors.warning} />
              <Text style={styles.rewardText}>Earn {coinReward}% {BRAND.COIN_NAME}</Text>
            </View>
          </View>

          {/* Arrow */}
          <View style={styles.arrowContainer}>
            <Ionicons name="chevron-forward" size={22} color={Colors.border.default} />
          </View>
        </View>

        {/* Bottom Row: Badges */}
        <View style={styles.badgesContainer}>
          {store.isFeatured && (
            <View style={[styles.badge, styles.featuredBadge]}>
              <Ionicons name="star" size={10} color={Colors.text.inverse} />
              <Text style={styles.badgeText}>Featured</Text>
            </View>
          )}
          {store.offers?.isPartner && (
            <View style={[styles.badge, styles.partnerBadge]}>
              <Ionicons name="ribbon" size={10} color={Colors.text.inverse} />
              <Text style={styles.badgeText}>Partner</Text>
            </View>
          )}
          {store.deliveryCategories?.mall?.isPremium && (
            <View style={[styles.badge, styles.premiumBadge]}>
              <Ionicons name="diamond" size={10} color={Colors.text.inverse} />
              <Text style={styles.badgeText}>Premium</Text>
            </View>
          )}
          {store.category?.name && (
            <View style={[styles.badge, styles.categoryBadge]}>
              <Text style={styles.categoryBadgeText}>{store.category.name}</Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </Pressable>
  );
};

function CategoryStoresPage() {
  const params = useLocalSearchParams<{ slug: string }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const isMounted = useIsMounted();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [category, setCategory] = useState<any>(null);
  const [stores, setStores] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const LIMIT = 20;

  const fetchCategoryStores = useCallback(async (
    pageNum: number = 1,
    append: boolean = false
  ) => {
    if (!slug) return;

    try {
      setError(null);
      const result = await mallApi.getMallStoresByCategorySlug(slug, pageNum, LIMIT);

      if (!isMounted()) return;
      setCategory(result.category);
      if (!isMounted()) return;
      setTotal(result.total);
      if (!isMounted()) return;
      setTotalPages(result.pages);

      if (append) {
        if (!isMounted()) return;
        setStores(prev => [...prev, ...result.stores]);
      } else {
        if (!isMounted()) return;
        setStores(result.stores);
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Failed to load category');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
      if (!isMounted()) return;
      setIsRefreshing(false);
      if (!isMounted()) return;
      setIsLoadingMore(false);
    }
  }, [slug]);

  useEffect(() => {
    setIsLoading(true);
    setPage(1);
    fetchCategoryStores(1, false);
  }, [slug]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setPage(1);
    fetchCategoryStores(1, false);
  }, [fetchCategoryStores]);

  const handleLoadMore = useCallback(() => {
    if (isLoadingMore || page >= totalPages) {
      return;
    }
    setIsLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    fetchCategoryStores(nextPage, true);
  }, [page, totalPages, isLoadingMore, fetchCategoryStores]);

  const handleStorePress = useCallback((store: any) => {
    // Navigate to main store page
    router.push(`/MainStorePage?storeId=${store._id}` as any);
  }, [router]);

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => (
    <StoreCard store={item} onPress={handleStorePress} index={index} />
  ), [handleStorePress]);

  const keyExtractor = useCallback((item: any) =>
    item._id || item.id, []);

  const ListHeader = useCallback(() => (
    <View>
      {/* Hero Section */}
      <LinearGradient
        colors={[category?.color || Colors.warning, Colors.nileBlue]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.heroSection, { paddingTop: insets.top + 60 }]}
      >
        {/* Decorative Elements */}
        <View style={styles.heroDecoration}>
          <View style={[styles.decorCircle, styles.decorCircle1]} />
          <View style={[styles.decorCircle, styles.decorCircle2]} />
          <View style={[styles.decorCircle, styles.decorCircle3]} />
        </View>

        {/* Category Icon */}
        <View style={styles.categoryIconContainer}>
          {category?.icon ? (
            <Text style={styles.categoryIconEmoji}>{category.icon}</Text>
          ) : (
            <Ionicons name="grid-outline" size={40} color={Colors.text.inverse} />
          )}
        </View>

        {/* Category Name */}
        <Text style={styles.categoryTitle}>{category?.name || 'Category'}</Text>

        {/* Description */}
        {category?.description && (
          <Text style={styles.categoryDescription}>{category.description}</Text>
        )}

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{total}</Text>
            <Text style={styles.statLabel}>Stores</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <View style={styles.coinIconContainer}>
              <Ionicons name="gift" size={18} color={colors.brand.goldBright} />
            </View>
            <Text style={styles.statLabel}>Earn Coins</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Results Header */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsTitle}>All Stores</Text>
        <Text style={styles.resultsCount}>{stores.length} of {total}</Text>
      </View>
    </View>
  ), [category, stores.length, total, insets.top]);

  const ListFooter = useCallback(() => {
    if (isLoadingMore) {
      return (
        <View style={styles.loadingMore}>
          <ActivityIndicator size="small" color={Colors.warning} />
          <Text style={styles.loadingMoreText}>Loading more stores...</Text>
        </View>
      );
    }
    return <View style={{ height: insets.bottom + 100 }} />;
  }, [isLoadingMore, insets.bottom]);

  const ListEmpty = useCallback(() => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyContainer}>
        <MallEmptyState
          title="No stores yet"
          message="We're adding more stores to this category soon!"
          icon="storefront-outline"
          actionLabel="Browse Mall"
          onAction={() => router.push('/mall' as any)}
        />
      </View>
    );
  }, [isLoading, router]);

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.container}>
          <MallLoadingSkeleton count={6} type="list" />
        </View>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.container}>
          <MallEmptyState
            title="Something went wrong"
            message={error}
            icon="alert-circle-outline"
            actionLabel="Try Again"
            onAction={handleRefresh}
          />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.container}>
        {/* Custom Back Button */}
        <Pressable
          style={[styles.backButton, { top: insets.top + 10 }]}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
         
        >
          <View style={styles.backButtonInner}>
            <Ionicons name="arrow-back" size={22} color={Colors.text.inverse} />
          </View>
        </Pressable>

        <FlashList
          data={stores}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={ListFooter}
          ListEmptyComponent={ListEmpty}
          estimatedItemSize={100}
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
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    zIndex: 100,
  },
  backButtonInner: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 120,
  },
  // Hero Section
  heroSection: {
    paddingBottom: 30,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  heroDecoration: {
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
    top: -50,
    right: -50,
  },
  decorCircle2: {
    width: 150,
    height: 150,
    bottom: -30,
    left: -30,
  },
  decorCircle3: {
    width: 80,
    height: 80,
    top: 60,
    left: 40,
  },
  categoryIconContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  categoryIconEmoji: {
    fontSize: 40,
  },
  categoryTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.text.inverse,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  categoryDescription: {
    ...Typography.body,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: BorderRadius.lg,
    paddingVertical: 14,
    paddingHorizontal: Spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statCard: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  statNumber: {
    ...Typography.h1,
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
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  coinIconContainer: {
    marginBottom: 2,
  },
  // Results Header
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  resultsTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  resultsCount: {
    ...Typography.body,
    fontWeight: '500',
    color: Colors.text.tertiary,
  },
  // Store Card
  storeCard: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardGradient: {
    padding: Spacing.base,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageWrapper: {
    position: 'relative',
  },
  storeImage: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.lg,
  },
  imageFallback: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    ...Typography.h2,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  coinBadge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    backgroundColor: Colors.warning,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.background.primary,
  },
  coinBadgeText: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  storeInfo: {
    flex: 1,
    marginLeft: 14,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  storeName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text.primary,
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 6,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.warning,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  ratingValue: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  ratingCount: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 6,
  },
  locationText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rewardText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.warning,
  },
  arrowContainer: {
    paddingLeft: Spacing.sm,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.background.secondary,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.sm,
  },
  badgeText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  featuredBadge: {
    backgroundColor: Colors.warning,
  },
  partnerBadge: {
    backgroundColor: Colors.brand.purpleLight,
  },
  premiumBadge: {
    backgroundColor: colors.brand.pink,
  },
  categoryBadge: {
    backgroundColor: Colors.border.default,
  },
  categoryBadgeText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  // Loading & Empty States
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
  emptyContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 40,
  },
});

export default withErrorBoundary(CategoryStoresPage, 'MallCategorySlug');
