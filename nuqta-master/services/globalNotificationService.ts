// Global Notification Service
// Applies notification settings globally across the app

import { useNotifications } from '@/contexts/NotificationContext';
import * as Notifications from 'expo-notifications';
import { platformAlertSimple } from '@/utils/platformAlert';

// Notification types
export type NotificationType = 
  | 'orderUpdate'
  | 'deliveryUpdate'
  | 'paymentUpdate'
  | 'promotion'
  | 'recommendation'
  | 'priceAlert'
  | 'securityAlert'
  | 'chatMessage'
  | 'newsletter'
  | 'weeklyDigest'
  | 'accountUpdate'
  | 'otpMessage';

// Notification data interface
export interface NotificationData {
  title: string;
  body: string;
  type: NotificationType;
  data?: any;
  priority?: 'high' | 'normal' | 'low';
}

class GlobalNotificationService {
  private static instance: GlobalNotificationService;
  private notificationContext: any = null;

  private constructor() {}

  public static getInstance(): GlobalNotificationService {
    if (!GlobalNotificationService.instance) {
      GlobalNotificationService.instance = new GlobalNotificationService();
    }
    return GlobalNotificationService.instance;
  }

  // Set notification context (called from React components)
  public setNotificationContext(context: any) {
    this.notificationContext = context;
  }

  // Send push notification
  public async sendPushNotification(data: NotificationData): Promise<boolean> {
    if (!this.notificationContext) {
      return false;
    }

    const { canSendPushNotification } = this.notificationContext;

    // Check if push notifications are enabled for this type
    const pushType = this.getPushNotificationType(data.type);
    if (!canSendPushNotification(pushType)) {
      return false;
    }

    try {
      // Schedule local notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: data.title,
          body: data.body,
          data: data.data,
          priority: data.priority || 'normal',
        },
        trigger: null, // Show immediately
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  // Send email notification (simulated - in real app, this would call email service)
  public async sendEmailNotification(data: NotificationData): Promise<boolean> {
    if (!this.notificationContext) {
      return false;
    }

    const { canSendEmailNotification } = this.notificationContext;

    // Check if email notifications are enabled for this type
    const emailType = this.getEmailNotificationType(data.type);
    if (!canSendEmailNotification(emailType)) {
      return false;
    }

    try {
      // In a real app, this would call your email service
      // For demo purposes, show an alert
      platformAlertSimple(
        'Email Notification',
        `Email would be sent:\n\nTitle: ${data.title}\nBody: ${data.body}`
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  // Send SMS notification (simulated - in real app, this would call SMS service)
  public async sendSMSNotification(data: NotificationData): Promise<boolean> {
    if (!this.notificationContext) {
      return false;
    }

    const { canSendSMSNotification } = this.notificationContext;

    // Check if SMS notifications are enabled for this type
    const smsType = this.getSMSNotificationType(data.type);
    if (!canSendSMSNotification(smsType)) {
      return false;
    }

    try {
      // In a real app, this would call your SMS service
      // For demo purposes, show an alert
      platformAlertSimple(
        'SMS Notification',
        `SMS would be sent:\n\nTitle: ${data.title}\nBody: ${data.body}`
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  // Show in-app notification
  public async showInAppNotification(data: NotificationData): Promise<boolean> {
    if (!this.notificationContext) {
      return false;
    }

    const { canShowInAppNotification } = this.notificationContext;

    if (!canShowInAppNotification()) {
      return false;
    }

    try {
      // Show in-app notification (this could be a toast, banner, etc.)
      // For demo purposes, show an alert
      platformAlertSimple(
        'In-App Notification',
        `${data.title}\n\n${data.body}`
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  // Send notification through all enabled channels
  public async sendNotification(data: NotificationData): Promise<{
    push: boolean;
    email: boolean;
    sms: boolean;
    inApp: boolean;
  }> {
    const results = {
      push: false,
      email: false,
      sms: false,
      inApp: false,
    };

    // Send through all channels in parallel
    const [pushResult, emailResult, smsResult, inAppResult] = await Promise.allSettled([
      this.sendPushNotification(data),
      this.sendEmailNotification(data),
      this.sendSMSNotification(data),
      this.showInAppNotification(data),
    ]);

    results.push = pushResult.status === 'fulfilled' && pushResult.value;
    results.email = emailResult.status === 'fulfilled' && emailResult.value;
    results.sms = smsResult.status === 'fulfilled' && smsResult.value;
    results.inApp = inAppResult.status === 'fulfilled' && inAppResult.value;

    return results;
  }

  // Helper methods to map notification types to setting keys
  private getPushNotificationType(type: NotificationType): keyof any {
    const mapping: Record<NotificationType, keyof any> = {
      orderUpdate: 'orderUpdates',
      deliveryUpdate: 'deliveryUpdates',
      paymentUpdate: 'paymentUpdates',
      promotion: 'promotions',
      recommendation: 'recommendations',
      priceAlert: 'priceAlerts',
      securityAlert: 'securityAlerts',
      chatMessage: 'chatMessages',
      newsletter: 'newsletters',
      weeklyDigest: 'weeklyDigest',
      accountUpdate: 'accountUpdates',
      otpMessage: 'otpMessages',
    };
    return mapping[type];
  }

  private getEmailNotificationType(type: NotificationType): keyof any {
    const mapping: Record<NotificationType, keyof any> = {
      orderUpdate: 'orderReceipts',
      deliveryUpdate: 'orderReceipts',
      paymentUpdate: 'accountUpdates',
      promotion: 'promotions',
      recommendation: 'newsletters',
      priceAlert: 'newsletters',
      securityAlert: 'securityAlerts',
      chatMessage: 'accountUpdates',
      newsletter: 'newsletters',
      weeklyDigest: 'weeklyDigest',
      accountUpdate: 'accountUpdates',
      otpMessage: 'securityAlerts',
    };
    return mapping[type];
  }

  private getSMSNotificationType(type: NotificationType): keyof any {
    const mapping: Record<NotificationType, keyof any> = {
      orderUpdate: 'orderUpdates',
      deliveryUpdate: 'deliveryAlerts',
      paymentUpdate: 'paymentConfirmations',
      promotion: 'orderUpdates',
      recommendation: 'orderUpdates',
      priceAlert: 'orderUpdates',
      securityAlert: 'securityAlerts',
      chatMessage: 'orderUpdates',
      newsletter: 'orderUpdates',
      weeklyDigest: 'orderUpdates',
      accountUpdate: 'securityAlerts',
      otpMessage: 'otpMessages',
    };
    return mapping[type];
  }
}

// Export singleton instance
export const globalNotificationService = GlobalNotificationService.getInstance();

// Hook to initialize the service with notification context
export function useGlobalNotificationService() {
  const notificationContext = useNotifications();
  
  // Set the context in the service
  globalNotificationService.setNotificationContext(notificationContext);
  
  return globalNotificationService;
}

