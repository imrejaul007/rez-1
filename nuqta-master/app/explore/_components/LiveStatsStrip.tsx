import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { CardGridSkeleton } from '@/components/skeletons';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGetCurrencySymbol } from '@/stores/selectors';
import exploreApi, { ExploreStats } from '@/services/exploreApi';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { useIsMounted } from '@/hooks/useIsMounted';
import FeatureErrorBoundary from '@/components/common/FeatureErrorBoundary';
const { width } = Dimensions.get('window');

const LiveStatsStrip = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [stats, setStats] = useState<ExploreStats>({
    activeUsers: 0,
    earnedToday: 0,
    dealsLive: 0,
    peopleNearby: 0,
    peopleEarnedToday: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLiveStats();
  }, []);

  const fetchLiveStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await exploreApi.getLiveStats();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (err) {
      if (!isMounted()) return;
      setError('Failed to load live stats');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  };

  const navigateTo = (path: string) => {
    router.push(path as any);
  };

  const formatCurrency = (amount: number): string => {
    if (amount >= 100000) {
      return `${currencySymbol}${(amount / 100000).toFixed(1)}L`;
    } else if (amount >= 1000) {
      return `${currencySymbol}${(amount / 1000).toFixed(0)}k`;
    }
    return `${currencySymbol}${amount}`;
  };

  // Show loading state
  if (isLoading) {
    return <CardGridSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={28} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={fetchLiveStats}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <FeatureErrorBoundary featureName="Live Stats" compact={true}>
    <View style={styles.container}>
      {/* Top Banner */}
      <View style={styles.topBanner}>
        <View style={styles.bannerLeft}>
          <View style={styles.liveDot} />
          <View style={styles.trendIcon}>
            <Ionicons name="trending-up" size={20} color={Colors.gold} />
          </View>
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>
              {stats.peopleEarnedToday > 0
                ? `${stats.peopleEarnedToday} people near you earned rewards today`
                : `${stats.peopleNearby} people near you earned rewards today`}
            </Text>
            <Text style={styles.bannerSubtitle}>Join them and start saving</Text>
          </View>
        </View>
        <Pressable
          style={styles.seeHowButton}
          onPress={() => navigateTo('/playandearn')}
        >
          <Text style={styles.seeHowText}>See How →</Text>
        </Pressable>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <View style={styles.statIconContainer}>
            <Ionicons name="people" size={18} color={Colors.info} />
          </View>
          <Text style={styles.statValue}>{stats.activeUsers}</Text>
          <Text style={styles.statLabel}>Active Now</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <View style={[styles.statIconContainer, { backgroundColor: Colors.warningScale[50] }]}>
            <Ionicons name="wallet" size={18} color={Colors.warning} />
          </View>
          <Text style={styles.statValue}>
            {formatCurrency(stats.earnedToday)}
          </Text>
          <Text style={styles.statLabel}>Earned Today</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <View style={[styles.statIconContainer, { backgroundColor: Colors.successScale[50] }]}>
            <Ionicons name="flash" size={18} color={Colors.gold} />
          </View>
          <Text style={styles.statValue}>{stats.dealsLive}</Text>
          <Text style={styles.statLabel}>Deals Live</Text>
        </View>
      </View>
    </View>
    </FeatureErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.lg,
  },
  loadingContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  errorText: {
    fontSize: Typography.body.fontSize,
    color: Colors.text.tertiary,
  },
  retryButton: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.successScale[50],
    borderRadius: BorderRadius.lg,
  },
  retryText: {
    fontSize: Typography.bodySmall.fontSize,
    fontWeight: '600',
    color: Colors.gold,
  },
  topBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background.secondary,
    borderRadius: 14,
    padding: 14,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gold,
  },
  trendIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.successScale[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: Colors.nileBlue,
  },
  bannerSubtitle: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  seeHowButton: {
    backgroundColor: Colors.gold,
    paddingHorizontal: 14,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
  },
  seeHowText: {
    fontSize: Typography.bodySmall.fontSize,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: Colors.background.primary,
    borderRadius: 14,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EBF5FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statValue: {
    fontSize: Typography.h4.fontSize,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  statLabel: {
    fontSize: Typography.caption.fontSize,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border.default,
  },
});

export default React.memo(LiveStatsStrip);
