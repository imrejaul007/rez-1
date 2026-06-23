import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import cartApi from '@/services/cartApi';

export function useCart() {
  return useQuery({
    queryKey: queryKeys.cart.current(),
    queryFn: () => cartApi.getCart(),
    staleTime: 30_000,
  });
}

export function useCartCount() {
  return useQuery({
    queryKey: queryKeys.cart.count(),
    queryFn: () => cartApi.getCart(),
    staleTime: 30_000,
    select: (data) => data?.data?.items?.length ?? 0,
  });
}
