// MainStorePage.tsx - Orchestrator component for store page
// All data fetching & state management lives in useMainStorePageData hook.
// All section rendering is delegated to extracted components.
import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  Platform,
  RefreshControl,
  StatusBar,
  Text,
  Pressable,
  View,
  NativeSyntheticEvent,
  NativeScrollEvent} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { useRouter } from "expo-router";
import { ThemedView } from "@/components/ThemedView";
import {
  MainStoreHeader,
  ProductDisplay,
  TabNavigation,
  CashbackHeroCard,
  StoreQuickInfoCard,
  StoreActionButtons as NewStoreActionButtons,
  UserLoyaltyCard,
  PaymentMethodsCard,
  StoreBottomActionBar,
} from "./MainStoreSection";
import { MainStorePageProps } from "@/types/mainstore";
import {
  StoreHeaderSkeleton,
  ProductGridSkeleton,
  PromotionBannerSkeleton,
} from "@/components/skeletons";
import { Colors, Spacing } from "@/constants/DesignSystem";
import { createStyles } from "./MainStorePage.styles";
import { withErrorBoundary } from "@/utils/withErrorBoundary";

// Extracted section components
import StoreInfoHeader from "@/components/store/StoreInfoHeader";
import BookTableCard from "@/components/store/BookTableCard";
import StoreOffersBuilder from "@/components/store/StoreOffersBuilder";
import ReviewsTabContent from "@/components/store/ReviewsTabContent";
import AboutTabContent from "@/components/store/AboutTabContent";
import MenuTabContent from "@/components/store/MenuTabContent";
import PhotosTabContent from "@/components/store/PhotosTabContent";
import AlwaysVisibleSections from "@/components/store/AlwaysVisibleSections";
import StoreModals, { buildAboutModalData } from "@/components/store/StoreModals";

// Custom hook for all data/state/handlers
import { useMainStorePageData } from "@/hooks/useMainStorePageData";

