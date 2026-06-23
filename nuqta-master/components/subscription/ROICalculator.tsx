// ROI Calculator Component
// Displays return on investment calculations for subscription

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import {
  SUBSCRIPTION_COLORS,
  SUBSCRIPTION_SPACING,
  SUBSCRIPTION_BORDER_RADIUS,
  SUBSCRIPTION_SHADOW,
} from '@/styles/subscriptionStyles';
import { useGetCurrencySymbol } from '@/stores/selectors';

interface ROICalculatorProps {
  subscriptionCost: number;
  totalSavings: number;
  showDetails?: boolean;
  currency?: string;
}

function ROICalculator({
  subscriptionCost,
  totalSavings,
  showDetails = true,
  currency,
}: ROICalculatorProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const effectiveCurrency = currency ?? getCurrencySymbol();
  const [expanded, setExpanded] = useState(false);
  const animatedHeight = useSharedValue(0);

  const netSavings = totalSavings - subscriptionCost;
  const roiPercentage =
    subscriptionCost > 0 ? Math.round((netSavings / subscriptionCost) * 100) : 0;
  const breakEvenMonths =
    subscriptionCost > 0 ? Math.ceil(subscriptionCost / (totalSavings / 12)) : 0;

  const toggleExpanded = () => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    animatedHeight.value = withTiming(newExpanded ? 200 : 0, { duration: 300 });
  };

  const heightAnimStyle = useAnimatedStyle(() => ({
    height: animatedHeight.value,
    overflow: 'hidden' as const,
  }));

  const containerWidth = Dimensions.get('window').width - SUBSCRIPTION_SPACING.xl * 2;
  const progressPercentage = Math.min((totalSavings / (subscriptionCost * 2)) * 100, 100);

  return (
    <View style={styles.container}>
      <View style={styles.roiCard}>
        <View style={styles.roiHeader}>
          <ThemedText style={styles.roiTitle}>Return on Investment</ThemedText>
          {showDetails && (
            <Pressable onPress={toggleExpanded}>
              <Ionicons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={24}
                color={SUBSCRIPTION_COLORS.purple}
              />
            </Pressable>
          )}
        </View>

        <View style={styles.roiContent}>
          {/* Main ROI Display */}
          <View style={styles.mainROISection}>
            <View style={styles.roiMetric}>
              <ThemedText style={styles.metricLabel}>Subscription Cost</ThemedText>
              <ThemedText style={styles.metricValue}>
                {effectiveCurrency}{subscriptionCost}
              </ThemedText>
            </View>

            <View style={styles.divider} />

            <View style={styles.roiMetric}>
              <ThemedText style={styles.metricLabel}>Total Savings</ThemedText>
              <ThemedText style={[styles.metricValue, { color: SUBSCRIPTION_COLORS.success }]}>
                {effectiveCurrency}{totalSavings}
              </ThemedText>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progressPercentage}%`,
                    backgroundColor:
                      progressPercentage >= 100
                        ? SUBSCRIPTION_COLORS.success
                        : SUBSCRIPTION_COLORS.purple,
                  },
                ]}
              />
            </View>
            <ThemedText style={styles.progressLabel}>
              {progressPercentage.toFixed(0)}% of target reached
            </ThemedText>
          </View>

          {/* Net Savings */}
          <View style={styles.netSavingsSection}>
            <View
              style={[
                styles.netSavingsBadge,
                {
                  backgroundColor:
                    netSavings >= 0
                      ? `${SUBSCRIPTION_COLORS.success}20`
                      : `${SUBSCRIPTION_COLORS.error}20`,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.netSavingsLabel,
                  {
                    color: netSavings >= 0 ? SUBSCRIPTION_COLORS.success : SUBSCRIPTION_COLORS.error,
                  },
                ]}
              >
                Net Savings: {effectiveCurrency}{netSavings}
              </ThemedText>
              <ThemedText
                style={[
                  styles.roiPercentage,
                  {
                    color: netSavings >= 0 ? SUBSCRIPTION_COLORS.success : SUBSCRIPTION_COLORS.error,
                  },
                ]}
              >
                {roiPercentage}% ROI
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Expandable Details */}
        {showDetails && (
          <Animated.View style={[styles.detailsSection, heightAnimStyle]}>
            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={SUBSCRIPTION_COLORS.purple}
                />
              </View>
              <View style={styles.detailContent}>
                <ThemedText style={styles.detailLabel}>Break-even Period</ThemedText>
                <ThemedText style={styles.detailValue}>
                  {breakEvenMonths} month{breakEvenMonths !== 1 ? 's' : ''}
                </ThemedText>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <Ionicons
                  name="trending-up-outline"
                  size={20}
                  color={SUBSCRIPTION_COLORS.success}
                />
              </View>
              <View style={styles.detailContent}>
                <ThemedText style={styles.detailLabel}>Monthly Average Savings</ThemedText>
                <ThemedText style={styles.detailValue}>
                  {effectiveCurrency}{Math.round(totalSavings / 12)}
                </ThemedText>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color={SUBSCRIPTION_COLORS.success}
                />
              </View>
              <View style={styles.detailContent}>
                <ThemedText style={styles.detailLabel}>Annual Subscription Cost</ThemedText>
                <ThemedText style={styles.detailValue}>
                  {effectiveCurrency}{subscriptionCost * 12}
                </ThemedText>
              </View>
            </View>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: SUBSCRIPTION_SPACING.lg,
  },
  roiCard: {
    backgroundColor: SUBSCRIPTION_COLORS.white,
    borderRadius: SUBSCRIPTION_BORDER_RADIUS.lg,
    padding: SUBSCRIPTION_SPACING.lg,
    ...SUBSCRIPTION_SHADOW.small,
  },
  roiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SUBSCRIPTION_SPACING.lg,
  },
  roiTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: SUBSCRIPTION_COLORS.text,
  },
  roiContent: {
    gap: SUBSCRIPTION_SPACING.lg,
  },
  mainROISection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: SUBSCRIPTION_SPACING.md,
  },
  roiMetric: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    color: SUBSCRIPTION_COLORS.textSecondary,
    marginBottom: SUBSCRIPTION_SPACING.xs,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: SUBSCRIPTION_COLORS.text,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: SUBSCRIPTION_COLORS.border,
    marginHorizontal: SUBSCRIPTION_SPACING.md,
  },
  progressSection: {
    gap: SUBSCRIPTION_SPACING.md,
  },
  progressBar: {
    height: 8,
    backgroundColor: SUBSCRIPTION_COLORS.border,
    borderRadius: SUBSCRIPTION_BORDER_RADIUS.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: SUBSCRIPTION_BORDER_RADIUS.full,
  },
  progressLabel: {
    fontSize: 12,
    color: SUBSCRIPTION_COLORS.textSecondary,
    textAlign: 'center',
  },
  netSavingsSection: {
    marginTop: SUBSCRIPTION_SPACING.md,
  },
  netSavingsBadge: {
    padding: SUBSCRIPTION_SPACING.lg,
    borderRadius: SUBSCRIPTION_BORDER_RADIUS.md,
    alignItems: 'center',
  },
  netSavingsLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: SUBSCRIPTION_SPACING.xs,
  },
  roiPercentage: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  detailsSection: {
    borderTopWidth: 1,
    borderTopColor: SUBSCRIPTION_COLORS.border,
    marginTop: SUBSCRIPTION_SPACING.lg,
    paddingTop: SUBSCRIPTION_SPACING.lg,
    gap: SUBSCRIPTION_SPACING.lg,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SUBSCRIPTION_SPACING.md,
  },
  detailIconContainer: {
    width: 40,
    height: 40,
    borderRadius: SUBSCRIPTION_BORDER_RADIUS.full,
    backgroundColor: `${SUBSCRIPTION_COLORS.purple}10`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: SUBSCRIPTION_COLORS.textSecondary,
    marginBottom: SUBSCRIPTION_SPACING.xs,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: SUBSCRIPTION_COLORS.text,
  },
});

export default React.memo(ROICalculator);
