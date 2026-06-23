// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { platformAlert } from '@/utils/platformAlert';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import type { SpinWheelSegment, SpinWheelResult } from '@/types/gamification.types';
import gamificationAPI from '@/services/gamificationApi';
import { useGamification } from '@/contexts/GamificationContext';
import logger from '@/utils/logger';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface SpinWheelGameProps {
  segments: SpinWheelSegment[];
  onSpinComplete: (result: SpinWheelResult, coinsEarned: number, newBalance: number, tournamentUpdate?: any) => void;
  spinsRemaining: number;
  isLoading?: boolean;
  onCoinsEarned?: (coins: number) => void;
  onError?: (error: string) => void;
}

const { width } = Dimensions.get('window');
const WHEEL_SIZE = Math.min(width * 0.85, 320);

function SpinWheelGame({
  segments,
  onSpinComplete,
  spinsRemaining,
  isLoading = false,
  onCoinsEarned,
  onError,
}: SpinWheelGameProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [canSpin, setCanSpin] = useState(false);
  const [eligibilityLoading, setEligibilityLoading] = useState(true);
  const [nextSpinTime, setNextSpinTime] = useState<string | null>(null);
  const isMounted = useIsMounted();
  const spinValue = useSharedValue(0);
  const [currentRotation, setCurrentRotation] = useState(0);
  const { actions: gamificationActions } = useGamification();

  // Check spin eligibility on mount and when spinsRemaining changes
  useEffect(() => {
    checkSpinEligibility();
  }, [spinsRemaining]);

  const checkSpinEligibility = async () => {
    try {
      setEligibilityLoading(true);

      // ✅ FIX: Trust backend's spinsRemaining count (from getSpinWheelData)
      // Backend now counts actual spins used TODAY, not cooldown-based logic
      // This fixes the bug where button showed "Come Back Later" with 3 spins remaining

      if (spinsRemaining > 0) {
        setCanSpin(true);
        setNextSpinTime(null);
        logger.debug('[SPIN_WHEEL] User has', spinsRemaining, 'spins remaining - enabling button');
      } else {
        setCanSpin(false);
        // Set next spin time to midnight UTC (when daily limit resets)
        const tomorrow = new Date();
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        tomorrow.setUTCHours(0, 0, 0, 0);
        setNextSpinTime(tomorrow.toISOString());
        logger.debug('[SPIN_WHEEL] No spins remaining - button disabled until midnight UTC');
      }

      // Note: Removed cooldown check that was causing conflicts
      // Backend now handles all eligibility logic in getSpinWheelData endpoint

    } catch (error: any) {
      logger.error('Error checking spin eligibility:', error);
      // Fallback to spinsRemaining prop
      setCanSpin(spinsRemaining > 0);
    } finally {
      setEligibilityLoading(false);
    }
  };

  const handleSpin = async () => {
    if (isSpinning || !canSpin || isLoading || spinsRemaining <= 0) return;

    try {
      setIsSpinning(true);

      // Call backend API to spin wheel
      const response = await gamificationAPI.spinWheel();

      if (response.success && response.data) {
        const { result, coinsAdded, newBalance, tournamentUpdate } = response.data;

        // Calculate rotation angle based on result
        const winningSegment = result.segment;
        const winningIndex = segments.findIndex(s => s.id === winningSegment.id);
        const segmentAngle = 360 / segments.length;
        const targetAngle = 360 - (winningIndex * segmentAngle + segmentAngle / 2);

        // Add multiple rotations for excitement
        const totalRotation = currentRotation + 360 * 5 + targetAngle;

        // Animate the spin
        if (!isMounted()) return;
        spinValue.value = 0;
        spinValue.value = withTiming(1, { duration: 4000, easing: Easing.bezier(0.17, 0.67, 0.83, 0.67) });

        // After animation completes, update state
        setTimeout(async () => {
          if (!isMounted()) return;
          setCurrentRotation(totalRotation % 360);
          setIsSpinning(false);

          // Update wallet balance in context
          if (coinsAdded > 0) {
            await gamificationActions.loadGamificationData(true);
            onCoinsEarned?.(coinsAdded);
          }

          // Show result with coins info (modal will be shown by parent component)
          onSpinComplete(result, coinsAdded, newBalance, tournamentUpdate);

          // Check eligibility for next spin
          await checkSpinEligibility();

          // Note: Removed Alert - parent component will show beautiful celebration modal instead
        }, 4100);
      } else {
        throw new Error('Failed to spin wheel');
      }
    } catch (error: any) {
      if (!isMounted()) return;
      setIsSpinning(false);
      logger.error('Error spinning wheel:', error);

      const errorMessage = error.response?.data?.message || error.message || 'Failed to spin wheel. Please try again.';
      onError?.(errorMessage);

      platformAlert('Error', errorMessage);
    }
  };

  const wheelAnimStyle = useAnimatedStyle(() => {
    const deg = currentRotation + spinValue.value * (360 * 5 + 180);
    return {
      transform: [{ rotate: `${deg}deg` }],
    };
  });

  const renderWheel = () => {
    const segmentAngle = 360 / segments.length;

    return (
      <View style={styles.wheelContainer}>
        {/* Pointer */}
        <View style={styles.pointerContainer}>
          <LinearGradient
            colors={[colors.error, colors.error]}
            style={styles.pointer}
          >
            <View style={styles.pointerTriangle} />
          </LinearGradient>
        </View>

        {/* Wheel */}
        <Animated.View
          style={[
            styles.wheel,
            wheelAnimStyle,
          ]}
        >
          {segments.map((segment, index) => {
            const rotation = (index * segmentAngle) - 90;
            return (
              <View
                key={segment.id}
                style={[
                  styles.segment,
                  {
                    transform: [
                      { rotate: `${rotation}deg` },
                    ],
                  },
                ]}
              >
                <View
                  style={[
                    styles.segmentInner,
                    { backgroundColor: segment.color },
                  ]}
                >
                  <View style={styles.segmentContent}>
                    {segment.icon && (
                      <Ionicons
                        name={segment.icon as any}
                        size={24}
                        color={colors.background.primary}
                        style={styles.segmentIcon}
                      />
                    )}
                    <ThemedText style={styles.segmentText}>
                      {segment.value > 0 ? segment.value : segment.label}
                    </ThemedText>
                  </View>
                </View>
              </View>
            );
          })}

          {/* Center circle */}
          <LinearGradient
            colors={[colors.brand.purpleLight, colors.brand.indigo]}
            style={styles.centerCircle}
          >
            <Ionicons name="star" size={32} color={colors.background.primary} />
          </LinearGradient>
        </Animated.View>
      </View>
    );
  };

  // Loading state
  if (eligibilityLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand.purpleLight} />
          <ThemedText style={styles.loadingText}>Loading spin wheel...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText style={styles.title}>Spin the Wheel</ThemedText>
        <View style={styles.spinsContainer}>
          <Ionicons name="refresh-circle" size={20} color={colors.brand.purpleLight} />
          <ThemedText style={styles.spinsText}>
            {spinsRemaining} spin{spinsRemaining !== 1 ? 's' : ''} left
          </ThemedText>
        </View>
      </View>

      {/* Eligibility Warning */}
      {!canSpin && nextSpinTime && (
        <View style={styles.warningContainer}>
          <Ionicons name="time-outline" size={20} color={colors.warningScale[400]} />
          <ThemedText style={styles.warningText}>
            Next spin available at {new Date(nextSpinTime).toLocaleTimeString()}
          </ThemedText>
        </View>
      )}

      {/* Wheel */}
      {renderWheel()}

      {/* Spin Button */}
      <Pressable
        style={[
          styles.spinButton,
          (isSpinning || !canSpin || spinsRemaining <= 0 || isLoading) && styles.spinButtonDisabled,
        ]}
        onPress={handleSpin}
        disabled={isSpinning || !canSpin || spinsRemaining <= 0 || isLoading}
       
      >
        <LinearGradient
          colors={
            isSpinning || !canSpin || spinsRemaining <= 0 || isLoading
              ? [colors.neutral[400], colors.neutral[500]]
              : [colors.brand.purpleLight, colors.brand.indigo]
          }
          style={styles.spinButtonGradient}
        >
          {isSpinning ? (
            <>
              <ActivityIndicator size={24} color={colors.background.primary} />
              <ThemedText style={styles.spinButtonText}>Spinning...</ThemedText>
            </>
          ) : spinsRemaining <= 0 ? (
            <>
              <Ionicons name="close-circle" size={24} color={colors.background.primary} />
              <ThemedText style={styles.spinButtonText}>No Spins Left</ThemedText>
            </>
          ) : !canSpin ? (
            <>
              <Ionicons name="lock-closed" size={24} color={colors.background.primary} />
              <ThemedText style={styles.spinButtonText}>Come Back Later</ThemedText>
            </>
          ) : (
            <>
              <Ionicons name="play-circle" size={24} color={colors.background.primary} />
              <ThemedText style={styles.spinButtonText}>SPIN NOW</ThemedText>
            </>
          )}
        </LinearGradient>
      </Pressable>

      {/* Instructions */}
      <View style={styles.instructions}>
        <ThemedText style={styles.instructionsText}>
          {canSpin
            ? "Tap 'SPIN NOW' to try your luck and win amazing rewards!"
            : "Complete more challenges to earn spin opportunities!"}
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.neutral[900],
    marginBottom: 8,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tint.amberLight,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  warningText: {
    fontSize: 13,
    color: colors.brand.amberDark,
    fontWeight: '500',
  },
  spinsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.indigoMist,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  spinsText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brand.purpleLight,
  },
  wheelContainer: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    position: 'relative',
    marginBottom: 30,
  },
  pointerContainer: {
    position: 'absolute',
    top: -10,
    left: '50%',
    marginLeft: -20,
    zIndex: 10,
  },
  pointer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  pointerTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 20,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.error,
    position: 'absolute',
    bottom: -15,
  },
  wheel: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    borderRadius: WHEEL_SIZE / 2,
    position: 'relative',
    backgroundColor: colors.background.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  segment: {
    position: 'absolute',
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    top: 0,
    left: 0,
  },
  segmentInner: {
    position: 'absolute',
    width: WHEEL_SIZE / 2,
    height: WHEEL_SIZE / 2,
    top: 0,
    left: WHEEL_SIZE / 2,
    transformOrigin: '0 100%',
    borderLeftWidth: WHEEL_SIZE / 2,
    borderBottomWidth: WHEEL_SIZE / 2,
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  segmentContent: {
    position: 'absolute',
    top: WHEEL_SIZE / 4 - 30,
    left: WHEEL_SIZE / 4 + 10,
    alignItems: 'center',
  },
  segmentIcon: {
    marginBottom: 4,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.background.primary,
    textAlign: 'center',
  },
  centerCircle: {
    position: 'absolute',
    width: WHEEL_SIZE / 4,
    height: WHEEL_SIZE / 4,
    borderRadius: WHEEL_SIZE / 8,
    top: WHEEL_SIZE / 2 - WHEEL_SIZE / 8,
    left: WHEEL_SIZE / 2 - WHEEL_SIZE / 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  spinButton: {
    width: '80%',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: colors.brand.purpleLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  spinButtonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0.1,
  },
  spinButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  spinButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.background.primary,
  },
  instructions: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  instructionsText: {
    fontSize: 13,
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default React.memo(SpinWheelGame);
