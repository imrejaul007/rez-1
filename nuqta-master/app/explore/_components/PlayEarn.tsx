// @ts-nocheck
import { colors } from '@/constants/theme';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { CardGridSkeleton } from '@/components/skeletons';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import gamificationApi, { GamificationStats } from '@/services/gamificationApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { useIsMounted } from '@/hooks/useIsMounted';
import FeatureErrorBoundary from '@/components/common/FeatureErrorBoundary';

const { width } = Dimensions.get('window');

interface PlayEarnActivity {
  id: string;
  title: string;
  description: string;
  icon: string;
  reward: string;
  color: string;
  gradient: string[];
  path: string;
  streak?: number;
  spinsLeft?: number;
  available?: boolean;
  pending?: number;
}

const PlayEarn = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [dynamicActivities, setDynamicActivities] = useState<PlayEarnActivity[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Default activities as fallback (only used if API doesn't return activities)
  const baseActivities: PlayEarnActivity[] = [
    {
      id: 'checkin',
      title: 'Daily Check-in',
      description: 'Check in daily to earn rewards',
      icon: 'checkmark-circle',
      reward: '10 coins',
      color: Colors.info,
      gradient: [Colors.info, Colors.info],
      path: '/playandearn',
    },
    {
      id: 'spin',
      title: 'Spin & Win',
      description: 'Spin the wheel for surprises',
      icon: 'gift',
      reward: `Up to ${currencySymbol}500`,
      color: colors.brand.purpleMedium,
      gradient: [colors.brand.purpleMedium, Colors.brand.purple],
      path: '/playandearn',
    },
    {
      id: 'quiz',
      title: 'Daily Quiz',
      description: 'Answer questions, win coins',
      icon: 'help-circle',
      reward: '25 coins',
      color: colors.brand.orange,
      gradient: [colors.brand.orange, colors.brand.orangeDark],
      path: '/playandearn',
    },
    {
      id: 'review',
      title: 'Review & Earn',
      description: 'Share your experience',
      icon: 'star',
      reward: '50 coins',
      color: Colors.gold,
      gradient: [Colors.gold, Colors.nileBlue],
      path: '/playandearn',
    },
  ];

  useEffect(() => {
    fetchPlayEarnData();
  }, []);

  const fetchPlayEarnData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Try to fetch comprehensive play & earn data first
      const playEarnResponse = await gamificationApi.getPlayAndEarnData();

      if (playEarnResponse.success && playEarnResponse.data) {
        const data = playEarnResponse.data;

        // If API returns activities, use them
        if (data.activities && Array.isArray(data.activities) && data.activities.length > 0) {
          const transformedActivities = data.activities.map((activity: any) => ({
            id: activity.id || activity._id,
            title: activity.title || activity.name,
            description: activity.description,
            icon: activity.icon || 'gift',
            reward: activity.reward || activity.rewardText || '10 coins',
            color: activity.color || Colors.info,
            gradient: activity.gradient || [activity.color || Colors.info, activity.color || Colors.info],
            path: activity.path || '/playandearn',
            streak: activity.streak,
            spinsLeft: activity.spinsLeft || activity.spinsRemaining,
            available: activity.available ?? activity.isAvailable,
            pending: activity.pending || activity.pendingCount,
          }));
          if (!isMounted()) return;
          setDynamicActivities(transformedActivities);
        }

        // Extract stats if included
        if (data.stats) {
          if (!isMounted()) return;
          setStats(data.stats);
        }
      }

      // Also fetch stats separately as backup for coins/streak info
      const statsResponse = await gamificationApi.getGamificationStats();
      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      }
    } catch (err) {
      if (!isMounted()) return;
      setError('Failed to load activities');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  };

  const navigateTo = (path: string) => {
    router.push(path as any);
  };

  // Build activities with dynamic data overlay from stats
  const buildActivities = (): PlayEarnActivity[] => {
    // Use dynamic activities from API if available, otherwise use base
    const activitiesSource = dynamicActivities || baseActivities;

    return activitiesSource.map((activity) => {
      // Overlay stats data if we have it
      if (activity.id === 'checkin' && stats?.streak) {
        return {
          ...activity,
          streak: stats.streak?.currentStreak || 0,
        };
      }
      if (activity.id === 'spin' && stats?.spinWheel) {
        return {
          ...activity,
          spinsLeft: stats.spinWheel?.spinsRemaining || 0,
        };
      }
      return activity;
    });
  };

  const activities = buildActivities();
  const coinsBalance = stats?.coins?.balance || 0;
  const coinsEarnedToday = stats?.streak?.weeklyEarnings || 0;

  // Loading state
  if (isLoading) {
    return <CardGridSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.sectionHeader}>
          <View>
            <View style={styles.titleRow}>
              <Text style={styles.sectionTitle}>Play & Earn</Text>
            </View>
            <Text style={styles.sectionSubtitle}>Fun ways to earn more rewards</Text>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={32} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={fetchPlayEarnData}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <FeatureErrorBoundary featureName="Play & Earn" compact={true}>
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <View>
          <View style={styles.titleRow}>
            <Text style={styles.sectionTitle}>Play & Earn</Text>
          </View>
          <Text style={styles.sectionSubtitle}>Fun ways to earn more rewards</Text>
        </View>
        <Pressable onPress={() => navigateTo('/playandearn')}>
          <Text style={styles.viewAllText}>View all →</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.activitiesContainer}
      >
        {activities.map((activity) => (
          <Pressable
            key={activity.id}
            style={styles.activityCard}
            onPress={() => navigateTo(activity.path)}
          >
            <LinearGradient
              colors={activity.gradient as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGradient}
            >
              {/* Icon */}
              <View style={styles.iconContainer}>
                <Ionicons name={activity.icon as any} size={28} color={Colors.text.inverse} />
              </View>

              {/* Content */}
              <Text style={styles.activityTitle}>{activity.title}</Text>
              <Text style={styles.activityDescription}>{activity.description}</Text>

              {/* Reward Badge */}
              <View style={styles.rewardBadge}>
                <Ionicons name="gift-outline" size={12} color={Colors.text.inverse} />
                <Text style={styles.rewardText}>{activity.reward}</Text>
              </View>

              {/* Status Indicators */}
              {activity.streak !== undefined && activity.streak > 0 && (
                <View style={styles.statusBadge}>
                  <Ionicons name="flame" size={12} color={colors.brand.orange} />
                  <Text style={styles.statusText}>{activity.streak} day streak!</Text>
                </View>
              )}
              {activity.spinsLeft !== undefined && activity.spinsLeft > 0 && (
                <View style={styles.statusBadge}>
                  <Ionicons name="refresh" size={12} color={Colors.text.inverse} />
                  <Text style={styles.statusText}>{activity.spinsLeft} spins left</Text>
                </View>
              )}
              {activity.available && (
                <View style={[styles.statusBadge, styles.availableBadge]}>
                  <Ionicons name="checkmark-circle" size={12} color={Colors.gold} />
                  <Text style={[styles.statusText, styles.availableText]}>Available now!</Text>
                </View>
              )}
              {activity.pending !== undefined && activity.pending > 0 && (
                <View style={styles.statusBadge}>
                  <Ionicons name="time" size={12} color={Colors.text.inverse} />
                  <Text style={styles.statusText}>{activity.pending} pending</Text>
                </View>
              )}

              {/* Play Button */}
              <View style={styles.playButton}>
                <Text style={styles.playButtonText}>Play Now</Text>
                <Ionicons name="arrow-forward" size={14} color={activity.color} />
              </View>
            </LinearGradient>
          </Pressable>
        ))}
      </ScrollView>

      {/* Daily Coins Summary */}
      <View style={styles.coinsSummary}>
        <View style={styles.coinsLeft}>
          <Text style={styles.coinsIcon}>🪙</Text>
          <View>
            <Text style={styles.coinsEarned}>
              {coinsBalance > 0 ? `${coinsBalance} coins balance` : '0 coins earned'}
            </Text>
            <Text style={styles.coinsTarget}>
              {coinsEarnedToday > 0
                ? `${coinsEarnedToday} earned this week`
                : 'Start earning coins today!'}
            </Text>
          </View>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min((coinsBalance / 200) * 100, 100)}%` },
            ]}
          />
        </View>
      </View>
    </View>
    </FeatureErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: Spacing.lg,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  errorContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  errorText: {
    ...Typography.body,
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
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.gold,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  sectionSubtitle: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  viewAllText: {
    ...Typography.bodySmall,
    color: Colors.gold,
    fontWeight: '600',
  },
  activitiesContainer: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.md,
  },
  activityCard: {
    width: 160,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginRight: Spacing.md,
  },
  cardGradient: {
    padding: 14,
    minHeight: 200,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  activityTitle: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text.inverse,
    marginBottom: Spacing.xs,
  },
  activityDescription: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 10,
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 10,
    alignSelf: 'flex-start',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  rewardText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  statusText: {
    ...Typography.overline,
    color: 'rgba(255,255,255,0.9)',
  },
  availableBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
  availableText: {
    color: Colors.text.inverse,
    fontWeight: '600',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.primary,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 'auto',
    gap: 6,
  },
  playButtonText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.nileBlue,
  },
  coinsSummary: {
    marginHorizontal: Spacing.base,
    marginTop: Spacing.base,
    backgroundColor: Colors.warningScale[200],
    borderRadius: BorderRadius.md,
    padding: 14,
  },
  coinsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  coinsIcon: {
    ...Typography.h2,
  },
  coinsEarned: {
    ...Typography.body,
    fontWeight: '600',
    color: colors.brand.amberDark,
  },
  coinsTarget: {
    ...Typography.caption,
    color: colors.brand.amberDeep,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(146, 64, 14, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.warning,
    borderRadius: 3,
  },
});

export default React.memo(PlayEarn);
