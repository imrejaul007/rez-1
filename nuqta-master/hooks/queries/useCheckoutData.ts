import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import addressApi from '@/services/addressApi';
import couponService from '@/services/couponApi';
import storesApi from '@/services/storesApi';

/**
 * User's saved addresses -- cached, reused across checkout visits.
 * Addresses rarely change so we keep a 5-minute staleTime.
 */
export function useCheckoutAddresses() {
  return useQuery({
    queryKey: queryKeys.checkout.addresses(),
    queryFn: () => addressApi.getUserAddresses(),
    staleTime: 5 * 60_000, // Addresses rarely change
  });
}

/**
 * Available coupons for the current checkout.
 * The storeId is included in the query key so that if a caller needs
 * store-scoped coupons in the future, they get a separate cache entry.
 * Currently the coupon API does not filter by store at the endpoint level.
 */
export function useCheckoutCoupons(storeId?: string) {
  return useQuery({
    queryKey: queryKeys.checkout.coupons(storeId),
    queryFn: () => couponService.getAvailableCoupons(),
    enabled: true, // Always fetch -- coupons are global
  });
}

/**
 * Store details needed at checkout (delivery options, payment methods, etc.).
 * Only enabled when a storeId is available.
 */
export function useCheckoutStore(storeId?: string) {
  return useQuery({
    queryKey: queryKeys.checkout.store(storeId!),
    queryFn: () => storesApi.getStoreById(storeId!),
    enabled: !!storeId,
    staleTime: 2 * 60_000, // Store info is relatively stable
  });
}
