// Loading Spinner Component
// Reusable loading indicator for the profile system

import React from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { colors } from '@/constants/theme';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  message?: string;
  fullScreen?: boolean;
}

function LoadingSpinner({
  size = 'large',
  color = colors.brand.purpleLight,
  message,
  fullScreen = false,
}: LoadingSpinnerProps) {
  
  const containerStyle = fullScreen ? styles.fullScreenContainer : styles.container;
  
  return (
    <View
      style={containerStyle}
      accessibilityLabel={message || "Loading"}
      accessibilityRole="progressbar"
      accessible={true}
    >
      <ActivityIndicator
        size={size}
        color={color}
        style={styles.spinner}
        accessibilityElementsHidden={true}
        importantForAccessibility="no"
      />
      {message && (
        <ThemedText style={styles.message}>
          {message}
        </ThemedText>
      )}
    </View>
);
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fullScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  spinner: {
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
    fontWeight: '500',
  },
});
export default React.memo(LoadingSpinner);
