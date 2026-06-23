// @ts-nocheck
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { showAlert } from '@/utils/alert';

// Configure notification behavior (wrapped in try-catch for emulator compatibility)
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch (_e) {
  // silently handle
}

interface EarningsNotificationData {
  type: 'earnings' | 'project_approved' | 'project_rejected' | 'withdrawal' | 'milestone';
  title: string;
  body: string;
  data?: any;
}

class EarningsNotificationService {
  private static instance: EarningsNotificationService;
  private notificationListener: Notifications.EventSubscription | null = null;
  private responseListener: Notifications.EventSubscription | null = null;

  private constructor() {}

  static getInstance(): EarningsNotificationService {
    if (!EarningsNotificationService.instance) {
      EarningsNotificationService.instance = new EarningsNotificationService();
    }
    return EarningsNotificationService.instance;
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return false;
      }

      // Get push token (best-effort, don't block on failure)
      if (Platform.OS !== 'web') {
        try {
          const token = await Notifications.getExpoPushTokenAsync({
            projectId: process.env.EXPO_PUBLIC_PROJECT_ID || '58b80355-a254-4d4a-80ce-d2bc3272b144',
          });

          // TODO: Send token to backend to register for push notifications
          // await apiClient.post('/notifications/register-push-token', { token: token.data });
        } catch (_tokenError) {
          // silently handle
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Schedule a local notification
   */
  async scheduleLocalNotification(notification: EarningsNotificationData): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          sound: true,
          badge: 1,
        },
        trigger: null, // Show immediately
      });

      return notificationId;
    } catch (error) {
      return null;
    }
  }

  /**
   * Show earnings notification
   */
  async showEarningsNotification(amount: number, source: string) {
    await this.scheduleLocalNotification({
      type: 'earnings',
      title: '💰 New Earnings!',
      body: `You earned ₹${amount} from ${source}`,
      data: { type: 'earnings', amount, source },
    });
  }

  /**
   * Show project approved notification
   */
  async showProjectApprovedNotification(projectTitle: string, amount: number) {
    await this.scheduleLocalNotification({
      type: 'project_approved',
      title: '✅ Project Approved!',
      body: `${projectTitle} has been approved. You earned ₹${amount}`,
      data: { type: 'project_approved', projectTitle, amount },
    });
  }

  /**
   * Show project rejected notification
   */
  async showProjectRejectedNotification(projectTitle: string, reason?: string) {
    await this.scheduleLocalNotification({
      type: 'project_rejected',
      title: '❌ Project Rejected',
      body: reason 
        ? `${projectTitle} was rejected: ${reason}`
        : `${projectTitle} was rejected. Please check the requirements.`,
      data: { type: 'project_rejected', projectTitle, reason },
    });
  }

  /**
   * Show withdrawal notification
   */
  async showWithdrawalNotification(amount: number, status: 'pending' | 'completed' | 'failed') {
    const statusText = {
      pending: 'is pending',
      completed: 'has been processed',
      failed: 'failed',
    };

    await this.scheduleLocalNotification({
      type: 'withdrawal',
      title: `💸 Withdrawal ${status === 'completed' ? 'Completed' : status === 'failed' ? 'Failed' : 'Pending'}`,
      body: `Your withdrawal of ₹${amount} ${statusText[status]}`,
      data: { type: 'withdrawal', amount, status },
    });
  }

  /**
   * Show milestone notification
   */
  async showMilestoneNotification(milestone: string, reward: number) {
    await this.scheduleLocalNotification({
      type: 'milestone',
      title: '🎯 Milestone Reached!',
      body: `You reached ${milestone} and earned ₹${reward}`,
      data: { type: 'milestone', milestone, reward },
    });
  }

  /**
   * Set up notification listeners
   */
  setupListeners(
    onNotificationReceived?: (notification: Notifications.Notification) => void,
    onNotificationTapped?: (response: Notifications.NotificationResponse) => void
  ) {
    // Remove existing listeners
    this.removeListeners();

    // Listen for notifications received while app is in foreground
    this.notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      if (onNotificationReceived) {
        onNotificationReceived(notification);
      }
    });

    // Listen for notification taps
    this.responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      if (onNotificationTapped) {
        onNotificationTapped(response);
      }
    });
  }

  /**
   * Remove notification listeners
   */
  removeListeners() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
      this.notificationListener = null;
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
      this.responseListener = null;
    }
  }

  /**
   * Cancel all notifications
   */
  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
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
  async setBadgeCount(count: number) {
    await Notifications.setBadgeCountAsync(count);
  }
}

export default EarningsNotificationService.getInstance();

