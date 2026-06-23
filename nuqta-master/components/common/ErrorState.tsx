/**
 * ErrorState Component
 *
 * Enhanced error display component with design tokens integration.
 * Provides a consistent UX for error handling across the app.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, typography, borderRadius, shadows } from '@/constants/theme';

interface ErrorStateProps {
  /**
   * Error object or error message string
   */
  error: Error | string;

  /**
   * Callback function when retry button is pressed
   */
  onRetry?: () => void;

  /**
   * Optional custom title (defaults to "Oops! Something went wrong")
   */
  title?: string;

  /**
   * Optional custom styles
   */
  style?: any;
}

/**
 * ErrorState displays error information with an optional retry action
 *
 * @example
 * <ErrorState
 *   error={error}
 *   onRetry={() => refetchData()}
 *   title="Failed to Load Store"
 * />
 */
function ErrorState({
  error,
  onRetry,
  title = 'Oops! Something went wrong',
  style,
}: ErrorStateProps) {
  const errorMessage = typeof error === 'string' ? error : error.message;

  return (
    <View
      style={[styles.container, style]}
      accessible={true}
      accessibilityRole="alert"
      accessibilityLabel={`Error: ${title}. ${errorMessage}`}
      accessibilityLiveRegion="polite"
    >
      <Text
        style={styles.icon}
        accessible={false}
        aria-hidden={true}
      >
        ⚠️
      </Text>

      <Text
        style={styles.title}
        accessible={true}
        accessibilityRole="header"
      >
        {title}
      </Text>

      <Text
        style={styles.message}
        accessible={true}
        accessibilityRole="text"
      >
        {errorMessage}
      </Text>

      {onRetry && (
        <Pressable
          style={styles.button}
          onPress={onRetry}
         
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Try Again"
          accessibilityHint="Double tap to retry the failed action"
        >
          <Text style={styles.buttonText}>Try Again</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    backgroundColor: colors.background.secondary,
  },
  icon: {
    fontSize: 64,
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h2,
    color: colors.errorScale[500],
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    maxWidth: 320,
  },
  button: {
    marginTop: spacing.base,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.base,
    backgroundColor: colors.errorScale[500],
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  buttonText: {
    ...typography.button,
    color: colors.text.inverse,
  },
});

export default React.memo(ErrorState);
