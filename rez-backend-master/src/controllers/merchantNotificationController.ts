import { logger } from '../config/logger';
import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Notification } from '../models/Notification';
import { UserSettings } from '../models/UserSettings';
import { MerchantUser } from '../models/MerchantUser';
import { sendSuccess, sendNotFound, sendError } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import { validateSortField } from '../utils/sanitize';
import { getIO } from '../config/socket';
import { SocketRoom } from '../types/socket';

/**
 * Transform notification from backend format to frontend expected format
 * Maps: _id → id, isRead/isArchived → status, category → type
 */
const transformNotificationForFrontend = (notification: any) => {
  // Determine status based on isRead and isArchived
  let status = 'unread';
  if (notification.isArchived) {
    status = 'archived';
  } else if (notification.isRead) {
    status = 'read';
  }

  // Map backend category to frontend type
  // Backend categories: order, earning, general, promotional, social, security, system, reminder
  // Frontend types: order, product, cashback, team, system, payment, marketing, review, inventory, analytics
  const categoryToTypeMap: Record<string, string> = {
    'order': 'order',
    'earning': 'cashback',
    'general': 'system',
    'promotional': 'marketing',
    'social': 'team',
    'security': 'system',
    'system': 'system',
    'reminder': 'system'
  };

  const mappedType = categoryToTypeMap[notification.category] || notification.category || 'system';

  return {
    // Include the id field (from _id)
    id: notification._id?.toString() || notification.id,
    _id: notification._id,

    // Core fields
    merchantId: notification.user?.toString(),
    title: notification.title,
    message: notification.message,

    // Map category to type for frontend compatibility
    type: mappedType,
    category: notification.category,

    // Map isRead/isArchived to status enum
    status: status,
    isRead: notification.isRead,
    isArchived: notification.isArchived,

    // Priority
    priority: notification.priority || 'medium',

    // Channels
    channels: notification.deliveryChannels || ['in_app'],

    // Related entity data
    relatedEntityType: notification.data?.orderId ? 'order' :
                       notification.data?.productId ? 'product' :
                       notification.data?.transactionId ? 'cashback' : undefined,
    relatedEntityId: notification.data?.orderId || notification.data?.productId || notification.data?.transactionId,
    relatedEntityData: notification.data,

    // Action URLs
    actionUrl: notification.data?.deepLink || notification.data?.externalLink,
    actionLabel: notification.data?.actionButton?.text,
    imageUrl: notification.data?.imageUrl,

    // Timestamps
    createdAt: notification.createdAt,
    updatedAt: notification.updatedAt,
    readAt: notification.readAt,
    archivedAt: notification.archivedAt,

    // Delivery status
    deliveryStatus: notification.deliveryStatus,
    sentAt: notification.sentAt,

    // Original backend fields for compatibility
    source: notification.source,
    template: notification.template
  };
};

/**
 * Get all notifications for merchant with filters and pagination
 * Enhanced with type, status, sorting filters
 */
