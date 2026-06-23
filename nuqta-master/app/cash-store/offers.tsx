import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useCallback, useEffect} from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  Pressable,
  RefreshControl,
  Platform,
  StatusBar,
  Dimensions
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming } from 'react-native-reanimated';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import cashStoreApi from '../../services/cashStoreApi';
import couponService from '../../services/couponApi';
import realVouchersApi from '../../services/realVouchersApi';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Types ──────────────────────────────────────────────────
interface Campaign {
  _id: string;
  title: string;
  subtitle: string;
  multiplier: number;
  startTime: string;
  endTime: string;
  eligibleStores: string[];
  eligibleStoreNames?: string[];
  terms: string[];
  backgroundColor?: string;
  isActive: boolean;
}

interface CoinDrop {
  _id: string;
  storeId: string | { _id: string; name?: string; logo?: string };
  storeName: string;
  storeLogo?: string;
  multiplier: number;
  normalCashback: number;
  boostedCashback: number;
  category: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface FeaturedCoupon {
  _id: string;
  title: string;
  couponCode: string;
  description?: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minOrderValue?: number;
  maxDiscountCap?: number;
  validTo?: string;
  isFeatured?: boolean;
  tags?: string[];
  applicableTo?: {
    stores?: Array<string | { _id: string; name: string }>;
  };
}

interface TopBrand {
  _id: string;
  name: string;
  logo?: string;
  cashbackRate?: number;
  cashbackPercentage?: number;
  category?: string;
}

// ─── Helpers ────────────────────────────────────────────────
function formatTimeLeft(endTime: string): string {
  const end = new Date(endTime).getTime();
  if (isNaN(end)) return 'Ending soon';
  const ms = end - Date.now();
  if (ms <= 0) return 'Ended';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h left`;
  const mins = Math.floor((ms % 3600000) / 60000);
  return hours > 0 ? `${hours}h ${mins}m left` : `${mins}m left`;
}

function getGradientColors(backgroundColor?: string): [string, string] {
  if (backgroundColor) {
    return [backgroundColor, shadeColor(backgroundColor, -30)];
  }
  return [Colors.nileBlue, '#0f2536'];
}

function shadeColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  if (isNaN(num)) return '#0f2536';
  const r = Math.min(255, Math.max(0, (num >> 16) + percent));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + percent));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + percent));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function getStoreId(storeId: string | { _id: string }): string {
  if (typeof storeId === 'object' && storeId?._id) return storeId._id;
  return storeId as string;
}

// ─── Skeleton Shimmer ───────────────────────────────────────
const SkeletonBlock = React.memo(({ width: w, height: h, style, index = 0 }: {
  width: number | string;
  height: number;
  style?: any;
  index?: number;
}) => {
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

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.3, 0.7]),
  }));

  return (
    <Animated.View
      style={[
        {
          width: w as any,
          height: h,
          borderRadius: 12,
          backgroundColor: '#E8E2DB' },
        shimmerStyle,
        style,
      ]}
    />
  );
});

// ─── Main Component ─────────────────────────────────────────
function OffersPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [coinDrops, setCoinDrops] = useState<CoinDrop[]>([]);
  const [featuredCoupons, setFeaturedCoupons] = useState<FeaturedCoupon[]>([]);
  const [highCashbackBrands, setHighCashbackBrands] = useState<TopBrand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live countdown timer — re-renders every 30s
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  // ─── Data Fetching (resilient — partial success OK) ───────
  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const results = await Promise.allSettled([
        cashStoreApi.getDoubleCampaigns(),
        cashStoreApi.getCoinDrops(),
        couponService.getFeaturedCoupons(),
        cashStoreApi.getTrending(),
      ]);

      // 1. Double Cashback campaigns
      if (results[0].status === 'fulfilled') {
        if (!isMounted()) return;
        setCampaigns(
          (results[0].value || []).filter((c: Campaign) => c.isActive)
        );
      } else {
      }

      // 2. Coin drops
      if (results[1].status === 'fulfilled') {
        if (!isMounted()) return;
        setCoinDrops(
          (results[1].value || []).filter((d: CoinDrop) => d.isActive)
        );
      } else {
      }

      // 3. Featured coupons
      if (results[2].status === 'fulfilled') {
        const res = results[2].value;
        const arr = res?.data?.coupons || res?.data || [];
        if (!isMounted()) return;
        setFeaturedCoupons(Array.isArray(arr) ? arr.slice(0, 4) : []);
      } else {
      }

      // 4. Trending data (high cashback brands)
      if (results[3].status === 'fulfilled') {
        const trending = results[3].value;
        if (!isMounted()) return;
        setHighCashbackBrands((trending?.highCashbackBrands || []).slice(0, 6));
      } else {
      }

      // Only show error if ALL failed
      const allFailed = results.every((r) => r.status === 'rejected');
      if (allFailed) {
        setError('Unable to load offers. Please try again.');
      }
    } catch (err) {
      if (!isMounted()) return;
      setError('Something went wrong. Please try again.');
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

  // ─── Handlers ──────────────────────────────────────────────
  const handleCoinDropPress = useCallback((drop: CoinDrop) => {
    const storeId = getStoreId(drop.storeId);
    if (storeId) {
      router.push(`/MainStorePage?storeId=${storeId}` as any);
    }
  }, [router]);

  // ─── Computed ─────────────────────────────────────────────
  const headerTop = Platform.OS === 'web' ? 0 : insets.top;
  const totalOffers = campaigns.length + coinDrops.length + featuredCoupons.length + highCashbackBrands.length;
  const hasContent = totalOffers > 0;
  const someFailed = !error && (
    campaigns.length === 0 && coinDrops.length === 0 &&
    featuredCoupons.length === 0 && highCashbackBrands.length === 0
  );

  // ─── Loading Skeleton ─────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={[styles.stickyHeader, { paddingTop: headerTop }]}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={20} color={Colors.nileBlue} />
            </Pressable>
            <Text style={styles.headerTitle}>Offers</Text>
            <View style={styles.headerSpacer} />
          </View>
        </View>
        <View style={styles.skeletonWrap}>
          <SkeletonBlock width="100%" height={100} index={0} style={{ marginBottom: 16 }} />
          <SkeletonBlock width="40%" height={14} index={1} style={{ marginBottom: 12 }} />
          <SkeletonBlock width="100%" height={90} index={2} style={{ marginBottom: 10 }} />
          <SkeletonBlock width="100%" height={90} index={3} style={{ marginBottom: 20 }} />
          <SkeletonBlock width="40%" height={14} index={4} style={{ marginBottom: 12 }} />
          <SkeletonBlock width="100%" height={140} index={5} style={{ marginBottom: 20 }} />
          <SkeletonBlock width="40%" height={14} index={6} style={{ marginBottom: 12 }} />
          <SkeletonBlock width="100%" height={80} index={7} style={{ marginBottom: 10 }} />
          <SkeletonBlock width="100%" height={80} index={8} />
        </View>
      </View>
    );
  }

  // ─── Render ───────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Sticky Header */}
      <View style={[styles.stickyHeader, { paddingTop: headerTop }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={Colors.nileBlue} />
          </Pressable>
          <Text style={styles.headerTitle}>Offers</Text>
          <View style={styles.headerSpacer} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.brand.sand}
            colors={[colors.brand.sand]}
          />
        }
      >
        {/* ─── Error State ─────────────────────────────── */}
        {error && !hasContent && (
          <View style={styles.errorContainer}>
            <View style={styles.errorIconWrap}>
              <Ionicons name="cloud-offline-outline" size={32} color="#E8744F" />
            </View>
            <Text style={styles.errorTitle}>{error}</Text>
            <Pressable
              onPress={handleRefresh}
              style={styles.retryBtn}
            >
              <Ionicons name="refresh" size={14} color={Colors.text.inverse} />
              <Text style={styles.retryText}>Try Again</Text>
            </Pressable>
          </View>
        )}

        {/* ─── Inline error banner (partial failure) ─── */}
        {error && hasContent && (
          <View style={styles.errorBanner}>
            <Ionicons name="warning-outline" size={14} color={colors.brand.amberDeep} />
            <Text style={styles.errorBannerText}>Some data may be outdated</Text>
            <Pressable onPress={handleRefresh} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.errorBannerRetry}>Refresh</Text>
            </Pressable>
          </View>
        )}

        {!hasContent && !error && !isLoading ? (
          /* ─── Empty State ──────────────────────────────── */
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="gift-outline" size={36} color="#C4956A" />
            </View>
            <Text style={styles.emptyTitle}>No offers right now</Text>
            <Text style={styles.emptySubtitle}>
              Check back soon for coupons, cashback deals & more!
            </Text>
            <Pressable
              onPress={() => router.push('/cash-store' as any)}
              style={styles.browseBtn}
            >
              <Text style={styles.browseBtnText}>Browse Cash Store</Text>
              <Ionicons name="arrow-forward" size={14} color={Colors.text.inverse} />
            </Pressable>
          </View>
        ) : hasContent ? (
          <>
            {/* ─── Hero Summary Banner ──────────────────── */}
            <View style={styles.heroBannerWrap}>
              <LinearGradient
                colors={[Colors.nileBlue, '#0f2536']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroBanner}
              >
                <View style={styles.heroDecorCircle} />
                <View style={styles.heroDecorCircle2} />
                <View style={styles.heroContent}>
                  <View style={styles.heroIconRow}>
                    <View style={styles.heroIconBadge}>
                      <Ionicons name="flash" size={18} color={Colors.nileBlue} />
                    </View>
                    {totalOffers > 0 && (
                      <View style={styles.heroCountBadge}>
                        <Text style={styles.heroCountText}>{totalOffers} active</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.heroTitle}>All Offers</Text>
                  <Text style={styles.heroSubtitle}>
                    Coupons, cashback deals & boosted rewards — all in one place
                  </Text>
                </View>
              </LinearGradient>
            </View>

            {/* ─── Featured Coupons Section ─────────────── */}
            {featuredCoupons.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIconWrap}>
                    <Ionicons name="pricetag" size={15} color={colors.brand.pink} />
                  </View>
                  <Text style={styles.sectionTitle}>Featured Coupons</Text>
                  <Pressable
                    onPress={() => router.push('/account/coupons' as any)}
                    style={styles.seeAllBtn}
                  >
                    <Text style={styles.seeAllText}>See All</Text>
                    <Ionicons name="chevron-forward" size={14} color={Colors.nileBlue} />
                  </Pressable>
                </View>

                {featuredCoupons.map((coupon) => {
                  const discount = coupon.discountType === 'PERCENTAGE'
                    ? `${coupon.discountValue}% Off`
                    : `${currencySymbol}${coupon.discountValue} Off`;
                  const timeLeft = coupon.validTo ? formatTimeLeft(coupon.validTo) : '';
                  const isEnded = timeLeft === 'Ended';

                  return (
                    <Pressable
                      key={coupon._id}
                      onPress={() => router.push('/account/coupons' as any)}
                     
                      style={styles.couponCard}
                    >
                      <View style={styles.couponLeft}>
                        <View style={styles.couponDiscountBadge}>
                          <Text style={styles.couponDiscountText}>{discount}</Text>
                        </View>
                      </View>
                      <View style={styles.couponDivider} />
                      <View style={styles.couponRight}>
                        <Text style={styles.couponTitle} numberOfLines={1}>{coupon.title}</Text>
                        {coupon.description ? (
                          <Text style={styles.couponDesc} numberOfLines={1}>{coupon.description}</Text>
                        ) : null}
                        <View style={styles.couponMeta}>
                          <View style={styles.couponCodeBadge}>
                            <Text style={styles.couponCodeText}>{coupon.couponCode}</Text>
                          </View>
                          {timeLeft && !isEnded ? (
                            <View style={styles.couponTimeBadge}>
                              <Ionicons name="time-outline" size={10} color="#7C8A97" />
                              <Text style={styles.couponTimeText}>{timeLeft}</Text>
                            </View>
                          ) : null}
                        </View>
                        {coupon.minOrderValue ? (
                          <Text style={styles.couponMinOrder}>Min. order {currencySymbol}{coupon.minOrderValue}</Text>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* ─── Double Cashback Section ──────────────── */}
            {campaigns.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIconWrap, { backgroundColor: 'rgba(245,158,11,0.12)' }]}>
                    <Ionicons name="flame" size={15} color={Colors.warning} />
                  </View>
                  <Text style={styles.sectionTitle}>Double Cashback</Text>
                  <Pressable
                    onPress={() => router.push('/offers/double-cashback' as any)}
                    style={styles.seeAllBtn}
                  >
                    <Text style={styles.seeAllText}>See All</Text>
                    <Ionicons name="chevron-forward" size={14} color={Colors.nileBlue} />
                  </Pressable>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.campaignScroll}
                >
                  {campaigns.map((campaign) => {
                    const gradientColors = getGradientColors(campaign.backgroundColor);
                    const timeLeft = formatTimeLeft(campaign.endTime);
                    const isEnded = timeLeft === 'Ended';

                    return (
                      <Pressable
                        key={campaign._id}
                        onPress={() => router.push('/offers/double-cashback' as any)}
                       
                        style={styles.campaignCard}
                      >
                        <LinearGradient
                          colors={gradientColors}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.campaignGradient}
                        >
                          <View style={styles.campaignDecorCircle} />
                          <View style={styles.campaignTopRow}>
                            <View style={styles.multiplierBadge}>
                              <Text style={styles.multiplierText}>{campaign.multiplier}X</Text>
                            </View>
                            <View style={[
                              styles.campaignTimeBadge,
                              isEnded && styles.campaignTimeBadgeEnded,
                            ]}>
                              <Ionicons
                                name="time-outline"
                                size={11}
                                color={isEnded ? Colors.error : 'rgba(255,255,255,0.9)'}
                              />
                              <Text style={[
                                styles.campaignTimeText,
                                isEnded && { color: Colors.error },
                              ]}>
                                {timeLeft}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.campaignTitle} numberOfLines={2}>{campaign.title}</Text>
                          {campaign.subtitle ? (
                            <Text style={styles.campaignSubtitle} numberOfLines={1}>
                              {campaign.subtitle}
                            </Text>
                          ) : null}
                          <View style={styles.campaignStoreCount}>
                            <Ionicons name="storefront-outline" size={12} color="rgba(255,255,255,0.7)" />
                            <Text style={styles.campaignStoreCountText}>
                              {campaign.eligibleStores?.length || 0} stores
                            </Text>
                          </View>
                        </LinearGradient>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* ─── Coin Drops Section ────────────────────── */}
            {coinDrops.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIconWrap, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
                    <Ionicons name="trending-up" size={15} color={Colors.success} />
                  </View>
                  <Text style={styles.sectionTitle}>Coin Drops</Text>
                  <View style={styles.sectionCountBadge}>
                    <Text style={styles.sectionCountText}>{coinDrops.length}</Text>
                  </View>
                </View>

                {coinDrops.map((drop) => {
                  const timeLeft = formatTimeLeft(drop.endTime);
                  const isEnded = timeLeft === 'Ended';

                  return (
                    <Pressable
                      key={drop._id}
                      onPress={() => handleCoinDropPress(drop)}
                     
                      style={styles.dropCard}
                      disabled={isEnded}
                    >
                      <View style={styles.dropLeft}>
                        <View style={styles.dropLogoWrap}>
                          {drop.storeLogo ? (
                            <CachedImage source={drop.storeLogo} style={styles.dropLogo} />
                          ) : (
                            <View style={styles.dropLogoFallback}>
                              <Ionicons name="storefront" size={20} color="#C4956A" />
                            </View>
                          )}
                        </View>
                        <View style={styles.dropInfo}>
                          <Text style={styles.dropStoreName} numberOfLines={1}>
                            {drop.storeName}
                          </Text>
                          <View style={styles.dropRatesRow}>
                            <Text style={styles.dropNormalRate}>{drop.normalCashback}%</Text>
                            <Ionicons name="arrow-forward" size={12} color="#C4956A" />
                            <Text style={styles.dropBoostedRate}>{drop.boostedCashback}%</Text>
                          </View>
                          <View style={styles.dropMetaRow}>
                            {drop.category ? (
                              <View style={styles.categoryTag}>
                                <Text style={styles.categoryTagText}>{drop.category}</Text>
                              </View>
                            ) : null}
                            <View style={styles.dropTimeRow}>
                              <Ionicons
                                name="time-outline"
                                size={11}
                                color={isEnded ? Colors.error : '#A0A8B1'}
                              />
                              <Text style={[styles.dropTimeText, isEnded && styles.dropTimeEnded]}>
                                {timeLeft}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                      <View style={styles.dropRightArea}>
                        <View style={styles.dropMultiplierBadge}>
                          <Text style={styles.dropMultiplierText}>{drop.multiplier}X</Text>
                        </View>
                        {!isEnded && (
                          <Ionicons name="chevron-forward" size={14} color="#C4C4C4" style={{ marginTop: 4 }} />
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* ─── Top Cashback Brands Section ──────────── */}
            {highCashbackBrands.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIconWrap, { backgroundColor: 'rgba(139,92,246,0.12)' }]}>
                    <Ionicons name="diamond" size={15} color={colors.brand.purpleLight} />
                  </View>
                  <Text style={styles.sectionTitle}>Top Cashback Brands</Text>
                  <Pressable
                    onPress={() => router.push('/cash-store/brands' as any)}
                    style={styles.seeAllBtn}
                  >
                    <Text style={styles.seeAllText}>See All</Text>
                    <Ionicons name="chevron-forward" size={14} color={Colors.nileBlue} />
                  </Pressable>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.brandsScroll}
                >
                  {highCashbackBrands.map((brand) => {
                    const rate = brand.cashbackRate || brand.cashbackPercentage || 0;
                    return (
                      <Pressable
                        key={brand._id}
                        onPress={() => router.push(`/vouchers/brand/${brand._id}` as any)}
                       
                        style={styles.brandCard}
                      >
                        <View style={styles.brandLogoWrap}>
                          {brand.logo && brand.logo.startsWith('http') ? (
                            <CachedImage source={brand.logo} style={styles.brandLogo} />
                          ) : (
                            <View style={styles.brandLogoFallback}>
                              <Ionicons name="gift" size={22} color="#C4956A" />
                            </View>
                          )}
                        </View>
                        <Text style={styles.brandName} numberOfLines={1}>{brand.name}</Text>
                        {rate > 0 && (
                          <View style={styles.brandRateBadge}>
                            <Text style={styles.brandRateText}>{rate}% back</Text>
                          </View>
                        )}
                        {brand.category ? (
                          <Text style={styles.brandCategory} numberOfLines={1}>{brand.category}</Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* ─── Quick Actions ─────────────────────────── */}
            <View style={styles.section}>
              <View style={styles.quickActionsGrid}>
                {[
                  { icon: 'gift-outline' as const, label: 'Gift Cards', route: '/cash-store/buy-coupons', color: colors.brand.purpleLight, bg: 'rgba(139,92,246,0.08)' },
                  { icon: 'pricetag-outline' as const, label: 'My Coupons', route: '/account/coupons', color: colors.brand.pink, bg: 'rgba(236,72,153,0.08)' },
                  { icon: 'flash-outline' as const, label: '2X Cashback', route: '/offers/double-cashback', color: Colors.warning, bg: 'rgba(245,158,11,0.08)' },
                  { icon: 'wallet-outline' as const, label: 'My Cashback', route: '/account/cashback', color: Colors.success, bg: 'rgba(16,185,129,0.08)' },
                ].map((action, i) => (
                  <Pressable
                    key={i}
                    onPress={() => router.push(action.route as any)}
                   
                    style={styles.quickActionCard}
                  >
                    <View style={[styles.quickActionIcon, { backgroundColor: action.bg }]}>
                      <Ionicons name={action.icon} size={20} color={action.color} />
                    </View>
                    <Text style={styles.quickActionLabel}>{action.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        ) : null}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1ED' },
  scrollView: {
    flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 120 },

  // ── Sticky Header ──
  stickyHeader: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#EDEAE6' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    gap: 10 },
  backBtn: {
    width: Spacing['2xl'],
    height: Spacing['2xl'],
    borderRadius: Spacing.base,
    backgroundColor: '#F4F1ED',
    justifyContent: 'center',
    alignItems: 'center' },
  headerTitle: {
    flex: 1,
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.nileBlue,
    letterSpacing: -0.3 },

  // ── Skeleton ──
  skeletonWrap: {
    padding: Spacing.base },

  // ── Error State ──
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: Spacing['2xl'] },
  errorIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(232,116,79,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18 },
  errorTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.nileBlue,
    textAlign: 'center',
    marginBottom: Spacing.base },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.nileBlue,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: BorderRadius.xl },
  retryText: {
    ...Typography.bodySmall,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.inverse },

  // ── Error Banner (partial failure) ──
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.md,
    backgroundColor: Colors.warningScale[50],
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BorderRadius.md },
  errorBannerText: {
    flex: 1,
    ...Typography.bodySmall,
    fontWeight: '500',
    color: colors.brand.amberDark },
  errorBannerRetry: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: colors.brand.amberDeep },

  // ── Hero Banner ──
  heroBannerWrap: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.xs },
  heroBanner: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    overflow: 'hidden',
    position: 'relative' },
  heroDecorCircle: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)' },
  heroDecorCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -10,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.03)' },
  heroContent: {
    position: 'relative',
    zIndex: 1 },
  heroIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12 },
  heroIconBadge: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gold,
    justifyContent: 'center',
    alignItems: 'center' },
  heroCountBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10 },
  heroCountText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)' },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text.inverse,
    marginBottom: Spacing.xs,
    letterSpacing: -0.3 },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 18 },

  // ── Sections ──
  section: {
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.lg },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 14 },
  sectionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(236,72,153,0.12)',
    justifyContent: 'center',
    alignItems: 'center' },
  sectionTitle: {
    flex: 1,
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.nileBlue,
    letterSpacing: -0.2 },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: Spacing.xs,
    paddingHorizontal: 6 },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.nileBlue },
  sectionCountBadge: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#EDEAE6' },
  sectionCountText: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: '#7C8A97' },

  // ── Featured Coupon Card ──
  couponCard: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EDEAE6',
    ...Shadows.subtle },
  couponLeft: {
    width: 90,
    backgroundColor: Colors.nileBlue,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md },
  couponDiscountBadge: {
    alignItems: 'center' },
  couponDiscountText: {
    ...Typography.bodyLarge,
    fontWeight: '800',
    color: Colors.gold,
    textAlign: 'center',
    letterSpacing: -0.3 },
  couponDivider: {
    width: 1,
    backgroundColor: '#EDEAE6' },
  couponRight: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'center' },
  couponTitle: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginBottom: 3,
    letterSpacing: -0.2 },
  couponDesc: {
    ...Typography.bodySmall,
    color: '#7C8A97',
    marginBottom: 6 },
  couponMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs },
  couponCodeBadge: {
    backgroundColor: '#F4F1ED',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D5CFC8' },
  couponCodeText: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.nileBlue,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  couponTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3 },
  couponTimeText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#7C8A97' },
  couponMinOrder: {
    fontSize: 11,
    color: '#A0A8B1' },

  // ── Campaign Cards (horizontal scroll) ──
  campaignScroll: {
    paddingRight: Spacing.base },
  campaignCard: {
    width: SCREEN_WIDTH * 0.72,
    marginRight: Spacing.md,
    borderRadius: 18,
    overflow: 'hidden',
    ...Shadows.medium },
  campaignGradient: {
    padding: 18,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative' },
  campaignDecorCircle: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.06)' },
  campaignTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12 },
  multiplierBadge: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: Colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#B8860B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4 },
  multiplierText: {
    fontSize: 19,
    fontWeight: '900',
    color: Colors.nileBlue,
    letterSpacing: -0.5 },
  campaignTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10 },
  campaignTimeBadgeEnded: {
    backgroundColor: 'rgba(239,68,68,0.15)' },
  campaignTimeText: {
    ...Typography.caption,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)' },
  campaignTitle: {
    ...Typography.h4,
    fontSize: 17,
    fontWeight: '800',
    color: Colors.text.inverse,
    marginBottom: Spacing.xs,
    letterSpacing: -0.2 },
  campaignSubtitle: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.65)',
    marginBottom: 10 },
  campaignStoreCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5 },
  campaignStoreCountText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)' },

  // ── Coin Drop Card ──
  dropCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EDEAE6',
    ...Shadows.subtle },
  dropLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md },
  dropLogoWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F4F1ED',
    borderWidth: 1,
    borderColor: '#EDEAE6',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden' },
  dropLogo: {
    width: 40,
    height: 40,
    resizeMode: 'contain' },
  dropLogoFallback: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center' },
  dropInfo: {
    flex: 1 },
  dropStoreName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginBottom: Spacing.xs,
    letterSpacing: -0.2 },
  dropRatesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6 },
  dropNormalRate: {
    fontSize: 13,
    fontWeight: '500',
    color: '#B0A99F',
    textDecorationLine: 'line-through',
    textDecorationColor: '#B0A99F' },
  dropBoostedRate: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.brand.sand,
    letterSpacing: -0.2 },
  dropMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm },
  categoryTag: {
    backgroundColor: '#F4F1ED',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm },
  categoryTagText: {
    ...Typography.caption,
    fontWeight: '600',
    color: '#7C8A97' },
  dropTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3 },
  dropTimeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#A0A8B1' },
  dropTimeEnded: {
    color: Colors.error },
  dropRightArea: {
    marginLeft: 10,
    alignItems: 'center' },
  dropMultiplierBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#B8860B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3 },
  dropMultiplierText: {
    ...Typography.bodyLarge,
    fontWeight: '900',
    color: Colors.nileBlue,
    letterSpacing: -0.3 },

  // ── Brand Cards (horizontal scroll) ──
  brandsScroll: {
    paddingRight: Spacing.base },
  brandCard: {
    width: 110,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginRight: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EDEAE6',
    ...Shadows.subtle },
  brandLogoWrap: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.lg,
    backgroundColor: '#F4F1ED',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: Spacing.sm },
  brandLogo: {
    width: 44,
    height: 44,
    resizeMode: 'contain' },
  brandLogoFallback: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center' },
  brandName: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.nileBlue,
    textAlign: 'center',
    marginBottom: Spacing.xs,
    letterSpacing: -0.2 },
  brandRateBadge: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs },
  brandRateText: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.success },
  brandCategory: {
    ...Typography.overline,
    fontWeight: '500',
    color: '#A0A8B1',
    textAlign: 'center',
    letterSpacing: 0,
    textTransform: 'none' },

  // ── Quick Actions ──
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10 },
  quickActionCard: {
    width: (SCREEN_WIDTH - Spacing['2xl'] - 10) / 2,
    backgroundColor: Colors.background.primary,
    borderRadius: 14,
    padding: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#EDEAE6' },
  quickActionIcon: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center' },
  quickActionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.nileBlue,
    flex: 1 },

  // ── Empty State ──
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: Spacing['2xl'] },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(196,149,106,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18 },
  emptyTitle: {
    ...Typography.h4,
    fontSize: 17,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginBottom: 6,
    textAlign: 'center' },
  emptySubtitle: {
    ...Typography.body,
    color: '#A0A8B1',
    textAlign: 'center',
    marginBottom: Spacing.lg },
  browseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.nileBlue,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: BorderRadius.xl },
  browseBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.inverse },

  // Extracted inline styles
  headerSpacer: { width: 32 },
  bottomSpacer: { height: 100 } });

export default withErrorBoundary(OffersPage, 'CashStoreOffers');
