import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface WeeklyProgressBarProps {
  progress: number;
  label?: string;
  showPercentage?: boolean;
}

const WeeklyProgressBar: React.FC<WeeklyProgressBarProps> = ({
  progress,
  label,
  showPercentage = true,
}) => {
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const animatedWidth = useRef(new Animated.Value(0)).current;
  const percentage = Math.round(clampedProgress * 100);
  const isComplete = clampedProgress >= 1;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: clampedProgress,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [clampedProgress, animatedWidth]);

  const widthInterpolation = animatedWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      {(label || showPercentage) && (
        <View style={styles.labelContainer}>
          {label && <Text style={styles.label}>{label}</Text>}
          <View style={styles.percentageContainer}>
            {showPercentage && (
              <Text style={styles.percentage} accessibilityLabel={`${percentage} percent complete`}>
                {percentage}%
              </Text>
            )}
            {isComplete && <Text style={styles.celebration}>🎉</Text>}
          </View>
        </View>
      )}
      <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ now: percentage, min: 0, max: 100 }}>
        <Animated.View
          style={[
            styles.fill,
            { width: widthInterpolation },
            isComplete && styles.fillComplete,
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  percentageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  percentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  celebration: {
    fontSize: 16,
  },
  track: {
    height: 8,
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 4,
  },
  fillComplete: {
    backgroundColor: '#FFD700',
  },
});

export default WeeklyProgressBar;
