// @ts-nocheck
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useStreaksGamification } from '@/hooks/useStreaksGamification';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import { Mission } from '@/types/streaksGamification.types';
import { colors } from '@/constants/theme';
import { platformAlertConfirm, platformAlertSimple } from '@/utils/platformAlert';
import apiClient from '@/services/apiClient';

interface StreakTier {
  name: string;
  level: number;
  icon: string;
  color: string;
  nextTierDays: number | null;
  daysToNext: number;
  description: string;
}

function getStreakTier(currentStreak: number): StreakTier {
  if (currentStreak >= 60) return { name: 'Smart Saver Elite', level: 4, icon: '💎', color: '#60a5fa', nextTierDays: null, daysToNext: 0, description: 'Top 1% of savers on REZ' };
  if (currentStreak >= 21) return { name: 'Gold Saver', level: 3, icon: '🥇', color: '#F59E0B', nextTierDays: 60, daysToNext: 60 - currentStreak, description: `${60 - currentStreak} more days to Elite` };
  if (currentStreak >= 7) return { name: 'Silver Saver', level: 2, icon: '🥈', color: '#94a3b8', nextTierDays: 21, daysToNext: 21 - currentStreak, description: `${21 - currentStreak} more days to Gold` };
  if (currentStreak >= 1) return { name: 'Bronze Saver', level: 1, icon: '🥉', color: '#cd7f32', nextTierDays: 7, daysToNext: 7 - currentStreak, description: `${7 - currentStreak} more days to Silver` };
  return { name: 'Start Saving', level: 0, icon: '🔥', color: '#ef4444', nextTierDays: 1, daysToNext: 1, description: 'Make your first saving today' };
}

interface StreaksGamificationProps {
  onViewAllPress?: () => void;
}

