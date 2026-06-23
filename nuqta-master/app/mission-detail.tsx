// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Mission Detail Screen
 * Shows full details of a challenge/mission with progress, leaderboard, and rewards
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Dimensions,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Stack, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { challengesApi, ChallengeProgress, Challenge } from '@/services/challengesApi';
import { platformAlertSimple } from '@/utils/platformAlert';
import Svg, { Circle } from 'react-native-svg';
import { DetailPageSkeleton } from '@/components/skeletons';
import { BRAND } from '@/constants/brand';
import { borderRadius, colors, shadows, spacing, typography } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ReZ Coin image
const REZ_COIN_IMAGE = BRAND.COIN_IMAGE;

// Theme colors
const THEME = {
  purple500: colors.brand.purpleLight,
  purple600: colors.brand.purple,
  indigo500: colors.brand.indigo,
  indigo600: '#4F46E5',
  amber400: colors.warningScale[400],
  orange400: '#FB923C',
};

interface LeaderboardEntry {
  rank: number;
  user: {
    _id: string;
    name: string;
    avatar?: string;
  };
  progress: number;
  completed: boolean;
}

const getDifficultyStyle = (difficulty: string) => {
  switch (difficulty) {
    case 'easy': return { bg: 'rgba(0, 192, 106, 0.15)', color: colors.primary[500], label: 'Easy', icon: 'leaf' as const };
    case 'medium': return { bg: 'rgba(59, 130, 246, 0.15)', color: colors.infoScale[500], label: 'Medium', icon: 'flame' as const };
    case 'hard': return { bg: 'rgba(139, 92, 246, 0.15)', color: THEME.purple500, label: 'Hard', icon: 'rocket' as const };
    case 'legendary': return { bg: 'rgba(245, 158, 11, 0.15)', color: colors.warningScale[500], label: 'Legendary', icon: 'trophy' as const };
    default: return { bg: colors.neutral[200], color: colors.neutral[600], label: difficulty, icon: 'flag' as const };
  }
};

// Progress Circle Component
const ProgressCircle: React.FC<{ progress: number; size?: number; strokeWidth?: number }> = ({
  progress,
  size = 120,
  strokeWidth = 10,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.neutral[200]}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={THEME.purple500}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </Svg>
      <View style={styles.progressCircleCenter}>
        <Text style={styles.progressCircleValue}>{Math.round(progress)}%</Text>
        <Text style={styles.progressCircleLabel}>Complete</Text>
      </View>
    </View>
  );
};

