import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import apiClient from './apiClient';

// Configure notification behavior (wrapped in try-catch for emulator compatibility)
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      // For platforms that support banners/lists
      shouldShowBanner: true as any,
      shouldShowList: true as any,
    }),
  });
} catch (_e) {
  // silently handle
}

export interface PushNotification {
  title: string;
  body: string;
  data?: any;
  sound?: boolean;
  badge?: number;
}

class PushNotificationService {
  private expoPushToken: string | null = null;
  private notificationListener: any = null;
  private responseListener: any = null;
  private navigationHandler: ((data: any) => void) | null = null;

  /**
   * Set navigation handler for deep linking
   */
  setNavigationHandler(handler: (data: any) => void): void {
    this.navigationHandler = handler;
  }

  /**
   * Initialize push notifications
   */
  async initialize(userId?: string): Promise<string | null> {
    try {
      // Skip push notifications on web in development (requires HTTPS)
      if (Platform.OS === 'web' && __DEV__) {
        this.setupListeners();
        return null;
      }

      // Check if running on a physical device
      if (!Device.isDevice) {
        return null;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return null;
      }

      // Get push token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });

      this.expoPushToken = token.data;

      // Register token with backend
      if (userId) {
        await this.registerTokenWithBackend(this.expoPushToken, userId);
      }

      // Configure Android channels
      if (Platform.OS === 'android') {
        await this.setupAndroidChannels();
      }

      // Setup notification listeners
      this.setupListeners();

      return this.expoPushToken;
    } catch (error) {
      return null;
    }
  }

