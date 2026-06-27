// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  StyleSheet,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { CardGridSkeleton } from '@/components/skeletons';
import { router, Stack } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import apiClient from '@/services/apiClient';
import { useRezBalance, useRefreshWallet, useAuthUser, useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import coinSyncService from '@/services/coinSyncService';
import { showAlert } from '@/components/common/CrossPlatformAlert';
import logger from '@/utils/logger';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width } = Dimensions.get('window');

interface Challenge {
  _id: string;
  challenge: {
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
    durationDays?: number;
  };
  progress: number;
  target: number;
  completed: boolean;
  rewardsClaimed: boolean;
  startDate: string;
  endDate: string;
}

interface ChallengeStats {
  totalCompleted: number;
  totalCoinsEarned: number;
  currentStreak: number;
  bestStreak: number;
  completionRate: number;
}

type TabType = 'daily' | 'weekly' | 'monthly' | 'completed';

function ChallengesPage() {
  const isMounted = useIsMounted();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('daily');
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [completedChallenges, setCompletedChallenges] = useState<Challenge[]>([]);
  const [stats, setStats] = useState<ChallengeStats>({
    totalCompleted: 0,
    totalCoinsEarned: 0,
    currentStreak: 0,
    bestStreak: 0,
    completionRate: 0,
  });
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_LIMIT = 20;

  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const coinBalance = useRezBalance();
  const refreshWallet = useRefreshWallet();

  useEffect(() => {
    if (isAuthenticated && user) {
      loadChallengesData();
    } else if (!authLoading && !isAuthenticated) {
      router.replace({
        pathname: '/sign-in',
        params: { returnTo: '/challenges' },
      } as any);
    }
  }, [isAuthenticated, authLoading, user]);

  const loadChallengesData = async () => {
    try {
      setLoading(true);

      logger.debug('🔍 [Challenges] Loading challenges data...');

      const [allChallengesRes, progressRes, statsRes] = await Promise.allSettled([
        apiClient.get('/gamification/challenges'),
        apiClient.get('/gamification/challenges/my-progress?includeCompleted=true'),
        apiClient.get('/gamification/stats'),
        refreshWallet(),
      ]);

      logger.debug('📡 [Challenges] API Response:', {
        allChallengesRes: allChallengesRes.status === 'fulfilled' ? allChallengesRes.value.data : 'failed',
        progressRes: progressRes.status === 'fulfilled' ? progressRes.value.data : 'failed',
      });

      // Get all available challenges
      // apiClient returns { success, data, message } where data is the array
      const availableChallenges = allChallengesRes.status === 'fulfilled' ? ((allChallengesRes.value.data as any) || []) : [];
      logger.debug(`✅ [Challenges] Available challenges: ${availableChallenges.length}`);
      logger.debug('📋 [Challenges] Challenges:', availableChallenges);

      // Get user's progress
      // progressRes.data is { challenges: [], stats: {} }
      const userProgress = progressRes.status === 'fulfilled' ? ((progressRes.value.data as any)?.challenges || []) : [];
      logger.debug(`📊 [Challenges] User progress: ${userProgress.length}`);

      // Merge available challenges with user progress
      const mergedChallenges = availableChallenges.map((challenge: any) => {
        const progress = userProgress.find((p: any) => p.challenge._id === challenge._id);

        if (progress) {
          // User has started this challenge
          return {
            _id: progress._id,
            challenge: challenge,
            progress: progress.progress,
            target: progress.target || challenge.requirements.target,
            completed: progress.completed,
            rewardsClaimed: progress.rewardsClaimed,
            startDate: progress.startDate,
            endDate: progress.endDate || challenge.endDate,
          };
        } else {
          // User hasn't started this challenge yet
          return {
            _id: challenge._id,
            challenge: challenge,
            progress: 0,
            target: challenge.requirements.target,
            completed: false,
            rewardsClaimed: false,
            startDate: challenge.startDate,
            endDate: challenge.endDate,
          };
        }
      });

      // Separate completed and active challenges
      const completed = mergedChallenges.filter((c: Challenge) => c.rewardsClaimed);
      const active = mergedChallenges.filter((c: Challenge) => !c.rewardsClaimed);

      logger.debug(`🎯 [Challenges] Merged challenges: ${mergedChallenges.length}`);
      logger.debug(`✅ [Challenges] Active: ${active.length}, Completed: ${completed.length}`);

      if (!isMounted()) return;
      setChallenges(active);
      if (!isMounted()) return;
      setCompletedChallenges(completed);

      // Map API stats to our interface and calculate completion rate
      const apiStats = statsRes.status === 'fulfilled' ? ((statsRes.value.data as any) || {}) : {};
      const totalChallenges = (apiStats.challengesCompleted || 0) + (apiStats.challengesActive || 0);
      const completionRate = totalChallenges > 0
        ? ((apiStats.challengesCompleted || 0) / totalChallenges) * 100
        : 0;

      if (!isMounted()) return;
      setStats({
        totalCompleted: apiStats.challengesCompleted || 0,
        totalCoinsEarned: apiStats.totalCoins || 0,
        currentStreak: apiStats.streak || 0,
        activeChallenges: apiStats.challengesActive || 0,
        completionRate: completionRate,
      });

      // Coin balance comes from WalletContext (refreshed above)
    } catch (error) {
      logger.error('Error loading challenges data:', error);
      showAlert('Error', 'Failed to load challenges. Please try again.', undefined, 'error');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadChallengesData();
  };

  const handleJoinChallenge = async (challengeId: string, challengeTitle: string) => {
    try {
      // For now, since join endpoint might not exist, we'll just show a message
      // The challenge will auto-join when user completes an action
      showAlert(
        'Challenge Accepted! 🎯',
        `Start completing "${challengeTitle}" to earn rewards!`,
        [
          {
            text: 'Got it!',
            onPress: () => loadChallengesData(),
          },
        ],
        'success'
      );
    } catch (error: any) {
      showAlert('Error', error.response?.data?.message || 'Failed to join challenge', undefined, 'error');
    }
  };

  const handleClaimReward = async (challengeId: string) => {
    if (claimingId) return; // Prevent double-click

    try {
      setClaimingId(challengeId);
      logger.debug('🎁 [Claim Reward] ========== STARTING CLAIM PROCESS ==========');
      logger.debug('🎁 [Claim Reward] Challenge ID:', challengeId);
      logger.debug('🎁 [Claim Reward] Current wallet balance:', coinBalance);

      const response = await apiClient.post(`/gamification/challenges/${challengeId}/claim`);
      logger.debug('🎁 [Claim Reward] Raw response:', response);
      logger.debug('🎁 [Claim Reward] Response.data:', response.data);
      logger.debug('🎁 [Claim Reward] Response.data.success:', (response.data as any).success);
      logger.debug('🎁 [Claim Reward] Response.success:', (response as any).success);

      // Handle both wrapped and unwrapped responses
      const responseData = (response as any).success ? response : response.data;
      const isSuccess = responseData.success === true;

      logger.debug('🎁 [Claim Reward] Is success:', isSuccess);

      if (isSuccess) {
        const coinsEarned = responseData.data?.rewards?.coins || 10;
        const backendWalletBalance = responseData.data?.walletBalance;

        logger.debug('🎁 [Claim Reward] ✅ Coins earned:', coinsEarned);
        logger.debug('🎁 [Claim Reward] Previous balance:', coinBalance);
        logger.debug('🎁 [Claim Reward] Expected new balance:', coinBalance + coinsEarned);
        logger.debug('🎁 [Claim Reward] Backend wallet balance:', backendWalletBalance);

        // Backend now handles wallet updates directly, so we use that balance if available
        if (backendWalletBalance !== undefined) {
          logger.debug('✅ [Claim Reward] Using wallet balance from backend:', backendWalletBalance);

          showAlert(
            'Reward Claimed! 🎉',
            `+${coinsEarned} coins added to your wallet!\nNew balance: ${backendWalletBalance} coins`,
            [{ text: 'Awesome!', style: 'default' }],
            'success'
          );
          await refreshWallet();
          logger.debug('✅ [Claim Reward] Wallet context refreshed');
        } else {
          // Fallback: Try syncing via coin sync service (for backwards compatibility)
          logger.debug('⚠️ [Claim Reward] Backend did not return wallet balance, trying coin sync service...');

          const syncResult = await coinSyncService.handleChallengeReward(
            challengeId,
            'Challenge',
            coinsEarned
          );
          logger.debug('💰 [Claim Reward] Sync result:', JSON.stringify(syncResult, null, 2));

          if (syncResult.success) {
            logger.debug('✅ [Claim Reward] Sync successful!');
            logger.debug('✅ [Claim Reward] New wallet balance from sync:', syncResult.newWalletBalance);

            showAlert(
              'Reward Claimed! 🎉',
              `+${coinsEarned} coins added to your wallet!\nNew balance: ${syncResult.newWalletBalance} coins`,
              [{ text: 'Awesome!', style: 'default' }],
              'success'
            );
            await refreshWallet();
          } else {
            logger.error('⚠️ [Claim Reward] Sync failed but claim succeeded');
            logger.error('⚠️ [Claim Reward] Sync error:', syncResult.error);

            showAlert(
              'Reward Claimed! 🎉',
              `+${coinsEarned} coins earned! Check your wallet for the updated balance.`,
              [{ text: 'Great!', style: 'default' }],
              'success'
            );
          }
        }

        // Wait a moment before reloading to ensure everything is synced
        logger.debug('⏳ [Claim Reward] Waiting 500ms before reload...');
        await new Promise(resolve => setTimeout(resolve, 500));

        logger.debug('🔄 [Claim Reward] Reloading challenges data...');
        await loadChallengesData();
        logger.debug('✅ [Claim Reward] Challenges reloaded. Final balance in state:', coinBalance);
        logger.debug('🎁 [Claim Reward] ========== CLAIM PROCESS COMPLETE ==========');
      } else {
        logger.error('❌ [Claim Reward] API returned success: false');
        showAlert('Error', 'Failed to claim reward. Please try again.', undefined, 'error');
      }
    } catch (error: any) {
      logger.error('❌ [Claim Reward] Error:', error);
      logger.error('❌ [Claim Reward] Error response:', error.response?.data);

      const errorMessage = error.response?.data?.message || error.response?.data?.error?.message || 'Failed to claim reward';

      // Special handling for "already claimed" error
      if (errorMessage.toLowerCase().includes('already claimed')) {
        showAlert(
          'Already Claimed! ✅',
          'You have already claimed this reward. The page will refresh to show the correct status.',
          [{ text: 'OK', onPress: () => loadChallengesData() }],
          'success'
        );
        // Force reload to get correct state
        await loadChallengesData();
      } else {
        showAlert(
          'Error',
          errorMessage,
          undefined,
          'error'
        );
      }
    } finally {
      if (!isMounted()) return;
      setClaimingId(null);
    }
  };

  const filteredChallenges = useMemo(() => {
    if (activeTab === 'completed') {
      return completedChallenges;
    }
    return challenges.filter((c) => c.challenge.type === activeTab);
  }, [activeTab, challenges, completedChallenges]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return ['#4ECDC4', '#44A08D'];
      case 'medium':
        return ['#F093FB', '#F5576C'];
      case 'hard':
        return ['#FA709A', '#FEE140'];
      default:
        return ['#667EEA', '#764BA2'];
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'daily':
        return 'calendar';
      case 'weekly':
        return 'calendar-outline';
      case 'monthly':
        return 'calendar-sharp';
      default:
        return 'star';
    }
  };

  const renderChallengeCard = (challenge: Challenge) => {
    const progress = (challenge.progress / challenge.target) * 100;
    const isCompleted = challenge.completed;
    const canClaim = isCompleted && !challenge.rewardsClaimed;
    const isClaimed = challenge.rewardsClaimed;
    const difficultyColors = getDifficultyColor(challenge.challenge.difficulty);

    return (
      <Pressable
        key={challenge._id}
        style={styles.challengeCard}
       
        onPress={() => {
          // Navigate to challenge detail page
          router.push(`/challenges/${challenge._id}` as any);
        }}
      >
        <LinearGradient
          colors={isClaimed ? [Colors.border.default, colors.neutral[300]] : difficultyColors}
          style={styles.challengeGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.challengeHeader}>
            <View style={styles.challengeIconContainer}>
              <Text style={styles.challengeIcon}>{challenge.challenge.icon}</Text>
            </View>

            <View style={styles.challengeInfo}>
              <View style={styles.challengeTitleRow}>
                <Text style={styles.challengeTitle}>{challenge.challenge.title}</Text>
                <View style={[styles.typeBadge, isClaimed && styles.typeBadgeClaimed]}>
                  <Ionicons
                    name={getTypeIcon(challenge.challenge.type) as any}
                    size={12}
                    color="white"
                  />
                  <Text style={styles.typeBadgeText}>
                    {challenge.challenge.type}
                  </Text>
                </View>
              </View>

              <Text style={styles.challengeDescription}>
                {challenge.challenge.description}
              </Text>

              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${progress}%` }]} />
                </View>
                <Text style={styles.progressText}>
                  {challenge.progress}/{challenge.target}
                </Text>
              </View>

              {/* Rewards */}
              <View style={styles.rewardRow}>
                <View style={styles.rewardInfo}>
                  <Ionicons name="star" size={16} color={colors.brand.goldBright} />
                  <Text style={styles.rewardText}>
                    {challenge.challenge.rewards.coins} coins
                  </Text>
                  {challenge.challenge.rewards.multiplier && (
                    <Text style={styles.multiplierText}>
                      {challenge.challenge.rewards.multiplier}x
                    </Text>
                  )}
                </View>

                <View style={styles.difficultyBadge}>
                  <Text style={styles.difficultyText}>
                    {challenge.challenge.difficulty}
                  </Text>
                </View>
              </View>

              {/* Status Indicator */}
              {challenge.progress === 0 && !isClaimed && (
                <View style={styles.statusIndicator}>
                  <Ionicons name="play-circle-outline" size={20} color={Colors.brand.purpleLight} />
                  <Text style={styles.statusText}>Tap to start</Text>
                </View>
              )}

              {canClaim && (
                <Pressable
                  style={styles.claimButton}
                  onPress={() => handleClaimReward(challenge._id)}
                  disabled={claimingId === challenge._id}
                >
                  <LinearGradient
                    colors={[colors.successScale[400], colors.successScale[700]]}
                    style={styles.claimGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    {claimingId === challenge._id ? (
                      <>
                        <ActivityIndicator size="small" color="white" />
                        <Text style={styles.claimButtonText}>Claiming...</Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.claimButtonText}>Claim Reward</Text>
                        <Ionicons name="gift" size={20} color="white" />
                      </>
                    )}
                  </LinearGradient>
                </Pressable>
              )}

              {isClaimed && (
                <View style={styles.claimedBadge}>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                  <Text style={styles.claimedText}>Completed</Text>
                </View>
              )}
            </View>
          </View>
        </LinearGradient>
      </Pressable>
    );
  };

  if (loading) {
    return <CardGridSkeleton />;
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <View style={styles.container}>
        {/* Modern Gradient Header */}
        <LinearGradient
          colors={[colors.brand.purpleLight, colors.brand.purple, colors.brand.purpleDeep]}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <Pressable
              style={styles.backButton}
              onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
             
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </Pressable>

            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Daily Challenges</Text>
              <Text style={styles.headerSubtitle}>Complete tasks, earn rewards!</Text>
            </View>

            <Pressable
              style={styles.coinsBadge}
              onPress={() => router.push('/wallet-screen' as any)}
             
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.15)']}
                style={styles.coinsBadgeGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="star" size={20} color={colors.brand.goldBright} />
                <Text style={styles.coinsText}>{coinBalance.toLocaleString()}</Text>
              </LinearGradient>
            </Pressable>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalCompleted}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.currentStreak}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{Math.round(stats.completionRate)}%</Text>
              <Text style={styles.statLabel}>Success Rate</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Tabs */}
        <View style={styles.tabs}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContent}
          >
            {(['daily', 'weekly', 'monthly', 'completed'] as TabType[]).map((tab) => (
              <Pressable
                key={tab}
                style={[styles.tab, activeTab === tab && styles.activeTab]}
                onPress={() => setActiveTab(tab)}
               
              >
                <LinearGradient
                  colors={
                    activeTab === tab
                      ? [colors.brand.purpleLight, colors.brand.purple]
                      : ['transparent', 'transparent']
                  }
                  style={styles.tabGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons
                    name={tab === 'completed' ? 'checkmark-circle' : (getTypeIcon(tab) as any)}
                    size={18}
                    color={activeTab === tab ? Colors.text.inverse : Colors.text.tertiary}
                  />
                  <Text
                    style={[styles.tabText, activeTab === tab && styles.activeTabText]}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                </LinearGradient>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Challenges List */}
        <FlatList
          data={filteredChallenges}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => renderChallengeCard(item)}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onEndReached={() => {
            if (!loadingMore && hasMore) {
              setLoadingMore(true);
              const nextPage = page + 1;
              setPage(nextPage);
              // Challenges are already all loaded in memory; pagination is client-side
              setLoadingMore(false);
            }
          }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={Colors.brand.purpleLight} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="trophy-outline" size={64} color={Colors.border.default} />
              <Text style={styles.emptyTitle}>No {activeTab} challenges</Text>
              <Text style={styles.emptyDescription}>
                {activeTab === 'completed'
                  ? 'Complete challenges to see them here'
                  : 'New challenges will appear soon!'}
              </Text>
              <Pressable
                style={styles.refreshButton}
                onPress={handleRefresh}
              >
                <LinearGradient
                  colors={[colors.brand.purpleLight, colors.brand.purple]}
                  style={styles.refreshGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="refresh" size={20} color="white" />
                  <Text style={styles.refreshButtonText}>Refresh</Text>
                </LinearGradient>
              </Pressable>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.brand.purpleLight}
            />
          }
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
  },
  loadingText: {
    marginTop: Spacing.md,
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  headerTitle: {
    ...Typography.h2,
    fontWeight: 'bold',
    color: Colors.text.inverse,
  },
  headerSubtitle: {
    ...Typography.body,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  coinsBadge: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  coinsBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 6,
  },
  coinsText: {
    ...Typography.bodyLarge,
    fontWeight: 'bold',
    color: Colors.text.inverse,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...Typography.h2,
    fontWeight: 'bold',
    color: Colors.text.inverse,
  },
  statLabel: {
    ...Typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: Spacing.xs,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  tabs: {
    backgroundColor: Colors.background.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  tabsContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  tab: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  tabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    gap: Spacing.sm,
  },
  activeTab: {
    shadowColor: Colors.brand.purpleLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  tabText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  activeTabText: {
    color: Colors.text.inverse,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  challengeCard: {
    marginBottom: Spacing.base,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  challengeGradient: {
    padding: Spacing.lg,
  },
  challengeHeader: {
    flexDirection: 'row',
  },
  challengeIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.base,
  },
  challengeIcon: {
    fontSize: 32,
  },
  challengeInfo: {
    flex: 1,
  },
  challengeTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  challengeTitle: {
    ...Typography.h4,
    fontWeight: 'bold',
    color: Colors.text.inverse,
    flex: 1,
    marginRight: Spacing.sm,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  typeBadgeClaimed: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  typeBadgeText: {
    ...Typography.caption,
    color: Colors.text.inverse,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  challengeDescription: {
    ...Typography.body,
    color: 'rgba(255, 255, 255, 0.95)',
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  progressBar: {
    flex: 1,
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.background.primary,
    borderRadius: 5,
  },
  progressText: {
    ...Typography.bodySmall,
    fontSize: 13,
    color: Colors.text.inverse,
    fontWeight: 'bold',
    marginLeft: Spacing.md,
    minWidth: 50,
  },
  rewardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  rewardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rewardText: {
    ...Typography.body,
    color: Colors.text.inverse,
    fontWeight: '600',
  },
  multiplierText: {
    ...Typography.bodySmall,
    color: colors.brand.goldBright,
    fontWeight: 'bold',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  difficultyBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  difficultyText: {
    ...Typography.caption,
    color: Colors.text.inverse,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderStyle: 'dashed',
  },
  statusText: {
    ...Typography.bodySmall,
    fontSize: 13,
    color: Colors.brand.purpleLight,
    fontWeight: '600',
  },
  claimButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginTop: Spacing.xs,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  claimGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  claimButtonText: {
    ...Typography.bodyLarge,
    fontWeight: 'bold',
    color: Colors.text.inverse,
  },
  claimedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingVertical: 10,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
    gap: Spacing.sm,
  },
  claimedText: {
    ...Typography.body,
    color: Colors.success,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    ...Typography.h3,
    fontWeight: 'bold',
    color: Colors.text.secondary,
    marginTop: Spacing.base,
  },
  emptyDescription: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  refreshButton: {
    marginTop: Spacing.xl,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    shadowColor: Colors.brand.purpleLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  refreshGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  refreshButtonText: {
    ...Typography.bodyLarge,
    fontWeight: 'bold',
    color: Colors.text.inverse,
  },
});

export default withErrorBoundary(ChallengesPage, 'ChallengesIndex');
