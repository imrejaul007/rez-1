// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  Pressable,
  RefreshControl,
  Platform,
  Linking,
  StatusBar,
  Dimensions
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
import { platformAlertConfirm } from '@/utils/platformAlert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { safeOpenURL } from '@/utils/linking';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';

import cashStoreApi from '../../services/cashStoreApi';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { catchAndWarn } from '@/utils/catchAndReport';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Types ──────────────────────────────────────────────────
type OfferBadge = 'flash-sale' | 'limited-time' | 'best-deal' | 'mall-exclusive';

interface TransformedOffer {
  _id: string;
  title: string;
  cashbackRate: number;
  validUntil: string;
  badge?: OfferBadge;
  brand: {
    _id: string;
    name: string;
    logo: string;
  };
  externalUrl?: string;
  storeId?: string;
}

interface TransformedBrand {
  _id: string;
  name: string;
  logo: string;
  category: string;
  cashbackRate: number;
  externalUrl?: string;
  storeId?: string;
  isFeatured: boolean;
  rating?: number;
  ratingCount?: number;
}

// ─── Utilities ──────────────────────────────────────────────
function formatTimeLeft(dateStr: string): string {
  if (!dateStr) return '';
  const ms = new Date(dateStr).getTime() - Date.now();
  if (ms <= 0) return 'Ended';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((ms % 3600000) / 60000);
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

function isUrgent(dateStr: string): boolean {
  if (!dateStr) return false;
  const ms = new Date(dateStr).getTime() - Date.now();
  return ms > 0 && ms < 86400000;
}

function isExpired(dateStr: string): boolean {
  if (!dateStr) return false;
  return new Date(dateStr).getTime() <= Date.now();
}

function transformBrand(b: any): TransformedBrand {
  return {
    _id: b._id,
    name: b.name || '',
    logo: b.logo || '',
    category: b.mallCategory?.name || b.mallCategory?.slug || 'General',
    cashbackRate: b.cashback?.percentage || 0,
    externalUrl: b.externalUrl,
    storeId: b.storeId,
    isFeatured: b.isFeatured ?? false,
    rating: b.ratings?.average,
    ratingCount: b.ratings?.count,
  };
}

function transformOffer(o: any): TransformedOffer {
  return {
    _id: o._id || o.id,
    title: o.title || o.brand?.name || '',
    cashbackRate: o.cashbackRate || o.cashback?.percentage || 0,
    validUntil: o.validUntil || o.expiresAt || '',
    badge: o.badge || undefined,
    brand: {
      _id: o.brand?._id || o.brand?.id || o._id,
      name: o.brand?.name || o.name || '',
      logo: o.brand?.logo || o.logo || '',
    },
    externalUrl: o.externalUrl || o.brand?.externalUrl,
    storeId: o.storeId || o.brand?.storeId,
  };
}

const BADGE_CONFIG: Record<OfferBadge, { label: string; bg: string; text: string; icon: string }> = {
  'flash-sale': { label: 'Flash Sale', bg: colors.errorScale[100], text: colors.error, icon: 'flash' },
  'limited-time': { label: 'Limited Time', bg: colors.tint.amberLight, text: colors.brand.amberDeep, icon: 'time' },
  'best-deal': { label: 'Best Deal', bg: '#E0F2FE', text: colors.brand.skyDark, icon: 'ribbon' },
  'mall-exclusive': { label: 'Exclusive', bg: colors.tint.purple, text: colors.brand.purple, icon: 'diamond' },
};

// ─── Retry Helper ───────────────────────────────────────────
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === maxRetries) throw err;
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 500));
    }
  }
  throw new Error('Retry exhausted');
}

