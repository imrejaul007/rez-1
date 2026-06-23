// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Review to Earn Page
// Earn coins for writing reviews

import React, { useState, useCallback } from 'react';
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
import { FlashList } from '@shopify/flash-list';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BRAND } from '@/constants/brand';
import { useFocusEffect } from '@react-navigation/native';
import { getImagePicker } from '@/utils/lazyImports';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import apiClient from '@/services/apiClient';
import { platformAlert } from '@/utils/platformAlert';
import { CLOUDINARY_CONFIG, getCloudinaryUploadUrl } from '@/config/cloudinary.config';
import { FormPageSkeleton } from '@/components/skeletons';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';

interface PendingReview {
  id: string;
  type: 'product' | 'store' | 'service';
  name: string;
  image: string | null;
  purchaseDate: string;
  coins: number;
  bonusCoins?: number;
}

function ReviewToEarnPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([]);
  const [potentialEarnings, setPotentialEarnings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<PendingReview | null>(null);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchReviewableItems = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<{
        items: any[];
        totalPending: number;
        potentialEarnings: number;
      }>('/gamification/reviewable-items');

      if (response.success && response.data) {
        const items = (response.data.items || []).map((item: any) => ({
          id: item.id,
          type: item.type as 'product' | 'store' | 'service',
          name: item.name,
          image: item.image,
          purchaseDate: item.purchaseDate || item.visitDate || '',
          coins: item.coins || 20,
          bonusCoins: item.type === 'product' ? 10 : 5,
        }));
        if (!isMounted()) return;
        setPendingReviews(items);
        if (!isMounted()) return;
        setPotentialEarnings(response.data.potentialEarnings || 0);
      }
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (authLoading || !isAuthenticated) return;
      fetchReviewableItems();
    }, [fetchReviewableItems, authLoading, isAuthenticated])
  );

  const handlePickPhoto = async () => {
    const ImagePicker = await getImagePicker();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newPhotos = result.assets.map(a => a.uri);
      if (!isMounted()) return;
      setPhotos(prev => [...prev, ...newPhotos].slice(0, 5));
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImageToCloudinary = async (uri: string): Promise<string> => {
    const uploadUrl = getCloudinaryUploadUrl('image');
    const formData = new FormData();

    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      const blob = await response.blob();
      formData.append('file', blob, `review_${Date.now()}.jpg`);
    } else {
      const filename = uri.split('/').pop() || `review_${Date.now()}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      formData.append('file', { uri, name: filename, type } as any);
    }

    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPresets.reviewMedia);
    formData.append('folder', 'images/reviews');

    const res = await fetch(uploadUrl, { method: 'POST', body: formData });
    if (!res.ok) throw new Error('Failed to upload image');
    const data = await res.json();
    return data.secure_url;
  };

  const handleSubmitReview = async () => {
    if (!selectedItem || rating === 0 || !review.trim()) return;

    setSubmitting(true);
    try {
      // Upload photos to Cloudinary first
      let uploadedImageUrls: string[] | undefined;
      if (photos.length > 0) {
        uploadedImageUrls = await Promise.all(photos.map(uri => uploadImageToCloudinary(uri)));
      }

      const payload: any = {
        rating,
        comment: review.trim(),
        images: uploadedImageUrls,
      };

      // Set target based on type
      if (selectedItem.type === 'store') {
        payload.store = selectedItem.id;
      } else if (selectedItem.type === 'product') {
        payload.product = selectedItem.id;
      }

      const response = await apiClient.post('/reviews', payload);

      if (response.success) {
        platformAlert('Review Submitted!', `You earned ${calculateCoins()} ${BRAND.COIN_NAME} for your review! Your review will be moderated before publishing.`);
        if (!isMounted()) return;
        setSelectedItem(null);
        if (!isMounted()) return;
        setRating(0);
        if (!isMounted()) return;
        setReview('');
        if (!isMounted()) return;
        setPhotos([]);
        // Refresh list to remove the reviewed item
        fetchReviewableItems();
      } else {
        platformAlert('Submission Failed', response.message || 'Could not submit your review.');
      }
    } catch (error: any) {
      platformAlert('Error', 'Something went wrong. Please try again.');
    } finally {
      if (!isMounted()) return;
      setSubmitting(false);
    }
  };

  const calculateCoins = () => {
    if (!selectedItem) return 0;
    let total = selectedItem.coins;
    if (photos.length > 0) total += (selectedItem.bonusCoins || 5);
    if (review.length > 100) total += 5;
    return total;
  };

  const renderPendingReview = useCallback(({ item }: { item: PendingReview }) => (
    <Pressable
      style={styles.reviewCard}
      onPress={() => setSelectedItem(item)}
    >
      <View style={styles.reviewImage}>
        {item.image ? (
          <CachedImage source={item.image} style={{ width: 56, height: 56, borderRadius: BorderRadius.md }} />
        ) : (
          <Ionicons
            name={item.type === 'store' ? 'storefront' : item.type === 'product' ? 'cube' : 'construct'}
            size={28}
            color={Colors.text.tertiary}
          />
        )}
      </View>
      <View style={styles.reviewInfo}>
        <View style={styles.typeBadge}>
          <ThemedText style={styles.typeText}>
            {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
          </ThemedText>
        </View>
        <ThemedText style={styles.reviewName}>{item.name}</ThemedText>
        <ThemedText style={styles.reviewDate}>Purchased {item.purchaseDate}</ThemedText>
      </View>
      <View style={styles.coinsBadge}>
        <CachedImage source={BRAND.COIN_IMAGE} style={{ width: 16, height: 16 }} />
        <ThemedText style={styles.coinsValue}>{item.coins}</ThemedText>
        {item.bonusCoins && (
          <ThemedText style={styles.bonusText}>+{item.bonusCoins}</ThemedText>
        )}
      </View>
    </Pressable>
  ), []);

  if (selectedItem) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary[600]} />
        <LinearGradient
          colors={[Colors.primary[600], Colors.secondary[700]]}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <Pressable style={styles.backButton} onPress={() => setSelectedItem(null)}>
              <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
            </Pressable>
            <ThemedText style={styles.headerTitle}>Write Review</ThemedText>
            <View style={styles.placeholder} />
          </View>
        </LinearGradient>

        <ScrollView style={styles.content} contentContainerStyle={styles.writeContent}>
          {/* Item Info */}
          <View style={styles.itemCard}>
            <View style={styles.itemImage}>
              {selectedItem.image ? (
                <CachedImage source={selectedItem.image} style={{ width: 64, height: 64, borderRadius: BorderRadius.md }} />
              ) : (
                <Ionicons
                  name={selectedItem.type === 'store' ? 'storefront' : 'cube'}
                  size={32}
                  color={Colors.text.tertiary}
                />
              )}
            </View>
            <View style={styles.itemInfo}>
              <ThemedText style={styles.itemName}>{selectedItem.name}</ThemedText>
              <ThemedText style={styles.itemOrder}>{selectedItem.purchaseDate}</ThemedText>
            </View>
          </View>

          {/* Rating */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Your Rating *</ThemedText>
            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map(star => (
                <Pressable key={star} onPress={() => setRating(star)}>
                  <Ionicons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={40}
                    color={star <= rating ? Colors.gold : Colors.gray[300]}
                  />
                </Pressable>
              ))}
            </View>
          </View>

          {/* Review Text */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Your Review *</ThemedText>
            <TextInput
              style={styles.reviewInput}
              value={review}
              onChangeText={setReview}
              placeholder="Share your experience..."
              placeholderTextColor={Colors.text.tertiary}
              multiline
              maxLength={500}
            />
            <View style={styles.reviewMeta}>
              <ThemedText style={styles.charCount}>{review.length}/500</ThemedText>
              {review.length > 100 && (
                <View style={styles.bonusBadge}>
                  <ThemedText style={styles.bonusBadgeText}>+5 {BRAND.COIN_SHORT} for detailed review!</ThemedText>
                </View>
              )}
            </View>
          </View>

          {/* Photos */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>Add Photos (Optional)</ThemedText>
              {photos.length === 0 && (
                <View style={styles.photoBonusBadge}>
                  <ThemedText style={styles.photoBonusText}>+{selectedItem.bonusCoins || 5} {BRAND.COIN_SHORT}</ThemedText>
                </View>
              )}
            </View>
            <View style={styles.photosGrid}>
              {photos.map((uri, index) => (
                <View key={index} style={styles.photoItem}>
                  <CachedImage source={{ uri }} style={styles.photoImage} />
                  <Pressable
                    style={styles.removePhoto}
                    onPress={() => handleRemovePhoto(index)}
                  >
                    <Ionicons name="close-circle" size={24} color={Colors.error} />
                  </Pressable>
                </View>
              ))}
              {photos.length < 5 && (
                <Pressable style={styles.addPhoto} onPress={handlePickPhoto}>
                  <Ionicons name="camera-outline" size={28} color={Colors.text.tertiary} />
                  <ThemedText style={styles.addPhotoText}>Add</ThemedText>
                </Pressable>
              )}
            </View>
          </View>

          {/* Coin Preview */}
          <View style={styles.coinPreview}>
            <ThemedText style={styles.coinPreviewLabel}>You'll earn</ThemedText>
            <View style={styles.coinPreviewValue}>
              <CachedImage source={BRAND.COIN_IMAGE} style={{ width: 24, height: 24 }} />
              <ThemedText style={styles.coinPreviewAmount}>{calculateCoins()} {BRAND.COIN_SHORT}</ThemedText>
            </View>
          </View>

          {/* Submit Button */}
          <Pressable
            style={[
              styles.submitButton,
              (rating === 0 || !review) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmitReview}
            disabled={rating === 0 || !review || submitting}
          >
            {submitting ? (
              <ActivityIndicator color={colors.background.primary} />
            ) : (
              <ThemedText style={styles.submitButtonText}>Submit Review</ThemedText>
            )}
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary[600]} />
      <LinearGradient
        colors={[Colors.primary[600], Colors.secondary[700]]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Review & Earn</ThemedText>
          <View style={styles.placeholder} />
        </View>

        {/* Stats */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>{pendingReviews.length}</ThemedText>
            <ThemedText style={styles.statLabel}>Pending</ThemedText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>
              {potentialEarnings}
            </ThemedText>
            <ThemedText style={styles.statLabel}>RC Available</ThemedText>
          </View>
        </View>
      </LinearGradient>

      {loading ? (
        <FormPageSkeleton />
      ) : (
      <FlashList
        data={pendingReviews}
        renderItem={renderPendingReview}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        estimatedItemSize={120}
        ListHeaderComponent={
          <View style={styles.tipsCard}>
            <Ionicons name="bulb-outline" size={24} color={Colors.gold} />
            <View style={styles.tipsContent}>
              <ThemedText style={styles.tipsTitle}>Earn More Coins</ThemedText>
              <ThemedText style={styles.tipsText}>
                Write detailed reviews (100+ characters) and add photos to earn bonus coins!
              </ThemedText>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="star-outline" size={64} color={Colors.gray[300]} />
            <ThemedText style={styles.emptyTitle}>No Pending Reviews</ThemedText>
            <ThemedText style={styles.emptyText}>
              Make purchases to unlock review opportunities
            </ThemedText>
          </View>
        }
      />
      )}
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
    marginBottom: Spacing.lg,
  },
  backButton: {
    padding: Spacing.sm,
    marginRight: Spacing.sm,
  },
  headerTitle: {
    flex: 1,
    ...Typography.h3,
    color: colors.background.primary,
    textAlign: 'center',
    marginRight: 40,
  },
  placeholder: {
    width: 40,
  },
  statsCard: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...Typography.h2,
    color: colors.background.primary,
  },
  statLabel: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.8)',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: Spacing.sm,
  },
  listContent: {
    padding: Spacing.base,
    paddingBottom: 120,
  },
  tipsCard: {
    flexDirection: 'row',
    backgroundColor: Colors.gold + '15',
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gold + '30',
  },
  tipsContent: {
    flex: 1,
  },
  tipsTitle: {
    ...Typography.label,
    color: Colors.gold,
    marginBottom: Spacing.xs,
  },
  tipsText: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
  },
  reviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    ...Shadows.subtle,
  },
  reviewImage: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  // reviewImage already styled inline for Image component
  reviewInfo: {
    flex: 1,
  },
  typeBadge: {
    backgroundColor: Colors.primary[100],
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginBottom: Spacing.xs,
  },
  typeText: {
    ...Typography.caption,
    color: Colors.primary[600],
    fontWeight: '600',
  },
  reviewName: {
    ...Typography.label,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  reviewDate: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
  coinsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  coinsValue: {
    ...Typography.h3,
    color: Colors.gold,
  },
  bonusText: {
    ...Typography.caption,
    color: Colors.success,
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyTitle: {
    ...Typography.h3,
    color: Colors.text.primary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  writeContent: {
    padding: Spacing.base,
    paddingBottom: Spacing['3xl'],
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
    ...Shadows.subtle,
  },
  itemImage: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  // itemImage already styled inline for Image component
  itemInfo: {
    flex: 1,
  },
  itemName: {
    ...Typography.h4,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  itemOrder: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.label,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  reviewInput: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    ...Typography.body,
    color: Colors.text.primary,
    minHeight: 120,
    textAlignVertical: 'top',
    ...Shadows.subtle,
  },
  reviewMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  charCount: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
  bonusBadge: {
    backgroundColor: Colors.success + '20',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  bonusBadgeText: {
    ...Typography.caption,
    color: Colors.success,
    fontWeight: '600',
  },
  photoBonusBadge: {
    backgroundColor: Colors.gold + '20',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  photoBonusText: {
    ...Typography.caption,
    color: Colors.gold,
    fontWeight: '600',
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  photoItem: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  removePhoto: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.full,
  },
  addPhoto: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.gray[300],
    gap: Spacing.xs,
  },
  addPhotoText: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
  coinPreview: {
    backgroundColor: Colors.gold + '15',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.gold + '30',
  },
  coinPreviewLabel: {
    ...Typography.body,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  coinPreviewValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  coinPreviewAmount: {
    ...Typography.h2,
    color: Colors.gold,
  },
  submitButton: {
    backgroundColor: Colors.primary[600],
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.base,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: Colors.gray[300],
  },
  submitButtonText: {
    ...Typography.button,
    color: colors.background.primary,
  },
});

export default withErrorBoundary(ReviewToEarnPage, 'EarnReview');
