import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Creator Edit Profile Page
// Allows creators to edit their display name, bio, avatar, cover image, tags, and social links

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FormPageSkeleton } from '@/components/skeletons';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import creatorsApi from '@/services/creatorsApi';
import { platformAlert } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const SOCIAL_PLATFORMS = ['instagram', 'youtube', 'twitter', 'tiktok', 'website'] as const;
const CREATOR_TAGS = [
  'Fashion', 'Beauty', 'Tech', 'Food', 'Fitness', 'Travel', 'Lifestyle',
  'Gaming', 'Music', 'Art', 'Photography', 'Home', 'Books', 'Sports',
];

interface SocialLink {
  platform: string;
  url: string;
}

function CreatorEditProfilePage() {
  const isMounted = useIsMounted();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch current profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await creatorsApi.getMyCreatorProfile();
        if (response.success && response.data) {
          const data = response.data;
          setDisplayName(data.displayName || '');
          setBio(data.bio || '');
          setAvatar(data.avatar || '');
          setCoverImage(data.coverImage || '');
          setSelectedTags(data.tags || []);
          setSocialLinks(data.socialLinks || []);
        }
      } catch (err) {
        // silently handle
      } finally {
        if (!isMounted()) return;
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!displayName.trim()) {
      newErrors.displayName = 'Display name is required';
    } else if (displayName.trim().length > 50) {
      newErrors.displayName = 'Display name must be 50 characters or less';
    }

    if (bio.length > 500) {
      newErrors.bio = 'Bio must be 500 characters or less';
    }

    const urlRegex = /^https?:\/\/.+/i;
    if (avatar && !urlRegex.test(avatar)) {
      newErrors.avatar = 'Must be a valid URL starting with http:// or https://';
    }
    if (coverImage && !urlRegex.test(coverImage)) {
      newErrors.coverImage = 'Must be a valid URL starting with http:// or https://';
    }

    for (const link of socialLinks) {
      if (link.url && !urlRegex.test(link.url)) {
        newErrors[`social_${link.platform}`] = `Invalid URL for ${link.platform}`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [displayName, bio, avatar, coverImage, socialLinks]);

  const handleSave = useCallback(async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const filteredLinks = socialLinks.filter(link => link.url.trim());
      const response = await creatorsApi.updateMyProfile({
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatar: avatar.trim() || undefined,
        coverImage: coverImage.trim() || undefined,
        tags: selectedTags,
        socialLinks: filteredLinks.length > 0 ? filteredLinks : undefined,
      });

      if (response.success) {
        platformAlert('Success', 'Profile updated successfully', [
          { text: 'OK', onPress: () => router.canGoBack() ? router.back() : router.replace('/(tabs)') },
        ]);
      } else {
        platformAlert('Error', response.error || 'Failed to update profile');
      }
    } catch (err: any) {
      platformAlert('Error', err.message || 'Something went wrong');
    } finally {
      if (!isMounted()) return;
      setSaving(false);
    }
  }, [displayName, bio, avatar, coverImage, selectedTags, socialLinks, validate, router]);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : prev.length < 5 ? [...prev, tag] : prev
    );
  }, []);

  const addSocialLink = useCallback(() => {
    const usedPlatforms = socialLinks.map(l => l.platform);
    const available = SOCIAL_PLATFORMS.find(p => !usedPlatforms.includes(p));
    if (available) {
      setSocialLinks(prev => [...prev, { platform: available, url: '' }]);
    }
  }, [socialLinks]);

  const removeSocialLink = useCallback((index: number) => {
    setSocialLinks(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateSocialLink = useCallback((index: number, field: 'platform' | 'url', value: string) => {
    setSocialLinks(prev => prev.map((link, i) =>
      i === index ? { ...link, [field]: value } : link
    ));
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.nileBlue} />
        <LinearGradient colors={[Colors.nileBlue, '#2d5a7b']} style={styles.header}>
          <View style={styles.headerContent}>
            <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
              <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
            </Pressable>
            <Text style={styles.headerTitle}>Edit Profile</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <FormPageSkeleton />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.nileBlue} />

      {/* Header */}
      <LinearGradient colors={[Colors.nileBlue, '#2d5a7b']} style={styles.header}>
        <View style={styles.headerContent}>
          <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <Pressable
            style={[styles.saveHeaderButton, saving && { opacity: 0.5 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={Colors.text.inverse} />
            ) : (
              <Text style={styles.saveHeaderButtonText}>Save</Text>
            )}
          </Pressable>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Display Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Display Name *</Text>
            <TextInput
              style={[styles.textInput, errors.displayName ? styles.textInputError : null]}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your creator display name"
              placeholderTextColor={colors.neutral[400]}
              maxLength={50}
            />
            <View style={styles.fieldFooter}>
              {errors.displayName && (
                <Text style={styles.errorText}>{errors.displayName}</Text>
              )}
              <Text style={styles.charCount}>{displayName.length}/50</Text>
            </View>
          </View>

          {/* Bio */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Bio</Text>
            <TextInput
              style={[styles.textInput, styles.textArea, errors.bio ? styles.textInputError : null]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell your followers about yourself..."
              placeholderTextColor={colors.neutral[400]}
              multiline
              numberOfLines={4}
              maxLength={500}
              textAlignVertical="top"
            />
            <View style={styles.fieldFooter}>
              {errors.bio && <Text style={styles.errorText}>{errors.bio}</Text>}
              <Text style={styles.charCount}>{bio.length}/500</Text>
            </View>
          </View>

          {/* Avatar URL */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Avatar URL</Text>
            <TextInput
              style={[styles.textInput, errors.avatar ? styles.textInputError : null]}
              value={avatar}
              onChangeText={setAvatar}
              placeholder="https://example.com/your-avatar.jpg"
              placeholderTextColor={colors.neutral[400]}
              autoCapitalize="none"
              keyboardType="url"
            />
            {errors.avatar && <Text style={styles.errorText}>{errors.avatar}</Text>}
          </View>

          {/* Cover Image URL */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Cover Image URL</Text>
            <TextInput
              style={[styles.textInput, errors.coverImage ? styles.textInputError : null]}
              value={coverImage}
              onChangeText={setCoverImage}
              placeholder="https://example.com/your-cover.jpg"
              placeholderTextColor={colors.neutral[400]}
              autoCapitalize="none"
              keyboardType="url"
            />
            {errors.coverImage && <Text style={styles.errorText}>{errors.coverImage}</Text>}
          </View>

          {/* Tags */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Tags (up to 5)</Text>
            <View style={styles.tagsGrid}>
              {CREATOR_TAGS.map(tag => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <Pressable
                    key={tag}
                    style={[styles.tagChip, isSelected && styles.tagChipSelected]}
                    onPress={() => toggleTag(tag)}
                   
                  >
                    <Text style={[styles.tagChipText, isSelected && styles.tagChipTextSelected]}>
                      {tag}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={14} color={Colors.text.inverse} />}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Social Links */}
          <View style={styles.fieldGroup}>
            <View style={styles.socialHeader}>
              <Text style={styles.fieldLabel}>Social Links</Text>
              {socialLinks.length < SOCIAL_PLATFORMS.length && (
                <Pressable onPress={addSocialLink} style={styles.addLinkButton}>
                  <Ionicons name="add-circle-outline" size={20} color={Colors.info} />
                  <Text style={styles.addLinkText}>Add</Text>
                </Pressable>
              )}
            </View>

            {socialLinks.map((link, index) => (
              <View key={index} style={styles.socialLinkRow}>
                <View style={styles.platformBadge}>
                  <Ionicons
                    name={
                      link.platform === 'instagram' ? 'logo-instagram' :
                      link.platform === 'youtube' ? 'logo-youtube' :
                      link.platform === 'twitter' ? 'logo-twitter' :
                      link.platform === 'tiktok' ? 'musical-notes' :
                      'globe-outline' as any
                    }
                    size={16}
                    color={Colors.text.tertiary}
                  />
                  <Text style={styles.platformText}>
                    {link.platform.charAt(0).toUpperCase() + link.platform.slice(1)}
                  </Text>
                </View>
                <TextInput
                  style={[
                    styles.socialUrlInput,
                    errors[`social_${link.platform}`] ? styles.textInputError : null,
                  ]}
                  value={link.url}
                  onChangeText={(value) => updateSocialLink(index, 'url', value)}
                  placeholder={`https://${link.platform}.com/...`}
                  placeholderTextColor={colors.neutral[400]}
                  autoCapitalize="none"
                  keyboardType="url"
                />
                <Pressable
                  onPress={() => removeSocialLink(index)}
                  style={styles.removeLinkButton}
                >
                  <Ionicons name="close-circle" size={22} color={Colors.error} />
                </Pressable>
              </View>
            ))}
            {socialLinks.length === 0 && (
              <Text style={styles.noLinksText}>No social links added yet</Text>
            )}
          </View>

          {/* Save Button */}
          <Pressable
            style={[styles.saveButton, saving && { opacity: 0.5 }]}
            onPress={handleSave}
            disabled={saving}
           
          >
            {saving ? (
              <ActivityIndicator size="small" color={Colors.text.inverse} />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </Pressable>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 40,
    paddingBottom: 14,
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
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  saveHeaderButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: 10,
  },
  saveHeaderButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  scrollView: {
    flex: 1,
    padding: Spacing.base,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    ...Typography.body,
    color: Colors.text.tertiary,
  },

  // Fields
  fieldGroup: {
    marginBottom: Spacing.lg,
  },
  fieldLabel: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  fieldFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  textInput: {
    backgroundColor: Colors.background.primary,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: BorderRadius.md,
    padding: 14,
    ...Typography.body,
    color: Colors.text.primary,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  textInputError: {
    borderColor: Colors.error,
  },
  errorText: {
    ...Typography.bodySmall,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
  charCount: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
    marginLeft: 'auto',
  },

  // Tags
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: 14,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.primary,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  tagChipSelected: {
    backgroundColor: Colors.brand.purpleLight,
    borderColor: Colors.brand.purpleLight,
  },
  tagChipText: {
    ...Typography.bodySmall,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  tagChipTextSelected: {
    color: Colors.text.inverse,
  },

  // Social Links
  socialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  addLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  addLinkText: {
    ...Typography.body,
    fontWeight: '500',
    color: Colors.info,
  },
  socialLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 10,
  },
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 100,
  },
  platformText: {
    ...Typography.bodySmall,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  socialUrlInput: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: 10,
    padding: 10,
    ...Typography.bodySmall,
    color: Colors.text.primary,
  },
  removeLinkButton: {
    padding: Spacing.xs,
  },
  noLinksText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    fontStyle: 'italic',
  },

  // Save
  saveButton: {
    backgroundColor: Colors.nileBlue,
    paddingVertical: Spacing.base,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  saveButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
});

export default withErrorBoundary(CreatorEditProfilePage, 'CreatorEdit');
