import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import SpinWheelGame from '@/components/gamification/SpinWheelGame';
import SpinHistory from '@/components/gamification/SpinHistory';
import CelebrationModal from '@/components/gamification/CelebrationModal';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useGamification } from '@/contexts/GamificationContext';
import gamificationAPI from '@/services/gamificationApi';
import { platformAlert } from '@/utils/platformAlert';
import type { SpinWheelSegment, SpinWheelResult } from '@/types/gamification.types';
import { GamePageSkeleton } from '@/components/skeletons';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

function SpinWheelPage() {
  const isMounted = useIsMounted();
  const [loading, setLoading] = useState(true);
  const [segments, setSegments] = useState<SpinWheelSegment[]>([]);
  const [spinsRemaining, setSpinsRemaining] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [lastResult, setLastResult] = useState<SpinWheelResult | null>(null);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [newBalance, setNewBalance] = useState(0);
  const [tournamentUpdate, setTournamentUpdate] = useState<{ tournamentName: string; pointsAdded: number; newRank: number } | null>(null);

  const { state: gamificationState, actions: gamificationActions } = useGamification();

  useEffect(() => {
    // ✅ FIX: Load gamification data on mount to ensure coins are synced
    gamificationActions.loadGamificationData(true);
    loadSpinWheelData();
  }, []);

  const loadSpinWheelData = async () => {
    try {
      setLoading(true);
      const response = await gamificationAPI.getSpinWheelData();

      if (response.success && response.data) {
        if (!isMounted()) return;
        setSegments(response.data.segments || getDefaultSegments());
        // ✅ FIX: Check for undefined/null, not falsy (0 is valid!)
        if (!isMounted()) return;
        setSpinsRemaining(response.data.spinsRemaining !== undefined ? response.data.spinsRemaining : 3);
      } else {
        // Fallback to default segments
        if (!isMounted()) return;
        setSegments(getDefaultSegments());
        if (!isMounted()) return;
        setSpinsRemaining(3);
      }
    } catch (error: any) {
      platformAlert('Error', 'Failed to load spin wheel data. Using default configuration.');
      // Use default segments on error
      if (!isMounted()) return;
      setSegments(getDefaultSegments());
      if (!isMounted()) return;
      setSpinsRemaining(3);
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  // NOTE: These default segments are a client-side fallback only used when the API
  // (/api/gamification/spin-wheel/data) fails or returns no segments. They should be
  // kept in reasonable sync with the server-side SpinWheel configuration. The actual
  // prize values and probabilities are always determined server-side during the spin.
  const getDefaultSegments = (): SpinWheelSegment[] => {
    return [
      {
        id: '1',
        label: '10 Coins',
        value: 10,
        color: '#FF6B6B',
        type: 'coins',
        icon: 'star',
      },
      {
        id: '2',
        label: '5 Coins',
        value: 5,
        color: '#4ECDC4',
        type: 'coins',
        icon: 'star',
      },
      {
        id: '3',
        label: '25 Coins',
        value: 25,
        color: '#FFD93D',
        type: 'coins',
        icon: 'star',
      },
      {
        id: '4',
        label: 'Try Again',
        value: 0,
        color: '#95E1D3',
        type: 'nothing',
        icon: 'refresh',
      },
      {
        id: '5',
        label: '50 Coins',
        value: 50,
        color: '#FF8B94',
        type: 'coins',
        icon: 'star',
      },
      {
        id: '6',
        label: '15 Coins',
        value: 15,
        color: '#A8E6CF',
        type: 'coins',
        icon: 'star',
      },
    ];
  };

  const handleSpinComplete = async (result: SpinWheelResult, coins: number, balance: number, tUpdate?: any) => {
    try {
      setLastResult(result);
      setCoinsEarned(coins);
      setNewBalance(balance);
      setTournamentUpdate(tUpdate || null);

      // Haptic feedback on spin win
      if (coins > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }

      // Reward is already claimed by the spin endpoint in SpinWheelGame component
      // Just update local state
      setSpinsRemaining((prev) => Math.max(0, prev - 1));

      // ✅ FIX: Force refresh to get latest coins from backend (bypass cache)
      await gamificationActions.loadGamificationData(true);

      // ✅ FIX: Update daily streak (for daily activity tracking)
      await gamificationActions.updateDailyStreak();

      // Reload spin wheel data to get updated spinsRemaining
      await loadSpinWheelData();

      // Show result modal with animation
      if (!isMounted()) return;
      setShowResult(true);
    } catch (error: any) {
      // Non-critical error, just log it
    }
  };

  const handleCloseModal = () => {
    setShowResult(false);
  };

  const handleBackPress = () => {
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
  };

  if (loading) {
    return <GamePageSkeleton />;
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Spin & Win',
          headerStyle: {
            backgroundColor: Colors.brand.purpleLight,
          },
          headerTintColor: colors.background.primary,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerLeft: () => (
            <Pressable
              onPress={handleBackPress}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </Pressable>
          ),
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <LinearGradient
            colors={[Colors.background.secondary, Colors.border.default]}
            style={styles.infoBannerGradient}
          >
            <Ionicons name="information-circle" size={24} color={Colors.brand.purpleLight} />
            <View style={styles.infoBannerTextContainer}>
              <ThemedText style={styles.infoBannerTitle}>How to Play</ThemedText>
              <ThemedText style={styles.infoBannerText}>
                Tap "SPIN NOW" and watch the wheel spin! You can win coins, vouchers, or other
                amazing rewards. You have {spinsRemaining} spin{spinsRemaining !== 1 ? 's' : ''}{' '}
                remaining today.
              </ThemedText>
            </View>
          </LinearGradient>
        </View>

        {/* Spin Wheel Game Component */}
        <SpinWheelGame
          segments={segments}
          onSpinComplete={handleSpinComplete}
          spinsRemaining={spinsRemaining}
          isLoading={loading}
        />

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <ThemedText style={styles.statsTitle}>Your Stats</ThemedText>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="star" size={28} color={colors.brand.goldBright} />
              <ThemedText style={styles.statValue}>
                {gamificationState.coinBalance.total.toLocaleString()}
              </ThemedText>
              <ThemedText style={styles.statLabel}>Total Coins</ThemedText>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="refresh-circle" size={28} color={Colors.brand.purpleLight} />
              <ThemedText style={styles.statValue}>{spinsRemaining}</ThemedText>
              <ThemedText style={styles.statLabel}>Spins Left</ThemedText>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="flame" size={28} color="#FF6B6B" />
              <ThemedText style={styles.statValue}>{gamificationState.dailyStreak}</ThemedText>
              <ThemedText style={styles.statLabel}>Day Streak</ThemedText>
            </View>
          </View>
        </View>

        {/* Spin History Section */}
        <View style={styles.historySection}>
          <SpinHistory limit={10} />
        </View>

        {/* CTA Section */}
        {spinsRemaining === 0 && (
          <View style={styles.ctaSection}>
            <LinearGradient
              colors={[Colors.brand.purpleLight, Colors.brand.purple]}
              style={styles.ctaCard}
            >
              <Ionicons name="trophy" size={48} color="white" />
              <ThemedText style={styles.ctaTitle}>No Spins Left!</ThemedText>
              <ThemedText style={styles.ctaText}>
                Come back tomorrow for more spins or complete challenges to earn extra spins!
              </ThemedText>
              <Pressable
                style={styles.ctaButton}
                onPress={() => router.push('/gamification' as any)}
               
              >
                <View style={styles.ctaButtonInner}>
                  <ThemedText style={styles.ctaButtonText}>View Challenges</ThemedText>
                  <Ionicons name="arrow-forward" size={20} color={Colors.brand.purpleLight} />
                </View>
              </Pressable>
            </LinearGradient>
          </View>
        )}
      </ScrollView>

      {/* Celebration Modal */}
      <CelebrationModal
        visible={showResult}
        result={lastResult}
        coinsEarned={coinsEarned}
        newBalance={newBalance}
        onClose={handleCloseModal}
        tournamentUpdate={tournamentUpdate}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  contentContainer: {
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
  },
  loadingText: {
    marginTop: Spacing.base,
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
  },
  backButton: {
    marginLeft: Platform.OS === 'ios' ? 8 : 16,
    padding: Spacing.xs,
  },
  infoBanner: {
    margin: Spacing.base,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  infoBannerGradient: {
    flexDirection: 'row',
    padding: Spacing.base,
    alignItems: 'flex-start',
  },
  infoBannerTextContainer: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  infoBannerTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  infoBannerText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    lineHeight: 20,
  },
  statsSection: {
    margin: Spacing.base,
    marginTop: Spacing.xl,
  },
  statsTitle: {
    ...Typography.h3,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: Spacing.base,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    ...Shadows.medium,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
  historySection: {
    margin: Spacing.base,
    marginTop: Spacing.xl,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    ...Shadows.medium,
    minHeight: 200,
  },
  ctaSection: {
    margin: Spacing.base,
  },
  ctaCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    shadowColor: Colors.brand.purpleLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  ctaTitle: {
    ...Typography.h2,
    fontWeight: 'bold',
    color: Colors.text.inverse,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  ctaText: {
    ...Typography.body,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  ctaButton: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  ctaButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  ctaButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.brand.purpleLight,
  },
});

export default withErrorBoundary(SpinWheelPage, 'GamesSpinWheel');