export const getMerchantNotifications = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.merchantId!;

  if (!userId) {
    return sendError(res, 'Merchant ID not found. Authentication required.', 401);
  }

  const {
    type,
    status,
    category,
    sortBy = 'createdAt',
    order = 'desc',
    page = 1,
    limit = 20
  } = req.query;

  try {
    const query: any = {
      user: userId,
      isArchived: false,
      deletedAt: { $exists: false }
    };

    // Apply filters
    // Frontend sends 'type' which maps to backend 'category'
    // Map frontend type values to backend category values
    const typeToCategory: Record<string, string> = {
      'order': 'order',
      'product': 'general',
      'cashback': 'earning',
      'team': 'social',
      'system': 'system',
      'payment': 'earning',
      'marketing': 'promotional',
      'review': 'social',
      'inventory': 'general',
      'analytics': 'system'
    };

    if (type) {
      // Check if it's a frontend type that needs mapping
      const mappedCategory = typeToCategory[type as string];
      if (mappedCategory) {
        query.category = mappedCategory;
      } else {
        // Fallback: check both type and category fields
        query.$or = [{ type: type }, { category: type }];
      }
    }

    if (category) {
      query.category = category;
    }

    if (status === 'unread') {
      query.isRead = false;
    } else if (status === 'read') {
      query.isRead = true;
    }

    const skip = (Number(page) - 1) * Number(limit);

    // Build sort object (whitelist to prevent sort field injection)
    const ALLOWED_SORT_FIELDS = ['createdAt', 'updatedAt', 'priority', 'type', 'category'] as const;
    const safeSortBy = validateSortField(sortBy as string, ALLOWED_SORT_FIELDS, 'createdAt');
    const sortOrder = order === 'desc' ? -1 : 1;
    const sortObj: any = {};

    if (safeSortBy === 'priority') {
      // Custom priority sorting: urgent > high > medium > low
      sortObj.priority = sortOrder;
      sortObj.createdAt = -1; // Secondary sort by date
    } else {
      sortObj[safeSortBy] = sortOrder;
    }

    const notifications = await Notification.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      user: userId,
      isRead: false,
      isArchived: false,
      deletedAt: { $exists: false }
    });

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const totalPages = Math.ceil((total || 0) / limitNum);

    // Transform notifications to frontend format
    const transformedNotifications = (notifications || []).map(transformNotificationForFrontend);

    return sendSuccess(res, {
      items: transformedNotifications,
      notifications: transformedNotifications,
      unreadCount: unreadCount || 0,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: total || 0,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    }, 'Notifications retrieved successfully');
  } catch (error: any) {
    logger.error('Get merchant notifications error:', error);
    throw new AppError(error.message || 'Failed to fetch notifications', 500);
  }
});

/**
 * Get unread notifications only
 * Returns most recent 50 unread notifications with count by type
 */
export const getUnreadNotifications = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.merchantId!;

  try {
    const notifications = await Notification.find({
      user: userId,
      isRead: false,
      isArchived: false,
      deletedAt: { $exists: false }
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Transform notifications for frontend
    const transformedNotifications = notifications.map(transformNotificationForFrontend);

    // Calculate unread count by type (using transformed type values)
    const byType: Record<string, number> = {};
    transformedNotifications.forEach((n: any) => {
      const type = n.type || 'system';
      byType[type] = (byType[type] || 0) + 1;
    });

    const unreadCount = notifications.length;

    // Set custom header with unread count
    res.setHeader('X-Unread-Count', unreadCount.toString());

    // Return in format frontend expects
    sendSuccess(res, {
      notifications: transformedNotifications,
      items: transformedNotifications,
      unreadCount: unreadCount,
      byType: byType,
      count: unreadCount  // Keep for backward compatibility
    }, 'Unread notifications retrieved successfully');
  } catch (error) {
    throw new AppError('Failed to fetch unread notifications', 500);
  }
});

/**
 * Mark multiple notifications as read
 * Bulk update operation
 */
export const markMultipleAsRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.merchantId!;
  const { notificationIds } = req.body;

  if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
    throw new AppError('notificationIds array is required', 400);
  }

  try {
    const result = await Notification.updateMany(
      {
        _id: { $in: notificationIds },
        user: userId,
        isRead: false,
        deletedAt: { $exists: false }
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
          'deliveryStatus.inApp.read': true,
          'deliveryStatus.inApp.readAt': new Date()
        }
      }
    );

    const unreadCount = await Notification.countDocuments({
      user: userId,
      isRead: false,
      isArchived: false,
      deletedAt: { $exists: false }
    });

    // Emit socket event for real-time update
    try {
      const io = getIO();
      io.to(SocketRoom.user(userId)).emit('notifications:bulk-read', {
        notificationIds,
        updated: result.modifiedCount,
        unreadCount,
        timestamp: new Date()
      });
    } catch (socketError) {
      logger.error('Socket emit error:', socketError);
    }

    sendSuccess(res, {
      updated: result.modifiedCount,
      unreadCount
    }, `${result.modifiedCount} notification(s) marked as read`);
  } catch (error) {
    throw new AppError('Failed to mark notifications as read', 500);
  }
});

/**
 * Delete multiple notifications
 * Soft delete using deletedAt timestamp
 */
