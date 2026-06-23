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
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import RatingStars from './RatingStars';
import { CreateReviewData, Review } from '@/types/review.types';
import reviewService from '@/services/reviewsApi';
import SuccessModal from '@/components/common/SuccessModal';
import ErrorModal from '@/components/common/ErrorModal';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface ReviewFormProps {
  storeId: string;
  existingReview?: Review;
  onSubmit?: (review: Review) => void;
  onCancel?: () => void;
  isEdit?: boolean;
}

function ReviewForm({
  storeId,
  existingReview,
  onSubmit,
  onCancel,
  isEdit = false
}: ReviewFormProps) {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [title, setTitle] = useState(existingReview?.title || '');
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [images, setImages] = useState<string[]>(existingReview?.images || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const isMounted = useIsMounted();

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (rating === 0) {
      newErrors.rating = 'Please select a rating';
    }

    if (!comment.trim()) {
      newErrors.comment = 'Review comment is required';
    } else if (comment.trim().length < 10) {
      newErrors.comment = 'Review must be at least 10 characters';
    } else if (comment.trim().length > 1000) {
      newErrors.comment = 'Review must not exceed 1000 characters';
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
      const reviewData: CreateReviewData = {
        rating,
        title: title.trim() || undefined,
        comment: comment.trim(),
        images: images.length > 0 ? images : undefined,
      };

      let response;

      if (isEdit && existingReview) {
        // Update existing review
        const reviewId = existingReview._id || existingReview.id;
        if (!reviewId) {
          throw new Error('Review ID not found');
        }
        response = await reviewService.updateStoreReview(reviewId, reviewData);
      } else {
        // Create new review
        response = await reviewService.createStoreReview(storeId, reviewData);
      }

      if (response.success && response.data?.review) {
        // Set success message and show modal
        if (!isMounted()) return;
        setSuccessMessage(
          isEdit 
            ? 'Review updated successfully! It will be visible after merchant approval.' 
            : 'Review submitted successfully! It will be visible after merchant approval.'
        );
        setShowSuccessModal(true);
        // Call onSubmit immediately so parent modal can close
        onSubmit?.(response.data!.review);
      } else {
        throw new Error(response.error || 'Failed to submit review');
      }
    } catch (error: any) {
      // Show error in modal (works on both web and mobile)
      if (!isMounted()) return;
      setErrorMessage(error.message || 'Failed to submit review. Please try again.');
      setShowErrorModal(true);
    } finally {
      if (!isMounted()) return;
      setIsSubmitting(false);
    }
  };

  const handleImageAdd = async () => {
    try {
      // Check image limit
      if (images.length >= 5) {
        platformAlertSimple('Limit Reached', 'You can upload up to 5 images.');
        return;
      }

      // Request permission (mobile only)
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

      if (result.canceled || !result.assets[0]) {
        return;
      }

      const imageUri = result.assets[0].uri;
      if (!isMounted()) return;
      setIsUploadingImage(true);

      try {
        // Upload image to Cloudinary
        const uploadResponse = await reviewService.uploadReviewImage(imageUri);
        
        if (uploadResponse.success && uploadResponse.data?.url) {
          if (!isMounted()) return;
          setImages(prev => [...prev, uploadResponse.data!.url]);
        } else {
          throw new Error(uploadResponse.error || 'Failed to upload image');
        }
      } catch (uploadError: any) {
        platformAlertSimple('Upload Failed', uploadError.message || 'Failed to upload image. Please try again.');
      } finally {
        if (!isMounted()) return;
        setIsUploadingImage(false);
      }
    } catch (error: any) {
      platformAlertSimple('Error', 'Failed to pick image. Please try again.');
      if (!isMounted()) return;
      setIsUploadingImage(false);
    }
  };

  const handleImageRemove = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>
            {isEdit ? 'Edit Your Review' : 'Write a Review'}
          </ThemedText>
          <ThemedText style={styles.headerSubtitle}>
            Share your experience with this store
          </ThemedText>
        </View>

        {/* Rating Selector */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>
            Rating <ThemedText style={styles.required}>*</ThemedText>
          </ThemedText>
          <View style={styles.ratingSelector}>
            <RatingStars
              rating={rating}
              interactive={true}
              onRatingChange={setRating}
              size={32}
            />
            <ThemedText style={styles.ratingText}>
              {rating === 0 ? 'Tap to rate' : `${rating} out of 5 stars`}
            </ThemedText>
          </View>
          {errors.rating && (
            <ThemedText style={styles.errorText}>{errors.rating}</ThemedText>
          )}
        </View>

        {/* Title Input (Optional) */}
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

        {/* Comment Input */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>
            Your Review <ThemedText style={styles.required}>*</ThemedText>
          </ThemedText>
          <TextInput
            style={styles.commentInput}
            placeholder="Tell us about your experience (minimum 10 characters)"
            placeholderTextColor={colors.neutral[400]}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={1000}
          />
          <ThemedText style={styles.charCount}>
            {comment.length}/1000
          </ThemedText>
          {errors.comment && (
            <ThemedText style={styles.errorText}>{errors.comment}</ThemedText>
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
            {images.map((imageUrl, index) => (
              <View key={index} style={styles.imageWrapper}>
                <CachedImage source={imageUrl} style={styles.image} />
                <Pressable
                  style={styles.removeImageButton}
                  onPress={() => handleImageRemove(index)}
                 
                >
                  <Ionicons name="close-circle" size={24} color={colors.error} />
                </Pressable>
              </View>
            ))}

            {/* Add Image Button */}
            {images.length < 5 && (
              <Pressable
                style={[styles.addImageButton, isUploadingImage && styles.addImageButtonDisabled]}
                onPress={handleImageAdd}
                disabled={isUploadingImage}
               
              >
                {isUploadingImage ? (
                  <ActivityIndicator size="small" color={colors.brand.purpleLight} />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={32} color={colors.brand.purpleLight} />
                    <ThemedText style={styles.addImageText}>Add Photo</ThemedText>
                  </>
                )}
              </Pressable>
            )}
          </ScrollView>
          <ThemedText style={styles.helperText}>
            You can add up to 5 photos
          </ThemedText>
        </View>

        {/* Guidelines */}
        <View style={styles.guidelinesContainer}>
          <ThemedText style={styles.guidelinesTitle}>Review Guidelines:</ThemedText>
          <ThemedText style={styles.guidelineText}>
            " Be honest and provide constructive feedback
          </ThemedText>
          <ThemedText style={styles.guidelineText}>
            " Focus on your experience with products and service
          </ThemedText>
          <ThemedText style={styles.guidelineText}>
            " Avoid offensive language or personal attacks
          </ThemedText>
          <ThemedText style={styles.guidelineText}>
            " Do not include personal information
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
              {isEdit ? 'Update Review' : 'Submit Review'}
            </ThemedText>
          )}
        </Pressable>
      </View>

      {/* Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        title="Success"
        message={successMessage}
        onClose={() => setShowSuccessModal(false)}
        autoCloseDelay={2000}
      />

      {/* Error Modal */}
      <ErrorModal
        visible={showErrorModal}
        title="Error"
        message={errorMessage}
        onClose={() => setShowErrorModal(false)}
      />
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
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
  },
  ratingText: {
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
  commentInput: {
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
  addImageButtonDisabled: {
    opacity: 0.6,
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

export default React.memo(ReviewForm);
