// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Scratch & Win Page
// Server-driven scratch card game with fraud-proof prize generation.
// Flow: eligibility check → create session → scratch animation → play (server prize) → wallet credit → confirmation

import { colors } from '@/constants/theme';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  StatusBar,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuthUser, useIsAuthenticated, useAuthLoading, useRefreshWallet } from '@/stores/selectors';
import { useGamification } from '@/contexts/GamificationContext';
import { platformAlert, platformAlertSimple } from '@/utils/platformAlert';
import { useScratchCard } from '@/hooks/useScratchCard';
import FeatureErrorBoundary from '@/components/common/FeatureErrorBoundary';
import { GamePageSkeleton } from '@/components/skeletons';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width } = Dimensions.get('window');

function ScratchCardPage() {
  const router = useRouter();
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const { actions: gamificationActions } = useGamification();
  const refreshWallet = useRefreshWallet();
  const {
    state: cardState,
    eligibility,
    session,
    prize,
    error,
    cooldownSeconds,
    checkEligibility,
    createSession,
    revealPrize,
    retryClaim} = useScratchCard();

  const [isAnimating, setIsAnimating] = useState(false);
  const fadeAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(0.8);
  const scratchAnim = useSharedValue(1);
  const prizeScaleAnim = useSharedValue(0);
  const hasLoadedRef = useRef(false);
  const hasAnimatedRef = useRef(false);
  const isFirstFocusRef = useRef(true);
  const isMounted = useIsMounted();

  // Auth guard — runs once on mount
  useEffect(() => {
    if (!authLoading) {
      if (isAuthenticated && user) {
        if (!hasLoadedRef.current) {
          hasLoadedRef.current = true;
          checkEligibility();
        }
      }
      // AuthContext navigation guard handles unauthenticated redirect
    }
  }, [isAuthenticated, authLoading]);

  // Refresh on re-focus (skip initial focus — handled by useEffect above)
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocusRef.current) {
        isFirstFocusRef.current = false;
        return;
      }
      if (isAuthenticated) {
        checkEligibility();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated])
  );

  // Animate card entrance — only once when card first becomes available
  useEffect(() => {
    if ((cardState === 'available' || cardState === 'scratching') && !hasAnimatedRef.current) {
      hasAnimatedRef.current = true;
      fadeAnim.value = 0;
      scaleAnim.value = 0.8;
      fadeAnim.value = withTiming(1, { duration: 600 });
      scaleAnim.value = withSpring(1, { damping: 7, stiffness: 50 });
    }
  }, [cardState]);

  const handleBackPress = useCallback(() => {
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
  }, [router]);

  const formatCooldown = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  /** Step 1: Create session (no prize yet) */
  const handleCreateCard = useCallback(async () => {
    if (isAnimating) return;
    const newSession = await createSession();
    if (!newSession) {
      if (error) {
        platformAlertSimple('Cannot Play', error);
      }
    }
  }, [createSession, error, isAnimating]);

  /** Step 2: Play scratch animation, then call server for prize */
  const handleScratch = useCallback(async () => {
    if (isAnimating || !session?.sessionId) return;
    setIsAnimating(true);

    // Animate scratch-off effect
    scratchAnim.value = withTiming(0, { duration: 800 });

    // After animation, call server to generate prize + credit wallet
    setTimeout(async () => {
      const wonPrize = await revealPrize(session.sessionId);

      if (wonPrize) {
        // Haptic feedback on prize win
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

        // Animate prize reveal
        prizeScaleAnim.value = 0;
        prizeScaleAnim.value = withSpring(1, { damping: 6, stiffness: 50 });

        // Refresh wallet balance from server
        try {
          await refreshWallet();
          await gamificationActions.loadGamificationData(true);
        } catch (e) {
          // Non-blocking — balance will refresh on next navigation
        }
      }
      if (!isMounted()) return;
      setIsAnimating(false);
    }, 850);
  }, [session, isAnimating, revealPrize, scratchAnim, prizeScaleAnim, gamificationActions, refreshWallet]);

  /** Retry failed claim */
  const handleRetry = useCallback(async () => {
    if (!session?.sessionId) return;
    const success = await retryClaim(session.sessionId);
    if (success) {
      // Refresh wallet balance
      try {
        await refreshWallet();
        await gamificationActions.loadGamificationData(true);
      } catch (e) { /* non-blocking */ }
    } else {
      platformAlertSimple('Retry Failed', 'Please try again or contact support.');
    }
  }, [session, retryClaim, gamificationActions, refreshWallet]);

  /** Done — go back and refresh eligibility */
  const handleDone = useCallback(() => {
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
  }, [router]);

  const handlePlayAgain = useCallback(() => {
    // Reset animations for next card
    scratchAnim.value = 1;
    prizeScaleAnim.value = 0;
    hasAnimatedRef.current = false;
    checkEligibility();
  }, [checkEligibility, scratchAnim, prizeScaleAnim]);

  // Get prize display info
  const getPrizeIcon = (type?: string): string => {
    switch (type) {
      case 'coins': return 'wallet';
      case 'badge': return 'ribbon';
      case 'discount': return 'pricetag';
      case 'cashback': return 'cash';
      case 'free_delivery': return 'bicycle';
      default: return 'gift';
    }
  };

  const getPrizeColor = (type?: string): string => {
    switch (type) {
      case 'coins': return Colors.success;
      case 'badge': return Colors.brand.purpleLight;
      case 'discount': return Colors.warning;
      case 'cashback': return Colors.info;
      default: return Colors.brand.purple;
    }
  };

  // ==================== RENDER ====================

  const renderHeader = () => (
    <LinearGradient colors={[Colors.brand.purple, Colors.brand.purpleLight]} style={styles.headerBg}>
      <View style={styles.headerContainer}>
        <Pressable style={styles.backButton} onPress={handleBackPress}
          accessibilityLabel="Go back" accessibilityRole="button">
          <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
        </Pressable>
        <ThemedText style={styles.headerTitle} accessibilityRole="header">Scratch & Win</ThemedText>
        <View style={styles.headerRight} />
      </View>
    </LinearGradient>
  );

  /** Loading state */
  if (cardState === 'loading') {
    return (
      <ThemedView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.brand.purple} />
        {renderHeader()}
        <GamePageSkeleton />
      </ThemedView>
    );
  }

  /** Unavailable — cooldown, daily limit, or disabled */
  if (cardState === 'unavailable') {
    return (
      <FeatureErrorBoundary featureName="Scratch Card" onSecondaryAction={() => router.push('/games' as any)} secondaryActionLabel="Back to Games" secondaryActionIcon="game-controller">
        <ThemedView style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor={Colors.brand.purple} />
          {renderHeader()}
          <View style={styles.centerContent}>
            {cooldownSeconds > 0 ? (
              <>
                <Ionicons name="time-outline" size={80} color={Colors.warning} />
                <ThemedText style={styles.lockedTitle}>Cooldown Active</ThemedText>
                <ThemedText style={styles.lockedDescription}>
                  Your next scratch card will be available in:
                </ThemedText>
                <ThemedText style={styles.cooldownTimer}>{formatCooldown(cooldownSeconds)}</ThemedText>
              </>
            ) : (
              <>
                <Ionicons name="close-circle-outline" size={80} color={Colors.border.default} />
                <ThemedText style={styles.lockedTitle}>No Plays Remaining</ThemedText>
                <ThemedText style={styles.lockedDescription}>
                  {eligibility
                    ? `You've used all ${eligibility.dailyLimit} plays for today. Come back tomorrow!`
                    : 'Scratch cards are currently unavailable. Please try again later.'}
                </ThemedText>
              </>
            )}

            {eligibility && (
              <ThemedText style={styles.statsText}>
                Plays today: {eligibility.dailyLimit - eligibility.remainingToday}/{eligibility.dailyLimit}
              </ThemedText>
            )}

            <Pressable style={[styles.actionButton, { backgroundColor: Colors.text.tertiary }]}
              onPress={() => checkEligibility()}
              accessibilityLabel="Refresh status" accessibilityRole="button">
              <ThemedText style={styles.actionButtonText}>Refresh</ThemedText>
            </Pressable>
          </View>
        </ThemedView>
      </FeatureErrorBoundary>
    );
  }

  /** Claim failed — retry option */
  if (cardState === 'claimFailed') {
    return (
      <FeatureErrorBoundary featureName="Scratch Card" onSecondaryAction={() => router.push('/games' as any)} secondaryActionLabel="Back to Games" secondaryActionIcon="game-controller">
        <ThemedView style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor={Colors.brand.purple} />
          {renderHeader()}
          <View style={styles.centerContent}>
            <Ionicons name="warning-outline" size={80} color={Colors.error} />
            <ThemedText style={styles.lockedTitle}>Prize Credit Failed</ThemedText>
            <ThemedText style={styles.lockedDescription}>
              Your prize was revealed but we couldn't credit your wallet. Tap retry to try again — your reward is safe.
            </ThemedText>
            {error && <ThemedText style={styles.errorText}>{error}</ThemedText>}

            <Pressable style={styles.actionButton} onPress={handleRetry}
              accessibilityLabel="Retry claiming prize" accessibilityRole="button">
              <ThemedText style={styles.actionButtonText}>Retry Claim</ThemedText>
            </Pressable>
          </View>
        </ThemedView>
      </FeatureErrorBoundary>
    );
  }

  return (
    <FeatureErrorBoundary
      featureName="Scratch Card"
      onSecondaryAction={() => router.push('/games' as any)}
      secondaryActionLabel="Back to Games"
      secondaryActionIcon="game-controller"
      onReset={() => checkEligibility()}
    >
      <ThemedView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.brand.purple} />
        {renderHeader()}

        <View style={styles.content}>
          {/* Remaining plays indicator */}
          {eligibility && cardState === 'available' && (
            <View style={styles.remainingBadge}>
              <Ionicons name="ticket-outline" size={16} color={Colors.brand.purple} />
              <ThemedText style={styles.remainingText}>
                {eligibility.remainingToday} of {eligibility.dailyLimit} plays remaining
              </ThemedText>
            </View>
          )}

          {/* Card area */}
          <Animated.View
            style={[
              styles.cardContainer,
              { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
            ]}
          >
            <View style={styles.scratchCard}>
              {/* Scratch Surface (visible before scratch) */}
              {cardState !== 'revealed' && (
                <Animated.View style={[styles.scratchSurface, { opacity: scratchAnim }]}>
                  <LinearGradient colors={['#C0C0C0', '#A0A0A0']} style={styles.scratchGradient}>
                    <Ionicons name="finger-print" size={60} color={Colors.text.inverse} />
                    <ThemedText style={styles.scratchText}>
                      {cardState === 'available' ? 'TAP TO START' : 'SCRATCH HERE'}
                    </ThemedText>
                    <ThemedText style={styles.scratchSubtext}>
                      {cardState === 'available'
                        ? 'Get your scratch card!'
                        : 'Tap the button below to reveal your prize!'}
                    </ThemedText>
                  </LinearGradient>
                </Animated.View>
              )}

              {/* Prize Content (revealed after play) */}
              {cardState === 'revealed' && prize && (
                <Animated.View style={[styles.prizeContent, { transform: [{ scale: prizeScaleAnim }] }]}>
                  <View style={[styles.prizeIcon, { backgroundColor: getPrizeColor(prize.type) }]}>
                    <Ionicons name={getPrizeIcon(prize.type) as any} size={40} color={Colors.text.inverse} />
                  </View>
                  <ThemedText style={styles.prizeTitle}>
                    {prize.type === 'coins' ? `${prize.value} ${BRAND.COIN_NAME}!` : prize.description}
                  </ThemedText>
                  <ThemedText style={styles.prizeDescription}>{prize.description}</ThemedText>
                </Animated.View>
              )}

              {/* Creating state indicator */}
              {cardState === 'creating' && (
                <View style={styles.prizeContent}>
                  <ActivityIndicator size="large" color={Colors.brand.purple} />
                  <ThemedText style={styles.loadingText}>Getting your card...</ThemedText>
                </View>
              )}
            </View>
          </Animated.View>

          {/* Action buttons based on state */}
          <View style={styles.buttonArea}>
            {cardState === 'available' && (
              <Pressable style={styles.actionButton} onPress={handleCreateCard}
                accessibilityLabel="Get scratch card" accessibilityRole="button">
                <Ionicons name="ticket" size={20} color={Colors.text.inverse} style={{ marginRight: 8 }} />
                <ThemedText style={styles.actionButtonText}>Get Scratch Card</ThemedText>
              </Pressable>
            )}

            {cardState === 'scratching' && !isAnimating && (
              <Pressable style={styles.actionButton} onPress={handleScratch}
                accessibilityLabel="Scratch the card" accessibilityRole="button">
                <Ionicons name="hand-left" size={20} color={Colors.text.inverse} style={{ marginRight: 8 }} />
                <ThemedText style={styles.actionButtonText}>Scratch Card</ThemedText>
              </Pressable>
            )}

            {cardState === 'scratching' && isAnimating && (
              <View style={[styles.actionButton, styles.disabledButton]}>
                <ActivityIndicator size="small" color={Colors.text.inverse} style={{ marginRight: 8 }} />
                <ThemedText style={styles.actionButtonText}>Revealing...</ThemedText>
              </View>
            )}

            {cardState === 'revealed' && (
              <View style={styles.revealedButtons}>
                {eligibility && eligibility.remainingToday > 0 ? (
                  <Pressable style={styles.actionButton} onPress={handlePlayAgain}
                    accessibilityLabel="Play again" accessibilityRole="button">
                    <ThemedText style={styles.actionButtonText}>Play Again</ThemedText>
                  </Pressable>
                ) : (
                  <Pressable style={styles.actionButton} onPress={handleDone}
                    accessibilityLabel="Done" accessibilityRole="button">
                    <ThemedText style={styles.actionButtonText}>Done</ThemedText>
                  </Pressable>
                )}
                {prize?.type === 'coins' && (
                  <Pressable
                    style={[styles.actionButton, { backgroundColor: Colors.success, marginTop: Spacing.md }]}
                    onPress={() => router.push('/wallet-screen')}
                    accessibilityLabel="View wallet" accessibilityRole="button">
                    <Ionicons name="wallet" size={20} color={Colors.text.inverse} style={{ marginRight: 8 }} />
                    <ThemedText style={styles.actionButtonText}>View Wallet</ThemedText>
                  </Pressable>
                )}
              </View>
            )}
          </View>

          {/* How to Play */}
          {(cardState === 'available' || cardState === 'scratching') && (
            <View style={styles.instructionsContainer}>
              <ThemedText style={styles.instructionsTitle}>How to Play</ThemedText>
              <ThemedText style={styles.instructionsText}>
                1. Tap "Get Scratch Card" to receive your card{'\n'}
                2. Tap "Scratch Card" to reveal your prize{'\n'}
                3. Prize is credited to your wallet instantly!
              </ThemedText>
            </View>
          )}

          {/* Error display */}
          {error && cardState !== 'claimFailed' && (
            <View style={styles.errorContainer}>
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            </View>
          )}
        </View>
      </ThemedView>
    </FeatureErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary},
  headerBg: {
    paddingTop: StatusBar.currentHeight || 50,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    ...Shadows.medium},
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'},
  backButton: {
    padding: Spacing.sm},
  headerTitle: {
    color: Colors.text.inverse,
    ...Typography.h3,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center'},
  headerRight: {
    width: 40},
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    alignItems: 'center'},
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40},
  loadingText: {
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
    marginTop: Spacing.base},
  remainingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tint.purple,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.lg},
  remainingText: {
    ...Typography.body,
    color: Colors.brand.purple,
    fontWeight: '600',
    marginLeft: 6},
  cardContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl},
  scratchCard: {
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    backgroundColor: Colors.background.primary,
    ...Shadows.strong},
  scratchSurface: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2},
  scratchGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg},
  scratchText: {
    color: Colors.text.inverse,
    ...Typography.h4,
    fontWeight: 'bold',
    marginTop: Spacing.base,
    textAlign: 'center'},
  scratchSubtext: {
    color: Colors.text.inverse,
    ...Typography.body,
    marginTop: Spacing.sm,
    textAlign: 'center',
    opacity: 0.9},
  prizeContent: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg},
  prizeIcon: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg},
  prizeTitle: {
    ...Typography.h2,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
    textAlign: 'center'},
  prizeDescription: {
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
    textAlign: 'center'},
  buttonArea: {
    width: '100%',
    alignItems: 'center',
    marginBottom: Spacing.lg},
  actionButton: {
    backgroundColor: Colors.brand.purple,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
    shadowColor: Colors.brand.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6},
  disabledButton: {
    backgroundColor: colors.brand.purpleSoft,
    shadowOpacity: 0.1},
  actionButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: '700'},
  revealedButtons: {
    alignItems: 'center'},
  instructionsContainer: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: '100%',
    ...Shadows.subtle},
  instructionsTitle: {
    ...Typography.h4,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
    textAlign: 'center'},
  instructionsText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    lineHeight: 22,
    textAlign: 'center'},
  lockedTitle: {
    ...Typography.h2,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    textAlign: 'center'},
  lockedDescription: {
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.lg},
  cooldownTimer: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.warning,
    marginBottom: Spacing.xl},
  statsText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginBottom: Spacing.lg},
  errorContainer: {
    backgroundColor: Colors.errorScale[50],
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
    width: '100%'},
  errorText: {
    ...Typography.body,
    color: Colors.error,
    textAlign: 'center'}});

export default withErrorBoundary(ScratchCardPage, 'ScratchCard');
