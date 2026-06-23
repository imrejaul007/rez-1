import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Maintenance Screen
// Display when backend is under maintenance

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '@/services/apiClient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { platformAlertSimple } from '@/utils/platformAlert';
import { useIsMounted } from '@/hooks/useIsMounted';

function MaintenancePage() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [estimatedEndTime, setEstimatedEndTime] = useState<Date | null>(
    params.endTime ? new Date(params.endTime as string) : new Date(Date.now() + 30 * 60 * 1000)
  );
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const isMounted = useIsMounted();

  // Calculate time remaining
  useEffect(() => {
    if (!estimatedEndTime) return;

    const updateTimer = () => {
      const now = new Date();
      const diff = estimatedEndTime.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('00:00:00');
        handleRetry();
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [estimatedEndTime]);

  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    try {
      const response = await apiClient.get('/health');
      if (response.success) {
        router.replace('/');
        return;
      }
    } catch (_error) {
      // Server still down — stay on maintenance page
    } finally {
      if (!isMounted()) return;
      setIsRetrying(false);
    }
  }, [router]);

  const handleNotifyMe = () => {
    // In production, register for push notification when maintenance ends
    // For now, just show a message
    platformAlertSimple('Notification Set', 'We\'ll notify you when the app is back online!');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background.secondary} />

      <View style={styles.content}>
        {/* Illustration */}
        <View style={styles.illustrationContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="construct" size={64} color={Colors.primary[600]} />
          </View>
          <View style={styles.gearIcon1}>
            <Ionicons name="cog" size={32} color={Colors.gold} />
          </View>
          <View style={styles.gearIcon2}>
            <Ionicons name="settings" size={24} color={Colors.secondary[600]} />
          </View>
        </View>

        {/* Title */}
        <ThemedText style={styles.title}>We're Making Things Better</ThemedText>

        {/* Description */}
        <ThemedText style={styles.description}>
          Our team is working hard to improve your experience.
          We'll be back shortly!
        </ThemedText>

        {/* Countdown Timer */}
        {estimatedEndTime && (
          <View style={styles.timerCard}>
            <ThemedText style={styles.timerLabel}>Estimated time remaining</ThemedText>
            <View style={styles.timerDisplay}>
              <ThemedText style={styles.timerText}>{timeRemaining}</ThemedText>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '60%' }]} />
            </View>
          </View>
        )}

        {/* What's Happening */}
        <View style={styles.infoCard}>
          <View style={styles.infoItem}>
            <Ionicons name="server-outline" size={20} color={Colors.secondary[600]} />
            <ThemedText style={styles.infoText}>Server upgrades in progress</ThemedText>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="shield-checkmark-outline" size={20} color={Colors.secondary[600]} />
            <ThemedText style={styles.infoText}>Security enhancements</ThemedText>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="flash-outline" size={20} color={Colors.secondary[600]} />
            <ThemedText style={styles.infoText}>Performance improvements</ThemedText>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <Pressable
          style={styles.notifyButton}
          onPress={handleNotifyMe}
          accessible={true}
          accessibilityLabel="Notify me when ready"
          accessibilityRole="button"
        >
          <Ionicons name="notifications-outline" size={20} color={Colors.primary[600]} />
          <ThemedText style={styles.notifyButtonText}>Notify Me When Ready</ThemedText>
        </Pressable>

        <Pressable
          style={styles.retryButton}
          onPress={handleRetry}
          disabled={isRetrying}
          accessible={true}
          accessibilityLabel="Try again"
          accessibilityRole="button"
        >
          {isRetrying ? (
            <ActivityIndicator size="small" color={Colors.text.tertiary} />
          ) : (
            <>
              <Ionicons name="refresh" size={20} color={Colors.text.tertiary} />
              <ThemedText style={styles.retryButtonText}>Try Again</ThemedText>
            </>
          )}
        </Pressable>

        {retryCount > 0 && (
          <ThemedText style={styles.retryCountText}>
            Checked {retryCount} time{retryCount > 1 ? 's' : ''}
          </ThemedText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  illustrationContainer: {
    width: 160,
    height: 160,
    marginBottom: Spacing['2xl'],
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.medium,
  },
  gearIcon1: {
    position: 'absolute',
    top: 0,
    right: 10,
  },
  gearIcon2: {
    position: 'absolute',
    bottom: 20,
    left: 0,
  },
  title: {
    ...Typography.h2,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  description: {
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing['2xl'],
    lineHeight: 22,
  },
  timerCard: {
    width: '100%',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.subtle,
  },
  timerLabel: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginBottom: Spacing.md,
  },
  timerDisplay: {
    backgroundColor: Colors.gray[100],
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
  },
  timerText: {
    ...Typography.priceLarge,
    color: Colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: Colors.gray[200],
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary[600],
    borderRadius: 3,
  },
  infoCard: {
    width: '100%',
    backgroundColor: Colors.secondary[50],
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    gap: Spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  infoText: {
    ...Typography.body,
    color: Colors.secondary[700],
  },
  buttonContainer: {
    padding: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? Spacing['3xl'] : Spacing.lg,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    alignItems: 'center',
  },
  notifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    backgroundColor: Colors.primary[50],
    borderWidth: 1,
    borderColor: Colors.primary[200],
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.base,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  notifyButtonText: {
    ...Typography.button,
    color: Colors.primary[600],
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  retryButtonText: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  retryCountText: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
  },
});

export default withErrorBoundary(MaintenancePage, 'SystemMaintenance');
