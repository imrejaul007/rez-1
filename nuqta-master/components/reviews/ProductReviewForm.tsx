// Product Review Form Component
// Comprehensive form for submitting product reviews with photos

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { platformAlertSimple } from '@/utils/platformAlert';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import RatingStars from './RatingStars';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface ProductReviewFormProps {
  productId: string;
  productName: string;
  onSubmit: (data: {
    rating: number;
    title: string;
    content: string;
    images?: string[];
    recommended: boolean;
    wouldBuyAgain?: boolean;
    usageTime?: string;
  }) => Promise<void>;
  onCancel?: () => void;
}

function ProductReviewForm({
  productId,
  productName,
  onSubmit,
  onCancel
}: ProductReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [recommended, setRecommended] = useState(true);
  const [wouldBuyAgain, setWouldBuyAgain] = useState(true);
  const [usageTime, setUsageTime] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const isMounted = useIsMounted();

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (rating === 0) {
      newErrors.rating = 'Please select a rating';
    }

    if (!content.trim()) {
      newErrors.content = 'Review content is required';
    } else if (content.trim().length < 20) {
      newErrors.content = 'Review must be at least 20 characters';
    } else if (content.trim().length > 2000) {
      newErrors.content = 'Review must not exceed 2000 characters';
    }

    if (title.length > 100) {
      newErrors.title = 'Title must not exceed 100 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        rating,
        title: title.trim() || `${rating} star review`,
        content: content.trim(),
        images: images.length > 0 ? images : undefined,
        recommended,
        wouldBuyAgain,
        usageTime: usageTime || undefined,
      });

      // Reset form on success
      if (!isMounted()) return;
      setRating(0);
      setTitle('');
      setContent('');
      setImages([]);
      setRecommended(true);
      setWouldBuyAgain(true);
      setUsageTime('');
      setErrors({});
    } catch (error) {
      // Error is handled in the parent hook
    } finally {
      if (!isMounted()) return;
      setIsSubmitting(false);
    }
  };

  const pickImage = async () => {
    try {
      // Request permission
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          platformAlertSimple('Permission Required', 'Please grant permission to access your photos to upload review images.');
          return;
        }
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;

        // Check image limit
        if (images.length >= 5) {
          platformAlertSimple('Limit Reached', 'You can upload up to 5 images.');
          return;
        }

        if (!isMounted()) return;
        setImages(prev => [...prev, imageUri]);

      }
    } catch (error) {
      platformAlertSimple('Error', 'Failed to pick image. Please try again.');
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const getRatingDescription = (rating: number): string => {
    switch (rating) {
      case 1: return 'Poor - Not recommended';
      case 2: return 'Fair - Below average';
      case 3: return 'Good - Average';
      case 4: return 'Very Good - Above average';
      case 5: return 'Excellent - Highly recommended';
      default: return 'Tap stars to rate';
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>Write a Review</ThemedText>
          <ThemedText style={styles.headerSubtitle}>
            Share your experience with {productName}
          </ThemedText>
        </View>

        {/* Rating Selector */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>
            Overall Rating <ThemedText style={styles.required}>*</ThemedText>
          </ThemedText>
          <View style={styles.ratingSelector}>
            <RatingStars
              rating={rating}
              interactive={true}
              onRatingChange={setRating}
              size={36}
            />
            <ThemedText style={styles.ratingDescription}>
              {getRatingDescription(rating)}
            </ThemedText>
          </View>
          {errors.rating && (
            <ThemedText style={styles.errorText}>{errors.rating}</ThemedText>
          )}
        </View>

        {/* Title Input */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>
            Review Title (Optional)
          </ThemedText>
          <TextInput
            style={styles.titleInput}
            placeholder="Summarize your experience"
            placeholderTextColor={colors.neutral[400]}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
          <ThemedText style={styles.charCount}>
            {title.length}/100
          </ThemedText>
          {errors.title && (
            <ThemedText style={styles.errorText}>{errors.title}</ThemedText>
          )}
        </View>

        {/* Content Input */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>
            Your Review <ThemedText style={styles.required}>*</ThemedText>
          </ThemedText>
          <TextInput
            style={styles.contentInput}
            placeholder="Tell us about your experience (minimum 20 characters)"
            placeholderTextColor={colors.neutral[400]}
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={2000}
          />
          <ThemedText style={styles.charCount}>
            {content.length}/2000
          </ThemedText>
          {errors.content && (
            <ThemedText style={styles.errorText}>{errors.content}</ThemedText>
          )}
        </View>

        {/* Images */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>
            Add Photos (Optional)
          </ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.imagesContainer}
          >
            {/* Existing Images */}
            {images.map((imageUri, index) => (
              <View key={index} style={styles.imageWrapper}>
                <CachedImage source={imageUri} style={styles.image} />
                <Pressable
                  style={styles.removeImageButton}
                  onPress={() => removeImage(index)}
                 
                >
                  <Ionicons name="close-circle" size={24} color={colors.error} />
                </Pressable>
              </View>
            ))}

            {/* Add Image Button */}
            {images.length < 5 && (
              <Pressable
                style={styles.addImageButton}
                onPress={pickImage}
               
              >
                <Ionicons name="camera-outline" size={32} color={colors.brand.purpleLight} />
                <ThemedText style={styles.addImageText}>Add Photo</ThemedText>
              </Pressable>
            )}
          </ScrollView>
          <ThemedText style={styles.helperText}>
            You can add up to 5 photos
          </ThemedText>
        </View>

        {/* Recommendation */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>
            Would you recommend this product?
          </ThemedText>
          <View style={styles.optionRow}>
            <Pressable
              style={[styles.optionButton, recommended && styles.optionButtonActive]}
              onPress={() => setRecommended(true)}
             
            >
              <Ionicons
                name={recommended ? 'thumbs-up' : 'thumbs-up-outline'}
                size={20}
                color={recommended ? colors.background.primary : colors.brand.purpleLight}
              />
              <ThemedText style={[styles.optionText, recommended && styles.optionTextActive]}>
                Yes
              </ThemedText>
            </Pressable>
            <Pressable
              style={[styles.optionButton, !recommended && styles.optionButtonActive]}
              onPress={() => setRecommended(false)}
             
            >
              <Ionicons
                name={!recommended ? 'thumbs-down' : 'thumbs-down-outline'}
                size={20}
                color={!recommended ? colors.background.primary : colors.brand.purpleLight}
              />
              <ThemedText style={[styles.optionText, !recommended && styles.optionTextActive]}>
                No
              </ThemedText>
            </Pressable>
          </View>
        </View>

        {/* Would Buy Again */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>
            Would you buy this again?
          </ThemedText>
          <View style={styles.optionRow}>
            <Pressable
              style={[styles.optionButton, wouldBuyAgain && styles.optionButtonActive]}
              onPress={() => setWouldBuyAgain(true)}
             
            >
              <Ionicons
                name={wouldBuyAgain ? 'checkmark-circle' : 'checkmark-circle-outline'}
                size={20}
                color={wouldBuyAgain ? colors.background.primary : colors.brand.purpleLight}
              />
              <ThemedText style={[styles.optionText, wouldBuyAgain && styles.optionTextActive]}>
                Yes
              </ThemedText>
            </Pressable>
            <Pressable
              style={[styles.optionButton, !wouldBuyAgain && styles.optionButtonActive]}
              onPress={() => setWouldBuyAgain(false)}
             
            >
              <Ionicons
                name={!wouldBuyAgain ? 'close-circle' : 'close-circle-outline'}
                size={20}
                color={!wouldBuyAgain ? colors.background.primary : colors.brand.purpleLight}
              />
              <ThemedText style={[styles.optionText, !wouldBuyAgain && styles.optionTextActive]}>
                No
              </ThemedText>
            </Pressable>
          </View>
        </View>

        {/* Usage Time */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>
            How long have you used this product? (Optional)
          </ThemedText>
          <View style={styles.usageTimeRow}>
            {['< 1 week', '1-4 weeks', '1-3 months', '3-6 months', '6+ months'].map((time) => (
              <Pressable
                key={time}
                style={[
                  styles.usageTimeButton,
                  usageTime === time && styles.usageTimeButtonActive
                ]}
                onPress={() => setUsageTime(time)}
               
              >
                <ThemedText style={[
                  styles.usageTimeText,
                  usageTime === time && styles.usageTimeTextActive
                ]}>
                  {time}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Guidelines */}
        <View style={styles.guidelinesContainer}>
          <ThemedText style={styles.guidelinesTitle}>Review Guidelines:</ThemedText>
          <ThemedText style={styles.guidelineText}>
            • Be honest and provide constructive feedback
          </ThemedText>
          <ThemedText style={styles.guidelineText}>
            • Focus on your personal experience with the product
          </ThemedText>
          <ThemedText style={styles.guidelineText}>
            • Avoid offensive language or personal attacks
          </ThemedText>
          <ThemedText style={styles.guidelineText}>
            • Do not include personal information
          </ThemedText>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        {onCancel && (
          <Pressable
            style={styles.cancelButton}
            onPress={onCancel}
            disabled={isSubmitting}
           
          >
            <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
          </Pressable>
        )}

        <Pressable
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
         
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={colors.background.primary} />
          ) : (
            <ThemedText style={styles.submitButtonText}>
              Submit Review
            </ThemedText>
          )}
        </Pressable>
      </View>
    </ThemedView>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: 8,
  },
  required: {
    color: colors.error,
  },
  ratingSelector: {
    backgroundColor: colors.background.primary,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  ratingDescription: {
    fontSize: 14,
    color: colors.neutral[500],
    fontWeight: '500',
  },
  titleInput: {
    backgroundColor: colors.background.primary,
    padding: 16,
    borderRadius: 12,
    fontSize: 14,
    color: colors.neutral[900],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  contentInput: {
    backgroundColor: colors.background.primary,
    padding: 16,
    borderRadius: 12,
    fontSize: 14,
    color: colors.neutral[900],
    borderWidth: 1,
    borderColor: colors.neutral[200],
    minHeight: 150,
  },
  charCount: {
    fontSize: 12,
    color: colors.neutral[400],
    textAlign: 'right',
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
  },
  imagesContainer: {
    gap: 12,
    paddingVertical: 8,
  },
  imageWrapper: {
    position: 'relative',
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.background.primary,
    borderRadius: 12,
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.brand.purpleLight,
    backgroundColor: colors.tint.purpleLight,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  addImageText: {
    fontSize: 12,
    color: colors.brand.purpleLight,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    color: colors.neutral[400],
    marginTop: 8,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  optionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.brand.purpleLight,
    backgroundColor: colors.background.primary,
  },
  optionButtonActive: {
    backgroundColor: colors.brand.purpleLight,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brand.purpleLight,
  },
  optionTextActive: {
    color: colors.background.primary,
  },
  usageTimeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  usageTimeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    backgroundColor: colors.background.primary,
  },
  usageTimeButtonActive: {
    backgroundColor: colors.brand.purpleLight,
    borderColor: colors.brand.purpleLight,
  },
  usageTimeText: {
    fontSize: 12,
    color: colors.neutral[500],
    fontWeight: '500',
  },
  usageTimeTextActive: {
    color: colors.background.primary,
  },
  guidelinesContainer: {
    backgroundColor: colors.indigoMist,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  guidelinesTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4F46E5',
    marginBottom: 4,
  },
  guidelineText: {
    fontSize: 12,
    color: colors.brand.indigo,
    lineHeight: 18,
  },
  actionsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 5,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[500],
  },
  submitButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.brand.purpleLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background.primary,
  },
});

export default React.memo(ProductReviewForm);
