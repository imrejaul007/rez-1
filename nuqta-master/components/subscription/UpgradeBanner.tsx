// Upgrade Banner Component
// Promotional banner to encourage users to upgrade from free tier

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { SubscriptionTier } from '@/types/subscription.types';
import {
  SUBSCRIPTION_COLORS,
  SUBSCRIPTION_SPACING,
  SUBSCRIPTION_BORDER_RADIUS,
} from '@/styles/subscriptionStyles';
import { colors } from '@/constants/theme';

interface UpgradeBannerProps {
  currentTier: SubscriptionTier;
  onUpgrade: () => void;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const TIER_MESSAGES = {
  free: {
    title: 'Unlock Premium Benefits!',
    subtitle: '2x cashback, free delivery & exclusive deals',
    features: ['2x Cashback', 'Free Delivery', 'Priority Support'],
  },
  premium: {
    title: 'Go VIP for Maximum Rewards!',
    subtitle: '3x cashback, personal shopper & premium events',
    features: ['3x Cashback', 'Concierge Service', 'Premium Events'],
  },
  vip: {
    title: 'You\'re a VIP Member!',
    subtitle: 'Enjoying all premium benefits',
    features: ['3x Cashback', 'All Premium Benefits', 'VIP Exclusive'],
  },
};

function UpgradeBanner({
  currentTier,
  onUpgrade,
  dismissible = true,
  onDismiss,
}: UpgradeBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const fadeAnim = useSharedValue(1);

  if (dismissed || currentTier === 'vip') {
    return null;
  }

  const message = TIER_MESSAGES[currentTier];
  const gradientColors =
    currentTier === 'free'
      ? [colors.brand.purpleLight, colors.brand.purple]
      : [colors.warningScale[400], colors.warningScale[700]];

  const handleDismiss = () => {
    fadeAnim.value = withTiming(0, { duration: 300 });
    // Callback after animation:
    setDismissed(true);
      onDismiss?.();
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <LinearGradient colors={gradientColors as any} style={styles.banner}>
        <View style={styles.contentContainer}>
          {/* Close Button */}
          {dismissible && (
            <Pressable style={styles.closeButton} onPress={handleDismiss}>
              <Ionicons name="close" size={20} color={SUBSCRIPTION_COLORS.white} />
            </Pressable>
          )}

          {/* Main Content */}
          <View style={styles.textContent}>
            <ThemedText style={styles.title}>{message.title}</ThemedText>
            <ThemedText style={styles.subtitle}>{message.subtitle}</ThemedText>

            {/* Features List */}
            <View style={styles.featuresContainer}>
              {message.features.map((feature) => (
                <View key={feature} style={styles.featureItem}>
                  <Ionicons
                    name="checkmark-circle"
                    size={14}
                    color={SUBSCRIPTION_COLORS.white}
                  />
                  <ThemedText style={styles.featureText}>{feature}</ThemedText>
                </View>
              ))}
            </View>
          </View>

          {/* CTA Button */}
          <Pressable
            style={styles.ctaButton}
            onPress={() => {
              onUpgrade();
              handleDismiss();
            }}
          >
            <ThemedText style={styles.ctaText}>
              {currentTier === 'free' ? 'View Plans' : 'Upgrade'}
            </ThemedText>
            <Ionicons
              name="arrow-forward"
              size={16}
              color={SUBSCRIPTION_COLORS.purple}
            />
          </Pressable>
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
    borderRadius: SUBSCRIPTION_BORDER_RADIUS.lg,
    padding: SUBSCRIPTION_SPACING.lg,
    minHeight: 140,
  },
  contentContainer: {
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: SUBSCRIPTION_SPACING.md,
    zIndex: 10,
  },
  textContent: {
    marginRight: SUBSCRIPTION_SPACING.xl,
    marginBottom: SUBSCRIPTION_SPACING.md,
  },
  title: {
    color: SUBSCRIPTION_COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: SUBSCRIPTION_SPACING.xs,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    marginBottom: SUBSCRIPTION_SPACING.md,
  },
  featuresContainer: {
    gap: SUBSCRIPTION_SPACING.xs,
    marginBottom: SUBSCRIPTION_SPACING.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SUBSCRIPTION_SPACING.sm,
  },
  featureText: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: 12,
    fontWeight: '500',
  },
  ctaButton: {
    backgroundColor: SUBSCRIPTION_COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SUBSCRIPTION_SPACING.md,
    paddingHorizontal: SUBSCRIPTION_SPACING.lg,
    borderRadius: SUBSCRIPTION_BORDER_RADIUS.md,
    gap: SUBSCRIPTION_SPACING.sm,
    alignSelf: 'flex-start',
  },
  ctaText: {
    color: SUBSCRIPTION_COLORS.purple,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default React.memo(UpgradeBanner);
