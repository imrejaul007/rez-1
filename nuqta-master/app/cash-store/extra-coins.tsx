// @ts-nocheck
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
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import gamificationApi, {
  StreakData } from '../../services/gamificationApi';
import cashStoreApi from '../../services/cashStoreApi';
import bonusZoneApi, { BonusZoneCampaign } from '../../services/bonusZoneApi';
import BonusZoneCard from '../../components/earn/BonusZoneCard';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 64;

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

function getCategoryIcon(category?: string): keyof typeof Ionicons.glyphMap {
  switch (category?.toLowerCase()) {
    case 'food': case 'food-dining': case 'restaurant': return 'restaurant';
    case 'fashion': case 'clothing': return 'shirt';
    case 'electronics': return 'phone-portrait';
    case 'grocery': case 'groceries': return 'cart';
    case 'beauty': return 'sparkles';
    case 'travel': return 'airplane';
    default: return 'storefront';
  }
}


const EARN_METHODS = [
  { id: 'spin', icon: 'color-wand' as const, title: 'Spin & Win', desc: 'Try your luck daily', coins: '10-500', gradient: [colors.brand.purple, colors.brand.purpleMedium] as [string, string], route: '/play-and-earn' },
  { id: 'quiz', icon: 'bulb' as const, title: 'Daily Quiz', desc: 'Answer & earn', coins: '5-50', gradient: [colors.deepPink, colors.brand.pink] as [string, string], route: '/play-and-earn' },
  { id: 'review', icon: 'star' as const, title: 'Write Reviews', desc: 'Share your experience', coins: '20-100', gradient: [colors.warningScale[700], colors.warningScale[400]] as [string, string], route: '/explore' },
  { id: 'refer', icon: 'people' as const, title: 'Refer Friends', desc: 'Invite & both earn', coins: '100+', gradient: [colors.successScale[700], colors.successScale[400]] as [string, string], route: '/account/referral' },
  { id: 'share', icon: 'share-social' as const, title: 'Share & Earn', desc: 'Post on social media', coins: '50+', gradient: [colors.brand.blue, colors.infoScale[400]] as [string, string], route: '/play-and-earn' },
  { id: 'shop', icon: 'bag-handle' as const, title: 'Shop & Earn', desc: 'Auto 5% on purchases', coins: '5%', gradient: ['#C2410C', colors.brand.orangeDark] as [string, string], route: '/cash-store' },
];

// ─── Animated Glow Component ────────────────────────────────
const GlowRing = React.memo(() => {
  const pulse = useSharedValue(0.4);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 2000 }),
        withTiming(0.4, { duration: 2000 })
      ),
      -1
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }));

  return (
    <Animated.View style={[styles.glowRing, glowStyle]} />
  );
});

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
      style={[{ width: w as any, height: h, borderRadius: BorderRadius.lg, backgroundColor: '#E8E2DB' }, shimmerStyle, style]}
    />
  );
});