const MissionDetailScreen: React.FC = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; progressId: string }>();
  const { id: challengeId, progressId } = params;
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [progress, setProgress] = useState<ChallengeProgress | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!challengeId) {
      setError('No challenge ID provided');
      setLoading(false);
      return;
    }

    try {
      if (!isRefresh) setLoading(true);
      setError(null);

      // Fetch challenge progress and leaderboard in parallel
      const [progressResponse, leaderboardResponse] = await Promise.all([
        challengesApi.getMyProgress(),
        challengesApi.getChallengeLeaderboard(challengeId, 10),
      ]);

      if (progressResponse.success && progressResponse.data) {
        // Find the specific challenge progress
        const challengeProgress = progressResponse.data.find(
          (cp: ChallengeProgress) => cp.challenge._id === challengeId
        );
        if (challengeProgress) {
          if (!isMounted()) return;
          setProgress(challengeProgress);
          if (!isMounted()) return;
          setChallenge(challengeProgress.challenge);
        } else {
          if (!isMounted()) return;
          setError('Challenge not found');
        }
      } else {
        if (!isMounted()) return;
        setError(progressResponse.error || 'Failed to load challenge');
      }

      if (leaderboardResponse.success && leaderboardResponse.data) {
        if (!isMounted()) return;
        setLeaderboard(leaderboardResponse.data);
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Failed to load challenge details');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      if (isRefresh) setRefreshing(false);
    }
  }, [challengeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh data when navigating back to this screen
  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      fetchData(true);
    }, [fetchData])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true);
  }, [fetchData]);

  // Deep-link parameter validation guard
  if (!challengeId || typeof challengeId !== 'string') {
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
    return null;
  }

  const handleClaimReward = async () => {
    if (!progressId || !progress?.completed || progress?.rewardsClaimed) return;

    setClaiming(true);
    try {
      const response = await challengesApi.claimReward(progressId);
      if (response.success && response.data) {
        if (!isMounted()) return;
        setProgress(prev => prev ? { ...prev, rewardsClaimed: true } : null);
        platformAlertSimple('Rewards Claimed!', `+${response.data.coinsEarned} coins added to your wallet!`);
      } else {
        platformAlertSimple('Error', response.error || 'Failed to claim rewards');
      }
    } catch (err: any) {
      platformAlertSimple('Error', err.message || 'Failed to claim rewards');
    } finally {
      if (!isMounted()) return;
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <DetailPageSkeleton />
      </>
    );
  }

  if (error || !challenge || !progress) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.container}>
          <LinearGradient colors={[THEME.purple600, THEME.indigo600]} style={styles.header}>
            <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
              <Ionicons name="arrow-back" size={20} color={colors.background.primary} />
            </Pressable>
            <Text style={styles.headerTitle}>Mission Details</Text>
            <View style={{ width: 40 }} />
          </LinearGradient>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.neutral[400]} />
            <Text style={styles.errorTitle}>Unable to load mission</Text>
            <Text style={styles.errorText}>{error || 'Challenge not found'}</Text>
            <Pressable onPress={() => fetchData()} style={styles.retryButton}>
              <Text style={styles.retryText}>Try Again</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </>
    );
  }

  const diffStyle = getDifficultyStyle(challenge.difficulty);
  const progressPercent = Math.round((progress.progress / progress.target) * 100);
  const timeRemaining = challengesApi.getTimeRemaining(challenge.endDate);
  const isClaimable = progress.completed && !progress.rewardsClaimed;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <LinearGradient colors={[THEME.purple600, THEME.indigo600]} style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Ionicons name="arrow-back" size={20} color={colors.background.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Mission Details</Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{challenge.type.toUpperCase()}</Text>
          </View>
        </LinearGradient>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[THEME.purple600]}
              tintColor={THEME.purple600}
            />
          }
        >
          {/* Challenge Card */}
          <View style={styles.challengeCard}>
            {/* Title & Difficulty */}
            <View style={styles.titleRow}>
              <View style={styles.iconBox}>
                <Ionicons name={diffStyle.icon} size={28} color={diffStyle.color} />
              </View>
              <View style={styles.titleContent}>
                <Text style={styles.challengeTitle}>{challenge.title}</Text>
                <View style={[styles.difficultyBadge, { backgroundColor: diffStyle.bg }]}>
                  <Text style={[styles.difficultyText, { color: diffStyle.color }]}>
                    {diffStyle.label}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={styles.challengeDescription}>{challenge.description}</Text>

            {/* Time Remaining */}
            <View style={styles.timeRow}>
              <View style={styles.timeItem}>
                <Ionicons name="time-outline" size={18} color={colors.neutral[500]} />
                <Text style={styles.timeLabel}>Time Left</Text>
              </View>
              <Text style={styles.timeValue}>{timeRemaining}</Text>
            </View>
          </View>

          {/* Progress Section */}
          <View style={styles.progressCard}>
            <Text style={styles.sectionTitle}>Your Progress</Text>
            <View style={styles.progressContent}>
              <ProgressCircle progress={progressPercent} />
              <View style={styles.progressStats}>
                <View style={styles.progressStat}>
                  <Text style={styles.progressStatValue}>{progress.progress}</Text>
                  <Text style={styles.progressStatLabel}>Completed</Text>
                </View>
                <View style={styles.progressStatDivider} />
                <View style={styles.progressStat}>
                  <Text style={styles.progressStatValue}>{progress.target}</Text>
                  <Text style={styles.progressStatLabel}>Target</Text>
                </View>
                <View style={styles.progressStatDivider} />
                <View style={styles.progressStat}>
                  <Text style={styles.progressStatValue}>{progress.target - progress.progress}</Text>
                  <Text style={styles.progressStatLabel}>Remaining</Text>
                </View>
              </View>
            </View>

            {/* Status Badge */}
            <View style={[
              styles.statusBadge,
              progress.completed
                ? progress.rewardsClaimed
                  ? styles.statusClaimed
                  : styles.statusCompleted
                : styles.statusInProgress
            ]}>
              <Ionicons
                name={progress.completed ? 'checkmark-circle' : 'hourglass'}
                size={16}
                color={progress.completed ? colors.successScale[500] : colors.infoScale[500]}
              />
              <Text style={[
                styles.statusText,
                { color: progress.completed ? colors.successScale[600] : colors.infoScale[600] }
              ]}>
                {progress.completed
                  ? progress.rewardsClaimed ? 'Rewards Claimed' : 'Completed - Claim Rewards!'
                  : 'In Progress'}
              </Text>
            </View>
          </View>

          {/* Rewards Section */}
          <View style={styles.rewardsCard}>
            <Text style={styles.sectionTitle}>Rewards</Text>
            <View style={styles.rewardsList}>
              <View style={styles.rewardItem}>
                <View style={[styles.rewardIconBox, { backgroundColor: 'rgba(255, 200, 87, 0.2)' }]}>
                  <CachedImage source={REZ_COIN_IMAGE} style={styles.rewardCoinIcon} />
                </View>
                <View style={styles.rewardContent}>
                  <Text style={styles.rewardValue}>+{challenge.rewards.coins}</Text>
                  <Text style={styles.rewardLabel}>{BRAND.COIN_NAME}</Text>
                </View>
              </View>
              {challenge.rewards.badges && challenge.rewards.badges.length > 0 && (
                <View style={styles.rewardItem}>
                  <View style={[styles.rewardIconBox, { backgroundColor: 'rgba(139, 92, 246, 0.2)' }]}>
                    <Ionicons name="ribbon" size={24} color={THEME.purple500} />
                  </View>
                  <View style={styles.rewardContent}>
                    <Text style={styles.rewardValue}>{challenge.rewards.badges.length}</Text>
                    <Text style={styles.rewardLabel}>Badge(s)</Text>
                  </View>
                </View>
              )}
              {challenge.rewards.multiplier && challenge.rewards.multiplier > 1 && (
                <View style={styles.rewardItem}>
                  <View style={[styles.rewardIconBox, { backgroundColor: 'rgba(0, 192, 106, 0.2)' }]}>
                    <Ionicons name="flash" size={24} color={colors.successScale[500]} />
                  </View>
                  <View style={styles.rewardContent}>
                    <Text style={styles.rewardValue}>{challenge.rewards.multiplier}x</Text>
                    <Text style={styles.rewardLabel}>Multiplier</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Claim Button */}
            {isClaimable && (
              <Pressable
               
                style={styles.claimButtonWrapper}
                onPress={handleClaimReward}
                disabled={claiming}
              >
                <LinearGradient
                  colors={[colors.primary[500], colors.successScale[500]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.claimButton}
                >
                  {claiming ? (
                    <ActivityIndicator size="small" color={colors.background.primary} />
                  ) : (
                    <>
                      <CachedImage source={REZ_COIN_IMAGE} style={styles.claimCoinIcon} />
                      <Text style={styles.claimButtonText}>Claim Rewards</Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            )}
          </View>

          {/* Requirements Section */}
          {challenge.requirements && (
            <View style={styles.requirementsCard}>
              <Text style={styles.sectionTitle}>Requirements</Text>
              <View style={styles.requirementItem}>
                <Ionicons name="checkmark-circle" size={20} color={colors.primary[500]} />
                <Text style={styles.requirementText}>
                  {challenge.requirements.action === 'visit_stores' && `Visit ${challenge.requirements.count} stores`}
                  {challenge.requirements.action === 'upload_bills' && `Upload ${challenge.requirements.count} bills`}
                  {challenge.requirements.action === 'order_count' && `Place ${challenge.requirements.count} orders`}
                  {challenge.requirements.action === 'refer_friends' && `Refer ${challenge.requirements.count} friends`}
                  {challenge.requirements.action === 'review_count' && `Write ${challenge.requirements.count} reviews`}
                  {challenge.requirements.action === 'spend_amount' && `Spend ${currencySymbol}${challenge.requirements.count}`}
                  {challenge.requirements.action === 'login_streak' && `Maintain ${challenge.requirements.count} day login streak`}
                  {challenge.requirements.action === 'share_deals' && `Share ${challenge.requirements.count} deals`}
                </Text>
              </View>
              {challenge.requirements.minAmount && (
                <View style={styles.requirementItem}>
                  <Ionicons name="cash-outline" size={20} color={colors.secondary[500]} />
                  <Text style={styles.requirementText}>
                    Minimum {currencySymbol}{challenge.requirements.minAmount} per transaction
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Leaderboard Section */}
          {leaderboard.length > 0 && (
            <View style={styles.leaderboardCard}>
              <View style={styles.leaderboardHeader}>
                <Text style={styles.sectionTitle}>Leaderboard</Text>
                <Text style={styles.participantCount}>
                  {challenge.participantCount ?? 0} participants
                </Text>
              </View>
              {leaderboard.slice(0, 5).map((entry, index) => (
                <View key={entry.user._id} style={styles.leaderboardItem}>
                  <View style={[
                    styles.rankBadge,
                    index === 0 && styles.rankGold,
                    index === 1 && styles.rankSilver,
                    index === 2 && styles.rankBronze,
                  ]}>
                    <Text style={[
                      styles.rankText,
                      index < 3 && styles.rankTextTop
                    ]}>
                      {entry.rank}
                    </Text>
                  </View>
                  <View style={styles.userAvatar}>
                    <Ionicons name="person" size={18} color={colors.neutral[400]} />
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{entry.user.name}</Text>
                    <Text style={styles.userProgress}>
                      {entry.progress}/{progress.target} {entry.completed && '(Completed)'}
                    </Text>
                  </View>
                  {entry.completed && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.successScale[500]} />
                  )}
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: typography.h4.fontSize,
    fontWeight: '700',
    color: colors.background.primary,
  },
  typeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: borderRadius.full,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 120,
  },
  challengeCard: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...Platform.select({
      ios: shadows.md,
      android: { elevation: 4 },
    }),
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  titleContent: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: typography.h4.fontSize,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  difficultyBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  challengeDescription: {
    fontSize: typography.body.fontSize,
    color: colors.text.secondary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  timeLabel: {
    fontSize: typography.bodySmall.fontSize,
    color: colors.text.secondary,
  },
  timeValue: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
  },
  progressCard: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...Platform.select({
      ios: shadows.md,
      android: { elevation: 4 },
    }),
  },
  sectionTitle: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  progressContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  progressCircleCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  progressCircleValue: {
    fontSize: typography.h3.fontSize,
    fontWeight: '700',
    color: THEME.purple600,
  },
  progressCircleLabel: {
    fontSize: typography.caption.fontSize,
    color: colors.text.secondary,
  },
  progressStats: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  progressStat: {
    alignItems: 'center',
  },
  progressStatValue: {
    fontSize: typography.h4.fontSize,
    fontWeight: '700',
    color: colors.text.primary,
  },
  progressStatLabel: {
    fontSize: typography.caption.fontSize,
    color: colors.text.secondary,
    marginTop: 2,
  },
  progressStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.neutral[200],
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  statusInProgress: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  statusCompleted: {
    backgroundColor: 'rgba(0, 192, 106, 0.15)',
  },
  statusClaimed: {
    backgroundColor: 'rgba(0, 192, 106, 0.08)',
  },
  statusText: {
    fontSize: typography.bodySmall.fontSize,
    fontWeight: '600',
  },
  rewardsCard: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...Platform.select({
      ios: shadows.md,
      android: { elevation: 4 },
    }),
  },
  rewardsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    minWidth: (SCREEN_WIDTH - spacing.md * 4) / 2 - spacing.sm,
  },
  rewardIconBox: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  rewardCoinIcon: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
  claimCoinIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },
  rewardContent: {
    flex: 1,
  },
  rewardValue: {
    fontSize: typography.body.fontSize,
    fontWeight: '700',
    color: colors.text.primary,
  },
  rewardLabel: {
    fontSize: typography.caption.fontSize,
    color: colors.text.secondary,
  },
  claimButtonWrapper: {
    marginTop: spacing.md,
  },
  claimButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  claimButtonText: {
    fontSize: typography.body.fontSize,
    fontWeight: '700',
    color: colors.background.primary,
  },
  requirementsCard: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...Platform.select({
      ios: shadows.md,
      android: { elevation: 4 },
    }),
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  requirementText: {
    fontSize: typography.body.fontSize,
    color: colors.text.secondary,
    flex: 1,
  },
  leaderboardCard: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...Platform.select({
      ios: shadows.md,
      android: { elevation: 4 },
    }),
  },
  leaderboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  participantCount: {
    fontSize: typography.caption.fontSize,
    color: colors.text.tertiary,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  rankGold: {
    backgroundColor: colors.brand.goldBright,
  },
  rankSilver: {
    backgroundColor: '#C0C0C0',
  },
  rankBronze: {
    backgroundColor: '#CD7F32',
  },
  rankText: {
    fontSize: typography.bodySmall.fontSize,
    fontWeight: '700',
    color: colors.text.primary,
  },
  rankTextTop: {
    color: colors.background.primary,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: typography.bodySmall.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
  },
  userProgress: {
    fontSize: typography.caption.fontSize,
    color: colors.text.secondary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: typography.bodySmall.fontSize,
    color: colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  errorTitle: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  errorText: {
    fontSize: typography.bodySmall.fontSize,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: THEME.purple600,
    borderRadius: borderRadius.md,
  },
  retryText: {
    fontSize: typography.bodySmall.fontSize,
    fontWeight: '600',
    color: colors.background.primary,
  },
});

export default withErrorBoundary(MissionDetailScreen, 'MissionDetail');
