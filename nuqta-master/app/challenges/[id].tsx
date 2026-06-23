// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Dimensions,
  Platform
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { DetailPageSkeleton } from '@/components/skeletons';
import { router, Stack, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import apiClient from '@/services/apiClient';
import { useIsAuthenticated, useRezBalance, useRefreshWallet } from '@/stores/selectors';
import { showAlert } from '@/components/common/CrossPlatformAlert';
import ClaimRewardModal from '@/components/challenges/ClaimRewardModal';
import ChallengeTips from '@/components/challenges/ChallengeTips';
import ActivityTimeline from '@/components/challenges/ActivityTimeline';
import coinSyncService from '@/services/coinSyncService';
import logger from '@/utils/logger';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width } = Dimensions.get('window');

interface Challenge {
  _id: string;
  title: string;
  description: string;
  icon: string;
  type: 'daily' | 'weekly' | 'monthly' | 'special';
  difficulty: 'easy' | 'medium' | 'hard';
  requirements: {
    action: string;
    target: number;
    stores?: string[];
    categories?: string[];
    minAmount?: number;
  };
  rewards: {
    coins: number;
    badges?: string[];
    multiplier?: number;
  };
  active: boolean;
  startDate: string;
  endDate: string;
}

interface UserProgress {
  _id: string;
  progress: number;
  target: number;
  completed: boolean;
  rewardsClaimed: boolean;
  startDate: string;
  endDate: string;
}

interface ChallengeDetailData {
  challenge: Challenge;
  userProgress: UserProgress | null;
}