// ─── Main Component ─────────────────────────────────────────
function TrendingOffersPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const clickingRef = useRef(false);

  // Data
  const [activeOffers, setActiveOffers] = useState<TransformedOffer[]>([]);
  const [popularBrands, setPopularBrands] = useState<TransformedBrand[]>([]);
  const [highCashbackBrands, setHighCashbackBrands] = useState<TransformedBrand[]>([]);

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trackingBrandId, setTrackingBrandId] = useState<string | null>(null);

  // Timer tick
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  // ─── Fetch Data ──────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await cashStoreApi.getTrending();

      // Filter out expired offers
      const offers = (result.activeOffers || [])
        .map(transformOffer)
        .filter(o => !isExpired(o.validUntil));

      if (!isMounted()) return;
      setActiveOffers(offers);
      if (!isMounted()) return;
      setPopularBrands((result.popularBrands || []).map(transformBrand));
      if (!isMounted()) return;
      setHighCashbackBrands((result.highCashbackBrands || []).map(transformBrand));
    } catch (err) {
      if (!isMounted()) return;
      setError('Unable to load trending offers. Pull down to retry.');
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchData().finally(() => setIsLoading(false));
  }, [fetchData]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchData();
    if (!isMounted()) return;
    setIsRefreshing(false);
  }, [fetchData]);

  // ─── Click Handler with Deduplication + Retry ─────────────
  const handleBrandPress = useCallback(async (brand: TransformedBrand) => {
    if (clickingRef.current) return;
    clickingRef.current = true;

    try {
      setTrackingBrandId(brand._id);

      if (brand.externalUrl) {
        const result = await withRetry(
          () => cashStoreApi.trackAffiliateClick(brand._id),
          2
        );
        const url = result?.trackingUrl || brand.externalUrl;
        if (!url) throw new Error('No URL available');

        await WebBrowser.openBrowserAsync(url, {
          toolbarColor: colors.nileBlue,
          controlsColor: colors.background.primary,
        });
      } else if (brand.storeId) {
        router.push(`/MainStorePage?storeId=${brand.storeId}` as any);
      }
    } catch (err) {
      if (brand.externalUrl) {
        platformAlertConfirm(
          'Tracking Issue',
          'Your cashback may not be tracked. Open anyway?',
          () => { try { safeOpenURL(brand.externalUrl!); } catch (e) { catchAndWarn(e, 'CashStoreTrending/openURL'); } },
          'Open Anyway'
        );
      }
    } finally {
      if (!isMounted()) return;
      setTrackingBrandId(null);
      setTimeout(() => { clickingRef.current = false; }, 1000);
    }
  }, [router]);

  const handleOfferPress = useCallback(async (offer: TransformedOffer) => {
    if (clickingRef.current) return;
    if (isExpired(offer.validUntil)) return;
    clickingRef.current = true;

    try {
      setTrackingBrandId(offer.brand._id);

      if (offer.externalUrl) {
        const result = await withRetry(
          () => cashStoreApi.trackAffiliateClick(offer.brand._id),
          2
        );
        const url = result?.trackingUrl || offer.externalUrl;
        if (!url) throw new Error('No URL available');

        await WebBrowser.openBrowserAsync(url, {
          toolbarColor: colors.nileBlue,
          controlsColor: colors.background.primary,
        });
      } else if (offer.storeId) {
        router.push(`/MainStorePage?storeId=${offer.storeId}` as any);
      }
    } catch (err) {
      if (offer.externalUrl) {
        platformAlertConfirm(
          'Tracking Issue',
          'Your cashback may not be tracked. Open anyway?',
          () => { try { safeOpenURL(offer.externalUrl!); } catch (e) { catchAndWarn(e, 'CashStoreTrending/openURL'); } },
          'Open Anyway'
        );
      }
    } finally {
      if (!isMounted()) return;
      setTrackingBrandId(null);
      setTimeout(() => { clickingRef.current = false; }, 1000);
    }
  }, [router]);

  // ─── Computed ──────────────────────────────────────────────
  const hasNoData =
    !isLoading &&
    activeOffers.length === 0 &&
    popularBrands.length === 0 &&
    highCashbackBrands.length === 0;

  const hasError = error && hasNoData;
  const headerTop = Platform.OS === 'web' ? 0 : insets.top;

  const totalBrands = popularBrands.length + highCashbackBrands.length;
  const maxCashback = Math.max(
    ...popularBrands.map(b => b.cashbackRate),
    ...highCashbackBrands.map(b => b.cashbackRate),
    0
  );

  // ─── Loading Skeleton ────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={[styles.stickyHeader, { paddingTop: headerTop }]}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={20} color={colors.nileBlue} />
            </Pressable>
            <Text style={styles.headerTitle}>Trending Offers</Text>
            <View style={{ width: 36 }} />
          </View>
        </View>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Stats bar skeleton */}
          <View style={styles.statsBarSkeleton} />

          {/* Offer skeletons */}
          <View style={[styles.sectionHeader, { marginTop: 20 }]}>
            <View style={[styles.skeletonLine, { width: 140, height: 14 }]} />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.offersListContent}
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <OfferSkeletonCard key={`offer-sk-${i}`} index={i} />
            ))}
          </ScrollView>

          {/* Brand skeletons */}
          <View style={[styles.sectionHeader, { marginTop: 28 }]}>
            <View style={[styles.skeletonLine, { width: 120, height: 14 }]} />
          </View>
          <View style={styles.brandListContainer}>
            {Array.from({ length: 6 }).map((_, i) => (
              <BrandSkeletonCard key={`brand-sk-${i}`} index={i} />
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  // ─── Error / Empty State ─────────────────────────────────
  if (hasNoData) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={[styles.stickyHeader, { paddingTop: headerTop }]}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={20} color={colors.nileBlue} />
            </Pressable>
            <Text style={styles.headerTitle}>Trending Offers</Text>
            <View style={{ width: 36 }} />
          </View>
        </View>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.emptyScrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.nileBlue}
              colors={[Colors.nileBlue]}
            />
          }
        >
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconWrap, hasError && { backgroundColor: 'rgba(232,116,79,0.1)' }]}>
              <Ionicons
                name={hasError ? 'cloud-offline-outline' : 'flame-outline'}
                size={32}
                color={hasError ? '#E8744F' : Colors.nileBlue}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {hasError ? 'Something went wrong' : 'No trending offers yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {hasError ? error : 'Trending deals refresh daily — check back soon!'}
            </Text>
            {hasError && (
              <Pressable
                onPress={handleRefresh}
                style={styles.retryBtn}
              >
                <Ionicons name="refresh" size={14} color={Colors.text.inverse} />
                <Text style={styles.retryBtnText}>Try Again</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  const renderOfferItem = useCallback(({ item, index }: { item: TransformedOffer; index: number }) => (
    <OfferCard
      offer={item}
      index={index}
      onPress={() => handleOfferPress(item)}
      isTracking={trackingBrandId === item.brand._id}
    />
  ), [handleOfferPress, trackingBrandId]);

  // ─── Main Render ──────────────────────────────────────────
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
            <Text style={styles.headerTitle}>Trending Offers</Text>
            {totalBrands > 0 && (
              <View style={styles.headerCountBadge}>
                <Text style={styles.headerCountText}>{totalBrands}</Text>
              </View>
            )}
          </View>
          <View style={{ width: 36 }} />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.nileBlue}
            colors={[Colors.nileBlue]}
          />
        }
      >
        {/* Stats Bar — Social Proof */}
        {totalBrands > 0 && (
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Ionicons name="pricetag" size={13} color={Colors.nileBlue} />
              <Text style={styles.statText}>{totalBrands} Brands</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="flame" size={13} color="#E8744F" />
              <Text style={styles.statText}>Up to {maxCashback}% Cashback</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="shield-checkmark" size={13} color={Colors.success} />
              <Text style={styles.statText}>Tracked</Text>
            </View>
          </View>
        )}

        {/* ─── Section 1: Limited Time Offers ─── */}
        {activeOffers.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <LinearGradient
                  colors={['#E8744F', colors.error]}
                  style={styles.sectionIconWrap}
                >
                  <Ionicons name="flash" size={14} color={Colors.text.inverse} />
                </LinearGradient>
                <Text style={styles.sectionTitle}>Limited Time Offers</Text>
              </View>
              <View style={styles.sectionCountBadge}>
                <Text style={styles.sectionCountText}>{activeOffers.length}</Text>
              </View>
            </View>

            <FlashList
              data={activeOffers}
              renderItem={renderOfferItem}
              keyExtractor={(item) => item._id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.offersListContent}
              estimatedItemSize={150}
            />
          </View>
        )}

        {/* ─── Section 2: Most Popular ─── */}
        {popularBrands.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <LinearGradient
                  colors={[colors.nileBlue, colors.brand.nileBlueLight]}
                  style={styles.sectionIconWrap}
                >
                  <Ionicons name="trending-up" size={14} color={Colors.gold} />
                </LinearGradient>
                <Text style={styles.sectionTitle}>Most Popular</Text>
              </View>
            </View>

            <View style={styles.brandListContainer}>
              {popularBrands.map((brand, index) => (
                <BrandCard
                  key={brand._id}
                  brand={brand}
                  index={index}
                  onPress={() => handleBrandPress(brand)}
                  isTracking={trackingBrandId === brand._id}
                />
              ))}
            </View>
          </View>
        )}

        {/* ─── Section 3: Highest Cashback ─── */}
        {highCashbackBrands.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <LinearGradient
                  colors={[colors.successScale[700], colors.successScale[400]]}
                  style={styles.sectionIconWrap}
                >
                  <Ionicons name="flame" size={14} color={Colors.text.inverse} />
                </LinearGradient>
                <Text style={styles.sectionTitle}>Highest Cashback</Text>
              </View>
            </View>

            <View style={styles.brandListContainer}>
              {highCashbackBrands.map((brand, index) => (
                <BrandCard
                  key={brand._id}
                  brand={brand}
                  index={index}
                  onPress={() => handleBrandPress(brand)}
                  showHotTag
                  isTracking={trackingBrandId === brand._id}
                />
              ))}
            </View>
          </View>
        )}

        {/* Trust Footer */}
        <View style={styles.trustFooter}>
          <View style={styles.trustRow}>
            <Ionicons name="shield-checkmark" size={14} color={Colors.success} />
            <Text style={styles.trustText}>All clicks tracked via secure affiliate links</Text>
          </View>
          <View style={styles.trustRow}>
            <Ionicons name="time" size={14} color={Colors.nileBlue} />
            <Text style={styles.trustText}>Cashback credited within 7-14 days</Text>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

