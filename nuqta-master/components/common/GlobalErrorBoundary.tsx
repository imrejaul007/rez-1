/**
 * Global Error Boundary Component
 *
 * Wraps the entire app and catches all unhandled errors.
 * Shows different UI for development vs production.
 *
 * @module GlobalErrorBoundary
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { errorReporter } from '@/utils/errorReporter';
import { APP_CONFIG } from '@/config/env';
import { colors } from '@/constants/theme';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
  showStackTrace?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Global Error Boundary
 *
 * Catches all unhandled React errors and displays a fallback UI.
 * In development, shows detailed error information.
 * In production, shows a user-friendly error message.
 */
class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {

    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });

    // Report error to error tracking service
    errorReporter.captureError(error, {
      context: 'GlobalErrorBoundary',
      component: errorInfo.componentStack?.split('\n')[1]?.trim() || 'Unknown',
      metadata: {
        componentStack: errorInfo.componentStack,
        isDevelopment: __DEV__,
        platform: Platform.OS,
      },
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReportIssue = () => {
    // TODO: Implement issue reporting
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo } = this.state;
      const isDevelopment = __DEV__ || this.props.showStackTrace;

      return (
        <View style={styles.container}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Error Icon */}
            <View style={styles.iconContainer}>
              <Ionicons
                name="alert-circle"
                size={80}
                color={isDevelopment ? colors.warning : colors.error}
              />
            </View>

            {/* Error Title */}
            <Text style={styles.title}>
              {isDevelopment ? 'Development Error' : 'Oops! Something went wrong'}
            </Text>

            {/* Error Message */}
            <Text style={styles.message}>
              {isDevelopment
                ? error?.message || 'An error occurred'
                : "We're sorry, but something unexpected happened. Don't worry, your data is safe."}
            </Text>

            {/* Development Mode: Stack Trace */}
            {isDevelopment && error?.stack && (
              <View style={styles.stackTraceContainer}>
                <Text style={styles.stackTraceTitle}>Stack Trace:</Text>
                <ScrollView
                  style={styles.stackTraceScroll}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                >
                  <Text style={styles.stackTrace}>{error.stack}</Text>
                </ScrollView>
              </View>
            )}

            {/* Development Mode: Component Stack */}
            {isDevelopment && errorInfo?.componentStack && (
              <View style={styles.stackTraceContainer}>
                <Text style={styles.stackTraceTitle}>Component Stack:</Text>
                <ScrollView
                  style={styles.stackTraceScroll}
                  showsHorizontalScrollIndicator={false}
                >
                  <Text style={styles.stackTrace}>{errorInfo.componentStack}</Text>
                </ScrollView>
              </View>
            )}

            {/* App Info */}
            <View style={styles.infoContainer}>
              <Text style={styles.infoText}>App Version: {APP_CONFIG.version}</Text>
              <Text style={styles.infoText}>Platform: {Platform.OS}</Text>
              {isDevelopment && (
                <Text style={styles.infoText}>Environment: Development</Text>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <Pressable
                style={styles.primaryButton}
                onPress={this.handleReset}
                accessibilityLabel="Try again"
                accessibilityRole="button"
              >
                <Ionicons name="refresh" size={20} color="white" />
                <Text style={styles.primaryButtonText}>Try Again</Text>
              </Pressable>

              {!isDevelopment && (
                <Pressable
                  style={styles.secondaryButton}
                  onPress={this.handleReportIssue}
                  accessibilityLabel="Report issue"
                  accessibilityRole="button"
                >
                  <Ionicons name="bug" size={20} color={colors.brand.purpleLight} />
                  <Text style={styles.secondaryButtonText}>Report Issue</Text>
                </Pressable>
              )}
            </View>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
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
    maxWidth: 400,
  },
  stackTraceContainer: {
    width: '100%',
    maxWidth: 600,
    marginBottom: 24,
    backgroundColor: colors.neutral[800],
    borderRadius: 12,
    padding: 16,
  },
  stackTraceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.warning,
    marginBottom: 8,
  },
  stackTraceScroll: {
    maxHeight: 200,
  },
  stackTrace: {
    fontSize: 12,
    color: colors.gray[200],
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 18,
  },
  infoContainer: {
    marginBottom: 32,
    padding: 16,
    backgroundColor: colors.gray[200],
    borderRadius: 8,
    width: '100%',
    maxWidth: 400,
  },
  infoText: {
    fontSize: 14,
    color: colors.neutral[500],
    marginBottom: 4,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 400,
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
    shadowColor: colors.brand.purpleLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
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
    borderWidth: 2,
    borderColor: colors.brand.purpleLight,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.brand.purpleLight,
  },
});

export default React.memo(GlobalErrorBoundary);