export const deleteMultipleNotifications = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.merchantId!;
  const { notificationIds } = req.body;

  if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
    throw new AppError('notificationIds array is required', 400);
  }

  try {
    // Soft delete by adding deletedAt timestamp
    const result = await Notification.updateMany(
      {
        _id: { $in: notificationIds },
        user: userId
      },
      {
        $set: {
          deletedAt: new Date()
        }
      }
    );

    // Emit socket event for real-time update
    try {
      const io = getIO();
      io.to(SocketRoom.user(userId)).emit('notifications:bulk-deleted', {
        notificationIds,
        deleted: result.modifiedCount,
        timestamp: new Date()
      });
    } catch (socketError) {
      logger.error('Socket emit error:', socketError);
    }

    sendSuccess(res, {
      deleted: result.modifiedCount
    }, `${result.modifiedCount} notification(s) deleted`);
  } catch (error) {
    throw new AppError('Failed to delete notifications', 500);
  }
});

/**
 * Archive a single notification
 * Sets archived flag to true
 */
export const archiveNotification = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.merchantId!;
  const { id } = req.params;

  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: id,
        user: userId
      },
      {
        $set: {
          isArchived: true,
          archivedAt: new Date()
        }
      },
      { new: true }
    );

    if (!notification) {
      return sendNotFound(res, 'Notification not found');
    }

    // Emit socket event for real-time update
    try {
      const io = getIO();
      io.to(SocketRoom.user(userId)).emit('notification:archived', {
        notificationId: id,
        timestamp: new Date()
      });
    } catch (socketError) {
      logger.error('Socket emit error:', socketError);
    }

    sendSuccess(res, {
      notification
    }, 'Notification archived successfully');
  } catch (error) {
    throw new AppError('Failed to archive notification', 500);
  }
});

/**
 * Clear all notifications (soft delete)
 * Optionally filter by read status
 */
export const clearAllNotifications = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.merchantId!;

  if (!userId) {
    return sendError(res, 'Merchant ID not found. Authentication required.', 401);
  }

  const { onlyRead } = req.query;

  try {
    const query: any = {
      user: userId,
      isArchived: false,
      deletedAt: { $exists: false } // Only clear notifications that aren't already deleted
    };

    // If onlyRead=true, only clear read notifications
    if (onlyRead === 'true') {
      query.isRead = true;
    }

    const result = await Notification.updateMany(
      query,
      {
        $set: {
          deletedAt: new Date()
        }
      }
    );

    // Emit socket event for real-time update
    try {
      const io = getIO();
      io.to(SocketRoom.user(userId)).emit('notifications:cleared', {
        cleared: result.modifiedCount,
        onlyRead: onlyRead === 'true',
        timestamp: new Date()
      });
    } catch (socketError) {
      logger.error('Socket emit error:', socketError);
      // Don't fail the request if socket fails
    }

    return sendSuccess(res, {
      cleared: result.modifiedCount || 0
    }, `${result.modifiedCount || 0} notification(s) cleared`);
  } catch (error: any) {
    logger.error('Clear all notifications error:', error);
    throw new AppError(error.message || 'Failed to clear notifications', 500);
  }
});

/**
 * Get archived notifications
 * With pagination support
 */
export const getArchivedNotifications = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.merchantId!;
  const { page = 1, limit = 20 } = req.query;

  try {
    const skip = (Number(page) - 1) * Number(limit);

    const notifications = await Notification.find({
      user: userId,
      isArchived: true
    })
      .sort({ archivedAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Notification.countDocuments({
      user: userId,
      isArchived: true
    });

    // Transform notifications for frontend
    const transformedNotifications = notifications.map(transformNotificationForFrontend);

    sendSuccess(res, {
      notifications: transformedNotifications,
      items: transformedNotifications,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    }, 'Archived notifications retrieved successfully');
  } catch (error) {
    throw new AppError('Failed to fetch archived notifications', 500);
  }
});

/**
 * Send test notification
 * For testing notification preferences and delivery
 */
export const sendTestNotification = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.merchantId!;

  try {
    const testNotification = await Notification.create({
      user: userId,
      title: 'Test Notification',
      message: 'This is a test notification to verify your notification settings are working correctly.',
      type: 'info',
      category: 'system',
      priority: 'medium',
      deliveryChannels: ['in_app'],
      source: 'system',
      data: {
        metadata: {
          isTest: true,
          createdVia: 'test-endpoint'
        }
      }
    });

    // Emit socket event for real-time notification
    try {
      const io = getIO();
      io.to(SocketRoom.user(userId)).emit('notification:new', {
        notification: testNotification,
        timestamp: new Date()
      });
    } catch (socketError) {
      logger.error('Socket emit error:', socketError);
    }

    sendSuccess(res, {
      notification: testNotification
    }, 'Test notification sent successfully');
  } catch (error) {
    throw new AppError('Failed to send test notification', 500);
  }
});

