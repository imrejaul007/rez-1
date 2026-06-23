// @ts-nocheck
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

export function usePageCategories(type: 'going_out' | 'home_delivery') {
  return useQuery({
    queryKey: type === 'going_out'
      ? queryKeys.goingOut.categories()
      : queryKeys.homeDelivery.categories(),
    queryFn: async () => {
      const categoriesApi = (await import('@/services/categoriesApi')).default;
      return categoriesApi.getCategories({ type });
    },
  });
}

export function usePageProductsQuery(type: 'going_out' | 'home_delivery', page: number, category?: string) {
  return useQuery({
    queryKey: type === 'going_out'
      ? queryKeys.goingOut.products(page, category)
      : queryKeys.homeDelivery.products(page, category),
    queryFn: async () => {
      const productsApi = (await import('@/services/productsApi')).default;
      return productsApi.getProducts({ page, limit: 20, category });
    },
    placeholderData: (previousData: any) => previousData, // Keep old data while loading next page
  });
}
