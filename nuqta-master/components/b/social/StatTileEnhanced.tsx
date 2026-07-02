/**
 * StatTileEnhanced — interactive stat tile with press animation,
 * optional emoji icon, and trend indicator.
 *
 * Usage:
 * ```tsx
 * <StatTileEnhanced
 *   label="Savings"
 *   value={12500}
 *   icon="💰"
 *   trend="up"
 *   onPress={() => {}}
 *   testID="savings-tile"
 * />
 * ```
 */
import React, { useCallback, useMemo } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { borderRadius, colors, shadows, spacing, typography } from '@/constants/theme';

export interface StatTileEnhancedProps {
  /** Descriptive label shown below the value. */
  label: string;
  /** Primary value to display (number or string). */
  value: string | number;
  /** Optional emoji icon rendered above the value. */
  icon?: string;
  /** Trend direction for the arrow indicator. */
  trend?: 'up' | 'down' | 'flat';
  /** Invoked when the tile is pressed. Omit to render as a static tile. */
  onPress?: () => void;
  /** Color for the trend arrow. Defaults to semantic color based on trend. */
  trendColor?: string;
  /** Test ID for integration tests. */
  testID?: string;
}

// ---------------------------------------------------------------------------
// Formatters (module-level to avoid re-creation on every render)
// ---------------------------------------------------------------------------

const NUMBER_FORMATTER = new Intl.NumberFormat('en-IN');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatValue(value: string | number): string {
  if (typeof value === 'number') {
    return NUMBER_FORMATTER.format(value);
  }
  return value;
}

const TREND_ARROWS: Record<NonNullable<StatTileEnhancedProps['trend']>, string> = {
  up: '↑',
  down: '↓',
  flat: '→',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface StatTileEnhancedBaseProps extends StatTileEnhancedProps {
  /** Internal scale value driven by Animated.spring. */
  scaleAnim: Animated.Value;
}

function StatTileEnhancedBase({
  label,
  value,
  icon,
  trend,
  onPress,
  trendColor,
  testID,
  scaleAnim,
}: StatTileEnhancedBaseProps): React.ReactElement {
  // Derive trend color when not explicitly provided
  const resolvedTrendColor = useMemo(() => {
    if (trendColor) return trendColor;
    if (trend === 'up') return colors.success;
    if (trend === 'down') return colors.error;
    return colors.text.tertiary;
  }, [trend, trendColor]);

  const formattedValue = useMemo(() => formatValue(value), [value]);

  const trendArrow = trend ? TREND_ARROWS[trend] : null;

  // Accessibility: compose a human-readable label
  const a11yLabel = useMemo(() => {
    const parts = [`${label}: ${formattedValue}`];
    if (trend) {
      parts.push(`trend: ${trend}`);
    }
    return parts.join('. ');
  }, [label, formattedValue, trend]);

  // Accessibility: button role when interactive, none otherwise
  const accessibilityRole = onPress ? 'button' : undefined;

  // Press handler: animate scale down then back up via spring
  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  // Animated style driven by scale spring
  const animatedStyle = useMemo(
    () => ({
      transform: [{ scale: scaleAnim }],
    }),
    [scaleAnim],
  );

  // When no onPress is provided, render a static View instead of Pressable
  // so we don't register unnecessary press gestures.
  if (!onPress) {
    return (
      <View
        style={[styles.tile, animatedStyle]}
        accessible
        accessibilityRole="text"
        accessibilityLabel={a11yLabel}
        testID={testID}
      >
        {icon ? (
          <Text style={styles.icon} accessibilityElementsHidden importantForAccessibility="no">
            {icon}
          </Text>
        ) : null}
        <View style={styles.valueRow}>
          <Text style={styles.value}>{formattedValue}</Text>
          {trendArrow ? (
            <Text
              style={[styles.trendArrow, { color: resolvedTrendColor }]}
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              {trendArrow}
            </Text>
          ) : null}
        </View>
        <Text style={styles.label}>{label}</Text>
      </View>
    );
  }

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={a11yLabel}
        testID={testID}
      >
        {icon ? (
          <Text style={styles.icon} accessibilityElementsHidden importantForAccessibility="no">
            {icon}
          </Text>
        ) : null}
        <View style={styles.valueRow}>
          <Text style={styles.value}>{formattedValue}</Text>
          {trendArrow ? (
            <Text
              style={[styles.trendArrow, { color: resolvedTrendColor }]}
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              {trendArrow}
            </Text>
          ) : null}
        </View>
        <Text style={styles.label}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Memoised export with shared Animated.Value per instance
// ---------------------------------------------------------------------------

/**
 * StatTileEnhanced — interactive stat tile.
 *
 * Wraps `StatTileEnhancedBase` in a React.memo + per-instance Animated.Value
 * so press animations are isolated per tile instance.
 */
const StatTileEnhanced = React.memo(function StatTileEnhanced(
  props: StatTileEnhancedProps,
): React.ReactElement {
  // Create the spring scale value here (inside the memo wrapper) so each
  // rendered tile gets its own animated value without leaking state.
  const scaleAnim = useMemo(() => new Animated.Value(1), []);

  return <StatTileEnhancedBase {...props} scaleAnim={scaleAnim} />;
});

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  // Outer tile container — minimum touch target 44px
  tile: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    ...shadows.subtle,
  },

  // Reduced opacity when pressed (secondary visual cue alongside scale)
  tilePressed: {
    opacity: 0.85,
  },

  // Emoji icon rendered above the value
  icon: {
    fontSize: 24,
    marginBottom: spacing.xs,
    lineHeight: 28,
  },

  // Horizontal row for value + trend arrow
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  // Primary value text
  value: {
    ...typography.h3,
    color: colors.nileBlue,
    fontWeight: '800',
    textAlign: 'center',
  },

  // Trend arrow (up / down / flat)
  trendArrow: {
    ...typography.h4,
    fontWeight: '700',
    lineHeight: 24,
  },

  // Descriptive label below the value
  label: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});

export { StatTileEnhanced };
export type { StatTileEnhancedProps };
export default StatTileEnhanced;
