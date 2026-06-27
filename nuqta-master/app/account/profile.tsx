// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Account Profile Page
// User's account information and settings overview

import { colors } from '@/constants/theme';
import { Text, ActivityIndicator } from 'react-native';
import React, { useState, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import profileApi from '@/services/profileApi';
import CachedImage from '@/components/ui/CachedImage';

const SEGMENT_BADGES: Record<string, { label: string; icon: string; bg: string; text: string }> = {
  verified_student:    { label: 'Verified Student',  icon: '🎓', bg: '#DBEAFE', text: '#1D4ED8' },
  verified_employee:   { label: 'Corporate Member',  icon: '💼', bg: '#EDE9FE', text: '#5B21B6' },
  verified_defence:    { label: 'Defence Member',    icon: '🎖️', bg: '#FEE2E2', text: '#991B1B' },
  verified_healthcare: { label: 'Healthcare Worker', icon: '⚕️', bg: '#DCFCE7', text: '#166534' },
};
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  Switch,
  RefreshControl,
  TextInput,
} from 'react-native';
import { FormPageSkeleton } from '@/components/skeletons';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, Stack } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { useAuthUser, useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import { platformAlertSimple } from '@/utils/platformAlert';
import { useNotifications } from '@/contexts/NotificationContext';
import { useSecurity } from '@/contexts/SecurityContext';
import { useAppPreferences } from '@/contexts/AppPreferencesContext';
import userSettingsApi from '@/services/userSettingsApi';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { useIsMounted } from '@/hooks/useIsMounted';

interface UserSettings {
  _id: string;
  user: string;
  general: {
    language: string;
    currency: string;
    timezone: string;
    dateFormat: string;
    timeFormat: '12h' | '24h';
  };
  notifications: {
    push: { enabled: boolean };
    email: { enabled: boolean };
    sms: { enabled: boolean };
  };
  privacy: {
    profileVisibility: 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
    showActivity: boolean;
  };
  security: {
    twoFactorAuth: { enabled: boolean };
    biometric: { fingerprintEnabled: boolean; faceIdEnabled: boolean };
  };
  preferences: {
    animations: boolean;
    sounds: boolean;
    hapticFeedback: boolean;
  };
}

function AccountProfilePage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const { settings: notificationSettings, updateSettings: updateNotificationSettings } = useNotifications();
  const { securitySettings, privacySettings, updateSecuritySettings, updatePrivacySettings } = useSecurity();
  const { preferences: appPreferences, updatePreferences: updateAppPreferences } = useAppPreferences();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const rawAvatar = user?.profile?.avatar;
  const safeAvatar = rawAvatar && !rawAvatar.includes('ui-avatars.com') ? rawAvatar : undefined;
  const [avatarUri, setAvatarUri] = useState<string | undefined>(safeAvatar);
  const [isEditing, setIsEditing] = useState(false);
  const [editedFirstName, setEditedFirstName] = useState(user?.profile?.firstName || '');
  const [editedLastName, setEditedLastName] = useState(user?.profile?.lastName || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const response = await profileApi.updateProfile({
        profile: {
          firstName: editedFirstName.trim(),
          lastName: editedLastName.trim(),
        },
      } as any);
      if (response.success) {
        setIsEditing(false);
        platformAlertSimple('Success', 'Profile updated successfully.');
      } else {
        platformAlertSimple('Error', 'Could not update profile. Please try again.');
      }
    } catch {
      platformAlertSimple('Error', 'Could not update profile. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarPress = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      platformAlertSimple('Permission Required', 'Please allow access to your photo library to change your profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setUploadingPhoto(true);
      try {
        const response = await profileApi.uploadProfilePicture(result.assets[0].uri);
        if (response.success && response.data?.profilePicture) {
          setAvatarUri(response.data.profilePicture);
        } else {
          platformAlertSimple('Error', 'Could not update photo. Please try again.');
        }
      } catch {
        platformAlertSimple('Error', 'Could not update photo. Please try again.');
      } finally {
        setUploadingPhoto(false);
      }
    }
  };

  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    loadSettings();
  }, [isAuthenticated, authLoading]);

  const loadSettings = async () => {
    try {
      const response = await userSettingsApi.getUserSettings();
      if (response.success && response.data) {
        setSettings(response.data as any);
      }
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSettings();
    if (!isMounted()) return;
    setRefreshing(false);
  };

  const handleToggleSetting = async (path: string, value: boolean) => {
    if (!settings) return;

    try {
      // Optimistic update
      const newSettings = { ...settings };
      const keys = path.split('.');
      let current: any = newSettings;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      setSettings(newSettings);

      // Build nested update object for API
      const buildNestedObject = (keys: string[], value: any): any => {
        if (keys.length === 1) {
          return { [keys[0]]: value };
        }
        return { [keys[0]]: buildNestedObject(keys.slice(1), value) };
      };

      const updateData = buildNestedObject(keys, value);

      // Handle notification settings through global context
      if (keys[0] === 'notifications') {
        const success = await updateNotificationSettings(updateData.notifications);
        if (!success) {
          await loadSettings();
          platformAlertSimple('Error', 'Failed to update notification setting');
        }
        return;
      }

      // API update - use specific endpoint based on top-level key
      let response;
      const topLevelKey = keys[0];

      switch (topLevelKey) {
        case 'privacy':
          response = await userSettingsApi.updatePrivacySettings(updateData.privacy);
          break;
        case 'security':
          response = await userSettingsApi.updateSecuritySettings(updateData.security);
          break;
        case 'preferences':
          response = await userSettingsApi.updateAppPreferences(updateData.preferences);
          break;
        default:
          response = await userSettingsApi.updateSettings(updateData);
      }

      if (!response.success) {
        // Revert on failure
        await loadSettings();
        platformAlertSimple('Error', 'Failed to update setting');
      }
    } catch (error) {
      await loadSettings();
      platformAlertSimple('Error', 'Failed to update setting');
    }
  };

  const handleNavigateToSetting = (route: string) => {
    router.push(route as any);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <FormPageSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor={Colors.brand.purple} />

      {/* Header */}
      <LinearGradient
        colors={[Colors.brand.purple, colors.brand.purpleSoft, '#C4B5FD']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
            accessibilityLabel="Go back"
            accessibilityRole="button"
            accessibilityHint="Navigate to previous screen"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>

          <View style={styles.headerTitleSection}>
            <ThemedText style={styles.headerTitle}>Account Settings</ThemedText>
            <ThemedText style={styles.headerSubtitle}>
              Manage your preferences
            </ThemedText>
          </View>

          <Pressable
            style={styles.editButton}
            onPress={() => {
              if (isEditing) {
                handleSaveProfile();
              } else {
                setEditedFirstName(user?.profile?.firstName || '');
                setEditedLastName(user?.profile?.lastName || '');
                setIsEditing(true);
              }
            }}
            accessibilityLabel={isEditing ? "Save profile" : "Edit profile"}
            accessibilityRole="button"
          >
            {savingProfile ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name={isEditing ? "checkmark" : "create-outline"} size={22} color="white" />
            )}
          </Pressable>
        </View>

        {/* User Info Card */}
        {user && (
          <View style={styles.userCard}>
            <Pressable style={styles.avatarContainer} onPress={handleAvatarPress}>
              <View style={styles.avatar}>
                {uploadingPhoto ? (
                  <ActivityIndicator color="#FFCD57" />
                ) : (avatarUri || safeAvatar) ? (
                  <CachedImage
                    source={{ uri: avatarUri || safeAvatar }}
                    style={{ width: 64, height: 64, borderRadius: 32 }}
                  />
                ) : (
                  <ThemedText style={styles.avatarText}>
                    {user.profile?.firstName?.[0]}{user.profile?.lastName?.[0]}
                  </ThemedText>
                )}
              </View>
              {/* Camera overlay */}
              <View style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 22, height: 22, borderRadius: 11,
                backgroundColor: '#FFCD57', alignItems: 'center', justifyContent: 'center',
                borderWidth: 2, borderColor: '#1a3a52',
              }}>
                <Ionicons name="camera" size={11} color="#1a3a52" />
              </View>
            </Pressable>
            <View style={styles.userInfo}>
              {isEditing ? (
                <View style={{ gap: 6 }}>
                  <TextInput
                    style={styles.editInput}
                    value={editedFirstName}
                    onChangeText={setEditedFirstName}
                    placeholder="First name"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                  />
                  <TextInput
                    style={styles.editInput}
                    value={editedLastName}
                    onChangeText={setEditedLastName}
                    placeholder="Last name"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                  />
                  <Pressable onPress={() => setIsEditing(false)} style={{ alignSelf: 'flex-start', marginTop: 2 }}>
                    <ThemedText style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Cancel</ThemedText>
                  </Pressable>
                </View>
              ) : (
                <>
                  <ThemedText style={styles.userName}>
                    {user.profile?.firstName} {user.profile?.lastName}
                  </ThemedText>
                  <ThemedText style={styles.userEmail}>{user.email}</ThemedText>
                  <ThemedText style={styles.userPhone}>
                    {user.phoneNumber}
                  </ThemedText>
                </>
              )}
              {/* Verified identity badge */}
              {(user as any).segment && SEGMENT_BADGES[(user as any).segment] && (() => {
                const badge = SEGMENT_BADGES[(user as any).segment!];
                return (
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6,
                    backgroundColor: badge.bg, borderRadius: 20,
                    paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start',
                  }}>
                    <Text style={{ fontSize: 14 }}>{badge.icon}</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: badge.text }}>
                      {badge.label}
                    </Text>
                  </View>
                );
              })()}
            </View>
          </View>
        )}
      </LinearGradient>

      {/* Content */}
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* General Settings */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>General</ThemedText>

          <View style={styles.settingsCard}>
            <Pressable
              style={styles.settingItem}
              onPress={() => handleNavigateToSetting('/account/language')}
              accessibilityLabel={`Language and Region. Current setting: ${settings?.general.language.toUpperCase()}, ${settings?.general.currency}`}
              accessibilityRole="button"
              accessibilityHint="Double tap to change language and region settings"
            >
              <View style={styles.settingIcon}>
                <Ionicons name="language" size={20} color={Colors.brand.purple} />
              </View>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingTitle}>Language & Region</ThemedText>
                <ThemedText style={styles.settingValue}>
                  {settings?.general.language.toUpperCase()} • {settings?.general.currency}
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.text.tertiary} />
            </Pressable>

          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Notifications</ThemedText>

          <View style={styles.settingsCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingIcon}>
                <Ionicons name="notifications" size={20} color={Colors.brand.purple} />
              </View>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingTitle}>Push Notifications</ThemedText>
                <ThemedText style={styles.settingSubtitle}>
                  Order updates, promotions
                </ThemedText>
              </View>
              <Switch
                value={notificationSettings?.push.enabled || false}
                onValueChange={(value) => handleToggleSetting('notifications.push.enabled', value)}
                accessibilityLabel={`Push notifications${notificationSettings?.push.enabled ? ', enabled' : ', disabled'}`}
                accessibilityRole="switch"
                accessibilityState={{ checked: notificationSettings?.push.enabled || false }}
                accessibilityHint={`Toggle to ${notificationSettings?.push.enabled ? 'disable' : 'enable'} push notifications`}
                trackColor={{ false: Colors.border.default, true: colors.brand.purpleSoft }}
                thumbColor={notificationSettings?.push.enabled ? Colors.brand.purple : Colors.background.secondary}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingItem}>
              <View style={styles.settingIcon}>
                <Ionicons name="mail" size={20} color={Colors.brand.purple} />
              </View>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingTitle}>Email Notifications</ThemedText>
                <ThemedText style={styles.settingSubtitle}>
                  Receipts, updates
                </ThemedText>
              </View>
              <Switch
                value={notificationSettings?.email.enabled || false}
                onValueChange={(value) => handleToggleSetting('notifications.email.enabled', value)}
                accessibilityLabel={`Email notifications${notificationSettings?.email.enabled ? ', enabled' : ', disabled'}`}
                accessibilityRole="switch"
                accessibilityState={{ checked: notificationSettings?.email.enabled || false }}
                accessibilityHint={`Toggle to ${notificationSettings?.email.enabled ? 'disable' : 'enable'} email notifications`}
                trackColor={{ false: Colors.border.default, true: colors.brand.purpleSoft }}
                thumbColor={notificationSettings?.email.enabled ? Colors.brand.purple : Colors.background.secondary}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingItem}>
              <View style={styles.settingIcon}>
                <Ionicons name="phone-portrait" size={20} color={Colors.brand.purple} />
              </View>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingTitle}>SMS Notifications</ThemedText>
                <ThemedText style={styles.settingSubtitle}>
                  Delivery alerts, OTP
                </ThemedText>
              </View>
              <Switch
                value={notificationSettings?.sms.enabled || false}
                onValueChange={(value) => handleToggleSetting('notifications.sms.enabled', value)}
                accessibilityLabel={`SMS notifications${notificationSettings?.sms.enabled ? ', enabled' : ', disabled'}`}
                accessibilityRole="switch"
                accessibilityState={{ checked: notificationSettings?.sms.enabled || false }}
                accessibilityHint={`Toggle to ${notificationSettings?.sms.enabled ? 'disable' : 'enable'} SMS notifications`}
                trackColor={{ false: Colors.border.default, true: colors.brand.purpleSoft }}
                thumbColor={notificationSettings?.sms.enabled ? Colors.brand.purple : Colors.background.secondary}
              />
            </View>
          </View>
        </View>

        {/* Privacy & Security */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Privacy & Security</ThemedText>

          <View style={styles.settingsCard}>
            <Pressable
              style={styles.settingItem}
              onPress={() => router.push('/account/profile-visibility')}
              accessibilityLabel={`Profile visibility. Current setting: ${privacySettings?.profileVisibility || 'FRIENDS'}`}
              accessibilityRole="button"
              accessibilityHint="Double tap to change who can see your profile"
            >
              <View style={styles.settingIcon}>
                <Ionicons name="eye" size={20} color={Colors.brand.purple} />
              </View>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingTitle}>Profile Visibility</ThemedText>
                <ThemedText style={styles.settingValue}>
                  {privacySettings?.profileVisibility || 'FRIENDS'}
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.text.tertiary} />
            </Pressable>

            <View style={styles.divider} />

            <Pressable
              style={styles.settingItem}
              onPress={() => router.push('/account/two-factor-auth')}
              accessibilityLabel={`Two-factor authentication. Status: ${securitySettings?.twoFactorAuth.enabled ? 'Enabled' : 'Disabled'}`}
              accessibilityRole="button"
              accessibilityHint="Double tap to manage two-factor authentication settings"
            >
              <View style={styles.settingIcon}>
                <Ionicons name="shield-checkmark" size={20} color={Colors.brand.purple} />
              </View>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingTitle}>Two-Factor Authentication</ThemedText>
                <ThemedText style={styles.settingSubtitle}>
                  Extra security for your account
                </ThemedText>
              </View>
              <View style={styles.settingStatus}>
                <ThemedText style={styles.settingValue}>
                  {securitySettings?.twoFactorAuth.enabled ? 'Enabled' : 'Disabled'}
                </ThemedText>
                <Ionicons name="chevron-forward" size={20} color={Colors.text.tertiary} />
              </View>
            </Pressable>

            <View style={styles.divider} />

            <View style={styles.settingItem}>
              <View style={styles.settingIcon}>
                <Ionicons name="finger-print" size={20} color={Colors.brand.purple} />
              </View>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingTitle}>Biometric Login</ThemedText>
                <ThemedText style={styles.settingSubtitle}>
                  Fingerprint or Face ID
                </ThemedText>
              </View>
              <Switch
                value={securitySettings?.biometric.fingerprintEnabled || securitySettings?.biometric.faceIdEnabled || false}
                onValueChange={async (value) => {
                  const success = await updateSecuritySettings({
                    biometric: {
                      fingerprintEnabled: value,
                      faceIdEnabled: value,
                      voiceEnabled: securitySettings?.biometric?.voiceEnabled ?? false,
                      availableMethods: securitySettings?.biometric?.availableMethods ?? [],
                    }
                  });
                  if (!success) {
                    platformAlertSimple('Error', 'Failed to update biometric settings');
                  }
                }}
                accessibilityLabel={`Biometric login${securitySettings?.biometric.fingerprintEnabled || securitySettings?.biometric.faceIdEnabled ? ', enabled' : ', disabled'}`}
                accessibilityRole="switch"
                accessibilityState={{ checked: securitySettings?.biometric.fingerprintEnabled || securitySettings?.biometric.faceIdEnabled || false }}
                accessibilityHint={`Toggle to ${securitySettings?.biometric.fingerprintEnabled ? 'disable' : 'enable'} fingerprint or face ID login`}
                trackColor={{ false: Colors.border.default, true: colors.brand.purpleSoft }}
                thumbColor={securitySettings?.biometric.fingerprintEnabled ? Colors.brand.purple : Colors.background.secondary}
              />
            </View>
          </View>
        </View>

        {/* App Preferences */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>App Preferences</ThemedText>

          <View style={styles.settingsCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingIcon}>
                <Ionicons name="flash" size={20} color={Colors.brand.purple} />
              </View>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingTitle}>Animations</ThemedText>
                <ThemedText style={styles.settingSubtitle}>
                  Smooth transitions
                </ThemedText>
              </View>
              <Switch
                value={appPreferences?.animations || false}
                onValueChange={async (value) => {
                  const success = await updateAppPreferences({ animations: value });
                  if (!success) {
                    platformAlertSimple('Error', 'Failed to update animations setting');
                  }
                }}
                accessibilityLabel={`Animations${appPreferences?.animations ? ', enabled' : ', disabled'}`}
                accessibilityRole="switch"
                accessibilityState={{ checked: appPreferences?.animations || false }}
                accessibilityHint={`Toggle to ${appPreferences?.animations ? 'disable' : 'enable'} app animations`}
                trackColor={{ false: Colors.border.default, true: colors.brand.purpleSoft }}
                thumbColor={appPreferences?.animations ? Colors.brand.purple : Colors.background.secondary}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingItem}>
              <View style={styles.settingIcon}>
                <Ionicons name="volume-medium" size={20} color={Colors.brand.purple} />
              </View>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingTitle}>Sounds</ThemedText>
                <ThemedText style={styles.settingSubtitle}>
                  App sounds and alerts
                </ThemedText>
              </View>
              <Switch
                value={appPreferences?.sounds || false}
                onValueChange={async (value) => {
                  const success = await updateAppPreferences({ sounds: value });
                  if (!success) {
                    platformAlertSimple('Error', 'Failed to update sounds setting');
                  }
                }}
                accessibilityLabel={`Sounds${appPreferences?.sounds ? ', enabled' : ', disabled'}`}
                accessibilityRole="switch"
                accessibilityState={{ checked: appPreferences?.sounds || false }}
                accessibilityHint={`Toggle to ${appPreferences?.sounds ? 'disable' : 'enable'} app sounds`}
                trackColor={{ false: Colors.border.default, true: colors.brand.purpleSoft }}
                thumbColor={appPreferences?.sounds ? Colors.brand.purple : Colors.background.secondary}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingItem}>
              <View style={styles.settingIcon}>
                <Ionicons name="phone-portrait" size={20} color={Colors.brand.purple} />
              </View>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingTitle}>Haptic Feedback</ThemedText>
                <ThemedText style={styles.settingSubtitle}>
                  Vibration on actions
                </ThemedText>
              </View>
              <Switch
                value={appPreferences?.hapticFeedback || false}
                onValueChange={async (value) => {
                  const success = await updateAppPreferences({ hapticFeedback: value });
                  if (!success) {
                    platformAlertSimple('Error', 'Failed to update haptic feedback setting');
                  }
                }}
                accessibilityLabel={`Haptic feedback${appPreferences?.hapticFeedback ? ', enabled' : ', disabled'}`}
                accessibilityRole="switch"
                accessibilityState={{ checked: appPreferences?.hapticFeedback || false }}
                accessibilityHint={`Toggle to ${appPreferences?.hapticFeedback ? 'disable' : 'enable'} haptic feedback`}
                trackColor={{ false: Colors.border.default, true: colors.brand.purpleSoft }}
                thumbColor={appPreferences?.hapticFeedback ? Colors.brand.purple : Colors.background.secondary}
              />
            </View>
          </View>
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Account</ThemedText>

          <View style={styles.settingsCard}>
            <Pressable
              style={styles.settingItem}
              onPress={() => router.push('/profile/edit')}
              accessibilityLabel="Edit profile information"
              accessibilityRole="button"
              accessibilityHint="Navigate to edit profile screen"
            >
              <View style={styles.settingIcon}>
                <Ionicons name="person" size={20} color={Colors.brand.purple} />
              </View>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingTitle}>Edit Profile</ThemedText>
                <ThemedText style={styles.settingSubtitle}>
                  Update your information
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.text.tertiary} />
            </Pressable>

            <View style={styles.divider} />

            <Pressable
              style={styles.settingItem}
              onPress={() => router.push('/account/change-password')}
              accessibilityLabel="Change password"
              accessibilityRole="button"
              accessibilityHint="Navigate to change password screen"
            >
              <View style={styles.settingIcon}>
                <Ionicons name="key" size={20} color={Colors.brand.purple} />
              </View>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingTitle}>Change Password</ThemedText>
                <ThemedText style={styles.settingSubtitle}>
                  Update your password
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.text.tertiary} />
            </Pressable>

            <View style={styles.divider} />

            <Pressable
              style={styles.settingItem}
              onPress={() => router.push('/account/delete-account')}
              accessibilityLabel="Delete account permanently"
              accessibilityRole="button"
              accessibilityHint="Navigate to account deletion screen. Warning: This action is permanent"
            >
              <View style={[styles.settingIcon, { backgroundColor: Colors.errorScale[100] }]}>
                <Ionicons name="trash" size={20} color={Colors.error} />
              </View>
              <View style={styles.settingInfo}>
                <ThemedText style={[styles.settingTitle, { color: Colors.error }]}>
                  Delete Account
                </ThemedText>
                <ThemedText style={styles.settingSubtitle}>
                  Permanently delete your account
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.error} />
            </Pressable>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 50 : 45,
    paddingBottom: 25,
    paddingHorizontal: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleSection: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  headerSubtitle: {
    ...Typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  editButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: Spacing.base,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.brand.purple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    ...Typography.h2,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  userEmail: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginBottom: 2,
  },
  userPhone: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  editInput: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border?.light || '#E5E7EB',
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  settingsCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: colors.tint.pink,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    ...Typography.body,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  settingSubtitle: {
    ...Typography.bodySmall,
    fontSize: 13,
    color: Colors.text.tertiary,
  },
  settingValue: {
    ...Typography.bodySmall,
    fontSize: 13,
    color: Colors.brand.purple,
    fontWeight: '500',
  },
  settingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.background.secondary,
    marginLeft: 68,
  },
});

export default withErrorBoundary(AccountProfilePage, 'AccountProfile');
