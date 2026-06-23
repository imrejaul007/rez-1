// @ts-nocheck
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import storesApi from '@/services/storesApi';
import type { StoresQuery } from '@/services/storesApi';

export function useStores(query?: StoresQuery) {
  return useQuery({
    queryKey: queryKeys.stores.list(query),
    queryFn: () => storesApi.getStores(query),
  });
}

export function useStoreById(storeId: string) {
  return useQuery({
    queryKey: queryKeys.stores.detail(storeId),
    queryFn: () => storesApi.getStoreById(storeId),
    enabled: !!storeId,
  });
}

export function useStoreBySlug(slug: string) {
  return useQuery({
    queryKey: ['stores', 'slug', slug] as const,
    queryFn: () => storesApi.getStoreBySlug(slug),
    enabled: !!slug,
  });
}

export function useFeaturedStores(limit = 10) {
  return useQuery({
    queryKey: queryKeys.stores.featured(),
    queryFn: () => storesApi.getFeaturedStores(limit),
  });
}

export function useNearbyStores(lat: number, lon: number, radius?: number) {
  return useQuery({
    queryKey: queryKeys.stores.nearby(lat, lon, radius),
    queryFn: () => storesApi.getNearbyStores({ latitude: lat, longitude: lon, radius }),
    enabled: !!lat && !!lon,
  });
}

export function useSearchStores(query: string, filters?: Record<string, any>) {
  return useQuery({
    queryKey: queryKeys.stores.search(query, filters),
    queryFn: () => storesApi.searchStores(query, filters),
    enabled: query.length >= 2,
  });
}

export function useStoreProducts(storeId: string, filters?: Record<string, any>) {
  return useQuery({
    queryKey: queryKeys.stores.products(storeId, filters),
    queryFn: () => storesApi.getStoreProducts(storeId, filters),
    enabled: !!storeId,
  });
}

export function useStoreReviews(storeId: string, filters?: Record<string, any>) {
  return useQuery({
    queryKey: queryKeys.stores.reviews(storeId, filters),
    queryFn: () => storesApi.getStoreReviews(storeId, filters),
    enabled: !!storeId,
  });
}

export function useStoreMenu(storeId: string) {
  return useQuery({
    queryKey: queryKeys.stores.menu(storeId),
    queryFn: () => storesApi.getStoreProducts(storeId),
    enabled: !!storeId,
  });
}

export function useStoreCategories() {
  return useQuery({
    queryKey: ['stores', 'categories'] as const,
    queryFn: () => storesApi.getStoreCategories(),
  });
}

export function useFollowedStores(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['stores', 'followed', params] as const,
    queryFn: () => storesApi.getFollowedStores(params),
  });
}

export function useCheckFollowStatus(storeId: string) {
  return useQuery({
    queryKey: ['stores', 'followStatus', storeId] as const,
    queryFn: () => storesApi.checkFollowStatus(storeId),
    enabled: !!storeId,
  });
}

export function useTrendingStores(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['stores', 'trending', params] as const,
    queryFn: () => storesApi.getTrendingStores(params),
  });
}

export function useNewStores(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['stores', 'new', params] as const,
    queryFn: () => storesApi.getNewStores(params),
  });
}

export function useUserStoreVisits(storeId: string) {
  return useQuery({
    queryKey: ['stores', 'visits', storeId] as const,
    queryFn: () => storesApi.getUserStoreVisits(storeId),
    enabled: !!storeId,
  });
}

export function useStoreRecentEarnings(storeId: string) {
  return useQuery({
    queryKey: ['stores', 'earnings', storeId] as const,
    queryFn: () => storesApi.getRecentEarnings(storeId),
    enabled: !!storeId,
  });
}
