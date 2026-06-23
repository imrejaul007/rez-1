/**
 * PriveHabitLoops - Daily check-in, progress, weekly earnings
 * Habit loop cards for engagement
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, withRepeat, withSequence, interpolate } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { PRIVE_COLORS, PRIVE_SPACING, PRIVE_RADIUS } from './priveTheme';
import { colors } from '@/constants/theme';

interface WeeklyEarningsData {
  thisWeek: number;
  lastWeek: number;
  percentChange: number;
  breakdown: Record<string, number>;
}

interface HabitLoop {
  id: string;
  name: string;
  icon: string;
  completed: boolean;
  progress: number;
  description?: string;
  deepLink?: string;
}

interface PriveHabitLoopsProps {
  isCheckedIn: boolean;
  streak: number;
  weeklyEarnings: WeeklyEarningsData;
  loops?: HabitLoop[];
  allCompleted?: boolean;
  onCheckIn?: () => void;
  onLoopPress?: (loopId: string) => void;
  onEarningsPress?: () => void;
  isLoading?: boolean;
}

// Skeleton shimmer block
const SkeletonBlock: React.FC<{ width: number | string; height: number; borderRadius?: number; style?: any }> = ({
  width, height, borderRadius = 4, style,
}) => {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 800 }),
        withTiming(0.3, { duration: 800 }),
      ),
      -1
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius, backgroundColor: PRIVE_COLORS.border.primary },
        shimmerStyle,
        style,
      ]}
    />
  );
};

// Animated progress bar (uses reanimated for width animation)
const AnimatedProgressBar: React.FC<{ progress: number; completed: boolean }> = ({ progress, completed }) => {
  const widthAnim = useSharedValue(0);

  useEffect(() => {
    widthAnim.value = withTiming(progress, { duration: 600 });
  }, [progress]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${Math.min(Math.max(widthAnim.value, 0), 100)}%`,
  }));

  return (
    <View style={styles.loopProgressBar}>
      <Animated.View
        style={[
          styles.loopProgressFill,
          progressStyle,
          completed && styles.loopProgressFillCompleted,
        ]}
      />
    </View>
  );
};

// Animated checkmark that springs in
const AnimatedCheckmark: React.FC = () => {
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { stiffness: 100, damping: 4 });
  }, []);

  const checkmarkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.loopCheckmark, checkmarkStyle]}>
      <Text style={styles.loopCheckmarkText}>✓</Text>
    </Animated.View>
  );
};

export const PriveHabitLoops: React.FC<PriveHabitLoopsProps> = ({
  isCheckedIn = false,
  streak = 0,
  weeklyEarnings,
  loops = [],
  allCompleted = false,
  onCheckIn,
  onLoopPress,
  onEarningsPress,
  isLoading = false,
}) => {
  const completedLoops = loops.filter(l => l.completed).length;
  const totalLoops = loops.length;

  // Skeleton UI while loading
  if (isLoading) {
    return (
      <View style={styles.container}>
        {/* Check-in skeleton */}
        <View style={styles.checkInCard}>
          <View style={styles.checkInContent}>
            <View style={styles.checkInLeft}>
              <SkeletonBlock width={44} height={44} borderRadius={22} />
              <View>
                <SkeletonBlock width={120} height={16} style={{ marginBottom: 4 }} />
                <SkeletonBlock width={80} height={12} />
              </View>
            </View>
          </View>
        </View>

        {/* Progress skeleton */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <SkeletonBlock width={120} height={14} />
            <SkeletonBlock width={30} height={14} />
          </View>
          <View style={styles.loopsGrid}>
            {[1, 2, 3, 4].map(i => (
              <View key={i} style={styles.loopItem}>
                <SkeletonBlock width={40} height={40} borderRadius={20} />
                <SkeletonBlock width={50} height={10} style={{ marginTop: 6, marginBottom: 4 }} />
                <SkeletonBlock width={32} height={3} borderRadius={2} />
              </View>
            ))}
          </View>
        </View>

        {/* Earnings skeleton */}
        <View style={[styles.earningsCard, { padding: PRIVE_SPACING.lg }]}>
          <View style={styles.earningsContent}>
            <View>
              <SkeletonBlock width={100} height={12} style={{ marginBottom: 6 }} />
              <SkeletonBlock width={60} height={24} />
            </View>
            <SkeletonBlock width={48} height={48} borderRadius={24} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Daily Check-In Card */}
      <Pressable
        style={[styles.checkInCard, isCheckedIn && styles.checkInCardDone]}
        onPress={onCheckIn}
        disabled={isCheckedIn}
       
      >
        <View style={styles.checkInContent}>
          <View style={styles.checkInLeft}>
            <View style={[styles.checkInIcon, isCheckedIn && styles.checkInIconDone]}>
              <Text style={styles.checkInEmoji}>{isCheckedIn ? '✓' : '☀️'}</Text>
            </View>
            <View>
              <Text style={styles.checkInTitle}>
                {isCheckedIn ? 'Checked In!' : 'Daily Check-In'}
              </Text>
              <Text style={styles.checkInSubtitle}>
                {isCheckedIn ? `${streak} day streak` : 'Tap to check in'}
              </Text>
            </View>
          </View>
          {!isCheckedIn && (
            <View style={styles.checkInReward}>
              <Text style={styles.checkInRewardText}>+10</Text>
            </View>
          )}
        </View>
        {isCheckedIn && (
          <View style={styles.streakBadge}>
            <Text style={styles.streakText}>🔥 {streak} days</Text>
          </View>
        )}
      </Pressable>

      {/* Progress Overview */}
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Today's Progress</Text>
          <Text style={styles.progressCount}>{completedLoops}/{totalLoops}</Text>
        </View>
        {loops.length === 0 ? (
          <Text style={styles.emptyLoopsText}>No habits configured</Text>
        ) : (
        <View style={styles.loopsGrid}>
          {loops.map((loop) => (
            <Pressable
              key={loop.id}
              style={[styles.loopItem, loop.completed && styles.loopItemCompleted]}
              onPress={() => onLoopPress?.(loop.id)}
             
              accessibilityLabel={`${loop.name}, ${loop.completed ? 'completed' : loop.description || ''}`}
              accessibilityRole="button"
            >
              <View style={styles.loopIconContainer}>
                <Text style={styles.loopIcon}>{loop.icon}</Text>
                {loop.completed && <AnimatedCheckmark />}
              </View>
              <Text style={styles.loopName}>{loop.name}</Text>
              {loop.description && !loop.completed && (
                <Text style={styles.loopCta} numberOfLines={1}>{loop.description}</Text>
              )}
              <AnimatedProgressBar progress={loop.progress} completed={loop.completed} />
            </Pressable>
          ))}
        </View>
        )}
        {allCompleted && totalLoops > 0 && (
          <View style={styles.completionBanner}>
            <Text style={styles.completionText}>🎉 All loops complete! +25 bonus coins</Text>
          </View>
        )}
      </View>

      {/* Weekly Earnings Card */}
      <Pressable
        style={styles.earningsCard}
       
        onPress={onEarningsPress}
        accessibilityLabel={`Weekly earnings ${weeklyEarnings.thisWeek} coins, tap to view details`}
        accessibilityRole="button"
      >
        <LinearGradient
          colors={[PRIVE_COLORS.transparent.gold15, PRIVE_COLORS.transparent.gold10]}
          style={styles.earningsGradient}
        >
          <View style={styles.earningsContent}>
            <View>
              <Text style={styles.earningsLabel}>Weekly Earnings</Text>
              <Text style={styles.earningsValue}>+{weeklyEarnings.thisWeek.toLocaleString()}</Text>
              {weeklyEarnings.percentChange !== 0 && (
                <Text style={[
                  styles.earningsTrend,
                  { color: weeklyEarnings.percentChange > 0 ? colors.brand.emerald : '#F44336' },
                ]}>
                  {weeklyEarnings.percentChange > 0 ? '↑' : '↓'} {Math.abs(weeklyEarnings.percentChange)}% from last week
                </Text>
              )}
            </View>
            <View style={styles.earningsIcon}>
              <Text style={styles.earningsEmoji}>📈</Text>
            </View>
          </View>
        </LinearGradient>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: PRIVE_SPACING.xl,
    paddingTop: PRIVE_SPACING.lg,
    gap: PRIVE_SPACING.md,
  },
  // Check-In Card
  checkInCard: {
    backgroundColor: PRIVE_COLORS.background.card,
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.lg,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
  },
  checkInCardDone: {
    borderColor: PRIVE_COLORS.status.success,
    backgroundColor: 'rgba(76, 175, 80, 0.05)',
  },
  checkInContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkInLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PRIVE_SPACING.md,
  },
  checkInIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PRIVE_COLORS.transparent.gold15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkInIconDone: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
  },
  checkInEmoji: {
    fontSize: 20,
  },
  checkInTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
  },
  checkInSubtitle: {
    fontSize: 12,
    color: PRIVE_COLORS.text.tertiary,
    marginTop: 2,
  },
  checkInReward: {
    backgroundColor: PRIVE_COLORS.transparent.gold20,
    paddingHorizontal: PRIVE_SPACING.md,
    paddingVertical: PRIVE_SPACING.sm,
    borderRadius: PRIVE_RADIUS.md,
  },
  checkInRewardText: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIVE_COLORS.gold.primary,
  },
  streakBadge: {
    marginTop: PRIVE_SPACING.sm,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    paddingHorizontal: PRIVE_SPACING.md,
    paddingVertical: PRIVE_SPACING.xs,
    borderRadius: PRIVE_RADIUS.full,
  },
  streakText: {
    fontSize: 12,
    color: '#FF9800',
  },
  // Progress Card
  progressCard: {
    backgroundColor: PRIVE_COLORS.background.card,
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.lg,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: PRIVE_SPACING.md,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
  },
  progressCount: {
    fontSize: 14,
    color: PRIVE_COLORS.gold.primary,
  },
  emptyLoopsText: {
    fontSize: 13,
    color: PRIVE_COLORS.text.tertiary,
    textAlign: 'center',
    paddingVertical: PRIVE_SPACING.lg,
  },
  loopsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  loopItem: {
    alignItems: 'center',
    flex: 1,
    padding: PRIVE_SPACING.sm,
  },
  loopItemCompleted: {
    opacity: 0.8,
  },
  loopIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PRIVE_COLORS.transparent.white10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: PRIVE_SPACING.xs,
  },
  loopIcon: {
    fontSize: 18,
  },
  loopCheckmark: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: PRIVE_COLORS.status.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loopCheckmarkText: {
    fontSize: 10,
    color: colors.background.primary,
    fontWeight: 'bold',
  },
  loopName: {
    fontSize: 10,
    color: PRIVE_COLORS.text.secondary,
    marginBottom: 2,
  },
  loopCta: {
    fontSize: 8,
    color: PRIVE_COLORS.text.tertiary,
    marginBottom: 2,
    textAlign: 'center',
  },
  loopProgressBar: {
    width: '80%',
    height: 3,
    backgroundColor: PRIVE_COLORS.border.primary,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 2,
  },
  loopProgressFill: {
    height: '100%',
    backgroundColor: PRIVE_COLORS.gold.primary,
    borderRadius: 2,
  },
  loopProgressFillCompleted: {
    backgroundColor: PRIVE_COLORS.status.success,
  },
  completionBanner: {
    marginTop: PRIVE_SPACING.md,
    paddingVertical: PRIVE_SPACING.sm,
    paddingHorizontal: PRIVE_SPACING.md,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: PRIVE_RADIUS.md,
    alignItems: 'center',
  },
  completionText: {
    fontSize: 12,
    fontWeight: '600',
    color: PRIVE_COLORS.status.success,
  },
  // Earnings Card
  earningsCard: {
    borderRadius: PRIVE_RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.goldMuted,
  },
  earningsGradient: {
    padding: PRIVE_SPACING.lg,
  },
  earningsContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earningsLabel: {
    fontSize: 12,
    color: PRIVE_COLORS.text.secondary,
    marginBottom: PRIVE_SPACING.xs,
  },
  earningsValue: {
    fontSize: 24,
    fontWeight: '300',
    color: PRIVE_COLORS.gold.primary,
  },
  earningsTrend: {
    fontSize: 11,
    marginTop: 4,
  },
  earningsIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: PRIVE_COLORS.transparent.gold20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  earningsEmoji: {
    fontSize: 24,
  },
});

export default React.memo(PriveHabitLoops);
