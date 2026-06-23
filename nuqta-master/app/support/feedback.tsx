import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Feedback Page
// App feedback submission

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { getImagePicker } from '@/utils/lazyImports';
import { ThemedText } from '@/components/ThemedText';
import supportService from '@/services/supportApi';
import { platformAlertSimple } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Shadows, Typography, Gradients } from '@/constants/DesignSystem';
import { CLOUDINARY_CONFIG, getCloudinaryUploadUrl } from '@/config/cloudinary.config';
import { BRAND } from '@/constants/brand';
import { useIsMounted } from '@/hooks/useIsMounted';

const FEEDBACK_CATEGORIES = [
  { id: 'bug', label: 'Bug Report', icon: 'bug-outline' },
  { id: 'feature', label: 'Feature Request', icon: 'bulb-outline' },
  { id: 'improvement', label: 'Improvement', icon: 'trending-up-outline' },
  { id: 'content', label: 'Content Issue', icon: 'document-text-outline' },
  { id: 'performance', label: 'Performance', icon: 'speedometer-outline' },
  { id: 'other', label: 'Other', icon: 'chatbubble-outline' },
];

const RATING_LABELS = ['Terrible', 'Bad', 'Okay', 'Good', 'Excellent'];

function FeedbackPage() {
  const router = useRouter();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePickImage = async () => {
    const ImagePicker = await getImagePicker();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newImages = result.assets.map(a => a.uri);
      if (!isMounted()) return;
      setScreenshots(prev => [...prev, ...newImages].slice(0, 3));
    }
  };

  const handleRemoveImage = (index: number) => {
    setScreenshots(prev => prev.filter((_, i) => i !== index));
  };

  const [uploadingImages, setUploadingImages] = useState(false);
  const isMounted = useIsMounted();

  const [idempotencyKey] = useState(() => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  });

  const uploadImageToCloudinary = async (uri: string): Promise<string> => {
    const uploadUrl = getCloudinaryUploadUrl('image');
    const formData = new FormData();

    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      const blob = await response.blob();
      formData.append('file', blob, `feedback_${Date.now()}.jpg`);
    } else {
      const filename = uri.split('/').pop() || `feedback_${Date.now()}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      formData.append('file', { uri, name: filename, type } as any);
    }

    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPresets.images);
    formData.append('folder', 'images/support');

    const res = await fetch(uploadUrl, { method: 'POST', body: formData });
    if (!res.ok) throw new Error('Failed to upload image');
    const data = await res.json();
    return data.secure_url;
  };

  const handleSubmit = async () => {
    if (!selectedCategory || !feedback) return;

    setLoading(true);
    try {
      // Upload screenshots to Cloudinary first
      let attachmentUrls: string[] = [];
      if (screenshots.length > 0) {
        setUploadingImages(true);
        try {
          attachmentUrls = await Promise.all(
            screenshots.map(uri => uploadImageToCloudinary(uri))
          );
        } catch (uploadError) {
          platformAlertSimple('Upload Error', 'Failed to upload screenshots. Submitting feedback without images.');
        } finally {
          if (!isMounted()) return;
          setUploadingImages(false);
        }
      }

      const response = await supportService.createTicket({
        subject: `Feedback: ${FEEDBACK_CATEGORIES.find(c => c.id === selectedCategory)?.label || selectedCategory}`,
        category: 'other',
        message: `[Rating: ${rating}/5]\n[Category: ${selectedCategory}]\n\n${feedback}${email ? `\n\nContact email: ${email}` : ''}`,
        priority: 'low',
        idempotencyKey,
        tags: ['feedback', selectedCategory],
        attachments: attachmentUrls.length > 0 ? attachmentUrls : undefined,
      });

      if (response.success) {
        if (!isMounted()) return;
        setSubmitted(true);
      } else {
        platformAlertSimple('Error', 'Failed to submit feedback. Please try again.');
      }
    } catch (error) {
      platformAlertSimple('Error', 'Something went wrong. Please try again.');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="light-content" translucent />
        <LinearGradient
          colors={Gradients.nileBlue}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
              <Ionicons name="arrow-back" size={24} color={Colors.text.white} />
            </Pressable>
            <ThemedText style={styles.headerTitle}>Feedback</ThemedText>
            <View style={styles.placeholder} />
          </View>
        </LinearGradient>

        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="heart" size={80} color={Colors.error} />
          </View>
          <ThemedText style={styles.successTitle}>Thank You!</ThemedText>
          <ThemedText style={styles.successText}>
            Your feedback helps us improve ${BRAND.APP_NAME} for everyone.{'\n'}
            We truly appreciate you taking the time to share your thoughts.
          </ThemedText>
          <Pressable style={styles.doneButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <ThemedText style={styles.doneButtonText}>Done</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" translucent />

      {/* Header */}
      <LinearGradient
        colors={Gradients.nileBlue}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.white} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Feedback</ThemedText>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <View style={styles.introCard}>
          <ThemedText style={styles.introTitle}>We'd love to hear from you!</ThemedText>
          <ThemedText style={styles.introText}>
            Your feedback is valuable in making ${BRAND.APP_NAME} better for everyone.
          </ThemedText>
        </View>

        {/* Rating */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>{`How's your experience with ${BRAND.APP_NAME}?`}</ThemedText>
          <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map(star => (
              <Pressable
                key={star}
                style={styles.starButton}
                onPress={() => setRating(star)}
              >
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={40}
                  color={star <= rating ? Colors.gold : Colors.gray[300]}
                />
              </Pressable>
            ))}
          </View>
          {rating > 0 && (
            <ThemedText style={styles.ratingLabel}>{RATING_LABELS[rating - 1]}</ThemedText>
          )}
        </View>

        {/* Category */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>What's this about? *</ThemedText>
          <View style={styles.categoriesGrid}>
            {FEEDBACK_CATEGORIES.map(category => (
              <Pressable
                key={category.id}
                style={[
                  styles.categoryCard,
                  selectedCategory === category.id && styles.categoryCardSelected,
                ]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <Ionicons
                  name={category.icon as any}
                  size={24}
                  color={selectedCategory === category.id ? Colors.primary[600] : Colors.text.tertiary}
                />
                <ThemedText style={[
                  styles.categoryLabel,
                  selectedCategory === category.id && styles.categoryLabelSelected,
                ]}>
                  {category.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Feedback Text */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Tell us more *</ThemedText>
          <TextInput
            style={styles.textArea}
            value={feedback}
            onChangeText={setFeedback}
            placeholder={
              selectedCategory === 'bug'
                ? "What went wrong? Please describe the steps to reproduce..."
                : selectedCategory === 'feature'
                ? "What feature would you like to see? How would it help you?"
                : "Share your thoughts..."
            }
            placeholderTextColor={Colors.text.tertiary}
            multiline
            maxLength={1000}
          />
          <ThemedText style={styles.charCount}>{feedback.length}/1000</ThemedText>
        </View>

        {/* Screenshots */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Attach Screenshots (Optional)</ThemedText>
          <View style={styles.screenshotsContainer}>
            {screenshots.map((uri, index) => (
              <View key={index} style={styles.screenshotItem}>
                <CachedImage source={{ uri }} style={styles.screenshotImage} />
                <Pressable
                  style={styles.removeButton}
                  onPress={() => handleRemoveImage(index)}
                >
                  <Ionicons name="close-circle" size={24} color={Colors.error} />
                </Pressable>
              </View>
            ))}
            {screenshots.length < 3 && (
              <Pressable style={styles.addButton} onPress={handlePickImage}>
                <Ionicons name="camera-outline" size={28} color={Colors.text.tertiary} />
                <ThemedText style={styles.addButtonText}>Add Photo</ThemedText>
              </Pressable>
            )}
          </View>
        </View>

        {/* Email */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Email (Optional)</ThemedText>
          <ThemedText style={styles.sectionSubtitle}>
            We may reach out for more details
          </ThemedText>
          <TextInput
            style={styles.textInput}
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            placeholderTextColor={Colors.text.tertiary}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Submit Button */}
        <Pressable
          style={[
            styles.submitButton,
            (!selectedCategory || !feedback) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!selectedCategory || !feedback || loading}
        >
          {loading ? (
            <>
              <ActivityIndicator color={Colors.text.white} />
              {uploadingImages && (
                <ThemedText style={styles.submitButtonText}>Uploading images...</ThemedText>
              )}
            </>
          ) : (
            <>
              <Ionicons name="paper-plane" size={20} color={Colors.text.white} />
              <ThemedText style={styles.submitButtonText}>Submit Feedback</ThemedText>
            </>
          )}
        </Pressable>

        {/* Note */}
        <View style={styles.noteCard}>
          <Ionicons name="information-circle-outline" size={20} color={Colors.info} />
          <ThemedText style={styles.noteText}>
            For urgent issues or account problems, please use our chat support
            for faster response.
          </ThemedText>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 40,
    paddingBottom: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  backButton: {
    padding: Spacing.sm,
    marginRight: Spacing.sm,
  },
  headerTitle: {
    flex: 1,
    ...Typography.h3,
    color: Colors.text.white,
    textAlign: 'center',
    marginRight: 40,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: 120,
  },
  introCard: {
    backgroundColor: Colors.primary[50],
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary[100],
  },
  introTitle: {
    ...Typography.h4,
    color: Colors.primary[600],
    marginBottom: Spacing.xs,
  },
  introText: {
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.label,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  sectionSubtitle: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginBottom: Spacing.sm,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  starButton: {
    padding: Spacing.xs,
  },
  ratingLabel: {
    ...Typography.label,
    color: Colors.gold,
    textAlign: 'center',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryCard: {
    width: '48%',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    ...Shadows.subtle,
  },
  categoryCardSelected: {
    borderColor: Colors.primary[600],
    backgroundColor: Colors.primary[50],
  },
  categoryLabel: {
    ...Typography.caption,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  categoryLabelSelected: {
    color: Colors.primary[600],
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    ...Typography.body,
    color: Colors.text.primary,
    ...Shadows.subtle,
  },
  textArea: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    ...Typography.body,
    color: Colors.text.primary,
    minHeight: 120,
    textAlignVertical: 'top',
    ...Shadows.subtle,
  },
  charCount: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  screenshotsContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  screenshotItem: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  screenshotImage: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.full,
  },
  addButton: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.gray[300],
    gap: Spacing.xs,
  },
  addButtonText: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary[600],
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.base,
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.gray[300],
  },
  submitButtonText: {
    ...Typography.button,
    color: Colors.text.white,
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.info + '15',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  noteText: {
    ...Typography.caption,
    color: Colors.text.secondary,
    flex: 1,
    lineHeight: 18,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  successIcon: {
    marginBottom: Spacing.lg,
  },
  successTitle: {
    ...Typography.h1,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  successText: {
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  doneButton: {
    width: '100%',
    backgroundColor: Colors.primary[600],
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.base,
    alignItems: 'center',
  },
  doneButtonText: {
    ...Typography.button,
    color: Colors.text.white,
  },
});

export default withErrorBoundary(FeedbackPage, 'SupportFeedback');
