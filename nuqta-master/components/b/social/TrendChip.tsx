/**
 * TrendChip — displays a trend indicator with directional arrow and percentage.
 *
 * Visual contract
 * ---------------
 *   - Renders a pill-shaped chip with trend-colored background (15% opacity)
 *     and matching 1px border.
 *   - Shows an arrow (↑ ↓ →) and optional change percentage.
 *   - Fully accessible with proper screen reader labels.
 *
 * Accessibility
 * -------------
 *   - Uses `accessibilityLabel` to describe the trend direction and percentage.
 *   - Hidden arrow icon for visual users, but part of accessibility label.
 *   - Container has `accessibilityRole="text"` for proper announcement.
 */
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';

// ============================================================================
// TYPES
// ============================================================================

export type TrendDirection = 'up' | 'down' | 'flat';

export interface TrendChipProps {
  /** Percentage change value to display (e.g., 12.5 for "12.5%") */
  changePct: number;
  /** Direction of the trend */
  trend: TrendDirection;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Arrow characters for each trend direction */
const TREND_ARROWS: Record<TrendDirection, string> = {
  up: '↑',     // ↑
  down: '↓',   // ↓
  flat: '→',   // →
};

/** Background opacity for trend colors (15%) */
const TREND_BG_OPACITY = 0.15;

/** Muted red color for down trend */
const MUTED_RED = '#EF4444';

// ============================================================================
// COLOR CONFIGURATION
// ============================================================================

interface TrendColorConfig {
  foreground: string;
  background: string;
  border: string;
  accessibilityLabel: string;
}

function getTrendColors(trend: TrendDirection): TrendColorConfig {
  switch (trend) {
    case 'up':
      return {
        foreground: '#22C55E',
        background: `rgba(34, 197, 94, ${TREND_BG_OPACITY})`,
        border: '#22C55E',
        accessibilityLabel: 'Trending up',
      };
    case 'down':
      return {
        foreground: MUTED_RED,
        background: `rgba(239, 68, 68, ${TREND_BG_OPACITY})`,
        border: MUTED_RED,
        accessibilityLabel: 'Trending down',
      };
    case 'flat':
      return {
        foreground: colors.gray[500],
        background: `rgba(130, 154, 177, ${TREND_BG_OPACITY})`,
        border: colors.gray[500],
        accessibilityLabel: 'No change',
      };
  }
}

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

/** Format percentage for display (absolute value + % symbol) */
function formatPercentage(value: number): string {
  const absValue = Math.abs(value);
  // Handle decimal places - show 1 decimal if needed, otherwise whole number
  const formatted = absValue % 1 === 0 ? absValue.toString() : absValue.toFixed(1);
  return `${formatted}%`;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * TrendChip — displays a trend indicator chip with arrow and percentage.
 *
 * @param changePct - The percentage change value (positive for up, negative for down)
 * @param trend - The trend direction: 'up' | 'down' | 'flat'
 */
function TrendChip({ changePct, trend }: TrendChipProps): React.ReactElement {
  // Memoize colors to prevent unnecessary recalculations
  const colorConfig = useMemo(() => getTrendColors(trend), [trend]);

  // Memoize formatted percentage
  const formattedPercentage = useMemo(() => formatPercentage(changePct), [changePct]);

  // Build accessibility label with trend direction and percentage
  const accessibilityLabel = useMemo(() => {
    const trendText = colorConfig.accessibilityLabel;
    return `${trendText}, ${formattedPercentage} change`;
  }, [colorConfig.accessibilityLabel, formattedPercentage]);

  const arrow = TREND_ARROWS[trend];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colorConfig.background,
          borderColor: colorConfig.border,
        },
      ]}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
    >
      <Text
        style={[styles.arrow, { color: colorConfig.foreground }]}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        {arrow}
      </Text>
      <Text
        style={[styles.percentage, { color: colorConfig.foreground }]}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        {formattedPercentage}
      </Text>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  arrow: {
    ...typography.labelSmall,
    fontWeight: '700',
    marginRight: spacing.xs,
  },
  percentage: {
    ...typography.labelSmall,
    fontWeight: '600',
  },
});

export default TrendChip;
