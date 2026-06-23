/**
 * InsightTile - Small data tile showing value + label + optional trend
 * Used in the InsightSection row
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { Colors, BorderRadius, Shadows, Spacing } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

interface InsightTileProps {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
}

export const InsightTile: React.FC<InsightTileProps> = ({
  label,
  value,
  trend,
  trendValue,
  icon,
  iconColor = Colors.nileBlue,
}) => {
  const trendColor = trend === 'up' ? colors.successScale[700] : trend === 'down' ? colors.error : Colors.text.tertiary;
  const trendIcon = trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : undefined;

  return (
    <View style={styles.tile}>
      {icon && (
        <View style={[styles.iconBg, { backgroundColor: iconColor + '15' }]}>
          <Ionicons name={icon} size={14} color={iconColor} />
        </View>
      )}
      <ThemedText style={styles.value} numberOfLines={1}>{value}</ThemedText>
      <ThemedText style={styles.label} numberOfLines={1}>{label}</ThemedText>
      {trend && trendValue && trendIcon && (
        <View style={styles.trendRow}>
          <Ionicons name={trendIcon} size={10} color={trendColor} />
          <ThemedText style={[styles.trendText, { color: trendColor }]}>{trendValue}</ThemedText>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    ...Shadows.subtle,
  },
  iconBg: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  value: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text.primary,
    letterSpacing: -0.2,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.text.tertiary,
    marginTop: 1,
    textAlign: 'center',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  trendText: {
    fontSize: 9,
    fontWeight: '600',
  },
});

export default React.memo(InsightTile);
