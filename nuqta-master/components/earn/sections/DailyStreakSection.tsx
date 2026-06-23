import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { earnStyles as styles } from './styles';

interface DailyStreakSectionProps {
  currentStreak: number;
  hasCheckedInToday: boolean;
  streakBonusMilestones: { day: number; coins: number; completed: boolean; special?: boolean }[];
  navigateTo: (path: string) => void;
}

const DailyStreakSection = React.memo(function DailyStreakSection({
  currentStreak,
  hasCheckedInToday,
  streakBonusMilestones,
  navigateTo,
}: DailyStreakSectionProps) {
  return (
    <View style={styles.section}>
      <LinearGradient
        colors={[colors.tint.orange, colors.errorScale[50]]}
        style={styles.streakCard}
      >
        <View style={styles.streakHeader}>
          <View style={styles.streakIconContainer}>
            <Ionicons name="flame" size={28} color={colors.brand.orange} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.streakTitle}>Daily Rewards</Text>
            <Text style={styles.streakSubtitle}>
              Current Streak: {currentStreak} day{currentStreak !== 1 ? 's' : ''}
              {hasCheckedInToday ? ' \u2713' : ' \u{1F525}'}
            </Text>
          </View>
          {hasCheckedInToday && (
            <View style={{ backgroundColor: colors.tint.greenLight, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.md }}>
              <Text style={{ fontSize: 10, color: Colors.success, fontWeight: '600' }}>You're on fire!</Text>
            </View>
          )}
        </View>

        {/* Streak Progress - top 3 milestones */}
        <View style={styles.streakMilestones}>
          {streakBonusMilestones.slice(0, 3).map((milestone) => (
            <View
              key={milestone.day}
              style={[
                styles.milestoneItem,
                milestone.completed && styles.milestoneCompleted,
              ]}
            >
              <Text style={styles.milestoneDay}>Day {milestone.day}</Text>
              <Text style={[
                styles.milestoneCoins,
                milestone.completed && styles.milestoneCoinsCompleted,
              ]}>
                +{milestone.coins}
              </Text>
            </View>
          ))}
        </View>
        <View style={[styles.streakMilestones, { marginTop: 0 }]}>
          {streakBonusMilestones.slice(3).map((milestone) => (
            <View
              key={milestone.day}
              style={[
                styles.milestoneItem,
                milestone.completed && styles.milestoneCompleted,
              ]}
            >
              <Text style={styles.milestoneDay}>Day {milestone.day}</Text>
              <Text style={[
                styles.milestoneCoins,
                milestone.completed && styles.milestoneCoinsCompleted,
              ]}>
                {milestone.special ? '\u{1F389} ' : ''}+{milestone.coins}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${Math.min((currentStreak / (streakBonusMilestones[streakBonusMilestones.length - 1]?.day || 100)) * 100, 100)}%` }]} />
        </View>

        <Pressable
          style={styles.checkinButton}
          onPress={() => navigateTo('/explore/daily-checkin')}
        >
          <LinearGradient
            colors={hasCheckedInToday ? [colors.successScale[400], colors.successScale[700]] : [colors.brand.orange, colors.error]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.checkinGradient}
          >
            <Ionicons name={hasCheckedInToday ? "checkmark-done-circle" : "checkmark-circle"} size={20} color={Colors.text.inverse} />
            <Text style={styles.checkinText}>
              {hasCheckedInToday ? 'Checked In Today \u2713' : 'Check in Today'}
            </Text>
          </LinearGradient>
        </Pressable>
      </LinearGradient>
    </View>
  );
});

export default DailyStreakSection;
