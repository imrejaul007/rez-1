import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import partnerApi, { PartnerStats } from '@/services/partnerApi';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';

interface PartnerStatsDashboardProps {
  compact?: boolean;
  onViewLeaderboard?: () => void;
}

const COLORS = {
  primary: colors.brand.green,
  primaryDark: colors.brand.teal,
  gold: colors.brand.goldWarm,
  navy: colors.brand.navyDark,
  surface: '#F7FAFC',
  white: colors.background.primary,
  textPrimary: colors.neutral[800],
  textSecondary: colors.neutral[500],
  success: colors.successScale[400],
};

function PartnerStatsDashboard({
  compact = false,
  onViewLeaderboard,
}: PartnerStatsDashboardProps) {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const [stats, setStats] = useState<PartnerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useIsMounted();

  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    fetchStats();
  }, [isAuthenticated, authLoading]);

  const fetchStats = async () => {
    try {
      setError(null);
      const response = await partnerApi.getStats();
      if (response.success && response.data) {
        if (!isMounted()) return;
        setStats(response.data);
      }
    } catch (err) {
      if (!isMounted()) return;
      setError('Failed to load stats');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const handleViewLeaderboard = () => {
    if (onViewLeaderboard) {
      onViewLeaderboard();
    } else {
      router.push('/partner/leaderboard');
    }
  };

  const getRankBadge = (rank: number, total: number) => {
    const percentile = ((total - rank + 1) / total) * 100;
    if (percentile >= 90) return { text: 'Top 10%', color: COLORS.gold };
    if (percentile >= 75) return { text: 'Top 25%', color: COLORS.primary };
    if (percentile >= 50) return { text: 'Top 50%', color: COLORS.success };
    return { text: `#${rank}`, color: COLORS.textSecondary };
  };

  if (loading) {
    return (
      <View style={[styles.container, compact && styles.containerCompact]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  if (error || !stats) {
    return null; // Silent fail for dashboard widget
  }

  const rankBadge = getRankBadge(stats.userRank, stats.totalPartners);

  if (compact) {
    return (
      <Pressable
        style={[styles.container, styles.containerCompact]}
        onPress={handleViewLeaderboard}
       
      >
        <View style={styles.compactContent}>
          <View style={styles.compactLeft}>
            <View style={[styles.rankIconBg, { backgroundColor: rankBadge.color + '20' }]}>
              <Ionicons name="podium" size={20} color={rankBadge.color} />
            </View>
            <View style={styles.compactTextContainer}>
              <Text style={styles.compactTitle}>Your Rank</Text>
              <Text style={styles.compactRank}>#{stats.userRank}</Text>
            </View>
          </View>
          <View style={styles.compactRight}>
            <View style={[styles.percentileBadge, { backgroundColor: rankBadge.color + '15' }]}>
              <Text style={[styles.percentileText, { color: rankBadge.color }]}>
                {rankBadge.text}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="stats-chart" size={20} color={COLORS.primary} />
          <Text style={styles.headerTitle}>Your Statistics</Text>
        </View>
        <Pressable onPress={handleViewLeaderboard}>
          <Text style={styles.viewAllText}>View Leaderboard</Text>
        </Pressable>
      </View>

      {/* Main Stats Grid */}
      <View style={styles.statsGrid}>
        {/* Rank Card */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          style={styles.rankCard}
        >
          <Text style={styles.rankLabel}>Your Rank</Text>
          <Text style={styles.rankValue}>#{stats.userRank}</Text>
          <View style={styles.rankBadgeContainer}>
            <View style={styles.rankBadge}>
              <Text style={styles.rankBadgeText}>{rankBadge.text}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Other Stats */}
        <View style={styles.otherStats}>
          <View style={styles.statItem}>
            <View style={styles.statIconBg}>
              <Ionicons name="people" size={18} color={COLORS.primary} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{stats.totalPartners}</Text>
              <Text style={styles.statLabel}>Total Partners</Text>
            </View>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <View style={styles.statIconBg}>
              <Ionicons name="bar-chart" size={18} color={COLORS.gold} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{stats.averageOrders}</Text>
              <Text style={styles.statLabel}>Avg Orders</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Top 3 Preview */}
      {stats.topPerformers && stats.topPerformers.length > 0 && (
        <View style={styles.top3Section}>
          <Text style={styles.top3Title}>Top 3 Partners</Text>
          <View style={styles.top3List}>
            {stats.topPerformers.slice(0, 3).map((performer, index) => (
              <View key={performer._id} style={styles.top3Item}>
                <View style={styles.top3Rank}>
                  <Text style={styles.top3RankText}>{index + 1}</Text>
                </View>
                <Text style={styles.top3Name} numberOfLines={1}>
                  {performer.name || 'Partner'}
                </Text>
                <Text style={styles.top3Orders}>
                  {performer.totalOrders} orders
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* CTA */}
      <Pressable
        style={styles.ctaButton}
        onPress={handleViewLeaderboard}
      >
        <Text style={styles.ctaText}>View Full Leaderboard</Text>
        <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  containerCompact: {
    padding: 12,
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rankIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactTextContainer: {
    gap: 2,
  },
  compactTitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  compactRank: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  compactRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  percentileBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  percentileText: {
    fontSize: 12,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  viewAllText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  rankCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
  },
  rankLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  rankValue: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.white,
  },
  rankBadgeContainer: {
    marginTop: 8,
  },
  rankBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  rankBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
  },
  otherStats: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    justifyContent: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  statIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  statDivider: {
    height: 1,
    backgroundColor: colors.neutral[200],
    marginVertical: 4,
  },
  top3Section: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  top3Title: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  top3List: {
    gap: 8,
  },
  top3Item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 10,
  },
  top3Rank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.gold + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  top3RankText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gold,
  },
  top3Name: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  top3Orders: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    gap: 6,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
});

export default React.memo(PartnerStatsDashboard);
