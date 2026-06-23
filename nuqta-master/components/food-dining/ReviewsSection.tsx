/**
 * ReviewsSection — Featured food reviews with photos
 * Shows real user reviews from food restaurants
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS } from './constants';
import reviewsService from '@/services/reviewsApi';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface ReviewItem {
  _id: string;
  title?: string;
  comment?: string;
  rating: number;
  images?: Array<{ url: string; thumbnail?: string } | string>;
  user?: { _id?: string; id?: string; name?: string; profile?: { firstName?: string; lastName?: string; avatar?: string }; avatar?: string };
  store?: { _id?: string; id?: string; name?: string };
  helpful?: number | { count?: number };
  createdAt: string;
}

interface ReviewsSectionProps {
  maxItems?: number;
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function getUserName(review: ReviewItem): string {
  if (review.user?.name) return review.user.name;
  const p = review.user?.profile;
  if (p) return `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'User';
  return 'User';
}

function getUserAvatar(review: ReviewItem): string | undefined {
  return review.user?.avatar || review.user?.profile?.avatar;
}

function getImageUrl(img: { url: string; thumbnail?: string } | string): string {
  return typeof img === 'string' ? img : (img.thumbnail || img.url);
}

function getHelpfulCount(review: ReviewItem): number {
  if (typeof review.helpful === 'number') return review.helpful;
  return review.helpful?.count || 0;
}

const ReviewsSection: React.FC<ReviewsSectionProps> = ({ maxItems = 6 }) => {
  const router = useRouter();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useIsMounted();

  const fetchReviews = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await reviewsService.getFeaturedReviews({ limit: maxItems });
      if (response.success && response.data) {
        const data = Array.isArray(response.data) ? response.data : (response.data as any)?.reviews || [];
        // Only show reviews with images for visual appeal
        const withImages = data.filter((r: any) =>
          (Array.isArray(r.images) && r.images.length > 0) || r.image
        );
        if (!isMounted()) return;
        setReviews(withImages.slice(0, maxItems));
      }
    } catch {
      // Silent fail — section just won't render
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  }, [maxItems]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={COLORS.primaryGold} />
      </View>
    );
  }

  if (reviews.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Ionicons name="chatbubbles-outline" size={20} color={COLORS.primaryGold} />
        <Text style={styles.sectionTitle}>Top Reviews</Text>
        <Pressable
          onPress={() => router.push('/MainCategory/food-dining/food-stories' as any)}
          accessibilityLabel="See all reviews" accessibilityRole="button"
        >
          <Text style={styles.seeAll}>See All</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {reviews.map((review) => {
          const storeId = review.store?._id || review.store?.id;
          const imageUrl = review.images?.[0] ? getImageUrl(review.images[0]) : undefined;

          return (
            <Pressable
              key={review._id}
              style={styles.card}
              onPress={() => {
                if (storeId) router.push(`/MainStorePage?storeId=${storeId}` as any);
              }}
             
              accessibilityLabel={`Review by ${getUserName(review)}${review.store?.name ? ` at ${review.store.name}` : ''}, rated ${review.rating} stars`}
              accessibilityRole="button"
            >
              {imageUrl && (
                <CachedImage source={imageUrl} style={styles.reviewImage} contentFit="cover" />
              )}
              <View style={styles.cardContent}>
                {/* Rating */}
                <View style={styles.ratingRow}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Ionicons
                      key={i}
                      name={i < review.rating ? 'star' : 'star-outline'}
                      size={12}
                      color={i < review.rating ? COLORS.primaryGold : COLORS.border}
                    />
                  ))}
                  <Text style={styles.timeAgo}>{getTimeAgo(review.createdAt)}</Text>
                </View>

                {/* Review text */}
                {(review.title || review.comment) && (
                  <Text style={styles.reviewText} numberOfLines={2}>
                    {review.title || review.comment}
                  </Text>
                )}

                {/* User + Store */}
                <View style={styles.userRow}>
                  {getUserAvatar(review) ? (
                    <CachedImage source={getUserAvatar(review)!} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarFallback]}>
                      <Ionicons name="person" size={10} color={COLORS.textSecondary} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.userName} numberOfLines={1}>{getUserName(review)}</Text>
                    {review.store?.name && (
                      <Text style={styles.storeName} numberOfLines={1}>@ {review.store.name}</Text>
                    )}
                  </View>
                </View>

                {/* Helpful count */}
                {getHelpfulCount(review) > 0 && (
                  <View style={styles.helpfulRow}>
                    <Ionicons name="thumbs-up-outline" size={11} color={COLORS.textSecondary} />
                    <Text style={styles.helpfulText}>{getHelpfulCount(review)} found helpful</Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primaryGold,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 4,
  },
  card: {
    width: 220,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: colors.nileBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 8px rgba(11,34,64,0.06)' },
    }),
  },
  reviewImage: {
    width: '100%',
    height: 120,
  },
  cardContent: {
    padding: 10,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 6,
  },
  timeAgo: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginLeft: 'auto',
  },
  reviewText: {
    fontSize: 12,
    color: COLORS.textPrimary,
    lineHeight: 17,
    marginBottom: 8,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  avatarFallback: {
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  storeName: {
    fontSize: 9,
    color: COLORS.textSecondary,
  },
  helpfulRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  helpfulText: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
});

export default React.memo(ReviewsSection);
