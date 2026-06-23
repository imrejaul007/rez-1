// @ts-nocheck
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

export function useCategoryPageQuery(slug: string) {
  return useQuery({
    queryKey: queryKeys.categoryPage.data(slug),
    queryFn: async () => {
      const categoriesApi = (await import('@/services/categoriesApi')).default;
      return categoriesApi.getCategoryPageData(slug);
    },
    enabled: !!slug,
  });
}

export function useCategoryStoresQuery(slug: string) {
  return useQuery({
    queryKey: queryKeys.categoryPage.stores(slug),
    queryFn: async () => {
      const storesApi = (await import('@/services/storesApi')).default;
      return storesApi.getStoresBySubcategorySlug(slug, 20);
    },
    enabled: !!slug,
  });
}

export function useCategoryProductsQuery(slug: string) {
  return useQuery({
    queryKey: queryKeys.categoryPage.products(slug),
    queryFn: async () => {
      const productsApi = (await import('@/services/productsApi')).default;
      return productsApi.getProductsByCategory(slug, { limit: 20 });
    },
    enabled: !!slug,
  });
}
