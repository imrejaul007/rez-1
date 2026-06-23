/**
 * OffersPageContent Component
 *
 * Shared content layout for both Near U and Prive pages
 * Uses real API data only - hides sections with no data
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Text,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useOffersTheme } from '@/contexts/OffersThemeContext';
import { OffersTabs } from './OffersTabs';
import {
  // Offers Tab
  LightningDealsSection,
  NearbyOffersSection,
  TodaysOffersSection,
  DiscountBucketsSection,
  TrendingNowSection,
  AIRecommendedSection,
  FriendsRedeemedSection,
  HotspotDealsSection,
  LastChanceSection,
  NewTodaySection,
  SalesClearanceSection,
  BOGOSection,
  FreeDeliverySection,
  // Cashback Tab
  SuperCashbackSection,
  DoubleCashbackBanner,
  CoinDropsSection,
  UploadBillSection,
  BankOffersSection,
  // Exclusive Tab
  ExclusiveCategoriesGrid,
  LoyaltyProgressSection,
  SpecialProfilesSection,
  BirthdayBanner,
} from './sections';
import { OffersTabType, DiscountBucket, HotspotDeal, LightningDeal } from '@/types/offers.types';
import { useOffersData } from '@/hooks/useOffersData';
import { Spacing, Typography } from '@/constants/DesignSystem';
import SkeletonLoader from '@/components/skeletons/SkeletonLoader';
import HorizontalSkeletonList from '@/components/skeletons/HorizontalSkeletonList';
import DealCardSkeleton from '@/components/skeletons/DealCardSkeleton';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
import { useUserIdentityStore, IdentitySegment } from '@/stores/userIdentityStore';

// Personalised banner config per segment
const SEGMENT_BANNER: Partial<Record<IdentitySegment, { text: string; route: string; color: string; icon: string }>> = {
  verified_student:    { text: 'Your student deals are ready',      route: '/offers/student',          color: '#8B5CF6', icon: 'school-outline' },
  verified_employee:   { text: 'Your work perks are unlocked',      route: '/offers/corporate',        color: '#0EA5E9', icon: 'briefcase-outline' },
  verified_healthcare: { text: 'Healthcare offers unlocked for you', route: '/offers/zones/healthcare', color: '#2ECC71', icon: 'medkit-outline' },
  verified_defence:    { text: 'Exclusive defence benefits available', route: '/offers/zones/defence',  color: '#6366F1', icon: 'shield-outline' },
  verified_teacher:    { text: 'Teacher benefits are live',          route: '/offers/zones/teacher',    color: '#F59E0B', icon: 'book-outline' },
  verified_senior:     { text: 'Senior benefits unlocked',           route: '/offers/zones/senior',     color: '#EC4899', icon: 'heart-outline' },
};

// Exclusive tab label per segment
const SEGMENT_EXCLUSIVE_LABEL: Partial<Record<IdentitySegment, string>> = {
  verified_student: 'Campus',
  verified_employee: 'Corporate',
  verified_healthcare: 'Healthcare',
  verified_defence: 'Defence',
  verified_teacher: 'Teacher',
  verified_senior: 'Senior',
};

// New Color Palette
const PALETTE = {
  nileBlue: colors.nileBlue,
  lightMustard: colors.lightMustard,
  linen: colors.linen,
  lightPeach: colors.lightPeach,
  lavenderMist: colors.lavenderMist,
};

interface OffersPageContentProps {
  onRefresh?: () => Promise<void>;
  // URL query params for filtering
  initialType?: string;           // e.g., 'flash-sale', 'bogo', 'nearby', 'todays-deals'
  initialTab?: string;            // e.g., 'cashback', 'exclusive'
  initialCategory?: string;       // category filter
  cashbackMultiplier?: number;    // e.g., 2 for 2X cashback
  initialFilter?: string;         // e.g., 'double', 'coindrops'
}

export const OffersPageContent: React.FC<OffersPageContentProps> = ({
  onRefresh,
  initialType,
  initialTab,
  initialCategory,
  cashbackMultiplier,
  initialFilter,
}) => {
  const { theme, isDark } = useOffersTheme();
  const router = useRouter();
  const { segment } = useUserIdentityStore();
  const bannerConfig = SEGMENT_BANNER[segment];
  const exclusiveTabLabel = SEGMENT_EXCLUSIVE_LABEL[segment] ?? 'Exclusive';

  // Determine initial active tab from URL params
  const getInitialTab = (): OffersTabType => {
    if (initialTab === 'cashback') return 'cashback';
    if (initialTab === 'exclusive') return 'exclusive';
    return 'offers';
  };

  const [activeTab, setActiveTab] = useState<OffersTabType>(getInitialTab());
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBucket, setSelectedBucket] = useState<string | undefined>();
  const [selectedHotspot, setSelectedHotspot] = useState<string | undefined>();
  const isMounted = useIsMounted();

  // Track if we should scroll to a specific section based on URL params
  const [highlightSection, setHighlightSection] = useState<string | undefined>(initialType);

  // Get real API data from hook
  const { apiData, loading, error, refreshData, isUsingRealApi } = useOffersData();

  // Navigation handlers for View All buttons
  const handleViewAllOffers = useCallback((category: string) => {
    router.push({
      pathname: '/offers/view-all',
      params: { category },
    } as any);
  }, [router]);

  const handleViewAllStores = useCallback((type: string) => {
    // Navigate to store list with filter
    router.push({
      pathname: '/StoreListPage',
      params: { filter: type },
    } as any);
  }, [router]);

  const handleNavigateTo = useCallback((path: string, params?: Record<string, string>) => {
    try {
      if (params) {
        router.push({ pathname: path, params } as any);
      } else {
        router.push(path as any);
      }
    } catch (error) {
      // If route doesn't exist, just log it
    }
  }, [router]);

  // Use only real API data - no dummy fallbacks
  // Lightning deals are already transformed by useOffersData.ts via transformFlashSalesArray
  const offersData = useMemo(() => ({
    lightningDeals: apiData.lightningDeals || [],
    discountBuckets: apiData.discountBuckets || [],
    nearbyOffers: apiData.nearbyOffers || [],
    saleOffers: apiData.saleOffers || [],
    bogoOffers: apiData.bogoOffers || [],
    freeDeliveryOffers: apiData.freeDeliveryOffers || [],
    todaysOffers: apiData.todaysOffers || [],
    trendingOffers: apiData.trendingOffers || [],
    aiRecommendedOffers: apiData.aiRecommendedOffers || [],
    friendsRedeemed: apiData.friendsRedeemed || [],
    hotspotDeals: apiData.hotspots || [],
    lastChanceOffers: apiData.lastChanceOffers || [],
    newTodayOffers: apiData.newTodayOffers || [],
    // Cashback tab
    doubleCashbackCampaign: apiData.doubleCashback?.[0] || null,
    coinDrops: apiData.coinDrops || [],
    superCashbackStores: apiData.superCashbackStores || [],
    uploadBillStores: apiData.uploadBillStores || [],
    bankOffers: apiData.bankOffers || [],
    // Exclusive tab
    exclusiveCategories: apiData.exclusiveZones || [],
    specialProfiles: apiData.specialProfiles || [],
    loyaltyProgress: apiData.loyaltyMilestones || [],
  }), [apiData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    if (onRefresh) {
      await onRefresh();
    }
    // Refresh real API data
    refreshData();
    // Small delay for UX
    if (!isMounted()) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
    setRefreshing(false);
  }, [onRefresh, refreshData]);

  const handleBucketPress = (bucket: DiscountBucket) => {
    // Toggle selection state for visual feedback
    const newSelection = selectedBucket === bucket.filterValue ? undefined : bucket.filterValue;
    setSelectedBucket(newSelection);

    // Navigate to filtered offers view
    if (newSelection) {
      router.push({
        pathname: '/offers/view-all',
        params: {
          category: bucket.filterValue === 'free_delivery' ? 'free-delivery' : 'discount',
          discount: bucket.filterValue,
          title: bucket.label,
        },
      } as any);
    }
  };

  const handleHotspotPress = (hotspot: HotspotDeal) => {
    handleNavigateTo('/offers/view-all', { category: 'hotspot', areaId: hotspot.areaId, title: hotspot.areaName });
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.primary,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      paddingBottom: 100,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing['4xl'],
    },
    emptyText: {
      ...Typography.body,
      color: theme.colors.text.secondary,
      textAlign: 'center',
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing['4xl'],
      minHeight: 300,
    },
    // Tab empty state
    tabEmptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing['4xl'],
      paddingHorizontal: Spacing.lg,
      minHeight: 300,
    },
    tabEmptyIcon: {
      marginBottom: Spacing.md,
      opacity: 0.5,
    },
    tabEmptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text.primary,
      marginBottom: Spacing.xs,
      textAlign: 'center',
    },
    tabEmptySubtitle: {
      fontSize: 14,
      color: theme.colors.text.secondary,
      textAlign: 'center',
      marginBottom: Spacing.lg,
    },
    tabEmptyRefreshBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.accent.primary,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      borderRadius: 20,
      gap: 6,
    },
    tabEmptyRefreshText: {
      color: colors.background.primary,
      fontSize: 14,
      fontWeight: '600',
    },
    // Skeleton section styles
    skeletonSection: {
      marginBottom: Spacing.lg,
      paddingHorizontal: Spacing.base,
    },
    skeletonSectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.sm,
      paddingHorizontal: 4,
    },
    skeletonCardRow: {
      flexDirection: 'row',
      gap: 12,
    },
  });

  // Tab empty state component
  const TabEmptyState = ({ icon, tab }: { icon: string; tab: string }) => (
    <View style={styles.tabEmptyContainer}>
      <Ionicons
        name={icon as any}
        size={48}
        color={theme.colors.text.secondary}
        style={styles.tabEmptyIcon}
      />
      <Text style={styles.tabEmptyTitle}>No {tab} available right now</Text>
      <Text style={styles.tabEmptySubtitle}>
        Pull down to refresh or check back later for new offers!
      </Text>
      <Pressable style={styles.tabEmptyRefreshBtn} onPress={handleRefresh}>
        <Ionicons name="refresh" size={16} color={colors.background.primary} />
        <Text style={styles.tabEmptyRefreshText}>Refresh</Text>
      </Pressable>
    </View>
  );

  // Skeleton section for loading state
  const SkeletonSection = () => (
    <View style={styles.skeletonSection}>
      <View style={styles.skeletonSectionHeader}>
        <SkeletonLoader width={140} height={18} borderRadius={6} />
        <SkeletonLoader width={60} height={14} borderRadius={4} />
      </View>
      <HorizontalSkeletonList
        SkeletonComponent={SkeletonCard}
        count={3}
        cardWidth={160}
        gap={12}
      />
    </View>
  );

  // Simple skeleton card for horizontal lists
  const SkeletonCard = () => (
    <View style={{ width: 160 }}>
      <SkeletonLoader width={160} height={100} borderRadius={12} style={{ marginBottom: 8 }} />
      <SkeletonLoader width={120} height={14} borderRadius={4} style={{ marginBottom: 4 }} />
      <SkeletonLoader width={80} height={12} borderRadius={4} />
    </View>
  );

  // Loading skeleton for the entire tab
  const OffersLoadingSkeleton = () => (
    <View>
      {/* Section header + banner skeleton */}
      <View style={[styles.skeletonSection, { marginTop: Spacing.md }]}>
        <SkeletonLoader width="100%" height={120} borderRadius={16} />
      </View>
      {/* Horizontal card sections */}
      <SkeletonSection />
      <SkeletonSection />
      {/* Full card skeleton */}
      <DealCardSkeleton />
      <SkeletonSection />
    </View>
  );

  // Tab emptiness checks
  const isOffersTabEmpty = useMemo(() =>
    !offersData.lightningDeals.length && !offersData.discountBuckets.length &&
    !offersData.nearbyOffers.length && !offersData.saleOffers.length &&
    !offersData.bogoOffers.length && !offersData.freeDeliveryOffers.length &&
    !offersData.todaysOffers.length && !offersData.trendingOffers.length &&
    !offersData.aiRecommendedOffers.length && !offersData.friendsRedeemed.length &&
    !offersData.hotspotDeals.length && !offersData.lastChanceOffers.length &&
    !offersData.newTodayOffers.length
  , [offersData]);

  const isCashbackTabEmpty = useMemo(() => {
    const cashbackOffers = offersData.nearbyOffers.filter((o: any) => o.cashbackPercentage > 0);
    return !offersData.doubleCashbackCampaign && !offersData.coinDrops.length &&
      !offersData.superCashbackStores.length && !offersData.uploadBillStores.length &&
      !offersData.bankOffers.length && !cashbackOffers.length &&
      !offersData.trendingOffers.length;
  }, [offersData]);

  const isExclusiveTabEmpty = useMemo(() =>
    !offersData.exclusiveCategories.length && !offersData.specialProfiles.length &&
    !offersData.loyaltyProgress.length && !offersData.aiRecommendedOffers.length &&
    !offersData.newTodayOffers.length
  , [offersData]);

  const renderOffersTab = () => {
    if (!loading && isOffersTabEmpty) {
      return <TabEmptyState icon="pricetags-outline" tab="offers" />;
    }

    return (
      <>
        {/* Personalised segment banner */}
        {bannerConfig && (
          <Pressable
            onPress={() => router.push(bannerConfig.route as any)}
            style={{
              margin: 16,
              padding: 14,
              backgroundColor: bannerConfig.color + '18',
              borderRadius: 12,
              borderLeftWidth: 3,
              borderLeftColor: bannerConfig.color,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Ionicons name={bannerConfig.icon as any} size={20} color={bannerConfig.color} />
            <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: bannerConfig.color }}>
              {bannerConfig.text}
            </Text>
            <Ionicons name="arrow-forward" size={16} color={bannerConfig.color} />
          </Pressable>
        )}

        {offersData.lightningDeals.length > 0 && (
          <LightningDealsSection
            deals={offersData.lightningDeals}
            onViewAll={() => handleViewAllOffers('flash_sale')}
          />
        )}

        {offersData.discountBuckets.length > 0 && (
          <DiscountBucketsSection
            buckets={offersData.discountBuckets}
            selectedBucket={selectedBucket}
            onBucketPress={handleBucketPress}
          />
        )}

        {offersData.nearbyOffers.length > 0 && (
          <NearbyOffersSection
            offers={offersData.nearbyOffers}
            onViewAll={() => handleViewAllOffers('nearby')}
          />
        )}

        {offersData.saleOffers.length > 0 && (
          <SalesClearanceSection
            offers={offersData.saleOffers}
            onViewAll={() => handleViewAllOffers('sale')}
          />
        )}

        {offersData.bogoOffers.length > 0 && (
          <BOGOSection
            offers={offersData.bogoOffers}
            onViewAll={() => handleViewAllOffers('bogo')}
          />
        )}

        {offersData.freeDeliveryOffers.length > 0 && (
          <FreeDeliverySection
            offers={offersData.freeDeliveryOffers}
            onViewAll={() => handleViewAllOffers('free_delivery')}
          />
        )}

        {offersData.todaysOffers.length > 0 && (
          <TodaysOffersSection
            offers={offersData.todaysOffers}
            onViewAll={() => handleViewAllOffers('today')}
          />
        )}

        {offersData.trendingOffers.length > 0 && (
          <TrendingNowSection
            offers={offersData.trendingOffers}
            onViewAll={() => handleViewAllOffers('trending')}
          />
        )}

        {offersData.aiRecommendedOffers.length > 0 && (
          <AIRecommendedSection
            offers={offersData.aiRecommendedOffers}
            onViewAll={() => handleViewAllOffers('recommended')}
          />
        )}

        {offersData.friendsRedeemed.length > 0 && (
          <FriendsRedeemedSection
            offers={offersData.friendsRedeemed}
            onViewAll={() => handleViewAllOffers('friends_redeemed')}
          />
        )}

        {offersData.hotspotDeals.length > 0 && (
          <HotspotDealsSection
            hotspots={offersData.hotspotDeals}
            onHotspotPress={handleHotspotPress}
            selectedHotspot={selectedHotspot}
          />
        )}

        {offersData.lastChanceOffers.length > 0 && (
          <LastChanceSection
            offers={offersData.lastChanceOffers}
            onViewAll={() => handleViewAllOffers('expiring')}
          />
        )}

        {offersData.newTodayOffers.length > 0 && (
          <NewTodaySection
            offers={offersData.newTodayOffers}
            onViewAll={() => handleViewAllOffers('new_arrival')}
          />
        )}
      </>
    );
  };

  const renderCashbackTab = () => {
    const cashbackOffers = offersData.nearbyOffers.filter((o: any) => o.cashbackPercentage > 0);

    if (!loading && isCashbackTabEmpty) {
      return <TabEmptyState icon="cash-outline" tab="cashback offers" />;
    }

    return (
      <>
        {offersData.doubleCashbackCampaign && (
          <DoubleCashbackBanner
            campaign={offersData.doubleCashbackCampaign}
            onPress={() => handleNavigateTo('/offers/double-cashback')}
          />
        )}

        {offersData.coinDrops.length > 0 && (
          <CoinDropsSection
            coinDrops={offersData.coinDrops}
            onViewAll={() => handleViewAllOffers('cashback')}
          />
        )}

        {offersData.superCashbackStores.length > 0 && (
          <SuperCashbackSection
            stores={offersData.superCashbackStores}
            onViewAll={() => handleViewAllStores('super_cashback')}
          />
        )}

        {offersData.uploadBillStores.length > 0 && (
          <UploadBillSection
            stores={offersData.uploadBillStores}
            onViewAll={() => handleViewAllOffers('cashback')}
          />
        )}

        {offersData.bankOffers.length > 0 && (
          <BankOffersSection
            offers={offersData.bankOffers}
            onViewAll={() => handleNavigateTo('/bank-offers/')}
          />
        )}

        {cashbackOffers.length > 0 && (
          <NearbyOffersSection
            offers={cashbackOffers}
            onViewAll={() => handleViewAllOffers('cashback')}
          />
        )}

        {offersData.trendingOffers.length > 0 && (
          <TrendingNowSection
            offers={offersData.trendingOffers}
            onViewAll={() => handleViewAllOffers('trending')}
          />
        )}
      </>
    );
  };

  const renderExclusiveTab = () => {
    if (!loading && isExclusiveTabEmpty) {
      return <TabEmptyState icon="diamond-outline" tab="exclusive offers" />;
    }

    return (
      <>
        {/* Birthday Banner - only show when user has birthday-eligible exclusive zone */}
        {offersData.exclusiveCategories.some((z: any) =>
          z.eligibilityType === 'birthday_month' && z.userEligible
        ) && (
          <BirthdayBanner
            isActive={true}
            daysRemaining={
              offersData.exclusiveCategories.find((z: any) =>
                z.eligibilityType === 'birthday_month'
              )?.daysRemaining ?? 0
            }
            onPress={() => handleNavigateTo('/offers/zones/birthday')}
          />
        )}

        {offersData.exclusiveCategories.length > 0 && (
          <ExclusiveCategoriesGrid categories={offersData.exclusiveCategories} />
        )}

        {offersData.specialProfiles.length > 0 && (
          <SpecialProfilesSection
            profiles={offersData.specialProfiles}
            onViewAll={() => handleViewAllOffers('exclusive')}
          />
        )}

        {offersData.loyaltyProgress.length > 0 && (
          <LoyaltyProgressSection
            progress={offersData.loyaltyProgress}
            onViewAll={() => handleNavigateTo('/loyalty')}
          />
        )}

        {offersData.aiRecommendedOffers.length > 0 && (
          <AIRecommendedSection
            offers={offersData.aiRecommendedOffers}
            onViewAll={() => handleViewAllOffers('exclusive')}
          />
        )}

        {offersData.newTodayOffers.length > 0 && (
          <NewTodaySection
            offers={offersData.newTodayOffers}
            onViewAll={() => handleViewAllOffers('new_arrival')}
          />
        )}
      </>
    );
  };

  const renderTabContent = () => {
    // Show skeleton loaders when data is being fetched
    if (loading) {
      return <OffersLoadingSkeleton />;
    }

    // Show error state if there's an error
    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      );
    }

    switch (activeTab) {
      case 'offers':
        return renderOffersTab();
      case 'cashback':
        return renderCashbackTab();
      case 'exclusive':
        return renderExclusiveTab();
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <OffersTabs activeTab={activeTab} onTabChange={setActiveTab} exclusiveLabel={exclusiveTabLabel} />

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.accent.primary}
            colors={[theme.colors.accent.primary]}
          />
        }
      >
        {renderTabContent()}
      </ScrollView>
    </View>
  );
};

export default React.memo(OffersPageContent);
