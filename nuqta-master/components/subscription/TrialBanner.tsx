// Trial Banner Component
// Displays trial countdown and encourages upgrade before trial ends

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { SubscriptionTier } from '@/types/subscription.types';
import {
  SUBSCRIPTION_COLORS,
  SUBSCRIPTION_SPACING,
  SUBSCRIPTION_BORDER_RADIUS,
} from '@/styles/subscriptionStyles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface TrialBannerProps {
  daysRemaining: number;
  tier: SubscriptionTier;
  onUpgrade: () => void;
  onDismiss?: () => void;
  showBenefit?: boolean;
}

const TRIAL_BENEFITS = {
  free: {
    title: 'Your Free Trial',
    benefits: ['Basic cashback', 'Access to all stores', 'Email support'],
    color: [colors.neutral[500], colors.neutral[400]],
  },
  premium: {
    title: 'Your Premium Trial',
    benefits: ['2x Cashback', 'Free delivery', 'Priority support'],
    color: [colors.brand.purpleLight, colors.brand.purpleSoft],
  },
  vip: {
    title: 'Your VIP Trial',
    benefits: ['3x Cashback', 'Free delivery', 'Concierge service'],
    color: [colors.warningScale[400], colors.warningScale[400]],
  },
};

function TrialBanner({
  daysRemaining,
  tier,
  onUpgrade,
  onDismiss,
  showBenefit = true,
}: TrialBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const fadeAnim = useSharedValue(1);
  const slideAnim = useSharedValue(0);
  const isMounted = useIsMounted();

  const trialConfig = TRIAL_BENEFITS[tier] || TRIAL_BENEFITS.free;
  const isLastDay = daysRemaining <= 1;
  const isExpired = daysRemaining <= 0;

  useEffect(() => {
    fadeAnim.value = withTiming(1, { duration: 300 });
    slideAnim.value = withTiming(1, { duration: 400 });

    if (isExpired) {
      handleDismiss();
    }
  }, [daysRemaining]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ translateY: interpolate(slideAnim.value, [0, 1], [-100, 0]) }],
  }));

  const handleDismiss = () => {
    fadeAnim.value = withTiming(0, { duration: 300 }, (finished) => {
      if (finished) {
        runOnJS(setDismissed)(true);
        if (onDismiss) runOnJS(onDismiss)();
      }
    });
  };

  // Store dismissal preference
  const handleSaveDismissal = async () => {
    try {
      if (!isMounted()) return;
      await AsyncStorage.setItem(
        `trial_banner_dismissed_${tier}`,
        JSON.stringify({
          dismissedAt: new Date().toISOString(),
          daysRemaining,
        })
      );
    } catch (error) {
      // silently handle
    }
  };

  const onDismissWithStorage = () => {
    handleSaveDismissal();
    handleDismiss();
  };

  if (dismissed || isExpired) {
    return null;
  }

  const urgencyColor = isLastDay ? SUBSCRIPTION_COLORS.error : SUBSCRIPTION_COLORS.purple;

  return (
    <Animated.View
      style={[
        styles.container,
        containerAnimatedStyle,
      ]}
    >
      <LinearGradient
        colors={trialConfig.color as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.banner}
      >
        {/* Close Button */}
        <Pressable
          style={styles.closeButton}
          onPress={onDismissWithStorage}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name="close-circle"
            size={24}
            color={SUBSCRIPTION_COLORS.white}
          />
        </Pressable>

        <View style={styles.content}>
          {/* Icon & Header */}
          <View style={styles.headerSection}>
            <View style={styles.iconContainer}>
              <Ionicons
                name={isLastDay ? 'alert-circle' : 'timer-outline'}
                size={32}
                color={SUBSCRIPTION_COLORS.white}
              />
            </View>
            <View style={styles.headerText}>
              <ThemedText style={styles.title}>{trialConfig.title}</ThemedText>
              <ThemedText style={styles.subtitle}>
                {isLastDay
                  ? 'Upgrade today to keep enjoying benefits'
                  : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left`}
              </ThemedText>
            </View>
          </View>

          {/* Countdown Badge */}
          <View style={[styles.countdownBadge, isLastDay && styles.countdownBadgeUrgent]}>
            <ThemedText style={styles.countdownNumber}>{daysRemaining}</ThemedText>
            <ThemedText style={styles.countdownLabel}>
              day{daysRemaining !== 1 ? 's' : ''}
            </ThemedText>
          </View>

          {/* Benefits */}
          {showBenefit && (
            <View style={styles.benefitsSection}>
              {trialConfig.benefits.map((benefit) => (
                <View key={benefit} style={styles.benefitItem}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={16}
                    color={SUBSCRIPTION_COLORS.white}
                  />
                  <ThemedText style={styles.benefitText}>{benefit}</ThemedText>
                </View>
              ))}
            </View>
          )}

          {/* CTA Button */}
          <Pressable
            style={styles.upgradeButton}
            onPress={() => {
              onUpgrade();
              onDismissWithStorage();
            }}
           
          >
            <ThemedText style={styles.upgradeButtonText}>Upgrade Now</ThemedText>
            <Ionicons
              name="arrow-forward"
              size={16}
              color={urgencyColor}
            />
          </Pressable>

          {/* Warning for last day */}
          {isLastDay && (
            <View style={styles.warningMessage}>
              <Ionicons
                name="warning-outline"
                size={14}
                color={SUBSCRIPTION_COLORS.error}
              />
              <ThemedText style={styles.warningText}>
                Your trial ends today. Upgrade to keep your benefits.
              </ThemedText>
            </View>
          )}
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${Math.max((daysRemaining / 30) * 100, 5)}%`,
                backgroundColor: isLastDay ? SUBSCRIPTION_COLORS.error : SUBSCRIPTION_COLORS.white,
              },
            ]}
          />
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SUBSCRIPTION_SPACING.lg,
    marginVertical: SUBSCRIPTION_SPACING.lg,
    borderRadius: SUBSCRIPTION_BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  banner: {
    padding: SUBSCRIPTION_SPACING.lg,
    borderRadius: SUBSCRIPTION_BORDER_RADIUS.lg,
  },

  // Close Button
  closeButton: {
    position: 'absolute',
    top: SUBSCRIPTION_SPACING.md,
    right: SUBSCRIPTION_SPACING.md,
    zIndex: 10,
    padding: SUBSCRIPTION_SPACING.sm,
  },

  // Main Content
  content: {
    gap: SUBSCRIPTION_SPACING.lg,
  },

  // Header Section
  headerSection: {
    flexDirection: 'row',
    gap: SUBSCRIPTION_SPACING.lg,
    alignItems: 'flex-start',
    marginRight: SUBSCRIPTION_SPACING.xl,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: SUBSCRIPTION_BORDER_RADIUS.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: SUBSCRIPTION_COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: SUBSCRIPTION_SPACING.xs,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
  },

  // Countdown Badge
  countdownBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: SUBSCRIPTION_SPACING.md,
    paddingHorizontal: SUBSCRIPTION_SPACING.lg,
    borderRadius: SUBSCRIPTION_BORDER_RADIUS.md,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  countdownBadgeUrgent: {
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  countdownNumber: {
    color: SUBSCRIPTION_COLORS.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  countdownLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: SUBSCRIPTION_SPACING.xs,
  },

  // Benefits Section
  benefitsSection: {
    gap: SUBSCRIPTION_SPACING.sm,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SUBSCRIPTION_SPACING.sm,
  },
  benefitText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    fontWeight: '500',
  },

  // CTA Button
  upgradeButton: {
    backgroundColor: SUBSCRIPTION_COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SUBSCRIPTION_SPACING.lg,
    borderRadius: SUBSCRIPTION_BORDER_RADIUS.md,
    gap: SUBSCRIPTION_SPACING.sm,
    marginTop: SUBSCRIPTION_SPACING.md,
  },
  upgradeButtonText: {
    color: SUBSCRIPTION_COLORS.purple,
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Warning Message
  warningMessage: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SUBSCRIPTION_SPACING.md,
    paddingVertical: SUBSCRIPTION_SPACING.md,
    paddingHorizontal: SUBSCRIPTION_SPACING.lg,
    borderRadius: SUBSCRIPTION_BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  warningText: {
    color: SUBSCRIPTION_COLORS.error,
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },

  // Progress Bar
  progressBarContainer: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: SUBSCRIPTION_BORDER_RADIUS.full,
    marginTop: SUBSCRIPTION_SPACING.lg,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: SUBSCRIPTION_BORDER_RADIUS.full,
  },
});

export default React.memo(TrialBanner);