function ChallengeDetailPage() {
  const isMounted = useIsMounted();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ChallengeDetailData | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimData, setClaimData] = useState<{
    coins: number;
    beforeBalance: number;
    afterBalance: number;
  } | null>(null);
  const isAuthenticated = useIsAuthenticated();
  const rezBalance = useRezBalance();
  const refreshWallet = useRefreshWallet();

  // Pulse animation for Claim Reward button
  const pulseAnim = useSharedValue(1);
  const pulseAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  useEffect(() => {
    if (isAuthenticated && id) {
      loadChallengeDetail();
    }
  }, [isAuthenticated, id]);

  // Refresh data when navigating back to this screen
  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      if (isAuthenticated && id) {
        loadChallengeDetail();
      }
    }, [isAuthenticated, id])
  );

  // Start pulse animation when challenge is completed and ready to claim
  useEffect(() => {
    if (data?.userProgress?.completed && !data?.userProgress?.rewardsClaimed) {
      pulseAnim.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1
      );
      return () => { pulseAnim.value = 1; };
    }
  }, [data?.userProgress?.completed, data?.userProgress?.rewardsClaimed]);

  const loadChallengeDetail = async () => {
    try {
      setLoading(true);
      logger.debug('🔍 [Challenge Detail] Loading challenge:', id);

      // Fetch challenge and user progress
      const [challengeRes, progressRes] = await Promise.all([
        apiClient.get('/gamification/challenges'),
        apiClient.get('/gamification/challenges/my-progress?includeCompleted=true'),
      ]);

      const allChallenges = challengeRes.success ? ((challengeRes.data as any) || []) : [];
      const allProgress = progressRes.success ? ((progressRes.data as any)?.challenges || []) : [];

      logger.debug('📊 [Challenge Detail] All challenges:', allChallenges.length);
      logger.debug('📊 [Challenge Detail] User progress:', allProgress.length);
      logger.debug('🎯 [Challenge Detail] Looking for ID:', id);

      // Find the specific challenge - first check user progress
      let progress = allProgress.find((p: any) => p._id === id);
      let challenge = progress?.challenge;

      // If not found in progress, check if it's an available challenge (not started yet)
      if (!challenge) {
        logger.debug('⚠️ [Challenge Detail] Not found in progress, checking available challenges...');
        challenge = allChallenges.find((c: any) => c._id === id);

        if (challenge) {
          logger.debug('✅ [Challenge Detail] Found available challenge:', challenge.title);
          if (!isMounted()) return;
          setData({
            challenge,
            userProgress: null,
          });
          if (!isMounted()) return;
          setLoading(false);
          return;
        }
      } else {
        logger.debug('✅ [Challenge Detail] Found in progress:', challenge.title);
      }

      if (!challenge) {
        logger.error('❌ [Challenge Detail] Challenge not found anywhere. ID:', id);
        logger.error('Available challenge IDs:', allChallenges.map((c: any) => c._id).slice(0, 5));
        logger.error('Progress IDs:', allProgress.map((p: any) => p._id).slice(0, 5));
        showAlert('Error', 'Challenge not found', undefined, 'error');
        router.canGoBack() ? router.back() : router.replace('/(tabs)');
        return;
      }

      if (!isMounted()) return;
      setData({
        challenge,
        userProgress: progress || null,
      });
    } catch (error: any) {
      logger.error('❌ [Challenge Detail] Error loading challenge:', error);
      showAlert('Error', 'Failed to load challenge details', undefined, 'error');
      router.canGoBack() ? router.back() : router.replace('/(tabs)');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const handleStartChallenge = () => {
    if (!data) return;

    const action = data.challenge.requirements.action;
    navigateToAction(action);
  };

  const navigateToAction = (action: string) => {
    logger.debug('🧭 [Challenge Detail] Navigating to action:', action);

    // Special case: login_streak completes automatically
    if (action === 'login_streak') {
      showAlert(
        'Auto-Tracked Challenge! ✅',
        'This challenge completes automatically when you log in to the app. Just keep coming back daily to maintain your streak!',
        [{ text: 'Got it!' }],
        'success'
      );
      return;
    }

    const actionRoutes: Record<string, string> = {
      visit_stores: '/StoreListPage',
      upload_bills: '/bill-upload',
      refer_friends: '/referral',
      review_count: '/my-reviews',
      order_count: '/StoreListPage',
      share_deals: '/offers',
      explore_categories: '/category/all',
      add_favorites: '/wishlist',
      purchase_amount: '/StoreListPage',
    };

    const route = actionRoutes[action];
    if (route) {
      router.push(route as any);
    } else {
      showAlert('Info', 'Complete this challenge by using the app!', undefined, 'info');
    }
  };

  const handleClaimReward = async () => {
    if (!data?.userProgress) return;

    try {
      setClaiming(true);

      // Use wallet balance from context instead of extra API call
      const beforeBalance = rezBalance;

      // Claim the reward
      const response = await apiClient.post(`/gamification/challenges/${data.userProgress._id}/claim`);

      if (response.success) {
        const coinsEarned = data.challenge.rewards.coins;

        // Sync coins to wallet
        const syncResult = await coinSyncService.handleChallengeReward(
          data.userProgress._id,
          'Challenge',
          coinsEarned
        );

        const afterBalance = syncResult.success ? syncResult.newWalletBalance : beforeBalance + coinsEarned;

        // Refresh wallet context so balance is up-to-date across the app
        refreshWallet();

        // Show celebration modal
        if (!isMounted()) return;
        setClaimData({
          coins: coinsEarned,
          beforeBalance,
          afterBalance,
        });
        if (!isMounted()) return;
        setShowClaimModal(true);
      } else {
        showAlert('Error', response.message || 'Failed to claim reward', undefined, 'error');
      }
    } catch (error: any) {
      logger.error('❌ [Challenge Detail] Error claiming reward:', error);
      showAlert('Error', 'Failed to claim reward', undefined, 'error');
    } finally {
      if (!isMounted()) return;
      setClaiming(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return Colors.success;
      case 'medium':
        return Colors.warning;
      case 'hard':
        return Colors.error;
      default:
        return Colors.brand.purpleLight;
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      visit_stores: 'Visit Stores',
      upload_bills: 'Upload Bills',
      refer_friends: 'Refer Friends',
      review_count: 'Write Reviews',
      order_count: 'Place Orders',
      share_deals: 'Share Deals',
      explore_categories: 'Explore Categories',
      add_favorites: 'Add Favorites',
      login_streak: 'Daily Login',
      purchase_amount: 'Shop Now',
    };
    return labels[action] || 'Complete Action';
  };

  const getTimeRemaining = () => {
    if (!data?.userProgress?.endDate) return 'No deadline';

    const endDate = new Date(data.userProgress.endDate);
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h remaining`;
  };

  const generateMockActivities = () => {
    if (!data?.userProgress || data.userProgress.progress === 0) return [];

    const activities = [];
    const now = new Date();
    const action = data.challenge.requirements.action;
    const actionLabel = getActionLabel(action);

    for (let i = 0; i < data.userProgress.progress; i++) {
      const hoursAgo = (data.userProgress.progress - i) * 2; // 2 hours between each activity
      const activityTime = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);

      activities.push({
        id: `activity-${i}`,
        action: action,
        description: `Completed: ${actionLabel} #${i + 1}`,
        timestamp: activityTime.toISOString(),
        progress: i + 1,
      });
    }

    return activities.reverse(); // Most recent first
  };

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Challenge Details',
            headerShown: true,
          }}
        />
        <DetailPageSkeleton />
      </>
    );
  }

  if (!data) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen
          options={{
            title: 'Challenge Details',
            headerShown: true,
          }}
        />
        <Text style={styles.errorText}>Challenge not found</Text>
      </View>
    );
  }

  const { challenge, userProgress } = data;
  const progress = userProgress ? (userProgress.progress / userProgress.target) * 100 : 0;
  const isCompleted = userProgress?.completed || false;
  const canClaim = isCompleted && !userProgress?.rewardsClaimed;
  const isClaimed = userProgress?.rewardsClaimed || false;
  const isStarted = !!userProgress;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Challenge Details',
          headerShown: true,
          headerStyle: {
            backgroundColor: Colors.brand.purpleLight,
          },
          headerTintColor: Colors.text.inverse,
        }}
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Hero Section */}
        <LinearGradient colors={[Colors.brand.purpleLight, Colors.brand.purple, colors.brand.purpleDeep]} style={styles.heroSection}>
          <View style={styles.iconContainer}>
            <Ionicons name={challenge.icon as any} size={60} color={Colors.text.inverse} />
          </View>
          <Text style={styles.heroTitle}>{challenge.title}</Text>
          <Text style={styles.heroDescription}>{challenge.description}</Text>

          <View style={styles.metaRow}>
            <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(challenge.difficulty) }]}>
              <Text style={styles.difficultyText}>{challenge.difficulty.toUpperCase()}</Text>
            </View>
            <View style={styles.typeBadge}>
              <Ionicons name="calendar" size={16} color={Colors.text.inverse} />
              <Text style={styles.typeText}>{challenge.type.toUpperCase()}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Progress Section */}
        {isStarted && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Progress</Text>
            <View style={styles.progressContainer}>
              <View style={styles.progressBarWrapper}>
                <View style={styles.progressBarBackground}>
                  <View style={[styles.progressBarFill, { width: `${Math.min(progress, 100)}%` }]} />
                </View>
                {/* Milestone Markers */}
                {[25, 50, 75, 100].map((milestone) => {
                  const isPassed = progress >= milestone;
                  return (
                    <View
                      key={milestone}
                      style={[
                        styles.milestoneMarker,
                        { left: `${milestone}%` },
                        isPassed && styles.milestoneMarkerPassed,
                      ]}
                    >
                      <View style={[styles.milestoneDot, isPassed && styles.milestoneDotPassed]}>
                        {isPassed && <Ionicons name="checkmark" size={12} color={Colors.text.inverse} />}
                      </View>
                      <Text style={[styles.milestoneLabel, isPassed && styles.milestoneLabelPassed]}>
                        {milestone}%
                      </Text>
                    </View>
                  );
                })}
              </View>
              <Text style={styles.progressText}>
                {userProgress.progress}/{userProgress.target} ({Math.round(progress)}%)
              </Text>
            </View>
          </View>
        )}

        {/* Requirements Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What to Do</Text>
          <View style={styles.requirementCard}>
            <View style={styles.requirementHeader}>
              <Ionicons name="checkmark-circle" size={24} color={Colors.brand.purpleLight} />
              <Text style={styles.requirementTitle}>
                {getActionLabel(challenge.requirements.action)}
              </Text>
            </View>
            <Text style={styles.requirementDescription}>
              Complete {challenge.requirements.target} {getActionLabel(challenge.requirements.action).toLowerCase()} to
              finish this challenge
            </Text>

            {isStarted && (
              <View style={styles.checklistContainer}>
                {Array.from({ length: challenge.requirements.target }).map((_, index) => {
                  const isDone = index < (userProgress?.progress || 0);
                  return (
                    <View key={index} style={styles.checklistItem}>
                      <Ionicons
                        name={isDone ? 'checkmark-circle' : 'ellipse-outline'}
                        size={20}
                        color={isDone ? Colors.success : Colors.text.tertiary}
                      />
                      <Text style={[styles.checklistText, isDone && styles.checklistTextDone]}>
                        {getActionLabel(challenge.requirements.action)} #{index + 1}
                      </Text>
                      {isDone && <Text style={styles.checklistDone}>Done</Text>}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>

        {/* Challenge Tips */}
        <View style={styles.section}>
          <ChallengeTips action={challenge.requirements.action} difficulty={challenge.difficulty} />
        </View>

        {/* Rewards Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rewards</Text>
          <View style={styles.rewardsCard}>
            <View style={styles.rewardItem}>
              <Ionicons name="diamond" size={32} color={Colors.brand.purpleLight} />
              <Text style={styles.rewardAmount}>{challenge.rewards.coins}</Text>
              <Text style={styles.rewardLabel}>Coins</Text>
            </View>
            {challenge.rewards.badges && challenge.rewards.badges.length > 0 && (
              <View style={styles.rewardItem}>
                <Ionicons name="trophy" size={32} color={Colors.warning} />
                <Text style={styles.rewardAmount}>{challenge.rewards.badges.length}</Text>
                <Text style={styles.rewardLabel}>Badge{challenge.rewards.badges.length > 1 ? 's' : ''}</Text>
              </View>
            )}
            {challenge.rewards.multiplier && (
              <View style={styles.rewardItem}>
                <Ionicons name="flash" size={32} color={Colors.error} />
                <Text style={styles.rewardAmount}>{challenge.rewards.multiplier}x</Text>
                <Text style={styles.rewardLabel}>Multiplier</Text>
              </View>
            )}
          </View>
        </View>

        {/* Activity Timeline */}
        {isStarted && userProgress && userProgress.progress > 0 && (
          <View style={styles.section}>
            <ActivityTimeline
              activities={generateMockActivities()}
              currentProgress={userProgress.progress}
              targetProgress={userProgress.target}
            />
          </View>
        )}

        {/* Time Remaining */}
        {isStarted && (
          <View style={styles.timeSection}>
            <Ionicons name="time-outline" size={20} color={Colors.text.tertiary} />
            <Text style={styles.timeText}>{getTimeRemaining()}</Text>
          </View>
        )}

        {/* Spacer for button and bottom nav */}
        <View style={{ height: 180 }} />
      </ScrollView>

      {/* CTA Button */}
      <View style={styles.ctaContainer}>
        {isClaimed ? (
          <View style={styles.claimedButton}>
            <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
            <Text style={styles.claimedText}>Rewards Claimed</Text>
          </View>
        ) : canClaim ? (
          <Animated.View style={pulseAnimStyle}>
            <Pressable
              style={styles.claimButton}
              onPress={handleClaimReward}
              disabled={claiming}
             
            >
              <LinearGradient colors={[Colors.success, colors.successScale[700]]} style={styles.claimButtonGradient}>
                {claiming ? (
                  <ActivityIndicator size="small" color={Colors.text.inverse} />
                ) : (
                  <>
                    <Ionicons name="gift" size={24} color={Colors.text.inverse} />
                    <Text style={styles.claimButtonText}>Claim Reward</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </Animated.View>
        ) : (
          <Pressable
            style={styles.startButton}
            onPress={handleStartChallenge}
           
          >
            <LinearGradient colors={[Colors.brand.purpleLight, Colors.brand.purple]} style={styles.startButtonGradient}>
              <Text style={styles.startButtonText}>
                {isStarted ? `Continue: ${getActionLabel(challenge.requirements.action)}` : 'Start Challenge'}
              </Text>
              <Ionicons name="arrow-forward" size={24} color={Colors.text.inverse} />
            </LinearGradient>
          </Pressable>
        )}
      </View>

      {/* Claim Reward Modal */}
      {claimData && (
        <ClaimRewardModal
          visible={showClaimModal}
          onClose={() => {
            setShowClaimModal(false);
            router.canGoBack() ? router.back() : router.replace('/(tabs)');
          }}
          reward={{
            coins: claimData.coins,
            badges: data?.challenge.rewards.badges,
            multiplier: data?.challenge.rewards.multiplier,
          }}
          beforeStats={{
            coins: claimData.beforeBalance,
          }}
          afterStats={{
            coins: claimData.afterBalance,
          }}
        />
      )}
    </View>
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
    backgroundColor: Colors.background.secondary,
  },
  errorText: {
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
  },
  scrollView: {
    flex: 1,
  },
  heroSection: {
    padding: Spacing.xl,
    alignItems: 'center',
    paddingBottom: Spacing['2xl'],
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  heroTitle: {
    ...Typography.h1,
    fontWeight: 'bold',
    color: Colors.text.inverse,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  heroDescription: {
    ...Typography.bodyLarge,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.base,
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  difficultyBadge: {
    paddingHorizontal: Spacing.base,
    paddingVertical: 6,
    borderRadius: BorderRadius.xl,
  },
  difficultyText: {
    ...Typography.bodySmall,
    fontWeight: 'bold',
    color: Colors.text.inverse,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.base,
    paddingVertical: 6,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  typeText: {
    ...Typography.bodySmall,
    fontWeight: 'bold',
    color: Colors.text.inverse,
  },
  section: {
    padding: Spacing.base,
  },
  sectionTitle: {
    ...Typography.h3,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  progressContainer: {
    backgroundColor: Colors.background.primary,
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    ...Shadows.medium,
  },
  progressBarWrapper: {
    position: 'relative',
    marginBottom: 40,
  },
  progressBarBackground: {
    height: 12,
    backgroundColor: Colors.border.default,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.brand.purpleLight,
    borderRadius: 6,
  },
  milestoneMarker: {
    position: 'absolute',
    top: -8,
    alignItems: 'center',
    transform: [{ translateX: -12 }],
  },
  milestoneMarkerPassed: {},
  milestoneDot: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.border.default,
    borderWidth: 2,
    borderColor: Colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  milestoneDotPassed: {
    backgroundColor: Colors.success,
    borderColor: Colors.background.primary,
  },
  milestoneLabel: {
    ...Typography.overline,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  milestoneLabelPassed: {
    color: Colors.success,
  },
  progressText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    textAlign: 'center',
  },
  requirementCard: {
    backgroundColor: Colors.background.primary,
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    ...Shadows.medium,
  },
  requirementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  requirementTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
  },
  requirementDescription: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginBottom: Spacing.base,
  },
  checklistContainer: {
    gap: Spacing.md,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  checklistText: {
    flex: 1,
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  checklistTextDone: {
    textDecorationLine: 'line-through',
    color: Colors.text.tertiary,
  },
  checklistDone: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.success,
  },
  rewardsCard: {
    backgroundColor: Colors.background.primary,
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    justifyContent: 'space-around',
    ...Shadows.medium,
  },
  rewardItem: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  rewardAmount: {
    ...Typography.h2,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  rewardLabel: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  timeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.base,
  },
  timeText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },
  ctaContainer: {
    position: 'absolute',
    bottom: 70,
    left: 0,
    right: 0,
    padding: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
  },
  claimedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.base,
    backgroundColor: Colors.successScale[50],
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.success,
  },
  claimedText: {
    ...Typography.bodyLarge,
    fontWeight: 'bold',
    color: Colors.success,
  },
  claimButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  claimButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.base,
  },
  claimButtonText: {
    ...Typography.bodyLarge,
    fontWeight: 'bold',
    color: Colors.text.inverse,
  },
  startButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.base,
  },
  startButtonText: {
    ...Typography.bodyLarge,
    fontWeight: 'bold',
    color: Colors.text.inverse,
  },
});

export default withErrorBoundary(ChallengeDetailPage, 'ChallengesId');
