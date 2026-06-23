// Notifications API Service
// Handles push notifications, in-app notifications, and user preferences

import apiClient, { ApiResponse } from './apiClient';

export interface Notification {
  id: string;
  userId: string;
  type: 'order' | 'product' | 'store' | 'video' | 'project' | 'promotion' | 'system' | 'social';
  category: 'info' | 'success' | 'warning' | 'error' | 'update';
  title: string;
  message: string;
  data?: Record<string, any>;
  icon?: string;
  image?: string;
  actions?: Array<{
    id: string;
    title: string;
    url?: string;
    action?: string;
  }>;
  read: boolean;
  readAt?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  scheduled?: boolean;
  scheduledFor?: string;
  expiresAt?: string;
  metadata: {
    source: 'app' | 'web' | 'email' | 'push' | 'sms';
    channel: string;
    campaign?: string;
    tags: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreferences {
  id: string;
  userId: string;
  channels: {
    push: boolean;
    email: boolean;
    sms: boolean;
    inApp: boolean;
  };
  categories: {
    orders: {
      enabled: boolean;
      channels: ('push' | 'email' | 'sms' | 'inApp')[];
    };
    products: {
      enabled: boolean;
      channels: ('push' | 'email' | 'sms' | 'inApp')[];
    };
    stores: {
      enabled: boolean;
      channels: ('push' | 'email' | 'sms' | 'inApp')[];
    };
    videos: {
      enabled: boolean;
      channels: ('push' | 'email' | 'sms' | 'inApp')[];
    };
    projects: {
      enabled: boolean;
      channels: ('push' | 'email' | 'sms' | 'inApp')[];
    };
    promotions: {
      enabled: boolean;
      channels: ('push' | 'email' | 'sms' | 'inApp')[];
    };
    system: {
      enabled: boolean;
      channels: ('push' | 'email' | 'sms' | 'inApp')[];
    };
    social: {
      enabled: boolean;
      channels: ('push' | 'email' | 'sms' | 'inApp')[];
    };
  };
  schedule: {
    quietHours: {
      enabled: boolean;
      start: string; // HH:MM format
      end: string;   // HH:MM format
      timezone: string;
    };
    weekends: {
      enabled: boolean;
      days: ('saturday' | 'sunday')[];
    };
  };
  frequency: {
    digest: 'none' | 'daily' | 'weekly' | 'monthly';
    maxPerDay: number;
    groupSimilar: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface NotificationsQuery {
  page?: number;
  limit?: number;
  type?: Notification['type'];
  category?: Notification['category'];
  read?: boolean;
  priority?: Notification['priority'];
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sort?: 'newest' | 'oldest' | 'priority' | 'unread_first';
}

export interface NotificationsResponse {
  notifications: Notification[];
  pagination: {
    current: number;
    pages: number;
    total: number;
    limit: number;
  };
  summary: {
    total: number;
    unread: number;
    byType: Record<Notification['type'], number>;
    byPriority: Record<Notification['priority'], number>;
  };
}

export interface PushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  device: {
    type: 'web' | 'mobile';
    platform: string;
    browser?: string;
    version?: string;
  };
  active: boolean;
  lastUsed: string;
  createdAt: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: Notification['type'];
  category: Notification['category'];
  title: string;
  message: string;
  variables: string[];
  channels: ('push' | 'email' | 'sms' | 'inApp')[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

class NotificationsService {
  // Get user notifications with filtering and pagination
  async getNotifications(query: NotificationsQuery = {}): Promise<ApiResponse<NotificationsResponse>> {
    try {
      return await apiClient.get('/notifications', query);
    } catch (error: any) {
      return { success: false, data: null as any, message: error?.message || 'Failed to fetch notifications' };
    }
  }

  // Get single notification by ID
  async getNotificationById(notificationId: string): Promise<ApiResponse<Notification>> {
    try {
      return await apiClient.get(`/notifications/${notificationId}`);
    } catch (error: any) {
      return { success: false, data: null as any, message: error?.message || 'Failed to fetch notification' };
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<ApiResponse<{ message: string }>> {
    try {
      return await apiClient.patch('/notifications/read', { notificationIds: [notificationId] });
    } catch (error: any) {
      return { success: false, data: null as any, message: error?.message || 'Failed to mark notification as read' };
    }
  }

  // Mark all notifications as read
  async markAllAsRead(): Promise<ApiResponse<{ message: string; count: number }>> {
    try {
      return await apiClient.patch('/notifications/read');
    } catch (error: any) {
      return { success: false, data: null as any, message: error?.message || 'Failed to mark all as read' };
    }
  }

  // Mark notification as unread
  async markAsUnread(notificationId: string): Promise<ApiResponse<{ message: string }>> {
    try {
      return await apiClient.patch(`/notifications/${notificationId}/unread`);
    } catch (error: any) {
      return { success: false, data: null as any, message: error?.message || 'Failed to mark notification as unread' };
    }
  }

  // Delete notification
  async deleteNotification(notificationId: string): Promise<ApiResponse<{ message: string }>> {
    try {
      return await apiClient.delete(`/notifications/${notificationId}`);
    } catch (error: any) {
      return { success: false, data: null as any, message: error?.message || 'Failed to delete notification' };
    }
  }

  // Delete multiple notifications
  async deleteNotifications(notificationIds: string[]): Promise<ApiResponse<{
    message: string;
    deleted: number;
  }>> {
    try {
      return await apiClient.post('/notifications/bulk-delete', {
        ids: notificationIds
      });
    } catch (error: any) {
      return { success: false, data: null as any, message: error?.message || 'Failed to delete notifications' };
    }
  }

  // Clear all notifications
  async clearAllNotifications(): Promise<ApiResponse<{ message: string; count: number }>> {
    try {
      return await apiClient.delete('/notifications/clear-all');
    } catch (error: any) {
      return { success: false, data: null as any, message: error?.message || 'Failed to clear notifications' };
    }
  }

  // Get notification preferences
  async getNotificationPreferences(): Promise<ApiResponse<NotificationPreferences>> {
    try {
      return await apiClient.get('/notifications/preferences');
    } catch (error: any) {
      return { success: false, data: null as any, message: error?.message || 'Failed to fetch preferences' };
    }
  }

  // Update notification preferences
  async updateNotificationPreferences(
    preferences: Partial<NotificationPreferences>
  ): Promise<ApiResponse<NotificationPreferences>> {
    try {
      return await apiClient.patch('/notifications/preferences', preferences);
    } catch (error: any) {
      return { success: false, data: null as any, message: error?.message || 'Failed to update preferences' };
    }
  }

  // NOTE: the push subscribe/unsubscribe/test/subscriptions methods previously
// here called /notifications/push/* endpoints that don't exist on the backend
// (real implementation lives in pushNotificationService.ts using
// /notifications/register-token and /notifications/unregister-token). They
// have been removed to avoid 404s and confusion. Re-add them only when the
// backend actually implements the corresponding routes.

  // Send notification (admin/system use)
  async sendNotification(notification: {
    userId?: string;
    userIds?: string[];
    type: Notification['type'];
    category: Notification['category'];
    title: string;
    message: string;
    data?: Record<string, any>;
    priority?: Notification['priority'];
    scheduledFor?: string;
    expiresAt?: string;
    channels?: ('push' | 'email' | 'sms' | 'inApp')[];
  }): Promise<ApiResponse<{
    notificationId: string;
    sent: number;
    failed: number;
  }>> {
    try {
      return await apiClient.post('/notifications/send', notification);
    } catch (error: any) {
      return { success: false, data: null as any, message: error?.message || 'Failed to send notification' };
    }
  }

  // Get notification statistics
  async getNotificationStats(
    dateRange?: {
      from: string;
      to: string;
    }
  ): Promise<ApiResponse<{
    total: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    byType: Record<Notification['type'], {
      sent: number;
      delivered: number;
      opened: number;
    }>;
    byChannel: Record<'push' | 'email' | 'sms' | 'inApp', {
      sent: number;
      delivered: number;
      opened: number;
    }>;
    engagement: {
      openRate: number;
      clickRate: number;
      unsubscribeRate: number;
    };
  }>> {
    try {
      return await apiClient.get('/notifications/stats', dateRange);
    } catch (error: any) {
      return { success: false, data: null as any, message: error?.message || 'Failed to fetch stats' };
    }
  }

  // Get notification templates (admin use)
  async getNotificationTemplates(): Promise<ApiResponse<NotificationTemplate[]>> {
    try {
      return await apiClient.get('/notifications/templates');
    } catch (error: any) {
      return { success: false, data: null as any, message: error?.message || 'Failed to fetch templates' };
    }
  }

  // Create notification template (admin use)
  async createNotificationTemplate(template: {
    name: string;
    type: Notification['type'];
    category: Notification['category'];
    title: string;
    message: string;
    variables?: string[];
    channels: ('push' | 'email' | 'sms' | 'inApp')[];
  }): Promise<ApiResponse<NotificationTemplate>> {
    try {
      return await apiClient.post('/notifications/templates', template);
    } catch (error: any) {
      return { success: false, data: null as any, message: error?.message || 'Failed to create template' };
    }
  }

  // Update notification template (admin use)
  async updateNotificationTemplate(
    templateId: string,
    updates: Partial<{
      name: string;
      title: string;
      message: string;
      variables: string[];
      channels: ('push' | 'email' | 'sms' | 'inApp')[];
      active: boolean;
    }>
  ): Promise<ApiResponse<NotificationTemplate>> {
    try {
      return await apiClient.patch(`/notifications/templates/${templateId}`, updates);
    } catch (error: any) {
      return { success: false, data: null as any, message: error?.message || 'Failed to update template' };
    }
  }

  // Send notification using template
  async sendFromTemplate(
    templateId: string,
    data: {
      userId?: string;
      userIds?: string[];
      variables?: Record<string, string>;
      scheduledFor?: string;
      priority?: Notification['priority'];
    }
  ): Promise<ApiResponse<{
    notificationId: string;
    sent: number;
    failed: number;
  }>> {
    try {
      return await apiClient.post(`/notifications/templates/${templateId}/send`, data);
    } catch (error: any) {
      return { success: false, data: null as any, message: error?.message || 'Failed to send from template' };
    }
  }

  // Get unread notifications count
  async getUnreadCount(): Promise<ApiResponse<{
    total: number;
    byType: Record<Notification['type'], number>;
    byPriority: Record<Notification['priority'], number>;
  }>> {
    try {
      return await apiClient.get('/notifications/unread-count');
    } catch (error: any) {
      return { success: false, data: null as any, message: error?.message || 'Failed to fetch unread count' };
    }
  }

  // Snooze notification
  async snoozeNotification(
    notificationId: string,
    snoozeUntil: string
  ): Promise<ApiResponse<{ message: string }>> {
    try {
      return await apiClient.patch(`/notifications/${notificationId}/snooze`, {
        snoozeUntil
      });
    } catch (error: any) {
      return { success: false, data: null as any, message: error?.message || 'Failed to snooze notification' };
    }
  }

  // Pin notification
  async pinNotification(notificationId: string): Promise<ApiResponse<{ message: string }>> {
    try {
      return await apiClient.patch(`/notifications/${notificationId}/pin`);
    } catch (error: any) {
      return { success: false, data: null as any, message: error?.message || 'Failed to pin notification' };
    }
  }

  // Unpin notification
  async unpinNotification(notificationId: string): Promise<ApiResponse<{ message: string }>> {
    try {
      return await apiClient.patch(`/notifications/${notificationId}/unpin`);
    } catch (error: any) {
      return { success: false, data: null as any, message: error?.message || 'Failed to unpin notification' };
    }
  }

  // Get pinned notifications
  async getPinnedNotifications(): Promise<ApiResponse<Notification[]>> {
    try {
      return await apiClient.get('/notifications/pinned');
    } catch (error: any) {
      return { success: false, data: null as any, message: error?.message || 'Failed to fetch pinned notifications' };
    }
  }

  // Archive notification
  async archiveNotification(notificationId: string): Promise<ApiResponse<{ message: string }>> {
    try {
      return await apiClient.patch(`/notifications/${notificationId}/archive`);
    } catch (error: any) {
      return { success: false, data: null as any, message: error?.message || 'Failed to archive notification' };
    }
  }

  // Get archived notifications
  async getArchivedNotifications(
    page: number = 1,
    limit: number = 20
  ): Promise<ApiResponse<NotificationsResponse>> {
    try {
      return await apiClient.get('/notifications/archived', { page, limit });
    } catch (error: any) {
      return { success: false, data: null as any, message: error?.message || 'Failed to fetch archived notifications' };
    }
  }

  // Restore archived notification
  async restoreNotification(notificationId: string): Promise<ApiResponse<{ message: string }>> {
    try {
      return await apiClient.patch(`/notifications/${notificationId}/restore`);
    } catch (error: any) {
      return { success: false, data: null as any, message: error?.message || 'Failed to restore notification' };
    }
  }
}

// Create singleton instance
const notificationsService = new NotificationsService();

export default notificationsService;