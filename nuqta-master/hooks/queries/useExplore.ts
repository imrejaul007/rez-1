// @ts-nocheck
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import exploreApi from '@/services/exploreApi';

export function useExploreStores(params?: { page?: number; limit?: number; category?: string; sortBy?: string }) {
  return useQuery({
    queryKey: queryKeys.explore.deals(params),
    queryFn: () => exploreApi.getStores(params),
  });
}

export function useExploreHotDeals(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['explore', 'hotDeals', params] as const,
    queryFn: () => exploreApi.getHotDeals(params),
  });
}

export function useExploreTrendingProducts(params?: { page?: number; limit?: number; category?: string }) {
  return useQuery({
    queryKey: queryKeys.explore.trending('products'),
    queryFn: () => exploreApi.getTrendingProducts(params),
  });
}

export function useExploreCategories(params?: { type?: string }) {
  return useQuery({
    queryKey: ['explore', 'categories', params] as const,
    queryFn: () => exploreApi.getCategories(params),
  });
}

export function useExploreNearbyStores(params: { latitude: number; longitude: number; radius?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.explore.nearby(params.latitude, params.longitude),
    queryFn: () => exploreApi.getNearbyStores(params),
    enabled: !!params.latitude && !!params.longitude,
  });
}

export function useExploreTrendingStores(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.explore.trending('stores'),
    queryFn: () => exploreApi.getTrendingStores(params),
  });
}

export function useExploreFeaturedStores() {
  return useQuery({
    queryKey: queryKeys.explore.featured(),
    queryFn: () => exploreApi.getStores({ sortBy: 'featured', limit: 10 }),
  });
}

export function useExploreLiveStats() {
  return useQuery({
    queryKey: queryKeys.explore.stats(),
    queryFn: () => exploreApi.getLiveStats(),
    staleTime: 30_000,
  });
}

export function useExploreStatsSummary() {
  return useQuery({
    queryKey: ['explore', 'statsSummary'] as const,
    queryFn: () => exploreApi.getStatsSummary(),
    staleTime: 60_000,
  });
}

export function useExploreVerifiedReviews(params?: { limit?: number; page?: number }) {
  return useQuery({
    queryKey: ['explore', 'verifiedReviews', params] as const,
    queryFn: () => exploreApi.getVerifiedReviews(params),
  });
}
