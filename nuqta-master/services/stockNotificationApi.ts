/**
 * Stock Notifications API Service
 *
 * Handles stock notification requests to the backend
 */

import apiClient from './apiClient';

export interface StockNotificationRequest {
  productId: string;
  variantId?: string;
  method?: 'email' | 'sms' | 'both' | 'push'; // Legacy support
  notificationMethod?: ('email' | 'push' | 'sms')[];
  contact?: {
    email?: string;
    phone?: string;
  };
}

export interface StockNotification {
  _id: string;
  userId: string;
  productId: string;
  variantId?: string;
  notificationMethod: ('email' | 'push' | 'sms')[];
  contact: {
    email?: string;
    phone?: string;
  };
  status: 'pending' | 'notified' | 'expired' | 'cancelled';
  notifiedAt?: Date;
  expiresAt: Date;
  daysUntilExpiration?: number;
  metadata?: {
    productName?: string;
    variantAttributes?: Record<string, any>;
    priceAtSubscription?: number;
    stockAtSubscription?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationHistoryResponse {
  notifications: StockNotification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

class StockNotificationsApi {
  private baseUrl = '/stock-notifications';

  /**
   * Subscribe to stock notification
   */
  async subscribe(data: StockNotificationRequest) {
    try {

      const response = await apiClient.post(this.baseUrl, data);

      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Get user's notification history
   */
  async getMyNotifications(params?: {
    page?: number;
    limit?: number;
    status?: 'pending' | 'notified' | 'expired' | 'cancelled';
  }) {
    try {

      const response = await apiClient.get(`${this.baseUrl}/my-notifications`, {
        params,
      });

      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Check if user has pending notification for a product
   */
  async checkNotification(productId: string, variantId?: string) {
    try {
      const response = await apiClient.get(`${this.baseUrl}/check/${productId}`, {
        params: variantId ? { variantId } : {},
      });

      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Cancel a notification
   */
  async cancelNotification(notificationId: string) {
    try {

      const response = await apiClient.delete(`${this.baseUrl}/${notificationId}`);

      return response.data;
    } catch (error: any) {
      throw error;
    }
  }


  /**
   * Adapter methods for backward compatibility with existing hook
   */

  /**
   * Get user's subscriptions (adapter for my-notifications)
   */
  async getMySubscriptions(status?: 'pending' | 'sent' | 'cancelled' | 'notified' | 'expired') {
    try {
      // Map 'sent' status to 'notified'
      const mappedStatus = status === 'sent' ? 'notified' : status;
      const response = await this.getMyNotifications({ status: mappedStatus as any });

      if (response.success && response.data) {
        return {
          success: true,
          data: {
            subscriptions: response.data.notifications || [],
            total: response.data.pagination?.total || 0,
          },
        };
      }

      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check subscription (adapter for checkNotification)
   */
  async checkSubscription(productId: string) {
    try {
      const response = await this.checkNotification(productId);

      if (response.success && response.data) {
        return {
          success: true,
          data: {
            isSubscribed: response.data.hasPendingNotification || false,
          },
        };
      }

      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Unsubscribe (adapter that finds and cancels notification)
   */
  async unsubscribe(data: { productId: string }) {
    try {
      // First check if user has a pending notification
      const checkResponse = await this.checkNotification(data.productId);

      if (!checkResponse.success || !checkResponse.data?.hasPendingNotification) {
        return { success: true, data: null };
      }

      // Get user's notifications to find the notification ID
      const notificationsResponse = await this.getMyNotifications({ status: 'pending' });

      if (notificationsResponse.success && notificationsResponse.data) {
        const notification = notificationsResponse.data.notifications?.find(
          (n: any) => n.productId === data.productId && n.status === 'pending'
        );

        if (notification) {
          return await this.cancelNotification(notification._id);
        }
      }

      return { success: true, data: null };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete subscription (adapter for cancelNotification)
   */
  async deleteSubscription(notificationId: string) {
    return this.cancelNotification(notificationId);
  }

  /**
   * Get product notification stats (Admin/Store)
   */
  async getProductStats(productId: string) {
    try {
      const response = await apiClient.get(`${this.baseUrl}/stats/${productId}`);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }
}

const stockNotificationsApi = new StockNotificationsApi();
export default stockNotificationsApi;
