import { withErrorBoundary } from '@/utils/withErrorBoundary';
// App Update Required Screen
// Force or suggest users to update when new version available

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  Linking,
  ScrollView,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Constants from 'expo-constants';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { catchAndReport } from '@/utils/catchAndReport';
import { useIsMounted } from '@/hooks/useIsMounted';

interface UpdateInfo {
  currentVersion: string;
  requiredVersion: string;
  latestVersion: string;
  updateType: 'force' | 'soft';
  releaseNotes: string[];
  storeUrl: {
    ios: string;
    android: string;
  };
}

function AppUpdatePage() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({
    currentVersion: Constants.expoConfig?.version || '1.0.0',
    requiredVersion: '1.2.0',
    latestVersion: params.version as string || '1.3.0',
    updateType: (params.type as 'force' | 'soft') || 'soft',
    releaseNotes: [
      'New wallet features with P2P transfers',
      'Enhanced AI-powered search',
      'Bug fixes and performance improvements',
      'New exclusive offer zones',
      'Improved notification system',
    ],
    storeUrl: {
      ios: 'https://apps.apple.com/app/rez/id123456789',
      android: 'https://play.google.com/store/apps/details?id=com.rez.app',
    },
  });

  const isForceUpdate = updateInfo.updateType === 'force';
  const [error, setError] = useState<string | null>(null);
  const isMounted = useIsMounted();

  const handleUpdateNow = async () => {
    try {
      const storeUrl = Platform.OS === 'ios'
        ? updateInfo.storeUrl.ios
        : updateInfo.storeUrl.android;

      const canOpen = await Linking.canOpenURL(storeUrl);
      if (canOpen) {
        await Linking.openURL(storeUrl);
      }
    } catch (e) { catchAndReport(e, setError, 'AppUpdate/openStoreUrl'); }
  };

  const handleLater = () => {
    if (!isForceUpdate) {
      router.canGoBack() ? router.back() : router.replace('/(tabs)');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background.secondary} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <CachedImage
              source={require('@/assets/images/icon.png')}
              style={styles.logo}
              contentFit="contain"
            />
            <View style={styles.updateIconBadge}>
              <Ionicons name="arrow-up-circle" size={32} color={Colors.primary[600]} />
            </View>
          </View>
        </View>

        {/* Title */}
        <ThemedText style={styles.title}>Update Available</ThemedText>

        {/* Version Info */}
        <View style={styles.versionContainer}>
          <View style={styles.versionBadge}>
            <ThemedText style={styles.versionLabel}>Current</ThemedText>
            <ThemedText style={styles.versionText}>v{updateInfo.currentVersion}</ThemedText>
          </View>
          <Ionicons name="arrow-forward" size={24} color={Colors.text.tertiary} />
          <View style={[styles.versionBadge, styles.newVersionBadge]}>
            <ThemedText style={[styles.versionLabel, styles.newVersionLabel]}>New</ThemedText>
            <ThemedText style={[styles.versionText, styles.newVersionText]}>v{updateInfo.latestVersion}</ThemedText>
          </View>
        </View>

        {/* Release Notes */}
        <View style={styles.releaseNotesCard}>
          <View style={styles.releaseNotesHeader}>
            <Ionicons name="sparkles" size={20} color={Colors.gold} />
            <ThemedText style={styles.releaseNotesTitle}>What's New</ThemedText>
          </View>
          {updateInfo.releaseNotes.map((note, index) => (
            <View key={index} style={styles.releaseNoteItem}>
              <View style={styles.bulletPoint} />
              <ThemedText style={styles.releaseNoteText}>{note}</ThemedText>
            </View>
          ))}
        </View>

        {/* Force Update Notice */}
        {isForceUpdate && (
          <View style={styles.forceUpdateNotice}>
            <Ionicons name="warning" size={20} color={Colors.warning} />
            <ThemedText style={styles.forceUpdateText}>
              This update is required to continue using the app
            </ThemedText>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <Pressable
          style={styles.updateButton}
          onPress={handleUpdateNow}
          accessible={true}
          accessibilityLabel="Update now"
          accessibilityRole="button"
          accessibilityHint="Opens app store to update the app"
        >
          <LinearGradient
            colors={[Colors.primary[600], Colors.primary[700]]}
            style={styles.updateButtonGradient}
          >
            <Ionicons name="download-outline" size={20} color={colors.background.primary} />
            <ThemedText style={styles.updateButtonText}>Update Now</ThemedText>
          </LinearGradient>
        </Pressable>

        {!isForceUpdate && (
          <Pressable
            style={styles.laterButton}
            onPress={handleLater}
            accessible={true}
            accessibilityLabel="Update later"
            accessibilityRole="button"
            accessibilityHint="Skip this update for now"
          >
            <ThemedText style={styles.laterButtonText}>Later</ThemedText>
          </Pressable>
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
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
    paddingBottom: 120,
  },
  logoSection: {
    marginBottom: Spacing['2xl'],
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: Colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.medium,
  },
  logo: {
    width: 80,
    height: 80,
  },
  updateIconBadge: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.subtle,
  },
  title: {
    ...Typography.h1,
    color: Colors.text.primary,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  versionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
    gap: Spacing.md,
  },
  versionBadge: {
    backgroundColor: Colors.gray[100],
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    minWidth: 80,
  },
  newVersionBadge: {
    backgroundColor: Colors.gold,
  },
  versionLabel: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginBottom: Spacing.xs,
  },
  newVersionLabel: {
    color: Colors.midnightNavy,
  },
  versionText: {
    ...Typography.label,
    color: Colors.text.primary,
  },
  newVersionText: {
    color: Colors.midnightNavy,
  },
  releaseNotesCard: {
    width: '100%',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
    ...Shadows.subtle,
  },
  releaseNotesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  releaseNotesTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
  },
  releaseNoteItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary[600],
    marginTop: 7,
  },
  releaseNoteText: {
    ...Typography.body,
    color: Colors.text.secondary,
    flex: 1,
  },
  forceUpdateNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning + '15',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  forceUpdateText: {
    ...Typography.bodySmall,
    color: Colors.warning,
    flex: 1,
  },
  buttonContainer: {
    padding: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? Spacing['3xl'] : Spacing.lg,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  updateButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  updateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.base,
    gap: Spacing.sm,
  },
  updateButtonText: {
    ...Typography.button,
    color: colors.background.primary,
  },
  laterButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  laterButtonText: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
});

export default withErrorBoundary(AppUpdatePage, 'SystemAppUpdate');
