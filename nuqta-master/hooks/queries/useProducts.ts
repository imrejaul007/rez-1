// @ts-nocheck
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import productsApi from '@/services/productsApi';
import type { ProductsQuery } from '@/services/productsApi';

export function useProducts(query?: ProductsQuery) {
  return useQuery({
    queryKey: queryKeys.products.list(query),
    queryFn: () => productsApi.getProducts(query),
  });
}

export function useProductById(id: string) {
  return useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: () => productsApi.getProductById(id),
    enabled: !!id,
  });
}

export function useFeaturedProducts(limit = 10) {
  return useQuery({
    queryKey: queryKeys.products.featured(),
    queryFn: () => productsApi.getFeaturedProducts(limit),
  });
}

export function useProductsByCategory(categoryId: string, params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.products.byCategory(categoryId),
    queryFn: () => productsApi.getProductsByCategory(categoryId, params),
    enabled: !!categoryId,
  });
}

export function useProductsByStore(storeId: string, params?: Record<string, any>) {
  return useQuery({
    queryKey: queryKeys.products.byStore(storeId),
    queryFn: () => productsApi.getProductsByStore(storeId, params),
    enabled: !!storeId,
  });
}

export function useProductRecommendations(params?: Record<string, any>) {
  return useQuery({
    queryKey: queryKeys.products.recommendations(),
    queryFn: () => productsApi.getRecommendations(params),
  });
}

export function useRelatedProducts(productId: string, params?: Record<string, any>) {
  return useQuery({
    queryKey: ['products', 'related', productId] as const,
    queryFn: () => productsApi.getRelatedProducts(productId, params),
    enabled: !!productId,
  });
}

export function useFrequentlyBoughtTogether(productId: string, limit = 4) {
  return useQuery({
    queryKey: ['products', 'fbt', productId] as const,
    queryFn: () => productsApi.getFrequentlyBoughtTogether(productId, limit),
    enabled: !!productId,
  });
}

export function useSearchSuggestions(query: string) {
  return useQuery({
    queryKey: ['products', 'suggestions', query] as const,
    queryFn: () => productsApi.getSearchSuggestions(query),
    enabled: query.length >= 2,
  });
}

export function usePopularSearches(limit = 10) {
  return useQuery({
    queryKey: ['products', 'popularSearches', limit] as const,
    queryFn: () => productsApi.getPopularSearches(limit),
  });
}

export function useProductDetails(productId: string) {
  return useQuery({
    queryKey: ['products', 'details', productId] as const,
    queryFn: () => productsApi.getProductDetails(productId),
    enabled: !!productId,
  });
}