/**
 * Get notification preferences
 * Returns user's notification preferences from UserSettings
 */
export const getNotificationPreferences = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.merchantId!;

  try {
    const userSettings = await UserSettings.findOne({ user: userId }).lean();

    const notifPrefs = userSettings?.notifications;

    // Build preferences from real DB data, falling back to defaults
    const preferences = {
      userId,
      channels: {
        email: notifPrefs?.email?.enabled ?? true,
        push: notifPrefs?.push?.enabled ?? true,
        sms: notifPrefs?.sms?.enabled ?? false,
        inApp: notifPrefs?.inApp?.enabled ?? true
      },
      categories: {
        order: {
          email: notifPrefs?.email?.orderReceipts ?? true,
          push: notifPrefs?.push?.orderUpdates ?? true,
          sms: notifPrefs?.sms?.orderUpdates ?? false,
          inApp: notifPrefs?.inApp?.enabled ?? true
        },
        earning: {
          email: notifPrefs?.email?.enabled ?? true,
          push: notifPrefs?.push?.paymentUpdates ?? true,
          sms: notifPrefs?.sms?.paymentConfirmations ?? false,
          inApp: notifPrefs?.inApp?.enabled ?? true
        },
        general: {
          email: notifPrefs?.email?.newsletters ?? false,
          push: notifPrefs?.push?.recommendations ?? true,
          sms: false,
          inApp: notifPrefs?.inApp?.enabled ?? true
        },
        promotional: {
          email: notifPrefs?.email?.promotions ?? false,
          push: notifPrefs?.push?.promotions ?? false,
          sms: false,
          inApp: notifPrefs?.inApp?.enabled ?? true
        },
        social: {
          email: false,
          push: notifPrefs?.push?.chatMessages ?? true,
          sms: false,
          inApp: notifPrefs?.inApp?.enabled ?? true
        },
        security: {
          email: notifPrefs?.email?.securityAlerts ?? true,
          push: notifPrefs?.push?.securityAlerts ?? true,
          sms: notifPrefs?.sms?.securityAlerts ?? true,
          inApp: notifPrefs?.inApp?.enabled ?? true
        },
        system: {
          email: notifPrefs?.email?.accountUpdates ?? false,
          push: notifPrefs?.push?.enabled ?? true,
          sms: false,
          inApp: notifPrefs?.inApp?.enabled ?? true
        },
        reminder: {
          email: notifPrefs?.email?.enabled ?? true,
          push: notifPrefs?.push?.enabled ?? true,
          sms: false,
          inApp: notifPrefs?.inApp?.enabled ?? true
        }
      },
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
        timezone: 'Asia/Kolkata'
      },
      frequency: {
        digest: 'daily',
        maxPerDay: 50
      }
    };

    sendSuccess(res, preferences, 'Notification preferences retrieved successfully');
  } catch (error) {
    throw new AppError('Failed to fetch notification preferences', 500);
  }
});

/**
 * Update notification preferences
 * Updates user's notification preferences
 */
export const updateNotificationPreferences = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.merchantId!;
  const preferences = req.body;

  try {
    // Update UserSettings with new notification preferences
    const userSettings = await UserSettings.findOneAndUpdate(
      { user: userId },
      {
        $set: {
          'notifications': preferences.categories || preferences,
          lastUpdated: new Date()
        }
      },
      { new: true, upsert: true }
    );

    sendSuccess(res, userSettings?.notifications || preferences, 'Notification preferences updated successfully');
  } catch (error) {
    throw new AppError('Failed to update notification preferences', 500);
  }
});

/**
 * Get single notification by ID
 * Returns detailed notification information
 */
export const getNotificationById = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.merchantId!;
  const { id } = req.params;

  try {
    const notification = await Notification.findOne({
      _id: id,
      user: userId,
      deletedAt: { $exists: false }
    }).lean();

    if (!notification) {
      return sendNotFound(res, 'Notification not found');
    }

    // Transform notification for frontend
    const transformedNotification = transformNotificationForFrontend(notification);

    sendSuccess(res, { notification: transformedNotification }, 'Notification retrieved successfully');
  } catch (error) {
    throw new AppError('Failed to fetch notification', 500);
  }
});

