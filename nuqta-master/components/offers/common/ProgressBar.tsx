/**
 * ProgressBar Component
 *
 * Animated progress bar for lightning deals stock indicator
 */

import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useOffersTheme } from '@/contexts/OffersThemeContext';
import { BorderRadius } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

interface ProgressBarProps {
  progress: number; // 0-100
  height?: number;
  backgroundColor?: string;
  fillColor?: string;
  borderRadius?: number;
  animated?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  height = 6,
  backgroundColor,
  fillColor,
  borderRadius = BorderRadius.sm,
  animated = true,
}) => {
  const { theme } = useOffersTheme();

  // Clamp progress between 0 and 100
  const clampedProgress = Math.min(100, Math.max(0, progress));

  // Determine fill color based on progress
  const getProgressColor = () => {
    if (fillColor) return fillColor;
    if (clampedProgress >= 80) return colors.error; // Red - almost gone
    if (clampedProgress >= 60) return colors.warningScale[400]; // Amber - selling fast
    return theme.colors.accent.primary; // Green - plenty left
  };

  const styles = StyleSheet.create({
    container: {
      height,
      backgroundColor: backgroundColor || theme.colors.border.light,
      borderRadius,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      backgroundColor: getProgressColor(),
      borderRadius,
      width: `${clampedProgress}%`,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.fill} />
    </View>
  );
};

export default React.memo(ProgressBar);
