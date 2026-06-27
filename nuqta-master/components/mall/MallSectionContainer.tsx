/**
 * MallSectionContainer Component
 *
 * Main container that orchestrates all mall sections
 * with pull-to-refresh and loading states.
 *
 * Nuqta Mall = In-app delivery marketplace
 * - Fetches stores with deliveryCategories.mall === true
 * - Users browse stores, order products, earn Nuqta Coins
 * - Navigates to /store/[storeId] for store pages
 *
 * NOTE: This is different from Cash Store (affiliate cashback for external websites)
 */

import React, { memo, useCallback, useEffect } from 'react';
import { BRAND } from '@/constants/brand';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Text,
  Pressable,
  Platform,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, withRepeat } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { useMallSection } from '../../hooks/useMallSection';
import {
  MallBrand,
  MallCategory,
  MallCollection,
  MallOffer,
} from '../../types/mall.types';

// Section Components
import MallFeaturedBrands from './MallFeaturedBrands';
import MallCollections from './MallCollections';
import MallCategoriesGrid from './MallCategoriesGrid';
import MallExclusiveOffers from './MallExclusiveOffers';
import MallNewArrivals from './MallNewArrivals';
import MallTopRated from './MallTopRated';
import MallLuxuryZone from './MallLuxuryZone';
import MallDealsOfDay from './MallDealsOfDay';
import MallTrendingNow from './MallTrendingNow';
import MallRewardBoosters from './MallRewardBoosters';
import { colors } from '@/constants/theme';

// Skeleton shimmer component for loading state
const SkeletonPulse: React.FC<{ width: number | string; height: number; borderRadius?: number; style?: any }> = ({ width, height, borderRadius = 8, style }) => {
  const pulseAnim = useSharedValue(0.3);

  useEffect(() => {
    pulseAnim.value = withRepeat(withSequence(withTiming(1, { duration: 800 }), withTiming(0.3, { duration: 800 })), -1);
      }, []);

  return (
    <Animated.View
      style={[{ width, height, borderRadius, backgroundColor: colors.neutral[200], opacity: pulseAnim }, style]}
    />
  );
};

const MallSkeletonLoader: React.FC = () => (
  <View style={styles.skeletonContainer}>
    {/* Quick actions skeleton */}
    <View style={styles.skeletonQuickActions}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.skeletonQuickCard}>
          <SkeletonPulse width={40} height={40} borderRadius={12} />
          <SkeletonPulse width={50} height={10} style={{ marginTop: 8 }} />
        </View>
      ))}
    </View>
    {/* Section header skeleton */}
    <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
      <SkeletonPulse width={140} height={18} />
    </View>
    {/* Featured cards skeleton */}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 16, marginTop: 12 }}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={{ marginRight: 12 }}>
          <SkeletonPulse width={150} height={100} borderRadius={12} />
          <SkeletonPulse width={100} height={12} style={{ marginTop: 8 }} />
          <SkeletonPulse width={70} height={10} style={{ marginTop: 4 }} />
        </View>
      ))}
    </ScrollView>
    {/* Categories grid skeleton */}
    <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
      <SkeletonPulse width={120} height={18} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, gap: 12 }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <View key={i} style={{ alignItems: 'center', width: '28%' }}>
            <SkeletonPulse width={56} height={56} borderRadius={28} />
            <SkeletonPulse width={50} height={10} style={{ marginTop: 6 }} />
          </View>
        ))}
      </View>
    </View>
    {/* Another section skeleton */}
    <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
      <SkeletonPulse width={160} height={18} />
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 16, marginTop: 12 }}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={{ marginRight: 12 }}>
          <SkeletonPulse width={180} height={110} borderRadius={12} />
          <SkeletonPulse width={120} height={12} style={{ marginTop: 8 }} />
        </View>
      ))}
    </ScrollView>
  </View>
);

interface MallSectionContainerProps {
  onScrollToTop?: () => void;
}

