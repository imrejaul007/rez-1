import { Router } from 'express';
import {
  subscribeToStockNotification,
  unsubscribeFromStockNotification,
  getMyStockSubscriptions,
  checkStockSubscription,
  deleteStockSubscription
} from '../controllers/stockNotificationController';
import { authenticate } from '../middleware/auth';
import { validate, validateParams, validateQuery, commonSchemas } from '../middleware/validation';
import { Joi } from '../middleware/validation';

const router = Router();

// All stock notification routes require authentication
router.use(authenticate);

/**
 * Subscribe to product stock notifications
 * POST /api/stock-notifications/subscribe
 */
router.post(
  '/subscribe',
  validate(
    Joi.object({
      productId: commonSchemas.objectId().required(),
      method: Joi.string().valid('email', 'sms', 'both', 'push').default('push')
    })
  ),
  subscribeToStockNotification
);

/**
 * Unsubscribe from product stock notifications
 * POST /api/stock-notifications/unsubscribe
 */
router.post(
  '/unsubscribe',
  validate(
    Joi.object({
      productId: commonSchemas.objectId().required()
    })
  ),
  unsubscribeFromStockNotification
);

/**
 * Get user's stock notification subscriptions
 * GET /api/stock-notifications/my-subscriptions
 */
router.get(
  '/my-subscriptions',
  validateQuery(
    Joi.object({
      status: Joi.string().valid('pending', 'sent', 'cancelled')
    })
  ),
  getMyStockSubscriptions
);

/**
 * Check if user is subscribed to a product
 * GET /api/stock-notifications/check/:productId
 */
router.get(
  '/check/:productId',
  validateParams(
    Joi.object({
      productId: commonSchemas.objectId().required()
    })
  ),
  checkStockSubscription
);

/**
 * Delete a stock notification subscription
 * DELETE /api/stock-notifications/:notificationId
 */
router.delete(
  '/:notificationId',
  validateParams(
    Joi.object({
      notificationId: commonSchemas.objectId().required()
    })
  ),
  deleteStockSubscription
);

export default router;