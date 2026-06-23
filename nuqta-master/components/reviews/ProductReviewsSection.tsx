// @ts-nocheck
// Product Reviews Section Component
// Complete reviews section for product pages with sorting, filtering, and interactions

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import RatingStars from './RatingStars';
import ReviewItem from './ReviewItem';
import ProductReviewForm from './ProductReviewForm';
import type { Review } from '@/services/reviewsApi';
import type { ReviewsResponse } from '@/services/reviewsApi';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface ProductReviewsSectionProps {
  productId: string;
  productName: string;
  reviews: Review[];
  summary: ReviewsResponse['summary'] | null;
  isLoading: boolean;
  isRefreshing: boolean;
  hasMore: boolean;
  sortBy: string;
  filterRating: number | null;
  currentUserId?: string;
  onRefresh: () => void;
  onLoadMore: () => void;
  onSortChange: (sort: string) => void;
  onFilterChange: (rating: number | null) => void;
  onSubmitReview: (data: any) => Promise<void>;
  onUpdateReview: (reviewId: string, updates: any) => Promise<void>;
  onDeleteReview: (reviewId: string) => Promise<void>;
  onMarkHelpful: (reviewId: string) => Promise<void>;
}

type SortOption = 'newest' | 'oldest' | 'rating_high' | 'rating_low' | 'helpful' | 'featured';

