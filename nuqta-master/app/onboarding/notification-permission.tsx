import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Notification Permission Screen
// Dedicated screen to request push notification permission

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useBackButton } from '@/hooks/useSafeNavigation';
import * as Notifications from 'expo-notifications';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import analyticsService from '@/services/analyticsService';
import { useAuthUser, useAuthActions } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const BENEFITS = [
  {
    icon: 'gift-outline',
    title: 'Nearby Deals',
    description: 'Get alerted when stores near you offer 20%+ cashback',
  },
  {
    icon: 'cube-outline',
    title: 'Order Updates',
    description: 'Track your orders in real-time',
  },
  {
    icon: 'wallet-outline',
    title: 'Expiry Alerts',
    description: "We'll remind you before your coins expire",
  },
  {
    icon: 'flash-outline',
    title: 'Flash Deals',
    description: "Most flash deals last under 4 hours \u2014 don't miss out",
  },
];

function NotificationPermissionPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  useBackButton(() => true); // Block back navigation
  const user = useAuthUser();
  const actions = useAuthActions();
  const [loading, setLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);

  useEffect(() => {
    analyticsService.track('notification_permission_viewed');
    checkExistingPermission();
  }, []);

  const finishOnboarding = async () => {
    // Don't call completeOnboarding() here — it sets isOnboarded=true which
    // triggers a redirect to /(tabs) before identity-select can render.
    // completeOnboarding() is called in identity-select.tsx instead.
    router.replace('/onboarding/identity-select');
  };

  const checkExistingPermission = async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (!isMounted()) return;
      setPermissionStatus(status);

      // If already granted, skip this screen
      if (status === 'granted') {
        await finishOnboarding();
      }
    } catch (error) {
      // Don't auto-navigate, let user choose
    }
  };

  const handleEnableNotifications = async () => {
    setLoading(true);

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus === 'granted') {
        analyticsService.track('notification_permission_responded', { result: 'granted' });
        // Get and save push token (best-effort, don't block navigation)
        try {
          await Notifications.getExpoPushTokenAsync({
            projectId: '58b80355-a254-4d4a-80ce-d2bc3272b144',
          });
        } catch (tokenError) {
          // silently handle
        }

        await finishOnboarding();
      } else {
        analyticsService.track('notification_permission_responded', { result: 'denied' });
        await finishOnboarding();
      }
    } catch (error) {
      await finishOnboarding();
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    analyticsService.track('notification_permission_responded', { result: 'skipped' });
    await finishOnboarding();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background.secondary} />

      <View style={styles.content}>
        {/* Bell Animation/Illustration */}
        <View style={styles.illustrationContainer}>
          <View style={styles.bellContainer}>
            <View style={styles.bellCircle}>
              <Ionicons name="notifications" size={56} color={Colors.primary[600]} />
            </View>
            <View style={styles.notificationBadge}>
              <ThemedText style={styles.badgeText}>3</ThemedText>
            </View>
          </View>

          {/* Notification Preview Cards */}
          <View style={styles.previewCard1}>
            <View style={styles.previewDot} />
            <View style={styles.previewLines}>
              <View style={styles.previewLine1} />
              <View style={styles.previewLine2} />
            </View>
          </View>
          <View style={styles.previewCard2}>
            <View style={[styles.previewDot, { backgroundColor: Colors.gold }]} />
            <View style={styles.previewLines}>
              <View style={styles.previewLine1} />
              <View style={styles.previewLine2} />
            </View>
          </View>
        </View>

        {/* Title */}
        <ThemedText style={styles.title}>Stay in the Loop</ThemedText>

        {/* Description */}
        <ThemedText style={styles.description}>
          Enable notifications to never miss out on amazing deals and updates
        </ThemedText>

        {/* Benefits List */}
        <View style={styles.benefitsList}>
          {BENEFITS.map((benefit, index) => (
            <View key={index} style={styles.benefitItem}>
              <View style={styles.benefitIcon}>
                <Ionicons name={benefit.icon as any} size={24} color={Colors.primary[600]} />
              </View>
              <View style={styles.benefitContent}>
                <ThemedText style={styles.benefitTitle}>{benefit.title}</ThemedText>
                <ThemedText style={styles.benefitDescription}>{benefit.description}</ThemedText>
              </View>
              <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            </View>
          ))}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <Pressable
          style={styles.enableButton}
          onPress={handleEnableNotifications}
          disabled={loading}
          accessible={true}
          accessibilityLabel="Enable notifications"
          accessibilityRole="button"
        >
          <LinearGradient
            colors={[Colors.primary[600], Colors.primary[700]]}
            style={styles.enableButtonGradient}
          >
            {loading ? (
              <ActivityIndicator color={colors.background.primary} />
            ) : (
              <>
                <Ionicons name="notifications" size={20} color={colors.background.primary} />
                <ThemedText style={styles.enableButtonText}>Enable Notifications</ThemedText>
              </>
            )}
          </LinearGradient>
        </Pressable>

        <Pressable
          style={styles.skipButton}
          onPress={handleSkip}
          accessible={true}
          accessibilityLabel="Skip for now"
          accessibilityRole="button"
        >
          <ThemedText style={styles.skipButtonText}>Skip for Now</ThemedText>
        </Pressable>

        <View style={styles.footer}>
          <Ionicons name="settings-outline" size={14} color={Colors.text.tertiary} />
          <ThemedText style={styles.footerText}>
            You can change this anytime in Settings
          </ThemedText>
        </View>
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
    width: 200,
    height: 180,
    marginBottom: Spacing['2xl'],
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellContainer: {
    position: 'relative',
  },
  bellCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.medium,
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.background.secondary,
  },
  badgeText: {
    ...Typography.labelSmall,
    color: colors.background.primary,
  },
  previewCard1: {
    position: 'absolute',
    top: 20,
    right: 10,
    width: 80,
    height: 40,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    ...Shadows.subtle,
    transform: [{ rotate: '10deg' }],
  },
  previewCard2: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    width: 80,
    height: 40,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    ...Shadows.subtle,
    transform: [{ rotate: '-10deg' }],
  },
  previewDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary[100],
  },
  previewLines: {
    flex: 1,
    gap: 4,
  },
  previewLine1: {
    height: 6,
    backgroundColor: Colors.gray[200],
    borderRadius: 3,
    width: '100%',
  },
  previewLine2: {
    height: 6,
    backgroundColor: Colors.gray[100],
    borderRadius: 3,
    width: '60%',
  },
  title: {
    ...Typography.h1,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  description: {
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing['2xl'],
  },
  benefitsList: {
    width: '100%',
    gap: Spacing.md,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadows.subtle,
  },
  benefitIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    ...Typography.label,
    color: Colors.text.primary,
    marginBottom: 2,
  },
  benefitDescription: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  buttonContainer: {
    padding: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? Spacing['3xl'] : Spacing.lg,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    alignItems: 'center',
  },
  enableButton: {
    width: '100%',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  enableButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.base,
    gap: Spacing.sm,
  },
  enableButtonText: {
    ...Typography.button,
    color: colors.background.primary,
  },
  skipButton: {
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
  },
  skipButtonText: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  footerText: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
});

export default withErrorBoundary(NotificationPermissionPage, 'OnboardingNotificationPermission');
