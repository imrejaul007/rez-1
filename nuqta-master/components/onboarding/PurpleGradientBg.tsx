import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/theme';

interface PurpleGradientBgProps {
  children: React.ReactNode;
  style?: any;
}

function PurpleGradientBg({ children, style }: PurpleGradientBgProps) {
  return (
    <LinearGradient
      colors={[colors.lightMustard, colors.nileBlue, colors.nileBlue]}  // Nuqta: Mustard to Nile Blue
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradient, style]}
    >
      {children}
    </LinearGradient>
);
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
});
export default React.memo(PurpleGradientBg);
