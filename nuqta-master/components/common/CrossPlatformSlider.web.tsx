/**
 * Cross-Platform Slider Component
 *
 * A slider that works on both web and native platforms.
 * Uses HTML range input which works on all platforms.
 */

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { colors } from '@/constants/theme';

interface CrossPlatformSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
  minimumTrackTintColor?: string;
  maximumTrackTintColor?: string;
  thumbTintColor?: string;
  disabled?: boolean;
  style?: any;
}

const CrossPlatformSlider: React.FC<CrossPlatformSliderProps> = ({
  value,
  onValueChange,
  minimumValue = 0,
  maximumValue = 100,
  step = 1,
  minimumTrackTintColor = colors.brand.green,
  maximumTrackTintColor = colors.gray[200],
  thumbTintColor = colors.brand.green,
  disabled = false,
  style,
}) => {
  // Calculate percentage for gradient background
  const percentage = maximumValue > minimumValue
    ? ((value - minimumValue) / (maximumValue - minimumValue)) * 100
    : 0;

  return (
    <View style={[styles.container, style]}>
      <input
        type="range"
        min={minimumValue}
        max={maximumValue}
        step={step}
        value={value}
        onChange={(e) => onValueChange(parseFloat(e.target.value))}
        disabled={disabled}
        style={{
          width: '100%',
          height: 6,
          borderRadius: 3,
          appearance: 'none',
          WebkitAppearance: 'none',
          background: `linear-gradient(to right, ${minimumTrackTintColor} 0%, ${minimumTrackTintColor} ${percentage}%, ${maximumTrackTintColor} ${percentage}%, ${maximumTrackTintColor} 100%)`,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          outline: 'none',
        }}
      />
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: ${thumbTintColor};
          cursor: ${disabled ? 'not-allowed' : 'pointer'};
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: ${thumbTintColor};
          cursor: ${disabled ? 'not-allowed' : 'pointer'};
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
      `}</style>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
});

export default React.memo(CrossPlatformSlider);
