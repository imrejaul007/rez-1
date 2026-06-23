import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import reviewApi from '@/services/reviewsApi';
import type { ReviewFilters } from '@/types/review.types';

export function useStoreReviews(storeId: string, filters?: ReviewFilters) {
  return useQuery({
    queryKey: queryKeys.reviews.byStore(storeId, filters),
    queryFn: () => reviewApi.getStoreReviews(storeId, filters),
    enabled: !!storeId,
  });
}

export function useUserReviews(page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: ['reviews', 'user', page, limit] as const,
    queryFn: () => reviewApi.getUserOwnReviews(page, limit),
  });
}

export function useCanUserReviewStore(storeId: string) {
  return useQuery({
    queryKey: ['reviews', 'canReview', storeId] as const,
    queryFn: () => reviewApi.canUserReviewStore(storeId),
    enabled: !!storeId,
  });
}
