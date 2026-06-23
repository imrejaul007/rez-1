import { logger } from '../config/logger';
import pushNotificationService from './pushNotificationService';
/**
 * Merchant Notification Service
 * Handles all notifications sent to merchants for their business operations
 *
 * This service creates notifications for merchants when important events occur:
 * - New orders received
 * - Order status changes
 * - Cashback requests
 * - Low stock alerts
 * - Payment/withdrawal updates
 * - Team member changes
 * - Reviews received
 */

import { Types } from 'mongoose';
import { Notification } from '../models/Notification';
import { Merchant } from '../models/Merchant';
import { Store } from '../models/Store';
import { getIO } from '../config/socket';
import SMSService from './SMSService';
import { EmailService } from './EmailService';

// Notification categories matching the Notification model
type NotificationCategory = 'order' | 'earning' | 'general' | 'promotional' | 'social' | 'security' | 'system' | 'reminder';
type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'promotional';
type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

interface CreateNotificationParams {
  merchantId: string | Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  data?: {
    orderId?: string;
    productId?: string;
    transactionId?: string;
    storeId?: string;
    amount?: number;
    deepLink?: string;
    actionButton?: {
      text: string;
      action: 'navigate' | 'api_call' | 'external_link';
      target: string;
    };
    metadata?: Record<string, any>;
  };
}

class MerchantNotificationService {
  /**
   * Send SMS/Email for critical notifications
   */
  private async sendCriticalChannels(
    merchantId: string,
    title: string,
    message: string,
    priority: NotificationPriority
  ): Promise<void> {
    // Only send SMS/Email for high and urgent priority notifications
    if (priority !== 'high' && priority !== 'urgent') {
      return;
    }

    try {
      // Get merchant contact info
      const merchant = await Merchant.findById(merchantId).select('phone email businessName').lean();

      if (!merchant) {
        logger.warn(`⚠️ [MERCHANT NOTIFICATION] Merchant not found for SMS/Email: ${merchantId}`);
        return;
      }

      // Send SMS for urgent notifications
      if (merchant.phone && priority === 'urgent') {
        try {
          const formattedPhone = SMSService.formatPhoneNumber(merchant.phone);
          await SMSService.send({
            to: formattedPhone,
            message: `[${merchant.businessName || 'Rez'}] ${title}: ${message.substring(0, 140)}`,
          });
          logger.info(`📱 [MERCHANT NOTIFICATION] SMS sent to ${formattedPhone}`);
        } catch (smsError) {
          logger.warn('⚠️ [MERCHANT NOTIFICATION] Failed to send SMS:', smsError);
        }
      }

      // Send Email for high and urgent priority
      if (merchant.email) {
        try {
          await EmailService.send({
            to: merchant.email,
            subject: `[${priority === 'urgent' ? '🚨 URGENT' : '⚠️ Important'}] ${title}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: ${priority === 'urgent' ? '#dc3545' : '#ffc107'}; color: ${priority === 'urgent' ? 'white' : 'black'}; padding: 20px; text-align: center;">
                  <h1 style="margin: 0;">${title}</h1>
                </div>
                <div style="padding: 20px; background: #f8f9fa;">
                  <p style="font-size: 16px; line-height: 1.6;">${message}</p>
                  <p style="margin-top: 20px;">
                    <a href="${process.env.MERCHANT_APP_URL || 'https://merchant.rezapp.in'}"
                       style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
                      Open Dashboard
                    </a>
                  </p>
                </div>
                <div style="padding: 15px; text-align: center; font-size: 12px; color: #666;">
                  <p>This is an automated notification from ${merchant.businessName || 'Rez'}.</p>
                </div>
              </div>
            `,
          });
          logger.info(`📧 [MERCHANT NOTIFICATION] Email sent to ${merchant.email}`);
        } catch (emailError) {
          logger.warn('⚠️ [MERCHANT NOTIFICATION] Failed to send email:', emailError);
        }
      }
    } catch (error) {
      logger.error('❌ [MERCHANT NOTIFICATION] Error sending critical channels:', error);
    }
  }

