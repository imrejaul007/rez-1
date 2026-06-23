/**
 * Merchant Customer Notifications Routes
 *
 * Allows merchants to send push notifications to their store's customers.
 * Rate limited to 5 sends per day per store.
 */
import { Router, Request, Response } from 'express';
import { authMiddleware as authenticateMerchant } from '../middleware/merchantauth';
import { validate, validateQuery } from '../middleware/validation';
import { Joi } from '../middleware/validation';
import { sendSuccess, sendError } from '../utils/response';
import { Order } from '../models/Order';
import { Notification } from '../models/Notification';
import { Store } from '../models/Store';
import { sendPushToMultiple } from '../services/pushNotificationService';
import { logger } from '../config/logger';
import mongoose from 'mongoose';

const router = Router();

// All routes require merchant authentication
router.use(authenticateMerchant);

// In-memory rate limit tracker (per store per day) — simple approach
// In production, use Redis for distributed tracking
const sendCounts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(storeId: string, maxPerDay: number = 5): boolean {
  const key = storeId;
  const now = Date.now();
  const entry = sendCounts.get(key);

  if (!entry || now > entry.resetAt) {
    // Reset for new day
    sendCounts.set(key, {
      count: 1,
      resetAt: now + 24 * 60 * 60 * 1000,
    });
    return true;
  }

  if (entry.count >= maxPerDay) {
    return false;
  }

  entry.count++;
  return true;
}

/**
 * @route   POST /api/merchant/customer-notifications/send
 * @desc    Send push notification to store's customers
 * @access  Private (Merchant)
 */
router.post(
  '/send',
  validate(
    Joi.object({
      title: Joi.string().trim().max(50).required(),
      body: Joi.string().trim().max(200).required(),
      targetType: Joi.string().valid('all', 'recent', 'loyal').default('all'),
      storeId: Joi.string().required(),
    })
  ),
  async (req: Request, res: Response) => {
    try {
      const { title, body, targetType, storeId } = req.body;
      const merchantId = req.merchantId;

      // Verify the store belongs to this merchant
      const store = await Store.findOne({ _id: storeId, merchant: merchantId }).lean();
      if (!store) {
        return sendError(res, 'Store not found or does not belong to your account', 404);
      }

      // Rate limit check
      if (!checkRateLimit(storeId)) {
        return sendError(res, 'Daily notification limit reached (max 5 per day per store)', 429);
      }

      // Build customer query based on target type
      let customerQuery: any = { 'items.store': new mongoose.Types.ObjectId(storeId), status: { $in: ['delivered', 'confirmed', 'placed'] } };

      if (targetType === 'recent') {
        // Customers who ordered in the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        customerQuery.createdAt = { $gte: sevenDaysAgo };
      }

      // Get distinct customer user IDs
      let userIds: string[];

      if (targetType === 'loyal') {
        // Customers with 5+ orders from this store
        const loyalCustomers = await Order.aggregate([
          { $match: { 'items.store': new mongoose.Types.ObjectId(storeId), status: { $in: ['delivered', 'confirmed', 'placed'] } } },
          { $group: { _id: '$user', orderCount: { $sum: 1 } } },
          { $match: { orderCount: { $gte: 5 } } },
          { $project: { _id: 1 } },
        ]);
        userIds = loyalCustomers.map((c: any) => c._id.toString());
      } else {
        userIds = (
          await Order.distinct('user', customerQuery)
        ).map((id: any) => id.toString());
      }

      if (userIds.length === 0) {
        return sendSuccess(res, { sent: 0, targetCount: 0 }, 'No customers found for the selected target group');
      }

      // Send push notifications in batch
      const sentCount = await sendPushToMultiple(userIds, {
        title,
        body,
        data: {
          type: 'merchant_promotion',
          storeId,
          storeName: store.name,
        },
        channelId: 'promotions',
      });

      // Create in-app notifications for all targeted users (batch insert)
      const notifications = userIds.map((userId) => ({
        user: new mongoose.Types.ObjectId(userId),
        title,
        message: body,
        type: 'promotional' as const,
        category: 'promotional' as const,
        priority: 'low' as const,
        data: {
          storeId,
          deepLink: `/MainStorePage?storeId=${storeId}`,
          metadata: { storeName: store.name, merchantId },
        },
        deliveryChannels: ['push', 'in_app'] as ('push' | 'in_app')[],
        deliveryStatus: {
          push: { sent: true, sentAt: new Date(), delivered: false, clicked: false, failed: false },
          inApp: { delivered: true, deliveredAt: new Date(), read: false },
        },
        isRead: false,
        isArchived: false,
        source: 'campaign' as const,
        createdBy: req.merchantUser?._id,
        sentAt: new Date(),
      }));

      await Notification.insertMany(notifications, { ordered: false }).catch((err: any) => {
        logger.warn('Some in-app notifications failed to insert', { error: err.message });
      });

      logger.info('Merchant customer notification sent', {
        merchantId,
        storeId,
        targetType,
        targetCount: userIds.length,
        pushSent: sentCount,
      });

      return sendSuccess(res, {
        sent: sentCount,
        targetCount: userIds.length,
        title,
        targetType,
      }, 'Notifications sent successfully');
    } catch (error: any) {
      logger.error('Failed to send customer notification', { error: error.message });
      return sendError(res, 'Failed to send notification', 500);
    }
  }
);

/**
 * @route   GET /api/merchant/customer-notifications/sent
 * @desc    Get history of notifications sent to customers
 * @access  Private (Merchant)
 */
router.get(
  '/sent',
  validateQuery(
    Joi.object({
      storeId: Joi.string().required(),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(10),
    })
  ),
  async (req: Request, res: Response) => {
    try {
      const merchantId = req.merchantId;
      const { storeId, page = 1, limit = 10 } = req.query;

      const pageNum = Number(page);
      const limitNum = Number(limit);

      // Verify store belongs to merchant
      const store = await Store.findOne({ _id: storeId, merchant: merchantId }).lean();
      if (!store) {
        return sendError(res, 'Store not found or does not belong to your account', 404);
      }

      const filter = {
        source: 'campaign',
        'data.storeId': storeId,
        'data.metadata.merchantId': merchantId,
        category: 'promotional',
      };

      const [notifications, total] = await Promise.all([
        Notification.find(filter)
          .sort({ createdAt: -1 })
          .skip((pageNum - 1) * limitNum)
          .limit(limitNum)
          .select('title message createdAt sentAt')
          .lean(),
        Notification.countDocuments(filter),
      ]);

      // Deduplicate by title+sentAt (since we create one per user)
      const seen = new Map<string, any>();
      for (const notif of notifications) {
        const key = `${notif.title}|${notif.sentAt?.toISOString() || notif.createdAt.toISOString()}`;
        if (!seen.has(key)) {
          seen.set(key, {
            title: notif.title,
            body: notif.message,
            sentAt: notif.sentAt || notif.createdAt,
          });
        }
      }

      const uniqueNotifications = Array.from(seen.values());

      // For pagination metadata, count unique sent notifications
      const totalPages = Math.ceil(total / limitNum);

      return sendSuccess(res, {
        notifications: uniqueNotifications,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems: total,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
      });
    } catch (error: any) {
      logger.error('Failed to get sent notifications', { error: error.message });
      return sendError(res, 'Failed to get sent notifications', 500);
    }
  }
);

export default router;
