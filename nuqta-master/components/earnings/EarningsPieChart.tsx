// Earnings Pie Chart Component
// Visualizes earnings breakdown by category

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { EarningsBreakdown } from '@/services/earningsApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

interface EarningsPieChartProps {
  breakdown: EarningsBreakdown;
  size?: number;
}

interface ChartSegment {
  label: string;
  value: number;
  color: string;
  percentage: number;
}

const EarningsPieChart: React.FC<EarningsPieChartProps> = ({
  breakdown,
  size = 200,
}) => {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const radius = size / 2;
  const strokeWidth = 30;
  const innerRadius = radius - strokeWidth / 2;
  const circumference = 2 * Math.PI * innerRadius;

  // Create chart segments from breakdown (items have .amount and .count)
  const segments: ChartSegment[] = [
    { label: 'Videos', value: breakdown.videos.amount, color: colors.brand.pink,
      percentage: breakdown.total > 0 ? (breakdown.videos.amount / breakdown.total) * 100 : 0 },
    { label: 'Projects', value: breakdown.projects.amount, color: colors.brand.purpleLight,
      percentage: breakdown.total > 0 ? (breakdown.projects.amount / breakdown.total) * 100 : 0 },
    { label: 'Referrals', value: breakdown.referrals.amount, color: colors.brand.amberDeep,
      percentage: breakdown.total > 0 ? (breakdown.referrals.amount / breakdown.total) * 100 : 0 },
    { label: 'Cashback', value: breakdown.cashback.amount, color: colors.warningScale[400],
      percentage: breakdown.total > 0 ? (breakdown.cashback.amount / breakdown.total) * 100 : 0 },
    { label: 'Social Media', value: breakdown.socialMedia.amount, color: colors.infoScale[400],
      percentage: breakdown.total > 0 ? (breakdown.socialMedia.amount / breakdown.total) * 100 : 0 },
    { label: 'Games', value: breakdown.games.amount, color: colors.successScale[400],
      percentage: breakdown.total > 0 ? (breakdown.games.amount / breakdown.total) * 100 : 0 },
    { label: 'Daily Check-in', value: breakdown.dailyCheckIn.amount, color: colors.brand.cyan,
      percentage: breakdown.total > 0 ? (breakdown.dailyCheckIn.amount / breakdown.total) * 100 : 0 },
    { label: 'Social Impact', value: breakdown.socialImpact?.amount || 0, color: colors.brand.pink,
      percentage: breakdown.total > 0 ? ((breakdown.socialImpact?.amount || 0) / breakdown.total) * 100 : 0 },
    { label: 'Programs', value: breakdown.programs?.amount || 0, color: colors.brand.purple,
      percentage: breakdown.total > 0 ? ((breakdown.programs?.amount || 0) / breakdown.total) * 100 : 0 },
    { label: 'Events', value: breakdown.events?.amount || 0, color: colors.brand.purpleMedium,
      percentage: breakdown.total > 0 ? ((breakdown.events?.amount || 0) / breakdown.total) * 100 : 0 },
    { label: 'Bonus', value: breakdown.bonus.amount, color: colors.error,
      percentage: breakdown.total > 0 ? (breakdown.bonus.amount / breakdown.total) * 100 : 0 },
  ].filter((segment) => segment.value > 0); // Only show segments with values

  // Calculate stroke dash offsets for each segment
  let currentOffset = 0;
  const segmentsWithOffsets = segments.map((segment) => {
    const segmentLength = (segment.percentage / 100) * circumference;
    const offset = currentOffset;
    currentOffset += segmentLength;

    return {
      ...segment,
      strokeDasharray: `${segmentLength} ${circumference - segmentLength}`,
      strokeDashoffset: -offset,
    };
  });

  if (breakdown.total === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No earnings data available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.chartContainer}>
        <Svg width={size} height={size}>
          <G rotation="-90" origin={`${radius}, ${radius}`}>
            {segmentsWithOffsets.map((segment, index) => (
              <Circle
                key={`segment-${index}`}
                cx={radius}
                cy={radius}
                r={innerRadius}
                stroke={segment.color}
                strokeWidth={strokeWidth}
                strokeDasharray={segment.strokeDasharray}
                strokeDashoffset={segment.strokeDashoffset}
                fill="transparent"
                strokeLinecap="round"
              />
            ))}
          </G>
        </Svg>

        {/* Center label */}
        <View style={styles.centerLabel}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{currencySymbol}{breakdown.total.toFixed(2)}</Text>
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {segments.map((segment, index) => (
          <View key={`legend-${index}`} style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: segment.color }]} />
            <Text style={styles.legendLabel}>{segment.label}</Text>
            <Text style={styles.legendValue}>
              {segment.percentage.toFixed(1)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  chartContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  centerLabel: {
    position: 'absolute',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 12,
    color: colors.neutral[500],
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[800],
  },
  legend: {
    width: '100%',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendLabel: {
    flex: 1,
    fontSize: 13,
    color: colors.neutral[600],
  },
  legendValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 14,
    color: colors.neutral[400],
  },
});

export default React.memo(EarningsPieChart);