function ProductReviewsSection({
  productId,
  productName,
  reviews,
  summary,
  isLoading,
  isRefreshing,
  hasMore,
  sortBy,
  filterRating,
  currentUserId,
  onRefresh,
  onLoadMore,
  onSortChange,
  onFilterChange,
  onSubmitReview,
  onUpdateReview,
  onDeleteReview,
  onMarkHelpful,
}: ProductReviewsSectionProps) {
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const isMounted = useIsMounted();

  const handleWriteReview = () => {
    setShowReviewForm(true);
  };

  const handleEditReview = (review: Review) => {
    setEditingReview(review);
    setShowReviewForm(true);
  };

  const handleSubmitReview = async (data: any) => {
    await onSubmitReview(data);
    if (!isMounted()) return;
    setShowReviewForm(false);
    setEditingReview(null);
  };

  const handleCancelReview = () => {
    setShowReviewForm(false);
    setEditingReview(null);
  };

  const renderRatingBreakdown = () => {
    if (!summary) return null;

    return (
      <View style={styles.ratingBreakdown}>
        <View style={styles.overallRating}>
          <ThemedText style={styles.ratingNumber}>
            {summary.averageRating.toFixed(1)}
          </ThemedText>
          <RatingStars rating={summary.averageRating} size={24} />
          <ThemedText style={styles.totalReviews}>
            {summary.totalReviews} review{summary.totalReviews !== 1 ? 's' : ''}
          </ThemedText>
        </View>

        <View style={styles.ratingBars}>
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = summary.ratingBreakdown[rating] || 0;
            const percentage = summary.totalReviews > 0
              ? (count / summary.totalReviews) * 100
              : 0;

            return (
              <Pressable
                key={rating}
                style={styles.ratingBar}
                onPress={() => onFilterChange(rating === filterRating ? null : rating)}
               
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
  };

  const sortOptions: { key: SortOption; label: string }[] = [
    { key: 'newest', label: 'Newest First' },
    { key: 'helpful', label: 'Most Helpful' },
    { key: 'rating_high', label: 'Highest Rated' },
    { key: 'rating_low', label: 'Lowest Rated' },
    { key: 'oldest', label: 'Oldest First' },
  ];

  const renderSortModal = () => (
    <Modal
      visible={showSortModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowSortModal(false)}
    >
      <View style={styles.modalOverlay}>
        <Pressable
          style={styles.modalBackdrop}
         
          onPress={() => setShowSortModal(false)}
        />
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
                onSortChange(option.key);
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
                <Ionicons name="checkmark" size={20} color={colors.brand.green} />
              )}
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );

  const renderHeader = () => (
    <View>
      {/* Rating Summary */}
      <View style={styles.summarySection}>
        {renderRatingBreakdown()}
      </View>

      {/* Controls */}
      <View style={styles.controlsSection}>
        <Pressable
          style={styles.writeReviewButton}
          onPress={handleWriteReview}
         
        >
          <Ionicons name="create" size={20} color={colors.brand.green} />
          <ThemedText style={styles.writeReviewText}>Write a Review</ThemedText>
        </Pressable>

        <Pressable
          style={styles.sortButton}
          onPress={() => setShowSortModal(true)}
         
        >
          <Ionicons name="funnel-outline" size={16} color={colors.midGray} />
          <ThemedText style={styles.sortButtonText}>
            {sortOptions.find(o => o.key === sortBy)?.label || 'Sort'}
          </ThemedText>
        </Pressable>
      </View>

      {/* Active Filter */}
      {filterRating !== null && (
        <View style={styles.filterBanner}>
          <ThemedText style={styles.filterText}>
            Showing {filterRating} star reviews
          </ThemedText>
          <Pressable onPress={() => onFilterChange(null)}>
            <Ionicons name="close-circle" size={20} color={colors.brand.green} />
          </Pressable>
        </View>
      )}
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="star-outline" size={64} color={colors.neutral[300]} />
      <ThemedText style={styles.emptyTitle}>No Reviews Yet</ThemedText>
      <ThemedText style={styles.emptyText}>
        Be the first to share your experience!
      </ThemedText>
      <Pressable
        style={styles.emptyButton}
        onPress={handleWriteReview}
       
      >
        <ThemedText style={styles.emptyButtonText}>Write a Review</ThemedText>
      </Pressable>
    </View>
  );

  const renderFooter = () => {
    if (!hasMore || reviews.length === 0) return null;

    return (
      <View style={styles.footerLoader}>
        <Pressable
          style={styles.loadMoreButton}
          onPress={onLoadMore}
         
        >
          <ThemedText style={styles.loadMoreText}>Load More Reviews</ThemedText>
          <Ionicons name="chevron-down" size={16} color={colors.brand.green} />
        </Pressable>
      </View>
    );
  };

  const renderReviewItem = useCallback(({ item }: { item: Review }) => (
    <ReviewItem
      review={item as any}
      isOwnReview={currentUserId === item.userId}
      onHelpfulPress={() => onMarkHelpful(item.id)}
      onEditPress={() => handleEditReview(item)}
      onDeletePress={() => onDeleteReview(item.id)}
      showActions={true}
    />
  ), [currentUserId, onMarkHelpful, handleEditReview, onDeleteReview]);

  if (isLoading && reviews.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.brand.green} />
        <ThemedText style={styles.loadingText}>Loading reviews...</ThemedText>
      </View>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlashList
        data={reviews}
        keyExtractor={(item) => item.id}
        renderItem={renderReviewItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        estimatedItemSize={120}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[colors.brand.green]}
            tintColor={colors.brand.green}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          reviews.length === 0 && styles.listContentEmpty
        ]}
        showsVerticalScrollIndicator={false}
      />

      {/* Review Form Modal */}
      <Modal
        visible={showReviewForm}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <ProductReviewForm
          productId={productId}
          productName={productName}
          onSubmit={handleSubmitReview}
          onCancel={handleCancelReview}
        />
      </Modal>

      {/* Sort Modal */}
      {renderSortModal()}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.neutral[500],
  },
  listContent: {
    paddingBottom: 20,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  summarySection: {
    backgroundColor: colors.background.primary,
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  ratingBreakdown: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overallRating: {
    alignItems: 'center',
    marginRight: 24,
    minWidth: 80,
  },
  ratingNumber: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 4,
  },
  totalReviews: {
    fontSize: 12,
    color: colors.neutral[500],
    marginTop: 4,
  },
  ratingBars: {
    flex: 1,
  },
  ratingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
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
    backgroundColor: colors.neutral[200],
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
    width: 24,
    textAlign: 'right',
  },
  controlsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  writeReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 192, 106, 0.1)',
    borderWidth: 1,
    borderColor: colors.brand.green,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  writeReviewText: {
    color: colors.brand.green,
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
    fontSize: 13,
    marginLeft: 6,
  },
  filterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 192, 106, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  filterText: {
    fontSize: 13,
    color: colors.brand.green,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.neutral[900],
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: colors.brand.green,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    shadowColor: colors.brand.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyButtonText: {
    fontSize: 14,
    color: colors.background.primary,
    fontWeight: '600',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 192, 106, 0.1)',
    borderWidth: 1,
    borderColor: colors.brand.green,
    borderRadius: 20,
  },
  loadMoreText: {
    color: colors.brand.green,
    fontWeight: '600',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
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
    borderBottomColor: colors.neutral[200],
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
    backgroundColor: 'rgba(0, 192, 106, 0.1)',
  },
  sortOptionText: {
    fontSize: 16,
    color: colors.darkGray,
  },
  sortOptionTextSelected: {
    color: colors.brand.green,
    fontWeight: '600',
  },
});

export default React.memo(ProductReviewsSection);
