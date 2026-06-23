/**
 * PartnerCard Component
 *
 * Extracted from app/(tabs)/index.tsx (lines 561-597)
 * Displays partner program card with level and points
 *
 * @component
 */

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { colors } from '@/constants/theme';

/**
 * PartnerCard Props Interface
 */
export interface PartnerCardProps {
  /** User's current points */
  points: number;
  /** Partner level (e.g., 'Level 1', 'Level 2') */
  level?: string;
  /** Callback when card is pressed */
  onPress: () => void;
  /** Custom card styles */
  style?: any;
}

/**
 * PartnerCard Component
 *
 * Displays partner program information including:
 * - Partner icon and level
 * - Points earned
 * - Chevron navigation indicator
 */
export const PartnerCard: React.FC<PartnerCardProps> = ({
  points,
  level = 'Level 1',
  onPress,
  style,
}) => {
  return (
    <Pressable
      style={[styles.partnerCard, style]}
      onPress={onPress}
     
      accessibilityLabel={`Partner ${level}: ${points} points earned`}
      accessibilityRole="button"
      accessibilityHint="Double tap to view partner program details and rewards"
    >
      {/* Partner Info Section */}
      <View style={styles.partnerInfo}>
        <View style={styles.partnerIcon}>
          <Ionicons name="star" size={20} color={colors.lightMustard} />
        </View>
        <View>
          <ThemedText style={styles.partnerLevel}>Partner</ThemedText>
          <ThemedText style={styles.level}>{level}</ThemedText>
        </View>
      </View>

      {/* Partner Stats Section */}
      <View style={styles.partnerStats}>
        <View style={styles.stat}>
          <ThemedText style={styles.statNumber}>{points || 0}</ThemedText>
          <ThemedText style={styles.statLabel}>Points</ThemedText>
        </View>

        <View style={styles.progressDot} />

        <View style={styles.stat}>
          <ThemedText style={styles.statNumber}>{level}</ThemedText>
          <ThemedText style={styles.statLabel}>Partner</ThemedText>
        </View>
      </View>

      {/* Chevron Arrow */}
      <View style={styles.partnerArrow}>
        <Ionicons name="chevron-forward" size={20} color={colors.lightMustard} />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  partnerCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 3,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  partnerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  partnerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  partnerLevel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.darkGray,
  },
  level: {
    fontSize: 12,
    color: colors.midGray,
  },
  partnerStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    alignItems: 'center',
    marginHorizontal: 8,
  },
  statNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.darkGray,
  },
  statLabel: {
    fontSize: 10,
    color: colors.midGray,
  },
  progressDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.lightMustard,
    marginHorizontal: 6,
  },
  partnerArrow: {
    padding: 4,
    marginLeft: 8,
  },
});

export default React.memo(PartnerCard);
