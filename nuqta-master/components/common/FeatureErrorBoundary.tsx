/**
 * FeatureErrorBoundary
 *
 * Reusable error boundary for any feature section or page.
 * Consolidates the previous GameErrorBoundary, WalletErrorBoundary,
 * ProductPageErrorBoundary, GalleryErrorBoundary, homepage/ErrorBoundary,
 * and the generic ErrorBoundary into one component.
 *
 * Props:
 *  - featureName: optional label shown in the error UI (e.g. "Wallet", "Scratch Card")
 *  - fallback: custom ReactNode to render on error
 *  - onError: callback when an error is caught
 *  - onReset: callback after the user taps "Try Again"
 *  - onSecondaryAction: optional second button (e.g. "Go Back", "Back to Games")
 *  - secondaryActionLabel: text for the second button (default "Go Back")
 *  - secondaryActionIcon: Ionicons name for the second button (default "arrow-back")
 *  - compact: if true, renders a minimal inline error strip instead of full-screen
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

interface FeatureErrorBoundaryProps {
  children: ReactNode;
  /** Label shown in the error title, e.g. "Wallet", "Gallery", "Scratch Card" */
  featureName?: string;
  /** Completely custom fallback UI. When provided, the default error UI is skipped. */
  fallback?: ReactNode;
  /** Called when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Called after the user resets the boundary via "Try Again" */
  onReset?: () => void;
  /** If provided, a secondary button is shown (e.g. "Go Back", "Back to Games") */
  onSecondaryAction?: () => void;
  /** Label for the secondary action button */
  secondaryActionLabel?: string;
  /** Ionicons icon name for the secondary action button */
  secondaryActionIcon?: string;
  /**
   * Render a minimal one-line error strip instead of the full-screen fallback.
   * Useful for wrapping small sections inside a page.
   */
  compact?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class FeatureErrorBoundary extends Component<FeatureErrorBoundaryProps, State> {
  constructor(props: FeatureErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });

    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    // Custom fallback takes priority
    if (this.props.fallback) {
      return this.props.fallback;
    }

    const { featureName, onSecondaryAction, secondaryActionLabel, secondaryActionIcon, compact } = this.props;
    const { error } = this.state;

    // Compact mode: one-line error strip for inline section boundaries
    if (compact) {
      return (
        <View style={styles.compactContainer}>
          <View style={styles.compactContent}>
            <Ionicons name="warning-outline" size={16} color={colors.warningScale[400]} />
            <Text style={styles.compactText} numberOfLines={1}>
              {featureName ? `Failed to load ${featureName.toLowerCase()}` : 'Something went wrong'}
            </Text>
          </View>
          <Pressable onPress={this.handleReset} style={styles.compactRetryButton}>
            <Ionicons name="refresh" size={16} color={colors.brand.purpleLight} />
          </Pressable>
        </View>
      );
    }

    // Detect error type for smarter messaging
    const msg = error?.message?.toLowerCase() ?? '';
    const isNetworkError = msg.includes('network') || msg.includes('fetch') || msg.includes('timeout');

    const title = featureName
      ? (isNetworkError ? 'Connection Error' : `${featureName} Error`)
      : (isNetworkError ? 'Connection Error' : 'Oops! Something went wrong');

    const message = isNetworkError
      ? 'Please check your internet connection and try again.'
      : "We encountered an unexpected error. Don't worry, your data is safe.";

    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons
              name={isNetworkError ? 'cloud-offline' : 'alert-circle'}
              size={64}
              color={colors.error}
            />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {__DEV__ && error && (
            <View style={styles.errorDetails}>
              <Text style={styles.errorDetailsTitle}>Error Details (Dev Only):</Text>
              <Text style={styles.errorDetailsText} numberOfLines={4}>
                {error.message}
              </Text>
            </View>
          )}

          <View style={styles.buttonContainer}>
            <Pressable
              style={styles.primaryButton}
              onPress={this.handleReset}
              accessibilityLabel="Try again"
            >
              <Ionicons name="refresh" size={20} color="white" />
              <Text style={styles.primaryButtonText}>Try Again</Text>
            </Pressable>

            {onSecondaryAction && (
              <Pressable
                style={styles.secondaryButton}
                onPress={onSecondaryAction}
                accessibilityLabel={secondaryActionLabel ?? 'Go Back'}
              >
                <Ionicons
                  name={(secondaryActionIcon as any) ?? 'arrow-back'}
                  size={20}
                  color={colors.brand.purpleLight}
                />
                <Text style={styles.secondaryButtonText}>
                  {secondaryActionLabel ?? 'Go Back'}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  // Full-screen fallback
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: colors.neutral[500],
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  errorDetails: {
    backgroundColor: colors.gray[100],
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    maxWidth: 320,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  errorDetailsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.error,
    marginBottom: 4,
  },
  errorDetailsText: {
    fontSize: 12,
    color: colors.neutral[500],
    fontFamily: 'monospace',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.purpleLight,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.brand.purpleLight,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.brand.purpleLight,
  },

  // Compact mode
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.tint.amberLight,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  compactText: {
    fontSize: 14,
    color: colors.brand.amberDark,
    fontWeight: '500',
  },
  compactRetryButton: {
    padding: 4,
  },
});

// Named export for destructured imports
export { FeatureErrorBoundary };

// Default export (used by most consumers that import via `import X from ...`)
export default React.memo(FeatureErrorBoundary);
