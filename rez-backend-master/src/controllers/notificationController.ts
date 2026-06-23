import { Request, Response } from 'express';
import { Notification } from '../models/Notification';
import { User } from '../models/User';
import { sendSuccess, sendNotFound } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import redisService from '../services/redisService';
import { Expo } from 'expo-server-sdk';
import { createServiceLogger } from '../config/logger';

const logger = createServiceLogger('notification-controller');

// Get unread notification count (cached 30s per user — called on every screen)
export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;

  const cacheKey = `notification:unread:${userId}`;
  const cached = await redisService.get<any>(cacheKey);
  if (cached) {
    return sendSuccess(res, cached);
  }

  const baseQuery = {
    user: userId,
    isRead: false,
    deletedAt: { $exists: false }
  };

  const [total, byTypeAgg, byPriorityAgg] = await Promise.all([
    Notification.countDocuments(baseQuery),
    Notification.aggregate([
      { $match: baseQuery },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]),
    Notification.aggregate([
      { $match: baseQuery },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ])
  ]);

  const byType: Record<string, number> = {};
  for (const item of byTypeAgg) {
    byType[item._id] = item.count;
  }

  const byPriority: Record<string, number> = {};
  for (const item of byPriorityAgg) {
    byPriority[item._id] = item.count;
  }

  const result = { total, byType, byPriority };
  redisService.set(cacheKey, result, 30).catch((err) => logger.warn('[Notification] Cache set for unread count failed', { error: err.message })); // 30s cache

  sendSuccess(res, result);
});

// Get user notifications
export const getUserNotifications = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { type, isRead, page = 1, limit = 20 } = req.query;

  try {
    const query: any = {
      user: userId,
      deletedAt: { $exists: false }
    };
    if (type) query.type = type;
    if (isRead !== undefined) query.isRead = isRead === 'true';

    const skip = (Number(page) - 1) * Number(limit);

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      user: userId,
      isRead: false,
      deletedAt: { $exists: false }
    });

    sendSuccess(res, {
      notifications,
      unreadCount,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    }, 'Notifications retrieved successfully');
  } catch (error) {
    throw new AppError('Failed to fetch notifications', 500);
  }
});

// Mark notifications as read
export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { notificationIds } = req.body;

  try {
    const query = notificationIds && notificationIds.length > 0
      ? { _id: { $in: notificationIds }, user: userId, deletedAt: { $exists: false } }
      : { user: userId, isRead: false, deletedAt: { $exists: false } };

    await Notification.updateMany(query, {
      isRead: true,
      readAt: new Date()
    });

    // Invalidate unread count cache
    redisService.del(`notification:unread:${userId}`).catch((err) => logger.warn('[Notification] Cache invalidation for unread count on delete failed', { error: err.message }));

    const unreadCount = await Notification.countDocuments({
      user: userId,
      isRead: false,
      deletedAt: { $exists: false }
    });

    sendSuccess(res, { unreadCount }, 'Notifications marked as read');
  } catch (error) {
    throw new AppError('Failed to mark notifications as read', 500);
  }
});

// Delete notification
export const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
  const { notificationId } = req.params;
  const userId = req.userId!;

  try {
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      user: userId
    });

    if (!notification) {
      return sendNotFound(res, 'Notification not found');
    }

    // Invalidate unread count cache
    redisService.del(`notification:unread:${userId}`).catch((err) => logger.warn('[Notification] Cache invalidation for unread count failed', { error: err.message }));

    sendSuccess(res, null, 'Notification deleted successfully');
  } catch (error) {
    throw new AppError('Failed to delete notification', 500);
  }
});

// Register push token for the authenticated user
export const registerPushToken = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { token, platform, deviceInfo } = req.body;

  if (!token || !Expo.isExpoPushToken(token)) {
    throw new AppError('Invalid Expo push token', 400);
  }

  // Upsert: if token already exists for this user, update lastUsed; otherwise push new entry
  const user = await User.findOneAndUpdate(
    { _id: userId, 'pushTokens.token': token },
    {
      $set: {
        'pushTokens.$.lastUsed': new Date(),
        'pushTokens.$.platform': platform || 'android',
        'pushTokens.$.deviceInfo': deviceInfo || {}
      }
    },
    { new: true }
  );

  if (!user) {
    // Token doesn't exist yet — add it (cap at 10 devices per user)
    await User.findByIdAndUpdate(userId, {
      $push: {
        pushTokens: {
          $each: [{
            token,
            platform: platform || 'android',
            deviceInfo: deviceInfo || {},
            lastUsed: new Date()
          }],
          $slice: -10,
        }
      }
    });
  }

  logger.info(`Push token registered for user ${userId}`);
  sendSuccess(res, null, 'Push token registered successfully');
});

// Unregister push token
export const unregisterPushToken = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { token } = req.body;

  if (!token) {
    throw new AppError('Token is required', 400);
  }

  await User.findByIdAndUpdate(userId, {
    $pull: { pushTokens: { token } }
  });

  logger.info(`Push token unregistered for user ${userId}`);
  sendSuccess(res, null, 'Push token unregistered successfully');
});