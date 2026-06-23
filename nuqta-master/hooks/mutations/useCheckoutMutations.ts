import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import couponService, { CartData, ValidateCouponResponse } from '@/services/couponApi';
import ordersApi from '@/services/ordersApi';
import { ApiResponse } from '@/services/apiClient';

/**
 * Apply a coupon code at checkout.
 * On success, invalidates the checkout coupons cache so the list refreshes.
 */
export function useApplyCouponMutation() {
  const queryClient = useQueryClient();
  return useMutation<
    ApiResponse<ValidateCouponResponse>,
    Error,
    { couponCode: string; cartData: CartData }
  >({
    mutationFn: ({ couponCode, cartData }) =>
      couponService.validateCoupon(couponCode, cartData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.checkout.coupons() });
    },
  });
}

/**
 * Remove a coupon -- purely client-side state, but we expose it as a mutation
 * for consistency and so callers can chain onSuccess/onError.
 * The actual state reset is handled inside useCheckout; this mutation is a no-op
 * on the server side (coupons are not "unapplied" via API).
 */
export function useRemoveCouponMutation() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      // No server call needed -- coupon removal is client-side
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.checkout.coupons() });
    },
  });
}

/**
 * Submit a new order.
 * On success, invalidates cart, orders, wallet, and checkout caches.
 */
export function useSubmitOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => ordersApi.createOrder(data),
    retry: 0, // Never auto-retry order creation (idempotency risk)
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.wallet.balance() });
      queryClient.invalidateQueries({ queryKey: queryKeys.checkout.all });
    },
  });
}
