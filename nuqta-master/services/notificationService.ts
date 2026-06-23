import apiClient from './apiClient';

export interface NotificationData {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'promotional';
  category: 'order' | 'earning' | 'general' | 'promotional' | 'social' | 'security' | 'system' | 'reminder';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  data?: {
    orderId?: string;
    transactionId?: string;
    storeId?: string;
    productId?: string;
    amount?: number;
    imageUrl?: string;
    deepLink?: string;
    externalLink?: string;
    actionButton?: {
      text: string;
      action: 'navigate' | 'api_call' | 'external_link';
      target: string;
    };
    metadata?: { [key: string]: any };
  };
  deliveryChannels?: ('push' | 'email' | 'sms' | 'in_app')[];
  scheduledAt?: string;
  expiresAt?: string;
}

export interface NotificationHistoryResponse {
  notifications: Array<{
    _id: string;
    title: string;
    message: string;
    type: string;
    category: string;
    priority: string;
    deliveryChannels: string[];
    isRead: boolean;
    readAt?: string;
    createdAt: string;
    updatedAt: string;
    data?: any;
  }>;
  unreadCount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class NotificationService {
  /**
   * Get user notifications with optional filtering
   */
  async getNotifications(params?: {
    type?: string;
    isRead?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ success: boolean; data?: NotificationHistoryResponse; error?: string }> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.type) queryParams.append('type', params.type);
      if (params?.isRead !== undefined) queryParams.append('isRead', params.isRead.toString());
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const response: any = await apiClient.get(`/notifications?${queryParams.toString()}`);
      return {
        success: Boolean(response?.success),
        data: response?.data as NotificationHistoryResponse | undefined,
        error: response?.error as string | undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to fetch notifications'
      };
    }
  }

  /**
   * Mark notifications as read
   */
  async markAsRead(notificationIds?: string[]): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await apiClient.patch('/notifications/read', {
        notificationIds: notificationIds || []
      });
      return response;
    } catch (error) {
      return {
        success: false,
        error: 'Failed to mark notifications as read'
      };
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await apiClient.delete(`/notifications/${notificationId}`);
      return response;
    } catch (error) {
      return {
        success: false,
        error: 'Failed to delete notification'
      };
    }
  }

  /**
   * Get notification settings
   */
  async getNotificationSettings(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await apiClient.get('/user-settings/notifications/all');
      return response;
    } catch (error) {
      return {
        success: false,
        error: 'Failed to fetch notification settings'
      };
    }
  }

  /**
   * Update push notification settings
   */
  async updatePushSettings(settings: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await apiClient.put('/user-settings/notifications/push', settings);
      return response;
    } catch (error) {
      return {
        success: false,
        error: 'Failed to update push notification settings'
      };
    }
  }

  /**
   * Update email notification settings
   */
  async updateEmailSettings(settings: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await apiClient.put('/user-settings/notifications/email', settings);
      return response;
    } catch (error) {
      return {
        success: false,
        error: 'Failed to update email notification settings'
      };
    }
  }

  /**
   * Update SMS notification settings
   */
  async updateSMSSettings(settings: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await apiClient.put('/user-settings/notifications/sms', settings);
      return response;
    } catch (error) {
      return {
        success: false,
        error: 'Failed to update SMS notification settings'
      };
    }
  }

  /**
   * Update in-app notification settings
   */
  async updateInAppSettings(settings: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await apiClient.put('/user-settings/notifications/inapp', settings);
      return response;
    } catch (error) {
      return {
        success: false,
        error: 'Failed to update in-app notification settings'
      };
    }
  }

  /**
   * Create a test notification (for development/testing)
   */
  async createTestNotification(data: NotificationData): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // This would typically be an admin endpoint
      const response = await apiClient.post('/notifications/test', data);
      return response;
    } catch (error) {
      return {
        success: false,
        error: 'Failed to create test notification'
      };
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await apiClient.get('/notifications/stats');
      return response;
    } catch (error) {
      return {
        success: false,
        error: 'Failed to fetch notification statistics'
      };
    }
  }
}

// Singleton pattern using globalThis to persist across SSR module re-evaluations
const NOTIFICATION_SERVICE_KEY = '__rezNotificationService__';

function getNotificationService(): NotificationService {
  if (typeof globalThis !== 'undefined') {
    if (!(globalThis as any)[NOTIFICATION_SERVICE_KEY]) {
      (globalThis as any)[NOTIFICATION_SERVICE_KEY] = new NotificationService();
    }
    return (globalThis as any)[NOTIFICATION_SERVICE_KEY];
  }
  return new NotificationService();
}

export default getNotificationService();
