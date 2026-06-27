// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  StatusBar
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  withDelay} from 'react-native-reanimated';
import CachedImage from '@/components/ui/CachedImage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, Stack } from 'expo-router';
import leaderboardApi, { LeaderboardEntry } from '../../services/leaderboardApi';
import { useLeaderboardRealtime } from '@/hooks/useLeaderboardRealtime';
import { useAuthUser, useGetCurrencySymbol } from '@/stores/selectors';
import TierBadge from '@/components/subscription/TierBadge';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width } = Dimensions.get('window');

// Color theme matching leaderboard/index.tsx
const COLORS = {
  primary: Colors.brand.purpleLight,
  primaryDark: Colors.brand.purple,
  white: colors.background.primary,
  background: Colors.background.secondary,
  navy: Colors.nileBlue,
  gray50: Colors.background.secondary,
  gray100: Colors.background.secondary,
  gray200: Colors.border.default,
  gray400: Colors.text.tertiary,
  gray500: Colors.text.tertiary,
  gray600: Colors.text.secondary,
  green500: Colors.success,
  greenDark: Colors.success,
  amber400: Colors.warning,
  amber500: Colors.warning,
  gold: colors.brand.goldBright,
  silver: '#C0C0C0',
  bronze: '#CD7F32',
  blue500: Colors.info};

type Period = 'daily' | 'weekly' | 'monthly' | 'all-time';

interface DisplayEntry {
  rank: number;
  userId: string;
  name: string;
  coins: number;
  avatar?: string;
  tier?: string;
  isCurrentUser?: boolean;
}

