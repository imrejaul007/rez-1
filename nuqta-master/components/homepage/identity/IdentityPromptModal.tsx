import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/ThemedText';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';
import { useUserIdentityStore } from '@/stores/userIdentityStore';
import { useAuthUser, useIsAuthenticated } from '@/stores';
import * as identityApi from '@/services/identityApi';
import analyticsService, { IdentityAnalyticsEvents } from '@/services/analyticsService';
import { useIsMounted } from '@/hooks/useIsMounted';

const STORAGE_KEY = 'identity_prompt_shown';

const OPTIONS = [
  { id: 'student' as const, icon: 'school' as const, title: "I'm a Student", color: colors.brand.purple },
  { id: 'corporate' as const, icon: 'briefcase' as const, title: 'I Work at a Company', color: colors.secondary[600] },
  { id: 'general' as const, icon: 'person-outline' as const, title: 'Just browsing', color: colors.text.secondary },
];

export default function IdentityPromptModal() {
  const router = useRouter();
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const { statedIdentity, setIdentity } = useUserIdentityStore();
  const [visible, setVisible] = useState(false);
  const isMounted = useIsMounted();

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    if (statedIdentity) return; // Already set
    if (!(user as any)?.auth?.isOnboarded) return; // Not yet onboarded

    // Check if already shown
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (!val) {
        if (!isMounted()) return;
        setVisible(true);
        analyticsService.track(IdentityAnalyticsEvents.IDENTITY_GATE_SEEN, { source: 'modal' });
      }
    });
  }, [isAuthenticated, user, statedIdentity]);

  const handleSelect = async (id: 'student' | 'corporate' | 'general') => {
    analyticsService.track(IdentityAnalyticsEvents.IDENTITY_SELECTED, { choice: id, source: 'modal' });
    setIdentity({ statedIdentity: id });
    if (!isMounted()) return;
    identityApi.setStatedIdentity(id).catch(() => {});
    if (!isMounted()) return;
    await AsyncStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);

    if (id === 'student') {
      router.push('/onboarding/student-verify' as any);
    } else if (id === 'corporate') {
      router.push('/onboarding/corporate-verify' as any);
    }
  };

  const handleDismiss = async () => {
    setIdentity({ statedIdentity: 'general' });
    if (!isMounted()) return;
    identityApi.setStatedIdentity('general').catch(() => {});
    if (!isMounted()) return;
    await AsyncStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Dismiss */}
          <Pressable onPress={handleDismiss} style={styles.dismissButton} hitSlop={12}>
            <Ionicons name="close" size={22} color={colors.text.tertiary} />
          </Pressable>

          <ThemedText style={styles.title}>How do you want to save?</ThemedText>
          <ThemedText style={styles.subtitle}>
            Choose your identity to unlock personalized deals
          </ThemedText>

          {OPTIONS.map((opt) => (
            <Pressable
              key={opt.id}
              style={styles.optionCard}
              onPress={() => handleSelect(opt.id)}
            >
              <View style={[styles.iconCircle, { backgroundColor: opt.color + '20' }]}>
                <Ionicons name={opt.icon} size={22} color={opt.color} />
              </View>
              <ThemedText style={styles.optionTitle}>{opt.title}</ThemedText>
              <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xl,
    paddingBottom: 40,
  },
  dismissButton: {
    position: 'absolute',
    top: spacing.base,
    right: spacing.base,
    zIndex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: spacing.xl,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[50],
    marginBottom: spacing.md,
    ...shadows.subtle,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  optionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
});
