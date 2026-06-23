/**
 * ProductPageErrorBoundary Component
 * Specialized error boundary for product page with product-specific error handling
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/DesignSystem';

interface Props {
  children: ReactNode;
  productId?: string;
  onRetry?: () => void;
  onGoBack?: () => void;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ProductPageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {

    this.setState({
      error,
      errorInfo,
    });

    // Log error to analytics or error tracking service
    // TODO: Integrate with error tracking service (e.g., Sentry)
    if (__DEV__) {
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  handleGoBack = () => {
    if (this.props.onGoBack) {
      this.props.onGoBack();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isNetworkError = this.state.error?.message?.toLowerCase().includes('network') ||
        this.state.error?.message?.toLowerCase().includes('fetch') ||
        this.state.error?.message?.toLowerCase().includes('timeout');

      const isNotFoundError = this.state.error?.message?.toLowerCase().includes('not found') ||
        this.state.error?.message?.toLowerCase().includes('404');

      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Ionicons
                name={isNetworkError ? "cloud-offline" : isNotFoundError ? "search" : "alert-circle"}
                size={64}
                color={Colors.error}
              />
            </View>

            <Text style={styles.title}>
              {isNetworkError
                ? "Connection Error"
                : isNotFoundError
                  ? "Product Not Found"
                  : "Oops! Something went wrong"}
            </Text>

            <Text style={styles.message}>
              {isNetworkError
                ? "Unable to load product details. Please check your internet connection and try again."
                : isNotFoundError
                  ? "The product you're looking for could not be found. It may have been removed or is no longer available."
                  : "We encountered an unexpected error while loading this product. Don't worry, your data is safe."}
            </Text>

            {__DEV__ && this.state.error && (
              <View style={styles.errorDetails}>
                <Text style={styles.errorDetailsTitle}>Error Details (Dev Only):</Text>
                <Text style={styles.errorDetailsText}>{this.state.error.message}</Text>
              </View>
            )}

            <View style={styles.buttonContainer}>
              <Pressable
                style={styles.primaryButton}
                onPress={this.handleReset}
                accessibilityLabel="Try again"
                accessibilityRole="button"
                accessibilityHint="Double tap to retry loading the product"
              >
                <Ionicons name="refresh" size={20} color="white" />
                <Text style={styles.primaryButtonText}>Try Again</Text>
              </Pressable>

              {this.props.onGoBack && (
                <Pressable
                  style={styles.secondaryButton}
                  onPress={this.handleGoBack}
                  accessibilityLabel="Go back"
                  accessibilityRole="button"
                  accessibilityHint="Double tap to go back to previous page"
                >
                  <Ionicons name="arrow-back" size={20} color={Colors.primary[700]} />
                  <Text style={styles.secondaryButtonText}>Go Back</Text>
                </Pressable>
              )}
            </View>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['2xl'],
  },
  iconContainer: {
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.h2,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  message: {
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing['2xl'],
    lineHeight: 22,
    maxWidth: 320,
  },
  errorDetails: {
    backgroundColor: Colors.background.tertiary,
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
    maxWidth: 320,
    borderWidth: 1,
    borderColor: Colors.border.medium,
  },
  errorDetailsTitle: {
    ...Typography.labelSmall,
    color: Colors.error,
    marginBottom: Spacing.xs,
  },
  errorDetailsText: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
    fontFamily: 'monospace',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 320,
    gap: Spacing.md,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary[700],
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    ...Shadows.purpleMedium,
  },
  primaryButtonText: {
    ...Typography.button,
    color: Colors.text.white,
    fontSize: 16,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.primary,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary[700],
    gap: Spacing.sm,
  },
  secondaryButtonText: {
    ...Typography.buttonSmall,
    color: Colors.primary[700],
    fontSize: 16,
    fontWeight: '600',
  },
});

export default React.memo(ProductPageErrorBoundary);
