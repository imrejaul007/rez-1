/**
 * Cross-Platform Slider Component (Native)
 *
 * A slider that works on iOS and Android using @react-native-community/slider.
 * The web version is in CrossPlatformSlider.web.tsx
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
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
  return (
    <View style={[styles.container, style]}>
      <Slider
        value={value}
        onValueChange={onValueChange}
        minimumValue={minimumValue}
        maximumValue={maximumValue}
        step={step}
        minimumTrackTintColor={minimumTrackTintColor}
        maximumTrackTintColor={maximumTrackTintColor}
        thumbTintColor={thumbTintColor}
        disabled={disabled}
      />
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
