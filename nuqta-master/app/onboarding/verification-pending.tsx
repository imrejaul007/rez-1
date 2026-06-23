import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React from 'react';
import { View, StyleSheet, StatusBar, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';
import { useBackButton } from '@/hooks/useSafeNavigation';

function VerificationPendingPage() {
  const router = useRouter();
  useBackButton(() => true);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="time-outline" size={56} color={colors.infoScale[500]} />
        </View>
        <ThemedText style={styles.title}>Under Review</ThemedText>
        <ThemedText style={styles.subtitle}>
          Your verification is being reviewed. This usually takes 2-4 hours.
          We'll notify you once it's complete.
        </ThemedText>

        <Pressable
          onPress={() => router.replace('/(tabs)')}
          style={styles.ctaButton}
        >
          <ThemedText style={styles.ctaText}>Explore Deals</ThemedText>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    padding: spacing['2xl'],
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.infoScale[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing['2xl'],
  },
  ctaButton: {
    backgroundColor: colors.brand.purple,
    paddingVertical: 14,
    paddingHorizontal: spacing['2xl'],
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.medium,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

export default withErrorBoundary(VerificationPendingPage, 'OnboardingVerificationPending');
