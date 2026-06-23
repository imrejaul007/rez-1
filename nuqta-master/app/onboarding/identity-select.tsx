// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useEffect } from 'react';
import { useIsMounted } from '@/hooks/useIsMounted';
import { View, StyleSheet, StatusBar, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useBackButton } from '@/hooks/useSafeNavigation';
import { ThemedText } from '@/components/ThemedText';
import { colors, spacing, gradients } from '@/constants/theme';
import IdentityCard from '@/components/onboarding/IdentityCard';
import { useUserIdentityStore } from '@/stores/userIdentityStore';
import { useAuthUser, useAuthActions } from '@/stores/selectors';
import * as identityApi from '@/services/identityApi';
import analyticsService, { IdentityAnalyticsEvents } from '@/services/analyticsService';
import { Pressable } from 'react-native';

const IDENTITIES = [
  {
    id: 'student' as const,
    icon: 'school' as keyof typeof Ionicons.glyphMap,
    title: "I'm a Student",
    subtitle: 'Unlock exclusive campus deals',
    accentColor: colors.brand.purple,
    backgroundColor: colors.primary[50],
    next: '/onboarding/student-verify' as const,
  },
  {
    id: 'corporate' as const,
    icon: 'briefcase' as keyof typeof Ionicons.glyphMap,
    title: 'I Work at a Company',
    subtitle: 'Unlock work perks near your office',
    accentColor: colors.secondary[600],
    backgroundColor: colors.background.tertiary,
    next: '/onboarding/corporate-verify' as const,
  },
  {
    id: 'other' as const,
    icon: 'shield-checkmark' as keyof typeof Ionicons.glyphMap,
    title: 'Defence / Healthcare / Teacher',
    subtitle: 'Unlock verified segment deals',
    accentColor: colors.successScale[600],
    backgroundColor: '#F0FDF4',
    next: '/onboarding/other-verify' as const,
  },
  {
    id: 'general' as const,
    icon: 'person-outline' as keyof typeof Ionicons.glyphMap,
    title: 'Just browsing',
    subtitle: 'Explore all public deals nearby',
    accentColor: colors.text.secondary,
    backgroundColor: colors.gray[50],
    next: '/(tabs)' as const,
  },
];

function IdentitySelectPage() {
  const router = useRouter();
  const isMounted = useIsMounted();
  const { setIdentity } = useUserIdentityStore();
  const user = useAuthUser();
  const actions = useAuthActions();
  useBackButton(() => true); // Block back navigation

  useEffect(() => {
    analyticsService.track(IdentityAnalyticsEvents.IDENTITY_GATE_SEEN);
  }, []);

  // Complete onboarding (sets isOnboarded=true) right before navigating away.
  // Must happen HERE, not in notification-permission, to avoid a race condition
  // where isOnboarded=true triggers a redirect to /(tabs) before this screen renders.
  const completeOnboardingIfNeeded = async () => {
    if (!user?.isOnboarded) {
      try {
        await actions.completeOnboarding({
          preferences: {
            notifications: { push: true, email: true, sms: true },
            theme: 'light',
          },
        });
      } catch {
        // Continue even if API fails — (tabs)/index.tsx has a fallback that retries
      }
    }
  };

  const handleSelect = async (identity: (typeof IDENTITIES)[number]) => {
    analyticsService.track(IdentityAnalyticsEvents.IDENTITY_SELECTED, {
      choice: identity.id,
    });

    // Save stated identity — non-blocking
    setIdentity({ statedIdentity: identity.id });
    identityApi.setStatedIdentity(identity.id).catch(() => {});

    if (identity.id === 'general' || identity.next === '/(tabs)') {
      // Only complete onboarding when going directly to home.
      // Do NOT call completeOnboarding when going to verification screens —
      // setting isOnboarded=true triggers a redirect to /(tabs) from other screens.
      await completeOnboardingIfNeeded();
      if (!isMounted()) return;
      router.replace('/(tabs)');
    } else {
      // Going to student-verify, corporate-verify, etc.
      // completeOnboarding will be called in verification-success or skip handlers.
      router.push(identity.next as any);
    }
  };

  const handleSkip = async () => {
    analyticsService.track(IdentityAnalyticsEvents.IDENTITY_SKIP_CLICKED);
    setIdentity({ statedIdentity: 'general' });
    identityApi.setStatedIdentity('general').catch(() => {});

    await completeOnboardingIfNeeded();
    if (!isMounted()) return;
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[colors.secondary[700], colors.secondary[900] || colors.secondary[800]]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <ThemedText style={styles.headerTitle}>
            How do you want to save?
          </ThemedText>
          <ThemedText style={styles.headerSubtitle}>
            Choose your identity to unlock personalized deals
          </ThemedText>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {IDENTITIES.map((identity) => (
          <IdentityCard
            key={identity.id}
            icon={identity.icon}
            title={identity.title}
            subtitle={identity.subtitle}
            accentColor={identity.accentColor}
            backgroundColor={identity.backgroundColor}
            onPress={() => handleSelect(identity)}
          />
        ))}

        <Pressable onPress={handleSkip} style={styles.skipButton}>
          <ThemedText style={styles.skipText}>Skip for now</ThemedText>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    paddingTop: 60,
    paddingBottom: spacing['2xl'],
    paddingHorizontal: spacing.xl,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: spacing.xl,
    paddingBottom: 100,
  },
  skipButton: {
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
  },
  skipText: {
    fontSize: 14,
    color: colors.text.tertiary,
    textDecorationLine: 'underline',
  },
});

export default withErrorBoundary(IdentitySelectPage, 'OnboardingIdentitySelect');
