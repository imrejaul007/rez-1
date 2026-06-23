// StoreHeroMetrics.tsx - Magicpin-inspired store engagement metrics
import React, { memo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/ui";
import { colors } from '@/constants/theme';
import {
  Colors,
  Spacing,
  Shadows,
  BorderRadius,
  Typography,
} from "@/constants/DesignSystem";

interface StoreHeroMetricsProps {
  visits?: number;
  saveRate?: number;
  responseTime?: string;
  isVerified?: boolean;
  followersCount?: number;
  savingsPercent?: number;
}

// Format large numbers (e.g., 12400 -> "12.4K")
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
};

export default memo(function StoreHeroMetrics({
  visits,
  saveRate,
  responseTime,
  isVerified,
  followersCount,
  savingsPercent,
}: StoreHeroMetricsProps) {
  // Don't render if no metrics available
  const hasAnyMetric = visits || saveRate || responseTime || isVerified || followersCount || savingsPercent;
  if (!hasAnyMetric) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Visits Metric */}
        {visits !== undefined && visits > 0 && (
          <GlassCard
            variant="light"
            intensity={80}
            borderRadius={BorderRadius.xl}
            shadow={true}
            style={styles.metricPill}
          >
            <View style={styles.metricInner}>
              <View style={[styles.iconCircle, { backgroundColor: Colors.primary[50] }]}>
                <Ionicons name="eye-outline" size={14} color={Colors.primary[700]} />
              </View>
              <View>
                <ThemedText style={styles.metricValue}>{formatNumber(visits)}</ThemedText>
                <ThemedText style={styles.metricLabel}>visits</ThemedText>
              </View>
            </View>
          </GlassCard>
        )}

        {/* Followers Metric */}
        {followersCount !== undefined && followersCount > 0 && (
          <GlassCard
            variant="light"
            intensity={80}
            borderRadius={BorderRadius.xl}
            shadow={true}
            style={styles.metricPill}
          >
            <View style={styles.metricInner}>
              <View style={[styles.iconCircle, { backgroundColor: Colors.secondary[50] }]}>
                <Ionicons name="people-outline" size={14} color={Colors.secondary[700]} />
              </View>
              <View>
                <ThemedText style={styles.metricValue}>{formatNumber(followersCount)}</ThemedText>
                <ThemedText style={styles.metricLabel}>followers</ThemedText>
              </View>
            </View>
          </GlassCard>
        )}

        {/* Save/Recommendation Rate */}
        {saveRate !== undefined && saveRate > 0 && (
          <GlassCard
            variant="light"
            intensity={80}
            borderRadius={BorderRadius.xl}
            shadow={true}
            style={styles.metricPill}
          >
            <View style={styles.metricInner}>
              <View style={[styles.iconCircle, { backgroundColor: colors.linen }]}>
                <Ionicons name="thumbs-up-outline" size={14} color={colors.nileBlue} />
              </View>
              <View>
                <ThemedText style={styles.metricValue}>{saveRate}%</ThemedText>
                <ThemedText style={styles.metricLabel}>recommend</ThemedText>
              </View>
            </View>
          </GlassCard>
        )}

        {/* Response Time */}
        {responseTime && (
          <GlassCard
            variant="light"
            intensity={80}
            borderRadius={BorderRadius.xl}
            shadow={true}
            style={styles.metricPill}
          >
            <View style={styles.metricInner}>
              <View style={[styles.iconCircle, { backgroundColor: colors.lavenderMist }]}>
                <Ionicons name="time-outline" size={14} color={colors.nileBlue} />
              </View>
              <View>
                <ThemedText style={styles.metricValue}>{responseTime}</ThemedText>
                <ThemedText style={styles.metricLabel}>response</ThemedText>
              </View>
            </View>
          </GlassCard>
        )}

        {/* Savings Percentage */}
        {savingsPercent !== undefined && savingsPercent > 0 && (
          <GlassCard
            variant="light"
            intensity={80}
            borderRadius={BorderRadius.xl}
            shadow={true}
            style={StyleSheet.flatten([styles.metricPill, styles.savingsPill])}
          >
            <View style={styles.metricInner}>
              <View style={[styles.iconCircle, { backgroundColor: colors.linen }]}>
                <Ionicons name="pricetag" size={14} color={Colors.gold} />
              </View>
              <View>
                <ThemedText style={[styles.metricValue, styles.savingsValue]}>
                  Up to {savingsPercent}%
                </ThemedText>
                <ThemedText style={styles.metricLabel}>savings</ThemedText>
              </View>
            </View>
          </GlassCard>
        )}

        {/* Verified Badge */}
        {isVerified && (
          <GlassCard
            variant="light"
            intensity={80}
            borderRadius={BorderRadius.xl}
            shadow={true}
            style={StyleSheet.flatten([styles.metricPill, styles.verifiedPill])}
          >
            <View style={styles.verifiedInner}>
              <View style={[styles.iconCircle, { backgroundColor: Colors.primary[50] }]}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.primary[600]} />
              </View>
              <ThemedText style={styles.verifiedText}>Verified Store</ThemedText>
            </View>
          </GlassCard>
        )}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.md,
  },
  scrollContent: {
    paddingHorizontal: Spacing.base,
  },
  metricPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minWidth: 100,
    marginRight: Spacing.sm,
  },
  metricInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  metricValue: {
    ...Typography.label,
    color: Colors.text.primary,
    fontWeight: "700",
    fontSize: 14,
  },
  metricLabel: {
    ...Typography.caption,
    color: Colors.gray[500],
    fontSize: 10,
    marginTop: -2,
  },
  savingsPill: {
    borderWidth: 1,
    borderColor: "rgba(255, 200, 87, 0.3)",
  },
  savingsValue: {
    color: colors.lightMustard,
  },
  verifiedPill: {
    borderWidth: 1,
    borderColor: Colors.primary[100],
  },
  verifiedInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  verifiedText: {
    ...Typography.labelSmall,
    color: Colors.primary[700],
    fontWeight: "600",
  },
});
