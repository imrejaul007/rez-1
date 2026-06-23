import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import categoriesApi, {
  type Category,
  type CategoryQuery,
  type CategoryPageConfig,
  type CategoryVibe,
  type CategoryOccasion,
  type CategoryHashtag,
} from '@/services/categoriesApi';

export function useCategories(params?: CategoryQuery) {
  return useQuery({
    queryKey: queryKeys.categories.list(params),
    queryFn: () => categoriesApi.getCategories(params),
  });
}

export function useCategoryById(id: string) {
  return useQuery({
    queryKey: queryKeys.categories.detail(id),
    queryFn: () => categoriesApi.getCategoryById(id),
    enabled: !!id,
  });
}

export function useCategoryBySlug(slug: string) {
  return useQuery({
    queryKey: queryKeys.categories.bySlug(slug),
    queryFn: () => categoriesApi.getCategoryBySlug(slug),
    enabled: !!slug,
  });
}

export function useCategoryTree(type?: string) {
  return useQuery({
    queryKey: ['categories', 'tree', type] as const,
    queryFn: () => categoriesApi.getCategoryTree(type),
  });
}

export function useFeaturedCategories(type?: string, limit = 20) {
  return useQuery({
    queryKey: ['categories', 'featured', type, limit] as const,
    queryFn: () => categoriesApi.getFeaturedCategories(type, limit),
  });
}

export function useRootCategories(type?: string) {
  return useQuery({
    queryKey: ['categories', 'root', type] as const,
    queryFn: () => categoriesApi.getRootCategories(type),
  });
}

export function useCategoryPageData(slug: string) {
  return useQuery({
    queryKey: ['categories', 'pageData', slug] as const,
    queryFn: () => categoriesApi.getCategoryPageData(slug),
    enabled: !!slug,
  });
}

export function useCategoryPageConfig(slug: string) {
  return useQuery({
    queryKey: ['categories', 'pageConfig', slug] as const,
    queryFn: () => categoriesApi.getPageConfig(slug),
    enabled: !!slug,
  });
}

export function useCategoryVibes(slug: string) {
  return useQuery({
    queryKey: ['categories', 'vibes', slug] as const,
    queryFn: () => categoriesApi.getCategoryVibes(slug),
    enabled: !!slug,
  });
}

export function useCategoryOccasions(slug: string) {
  return useQuery({
    queryKey: ['categories', 'occasions', slug] as const,
    queryFn: () => categoriesApi.getCategoryOccasions(slug),
    enabled: !!slug,
  });
}

export function useCategoryHashtags(slug: string, limit = 6) {
  return useQuery({
    queryKey: ['categories', 'hashtags', slug, limit] as const,
    queryFn: () => categoriesApi.getCategoryHashtags(slug, limit),
    enabled: !!slug,
  });
}

export function useBestDiscountCategories(limit = 10) {
  return useQuery({
    queryKey: ['categories', 'bestDiscount', limit] as const,
    queryFn: () => categoriesApi.getBestDiscountCategories(limit),
  });
}

export function useBestSellerCategories(limit = 10) {
  return useQuery({
    queryKey: ['categories', 'bestSeller', limit] as const,
    queryFn: () => categoriesApi.getBestSellerCategories(limit),
  });
}
