// @ts-nocheck
/**
 * User Notification Routes — Sprint 8
 *
 * GET   /api/user/notifications            — paginated notification list
 * PATCH /api/user/notifications/:id/read   — mark single notification as read
 * PATCH /api/user/notifications/read-all   — mark all notifications as read
 */

import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { generalLimiter } from '../middleware/rateLimiter';
import { Notification } from '../models/Notification';

const router = Router();
router.use(generalLimiter);
router.use(requireAuth);

/**
 * GET /api/user/notifications
 * Paginated list of non-archived, non-deleted notifications for the user.
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId!;
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(50, parseInt((req.query.limit as string) || '20', 10));
    const skip = (page - 1) * limit;

    const baseQuery = {
      user: new mongoose.Types.ObjectId(userId),
      isArchived: false,
      deletedAt: null,
    };

    const [notifications, total, unread] = await Promise.all([
      Notification.find(baseQuery)
        .select('title message type category priority isRead readAt createdAt data deliveryStatus.inApp')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(baseQuery),
      Notification.countDocuments({ ...baseQuery, isRead: false }),
    ]);

    return res.json({
      success: true,
      data: notifications,
      unreadCount: unread,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }),
);

/**
 * PATCH /api/user/notifications/read-all
 * Marks all unread notifications for the user as read.
 * Must be declared BEFORE /:id/read to avoid route param collision.
 */
router.patch(
  '/read-all',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId!;

    const result = await Notification.updateMany(
      {
        user: new mongoose.Types.ObjectId(userId),
        isRead: false,
        isArchived: false,
        deletedAt: null,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
          'deliveryStatus.inApp.read': true,
          'deliveryStatus.inApp.readAt': new Date(),
        },
      },
    );

    return res.json({
      success: true,
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount,
    });
  }),
);

/**
 * PATCH /api/user/notifications/:id/read
 * Marks a single notification as read.
 */
router.patch(
  '/:id/read',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId!;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid notification id' });
    }

    const notification = await Notification.findOne({
      _id: id,
      user: new mongoose.Types.ObjectId(userId),
      deletedAt: null,
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      notification.deliveryStatus.inApp.read = true;
      notification.deliveryStatus.inApp.readAt = new Date();
      await notification.save();
    }

    return res.json({ success: true, data: notification });
  }),
);

export default router;
