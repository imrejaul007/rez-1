import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { colors } from '@/constants/theme';

interface SectionLoaderProps {
  text?: string;
  size?: 'small' | 'large';
  color?: string;
}

/**
 * SectionLoader - Reusable loading fallback for lazy-loaded sections
 *
 * Provides a consistent loading experience across all lazy-loaded components.
 * Can be customized with different sizes and colors.
 */
function SectionLoader({
  text = 'Loading...',
  size = 'large',
  color = colors.brand.indigo
}: SectionLoaderProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={color} />
      {text && <ThemedText style={styles.text}>{text}</ThemedText>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  text: {
    marginTop: 12,
    fontSize: 14,
    color: colors.neutral[500],
  },
});

export default React.memo(SectionLoader);
