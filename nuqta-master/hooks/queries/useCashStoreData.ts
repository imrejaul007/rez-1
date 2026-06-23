// @ts-nocheck
/**
 * React-Query hooks for Cash Store data.
 *
 * Each hook wraps a single API call with caching, dedup, and retry.
 * The main useCashStoreSection hook composes these for the page.
 */
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

export function useCashStoreHomepageQuery() {
  return useQuery({
    queryKey: queryKeys.cashStore.homepage(),
    queryFn: async () => {
      const cashStoreApi = (await import('@/services/cashStoreApi')).default;
      return cashStoreApi.getHomepageData();
    },
    staleTime: 5 * 60_000, // 5 min (matches old cache TTL)
  });
}

export function useCashbackSummaryQuery() {
  return useQuery({
    queryKey: queryKeys.cashStore.summary(),
    queryFn: async () => {
      // Affiliate cashback (Cash Store earnings) — NOT store-payment cashback
      const cashStoreApi = (await import('@/services/cashStoreApi')).default;
      return cashStoreApi.getCashbackSummary();
    },
    staleTime: 2 * 60_000,
  });
}

export function useFeaturedCouponsQuery() {
  return useQuery({
    queryKey: queryKeys.cashStore.coupons(),
    queryFn: async () => {
      const couponService = (await import('@/services/couponApi')).default;
      return couponService.getFeaturedCoupons();
    },
  });
}

export function useGiftCardBrandsQuery() {
  return useQuery({
    queryKey: queryKeys.cashStore.giftCards(),
    queryFn: async () => {
      const realVouchersApi = (await import('@/services/realVouchersApi')).default;
      return realVouchersApi.getVoucherBrands({ featured: true, limit: 10 });
    },
  });
}

export function useCashbackActivityQuery() {
  return useQuery({
    queryKey: queryKeys.cashStore.activity(),
    queryFn: async () => {
      const cashStoreApi = (await import('@/services/cashStoreApi')).default;
      const result = await cashStoreApi.getUserPurchases(1, 5);
      // Normalize to same shape the section hook expects: { success, data: { cashbacks } }
      return {
        success: true,
        data: {
          cashbacks: (result.purchases || []).map((p: any) => ({
            _id: p._id,
            amount: p.actualCashback || 0,
            status: p.status === 'credited' ? 'credited' : p.status,
            earnedDate: p.purchasedAt || p.createdAt,
            source: 'affiliate',
            metadata: {
              storeId: p.brand?._id || '',
              storeName: p.brand?.name || 'Cash Store',
              orderAmount: p.orderAmount || 0,
            },
            order: { orderNumber: p.externalOrderId },
          })),
        },
      };
    },
    staleTime: 2 * 60_000,
  });
}
