// components/common/LoadingState.tsx - Reusable loading indicator component

import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { colors } from '@/constants/theme';

interface LoadingStateProps {
  /**
   * Optional loading message to display
   */
  message?: string;

  /**
   * Size of the activity indicator
   */
  size?: 'small' | 'large';

  /**
   * Color of the loading indicator
   */
  color?: string;

  /**
   * Optional custom styles
   */
  style?: object;
}

/**
 * LoadingState Component
 *
 * Displays loading indicator with optional message
 * Used throughout the app for consistent loading UX
 *
 * @example
 * <LoadingState message="Loading vouchers..." />
 */
export const LoadingState: React.FC<LoadingStateProps> = ({
  message,
  size = 'large',
  color = '#9333EA',
  style,
}) => {
  const loadingMessage = message || 'Loading';

  return (
    <View
      style={[styles.container, style]}
      accessible={true}
      accessibilityRole="progressbar"
      accessibilityLabel={loadingMessage}
      accessibilityLiveRegion="polite"
      accessibilityState={{ busy: true }}
    >
      <ActivityIndicator
        size={size}
        color={color}
        accessible={false}
      />

      {message && (
        <ThemedText
          style={styles.message}
          accessible={true}
          accessibilityRole="text"
        >
          {message}
        </ThemedText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.neutral[50],
  },
  message: {
    fontSize: 16,
    color: colors.neutral[500],
    textAlign: 'center',
    marginTop: 16,
  },
});

export default React.memo(LoadingState);
