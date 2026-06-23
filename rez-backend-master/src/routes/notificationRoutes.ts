import { Router, Request, Response } from 'express';
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  deleteNotification,
  registerPushToken,
  unregisterPushToken
} from '../controllers/notificationController';
import { authenticate } from '../middleware/auth';
import { validate, validateParams, validateQuery, notificationSchemas, commonSchemas } from '../middleware/validation';
import { generalLimiter } from '../middleware/rateLimiter';
import { Joi } from '../middleware/validation';
import { Notification } from '../models/Notification';
import { sendSuccess, sendBadRequest } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(generalLimiter);

// All notification routes require authentication
router.use(authenticate);

// Get notification statistics for the current user
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const baseQuery = { user: userId, deletedAt: { $exists: false } as any };

  const [total, unread] = await Promise.all([
    Notification.countDocuments(baseQuery),
    Notification.countDocuments({ ...baseQuery, isRead: false }),
  ]);

  sendSuccess(res, { total, unread, read: total - unread });
}));

// Get unread notification count
router.get('/unread-count', getUnreadCount);

// Get user notifications
router.get('/',
  // generalLimiter,, // Disabled for development
  validateQuery(Joi.object({
    type: Joi.string().valid('order', 'promotion', 'social', 'system'),
    isRead: Joi.boolean(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getUserNotifications
);

// Mark notifications as read
router.patch('/read', 
  // generalLimiter,, // Disabled for development
  validate(notificationSchemas.markAsRead),
  markAsRead
);

// Delete notification
router.delete('/:notificationId',
  // generalLimiter,, // Disabled for development
  validateParams(Joi.object({
    notificationId: commonSchemas.objectId().required()
  })),
  deleteNotification
);

// Register push token
router.post('/register-token',
  validate(Joi.object({
    token: Joi.string().required(),
    platform: Joi.string().valid('ios', 'android', 'web').default('android'),
    deviceInfo: Joi.object().optional()
  })),
  registerPushToken
);

// Unregister push token
router.post('/unregister-token',
  validate(Joi.object({
    token: Joi.string().required()
  })),
  unregisterPushToken
);

// Send a test notification (dev/staging only)
router.post('/test', asyncHandler(async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return sendBadRequest(res, 'Test notifications are not available in production');
  }

  const userId = req.userId!;
  const notification = await Notification.create({
    user: userId,
    title: req.body.title || 'Test Notification',
    message: req.body.message || 'This is a test notification',
    type: req.body.type || 'info',
    category: req.body.category || 'system',
    priority: req.body.priority || 'medium',
    deliveryChannels: req.body.deliveryChannels || ['in_app'],
    source: 'system',
    isRead: false,
    data: req.body.data || {
      metadata: { isTest: true, createdVia: 'test-endpoint' }
    },
  });

  sendSuccess(res, { notification }, 'Test notification created');
}));

export default router;