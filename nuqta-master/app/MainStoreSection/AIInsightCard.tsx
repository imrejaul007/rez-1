import { withErrorBoundary } from '@/utils/withErrorBoundary';
// AIInsightCard.tsx - AI-powered savings insight card
import { colors } from '@/constants/theme';
import React from "react";
import {
  View,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import {
  Spacing,
  BorderRadius,
} from "@/constants/DesignSystem";

export interface AIInsightCardProps {
  insightText?: string;
  bestTimeToVisit?: string;
}

function AIInsightCard({
  insightText = "You usually save more here on weekends",
  bestTimeToVisit = "7-9pm",
}: AIInsightCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* AI Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="sparkles" size={24} color="#9B59B6" />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <ThemedText style={styles.title}>AI Insight</ThemedText>
          <ThemedText style={styles.insightText}>{insightText}</ThemedText>
          {bestTimeToVisit && (
            <ThemedText style={styles.bestTimeText}>
              Best time to visit: {bestTimeToVisit}
            </ThemedText>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "rgba(155, 89, 182, 0.08)",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(155, 89, 182, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#9B59B6",
    marginBottom: 4,
  },
  insightText: {
    fontSize: 14,
    color: "#333333",
    lineHeight: 20,
  },
  bestTimeText: {
    fontSize: 13,
    color: colors.midGray,
    marginTop: 6,
    fontWeight: "500",
  },
});

export default withErrorBoundary(AIInsightCard, 'MainStoreSectionAIInsightCard');
