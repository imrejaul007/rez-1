// AIReviewSummary.tsx - AI-generated review summary (Magicpin-inspired)
import React, { memo } from "react";
import {
  View,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { colors } from '@/constants/theme';
import {
  Colors,
  Spacing,
  Shadows,
  BorderRadius,
  Typography,
} from "@/constants/DesignSystem";

interface AIReviewSummaryProps {
  summary?: string[];
  positiveHighlights?: string[];
  negativeHighlights?: string[];
  basedOnReviews: number;
}

export default memo(function AIReviewSummary({
  summary,
  positiveHighlights,
  negativeHighlights,
  basedOnReviews,
}: AIReviewSummaryProps) {
  // Don't render if no real AI summary data - no dummy data
  if (!summary || summary.length === 0 || !basedOnReviews || basedOnReviews === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* AI Header Badge */}
      <View style={styles.header}>
        <View style={styles.aiBadge}>
          <LinearGradient
            colors={[colors.nileBlue, "#243f55"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.aiBadgeGradient}
          >
            <Ionicons name="sparkles" size={14} color={colors.background.primary} />
            <ThemedText style={styles.aiBadgeText}>AI Summary</ThemedText>
          </LinearGradient>
        </View>
        <ThemedText style={styles.basedOnText}>
          Based on {basedOnReviews.toLocaleString()} reviews
        </ThemedText>
      </View>

      {/* Summary Points */}
      <View style={styles.summaryContainer}>
        {summary.map((point, index) => (
          <View key={index} style={styles.summaryRow}>
            <View style={styles.bulletPoint}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.primary[600]} />
            </View>
            <ThemedText style={styles.summaryText}>{point}</ThemedText>
          </View>
        ))}
      </View>

      {/* Highlights Section */}
      <View style={styles.highlightsContainer}>
        {/* Positive Highlights */}
        {positiveHighlights && positiveHighlights.length > 0 && (
          <View style={styles.highlightSection}>
            <View style={styles.highlightHeader}>
              <Ionicons name="thumbs-up" size={14} color={Colors.primary[600]} />
              <ThemedText style={styles.highlightTitle}>What customers love</ThemedText>
            </View>
            <View style={styles.tagsContainer}>
              {positiveHighlights.slice(0, 4).map((highlight, index) => (
                <View key={index} style={styles.positiveTag}>
                  <ThemedText style={styles.positiveTagText}>{highlight}</ThemedText>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Negative Highlights (if any) */}
        {negativeHighlights && negativeHighlights.length > 0 && (
          <View style={styles.highlightSection}>
            <View style={styles.highlightHeader}>
              <Ionicons name="alert-circle" size={14} color={colors.lightMustard} />
              <ThemedText style={styles.highlightTitle}>Areas for improvement</ThemedText>
            </View>
            <View style={styles.tagsContainer}>
              {negativeHighlights.slice(0, 3).map((highlight, index) => (
                <View key={index} style={styles.negativeTag}>
                  <ThemedText style={styles.negativeTagText}>{highlight}</ThemedText>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Ionicons name="information-circle-outline" size={12} color={Colors.gray[400]} />
        <ThemedText style={styles.disclaimerText}>
          AI-generated summary from verified customer reviews
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
    borderWidth: 1,
    borderColor: "rgba(26, 58, 82, 0.15)",
    ...Shadows.subtle,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  aiBadge: {
    borderRadius: BorderRadius.full,
    overflow: "hidden",
  },
  aiBadgeGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  aiBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.background.primary,
  },
  basedOnText: {
    ...Typography.caption,
    color: Colors.gray[400],
  },

  // Summary
  summaryContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  bulletPoint: {
    marginTop: 2,
  },
  summaryText: {
    ...Typography.body,
    color: Colors.text.secondary,
    flex: 1,
    lineHeight: 20,
  },

  // Highlights
  highlightsContainer: {
    gap: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[100],
  },
  highlightSection: {
    gap: Spacing.sm,
  },
  highlightHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  highlightTitle: {
    ...Typography.labelSmall,
    color: Colors.gray[600],
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  positiveTag: {
    backgroundColor: Colors.primary[50],
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.primary[100],
  },
  positiveTagText: {
    ...Typography.caption,
    color: Colors.primary[700],
    fontWeight: "600",
  },
  negativeTag: {
    backgroundColor: colors.linen,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: colors.lightMustard,
  },
  negativeTagText: {
    ...Typography.caption,
    color: colors.nileBlue,
    fontWeight: "600",
  },

  // Disclaimer
  disclaimer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
  },
  disclaimerText: {
    fontSize: 10,
    color: Colors.gray[400],
  },
});
