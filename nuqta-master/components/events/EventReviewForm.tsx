// @ts-nocheck
/**
 * EventReviewForm Component - Form for submitting event reviews
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { EVENT_COLORS } from '@/constants/EventColors';
import StarRating from './StarRating';
import { useIsMounted } from '@/hooks/useIsMounted';

interface EventReviewFormProps {
  onSubmit: (data: { rating: number; title: string; review: string }) => Promise<void>;
  onCancel?: () => void;
  initialData?: {
    rating: number;
    title: string;
    review: string;
  };
  isEditing?: boolean;
}

const EventReviewForm: React.FC<EventReviewFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  isEditing = false,
}) => {
  const [rating, setRating] = useState(initialData?.rating || 0);
  const [title, setTitle] = useState(initialData?.title || '');
  const [review, setReview] = useState(initialData?.review || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ rating?: string; title?: string; review?: string }>({});
  const isMounted = useIsMounted();

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (rating === 0) {
      newErrors.rating = 'Please select a rating';
    }

    if (!title.trim()) {
      newErrors.title = 'Please enter a title';
    } else if (title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    } else if (title.trim().length > 100) {
      newErrors.title = 'Title must be less than 100 characters';
    }

    if (!review.trim()) {
      newErrors.review = 'Please write your review';
    } else if (review.trim().length < 10) {
      newErrors.review = 'Review must be at least 10 characters';
    } else if (review.trim().length > 2000) {
      newErrors.review = 'Review must be less than 2000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        rating,
        title: title.trim(),
        review: review.trim(),
      });
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsSubmitting(false);
    }
  };

  const getRatingLabel = (rating: number): string => {
    if (rating === 0) return 'Tap to rate';
    if (rating === 1) return 'Poor';
    if (rating === 2) return 'Fair';
    if (rating === 3) return 'Good';
    if (rating === 4) return 'Very Good';
    return 'Excellent';
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {isEditing ? 'Edit Your Review' : 'Write a Review'}
          </Text>
          {onCancel && (
            <Pressable onPress={onCancel} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={EVENT_COLORS.textMuted} />
            </Pressable>
          )}
        </View>

        {/* Rating */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Your Rating *</Text>
          <View style={styles.ratingContainer}>
            <StarRating
              rating={rating}
              size={36}
              editable
              onRatingChange={setRating}
              spacing={4}
            />
            <Text style={[
              styles.ratingLabel,
              rating > 0 && styles.ratingLabelActive
            ]}>
              {getRatingLabel(rating)}
            </Text>
          </View>
          {errors.rating && (
            <Text style={styles.errorText}>{errors.rating}</Text>
          )}
        </View>

        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Review Title *</Text>
          <TextInput
            style={[styles.input, errors.title && styles.inputError]}
            placeholder="Summarize your experience"
            placeholderTextColor={EVENT_COLORS.textLight}
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              if (errors.title) setErrors({ ...errors, title: undefined });
            }}
            maxLength={100}
          />
          <View style={styles.inputFooter}>
            {errors.title ? (
              <Text style={styles.errorText}>{errors.title}</Text>
            ) : (
              <View />
            )}
            <Text style={styles.charCount}>{title.length}/100</Text>
          </View>
        </View>

        {/* Review */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Your Review *</Text>
          <TextInput
            style={[styles.textArea, errors.review && styles.inputError]}
            placeholder="Tell others about your experience. What did you like? What could be improved?"
            placeholderTextColor={EVENT_COLORS.textLight}
            value={review}
            onChangeText={(text) => {
              setReview(text);
              if (errors.review) setErrors({ ...errors, review: undefined });
            }}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={2000}
          />
          <View style={styles.inputFooter}>
            {errors.review ? (
              <Text style={styles.errorText}>{errors.review}</Text>
            ) : (
              <View />
            )}
            <Text style={styles.charCount}>{review.length}/2000</Text>
          </View>
        </View>

        {/* Submit Button */}
        <Pressable
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
         
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={EVENT_COLORS.background} />
          ) : (
            <>
              <Ionicons name="send" size={18} color={EVENT_COLORS.background} />
              <Text style={styles.submitButtonText}>
                {isEditing ? 'Update Review' : 'Submit Review'}
              </Text>
            </>
          )}
        </Pressable>

        {/* Cancel Button */}
        {onCancel && (
          <Pressable
            style={styles.cancelButton}
            onPress={onCancel}
           
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: EVENT_COLORS.background,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: EVENT_COLORS.text,
  },
  closeButton: {
    padding: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: EVENT_COLORS.text,
    marginBottom: 8,
  },
  ratingContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: EVENT_COLORS.surface,
    borderRadius: 12,
  },
  ratingLabel: {
    marginTop: 8,
    fontSize: 14,
    color: EVENT_COLORS.textMuted,
  },
  ratingLabelActive: {
    color: EVENT_COLORS.star,
    fontWeight: '600',
  },
  input: {
    backgroundColor: EVENT_COLORS.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: EVENT_COLORS.text,
    borderWidth: 1,
    borderColor: EVENT_COLORS.border,
  },
  textArea: {
    backgroundColor: EVENT_COLORS.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: EVENT_COLORS.text,
    borderWidth: 1,
    borderColor: EVENT_COLORS.border,
    minHeight: 120,
  },
  inputError: {
    borderColor: EVENT_COLORS.error,
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  charCount: {
    fontSize: 12,
    color: EVENT_COLORS.textMuted,
  },
  errorText: {
    fontSize: 12,
    color: EVENT_COLORS.error,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: EVENT_COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: EVENT_COLORS.background,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 15,
    color: EVENT_COLORS.textMuted,
  },
});

export default React.memo(EventReviewForm);
