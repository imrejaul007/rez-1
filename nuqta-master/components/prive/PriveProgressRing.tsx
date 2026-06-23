import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { PRIVE_COLORS } from './priveTheme';

interface PriveProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  label?: string;
  sublabel?: string;
  /** @deprecated No longer used - progress is applied directly */
  animated?: boolean;
}

export const PriveProgressRing: React.FC<PriveProgressRingProps> = ({
  progress,
  size = 100,
  strokeWidth = 8,
  color = PRIVE_COLORS.gold.primary,
  bgColor = PRIVE_COLORS.transparent.white10,
  label,
  sublabel,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  animated = true,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.max(0, Math.min(100, progress));
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={bgColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.labelContainer}>
        {label && <Text style={[styles.label, { color }]}>{label}</Text>}
        {sublabel && <Text style={styles.sublabel}>{sublabel}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  label: {
    fontSize: 20,
    fontWeight: '700',
  },
  sublabel: {
    fontSize: 10,
    color: PRIVE_COLORS.text.tertiary,
    marginTop: 2,
  },
});

export default React.memo(PriveProgressRing);
