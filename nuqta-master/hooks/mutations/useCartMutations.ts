// @ts-nocheck
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import cartApi, { Cart } from '@/services/cartApi';
import { ApiResponse } from '@/services/apiClient';

type CartCacheData = ApiResponse<Cart>;

export function useAddToCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { productId: string; storeId: string; quantity?: number }) =>
      cartApi.addToCart(data),
    onMutate: async (newItem) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cart.all });
      const previous = queryClient.getQueryData<CartCacheData>(queryKeys.cart.current());
      queryClient.setQueryData<CartCacheData>(queryKeys.cart.current(), (old) => {
        if (!old?.data) return old;
        const cart = old.data;
        const existingIndex = cart.items.findIndex(
          (item) => item.product?._id === newItem.productId
        );
        const qty = newItem.quantity ?? 1;
        let updatedItems;
        if (existingIndex >= 0) {
          updatedItems = cart.items.map((item, i) =>
            i === existingIndex
              ? { ...item, quantity: item.quantity + qty }
              : item
          );
        } else {
          updatedItems = [
            ...cart.items,
            {
              _id: `temp-${Date.now()}`,
              product: { _id: newItem.productId, name: '', pricing: { currency: 'AED' }, inventory: { stock: 99, isAvailable: true }, isActive: true },
              store: { _id: newItem.storeId, name: '' },
              quantity: qty,
              price: 0,
              addedAt: new Date().toISOString(),
            },
          ];
        }
        return {
          ...old,
          data: {
            ...cart,
            items: updatedItems,
            itemCount: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
          },
        };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.cart.current(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
    },
  });
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      cartApi.updateCartItem(itemId, quantity),
    onMutate: async ({ itemId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cart.all });
      const previous = queryClient.getQueryData<CartCacheData>(queryKeys.cart.current());
      queryClient.setQueryData<CartCacheData>(queryKeys.cart.current(), (old) => {
        if (!old?.data) return old;
        const cart = old.data;
        const updatedItems = cart.items.map((item) => {
          if (item._id === itemId || item.product?._id === itemId) {
            return { ...item, quantity };
          }
          return item;
        });
        const priceDiff = updatedItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
          - cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        return {
          ...old,
          data: {
            ...cart,
            items: updatedItems,
            itemCount: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
            totals: {
              ...cart.totals,
              subtotal: Math.max(0, cart.totals.subtotal + priceDiff),
              total: Math.max(0, cart.totals.total + priceDiff),
            },
          },
        };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.cart.current(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
    },
  });
}

export function useRemoveFromCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => cartApi.removeFromCart(itemId),
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cart.all });
      const previous = queryClient.getQueryData<CartCacheData>(queryKeys.cart.current());
      queryClient.setQueryData<CartCacheData>(queryKeys.cart.current(), (old) => {
        if (!old?.data) return old;
        const cart = old.data;
        const removedItem = cart.items.find(
          (item) => item._id === itemId || item.product?._id === itemId
        );
        const updatedItems = cart.items.filter(
          (item) => item._id !== itemId && item.product?._id !== itemId
        );
        const removedSubtotal = removedItem ? removedItem.price * removedItem.quantity : 0;
        return {
          ...old,
          data: {
            ...cart,
            items: updatedItems,
            itemCount: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
            storeCount: new Set(updatedItems.map((item) => item.store?._id)).size,
            totals: {
              ...cart.totals,
              subtotal: Math.max(0, cart.totals.subtotal - removedSubtotal),
              total: Math.max(0, cart.totals.total - removedSubtotal),
            },
          },
        };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.cart.current(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
    },
  });
}

export function useClearCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cartApi.clearCart(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cart.all });
      const previous = queryClient.getQueryData<CartCacheData>(queryKeys.cart.current());
      queryClient.setQueryData<CartCacheData>(queryKeys.cart.current(), (old) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: {
            ...old.data,
            items: [],
            lockedItems: [],
            itemCount: 0,
            storeCount: 0,
            coupon: undefined,
            totals: {
              subtotal: 0,
              tax: 0,
              delivery: 0,
              discount: 0,
              cashback: 0,
              total: 0,
              savings: 0,
            },
          },
        };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.cart.current(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
    },
  });
}

export function useApplyCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => cartApi.applyCoupon(code),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
    },
  });
}
