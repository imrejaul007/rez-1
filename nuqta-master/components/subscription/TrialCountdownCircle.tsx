// @ts-nocheck
// Trial Countdown Circle Component
// Animated circular progress ring showing days remaining with color status

import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Svg, Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { ThemedText } from '@/components/ThemedText';
import { colors } from '@/constants/theme';

interface TrialCountdownCircleProps {
  endDate: Date | string;
  size?: number;
  strokeWidth?: number;
}

function TrialCountdownCircle({
  endDate,
  size = 280,
  strokeWidth = 8,
}: TrialCountdownCircleProps) {
  const [daysLeft, setDaysLeft] = useState(0);
  const [color, setColor] = useState(colors.successScale[400]);

  useEffect(() => {
    // Calculate days remaining
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    setDaysLeft(Math.max(0, daysRemaining));

    // Determine color based on days remaining
    if (daysRemaining > 5) {
      setColor(colors.successScale[400]); // Green
    } else if (daysRemaining > 3) {
      setColor(colors.warningScale[400]); // Yellow/Amber
    } else {
      setColor(colors.error); // Red
    }
  }, [endDate]);

  const radius = size / 2 - strokeWidth - 10;
  const circumference = 2 * Math.PI * radius;
  const progress = (daysLeft / 7) * 100;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View
      style={[styles.container, { width: size, height: size }]}
      accessible={true}
      accessibilityLabel={`Trial countdown: ${daysLeft} days remaining, ${Math.round(progress)}% of trial period left`}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 7, now: daysLeft }}
    >
      <Svg width={size} height={size} style={styles.svg}>
        <Defs>
          <SvgLinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={color} stopOpacity="1" />
            <Stop offset="100%" stopColor={color} stopOpacity="0.7" />
          </SvgLinearGradient>
        </Defs>

        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.neutral[200]}
          strokeWidth={strokeWidth}
        />

        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      {/* Center content */}
      <View style={styles.centerContent}>
        <ThemedText style={[styles.daysNumber, { color }]}>
          {daysLeft}
        </ThemedText>
        <ThemedText style={styles.subtitle}>days left</ThemedText>
      </View>

      {/* Progress percentage indicator */}
      <View style={[styles.statusBadge, { backgroundColor: `${color}20`, borderColor: color }]}>
        <ThemedText style={[styles.statusText, { color }]}>
          {Math.round(progress)}%
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  svg: {
    position: 'absolute',
  },
  centerContent: {
    alignItems: 'center',
    zIndex: 10,
  },
  daysNumber: {
    fontSize: 64,
    fontWeight: '800',
    lineHeight: 74,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.neutral[500],
    marginTop: 4,
  },
  statusBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default React.memo(TrialCountdownCircle);
