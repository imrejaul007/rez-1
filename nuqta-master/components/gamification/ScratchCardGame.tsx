// @ts-nocheck
// Scratch Card Game Component
// Reusable scratch card component with scratch-to-reveal mechanic

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { platformAlert } from '@/utils/platformAlert';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import gamificationAPI from '@/services/gamificationApi';
import { useGamification } from '@/contexts/GamificationContext';
import type { ScratchCardPrize } from '@/types/gamification.types';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;
const CARD_HEIGHT = CARD_WIDTH * 0.6;

interface ScratchCardGameProps {
  onReveal?: (prize: ScratchCardPrize) => void;
  onCoinsEarned?: (coins: number) => void;
  onError?: (error: string) => void;
}

function ScratchCardGame({
  onReveal,
  onCoinsEarned,
  onError,
}: ScratchCardGameProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [isScratched, setIsScratched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [canCreate, setCanCreate] = useState(false);
  const [eligibilityLoading, setEligibilityLoading] = useState(true);
  const [nextAvailableTime, setNextAvailableTime] = useState<string | null>(null);
  const [prize, setPrize] = useState<ScratchCardPrize | null>(null);
  const [cardId, setCardId] = useState<string | null>(null);
  const isMounted = useIsMounted();
  const scratchOpacity = useSharedValue(1);
  const prizeScale = useSharedValue(0.5);
  const { actions: gamificationActions } = useGamification();

  // Check eligibility on mount
  useEffect(() => {
    checkEligibility();
  }, []);

  const checkEligibility = async () => {
    try {
      setEligibilityLoading(true);
      const response = await gamificationAPI.canCreateScratchCard();

      if (response.success && response.data) {
        if (!isMounted()) return;
        setCanCreate(response.data.canCreate);
        setNextAvailableTime(response.data.nextAvailableAt || null);
      }
    } catch (error: any) {
      if (!isMounted()) return;
      setCanCreate(true); // Allow on error as fallback
    } finally {
      if (!isMounted()) return;
      setEligibilityLoading(false);
    }
  };

  // Create new scratch card
  const createCard = async () => {
    if (!canCreate) {
      platformAlert('Not Available', 'Scratch card is not available yet. Please try again later.');
      return false;
    }

    try {
      setIsLoading(true);
      const response = await gamificationAPI.createScratchCard();

      if (response.success && response.data) {
        if (!isMounted()) return;
        setCardId(response.data.id);
        setPrize(response.data.prize);
        setIsLoading(false);
        return true;
      }
      return false;
    } catch (error: any) {
      if (!isMounted()) return;
      setIsLoading(false);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create scratch card';
      platformAlert('Error', errorMessage);
      onError?.(errorMessage);
      return false;
    }
  };

  // Handle scratch action
  const handleScratch = async () => {
    if (isScratched || !cardId || isLoading) {
      return;
    }

    try {
      setIsLoading(true);

      // Animate scratch effect
      scratchOpacity.value = withTiming(0, { duration: 500 });
      prizeScale.value = withSpring(1, { stiffness: 50, damping: 7 });

      setIsScratched(true);

      // Scratch card on backend
      const response = await gamificationAPI.scratchCard(cardId);

      if (response.success && response.data) {
        const { coinsAdded } = response.data;

        // Update wallet balance in context
        if (coinsAdded > 0) {
          await gamificationActions.loadGamificationData(true);
          onCoinsEarned?.(coinsAdded);
        }

        // Trigger callback
        if (prize && onReveal) {
          onReveal(prize);
        }

        // Show success alert
        if (!isMounted()) return;
        setTimeout(() => {
          platformAlert(
            'Prize Revealed! 🎉',
            `You won: ${prize?.description || 'A mystery prize!'}${coinsAdded > 0 ? `\n\n+${coinsAdded} coins added to your wallet!` : ''}`,
            [
              {
                text: 'Great!',
                onPress: async () => {
                  // Reset for next card
                  resetCard();
                  // Check eligibility for next card
                  await checkEligibility();
                },
              },
            ]
          );
        }, 600);
      }

      if (!isMounted()) return;
      setIsLoading(false);
    } catch (error: any) {
      if (!isMounted()) return;
      setIsLoading(false);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to scratch card';
      platformAlert('Error', errorMessage);
      onError?.(errorMessage);
    }
  };

  // Reset card
  const resetCard = () => {
    setIsScratched(false);
    setPrize(null);
    setCardId(null);
    scratchOpacity.value = 1;
    prizeScale.value = 0.5;
  };

  // Loading state
  if (eligibilityLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer} testID="loading-indicator">
          <ActivityIndicator size="large" color={colors.brand.purpleLight} />
          <ThemedText style={styles.loadingText}>Checking availability...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  // Not eligible state
  if (!canCreate && !cardId) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.notAvailableContainer}>
          <Ionicons name="time-outline" size={80} color={colors.neutral[200]} />
          <ThemedText style={styles.notAvailableTitle}>Scratch Card Not Available</ThemedText>
          <ThemedText style={styles.notAvailableDescription}>
            {nextAvailableTime
              ? `Come back at ${new Date(nextAvailableTime).toLocaleTimeString()} for your next scratch card!`
              : 'Complete more challenges to unlock scratch cards!'}
          </ThemedText>
          <Pressable
            style={styles.refreshButton}
            onPress={checkEligibility}
            disabled={isLoading}
          >
            <ThemedText style={styles.refreshButtonText}>
              {isLoading ? 'Checking...' : 'Check Again'}
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container} testID="scratch-card-container">
      <View style={styles.cardContainer}>
        {/* Prize Content (hidden behind scratch layer) */}
        {prize && (
          <Animated.View
            style={[
              styles.prizeContent,
              {
                transform: [{ scale: prizeScale }],
              },
            ]}
          >
            <View style={[styles.prizeIcon, { backgroundColor: prize.color }]}>
              <Ionicons name={prize.icon as any} size={48} color={colors.background.primary} />
            </View>
            <ThemedText style={styles.prizeTitle}>{prize.title}</ThemedText>
            <ThemedText style={styles.prizeDescription}>{prize.description}</ThemedText>
            {prize.type !== 'nothing' && (
              <View style={styles.prizeValue}>
                <ThemedText style={styles.prizeValueText}>
                  {prize.type === 'coin' && `${prize.value} Coins`}
                  {prize.type === 'discount' && `${prize.value}% OFF`}
                  {prize.type === 'cashback' && `${currencySymbol}${prize.value} Cashback`}
                  {prize.type === 'voucher' && `${currencySymbol}${prize.value} Voucher`}
                </ThemedText>
              </View>
            )}
          </Animated.View>
        )}

        {/* Scratch Surface */}
        <Animated.View
          style={[
            styles.scratchSurface,
            {
              opacity: scratchOpacity,
            },
          ]}
        >
          <Pressable
            style={styles.scratchTouchable}
            onPress={handleScratch}
           
            disabled={isLoading || !cardId}
          >
            <LinearGradient
              colors={['#C0C0C0', '#A0A0A0', '#C0C0C0']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.scratchGradient}
            >
              {isLoading ? (
                <>
                  <ActivityIndicator size={60} color={colors.background.primary} />
                  <ThemedText style={styles.scratchText}>SCRATCHING...</ThemedText>
                </>
              ) : (
                <>
                  <Ionicons name="hand-left" size={60} color={colors.background.primary} style={styles.scratchIcon} />
                  <ThemedText style={styles.scratchText}>SCRATCH HERE</ThemedText>
                  <ThemedText style={styles.scratchSubtext}>
                    Tap to reveal your prize!
                  </ThemedText>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>

      {/* Create Button */}
      {!isScratched && !cardId && canCreate && (
        <Pressable
          style={styles.createButton}
          onPress={createCard}
          disabled={isLoading}
        >
          <LinearGradient
            colors={isLoading ? [colors.neutral[400], colors.neutral[500]] : [colors.brand.purpleLight, colors.brand.purple]}
            style={styles.createButtonGradient}
          >
            {isLoading ? (
              <>
                <ActivityIndicator size={24} color={colors.background.primary} />
                <ThemedText style={styles.createButtonText}>Creating...</ThemedText>
              </>
            ) : (
              <>
                <ThemedText style={styles.createButtonText}>Create Scratch Card</ThemedText>
                <Ionicons name="add-circle" size={24} color={colors.background.primary} />
              </>
            )}
          </LinearGradient>
        </Pressable>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 80,
  },
  loadingText: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  notAvailableContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 80,
    gap: 16,
  },
  notAvailableTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.neutral[900],
    textAlign: 'center',
  },
  notAvailableDescription: {
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: 20,
  },
  refreshButton: {
    backgroundColor: colors.brand.purpleLight,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  refreshButtonText: {
    color: colors.background.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
    position: 'relative',
  },
  prizeContent: {
    flex: 1,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  prizeIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  prizeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.neutral[900],
    marginBottom: 8,
    textAlign: 'center',
  },
  prizeDescription: {
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
    marginBottom: 16,
  },
  prizeValue: {
    backgroundColor: colors.neutral[100],
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  prizeValueText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.neutral[900],
  },
  scratchSurface: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  scratchTouchable: {
    flex: 1,
  },
  scratchGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scratchIcon: {
    marginBottom: 16,
  },
  scratchText: {
    color: colors.background.primary,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  scratchSubtext: {
    color: colors.background.primary,
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.9,
  },
  createButton: {
    marginTop: 24,
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 12,
  },
  createButtonText: {
    color: colors.background.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default React.memo(ScratchCardGame);
