import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import gamificationApi from '@/services/gamificationApi';
import exploreApi from '@/services/exploreApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
import FeatureErrorBoundary from '@/components/common/FeatureErrorBoundary';

const { width } = Dimensions.get('window');

interface TopEarner {
  id: string;
  name: string;
  avatar?: string;
  earned: number;
  rank: number;
}

interface EarnStats {
  activeEarners: number;
  earnedToday: number;
  avgEarnings: number;
}

const EarnCTA = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  // Helper to format currency
  const formatCurrency = (amount: number): string => {
    if (amount >= 100000) {
      return `${currencySymbol}${(amount / 100000).toFixed(1)}L`;
    } else if (amount >= 1000) {
      return `${currencySymbol}${(amount / 1000).toFixed(1)}k`;
    }
    return `${currencySymbol}${amount}`;
  };
  const [topEarners, setTopEarners] = useState<TopEarner[]>([]);
  const [stats, setStats] = useState<EarnStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchEarnData();
  }, []);

  const fetchEarnData = async () => {
    try {
      setIsLoading(true);

      // Fetch leaderboard and stats in parallel
      const [leaderboardRes, statsRes] = await Promise.all([
        gamificationApi.getLeaderboard('weekly', 3),
        exploreApi.getLiveStats(),
      ]);

      // Process leaderboard data
      if (leaderboardRes.success && leaderboardRes.data?.entries) {
        const earners = leaderboardRes.data.entries.slice(0, 3).map((entry, index) => ({
          id: entry.userId || String(index),
          name: entry.username || entry.fullName || 'User',
          avatar: entry.avatar,
          earned: entry.coins || 0,
          rank: entry.rank || index + 1,
        }));
        if (!isMounted()) return;
        setTopEarners(earners);
      }

      // Process stats data
      if (statsRes.success && statsRes.data) {
        const liveStats = statsRes.data;
        if (!isMounted()) return;
        setStats({
          activeEarners: liveStats.activeUsers || 0,
          earnedToday: liveStats.earnedToday || 0,
          avgEarnings: liveStats.earnedToday && liveStats.activeUsers
            ? Math.round(liveStats.earnedToday / liveStats.activeUsers)
            : 0,
        });
      }
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  };

  const navigateTo = (path: string) => {
    router.push(path as any);
  };

  // Generate avatar URL with fallback
  const getAvatarUrl = (avatar?: string, index?: number) => {
    if (avatar) return avatar;
    return `https://i.pravatar.cc/100?img=${(index || 0) + 10}`;
  };

  return (
    <FeatureErrorBoundary featureName="Earn CTA" compact={true}>
    <View style={styles.container}>
      {/* Main CTA Card */}
      <Pressable
        style={styles.ctaCard}
        onPress={() => navigateTo('/referral')}
      >
        <LinearGradient
          colors={[colors.lightMustard, colors.nileBlue]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.ctaGradient}
        >
          <View style={styles.ctaContent}>
            <View style={styles.ctaLeft}>
              <Text style={styles.ctaTitle}>Earn Like Them!</Text>
              <Text style={styles.ctaSubtitle}>
                Refer friends & earn rewards for every successful referral
              </Text>
              <View style={styles.ctaButton}>
                <Text style={styles.ctaButtonText}>Start Earning</Text>
                <Ionicons name="arrow-forward" size={16} color={Colors.gold} />
              </View>
            </View>

            <View style={styles.earnBadge}>
              <Ionicons name="gift" size={24} color={Colors.text.inverse} />
              <Text style={styles.earnLabel}>Earn Rewards</Text>
            </View>
          </View>

          {/* Top Earners - Only show if we have real data */}
          {isLoading ? (
            <View style={styles.earnersSection}>
              <ActivityIndicator size="small" color={Colors.text.inverse} />
            </View>
          ) : topEarners.length > 0 ? (
            <View style={styles.earnersSection}>
              <Text style={styles.earnersTitle}>Top Earners This Week</Text>
              <View style={styles.earnersRow}>
                {topEarners.map((earner, index) => (
                  <View key={earner.id} style={styles.earnerItem}>
                    <View style={styles.earnerAvatarContainer}>
                      <CachedImage
                        source={getAvatarUrl(earner.avatar, index)}
                        style={styles.earnerAvatar}
                      />
                      <View style={[
                        styles.rankBadge,
                        earner.rank === 1 && styles.rankGold,
                        earner.rank === 2 && styles.rankSilver,
                        earner.rank === 3 && styles.rankBronze,
                      ]}>
                        <Text style={styles.rankText}>{earner.rank}</Text>
                      </View>
                    </View>
                    <Text style={styles.earnerName}>{earner.name}</Text>
                    <Text style={styles.earnerAmount}>{formatCurrency(earner.earned)}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.earnersSection}>
              <Text style={styles.earnersTitle}>Be the first to earn rewards!</Text>
            </View>
          )}
        </LinearGradient>
      </Pressable>

      {/* Quick Stats - Only show if we have real data */}
      {stats && (stats.activeEarners > 0 || stats.earnedToday > 0) && (
        <View style={styles.statsRow}>
          {stats.activeEarners > 0 && (
            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Ionicons name="people" size={20} color={Colors.info} />
              </View>
              <Text style={styles.statValue}>{stats.activeEarners.toLocaleString('en-IN')}</Text>
              <Text style={styles.statLabel}>Active Earners</Text>
            </View>
          )}

          {stats.earnedToday > 0 && (
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: colors.tint.amberLight }]}>
                <Ionicons name="wallet" size={20} color={Colors.warning} />
              </View>
              <Text style={styles.statValue}>{formatCurrency(stats.earnedToday)}</Text>
              <Text style={styles.statLabel}>Earned Today</Text>
            </View>
          )}

          {stats.avgEarnings > 0 && (
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: colors.successScale[50] }]}>
                <Ionicons name="trending-up" size={20} color={Colors.gold} />
              </View>
              <Text style={styles.statValue}>{formatCurrency(stats.avgEarnings)}</Text>
              <Text style={styles.statLabel}>Avg. Earnings</Text>
            </View>
          )}
        </View>
      )}
    </View>
    </FeatureErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.base,
  },
  ctaCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    shadowColor: colors.lightMustard,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaGradient: {
    padding: Spacing.lg,
  },
  ctaContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  ctaLeft: {
    flex: 1,
  },
  ctaTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text.inverse,
    marginBottom: 6,
  },
  ctaSubtitle: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 14,
    lineHeight: 18,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    borderRadius: BorderRadius.xl,
    alignSelf: 'flex-start',
    gap: 6,
  },
  ctaButtonText: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.gold,
  },
  earnBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  earnLabel: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.9)',
  },
  earnersSection: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    padding: 14,
    minHeight: 80,
    justifyContent: 'center',
  },
  earnersTitle: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.text.inverse,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  earnersRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  earnerItem: {
    alignItems: 'center',
  },
  earnerAvatarContainer: {
    position: 'relative',
  },
  earnerAvatar: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius['2xl'],
    borderWidth: 2,
    borderColor: colors.background.primary,
  },
  rankBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background.primary,
    backgroundColor: colors.neutral[500],
  },
  rankGold: {
    backgroundColor: Colors.warning,
  },
  rankSilver: {
    backgroundColor: colors.neutral[400],
  },
  rankBronze: {
    backgroundColor: colors.brand.amberDeep,
  },
  rankText: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  earnerName: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.text.inverse,
    marginTop: 6,
  },
  earnerAmount: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.text.inverse,
    opacity: 0.9,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: Spacing.base,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EBF5FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statValue: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  statLabel: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
});

export default EarnCTA;
