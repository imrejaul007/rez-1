// @ts-nocheck
/**
 * React-Query hooks for homepage data.
 *
 * Uses the batch endpoint (1 API call for all 6 sections).
 * Replaces the manual useReducer + module-level dedup in useHomepage.ts.
 */
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useCurrentRegionId } from '@/stores/selectors';
import type { HomepageSection } from '@/types/homepage.types';

export interface HomepageBatchResult {
  justForYou: HomepageSection;
  newArrivals: HomepageSection;
  trendingStores: HomepageSection;
  events: HomepageSection;
  offers: HomepageSection;
  flashSales: HomepageSection;
}

/**
 * Fetch all homepage sections in a single batch call.
 * React-Query handles dedup, caching, retry, and stale-while-revalidate.
 */
export function useHomepageBatch() {
  const regionId = useCurrentRegionId();

  return useQuery<HomepageBatchResult>({
    queryKey: queryKeys.homepage.batch(regionId),
    queryFn: async () => {
      // Lazy import — homepageDataService pulls in 9+ API services + pako
      const { default: homepageDataService } = await import('@/services/homepageDataService');
      return homepageDataService.fetchAllSectionsWithBatch();
    },
    staleTime: 60_000, // 1 min fresh (matches batch dedup window)
    gcTime: 5 * 60_000,
  });
}

/**
 * Get the user context from the last homepage batch call.
 * Avoids a separate /user-context API call.
 */
export function useHomepageUserContext() {
  const regionId = useCurrentRegionId();

  return useQuery({
    queryKey: [...queryKeys.homepage.batch(regionId), 'userContext'] as const,
    queryFn: async () => {
      const { default: homepageDataService } = await import('@/services/homepageDataService');
      return homepageDataService.getLastUserContext();
    },
    staleTime: 30_000, // 30s fresh
  });
}
