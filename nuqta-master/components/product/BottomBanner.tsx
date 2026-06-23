/**
 * BottomBanner Component
 *
 * Displays tagline banner at the bottom:
 * "Why rush? Lock smart. Buy better. Save more — only on ReZ"
 *
 * Based on reference design from ProductPage redesign
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/theme';

interface BottomBannerProps {
  /** Custom tagline (optional) */
  tagline?: string;
  /** Custom style */
  style?: any;
}

export const BottomBanner: React.FC<BottomBannerProps> = ({
  tagline = 'Why rush? Lock smart. Buy better. Save more — only on ReZ.',
  style,
}) => {
  return (
    <LinearGradient
      colors={[colors.indigoMist, '#E0E7FF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, style]}
    >
      <Text style={styles.tagline}>{tagline}</Text>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 16,
    marginBottom: 24,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },

  tagline: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default React.memo(BottomBanner);