/**
 * Mark single notification as read
 * Updates read status for a specific notification
 */
export const markNotificationAsRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.merchantId!;
  const { id } = req.params;

  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: id,
        user: userId,
        isRead: false,
        deletedAt: { $exists: false }
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
          'deliveryStatus.inApp.read': true,
          'deliveryStatus.inApp.readAt': new Date()
        }
      },
      { new: true }
    );

    if (!notification) {
      return sendNotFound(res, 'Notification not found or already read');
    }

    const unreadCount = await Notification.countDocuments({
      user: userId,
      isRead: false,
      isArchived: false,
      deletedAt: { $exists: false }
    });

    // Emit socket event for real-time update
    try {
      const io = getIO();
      io.to(SocketRoom.user(userId)).emit('notification:read', {
        notificationId: id,
        unreadCount,
        timestamp: new Date()
      });
    } catch (socketError) {
      logger.error('Socket emit error:', socketError);
    }

    // Transform notification for frontend
    const transformedNotification = transformNotificationForFrontend(notification.toObject ? notification.toObject() : notification);

    sendSuccess(res, {
      notification: transformedNotification,
      unreadCount
    }, 'Notification marked as read');
  } catch (error) {
    throw new AppError('Failed to mark notification as read', 500);
  }
});

/**
 * Delete single notification
 * Soft delete using deletedAt timestamp
 */
export const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.merchantId!;
  const { id } = req.params;

  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: id,
        user: userId
      },
      {
        $set: {
          deletedAt: new Date()
        }
      },
      { new: true }
    );

    if (!notification) {
      return sendNotFound(res, 'Notification not found');
    }

    // Emit socket event for real-time update
    try {
      const io = getIO();
      io.to(SocketRoom.user(userId)).emit('notification:deleted', {
        notificationId: id,
        timestamp: new Date()
      });
    } catch (socketError) {
      logger.error('Socket emit error:', socketError);
    }

    sendSuccess(res, {
      notification
    }, 'Notification deleted successfully');
  } catch (error) {
    throw new AppError('Failed to delete notification', 500);
  }
});

/**
 * Get notification statistics
 * Returns aggregated stats for notifications
 */
export const getNotificationStats = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.merchantId!;

  if (!userId) {
    return sendError(res, 'Merchant ID not found. Authentication required.', 401);
  }

  try {
    const userObjectId = new Types.ObjectId(userId);

    const [totalStats, categoryStats, priorityStats, recentActivity] = await Promise.all([
      // Total counts
      Notification.aggregate([
        {
          $match: {
            user: userObjectId,
            deletedAt: { $exists: false }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            unread: {
              $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] }
            },
            read: {
              $sum: { $cond: [{ $eq: ['$isRead', true] }, 1, 0] }
            },
            archived: {
              $sum: { $cond: [{ $eq: ['$isArchived', true] }, 1, 0] }
            }
          }
        }
      ]),

      // By category
      Notification.aggregate([
        {
          $match: {
            user: userObjectId,
            deletedAt: { $exists: false }
          }
        },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            unread: {
              $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] }
            }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]),

      // By priority
      Notification.aggregate([
        {
          $match: {
            user: userObjectId,
            isRead: false,
            deletedAt: { $exists: false }
          }
        },
        {
          $group: {
            _id: '$priority',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]),

      // Recent activity (last 7 days)
      Notification.aggregate([
        {
          $match: {
            user: userObjectId,
            createdAt: {
              $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            },
            deletedAt: { $exists: false }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ])
    ]);

    const stats = {
      overview: totalStats[0] || {
        total: 0,
        unread: 0,
        read: 0,
        archived: 0
      },
      byCategory: categoryStats || [],
      byPriority: priorityStats || [],
      recentActivity: recentActivity || [],
      generatedAt: new Date()
    };

    return sendSuccess(res, stats, 'Notification statistics retrieved successfully');
  } catch (error: any) {
    logger.error('Get notification stats error:', error);
    throw new AppError(error.message || 'Failed to fetch notification statistics', 500);
  }
});

/**
 * Subscribe to email notifications
 * Enable email notifications in user preferences
 */
