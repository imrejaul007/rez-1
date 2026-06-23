import { Types } from 'mongoose';
import { Notification, INotification, INotificationData } from '../models/Notification';
import { UserSettings } from '../models/UserSettings';
import { getIO } from '../config/socket';
import { SocketRoom } from '../types/socket';
import pushNotificationService from './pushNotificationService';
import { QueueService } from './QueueService';
import redisService from './redisService';
import { createServiceLogger } from '../config/logger';

const logger = createServiceLogger('notification-service');

// ── Reward push throttle config ──────────────────────────
const MAX_REWARD_PUSH_PER_DAY = 3;
const REWARD_PUSH_COOLDOWN_SECONDS = 60; // 1 minute between reward pushes

/**
 * Notification Service
 * Helper functions for creating and managing notifications
 */

export interface CreateNotificationOptions {
  userId: string | Types.ObjectId;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error' | 'promotional';
  category: 'order' | 'earning' | 'general' | 'promotional' | 'social' | 'security' | 'system' | 'reminder';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  data?: INotificationData;
  deliveryChannels?: ('push' | 'email' | 'sms' | 'in_app')[];
  scheduledAt?: Date;
  expiresAt?: Date;
  source?: 'system' | 'admin' | 'automated' | 'campaign';
  template?: string;
  variables?: { [key: string]: any };
}

export class NotificationService {
  /**
   * Create a new notification
   * Automatically emits Socket.IO event for real-time delivery
   */
  static async createNotification(options: CreateNotificationOptions): Promise<INotification> {
    const {
      userId,
      title,
      message,
      type = 'info',
      category,
      priority = 'medium',
      data = {},
      deliveryChannels = ['in_app'],
      scheduledAt,
      expiresAt,
      source = 'system',
      template,
      variables
    } = options;

    // Check user preferences to determine delivery channels
    const userSettings = await UserSettings.findOne({ user: userId }).lean();
    const finalDeliveryChannels = this.determineDeliveryChannels(
      deliveryChannels,
      category,
      userSettings
    );

    // Create notification
    const notification = await Notification.create({
      user: userId,
      title,
      message,
      type,
      category,
      priority,
      data,
      deliveryChannels: finalDeliveryChannels,
      scheduledAt,
      expiresAt,
      source,
      template,
      variables
    });

    // Emit real-time notification via Socket.IO
    if (!scheduledAt || scheduledAt <= new Date()) {
      this.emitNotificationToUser(userId.toString(), notification);

      // Send push notification if channel is enabled
      if (finalDeliveryChannels.includes('push')) {
        // Throttle reward push notifications (max 3/day + 60s cooldown)
        const shouldSkipPush = category === 'earning'
          ? await this.shouldThrottleRewardPush(userId.toString())
          : false;

        if (!shouldSkipPush) {
          const pushData = {
            notificationId: notification._id?.toString() || '',
            type: category,
            ...data
          };
          // Enqueue push via Bull queue (retries + persistence). Falls back to direct send if Redis is down.
          QueueService.sendPushNotification({
            notificationId: notification._id?.toString() || '',
            userId: userId.toString(),
            title,
            body: message,
            data: pushData,
            channelId: category === 'order' ? 'orders' : category === 'earning' ? 'earnings' : 'default',
            priority: priority === 'urgent' || priority === 'high' ? 'high' : 'default'
          }).catch(err => logger.error('Push enqueue failed', { userId: userId.toString(), error: err.message }));
        }
      }
    }

    return notification;
  }

