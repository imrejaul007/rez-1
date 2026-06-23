import { Router } from 'express';
import {
  getMerchantNotifications,
  getUnreadNotifications,
  getUnreadCount,
  markMultipleAsRead,
  markAllAsRead,
  deleteMultipleNotifications,
  archiveNotification,
  clearAllNotifications,
  getArchivedNotifications,
  sendTestNotification,
  getNotificationPreferences,
  updateNotificationPreferences,
  getNotificationById,
  markNotificationAsRead,
  deleteNotification,
  getNotificationStats,
  subscribeToEmail,
  unsubscribeFromEmail,
  subscribeToSMS,
  unsubscribeFromSMS,
  registerPushToken,
  unregisterPushToken
} from '../../controllers/merchantNotificationController';
import { authMiddleware as authenticateMerchant } from '../../middleware/merchantauth';
import { validate, validateParams, validateQuery, commonSchemas } from '../../middleware/validation';
import { Joi } from '../../middleware/validation';

const router = Router();

// Middleware to handle empty/null request bodies (for POST/DELETE with no body)
const allowEmptyBody = (req: any, res: any, next: any) => {
  // If body is null, undefined, or empty, set it to an empty object
  if (!req.body || req.body === null || (typeof req.body === 'object' && Object.keys(req.body).length === 0)) {
    req.body = {};
  }
  next();
};

// All notification routes require authentication
router.use(authenticateMerchant);

/**
 * @route   GET /api/merchant/notifications
 * @desc    Get all notifications for merchant with filters and pagination
 * @access  Private (Merchant)
 * @query   type - Filter by notification type (order|product|team)
 * @query   status - Filter by read status (unread|read)
 * @query   category - Filter by category
 * @query   sortBy - Sort field (createdAt|priority)
 * @query   order - Sort order (desc|asc)
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 20)
 */
router.get(
  '/',
  validateQuery(Joi.object({
    type: Joi.string().valid('order', 'product', 'team', 'info', 'success', 'warning', 'error', 'promotional'),
    status: Joi.string().valid('unread', 'read'),
    category: Joi.string().valid('order', 'earning', 'general', 'promotional', 'social', 'security', 'system', 'reminder'),
    sortBy: Joi.string().valid('createdAt', 'priority').default('createdAt'),
    order: Joi.string().valid('desc', 'asc').default('desc'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  })),
  getMerchantNotifications
);

/**
 * @route   GET /api/merchant/notifications/unread
 * @desc    Get unread notifications only (max 50 most recent)
 * @access  Private (Merchant)
 * @returns Unread notifications with X-Unread-Count header
 */
router.get(
  '/unread',
  getUnreadNotifications
);

/**
 * @route   GET /api/merchant/notifications/unread-count
 * @desc    Get unread notifications count only (fast endpoint for badges)
 * @access  Private (Merchant)
 * @returns { count: number, timestamp: Date }
 */
router.get(
  '/unread-count',
  getUnreadCount
);

/**
 * @route   GET /api/merchant/notifications/archived
 * @desc    Get archived notifications
 * @access  Private (Merchant)
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 20)
 */
router.get(
  '/archived',
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  })),
  getArchivedNotifications
);

/**
 * @route   GET /api/merchant/notifications/preferences
 * @desc    Get notification preferences
 * @access  Private (Merchant)
 */
router.get(
  '/preferences',
  getNotificationPreferences
);

/**
 * @route   PUT /api/merchant/notifications/preferences
 * @desc    Update notification preferences
 * @access  Private (Merchant)
 * @body    Notification preferences object
 */
router.put(
  '/preferences',
  validate(Joi.object({
    channels: Joi.object({
      email: Joi.boolean(),
      push: Joi.boolean(),
      sms: Joi.boolean(),
      inApp: Joi.boolean()
    }),
    categories: Joi.object().pattern(
      Joi.string(),
      Joi.object({
        email: Joi.boolean(),
        push: Joi.boolean(),
        sms: Joi.boolean(),
        inApp: Joi.boolean()
      })
    ),
    quietHours: Joi.object({
      enabled: Joi.boolean(),
      start: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/),
      end: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/),
      timezone: Joi.string()
    }),
    frequency: Joi.object({
      digest: Joi.string().valid('immediate', 'daily', 'weekly'),
      maxPerDay: Joi.number().integer().min(1).max(200)
    })
  })),
  updateNotificationPreferences
);

/**
 * @route   POST /api/merchant/notifications/mark-multiple-read
 * @desc    Mark multiple notifications as read
 * @access  Private (Merchant)
 * @body    { notificationIds: string[] }
 * @returns { updated: number, unreadCount: number }
 */
router.post(
  '/mark-multiple-read',
  validate(Joi.object({
    notificationIds: Joi.array()
      .items(commonSchemas.objectId())
      .min(1)
      .max(100)
      .required()
  })),
  markMultipleAsRead
);

