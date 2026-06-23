import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

const COLORS = {
  white: colors.background.primary,
  textDark: colors.nileBlue,
};

interface StreakRewardsCardProps {
  currentStreak: number;
  nextMilestone: { day: number; coins: number };
  todayCheckedIn: boolean;
  onPress: () => void;
}

const StreakRewardsCard: React.FC<StreakRewardsCardProps> = ({
  currentStreak,
  nextMilestone,
  todayCheckedIn,
  onPress,
}) => {
  const gradientColors: readonly [string, string, string] = [colors.nileBlue, '#243f55', '#2d4a5f'];
  const daysToMilestone = nextMilestone.day - currentStreak;

  return (
    <Pressable
     
      onPress={onPress}
      style={styles.cardContainer}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        <View style={styles.glassOverlay}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="flame" size={24} color={COLORS.white} />
          </View>

          {/* Content */}
          <View style={styles.contentContainer}>
            <Text style={styles.cardTitle}>Streak Rewards</Text>
            <Text style={styles.cardSubtitle}>
              {currentStreak > 0 ? `${currentStreak} day streak!` : 'Start your streak'}
            </Text>
          </View>

          {/* Streak Count Badge */}
          <View style={styles.badgeContainer}>
            <View style={styles.streakBadge}>
              <Ionicons name="flame" size={14} color={colors.lightMustard} />
              <Text style={styles.streakCount}>{currentStreak}</Text>
            </View>
          </View>

          {/* Milestone Progress */}
          <View style={styles.milestoneContainer}>
            <Text style={styles.milestoneText}>
              {daysToMilestone > 0
                ? `${daysToMilestone} days to +${nextMilestone.coins} coins`
                : 'Milestone reached!'}
            </Text>
          </View>

          {/* Check-in Action */}
          <View style={[styles.actionIndicator, todayCheckedIn && styles.actionCompleted]}>
            {todayCheckedIn ? (
              <>
                <Ionicons name="checkmark-circle" size={14} color={COLORS.white} />
                <Text style={styles.actionText}>Checked In</Text>
              </>
            ) : (
              <>
                <Text style={styles.actionText}>Check In</Text>
                <Ionicons name="add-circle" size={14} color={COLORS.white} />
              </>
            )}
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.nileBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  cardGradient: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  glassOverlay: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    minHeight: 160,
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  contentContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: -0.2,
    ...Platform.select({
      ios: {
        textShadowColor: 'rgba(0, 0, 0, 0.1)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      },
      android: {
        textShadowColor: 'rgba(0, 0, 0, 0.1)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      },
      web: {
        textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  cardSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  badgeContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  streakCount: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  milestoneContainer: {
    marginTop: 4,
  },
  milestoneText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  actionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  actionCompleted: {
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  actionText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default React.memo(StreakRewardsCard);
