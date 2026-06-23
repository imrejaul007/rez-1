// @ts-nocheck
// Review and Rating System Component
// Comprehensive review system for products and stores with star ratings

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import CachedImage from '@/components/ui/CachedImage';
import { platformAlertSimple, platformAlertDestructive } from '@/utils/platformAlert';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import FileUploader from './FileUploader';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  title: string;
  content: string;
  images?: string[];
  createdAt: string;
  updatedAt?: string;
  helpfulCount: number;
  isHelpful: boolean;
  isVerifiedPurchase: boolean;
  canEdit: boolean;
  canDelete: boolean;
  response?: {
    id: string;
    content: string;
    author: string;
    createdAt: string;
  };
}

export interface ReviewSummary {
  totalReviews: number;
  averageRating: number;
  ratingBreakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

interface ReviewSystemProps {
  entityId: string;
  entityType: 'product' | 'store';
  reviews: Review[];
  reviewSummary: ReviewSummary;
  onAddReview: (review: Omit<Review, 'id' | 'createdAt' | 'helpfulCount' | 'isHelpful' | 'canEdit' | 'canDelete'>) => Promise<void>;
  onEditReview: (reviewId: string, review: Partial<Review>) => Promise<void>;
  onDeleteReview: (reviewId: string) => Promise<void>;
  onMarkHelpful: (reviewId: string) => Promise<void>;
  onRefresh?: () => Promise<void>;
  currentUserId?: string;
  canAddReview?: boolean;
  isLoading?: boolean;
  style?: any;
}

type SortOption = 'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful';
type FilterOption = 'all' | '5' | '4' | '3' | '2' | '1' | 'verified';

function ReviewSystem({
  entityId,
  entityType,
  reviews,
  reviewSummary,
  onAddReview,
  onEditReview,
  onDeleteReview,
  onMarkHelpful,
  onRefresh,
  currentUserId,
  canAddReview = true,
  isLoading = false,
  style,
}: ReviewSystemProps) {
  const [isWritingReview, setIsWritingReview] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const isMounted = useIsMounted();
  
  // New review form state
  const [newReview, setNewReview] = useState({
    rating: 0,
    title: '',
    content: '',
    images: [] as string[],
  });

  const handleRefresh = async () => {
    if (!onRefresh) return;
    
    setIsRefreshing(true);
    try {
      await onRefresh();
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsRefreshing(false);
    }
  };

  const handleSubmitReview = async () => {
    if (newReview.rating === 0) {
      platformAlertSimple('Rating Required', 'Please select a rating for your review.');
      return;
    }
    
    if (!newReview.content.trim()) {
      platformAlertSimple('Review Required', 'Please write a review.');
      return;
    }

    try {
      await onAddReview({
        userId: currentUserId || 'current-user',
        userName: 'You',
        rating: newReview.rating,
        title: newReview.title.trim() || `${newReview.rating} star review`,
        content: newReview.content.trim(),
        images: newReview.images,
        isVerifiedPurchase: true, // Mock - in real app, check purchase history
      });

      // Reset form
      if (!isMounted()) return;
      setNewReview({ rating: 0, title: '', content: '', images: [] });
      setIsWritingReview(false);
      platformAlertSimple('Success', 'Your review has been posted!');
    } catch (error) {
      platformAlertSimple('Error', 'Failed to post review. Please try again.');
    }
  };

  const handleImageUpload = (urls: { url: string }[]) => {
    setNewReview(prev => ({
      ...prev,
      images: [...prev.images, ...urls.map(u => u.url)],
    }));
  };

  const removeImage = (index: number) => {
    setNewReview(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const getSortedAndFilteredReviews = () => {
    let filteredReviews = reviews;

    // Apply filter
    if (filterBy !== 'all') {
      if (filterBy === 'verified') {
        filteredReviews = reviews.filter(r => r.isVerifiedPurchase);
      } else {
        const rating = parseInt(filterBy);
        filteredReviews = reviews.filter(r => r.rating === rating);
      }
    }

    // Apply sort
    return filteredReviews.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'highest':
          return b.rating - a.rating;
        case 'lowest':
          return a.rating - b.rating;
        case 'helpful':
          return b.helpfulCount - a.helpfulCount;
        default:
          return 0;
      }
    });
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const renderStars = (rating: number, size: number = 16, interactive: boolean = false, onPress?: (rating: number) => void) => (
    <View style={styles.starsContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable
          key={star}
          onPress={() => interactive && onPress?.(star)}
          disabled={!interactive}
          style={interactive ? styles.interactiveStar : undefined}
        >
          <Ionicons
            name={star <= rating ? 'star' : 'star-outline'}
            size={size}
            color={star <= rating ? colors.brand.goldBright : colors.neutral[300]}
          />
        </Pressable>
      ))}
    </View>
  );

  const renderRatingBreakdown = () => (
    <View style={styles.ratingBreakdown}>
      <View style={styles.overallRating}>
        <ThemedText style={styles.ratingNumber}>
          {reviewSummary.averageRating.toFixed(1)}
        </ThemedText>
        {renderStars(Math.round(reviewSummary.averageRating), 24)}
        <ThemedText style={styles.totalReviews}>
          {reviewSummary.totalReviews} review{reviewSummary.totalReviews !== 1 ? 's' : ''}
        </ThemedText>
      </View>

      <View style={styles.ratingBars}>
        {[5, 4, 3, 2, 1].map((rating) => {
          const count = reviewSummary.ratingBreakdown[rating as keyof typeof reviewSummary.ratingBreakdown];
          const percentage = reviewSummary.totalReviews > 0 ? (count / reviewSummary.totalReviews) * 100 : 0;
          
          return (
            <Pressable
              key={rating}
              style={styles.ratingBar}
              onPress={() => setFilterBy(rating.toString() as FilterOption)}
            >
              <ThemedText style={styles.ratingLabel}>{rating}</ThemedText>
              <Ionicons name="star" size={12} color={colors.brand.goldBright} />
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${percentage}%` }]} />
              </View>
              <ThemedText style={styles.ratingCount}>{count}</ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const renderReview = ({ item: review }: { item: Review }) => (
    <View style={styles.reviewContainer}>
      {/* Review Header */}
      <View style={styles.reviewHeader}>
        <View style={styles.userInfo}>
          {review.userAvatar ? (
            <CachedImage source={review.userAvatar} style={styles.userAvatar} />
          ) : (
            <View style={styles.userAvatarPlaceholder}>
              <ThemedText style={styles.userAvatarText}>
                {review.userName.charAt(0).toUpperCase()}
              </ThemedText>
            </View>
          )}
          
          <View style={styles.userDetails}>
            <View style={styles.userNameRow}>
              <ThemedText style={styles.userName}>{review.userName}</ThemedText>
              {review.isVerifiedPurchase && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                  <ThemedText style={styles.verifiedText}>Verified</ThemedText>
                </View>
              )}
            </View>
            
            <View style={styles.reviewMeta}>
              {renderStars(review.rating, 14)}
              <ThemedText style={styles.reviewDate}>{formatTimeAgo(review.createdAt)}</ThemedText>
            </View>
          </View>
        </View>

        {/* Review Actions */}
        <View style={styles.reviewActions}>
          {review.canEdit && (
            <Pressable style={styles.actionButton}>
              <Ionicons name="create-outline" size={16} color={colors.midGray} />
            </Pressable>
          )}
          {review.canDelete && (
            <Pressable 
              style={styles.actionButton}
              onPress={() => {
                platformAlertDestructive('Delete Review', 'Are you sure you want to delete this review?', () => onDeleteReview(review.id), 'Delete');
              }}
            >
              <Ionicons name="trash-outline" size={16} color={colors.error} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Review Content */}
      <View style={styles.reviewContent}>
        {review.title && (
          <ThemedText style={styles.reviewTitle}>{review.title}</ThemedText>
        )}
        <ThemedText style={styles.reviewText}>{review.content}</ThemedText>

        {/* Review Images */}
        {review.images && review.images.length > 0 && (
          <View style={styles.reviewImages}>
            {review.images.map((image, index) => (
              <CachedImage key={index} source={image} style={styles.reviewImage} />
            ))}
          </View>
        )}

        {/* Store/Business Response */}
        {review.response && (
          <View style={styles.businessResponse}>
            <View style={styles.responseHeader}>
              <Ionicons name="business" size={16} color={colors.brand.purpleLight} />
              <ThemedText style={styles.responseAuthor}>{review.response.author}</ThemedText>
              <ThemedText style={styles.responseDate}>
                {formatTimeAgo(review.response.createdAt)}
              </ThemedText>
            </View>
            <ThemedText style={styles.responseText}>{review.response.content}</ThemedText>
          </View>
        )}

        {/* Helpful Button */}
        <Pressable
          style={styles.helpfulButton}
          onPress={() => onMarkHelpful(review.id)}
        >
          <Ionicons 
            name={review.isHelpful ? 'thumbs-up' : 'thumbs-up-outline'} 
            size={16} 
            color={review.isHelpful ? colors.brand.purpleLight : colors.midGray} 
          />
          <ThemedText style={[
            styles.helpfulText,
            review.isHelpful && styles.helpfulTextActive
          ]}>
            Helpful ({review.helpfulCount})
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );

  const renderNewReviewForm = () => (
    <View style={styles.newReviewForm}>
      <View style={styles.formHeader}>
        <ThemedText style={styles.formTitle}>Write a Review</ThemedText>
        <Pressable onPress={() => setIsWritingReview(false)}>
          <Ionicons name="close" size={24} color={colors.midGray} />
        </Pressable>
      </View>

      {/* Rating Selection */}
      <View style={styles.ratingSection}>
        <ThemedText style={styles.sectionLabel}>Your Rating *</ThemedText>
        {renderStars(newReview.rating, 32, true, (rating) => 
          setNewReview(prev => ({ ...prev, rating }))
        )}
        <ThemedText style={styles.ratingDescription}>
          {newReview.rating === 0 && 'Tap to rate'}
          {newReview.rating === 1 && 'Poor'}
          {newReview.rating === 2 && 'Fair'}
          {newReview.rating === 3 && 'Good'}
          {newReview.rating === 4 && 'Very Good'}
          {newReview.rating === 5 && 'Excellent'}
        </ThemedText>
      </View>

      {/* Review Title */}
      <View style={styles.inputSection}>
        <ThemedText style={styles.sectionLabel}>Review Title (Optional)</ThemedText>
        <TextInput
          style={styles.titleInput}
          value={newReview.title}
          onChangeText={(text) => setNewReview(prev => ({ ...prev, title: text }))}
          placeholder="Summarize your experience"
          maxLength={100}
        />
      </View>

      {/* Review Content */}
      <View style={styles.inputSection}>
        <ThemedText style={styles.sectionLabel}>Your Review *</ThemedText>
        <TextInput
          style={styles.contentInput}
          value={newReview.content}
          onChangeText={(text) => setNewReview(prev => ({ ...prev, content: text }))}
          placeholder={`Tell others about your experience with this ${entityType}`}
          multiline
          numberOfLines={4}
          maxLength={1000}
        />
        <ThemedText style={styles.characterCount}>
          {newReview.content.length}/1000
        </ThemedText>
      </View>

      {/* Photo Upload */}
      <View style={styles.inputSection}>
        <ThemedText style={styles.sectionLabel}>Add Photos (Optional)</ThemedText>
        <FileUploader
          uploadType="review"
          maxFiles={5}
          maxSizeMB={5}
          allowedTypes={['image']}
          onUploadComplete={handleImageUpload}
          placeholder="Add photos to your review"
          style={styles.photoUploader}
        />
        
        {newReview.images.length > 0 && (
          <View style={styles.uploadedImages}>
            {newReview.images.map((image, index) => (
              <View key={index} style={styles.uploadedImageContainer}>
                <CachedImage source={image} style={styles.uploadedImage} />
                <Pressable
                  style={styles.removeImageButton}
                  onPress={() => removeImage(index)}
                >
                  <Ionicons name="close" size={16} color="white" />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Submit Button */}
      <Pressable
        style={[
          styles.submitButton,
          (newReview.rating === 0 || !newReview.content.trim()) && styles.submitButtonDisabled
        ]}
        onPress={handleSubmitReview}
        disabled={newReview.rating === 0 || !newReview.content.trim()}
      >
        <ThemedText style={styles.submitButtonText}>Post Review</ThemedText>
      </Pressable>
    </View>
  );

  const sortOptions = [
    { key: 'newest' as SortOption, label: 'Newest First' },
    { key: 'oldest' as SortOption, label: 'Oldest First' },
    { key: 'highest' as SortOption, label: 'Highest Rated' },
    { key: 'lowest' as SortOption, label: 'Lowest Rated' },
    { key: 'helpful' as SortOption, label: 'Most Helpful' },
  ];

  const renderSortModal = () => (
    <Modal
      visible={showSortModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowSortModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.sortModal}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>Sort Reviews</ThemedText>
            <Pressable onPress={() => setShowSortModal(false)}>
              <Ionicons name="close" size={24} color={colors.midGray} />
            </Pressable>
          </View>
          
          {sortOptions.map((option) => (
            <Pressable
              key={option.key}
              style={[
                styles.sortOption,
                sortBy === option.key && styles.sortOptionSelected
              ]}
              onPress={() => {
                setSortBy(option.key);
                setShowSortModal(false);
              }}
            >
              <ThemedText style={[
                styles.sortOptionText,
                sortBy === option.key && styles.sortOptionTextSelected
              ]}>
                {option.label}
              </ThemedText>
              {sortBy === option.key && (
                <Ionicons name="checkmark" size={20} color={colors.brand.purpleLight} />
              )}
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container, style]}>
      {/* Rating Summary */}
      <View style={styles.summarySection}>
        {renderRatingBreakdown()}
      </View>

      {/* Controls */}
      <View style={styles.controlsSection}>
        {canAddReview && (
          <Pressable
            style={styles.writeReviewButton}
            onPress={() => setIsWritingReview(true)}
          >
            <Ionicons name="create" size={20} color={colors.brand.purpleLight} />
            <ThemedText style={styles.writeReviewText}>Write a Review</ThemedText>
          </Pressable>
        )}

        <Pressable
          style={styles.sortButton}
          onPress={() => setShowSortModal(true)}
        >
          <Ionicons name="funnel" size={16} color={colors.midGray} />
          <ThemedText style={styles.sortButtonText}>Sort</ThemedText>
        </Pressable>
      </View>

      {/* Reviews List */}
      <FlashList
        data={getSortedAndFilteredReviews()}
        renderItem={renderReview}
        keyExtractor={(item) => item.id}
        estimatedItemSize={120}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.brand.purpleLight}
            />
          ) : undefined
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <Ionicons name="star-outline" size={64} color={colors.neutral[300]} />
              <ThemedText style={styles.emptyTitle}>No Reviews Yet</ThemedText>
              <ThemedText style={styles.emptyText}>
                Be the first to share your experience!
              </ThemedText>
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />

      {/* Loading */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand.purpleLight} />
        </View>
      )}

      {/* New Review Modal */}
      <Modal
        visible={isWritingReview}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        {renderNewReviewForm()}
      </Modal>

      {/* Sort Modal */}
      {renderSortModal()}
    </View>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
  
  // Rating Summary
  summarySection: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  ratingBreakdown: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overallRating: {
    alignItems: 'center',
    marginRight: 32,
  },
  ratingNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.darkGray,
    marginBottom: 4,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  interactiveStar: {
    padding: 4,
  },
  totalReviews: {
    fontSize: 12,
    color: colors.midGray,
  },
  ratingBars: {
    flex: 1,
  },
  ratingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingLabel: {
    fontSize: 12,
    color: colors.midGray,
    width: 12,
    marginRight: 4,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.gray[200],
    borderRadius: 3,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.brand.goldBright,
  },
  ratingCount: {
    fontSize: 12,
    color: colors.midGray,
    width: 20,
    textAlign: 'right',
  },
  
  // Controls
  controlsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  writeReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F7FF',
    borderWidth: 1,
    borderColor: colors.brand.purpleLight,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  writeReviewText: {
    color: colors.brand.purpleLight,
    fontWeight: '600',
    marginLeft: 8,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sortButtonText: {
    color: colors.midGray,
    marginLeft: 6,
  },
  
  // Reviews List
  listContent: {
    paddingBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.darkGray,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.midGray,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Review Items
  reviewContainer: {
    backgroundColor: 'white',
    marginBottom: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brand.purpleLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  userDetails: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.darkGray,
    marginRight: 8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successScale[50],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 10,
    color: colors.success,
    fontWeight: '600',
    marginLeft: 2,
  },
  reviewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewDate: {
    fontSize: 12,
    color: colors.midGray,
    marginLeft: 8,
  },
  reviewActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  
  // Review Content
  reviewContent: {
    marginLeft: 52, // Align with user details
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.darkGray,
    marginBottom: 8,
  },
  reviewText: {
    fontSize: 14,
    color: colors.darkGray,
    lineHeight: 20,
    marginBottom: 12,
  },
  reviewImages: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  reviewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: colors.gray[100],
  },
  businessResponse: {
    backgroundColor: colors.offWhite,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  responseAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.brand.purpleLight,
    marginLeft: 6,
    marginRight: 8,
  },
  responseDate: {
    fontSize: 11,
    color: colors.midGray,
  },
  responseText: {
    fontSize: 13,
    color: colors.darkGray,
    lineHeight: 18,
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: colors.offWhite,
  },
  helpfulText: {
    fontSize: 12,
    color: colors.midGray,
    marginLeft: 6,
    fontWeight: '500',
  },
  helpfulTextActive: {
    color: colors.brand.purpleLight,
  },
  
  // New Review Form
  newReviewForm: {
    flex: 1,
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.darkGray,
  },
  
  // Form Sections
  ratingSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.darkGray,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  ratingDescription: {
    fontSize: 14,
    color: colors.midGray,
    marginTop: 8,
  },
  inputSection: {
    marginBottom: 24,
  },
  titleInput: {
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.darkGray,
  },
  contentInput: {
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.darkGray,
    height: 120,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: colors.midGray,
    textAlign: 'right',
    marginTop: 4,
  },
  photoUploader: {
    marginTop: 8,
  },
  uploadedImages: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  uploadedImageContainer: {
    position: 'relative',
    marginRight: 8,
    marginBottom: 8,
  },
  uploadedImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: colors.gray[100],
  },
  removeImageButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: colors.brand.purpleLight,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  submitButtonDisabled: {
    backgroundColor: colors.neutral[300],
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  
  // Sort Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sortModal: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.darkGray,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sortOptionSelected: {
    backgroundColor: '#F8F7FF',
  },
  sortOptionText: {
    fontSize: 16,
    color: colors.darkGray,
  },
  sortOptionTextSelected: {
    color: colors.brand.purpleLight,
    fontWeight: '600',
  },
});
export default React.memo(ReviewSystem);
