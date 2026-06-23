// RatingBreakdownSection.tsx - Magicpin-inspired rating breakdown with progress bars
import React, { memo } from "react";
import {
  View,
  StyleSheet,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { triggerImpact } from "@/utils/haptics";
import { colors } from '@/constants/theme';
import {
  Colors,
  Spacing,
  Shadows,
  BorderRadius,
  Typography,
  Gradients,
} from "@/constants/DesignSystem";

export interface RatingCategory {
  label: string;
  score: number; // 0-100
  icon?: string;
}

interface RatingBreakdownSectionProps {
  averageRating: number;
  totalReviews: number;
  categories?: RatingCategory[];
  onSeeAllReviews?: () => void;
}

// Get color based on score
const getScoreColor = (score: number): string => {
  if (score >= 80) return Colors.primary[600];
  if (score >= 60) return colors.lightMustard; // Light Mustard
  if (score >= 40) return colors.brand.sand; // Light Peach shade
  return colors.brand.caramel; // Peach derived
};

// Rating Category Row Component
const RatingCategoryRow = memo(function RatingCategoryRow({
  category,
}: {
  category: RatingCategory;
}) {
  const barColor = getScoreColor(category.score);

  return (
    <View style={styles.categoryRow}>
      {/* Icon and Label */}
      <View style={styles.categoryLabelContainer}>
        {category.icon && (
          <Ionicons
            name={category.icon as any}
            size={14}
            color={Colors.gray[500]}
            style={styles.categoryIcon}
          />
        )}
        <ThemedText style={styles.categoryLabel} numberOfLines={1}>
          {category.label}
        </ThemedText>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <LinearGradient
            colors={[barColor, barColor]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressBarFill, { width: `${category.score}%` }]}
          />
        </View>
      </View>

      {/* Score Percentage */}
      <View style={styles.scoreContainer}>
        <ThemedText style={[styles.scoreText, { color: barColor }]}>
          {category.score}%
        </ThemedText>
      </View>
    </View>
  );
});

export default memo(function RatingBreakdownSection({
  averageRating,
  totalReviews,
  categories,
  onSeeAllReviews,
}: RatingBreakdownSectionProps) {
  // Don't render if no real rating data - no dummy data
  if (!averageRating || !totalReviews || totalReviews === 0) {
    return null;
  }

  const handleSeeAllPress = () => {
    triggerImpact("Light");
    if (onSeeAllReviews) {
      onSeeAllReviews();
    }
  };

  return (
    <View style={styles.container}>
      {/* Section Header with Overall Rating */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {/* Big Rating Display */}
          <View style={styles.ratingCircle}>
            <LinearGradient
              colors={Gradients.primary}
              style={styles.ratingCircleGradient}
            >
              <ThemedText style={styles.ratingNumber}>
                {averageRating.toFixed(1)}
              </ThemedText>
              <View style={styles.starContainer}>
                <Ionicons name="star" size={12} color={colors.background.primary} />
              </View>
            </LinearGradient>
          </View>

          {/* Rating Info */}
          <View style={styles.ratingInfo}>
            <ThemedText style={styles.ratingTitle}>Overall Rating</ThemedText>
            <ThemedText style={styles.ratingSubtitle}>
              Based on {totalReviews.toLocaleString()} reviews
            </ThemedText>
          </View>
        </View>

        {/* See All Button */}
        {onSeeAllReviews && (
          <Pressable
            style={styles.seeAllButton}
            onPress={handleSeeAllPress}
           
          >
            <ThemedText style={styles.seeAllText}>See All</ThemedText>
            <Ionicons name="chevron-forward" size={14} color={Colors.primary[700]} />
          </Pressable>
        )}
      </View>

      {/* Rating Categories - only show if categories provided */}
      {categories && categories.length > 0 && (
        <View style={styles.categoriesContainer}>
          {categories.map((category, index) => (
            <RatingCategoryRow key={index} category={category} />
          ))}
        </View>
      )}

      {/* Bottom Hint */}
      <View style={styles.hintContainer}>
        <Ionicons name="information-circle-outline" size={14} color={Colors.gray[400]} />
        <ThemedText style={styles.hintText}>
          Ratings are based on customer feedback in the last 6 months
        </ThemedText>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.subtle,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  ratingCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    ...Shadows.purpleMedium,
  },
  ratingCircleGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  ratingNumber: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.background.primary,
  },
  starContainer: {
    position: "absolute",
    bottom: 6,
    right: 6,
  },
  ratingInfo: {
    flex: 1,
  },
  ratingTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
  },
  ratingSubtitle: {
    ...Typography.caption,
    color: Colors.gray[500],
    marginTop: 2,
  },
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  seeAllText: {
    ...Typography.labelSmall,
    color: Colors.primary[700],
  },

  // Categories
  categoriesContainer: {
    gap: Spacing.md,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  categoryLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: 110,
    gap: Spacing.xs,
  },
  categoryIcon: {
    width: 14,
  },
  categoryLabel: {
    ...Typography.bodySmall,
    color: Colors.gray[600],
    flex: 1,
  },
  progressBarContainer: {
    flex: 1,
    height: 8,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: Colors.gray[100],
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  scoreContainer: {
    width: 44,
    alignItems: "flex-end",
  },
  scoreText: {
    ...Typography.label,
    fontWeight: "700",
  },

  // Hint
  hintContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[100],
  },
  hintText: {
    ...Typography.caption,
    color: Colors.gray[400],
    flex: 1,
  },
});