  /**
   * Setup Android notification channels
   */
  private async setupAndroidChannels(): Promise<void> {
    // Default channel
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366f1',
    });

    // Order updates channel
    await Notifications.setNotificationChannelAsync('orders', {
      name: 'Order Updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#10b981',
      sound: 'default',
    });

    // Promotional channel
    await Notifications.setNotificationChannelAsync('promotions', {
      name: 'Promotions & Offers',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250],
      lightColor: '#f59e0b',
      sound: 'default',
    });

    // Security alerts channel
    await Notifications.setNotificationChannelAsync('security', {
      name: 'Security Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250, 250, 250],
      lightColor: '#ef4444',
      sound: 'default',
    });
  }

  /**
   * Register push token with backend
   */
  private async registerTokenWithBackend(token: string, userId: string): Promise<void> {
    try {
      const response = await apiClient.post('/notifications/register-token', {
        token,
        userId,
        platform: Platform.OS,
        deviceInfo: {
          brand: Device.brand,
          modelName: Device.modelName,
          osName: Device.osName,
          osVersion: Device.osVersion,
        },
      });

      if (response.success) {

      } else {
      }
    } catch (_error) {
      // silently handle
    }
  }

  /**
   * Update push token for user
   */
  async updateToken(userId: string): Promise<void> {
    if (this.expoPushToken) {
      await this.registerTokenWithBackend(this.expoPushToken, userId);
    }
  }

  /**
   * Unregister push token from backend
   */
  async unregisterToken(): Promise<void> {
    try {
      if (this.expoPushToken) {
        await apiClient.post('/notifications/unregister-token', {
          token: this.expoPushToken,
        });

      }
    } catch (_error) {
      // silently handle
    }
  }

  /**
   * Setup notification listeners
   */
  private setupListeners(): void {
    // Remove existing listeners before adding new ones to prevent accumulation
    this.cleanup();

    // Listener for when a notification is received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener((notification) => {

      // You can handle foreground notifications here
    });

    // Listener for when user taps on a notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener((response) => {

      const data = response.notification.request.content.data;

      // Handle navigation based on notification data
      this.handleNotificationTap(data);
    });
  }

  /**
   * Handle notification tap
   */
  private handleNotificationTap(data: any): void {

    // Use custom navigation handler if set
    if (this.navigationHandler) {
      this.navigationHandler(data);
      return;
    }

    // Default navigation — fallback if custom handler wasn't set
    const { handleNotificationDeepLink } = require('@/utils/notificationDeepLinkHandler');
    handleNotificationDeepLink(data || {});
  }

  /**
   * Send local notification
   */
  async sendLocalNotification(notification: PushNotification): Promise<string | null> {
    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          sound: notification.sound !== false ? 'default' : undefined,
          badge: notification.badge,
        },
        trigger: null, // Send immediately
      });

      return identifier;
    } catch (error) {
      return null;
    }
  }

  /**
   * Send order notification
   */
  async sendOrderNotification(
    status: string,
    orderNumber: string,
    orderId: string,
    message?: string
  ): Promise<void> {
    const notifications: { [key: string]: PushNotification } = {
      confirmed: {
        title: 'Order Confirmed!',
        body: `Your order ${orderNumber} has been confirmed by the store.`,
        data: { type: 'order_update', orderId, status: 'confirmed' },
      },
      preparing: {
        title: 'Order Being Prepared',
        body: `Your order ${orderNumber} is being prepared.`,
        data: { type: 'order_update', orderId, status: 'preparing' },
      },
      ready: {
        title: 'Order Ready!',
        body: `Your order ${orderNumber} is ready for pickup/dispatch.`,
        data: { type: 'order_update', orderId, status: 'ready' },
      },
      dispatched: {
        title: 'Order Dispatched!',
        body: `Your order ${orderNumber} has been dispatched.`,
        data: { type: 'order_update', orderId, status: 'dispatched' },
      },
      out_for_delivery: {
        title: 'Out for Delivery!',
        body: `Your order ${orderNumber} is out for delivery.`,
        data: { type: 'order_update', orderId, status: 'out_for_delivery' },
        sound: true,
        badge: 1,
      },
      delivered: {
        title: 'Order Delivered!',
        body: `Your order ${orderNumber} has been delivered successfully.`,
        data: { type: 'order_update', orderId, status: 'delivered' },
        sound: true,
      },
      cancelled: {
        title: 'Order Cancelled',
        body: `Your order ${orderNumber} has been cancelled.`,
        data: { type: 'order_update', orderId, status: 'cancelled' },
      },
    };

    const notification = notifications[status];

    if (notification) {
      // Override body with custom message if provided
      if (message) {
        notification.body = message;
      }

      await this.sendLocalNotification(notification);
    }
  }

  /**
   * Send delivery partner assigned notification
   */
  async sendPartnerAssignedNotification(
    orderNumber: string,
    orderId: string,
    partnerName: string
  ): Promise<void> {
    await this.sendLocalNotification({
      title: 'Delivery Partner Assigned',
      body: `${partnerName} will deliver your order ${orderNumber}.`,
      data: { type: 'order_update', orderId, event: 'partner_assigned' },
      sound: true,
    });
  }

  /**
   * Send delivery partner arrived notification
   */
  async sendPartnerArrivedNotification(
    orderNumber: string,
    orderId: string
  ): Promise<void> {
    await this.sendLocalNotification({
      title: 'Delivery Partner Arrived!',
      body: `Your delivery partner has arrived for order ${orderNumber}.`,
      data: { type: 'order_update', orderId, event: 'partner_arrived' },
      sound: true,
      badge: 1,
    });
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Cancel notification by identifier
   */
  async cancelNotification(identifier: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  }

  /**
   * Get badge count
   */
  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  /**
   * Set badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  /**
   * Clear badge
   */
  async clearBadge(): Promise<void> {
    await Notifications.setBadgeCountAsync(0);
  }

  /**
   * Get push token
   */
  getPushToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Cleanup listeners
   */
  cleanup(): void {
    if (this.notificationListener?.remove) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }
    if (this.responseListener?.remove) {
      this.responseListener.remove();
      this.responseListener = null;
    }
  }
}

// Export singleton instance
const pushNotificationService = new PushNotificationService();
export default pushNotificationService;

// Export type
export { PushNotificationService };
