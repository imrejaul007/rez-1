import { useState, useEffect, useCallback } from 'react';
import storesService from '@/services/storesApi';
import { Review, ReviewStats } from '@/types/reviews';

// RatingBreakdown format used in ReviewModal
export interface RatingBreakdown {
  [key: number]: number;
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
}

interface UseStoreReviewsResult {
  reviews: Review[];
  stats: ReviewStats | null;
  ratingBreakdown: RatingBreakdown;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
}

export function useStoreReviews(
  storeId: string | undefined,
  options: {
    page?: number;
    limit?: number;
    rating?: number;
    sort?: 'newest' | 'oldest' | 'rating_high' | 'rating_low';
  } = {}
): UseStoreReviewsResult {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [ratingBreakdown, setRatingBreakdown] = useState<RatingBreakdown>({
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentPage, setCurrentPage] = useState(options.page || 1);
  const [hasMore, setHasMore] = useState(true);

  const fetchReviews = useCallback(async (page: number = 1, append: boolean = false) => {
    if (!storeId) {
      setError(new Error('Store ID is required'));
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await storesService.getStoreReviews(storeId, {
        page,
        limit: options.limit || 20,
        rating: options.rating,
        sort: options.sort || 'newest',
      });


      if (response.success && response.data) {
        const { reviews: fetchedReviews, summary, pagination } = response.data;
        

        // Transform API reviews to Review type (matching ReviewModal expectations)
        const transformedReviews: Review[] = fetchedReviews.map((review: any, index: number) => {
          
          // Extract user name - backend sends user.name (combined firstName + lastName)
          // or we can combine firstName and lastName if needed
          let userName = 'Anonymous';
          if (review.user?.name) {
            userName = review.user.name;
          } else if (review.user?.profile) {
            const firstName = review.user.profile.firstName || '';
            const lastName = review.user.profile.lastName || '';
            userName = [firstName, lastName].filter(Boolean).join(' ').trim() || 'Anonymous';
          } else {
          }
          
          const transformed = {
            id: review.id || review._id,
            userId: review.user?.id || review.user?._id || '',
            userName: userName,
            userAvatar: review.user?.profile?.avatar || review.user?.avatar || '',
            moderationStatus: review.moderationStatus || 'approved', // Include moderation status
            rating: review.rating,
            reviewText: review.comment || review.text || review.title || '',
            date: new Date(review.createdAt),
            likes: review.helpful || 0,
            isLiked: false,
            isVerified: review.verified || false,
            images: review.images?.map((img: any, idx: number) => {
              // Handle both string URLs and image objects
              if (typeof img === 'string') {
                return {
                  id: `img-${idx}`,
                  uri: img,
                  caption: undefined,
                };
              }
              return {
                id: img.id || `img-${idx}`,
                uri: img.url || img.uri || img,
                caption: img.caption,
              };
            }) || [],
            helpfulCount: review.helpful || 0,
            isHelpful: false,
            // Include merchant response if available
            storeResponse: review.merchantResponse ? {
              id: review.merchantResponse.respondedBy || '',
              responseText: review.merchantResponse.message || '',
              date: new Date(review.merchantResponse.respondedAt),
              responderName: 'Store Manager', // Could be populated from merchant data if available
              responderRole: 'Store Manager',
            } : undefined,
          };
          
          
          return transformed;
        });
        

        if (append) {
          setReviews(prev => [...prev, ...transformedReviews]);
        } else {
          setReviews(transformedReviews);
        }

        // Update stats
        if (summary) {
          // Handle both summary and ratingStats formats
          const summaryAny = summary as any;
          const breakdown = summary.ratingBreakdown || summaryAny.distribution || {};
          const averageRating = summary.averageRating || summaryAny.average || 0;
          const totalReviews = summary.totalReviews || summaryAny.count || 0;
          
          setStats({
            averageRating,
            totalReviews,
            ratingBreakdown: {
              fiveStars: breakdown[5] || 0,
              fourStars: breakdown[4] || 0,
              threeStars: breakdown[3] || 0,
              twoStars: breakdown[2] || 0,
              oneStar: breakdown[1] || 0,
            },
          });

          // Set rating breakdown in ReviewModal format (counts, not percentages)
          setRatingBreakdown({
            5: breakdown[5] || 0,
            4: breakdown[4] || 0,
            3: breakdown[3] || 0,
            2: breakdown[2] || 0,
            1: breakdown[1] || 0,
          });
        }

        // Update pagination
        if (pagination) {
          setHasMore((pagination as any).hasNext || false);
        }
      } else {
        throw new Error(response.message || 'Failed to fetch reviews');
      }
    } catch (err: any) {
      setError(err instanceof Error ? err : new Error('Failed to fetch reviews'));
      // Set empty state on error
      if (!append) {
        setReviews([]);
        setStats(null);
        setRatingBreakdown({ 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });
      }
    } finally {
      setLoading(false);
    }
  }, [storeId, options.limit, options.rating, options.sort]);

  const refetch = useCallback(async () => {
    setCurrentPage(1);
    await fetchReviews(1, false);
  }, [fetchReviews]);

  const loadMore = useCallback(async () => {
    if (!loading && hasMore) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      await fetchReviews(nextPage, true);
    }
  }, [loading, hasMore, currentPage, fetchReviews]);

  useEffect(() => {
    if (storeId) {
      fetchReviews(1, false);
    } else {
      // Reset state when storeId is not available
      setReviews([]);
      setStats(null);
      setRatingBreakdown({ 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });
      setError(null);
    }
  }, [storeId, fetchReviews]); // Include fetchReviews in deps to ensure it runs when storeId changes

  return {
    reviews,
    stats,
    ratingBreakdown,
    loading,
    error,
    refetch,
    loadMore,
    hasMore,
  };
}

