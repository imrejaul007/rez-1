// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Missions Screen - Improved UI
 * Uses DesignTokens for consistent styling
 * Tappable cards navigate to mission detail page
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Platform
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import CachedImage from '@/components/ui/CachedImage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { challengesApi, ChallengeProgress, Challenge } from '@/services/challengesApi';
import streakApi from '@/services/streakApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { platformAlert, platformAlertSimple } from '@/utils/platformAlert';
import { SkeletonBox } from '@/components/earn/SkeletonLoader';
import { BRAND } from '@/constants/brand';
import { borderRadius, colors, shadows, spacing, typography } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ReZ Coin image
const REZ_COIN_IMAGE = BRAND.COIN_IMAGE;

// Theme colors (extending DesignTokens for mission-specific colors)
const THEME = {
  purple500: colors.brand.purpleLight,
  purple600: colors.brand.purple,
  indigo500: colors.brand.indigo,
  indigo600: '#4F46E5',
  amber400: colors.warningScale[400],
  orange400: '#FB923C',
  orange600: colors.brand.orangeDark,
  emerald500: colors.successScale[400],
};

interface Mission {
  id: string;
  progressId: string;
  title: string;
  description: string;
  reward: { coins: number; cashback: number };
  progress: number;
  target: number;
  completed: boolean;
  claimed: boolean;
  difficulty: 'easy' | 'medium' | 'hard' | 'legendary';
  endsIn: string;
  endDate: string; // Raw endDate for timer calculations
  type: 'daily' | 'weekly' | 'monthly' | 'special';
  special?: boolean;
  icon?: string;
  userState: 'available' | 'joined' | 'in_progress' | 'completed' | 'claimed' | 'expired';
}

// Helper to map API challenge to local Mission format
const mapChallengeToMission = (cp: ChallengeProgress): Mission => {
  const challenge = cp.challenge;
  return {
    id: challenge._id,
    progressId: cp._id,
    title: challenge.title,
    description: challenge.description,
    reward: {
      coins: challenge.rewards.coins,
      cashback: 0,
    },
    progress: cp.progress,
    target: cp.target,
    completed: cp.completed,
    claimed: cp.rewardsClaimed,
    difficulty: challenge.difficulty as Mission['difficulty'],
    endsIn: challengesApi.getTimeRemaining(challenge.endDate),
    type: challenge.type,
    special: challenge.type === 'special' || challenge.type === 'monthly',
    icon: challenge.icon,
  };
};

const tabs = [
  { id: 'daily', label: 'Daily', icon: 'calendar' as const },
  { id: 'weekly', label: 'Weekly', icon: 'flag' as const },
  { id: 'special', label: 'Special', icon: 'trophy' as const },
];

const getDifficultyStyle = (difficulty: string) => {
  switch (difficulty) {
    case 'easy': return { bg: 'rgba(255, 205, 87, 0.15)', color: colors.primary[500], label: 'Easy' };
    case 'medium': return { bg: 'rgba(59, 130, 246, 0.15)', color: colors.infoScale[500], label: 'Medium' };
    case 'hard': return { bg: 'rgba(139, 92, 246, 0.15)', color: THEME.purple500, label: 'Hard' };
    case 'legendary': return { bg: 'rgba(245, 158, 11, 0.15)', color: colors.warningScale[500], label: 'Legendary' };
    default: return { bg: colors.neutral[200], color: colors.neutral[600], label: difficulty };
  }
};

