// @ts-nocheck
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import ordersApi from '@/services/ordersApi';

export function useOrders(filters?: { page?: number; limit?: number; status?: string }) {
  return useQuery({
    queryKey: queryKeys.orders.list(filters),
    queryFn: () => ordersApi.getOrders(filters),
  });
}

export function useOrderById(orderId: string) {
  return useQuery({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: () => ordersApi.getOrderById(orderId),
    enabled: !!orderId,
  });
}

export function useOrderTracking(orderId: string) {
  return useQuery({
    queryKey: queryKeys.orders.tracking(orderId),
    queryFn: () => ordersApi.trackOrder(orderId),
    enabled: !!orderId,
    refetchInterval: 30_000, // Auto-refresh tracking every 30s
  });
}
