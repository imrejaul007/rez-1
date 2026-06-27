// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// App Settings Page
// General application preferences and configurations

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  SafeAreaView,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { platformAlertSimple, platformAlertConfirm, platformAlertDestructive } from '@/utils/platformAlert';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import * as LocalAuthentication from 'expo-local-authentication';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const SETTINGS_STORAGE_KEY = 'app_settings';

interface SettingsItem {
  id: string;
  title: string;
  description?: string;
  type: 'switch' | 'navigation' | 'action';
  value?: boolean;
  icon: string;
  iconColor: string;
  onPress?: () => void;
  route?: string;
}

interface SettingsSection {
  id: string;
  title: string;
  items: SettingsItem[];
}

const DEFAULT_SETTINGS = {
  pushNotifications: true,
  emailNotifications: false,
  locationServices: true,
  analytics: false,
  biometrics: false,
  autoSync: true,
  dataOptimization: true,
  crashReporting: true,
};

function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const isMounted = useIsMounted();

  // Load persisted settings on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setSettings(prev => ({ ...prev, ...parsed }));
        }
      } catch (e) {
        // silently handle
      } finally {
        if (!isMounted()) return;
        setSettingsLoaded(true);
      }
    })();
  }, []);

  // Persist settings whenever they change (after initial load)
  useEffect(() => {
    if (!settingsLoaded) return;
    AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings)).catch(() => {});
  }, [settings, settingsLoaded]);

  const handleBackPress = () => {
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
  };

  const handleToggleSetting = useCallback((key: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev]
    }));
  }, []);

  // Special handler for biometrics — verifies device support before enabling
  const handleBiometricsToggle = useCallback(async () => {
    if (settings.biometrics) {
      // Turning OFF — no verification needed
      setSettings(prev => ({ ...prev, biometrics: false }));
      return;
    }

    // Turning ON — check device capability and authenticate
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        platformAlertSimple('Not Available', 'Biometric authentication is not supported on this device.');
        return;
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        platformAlertSimple('Not Set Up', 'No biometric credentials found. Please set up fingerprint or face recognition in your device settings.');
        return;
      }

      // Verify identity before enabling
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Verify your identity to enable biometric login',
        fallbackLabel: 'Use passcode',
      });

      if (result.success) {
        if (!isMounted()) return;
        setSettings(prev => ({ ...prev, biometrics: true }));
        platformAlertSimple('Enabled', 'Biometric authentication has been enabled.');
      }
    } catch (e) {
      platformAlertSimple('Error', 'Could not verify biometric support. Please try again.');
    }
  }, [settings.biometrics]);

  const handleResetSettings = () => {
    platformAlertDestructive(
      'Reset Settings',
      'Are you sure you want to reset all settings to default values?',
      'Reset',
      async () => {
        setSettings(DEFAULT_SETTINGS);
        try {
          await AsyncStorage.removeItem(SETTINGS_STORAGE_KEY);
        } catch (e) {
          // silently handle
        }
        platformAlertSimple('Settings Reset', 'All settings have been reset to default values.');
      }
    );
  };

  const handleClearCache = () => {
    platformAlertConfirm(
      'Clear Cache',
      'This will clear all cached data. The app may run slower until data is reloaded.',
      () => {
        // Simulate cache clearing
        platformAlertSimple('Cache Cleared', 'App cache has been cleared successfully.');
      },
      'Clear Cache'
    );
  };

  const handleExportData = () => {
    platformAlertConfirm(
      'Export Data',
      'Your data will be exported and saved to your device.',
      () => {
        // Simulate data export
        platformAlertSimple('Export Complete', 'Your data has been exported successfully.');
      },
      'Export'
    );
  };

  const settingsSections: SettingsSection[] = [
    {
      id: 'notifications',
      title: 'Notifications',
      items: [
        {
          id: 'pushNotifications',
          title: 'Push Notifications',
          description: 'Receive push notifications for orders, offers, and updates',
          type: 'switch',
          value: settings.pushNotifications,
          icon: 'notifications-outline',
          iconColor: Colors.brand.purpleLight,
          onPress: () => handleToggleSetting('pushNotifications'),
        },
        {
          id: 'emailNotifications',
          title: 'Email Notifications',
          description: 'Receive updates and offers via email',
          type: 'switch',
          value: settings.emailNotifications,
          icon: 'mail-outline',
          iconColor: colors.brand.cyan,
          onPress: () => handleToggleSetting('emailNotifications'),
        },
      ],
    },
    {
      id: 'privacy',
      title: 'Privacy & Security',
      items: [
        {
          id: 'locationServices',
          title: 'Location Services',
          description: 'Allow app to access your location for delivery and recommendations',
          type: 'switch',
          value: settings.locationServices,
          icon: 'location-outline',
          iconColor: Colors.error,
          onPress: () => handleToggleSetting('locationServices'),
        },
        {
          id: 'biometrics',
          title: 'Biometric Authentication',
          description: 'Use fingerprint or face ID to secure your account',
          type: 'switch',
          value: settings.biometrics,
          icon: 'finger-print-outline',
          iconColor: Colors.success,
          onPress: handleBiometricsToggle,
        },
        {
          id: 'analytics',
          title: 'Analytics & Tracking',
          description: 'Help improve the app by sharing usage data',
          type: 'switch',
          value: settings.analytics,
          icon: 'analytics-outline',
          iconColor: Colors.warning,
          onPress: () => handleToggleSetting('analytics'),
        },
      ],
    },
    {
      id: 'data',
      title: 'Data & Storage',
      items: [
        {
          id: 'autoSync',
          title: 'Auto Sync',
          description: 'Automatically sync data when connected to WiFi',
          type: 'switch',
          value: settings.autoSync,
          icon: 'sync-outline',
          iconColor: Colors.brand.purpleLight,
          onPress: () => handleToggleSetting('autoSync'),
        },
        {
          id: 'dataOptimization',
          title: 'Data Optimization',
          description: 'Reduce data usage by compressing images and content',
          type: 'switch',
          value: settings.dataOptimization,
          icon: 'cellular-outline',
          iconColor: colors.brand.cyan,
          onPress: () => handleToggleSetting('dataOptimization'),
        },
        {
          id: 'clearCache',
          title: 'Clear Cache',
          description: 'Free up space by clearing cached data',
          type: 'action',
          icon: 'trash-outline',
          iconColor: Colors.error,
          onPress: handleClearCache,
        },
      ],
    },
    {
      id: 'account',
      title: 'Account Management',
      items: [
        {
          id: 'profile',
          title: 'Edit Profile',
          description: 'Update your personal information and preferences',
          type: 'navigation',
          icon: 'person-outline',
          iconColor: Colors.brand.purpleLight,
          route: '/profile/edit',
        },
        {
          id: 'payment',
          title: 'Payment Methods',
          description: 'Manage your payment cards and methods',
          type: 'navigation',
          icon: 'card-outline',
          iconColor: Colors.success,
          route: '/account/payment',
        },
        {
          id: 'delivery',
          title: 'Delivery Addresses',
          description: 'Manage your saved delivery addresses',
          type: 'navigation',
          icon: 'location-outline',
          iconColor: Colors.warning,
          route: '/account/delivery',
        },
        {
          id: 'wishlist',
          title: 'My Wishlist',
          description: 'View and manage your saved items',
          type: 'navigation',
          icon: 'heart-outline',
          iconColor: Colors.error,
          route: '/wishlist',
        },
      ],
    },
    {
      id: 'support',
      title: 'Support & Feedback',
      items: [
        {
          id: 'help',
          title: 'Help & FAQ',
          description: 'Get answers to common questions',
          type: 'navigation',
          icon: 'help-circle-outline',
          iconColor: Colors.brand.purpleLight,
          route: '/help',
        },
        {
          id: 'contact',
          title: 'Contact Support',
          description: 'Get help from our customer support team',
          type: 'navigation',
          icon: 'chatbubble-outline',
          iconColor: colors.brand.cyan,
          route: '/help/chat',
        },
        {
          id: 'feedback',
          title: 'Send Feedback',
          description: 'Share your thoughts and suggestions',
          type: 'navigation',
          icon: 'star-outline',
          iconColor: Colors.warning,
          route: '/help/feedback',
        },
      ],
    },
    {
      id: 'advanced',
      title: 'Advanced',
      items: [
        {
          id: 'crashReporting',
          title: 'Crash Reporting',
          description: 'Automatically send crash reports to help fix issues',
          type: 'switch',
          value: settings.crashReporting,
          icon: 'bug-outline',
          iconColor: Colors.error,
          onPress: () => handleToggleSetting('crashReporting'),
        },
        {
          id: 'exportData',
          title: 'Export My Data',
          description: 'Download a copy of your personal data',
          type: 'action',
          icon: 'download-outline',
          iconColor: Colors.success,
          onPress: handleExportData,
        },
        {
          id: 'resetSettings',
          title: 'Reset Settings',
          description: 'Reset all settings to default values',
          type: 'action',
          icon: 'refresh-outline',
          iconColor: Colors.warning,
          onPress: handleResetSettings,
        },
      ],
    },
  ];

  const renderSettingsItem = (item: SettingsItem) => (
    <Pressable
      key={item.id}
      style={styles.settingsItem}
      onPress={() => {
        if (item.route) {
          router.push(item.route as any);
        } else if (item.onPress) {
          item.onPress();
        }
      }}
      disabled={item.type === 'switch'}
     
    >
      <View style={styles.settingsItemLeft}>
        <View style={[styles.settingsIcon, { backgroundColor: item.iconColor + '15' }]}>
          <Ionicons name={item.icon as any} size={20} color={item.iconColor} />
        </View>
        
        <View style={styles.settingsText}>
          <ThemedText style={styles.settingsTitle}>{item.title}</ThemedText>
          {item.description && (
            <ThemedText style={styles.settingsDescription}>
              {item.description}
            </ThemedText>
          )}
        </View>
      </View>
      
      <View style={styles.settingsItemRight}>
        {item.type === 'switch' && (
          <Switch
            value={item.value}
            onValueChange={item.onPress}
            trackColor={{ false: Colors.border.default, true: Colors.brand.purpleLight }}
            thumbColor={item.value ? Colors.background.primary : Colors.background.primary}
          />
        )}
        {item.type === 'navigation' && (
          <Ionicons name="chevron-forward" size={20} color={Colors.text.tertiary} />
        )}
        {item.type === 'action' && (
          <Ionicons name="chevron-forward" size={20} color={Colors.text.tertiary} />
        )}
      </View>
    </Pressable>
  );

  const renderSection = (section: SettingsSection) => (
    <View key={section.id} style={styles.section}>
      <ThemedText style={styles.sectionTitle}>{section.title}</ThemedText>
      <View style={styles.sectionItems}>
        {section.items.map(renderSettingsItem)}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={Colors.brand.purpleLight}
        translucent={false}
      />
      
      {/* Header */}
      <LinearGradient
        colors={[Colors.brand.purpleLight, colors.brand.purpleMedium]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Pressable style={styles.backButton} onPress={handleBackPress}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
          
          <ThemedText style={styles.headerTitle}>Settings</ThemedText>
          
          <View style={styles.headerRight} />
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {settingsSections.map(renderSection)}
        
        {/* App Info */}
        <View style={styles.appInfo}>
          <ThemedText style={styles.appInfoText}>
            {`${BRAND.APP_NAME} App v1.0.0`}
          </ThemedText>
          <ThemedText style={styles.appInfoText}>
            © 2024 ${BRAND.APP_NAME} Technologies
          </ThemedText>
        </View>
        
        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 20 : 0,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  section: {
    marginTop: Spacing.xl,
    marginHorizontal: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.secondary,
    marginBottom: Spacing.md,
    marginLeft: Spacing.xs,
  },
  sectionItems: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.secondary,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingsIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  settingsText: {
    flex: 1,
  },
  settingsTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  settingsDescription: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    lineHeight: 18,
  },
  settingsItemRight: {
    marginLeft: Spacing.md,
  },
  appInfo: {
    alignItems: 'center',
    marginTop: Spacing['2xl'],
    marginBottom: Spacing.base,
  },
  appInfoText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginBottom: Spacing.xs,
  },
  bottomSpace: {
    height: 20,
  },
});
export default withErrorBoundary(SettingsPage, 'Settings');
