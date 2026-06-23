// @ts-nocheck
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthUser, useIsAuthenticated } from '@/stores/selectors';
import gamificationApi, { PlayAndEarnData } from '@/services/gamificationApi';

// Import card components
import DailySpinCard from './cards/DailySpinCard';
import ChallengesCard from './cards/ChallengesCard';
import StreakRewardsCard from './cards/StreakRewardsCard';
import SurpriseCoinDropCard from './cards/SurpriseCoinDropCard';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2; // 2 cards per row with padding

// Nuqta Brand Colors
const COLORS = {
  primary: colors.lightMustard,
  primaryDark: colors.brand.goldRich,
  primaryLight: colors.lightMustard,
  gold: colors.brand.goldWarm,
  goldDark: '#F5A623',
  goldLight: '#FFD87A',
  white: colors.background.primary,
  textDark: colors.nileBlue,
  textMuted: colors.neutral[500],
  cardShadow: 'rgba(0, 0, 0, 0.1)',
  background: colors.neutral[50],
};

const PlayAndEarnSection: React.FC = () => {
  const router = useRouter();
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const [data, setData] = useState<PlayAndEarnData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useIsMounted();

  const fetchPlayAndEarnData = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await gamificationApi.getPlayAndEarnData();
      if (response.success) {
        if (!isMounted()) return;
        setData(response.data);
      }
    } catch (err) {
      if (!isMounted()) return;
      setError('Failed to load');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchPlayAndEarnData();
  }, [fetchPlayAndEarnData]);

  const handleSpinPress = () => {
    router.push('/games/spin-wheel');
  };

  const handleChallengesPress = () => {
    router.push('/challenges');
  };

  const handleStreakPress = async () => {
    // Check in for streak if not already done
    if (data && !data.streak?.todayCheckedIn) {
      try {
        await gamificationApi.streakCheckin();
        fetchPlayAndEarnData(); // Refresh data
      } catch (err) {
        // silently handle
      }
    }
    router.push('/gamification');
  };

  const handleSurpriseDropPress = async () => {
    if (data?.surpriseDrop?.available && data?.surpriseDrop?.id) {
      try {
        await gamificationApi.claimSurpriseDrop(data.surpriseDrop.id);
        fetchPlayAndEarnData(); // Refresh data
      } catch (err) {
        // silently handle
      }
    }
  };

  const handleViewAll = () => {
    router.push('/gamification');
  };

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  if (error || !data) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.headerContainer}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconContainer}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={styles.headerIconGradient}
            >
              <Ionicons name="game-controller" size={18} color={COLORS.white} />
            </LinearGradient>
          </View>
          <View>
            <Text style={styles.headerTitle}>Play & Earn More</Text>
            <Text style={styles.headerSubtitle}>Daily rewards & challenges</Text>
          </View>
        </View>
        <Pressable style={styles.viewAllButton} onPress={handleViewAll}>
          <Text style={styles.viewAllText}>View All</Text>
          <Ionicons name="arrow-forward" size={14} color={COLORS.primary} />
        </Pressable>
      </View>

      {/* Cards Grid */}
      <View style={styles.cardsGrid}>
        <View style={styles.cardRow}>
          <DailySpinCard
            spinsRemaining={data.dailySpin?.spinsRemaining ?? 0}
            maxSpins={data.dailySpin?.maxSpins ?? 3}
            canSpin={data.dailySpin?.canSpin ?? false}
            onPress={handleSpinPress}
          />
          <ChallengesCard
            totalActive={data.challenges?.totalActive ?? 0}
            completedToday={data.challenges?.completedToday ?? 0}
            topChallenge={data.challenges?.active?.[0]}
            onPress={handleChallengesPress}
          />
        </View>
        <View style={styles.cardRow}>
          <StreakRewardsCard
            currentStreak={data.streak?.currentStreak ?? 0}
            nextMilestone={data.streak?.nextMilestone ?? { day: 1, coins: 5 }}
            todayCheckedIn={data.streak?.todayCheckedIn ?? false}
            onPress={handleStreakPress}
          />
          <SurpriseCoinDropCard
            available={data.surpriseDrop?.available ?? false}
            coins={data.surpriseDrop?.coins ?? 0}
            message={data.surpriseDrop?.message ?? null}
            onPress={handleSurpriseDropPress}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 12,
  },
  headerIconContainer: {
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  headerIconGradient: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.2)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '400',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 205, 87, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.15)',
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  cardsGrid: {
    gap: 12,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
  },
});

export default React.memo(PlayAndEarnSection);