// ─── Offer Card (Horizontal) ────────────────────────────────
const OfferCard = React.memo(({
  offer,
  index,
  onPress,
  isTracking,
}: {
  offer: TransformedOffer;
  index: number;
  onPress: () => void;
  isTracking: boolean;
}) => {
  const fadeAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(1);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    fadeAnim.value = withTiming(1, { duration: 350 });
  }, [index]);

  const handlePressIn = () => {
    scaleAnim.value = withSpring(0.96);
  };

  const handlePressOut = () => {
    scaleAnim.value = withSpring(1);
  };

  const offerCardStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [
      { scale: scaleAnim.value },
      { translateY: interpolate(fadeAnim.value, [0, 1], [10, 0]) },
    ],
  }));

  const urgent = isUrgent(offer.validUntil);
  const timeLeft = formatTimeLeft(offer.validUntil);
  const ended = timeLeft === 'Ended';
  const badgeInfo = offer.badge ? BADGE_CONFIG[offer.badge] : null;
  const isHot = offer.cashbackRate >= 10;

  return (
    <Animated.View
      style={[
        styles.offerCardWrapper,
        offerCardStyle,
      ]}
    >
      <Pressable
        style={[styles.offerCard, urgent && !ended && styles.offerCardUrgent, ended && styles.offerCardEnded]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
       
        disabled={ended || isTracking}
      >
        {/* Badge */}
        {badgeInfo && (
          <View style={[styles.offerBadge, { backgroundColor: badgeInfo.bg }]}>
            <Ionicons name={badgeInfo.icon as any} size={8} color={badgeInfo.text} />
            <Text style={[styles.offerBadgeText, { color: badgeInfo.text }]}>
              {badgeInfo.label}
            </Text>
          </View>
        )}

        {/* Brand Logo */}
        <View style={styles.offerLogoArea}>
          {offer.brand.logo?.startsWith('http') && !logoError ? (
            <CachedImage
              source={offer.brand.logo}
              style={styles.offerLogo}
              contentFit="contain"
              onError={() => setLogoError(true)}
            />
          ) : (
            <LinearGradient colors={[colors.nileBlue, colors.brand.nileBlueLight]} style={styles.offerLogoPlaceholder}>
              <Text style={styles.offerLogoInitial}>
                {offer.brand.name.charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
          )}
        </View>

        {/* Title */}
        <Text style={styles.offerTitle} numberOfLines={1}>
          {offer.title || offer.brand.name}
        </Text>

        {/* Cashback Badge */}
        <View style={[styles.offerCashbackPill, isHot && styles.offerCashbackPillHot]}>
          <Text style={[styles.offerCashbackValue, isHot && styles.offerCashbackValueHot]}>
            {offer.cashbackRate}%
          </Text>
          <Text style={[styles.offerCashbackLabel, isHot && styles.offerCashbackLabelHot]}>
            cashback
          </Text>
        </View>

        {/* Timer */}
        {offer.validUntil ? (
          <View style={[styles.offerTimerWrap, urgent && !ended && styles.offerTimerUrgent]}>
            <Ionicons
              name={ended ? 'close-circle' : 'time-outline'}
              size={10}
              color={ended ? colors.neutral[400] : urgent ? colors.error : '#7C8A97'}
            />
            <Text
              style={[
                styles.offerTimerText,
                ended && styles.offerTimerEnded,
                urgent && !ended && styles.offerTimerTextUrgent,
              ]}
            >
              {timeLeft}
            </Text>
          </View>
        ) : null}

        {/* Tracking Overlay */}
        {isTracking && (
          <View style={styles.trackingOverlay}>
            <Text style={styles.trackingText}>Tracking...</Text>
          </View>
        )}

        {/* Ended Overlay */}
        {ended && (
          <View style={styles.endedOverlay}>
            <Text style={styles.endedText}>Expired</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
});

// ─── Brand Card (Full-Width Vertical) ────────────────────────
const BrandCard = React.memo(({
  brand,
  index,
  onPress,
  showHotTag = false,
  isTracking = false,
}: {
  brand: TransformedBrand;
  index: number;
  onPress: () => void;
  showHotTag?: boolean;
  isTracking?: boolean;
}) => {
  const fadeAnim = useSharedValue(0);
  const pressAnim = useSharedValue(1);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    fadeAnim.value = withTiming(1, { duration: 350 });
  }, [index]);

  const handlePressIn = () => {
    pressAnim.value = withSpring(0.975);
  };

  const handlePressOut = () => {
    pressAnim.value = withSpring(1);
  };

  const brandCardStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [
      { scale: pressAnim.value },
      { translateY: interpolate(fadeAnim.value, [0, 1], [12, 0]) },
    ],
  }));

  const isHot = showHotTag || brand.cashbackRate >= 10;
  const cashbackColor = isHot ? colors.successScale[700] : Colors.nileBlue;
  const cashbackBg = isHot ? colors.tint.greenLight : '#F0F4F8';

  return (
    <Animated.View
      style={[
        styles.brandCardWrapper,
        brandCardStyle,
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
       
        style={styles.brandCard}
        disabled={isTracking}
      >
        {/* Hot accent bar */}
        {isHot && <View style={styles.hotAccent} />}

        {/* Logo */}
        <View style={[styles.brandLogoArea, isHot && styles.brandLogoAreaHot]}>
          {brand.logo?.startsWith('http') && !logoError ? (
            <CachedImage
              source={brand.logo}
              style={styles.brandLogo}
              contentFit="contain"
              onError={() => setLogoError(true)}
            />
          ) : (
            <LinearGradient colors={[colors.nileBlue, colors.brand.nileBlueLight]} style={styles.brandLogoPlaceholder}>
              <Text style={styles.brandLogoInitial}>{brand.name.charAt(0).toUpperCase()}</Text>
            </LinearGradient>
          )}
        </View>

        {/* Info */}
        <View style={styles.brandInfoContainer}>
          <View style={styles.brandNameRow}>
            <Text style={styles.brandName} numberOfLines={1}>
              {brand.name}
            </Text>
            {brand.isFeatured && (
              <Ionicons name="checkmark-circle" size={13} color={colors.infoScale[400]} />
            )}
          </View>

          <View style={styles.brandMetaRow}>
            {brand.category ? (
              <View style={styles.categoryChip}>
                <Text style={styles.categoryChipText}>{brand.category}</Text>
              </View>
            ) : null}
            {brand.rating ? (
              <View style={styles.ratingPill}>
                <Ionicons name="star" size={9} color={colors.warningScale[400]} />
                <Text style={styles.ratingText}>{brand.rating.toFixed(1)}</Text>
                {brand.ratingCount ? (
                  <Text style={styles.ratingCount}>
                    ({brand.ratingCount > 999 ? `${(brand.ratingCount / 1000).toFixed(0)}K` : brand.ratingCount})
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>

          {isHot && (
            <View style={styles.hotTag}>
              <Ionicons name="flame" size={10} color={Colors.text.inverse} />
              <Text style={styles.hotTagText}>Hot Deal</Text>
            </View>
          )}
        </View>

        {/* Cashback Badge */}
        <View style={styles.cashbackOuter}>
          <View style={[styles.cashbackBadge, { backgroundColor: cashbackBg }]}>
            <Text style={[styles.cashbackRate, { color: cashbackColor }]}>{brand.cashbackRate}%</Text>
            <Text style={[styles.cashbackLabel, { color: isHot ? colors.successScale[700] : colors.neutral[500] }]}>cashback</Text>
          </View>
          <View style={styles.arrowCircle}>
            {isTracking ? (
              <Ionicons name="hourglass" size={11} color={Colors.nileBlue} />
            ) : (
              <Ionicons name="arrow-forward" size={12} color={Colors.nileBlue} />
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
});

// ─── Skeleton: Offer Card ───────────────────────────────────
const OfferSkeletonCard = React.memo(({ index }: { index: number }) => {
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

  const offerSkeletonStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.3, 0.8]),
  }));

  return (
    <Animated.View style={[styles.offerCardWrapper, offerSkeletonStyle]}>
      <View style={styles.offerCard}>
        <View style={[styles.offerLogoArea, { backgroundColor: '#F0EBE4' }]} />
        <View style={[styles.skeletonLine, { width: 100, height: 12, marginTop: 8 }]} />
        <View style={[styles.skeletonLine, { width: 60, height: 20, marginTop: 8, borderRadius: 8 }]} />
        <View style={[styles.skeletonLine, { width: 70, height: 10, marginTop: 8 }]} />
      </View>
    </Animated.View>
  );
});

// ─── Skeleton: Brand Card ───────────────────────────────────
const BrandSkeletonCard = React.memo(({ index }: { index: number }) => {
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

  const brandSkeletonStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.3, 0.8]),
  }));

  return (
    <Animated.View style={[styles.brandSkeletonCard, brandSkeletonStyle]}>
      <View style={styles.brandSkeletonLogo} />
      <View style={styles.brandSkeletonInfo}>
        <View style={[styles.skeletonLine, { width: '60%', height: 12 }]} />
        <View style={[styles.skeletonLine, { width: '40%', height: 8, marginTop: 8 }]} />
        <View style={[styles.skeletonLine, { width: '25%', height: 8, marginTop: 6 }]} />
      </View>
      <View style={{ alignItems: 'center' }}>
        <View style={[styles.skeletonLine, { width: 44, height: 28, borderRadius: 8 }]} />
        <View style={[styles.skeletonLine, { width: 24, height: 24, borderRadius: 12, marginTop: 6 }]} />
      </View>
    </Animated.View>
  );
});

