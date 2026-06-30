// @ts-nocheck
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

export function usePageCategories(type: 'going_out' | 'home_delivery') {
  return useQuery({
    queryKey: type === 'going_out'
      ? queryKeys.goingOut.categories()
      : queryKeys.homeDelivery.categories(),
    staleTime: 5 * 60 * 1000, // 5 minutes - FIX: prevent excessive refetches
    queryFn: async () => {
      try {
        const categoriesApi = (await import('@/services/categoriesApi')).default;
        const response = await categoriesApi.getCategories({ type });
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch categories');
        }
        return response;
      } catch (error) {
        console.error('[usePageCategories] Error:', error);
        throw error;
      }
    },
  });
}

export function usePageProductsQuery(type: 'going_out' | 'home_delivery', page: number, category?: string) {
  return useQuery({
    queryKey: type === 'going_out'
      ? queryKeys.goingOut.products(page, category)
      : queryKeys.homeDelivery.products(page, category),
    staleTime: 5 * 60 * 1000, // 5 minutes - FIX: prevent excessive refetches
    queryFn: async () => {
      try {
        const productsApi = (await import('@/services/productsApi')).default;
        const response = await productsApi.getProducts({ page, limit: 20, category });
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch products');
        }
        return response;
      } catch (error) {
        console.error('[usePageProductsQuery] Error:', error);
        throw error;
      }
    },
    placeholderData: (previousData: any) => previousData, // Keep old data while loading next page
  });
}
