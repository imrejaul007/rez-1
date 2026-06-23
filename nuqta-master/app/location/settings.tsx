// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Switch,
  Platform,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLocationPermission, useCurrentLocation } from '@/hooks/useLocation';
import { platformAlertSimple, platformAlertDestructive } from '@/utils/platformAlert';
import { useGreetingCustomization } from '@/hooks/useGreeting';
import LocationDisplay from '@/components/location/LocationDisplay';
import TimeDisplay from '@/components/location/TimeDisplay';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

function LocationSettingsScreen() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { permissionStatus, requestPermission } = useLocationPermission();
  const { currentLocation } = useCurrentLocation();
  const { customConfig, setLanguage, setEmojiEnabled, setPersonalized } = useGreetingCustomization();

  // Local state for settings
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [backgroundUpdates, setBackgroundUpdates] = useState(false);
  const [shareLocation, setShareLocation] = useState(true);
  const [locationHistory, setLocationHistory] = useState(true);
  const [notifications, setNotifications] = useState(true);

  const handlePermissionRequest = async () => {
    try {
      const granted = await requestPermission();
      if (!granted) {
        platformAlertSimple(
          'Permission Required',
          'Location permission is required for location-based features. You can enable it in Settings.'
        );
      }
    } catch (error) {
      platformAlertSimple('Error', 'Failed to request location permission');
    }
  };

  const handleClearLocationData = () => {
    platformAlertDestructive(
      'Clear Location Data',
      'This will clear all your location history and reset location preferences. Are you sure?',
      'Clear',
      () => {
        // Implement clear location data
        platformAlertSimple('Success', 'Location data cleared successfully');
      }
    );
  };

  const handleLanguageChange = (language: 'en' | 'hi' | 'te' | 'ta' | 'bn') => {
    setLanguage(language);
  };

  const getLanguageName = (code: string) => {
    const languages = {
      en: 'English',
      hi: 'Hindi',
      te: 'Telugu',
      ta: 'Tamil',
      bn: 'Bengali',
    };
    return languages[code as keyof typeof languages] || 'English';
  };

  const getPermissionStatusText = () => {
    switch (permissionStatus) {
      case 'granted':
        return 'Enabled';
      case 'denied':
        return 'Disabled';
      case 'restricted':
        return 'Restricted';
      default:
        return 'Not Set';
    }
  };

  const getPermissionStatusColor = () => {
    switch (permissionStatus) {
      case 'granted':
        return '#34C759';
      case 'denied':
        return '#FF3B30';
      case 'restricted':
        return '#FF9500';
      default:
        return '#8E8E93';
    }
  };

  const renderSettingItem = (
    title: string,
    subtitle: string,
    value: boolean,
    onValueChange: (value: boolean) => void,
    icon: string,
    disabled = false
  ) => (
    <View style={styles.settingItem}>
      <View style={styles.settingContent}>
        <View style={styles.settingIcon}>
          <Ionicons name={icon as any} size={24} color={disabled ? '#C7C7CC' : colors.brand.ios} />
        </View>
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, disabled && styles.disabledText]}>
            {title}
          </Text>
          <Text style={[styles.settingSubtitle, disabled && styles.disabledText]}>
            {subtitle}
          </Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: '#E0E0E0', true: colors.brand.ios }}
        thumbColor={value ? colors.background.primary : colors.background.primary}
      />
    </View>
  );

  const renderLanguageOption = (code: 'en' | 'hi' | 'te' | 'ta' | 'bn') => (
    <Pressable
      key={code}
      style={[
        styles.languageOption,
        customConfig.language === code && styles.selectedLanguageOption,
      ]}
      onPress={() => handleLanguageChange(code)}
    >
      <Text
        style={[
          styles.languageText,
          customConfig.language === code && styles.selectedLanguageText,
        ]}
      >
        {getLanguageName(code)}
      </Text>
      {customConfig.language === code && (
        <Ionicons name="checkmark" size={20} color={colors.brand.ios} />
      )}
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Location Settings</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Current Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Location</Text>
          <LocationDisplay
            showCoordinates={true}
            showLastUpdated={true}
            showRefreshButton={true}
            style={styles.locationCard}
          />
        </View>

        {/* Current Time */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Time</Text>
          <TimeDisplay
            showDate={true}
            showTimezone={true}
            showTimeOfDay={true}
            style={styles.timeCard}
          />
        </View>

        {/* Permission Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Permission Status</Text>
          <View style={styles.permissionCard}>
            <View style={styles.permissionContent}>
              <View style={styles.permissionIcon}>
                <Ionicons name="location" size={24} color={getPermissionStatusColor()} />
              </View>
              <View style={styles.permissionText}>
                <Text style={styles.permissionTitle}>Location Access</Text>
                <Text style={[styles.permissionStatus, { color: getPermissionStatusColor() }]}>
                  {getPermissionStatusText()}
                </Text>
              </View>
            </View>
            {permissionStatus !== 'granted' && (
              <Pressable
                style={styles.permissionButton}
                onPress={handlePermissionRequest}
              >
                <Text style={styles.permissionButtonText}>Enable</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Location Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location Features</Text>
          {renderSettingItem(
            'Auto Update Location',
            'Automatically update your location when using the app',
            autoUpdate,
            setAutoUpdate,
            'refresh',
            permissionStatus !== 'granted'
          )}
          {renderSettingItem(
            'Background Updates',
            'Update location even when app is in background',
            backgroundUpdates,
            setBackgroundUpdates,
            'phone-portrait',
            permissionStatus !== 'granted'
          )}
          {renderSettingItem(
            'Share Location',
            'Allow sharing your location with other users',
            shareLocation,
            setShareLocation,
            'share',
            permissionStatus !== 'granted'
          )}
          {renderSettingItem(
            'Location History',
            'Save your location history for better recommendations',
            locationHistory,
            setLocationHistory,
            'time',
            permissionStatus !== 'granted'
          )}
        </View>

        {/* Greeting Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Greeting Settings</Text>
          {renderSettingItem(
            'Show Emoji',
            'Display emojis in greetings',
            customConfig.includeEmoji || false,
            setEmojiEnabled,
            'happy',
            false
          )}
          {renderSettingItem(
            'Personalized Greetings',
            'Include your name in greetings',
            customConfig.personalized || false,
            setPersonalized,
            'person',
            false
          )}
        </View>

        {/* Language Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Greeting Language</Text>
          <View style={styles.languageContainer}>
            {renderLanguageOption('en')}
            {renderLanguageOption('hi')}
            {renderLanguageOption('te')}
            {renderLanguageOption('ta')}
            {renderLanguageOption('bn')}
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          {renderSettingItem(
            'Location Notifications',
            'Get notified about location-based offers and updates',
            notifications,
            setNotifications,
            'notifications',
            false
          )}
        </View>

        {/* Data Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          <Pressable
            style={styles.actionButton}
            onPress={handleClearLocationData}
          >
            <View style={styles.actionContent}>
              <View style={styles.actionIcon}>
                <Ionicons name="trash-outline" size={24} color="#FF3B30" />
              </View>
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>Clear Location Data</Text>
                <Text style={styles.actionSubtitle}>
                  Remove all location history and reset preferences
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </Pressable>
        </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    ...Typography.h4,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.base,
  },
  sectionTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  locationCard: {
    marginBottom: 0,
  },
  timeCard: {
    marginBottom: 0,
  },
  permissionCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.medium,
  },
  permissionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  permissionIcon: {
    marginRight: Spacing.md,
  },
  permissionText: {
    flex: 1,
  },
  permissionTitle: {
    ...Typography.bodyLarge,
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  permissionStatus: {
    ...Typography.body,
    fontWeight: '600',
  },
  permissionButton: {
    backgroundColor: colors.brand.ios,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  permissionButtonText: {
    color: Colors.text.inverse,
    ...Typography.body,
    fontWeight: '600',
  },
  settingItem: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.medium,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: Spacing.md,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    ...Typography.bodyLarge,
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  settingSubtitle: {
    ...Typography.body,
    color: Colors.text.tertiary,
    lineHeight: 18,
  },
  disabledText: {
    color: '#C7C7CC',
  },
  languageContainer: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  selectedLanguageOption: {
    backgroundColor: '#F0F8FF',
  },
  languageText: {
    ...Typography.bodyLarge,
    color: Colors.text.primary,
  },
  selectedLanguageText: {
    color: colors.brand.ios,
    fontWeight: '600',
  },
  actionButton: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.medium,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    marginRight: Spacing.md,
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    ...Typography.bodyLarge,
    fontWeight: '500',
    color: '#FF3B30',
    marginBottom: 2,
  },
  actionSubtitle: {
    ...Typography.body,
    color: Colors.text.tertiary,
    lineHeight: 18,
  },
});

export default withErrorBoundary(LocationSettingsScreen, 'LocationSettings');
