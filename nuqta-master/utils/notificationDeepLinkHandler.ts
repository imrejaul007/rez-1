/**
 * Notification Deep Link Handler
 * Handles navigation from notification taps
 */

import { router } from 'expo-router';
import { colors } from '@/constants/theme';

export interface NotificationData {
  type?: string;
  deepLink?: string;
  orderId?: string;
  storeId?: string;
  productId?: string;
  categoryId?: string;
  offerId?: string;
  eventId?: string;
  transactionId?: string;
  walletAction?: string;
  referralCode?: string;
  [key: string]: any;
}

/**
 * Handle notification deep link navigation
 */
export function handleNotificationDeepLink(data: NotificationData): void {

  try {
    // Direct deep link takes precedence
    if (data.deepLink) {
      router.push(data.deepLink as any);
      return;
    }

    // Handle based on notification type and data
    switch (data.type) {
      case 'order_update':
      case 'order_confirmed':
      case 'order_preparing':
      case 'order_ready':
      case 'order_dispatched':
      case 'order_delivered':
      case 'order_cancelled':
        if (data.orderId) {
          router.push(`/tracking/${data.orderId}` as any);
        } else {
          router.push('/order-history' as any);
        }
        break;

      case 'payment_success':
      case 'payment_failed':
      case 'payment_pending':
        if (data.orderId) {
          router.push(`/tracking/${data.orderId}` as any);
        } else if (data.transactionId) {
          router.push(`/transactions/${data.transactionId}` as any);
        } else {
          router.push('/transactions/index' as any);
        }
        break;

      case 'delivery_update':
      case 'delivery_partner_assigned':
      case 'delivery_partner_arrived':
      case 'out_for_delivery':
        if (data.orderId) {
          router.push(`/tracking/${data.orderId}` as any);
        }
        break;

      case 'promotional':
      case 'offer':
      case 'discount':
        if (data.offerId) {
          router.push(`/offers/${data.offerId}` as any);
        } else {
          router.push('/offers/index' as any);
        }
        break;

      case 'product_recommendation':
      case 'product_price_drop':
      case 'product_back_in_stock':
        if (data.productId) {
          router.push(`/product-page?cardId=${data.productId}&cardType=product` as any);
        }
        break;

      case 'store_update':
      case 'store_offer':
        if (data.storeId) {
          router.push(`/MainStorePage?storeId=${data.storeId}` as any);
        }
        break;

      case 'event_reminder':
      case 'event_update':
        if (data.eventId) {
          router.push({ pathname: '/EventPage', params: { id: data.eventId } } as any);
        }
        break;

      case 'wallet_update':
      case 'cashback_received':
      case 'coins_earned':
        if (data.walletAction === 'view_transactions') {
          router.push('/transactions/index' as any);
        } else if (data.walletAction === 'view_coins') {
          router.push('/coin-detail' as any);
        } else {
          router.push('/wallet/index' as any);
        }
        break;

      case 'referral_reward':
      case 'referral_joined':
        router.push('/referral/index' as any);
        break;

      case 'social_mention':
      case 'social_like':
      case 'social_comment':
        router.push('/feed/index' as any);
        break;

      case 'review_request':
      case 'review_response':
        if (data.orderId) {
          router.push(`/tracking/${data.orderId}` as any);
        } else if (data.storeId) {
          router.push(`/reviews/${data.storeId}`);
        }
        break;

      case 'cart_reminder':
      case 'cart_price_drop':
        router.push('/cart' as any);
        break;

      case 'wishlist_update':
      case 'wishlist_price_drop':
        router.push('/wishlist' as any);
        break;

      case 'security_alert':
      case 'login_alert':
        router.push('/account/settings' as any);
        break;

      case 'account_update':
        router.push('/account/index' as any);
        break;

      case 'subscription_reminder':
      case 'subscription_renewal':
        router.push('/subscription/index' as any);
        break;

      default:
        // If we have specific IDs, navigate there
        if (data.orderId) {
          router.push(`/tracking/${data.orderId}` as any);
        } else if (data.storeId) {
          router.push(`/MainStorePage?storeId=${data.storeId}` as any);
        } else if (data.productId) {
          router.push(`/product-page?cardId=${data.productId}&cardType=product` as any);
        } else if (data.categoryId) {
          router.push(`/category/${data.categoryId}` as any);
        } else {
          // Default to notification history
          router.push('/account/notification-history' as any);
        }
        break;
    }
  } catch (error) {
    // Fallback to home or notification history
    router.push('/account/notification-history' as any);
  }
}