export const subscribeToEmail = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.merchantId!;

  try {
    const userSettings = await UserSettings.findOneAndUpdate(
      { user: userId },
      {
        $set: {
          'notifications.email.enabled': true,
          lastUpdated: new Date()
        }
      },
      { new: true, upsert: true }
    );

    // Emit socket event
    try {
      const io = getIO();
      io.to(SocketRoom.user(userId)).emit('preferences:updated', {
        type: 'email_subscribed',
        timestamp: new Date()
      });
    } catch (socketError) {
      logger.error('Socket emit error:', socketError);
    }

    sendSuccess(res, {
      emailEnabled: userSettings?.notifications?.email?.enabled || true,
      preferences: userSettings?.notifications
    }, 'Successfully subscribed to email notifications');
  } catch (error) {
    throw new AppError('Failed to subscribe to email notifications', 500);
  }
});

/**
 * Unsubscribe from email notifications
 * Disable email notifications in user preferences
 */
export const unsubscribeFromEmail = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.merchantId!;

  try {
    const userSettings = await UserSettings.findOneAndUpdate(
      { user: userId },
      {
        $set: {
          'notifications.email.enabled': false,
          lastUpdated: new Date()
        }
      },
      { new: true, upsert: true }
    );

    // Emit socket event
    try {
      const io = getIO();
      io.to(SocketRoom.user(userId)).emit('preferences:updated', {
        type: 'email_unsubscribed',
        timestamp: new Date()
      });
    } catch (socketError) {
      logger.error('Socket emit error:', socketError);
    }

    sendSuccess(res, {
      emailEnabled: userSettings?.notifications?.email?.enabled || false,
      preferences: userSettings?.notifications
    }, 'Successfully unsubscribed from email notifications');
  } catch (error) {
    throw new AppError('Failed to unsubscribe from email notifications', 500);
  }
});

/**
 * Subscribe to SMS notifications
 * Enable SMS notifications in user preferences
 */
export const subscribeToSMS = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.merchantId!;

  try {
    const userSettings = await UserSettings.findOneAndUpdate(
      { user: userId },
      {
        $set: {
          'notifications.sms.enabled': true,
          lastUpdated: new Date()
        }
      },
      { new: true, upsert: true }
    );

    // Emit socket event
    try {
      const io = getIO();
      io.to(SocketRoom.user(userId)).emit('preferences:updated', {
        type: 'sms_subscribed',
        timestamp: new Date()
      });
    } catch (socketError) {
      logger.error('Socket emit error:', socketError);
    }

    sendSuccess(res, {
      smsEnabled: userSettings?.notifications?.sms?.enabled || true,
      preferences: userSettings?.notifications
    }, 'Successfully subscribed to SMS notifications');
  } catch (error) {
    throw new AppError('Failed to subscribe to SMS notifications', 500);
  }
});

/**
 * Unsubscribe from SMS notifications
 * Disable SMS notifications in user preferences
 */
export const unsubscribeFromSMS = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.merchantId!;

  try {
    const userSettings = await UserSettings.findOneAndUpdate(
      { user: userId },
      {
        $set: {
          'notifications.sms.enabled': false,
          lastUpdated: new Date()
        }
      },
      { new: true, upsert: true }
    );

    // Emit socket event
    try {
      const io = getIO();
      io.to(SocketRoom.user(userId)).emit('preferences:updated', {
        type: 'sms_unsubscribed',
        timestamp: new Date()
      });
    } catch (socketError) {
      logger.error('Socket emit error:', socketError);
    }

    sendSuccess(res, {
      smsEnabled: userSettings?.notifications?.sms?.enabled || false,
      preferences: userSettings?.notifications
    }, 'Successfully unsubscribed from SMS notifications');
  } catch (error) {
    throw new AppError('Failed to unsubscribe from SMS notifications', 500);
  }
});

/**
 * Get unread notifications count only
 * Fast endpoint for badge counts
 */
export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.merchantId!;

  if (!userId) {
    return sendError(res, 'Merchant ID not found. Authentication required.', 401);
  }

  try {
    const unreadCount = await Notification.countDocuments({
      user: userId,
      isRead: false,
      isArchived: false,
      deletedAt: { $exists: false }
    });

    return sendSuccess(res, {
      count: unreadCount || 0,
      timestamp: new Date()
    }, 'Unread count retrieved successfully');
  } catch (error: any) {
    logger.error('Get unread count error:', error);
    throw new AppError(error.message || 'Failed to fetch unread count', 500);
  }
});

