import React from 'react';
import {
  View,
  Text,
  Pressable,
  Platform,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { NUQTA } from './searchTheme';

interface SearchErrorStateProps {
  error: string;
  onRetry: () => void;
}

function SearchErrorState({ error, onRetry }: SearchErrorStateProps) {
  const isNetworkError = error.toLowerCase().includes('network') ||
    error.toLowerCase().includes('connection') ||
    error.toLowerCase().includes('fetch') ||
    error.toLowerCase().includes('timeout');

  return (
    <View
      style={styles.errorContainer}
      accessibilityLabel="Error occurred"
      accessibilityRole="alert"
    >
      <View style={styles.errorIconContainer}>
        <Ionicons
          name={isNetworkError ? 'cloud-offline-outline' : 'alert-circle-outline'}
          size={64}
          color={NUQTA.nileBlue}
          accessibilityLabel="Error icon"
        />
      </View>
      <Text style={styles.errorTitle}>
        {isNetworkError ? 'Check your connection' : 'Oops! Something went wrong'}
      </Text>
      <Text style={styles.errorMessage}>
        {isNetworkError
          ? 'Please check your internet connection and try again.'
          : error}
      </Text>
      <Pressable
        style={styles.retryButton}
        onPress={onRetry}
        accessibilityLabel="Try again"
        accessibilityRole="button"
        accessibilityHint="Retries the failed operation"
      >
        <LinearGradient
          colors={[NUQTA.nileBlue, NUQTA.nileBlueLight]}
          style={styles.retryButtonGradient}
        >
          <Ionicons name="refresh" size={18} color={Colors.text.inverse} />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: NUQTA.lavenderMist,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  errorTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: NUQTA.nileBlue,
    marginBottom: 10,
    textAlign: 'center',
  },
  errorMessage: {
    ...Typography.body,
    color: NUQTA.text.secondary,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  retryButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  retryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    gap: 10,
  },
  retryButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: '600',
  },
});

export default React.memo(SearchErrorState);
