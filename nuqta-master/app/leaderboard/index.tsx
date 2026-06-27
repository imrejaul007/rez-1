// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Leaderboard Page
// Display top users by coins with ranking and filters with real-time updates

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { TransactionListSkeleton } from '@/components/skeletons';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import TierBadge from '@/components/subscription/TierBadge';
import gamificationAPI from '@/services/gamificationApi';
import { useLeaderboardRealtime } from '@/hooks/useLeaderboardRealtime';
import { useAuthUser, useGetCurrencySymbol } from '@/stores/selectors';
import type { LeaderboardData, LeaderboardEntry } from '@/types/gamification.types';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

type Period = 'daily' | 'weekly' | 'monthly' | 'all-time';

function LeaderboardPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const user = useAuthUser();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('monthly');
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const celebrationAnim = useSharedValue(0);
  const pulseAnim = useSharedValue(1);

  // Real-time leaderboard updates
  const {
    entries: realtimeEntries,
    userRank: realtimeUserRank,
    isConnected,
    isUpdating,
    lastUpdate,
    hasRecentRankUp,
  } = useLeaderboardRealtime(
    leaderboardData?.entries || [],
    user?.id,
    {
      onRankUp: (userId, newRank, oldRank) => {
        if (userId === user?.id) {
          triggerCelebration(`You ranked up from #${oldRank} to #${newRank}!`);
          scrollToUserPosition();
        }
      },
      onPointsEarned: (userId, points, source) => {
        if (userId === user?.id) {

        }
      },
      onLeaderboardUpdate: () => {
        // Pulse animation on update
        pulseAnim.value = withSequence(
          withTiming(1.05, { duration: 200 }),
          withTiming(1, { duration: 200 }),
        );
      },
    }
  );

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedPeriod]);

  // Fetch leaderboard data
  const fetchLeaderboard = async () => {
    try {
      setIsLoading(true);
      const response = await gamificationAPI.getLeaderboard(selectedPeriod, 50);

      if (response.success && response.data) {
        if (!isMounted()) return;
        setLeaderboardData(response.data);
      }
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
      if (!isMounted()) return;
      setIsRefreshing(false);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchLeaderboard();
  };

  // Trigger celebration animation
  const triggerCelebration = (message: string) => {
    setCelebrationMessage(message);
    setShowCelebration(true);

    // Animate celebration
    celebrationAnim.value = withSequence(
      withTiming(1, { duration: 300 }),
      withTiming(1, { duration: 2500 }),
      withTiming(0, { duration: 300 })
    );
    // Hide celebration after animation completes
    setTimeout(() => setShowCelebration(false), 3100);
  };

  // Scroll to user's position
  const scrollToUserPosition = () => {
    if (scrollViewRef.current && realtimeUserRank) {
      // Scroll after a small delay to ensure layout is updated
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: realtimeUserRank.rank * 80, // Approximate card height
          animated: true,
        });
      }, 500);
    }
  };

  const celebrationStyle = useAnimatedStyle(() => ({
    opacity: celebrationAnim.value,
    transform: [{ scale: interpolate(celebrationAnim.value, [0, 1], [0.5, 1]) }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  // Use real-time entries if available, otherwise use static data
  const displayEntries = realtimeEntries.length > 0 ? realtimeEntries : leaderboardData?.entries || [];
  const displayUserRank = realtimeUserRank || leaderboardData?.userRank;

  // Render medal for top 3
  const renderMedal = (rank: number) => {
    const medals = {
      1: { icon: 'medal', color: colors.brand.goldBright }, // Gold
      2: { icon: 'medal', color: '#C0C0C0' }, // Silver
      3: { icon: 'medal', color: '#CD7F32' }, // Bronze
    };

    const medal = medals[rank as keyof typeof medals];
    if (!medal) return null;

    return (
      <View style={[styles.medalContainer, { backgroundColor: `${medal.color}20` }]}>
        <Ionicons name={medal.icon as any} size={24} color={medal.color} />
      </View>
    );
  };

  // Render leaderboard entry
  const renderLeaderboardEntry = (entry: LeaderboardEntry, index: number) => {
    const isCurrentUser = entry.isCurrentUser;
    const isTopThree = entry.rank <= 3;
    const hasRankedUp = hasRecentRankUp(entry.userId, 10);

    return (
      <Animated.View
        key={entry.userId}
        style={[
          styles.entryCard,
          isCurrentUser && styles.currentUserCard,
          isTopThree && styles.topThreeCard,
          hasRankedUp && styles.rankedUpCard,
          isCurrentUser && pulseStyle,
        ]}
        accessibilityLabel={`Rank ${entry.rank}. ${entry.fullName}${isCurrentUser ? ' - You' : ''}. ${entry.coins.toLocaleString()} coins. ${entry.achievements} achievements${isTopThree ? `. Top ${entry.rank} position` : ''}${hasRankedUp ? '. Ranked up recently' : ''}`}
        accessibilityRole="text"
      >
        {/* Rank */}
        <View style={styles.rankContainer}>
          {isTopThree ? (
            renderMedal(entry.rank)
          ) : (
            <ThemedText style={styles.rankText}>#{entry.rank}</ThemedText>
          )}
        </View>

        {/* Avatar */}
        <View style={[styles.avatar, isTopThree && styles.topThreeAvatar]}>
          {entry.avatar ? (
            <View style={styles.avatarPlaceholder}>
              <ThemedText style={styles.avatarText}>
                {entry.fullName.charAt(0).toUpperCase()}
              </ThemedText>
            </View>
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={24} color={Colors.text.tertiary} />
            </View>
          )}
        </View>

        {/* User Info */}
        <View style={styles.userInfo}>
          <ThemedText style={styles.userName}>
            {entry.fullName} {isCurrentUser && '(You)'}
          </ThemedText>
          <View style={styles.userStats}>
            <View style={styles.statItem}>
              <ThemedText style={styles.rupeeSymbol}>{currencySymbol}</ThemedText>
              <ThemedText style={styles.statText}>{entry.coins.toLocaleString()}</ThemedText>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="trophy" size={12} color={Colors.brand.purpleLight} />
              <ThemedText style={styles.statText}>{entry.achievements}</ThemedText>
            </View>
          </View>
        </View>

        {/* Tier Badge */}
        <TierBadge tier={entry.tier} size="small" showIcon={false} />

        {/* Rank Up Indicator */}
        {hasRankedUp && (
          <View style={styles.rankUpBadge}>
            <Ionicons name="trending-up" size={12} color="#4CD964" />
            <ThemedText style={styles.rankUpText}>Ranked Up!</ThemedText>
          </View>
        )}
      </Animated.View>
    );
  };

  // Render period filter
  const renderPeriodButton = (period: Period, label: string) => (
    <Pressable
      style={[styles.periodButton, selectedPeriod === period && styles.periodButtonActive]}
      onPress={() => setSelectedPeriod(period)}
      accessibilityLabel={`${label} leaderboard`}
      accessibilityRole="button"
      accessibilityState={{ selected: selectedPeriod === period }}
      accessibilityHint={`Double tap to view ${label.toLowerCase()} rankings`}
    >
      <ThemedText
        style={[
          styles.periodButtonText,
          selectedPeriod === period && styles.periodButtonTextActive,
        ]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.brand.purpleLight} />

      {/* Header */}
      <LinearGradient colors={[Colors.brand.purpleLight, Colors.brand.purple]} style={styles.header}>
        <View style={styles.headerContainer}>
          <Pressable
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
            style={styles.backButton}
            accessibilityLabel="Go back"
            accessibilityRole="button"
            accessibilityHint="Double tap to return to previous screen"
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <ThemedText style={styles.headerTitle}>Leaderboard</ThemedText>
            {isConnected && (
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <ThemedText style={styles.liveText}>LIVE</ThemedText>
              </View>
            )}
          </View>
          <View style={styles.headerRight}>
            {isUpdating && (
              <ActivityIndicator size="small" color={Colors.text.inverse} />
            )}
          </View>
        </View>

        {/* Period Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <View style={styles.periodFilters}>
            {renderPeriodButton('daily', 'Daily')}
            {renderPeriodButton('weekly', 'Weekly')}
            {renderPeriodButton('monthly', 'Monthly')}
            {renderPeriodButton('all-time', 'All Time')}
          </View>
        </ScrollView>
      </LinearGradient>

      {/* Content */}
      {isLoading && !isRefreshing ? (
        <TransactionListSkeleton />
      ) : (
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
        >
          {/* User Rank Card */}
          {displayUserRank && (
            <View style={styles.userRankSection}>
              <ThemedText style={styles.sectionTitle}>Your Rank</ThemedText>
              {renderLeaderboardEntry(displayUserRank, -1)}
            </View>
          )}

          {/* Leaderboard List */}
          <View style={styles.leaderboardSection}>
            <ThemedText style={styles.sectionTitle}>
              Top {displayEntries.length || 50} Users
            </ThemedText>
            {displayEntries.map((entry, index) => renderLeaderboardEntry(entry, index))}

            {leaderboardData?.entries.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="trophy-outline" size={64} color={Colors.border.default} />
                <ThemedText style={styles.emptyText}>No leaderboard data yet</ThemedText>
                <ThemedText style={styles.emptySubtext}>
                  Start earning coins to appear on the leaderboard!
                </ThemedText>
              </View>
            )}
          </View>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color={Colors.brand.purpleLight} />
            <ThemedText style={styles.infoText}>
              Rankings update every hour. Earn coins through purchases, games, and challenges to
              climb the leaderboard!
            </ThemedText>
          </View>
        </ScrollView>
      )}

      {/* Celebration Overlay */}
      {showCelebration && (
        <Animated.View
          style={[
            styles.celebrationOverlay,
            celebrationStyle,
          ]}
        >
          <LinearGradient
            colors={[colors.brand.goldBright, '#FFA500']}
            style={styles.celebrationCard}
          >
            <Ionicons name="trophy" size={48} color={Colors.text.inverse} />
            <ThemedText style={styles.celebrationText}>{celebrationMessage}</ThemedText>
          </LinearGradient>
        </Animated.View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: StatusBar.currentHeight || 50,
    paddingBottom: Spacing.base,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.base,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  headerTitle: {
    color: Colors.text.inverse,
    ...Typography.h3,
    fontWeight: 'bold',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CD964',
  },
  liveText: {
    color: Colors.text.inverse,
    ...Typography.overline,
    fontWeight: 'bold',
  },
  headerRight: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterScroll: {
    paddingLeft: Spacing.lg,
  },
  periodFilters: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  periodButton: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  periodButtonActive: {
    backgroundColor: Colors.background.primary,
  },
  periodButtonText: {
    color: Colors.text.inverse,
    ...Typography.body,
    fontWeight: '600',
  },
  periodButtonTextActive: {
    color: Colors.brand.purpleLight,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  scrollView: {
    flex: 1,
  },
  userRankSection: {
    padding: Spacing.lg,
    paddingBottom: 0,
  },
  sectionTitle: {
    ...Typography.bodyLarge,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  leaderboardSection: {
    padding: Spacing.lg,
  },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.subtle,
  },
  currentUserCard: {
    borderWidth: 2,
    borderColor: Colors.brand.purpleLight,
    backgroundColor: colors.tint.purpleLight,
  },
  topThreeCard: {
    backgroundColor: colors.tint.amber,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  rankText: {
    ...Typography.bodyLarge,
    fontWeight: 'bold',
    color: Colors.text.tertiary,
  },
  medalContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius['2xl'],
    marginRight: Spacing.md,
    overflow: 'hidden',
  },
  topThreeAvatar: {
    borderWidth: 2,
    borderColor: colors.brand.goldBright,
  },
  avatarPlaceholder: {
    flex: 1,
    backgroundColor: Colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Typography.h3,
    fontWeight: 'bold',
    color: Colors.text.tertiary,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  userStats: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  rupeeSymbol: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.success,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.tertiary,
    marginTop: Spacing.base,
  },
  emptySubtext: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.indigoMist,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    margin: Spacing.lg,
    gap: Spacing.md,
  },
  infoText: {
    flex: 1,
    ...Typography.bodySmall,
    fontSize: 13,
    color: '#4F46E5',
    lineHeight: 18,
  },
  rankedUpCard: {
    borderWidth: 2,
    borderColor: '#4CD964',
    backgroundColor: '#F0FFF4',
  },
  rankUpBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CD964',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  rankUpText: {
    ...Typography.overline,
    fontWeight: 'bold',
    color: Colors.text.inverse,
  },
  celebrationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  celebrationCard: {
    backgroundColor: Colors.background.primary,
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
    elevation: 10,
  },
  celebrationText: {
    ...Typography.h4,
    fontWeight: 'bold',
    color: Colors.text.inverse,
    textAlign: 'center',
  },
});

export default withErrorBoundary(LeaderboardPage, 'LeaderboardIndex');
