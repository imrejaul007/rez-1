// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  RefreshControl,
  Dimensions,
  Platform,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { router, Stack, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthUser, useIsAuthenticated, useAuthLoading, useRezBalance, useRefreshWallet } from '@/stores/selectors';
import FeatureErrorBoundary from '@/components/common/FeatureErrorBoundary';
import { platformAlert } from '@/utils/platformAlert';
import gameApi, { AvailableGame } from '@/services/gameApi';
import { SkeletonBox } from '@/components/earn/SkeletonLoader';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
const NUQTA_COIN = BRAND.COIN_IMAGE;

const { width } = Dimensions.get('window');

const COLORS = {
  primary: Colors.gold,
  navy: Colors.nileBlue,
  surface: Colors.background.secondary,
  cardBg: Colors.background.primary,
};

const GAME_COLORS: [string, string][] = [
  [Colors.brand.purple, colors.brand.purpleMedium],
  [colors.brand.pink, '#F472B6'],
  [Colors.warning, colors.warningScale[700]],
  [Colors.success, colors.successScale[400]],
  [Colors.info, colors.infoScale[400]],
  [Colors.error, colors.errorScale[400]],
];

function GamesPage() {
  const isMounted = useIsMounted();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [games, setGames] = useState<AvailableGame[]>([]);
  const [todaysEarnings, setTodaysEarnings] = useState(0);
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const userCoins = useRezBalance();
  const refreshWallet = useRefreshWallet();

  const isFirstFocus = React.useRef(true);

  const loadData = useCallback(async (silent = false) => {
    if (!isAuthenticated) return;
    try {
      if (!silent) setLoading(true);
      const [gamesRes] = await Promise.all([
        gameApi.getAvailableGames(),
        refreshWallet(),
      ]);

      if (gamesRes.success && gamesRes.data?.games) {
        if (!isMounted()) return;
        setGames(gamesRes.data.games);
        if (!isMounted()) return;
        setTodaysEarnings(gamesRes.data.todaysEarnings || 0);
      }
    } catch (err) {
      if (!silent) platformAlert('Error', 'Failed to load games. Pull to refresh.');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
    }
  }, [isAuthenticated, refreshWallet]);

  useEffect(() => {
    // AuthContext navigation guard handles unauthenticated redirect
    if (isAuthenticated && user) {
      loadData();
    }
  }, [isAuthenticated, authLoading, user]);

  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) { isFirstFocus.current = false; return; }
      loadData(true);
    }, [loadData])
  );

  const totalGamesPlayed = games.reduce((sum, g) => sum + (g.playsUsed || 0), 0);
  const totalGamesAvailable = games.reduce((sum, g) => sum + (g.playsRemaining || 0), 0);

  return (
    <FeatureErrorBoundary
      featureName="Games Hub"
      onSecondaryAction={() => router.push('/' as any)}
      secondaryActionLabel="Back to Home"
      secondaryActionIcon="home"
      onReset={() => loadData()}
    >
      <Stack.Screen
        options={{
          title: 'Games',
          headerStyle: { backgroundColor: COLORS.navy },
          headerTintColor: Colors.text.inverse,
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadData(); }}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Header Stats */}
        <LinearGradient
          colors={[COLORS.navy, '#234B6B']}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>Play & Earn</Text>
              <Text style={styles.headerSubtitle}>Win coins with every game</Text>
            </View>
            <Pressable
              style={styles.coinsBadge}
              onPress={() => router.push('/wallet' as any)}
            >
              <CachedImage source={NUQTA_COIN} style={{ width: 16, height: 16 }} />
              <Text style={styles.coinsBadgeText}>{userCoins.toLocaleString()}</Text>
            </Pressable>
          </View>

          {/* Quick Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalGamesPlayed}</Text>
              <Text style={styles.statLabel}>Played Today</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalGamesAvailable}</Text>
              <Text style={styles.statLabel}>Plays Left</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.successScale[400] }]}>+{todaysEarnings}</Text>
              <Text style={styles.statLabel}>Earned Today</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Games Grid */}
        <View style={styles.gamesSection}>
          <Text style={styles.sectionTitle}>Available Games</Text>

          {loading ? (
            <View style={styles.gamesGrid}>
              {[1, 2, 3, 4, 5, 6].map(i => (
                <View key={i} style={styles.skeletonCard}>
                  <SkeletonBox width={48} height={48} borderRadius={14} />
                  <SkeletonBox width="80%" height={16} borderRadius={4} />
                  <SkeletonBox width="100%" height={6} borderRadius={3} />
                  <SkeletonBox width="60%" height={12} borderRadius={4} />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.gamesGrid}>
              {games.map((game, idx) => {
                const colors = GAME_COLORS[idx % GAME_COLORS.length];
                const playsUsed = game.maxDaily > 0 ? game.maxDaily - game.playsRemaining : 0;
                const progressPct = game.maxDaily > 0 ? (playsUsed / game.maxDaily) * 100 : 0;
                const isExhausted = game.playsRemaining <= 0 && game.maxDaily > 0;

                return (
                  <Pressable
                    key={game.id}
                    onPress={() => router.push(game.path as any)}
                   
                    style={styles.gameCardOuter}
                  >
                    <View style={[styles.gameCard, isExhausted && { opacity: 0.5 }]}>
                      {/* Icon + Reward */}
                      <View style={styles.gameTop}>
                        <LinearGradient
                          colors={colors}
                          style={styles.gameIconBg}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <Text style={styles.gameIcon}>{game.icon}</Text>
                        </LinearGradient>
                        <View style={[styles.gameRewardBadge, { backgroundColor: `${colors[0]}12` }]}>
                          <CachedImage source={NUQTA_COIN} style={{ width: 11, height: 11 }} />
                          <Text style={[styles.gameRewardText, { color: colors[0] }]}>{game.reward}</Text>
                        </View>
                      </View>

                      {/* Title + Description */}
                      <Text style={styles.gameTitle} numberOfLines={1}>{game.title}</Text>
                      <Text style={styles.gameDescription} numberOfLines={1}>{game.description}</Text>

                      {/* Progress */}
                      <View style={styles.gameProgressSection}>
                        <View style={styles.gameProgressLabelRow}>
                          <Text style={styles.gameProgressLabel}>
                            {isExhausted ? 'All plays used' : `${game.playsRemaining} of ${game.maxDaily} left`}
                          </Text>
                        </View>
                        <View style={styles.gameProgressBg}>
                          <View
                            style={[
                              styles.gameProgressFill,
                              {
                                width: `${Math.min(progressPct, 100)}%`,
                                backgroundColor: isExhausted ? '#CBD5E1' : colors[0],
                              },
                            ]}
                          />
                        </View>
                      </View>

                      {/* Today's earnings badge */}
                      {game.todaysEarnings > 0 && (
                        <View style={[styles.gameTodayBadge, { backgroundColor: `${colors[0]}10` }]}>
                          <Ionicons name="checkmark-circle" size={12} color={colors[0]} />
                          <Text style={[styles.gameTodayText, { color: colors[0] }]}>
                            +{game.todaysEarnings} earned
                          </Text>
                        </View>
                      )}

                      {/* Play button */}
                      {!isExhausted && (
                        <View style={[styles.gamePlayBtn, { backgroundColor: colors[0] }]}>
                          <Text style={styles.gamePlayBtnText}>Play Now</Text>
                          <Ionicons name="arrow-forward" size={14} color={Colors.text.inverse} />
                        </View>
                      )}
                      {isExhausted && (
                        <View style={[styles.gamePlayBtn, { backgroundColor: colors.slateLight }]}>
                          <Text style={[styles.gamePlayBtnText, { color: '#94A3B8' }]}>Come Back Tomorrow</Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          {!loading && games.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="game-controller-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No Games Available</Text>
              <Text style={styles.emptyText}>Games are being set up. Check back soon!</Text>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </FeatureErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 16 : 12,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.base,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.inverse,
    marginBottom: 2,
  },
  headerSubtitle: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  coinsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  coinsBadgeText: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  statValue: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.inverse,
    marginBottom: 2,
  },
  statLabel: {
    ...Typography.overline,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  gamesSection: {
    padding: Spacing.base,
  },
  sectionTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: 14,
  },
  gamesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  gameCardOuter: {
    width: (width - 44) / 2,
  },
  gameCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.tint.slate,
    ...Platform.select({
      ios: {
        shadowColor: Colors.nileBlue,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: { elevation: 3 },
      web: { boxShadow: '0px 3px 12px rgba(26,58,82,0.08)' },
    }),
  },
  gameTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  gameIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameIcon: {
    fontSize: 22,
  },
  gameRewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  gameRewardText: {
    ...Typography.overline,
    fontWeight: '700',
  },
  gameTitle: {
    ...Typography.body,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: 2,
  },
  gameDescription: {
    ...Typography.caption,
    color: '#94A3B8',
    marginBottom: 10,
  },
  gameProgressSection: {
    marginBottom: 10,
  },
  gameProgressLabelRow: {
    marginBottom: Spacing.xs,
  },
  gameProgressLabel: {
    ...Typography.overline,
    color: '#94A3B8',
    fontWeight: '500',
  },
  gameProgressBg: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.tint.slate,
    overflow: 'hidden',
  },
  gameProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  gameTodayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
    alignSelf: 'flex-start',
  },
  gameTodayText: {
    ...Typography.overline,
    fontWeight: '600',
  },
  gamePlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: 10,
  },
  gamePlayBtnText: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  skeletonCard: {
    width: (width - 44) / 2,
    gap: 10,
    padding: 14,
    backgroundColor: Colors.background.primary,
    borderRadius: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: colors.slateGray,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  emptyText: {
    ...Typography.bodySmall,
    color: '#94A3B8',
    textAlign: 'center',
  },
});

export default withErrorBoundary(GamesPage, 'GamesIndex');
