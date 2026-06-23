import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { SectionListSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import partnerApi, { PartnerStats } from '@/services/partnerApi';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
interface TopPerformer {
  _id: string;
  name: string;
  totalOrders: number;
  currentLevel: {
    name: string;
  };
  avatar?: string;
}

function PartnerLeaderboard() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const [stats, setStats] = useState<PartnerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setError(null);
      const response = await partnerApi.getStats();
      if (response.success && response.data) {
        if (!isMounted()) return;
        setStats(response.data);
      } else {
        if (!isMounted()) return;
        setError('Failed to load leaderboard data');
      }
    } catch (err) {
      if (!isMounted()) return;
      setError('Unable to connect. Please try again.');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStats();
  }, [fetchStats]);

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return Colors.gold;
      case 2: return '#C0C0C0';
      case 3: return '#CD7F32';
      default: return Colors.text.secondary;
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return 'trophy';
      case 2: return 'medal';
      case 3: return 'ribbon';
      default: return 'star';
    }
  };

  const renderTopPerformer = (performer: TopPerformer, index: number) => {
    const rank = index + 1;
    const isTop3 = rank <= 3;

    return (
      <View
        key={performer._id}
        style={[
          styles.performerCard,
          isTop3 && styles.topPerformerCard,
          rank === 1 && styles.firstPlaceCard,
        ]}
      >
        {/* Rank Badge */}
        <View style={[styles.rankBadge, { backgroundColor: getRankColor(rank) + '20' }]}>
          {isTop3 ? (
            <Ionicons
              name={getRankIcon(rank) as any}
              size={20}
              color={getRankColor(rank)}
            />
          ) : (
            <Text style={[styles.rankNumber, { color: getRankColor(rank) }]}>
              #{rank}
            </Text>
          )}
        </View>

        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {performer.avatar ? (
            <CachedImage source={performer.avatar} style={styles.avatar} />
          ) : (
            <LinearGradient
              colors={[Colors.gold, Colors.nileBlue]}
              style={styles.avatarPlaceholder}
            >
              <Text style={styles.avatarInitial}>
                {performer.name?.charAt(0)?.toUpperCase() || 'P'}
              </Text>
            </LinearGradient>
          )}
          {rank === 1 && (
            <View style={styles.crownBadge}>
              <Text style={styles.crownEmoji}>👑</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.performerInfo}>
          <Text style={styles.performerName} numberOfLines={1}>
            {performer.name || 'Partner'}
          </Text>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>
              {performer.currentLevel?.name || 'Partner'}
            </Text>
          </View>
        </View>

        {/* Orders Count */}
        <View style={styles.ordersContainer}>
          <Text style={styles.ordersCount}>{performer.totalOrders}</Text>
          <Text style={styles.ordersLabel}>orders</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <SectionListSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <Pressable
          style={styles.infoButton}
          onPress={() => {/* Show info modal */}}
        >
          <Ionicons name="information-circle-outline" size={24} color={Colors.text.secondary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.gold]}
            tintColor={Colors.gold}
          />
        }
      >
        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="cloud-offline" size={48} color={Colors.text.secondary} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={fetchStats}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Your Rank Card */}
            <LinearGradient
              colors={[Colors.gold, Colors.nileBlue]}
              style={styles.yourRankCard}
            >
              <View style={styles.yourRankContent}>
                <View style={styles.yourRankLeft}>
                  <Text style={styles.yourRankLabel}>Your Rank</Text>
                  <View style={styles.yourRankRow}>
                    <Text style={styles.yourRankNumber}>
                      #{stats?.userRank || '-'}
                    </Text>
                    <Text style={styles.yourRankTotal}>
                      of {stats?.totalPartners || 0} partners
                    </Text>
                  </View>
                </View>
                <View style={styles.yourRankRight}>
                  <Ionicons name="podium" size={48} color="rgba(255,255,255,0.3)" />
                </View>
              </View>

              {/* Quick Stats */}
              <View style={styles.quickStats}>
                <View style={styles.quickStatItem}>
                  <Text style={styles.quickStatValue}>{stats?.totalPartners || 0}</Text>
                  <Text style={styles.quickStatLabel}>Total Partners</Text>
                </View>
                <View style={styles.quickStatDivider} />
                <View style={styles.quickStatItem}>
                  <Text style={styles.quickStatValue}>{stats?.averageOrders || 0}</Text>
                  <Text style={styles.quickStatLabel}>Avg Orders</Text>
                </View>
              </View>
            </LinearGradient>

            {/* Top Performers Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Top Performers</Text>
                <View style={styles.trophyIcon}>
                  <Text style={styles.trophyEmoji}>🏆</Text>
                </View>
              </View>

              {stats?.topPerformers && stats.topPerformers.length > 0 ? (
                stats.topPerformers.map((performer, index) =>
                  renderTopPerformer(performer, index)
                )
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={48} color={Colors.text.secondary} />
                  <Text style={styles.emptyStateText}>No performers yet</Text>
                  <Text style={styles.emptyStateSubtext}>Be the first to climb the ranks!</Text>
                </View>
              )}
            </View>

            {/* How to Climb Section */}
            <View style={styles.tipsSection}>
              <Text style={styles.tipsTitle}>How to Climb the Ranks</Text>
              <View style={styles.tipsList}>
                <View style={styles.tipItem}>
                  <View style={styles.tipIcon}>
                    <Ionicons name="cart" size={20} color={Colors.gold} />
                  </View>
                  <Text style={styles.tipText}>Complete more orders to earn points</Text>
                </View>
                <View style={styles.tipItem}>
                  <View style={styles.tipIcon}>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.gold} />
                  </View>
                  <Text style={styles.tipText}>Finish reward tasks for bonus rankings</Text>
                </View>
                <View style={styles.tipItem}>
                  <View style={styles.tipIcon}>
                    <Ionicons name="trending-up" size={20} color={Colors.gold} />
                  </View>
                  <Text style={styles.tipText}>Level up to unlock higher multipliers</Text>
                </View>
              </View>
            </View>

            {/* CTA Button */}
            <Pressable
              style={styles.ctaButton}
              onPress={() => router.push('/(tabs)')}
            >
              <LinearGradient
                colors={[Colors.gold, Colors.nileBlue]}
                style={styles.ctaButtonGradient}
              >
                <Text style={styles.ctaButtonText}>Shop Now & Climb Ranks</Text>
                <Ionicons name="arrow-forward" size={20} color="white" />
              </LinearGradient>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  infoButton: {
    padding: Spacing.sm,
  },
  content: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: Spacing.md,
  },
  errorText: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.gold,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
  },
  retryButtonText: {
    color: Colors.text.inverse,
    fontWeight: '600',
    fontSize: 14,
  },
  yourRankCard: {
    margin: Spacing.base,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  yourRankContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  yourRankLeft: {
    flex: 1,
  },
  yourRankLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: Spacing.xs,
  },
  yourRankRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
  },
  yourRankNumber: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.text.inverse,
  },
  yourRankTotal: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  yourRankRight: {
    opacity: 0.8,
  },
  quickStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  quickStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginVertical: Spacing.xs,
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  quickStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  section: {
    margin: Spacing.base,
    marginTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    flex: 1,
  },
  trophyIcon: {
    marginLeft: 8,
  },
  trophyEmoji: {
    fontSize: 24,
  },
  performerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  topPerformerCard: {
    elevation: 2,
    shadowOpacity: 0.1,
  },
  firstPlaceCard: {
    borderWidth: 2,
    borderColor: Colors.gold + '40',
    backgroundColor: Colors.gold + '08',
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: '700',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  crownBadge: {
    position: 'absolute',
    top: -8,
    right: -4,
  },
  crownEmoji: {
    fontSize: 16,
  },
  performerInfo: {
    flex: 1,
    marginRight: 12,
  },
  performerName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  levelBadge: {
    backgroundColor: Colors.gold + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  levelText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.gold,
  },
  ordersContainer: {
    alignItems: 'flex-end',
  },
  ordersCount: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  ordersLabel: {
    fontSize: 11,
    color: Colors.text.secondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
    gap: Spacing.sm,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  tipsSection: {
    margin: Spacing.base,
    marginTop: 0,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  tipsList: {
    gap: Spacing.md,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  tipIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gold + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  ctaButton: {
    margin: Spacing.base,
    marginTop: Spacing.sm,
    marginBottom: Spacing['2xl'],
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  ctaButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.base,
    gap: Spacing.sm,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
});

export default withErrorBoundary(PartnerLeaderboard, 'PartnerLeaderboard');
