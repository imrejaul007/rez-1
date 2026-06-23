// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React from 'react';
import { View, StyleSheet, StatusBar, ScrollView, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { colors, spacing, borderRadius } from '@/constants/theme';
import IdentityCard from '@/components/onboarding/IdentityCard';

const CATEGORIES = [
  {
    id: 'defence',
    icon: 'shield' as keyof typeof Ionicons.glyphMap,
    title: 'Defence Personnel',
    subtitle: 'Army, Navy, Air Force, Paramilitary',
    accentColor: colors.successScale[600],
    backgroundColor: '#F0FDF4',
    next: '/onboarding/defence-verify' as const,
  },
  {
    id: 'healthcare',
    icon: 'medkit' as keyof typeof Ionicons.glyphMap,
    title: 'Healthcare Professional',
    subtitle: 'Doctor, Nurse, Paramedic, Pharmacist',
    accentColor: '#0891B2',
    backgroundColor: '#ECFEFF',
    next: '/onboarding/healthcare-verify' as const,
  },
  {
    id: 'teacher',
    icon: 'book' as keyof typeof Ionicons.glyphMap,
    title: 'Teacher / Educator',
    subtitle: 'School, College, University',
    accentColor: colors.warningScale[600],
    backgroundColor: '#FFFBEB',
    next: '/onboarding/teacher-verify' as const,
  },
];

function OtherVerifyPage() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </Pressable>
        <View style={styles.headerIcon}>
          <Ionicons name="shield-checkmark" size={40} color={colors.successScale[600]} />
        </View>
        <ThemedText style={styles.headerTitle}>Choose Your Category</ThemedText>
        <ThemedText style={styles.headerSubtitle}>
          Select your professional identity for verification
        </ThemedText>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {CATEGORIES.map((cat) => (
          <IdentityCard
            key={cat.id}
            icon={cat.icon}
            title={cat.title}
            subtitle={cat.subtitle}
            accentColor={cat.accentColor}
            backgroundColor={cat.backgroundColor}
            onPress={() => router.push(cat.next as any)}
          />
        ))}
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
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    left: spacing.base,
    top: Platform.OS === 'ios' ? 56 : 44,
    padding: spacing.sm,
  },
  headerIcon: {
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: spacing.xl,
    paddingBottom: 100,
  },
});

export default withErrorBoundary(OtherVerifyPage, 'OnboardingOtherVerify');
