import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import QuizGame from '@/components/gamification/QuizGame';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import * as Haptics from 'expo-haptics';
import { useGamification } from '@/contexts/GamificationContext';
import { platformAlert } from '@/utils/platformAlert';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
function QuizPage() {
  const isMounted = useIsMounted();
  const [gameComplete, setGameComplete] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [tournamentUpdate, setTournamentUpdate] = useState<{ tournamentName: string; pointsAdded: number; newRank: number } | null>(null);

  const { actions: gamificationActions } = useGamification();

  const handleBackPress = () => {
    if (!gameComplete) {
      platformAlert(
        'Quit Quiz?',
        'Are you sure you want to quit? Your progress will be lost.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Quit', style: 'destructive', onPress: () => router.canGoBack() ? router.back() : router.replace('/(tabs)') },
        ]
      );
    } else {
      router.canGoBack() ? router.back() : router.replace('/(tabs)');
    }
  };

  const handleGameComplete = async (score: number, coins: number, tUpdate?: any) => {
    setFinalScore(score);
    setCoinsEarned(coins);
    setTournamentUpdate(tUpdate || null);
    setGameComplete(true);

    // Haptic feedback on game completion with coins earned
    if (coins > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }

    // Refresh gamification data to update coins balance
    try {
      await gamificationActions.loadGamificationData();
    } catch (error) {
      // silently handle
    }
  };

  const handlePlayAgain = () => {
    setGameComplete(false);
    setFinalScore(0);
    setCoinsEarned(0);
    setTournamentUpdate(null);
  };

  const handleViewChallenges = () => {
    router.push('/gamification' as any);
  };

  if (gameComplete) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Quiz Complete',
            headerStyle: {
              backgroundColor: colors.brand.purpleLight,
            },
            headerTintColor: colors.background.primary,
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            headerLeft: () => (
              <Pressable
                onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={24} color="white" />
              </Pressable>
            ),
          }}
        />
        <ThemedView style={styles.completeContainer}>
          <LinearGradient
            colors={[colors.brand.purpleLight, colors.brand.purple, colors.brand.indigo]}
            style={styles.completeCard}
          >
            <Ionicons name="trophy" size={80} color={colors.brand.goldBright} />
            <ThemedText style={styles.completeTitle}>Quiz Complete!</ThemedText>
            <ThemedText style={styles.completeSubtitle}>Congratulations!</ThemedText>

            <View style={styles.resultsContainer}>
              <View style={styles.resultBox}>
                <Ionicons name="star" size={32} color="white" />
                <ThemedText style={styles.resultValue}>{finalScore}</ThemedText>
                <ThemedText style={styles.resultLabel}>Final Score</ThemedText>
              </View>
              <View style={styles.resultBox}>
                <Ionicons name="diamond" size={32} color="white" />
                <ThemedText style={styles.resultValue}>{coinsEarned}</ThemedText>
                <ThemedText style={styles.resultLabel}>Coins Earned</ThemedText>
              </View>
            </View>

            {/* Tournament Score Feedback */}
            {tournamentUpdate && (
              <View style={styles.tournamentBanner}>
                <View style={styles.tournamentBannerRow}>
                  <Ionicons name="trophy" size={18} color={colors.warningScale[400]} />
                  <ThemedText style={styles.tournamentBannerTitle}>{tournamentUpdate.tournamentName}</ThemedText>
                </View>
                <View style={styles.tournamentBannerStats}>
                  <View style={styles.tournamentBannerStat}>
                    <ThemedText style={styles.tournamentBannerValue}>+{tournamentUpdate.pointsAdded}</ThemedText>
                    <ThemedText style={styles.tournamentBannerLabel}>Points</ThemedText>
                  </View>
                  <View style={[styles.tournamentBannerStat, { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.2)' }]}>
                    <ThemedText style={styles.tournamentBannerValue}>#{tournamentUpdate.newRank}</ThemedText>
                    <ThemedText style={styles.tournamentBannerLabel}>Rank</ThemedText>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.actionsContainer}>
              <Pressable
                style={styles.actionButton}
                onPress={handlePlayAgain}
               
              >
                <View style={styles.actionButtonInner}>
                  <Ionicons name="refresh" size={20} color={colors.brand.purpleLight} />
                  <ThemedText style={styles.actionButtonText}>Play Again</ThemedText>
                </View>
              </Pressable>

              <Pressable
                style={[styles.actionButton, styles.actionButtonSecondary]}
                onPress={handleViewChallenges}
               
              >
                <View style={styles.actionButtonInner}>
                  <Ionicons name="trophy" size={20} color="white" />
                  <ThemedText style={styles.actionButtonTextSecondary}>
                    View Challenges
                  </ThemedText>
                </View>
              </Pressable>
            </View>
          </LinearGradient>
        </ThemedView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Daily Quiz',
          headerStyle: {
            backgroundColor: colors.brand.purpleLight,
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
      <ThemedView style={styles.container}>
        <QuizGame
          difficulty="medium"
          category="general"
          onGameComplete={handleGameComplete}
        />
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  backButton: {
    marginLeft: Platform.OS === 'ios' ? 8 : 16,
    padding: Spacing.xs,
  },
  completeContainer: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  completeCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing['2xl'],
    alignItems: 'center',
    shadowColor: colors.brand.purpleLight,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  completeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  completeSubtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: Spacing['2xl'],
  },
  resultsContainer: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginBottom: Spacing['2xl'],
  },
  resultBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  resultValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  resultLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  tournamentBanner: {
    width: '100%',
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderRadius: 14,
    padding: 14,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
  },
  tournamentBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 10,
  },
  tournamentBannerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.warningScale[200],
    flex: 1,
  },
  tournamentBannerStats: {
    flexDirection: 'row',
  },
  tournamentBannerStat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  tournamentBannerValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text.inverse,
  },
  tournamentBannerLabel: {
    fontSize: 10,
    color: colors.warningScale[200],
    fontWeight: '500',
    marginTop: 2,
  },
  actionsContainer: {
    width: '100%',
    gap: Spacing.md,
  },
  actionButton: {
    backgroundColor: 'white',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonSecondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  actionButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.base,
    gap: Spacing.sm,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.brand.purpleLight,
  },
  actionButtonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default withErrorBoundary(QuizPage, 'GamesQuiz');