const Leaderboard = () => {
  const router = useRouter();
  const user = useAuthUser();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('weekly');
  const [entries, setEntries] = useState<DisplayEntry[]>([]);
  const [myRank, setMyRank] = useState<DisplayEntry | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState('');
  const [prizePool, setPrizePool] = useState<Array<{ rankStart: number; rankEnd: number; prizeAmount: number; prizeLabel: string }>>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const celebrationAnim = useSharedValue(0);
  const pulseAnim = useSharedValue(1);
  const isMounted = useIsMounted();

  // Convert entries for real-time hook
  const realtimeInitialEntries = entries.map(e => ({
    rank: e.rank,
    userId: e.userId,
    username: e.name,
    fullName: e.name,
    coins: e.coins,
    level: 1,
    tier: (e.tier || 'free') as 'free' | 'plus' | 'premium' | 'elite',
    achievements: 0,
    isCurrentUser: e.isCurrentUser || false}));

  // Real-time leaderboard updates
  const {
    entries: realtimeEntries,
    userRank: realtimeUserRank,
    isConnected,
    isUpdating,
    hasRecentRankUp} = useLeaderboardRealtime(
    realtimeInitialEntries,
    user?.id,
    {
      onRankUp: (userId, newRank, oldRank) => {
        if (userId === user?.id) {
          triggerCelebration(`You ranked up from #${oldRank} to #${newRank}!`);
        }
      },
      onLeaderboardUpdate: () => {
        // Pulse animation on update
        pulseAnim.value = withSequence(
          withTiming(1.05, { duration: 200 }),
          withTiming(1, { duration: 200 }),
        );
      }}
  );

  const fetchLeaderboard = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
        setPage(1);
      } else {
        setLoading(true);
      }
      setError(null);

      // Fetch spending leaderboard with current period
      const leaderboardResponse = await leaderboardApi.getLeaderboard({
        type: 'spending',
        period: selectedPeriod,
        limit: 50,
        page: 1});

      if (leaderboardResponse.success && leaderboardResponse.data) {
        const responseData = leaderboardResponse.data;
        const displayEntries: DisplayEntry[] = (responseData.entries || []).map((entry: any, index: number) => ({
          rank: entry.rank || index + 1,
          userId: entry.user._id,
          name: entry.user.name,
          coins: entry.value,
          avatar: entry.user.avatar,
          tier: 'free',
          isCurrentUser: entry.user._id === user?.id}));
        if (!isMounted()) return;
        setEntries(displayEntries);

        // Use pagination info to determine if more pages exist
        const pagination = responseData.pagination;
        if (pagination) {
          setHasMore(pagination.page < pagination.pages);
        } else {
          if (!isMounted()) return;
          setHasMore(displayEntries.length >= 50);
        }

        // Extract myRank from response (backend now includes it)
        if (responseData.myRank && responseData.myRank.rank > 0) {
          if (!isMounted()) return;
          setMyRank({
            rank: responseData.myRank.rank,
            userId: user?.id || '',
            name: user?.name || 'You',
            coins: responseData.myRank.value,
            tier: 'free',
            isCurrentUser: true});
        } else {
          if (!isMounted()) return;
          setMyRank(null);
        }

        // Extract config prize pool if returned by API
        const config = responseData.config;
        if (config?.prizePool && config.prizePool.length > 0) {
          setPrizePool(config.prizePool);
        }
      } else {
        throw new Error(leaderboardResponse.error || 'Failed to load leaderboard');
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Unable to load leaderboard. Please try again.');
      if (!isMounted()) return;
      setEntries([]);
      if (!isMounted()) return;
      setMyRank(null);
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
    }
  }, [selectedPeriod, user?.id, user?.name]);

  // Load more entries (pagination)
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const response = await leaderboardApi.getLeaderboard({
        type: 'spending',
        period: selectedPeriod,
        limit: 50,
        page: nextPage});
      if (response.success && response.data?.entries) {
        const newEntries = response.data.entries.map((entry: any, index: number) => ({
          rank: entry.rank || ((nextPage - 1) * 50) + index + 1,
          userId: entry.user._id,
          name: entry.user.name,
          coins: entry.value,
          avatar: entry.user.avatar,
          tier: 'free',
          isCurrentUser: entry.user._id === user?.id}));
        if (newEntries.length > 0) {
          if (!isMounted()) return;
          setEntries(prev => [...prev, ...newEntries]);
          if (!isMounted()) return;
          setPage(nextPage);
          const pagination = response.data.pagination;
          if (pagination) {
            setHasMore(pagination.page < pagination.pages);
          } else {
            if (!isMounted()) return;
            setHasMore(newEntries.length >= 50);
          }
        } else {
          if (!isMounted()) return;
          setHasMore(false);
        }
      }
    } catch (err) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setLoadingMore(false);
    }
  }, [page, loadingMore, hasMore, selectedPeriod, user?.id]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const onRefresh = useCallback(() => {
    fetchLeaderboard(true);
  }, [fetchLeaderboard]);

  // Trigger celebration animation
  const triggerCelebration = (message: string) => {
    setCelebrationMessage(message);
    setShowCelebration(true);

    celebrationAnim.value = withSequence(
      withTiming(1, { duration: 300 }),
      withTiming(1, { duration: 2500 }),
      withTiming(0, { duration: 300 })
    );
    setTimeout(() => setShowCelebration(false), 3100);
  };

  // Get medal color for top 3
  const getMedalColor = (rank: number) => {
    switch (rank) {
      case 1: return COLORS.gold;
      case 2: return COLORS.silver;
      case 3: return COLORS.bronze;
      default: return COLORS.gray500;
    }
  };

  // Render medal for top 3
  const renderMedal = (rank: number) => {
    if (rank > 3) return null;

    return (
      <View style={[styles.medalContainer, { backgroundColor: `${getMedalColor(rank)}20` }]}>
        <Ionicons name="medal" size={24} color={getMedalColor(rank)} />
      </View>
    );
  };

  const celebrationStyle = useAnimatedStyle(() => ({
    opacity: celebrationAnim.value,
    transform: [{ scale: interpolate(celebrationAnim.value, [0, 1], [0.5, 1]) }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  // Render period filter button
  const renderPeriodButton = (period: Period, label: string) => (
    <Pressable
      style={[styles.periodButton, selectedPeriod === period && styles.periodButtonActive]}
      onPress={() => setSelectedPeriod(period)}
      accessibilityLabel={`${label} leaderboard`}
      accessibilityRole="button"
      accessibilityState={{ selected: selectedPeriod === period }}
    >
      <Text
        style={[
          styles.periodButtonText,
          selectedPeriod === period && styles.periodButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );

  // Render leaderboard entry
  const renderEntry = (entry: DisplayEntry, index: number) => {
    const isTopThree = entry.rank <= 3;
    const hasRankedUp = hasRecentRankUp(entry.userId, 10);

    return (
      <Animated.View
        key={entry.userId}
        style={[
          styles.entryCard,
          entry.isCurrentUser && styles.currentUserCard,
          isTopThree && styles.topThreeCard,
          hasRankedUp && styles.rankedUpCard,
          entry.isCurrentUser && pulseStyle,
        ]}
        accessibilityLabel={`Rank ${entry.rank}. ${entry.name}${entry.isCurrentUser ? ' - You' : ''}. ${entry.coins.toLocaleString()} rupees spent`}
        accessibilityRole="text"
      >
        {/* Rank */}
        <View style={styles.rankContainer}>
          {isTopThree ? (
            renderMedal(entry.rank)
          ) : (
            <Text style={styles.rankText}>#{entry.rank}</Text>
          )}
        </View>

        {/* Avatar */}
        <View style={[styles.avatar, isTopThree && styles.topThreeAvatar]}>
          {entry.avatar ? (
            <CachedImage source={entry.avatar} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {entry.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* User Info */}
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {entry.name} {entry.isCurrentUser && '(You)'}
          </Text>
          <View style={styles.userStats}>
            <Text style={styles.rupeeSymbol}>{currencySymbol}</Text>
            <Text style={styles.coinsText}>{entry.coins.toLocaleString()}</Text>
          </View>
        </View>

        {/* Tier Badge */}
        {entry.tier && (
          <TierBadge tier={entry.tier as any} size="small" showIcon={false} />
        )}

        {/* Rank Up Indicator */}
        {hasRankedUp && (
          <View style={styles.rankUpBadge}>
            <Ionicons name="trending-up" size={12} color={Colors.text.inverse} />
          </View>
        )}
      </Animated.View>
    );
  };

  // Loading state
  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.container} edges={['top']}>
          <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
          <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.header}>
            <View style={styles.headerContainer}>
              <Pressable
                style={styles.backButton}
                onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
                accessibilityLabel="Go back"
                accessibilityRole="button"
              >
                <Ionicons name="arrow-back" size={24} color={COLORS.white} />
              </Pressable>
              <Text style={styles.headerTitle}>Spending Leaderboard</Text>
              <View style={styles.headerRight} />
            </View>
          </LinearGradient>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading leaderboard...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  // Error state
  if (error && entries.length === 0) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.container} edges={['top']}>
          <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
          <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.header}>
            <View style={styles.headerContainer}>
              <Pressable
                style={styles.backButton}
                onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
                accessibilityLabel="Go back"
                accessibilityRole="button"
              >
                <Ionicons name="arrow-back" size={24} color={COLORS.white} />
              </Pressable>
              <Text style={styles.headerTitle}>Spending Leaderboard</Text>
              <View style={styles.headerRight} />
            </View>
          </LinearGradient>
          <View style={styles.errorContainer}>
            <Ionicons name="cloud-offline-outline" size={64} color={COLORS.gray400} />
            <Text style={styles.errorTitle}>Unable to load leaderboard</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              style={styles.retryButton}
              onPress={() => fetchLeaderboard()}
              accessibilityLabel="Retry loading"
              accessibilityRole="button"
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={styles.retryButtonGradient}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

        {/* Header with Gradient */}
        <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.header}>
          <View style={styles.headerContainer}>
            <Pressable
              style={styles.backButton}
              onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.white} />
            </Pressable>

            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Spending Leaderboard</Text>
              {isConnected && (
                <View style={styles.liveIndicator}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              )}
            </View>

            <View style={styles.headerRight}>
              {isUpdating && (
                <ActivityIndicator size="small" color={COLORS.white} />
              )}
            </View>
          </View>

          {/* Period Filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterContent}
          >
            {renderPeriodButton('daily', 'Daily')}
            {renderPeriodButton('weekly', 'Weekly')}
            {renderPeriodButton('monthly', 'Monthly')}
            {renderPeriodButton('all-time', 'All Time')}
          </ScrollView>
        </LinearGradient>

        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        >
          {/* Prize Banner — driven by leaderboard config */}
          <View style={styles.section}>
            <LinearGradient
              colors={['rgba(139, 92, 246, 0.15)', 'rgba(236, 72, 153, 0.15)']}
              style={styles.prizeBanner}
            >
              <Ionicons name="trophy" size={48} color={COLORS.amber500} />
              <Text style={styles.prizeTitle}>
                {selectedPeriod === 'weekly' ? 'Weekly' : selectedPeriod === 'daily' ? 'Daily' : selectedPeriod === 'monthly' ? 'Monthly' : 'All Time'} Prizes
              </Text>
              <View style={styles.prizeGrid}>
                {prizePool.length > 0 ? (
                  prizePool.slice(0, 3).map((prize, idx) => (
                    <View key={idx} style={styles.prizeItem}>
                      <Text style={styles.prizeLabel}>{prize.prizeLabel}</Text>
                      <Text style={[styles.prizeValue, { color: idx === 0 ? COLORS.gold : idx === 1 ? COLORS.primary : COLORS.blue500 }]}>
                        {prize.prizeAmount.toLocaleString()} coins
                      </Text>
                    </View>
                  ))
                ) : (
                  <>
                    <View style={styles.prizeItem}>
                      <Text style={styles.prizeLabel}>1st Place</Text>
                      <Text style={[styles.prizeValue, { color: COLORS.gold }]}>500 coins</Text>
                    </View>
                    <View style={styles.prizeItem}>
                      <Text style={styles.prizeLabel}>Top 10</Text>
                      <Text style={[styles.prizeValue, { color: COLORS.primary }]}>50 coins</Text>
                    </View>
                    <View style={styles.prizeItem}>
                      <Text style={styles.prizeLabel}>Top 100</Text>
                      <Text style={[styles.prizeValue, { color: COLORS.blue500 }]}>10 coins</Text>
                    </View>
                  </>
                )}
              </View>
            </LinearGradient>
          </View>

          {/* Your Rank Section */}
          {myRank && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Rank</Text>
              <LinearGradient
                colors={[COLORS.green500, COLORS.greenDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.myRankCard}
              >
                <View style={styles.myRankPosition}>
                  <Text style={styles.myRankNumber}>#{myRank.rank}</Text>
                </View>
                <View style={styles.myRankAvatar}>
                  <Text style={styles.myRankAvatarText}>
                    {myRank.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.myRankInfo}>
                  <Text style={styles.myRankName}>{myRank.name}</Text>
                  <Text style={styles.myRankCoins}>{currencySymbol}{myRank.coins.toLocaleString()} spent</Text>
                </View>
                <Ionicons name="trending-up" size={24} color="rgba(255,255,255,0.8)" />
              </LinearGradient>
              <Text style={styles.motivationText}>
                {myRank.rank <= 10
                  ? "Amazing! You're in the Top 10!"
                  : myRank.rank <= 100
                  ? "Great job! You're in the Top 100!"
                  : `Keep going to reach Top 100!`}
              </Text>
            </View>
          )}

          {/* No Rank State */}
          {!myRank && (
            <View style={styles.section}>
              <View style={styles.noRankCard}>
                <Ionicons name="cart-outline" size={48} color={COLORS.gray400} />
                <Text style={styles.noRankTitle}>Start shopping to join the leaderboard!</Text>
                <Text style={styles.noRankText}>Make your first purchase to appear on the rankings</Text>
              </View>
            </View>
          )}

          {/* Top 3 Podium */}
          {entries.length >= 3 && (
            <View style={styles.podiumContainer}>
              {/* 2nd Place */}
              <View style={styles.podiumItem}>
                <View style={[styles.podiumAvatar, styles.podiumSecond]}>
                  {entries[1].avatar ? (
                    <CachedImage source={entries[1].avatar} style={styles.podiumAvatarImage} />
                  ) : (
                    <Text style={styles.podiumAvatarText}>
                      {entries[1].name.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <Text style={styles.podiumName} numberOfLines={1}>{entries[1].name.split(' ')[0]}</Text>
                <Text style={styles.podiumCoins}>{currencySymbol}{entries[1].coins.toLocaleString()}</Text>
                <View style={[styles.podiumBar, { height: 80, backgroundColor: `${COLORS.silver}30` }]}>
                  <Ionicons name="medal" size={28} color={COLORS.silver} />
                  <Text style={styles.podiumRank}>2</Text>
                </View>
              </View>

              {/* 1st Place */}
              <View style={styles.podiumItem}>
                <Ionicons name="trophy" size={28} color={COLORS.gold} style={{ marginBottom: Spacing.xs }} />
                <View style={[styles.podiumAvatar, styles.podiumFirst]}>
                  {entries[0].avatar ? (
                    <CachedImage source={entries[0].avatar} style={styles.podiumAvatarImageLarge} />
                  ) : (
                    <Text style={styles.podiumAvatarTextLarge}>
                      {entries[0].name.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <Text style={[styles.podiumName, { fontWeight: '700' }]} numberOfLines={1}>{entries[0].name.split(' ')[0]}</Text>
                <Text style={[styles.podiumCoins, { color: COLORS.gold, fontWeight: 'bold' }]}>
                  {currencySymbol}{entries[0].coins.toLocaleString()}
                </Text>
                <LinearGradient
                  colors={[`${COLORS.gold}40`, `${COLORS.gold}20`]}
                  style={[styles.podiumBar, { height: 112 }]}
                >
                  <Ionicons name="trophy" size={32} color={COLORS.gold} />
                  <Text style={[styles.podiumRank, { color: COLORS.gold }]}>1</Text>
                </LinearGradient>
              </View>

              {/* 3rd Place */}
              <View style={styles.podiumItem}>
                <View style={[styles.podiumAvatar, styles.podiumThird]}>
                  {entries[2].avatar ? (
                    <CachedImage source={entries[2].avatar} style={styles.podiumAvatarImage} />
                  ) : (
                    <Text style={styles.podiumAvatarText}>
                      {entries[2].name.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <Text style={styles.podiumName} numberOfLines={1}>{entries[2].name.split(' ')[0]}</Text>
                <Text style={styles.podiumCoins}>{currencySymbol}{entries[2].coins.toLocaleString()}</Text>
                <View style={[styles.podiumBar, { height: 64, backgroundColor: `${COLORS.bronze}30` }]}>
                  <Ionicons name="medal" size={24} color={COLORS.bronze} />
                  <Text style={styles.podiumRank}>3</Text>
                </View>
              </View>
            </View>
          )}

          {/* Full Rankings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>All Rankings</Text>
            {entries.map((entry, index) => renderEntry(entry, index))}

            {entries.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="trophy-outline" size={64} color={COLORS.gray200} />
                <Text style={styles.emptyText}>No leaderboard data yet</Text>
                <Text style={styles.emptySubtext}>
                  Be the first to make a purchase and claim the top spot!
                </Text>
              </View>
            )}

            {/* Load More */}
            {hasMore && entries.length > 0 && (
              <Pressable
                style={styles.loadMoreButton}
                onPress={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <Text style={styles.loadMoreText}>Load More</Text>
                )}
              </Pressable>
            )}
          </View>

          {/* Info Card */}
          <View style={styles.section}>
            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={24} color={COLORS.primary} />
              <Text style={styles.infoText}>
                Rankings are based on total spending. The more you shop, the higher you climb! Top spenders win exciting prizes.
              </Text>
            </View>
          </View>

          {/* CTAs */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Climb the Leaderboard!</Text>
            <Text style={styles.sectionSubtitle}>Shop more to increase your rank</Text>

            <Pressable
              onPress={() => router.push('/mall' as any)}
              accessibilityLabel="Browse mall"
              accessibilityRole="button"
            >
              <LinearGradient
                colors={['rgba(59, 130, 246, 0.15)', 'rgba(6, 182, 212, 0.1)']}
                style={styles.ctaCard}
              >
                <View style={[styles.ctaIcon, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
                  <Ionicons name="storefront" size={20} color={COLORS.blue500} />
                </View>
                <View style={styles.ctaContent}>
                  <Text style={styles.ctaTitle}>Browse Mall</Text>
                  <Text style={styles.ctaDesc}>Explore top brands and exclusive deals</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={() => router.push('/offers' as any)}
              accessibilityLabel="View offers"
              accessibilityRole="button"
            >
              <LinearGradient
                colors={['rgba(245, 158, 11, 0.15)', 'rgba(234, 179, 8, 0.1)']}
                style={styles.ctaCard}
              >
                <View style={[styles.ctaIcon, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
                  <Ionicons name="pricetag" size={20} color={COLORS.amber500} />
                </View>
                <View style={styles.ctaContent}>
                  <Text style={styles.ctaTitle}>Hot Offers</Text>
                  <Text style={styles.ctaDesc}>Get amazing discounts on your purchases</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={() => router.push('/referral' as any)}
              accessibilityLabel="Refer friends"
              accessibilityRole="button"
            >
              <LinearGradient
                colors={['rgba(139, 92, 246, 0.15)', 'rgba(236, 72, 153, 0.1)']}
                style={styles.ctaCard}
              >
                <View style={[styles.ctaIcon, { backgroundColor: 'rgba(139, 92, 246, 0.2)' }]}>
                  <Ionicons name="people" size={20} color={COLORS.primary} />
                </View>
                <View style={styles.ctaContent}>
                  <Text style={styles.ctaTitle}>Refer Friends</Text>
                  <Text style={styles.ctaDesc}>Invite friends and earn rewards together</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
              </LinearGradient>
            </Pressable>
          </View>

          {/* Bottom spacer */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Celebration Overlay */}
        {showCelebration && (
          <Animated.View
            style={[
              styles.celebrationOverlay,
              celebrationStyle,
            ]}
          >
            <LinearGradient
              colors={[COLORS.gold, COLORS.amber500]}
              style={styles.celebrationCard}
            >
              <Ionicons name="trophy" size={48} color={COLORS.white} />
              <Text style={styles.celebrationText}>{celebrationMessage}</Text>
            </LinearGradient>
          </Animated.View>
        )}
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background},
  header: {
    paddingBottom: Spacing.base},
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md},
  backButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.15)'},
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm},
  headerTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: COLORS.white},
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs},
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.green500},
  liveText: {
    color: COLORS.white,
    ...Typography.overline,
    fontWeight: 'bold'},
  headerRight: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center'},
  filterScroll: {
    marginTop: Spacing.sm},
  filterContent: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
    flexDirection: 'row'},
  periodButton: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.2)'},
  periodButtonActive: {
    backgroundColor: COLORS.white},
  periodButtonText: {
    color: COLORS.white,
    ...Typography.body,
    fontWeight: '600'},
  periodButtonTextActive: {
    color: COLORS.primary},
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100},
  loadingText: {
    marginTop: Spacing.base,
    ...Typography.body,
    color: COLORS.gray500},
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: 100},
  errorTitle: {
    ...Typography.h4,
    fontWeight: '600',
    color: COLORS.navy,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm},
  errorText: {
    ...Typography.body,
    color: COLORS.gray500,
    textAlign: 'center',
    marginBottom: Spacing.xl},
  retryButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden'},
  retryButtonGradient: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md},
  retryButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: COLORS.white},
  scrollView: {
    flex: 1},
  scrollContent: {
    paddingBottom: 120},
  section: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base},
  sectionTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: Spacing.md},
  sectionSubtitle: {
    ...Typography.body,
    color: COLORS.gray500,
    marginBottom: Spacing.base,
    marginTop: -8},
  prizeBanner: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)'},
  prizeTitle: {
    ...Typography.h4,
    fontWeight: 'bold',
    color: COLORS.navy,
    marginTop: Spacing.md,
    marginBottom: Spacing.base},
  prizeGrid: {
    flexDirection: 'row',
    gap: Spacing['2xl']},
  prizeItem: {
    alignItems: 'center'},
  prizeLabel: {
    ...Typography.bodySmall,
    color: COLORS.gray500,
    marginBottom: Spacing.xs},
  prizeValue: {
    ...Typography.h4,
    fontWeight: 'bold'},
  myRankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md},
  myRankPosition: {
    width: 48,
    alignItems: 'center'},
  myRankNumber: {
    ...Typography.h4,
    fontWeight: 'bold',
    color: COLORS.white},
  myRankAvatar: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center'},
  myRankAvatarText: {
    ...Typography.h3,
    fontWeight: 'bold',
    color: COLORS.white},
  myRankInfo: {
    flex: 1},
  myRankName: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: COLORS.white},
  myRankCoins: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.8)'},
  motivationText: {
    ...Typography.body,
    color: COLORS.gray500,
    textAlign: 'center',
    marginTop: Spacing.md},
  noRankCard: {
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: COLORS.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: COLORS.gray200},
  noRankTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: COLORS.navy,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs},
  noRankText: {
    ...Typography.body,
    color: COLORS.gray500,
    textAlign: 'center'},
  podiumContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    gap: Spacing.sm},
  podiumItem: {
    flex: 1,
    alignItems: 'center'},
  podiumAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    overflow: 'hidden'},
  podiumFirst: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${COLORS.gold}30`,
    borderWidth: 4,
    borderColor: COLORS.gold},
  podiumSecond: {
    backgroundColor: `${COLORS.silver}30`,
    borderWidth: 2,
    borderColor: COLORS.silver},
  podiumThird: {
    backgroundColor: `${COLORS.bronze}30`,
    borderWidth: 2,
    borderColor: COLORS.bronze},
  podiumAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 32},
  podiumAvatarImageLarge: {
    width: '100%',
    height: '100%',
    borderRadius: 40},
  podiumAvatarText: {
    ...Typography.h2,
    fontWeight: '700',
    color: COLORS.navy},
  podiumAvatarTextLarge: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.navy},
  podiumName: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: COLORS.navy,
    marginBottom: 2},
  podiumCoins: {
    ...Typography.bodySmall,
    color: COLORS.gray500,
    marginBottom: Spacing.sm},
  podiumBar: {
    width: '100%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs},
  podiumRank: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: COLORS.navy},
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: COLORS.white,
    marginBottom: Spacing.sm,
    ...Shadows.subtle},
  currentUserCard: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: colors.tint.purpleLight},
  topThreeCard: {
    backgroundColor: colors.tint.amber,
    borderWidth: 1,
    borderColor: '#FCD34D'},
  rankedUpCard: {
    borderWidth: 2,
    borderColor: COLORS.green500,
    backgroundColor: '#F0FFF4'},
  rankContainer: {
    width: 40,
    alignItems: 'center'},
  rankText: {
    ...Typography.body,
    fontWeight: '700',
    color: COLORS.gray500},
  medalContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center'},
  avatar: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius['2xl'],
    marginHorizontal: Spacing.md,
    overflow: 'hidden'},
  topThreeAvatar: {
    borderWidth: 2,
    borderColor: COLORS.gold},
  avatarImage: {
    width: '100%',
    height: '100%'},
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.gray200,
    alignItems: 'center',
    justifyContent: 'center'},
  avatarText: {
    ...Typography.h4,
    fontWeight: '700',
    color: COLORS.gray600},
  userInfo: {
    flex: 1},
  userName: {
    ...Typography.body,
    fontWeight: '600',
    color: COLORS.navy,
    marginBottom: Spacing.xs},
  userStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs},
  coinsText: {
    ...Typography.bodySmall,
    color: COLORS.gray500,
    fontWeight: '500'},
  rupeeSymbol: {
    ...Typography.body,
    fontWeight: '700',
    color: COLORS.green500},
  rankUpBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.green500,
    padding: Spacing.xs,
    borderRadius: 10},
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48},
  emptyText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: COLORS.gray500,
    marginTop: Spacing.base},
  emptySubtext: {
    ...Typography.body,
    color: COLORS.gray400,
    marginTop: Spacing.sm,
    textAlign: 'center'},
  loadMoreButton: {
    alignSelf: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing['2xl'],
    borderRadius: BorderRadius['2xl'],
    backgroundColor: `${COLORS.primary}15`,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm},
  loadMoreText: {
    ...Typography.body,
    fontWeight: '600',
    color: COLORS.primary},
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.indigoMist,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    gap: Spacing.md},
  infoText: {
    flex: 1,
    ...Typography.bodySmall,
    color: '#4F46E5',
    lineHeight: 18},
  ctaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: COLORS.gray200},
  ctaIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center'},
  ctaContent: {
    flex: 1},
  ctaTitle: {
    ...Typography.body,
    fontWeight: 'bold',
    color: COLORS.navy,
    marginBottom: 2},
  ctaDesc: {
    ...Typography.bodySmall,
    color: COLORS.gray500},
  ctaBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.lg},
  ctaBadgeText: {
    ...Typography.bodySmall,
    fontWeight: 'bold',
    color: COLORS.white},
  celebrationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000},
  celebrationCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.base,
    minWidth: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10},
  celebrationText: {
    ...Typography.h4,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center'}});

export default withErrorBoundary(Leaderboard, 'PlayandearnLeaderboard');