/**
 * Get notification icon based on type
 */
export function getNotificationIcon(type: string): string {
  const icons: { [key: string]: string } = {
    order_update: 'bag-handle',
    order_confirmed: 'checkmark-circle',
    order_preparing: 'restaurant',
    order_ready: 'cube',
    order_dispatched: 'rocket',
    order_delivered: 'home',
    order_cancelled: 'close-circle',
    payment_success: 'checkmark-circle',
    payment_failed: 'close-circle',
    payment_pending: 'time',
    delivery_update: 'location',
    delivery_partner_assigned: 'person',
    delivery_partner_arrived: 'location',
    out_for_delivery: 'bicycle',
    promotional: 'pricetag',
    offer: 'gift',
    discount: 'pricetag',
    product_recommendation: 'star',
    product_price_drop: 'trending-down',
    product_back_in_stock: 'notifications',
    store_update: 'storefront',
    store_offer: 'pricetag',
    event_reminder: 'calendar',
    event_update: 'calendar',
    wallet_update: 'wallet',
    cashback_received: 'cash',
    coins_earned: 'diamond',
    referral_reward: 'gift',
    referral_joined: 'people',
    social_mention: 'at',
    social_like: 'heart',
    social_comment: 'chatbubble',
    review_request: 'star',
    review_response: 'chatbubble',
    cart_reminder: 'cart',
    cart_price_drop: 'trending-down',
    wishlist_update: 'heart',
    wishlist_price_drop: 'trending-down',
    security_alert: 'shield-checkmark',
    login_alert: 'log-in',
    account_update: 'person',
    subscription_reminder: 'calendar',
    subscription_renewal: 'refresh',
  };

  return icons[type] || 'notifications';
}

/**
 * Get notification color based on type
 */
export function getNotificationColor(type: string): string {
  const notifColors: { [key: string]: string } = {
    order_update: '#3B82F6',
    order_confirmed: '#10B981',
    order_preparing: '#F59E0B',
    order_ready: '#10B981',
    order_dispatched: '#3B82F6',
    order_delivered: '#10B981',
    order_cancelled: colors.error,
    payment_success: '#10B981',
    payment_failed: colors.error,
    payment_pending: '#F59E0B',
    delivery_update: '#3B82F6',
    delivery_partner_assigned: colors.brand.purpleLight,
    delivery_partner_arrived: '#10B981',
    out_for_delivery: '#3B82F6',
    promotional: '#F59E0B',
    offer: '#EC4899',
    discount: '#F59E0B',
    product_recommendation: colors.brand.purpleLight,
    product_price_drop: '#10B981',
    product_back_in_stock: '#3B82F6',
    store_update: '#3B82F6',
    store_offer: '#F59E0B',
    event_reminder: colors.brand.purpleLight,
    event_update: '#3B82F6',
    wallet_update: '#10B981',
    cashback_received: '#10B981',
    coins_earned: '#F59E0B',
    referral_reward: '#EC4899',
    referral_joined: colors.brand.purpleLight,
    social_mention: colors.brand.purpleLight,
    social_like: '#EC4899',
    social_comment: '#3B82F6',
    review_request: '#F59E0B',
    review_response: colors.brand.purpleLight,
    cart_reminder: '#F59E0B',
    cart_price_drop: '#10B981',
    wishlist_update: '#EC4899',
    wishlist_price_drop: '#10B981',
    security_alert: colors.error,
    login_alert: '#F59E0B',
    account_update: '#3B82F6',
    subscription_reminder: '#F59E0B',
    subscription_renewal: '#3B82F6',
  };

  return notifColors[type] || '#6B7280';
}

export default {
  handleNotificationDeepLink,
  getNotificationIcon,
  getNotificationColor,
};
