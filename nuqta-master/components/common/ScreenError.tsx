/**
 * ScreenError — Universal full-screen error state
 *
 * Smart error classification with auto-detected icons and messaging.
 * Reuses RetryButton for the retry action and SectionErrorBanner for compact mode.
 *
 * @example
 * // Simple usage
 * if (error) return <ScreenError error={error} onRetry={refetch} />;
 *
 * // With header preserved during error
 * if (error) return <ScreenError error={error} onRetry={refetch} header={<MyHeader />} />;
 *
 * // Compact inline mode
 * <ScreenError error={error} onRetry={refetch} compact />;
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';
import { RetryButton } from '@/components/common/RetryButton';
import SectionErrorBanner from '@/components/common/SectionErrorBanner';

// ============================================================================
// Types
// ============================================================================

interface ScreenErrorProps {
  /** Error object, message string, or null/undefined (renders nothing if falsy) */
  error: Error | string | null | undefined;
  /** Callback when "Try Again" is pressed */
  onRetry?: () => void;
  /** Custom title (auto-detected from error type if omitted) */
  title?: string;
  /** Custom message (auto-detected from error type if omitted) */
  message?: string;
  /** Ionicons icon name override (auto-detected from error type if omitted) */
  iconName?: string;
  /** Secondary action (e.g., "Go Back") */
  onSecondaryAction?: () => void;
  secondaryActionLabel?: string;
  /** Header content to render above the error (nav bar, etc.) */
  header?: React.ReactNode;
  /** Compact mode: renders inline error banner instead of full-screen */
  compact?: boolean;
  /** Custom container style */
  style?: ViewStyle;
}

// ============================================================================
// Error Classification
// ============================================================================

interface ErrorClassification {
  icon: string;
  title: string;
  message: string;
}

const NETWORK_PATTERNS = /network|fetch|timeout|econnrefused|err_network|socket|dns/i;
const NOT_FOUND_PATTERNS = /not found|404|does not exist/i;
const AUTH_PATTERNS = /unauthorized|401|403|forbidden|not allowed|permission/i;
const SERVER_PATTERNS = /500|502|503|server error|internal error/i;

function classifyError(error: Error | string): ErrorClassification {
  const msg = typeof error === 'string' ? error : error.message;

  if (NETWORK_PATTERNS.test(msg)) {
    return {
      icon: 'cloud-offline-outline',
      title: 'No Connection',
      message: 'Please check your internet connection and try again.',
    };
  }

  if (NOT_FOUND_PATTERNS.test(msg)) {
    return {
      icon: 'search-outline',
      title: 'Not Found',
      message: 'The content you\'re looking for couldn\'t be found.',
    };
  }

  if (AUTH_PATTERNS.test(msg)) {
    return {
      icon: 'lock-closed-outline',
      title: 'Access Denied',
      message: 'You don\'t have permission to view this content.',
    };
  }

  if (SERVER_PATTERNS.test(msg)) {
    return {
      icon: 'server-outline',
      title: 'Server Error',
      message: 'Something went wrong on our end. Please try again later.',
    };
  }

  return {
    icon: 'alert-circle-outline',
    title: 'Something Went Wrong',
    message: msg || 'An unexpected error occurred. Please try again.',
  };
}

// ============================================================================
// Component
// ============================================================================

function ScreenError({
  error,
  onRetry,
  title,
  message,
  iconName,
  onSecondaryAction,
  secondaryActionLabel = 'Go Back',
  header,
  compact = false,
  style,
}: ScreenErrorProps) {
  // Render nothing for falsy errors
  if (!error) return null;

  // Compact mode delegates to SectionErrorBanner
  if (compact) {
    const errorMsg = typeof error === 'string' ? error : error.message;
    return <SectionErrorBanner message={message || errorMsg} onRetry={onRetry} />;
  }

  // Classify error for auto-detection
  const classification = classifyError(error);
  const displayTitle = title || classification.title;
  const displayMessage = message || classification.message;
  const displayIcon = iconName || classification.icon;

  return (
    <View style={[styles.wrapper, style]}>
      {header}
      <View
        style={styles.container}
        accessible
        accessibilityRole="alert"
        accessibilityLabel={`Error: ${displayTitle}. ${displayMessage}`}
        accessibilityLiveRegion="polite"
      >
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons
            name={displayIcon as any}
            size={40}
            color={colors.neutral[400]}
          />
        </View>

        {/* Title */}
        <Text style={styles.title} accessibilityRole="header">
          {displayTitle}
        </Text>

        {/* Message */}
        <Text style={styles.message}>
          {displayMessage}
        </Text>

        {/* Dev-only error details */}
        {__DEV__ && typeof error !== 'string' && error.message !== displayMessage && (
          <Text style={styles.devDetails} numberOfLines={3}>
            {error.message}
          </Text>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {onRetry && (
            <RetryButton
              onRetry={onRetry}
              label="Try Again"
              variant="primary"
              size="medium"
            />
          )}
          {onSecondaryAction && (
            <RetryButton
              onRetry={onSecondaryAction}
              label={secondaryActionLabel}
              variant="ghost"
              size="medium"
              showIcon={false}
            />
          )}
        </View>
      </View>
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingBottom: spacing['3xl'],
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.errorScale[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    maxWidth: 300,
    marginBottom: spacing.xl,
  },
  devDetails: {
    ...typography.bodySmall,
    color: colors.neutral[400],
    textAlign: 'center',
    fontFamily: 'monospace',
    marginBottom: spacing.base,
    maxWidth: 280,
  },
  actions: {
    alignItems: 'center',
    gap: spacing.sm,
  },
});

export default React.memo(ScreenError);
