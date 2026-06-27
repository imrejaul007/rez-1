// @ts-nocheck
/**
 * CashStoreSectionContainer Component
 *
 * Main container that orchestrates all Cash Store sections
 * with pull-to-refresh and loading states.
 *
 * Cash Store = Affiliate Cashback System
 * - External brand websites (Amazon, Myntra, Flipkart, etc.)
 * - Users click through and shop on external sites
 * - Brand sends webhook when purchase is made
 * - Users earn real cashback (rupees)
 *
 * NOTE: This is different from Nuqta Mall (in-app delivery marketplace with Nuqta Coins)
 */

import React, { memo, useCallback } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Text,
  Linking,
  Dimensions,
} from 'react-native';
import { catchAndWarn } from '@/utils/catchAndReport';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { safeOpenURL } from '@/utils/linking';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
import { useRouter } from 'expo-router';
import { BRAND } from '@/constants/brand';
import { useCashStoreSection } from '../../hooks/useCashStoreSection';
import cashStoreApi from '../../services/cashStoreApi';
import {
  CashStoreBrand,
  TrendingDeal,
  GiftCardBrand,
  CashStoreCoupon,
  HighCashbackDeal,
  TravelDeal,
  CashbackActivity,
  CashStoreCategoryFilterKey,
} from '../../types/cash-store.types';

// Section Components
import CashStoreSearchBar from './sections/CashStoreSearchBar';
import CashStorePromoBanner from './sections/CashStorePromoBanner';
import CashStoreQuickActions from './sections/CashStoreQuickActions';
import CategoryFilterRow from './sections/CategoryFilterRow';
import TopOnlineBrands from './sections/TopOnlineBrands';
import TrendingCashback from './sections/TrendingCashback';
import BuyCouponSection from './sections/BuyCouponSection';
import BestCouponCodes from './sections/BestCouponCodes';
import HighCashbackDeals from './sections/HighCashbackDeals';
import TravelBookingDeals from './sections/TravelBookingDeals';
import HowItWorksPreview from './sections/HowItWorksPreview';
import CashbackActivitySection from './sections/CashbackActivitySection';
import CashStoreSkeleton from './skeletons/CashStoreSkeleton';
import { colors } from '@/constants/theme';

interface CashStoreSectionContainerProps {
  onScrollToTop?: () => void;
}