function MainStorePage({ productId, initialProduct }: MainStorePageProps = {}) {
  const router = useRouter();
  const d = useMainStorePageData({ productId, initialProduct });

  // Responsive layout
  const isWeb = Platform.OS === "web";
  const isDesktop = d.screenData.width >= 1024;
  const HORIZONTAL_PADDING = (() => {
    if (d.screenData.width < 375) return 12;
    if (d.screenData.width < 768) return 16;
    if (d.screenData.width < 1024) return 24;
    if (d.screenData.width < 1440) return 32;
    return Math.max(32, (d.screenData.width - 1200) / 2);
  })();
  const MAX_CONTENT_WIDTH = isDesktop ? 1200 : undefined;

  // Sticky tab navigation state
  const scrollY = useSharedValue(0);
  const [showStickyTabs, setShowStickyTabs] = useState(false);
  const stickyHeaderAnim = useSharedValue(0);
  const tabsContainerRef = useRef<View>(null);
  const tabsPositionY = useRef(0);
  const tabsPositionMeasured = useRef(false);

  useEffect(() => {
    stickyHeaderAnim.value = withTiming(showStickyTabs ? 1 : 0, { duration: 200 });
  }, [showStickyTabs, stickyHeaderAnim]);

  // Measure tabs position after page loads
  useEffect(() => {
    if (!d.pageLoading) {
      const timer = setTimeout(() => {
        if (tabsContainerRef.current && (tabsContainerRef.current as any).measure) {
          (tabsContainerRef.current as any).measure(
            (_x: number, y: number, _w: number, height: number) => {
              tabsPositionY.current = y + height;
              tabsPositionMeasured.current = true;
            }
          );
        } else {
          tabsPositionY.current = 550;
          tabsPositionMeasured.current = true;
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [d.pageLoading]);

  // Reset sticky tabs on refresh
  useEffect(() => {
    if (d.refreshing) {
      setShowStickyTabs(false);
      tabsPositionMeasured.current = false;
    }
  }, [d.refreshing]);

  const styles = useMemo(() => createStyles(HORIZONTAL_PADDING, d.screenData), [HORIZONTAL_PADDING, d.screenData]);

  // About modal data (memoized)
  const aboutModalData = useMemo(
    () => buildAboutModalData(d.storeData, d.fullStoreDataRef.current, d.fetchedStoreData, d.productData, d.isDynamic),
    [d.storeData, d.fetchedStoreData, d.productData, d.isDynamic]
  );

  // Sticky header animated style
  const stickyHeaderAnimStyle = useAnimatedStyle(() => ({
    opacity: stickyHeaderAnim.value,
    transform: [{ translateY: interpolate(stickyHeaderAnim.value, [0, 1], [-20, 0]) }],
  }));

  // Shared tab navigation props
  const tabNavProps = {
    activeTab: d.activeTab,
    onTabChange: d.handleTabChange,
    menuTabLabel: d.menuTabLabel,
    maxSavingsPercent:
      typeof d.storeData?.cashback === "number" ? d.storeData.cashback
        : typeof d.storeData?.discount === "number" ? d.storeData.discount
          : undefined,
    reviewCount: d.totalReviewCount,
    photoCount: (d.storeData as any)?.photoCount,
  };

  return (
    <ThemedView style={styles.page}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />

      <MainStoreHeader
        storeName={d.currentStoreName || ""}
        storeCategory={d.storeData?.category || d.productData.category || "Store"}
        onBack={d.handleBackPress}
        onFavoritePress={d.handleFavoritePress}
        isFavorited={d.isFavorited}
        userCoins={d.userCoins}
        storeId={d.currentStoreId}
      />

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
          const y = event.nativeEvent.contentOffset.y;
          scrollY.value = y;
          setShowStickyTabs(tabsPositionMeasured.current && y > tabsPositionY.current);
        }}
        contentContainerStyle={[styles.scrollContent, isWeb && styles.webScrollContent]}
        refreshControl={
          <RefreshControl
            refreshing={d.refreshing}
            onRefresh={d.onRefresh}
            colors={[Colors.gold, Colors.nileBlue]}
            tintColor={Colors.gold}
            title="Pull to refresh"
            titleColor={Colors.text.tertiary}
          />
        }
      >
        <View style={[styles.contentWrapper, MAX_CONTENT_WIDTH && { maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center" as const, width: "100%" }]}>
          {d.pageLoading ? (
            <>
              <PromotionBannerSkeleton count={2} />
              <StoreHeaderSkeleton />
              <View style={{ paddingHorizontal: HORIZONTAL_PADDING, marginTop: Spacing.lg }}>
                <ProductGridSkeleton count={6} />
              </View>
            </>
          ) : (
            <>
              {/* Banner / Product Display */}
              <View style={styles.imageSection}>
                <View style={styles.imageCard}>
                  <ProductDisplay
                    images={d.productData.images}
                    onSharePress={d.handleSharePress}
                    onFavoritePress={d.handleFavoritePress}
                    isFavorited={d.isFavorited}
                    rating={d.avgRating}
                    reviewCount={d.totalReviewCount}
                    categoryTags={d.storeData?.tags || []}
                    phoneNumber={d.storeData?.contact?.phone}
                    locationCoords={
                      d.storeData?.location && typeof d.storeData.location === "object"
                        ? (() => {
                            const coords = (d.storeData.location as any).coordinates;
                            if (!coords) return undefined;
                            const lat = coords.lat || coords[1] || 0;
                            const lng = coords.lng || coords[0] || 0;
                            return lat && lng ? { lat, lng } : undefined;
                          })()
                        : undefined
                    }
                  />
                </View>
              </View>

              {/* Store Info Header */}
              {(d.productData.title || d.storeData?.name) && (
                <StoreInfoHeader
                  storeName={d.productData.title || d.storeData?.name || "Store"}
                  rating={d.avgRating}
                  categoryTags={d.storeData?.tags || []}
                  horizontalPadding={HORIZONTAL_PADDING}
                />
              )}

              {/* Cashback Hero Card */}
              {d.isDynamic && d.storeData && (() => {
                const cashbackVal = typeof d.storeData.cashback === "number"
                  ? d.storeData.cashback : (d.storeData as any).offers?.cashback || 0;
                return cashbackVal > 0 ? (
                  <CashbackHeroCard cashbackPercentage={cashbackVal} coinsToEarn={(d.storeData as any).rewardRules?.reviewBonusCoins || 50} />
                ) : null;
              })()}

              {/* Store Action Buttons */}
              <NewStoreActionButtons
                storeId={d.currentStoreId}
                onScanPay={() => router.push({ pathname: "/pay-in-store/enter-amount", params: { storeId: d.currentStoreId, storeName: d.currentStoreName || "", storeLogo: d.currentStoreLogo } } as any)}
                onUploadBill={() => router.push({ pathname: "/bill-upload", params: { storeId: d.currentStoreId, storeName: d.currentStoreName } } as any)}
                onViewOffers={() => router.push({ pathname: "/CardOffersPage", params: { storeId: d.currentStoreId, storeName: d.currentStoreName, orderValue: "1000" } } as any)}
              />

              {/* Store Quick Info */}
              {d.isDynamic && d.storeData && (
                <StoreQuickInfoCard
                  storeName={d.storeData.name || d.storeData.title || d.productData.title}
                  description={d.storeData.description}
                  isVerified={(d.storeData as any).isVerified}
                  operationalInfo={d.storeData.operationalInfo}
                  location={
                    d.storeData.location && typeof d.storeData.location === "object"
                      ? {
                          address: (d.storeData.location as any).address,
                          city: (d.storeData.location as any).city,
                          state: (d.storeData.location as any).state,
                          coordinates: (d.storeData.location as any).coordinates
                            ? { lat: (d.storeData.location as any).coordinates.lat || (d.storeData.location as any).coordinates[1], lng: (d.storeData.location as any).coordinates.lng || (d.storeData.location as any).coordinates[0] }
                            : undefined,
                        }
                      : undefined
                  }
                />
              )}

              {/* Book a Table */}
              {d.isDynamic && d.storeData && (
                <BookTableCard
                  storeId={d.currentStoreId}
                  storeName={d.currentStoreName || ""}
                  storeCategory={d.storeData.category || ""}
                  onPress={(sId, sName) => router.push(`/MainCategory/food-dining/book-table?storeId=${sId}&storeName=${encodeURIComponent(sName)}` as any)}
                />
              )}

              {/* Store Offers Preview */}
              {d.isDynamic && d.storeData && (
                <StoreOffersBuilder
                  storeData={d.storeData as any}
                  storeId={d.currentStoreId}
                  storeName={d.currentStoreName || ""}
                  onViewAll={() => router.push({ pathname: "/CardOffersPage", params: { storeId: d.currentStoreId, storeName: d.currentStoreName } } as any)}
                  onApplyOffer={(offer) => router.push({ pathname: "/pay-in-store", params: { storeId: d.currentStoreId, offerId: offer.id } } as any)}
                />
              )}

              {/* User Loyalty Card */}
              {d.isDynamic && d.storeData && d.userVisitsData && (
                <UserLoyaltyCard
                  visitsCompleted={d.userVisitsData.visitsCompleted}
                  totalVisitsRequired={d.userVisitsData.totalVisitsRequired}
                  nextReward={d.userVisitsData.nextReward}
                  rewardIcon="cafe"
                  onViewDetails={() => router.push({ pathname: "/loyalty", params: { storeId: d.currentStoreId, storeName: d.currentStoreName } } as any)}
                />
              )}

              {/* Payment Methods Card */}
              {d.isDynamic && d.storeData && d.fullStoreDataRef.current?.paymentSettings && (
                <PaymentMethodsCard
                  acceptPromoCoins={(d.storeData as any).paymentSettings?.acceptPromoCoins !== false}
                  acceptBrandedCoins={true}
                  acceptRezCoins={(d.storeData as any).paymentSettings?.acceptRezCoins !== false}
                  acceptUPI={(d.storeData as any).paymentSettings?.acceptUPI !== false}
                  acceptCards={(d.storeData as any).paymentSettings?.acceptCards !== false}
                  acceptPayLater={(d.storeData as any).paymentSettings?.acceptPayLater === true}
                />
              )}

              {/* Tab Navigation */}
              <View
                ref={tabsContainerRef}
                style={styles.tabsContainer}
                onLayout={(e) => {
                  tabsPositionY.current = e.nativeEvent.layout.y + e.nativeEvent.layout.height;
                  tabsPositionMeasured.current = true;
                }}
              >
                <TabNavigation {...tabNavProps} />
              </View>

              {/* Tab Content */}
              {d.activeTab === "menu" && (
                <MenuTabContent
                  productData={d.productData}
                  storeData={d.storeData}
                  isDynamic={d.isDynamic}
                  isFavorited={d.isFavorited}
                  onFavoritedChange={d.setIsFavorited}
                  sectionCardStyle={styles.sectionCard}
                />
              )}

              {d.activeTab === "reviews" && (
                <ReviewsTabContent
                  storeName={d.currentStoreName || ""}
                  averageRating={d.avgRating}
                  totalReviews={d.totalReviewCount}
                  ratingBreakdown={d.reviewRatingBreakdown}
                  reviews={d.storeReviews}
                  reviewsLoading={d.reviewsLoading}
                  canReview={d.canReview}
                  ugcContent={d.ugcContent}
                  ugcLoading={d.ugcLoading}
                  onWriteReview={d.openWriteReviewModal}
                  onReviewLike={d.handleReviewLike}
                  onReviewReport={d.handleReviewReport}
                  onReviewHelpful={d.handleReviewHelpful}
                  sectionCardStyle={styles.sectionCard}
                />
              )}

              {d.activeTab === "photos" && (
                <PhotosTabContent
                  storeId={d.productData.storeId}
                  storeIdParam={d.storeIdParam}
                  onViewAllPress={d.handleViewAllPress}
                  onImagePress={d.handleImagePress}
                  sectionCardStyle={styles.sectionCard}
                />
              )}

              {d.activeTab === "about" && (
                <AboutTabContent
                  storeId={d.productData.storeId}
                  storeCategory={d.isDynamic && d.storeData ? d.storeData.category : undefined}
                  isDynamic={d.isDynamic}
                  sectionCardStyle={styles.sectionCard}
                />
              )}

              {/* Always-visible sections */}
              <AlwaysVisibleSections
                storeId={d.productData.storeId}
                storeData={d.storeData}
                isDynamic={d.isDynamic}
                productLocation={d.productData.location}
                sectionCardStyle={styles.sectionCard}
              />
            </>
          )}
        </View>
      </Animated.ScrollView>

      {/* Sticky Tab Navigation */}
      <Animated.View
        style={[
          styles.stickyTabsContainer,
          stickyHeaderAnimStyle,
          {
            pointerEvents: showStickyTabs ? "auto" : "none",
          },
        ]}
      >
        <View style={styles.stickyTabsInner}>
          <TabNavigation {...tabNavProps} compact />
        </View>
      </Animated.View>

      {/* Error Toast */}
      {d.error && (
        <View style={styles.errorToast}>
          <Pressable onPress={() => d.setError(null)}>
            <View style={styles.errorInner}>
              <View style={styles.errorDot} />
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.errorText}>{d.error}</Text>
              </View>
            </View>
          </Pressable>
        </View>
      )}

      {/* Modals */}
      <StoreModals
        showAboutModal={d.showAboutModal}
        onCloseAboutModal={d.handleCloseAboutModal}
        aboutModalData={aboutModalData}
        showDealsModal={d.showDealsModal}
        onCloseDealsModal={d.handleCloseDealsModal}
        storeId={d.currentStoreId}
        showReviewModal={d.showReviewModal}
        onCloseReviewModal={d.handleCloseReviewModal}
        storeName={d.currentStoreName || ""}
        reviewStoreId={d.reviewStoreId || d.productData.storeId}
        averageRating={d.avgRating}
        totalReviews={d.totalReviewCount}
        ratingBreakdown={d.reviewRatingBreakdown}
        reviews={d.storeReviews}
        onLikeReview={d.handleReviewLike}
        onReportReview={d.handleReviewReport}
        onHelpfulReview={d.handleReviewHelpful}
        onWriteReview={d.canReview !== false ? d.handleWriteReview : undefined}
        ugcContent={d.ugcContent}
        ugcLoading={d.ugcLoading}
        showWriteReviewModal={d.showWriteReviewModal}
        onCloseWriteReviewModal={d.handleCloseWriteReviewModal}
        writeReviewStoreId={d.reviewStoreId || d.productData.storeId}
        writeReviewStoreName={d.currentStoreName || ""}
        onReviewSubmitted={d.handleReviewSubmitted}
      />

      {/* Bottom Action Bar */}
      <StoreBottomActionBar
        storeId={d.currentStoreId}
        onScanPayEarn={() => router.push({ pathname: "/pay-in-store/enter-amount", params: { storeId: d.currentStoreId, storeName: d.currentStoreName || "", storeLogo: d.currentStoreLogo } } as any)}
      />
    </ThemedView>
  );
}

export default withErrorBoundary(MainStorePage, 'Store Page');