// Animated Mission Card Component
const MissionCard: React.FC<{
  mission: Mission;
  onPress: () => void;
  onClaim: () => void;
  isClaiming: boolean;
  currencySymbol: string;
}> = ({ mission, onPress, onClaim, isClaiming, currencySymbol }) => {
  const scaleAnim = useSharedValue(1);
  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));
  const diffStyle = getDifficultyStyle(mission.difficulty);
  const progressPercent = Math.round((mission.progress / mission.target) * 100);
  const isClaimable = mission.completed && !mission.claimed;

  const handlePressIn = () => {
    scaleAnim.value = withSpring(0.98);
  };

  const handlePressOut = () => {
    scaleAnim.value = withSpring(1, { damping: 3, stiffness: 40 });
  };

  return (
    <Pressable
     
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[
          styles.missionCard,
          mission.completed && styles.missionCardCompleted,
          mission.special && styles.missionCardSpecial,
          scaleStyle,
        ]}
      >
        <View style={styles.missionRow}>
          <View style={[
            styles.missionIconBox,
            mission.completed && styles.missionIconBoxCompleted,
            mission.userState === 'available' && styles.missionIconBoxAvailable
          ]}>
            {mission.claimed ? (
              <Ionicons name="checkmark-done" size={24} color={colors.background.primary} />
            ) : mission.completed ? (
              <Ionicons name="checkmark-circle" size={24} color={colors.background.primary} />
            ) : mission.userState === 'in_progress' ? (
              <Ionicons name="play-circle" size={24} color={THEME.purple500} />
            ) : mission.userState === 'available' ? (
              <Ionicons name="add-circle-outline" size={24} color={THEME.indigo500} />
            ) : (
              <Ionicons name="flag" size={24} color={THEME.purple500} />
            )}
          </View>

          <View style={styles.missionContent}>
            <View style={styles.missionHeader}>
              <Text style={styles.missionTitle} numberOfLines={2}>{mission.title}</Text>
              <View style={[styles.difficultyBadge, { backgroundColor: diffStyle.bg }]}>
                <Text style={[styles.difficultyText, { color: diffStyle.color }]}>
                  {diffStyle.label}
                </Text>
              </View>
            </View>

            <Text style={styles.missionDesc} numberOfLines={2}>{mission.description}</Text>

            {/* Progress Bar */}
            {!mission.completed && (
              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>
                    {mission.progress}/{mission.target}
                  </Text>
                  <Text style={styles.progressPercent}>{progressPercent}%</Text>
                </View>
                <View style={styles.progressTrack}>
                  <LinearGradient
                    colors={[THEME.purple500, THEME.indigo500]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.progressFill, { width: `${Math.min(progressPercent, 100)}%` }]}
                  />
                </View>
              </View>
            )}

            {/* Rewards & Time */}
            <View style={styles.bottomRow}>
              <View style={styles.rewardsRow}>
                <View style={styles.rewardBadge}>
                  <CachedImage source={REZ_COIN_IMAGE} style={styles.coinIcon} />
                  <Text style={styles.rewardText}>+{mission.reward.coins}</Text>
                </View>
                {mission.reward.cashback > 0 && (
                  <View style={[styles.rewardBadge, styles.cashbackBadge]}>
                    <Ionicons name="flash" size={12} color={colors.successScale[500]} />
                    <Text style={[styles.rewardText, { color: colors.successScale[600] }]}>
                      {currencySymbol}{mission.reward.cashback}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.timeContainer}>
                {/* Urgency badge for challenges ending within 2 hours */}
                {mission.endDate && (() => {
                  const msLeft = new Date(mission.endDate).getTime() - (Date.now() - serverTimeOffsetRef.current);
                  if (msLeft > 0 && msLeft < 2 * 60 * 60 * 1000) {
                    return (
                      <View style={styles.urgencyBadge}>
                        <Ionicons name="flame" size={10} color={colors.error} />
                        <Text style={styles.urgencyText}>Ending Soon!</Text>
                      </View>
                    );
                  }
                  return (
                    <>
                      <Ionicons name="time-outline" size={12} color={colors.neutral[500]} />
                      <Text style={styles.endsIn}>{mission.endsIn}</Text>
                    </>
                  );
                })()}
              </View>
            </View>
          </View>

          {/* Arrow indicator */}
          <View style={styles.arrowContainer}>
            <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
          </View>
        </View>

        {/* Claim Button */}
        {isClaimable && (
          <Pressable
           
            style={styles.claimButtonWrapper}
            onPress={(e) => {
              e.stopPropagation();
              onClaim();
            }}
            disabled={isClaiming}
          >
            <LinearGradient
              colors={[colors.primary[500], colors.successScale[500]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.claimButton}
            >
              {isClaiming ? (
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

        {/* Claimed Badge */}
        {mission.claimed && (
          <View style={styles.claimedBadge}>
            <Ionicons name="checkmark-circle" size={16} color={colors.successScale[500]} />
            <Text style={styles.claimedText}>Rewards Claimed</Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
};

const MissionsScreen: React.FC = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [activeTab, setActiveTab] = useState('daily');

  // API state
  const [allMissions, setAllMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [stats, setStats] = useState({
    completed: 0,
    coinsEarned: 0,
    active: 0,
  });

  // Server time offset for accurate timer sync
  const serverTimeOffsetRef = useRef(0);

  // Fetch missions from unified API endpoint (single source of truth)
  const fetchMissions = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setError(null);

      const [unifiedResponse, streakResponse] = await Promise.all([
        challengesApi.getUnifiedChallenges({ visibility: 'missions' }),
        streakApi.getStreakStatus('login'),
      ]);

      if (unifiedResponse.success && unifiedResponse.data) {
        const { challenges: unifiedChallenges, stats: challengeStats, serverTime } = unifiedResponse.data;

        // Calculate server time offset for accurate timers
        serverTimeOffsetRef.current = Date.now() - new Date(serverTime).getTime();

        // Map unified challenges to Mission format
        const mapped: Mission[] = unifiedChallenges.map((item: any) => {
          const c = item.challenge;
          return {
            id: c._id,
            progressId: item.progressId || '',
            title: c.title,
            description: c.description,
            reward: { coins: c.rewards?.coins || 0, cashback: 0 },
            progress: item.progress || 0,
            target: item.target || c.requirements?.target || 1,
            completed: item.userState === 'completed' || item.userState === 'claimed',
            claimed: item.rewardsClaimed || item.userState === 'claimed',
            difficulty: (c.difficulty || 'easy') as Mission['difficulty'],
            endsIn: challengesApi.getTimeRemaining(c.endDate),
            endDate: c.endDate,
            type: c.type,
            special: c.type === 'special' || c.type === 'monthly',
            icon: c.icon,
            userState: item.userState,
          };
        });

        if (!isMounted()) return;
        setAllMissions(mapped);

        if (!isMounted()) return;
        setStats({
          completed: challengeStats.totalCompleted || 0,
          coinsEarned: challengeStats.totalCoinsEarned || 0,
          active: challengeStats.activeChallenges || mapped.filter(m => !m.completed && !m.claimed).length,
        });
      } else {
        if (!isMounted()) return;
        setError(unifiedResponse.error || 'Failed to load missions');
      }

      if (streakResponse.success && streakResponse.data) {
        if (!isMounted()) return;
        setStreak(streakResponse.data.current);
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Failed to load missions');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMissions();
  }, [fetchMissions]);

  // Refresh data when navigating back to this screen
  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      fetchMissions(true);
    }, [fetchMissions])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMissions(true);
  }, [fetchMissions]);

  const handleClaimReward = async (progressId: string) => {
    setClaiming(progressId);
    try {
      const response = await challengesApi.claimReward(progressId);
      if (!isMounted()) return;
      if (response.success && response.data) {
        if (!isMounted()) return;
        setAllMissions(prev =>
          prev.map(m =>
            m.progressId === progressId ? { ...m, claimed: true } : m
          )
        );
        if (!isMounted()) return;
        setStats(prev => ({
          ...prev,
          coinsEarned: prev.coinsEarned + (response.data?.coinsEarned || 0),
        }));
        platformAlert(
          'Rewards Claimed!',
          `+${response.data.coinsEarned} coins added to your wallet!`,
          [{ text: 'Awesome!' }]
        );
      } else {
        platformAlertSimple('Error', response.error || 'Failed to claim rewards');
      }
    } catch (err: any) {
      platformAlertSimple('Error', err.message || 'Failed to claim rewards');
    } finally {
      if (!isMounted()) return;
      setClaiming(null);
    }
  };

  const handleMissionPress = (mission: Mission) => {
    // Special handling for Daily Check-In mission
    if (mission.title.toLowerCase().includes('daily check-in') ||
        mission.title.toLowerCase().includes('check in') ||
        mission.title.toLowerCase() === 'daily check-in') {
      router.push('/explore/daily-checkin');
      return;
    }

    // Default: go to mission detail page
    router.push({
      pathname: '/mission-detail',
      params: {
        id: mission.id,
        progressId: mission.progressId,
      },
    });
  };

  // Filter missions by type
  const dailyMissions = useMemo(() => allMissions.filter(m => m.type === 'daily'), [allMissions]);
  const weeklyMissions = useMemo(() => allMissions.filter(m => m.type === 'weekly'), [allMissions]);
  const specialMissions = useMemo(() => allMissions.filter(m => m.type === 'special' || m.type === 'monthly'), [allMissions]);

  const getMissions = () => {
    switch (activeTab) {
      case 'daily': return dailyMissions;
      case 'weekly': return weeklyMissions;
      case 'special': return specialMissions;
      default: return dailyMissions;
    }
  };

  const missions = getMissions();

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <LinearGradient
          colors={[THEME.purple600, THEME.indigo600]}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <Pressable
              style={styles.backButton}
              onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
             
            >
              <Ionicons name="arrow-back" size={20} color={colors.background.primary} />
            </Pressable>
            <View style={styles.headerContent}>
              <View style={styles.headerTitleRow}>
                <Ionicons name="flag" size={22} color={THEME.amber400} />
                <Text style={styles.headerTitle}>Missions</Text>
              </View>
              <Text style={styles.headerSubtitle}>Complete tasks, earn rewards</Text>
            </View>
            {streak > 0 ? (
              <View style={styles.streakBadge}>
                <Ionicons name="flame" size={14} color={THEME.orange400} />
                <Text style={styles.streakText}>{streak} day{streak > 1 ? 's' : ''}</Text>
              </View>
            ) : (
              <Pressable
                style={styles.streakBadge}
                onPress={() => router.push('/explore/daily-checkin')}
               
              >
                <Ionicons name="flame-outline" size={14} color={colors.background.primary} />
                <Text style={styles.streakText}>Check in</Text>
              </Pressable>
            )}
          </View>

          {/* Tabs */}
          <View style={styles.tabsRow}>
            {tabs.map(tab => {
              const isActive = activeTab === tab.id;
              const count = tab.id === 'daily' ? dailyMissions.length
                          : tab.id === 'weekly' ? weeklyMissions.length
                          : specialMissions.length;

              return (
                <Pressable
                  key={tab.id}
                  style={[styles.tab, isActive && styles.tabActive]}
                  onPress={() => setActiveTab(tab.id)}
                 
                >
                  <Ionicons
                    name={tab.icon}
                    size={16}
                    color={isActive ? THEME.purple600 : colors.background.primary}
                  />
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                    {tab.label}
                  </Text>
                  {count > 0 && (
                    <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                      <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>
                        {count}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
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
          {/* Loading Skeleton */}
          {loading && (
            <View style={styles.loadingContainer}>
              {/* Stats skeleton */}
              <View style={styles.statsRow}>
                {[1, 2, 3].map(i => (
                  <View key={i} style={[styles.statCard, { alignItems: 'center', padding: spacing.md }]}>
                    <SkeletonBox width={36} height={36} borderRadius={18} />
                    <SkeletonBox width={30} height={20} borderRadius={4} style={{ marginTop: 8 }} />
                    <SkeletonBox width={60} height={12} borderRadius={4} style={{ marginTop: 4 }} />
                  </View>
                ))}
              </View>
              {/* Mission card skeletons */}
              <View style={{ paddingHorizontal: spacing.md }}>
                <SkeletonBox width={140} height={16} borderRadius={4} style={{ marginBottom: spacing.sm }} />
                {[1, 2, 3, 4].map(i => (
                  <View key={i} style={[styles.missionCard, { flexDirection: 'row', gap: spacing.sm }]}>
                    <SkeletonBox width={48} height={48} borderRadius={8} />
                    <View style={{ flex: 1 }}>
                      <SkeletonBox width="70%" height={16} borderRadius={4} />
                      <SkeletonBox width="90%" height={12} borderRadius={4} style={{ marginTop: 6 }} />
                      <SkeletonBox width="50%" height={6} borderRadius={3} style={{ marginTop: 10 }} />
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                        <SkeletonBox width={60} height={20} borderRadius={4} />
                        <SkeletonBox width={50} height={14} borderRadius={4} />
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Error State */}
          {!loading && error && (
            <View style={styles.errorContainer}>
              <View style={styles.errorIconContainer}>
                <Ionicons name="cloud-offline-outline" size={48} color={colors.neutral[400]} />
              </View>
              <Text style={styles.errorTitle}>Unable to load missions</Text>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable
                onPress={() => fetchMissions()}
                style={styles.retryButton}
              >
                <Text style={styles.retryText}>Try Again</Text>
              </Pressable>
            </View>
          )}

          {/* Stats */}
          {!loading && !error && (
            <View style={styles.statsRow}>
              <View style={[styles.statCard, styles.statCardGreen]}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="trophy" size={20} color={colors.successScale[500]} />
                </View>
                <Text style={[styles.statValue, { color: colors.successScale[600] }]}>
                  {stats.completed}
                </Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
              <View style={[styles.statCard, styles.statCardGold]}>
                <View style={styles.statIconContainer}>
                  <CachedImage source={REZ_COIN_IMAGE} style={styles.statCoinIcon} />
                </View>
                <Text style={[styles.statValue, { color: colors.secondary[700] }]}>
                  {formatNumber(stats.coinsEarned)}
                </Text>
                <Text style={styles.statLabel}>Coins Earned</Text>
              </View>
              <View style={[styles.statCard, styles.statCardBlue]}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="flash" size={20} color={colors.infoScale[500]} />
                </View>
                <Text style={[styles.statValue, { color: colors.infoScale[700] }]}>
                  {stats.active}
                </Text>
                <Text style={styles.statLabel}>Active</Text>
              </View>
            </View>
          )}

          {/* Missions List */}
          {!loading && !error && (
            <View style={styles.missionsList}>
              {/* Section Header */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {activeTab === 'daily' ? 'Daily Challenges'
                   : activeTab === 'weekly' ? 'Weekly Challenges'
                   : 'Special Challenges'}
                </Text>
                <Text style={styles.sectionCount}>{missions.length} available</Text>
              </View>

              {/* Empty State */}
              {missions.length === 0 && (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconContainer}>
                    <Ionicons name="flag-outline" size={48} color={colors.neutral[300]} />
                  </View>
                  <Text style={styles.emptyTitle}>No {activeTab} missions available</Text>
                  <Text style={styles.emptyText}>
                    New missions appear regularly. Pull down to refresh or check other tabs!
                  </Text>
                  <Pressable
                    style={styles.emptyButton}
                    onPress={handleRefresh}
                   
                  >
                    <Ionicons name="refresh" size={16} color={THEME.purple600} />
                    <Text style={styles.emptyButtonText}>Refresh</Text>
                  </Pressable>
                </View>
              )}

              {/* Mission Cards */}
              {missions.map(mission => (
                <MissionCard
                  key={mission.id}
                  mission={mission}
                  onPress={() => handleMissionPress(mission)}
                  onClaim={() => handleClaimReward(mission.progressId)}
                  isClaiming={claiming === mission.progressId}
                  currencySymbol={currencySymbol}
                />
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
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: '700',
    color: colors.background.primary,
  },
  headerSubtitle: {
    fontSize: typography.caption.fontSize,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  streakText: {
    fontSize: typography.bodySmall.fontSize,
    fontWeight: '700',
    color: colors.background.primary,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  tabActive: {
    backgroundColor: colors.background.primary,
  },
  tabText: {
    fontSize: typography.bodySmall.fontSize,
    fontWeight: '600',
    color: colors.background.primary,
  },
  tabTextActive: {
    color: THEME.purple600,
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeActive: {
    backgroundColor: THEME.purple600,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.background.primary,
  },
  tabBadgeTextActive: {
    color: colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.md,
    paddingBottom: 120,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    ...Platform.select({
      ios: shadows.sm,
      android: { elevation: 2 },
    }),
  },
  statCardGreen: {
    backgroundColor: 'rgba(255, 205, 87, 0.1)',
  },
  statCardGold: {
    backgroundColor: 'rgba(255, 200, 87, 0.15)',
  },
  statCardBlue: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statValue: {
    fontSize: typography.h4.fontSize,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: typography.caption.fontSize,
    color: colors.text.secondary,
    marginTop: 2,
  },
  missionsList: {
    paddingHorizontal: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
  },
  sectionCount: {
    fontSize: typography.caption.fontSize,
    color: colors.text.tertiary,
  },
  missionCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.primary,
    marginBottom: spacing.sm,
    ...Platform.select({
      ios: shadows.md,
      android: { elevation: 4 },
    }),
  },
  missionCardCompleted: {
    backgroundColor: 'rgba(255, 205, 87, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.2)',
  },
  missionCardSpecial: {
    backgroundColor: 'rgba(255, 200, 87, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 200, 87, 0.3)',
  },
  missionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  missionIconBox: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  missionIconBoxCompleted: {
    backgroundColor: colors.successScale[500],
  },
  missionIconBoxAvailable: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.error,
  },
  missionContent: {
    flex: 1,
  },
  missionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  missionTitle: {
    fontSize: typography.bodySmall.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
    marginRight: spacing.sm,
  },
  difficultyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  missionDesc: {
    fontSize: typography.caption.fontSize,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  progressSection: {
    marginBottom: spacing.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: typography.caption.fontSize,
    color: colors.text.secondary,
  },
  progressPercent: {
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
    color: THEME.purple600,
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.neutral[200],
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewardsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 200, 87, 0.2)',
  },
  cashbackBadge: {
    backgroundColor: 'rgba(255, 205, 87, 0.15)',
  },
  rewardText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondary[700],
  },
  coinIcon: {
    width: 14,
    height: 14,
    resizeMode: 'contain',
  },
  claimCoinIcon: {
    width: 18,
    height: 18,
    resizeMode: 'contain',
  },
  statCoinIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  endsIn: {
    fontSize: 11,
    color: colors.text.tertiary,
  },
  arrowContainer: {
    justifyContent: 'center',
    paddingLeft: spacing.xs,
  },
  claimButtonWrapper: {
    marginTop: spacing.sm,
  },
  claimButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  claimButtonText: {
    fontSize: typography.bodySmall.fontSize,
    fontWeight: '700',
    color: colors.background.primary,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: typography.bodySmall.fontSize,
    color: colors.text.secondary,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: spacing.lg,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  errorTitle: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: spacing.lg,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: typography.bodySmall.fontSize,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.purple600,
  },
  emptyButtonText: {
    fontSize: typography.bodySmall.fontSize,
    fontWeight: '600',
    color: THEME.purple600,
  },
  claimedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(255, 205, 87, 0.1)',
    borderRadius: borderRadius.sm,
  },
  claimedText: {
    fontSize: typography.bodySmall.fontSize,
    fontWeight: '600',
    color: colors.successScale[500],
  },
});

export default withErrorBoundary(MissionsScreen, 'Missions');
