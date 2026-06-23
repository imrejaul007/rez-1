/**
 * SafeAreaContainer Component
 *
 * Wrapper component that applies safe area insets to avoid notches,
 * status bars, and other device-specific UI elements.
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Edge = 'top' | 'bottom' | 'left' | 'right';

interface SafeAreaContainerProps {
  /**
   * Child components to render with safe area padding
   */
  children: React.ReactNode;

  /**
   * Which edges to apply safe area insets (defaults to ['top', 'bottom'])
   */
  edges?: Edge[];

  /**
   * Custom styles to apply to the container
   */
  style?: ViewStyle;

  /**
   * Background color (defaults to transparent)
   */
  backgroundColor?: string;
}

/**
 * SafeAreaContainer wraps content with device-safe padding
 *
 * @example
 * <SafeAreaContainer edges={['top', 'bottom']}>
 *   <AppContent />
 * </SafeAreaContainer>
 *
 * @example
 * // Only bottom safe area (for screens with custom headers)
 * <SafeAreaContainer edges={['bottom']}>
 *   <Content />
 * </SafeAreaContainer>
 */
function SafeAreaContainer({
  children,
  edges = ['top', 'bottom'],
  style,
  backgroundColor = 'transparent',
}: SafeAreaContainerProps) {
  const insets = useSafeAreaInsets();

  const paddingStyle: ViewStyle = {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
    backgroundColor,
  };

  return (
    <View
      style={[styles.container, paddingStyle, style]}
      accessible={false}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

/**
 * Hook to get individual safe area inset values
 *
 * @example
 * const { top, bottom, left, right } = useSafeAreaValues();
 *
 * @returns Object with top, bottom, left, right inset values
 */
export function useSafeAreaValues() {
  return useSafeAreaInsets();
}

export default React.memo(SafeAreaContainer);
