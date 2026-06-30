// @ts-nocheck
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

export function useCategoryPageQuery(slug: string) {
  return useQuery({
    queryKey: queryKeys.categoryPage.data(slug),
    staleTime: 10 * 60 * 1000, // 10 minutes - FIX
    queryFn: async () => {
      try {
        const categoriesApi = (await import('@/services/categoriesApi')).default;
        const response = await categoriesApi.getCategoryPageData(slug);
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch category');
        }
        return response;
      } catch (error) {
        console.error('[useCategoryPageQuery] Error:', error);
        throw error;
      }
    },
    enabled: !!slug,
  });
}

export function useCategoryStoresQuery(slug: string) {
  return useQuery({
    queryKey: queryKeys.categoryPage.stores(slug),
    staleTime: 5 * 60 * 1000, // 5 minutes - FIX
    queryFn: async () => {
      try {
        const storesApi = (await import('@/services/storesApi')).default;
        const response = await storesApi.getStoresBySubcategorySlug(slug, 20);
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch stores');
        }
        return response;
      } catch (error) {
        console.error('[useCategoryStoresQuery] Error:', error);
        throw error;
      }
    },
    enabled: !!slug,
  });
}

export function useCategoryProductsQuery(slug: string) {
  return useQuery({
    queryKey: queryKeys.categoryPage.products(slug),
    staleTime: 5 * 60 * 1000, // 5 minutes - FIX
    queryFn: async () => {
      try {
        const productsApi = (await import('@/services/productsApi')).default;
        const response = await productsApi.getProductsByCategory(slug, { limit: 20 });
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch products');
        }
        return response;
      } catch (error) {
        console.error('[useCategoryProductsQuery] Error:', error);
        throw error;
      }
    },
    enabled: !!slug,
  });
}
