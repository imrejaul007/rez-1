import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Travel Hub Page - Premium Redesign
 * Connected to /api/travel-services
 */

import React, { useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Dimensions,
  RefreshControl
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming} from 'react-native-reanimated';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import travelApi, { TravelService, TravelServiceCategory } from '@/services/travelApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SW } = Dimensions.get('window');
const CARD_W = (SW - 48) / 2;

// ─── Design Tokens ───────────────────────────────────────────────────────────
const C = {
  bg: colors.tint.coolGray,
  white: colors.background.primary,
  navy: '#0F172A',
  navyLight: '#1E293B',
  slate500: colors.slateGray,
  slate400: '#94A3B8',
  slate200: colors.slateLight,
  slate100: colors.tint.slate,
  cyan600: colors.cyanDark,
  cyan500: colors.brand.cyan,
  cyan50: '#ECFEFF',
  green600: colors.brand.greenDark,
  green500: colors.success,
  green50: colors.successScale[50],
  amber500: colors.warningScale[400],
  amber50: colors.tint.amber,
  violet600: colors.brand.purple,
  violet50: colors.tint.purpleLight,
  rose500: '#F43F5E',
  blue600: colors.brand.blue,
  blue500: colors.infoScale[400],
  orange500: colors.brand.orange,
  skeleton: colors.slateLight,
  skeletonShine: colors.tint.slate };

// ─── Category Config (Ionicons + gradients) ──────────────────────────────────
const CATEGORY_CONFIG: Record<string, { icon: string; gradient: string[]; bg: string }> = {
  flights:  { icon: 'airplane',       gradient: [colors.infoScale[400], '#1D4ED8'], bg: colors.tint.blue },
  hotels:   { icon: 'bed',            gradient: [colors.brand.pink, '#BE185D'], bg: '#FDF2F8' },
  trains:   { icon: 'train',          gradient: [colors.success, colors.successScale[700]], bg: colors.successScale[50] },
  bus:      { icon: 'bus',            gradient: [colors.brand.orange, '#C2410C'], bg: colors.tint.orange },
  cab:      { icon: 'car-sport',      gradient: [colors.brand.amber, '#A16207'], bg: '#FEFCE8' },
  packages: { icon: 'globe',          gradient: [colors.brand.purpleLight, colors.brand.purpleDeep], bg: colors.tint.purpleLight } };

const getCategoryDetailRoute = (slug: string, id: string): string => {
  const routes: Record<string, string> = {
    flights: `/flight/${id}`,
    hotels: `/hotel/${id}`,
    trains: `/train/${id}`,
    bus: `/bus/${id}`,
    cab: `/cab/${id}`,
    packages: `/package/${id}` };
  return routes[slug] || `/product-page?cardId=${id}&cardType=product`;
};

// ─── Skeleton Components ─────────────────────────────────────────────────────
const SkeletonPulse: React.FC<{ style?: any }> = ({ style }) => {
  const anim = useSharedValue(0.3);
  const animStyle = useAnimatedStyle(() => ({ opacity: anim.value }));
  useEffect(() => {
    anim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800 }),
        withTiming(0.3, { duration: 800 })
      ),
      -1
    );
    return () => { anim.value = 0.3; };
  }, []);
  return <Animated.View style={[{ backgroundColor: C.skeleton, borderRadius: 8 }, style, animStyle]} />;
};

const CategorySkeleton = () => (
  <View style={s.catGrid}>
    {Array.from({ length: 6 }).map((_, i) => (
      <View key={i} style={[s.catCard, { backgroundColor: C.slate100 }]}>
        <SkeletonPulse style={{ width: 52, height: 52, borderRadius: 16 }} />
        <SkeletonPulse style={{ width: 60, height: 12, marginTop: 10 }} />
        <SkeletonPulse style={{ width: 40, height: 10, marginTop: 6 }} />
      </View>
    ))}
  </View>
);

const DealSkeleton = () => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
    {Array.from({ length: 3 }).map((_, i) => (
      <View key={i} style={[s.dealCard, { marginRight: 12 }]}>
        <SkeletonPulse style={{ width: '100%', height: 140, borderRadius: 0 }} />
        <View style={{ padding: 12 }}>
          <SkeletonPulse style={{ width: '80%', height: 14 }} />
          <SkeletonPulse style={{ width: '50%', height: 12, marginTop: 8 }} />
          <SkeletonPulse style={{ width: '40%', height: 16, marginTop: 8 }} />
        </View>
      </View>
    ))}
  </ScrollView>
);