const StreaksGamification: React.FC<StreaksGamificationProps> = ({
  onViewAllPress,
}) => {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const isAuthLoading = useAuthLoading();

  // Fetch real data from gamification API (only if authenticated)
  const { streak, missions, loading, error, campusRank } = useStreaksGamification();

  const streakPercentage = streak.target > 0 ? (streak.current / streak.target) * 100 : 0;
  const daysRemaining = Math.max(0, streak.target - streak.current);

  const handleViewAll = () => {
    if (onViewAllPress) {
      onViewAllPress();
    } else {
      router.push('/missions');
    }
  };

  // Auth loading state
  if (isAuthLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['rgba(255, 205, 87, 0.2)', 'rgba(232, 184, 150, 0.1)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.lightMustard} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // Not authenticated - show login prompt
  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['rgba(255, 205, 87, 0.2)', 'rgba(232, 184, 150, 0.1)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          <View style={styles.loginPromptContainer}>
            <View style={styles.loginIconContainer}>
              <Ionicons name="flame" size={32} color={colors.lightMustard} />
            </View>
            <View style={styles.loginPromptContent}>
              <Text style={styles.loginPromptTitle}>Track Your Saving Streaks</Text>
              <Text style={styles.loginPromptSubtitle}>
                Login to earn bonus coins and complete weekly missions
              </Text>
              <Pressable
                style={styles.loginButton}
                onPress={() => router.push('/sign-in' as any)}
               
              >
                <Text style={styles.loginButtonText}>Login to Start</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.background.primary} />
              </Pressable>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // Loading state - show skeleton
  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['rgba(255, 205, 87, 0.2)', 'rgba(232, 184, 150, 0.1)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.lightMustard} />
            <Text style={styles.loadingText}>Loading your progress...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // Error state - hide section if no data
  if (error && missions.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(255, 205, 87, 0.2)', 'rgba(232, 184, 150, 0.1)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        {/* Streak Section */}
        <View style={styles.streakSection}>
          <View style={styles.streakIconContainer}>
            <View style={styles.streakIconBackground}>
              <Ionicons name="flame" size={32} color={colors.lightMustard} />
            </View>
            <View style={styles.streakBadge}>
              <Text style={styles.streakBadgeText}>{streak.current}</Text>
            </View>
          </View>
          <View style={styles.streakContent}>
            {/* Tier badge */}
            {(() => {
              const tier = getStreakTier(streak.current);
              return (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Text style={{ fontSize: 18 }}>{tier.icon}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: tier.color }}>
                    {tier.name}
                  </Text>
                  {tier.level > 0 && (
                    <View style={{ backgroundColor: tier.color + '22', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 10, color: tier.color, fontWeight: '700' }}>
                        Level {tier.level}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })()}

            <Text style={styles.streakTitle}>
              {streak.current}-day saving streak!
            </Text>
            <Text style={styles.streakSubtitle}>
              {daysRemaining} more days to unlock +{streak.nextReward} bonus coins
            </Text>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBackground}>
                <LinearGradient
                  colors={[colors.lightMustard, colors.brand.sand]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progressBarFill, { width: `${streakPercentage}%` }]}
                />
              </View>
            </View>

            {/* Tier progress */}
            <Text style={{ fontSize: 11, color: colors.neutral?.[500] ?? '#888', marginTop: 4 }}>
              {getStreakTier(streak.current).description}
            </Text>

            {/* Freeze button */}
            {streak.current >= 3 && (
              <Pressable
                onPress={() => {
                  platformAlertConfirm(
                    'Protect Your Savings Streak',
                    `Spend 50 REZ coins to protect your ${streak.current}-day streak for 1 day?\n\nIf you miss saving tomorrow, your streak won't reset.`,
                    async () => {
                      try {
                        const res = await apiClient.post('/streak/freeze', { type: 'savings', days: 1 });
                        if ((res as any).success) {
                          platformAlertSimple('Streak Protected!', 'Your savings streak is safe for 1 day.');
                        }
                      } catch {
                        platformAlertSimple('Error', 'Could not protect streak. Please try again.');
                      }
                    },
                    'Protect (50 coins)'
                  );
                }}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8,
                  alignSelf: 'flex-start', backgroundColor: 'rgba(96, 165, 250, 0.15)',
                  borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
                }}
              >
                <Ionicons name="snow-outline" size={13} color="#60a5fa" />
                <Text style={{ fontSize: 12, color: '#60a5fa', fontWeight: '600' }}>
                  Protect streak (50 coins)
                </Text>
              </Pressable>
            )}

            {/* Campus rank */}
            {campusRank !== null && (
              <Pressable
                onPress={() => router.push('/leaderboard' as any)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6,
                  backgroundColor: 'rgba(245, 158, 11, 0.15)', borderRadius: 8,
                  paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start',
                }}
              >
                <Ionicons name="trophy" size={13} color="#F59E0B" />
                <Text style={{ fontSize: 12, color: '#F59E0B', fontWeight: '700' }}>
                  {campusRank <= 3
                    ? `#${campusRank} Saver on your campus!`
                    : campusRank <= 10
                      ? `#${campusRank} Saver on campus`
                      : `#${campusRank} on campus`}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Weekly Missions Header */}
        <View style={styles.missionsHeader}>
          <View style={styles.missionsHeaderLeft}>
            <Ionicons name="ellipse-outline" size={16} color={colors.nileBlue} />
            <Text style={styles.missionsTitle}>Weekly Missions</Text>
          </View>
          <Pressable
            onPress={handleViewAll}
           
            style={styles.viewAllButton}
          >
            <Text style={styles.viewAllText}>View all</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.lightMustard} />
          </Pressable>
        </View>

        {/* Missions List */}
        <View style={styles.missionsList}>
          {missions.map((mission) => {
            const progressPercent = (mission.progress / mission.target) * 100;
            return (
              <View
                key={mission.id}
                style={[
                  styles.missionCard,
                  mission.completed && styles.missionCardCompleted,
                ]}
              >
                <View style={styles.missionContent}>
                  <View
                    style={[
                      styles.missionIconContainer,
                      mission.completed && styles.missionIconContainerCompleted,
                    ]}
                  >
                    {mission.completed ? (
                      <Ionicons name="checkmark" size={16} color={colors.nileBlue} />
                    ) : (
                      <Ionicons
                        name={mission.icon}
                        size={16}
                        color={mission.completed ? colors.nileBlue : colors.neutral[500]}
                      />
                    )}
                  </View>
                  <View style={styles.missionDetails}>
                    <View style={styles.missionHeaderRow}>
                      <Text
                        style={[
                          styles.missionTitle,
                          mission.completed && styles.missionTitleCompleted,
                        ]}
                      >
                        {mission.title}
                      </Text>
                      <View style={styles.rewardContainer}>
                        <Ionicons name="gift-outline" size={12} color={colors.warningScale[400]} />
                        <Text style={styles.rewardText}>+{mission.reward}</Text>
                      </View>
                    </View>
                    {!mission.completed && (
                      <View style={styles.missionProgressRow}>
                        <View style={styles.missionProgressBarContainer}>
                          <View style={styles.missionProgressBarBackground}>
                            <View
                              style={[
                                styles.missionProgressBarFill,
                                { width: `${progressPercent}%` },
                              ]}
                            />
                          </View>
                        </View>
                        <Text style={styles.missionProgressText}>
                          {mission.progress}/{mission.target}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 6,
    paddingVertical: 12,
  },
  cardGradient: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.2)',
    ...Platform.select({
      ios: {
        shadowColor: colors.lightMustard,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  streakSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  streakIconContainer: {
    marginRight: 16,
    alignItems: 'center',
  },
  streakIconBackground: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 205, 87, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakBadge: {
    marginTop: -8,
    backgroundColor: colors.lightMustard,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.background.primary,
  },
  streakContent: {
    flex: 1,
  },
  streakTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.nileBlue,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  streakSubtitle: {
    fontSize: 12,
    color: colors.neutral[500],
    marginBottom: 8,
  },
  progressBarContainer: {
    marginTop: 8,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  missionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  missionsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  missionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.nileBlue,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.lightMustard,
  },
  missionsList: {
    gap: 8,
  },
  missionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    padding: 12,
  },
  missionCardCompleted: {
    backgroundColor: 'rgba(26, 58, 82, 0.1)',
  },
  missionContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  missionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  missionIconContainerCompleted: {
    backgroundColor: 'rgba(26, 58, 82, 0.2)',
  },
  missionDetails: {
    flex: 1,
  },
  missionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  missionTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.nileBlue,
    flex: 1,
  },
  missionTitleCompleted: {
    color: colors.nileBlue,
    textDecorationLine: 'line-through',
  },
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rewardText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.warningScale[400],
  },
  missionProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  missionProgressBarContainer: {
    flex: 1,
  },
  missionProgressBarBackground: {
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  missionProgressBarFill: {
    height: '100%',
    backgroundColor: colors.nileBlue,
    borderRadius: 2,
  },
  missionProgressText: {
    fontSize: 10,
    color: colors.neutral[500],
    fontWeight: '500',
    minWidth: 30,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.neutral[500],
    fontWeight: '500',
  },
  loginPromptContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  loginIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 205, 87, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginPromptContent: {
    flex: 1,
  },
  loginPromptTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.nileBlue,
    marginBottom: 4,
  },
  loginPromptSubtitle: {
    fontSize: 13,
    color: colors.neutral[500],
    marginBottom: 12,
    lineHeight: 18,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lightMustard,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 8,
  },
  loginButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background.primary,
  },
});

export default React.memo(StreaksGamification);

