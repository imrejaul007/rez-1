// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// UGC Upload Screen
// Create and upload user-generated content (videos/images)

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getImagePicker } from '@/utils/lazyImports';
import { ThemedText } from '@/components/ThemedText';
import { useAuthUser } from '@/stores/selectors';
import { platformAlertSimple, platformAlertDestructive } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { fileUploadService } from '@/services/fileUploadService';
import ugcApi from '@/services/ugcApi';
import { useIsMounted } from '@/hooks/useIsMounted';

interface UploadForm {
  mediaUri: string | null;
  mediaType: 'image' | 'video' | null;
  caption: string;
  tags: string[];
  location: string;
}

function UGCUploadScreen() {
  const router = useRouter();
  const user = useAuthUser();
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState<UploadForm>({
    mediaUri: null,
    mediaType: null,
    caption: '',
    tags: [],
    location: '',
  });

  const [tagInput, setTagInput] = useState('');
  const isMounted = useIsMounted();

  // Request permissions on mount
  React.useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const ImagePicker = await getImagePicker();
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraPermission.status !== 'granted' || mediaPermission.status !== 'granted') {
      platformAlertSimple(
        'Permissions Required',
        'Please grant camera and media library permissions to upload content.'
      );
    }
  };

  const handlePickImage = async () => {
    try {
      const ImagePicker = await getImagePicker();
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (!isMounted()) return;
        setForm({
          ...form,
          mediaUri: asset.uri,
          mediaType: asset.type === 'video' ? 'video' : 'image',
        });
      }
    } catch (error) {
      platformAlertSimple('Error', 'Failed to pick media. Please try again.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const ImagePicker = await getImagePicker();
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (!isMounted()) return;
        setForm({
          ...form,
          mediaUri: asset.uri,
          mediaType: 'image',
        });
      }
    } catch (error) {
      platformAlertSimple('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      setForm({
        ...form,
        tags: [...form.tags, tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setForm({
      ...form,
      tags: form.tags.filter(t => t !== tag),
    });
  };

  const handleSubmit = async () => {
    // Validate form
    if (!form.mediaUri) {
      platformAlertSimple('Missing Media', 'Please select an image or video to upload.');
      return;
    }

    if (!form.caption.trim()) {
      platformAlertSimple('Missing Caption', 'Please add a caption to your post.');
      return;
    }

    try {
      setUploading(true);

      // Step 1: Upload media file to get a hosted URL
      const uploadResult = await fileUploadService.uploadFile(
        {
          uri: form.mediaUri,
          type: form.mediaType || 'image',
          fileName: `ugc_${Date.now()}.${form.mediaType === 'video' ? 'mp4' : 'jpg'}`,
          mimeType: form.mediaType === 'video' ? 'video/mp4' : 'image/jpeg',
        },
        'ugc'
      );

      // Step 2: Create the UGC reel via backend API
      const response = await ugcApi.createReel({
        title: form.caption.trim().substring(0, 100),
        description: form.caption.trim(),
        videoUrl: uploadResult.url,
        thumbnailUrl: uploadResult.thumbnailUrl,
        tags: form.tags,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to create post');
      }

      const coinMsg = response.data?.coinReward
        ? `\nYou earned ${response.data.coinReward.coinsAwarded} coins!`
        : '';
      platformAlertSimple('Success!', `Your content has been submitted for review.${coinMsg}`);
      router.canGoBack() ? router.back() : router.replace('/(tabs)');
    } catch (error: any) {
      const message = error?.message || 'Failed to upload content. Please try again.';
      platformAlertSimple('Upload Failed', message);
    } finally {
      if (!isMounted()) return;
      setUploading(false);
    }
  };

  const handleBack = () => {
    if (form.mediaUri || form.caption) {
      platformAlertDestructive(
        'Discard Changes?',
        'Are you sure you want to discard this upload?',
        'Discard',
        () => router.canGoBack() ? router.back() : router.replace('/(tabs)')
      );
    } else {
      router.canGoBack() ? router.back() : router.replace('/(tabs)');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={handleBack}
          accessibilityLabel="Close"
          accessibilityRole="button"
          accessibilityHint="Closes create post screen"
        >
          <Ionicons name="close" size={28} color={colors.darkGray} />
        </Pressable>

        <ThemedText style={styles.headerTitle}>Create Post</ThemedText>

        <Pressable
          style={[styles.postButton, (!form.mediaUri || !form.caption.trim()) && styles.postButtonDisabled]}
          onPress={handleSubmit}
          disabled={!form.mediaUri || !form.caption.trim() || uploading}
          accessibilityLabel={uploading ? "Posting" : "Post"}
          accessibilityRole="button"
          accessibilityState={{ disabled: !form.mediaUri || !form.caption.trim() || uploading, busy: uploading }}
          accessibilityHint="Posts your content to the platform"
        >
          <ThemedText style={styles.postButtonText}>
            {uploading ? 'Posting...' : 'Post'}
          </ThemedText>
        </Pressable>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Media Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Media</ThemedText>

          {form.mediaUri ? (
            <View style={styles.mediaPreview}>
              <CachedImage source={form.mediaUri} style={styles.previewImage} />
              <Pressable
                style={styles.removeMediaButton}
                onPress={() => setForm({ ...form, mediaUri: null, mediaType: null })}
                accessibilityLabel="Remove media"
                accessibilityRole="button"
                accessibilityHint="Removes selected photo or video"
              >
                <Ionicons name="close-circle" size={32} color={Colors.error} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.mediaButtons}>
              <Pressable
                style={styles.mediaButton}
                onPress={handlePickImage}
                accessibilityLabel="Choose from gallery"
                accessibilityRole="button"
                accessibilityHint="Opens gallery to select photo or video"
              >
                <LinearGradient
                  colors={[colors.brand.purpleLight, colors.brand.purpleMedium]}
                  style={styles.mediaButtonGradient}
                >
                  <Ionicons name="images" size={32} color={Colors.text.inverse} />
                  <ThemedText style={styles.mediaButtonText}>Gallery</ThemedText>
                </LinearGradient>
              </Pressable>

              <Pressable
                style={styles.mediaButton}
                onPress={handleTakePhoto}
                accessibilityLabel="Take photo"
                accessibilityRole="button"
                accessibilityHint="Opens camera to take a photo"
              >
                <LinearGradient
                  colors={[colors.brand.purpleLight, colors.brand.purpleMedium]}
                  style={styles.mediaButtonGradient}
                >
                  <Ionicons name="camera" size={32} color={Colors.text.inverse} />
                  <ThemedText style={styles.mediaButtonText}>Camera</ThemedText>
                </LinearGradient>
              </Pressable>
            </View>
          )}
        </View>

        {/* Caption Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Caption</ThemedText>
          <TextInput
            style={styles.captionInput}
            placeholder="Write a caption..."
            placeholderTextColor={colors.neutral[400]}
            value={form.caption}
            onChangeText={(text) => setForm({ ...form, caption: text })}
            multiline
            maxLength={500}
          />
          <ThemedText style={styles.charCount}>
            {form.caption.length}/500
          </ThemedText>
        </View>

        {/* Tags Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Tags</ThemedText>

          <View style={styles.tagInputContainer}>
            <TextInput
              style={styles.tagInput}
              placeholder="Add tags (e.g., fashion, tech)"
              placeholderTextColor={colors.neutral[400]}
              value={tagInput}
              onChangeText={setTagInput}
              onSubmitEditing={handleAddTag}
            />
            <Pressable
              style={styles.addTagButton}
              onPress={handleAddTag}
              accessibilityLabel="Add tag"
              accessibilityRole="button"
              accessibilityHint="Adds entered tag to your post"
            >
              <Ionicons name="add-circle" size={28} color={Colors.brand.purple} />
            </Pressable>
          </View>

          {form.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {form.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <ThemedText style={styles.tagText}>#{tag}</ThemedText>
                  <Pressable
                    onPress={() => handleRemoveTag(tag)}
                    accessibilityLabel={`Remove tag ${tag}`}
                    accessibilityRole="button"
                    accessibilityHint="Removes this tag from your post"
                  >
                    <Ionicons name="close-circle" size={18} color={Colors.brand.purple} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Location Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Location (Optional)</ThemedText>
          <TextInput
            style={styles.locationInput}
            placeholder="Add location"
            placeholderTextColor={colors.neutral[400]}
            value={form.location}
            onChangeText={(text) => setForm({ ...form, location: text })}
          />
        </View>

        {/* User Info */}
        <View style={styles.userInfo}>
          <View style={styles.userAvatarPlaceholder}>
            <ThemedText style={styles.userAvatarText}>
              {user?.profile?.fullName?.charAt(0) || 'U'}
            </ThemedText>
          </View>
          <ThemedText style={styles.userName}>
            {user?.profile?.fullName || 'User'}
          </ThemedText>
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
    borderBottomColor: Colors.border.default,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.h4,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  postButton: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.brand.purple,
  },
  postButtonDisabled: {
    backgroundColor: colors.neutral[300],
  },
  postButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: Colors.background.primary,
    marginVertical: Spacing.sm,
    padding: Spacing.base,
  },
  sectionTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  mediaButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  mediaButton: {
    flex: 1,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  mediaButtonGradient: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  mediaButtonText: {
    color: Colors.text.inverse,
    ...Typography.body,
    fontWeight: '600',
  },
  mediaPreview: {
    position: 'relative',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 300,
    backgroundColor: Colors.background.secondary,
  },
  removeMediaButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
  },
  captionInput: {
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Typography.bodyLarge,
    color: Colors.text.primary,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    textAlign: 'right',
    marginTop: Spacing.sm,
  },
  tagInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  tagInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Typography.bodyLarge,
    color: Colors.text.primary,
  },
  addTagButton: {
    padding: Spacing.xs,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: colors.brand.purpleLight,
  },
  tagText: {
    ...Typography.body,
    color: Colors.brand.purple,
    fontWeight: '500',
  },
  locationInput: {
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Typography.bodyLarge,
    color: Colors.text.primary,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    marginVertical: Spacing.sm,
    padding: Spacing.base,
    gap: Spacing.md,
  },
  userAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.brand.purple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: '600',
  },
  userName: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
  },
});

export default withErrorBoundary(UGCUploadScreen, 'UgcUpload');