/**
 * Mark all notifications as read
 * Bulk operation to mark all unread notifications as read
 */
export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.merchantId!;

  if (!userId) {
    return sendError(res, 'Merchant ID not found. Authentication required.', 401);
  }

  try {
    const result = await Notification.updateMany(
      {
        user: userId,
        isRead: false,
        isArchived: false,
        deletedAt: { $exists: false }
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
          'deliveryStatus.inApp.read': true,
          'deliveryStatus.inApp.readAt': new Date()
        }
      }
    );

    // Get updated unread count
    const unreadCount = await Notification.countDocuments({
      user: userId,
      isRead: false,
      isArchived: false,
      deletedAt: { $exists: false }
    });

    // Emit socket event for real-time update
    try {
      const io = getIO();
      io.to(SocketRoom.user(userId)).emit('notifications:bulk-read', {
        updated: result.modifiedCount,
        unreadCount,
        timestamp: new Date()
      });
    } catch (socketError) {
      logger.error('Socket emit error:', socketError);
      // Don't fail the request if socket fails
    }

    return sendSuccess(res, {
      updated: result.modifiedCount || 0,
      unreadCount: unreadCount || 0
    }, `All notifications marked as read (${result.modifiedCount || 0} updated)`);
  } catch (error: any) {
    logger.error('Mark all as read error:', error);
    throw new AppError(error.message || 'Failed to mark all notifications as read', 500);
  }
});

/**
 * Register push notification token for merchant
 */
export const registerPushToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const merchantId = (req as any).merchantId; // Merchant model's _id
    const merchantUser = (req as any).merchantUser; // MerchantUser document (if team member)
    const { token, platform, deviceName } = req.body;

    if (!token || !platform) {
      res.status(400).json({ success: false, message: 'Token and platform are required' });
      return;
    }

    // Remove token from any other merchant user (in case device was reassigned)
    await MerchantUser.updateMany(
      { 'pushTokens.token': token },
      { $pull: { pushTokens: { token } } }
    );

    // Find the MerchantUser to update: use merchantUser._id if available, else find owner by merchantId
    let targetUserId = merchantUser?._id;
    if (!targetUserId) {
      // Fallback: find the owner MerchantUser for this merchant
      const owner = await MerchantUser.findOne({ merchantId, role: 'owner' }).select('_id').lean();
      if (!owner) {
        // No MerchantUser exists yet — create one for this merchant
        const merchant = (req as any).merchant;
        const newUser = await MerchantUser.create({
          merchantId,
          email: merchant?.email || 'owner@merchant.local',
          name: merchant?.ownerName || merchant?.businessName || 'Owner',
          role: 'owner',
          status: 'active',
          invitedBy: merchantId,
          pushTokens: [{ token, platform, deviceName: deviceName || undefined, lastUsed: new Date() }]
        });
        res.json({ success: true, message: 'Push token registered successfully' });
        return;
      }
      targetUserId = owner._id;
    }

    // Remove old entry then add new
    await MerchantUser.findByIdAndUpdate(targetUserId, {
      $pull: { pushTokens: { token } }
    });

    await MerchantUser.findByIdAndUpdate(targetUserId, {
      $push: {
        pushTokens: {
          token,
          platform,
          deviceName: deviceName || undefined,
          lastUsed: new Date()
        }
      }
    });

    res.json({ success: true, message: 'Push token registered successfully' });
  } catch (error: any) {
    logger.error('Failed to register push token:', error);
    res.status(500).json({ success: false, message: 'Failed to register push token' });
  }
};

/**
 * Unregister push notification token for merchant
 */
export const unregisterPushToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const merchantId = (req as any).merchantId;
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ success: false, message: 'Token is required' });
      return;
    }

    // Remove from ALL MerchantUsers under this merchant (covers all team members)
    await MerchantUser.updateMany(
      { merchantId, 'pushTokens.token': token },
      { $pull: { pushTokens: { token } } }
    );

    res.json({ success: true, message: 'Push token unregistered successfully' });
  } catch (error: any) {
    logger.error('Failed to unregister push token:', error);
    res.status(500).json({ success: false, message: 'Failed to unregister push token' });
  }
};
