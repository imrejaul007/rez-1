/**
 * StreakProgress — Animated daily streak progress bar with haptic feedback.
 *
 * Shows current streak, animated fill bar, and milestone info.
 * Pulses on streak change. Haptic on increment, notification on milestone.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface StreakProgressProps {
  streak: number;
  nextMilestone: number;
  onMilestoneReached?: () => void;
}

const MILESTONES = [3, 7, 14, 21, 30, 60, 90, 180, 365];

/** Get the next milestone above the current streak. */
function getNextMilestone(streak: number): number {
  return MILESTONES.find(m => m > streak) ?? streak + 30;
}

const StreakProgress: React.FC<StreakProgressProps> = ({
  streak,
  nextMilestone: nextMilestoneProp,
  onMilestoneReached,
}) => {
  const nextMilestone = nextMilestoneProp || getNextMilestone(streak);
  const progress = Math.min(streak / nextMilestone, 1);
  const daysLeft = Math.max(0, nextMilestone - streak);
  const prevStreakRef = useRef(streak);

  // Animated values
  const containerScale = useSharedValue(1);
  const barWidth = useSharedValue(progress);
  const fireScale = useSharedValue(1);

  useEffect(() => {
    const prev = prevStreakRef.current;
    prevStreakRef.current = streak;

    // Animate bar fill
    barWidth.value = withSpring(progress, { damping: 15, stiffness: 120 });

    // Only animate on actual increment (not initial mount)
    if (streak > prev && prev > 0) {
      // Container pulse
      containerScale.value = withSequence(
        withSpring(1.04, { damping: 8, stiffness: 200 }),
        withSpring(1, { damping: 10, stiffness: 150 }),
      );

      // Fire emoji bounce
      fireScale.value = withSequence(
        withSpring(1.3, { damping: 6, stiffness: 250 }),
        withSpring(1, { damping: 8, stiffness: 150 }),
      );

      // Haptic feedback
      if (Platform.OS !== 'web') {
        if (MILESTONES.includes(streak)) {
          // Milestone reached
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onMilestoneReached?.();
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
    }
  }, [streak]);

  const containerAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: containerScale.value }],
  }));

  const barAnimStyle = useAnimatedStyle(() => ({
    width: `${barWidth.value * 100}%` as any,
  }));

  const fireAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fireScale.value }],
  }));

  return (
    <Animated.View style={[styles.container, containerAnimStyle]}>
      <View style={styles.header}>
        <Animated.Text style={[styles.fireEmoji, fireAnimStyle]}>
          {streak > 0 ? '\uD83D\uDD25' : '\u2744\uFE0F'}
        </Animated.Text>
        <Text style={styles.streakCount}>{streak}</Text>
        <Text style={styles.streakLabel}>day streak</Text>
      </View>

      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, barAnimStyle]} />
      </View>

      <Text style={styles.milestoneText}>
        {daysLeft > 0
          ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''} to ${nextMilestone}-day milestone`
          : 'Milestone reached!'}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFBF0',
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#B45309',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
      web: { boxShadow: '0 2px 8px rgba(180, 83, 9, 0.08)' } as any,
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  fireEmoji: {
    fontSize: 22,
    marginRight: 6,
  },
  streakCount: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a3a52',
    marginRight: 4,
  },
  streakLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  barTrack: {
    height: 8,
    backgroundColor: '#F3E8D0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  barFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 4,
    minWidth: 4,
  },
  milestoneText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#92400E',
  },
});

export default React.memo(StreakProgress);
