import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, StatusBar, Pressable, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ThemedText } from '@/components/ThemedText';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';
import CoinRainOverlay from '@/components/ui/CoinRainOverlay';
import { triggerNotification } from '@/utils/haptics';
import analyticsService, { IdentityAnalyticsEvents } from '@/services/analyticsService';
import { useBackButton } from '@/hooks/useSafeNavigation';
import { useAuthUser, useAuthActions } from '@/stores/selectors';
import { useIsMounted } from '@/hooks/useIsMounted';
import { useQueryClient } from '@tanstack/react-query';
import { useUserIdentityStore } from '@/stores/userIdentityStore';
import { fetchIdentityFromProfile } from '@/services/identityApi';

const INSTANT_BENEFITS = [
  '120+ exclusive deals unlocked',
  '5% extra cashback on purchases',
  'Campus savings leaderboard',
  'Campus community access',
];

const PROVISIONAL_BENEFITS = [
  '30+ deals unlocked now',
  'Full 120+ deals in 2-4 hours',
  'Provisional campus access',
];

function VerificationSuccessPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { zone, type } = useLocalSearchParams<{ zone: string; type: string }>();
  const user = useAuthUser();
  const actions = useAuthActions();
  useBackButton(() => true); // Block back navigation

  const isInstant = type === 'instant';
  const benefits = isInstant ? INSTANT_BENEFITS : PROVISIONAL_BENEFITS;
  const [showCoinRain, setShowCoinRain] = useState(false);

  useEffect(() => {
    analyticsService.track(IdentityAnalyticsEvents.ZONE_UNLOCK_SEEN, {
      zone,
      type,
    });

    // Haptic feedback at 300ms
    const hapticTimer = setTimeout(() => {
      triggerNotification(isInstant ? 'Success' : 'Warning');
    }, 300);

    // Coin rain at 600ms (instant only)
    const coinTimer = isInstant
      ? setTimeout(() => setShowCoinRain(true), 600)
      : undefined;

    return () => {
      clearTimeout(hapticTimer);
      if (coinTimer) clearTimeout(coinTimer);
    };
  }, [zone, type, isInstant]);

  const handleContinue = async () => {
    // Complete onboarding here — this is the terminal screen before home.
    // Must NOT be called earlier or isOnboarded=true triggers redirect.
    if (!user?.isOnboarded) {
      try {
        await actions.completeOnboarding({
          preferences: {
            notifications: { push: true, email: true, sms: true },
            theme: 'light',
          },
        });
      } catch {
        // (tabs)/index.tsx has a fallback that retries
      }
    }
    // Invalidate cached data so home screen shows post-verification content
    queryClient.invalidateQueries({ queryKey: ['offers'] });
    queryClient.invalidateQueries({ queryKey: ['home'] });
    queryClient.invalidateQueries({ queryKey: ['zones'] });

    // Re-hydrate identity so featureLevel is correct immediately
    fetchIdentityFromProfile()
      .then((data) => {
        if (data) useUserIdentityStore.getState().hydrateFromBackend(data);
      })
      .catch(() => {});

    try {
      if (typeof router.dismissAll === 'function') {
        router.dismissAll();
      } else {
        while (router.canGoBack()) router.back();
      }
    } catch {}
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {showCoinRain && (
        <CoinRainOverlay
          visible={showCoinRain}
          onComplete={() => setShowCoinRain(false)}
        />
      )}

      <View style={styles.content}>
        {/* Icon */}
        <Animated.View
          entering={FadeInDown.delay(100).springify()}
          style={styles.iconContainer}
        >
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: isInstant
                  ? colors.successScale[50]
                  : colors.warningScale[50],
              },
            ]}
          >
            <Ionicons
              name={isInstant ? 'checkmark-circle' : 'flash'}
              size={72}
              color={
                isInstant
                  ? colors.successScale[500]
                  : colors.warningScale[500]
              }
            />
          </View>
        </Animated.View>

        {/* Badge */}
        <Animated.View
          entering={FadeInDown.delay(400).springify()}
          style={[
            styles.badge,
            {
              backgroundColor: isInstant
                ? colors.successScale[100]
                : colors.warningScale[100],
            },
          ]}
        >
          <ThemedText
            style={[
              styles.badgeText,
              {
                color: isInstant
                  ? colors.successScale[700]
                  : colors.warningScale[700],
              },
            ]}
          >
            {isInstant ? 'Verified!' : 'Provisional Access'}
          </ThemedText>
        </Animated.View>

        {/* Benefits */}
        <View style={styles.benefitsContainer}>
          {benefits.map((benefit, idx) => (
            <Animated.View
              key={benefit}
              entering={FadeInDown.delay(900 + idx * 150).springify()}
              style={styles.benefitRow}
            >
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={colors.successScale[500]}
              />
              <ThemedText style={styles.benefitText}>{benefit}</ThemedText>
            </Animated.View>
          ))}
        </View>

        {/* CTA */}
        <Animated.View
          entering={FadeInDown.delay(1500).springify()}
          style={styles.ctaContainer}
        >
          <Pressable onPress={handleContinue} style={styles.ctaButton}>
            <ThemedText style={styles.ctaText}>
              {isInstant ? 'See My Deals' : 'Explore Available Deals'}
            </ThemedText>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['2xl'],
  },
  iconContainer: {
    marginBottom: spacing.xl,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    marginBottom: spacing['2xl'],
  },
  badgeText: {
    fontSize: 18,
    fontWeight: '700',
  },
  benefitsContainer: {
    width: '100%',
    marginBottom: spacing['2xl'],
    gap: spacing.md,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  benefitText: {
    fontSize: 15,
    color: colors.text.primary,
    flex: 1,
  },
  ctaContainer: {
    width: '100%',
  },
  ctaButton: {
    backgroundColor: colors.brand.purple,
    paddingVertical: 16,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadows.medium,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

export default withErrorBoundary(VerificationSuccessPage, 'OnboardingVerificationSuccess');
