/**
 * Prive Campaign Post Submission Page
 *
 * Form to submit a social media post for a campaign.
 * Fields: postUrl (required, validated), screenshot (required via ImagePicker),
 * orderId (optional), notes (optional, max 500 chars).
 * Submits as FormData for screenshot upload.
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import CachedImage from '@/components/ui/CachedImage';
import { PRIVE_COLORS, PRIVE_SPACING, PRIVE_RADIUS } from '@/components/prive/priveTheme';
import { platformAlertSimple } from '@/utils/platformAlert';
import { getImagePicker } from '@/utils/lazyImports';
import priveCampaignApi from '@/services/priveCampaignApi';

/** Validates that a URL is from a supported social platform */
const SOCIAL_URL_REGEX = /^https?:\/\/(www\.)?(instagram\.com|twitter\.com|x\.com|youtube\.com|tiktok\.com|facebook\.com|threads\.net)\//i;

interface SelectedImage {
  uri: string;
  type: string;
  fileName: string;
}

export default function CampaignSubmitPage() {
  const router = useRouter();
  const { campaignId } = useLocalSearchParams<{ campaignId: string }>();

  const [postUrl, setPostUrl] = useState('');
  const [screenshot, setScreenshot] = useState<SelectedImage | null>(null);
  const [orderId, setOrderId] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const scrollRef = useRef<ScrollView>(null);

  const pickScreenshot = async () => {
    try {
      const ImagePicker = await getImagePicker();

      const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permResult.granted) {
        platformAlertSimple('Permission Required', 'Please allow photo access to upload a screenshot.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images' as any,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const fileName = asset.fileName || `screenshot_${Date.now()}.jpg`;
        const mimeType = asset.mimeType || 'image/jpeg';
        setScreenshot({ uri: asset.uri, type: mimeType, fileName });
        // Clear screenshot error if present
        if (errors.screenshot) {
          setErrors(prev => { const n = { ...prev }; delete (n as any).screenshot; return n; });
        }
      }
    } catch {
      platformAlertSimple('Error', 'Failed to open image picker.');
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!postUrl.trim()) {
      newErrors.postUrl = 'Post URL is required';
    } else if (!SOCIAL_URL_REGEX.test(postUrl.trim())) {
      newErrors.postUrl = 'Enter a valid Instagram, Twitter/X, YouTube, TikTok, Facebook, or Threads URL';
    }

    if (!screenshot) {
      newErrors.screenshot = 'Screenshot is required';
    }

    if (notes.length > 500) {
      newErrors.notes = 'Notes must be 500 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !campaignId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('postUrl', postUrl.trim());

      if (screenshot) {
        formData.append('screenshot', {
          uri: screenshot.uri,
          type: screenshot.type,
          name: screenshot.fileName,
        } as any);
      }

      if (orderId.trim()) {
        formData.append('orderId', orderId.trim());
      }
      if (notes.trim()) {
        formData.append('notes', notes.trim());
      }

      const response = await priveCampaignApi.submitPost(campaignId, formData);

      if (response.success) {
        const submission = response.data?.submission;
        platformAlertSimple(
          'Post Submitted!',
          submission
            ? `We'll review within ${submission.estimatedReviewTime || '24-48 hours'}. You earned ${submission.coinsAlreadyEarned || 0} coins!`
            : 'Your post has been submitted for review.'
        );
        router.replace(`/prive/campaigns/status?campaignId=${campaignId}`);
      } else {
        platformAlertSimple('Error', (response as any)?.message || 'Failed to submit post');
      }
    } catch {
      platformAlertSimple('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIconWrap}>
              <Ionicons name="share-social" size={28} color={PRIVE_COLORS.gold.primary} />
            </View>
            <Text style={styles.headerTitle}>Submit Your Post</Text>
            <Text style={styles.headerSubtitle}>
              Share the link to your social media post and a screenshot to earn rewards
            </Text>
          </View>

          {/* Post URL */}
          <View style={styles.field}>
            <Text style={styles.label}>Post URL <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.input, errors.postUrl ? styles.inputError : null]}
              placeholder="https://www.instagram.com/reel/..."
              placeholderTextColor={PRIVE_COLORS.text.disabled}
              value={postUrl}
              onChangeText={(text) => {
                setPostUrl(text);
                if (errors.postUrl) setErrors(prev => ({ ...prev, postUrl: '' }));
              }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            {errors.postUrl ? <Text style={styles.errorText}>{errors.postUrl}</Text> : null}
            <Text style={styles.hint}>Supported: Instagram, Twitter/X, YouTube, TikTok, Facebook, Threads</Text>
          </View>

          {/* Screenshot */}
          <View style={styles.field}>
            <Text style={styles.label}>Screenshot <Text style={styles.required}>*</Text></Text>
            {screenshot ? (
              <View style={styles.screenshotPreview}>
                <CachedImage
                  source={{ uri: screenshot.uri }}
                  style={styles.screenshotImage}
                  contentFit="cover"
                  borderRadius={PRIVE_RADIUS.md}
                />
                <Pressable style={styles.removeScreenshot} onPress={() => setScreenshot(null)}>
                  <Ionicons name="close-circle" size={24} color={PRIVE_COLORS.status.error} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={[styles.screenshotPicker, errors.screenshot ? styles.inputError : null]}
                onPress={pickScreenshot}
              >
                <Ionicons name="image-outline" size={32} color={PRIVE_COLORS.gold.muted} />
                <Text style={styles.screenshotPickerText}>Tap to select screenshot</Text>
              </Pressable>
            )}
            {errors.screenshot ? <Text style={styles.errorText}>{errors.screenshot}</Text> : null}
          </View>

          {/* Order ID */}
          <View style={styles.field}>
            <Text style={styles.label}>Order ID <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your order ID if applicable"
              placeholderTextColor={PRIVE_COLORS.text.disabled}
              value={orderId}
              onChangeText={setOrderId}
              autoCapitalize="none"
            />
          </View>

          {/* Notes */}
          <View style={styles.field}>
            <Text style={styles.label}>Notes <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              style={[styles.input, styles.textArea, errors.notes ? styles.inputError : null]}
              placeholder="Tell us about your experience..."
              placeholderTextColor={PRIVE_COLORS.text.disabled}
              value={notes}
              onChangeText={(text) => {
                setNotes(text);
                if (errors.notes) setErrors(prev => ({ ...prev, notes: '' }));
              }}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.charCount}>{notes.length}/500</Text>
            {errors.notes ? <Text style={styles.errorText}>{errors.notes}</Text> : null}
          </View>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color={PRIVE_COLORS.status.info} />
            <Text style={styles.infoText}>
              Your post will be reviewed within 24-48 hours. Make sure your post is public and follows all campaign requirements.
            </Text>
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.ctaContainer}>
          <Pressable
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={PRIVE_COLORS.text.inverse} />
            ) : (
              <Text style={styles.submitBtnText}>Submit Post</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PRIVE_COLORS.background.primary,
  },
  scroll: {
    padding: PRIVE_SPACING.lg,
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: PRIVE_SPACING.xxl,
    paddingTop: PRIVE_SPACING.sm,
  },
  headerIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PRIVE_COLORS.transparent.gold10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: PRIVE_COLORS.text.primary,
    marginTop: PRIVE_SPACING.md,
  },
  headerSubtitle: {
    fontSize: 13,
    color: PRIVE_COLORS.text.secondary,
    textAlign: 'center',
    marginTop: PRIVE_SPACING.sm,
    paddingHorizontal: PRIVE_SPACING.lg,
  },
  field: {
    marginBottom: PRIVE_SPACING.xl,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
    marginBottom: PRIVE_SPACING.sm,
  },
  required: {
    color: PRIVE_COLORS.status.error,
  },
  optional: {
    color: PRIVE_COLORS.text.tertiary,
    fontWeight: '400',
    fontSize: 12,
  },
  input: {
    backgroundColor: PRIVE_COLORS.background.elevated,
    borderRadius: PRIVE_RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: PRIVE_COLORS.text.primary,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
  },
  inputError: {
    borderColor: PRIVE_COLORS.status.error,
  },
  textArea: {
    minHeight: 80,
  },
  errorText: {
    fontSize: 12,
    color: PRIVE_COLORS.status.error,
    marginTop: 4,
  },
  hint: {
    fontSize: 11,
    color: PRIVE_COLORS.text.tertiary,
    marginTop: 4,
  },
  charCount: {
    fontSize: 11,
    color: PRIVE_COLORS.text.tertiary,
    textAlign: 'right',
    marginTop: 4,
  },
  screenshotPicker: {
    height: 140,
    backgroundColor: PRIVE_COLORS.background.elevated,
    borderRadius: PRIVE_RADIUS.md,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: PRIVE_SPACING.sm,
  },
  screenshotPickerText: {
    fontSize: 13,
    color: PRIVE_COLORS.text.tertiary,
  },
  screenshotPreview: {
    position: 'relative',
    width: '100%',
  },
  screenshotImage: {
    width: '100%',
    height: 200,
    borderRadius: PRIVE_RADIUS.md,
  },
  removeScreenshot: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: PRIVE_COLORS.background.primary,
    borderRadius: 12,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: PRIVE_COLORS.transparent.gold05,
    borderRadius: PRIVE_RADIUS.md,
    padding: PRIVE_SPACING.md,
    gap: PRIVE_SPACING.sm,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.goldMuted,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: PRIVE_COLORS.text.secondary,
    lineHeight: 18,
  },
  ctaContainer: {
    padding: PRIVE_SPACING.lg,
    paddingBottom: 32,
    backgroundColor: PRIVE_COLORS.background.primary,
    borderTopWidth: 1,
    borderTopColor: PRIVE_COLORS.border.primary,
  },
  submitBtn: {
    backgroundColor: PRIVE_COLORS.gold.primary,
    paddingVertical: 16,
    borderRadius: PRIVE_RADIUS.md,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: PRIVE_COLORS.text.inverse,
  },
});
