import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Shared Loyalty Hub Dashboard
 * /MainCategory/[slug]/loyalty
 * Theme-driven via getCategoryTheme(slug)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SectionListSkeleton } from '@/components/skeletons';

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import userLoyaltyApi, { UserLoyalty } from '@/services/userLoyaltyApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getCategoryTheme, SHARED_COLORS, TIER_COLORS } from '@/config/categoryThemeConfig';
import { platformAlertSimple } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

function LoyaltyHubPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const theme = useMemo(() => getCategoryTheme(slug || 'electronics'), [slug]);
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const [loyalty, setLoyalty] = useState<UserLoyalty | null>(null);
  const [totalCoins, setTotalCoins] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  const fetchLoyalty = useCallback(async () => {
    if (!slug) return;
    try {
      setIsLoading(true);
      const res = await userLoyaltyApi.getLoyalty(slug);
      if (res.success && res.data?.loyalty) {
        setLoyalty(res.data.loyalty);
        setTotalCoins(res.data.categoryTotalCoins ?? res.data.totalCoins ?? 0);
        setWalletBalance(res.data.categoryBalance ?? res.data.walletBalance ?? 0);
      }
    } catch (err) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchLoyalty(); }, [fetchLoyalty]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLoyalty();
    if (!isMounted()) return;
    setRefreshing(false);
  };

  const handleCheckIn = async () => {
    try {
      setCheckingIn(true);
      const res = await userLoyaltyApi.checkIn(slug);
      if (res.success) {
        const coinsEarned = res.data?.coinsEarned || 10;
        const streakBonus = res.data?.streakBonus ? ' (streak bonus!)' : '';
        platformAlertSimple(
          'Checked In!',
          `+${coinsEarned} coins earned${streakBonus}\n${res.data?.message || ''}`
        );
        if (res.data?.loyalty) {
          setLoyalty(res.data.loyalty);
          setTotalCoins(prev => prev + coinsEarned);
        }
      } else {
        platformAlertSimple('Already Checked In', res.message || 'You already checked in today');
      }
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('Already checked in')) {
        platformAlertSimple('Already Checked In', 'Come back tomorrow for your next check-in!');
      } else {
        platformAlertSimple('Error', msg || 'Could not check in');
      }
    } finally {
      if (!isMounted()) return;
      setCheckingIn(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <SectionListSkeleton />
      </SafeAreaView>
    );
  }

  const streak = loyalty?.streak || { current: 0, target: 7, lastCheckin: null, history: [] };
  const brands = loyalty?.brandLoyalty || [];
  const missions = loyalty?.missions || [];
  const coins = loyalty?.coins || { available: 0, expiring: 0, expiryDate: null, history: [] };
  const activeMissions = missions.filter(m => !m.completedAt);
  const completedMissions = missions.filter(m => m.completedAt);

  const isCheckedInToday = streak.lastCheckin
    ? new Date(streak.lastCheckin).toDateString() === new Date().toDateString()
    : false;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={SHARED_COLORS.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{theme.rewardsHubTitle}</Text>
          <Text style={styles.headerSubtitle}>Track streaks, earn rewards</Text>
        </View>
        <Ionicons name="trophy" size={24} color={theme.primaryColor} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primaryColor]} />}
      >
        {/* Daily Streak Section */}
        <View style={styles.streakCard}>
          <LinearGradient colors={[theme.primaryColorLight + '20', theme.primaryColorLight + '40']} style={styles.streakGradient}>
            <View style={styles.streakHeader}>
              <Text style={styles.streakTitle}>Daily Streak</Text>
              <Text style={[styles.streakCount, { color: theme.primaryColor }]}>{streak.current}/{streak.target} days</Text>
            </View>

            {/* Streak dots */}
            <View style={styles.streakDots}>
              {Array.from({ length: streak.target }, (_, i) => (
                <View key={i} style={[
                  styles.streakDot,
                  i < streak.current && { ...styles.streakDotActive, backgroundColor: theme.primaryColor },
                  i === streak.current && { ...styles.streakDotCurrent, borderColor: theme.primaryColor },
                ]}>
                  {i < streak.current ? (
                    <Ionicons name="checkmark" size={14} color={SHARED_COLORS.white} />
                  ) : (
                    <Text style={styles.streakDotText}>{i + 1}</Text>
                  )}
                </View>
              ))}
            </View>

            {/* Check-in button */}
            <Pressable
              style={[styles.checkInBtn, { backgroundColor: theme.primaryColor }, isCheckedInToday && styles.checkInBtnDisabled]}
              onPress={handleCheckIn}
              disabled={isCheckedInToday || checkingIn}
            >
              {checkingIn ? (
                <ActivityIndicator size="small" color={SHARED_COLORS.white} />
              ) : (
                <>
                  <Ionicons name={isCheckedInToday ? 'checkmark-circle' : 'flash'} size={18} color={SHARED_COLORS.white} />
                  <Text style={styles.checkInBtnText}>
                    {isCheckedInToday ? 'Checked In Today' : 'Check In Now (+10 coins)'}
                  </Text>
                </>
              )}
            </Pressable>
          </LinearGradient>
        </View>

        {/* Coin Balance - Combined loyalty + wallet */}
        <Pressable
          style={styles.coinCard}
          onPress={() => router.push(('/MainCategory/' + slug + '/loyalty/coins') as any)}
        >
          <View style={styles.coinLeft}>
            <Ionicons name="wallet" size={28} color={theme.primaryColor} />
            <View>
              <Text style={styles.coinLabel}>Total Coin Balance</Text>
              <Text style={styles.coinValue}>{currencySymbol}{totalCoins}</Text>
              {walletBalance > 0 && coins.available > 0 && (
                <Text style={styles.coinBreakdown}>
                  {currencySymbol}{coins.available} loyalty + {currencySymbol}{walletBalance} cashback
                </Text>
              )}
            </View>
          </View>
          {coins.expiring > 0 && (
            <View style={styles.expiringBadge}>
              <Text style={styles.expiringText}>{currencySymbol}{coins.expiring} expiring soon</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={20} color={SHARED_COLORS.textSecondary} />
        </Pressable>

        {/* Brand Loyalty */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Brand Loyalty</Text>
            <Pressable onPress={() => router.push(('/MainCategory/' + slug + '/loyalty/brands') as any)}>
              <Text style={[styles.sectionSeeAll, { color: theme.primaryColor }]}>View All ({brands.length})</Text>
            </Pressable>
          </View>
          {brands.length === 0 ? (
            <View style={styles.emptySmall}>
              <Text style={styles.emptySmallText}>{theme.emptyBrandText}</Text>
            </View>
          ) : (
            brands.slice(0, 3).map((brand, i) => {
              const tierColors = TIER_COLORS[brand.tier] || TIER_COLORS.Bronze;
              return (
                <View key={brand.brandId || i} style={styles.brandCard}>
                  <View style={styles.brandInfo}>
                    <Text style={styles.brandName}>{brand.brandName}</Text>
                    <View style={[styles.tierBadge, { backgroundColor: tierColors.bg, borderColor: tierColors.border }]}>
                      <Text style={[styles.tierText, { color: tierColors.text }]}>{brand.tier}</Text>
                    </View>
                  </View>
                  <View style={styles.brandProgress}>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { backgroundColor: theme.primaryColor, width: `${brand.progress}%` }]} />
                    </View>
                    <Text style={styles.progressText}>
                      {brand.purchaseCount} purchases {brand.nextTierAt > 0 ? `(${brand.nextTierAt - brand.purchaseCount} to next tier)` : ''}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Active Missions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Missions</Text>
            <Pressable onPress={() => router.push(('/MainCategory/' + slug + '/loyalty/missions') as any)}>
              <Text style={[styles.sectionSeeAll, { color: theme.primaryColor }]}>View All ({missions.length})</Text>
            </Pressable>
          </View>
          {activeMissions.length === 0 ? (
            <View style={styles.emptySmall}>
              <Text style={styles.emptySmallText}>No active missions right now. Check back soon!</Text>
            </View>
          ) : (
            activeMissions.slice(0, 3).map((mission, i) => (
              <View key={mission.missionId || i} style={styles.missionCard}>
                <Text style={styles.missionIcon}>{mission.icon || '\uD83D\uDCF1'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.missionTitle}>{mission.title}</Text>
                  <View style={styles.missionProgress}>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, {
                        width: `${Math.min((mission.progress / mission.target) * 100, 100)}%`,
                        backgroundColor: Colors.success,
                      }]} />
                    </View>
                    <Text style={styles.progressText}>{mission.progress}/{mission.target}</Text>
                  </View>
                </View>
                <View style={styles.missionReward}>
                  <Ionicons name="star" size={14} color={theme.primaryColor} />
                  <Text style={[styles.missionRewardText, { color: theme.primaryColor }]}>{currencySymbol}{mission.reward}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="flash" size={24} color={theme.primaryColor} />
            <Text style={styles.statValue}>{streak.current}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="storefront" size={24} color={theme.primaryColor} />
            <Text style={styles.statValue}>{brands.length}</Text>
            <Text style={styles.statLabel}>Brands</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="trophy" size={24} color={Colors.warning} />
            <Text style={styles.statValue}>{completedMissions.length}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="wallet" size={24} color={Colors.success} />
            <Text style={styles.statValue}>{currencySymbol}{totalCoins}</Text>
            <Text style={styles.statLabel}>Coins</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SHARED_COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: SHARED_COLORS.textSecondary },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: SHARED_COLORS.white, borderBottomWidth: 1, borderBottomColor: SHARED_COLORS.border, gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: SHARED_COLORS.textPrimary },
  headerSubtitle: { fontSize: 12, color: SHARED_COLORS.textSecondary },
  content: { paddingBottom: 120 },
  // Streak
  streakCard: { margin: 16, borderRadius: 16, overflow: 'hidden' },
  streakGradient: { padding: 20 },
  streakHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  streakTitle: { fontSize: 18, fontWeight: '700', color: SHARED_COLORS.textPrimary },
  streakCount: { fontSize: 14, fontWeight: '600' },
  streakDots: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  streakDot: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.border.default,
    justifyContent: 'center', alignItems: 'center',
  },
  streakDotActive: {},
  streakDotCurrent: { borderWidth: 2, backgroundColor: SHARED_COLORS.white },
  streakDotText: { fontSize: 12, fontWeight: '600', color: SHARED_COLORS.textSecondary },
  checkInBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 12, paddingVertical: 12,
  },
  checkInBtnDisabled: { backgroundColor: Colors.text.tertiary },
  checkInBtnText: { fontSize: 14, fontWeight: '600', color: SHARED_COLORS.white },
  // Coins
  coinCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginBottom: 16, padding: 16,
    backgroundColor: SHARED_COLORS.white, borderRadius: 16,
  },
  coinLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  coinLabel: { fontSize: 12, color: SHARED_COLORS.textSecondary },
  coinValue: { fontSize: 22, fontWeight: '700', color: SHARED_COLORS.textPrimary },
  coinBreakdown: { fontSize: 10, color: SHARED_COLORS.textSecondary, marginTop: 2 },
  expiringBadge: { backgroundColor: colors.errorScale[100], paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.sm },
  expiringText: { ...Typography.caption, fontWeight: '600', color: Colors.error },
  // Section
  section: { marginHorizontal: 16, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: SHARED_COLORS.textPrimary },
  sectionSeeAll: { fontSize: 12, fontWeight: '600' },
  emptySmall: { padding: 20, backgroundColor: SHARED_COLORS.white, borderRadius: 12, alignItems: 'center' },
  emptySmallText: { fontSize: 13, color: SHARED_COLORS.textSecondary },
  // Brand
  brandCard: {
    padding: 14, backgroundColor: SHARED_COLORS.white, borderRadius: 12, marginBottom: 8,
  },
  brandInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  brandName: { fontSize: 15, fontWeight: '600', color: SHARED_COLORS.textPrimary },
  tierBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, borderWidth: 1 },
  tierText: { fontSize: 11, fontWeight: '600' },
  brandProgress: {},
  progressBar: { height: 6, backgroundColor: Colors.border.default, borderRadius: 3, overflow: 'hidden', marginBottom: Spacing.xs },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 11, color: SHARED_COLORS.textSecondary },
  // Mission
  missionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, backgroundColor: SHARED_COLORS.white, borderRadius: 12, marginBottom: 8,
  },
  missionIcon: { fontSize: 24 },
  missionTitle: { fontSize: 14, fontWeight: '600', color: SHARED_COLORS.textPrimary, marginBottom: 6 },
  missionProgress: { gap: 4 },
  missionReward: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  missionRewardText: { fontSize: 13, fontWeight: '600' },
  // Stats
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginHorizontal: 16,
  },
  statCard: {
    width: '47%' as any, padding: 16, backgroundColor: SHARED_COLORS.white,
    borderRadius: 16, alignItems: 'center', gap: 8,
  },
  statValue: { fontSize: 20, fontWeight: '700', color: SHARED_COLORS.textPrimary },
  statLabel: { fontSize: 12, color: SHARED_COLORS.textSecondary },
});

export default withErrorBoundary(LoyaltyHubPage, 'MainCategorySlugLoyaltyIndex');