  /**
   * Create bulk notifications
   * Efficient batch creation for multiple users
   */
  static async createBulkNotifications(
    userIds: (string | Types.ObjectId)[],
    options: Omit<CreateNotificationOptions, 'userId'>
  ): Promise<INotification[]> {
    const batchId = `BATCH_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const notifications = await Promise.all(
      userIds.map(userId =>
        this.createNotification({
          ...options,
          userId
        })
      )
    );

    return notifications;
  }

  /**
   * Check if a reward push notification should be throttled.
   * Enforces max 3 reward pushes per day + 60s cooldown between pushes.
   * Fail-open: returns false (allow) if Redis is unavailable.
   */
  private static async shouldThrottleRewardPush(userId: string): Promise<boolean> {
    try {
      // 1. Cooldown check — minimum gap between reward pushes
      const cooldownKey = `notify:cooldown:earning:${userId}`;
      const inCooldown = await redisService.get(cooldownKey);
      if (inCooldown) {
        logger.info('Reward push throttled (cooldown)', { userId });
        return true;
      }

      // 2. Daily limit check — max N reward pushes per 24h
      const dailyKey = `notify:daily:earning:${userId}`;
      const count = await redisService.atomicIncr(dailyKey, 86400);
      if (count !== null && count > MAX_REWARD_PUSH_PER_DAY) {
        logger.info('Reward push throttled (daily limit)', { userId, count });
        return true;
      }

      // 3. Set cooldown for this push (only if we're allowing it)
      await redisService.set(cooldownKey, '1', REWARD_PUSH_COOLDOWN_SECONDS);

      return false;
    } catch {
      // Fail-open: don't block notifications if Redis is down
      return false;
    }
  }

  /**
   * Determine delivery channels based on user preferences.
   * Checks both the master enable toggle AND granular category-level preferences.
   */
  private static determineDeliveryChannels(
    requestedChannels: ('push' | 'email' | 'sms' | 'in_app')[],
    category: string,
    userSettings: any
  ): ('push' | 'email' | 'sms' | 'in_app')[] {
    if (!userSettings || !userSettings.notifications) {
      return requestedChannels;
    }

    const { push, email, sms, inApp } = userSettings.notifications;
    const allowedChannels: ('push' | 'email' | 'sms' | 'in_app')[] = [];

    // Check push: master toggle + granular category preference
    if (requestedChannels.includes('push') && push?.enabled) {
      if (this.isCategoryAllowedForPush(category, push)) {
        allowedChannels.push('push');
      }
    }

    // Check email: master toggle + granular category preference
    if (requestedChannels.includes('email') && email?.enabled) {
      if (this.isCategoryAllowedForEmail(category, email)) {
        allowedChannels.push('email');
      }
    }

    // Check sms: master toggle + granular category preference
    if (requestedChannels.includes('sms') && sms?.enabled) {
      if (this.isCategoryAllowedForSMS(category, sms)) {
        allowedChannels.push('sms');
      }
    }

    if (requestedChannels.includes('in_app') && inApp?.enabled !== false) {
      allowedChannels.push('in_app');
    }

    // Always include in_app as fallback
    if (allowedChannels.length === 0) {
      allowedChannels.push('in_app');
    }

    return allowedChannels;
  }

  /** Map notification category to push sub-preferences */
  private static isCategoryAllowedForPush(category: string, push: any): boolean {
    switch (category) {
      case 'order': return push.orderUpdates !== false;
      case 'promotional': return push.promotions !== false;
      case 'security': return push.securityAlerts !== false;
      case 'earning': return push.paymentUpdates !== false;
      case 'social': return push.chatMessages !== false;
      case 'reminder': return push.recommendations !== false;
      default: return true; // general, system — always allowed if master is on
    }
  }

  /** Map notification category to email sub-preferences */
  private static isCategoryAllowedForEmail(category: string, email: any): boolean {
    switch (category) {
      case 'order': return email.orderReceipts !== false;
      case 'promotional': return email.promotions !== false;
      case 'security': return email.securityAlerts !== false;
      case 'earning': return email.accountUpdates !== false;
      default: return true;
    }
  }

  /** Map notification category to SMS sub-preferences */
  private static isCategoryAllowedForSMS(category: string, sms: any): boolean {
    switch (category) {
      case 'order': return sms.orderUpdates !== false;
      case 'earning': return sms.paymentConfirmations !== false;
      case 'security': return sms.securityAlerts !== false;
      default: return true;
    }
  }

  /**
   * Emit notification to user via Socket.IO
   */
  private static emitNotificationToUser(userId: string, notification: INotification): void {
    try {
      const io = getIO();
      const room = SocketRoom.user(userId);

      io.to(room).emit('notification:new', {
        notification: notification.toObject(),
        timestamp: new Date()
      });

      // Also emit unread count update
      this.emitUnreadCount(userId);
    } catch (error) {
      logger.error('Failed to emit notification via Socket.IO:', error);
    }
  }

  /**
   * Emit updated unread count to user
   */
  static async emitUnreadCount(userId: string): Promise<void> {
    try {
      const unreadCount = await Notification.countDocuments({
        user: userId,
        isRead: false,
        isArchived: false,
        deletedAt: { $exists: false }
      });

      const io = getIO();
      io.to(SocketRoom.user(userId)).emit('notification:count', {
        count: unreadCount,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Failed to emit unread count:', error);
    }
  }

  /**
   * Helper: Create order notification
   */
  static async notifyOrderUpdate(
    userId: string | Types.ObjectId,
    orderId: string,
    status: string,
    orderNumber?: string
  ): Promise<INotification> {
    const statusMessages: { [key: string]: { title: string; message: string; type: any; priority: any } } = {
      placed: {
        title: 'Order Placed Successfully',
        message: `Your order ${orderNumber || orderId} has been placed successfully.`,
        type: 'success',
        priority: 'medium'
      },
      confirmed: {
        title: 'Order Confirmed',
        message: `Your order ${orderNumber || orderId} has been confirmed and is being prepared.`,
        type: 'success',
        priority: 'medium'
      },
      shipped: {
        title: 'Order Shipped',
        message: `Your order ${orderNumber || orderId} has been shipped and is on its way!`,
        type: 'info',
        priority: 'high'
      },
      delivered: {
        title: 'Order Delivered',
        message: `Your order ${orderNumber || orderId} has been delivered. Enjoy your purchase!`,
        type: 'success',
        priority: 'high'
      },
      cancelled: {
        title: 'Order Cancelled',
        message: `Your order ${orderNumber || orderId} has been cancelled.`,
        type: 'warning',
        priority: 'high'
      }
    };

    const statusInfo = statusMessages[status] || {
      title: 'Order Update',
      message: `Your order ${orderNumber || orderId} status has been updated to ${status}.`,
      type: 'info' as any,
      priority: 'medium' as any
    };

    return this.createNotification({
      userId,
      title: statusInfo.title,
      message: statusInfo.message,
      type: statusInfo.type,
      category: 'order',
      priority: statusInfo.priority,
      data: {
        orderId,
        deepLink: `/orders/${orderId}`,
        actionButton: {
          text: 'View Order',
          action: 'navigate',
          target: `/orders/${orderId}`
        }
      },
      deliveryChannels: ['push', 'email', 'sms', 'in_app']
    });
  }

  /**
   * Helper: Create earning notification
   */
  static async notifyEarning(
    userId: string | Types.ObjectId,
    amount: number,
    source: string,
    transactionId?: string
  ): Promise<INotification> {
    return this.createNotification({
      userId,
      title: 'Coins Earned!',
      message: `You've earned ${amount} coins from ${source}!`,
      type: 'success',
      category: 'earning',
      priority: 'medium',
      data: {
        amount,
        transactionId,
        deepLink: '/wallet',
        actionButton: {
          text: 'View Wallet',
          action: 'navigate',
          target: '/wallet'
        }
      },
      deliveryChannels: ['push', 'in_app']
    });
  }

  /**
   * Helper: Create promotional notification
   */
  static async notifyPromotion(
    userId: string | Types.ObjectId,
    title: string,
    message: string,
    imageUrl?: string,
    deepLink?: string
  ): Promise<INotification> {
    return this.createNotification({
      userId,
      title,
      message,
      type: 'promotional',
      category: 'promotional',
      priority: 'low',
      data: {
        imageUrl,
        deepLink,
        actionButton: deepLink ? {
          text: 'View Offer',
          action: 'navigate',
          target: deepLink
        } : undefined
      },
      deliveryChannels: ['push', 'in_app']
    });
  }

  /**
   * Helper: Create security alert
   */
  static async notifySecurityAlert(
    userId: string | Types.ObjectId,
    title: string,
    message: string,
    actionRequired?: boolean
  ): Promise<INotification> {
    return this.createNotification({
      userId,
      title,
      message,
      type: 'warning',
      category: 'security',
      priority: actionRequired ? 'urgent' : 'high',
      deliveryChannels: ['push', 'email', 'sms', 'in_app']
    });
  }

  /**
   * Helper: Create system notification
   */
  static async notifySystem(
    userId: string | Types.ObjectId,
    title: string,
    message: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'
  ): Promise<INotification> {
    return this.createNotification({
      userId,
      title,
      message,
      type: 'info',
      category: 'system',
      priority,
      deliveryChannels: ['in_app']
    });
  }

  /**
   * Helper: Create reminder notification
   */
  static async notifyReminder(
    userId: string | Types.ObjectId,
    title: string,
    message: string,
    scheduledAt?: Date
  ): Promise<INotification> {
    return this.createNotification({
      userId,
      title,
      message,
      type: 'info',
      category: 'reminder',
      priority: 'medium',
      scheduledAt,
      deliveryChannels: ['push', 'in_app']
    });
  }

  /**
   * Get user notification preferences
   */
  static async getUserPreferences(userId: string | Types.ObjectId): Promise<any> {
    const userSettings = await UserSettings.findOne({ user: userId }).lean();

    if (!userSettings) {
      // Return default preferences
      return {
        push: { enabled: true },
        email: { enabled: true },
        sms: { enabled: false },
        inApp: { enabled: true }
      };
    }

    return userSettings.notifications;
  }

  /**
   * Update user notification preferences
   */
  static async updateUserPreferences(
    userId: string | Types.ObjectId,
    preferences: any
  ): Promise<any> {
    const userSettings = await UserSettings.findOneAndUpdate(
      { user: userId },
      {
        $set: {
          notifications: preferences,
          lastUpdated: new Date()
        }
      },
      { new: true, upsert: true }
    );

    return userSettings?.notifications;
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string): Promise<INotification | null> {
    const notification = await Notification.findOne({
      _id: notificationId,
      user: userId
    });

    if (!notification) {
      return null;
    }

    await notification.markAsRead();
    this.emitUnreadCount(userId);

    return notification;
  }

  /**
   * Delete notification (soft delete)
   */
  static async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const result = await Notification.updateOne(
      {
        _id: notificationId,
        user: userId
      },
      {
        $set: { deletedAt: new Date() }
      }
    );

    if (result.modifiedCount > 0) {
      try {
        const io = getIO();
        io.to(SocketRoom.user(userId)).emit('notification:deleted', {
          notificationId,
          timestamp: new Date()
        });
      } catch (error) {
        logger.error('Socket emit error:', error);
      }
      return true;
    }

    return false;
  }

  /**
   * Get scheduled notifications ready for delivery
   */
  static async processScheduledNotifications(): Promise<number> {
    const scheduledNotifications = await Notification.find({
      scheduledAt: { $lte: new Date() },
      sentAt: { $exists: false },
      expiresAt: { $gt: new Date() }
    }).limit(100);

    for (const notification of scheduledNotifications) {
      this.emitNotificationToUser(notification.user.toString(), notification);

      // Mark as sent
      notification.sentAt = new Date();
      await notification.save();
    }

    return scheduledNotifications.length;
  }

  /**
   * Cleanup old notifications
   */
  static async cleanupOldNotifications(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await Notification.deleteMany({
      createdAt: { $lt: cutoffDate },
      isRead: true,
      isArchived: true
    });

    return result.deletedCount || 0;
  }

  // Phase 4 stub replacement: persist as in-app notification + emit a BullMQ event
  // for the notification-service consumer to deliver push/email/SMS.
  static async notifyOpportunity(userId: any, opportunity: any): Promise<any> {
    try {
      const { Notification } = await import('../models/Notification');
      const { Types } = await import('mongoose');
      const title = opportunity?.title || 'New opportunity for you';
      const body = opportunity?.message || opportunity?.body || 'Check out this new opportunity';
      await Notification.create({
        recipient: new Types.ObjectId(userId),
        recipientType: 'user',
        type: 'info',
        category: 'promotional',
        title,
        message: body,
        data: opportunity || {},
        isRead: false,
        delivered: { push: false, email: false, sms: false, inApp: true },
      });
      // Best-effort: emit a BullMQ event for downstream delivery if the queue is configured.
      // The notification-service consumer (if deployed) will pick this up.
      try {
        // Lazily load to avoid breaking import chains
        const qc: any = require('../config/queue.config');
        if (typeof qc.getNotifQueue === 'function') {
          await qc.getNotifQueue().add('user-notify', {
            eventId: `opp-${userId}-${Date.now()}`,
            eventType: 'user_notification',
            channels: ['push'],
            userId,
            payload: { title, body, data: opportunity || {} },
            createdAt: new Date().toISOString(),
          });
        }
      } catch {
        // Queue unavailable is non-fatal — notification is already persisted in DB.
      }
      return { success: true };
    } catch (err: any) {
      logger.error('[NOTIFY] notifyOpportunity failed:', err.message);
      return null;
    }
  }

  static async notifyProgress(userId: any, progress: any): Promise<any> {
    try {
      const { Notification } = await import('../models/Notification');
      const { Types } = await import('mongoose');
      const title = progress?.title || 'Progress update';
      const body = progress?.message || progress?.body || 'You made progress!';
      await Notification.create({
        recipient: new Types.ObjectId(userId),
        recipientType: 'user',
        type: 'info',
        category: 'general',
        title,
        message: body,
        data: progress || {},
        isRead: false,
        delivered: { push: false, email: false, sms: false, inApp: true },
      });
      try {
        const qc: any = require('../config/queue.config');
        if (typeof qc.getNotifQueue === 'function') {
          await qc.getNotifQueue().add('user-notify', {
            eventId: `prog-${userId}-${Date.now()}`,
            eventType: 'user_notification',
            channels: ['push'],
            userId,
            payload: { title, body, data: progress || {} },
            createdAt: new Date().toISOString(),
          });
        }
      } catch {
        // Queue unavailable is non-fatal
      }
      return { success: true };
    } catch (err: any) {
      logger.error('[NOTIFY] notifyProgress failed:', err.message);
      return null;
    }
  }
}

export default NotificationService;