// ─── Main Component ─────────────────────────────────────────
function ExtraCoinsPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [coinBalance, setCoinBalance] = useState(0);
  const [lifetimeEarned, setLifetimeEarned] = useState(0);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [coinDrops, setCoinDrops] = useState<CoinDrop[]>([]);
  const [bonusCampaigns, setBonusCampaigns] = useState<BonusZoneCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  // ─── Data Fetching ────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const results = await Promise.allSettled([
        gamificationApi.getCoinBalance(),
        gamificationApi.getStreakStatus(),
        cashStoreApi.getDoubleCampaigns(),
        cashStoreApi.getCoinDrops(),
        bonusZoneApi.getBonusCampaigns(),
      ]);

      if (results[0].status === 'fulfilled') {
        const res = results[0].value;
        if (res.success && res.data) {
          setCoinBalance(res.data.balance || 0);
          setLifetimeEarned(res.data.lifetimeEarned || 0);
        }
      }
      if (results[1].status === 'fulfilled') {
        const res = results[1].value;
        if (res.success && res.data) setStreak(res.data);
      }
      if (results[2].status === 'fulfilled') {
        if (!isMounted()) return;
        setCampaigns((results[2].value || []).filter((c: Campaign) => c.isActive));
      }
      if (results[3].status === 'fulfilled') {
        if (!isMounted()) return;
        setCoinDrops((results[3].value || []).filter((d: CoinDrop) => d.isActive));
      }
      if (results[4].status === 'fulfilled') {
        const res = results[4].value;
        if (res.success && res.data) setBonusCampaigns(res.data.campaigns || []);
      }

      if (results.every((r) => r.status === 'rejected')) {
        if (!isMounted()) return;
        setError('Unable to load data. Please try again.');
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

  const handleCheckIn = useCallback(async () => {
    if (isCheckingIn || streak?.hasCheckedInToday) return;
    setIsCheckingIn(true);
    try {
      const result = await gamificationApi.performCheckIn();
      if (result.success && result.data) {
        setStreak((prev) =>
          prev ? { ...prev, hasCheckedInToday: true, currentStreak: result.data.streak || (prev.currentStreak + 1) } : prev
        );
        if (result.data.coinsEarned) {
          setCoinBalance((prev) => prev + result.data.coinsEarned + (result.data.bonusEarned || 0));
        }
      }
    } catch (err) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsCheckingIn(false);
    }
  }, [isCheckingIn, streak?.hasCheckedInToday]);

  const handleCoinDropPress = useCallback((drop: CoinDrop) => {
    const storeId = getStoreId(drop.storeId);
    if (storeId) router.push(`/MainStorePage?storeId=${storeId}` as any);
  }, [router]);

  const handleCampaignPress = useCallback(() => {
    router.push('/offers/double-cashback' as any);
  }, [router]);

  const headerTop = Platform.OS === 'web' ? 0 : insets.top;
  const hasContent = coinBalance > 0 || streak !== null || campaigns.length > 0 ||
    coinDrops.length > 0 || bonusCampaigns.length > 0;

  // ─── Loading Skeleton ─────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#0F172A', '#1E293B']} style={[styles.skeletonHero, { paddingTop: headerTop + 16 }]}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backBtnDark}>
              <Ionicons name="chevron-back" size={20} color={Colors.text.inverse} />
            </Pressable>
            <Text style={styles.headerTitleLight}>{`Extra ${BRAND.COIN_NAME}`}</Text>
            <View style={{ width: 32 }} />
          </View>
          <View style={{ alignItems: 'center', paddingVertical: 30 }}>
            <SkeletonBlock width={60} height={60} style={{ borderRadius: 30, backgroundColor: 'rgba(255,205,87,0.15)' }} index={0} />
            <SkeletonBlock width={160} height={14} style={{ marginTop: 14, backgroundColor: 'rgba(255,255,255,0.08)' }} index={1} />
            <SkeletonBlock width={120} height={40} style={{ marginTop: 8, backgroundColor: 'rgba(255,255,255,0.12)' }} index={2} />
          </View>
        </LinearGradient>
        <View style={{ flex: 1, backgroundColor: '#F8F5F0', padding: Spacing.base, gap: Spacing.md }}>
          <SkeletonBlock width="100%" height={72} index={3} />
          <SkeletonBlock width="100%" height={44} index={4} />
          <View style={{ flexDirection: 'row', gap: Spacing.md, marginTop: 8 }}>
            <SkeletonBlock width={CARD_WIDTH} height={150} index={5} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
            {[6, 7, 8, 9].map((i) => (
              <SkeletonBlock key={i} width={(SCREEN_WIDTH - 42) / 2} height={90} index={i} />
            ))}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.gold}
            colors={[Colors.gold]}
            progressBackgroundColor="#1E293B"
          />
        }
      >
        {/* ═══════════════════════════════════════════════════
            HERO SECTION — Full-bleed dark gradient
        ═══════════════════════════════════════════════════ */}
        <LinearGradient
          colors={['#0F172A', Colors.nileBlue, colors.brand.nileBlueLight]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={[styles.heroSection, { paddingTop: headerTop + 8 }]}
        >
          {/* Decorative elements */}
          <View style={styles.heroDecor1} />
          <View style={styles.heroDecor2} />
          <View style={styles.heroDecor3} />

          {/* Header */}
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backBtnDark}>
              <Ionicons name="chevron-back" size={20} color={Colors.text.inverse} />
            </Pressable>
            <Text style={styles.headerTitleLight}>{`Extra ${BRAND.COIN_NAME}`}</Text>
            <View style={{ width: 32 }} />
          </View>

          {/* Balance Display */}
          <View style={styles.balanceContainer}>
            <View style={styles.coinIconOuter}>
              <GlowRing />
              <LinearGradient
                colors={[Colors.gold, colors.warningScale[400]]}
                style={styles.coinIconInner}
              >
                <Ionicons name="wallet" size={26} color="#0F172A" />
              </LinearGradient>
            </View>

            <Text style={styles.balanceLabel}>YOUR NUQTA COINS</Text>
            <Text style={styles.balanceAmount}>
              {coinBalance.toLocaleString()}
            </Text>

            <View style={styles.balanceChips}>
              <View style={styles.balanceChip}>
                <Ionicons name="trending-up" size={12} color={Colors.success} />
                <Text style={styles.balanceChipText}>
                  {lifetimeEarned.toLocaleString()} lifetime
                </Text>
              </View>
              <View style={styles.balanceChipDivider} />
              <View style={styles.balanceChip}>
                <Ionicons name="flame" size={12} color={Colors.warning} />
                <Text style={styles.balanceChipText}>
                  {streak?.currentStreak || 0} day streak
                </Text>
              </View>
            </View>
          </View>

          {/* Streak + Check-in (embedded in hero) */}
          {streak && (
            <View style={styles.streakRow}>
              <View style={styles.streakPill}>
                <Ionicons name="flame" size={16} color={Colors.warning} />
                <Text style={styles.streakPillText}>
                  {streak.currentStreak} {streak.currentStreak === 1 ? 'day' : 'days'}
                </Text>
              </View>
              <Pressable
                style={[styles.checkInBtn, streak.hasCheckedInToday && styles.checkInBtnDone]}
                onPress={handleCheckIn}
                disabled={streak.hasCheckedInToday || isCheckingIn}
               
              >
                <LinearGradient
                  colors={streak.hasCheckedInToday ? [colors.successScale[700], colors.successScale[400]] : [Colors.gold, colors.warningScale[400]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.checkInBtnGradient}
                >
                  <Ionicons
                    name={streak.hasCheckedInToday ? 'checkmark-circle' : 'add-circle'}
                    size={16}
                    color={streak.hasCheckedInToday ? Colors.text.inverse : '#0F172A'}
                  />
                  <Text style={[styles.checkInText, streak.hasCheckedInToday && styles.checkInTextDone]}>
                    {isCheckingIn ? '...' : streak.hasCheckedInToday ? 'Checked In' : 'Daily Check-In'}
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>
          )}
        </LinearGradient>

        {/* Error banners */}
        {error && hasContent && (
          <View style={styles.errorBanner}>
            <Ionicons name="warning-outline" size={14} color={colors.brand.amberDeep} />
            <Text style={styles.errorBannerText}>Some data may be outdated</Text>
            <Pressable onPress={handleRefresh} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.errorBannerRetry}>Refresh</Text>
            </Pressable>
          </View>
        )}
        {error && !hasContent && (
          <View style={styles.errorFull}>
            <Ionicons name="cloud-offline-outline" size={36} color="#E8744F" />
            <Text style={styles.errorFullText}>{error}</Text>
            <Pressable style={styles.errorRetryBtn} onPress={handleRefresh}>
              <Ionicons name="refresh" size={14} color={Colors.text.inverse} />
              <Text style={styles.errorRetryText}>Try Again</Text>
            </Pressable>
          </View>
        )}

        {/* ═══════════════════════════════════════════════════
            CONTENT — Warm linen background
        ═══════════════════════════════════════════════════ */}
        <View style={styles.contentArea}>

          {/* ─── Active Boosts ─────────────────────────────── */}
          {campaigns.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <LinearGradient colors={[colors.tint.amberLight, colors.warningScale[200]]} style={styles.sectionIconBg}>
                  <Ionicons name="flash" size={16} color={colors.warningScale[700]} />
                </LinearGradient>
                <Text style={styles.sectionTitle}>Active Boosts</Text>
                <Pressable onPress={handleCampaignPress} style={styles.seeAllBtn}>
                  <Text style={styles.seeAllText}>View All</Text>
                  <Ionicons name="chevron-forward" size={14} color={Colors.nileBlue} />
                </Pressable>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
                {campaigns.map((campaign) => {
                  const timeLeft = formatTimeLeft(campaign.endTime);
                  const isEnded = timeLeft === 'Ended';
                  const bg = campaign.backgroundColor || Colors.nileBlue;
                  return (
                    <Pressable key={campaign._id} onPress={handleCampaignPress}>
                      <LinearGradient
                        colors={[bg, shadeColor(bg, -40)]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.boostCard}
                      >
                        {/* Decorative circles */}
                        <View style={styles.boostDecor1} />
                        <View style={styles.boostDecor2} />

                        <View style={styles.boostTopRow}>
                          <View style={styles.boostMultiplier}>
                            <Text style={styles.boostMultiplierNum}>{campaign.multiplier}</Text>
                            <Text style={styles.boostMultiplierX}>X</Text>
                          </View>
                          <View style={[styles.boostTimePill, isEnded && styles.boostTimePillEnded]}>
                            <Ionicons name="time-outline" size={11} color={isEnded ? '#FCA5A5' : 'rgba(255,255,255,0.85)'} />
                            <Text style={[styles.boostTimeText, isEnded && { color: '#FCA5A5' }]}>{timeLeft}</Text>
                          </View>
                        </View>

                        <Text style={styles.boostTitle} numberOfLines={2}>{campaign.title}</Text>
                        {campaign.subtitle ? (
                          <Text style={styles.boostSubtitle} numberOfLines={1}>{campaign.subtitle}</Text>
                        ) : null}

                        <View style={styles.boostFooter}>
                          <View style={styles.boostStoreChip}>
                            <Ionicons name="storefront-outline" size={11} color="rgba(255,255,255,0.8)" />
                            <Text style={styles.boostStoreText}>
                              {campaign.eligibleStores?.length || 0} stores
                            </Text>
                          </View>
                          <View style={styles.boostArrow}>
                            <Ionicons name="arrow-forward" size={12} color="rgba(255,255,255,0.6)" />
                          </View>
                        </View>
                      </LinearGradient>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* ─── Coin Drops ────────────────────────────────── */}
          {coinDrops.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <LinearGradient colors={[colors.tint.purple, '#DDD6FE']} style={styles.sectionIconBg}>
                  <Ionicons name="diamond" size={16} color={colors.brand.purple} />
                </LinearGradient>
                <Text style={styles.sectionTitle}>Coin Drops</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.md }}>
                {coinDrops.map((drop) => {
                  const timeLeft = formatTimeLeft(drop.endTime);
                  const icon = getCategoryIcon(drop.category);
                  return (
                    <Pressable
                      key={drop._id}
                      style={styles.dropCard}
                      onPress={() => handleCoinDropPress(drop)}
                     
                    >
                      <View style={styles.dropHeader}>
                        <LinearGradient colors={[colors.brand.purple, colors.brand.purpleMedium]} style={styles.dropIcon}>
                          <Ionicons name={icon} size={16} color={Colors.text.inverse} />
                        </LinearGradient>
                        <View style={styles.dropMultiBadge}>
                          <Text style={styles.dropMultiText}>{drop.multiplier}X</Text>
                        </View>
                      </View>
                      <Text style={styles.dropStoreName} numberOfLines={1}>{drop.storeName}</Text>
                      <Text style={styles.dropBoosted}>{drop.boostedCashback}% cashback</Text>
                      <Text style={styles.dropNormal}>was {drop.normalCashback}%</Text>
                      <View style={styles.dropTimePill}>
                        <Ionicons name="time-outline" size={10} color={colors.brand.purple} />
                        <Text style={styles.dropTimeText}>{timeLeft}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* ─── Bonus Zone Campaigns ─────────────────────── */}
          {bonusCampaigns.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <LinearGradient colors={[colors.pinkMist, '#FBCFE8']} style={styles.sectionIconBg}>
                  <Ionicons name="gift" size={16} color={colors.deepPink} />
                </LinearGradient>
                <Text style={styles.sectionTitle}>Bonus Zone</Text>
                <Pressable
                  onPress={() => router.push('/bonus-zone' as any)}
                  style={styles.seeAllBtn}
                >
                  <Text style={styles.seeAllText}>View All</Text>
                  <Ionicons name="chevron-forward" size={14} color={Colors.nileBlue} />
                </Pressable>
              </View>
              <View style={styles.oppList}>
                {bonusCampaigns.slice(0, 5).map((campaign) => (
                  <BonusZoneCard key={campaign.id} campaign={campaign} />
                ))}
              </View>
            </View>
          )}

          {/* ─── Ways to Earn — 2-Column Grid ─────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <LinearGradient colors={[colors.tint.green, '#A7F3D0']} style={styles.sectionIconBg}>
                <Ionicons name="sparkles" size={16} color={Colors.success} />
              </LinearGradient>
              <Text style={styles.sectionTitle}>Ways to Earn</Text>
            </View>
            <View style={styles.earnGrid}>
              {EARN_METHODS.map((method) => (
                <Pressable
                  key={method.id}
                  style={styles.earnCard}
                  onPress={() => router.push(method.route as any)}
                 
                >
                  <LinearGradient
                    colors={method.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.earnCardGradient}
                  >
                    <View style={styles.earnIconCircle}>
                      <Ionicons name={method.icon} size={22} color={Colors.text.inverse} />
                    </View>
                    <Text style={styles.earnTitle}>{method.title}</Text>
                    <Text style={styles.earnDesc}>{method.desc}</Text>
                    <View style={styles.earnCoinsPill}>
                      <Ionicons name="wallet-outline" size={10} color="rgba(255,255,255,0.9)" />
                      <Text style={styles.earnCoinsText}>{method.coins}</Text>
                    </View>
                  </LinearGradient>
                </Pressable>
              ))}
            </View>
          </View>

          {/* ─── How It Works — Timeline ──────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <LinearGradient colors={[colors.tint.blueLight, colors.infoScale[200]]} style={styles.sectionIconBg}>
                <Ionicons name="information-circle" size={16} color={Colors.info} />
              </LinearGradient>
              <Text style={styles.sectionTitle}>How It Works</Text>
            </View>
            <View style={styles.timelineCard}>
              {[
                { step: '1', icon: 'bag-handle-outline' as const, title: 'Shop or Play', text: 'Visit partner stores, play games, or complete activities' },
                { step: '2', icon: 'flash-outline' as const, title: 'Earn Automatically', text: 'Coins are credited instantly to your wallet' },
                { step: '3', icon: 'gift-outline' as const, title: 'Redeem Rewards', text: 'Use coins for discounts, gift cards & exclusive deals' },
              ].map((item, i) => (
                <View key={i} style={styles.timelineStep}>
                  {/* Connecting line */}
                  {i < 2 && <View style={styles.timelineLine} />}
                  <LinearGradient colors={[Colors.nileBlue, colors.brand.nileBlueLight]} style={styles.timelineNumber}>
                    <Text style={styles.timelineNumberText}>{item.step}</Text>
                  </LinearGradient>
                  <View style={styles.timelineContent}>
                    <View style={styles.timelineRow}>
                      <Ionicons name={item.icon} size={16} color={Colors.nileBlue} />
                      <Text style={styles.timelineTitle}>{item.title}</Text>
                    </View>
                    <Text style={styles.timelineText}>{item.text}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* ─── Bottom CTA ───────────────────────────────── */}
          <Pressable
            style={styles.bottomCta}
            onPress={() => router.push('/cash-store' as any)}
           
          >
            <LinearGradient
              colors={[Colors.nileBlue, '#0F172A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.bottomCtaGradient}
            >
              <Ionicons name="bag-handle" size={18} color={Colors.gold} />
              <Text style={styles.bottomCtaText}>Browse Cash Store</Text>
              <Ionicons name="arrow-forward" size={16} color={Colors.gold} />
            </LinearGradient>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F5F0' },

  // ── Hero ──────────────────────────────────────
  heroSection: {
    paddingBottom: Spacing.xl,
    overflow: 'hidden' },
  heroDecor1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,205,87,0.06)',
    top: -60,
    right: -40 },
  heroDecor2: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,205,87,0.04)',
    bottom: 10,
    left: -40 },
  heroDecor3: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(59,130,246,0.05)',
    top: 60,
    left: 40 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.xs },
  backBtnDark: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center' },
  headerTitleLight: {
    flex: 1,
    ...Typography.h4,
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text.inverse,
    letterSpacing: -0.3 },

  // Balance
  balanceContainer: {
    alignItems: 'center',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm },
  coinIconOuter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14 },
  glowRing: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: 'rgba(255,205,87,0.4)',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 0 20px rgba(255,205,87,0.3)' } : {}) },
  coinIconInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center' },
  balanceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs },
  balanceAmount: {
    fontSize: 46,
    fontWeight: '800',
    color: Colors.gold,
    letterSpacing: -2,
    lineHeight: 52 },
  balanceChips: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 14,
    paddingVertical: 6 },
  balanceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs },
  balanceChipText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '500' },
  balanceChipDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 10 },

  // Streak row
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.base,
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 10 },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 4 },
  streakPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text.inverse },
  checkInBtn: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden' },
  checkInBtnDone: {},
  checkInBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl },
  checkInText: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.text.primary },
  checkInTextDone: {
    color: Colors.text.inverse },

  // ── Content area ──────────────────────────────
  contentArea: {
    paddingTop: Spacing.sm },

  // ── Section shared ────────────────────────────
  section: {
    paddingHorizontal: Spacing.base,
    marginTop: 22 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14 },
  sectionIconBg: {
    width: Spacing['2xl'],
    height: Spacing['2xl'],
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center' },
  sectionTitle: {
    flex: 1,
    ...Typography.h4,
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text.primary,
    letterSpacing: -0.3 },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(26,58,82,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.sm },
  seeAllText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.nileBlue },

  // ── Boost cards ───────────────────────────────
  boostCard: {
    width: CARD_WIDTH > 280 ? 260 : CARD_WIDTH,
    borderRadius: BorderRadius.xl,
    padding: 18,
    overflow: 'hidden',
    minHeight: 165,
    justifyContent: 'space-between' },
  boostDecor1: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -30,
    right: -20 },
  boostDecor2: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,205,87,0.08)',
    bottom: -10,
    left: 10 },
  boostTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md },
  boostMultiplier: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: 'rgba(255,205,87,0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: 10 },
  boostMultiplierNum: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.gold },
  boostMultiplierX: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.gold,
    marginLeft: 1 },
  boostTimePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm },
  boostTimePillEnded: {
    backgroundColor: 'rgba(239,68,68,0.2)' },
  boostTimeText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)' },
  boostTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.inverse,
    lineHeight: 20 },
  boostSubtitle: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 3 },
  boostFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14 },
  boostStoreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 6 },
  boostStoreText: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)' },
  boostArrow: {
    width: Spacing.xl,
    height: Spacing.xl,
    borderRadius: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center' },

  // ── Coin Drop cards ───────────────────────────
  dropCard: {
    width: 155,
    backgroundColor: Colors.background.primary,
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0EBE4',
    ...Shadows.medium },
  dropHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10 },
  dropIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center' },
  dropMultiBadge: {
    position: 'absolute',
    top: -4,
    right: Spacing.sm,
    backgroundColor: Colors.nileBlue,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm },
  dropMultiText: {
    ...Typography.overline,
    fontWeight: '800',
    color: Colors.text.inverse,
    letterSpacing: 0,
    textTransform: 'none' },
  dropStoreName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.xs },
  dropBoosted: {
    ...Typography.body,
    fontWeight: '800',
    color: Colors.nileBlue },
  dropNormal: {
    ...Typography.overline,
    fontWeight: '400',
    color: Colors.text.tertiary,
    textDecorationLine: 'line-through',
    marginTop: 1,
    letterSpacing: 0,
    textTransform: 'none' },
  dropTimePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: Spacing.sm,
    backgroundColor: 'rgba(26,58,82,0.08)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 6 },
  dropTimeText: {
    ...Typography.overline,
    fontWeight: '500',
    color: Colors.nileBlue,
    letterSpacing: 0,
    textTransform: 'none' },

  // ── Opportunity cards ─────────────────────────
  oppList: {
    gap: Spacing.sm },

  // ── Earn Grid ─────────────────────────────────
  earnGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md },
  earnCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    borderRadius: 18,
    overflow: 'hidden' },
  earnCardGradient: {
    padding: Spacing.base,
    minHeight: 140,
    justifyContent: 'flex-end' },
  earnIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md },
  earnTitle: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text.inverse },
  earnDesc: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2 },
  earnCoinsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: Spacing.sm },
  earnCoinsText: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.text.inverse },

  // ── Timeline ──────────────────────────────────
  timelineCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    gap: 0,
    borderWidth: 1,
    borderColor: '#F0EBE4',
    ...Shadows.subtle },
  timelineStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingBottom: Spacing.lg },
  timelineLine: {
    position: 'absolute',
    left: 15,
    top: 34,
    width: 2,
    height: 28,
    backgroundColor: '#E2DDD5' },
  timelineNumber: {
    width: Spacing['2xl'],
    height: Spacing['2xl'],
    borderRadius: Spacing.base,
    justifyContent: 'center',
    alignItems: 'center' },
  timelineNumberText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.text.inverse },
  timelineContent: {
    flex: 1,
    paddingTop: 2 },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3 },
  timelineTitle: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text.primary },
  timelineText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    lineHeight: 17 },

  // ── Bottom CTA ────────────────────────────────
  bottomCta: {
    marginHorizontal: Spacing.base,
    marginTop: 28,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden' },
  bottomCtaGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingVertical: Spacing.base },
  bottomCtaText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.inverse },

  // ── Error states ──────────────────────────────
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.warningScale[50],
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.warningScale[200] },
  errorBannerText: {
    flex: 1,
    ...Typography.bodySmall,
    color: colors.brand.amberDeep },
  errorBannerRetry: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.nileBlue },
  errorFull: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: Spacing['2xl'] },
  errorFullText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    textAlign: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.base },
  errorRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.nileBlue,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: BorderRadius.xl },
  errorRetryText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.inverse },

  // ── Skeleton ──────────────────────────────────
  skeletonHero: {
    paddingBottom: 30 } });

export default withErrorBoundary(ExtraCoinsPage, 'CashStoreExtraCoins');
