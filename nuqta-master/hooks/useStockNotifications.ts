// @ts-nocheck
import { useState, useCallback } from 'react';
import stockNotificationApi, { StockNotification } from '@/services/stockNotificationApi';
import { platformAlertSimple } from '@/utils/platformAlert';

/**
 * Hook for managing stock notifications
 */
export function useStockNotifications() {
  const [subscriptions, setSubscriptions] = useState<StockNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [subscribing, setSubscribing] = useState<{ [key: string]: boolean }>({});

  /**
   * Subscribe to stock notifications for a product
   */
  const subscribe = useCallback(
    async (
      productId: string,
      method: 'email' | 'sms' | 'both' | 'push' = 'push',
      options?: {
        onSuccess?: () => void;
        onError?: (error: string) => void;
      }
    ) => {
      setSubscribing((prev) => ({ ...prev, [productId]: true }));

      try {
        const response = await stockNotificationApi.subscribe({
          productId,
          method
        });

        if (response.success && response.data) {
          // Show success message
          platformAlertSimple(
            'Success',
            response.data.message || "You'll be notified when this product is back in stock"
          );
          // Update local subscriptions
          setSubscriptions((prev) => {
            const exists = prev.find((s) => s.productId === productId && s.status === 'pending');
            if (exists) {
              return prev.map((s) =>
                s.productId === productId && s.status === 'pending'
                  ? response.data!.subscription
                  : s
              );
            }
            return [...prev, response.data!.subscription];
          });

          options?.onSuccess?.();
        } else {
          const errorMessage = response.error || 'Failed to subscribe';
          platformAlertSimple('Error', errorMessage);
          options?.onError?.(errorMessage);
        }
      } catch (error) {
        const errorMessage = 'Failed to subscribe to stock notification';
        platformAlertSimple('Error', errorMessage);
        options?.onError?.(errorMessage);
      } finally {
        setSubscribing((prev) => ({ ...prev, [productId]: false }));
      }
    },
    []
  );

  /**
   * Unsubscribe from stock notifications for a product
   */
  const unsubscribe = useCallback(
    async (
      productId: string,
      options?: {
        onSuccess?: () => void;
        onError?: (error: string) => void;
      }
    ) => {
      setSubscribing((prev) => ({ ...prev, [productId]: true }));

      try {
        const response = await stockNotificationApi.unsubscribe({ productId });

        if (response.success) {
          // Update local subscriptions
          setSubscriptions((prev) =>
            prev.filter((s) => !(s.productId === productId && s.status === 'pending'))
          );
          platformAlertSimple('Success', 'Unsubscribed from stock notifications');
          options?.onSuccess?.();
        } else {
          const errorMessage = response.error || 'Failed to unsubscribe';
          platformAlertSimple('Error', errorMessage);
          options?.onError?.(errorMessage);
        }
      } catch (error) {
        const errorMessage = 'Failed to unsubscribe from stock notification';
        platformAlertSimple('Error', errorMessage);
        options?.onError?.(errorMessage);
      } finally {
        setSubscribing((prev) => ({ ...prev, [productId]: false }));
      }
    },
    []
  );

  /**
   * Get user's stock notification subscriptions
   */
  const fetchSubscriptions = useCallback(
    async (status?: 'pending' | 'sent' | 'cancelled') => {
      setLoading(true);

      try {
        const response = await stockNotificationApi.getMySubscriptions(status);

        if (response.success && response.data) {
          setSubscriptions(response.data.subscriptions);
        } else {
        }
      } catch (error) {
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Check if user is subscribed to a product
   */
  const isSubscribed = useCallback(
    async (productId: string): Promise<boolean> => {
      try {
        const response = await stockNotificationApi.checkSubscription(productId);

        if (response.success && response.data) {
          return response.data.isSubscribed;
        }

        return false;
      } catch (error) {
        return false;
      }
    },
    []
  );

  /**
   * Check if user is subscribed to a product (from local state)
   */
  const isSubscribedLocal = useCallback(
    (productId: string): boolean => {
      return subscriptions.some((s) => s.productId === productId && s.status === 'pending');
    },
    [subscriptions]
  );

  /**
   * Delete a stock notification subscription
   */
  const deleteSubscription = useCallback(
    async (
      notificationId: string,
      options?: {
        onSuccess?: () => void;
        onError?: (error: string) => void;
      }
    ) => {
      try {
        const response = await stockNotificationApi.deleteSubscription(notificationId);

        if (response.success) {
          // Update local subscriptions
          setSubscriptions((prev) => prev.filter((s) => s._id !== notificationId));

          platformAlertSimple('Success', 'Subscription deleted');
          options?.onSuccess?.();
        } else {
          const errorMessage = response.error || 'Failed to delete subscription';
          platformAlertSimple('Error', errorMessage);
          options?.onError?.(errorMessage);
        }
      } catch (error) {
        const errorMessage = 'Failed to delete subscription';
        platformAlertSimple('Error', errorMessage);
        options?.onError?.(errorMessage);
      }
    },
    []
  );

  return {
    subscriptions,
    loading,
    subscribing,
    subscribe,
    unsubscribe,
    fetchSubscriptions,
    isSubscribed,
    isSubscribedLocal,
    deleteSubscription
  };
}
