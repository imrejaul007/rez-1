import { withErrorBoundary } from '@/utils/withErrorBoundary';
// UserLoyaltyCard.tsx - User's loyalty progress with a store
import React from "react";
import {
  View,
  Pressable,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { colors } from '@/constants/theme';

interface LoyaltyReward {
  visitsRequired: number;
  reward: string;
  icon?: string;
}

interface UserLoyaltyCardProps {
  visitsCompleted: number;
  totalVisitsRequired: number;
  nextReward?: string;
  rewardIcon?: string;
  onViewDetails?: () => void;
}

function UserLoyaltyCard({
  visitsCompleted = 0,
  totalVisitsRequired = 5,
  nextReward = "Free Coffee",
  rewardIcon = "cafe",
  onViewDetails,
}: UserLoyaltyCardProps) {
  const progress = Math.min(visitsCompleted / totalVisitsRequired, 1);
  const visitsRemaining = Math.max(totalVisitsRequired - visitsCompleted, 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <ThemedText style={styles.headerTitle}>Your loyalty with this store</ThemedText>

      {/* Loyalty Card */}
      <LinearGradient
        colors={[colors.lightMustard, colors.brand.goldRich]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.cardContent}>
          {/* Left Side - Progress Info */}
          <View style={styles.leftContent}>
            <ThemedText style={styles.visitsLabel}>Visits completed</ThemedText>
            <ThemedText style={styles.visitsCount}>
              {visitsCompleted} / {totalVisitsRequired}
            </ThemedText>

            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
              </View>
            </View>

            {/* Next Reward */}
            <View style={styles.rewardRow}>
              <Ionicons name="gift" size={16} color={colors.background.primary} />
              <ThemedText style={styles.rewardText}>
                {visitsRemaining > 0
                  ? `${visitsRemaining} more ${visitsRemaining === 1 ? 'visit' : 'visits'} → ${nextReward}`
                  : `Claim your ${nextReward}!`}
              </ThemedText>
              <ThemedText style={styles.rewardEmoji}>
                {rewardIcon === 'cafe' ? '☕' : rewardIcon === 'gift' ? '🎁' : '🎉'}
              </ThemedText>
            </View>
          </View>

          {/* Right Side - Icon */}
          <View style={styles.rightContent}>
            <View style={styles.iconCircle}>
              <Ionicons
                name={rewardIcon as any || "cafe"}
                size={28}
                color={colors.nileBlue}
              />
            </View>
          </View>
        </View>

        {/* View Details Button */}
        <Pressable
          style={styles.detailsButton}
          onPress={onViewDetails}
         
        >
          <ThemedText style={styles.detailsButtonText}>View Loyalty Details</ThemedText>
        </Pressable>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.nileBlue,
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    overflow: "hidden",
  },
  cardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  leftContent: {
    flex: 1,
  },
  visitsLabel: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500",
    marginBottom: 4,
  },
  visitsCount: {
    fontSize: 36,
    fontWeight: "800",
    color: colors.background.primary,
    letterSpacing: -1,
    marginBottom: 12,
  },
  progressBarContainer: {
    marginBottom: 12,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: colors.background.primary,
    borderRadius: 4,
  },
  rewardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rewardText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.background.primary,
    flex: 1,
  },
  rewardEmoji: {
    fontSize: 18,
  },
  rightContent: {
    justifyContent: "flex-start",
    paddingLeft: 16,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.background.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  detailsButton: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },
  detailsButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.nileBlue,
  },
});

export default withErrorBoundary(UserLoyaltyCard, 'MainStoreSectionUserLoyaltyCard');
