// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Profile Edit Page
// Edit user profile information with photo upload

import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Pressable, StatusBar, Platform, TextInput, SafeAreaView, ActivityIndicator, Modal, FlatList } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { useProfile } from '@/contexts/ProfileContext';
import { useAuthActions, useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import { useSafeNavigation } from '@/hooks/useSafeNavigation';
import { PROFILE_COLORS } from '@/types/profile.types';
import { getImagePicker } from '@/utils/lazyImports';
import { uploadProfileImage } from '@/services/imageUploadService';
import { platformAlertSimple, platformAlertDestructive, platformAlertError } from '@/utils/platformAlert';
import authApi from '@/services/authApi';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface ProfileFormData {
  name: string;
  email: string;
  phone: string;
  bio: string;
  location: string;
  website: string;
  dateOfBirth: string;
  gender: string;
}

function ProfileEditPage() {
  const router = useRouter();
  const { goBack } = useSafeNavigation();
  const { user, updateUser } = useProfile();
  const authActions = useAuthActions();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();

  const [formData, setFormData] = useState<ProfileFormData>({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
    location: user?.location || '',
    website: user?.website || '',
    dateOfBirth: user?.dateOfBirth || '',
    gender: user?.gender || '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showGenderModal, setShowGenderModal] = useState(false);
  const isMounted = useIsMounted();
  const imagePickerRef = useRef<typeof import('expo-image-picker') | null>(null);

  // Pre-load image picker so the click handler stays synchronous on web
  // (browsers block programmatic file input clicks outside direct user gesture)
  useEffect(() => {
    getImagePicker().then(mod => { imagePickerRef.current = mod; });
  }, []);

  const genderOptions = [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Other', value: 'other' },
  ];

  // Update form data when user data changes
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        bio: user.bio || '',
        location: user.location || '',
        website: user.website || '',
        dateOfBirth: user.dateOfBirth || '',
        gender: user.gender || '',
      });
    }
  }, [user]);

  useEffect(() => {
    // Check if form has changes by comparing individual fields (avoids JSON.stringify overhead)
    const hasChangesDetected =
      formData.name !== (user?.name || '') ||
      formData.email !== (user?.email || '') ||
      formData.phone !== (user?.phone || '') ||
      formData.bio !== (user?.bio || '') ||
      formData.location !== (user?.location || '') ||
      formData.website !== (user?.website || '') ||
      formData.dateOfBirth !== (user?.dateOfBirth || '') ||
      formData.gender !== (user?.gender || '');

    setHasChanges(hasChangesDetected);
  }, [
    formData.name, formData.email, formData.phone, formData.bio,
    formData.location, formData.website, formData.dateOfBirth, formData.gender,
    user?.name, user?.email, user?.phone, user?.bio,
    user?.location, user?.website, user?.dateOfBirth, user?.gender,
  ]);

  const handleBackPress = useCallback(() => {
    if (hasChanges) {
      platformAlertDestructive(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to leave?',
        'Leave',
        () => {
          goBack('/profile' as any);
        }
      );
    } else {
      goBack('/profile' as any);
    }
  }, [hasChanges, goBack]);

  const handleInputChange = useCallback((field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleGenderSelect = useCallback((gender: string) => {
    setFormData(prev => ({ ...prev, gender }));
    setShowGenderModal(false);
  }, []);

  const handleImageUpload = async () => {
    try {
      // Use pre-loaded ref (critical for web — browsers block file picker if
      // an await happens between user click and input.click())
      const ImagePicker = imagePickerRef.current ?? await getImagePicker();
      imagePickerRef.current = ImagePicker;

      // Request permission (not needed on web)
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (status !== 'granted') {
          platformAlertSimple('Permission Required', 'Please allow access to your photo library to upload a profile picture.');
          return;
        }
      }

      // Pick image with EXTREME compression for fastest Cloudinary upload
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6, // Balanced compression — Cloudinary applies further optimization (f_auto, q_auto)
        base64: false,
        allowsMultipleSelection: false,
        exif: false,
      });

      if (!result.canceled && result.assets[0]) {
        if (!isMounted()) return;
        setUploadingImage(true);

        // Try upload with retry logic (Cloudinary is slow from your location)
        let uploadResult;
        let retryCount = 0;
        const maxRetries = 2;

        while (retryCount <= maxRetries) {
          uploadResult = await uploadProfileImage(result.assets[0].uri);

          if (uploadResult.success) {
            break; // Success, exit retry loop
          }

          retryCount++;
          if (retryCount <= maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }

        if (uploadResult?.success && uploadResult.avatarUrl) {
          // Update profile context with new avatar URL directly
          await updateUser({ avatar: uploadResult.avatarUrl });
          platformAlertSimple('Success', 'Profile picture updated successfully!');
        } else {
          platformAlertSimple('Upload Failed', `After ${retryCount} attempts: ${uploadResult?.error || 'Failed to upload image'}\n\nCloudinary connection is slow. Try different network or smaller image.`);
        }
      }
    } catch (error) {
      platformAlertSimple('Error', error instanceof Error ? error.message : 'An error occurred while uploading the image');
    } finally {
      if (!isMounted()) return;
      setUploadingImage(false);
    }
  };

  const handleSave = useCallback(async () => {
    if (!formData.name.trim()) {
      platformAlertSimple('Validation Error', 'Name is required');
      return;
    }

    // Email validation - only validate if email is provided
    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        platformAlertSimple('Validation Error', 'Please enter a valid email address');
        return;
      }
    }

    setIsSaving(true);

    try {
      // Use ProfileContext to update user with real backend API
      await updateUser({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        bio: formData.bio,
        location: formData.location,
        website: formData.website,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
      });

      // Automatically navigate back after successful save
      goBack('/profile' as any);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      platformAlertError('Validation Error', message);
    } finally {
      if (!isMounted()) return;
      setIsSaving(false);
    }
  }, [formData, updateUser, goBack, isMounted]);

  // Show loading skeleton while auth is being restored
  if (authLoading || !isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={PROFILE_COLORS.gold} translucent={false} />
        <LinearGradient colors={[PROFILE_COLORS.gold, PROFILE_COLORS.primaryLight]} style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.backButton} />
            <ThemedText style={styles.headerTitle}>Edit Profile</ThemedText>
            <View style={{ width: 80 }} />
          </View>
        </LinearGradient>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={PROFILE_COLORS.gold} />
          <ThemedText style={{ marginTop: 12, color: PROFILE_COLORS.textSecondary }}>Loading profile...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  const renderFormField = (
    label: string,
    field: keyof ProfileFormData,
    placeholder: string,
    multiline: boolean = false,
    keyboardType: 'default' | 'email-address' | 'phone-pad' | 'url' = 'default',
    readonly: boolean = false
  ) => (
    <View style={styles.fieldContainer}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <TextInput
        style={[
          styles.textInput,
          multiline && styles.multilineInput,
          readonly && styles.readonlyInput
        ]}
        value={formData[field] as string}
        onChangeText={readonly ? undefined : (value) => handleInputChange(field, value)}
        placeholder={placeholder}
        placeholderTextColor={colors.neutral[400]}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
        autoCorrect={keyboardType === 'email-address' ? false : true}
        selectionColor={PROFILE_COLORS.gold}
        editable={!readonly}
        selectTextOnFocus={!readonly}
        accessibilityLabel={`${label} input field`}
        accessibilityHint={readonly ? 'This field cannot be edited' : `Enter your ${label.toLowerCase()}`}
        accessibilityValue={{ text: formData[field] as string }}
      />
    </View>
  );

  const renderGenderOption = useCallback(({ item }: { item: { value: string; label: string } }) => (
    <Pressable
      style={[
        styles.genderOption,
        formData.gender === item.value && styles.selectedGenderOption
      ]}
      onPress={() => handleGenderSelect(item.value)}
      accessibilityLabel={`Select ${item.label} as your gender`}
      accessibilityRole="button"
      accessibilityHint={`Double tap to set your gender to ${item.label}`}
      accessibilityState={{ selected: formData.gender === item.value }}
    >
      <ThemedText style={[
        styles.genderOptionText,
        formData.gender === item.value && styles.selectedGenderOptionText
      ]}>
        {item.label}
      </ThemedText>
      {formData.gender === item.value && (
        <Ionicons name="checkmark" size={20} color={PROFILE_COLORS.gold} />
      )}
    </Pressable>
  ), [formData.gender, handleGenderSelect]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={PROFILE_COLORS.gold}
        translucent={false}
      />
      
      {/* Header */}
      <LinearGradient
        colors={[PROFILE_COLORS.gold, PROFILE_COLORS.primaryLight]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Pressable
            style={styles.backButton}
            onPress={handleBackPress}
            accessibilityLabel="Go back"
            accessibilityRole="button"
            accessibilityHint="Double tap to return to profile page"
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          
          <ThemedText style={styles.headerTitle}>Edit Profile</ThemedText>
          
          <Pressable
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
            accessibilityLabel={isSaving ? 'Saving profile changes' : hasChanges ? 'Save profile changes' : 'Save profile'}
            accessibilityRole="button"
            accessibilityHint="Double tap to save your profile changes"
            accessibilityState={{ disabled: isSaving, busy: isSaving }}
          >
            <ThemedText style={[
              styles.saveButtonText,
              isSaving && styles.saveButtonTextDisabled
            ]}>
              {isSaving ? 'Saving...' : hasChanges ? 'Save' : 'Save'}
            </ThemedText>
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >

        {/* Profile Photo Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Profile Photo</ThemedText>
          <View style={styles.photoContainer}>
            <Pressable
              style={styles.photoWrapper}
              onPress={handleImageUpload}
              disabled={uploadingImage}
             
              accessibilityLabel={uploadingImage ? 'Uploading profile photo' : 'Change profile photo'}
              accessibilityRole="button"
              accessibilityHint="Double tap to select a new profile picture from your gallery"
              accessibilityState={{ disabled: uploadingImage, busy: uploadingImage }}
            >
              <View style={styles.photoCircle}>
                {user?.avatar ? (
                  <CachedImage
                    source={{
                      uri: user.avatar,
                    }}
                    style={styles.photoImage}
                    cachePolicy="none"
                    key={user.avatar} // Force re-render when URL changes
                  />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <ThemedText style={styles.photoInitials}>
                      {user?.name?.substring(0, 2).toUpperCase() || 'U'}
                    </ThemedText>
                  </View>
                )}
                {uploadingImage && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator size="large" color={Colors.text.inverse} />
                  </View>
                )}
              </View>
              <View style={styles.cameraIconContainer}>
                <Ionicons name="camera" size={20} color={Colors.text.inverse} />
              </View>
            </Pressable>
            <View style={styles.photoTextContainer}>
              <ThemedText style={styles.photoText}>
                {uploadingImage ? 'Uploading...' : 'Tap to change photo'}
              </ThemedText>
              <ThemedText style={styles.photoSubtext}>
                JPG, PNG or GIF. Max size 5MB
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Personal Information */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Personal Information</ThemedText>
          
          {renderFormField('Full Name', 'name', 'Enter your full name')}
          {renderFormField('Email Address', 'email', 'Enter your email', false, 'email-address', false)}
          {renderFormField('Phone Number', 'phone', 'Enter your phone number', false, 'phone-pad', true)}
          {renderFormField('Date of Birth', 'dateOfBirth', 'YYYY-MM-DD', false, 'default')}
          
          {/* Gender Selection */}
          <View style={styles.fieldContainer}>
            <ThemedText style={styles.fieldLabel}>Gender</ThemedText>
            <Pressable
              style={styles.genderSelector}
              onPress={() => setShowGenderModal(true)}
              accessibilityLabel={`Gender: ${formData.gender ? genderOptions.find(opt => opt.value === formData.gender)?.label : 'Not selected'}`}
              accessibilityRole="button"
              accessibilityHint="Double tap to select your gender"
            >
              <ThemedText style={[
                styles.genderText,
                !formData.gender && styles.placeholderText
              ]}>
                {formData.gender ? genderOptions.find(opt => opt.value === formData.gender)?.label : 'Select gender'}
              </ThemedText>
              <Ionicons name="chevron-down" size={20} color={Colors.text.tertiary} />
            </Pressable>
          </View>
          
          {renderFormField('Bio', 'bio', 'Tell us about yourself...', true)}
        </View>

        {/* Additional Information */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Additional Information</ThemedText>
          
          {renderFormField('Location', 'location', 'Enter your city or location')}
          {renderFormField('Website', 'website', 'https://your-website.com', false, 'url')}
        </View>

        {/* Account Settings */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Account Settings</ThemedText>

          <Pressable
            style={styles.settingItem}
            onPress={() => router.push('/account/change-password' as any)}
            accessibilityLabel="Change Password"
            accessibilityRole="button"
            accessibilityHint="Double tap to update your account password"
          >
            <View style={styles.settingItemLeft}>
              <Ionicons name="key-outline" size={24} color={PROFILE_COLORS.gold} />
              <View style={styles.settingItemText}>
                <ThemedText style={styles.settingItemTitle}>Change Password</ThemedText>
                <ThemedText style={styles.settingItemDescription}>
                  Update your account password
                </ThemedText>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.neutral[300]} />
          </Pressable>

          <Pressable
            style={styles.settingItem}
            onPress={() => router.push('/account/notifications' as any)}
            accessibilityLabel="Notification Preferences"
            accessibilityRole="button"
            accessibilityHint="Double tap to manage your notification settings"
          >
            <View style={styles.settingItemLeft}>
              <Ionicons name="notifications-outline" size={24} color={PROFILE_COLORS.gold} />
              <View style={styles.settingItemText}>
                <ThemedText style={styles.settingItemTitle}>Notification Preferences</ThemedText>
                <ThemedText style={styles.settingItemDescription}>
                  Manage your notification settings
                </ThemedText>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.neutral[300]} />
          </Pressable>

          <Pressable
            style={styles.settingItem}
            onPress={() => router.push('/account/profile-visibility' as any)}
            accessibilityLabel="Privacy Settings"
            accessibilityRole="button"
            accessibilityHint="Double tap to control who can see your profile"
          >
            <View style={styles.settingItemLeft}>
              <Ionicons name="shield-outline" size={24} color={PROFILE_COLORS.gold} />
              <View style={styles.settingItemText}>
                <ThemedText style={styles.settingItemTitle}>Privacy Settings</ThemedText>
                <ThemedText style={styles.settingItemDescription}>
                  Control who can see your profile
                </ThemedText>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.neutral[300]} />
          </Pressable>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Danger Zone</ThemedText>

          <Pressable
            style={styles.dangerItem}
            onPress={() => {
              platformAlertDestructive(
                'Delete Account',
                'Are you sure you want to delete your account? This action cannot be undone. All your data, coins, and history will be permanently removed.',
                'Delete',
                async () => {
                  try {
                    const response = await authApi.deleteAccount();
                    if (response.success) {
                      await authActions.logout();
                    } else {
                      platformAlertError('Error', response.error || 'Failed to delete account. Please try again.');
                    }
                  } catch {
                    platformAlertError('Error', 'Failed to delete account. Please try again or contact support.');
                  }
                }
              );
            }}
            accessibilityLabel="Delete Account"
            accessibilityRole="button"
            accessibilityHint="Double tap to permanently delete your account and all data. This action cannot be undone"
          >
            <Ionicons name="trash-outline" size={24} color={Colors.error} />
            <View style={styles.dangerItemText}>
              <ThemedText style={styles.dangerItemTitle}>Delete Account</ThemedText>
              <ThemedText style={styles.dangerItemDescription}>
                Permanently delete your account and all data
              </ThemedText>
            </View>
          </Pressable>
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* Gender Selection Modal */}
      <Modal
        visible={showGenderModal}
        transparent={true}
        statusBarTranslucent
        animationType="slide"
        onRequestClose={() => setShowGenderModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Select Gender</ThemedText>
              <Pressable
                onPress={() => setShowGenderModal(false)}
                accessibilityLabel="Close gender selection"
                accessibilityRole="button"
                accessibilityHint="Double tap to close the gender selection modal"
              >
                <Ionicons name="close" size={24} color={Colors.text.tertiary} />
              </Pressable>
            </View>
            
            <FlatList
              data={genderOptions}
              keyExtractor={(item) => item.value}
              renderItem={renderGenderOption}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PROFILE_COLORS.background,
    paddingTop: Platform.OS === 'ios' ? 20 : 0,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 25 : 15,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 5 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
    }),
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6 },
      android: { elevation: 3 },
      web: { boxShadow: '0 2px 6px rgba(0,0,0,0.15)' },
    }),
  },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.inverse,
    textAlign: 'center',
    marginHorizontal: Spacing.base,
    letterSpacing: 0.5,
  },
  saveButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    minWidth: 80,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6 },
      android: { elevation: 3 },
      web: { boxShadow: '0 2px 6px rgba(0,0,0,0.15)' },
    }),
  },
  saveButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  saveButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: '600',
  },
  saveButtonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Spacing.xl,
    paddingBottom: 120,
    paddingHorizontal: Spacing.xs,
  },
  section: {
    backgroundColor: Colors.background.primary,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 4 },
      web: { boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
    }),
  },
  sectionTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: PROFILE_COLORS.text,
    marginBottom: Spacing.md,
    letterSpacing: 0.3,
  },
  sectionDescription: {
    ...Typography.body,
    color: PROFILE_COLORS.textSecondary,
    marginBottom: Spacing.base,
    lineHeight: 20,
  },
  fieldContainer: {
    marginBottom: Spacing.xl,
  },
  fieldLabel: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: PROFILE_COLORS.text,
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: Colors.border.default,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 18,
    paddingVertical: Spacing.base,
    ...Typography.bodyLarge,
    color: PROFILE_COLORS.text,
    backgroundColor: Colors.background.secondary,
    minHeight: 52,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 1 },
      web: { boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
    }),
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: Spacing.base,
  },
  readonlyInput: {
    backgroundColor: Colors.background.secondary,
    borderColor: Colors.border.default,
    color: Colors.text.tertiary,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: PROFILE_COLORS.border,
    minHeight: 70,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingItemText: {
    marginLeft: Spacing.base,
    flex: 1,
  },
  settingItemTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: PROFILE_COLORS.text,
    marginBottom: Spacing.xs,
    letterSpacing: 0.2,
  },
  settingItemDescription: {
    ...Typography.body,
    color: PROFILE_COLORS.textSecondary,
    lineHeight: 20,
  },
  dangerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: Spacing.xs,
    minHeight: 70,
  },
  dangerItemText: {
    marginLeft: Spacing.base,
    flex: 1,
  },
  dangerItemTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.error,
    marginBottom: Spacing.xs,
    letterSpacing: 0.2,
  },
  dangerItemDescription: {
    ...Typography.body,
    color: PROFILE_COLORS.textSecondary,
    lineHeight: 20,
  },
  bottomSpace: {
    height: 40,
  },
  // Gender selector styles
  genderSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.border.default,
    marginTop: Spacing.sm,
  },
  genderText: {
    ...Typography.bodyLarge,
    color: Colors.text.primary,
  },
  placeholderText: {
    color: Colors.text.tertiary,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
    paddingBottom: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  modalTitle: {
    ...Typography.h4,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  genderOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  selectedGenderOption: {
    backgroundColor: Colors.background.secondary,
  },
  genderOptionText: {
    ...Typography.bodyLarge,
    color: Colors.text.primary,
  },
  selectedGenderOptionText: {
    color: PROFILE_COLORS.gold,
    fontWeight: '600',
  },
  photoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  photoWrapper: {
    position: 'relative',
    marginRight: Spacing.lg,
  },
  photoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    backgroundColor: PROFILE_COLORS.gold,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
      android: { elevation: 5 },
      web: { boxShadow: '0 4px 8px rgba(0,0,0,0.15)' },
    }),
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoInitials: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PROFILE_COLORS.gold,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
      android: { elevation: 4 },
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.2)' },
    }),
  },
  photoTextContainer: {
    flex: 1,
  },
  photoText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: PROFILE_COLORS.text,
    marginBottom: Spacing.xs,
  },
  photoSubtext: {
    ...Typography.bodySmall,
    color: PROFILE_COLORS.textSecondary,
  },
});
export default withErrorBoundary(ProfileEditPage, 'ProfileEdit');