const CashStoreSectionContainer: React.FC<CashStoreSectionContainerProps> = ({
  onScrollToTop,
}) => {
  const router = useRouter();
  const {
    quickActions,
    topBrands,
    trendingDeals,
    giftCardBrands,
    couponCodes,
    highCashbackDeals,
    travelDeals,
    recentActivity,
    categories,
    selectedCategory,
    setSelectedCategory,
    filteredTopBrands,
    filteredTrendingDeals,
    filteredHighCashbackDeals,
    isCategoryLoading,
    isLoading,
    isRefreshing,
    error,
    refresh,
    copyCouponCode,
    navigateToBrand,
  } = useCashStoreSection();

  // Navigation handlers
  const handleBrandPress = useCallback(
    (brand: CashStoreBrand) => {
      navigateToBrand(brand);
    },
    [navigateToBrand]
  );

  const handleTrendingDealPress = useCallback(
    async (deal: TrendingDeal) => {
      // If deal has external URL, track affiliate click and open in browser
      if (deal.externalUrl) {
        try {
          const trackingResult = await cashStoreApi.trackAffiliateClick(deal.brand.id);
          const urlToOpen = trackingResult?.trackingUrl || deal.externalUrl;

          await WebBrowser.openBrowserAsync(urlToOpen, {
            toolbarColor: colors.nileBlue, // Nile Blue
            controlsColor: colors.background.primary,
          });
        } catch (error) {
          if (deal.externalUrl) {
            try {
              await safeOpenURL(deal.externalUrl);
            } catch (e) { catchAndWarn(e, 'CashStoreSectionContainer/handleTrendingDealPress-fallback'); }
          }
        }
      } else {
        // Navigate to in-app offer detail
        router.push(`/offers/${deal.id}` as any);
      }
    },
    [router]
  );

  const handleGiftCardPress = useCallback(
    (brand: GiftCardBrand) => {
      router.push(`/vouchers/brand/${brand.id}` as any);
    },
    [router]
  );

  const handleCouponCopy = useCallback(
    (coupon: CashStoreCoupon) => {
      copyCouponCode(coupon.code, coupon.id);
    },
    [copyCouponCode]
  );

  const handleHighCashbackPress = useCallback(
    async (deal: HighCashbackDeal) => {
      // If deal has external URL, track affiliate click and open in browser
      if (deal.externalUrl) {
        try {
          const trackingResult = await cashStoreApi.trackAffiliateClick(deal.brand.id);
          const urlToOpen = trackingResult?.trackingUrl || deal.externalUrl;

          await WebBrowser.openBrowserAsync(urlToOpen, {
            toolbarColor: colors.nileBlue, // Nile Blue
            controlsColor: colors.background.primary,
          });
        } catch (error) {
          if (deal.externalUrl) {
            try {
              await safeOpenURL(deal.externalUrl);
            } catch (e) { catchAndWarn(e, 'CashStoreSectionContainer/handleHighCashbackPress-fallback'); }
          }
        }
      } else {
        // Navigate to cash store brands
        router.push(`/cash-store/brands` as any);
      }
    },
    [router]
  );

  const handleTravelDealPress = useCallback(
    (deal: TravelDeal) => {
      // Navigate to cash store brands filtered by travel category
      router.push(`/cash-store/brands?category=${deal.category}` as any);
    },
    [router]
  );

  const handleActivityPress = useCallback(
    (activity: CashbackActivity) => {
      router.push(`/account/cashback` as any);
    },
    [router]
  );

  const handleLearnMore = useCallback(() => {
    router.push(BRAND.HOW_CASH_STORE_WORKS_ROUTE as any);
  }, [router]);

  const handleQuickActionPress = useCallback(
    (actionId: string) => {
      switch (actionId) {
        case 'buy-coupons':
          router.push('/cash-store/buy-coupons' as any);
          break;
        case 'extra-coins':
          router.push('/cash-store/extra-coins' as any);
          break;
        case 'trending':
          router.push('/cash-store/trending' as any);
          break;
        case 'track-cashback':
          router.push('/account/cashback' as any);
          break;
      }
    },
    [router]
  );

  // Category filter handler
  const handleCategorySelect = useCallback(
    (category: CashStoreCategoryFilterKey) => {
      setSelectedCategory(category);
    },
    [setSelectedCategory]
  );

  // View all handlers
  const handleViewAllBrands = useCallback(() => {
    router.push('/cash-store/brands' as any);
  }, [router]);

  const handleViewAllTrending = useCallback(() => {
    router.push('/cash-store/trending' as any);
  }, [router]);

  const handleViewAllGiftCards = useCallback(() => {
    router.push('/cash-store/buy-coupons' as any);
  }, [router]);

  const handleViewAllCoupons = useCallback(() => {
    router.push('/cash-store/coupons' as any);
  }, [router]);

  const handleViewAllHighCashback = useCallback(() => {
    router.push('/cash-store/brands?filter=high-cashback' as any);
  }, [router]);

  const handleViewAllTravel = useCallback(() => {
    router.push('/cash-store/brands?category=travel' as any);
  }, [router]);

  const handleViewAllActivity = useCallback(() => {
    router.push('/account/cashback' as any);
  }, [router]);

  // Error state
  if (error && !isLoading && !topBrands.length) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Unable to load Cash Store</Text>
        <Text style={styles.errorSubtext}>Pull down to try again</Text>
      </View>
    );
  }

  // Initial loading state with skeleton
  if (isLoading && !topBrands.length && !giftCardBrands.length) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <CashStoreSkeleton />
      </ScrollView>
    );
  }

  return (
    <View style={styles.outerContainer}>
      {/* Gradient Background - Soft warm canvas so sections pop */}
      <LinearGradient
        colors={[colors.lightPeach, '#FFF5EE', colors.linen, colors.neutral[50], colors.background.primary]}
        locations={[0, 0.08, 0.25, 0.55, 1]}
        style={styles.gradientBackground}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={colors.nileBlue}
            colors={[colors.nileBlue]}
          />
        }
      >
        {/* 1. Search Bar with Deals Button */}
        <CashStoreSearchBar />

        {/* 2. Promotional Banner */}
        <CashStorePromoBanner />

        {/* 3. Quick Actions */}
      <CashStoreQuickActions
        actions={quickActions}
        onActionPress={handleQuickActionPress}
      />

      {/* 4. Top Categories - Dynamic from API */}
      <CategoryFilterRow
        selectedCategory={selectedCategory}
        onCategorySelect={handleCategorySelect}
        isLoading={isLoading && !topBrands.length}
        categories={categories}
      />

      {/* 5. Top Online Brands - Server-filtered by category */}
      <TopOnlineBrands
        brands={filteredTopBrands}
        isLoading={(isLoading && !topBrands.length) || isCategoryLoading}
        onBrandPress={handleBrandPress}
        onViewAllPress={handleViewAllBrands}
        activeFilter={selectedCategory}
        onResetFilter={() => setSelectedCategory('all')}
      />

      {/* 6. Trending Cashback - Filtered by category */}
      <TrendingCashback
        deals={filteredTrendingDeals}
        isLoading={(isLoading && !trendingDeals.length) || isCategoryLoading}
        onDealPress={handleTrendingDealPress}
        onViewAllPress={handleViewAllTrending}
      />

      {/* 6. Buy Coupon & Save */}
      <BuyCouponSection
        brands={giftCardBrands}
        isLoading={isLoading && !giftCardBrands.length}
        onBrandPress={handleGiftCardPress}
        onViewAllPress={handleViewAllGiftCards}
      />

      {/* 7. Best Coupon Codes */}
      <BestCouponCodes
        coupons={couponCodes}
        isLoading={isLoading && !couponCodes.length}
        onCouponCopy={handleCouponCopy}
        onViewAllPress={handleViewAllCoupons}
      />

      {/* 8. High Cashback Deals - Filtered by category */}
      <HighCashbackDeals
        deals={filteredHighCashbackDeals}
        isLoading={(isLoading && !highCashbackDeals.length) || isCategoryLoading}
        onDealPress={handleHighCashbackPress}
        onViewAllPress={handleViewAllHighCashback}
      />

      {/* 9. Travel & Booking Deals */}
      <TravelBookingDeals
        deals={travelDeals}
        isLoading={isLoading && !travelDeals.length}
        onDealPress={handleTravelDealPress}
        onViewAllPress={handleViewAllTravel}
      />

      {/* 10. How It Works */}
      <HowItWorksPreview onLearnMore={handleLearnMore} />

      {/* 11. Cashback Activity */}
      <CashbackActivitySection
        activities={recentActivity}
        isLoading={isLoading && !recentActivity.length}
        onActivityPress={handleActivityPress}
        onViewAllPress={handleViewAllActivity}
        onStartShopping={handleViewAllBrands}
      />

      {/* Bottom spacing */}
      <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
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
    bottom: 0, // Gradient covers full container
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
    marginTop: 0,
    borderTopWidth: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.neutral[500],
    fontWeight: '500',
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
  bottomSpacer: {
    height: 40,
  },
});

export default memo(CashStoreSectionContainer);