const PopularSkeleton = () => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
    {Array.from({ length: 3 }).map((_, i) => (
      <View key={i} style={{ width: CARD_W, marginRight: 12, borderRadius: 16, overflow: 'hidden', backgroundColor: C.white }}>
        <SkeletonPulse style={{ width: '100%', height: 120, borderRadius: 0 }} />
        <View style={{ padding: 12 }}>
          <SkeletonPulse style={{ width: '70%', height: 14 }} />
          <SkeletonPulse style={{ width: '50%', height: 12, marginTop: 8 }} />
        </View>
      </View>
    ))}
  </ScrollView>
);

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface DisplayDeal {
  id: string;
  name: string;
  type: string;
  categorySlug: string;
  price: string;
  originalPrice?: string;
  cashback: string;
  cashbackNum: number;
  image: string;
  rating: number;
  ratingCount: number;
  storeName?: string;
}

interface PopularService {
  id: string;
  name: string;
  categorySlug: string;
  categoryName: string;
  price: number;
  cashback: number;
  image: string;
  rating: number;
}

// ─── Main Component ──────────────────────────────────────────────────────────
const TravelPage: React.FC = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const cs = getCurrencySymbol();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<TravelServiceCategory[]>([]);
  const [featuredDeals, setFeaturedDeals] = useState<DisplayDeal[]>([]);
  const [popularServices, setPopularServices] = useState<PopularService[]>([]);
  const [stats, setStats] = useState({ serviceCount: 0, maxCashback: 0, coinMultiplier: 2 });

  // ─── Data Fetch ──────────────────────────────────────────────────────────
  const fetchTravelData = useCallback(async () => {
    try {
      setError(null);

      const [catRes, featRes, popRes, statsRes] = await Promise.all([
        travelApi.getCategories(),
        travelApi.getFeatured(6),
        travelApi.getPopular(8),
        travelApi.getStats(),
      ]);

      // Categories
      if (catRes.success && catRes.data) {
        if (!isMounted()) return;
        setCategories(catRes.data);
      }

      // Featured deals
      if (featRes.success && featRes.data) {
        const transformed: DisplayDeal[] = featRes.data.slice(0, 6).map((svc: TravelService) => {
          const cbPct = svc.cashback?.percentage || svc.serviceCategory?.cashbackPercentage || 0;
          return {
            id: svc._id || svc.id || '',
            name: svc.name,
            type: svc.serviceCategory?.name || 'Travel',
            categorySlug: svc.serviceCategory?.slug || 'packages',
            price: svc.pricing?.selling
              ? `${cs}${svc.pricing.selling.toLocaleString('en-IN')}`
              : 'Price on request',
            originalPrice: svc.pricing?.original && svc.pricing.original > svc.pricing.selling
              ? `${cs}${svc.pricing.original.toLocaleString('en-IN')}`
              : undefined,
            cashback: cbPct > 0 ? `${cbPct}% back` : '',
            cashbackNum: cbPct,
            image: svc.images?.[0] || '',
            rating: svc.ratings?.average || 0,
            ratingCount: svc.ratings?.count || 0,
            storeName: svc.store?.name };
        });
        if (!isMounted()) return;
        setFeaturedDeals(transformed);
      }

      // Popular
      if (popRes.success && popRes.data) {
        const popular: PopularService[] = (popRes.data as TravelService[]).slice(0, 8).map((svc) => ({
          id: svc._id || svc.id || '',
          name: svc.name,
          categorySlug: svc.serviceCategory?.slug || 'packages',
          categoryName: svc.serviceCategory?.name || 'Travel',
          price: svc.pricing?.selling || 0,
          cashback: svc.cashback?.percentage || svc.serviceCategory?.cashbackPercentage || 0,
          image: svc.images?.[0] || '',
          rating: svc.ratings?.average || 0 }));
        if (!isMounted()) return;
        setPopularServices(popular);
      }

      // Stats
      if (statsRes.success && statsRes.data) {
        if (!isMounted()) return;
        setStats({
          serviceCount: statsRes.data.serviceCount || statsRes.data.hotels || 0,
          maxCashback: statsRes.data.maxCashback || 0,
          coinMultiplier: statsRes.data.coinMultiplier || 2 });
      }
    } catch (err) {
      if (categories.length === 0) {
        if (!isMounted()) return;
        setError('Unable to load travel services');
      }
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
      if (!isMounted()) return;
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchTravelData(); }, []);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchTravelData();
  }, [fetchTravelData]);

  const navigateToCategory = (slug: string) => {
    router.push(`/travel/${slug}` as any);
  };

  const navigateToDeal = (deal: DisplayDeal) => {
    router.push(getCategoryDetailRoute(deal.categorySlug, deal.id) as any);
  };

  const navigateToPopular = (svc: PopularService) => {
    router.push(getCategoryDetailRoute(svc.categorySlug, svc.id) as any);
  };

  // ─── Error State ─────────────────────────────────────────────────────────
  if (error && categories.length === 0 && !isLoading) {
    return (
      <View style={[s.container, s.centeredContent]}>
        <View style={s.errorIconCircle}>
          <Ionicons name="cloud-offline-outline" size={36} color={C.cyan600} />
        </View>
        <Text style={s.errorTitle}>Connection Error</Text>
        <Text style={s.errorMessage}>
          {error}. Pull down to retry.
        </Text>
        <Pressable
          onPress={() => { setIsLoading(true); fetchTravelData(); }}
          style={s.errorRetryBtn}
        >
          <Text style={s.errorRetryBtnText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  // ─── Compute total from categories ─────────────────────────────────────
  const totalServices = categories.reduce((sum, cat) => {
    const num = parseInt(String(cat.count).replace(/[^0-9]/g, ''), 10) || 0;
    return sum + num;
  }, 0) || stats.serviceCount;

  return (
    <View style={s.container}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <LinearGradient
        colors={['#0E7490', colors.cyanDark, colors.brand.cyan]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        {/* Top row */}
        <View style={s.headerRow}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={s.headerBtn}>
            <Ionicons name="arrow-back" size={22} color={C.white} />
          </Pressable>
          <View style={s.headerTitleWrap}>
            <Text style={s.headerTitle}>Travel & Booking</Text>
            <Text style={s.headerSub}>Book trips, earn rewards</Text>
          </View>
          <Pressable onPress={() => router.push('/travel/search' as any)} style={s.headerBtn}>
            <Ionicons name="options-outline" size={22} color={C.white} />
          </Pressable>
        </View>

        {/* Search bar */}
        <Pressable
          style={s.searchBar}
          onPress={() => router.push('/travel/search' as any)}
         
        >
          <Ionicons name="search" size={18} color={C.slate400} />
          <Text style={s.searchPlaceholder}>Search flights, hotels, trains...</Text>
        </Pressable>

        {/* Stats strip */}
        <View style={s.statsStrip}>
          <View style={s.statPill}>
            <Ionicons name="globe-outline" size={14} color={C.white} />
            <Text style={s.statPillText}>
              {totalServices > 0 ? `${totalServices}+ Services` : 'Coming Soon'}
            </Text>
          </View>
          {stats.maxCashback > 0 && (
            <View style={s.statPill}>
              <Ionicons name="wallet-outline" size={14} color={C.white} />
              <Text style={s.statPillText}>Up to {stats.maxCashback}% Back</Text>
            </View>
          )}
          {stats.coinMultiplier > 1 && (
            <View style={s.statPill}>
              <Ionicons name="sparkles" size={14} color={C.white} />
              <Text style={s.statPillText}>{stats.coinMultiplier}X Coins</Text>
            </View>
          )}
        </View>
      </LinearGradient>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[C.cyan600]} />}
        contentContainerStyle={s.scrollContentPadding}
      >
        {/* ── Categories ──────────────────────────────────────────────────── */}
        <View style={s.section}>
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>Book Travel</Text>
          </View>
          {isLoading ? <CategorySkeleton /> : (
            <View style={s.catGrid}>
              {categories.map((cat) => {
                const slug = cat.id;
                const cfg = CATEGORY_CONFIG[slug] || CATEGORY_CONFIG.packages;
                const countNum = parseInt(String(cat.count).replace(/[^0-9]/g, ''), 10) || 0;
                return (
                  <Pressable
                    key={cat.id}
                    style={[s.catCard, { backgroundColor: cfg.bg }]}
                    onPress={() => navigateToCategory(slug)}
                   
                  >
                    <LinearGradient
                      colors={cfg.gradient}
                      style={s.catIconWrap}
                    >
                      <Ionicons name={cfg.icon as any} size={24} color={C.white} />
                    </LinearGradient>
                    <Text style={s.catName}>{cat.title}</Text>
                    <Text style={s.catCount}>
                      {countNum > 0 ? `${countNum}+ options` : 'Explore'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* ── Hot Deals ───────────────────────────────────────────────────── */}
        <View style={s.section}>
          <View style={s.sectionRow}>
            <View style={s.sectionTitleRow}>
              <Ionicons name="flame" size={20} color={C.rose500} />
              <Text style={s.sectionTitle}>Hot Deals</Text>
            </View>
            {featuredDeals.length > 0 && (
              <Pressable onPress={() => router.push('/travel/deals' as any)}>
                <Text style={s.viewAll}>View All</Text>
              </Pressable>
            )}
          </View>

          {isLoading ? <DealSkeleton /> : featuredDeals.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.horizontalScrollPadding}>
              {featuredDeals.map((deal) => (
                <Pressable
                  key={deal.id}
                  style={s.dealCard}
                  onPress={() => navigateToDeal(deal)}
                 
                >
                  <CachedImage
                    source={deal.image}
                    style={s.dealImg}
                  />
                  {/* Gradient overlay */}
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.5)']}
                    style={s.dealOverlay}
                  />
                  {/* Cashback badge */}
                  {deal.cashbackNum > 0 && (
                    <View style={s.dealBadge}>
                      <Text style={s.dealBadgeText}>{deal.cashback}</Text>
                    </View>
                  )}
                  {/* Category tag */}
                  <View style={s.dealCatTag}>
                    <Ionicons
                      name={(CATEGORY_CONFIG[deal.categorySlug]?.icon || 'globe') as any}
                      size={10}
                      color={C.white}
                    />
                    <Text style={s.dealCatTagText}>{deal.type}</Text>
                  </View>
                  {/* Bottom info */}
                  <View style={s.dealBottom}>
                    <Text style={s.dealName} numberOfLines={1}>{deal.name}</Text>
                    <View style={s.dealPriceRow}>
                      <Text style={s.dealPrice}>{deal.price}</Text>
                      {deal.originalPrice && (
                        <Text style={s.dealOrigPrice}>{deal.originalPrice}</Text>
                      )}
                    </View>
                    {deal.rating > 0 && (
                      <View style={s.dealRatingRow}>
                        <Ionicons name="star" size={11} color={C.amber500} />
                        <Text style={s.dealRatingText}>
                          {deal.rating.toFixed(1)}
                        </Text>
                        {deal.storeName && (
                          <Text style={s.dealStoreText}> | {deal.storeName}</Text>
                        )}
                      </View>
                    )}
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <View style={s.emptySection}>
              <View style={s.emptyIcon}>
                <Ionicons name="flame-outline" size={28} color={C.slate400} />
              </View>
              <Text style={s.emptyTitle}>No deals yet</Text>
              <Text style={s.emptySub}>Featured deals will appear here once available</Text>
            </View>
          )}
        </View>

        {/* ── Popular Services ────────────────────────────────────────────── */}
        <View style={s.section}>
          <View style={s.sectionRow}>
            <View style={s.sectionTitleRow}>
              <Ionicons name="trending-up" size={20} color={C.blue600} />
              <Text style={s.sectionTitle}>Popular Now</Text>
            </View>
          </View>

          {isLoading ? <PopularSkeleton /> : popularServices.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.horizontalScrollPadding}>
              {popularServices.map((svc) => {
                const cfg = CATEGORY_CONFIG[svc.categorySlug] || CATEGORY_CONFIG.packages;
                return (
                  <Pressable
                    key={svc.id}
                    style={s.popCard}
                    onPress={() => navigateToPopular(svc)}
                   
                  >
                    <CachedImage
                      source={svc.image}
                      style={s.popImg}
                    />
                    {svc.cashback > 0 && (
                      <View style={[s.popCbBadge, { backgroundColor: cfg.gradient[0] }]}>
                        <Text style={s.popCbText}>{svc.cashback}%</Text>
                      </View>
                    )}
                    <View style={s.popInfo}>
                      <Text style={s.popName} numberOfLines={2}>{svc.name}</Text>
                      <View style={s.popMeta}>
                        <View style={[s.popCatChip, { backgroundColor: cfg.bg }]}>
                          <Ionicons name={cfg.icon as any} size={10} color={cfg.gradient[0]} />
                          <Text style={[s.popCatText, { color: cfg.gradient[0] }]}>{svc.categoryName}</Text>
                        </View>
                        {svc.rating > 0 && (
                          <View style={s.popRatingRow}>
                            <Ionicons name="star" size={11} color={C.amber500} />
                            <Text style={s.popRatingText}>{svc.rating.toFixed(1)}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={s.popPrice}>
                        {svc.price > 0 ? `From ${cs}${svc.price.toLocaleString('en-IN')}` : 'View details'}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : !isLoading && (
            <View style={s.emptySection}>
              <View style={s.emptyIcon}>
                <Ionicons name="compass-outline" size={28} color={C.slate400} />
              </View>
              <Text style={s.emptyTitle}>No services yet</Text>
              <Text style={s.emptySub}>Travel services will appear here once added by merchants</Text>
            </View>
          )}
        </View>

        {/* ── Rewards Banner ──────────────────────────────────────────────── */}
        <View style={s.rewardsBannerWrap}>
          <LinearGradient
            colors={[colors.brand.purple, colors.brand.purpleDeep, '#5B21B6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.rewardsBanner}
          >
            <View style={s.rewardsLeft}>
              <View style={s.rewardsIconRow}>
                <View style={s.rewardsIconCircle}>
                  <Ionicons name="wallet" size={20} color={colors.brand.purple} />
                </View>
                <View style={s.rewardsIconCircle}>
                  <Ionicons name="sparkles" size={20} color={colors.brand.amber} />
                </View>
              </View>
              <Text style={s.rewardsTitle}>Travel & Earn</Text>
              <Text style={s.rewardsSub}>
                {stats.maxCashback > 0
                  ? `Up to ${stats.maxCashback}% cashback + ${stats.coinMultiplier}X ${BRAND.COIN_NAME} on every booking`
                  : `Earn cashback + ${stats.coinMultiplier}X ${BRAND.COIN_NAME} on every booking`}
              </Text>
              <Pressable
                style={s.rewardsBtn}
                onPress={() => navigateToCategory('packages')}
               
              >
                <Text style={s.rewardsBtnText}>Explore Packages</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.brand.purple} />
              </Pressable>
            </View>
          </LinearGradient>
        </View>

        {/* ── Quick Links ─────────────────────────────────────────────────── */}
        <View style={s.quickLinksWrap}>
          <View style={s.quickLinks}>
            <Pressable
              style={s.quickLink}
              onPress={() => router.push('/travel/search' as any)}
             
            >
              <View style={[s.qlIcon, { backgroundColor: C.cyan50 }]}>
                <Ionicons name="search" size={18} color={C.cyan600} />
              </View>
              <Text style={s.qlText}>Search</Text>
            </Pressable>
            <Pressable
              style={s.quickLink}
              onPress={() => router.push('/travel/deals' as any)}
             
            >
              <View style={[s.qlIcon, { backgroundColor: colors.errorScale[50] }]}>
                <Ionicons name="flame" size={18} color={C.rose500} />
              </View>
              <Text style={s.qlText}>Hot Deals</Text>
            </Pressable>
            <Pressable
              style={s.quickLink}
              onPress={() => router.push('/my-bookings' as any)}
             
            >
              <View style={[s.qlIcon, { backgroundColor: C.green50 }]}>
                <Ionicons name="receipt-outline" size={18} color={C.green600} />
              </View>
              <Text style={s.qlText}>My Bookings</Text>
            </Pressable>
            <Pressable
              style={s.quickLink}
              onPress={() => router.push('/wallet' as any)}
             
            >
              <View style={[s.qlIcon, { backgroundColor: C.violet50 }]}>
                <Ionicons name="wallet" size={18} color={C.violet600} />
              </View>
              <Text style={s.qlText}>Wallet</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 14,
    paddingBottom: Spacing.base },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    marginBottom: 14 },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center' },
  headerTitle: { ...Typography.h3, fontWeight: '800', color: C.white, letterSpacing: -0.3 },
  headerSub: { ...Typography.bodySmall, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    marginHorizontal: Spacing.base,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 14,
    height: 44,
    gap: 10,
    ...Shadows.subtle },
  searchPlaceholder: { ...Typography.body, color: C.slate400, flex: 1 },
  statsStrip: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    marginTop: 14,
    gap: Spacing.sm,
    flexWrap: 'wrap' },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.xl },
  statPillText: { ...Typography.bodySmall, fontWeight: '600', color: C.white },

  // Section
  section: { marginBottom: Spacing.sm, paddingTop: Spacing.lg },
  sectionTitle: { ...Typography.h4, fontWeight: '700', color: C.navy, letterSpacing: -0.3 },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    marginBottom: 14 },
  viewAll: { ...Typography.body, fontWeight: '600', color: C.cyan600 },

  // Categories
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.base,
    gap: 10 },
  catCard: {
    width: (SW - 52) / 3,
    alignItems: 'center',
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.lg,
    ...Shadows.subtle },
  catIconWrap: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm },
  catName: { ...Typography.body, fontWeight: '700', color: C.navy, textAlign: 'center' },
  catCount: { fontSize: 11, color: C.slate500, marginTop: 2 },

  // Deal Cards
  dealCard: {
    width: SW * 0.65,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: C.white,
    marginRight: Spacing.md,
    ...Shadows.medium },
  dealImg: { width: '100%', height: 160, backgroundColor: C.slate100 },
  dealOverlay: { position: 'absolute', top: 0, left: 0, right: 0, height: 160 },
  dealBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: C.green600,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm },
  dealBadgeText: { fontSize: 11, fontWeight: '700', color: C.white },
  dealCatTag: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm },
  dealCatTagText: { ...Typography.caption, fontWeight: '600', color: C.white },
  dealBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.45)' },
  dealName: { ...Typography.body, fontWeight: '700', color: C.white, marginBottom: 3 },
  dealPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dealPrice: { ...Typography.bodyLarge, fontWeight: '800', color: C.white },
  dealOrigPrice: { ...Typography.bodySmall, color: 'rgba(255,255,255,0.7)', textDecorationLine: 'line-through' },

  // Popular Cards
  popCard: {
    width: CARD_W,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: C.white,
    marginRight: Spacing.md,
    ...Shadows.subtle },
  popImg: { width: '100%', height: 110, backgroundColor: C.slate100 },
  popCbBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6 },
  popCbText: { ...Typography.caption, fontWeight: '700', color: C.white },
  popInfo: { padding: 10 },
  popName: { ...Typography.body, fontWeight: '600', color: C.navy, marginBottom: 6, minHeight: 34 },
  popMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  popCatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6 },
  popCatText: { ...Typography.caption, fontWeight: '600' },
  popPrice: { ...Typography.body, fontWeight: '700', color: C.green600 },

  // Empty state
  emptySection: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
    paddingHorizontal: 40 },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.slate100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md },
  emptyTitle: { ...Typography.body, fontWeight: '600', color: C.navy, marginBottom: Spacing.xs },
  emptySub: { ...Typography.body, color: C.slate500, textAlign: 'center', lineHeight: 18 },

  // Rewards Banner
  rewardsBanner: { borderRadius: BorderRadius.xl, padding: Spacing.xl, overflow: 'hidden' },
  rewardsLeft: {},
  rewardsIconRow: { flexDirection: 'row', gap: -8, marginBottom: Spacing.md },
  rewardsIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)' },
  rewardsTitle: { ...Typography.h3, fontWeight: '800', color: C.white, marginBottom: 6, letterSpacing: -0.3 },
  rewardsSub: { ...Typography.body, color: 'rgba(255,255,255,0.85)', lineHeight: 18, marginBottom: Spacing.base },
  rewardsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: C.white,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: BorderRadius['2xl'] },
  rewardsBtnText: { ...Typography.body, fontWeight: '700', color: colors.brand.purple },

  // Quick Links
  quickLinks: {
    flexDirection: 'row',
    backgroundColor: C.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    justifyContent: 'space-around',
    ...Shadows.subtle },
  quickLink: { alignItems: 'center', gap: 6 },
  qlIcon: { width: 42, height: 42, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center' },
  qlText: { fontSize: 11, fontWeight: '600', color: C.slate500 },

  // Extracted inline styles
  centeredContent: { justifyContent: 'center', alignItems: 'center' },
  errorIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.cyan50, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: C.navy, marginBottom: 6 },
  errorMessage: { fontSize: 14, color: C.slate500, textAlign: 'center', paddingHorizontal: 40, marginBottom: 24 },
  errorRetryBtn: { backgroundColor: C.cyan600, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24 },
  errorRetryBtnText: { fontSize: 14, fontWeight: '600', color: C.white },
  headerTitleWrap: { flex: 1, marginLeft: 12 },
  scrollContentPadding: { paddingBottom: 120 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  horizontalScrollPadding: { paddingLeft: 16, paddingRight: 4 },
  dealRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  dealRatingText: { fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  dealStoreText: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  popRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  popRatingText: { fontSize: 11, fontWeight: '600', color: C.navy },
  rewardsBannerWrap: { paddingHorizontal: 16, marginBottom: 20 },
  quickLinksWrap: { paddingHorizontal: 16, marginBottom: 16 } });

export default withErrorBoundary(TravelPage, 'TravelIndex');
