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

interface ChallengesCardProps {
  totalActive: number;
  completedToday: number;
  topChallenge?: {
    id: string;
    title: string;
    progress: {
      current: number;
      target: number;
      percentage: number;
    };
    reward: number;
  };
  onPress: () => void;
}

const ChallengesCard: React.FC<ChallengesCardProps> = ({
  totalActive,
  completedToday,
  topChallenge,
  onPress,
}) => {
  const gradientColors: readonly [string, string, string] = [colors.lightMustard, colors.brand.goldRich, '#e5b84d'];

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
            <Ionicons name="trophy" size={24} color={COLORS.white} />
          </View>

          {/* Content */}
          <View style={styles.contentContainer}>
            <Text style={styles.cardTitle}>Challenges</Text>
            <Text style={styles.cardSubtitle}>
              {totalActive > 0 ? `${totalActive} active` : 'No challenges'}
            </Text>
          </View>

          {/* Stats Badge */}
          {completedToday > 0 && (
            <View style={styles.badgeContainer}>
              <View style={styles.badge}>
                <Ionicons name="checkmark-circle" size={12} color={COLORS.white} />
                <Text style={styles.badgeText}>{completedToday} done</Text>
              </View>
            </View>
          )}

          {/* Progress Preview */}
          {topChallenge && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.min(topChallenge.progress.percentage, 100)}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                +{topChallenge.reward} coins
              </Text>
            </View>
          )}

          {/* Action */}
          <View style={styles.actionIndicator}>
            <Text style={styles.actionText}>View All</Text>
            <Ionicons name="arrow-forward" size={14} color={COLORS.white} />
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
        shadowColor: colors.lightMustard,
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
    color: COLORS.textDark,
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontSize: 12,
    color: 'rgba(11, 34, 64, 0.7)',
    marginTop: 2,
  },
  badgeContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.white,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textDark,
    marginTop: 4,
  },
  actionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  actionText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textDark,
  },
});

export default React.memo(ChallengesCard);