// ─── Styles ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  scrollContent: {
    paddingBottom: 0,
  },
  emptyScrollContent: {
    flexGrow: 1,
  },

  // ── Sticky Header ──
  stickyHeader: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: Colors.nileBlue,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
      web: { boxShadow: '0 2px 8px rgba(26,58,82,0.06)' },
    }),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
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
    gap: Spacing.sm,
  },
  headerTitle: {
    ...Typography.h3,
    fontWeight: '800',
    color: Colors.text.primary,
    letterSpacing: -0.5,
  },
  headerCountBadge: {
    backgroundColor: '#F0F4F8',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
  },
  headerCountText: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: colors.slateGray,
  },

  // ── Stats Bar ──
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.base,
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: Colors.background.primary,
    borderRadius: 14,
    gap: 0,
    borderWidth: 1,
    borderColor: '#F0EBE4',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
      android: { elevation: 1 },
      web: { boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
    }),
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  statText: {
    ...Typography.caption,
    fontWeight: '600',
    color: '#475569',
  },
  statDivider: {
    width: 1,
    height: Spacing.base,
    backgroundColor: '#E8E2DB',
  },
  statsBarSkeleton: {
    marginHorizontal: Spacing.base,
    marginTop: 14,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#EFEBE6',
  },

  // ── Sections ──
  section: {
    marginTop: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.text.primary,
    letterSpacing: -0.3,
  },
  sectionCountBadge: {
    backgroundColor: colors.errorScale[100],
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
  },
  sectionCountText: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.error,
  },

  // ── Offer Cards (horizontal) ──
  offersListContent: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.md,
  },
  offerCardWrapper: {
    width: 180,
  },
  offerCard: {
    width: 180,
    backgroundColor: Colors.background.primary,
    borderRadius: 18,
    padding: Spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F0EBE4',
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: Colors.nileBlue, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10 },
      android: { elevation: 3 },
      web: { boxShadow: '0 3px 10px rgba(26,58,82,0.08)' },
    }),
  },
  offerCardUrgent: {
    borderColor: colors.errorScale[200],
    borderWidth: 1.5,
  },
  offerCardEnded: {
    opacity: 0.6,
  },

  // Badge
  offerBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    zIndex: 1,
  },
  offerBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // Logo
  offerLogoArea: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: '#EFEBE6',
  },
  offerLogo: {
    width: 32,
    height: 32,
  },
  offerLogoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  offerLogoInitial: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.inverse,
  },

  // Title
  offerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 6,
    maxWidth: '95%',
  },

  // Cashback Pill
  offerCashbackPill: {
    backgroundColor: '#F0F4F8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  offerCashbackPillHot: {
    backgroundColor: colors.tint.greenLight,
  },
  offerCashbackValue: {
    ...Typography.h4,
    fontWeight: '800',
    color: Colors.nileBlue,
    letterSpacing: -0.5,
  },
  offerCashbackValueHot: {
    color: colors.successScale[700],
  },
  offerCashbackLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.neutral[500],
  },
  offerCashbackLabelHot: {
    color: colors.successScale[700],
  },

  // Timer
  offerTimerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 6,
    backgroundColor: '#F4F1ED',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  offerTimerUrgent: {
    backgroundColor: colors.errorScale[50],
  },
  offerTimerText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#7C8A97',
  },
  offerTimerEnded: {
    color: colors.neutral[400],
  },
  offerTimerTextUrgent: {
    color: colors.error,
  },

  // Tracking / Ended Overlays
  trackingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26,58,82,0.08)',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackingText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.nileBlue,
  },
  endedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  endedText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral[400],
  },

  // ── Brand Cards (full-width vertical) ──
  brandListContainer: {
    paddingHorizontal: 16,
    gap: 10,
  },
  brandCardWrapper: {
    // gap on parent handles spacing
  },
  brandCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: 18,
    padding: 14,
    gap: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0EBE4',
    ...Platform.select({
      ios: { shadowColor: colors.nileBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 10px rgba(26,58,82,0.06)' },
    }),
  },

  // Hot accent bar
  hotAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.successScale[400],
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },

  // Brand Logo
  brandLogoArea: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#F8F5F0',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EFEBE6',
  },
  brandLogoAreaHot: {
    borderColor: 'rgba(16,185,129,0.2)',
  },
  brandLogo: {
    width: 34,
    height: 34,
  },
  brandLogoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandLogoInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.background.primary,
  },

  // Brand Info
  brandInfoContainer: {
    flex: 1,
    gap: 4,
  },
  brandNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  brandName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    flexShrink: 1,
    letterSpacing: -0.2,
  },
  brandMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  categoryChip: {
    backgroundColor: '#F4F1ED',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  categoryChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#7C8A97',
    textTransform: 'capitalize',
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7C8A97',
  },
  ratingCount: {
    fontSize: 10,
    color: '#B0B8C1',
  },

  // Hot Tag
  hotTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-start',
    backgroundColor: colors.successScale[400],
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  hotTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.background.primary,
  },

  // Cashback
  cashbackOuter: {
    alignItems: 'center',
    gap: 6,
  },
  cashbackBadge: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 56,
  },
  cashbackRate: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  cashbackLabel: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: -1,
  },
  arrowCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F4F1ED',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Trust Footer ──
  trustFooter: {
    marginTop: 32,
    marginHorizontal: 16,
    padding: 16,
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#F0EBE4',
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trustText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.slateGray,
  },

  // ── Empty State ──
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: 'rgba(26,58,82,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Retry
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.nileBlue,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 14,
    marginTop: 18,
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background.primary,
  },

  // ── Skeletons ──
  skeletonLine: {
    backgroundColor: '#F0EBE4',
    borderRadius: 6,
  },
  brandSkeletonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.background.primary,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F0EBE4',
  },
  brandSkeletonLogo: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#F0EBE4',
  },
  brandSkeletonInfo: {
    flex: 1,
  },
  brandSkeletonCashback: {
    width: 48,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F0EBE4',
  },
});

export default withErrorBoundary(TrendingOffersPage, 'CashStoreTrending');
