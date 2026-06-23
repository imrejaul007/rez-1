// useOrderHistory Hook
// Manages order history data with server-side search, filter, and pagination.
// Uses ordersApi.ts (the canonical service with correct field mappings).

import { useState, useCallback, useEffect, useRef } from 'react';
import ordersService, { Order, OrdersQuery } from '@/services/ordersApi';

export interface OrderFilterParams {
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: 'newest' | 'oldest' | 'amount_high' | 'amount_low';
}

interface UseOrderHistoryReturn {
  orders: Order[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  totalOrders: number;
  loadMore: () => Promise<void>;
  refresh: (filter?: OrderFilterParams) => Promise<void>;
}

export const useOrderHistory = (): UseOrderHistoryReturn => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalOrders, setTotalOrders] = useState(0);
  const [page, setPage] = useState(1);
  const currentFilterRef = useRef<OrderFilterParams>({});

  const fetchOrders = useCallback(async (
    pageNum: number = 1,
    isRefresh: boolean = false,
    filter?: OrderFilterParams
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      if (filter !== undefined) {
        currentFilterRef.current = filter;
      }
      const activeFilter = currentFilterRef.current;

      const query: OrdersQuery = {
        page: pageNum,
        limit: 20,
      };
      if (activeFilter.status && activeFilter.status !== 'all') {
        query.status = activeFilter.status as Order['status'];
      }
      if (activeFilter.search) query.search = activeFilter.search;
      if (activeFilter.dateFrom) query.dateFrom = activeFilter.dateFrom;
      if (activeFilter.dateTo) query.dateTo = activeFilter.dateTo;
      if (activeFilter.sort) query.sort = activeFilter.sort as OrdersQuery['sort'];

      const response = await ordersService.getOrders(query);

      if (response.success && response.data) {
        const newOrders = response.data.orders || [];

        if (isRefresh || pageNum === 1) {
          setOrders(newOrders);
        } else {
          setOrders(prev => [...prev, ...newOrders]);
        }

        const pagination = response.data.pagination;
        setTotalOrders(pagination?.total || newOrders.length);
        setHasMore(pagination ? pagination.current < pagination.pages : newOrders.length === 20);
        setPage(pageNum);
      } else {
        throw new Error(response.error || 'Failed to fetch orders');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!isLoading && hasMore) {
      await fetchOrders(page + 1);
    }
  }, [fetchOrders, page, isLoading, hasMore]);

  const refresh = useCallback(async (filter?: OrderFilterParams) => {
    await fetchOrders(1, true, filter);
  }, [fetchOrders]);

  // Initial load
  useEffect(() => {
    fetchOrders(1, true);
  }, [fetchOrders]);

  return {
    orders,
    isLoading,
    error,
    hasMore,
    totalOrders,
    loadMore,
    refresh,
  };
};

export default useOrderHistory;
