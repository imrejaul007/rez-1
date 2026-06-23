import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Text as SvgText, G } from 'react-native-svg';
import { ThemedText } from '@/components/ThemedText';
import { LinearGradient } from 'expo-linear-gradient';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

interface EarningsChartProps {
  breakdown: {
    projects: number;
    referrals: number;
    shareAndEarn: number;
    spin: number;
  };
  currency?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 80; // Account for padding
const CHART_HEIGHT = 120;
const BAR_WIDTH = (CHART_WIDTH - 60) / 4; // 4 bars with spacing
const MAX_BAR_HEIGHT = 100;

function EarningsChart({ breakdown, currency }: EarningsChartProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = currency || getCurrencySymbol();
  const data = useMemo(() => {
    const values = [
      { label: 'Projects', value: breakdown.projects, color: colors.brand.purpleLight },
      { label: 'Referrals', value: breakdown.referrals, color: colors.lightMustard },
      { label: 'Share', value: breakdown.shareAndEarn, color: colors.warningScale[400] },
      { label: 'Spin', value: breakdown.spin, color: colors.brand.pink },
    ];

    const maxValue = Math.max(...values.map(d => d.value), 1);

    return values.map(item => ({
      ...item,
      height: (item.value / maxValue) * MAX_BAR_HEIGHT,
      percentage: maxValue > 0 ? (item.value / maxValue) * 100 : 0,
    }));
  }, [breakdown]);

  return (
    <View style={styles.container}>
      <ThemedText style={styles.chartTitle}>Earnings Breakdown</ThemedText>
      <View style={styles.chartContainer}>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          <G>
            {data.map((item, index) => {
              const x = 20 + index * (BAR_WIDTH + 10);
              const y = CHART_HEIGHT - item.height - 20;
              const barHeight = item.height;

              return (
                <G key={item.label}>
                  {/* Bar */}
                  <Rect
                    x={x}
                    y={y}
                    width={BAR_WIDTH - 10}
                    height={barHeight}
                    fill={item.color}
                    rx={8}
                    ry={8}
                    opacity={0.8}
                  />
                  {/* Value Label */}
                  {item.value > 0 && (
                    <SvgText
                      x={x + (BAR_WIDTH - 10) / 2}
                      y={y - 8}
                      fontSize="12"
                      fontWeight="700"
                      fill={colors.neutral[800]}
                      textAnchor="middle"
                    >
                      {currencySymbol}{item.value}
                    </SvgText>
                  )}
                  {/* Category Label */}
                  <SvgText
                    x={x + (BAR_WIDTH - 10) / 2}
                    y={CHART_HEIGHT - 5}
                    fontSize="11"
                    fontWeight="600"
                    fill={colors.neutral[500]}
                    textAnchor="middle"
                  >
                    {item.label}
                  </SvgText>
                </G>
              );
            })}
          </G>
        </Svg>
      </View>
      {/* Legend */}
      <View style={styles.legend}>
        {data.map((item) => (
          <View key={item.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <ThemedText style={styles.legendText}>
              {item.label}: {currencySymbol}{item.value}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral[500],
    marginBottom: 12,
    textAlign: 'center',
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: colors.neutral[500],
    fontWeight: '600',
  },
});

export default React.memo(EarningsChart);