const MallSectionContainer: React.FC<MallSectionContainerProps> = ({
  onScrollToTop,
}) => {
  const router = useRouter();
  const {
    featuredBrands,
    collections,
    categories,
    exclusiveOffers,
    newArrivals,
    topRatedBrands,
    luxuryBrands,
    trendingBrands,
    rewardBoosters,
    dealsOfDay,
    isLoading,
    isRefreshing,
    error,
    refresh,
    trackBrandClick,
  } = useMallSection();

  // Navigation handlers
  const handleBrandPress = useCallback(
    (brand: MallBrand) => {
      const storeId = brand.id || brand._id;
      trackBrandClick(storeId);

      // Nuqta Mall navigates to in-app store page (not external brand page)
      // The store page shows products, allows ordering, and users earn Nuqta Coins
      router.push(`/MainStorePage?storeId=${storeId}` as any);
    },
    [router, trackBrandClick]
  );

  const handleCategoryPress = useCallback(
    (category: MallCategory) => {
      // Navigate to category page
      router.push(`/mall/category/${category.slug}` as any);
    },
    [router]
  );

  const handleCollectionPress = useCallback(
    (collection: MallCollection) => {
      // Navigate to collection page
      router.push(`/mall/collection/${collection.slug}` as any);
    },
    [router]
  );

  const handleOfferPress = useCallback(
    (offer: MallOffer) => {
      if (offer.store) {
        router.push(`/MainStorePage?storeId=${offer.store._id}` as any);
      } else if (offer.brand) {
        const brandId = offer.brand.id || offer.brand._id;
        router.push(`/mall/brand/${brandId}` as any);
      } else {
        // Fallback: navigate to offers list if no direct target
        router.push('/mall/offers' as any);
      }
    },
    [router]
  );

  // View all handlers
  const handleViewAllFeatured = useCallback(() => {
    router.push('/mall/brands?filter=featured' as any);
  }, [router]);

  const handleViewAllCollections = useCallback(() => {
    router.push('/mall/collections' as any);
  }, [router]);

  const handleViewAllCategories = useCallback(() => {
    router.push('/mall/categories' as any);
  }, [router]);

  const handleViewAllOffers = useCallback(() => {
    router.push('/mall/offers' as any);
  }, [router]);

  const handleViewAllNewArrivals = useCallback(() => {
    router.push('/mall/brands?filter=new' as any);
  }, [router]);

  const handleViewAllTopRated = useCallback(() => {
    router.push('/mall/brands?filter=top-rated' as any);
  }, [router]);

  const handleViewAllLuxury = useCallback(() => {
    router.push('/mall/brands?filter=luxury' as any);
  }, [router]);

  const handleViewAllTrending = useCallback(() => {
    router.push('/mall/brands?filter=trending' as any);
  }, [router]);

  const handleViewAllRewardBoosters = useCallback(() => {
    router.push('/mall/brands?filter=reward-boosters' as any);
  }, [router]);

  const handleViewAllDeals = useCallback(() => {
    router.push('/mall/offers' as any);
  }, [router]);

  // Quick actions handlers for new pages
  const handleAllianceStores = useCallback(() => {
    router.push('/mall/alliance-store' as any);
  }, [router]);

  const handleLowestPrice = useCallback(() => {
    router.push('/mall/lowest-price' as any);
  }, [router]);

  // Debug logging

  // Error state
  if (error && !isLoading && !featuredBrands.length) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Unable to load mall content</Text>
        <Text style={styles.errorSubtext}>{error}</Text>
        <Text style={styles.errorSubtext}>Pull down to try again</Text>
      </View>
    );
  }

  // Initial loading state - skeleton loader
  if (isLoading && !featuredBrands.length) {
    return <MallSkeletonLoader />;
  }

  // Empty state (no data after loading)
  const hasNoData = !isLoading &&
    !featuredBrands.length &&
    !categories.length &&
    !collections.length;

  if (hasNoData) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="storefront-outline" size={56} color="#CBD5E1" />
        <Text style={styles.emptyText}>{BRAND.APP_NAME} Mall is coming soon</Text>
        <Text style={styles.emptySubtext}>
          Stores and deals are being added. Check back shortly!
        </Text>
        <Pressable
          style={styles.emptyRefreshBtn}
          onPress={refresh}
         
        >
          <Ionicons name="refresh" size={16} color={colors.nileBlue} />
          <Text style={styles.emptyRefreshText}>Refresh</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.outerContainer}>
      {/* Gradient Background - Continues from HomeTabSection's blue gradient for seamless transition */}
      {/* Nile Blue gradient for Nuqta Mall theme */}
      <LinearGradient
        colors={[colors.lavenderMist, '#e4eef8', '#edf3fa', '#f5f8fc', '#fafcfe', colors.background.primary]}
        locations={[0, 0.08, 0.18, 0.35, 0.55, 1]}
        style={styles.gradientBackground}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={colors.nileBlue}
            colors={[colors.nileBlue]}
          />
        }
      >
      {/* Search Bar */}
      <View style={styles.searchBarSection}>
        <Pressable
          style={styles.searchBar}
          onPress={() => router.push('/mall/brands?filter=all' as any)}
        >
          <Ionicons name="search" size={18} color={colors.neutral[400]} />
          <Text style={styles.searchPlaceholder}>Search all mall stores...</Text>
        </Pressable>
        <Pressable
          style={styles.bestPriceButton}
          onPress={() => router.push('/mall/lowest-price' as any)}
        >
          <Ionicons name="pricetag" size={14} color={colors.nileBlue} />
          <Text style={styles.bestPriceText}>Best Price</Text>
        </Pressable>
      </View>

      {/* Mall Quick Actions */}
      <View style={styles.quickActionsSection}>
        <View style={styles.quickActionsRow}>
          <Pressable
            style={styles.quickActionCard}
            onPress={handleAllianceStores}
           
          >
            <View style={[styles.quickActionIconBg, { backgroundColor: colors.lavenderMist }]}>
              <Ionicons name="link" size={20} color={colors.nileBlue} />
            </View>
            <Text style={styles.quickActionText}>Alliance</Text>
            <Text style={styles.quickActionSubtext}>Partner stores</Text>
          </Pressable>

          <Pressable
            style={styles.quickActionCard}
            onPress={handleLowestPrice}
           
          >
            <View style={[styles.quickActionIconBg, { backgroundColor: colors.lavenderMist }]}>
              <Ionicons name="pricetag" size={20} color={colors.brand.sky} />
            </View>
            <Text style={styles.quickActionText}>Best Price</Text>
            <Text style={styles.quickActionSubtext}>Price match</Text>
          </Pressable>

          <Pressable
            style={styles.quickActionCard}
            onPress={handleViewAllOffers}
           
          >
            <View style={[styles.quickActionIconBg, { backgroundColor: colors.lavenderMist }]}>
              <Ionicons name="flash" size={20} color={colors.brand.sky} />
            </View>
            <Text style={styles.quickActionText}>Deals</Text>
            <Text style={styles.quickActionSubtext}>Hot offers</Text>
          </Pressable>
        </View>
      </View>

      {/* 1. Featured Stores */}
      <MallFeaturedBrands
        brands={featuredBrands}
        isLoading={isLoading && !featuredBrands.length}
        onBrandPress={handleBrandPress}
        onViewAllPress={handleViewAllFeatured}
      />

      {/* 2. Deals of the Day (time-sensitive, high placement) */}
      <MallDealsOfDay
        offers={dealsOfDay}
        isLoading={isLoading && !dealsOfDay.length}
        onOfferPress={handleOfferPress}
        onViewAllPress={handleViewAllDeals}
      />

      {/* 3. Exclusive Offers */}
      <MallExclusiveOffers
        offers={exclusiveOffers}
        isLoading={isLoading && !exclusiveOffers.length}
        onOfferPress={handleOfferPress}
        onViewAllPress={handleViewAllOffers}
      />

      {/* 4. Categories Grid */}
      <MallCategoriesGrid
        categories={categories}
        isLoading={isLoading && !categories.length}
        onCategoryPress={handleCategoryPress}
        onViewAllPress={handleViewAllCategories}
      />

      {/* 5. Curated Collections */}
      <MallCollections
        collections={collections}
        isLoading={isLoading && !collections.length}
        onCollectionPress={handleCollectionPress}
        onViewAllPress={handleViewAllCollections}
      />

      {/* 6. New Arrivals */}
      <MallNewArrivals
        brands={newArrivals}
        isLoading={isLoading && !newArrivals.length}
        onBrandPress={handleBrandPress}
        onViewAllPress={handleViewAllNewArrivals}
      />

      {/* 7. Reward Boosters - Highest coin rewards */}
      <MallRewardBoosters
        brands={rewardBoosters}
        isLoading={isLoading && !rewardBoosters.length}
        onBrandPress={handleBrandPress}
        onViewAllPress={handleViewAllRewardBoosters}
      />

      {/* 7b. Social Cashback CTA */}
      <Pressable
        style={styles.socialCashbackCta}
        onPress={() => router.push('/prive/campaigns' as any)}
      >
        <LinearGradient
          colors={['#7C3AED', '#5B21B6']}
          style={styles.socialCashbackGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.socialCashbackIconWrap}>
            <Ionicons name="camera" size={22} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.socialCashbackTitle}>Earn Social Cashback</Text>
            <Text style={styles.socialCashbackSubtitle}>
              Post about your purchase on Instagram & earn extra cashback
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
        </LinearGradient>
      </Pressable>

      {/* 8. Top Rated Brands */}
      <MallTopRated
        brands={topRatedBrands}
        isLoading={isLoading && !topRatedBrands.length}
        onBrandPress={handleBrandPress}
        onViewAllPress={handleViewAllTopRated}
        limit={5}
      />

      {/* 9. Trending Now - Social proof */}
      <MallTrendingNow
        brands={trendingBrands}
        isLoading={isLoading && !trendingBrands.length}
        onBrandPress={handleBrandPress}
        onViewAllPress={handleViewAllTrending}
      />

      {/* 10. Luxury Zone (premium anchor at bottom) */}
      <MallLuxuryZone
        brands={luxuryBrands}
        isLoading={isLoading && !luxuryBrands.length}
        onBrandPress={handleBrandPress}
        onViewAllPress={handleViewAllLuxury}
      />

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  socialCashbackCta: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
    borderRadius: 14,
    overflow: 'hidden',
  },
  socialCashbackGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  socialCashbackIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialCashbackTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  socialCashbackSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  outerContainer: {
    flex: 1,
    position: 'relative',
    marginTop: 0,
    borderTopWidth: 0,
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0, // Gradient covers full screen
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent', // Make transparent to show gradient
  },
  contentContainer: {
    paddingTop: 4,
    paddingBottom: 32,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
  },
  skeletonContainer: {
    flex: 1,
    paddingTop: 12,
    paddingBottom: 40,
  },
  skeletonQuickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    gap: 12,
  },
  skeletonQuickCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[700],
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral[700],
    textAlign: 'center',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.neutral[400],
    textAlign: 'center',
  },
  emptyRefreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.tint.slate,
    borderRadius: 20,
  },
  emptyRefreshText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.nileBlue,
  },
  bottomSpacer: {
    height: 40,
  },
  searchBarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#E8F0F8',
    gap: 8,
  },
  searchPlaceholder: {
    fontSize: 14,
    color: colors.neutral[400],
  },
  bestPriceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lavenderMist,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E8F0F8',
  },
  bestPriceText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.nileBlue,
  },
  quickActionsSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    marginBottom: 12,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E8F0F8',
    ...Platform.select({
      ios: {
        shadowColor: colors.nileBlue,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  quickActionIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.nileBlue,
    textAlign: 'center',
  },
  quickActionSubtext: {
    fontSize: 10,
    color: colors.neutral[400],
    marginTop: 2,
    textAlign: 'center',
  },
});

export default memo(MallSectionContainer);