/**
 * @route   POST /api/merchant/notifications/mark-all-read
 * @desc    Mark all notifications as read
 * @access  Private (Merchant)
 * @returns { updated: number, unreadCount: number }
 */
router.post(
  '/mark-all-read',
  allowEmptyBody,
  markAllAsRead
);

/**
 * @route   POST /api/merchant/notifications/delete-multiple
 * @desc    Delete multiple notifications (soft delete)
 * @access  Private (Merchant)
 * @body    { notificationIds: string[] }
 * @returns { deleted: number }
 */
router.post(
  '/delete-multiple',
  validate(Joi.object({
    notificationIds: Joi.array()
      .items(commonSchemas.objectId())
      .min(1)
      .max(100)
      .required()
  })),
  deleteMultipleNotifications
);

/**
 * @route   POST /api/merchant/notifications/clear-all
 * @desc    Clear all notifications (soft delete all)
 * @access  Private (Merchant)
 * @query   onlyRead - Only clear read notifications (optional)
 * @returns { cleared: number }
 */
router.post(
  '/clear-all',
  allowEmptyBody,
  validateQuery(Joi.object({
    onlyRead: Joi.boolean()
  })),
  clearAllNotifications
);

/**
 * @route   DELETE /api/merchant/notifications/clear-all
 * @desc    Clear all notifications (soft delete all) - DELETE method
 * @access  Private (Merchant)
 * @query   onlyRead - Only clear read notifications (optional)
 * @returns { cleared: number }
 */
router.delete(
  '/clear-all',
  allowEmptyBody,
  validateQuery(Joi.object({
    onlyRead: Joi.boolean()
  })),
  clearAllNotifications
);

/**
 * @route   POST /api/merchant/notifications/test
 * @desc    Send test notification to merchant
 * @access  Private (Merchant)
 * @returns Created test notification
 */
router.post(
  '/test',
  sendTestNotification
);

/**
 * @route   POST /api/merchant/notifications/register-token
 * @desc    Register push notification token for merchant device
 * @access  Private (Merchant)
 */
router.post(
  '/register-token',
  validate(Joi.object({
    token: Joi.string().required(),
    platform: Joi.string().valid('ios', 'android', 'web').required(),
    deviceName: Joi.string().max(100).optional()
  })),
  registerPushToken
);

/**
 * @route   POST /api/merchant/notifications/unregister-token
 * @desc    Unregister push notification token
 * @access  Private (Merchant)
 */
router.post(
  '/unregister-token',
  validate(Joi.object({
    token: Joi.string().required()
  })),
  unregisterPushToken
);

/**
 * @route   PUT /api/merchant/notifications/:id/archive
 * @desc    Archive a single notification
 * @access  Private (Merchant)
 * @params  id - Notification ID
 * @returns Updated notification
 */
router.put(
  '/:id/archive',
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  archiveNotification
);

/**
 * @route   GET /api/merchant/notifications/stats
 * @desc    Get notification statistics
 * @access  Private (Merchant)
 * @returns Aggregated notification stats
 */
router.get(
  '/stats',
  getNotificationStats
);

/**
 * @route   POST /api/merchant/notifications/subscribe-email
 * @desc    Subscribe to email notifications
 * @access  Private (Merchant)
 * @returns Updated email subscription status
 */
router.post(
  '/subscribe-email',
  subscribeToEmail
);

/**
 * @route   POST /api/merchant/notifications/unsubscribe-email
 * @desc    Unsubscribe from email notifications
 * @access  Private (Merchant)
 * @returns Updated email subscription status
 */
router.post(
  '/unsubscribe-email',
  unsubscribeFromEmail
);

/**
 * @route   POST /api/merchant/notifications/subscribe-sms
 * @desc    Subscribe to SMS notifications
 * @access  Private (Merchant)
 * @returns Updated SMS subscription status
 */
router.post(
  '/subscribe-sms',
  subscribeToSMS
);

/**
 * @route   POST /api/merchant/notifications/unsubscribe-sms
 * @desc    Unsubscribe from SMS notifications
 * @access  Private (Merchant)
 * @returns Updated SMS subscription status
 */
router.post(
  '/unsubscribe-sms',
  unsubscribeFromSMS
);

/**
 * @route   GET /api/merchant/notifications/:id
 * @desc    Get single notification by ID
 * @access  Private (Merchant)
 * @params  id - Notification ID
 * @returns Single notification object
 */
router.get(
  '/:id',
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  getNotificationById
);

/**
 * @route   POST /api/merchant/notifications/:id/mark-read
 * @desc    Mark single notification as read
 * @access  Private (Merchant)
 * @params  id - Notification ID
 * @returns Updated notification with unread count
 */
router.post(
  '/:id/mark-read',
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  markNotificationAsRead
);

/**
 * @route   DELETE /api/merchant/notifications/:id
 * @desc    Delete single notification (soft delete)
 * @access  Private (Merchant)
 * @params  id - Notification ID
 * @returns Deleted notification
 */
router.delete(
  '/:id',
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  deleteNotification
);

export default router;
