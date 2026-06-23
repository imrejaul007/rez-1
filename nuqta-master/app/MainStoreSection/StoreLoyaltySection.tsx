import { withErrorBoundary } from '@/utils/withErrorBoundary';
// StoreLoyaltySection.tsx - Loyalty progress section
import React from "react";
import {
  View,
  Pressable,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { triggerImpact } from "@/utils/haptics";
import { ThemedText } from "@/components/ThemedText";
import { colors } from '@/constants/theme';
import {
  Colors,
  Spacing,
  BorderRadius,
} from "@/constants/DesignSystem";

export interface StoreLoyaltySectionProps {
  visitsCompleted?: number;
  totalVisitsRequired?: number;
  nextReward?: string;
  onViewDetails?: () => void;
}

function StoreLoyaltySection({
  visitsCompleted = 4,
  totalVisitsRequired = 5,
  nextReward = "Free Coffee",
  onViewDetails,
}: StoreLoyaltySectionProps) {
  const handleViewDetails = () => {
    triggerImpact('Light');
    if (onViewDetails) onViewDetails();
  };

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <ThemedText style={styles.sectionTitle}>Your loyalty with this store</ThemedText>

      {/* Loyalty Card */}
      <LinearGradient
        colors={["#FF9500", "#FF7A00"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.loyaltyCard}
      >
        {/* Progress Info */}
        <View style={styles.progressSection}>
          <ThemedText style={styles.progressLabel}>Visits completed</ThemedText>
          <ThemedText style={styles.progressValue}>
            {visitsCompleted} / {totalVisitsRequired}
          </ThemedText>
        </View>

        {/* Coffee Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="cafe" size={40} color="rgba(255, 255, 255, 0.9)" />
        </View>

        {/* Next Reward */}
        <View style={styles.nextRewardRow}>
          <Ionicons name="gift" size={18} color={colors.background.primary} />
          <ThemedText style={styles.nextRewardText}>
            Next visit → {nextReward}
          </ThemedText>
          <Ionicons name="cafe-outline" size={18} color="rgba(255, 255, 255, 0.8)" />
        </View>

        {/* View Details Button */}
        <Pressable
          style={styles.viewDetailsButton}
         
          onPress={handleViewDetails}
          accessibilityRole="button"
          accessibilityLabel="View Loyalty Details"
        >
          <ThemedText style={styles.viewDetailsText}>View Loyalty Details</ThemedText>
        </Pressable>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  loyaltyCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    position: "relative",
    overflow: "hidden",
  },
  progressSection: {
    marginBottom: Spacing.sm,
  },
  progressLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 4,
  },
  progressValue: {
    fontSize: 36,
    fontWeight: "800",
    color: colors.background.primary,
  },
  iconContainer: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    opacity: 0.9,
  },
  nextRewardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  nextRewardText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.background.primary,
  },
  viewDetailsButton: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  viewDetailsText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FF9500",
  },
});

export default withErrorBoundary(StoreLoyaltySection, 'MainStoreSectionStoreLoyaltySection');