  /**
   * Create a notification for a merchant
   */
  async createNotification(params: CreateNotificationParams): Promise<any> {
    try {
      const deliveryChannels = ['in_app', 'push'];

      // Add email/sms channels for high priority notifications
      if (params.priority === 'high' || params.priority === 'urgent') {
        deliveryChannels.push('email');
        if (params.priority === 'urgent') {
          deliveryChannels.push('sms');
        }
      }

      const notification = await Notification.create({
        user: new Types.ObjectId(params.merchantId.toString()),
        title: params.title,
        message: params.message,
        type: params.type,
        category: params.category,
        priority: params.priority,
        data: params.data,
        deliveryChannels,
        deliveryStatus: {
          inApp: {
            delivered: true,
            deliveredAt: new Date(),
            read: false,
          },
        },
        source: 'system',
        isRead: false,
        isArchived: false,
      });

      // Emit real-time notification via Socket.IO
      this.emitNotification(params.merchantId.toString(), notification);

      // Send push notification (non-blocking)
      if (deliveryChannels.includes('in_app') || params.priority === 'high' || params.priority === 'urgent') {
        pushNotificationService.sendPushToMerchant(params.merchantId.toString(), {
          title: params.title,
          body: params.message,
          data: {
            notificationId: notification._id?.toString(),
            category: params.category,
            deepLink: params.data?.deepLink,
            ...params.data?.metadata,
          },
          channelId: 'merchant-alerts',
          priority: params.priority === 'urgent' ? 'high' : 'default',
        }).catch(err => logger.error('Error sending merchant push:', err));
      }

      // Send SMS/Email for critical notifications (non-blocking)
      this.sendCriticalChannels(
        params.merchantId.toString(),
        params.title,
        params.message,
        params.priority
      ).catch(err => logger.error('Error sending critical channels:', err));

      logger.info(`📬 [MERCHANT NOTIFICATION] Created: ${params.title} for merchant ${params.merchantId}`);
      return notification;
    } catch (error) {
      logger.error('❌ [MERCHANT NOTIFICATION] Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Emit notification via Socket.IO for real-time updates
   */
  private emitNotification(merchantId: string, notification: any): void {
    try {
      const io = getIO();
      if (io) {
        // Emit to merchant-specific room
        io.to(`merchant:${merchantId}`).emit('notification:new', {
          id: notification._id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          category: notification.category,
          priority: notification.priority,
          createdAt: notification.createdAt,
        });

        // Also emit unread count update
        this.emitUnreadCount(merchantId);
      }
    } catch (error) {
      logger.error('❌ [MERCHANT NOTIFICATION] Socket emit error:', error);
    }
  }

  /**
   * Emit updated unread count to merchant
   */
  private async emitUnreadCount(merchantId: string): Promise<void> {
    try {
      const io = getIO();
      if (!io) return;

      const unreadCount = await Notification.countDocuments({
        user: new Types.ObjectId(merchantId),
        isRead: false,
        isArchived: false,
        deletedAt: { $exists: false },
      });

      // Get count by category
      const byType = await Notification.aggregate([
        {
          $match: {
            user: new Types.ObjectId(merchantId),
            isRead: false,
            isArchived: false,
            deletedAt: { $exists: false },
          },
        },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
          },
        },
      ]);

      const byTypeMap: Record<string, number> = {};
      byType.forEach((item: any) => {
        byTypeMap[item._id] = item.count;
      });

      io.to(`merchant:${merchantId}`).emit('notification:unread-count', {
        count: unreadCount,
        byType: byTypeMap,
      });
    } catch (error) {
      logger.error('❌ [MERCHANT NOTIFICATION] Error emitting unread count:', error);
    }
  }

  // ============================================
  // ORDER NOTIFICATIONS
  // ============================================

  /**
   * Notify merchant when a new order is received
   */
  async notifyNewOrder(params: {
    merchantId: string;
    orderId: string;
    orderNumber: string;
    customerName: string;
    totalAmount: number;
    itemCount: number;
    paymentMethod: string;
  }): Promise<void> {
    await this.createNotification({
      merchantId: params.merchantId,
      title: 'New Order Received! 🎉',
      message: `Order #${params.orderNumber} from ${params.customerName} for ₹${params.totalAmount.toLocaleString()} (${params.itemCount} items)`,
      type: 'success',
      category: 'order',
      priority: 'high',
      data: {
        orderId: params.orderId,
        amount: params.totalAmount,
        deepLink: `/orders/${params.orderId}`,
        actionButton: {
          text: 'View Order',
          action: 'navigate',
          target: `/orders/${params.orderId}`,
        },
        metadata: {
          orderNumber: params.orderNumber,
          customerName: params.customerName,
          itemCount: params.itemCount,
          paymentMethod: params.paymentMethod,
        },
      },
    });
  }

  /**
   * Notify merchant when payment is confirmed for an order
   */
  async notifyPaymentReceived(params: {
    merchantId: string;
    orderId: string;
    orderNumber: string;
    amount: number;
    paymentMethod: string;
  }): Promise<void> {
    await this.createNotification({
      merchantId: params.merchantId,
      title: 'Payment Received 💰',
      message: `Payment of ₹${params.amount.toLocaleString()} received for Order #${params.orderNumber} via ${params.paymentMethod}`,
      type: 'success',
      category: 'earning',
      priority: 'medium',
      data: {
        orderId: params.orderId,
        amount: params.amount,
        deepLink: `/orders/${params.orderId}`,
        metadata: {
          orderNumber: params.orderNumber,
          paymentMethod: params.paymentMethod,
        },
      },
    });
  }

  /**
   * Notify merchant when an in-store payment is completed
   */
  async notifyStorePaymentReceived(params: {
    merchantId: string;
    paymentId: string;
    storeName: string;
    amount: number;
    paymentMethod: string;
    coinsUsed: number;
    cashbackAwarded: number;
  }): Promise<void> {
    await this.createNotification({
      merchantId: params.merchantId,
      title: 'In-Store Payment Received',
      message: `Payment of ₹${params.amount.toLocaleString()} at ${params.storeName} via ${params.paymentMethod}`,
      type: 'success',
      category: 'earning',
      priority: 'medium',
      data: {
        amount: params.amount,
        deepLink: '/(dashboard)/payments',
        metadata: {
          paymentId: params.paymentId,
          paymentMethod: params.paymentMethod,
          coinsUsed: params.coinsUsed,
          cashbackAwarded: params.cashbackAwarded,
        },
      },
    });
  }

  /**
   * Notify merchant when customer requests cancellation
   */
  async notifyOrderCancellationRequest(params: {
    merchantId: string;
    orderId: string;
    orderNumber: string;
    customerName: string;
    reason?: string;
  }): Promise<void> {
    await this.createNotification({
      merchantId: params.merchantId,
      title: 'Cancellation Requested ⚠️',
      message: `${params.customerName} requested to cancel Order #${params.orderNumber}${params.reason ? `: "${params.reason}"` : ''}`,
      type: 'warning',
      category: 'order',
      priority: 'urgent',
      data: {
        orderId: params.orderId,
        deepLink: `/orders/${params.orderId}`,
        actionButton: {
          text: 'Review Request',
          action: 'navigate',
          target: `/orders/${params.orderId}`,
        },
        metadata: {
          orderNumber: params.orderNumber,
          customerName: params.customerName,
          reason: params.reason,
        },
      },
    });
  }

  /**
   * Notify merchant when order is cancelled
   */
  async notifyOrderCancelled(params: {
    merchantId: string;
    orderId: string;
    orderNumber: string;
    reason?: string;
    cancelledBy: 'customer' | 'merchant' | 'system';
  }): Promise<void> {
    await this.createNotification({
      merchantId: params.merchantId,
      title: 'Order Cancelled',
      message: `Order #${params.orderNumber} has been cancelled${params.cancelledBy !== 'merchant' ? ` by ${params.cancelledBy}` : ''}${params.reason ? `. Reason: ${params.reason}` : ''}`,
      type: 'warning',
      category: 'order',
      priority: 'medium',
      data: {
        orderId: params.orderId,
        deepLink: `/orders/${params.orderId}`,
        metadata: {
          orderNumber: params.orderNumber,
          reason: params.reason,
          cancelledBy: params.cancelledBy,
        },
      },
    });
  }

  /**
   * Notify merchant when refund is requested
   */
  async notifyRefundRequested(params: {
    merchantId: string;
    orderId: string;
    orderNumber: string;
    refundAmount: number;
    reason?: string;
  }): Promise<void> {
    await this.createNotification({
      merchantId: params.merchantId,
      title: 'Refund Requested',
      message: `Refund of ₹${params.refundAmount.toLocaleString()} requested for Order #${params.orderNumber}`,
      type: 'warning',
      category: 'order',
      priority: 'high',
      data: {
        orderId: params.orderId,
        amount: params.refundAmount,
        deepLink: `/orders/${params.orderId}`,
        actionButton: {
          text: 'Process Refund',
          action: 'navigate',
          target: `/orders/${params.orderId}`,
        },
        metadata: {
          orderNumber: params.orderNumber,
          reason: params.reason,
        },
      },
    });
  }

  // ============================================
  // STORE VISIT NOTIFICATIONS
  // ============================================

  /**
   * Notify merchant when a new visit is scheduled or a walk-in joins the queue
   */
  async notifyNewVisit(params: {
    merchantId: string;
    visitId: string;
    visitNumber: string;
    customerName: string;
    visitDate: string;
    visitTime: string;
    visitType: 'scheduled' | 'queue' | 'rescheduled';
    queueNumber?: number;
    storeName: string;
  }): Promise<void> {
    const isQueue = params.visitType === 'queue';
    const isRescheduled = params.visitType === 'rescheduled';

    const title = isQueue
      ? 'New Walk-in Customer'
      : isRescheduled
        ? 'Visit Rescheduled'
        : 'New Visit Scheduled';

    const message = isQueue
      ? `${params.customerName} joined the queue (Queue #${params.queueNumber}) at ${params.storeName}`
      : isRescheduled
        ? `${params.customerName} rescheduled their visit at ${params.storeName} to ${params.visitDate} at ${params.visitTime}`
        : `${params.customerName} scheduled a visit at ${params.storeName} on ${params.visitDate} at ${params.visitTime}`;

    await this.createNotification({
      merchantId: params.merchantId,
      title,
      message,
      type: 'info',
      category: 'order',
      priority: isQueue ? 'high' : 'medium',
      data: {
        deepLink: `/store-visits/${params.visitId}`,
        actionButton: {
          text: 'View Visit',
          action: 'navigate',
          target: `/store-visits/${params.visitId}`,
        },
        metadata: {
          visitNumber: params.visitNumber,
          customerName: params.customerName,
          visitDate: params.visitDate,
          visitTime: params.visitTime,
          visitType: params.visitType,
          queueNumber: params.queueNumber,
        },
      },
    });
  }

  /**
   * Notify merchant when a visit is cancelled
   */
  async notifyVisitCancelled(params: {
    merchantId: string;
    visitId: string;
    visitNumber: string;
    customerName: string;
    storeName: string;
  }): Promise<void> {
    await this.createNotification({
      merchantId: params.merchantId,
      title: 'Visit Cancelled',
      message: `${params.customerName} cancelled visit #${params.visitNumber} at ${params.storeName}`,
      type: 'warning',
      category: 'order',
      priority: 'medium',
      data: {
        deepLink: `/store-visits/${params.visitId}`,
        metadata: {
          visitNumber: params.visitNumber,
          customerName: params.customerName,
        },
      },
    });
  }

  // ============================================
  // CASHBACK NOTIFICATIONS
  // ============================================

  /**
   * Notify merchant of new cashback request pending review
   */
  async notifyCashbackRequest(params: {
    merchantId: string;
    requestId: string;
    customerName: string;
    amount: number;
    riskScore?: number;
  }): Promise<void> {
    const isHighRisk = params.riskScore && params.riskScore > 70;

    await this.createNotification({
      merchantId: params.merchantId,
      title: isHighRisk ? 'High-Risk Cashback Request ⚠️' : 'New Cashback Request',
      message: `${params.customerName} requested ₹${params.amount.toLocaleString()} cashback${isHighRisk ? ' (flagged for review)' : ''}`,
      type: isHighRisk ? 'warning' : 'info',
      category: 'earning',
      priority: isHighRisk ? 'urgent' : 'medium',
      data: {
        transactionId: params.requestId,
        amount: params.amount,
        deepLink: `/cashback/${params.requestId}`,
        actionButton: {
          text: 'Review Request',
          action: 'navigate',
          target: `/cashback/${params.requestId}`,
        },
        metadata: {
          customerName: params.customerName,
          riskScore: params.riskScore,
        },
      },
    });
  }

  // ============================================
  // INVENTORY NOTIFICATIONS
  // ============================================

  /**
   * Notify merchant when product stock is low
   */
  async notifyLowStock(params: {
    merchantId: string;
    productId: string;
    productName: string;
    currentStock: number;
    threshold: number;
    storeId?: string;
  }): Promise<void> {
    await this.createNotification({
      merchantId: params.merchantId,
      title: 'Low Stock Alert ⚠️',
      message: `${params.productName} is running low - only ${params.currentStock} units left (threshold: ${params.threshold})`,
      type: 'warning',
      category: 'general',
      priority: 'high',
      data: {
        productId: params.productId,
        storeId: params.storeId,
        deepLink: `/products/${params.productId}/edit`,
        actionButton: {
          text: 'Update Stock',
          action: 'navigate',
          target: `/products/${params.productId}/edit`,
        },
        metadata: {
          productName: params.productName,
          currentStock: params.currentStock,
          threshold: params.threshold,
        },
      },
    });
  }

  /**
   * Notify merchant when product is out of stock
   */
  async notifyOutOfStock(params: {
    merchantId: string;
    productId: string;
    productName: string;
    storeId?: string;
  }): Promise<void> {
    await this.createNotification({
      merchantId: params.merchantId,
      title: 'Out of Stock! 🚨',
      message: `${params.productName} is now out of stock and has been automatically deactivated`,
      type: 'error',
      category: 'general',
      priority: 'urgent',
      data: {
        productId: params.productId,
        storeId: params.storeId,
        deepLink: `/products/${params.productId}/edit`,
        actionButton: {
          text: 'Restock Now',
          action: 'navigate',
          target: `/products/${params.productId}/edit`,
        },
        metadata: {
          productName: params.productName,
        },
      },
    });
  }

  // ============================================
  // WALLET/PAYMENT NOTIFICATIONS
  // ============================================

  /**
   * Notify merchant when withdrawal is processed
   */
  async notifyWithdrawalStatus(params: {
    merchantId: string;
    withdrawalId: string;
    amount: number;
    status: 'approved' | 'completed' | 'rejected';
    reason?: string;
  }): Promise<void> {
    const titles: Record<string, string> = {
      approved: 'Withdrawal Approved',
      completed: 'Withdrawal Completed ✅',
      rejected: 'Withdrawal Rejected',
    };

    const messages: Record<string, string> = {
      approved: `Your withdrawal request for ₹${params.amount.toLocaleString()} has been approved and is being processed`,
      completed: `₹${params.amount.toLocaleString()} has been transferred to your bank account`,
      rejected: `Your withdrawal request for ₹${params.amount.toLocaleString()} was rejected${params.reason ? `: ${params.reason}` : ''}`,
    };

    await this.createNotification({
      merchantId: params.merchantId,
      title: titles[params.status],
      message: messages[params.status],
      type: params.status === 'rejected' ? 'error' : 'success',
      category: 'earning',
      priority: params.status === 'rejected' ? 'high' : 'medium',
      data: {
        transactionId: params.withdrawalId,
        amount: params.amount,
        deepLink: '/wallet',
        metadata: {
          status: params.status,
          reason: params.reason,
        },
      },
    });
  }

  /**
   * Notify merchant of daily/weekly earnings summary
   */
  async notifyEarningsSummary(params: {
    merchantId: string;
    period: 'daily' | 'weekly';
    totalEarnings: number;
    orderCount: number;
    comparedToLastPeriod?: number; // percentage change
  }): Promise<void> {
    const periodLabel = params.period === 'daily' ? 'Today' : 'This Week';
    const trend = params.comparedToLastPeriod
      ? params.comparedToLastPeriod > 0
        ? `↑ ${params.comparedToLastPeriod}%`
        : `↓ ${Math.abs(params.comparedToLastPeriod)}%`
      : '';

    await this.createNotification({
      merchantId: params.merchantId,
      title: `${periodLabel}'s Earnings Summary 📊`,
      message: `You earned ₹${params.totalEarnings.toLocaleString()} from ${params.orderCount} orders ${trend}`,
      type: 'info',
      category: 'earning',
      priority: 'low',
      data: {
        amount: params.totalEarnings,
        deepLink: '/analytics',
        metadata: {
          period: params.period,
          orderCount: params.orderCount,
          percentageChange: params.comparedToLastPeriod,
        },
      },
    });
  }

  // ============================================
  // TEAM NOTIFICATIONS
  // ============================================

  /**
   * Notify merchant when team member joins
   */
  async notifyTeamMemberJoined(params: {
    merchantId: string;
    memberName: string;
    memberEmail: string;
    role: string;
  }): Promise<void> {
    await this.createNotification({
      merchantId: params.merchantId,
      title: 'New Team Member Joined',
      message: `${params.memberName} (${params.memberEmail}) has joined as ${params.role}`,
      type: 'info',
      category: 'social',
      priority: 'low',
      data: {
        deepLink: '/team',
        metadata: {
          memberName: params.memberName,
          memberEmail: params.memberEmail,
          role: params.role,
        },
      },
    });
  }

  // ============================================
  // REVIEW NOTIFICATIONS
  // ============================================

  /**
   * Notify merchant of new review
   */
  async notifyNewReview(params: {
    merchantId: string;
    productId?: string;
    storeId?: string;
    reviewerName: string;
    rating: number;
    comment?: string;
  }): Promise<void> {
    const isNegative = params.rating < 3;

    await this.createNotification({
      merchantId: params.merchantId,
      title: isNegative ? 'New Review Needs Attention ⚠️' : 'New Review Received ⭐',
      message: `${params.reviewerName} left a ${params.rating}-star review${params.comment ? `: "${params.comment.substring(0, 50)}${params.comment.length > 50 ? '...' : ''}"` : ''}`,
      type: isNegative ? 'warning' : 'info',
      category: 'social',
      priority: isNegative ? 'high' : 'medium',
      data: {
        productId: params.productId,
        storeId: params.storeId,
        deepLink: params.productId ? `/products/${params.productId}` : '/reviews',
        metadata: {
          reviewerName: params.reviewerName,
          rating: params.rating,
          comment: params.comment,
        },
      },
    });
  }

  // ============================================
  // SYSTEM NOTIFICATIONS
  // ============================================

  /**
   * Notify merchant of system updates or maintenance
   */
  async notifySystemUpdate(params: {
    merchantId: string;
    title: string;
    message: string;
    priority?: NotificationPriority;
  }): Promise<void> {
    await this.createNotification({
      merchantId: params.merchantId,
      title: params.title,
      message: params.message,
      type: 'info',
      category: 'system',
      priority: params.priority || 'low',
      data: {},
    });
  }
  /**
   * Notify merchant when a creator submits a pick for their store/product
   */
  async notifyNewCreatorPick(params: {
    merchantId: string;
    storeId: string;
    pickTitle: string;
    creatorName: string;
    productName: string;
    pickId: string;
  }): Promise<void> {
    await this.createNotification({
      merchantId: params.merchantId,
      title: 'New Creator Pick',
      message: `${params.creatorName} wants to promote "${params.productName}" — review and approve their pick.`,
      type: 'info',
      category: 'general',
      priority: 'medium',
      data: {
        storeId: params.storeId,
        deepLink: `/stores/${params.storeId}/creator-analytics`,
        actionButton: {
          text: 'Review Pick',
          action: 'navigate',
          target: `/stores/${params.storeId}/creator-analytics`,
        },
        metadata: {
          pickId: params.pickId,
          pickTitle: params.pickTitle,
          creatorName: params.creatorName,
          productName: params.productName,
        },
      },
    });
  }
  /**
   * Notify merchant when a customer requests the bill at a table
   */
  async notifyBillRequest(params: {
    merchantId: string;
    tableNumber: string;
    total: number;
    ordersCount: number;
  }): Promise<void> {
    try {
      await this.createNotification({
        merchantId: params.merchantId,
        title: `Bill Requested — Table ${params.tableNumber}`,
        message: `Table ${params.tableNumber} is ready to pay. Total: ${params.total.toFixed(2)} (${params.ordersCount} order${params.ordersCount > 1 ? 's' : ''})`,
        type: 'info',
        category: 'order',
        priority: 'high',
        data: {
          metadata: {
            type: 'bill_request',
            tableNumber: params.tableNumber,
            total: params.total,
            ordersCount: params.ordersCount,
          },
        },
      });

      // Real-time socket event to merchant dashboard
      try {
        const io = getIO();
        if (io) {
          io.to(`merchant-${params.merchantId}`).emit('order-event', {
            type: 'bill_request',
            merchantId: params.merchantId,
            data: {
              tableNumber: params.tableNumber,
              total: params.total,
              ordersCount: params.ordersCount,
            },
            timestamp: new Date(),
          });
        }
      } catch {
        // Socket is best-effort
      }
    } catch (err) {
      logger.error('[MERCHANT NOTIF] Bill request notification failed:', err);
    }
  }

  // Generic notify — used by jobs (e.g., appointmentReminderJob) that emit generic events.
  // Stores a Notification document so merchants see it in-app, and emits a BullMQ event
  // for the notification-service consumer to deliver push/email/SMS downstream.
  // Phase 4 stub replacement: production-architecture-compatible (DB persist + event emit).
  async notify(params: {
    merchantId: string;
    type: string;
    title: string;
    message: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    data?: Record<string, any>;
  }): Promise<any> {
    try {
      // Persist to DB so merchant sees it in their notification center
      await Notification.create({
        recipient: new Types.ObjectId(params.merchantId),
        recipientType: 'merchant',
        type: params.type,
        title: params.title,
        message: params.message,
        priority: params.priority || 'normal',
        data: params.data || {},
        isRead: false,
        delivered: { push: false, email: false, sms: false, inApp: true },
      });

      // Emit to BullMQ for downstream delivery (push/email/SMS) — production-architecture-compatible.
      // The notification-service consumer (if deployed) will pick this up.
      try {
        const { getNotifQueue } = require('../config/queue.config');
        await getNotifQueue().add('merchant-notify', {
          eventId: `mnotif-${params.merchantId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          eventType: 'merchant_notification',
          channels: ['push'],
          userId: params.merchantId,
          payload: {
            title: params.title,
            body: params.message,
            data: params.data || {},
          },
          createdAt: new Date().toISOString(),
        });
      } catch (queueErr: any) {
        // Queue unavailable is non-fatal — notification is already persisted.
        logger.warn('[MERCHANT NOTIF] Queue unavailable, notification stored in DB only', {
          error: queueErr.message,
        });
      }

      logger.debug('[MERCHANT NOTIF] Generic notify dispatched', {
        merchantId: params.merchantId,
        type: params.type,
      });
      return { success: true };
    } catch (err: any) {
      logger.error('[MERCHANT NOTIF] notify() failed:', err.message);
      // Do not throw — caller (cron job) should not fail because notification delivery failed.
      return { success: false, error: err.message };
    }
  }
}

// Export singleton instance
const merchantNotificationService = new MerchantNotificationService();
export default merchantNotificationService;
export { MerchantNotificationService };
