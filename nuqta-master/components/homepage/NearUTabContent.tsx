// @ts-nocheck
/**
 * Near-U Tab Content
 *
 * Contains all sections for the "Near-U" tab of the homepage.
 * Below-fold sections are wrapped in LazySection for viewport-based rendering.
 *
 * Lazy imports are grouped into 6 barrel files (lazyGroups/) to reduce
 * Metro bundler chunk count from 45 to ~9, preventing OOM during bundling.
 * LazySection controls mount timing independently of React.lazy().
 */

import React, { Suspense, useCallback, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '@/constants/theme';
import LazySection from '@/components/homepage/LazySection';
import { SectionSkeleton } from '@/components/homepage/skeletons';
import HomeSavingsSummaryCard from '@/components/homepage/HomeSavingsSummaryCard';
import { useUserIdentityStore } from '@/stores/userIdentityStore';

// Identity Layer - renders at top of NearU tab (self-gates: null for general users)
import IdentitySectionContainer from '@/components/homepage/identity/IdentitySectionContainer';
import IdentityPromptModal from '@/components/homepage/identity/IdentityPromptModal';

// Tier 1: Above the fold - render immediately (static imports)
import QuickActionsSection from '@/components/homepage/QuickActionsSection';
import HowRezWorksCard from '@/components/homepage/HowRezWorksCard';
import EarnRezCoinsSection from '@/components/homepage/EarnRezCoinsSection';
import HorizontalScrollSection from '@/components/homepage/HorizontalScrollSection';
import ProductCard from '@/components/homepage/cards/ProductCard';
import EventCard from '@/components/homepage/cards/EventCard';
import StoreCard from '@/components/homepage/cards/StoreCard';
import BrandedStoreCard from '@/components/homepage/cards/BrandedStoreCard';
import RecommendationCard from '@/components/homepage/cards/RecommendationCard';

// Quick Reorder (compact, above-fold — renders immediately)
import QuickReorderSection from '@/components/homepage/QuickReorderSection';

// Tier 2: Near fold - static imports (LazySection still controls mount timing)
import PlayAndEarnSectionV2 from '@/components/homepage/PlayAndEarnSectionV2';
import BonusZoneHighlight from '@/components/homepage/BonusZoneHighlight';
import NewOnRezSection from '@/components/homepage/NewOnRezSection';
import EventsExperiencesSection from '@/components/homepage/EventsExperiencesSection';
import ShopByCategorySection from '@/components/homepage/ShopByCategorySection';

// Lightweight banners - static imports
import PromoBanner from '@/components/homepage/PromoBanner';
import GlobeBanner from '@/components/homepage/GlobeBanner';

// Tier 3: Below fold - grouped lazy imports (6 barrel chunks instead of 38 individual chunks)
// This reduces Metro bundler memory usage by deduplicating shared dependencies across chunks.

// Group A: Category verticals (1 chunk)
const BeautyWellnessSection = React.lazy(() =>
  import('@/components/homepage/lazyGroups/categorySections').then(m => ({ default: m.BeautyWellnessSection }))
);
const FitnessSportsSection = React.lazy(() =>
  import('@/components/homepage/lazyGroups/categorySections').then(m => ({ default: m.FitnessSportsSection }))
);
const GroceryEssentialsSection = React.lazy(() =>
  import('@/components/homepage/lazyGroups/categorySections').then(m => ({ default: m.GroceryEssentialsSection }))
);
const HealthcareSection = React.lazy(() =>
  import('@/components/homepage/lazyGroups/categorySections').then(m => ({ default: m.HealthcareSection }))
);
const HomeServicesSection = React.lazy(() =>
  import('@/components/homepage/lazyGroups/categorySections').then(m => ({ default: m.HomeServicesSection }))
);
const FinancialServicesSection = React.lazy(() =>
  import('@/components/homepage/lazyGroups/categorySections').then(m => ({ default: m.FinancialServicesSection }))
);
const TravelSection = React.lazy(() =>
  import('@/components/homepage/lazyGroups/categorySections').then(m => ({ default: m.TravelSection }))
);

// Group B: Category list sections (1 chunk)
const BestDiscountSection = React.lazy(() =>
  import('@/components/homepage/lazyGroups/categoryListSections').then(m => ({ default: m.BestDiscountSection }))
);
const BestSellerSection = React.lazy(() =>
  import('@/components/homepage/lazyGroups/categoryListSections').then(m => ({ default: m.BestSellerSection }))
);

// Group C: Store browse sections with react-native-reanimated (1 chunk)
const GoingOutSection = React.lazy(() =>
  import('@/components/homepage/lazyGroups/storeBrowseSections').then(m => ({ default: m.GoingOutSection }))
);
const HomeDeliverySection = React.lazy(() =>
  import('@/components/homepage/lazyGroups/storeBrowseSections').then(m => ({ default: m.HomeDeliverySection }))
);
const ServiceSection = React.lazy(() =>
  import('@/components/homepage/lazyGroups/storeBrowseSections').then(m => ({ default: m.ServiceSection }))
);

// Group D: Gamification sections (1 chunk)
const WalletSnapshotCard = React.lazy(() =>
  import('@/components/homepage/lazyGroups/gamificationSections').then(m => ({ default: m.WalletSnapshotCard }))
);
const LoyaltyRewardsHubCard = React.lazy(() =>
  import('@/components/homepage/lazyGroups/gamificationSections').then(m => ({ default: m.LoyaltyRewardsHubCard }))
);
const FeatureTryCards = React.lazy(() =>
  import('@/components/homepage/lazyGroups/gamificationSections').then(m => ({ default: m.FeatureTryCards }))
);
const StreaksGamification = React.lazy(() =>
  import('@/components/homepage/lazyGroups/gamificationSections').then(m => ({ default: m.StreaksGamification }))
);
const ZeroEMICard = React.lazy(() =>
  import('@/components/homepage/lazyGroups/gamificationSections').then(m => ({ default: m.ZeroEMICard }))
);
const PlayAndEarnSection = React.lazy(() =>
  import('@/components/homepage/lazyGroups/gamificationSections').then(m => ({ default: m.PlayAndEarnSection }))
);
const SocialProofSection = React.lazy(() =>
  import('@/components/homepage/lazyGroups/gamificationSections').then(m => ({ default: m.SocialProofSection }))
);
const FeatureHighlights = React.lazy(() =>
  import('@/components/homepage/lazyGroups/gamificationSections').then(m => ({ default: m.FeatureHighlights }))
);

// Group E: Deal sections (1 chunk)
const ExcitingDealsSection = React.lazy(() =>
  import('@/components/homepage/lazyGroups/dealSections').then(m => ({ default: m.ExcitingDealsSection }))
);
const DealsThatSaveMoney = React.lazy(() =>
  import('@/components/homepage/lazyGroups/dealSections').then(m => ({ default: m.DealsThatSaveMoney }))
);
const FlashSales = React.lazy(() =>
  import('@/components/homepage/lazyGroups/dealSections').then(m => ({ default: m.FlashSales }))
);
const ShopByExperienceSection = React.lazy(() =>
  import('@/components/homepage/lazyGroups/dealSections').then(m => ({ default: m.ShopByExperienceSection }))
);
const HotDealsSection = React.lazy(() =>
  import('@/components/homepage/lazyGroups/dealSections').then(m => ({ default: m.HotDealsSection }))
);
const PopularProductsSection = React.lazy(() =>
  import('@/components/homepage/lazyGroups/dealSections').then(m => ({ default: m.PopularProductsSection }))
);

// Group F: Discovery sections (1 chunk)
const PickedForYou = React.lazy(() =>
  import('@/components/homepage/lazyGroups/discoverySections').then(m => ({ default: m.PickedForYou }))
);
const NearbyProductsSection = React.lazy(() =>
  import('@/components/homepage/lazyGroups/discoverySections').then(m => ({ default: m.NearbyProductsSection }))
);
const StoresNearYou = React.lazy(() =>
  import('@/components/homepage/lazyGroups/discoverySections').then(m => ({ default: m.StoresNearYou }))
);
const BrandPartnerships = React.lazy(() =>
  import('@/components/homepage/lazyGroups/discoverySections').then(m => ({ default: m.BrandPartnerships }))
);
const StoreDiscoverySection = React.lazy(() =>
  import('@/components/homepage/lazyGroups/discoverySections').then(m => ({ default: m.StoreDiscoverySection }))
);
const FeaturedCategoriesContainer = React.lazy(() =>
  import('@/components/homepage/lazyGroups/discoverySections').then(m => ({ default: m.FeaturedCategoriesContainer }))
);
const StoreExperiencesSection = React.lazy(() =>
  import('@/components/homepage/lazyGroups/discoverySections').then(m => ({ default: m.StoreExperiencesSection }))
);

// Standalone lazy imports (different directories, unique deps)
const TrendingNearYou = React.lazy(() => import('@/components/homepage/TrendingNearYou'));
const RecentlyViewedSection = React.lazy(() => import('@/components/category/RecentlyViewedSection'));
const DiscoverAndShopSection = React.lazy(() => import('@/components/discover/DiscoverAndShopSection'));

import {
  EventItem,
  StoreItem,
  ProductItem,
  BrandedStoreItem,
  RecommendationItem,
  HomepageSectionItem,
} from '@/types/homepage.types';

// Sized placeholder for Suspense boundaries — prevents content from
// collapsing to 0px while the lazy chunk loads (causes layout jump / flicker)
const SuspensePlaceholder: React.FC<{ height: number }> = React.memo(({ height }) => (
  <View style={{ height, backgroundColor: '#f5f5f5' }} />
));

interface NearUTabContentProps {
  state: any;
  actions: any;
  handleItemPress: (sectionId: string, item: any) => void;
  handleAddToCart: (item: any) => void;
  voucherCount: number;
  userPoints: number;
  newOffersCount: number;
  recentlyViewedItems: any[];
  isLoadingRecentlyViewed: boolean;
  loyaltyHub: any;
  featuredLockProduct: any;
  trendingService: any;
  isLoyaltySectionLoading: boolean;
  scrollY: SharedValue<number>;
  totalSaved?: number;
  thisMonthSaved?: number;
  currencySymbol?: string;
  featureLevel?: number;
  hasCompletedFirstOrder?: boolean;
  isAreaServiceable?: boolean;
  areaName?: string;
  onSwitchToMall?: () => void;
}

const NearUTabContent: React.FC<NearUTabContentProps> = ({
  state,
  actions,
  handleItemPress,
  handleAddToCart,
  voucherCount,
  userPoints,
  newOffersCount,
  recentlyViewedItems,
  isLoadingRecentlyViewed,
  loyaltyHub,
  featuredLockProduct,
  trendingService,
  isLoyaltySectionLoading,
  scrollY,
  totalSaved,
  thisMonthSaved,
  currencySymbol,
  featureLevel = 1,
  hasCompletedFirstOrder = false,
  isAreaServiceable = true,
  areaName,
  onSwitchToMall,
}) => {
  const router = useRouter();
  const { segment } = useUserIdentityStore();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  // Memoize card renderers
  const renderEventCard = useCallback((item: HomepageSectionItem) => {
    const event = item as EventItem;
    return (
      <EventCard
        event={event}
        onPress={eventItem => {
          actions.trackSectionView('events');
          actions.trackItemClick('events', eventItem.id);
          handleItemPress('events', eventItem);
        }}
      />
    );
  }, [actions, handleItemPress]);

  const renderRecommendationCard = useCallback((item: HomepageSectionItem) => {
    const recommendation = item as RecommendationItem;
    return (
      <RecommendationCard
        recommendation={recommendation}
        onPress={rec => {
          actions.trackSectionView('just_for_you');
          actions.trackItemClick('just_for_you', rec.id);
          handleItemPress('just_for_you', rec);
        }}
        onAddToCart={rec => {
          actions.trackItemClick('just_for_you', rec.id);
          handleAddToCart(rec);
        }}
      />
    );
  }, [actions, handleItemPress, handleAddToCart]);

  const renderStoreCard = useCallback((item: HomepageSectionItem, sectionId: string) => {
    const store = item as StoreItem;
    return (
      <StoreCard
        store={store}
        onPress={storeItem => {
          actions.trackSectionView(sectionId);
          actions.trackItemClick(sectionId, storeItem.id);
          handleItemPress(sectionId, storeItem);
        }}
      />
    );
  }, [actions, handleItemPress]);

  const renderBrandedStoreCard = useCallback((item: HomepageSectionItem) => {
    const store = item as BrandedStoreItem;
    return (
      <BrandedStoreCard
        store={store}
        onPress={storeItem => {
          actions.trackSectionView('top_stores');
          actions.trackItemClick('top_stores', storeItem.id);
          handleItemPress('top_stores', storeItem);
        }}
        width={200}
      />
    );
  }, [actions, handleItemPress]);

  const renderProductCard = useCallback((item: HomepageSectionItem) => {
    const product = item as ProductItem;
    return (
      <ProductCard
        product={product}
        onPress={productItem => {
          actions.trackSectionView('new_arrivals');
          actions.trackItemClick('new_arrivals', productItem.id);
          handleItemPress('new_arrivals', productItem);
        }}
        onAddToCart={productItem => {
          actions.trackItemClick('new_arrivals', productItem.id);
          handleAddToCart(productItem);
        }}
      />
    );
  }, [actions, handleItemPress, handleAddToCart]);

  // Dynamic sections renderer (trending stores, events, etc.)
  const renderDynamicSections = useCallback(() => {
    const filteredSections = state.sections.filter((section: any) => {
      if (section.id === 'just_for_you') return false;
      if (section.id === 'new_arrivals') return false;
      if (section.error && section.error.includes('fallback')) return false;
      return true;
    });

    const isGlobalLoading = state.loading;

    return filteredSections.map((section: any) => {
      const isSectionLoading = section.loading;
      const hasNoItems = !section.items || section.items.length === 0;

      // Show skeleton for trending_stores only while actually loading
      if (section.id === 'trending_stores' && (isGlobalLoading || (isSectionLoading && hasNoItems))) {
        return (
          <SectionSkeleton
            key={`skeleton-${section.id}`}
            cardType="store"
            cardWidth={280}
            spacing={16}
            numCards={4}
            showIndicator={false}
          />
        );
      }

      if (hasNoItems && !isGlobalLoading && !isSectionLoading) {
        return null;
      }

      return (
        <HorizontalScrollSection
          key={section.id}
          section={section}
          onItemPress={item => handleItemPress(section.id, item)}
          onRefresh={() => actions.refreshSection(section.id)}
          renderCard={item => {
            switch (section.type) {
              case 'events':
                return renderEventCard(item);
              case 'recommendations':
                return renderRecommendationCard(item);
              case 'stores':
                return renderStoreCard(item, section.id);
              case 'branded_stores':
                return renderBrandedStoreCard(item);
              case 'products':
                return renderProductCard(item);
              default:
                return renderStoreCard(item, section.id);
            }
          }}
          cardWidth={
            section.id === 'new_arrivals' ? 160 :
              section.type === 'branded_stores' ? 200 : 280
          }
          spacing={section.id === 'new_arrivals' ? 12 : 16}
          showIndicator={false}
        />
      );
    });
  }, [state.sections, state.loading, handleItemPress, actions, renderEventCard, renderRecommendationCard, renderStoreCard, renderBrandedStoreCard, renderProductCard]);

  // New Arrivals section renderer
  const renderNewArrivals = useCallback(() => {
    const newArrivalsSection = state.sections.find((section: any) => section.id === 'new_arrivals');
    const isGlobalLoading = state.loading;
    const isSectionLoading = newArrivalsSection?.loading;
    const hasNoItems = !newArrivalsSection?.items || newArrivalsSection.items.length === 0;

    if (isGlobalLoading || !newArrivalsSection || (isSectionLoading && hasNoItems)) {
      return (
        <SectionSkeleton
          cardType="product"
          cardWidth={160}
          spacing={16}
          numCards={4}
          showIndicator={false}
        />
      );
    }

    if (!hasNoItems) {
      return (
        <HorizontalScrollSection
          key={newArrivalsSection.id}
          section={newArrivalsSection}
          onItemPress={item => handleItemPress(newArrivalsSection.id, item)}
          onRefresh={() => actions.refreshSection(newArrivalsSection.id)}
          renderCard={item => renderProductCard(item)}
          cardWidth={160}
          spacing={16}
          showIndicator={false}
        />
      );
    }

    return null;
  }, [state.sections, state.loading, handleItemPress, actions, renderProductCard]);

  // Just for you section renderer
  const renderJustForYou = useCallback(() => {
    const justForYouSection = state.sections.find((section: any) => section.id === 'just_for_you');
    const isGlobalLoading = state.loading;
    const isSectionLoading = justForYouSection?.loading;
    const hasNoItems = !justForYouSection?.items || justForYouSection.items.length === 0;

    // Show skeleton only while actually loading (global or section-level)
    if (isGlobalLoading || !justForYouSection || (isSectionLoading && hasNoItems)) {
      return (
        <SectionSkeleton
          cardType="recommendation"
          cardWidth={230}
          spacing={12}
          numCards={4}
          showIndicator={false}
        />
      );
    }

    // Loading done but no items — hide section instead of permanent skeleton
    if (hasNoItems) {
      return null;
    }

    return (
      <HorizontalScrollSection
        key={justForYouSection.id}
        section={justForYouSection}
        onItemPress={item => handleItemPress(justForYouSection.id, item)}
        onRefresh={() => actions.refreshSection(justForYouSection.id)}
        renderCard={item => renderRecommendationCard(item)}
        cardWidth={230}
        spacing={12}
        showIndicator={false}
      />
    );
  }, [state.sections, state.loading, handleItemPress, actions, renderRecommendationCard]);

  return (
    <>
      {/* ===== IDENTITY LAYER: Personalized segment content ===== */}
      <IdentityPromptModal />
      <IdentitySectionContainer />

      {/* Coming soon banner — shown when user is outside serviceable area */}
      {!isAreaServiceable && !bannerDismissed && (
        <View style={{
          backgroundColor: '#FFF8E1',
          borderRadius: 14,
          padding: 14,
          marginHorizontal: 16,
          marginTop: 12,
          marginBottom: 4,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          borderWidth: 1,
          borderColor: '#FFD54F',
        }}>
          <Ionicons name="location-outline" size={22} color="#5D4037" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#5D4037' }}>
              Near U is coming soon{areaName ? ` in ${areaName}` : ' in your area'}
            </Text>
            <Text style={{ fontSize: 12, color: '#795548', marginTop: 3 }}>
              Meanwhile, shop from top brands across India on REZ Mall.
            </Text>
          </View>
          {onSwitchToMall && (
            <Pressable
              onPress={onSwitchToMall}
              style={{
                backgroundColor: colors.nileBlue,
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 6,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Mall</Text>
            </Pressable>
          )}
          <Pressable onPress={() => setBannerDismissed(true)} style={{ padding: 4 }}>
            <Ionicons name="close" size={16} color="#94a3b8" />
          </Pressable>
        </View>
      )}

      {/* ===== SEGMENT-FIRST: Promoted section for verified users ===== */}
      {segment === 'verified_healthcare' && (
        <LazySection sectionId="healthcare-priority" scrollY={scrollY} height={300}
          renderSection={() => <Suspense fallback={<SuspensePlaceholder height={300} />}><HealthcareSection /></Suspense>} />
      )}
      {segment === 'verified_defence' && (
        <LazySection sectionId="fitness-priority" scrollY={scrollY} height={300}
          renderSection={() => <Suspense fallback={<SuspensePlaceholder height={300} />}><FitnessSportsSection /></Suspense>} />
      )}
      {segment === 'verified_employee' && (
        <LazySection sectionId="financial-priority" scrollY={scrollY} height={300}
          renderSection={() => <Suspense fallback={<SuspensePlaceholder height={300} />}><FinancialServicesSection /></Suspense>} />
      )}
      {segment === 'verified_student' && (
        <LazySection sectionId="events-priority" scrollY={scrollY} height={300}
          renderSection={() => <Suspense fallback={<SuspensePlaceholder height={300} />}><EventsExperiencesSection /></Suspense>} />
      )}
      {segment === 'verified_teacher' && (
        <LazySection sectionId="beauty-priority" scrollY={scrollY} height={300}
          renderSection={() => <Suspense fallback={<SuspensePlaceholder height={300} />}><BeautyWellnessSection /></Suspense>} />
      )}
      {segment === 'verified_senior' && (
        <LazySection sectionId="healthcare-senior-priority" scrollY={scrollY} height={300}
          renderSection={() => <Suspense fallback={<SuspensePlaceholder height={300} />}><HealthcareSection /></Suspense>} />
      )}
      {segment === 'verified_government' && (
        <LazySection sectionId="financial-gov-priority" scrollY={scrollY} height={300}
          renderSection={() => <Suspense fallback={<SuspensePlaceholder height={300} />}><FinancialServicesSection /></Suspense>} />
      )}
      {segment === 'verified_differentlyAbled' && (
        <LazySection sectionId="home-services-priority" scrollY={scrollY} height={300}
          renderSection={() => <Suspense fallback={<SuspensePlaceholder height={300} />}><HomeServicesSection /></Suspense>} />
      )}

      {/* ===== TIER 1: Above the fold - render immediately ===== */}
      <HomeSavingsSummaryCard
        totalSaved={totalSaved ?? 0}
        thisMonthSaved={thisMonthSaved ?? 0}
        currencySymbol={currencySymbol ?? '\u20B9'}
        onPress={() => router.push('/wallet-screen')}
      />
      <QuickActionsSection
        voucherCount={voucherCount}
        walletBalance={userPoints}
        newOffersCount={newOffersCount}
      />
      <ShopByCategorySection />

      {/* Quick Reorder — compact cards, above the fold (Level 3+ / has order history) */}
      {(featureLevel >= 3 || hasCompletedFirstOrder) && (
        <QuickReorderSection />
      )}

      {/* ===== TIER 2: Near fold - static imports, LazySection controls mount ===== */}
      <HowRezWorksCard />
      <EarnRezCoinsSection />
      {/* Savings Streak — FIRST for habit formation */}
      {featureLevel >= 2 && (
        <LazySection sectionId="streaks" scrollY={scrollY} height={200}
          renderSection={() => <Suspense fallback={<SuspensePlaceholder height={200} />}><StreaksGamification /></Suspense>} />
      )}
      {featureLevel >= 5 && (
        <LazySection sectionId="play-earn-v2" scrollY={scrollY} height={250}
          renderSection={() => <Suspense fallback={<SuspensePlaceholder height={250} />}><PlayAndEarnSectionV2 /></Suspense>} />
      )}
      {featureLevel >= 2 && (
        <LazySection sectionId="bonus-zone" scrollY={scrollY} height={200}
          renderSection={() => <Suspense fallback={<SuspensePlaceholder height={200} />}><BonusZoneHighlight /></Suspense>} />
      )}
      <LazySection sectionId="new-on-rez" scrollY={scrollY} height={300}
        renderSection={() => <Suspense fallback={<SuspensePlaceholder height={300} />}><NewOnRezSection /></Suspense>} />
      {segment !== 'verified_student' && (
        <LazySection sectionId="events-experiences" scrollY={scrollY} height={300}
          renderSection={() => <Suspense fallback={<SuspensePlaceholder height={300} />}><EventsExperiencesSection /></Suspense>} />
      )}

      {/* ===== TIER 3: Below fold - viewport + React.lazy dynamic loading ===== */}
      {segment !== 'verified_teacher' && (
        <LazySection sectionId="beauty-wellness" scrollY={scrollY} height={300}
          renderSection={() => <Suspense fallback={<SuspensePlaceholder height={300} />}><BeautyWellnessSection /></Suspense>} />
      )}

      {segment !== 'verified_defence' && (
        <LazySection sectionId="fitness-sports" scrollY={scrollY} height={300}
          renderSection={() => <Suspense fallback={<SuspensePlaceholder height={300} />}><FitnessSportsSection /></Suspense>} />
      )}

      <LazySection sectionId="grocery-essentials" scrollY={scrollY} height={300}
        renderSection={() => <Suspense fallback={<SuspensePlaceholder height={300} />}><GroceryEssentialsSection /></Suspense>} />

      {segment !== 'verified_healthcare' && segment !== 'verified_senior' && (
        <LazySection sectionId="healthcare" scrollY={scrollY} height={300}
          renderSection={() => <Suspense fallback={<SuspensePlaceholder height={300} />}><HealthcareSection /></Suspense>} />
      )}

      {segment !== 'verified_differentlyAbled' && (
        <LazySection sectionId="home-services" scrollY={scrollY} height={300}
          renderSection={() => <Suspense fallback={<SuspensePlaceholder height={300} />}><HomeServicesSection /></Suspense>} />
      )}

      {segment !== 'verified_employee' && segment !== 'verified_government' && (
        <LazySection sectionId="financial-services" scrollY={scrollY} height={300}
          renderSection={() => <Suspense fallback={<SuspensePlaceholder height={300} />}><FinancialServicesSection /></Suspense>} />
      )}

      <LazySection sectionId="travel" scrollY={scrollY} height={300}
        renderSection={() => <Suspense fallback={<SuspensePlaceholder height={300} />}><TravelSection /></Suspense>} />

      <LazySection sectionId="exciting-deals" scrollY={scrollY} height={300}
        renderSection={() => <Suspense fallback={<SuspensePlaceholder height={300} />}><ExcitingDealsSection /></Suspense>} />

      <LazySection sectionId="shop-by-experience" scrollY={scrollY} height={300}
        renderSection={() => <Suspense fallback={<SuspensePlaceholder height={300} />}><ShopByExperienceSection /></Suspense>} />

      <LazySection sectionId="deals-save-money" scrollY={scrollY} height={400}
        renderSection={() => <Suspense fallback={<SuspensePlaceholder height={400} />}><DealsThatSaveMoney /></Suspense>} />

      {recentlyViewedItems.length > 0 && (
        <LazySection sectionId="recently-viewed" scrollY={scrollY} height={250}
          renderSection={() => (
            <Suspense fallback={<SuspensePlaceholder height={250} />}>
              <RecentlyViewedSection
                items={recentlyViewedItems}
                isLoading={isLoadingRecentlyViewed}
                maxItems={10}
              />
            </Suspense>
          )} />
      )}

      <LazySection sectionId="store-discovery" scrollY={scrollY} height={350}
        renderSection={() => <Suspense fallback={<SuspensePlaceholder height={350} />}><StoreDiscoverySection limit={10} /></Suspense>} />

      <LazySection sectionId="trending-near-you" scrollY={scrollY} height={300}
        renderSection={() => <Suspense fallback={<SuspensePlaceholder height={300} />}><TrendingNearYou /></Suspense>} />

      <LazySection sectionId="flash-sales" scrollY={scrollY} height={300}
        renderSection={() => <Suspense fallback={<SuspensePlaceholder height={300} />}><FlashSales /></Suspense>} />

      <LazySection sectionId="new-arrivals" scrollY={scrollY} height={280}
        renderSection={renderNewArrivals} />

      <LazySection sectionId="popular-products" scrollY={scrollY} height={280}
        renderSection={() => <Suspense fallback={<SuspensePlaceholder height={280} />}><PopularProductsSection title="Popular Near You" limit={3} /></Suspense>} />

      <LazySection sectionId="going-out" scrollY={scrollY} height={300}
        renderSection={() => <Suspense fallback={<SuspensePlaceholder height={300} />}><GoingOutSection /></Suspense>} />

      <LazySection sectionId="just-for-you" scrollY={scrollY} height={280}
        renderSection={renderJustForYou} />

      <LazySection sectionId="home-delivery" scrollY={scrollY} height={300}
        renderSection={() => <Suspense fallback={<SuspensePlaceholder height={300} />}><HomeDeliverySection /></Suspense>} />

      <LazySection sectionId="service" scrollY={scrollY} height={300}
        renderSection={() => <Suspense fallback={<SuspensePlaceholder height={300} />}><ServiceSection /></Suspense>} />

      <LazySection sectionId="dynamic-sections" scrollY={scrollY} height={300}
        renderSection={renderDynamicSections} />

      <LazySection sectionId="promo-banner" scrollY={scrollY} height={200}
        renderSection={() => <PromoBanner />} />

      <LazySection sectionId="best-discount" scrollY={scrollY} height={280}
        renderSection={() => <Suspense fallback={<SuspensePlaceholder height={280} />}><BestDiscountSection title="Best Discount" limit={10} /></Suspense>} />

      <LazySection sectionId="best-seller" scrollY={scrollY} height={280}
        renderSection={() => <Suspense fallback={<SuspensePlaceholder height={280} />}><BestSellerSection title="Best Seller" limit={10} /></Suspense>} />

      <LazySection sectionId="discover-shop" scrollY={scrollY} height={600}
        renderSection={() => (
          <Suspense fallback={<SuspensePlaceholder height={600} />}>
            <View style={{ marginHorizontal: -20, marginTop: 16, marginBottom: 16 }}>
              <DiscoverAndShopSection
                showHeader={true}
                showCategories={true}
                initialTab="reels"
                maxHeight={600}
              />
            </View>
          </Suspense>
        )} />

      <LazySection sectionId="nearby-products" scrollY={scrollY} height={280}
        renderSection={() => <Suspense fallback={<SuspensePlaceholder height={280} />}><NearbyProductsSection title="In Your Area" limit={10} radius={10} /></Suspense>} />

      <LazySection sectionId="stores-near-you" scrollY={scrollY} height={300}
        renderSection={() => <Suspense fallback={<SuspensePlaceholder height={300} />}><StoresNearYou /></Suspense>} />

      <LazySection sectionId="picked-for-you" scrollY={scrollY} height={300}
        renderSection={() => <Suspense fallback={<SuspensePlaceholder height={300} />}><PickedForYou limit={2} /></Suspense>} />

      <LazySection sectionId="brand-partnerships" scrollY={scrollY} height={300}
        renderSection={() => <Suspense fallback={<SuspensePlaceholder height={300} />}><BrandPartnerships /></Suspense>} />

      <LazySection sectionId="globe-banner" scrollY={scrollY} height={200}
        renderSection={() => <GlobeBanner />} />

      <LazySection sectionId="hot-deals" scrollY={scrollY} height={280}
        renderSection={() => <Suspense fallback={<SuspensePlaceholder height={280} />}><HotDealsSection title="Hot deals" limit={10} /></Suspense>} />

      <LazySection sectionId="featured-categories" scrollY={scrollY} height={400}
        renderSection={() => <Suspense fallback={<SuspensePlaceholder height={400} />}><FeaturedCategoriesContainer productsPerCategory={10} /></Suspense>} />

      {featureLevel >= 5 && (
        <LazySection sectionId="feature-highlights" scrollY={scrollY} height={200}
          renderSection={() => <Suspense fallback={<SuspensePlaceholder height={200} />}><FeatureHighlights /></Suspense>} />
      )}

      <LazySection sectionId="wallet-snapshot" scrollY={scrollY} height={200}
        renderSection={() => <Suspense fallback={<SuspensePlaceholder height={200} />}><WalletSnapshotCard /></Suspense>} />

      <LazySection sectionId="loyalty-hub" scrollY={scrollY} height={300}
        renderSection={() => (
          <Suspense fallback={<SuspensePlaceholder height={300} />}>
            <LoyaltyRewardsHubCard
              activeBrands={loyaltyHub?.activeBrands}
              streaks={loyaltyHub?.streaks}
              unlocked={loyaltyHub?.unlocked}
              tiers={loyaltyHub?.tiers}
              isLoading={isLoyaltySectionLoading}
            />
          </Suspense>
        )} />

      <LazySection sectionId="feature-try" scrollY={scrollY} height={250}
        renderSection={() => (
          <Suspense fallback={<SuspensePlaceholder height={250} />}>
            <FeatureTryCards
              lockProduct={featuredLockProduct}
              trendingService={trendingService}
              isLoading={isLoyaltySectionLoading}
            />
          </Suspense>
        )} />

      <LazySection sectionId="zero-emi" scrollY={scrollY} height={200}
        renderSection={() => <Suspense fallback={<SuspensePlaceholder height={200} />}><ZeroEMICard /></Suspense>} />

      <LazySection sectionId="store-experiences" scrollY={scrollY} height={300}
        renderSection={() => <Suspense fallback={<SuspensePlaceholder height={300} />}><StoreExperiencesSection /></Suspense>} />

      <LazySection sectionId="play-earn-more" scrollY={scrollY} height={300}
        renderSection={() => <Suspense fallback={<SuspensePlaceholder height={300} />}><PlayAndEarnSection /></Suspense>} />

      <LazySection sectionId="social-proof" scrollY={scrollY} height={250}
        renderSection={() => <Suspense fallback={<SuspensePlaceholder height={250} />}><SocialProofSection /></Suspense>} />
    </>
  );
};

export default React.memo(NearUTabContent);
