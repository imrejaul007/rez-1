import { Request, Response } from 'express';
import stockNotificationService from '../services/stockNotificationService';
import { sendSuccess, sendError, sendNotFound } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';

/**
 * Subscribe to product stock notifications
 * POST /api/stock-notifications/subscribe
 */
export const subscribeToStockNotification = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.userId!;
    const { productId, method = 'push' } = req.body;

    if (!productId) {
      return sendError(res, 'Product ID is required', 400);
    }

    try {
      const subscription = await stockNotificationService.subscribeToProduct({
        userId,
        productId,
        method
      });

      sendSuccess(
        res,
        {
          subscription,
          message: "You'll be notified when this product is back in stock"
        },
        'Subscribed successfully',
        201
      );
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Product not found') {
          return sendNotFound(res, 'Product not found');
        }
        if (error.message === 'User not found') {
          return sendNotFound(res, 'User not found');
        }
      }
      throw new AppError('Failed to subscribe to stock notification', 500);
    }
  }
);

/**
 * Unsubscribe from product stock notifications
 * POST /api/stock-notifications/unsubscribe
 */
export const unsubscribeFromStockNotification = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.userId!;
    const { productId } = req.body;

    if (!productId) {
      return sendError(res, 'Product ID is required', 400);
    }

    try {
      const success = await stockNotificationService.unsubscribeFromProduct(
        userId,
        productId
      );

      if (!success) {
        return sendNotFound(res, 'No active subscription found');
      }

      sendSuccess(
        res,
        null,
        'Unsubscribed from stock notifications successfully'
      );
    } catch (error) {
      throw new AppError('Failed to unsubscribe from stock notification', 500);
    }
  }
);

/**
 * Get user's stock notification subscriptions
 * GET /api/stock-notifications/my-subscriptions
 */
export const getMyStockSubscriptions = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.userId!;
    const { status } = req.query;

    try {
      const subscriptions = await stockNotificationService.getUserSubscriptions(
        userId,
        status as any
      );

      sendSuccess(
        res,
        {
          subscriptions,
          total: subscriptions.length
        },
        'Subscriptions retrieved successfully'
      );
    } catch (error) {
      throw new AppError('Failed to retrieve subscriptions', 500);
    }
  }
);

/**
 * Check if user is subscribed to a product
 * GET /api/stock-notifications/check/:productId
 */
export const checkStockSubscription = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.userId!;
    const { productId } = req.params;

    if (!productId) {
      return sendError(res, 'Product ID is required', 400);
    }

    try {
      const isSubscribed = await stockNotificationService.isUserSubscribed(
        userId,
        productId
      );

      sendSuccess(
        res,
        { isSubscribed },
        'Subscription status retrieved'
      );
    } catch (error) {
      throw new AppError('Failed to check subscription status', 500);
    }
  }
);

/**
 * Delete a stock notification subscription
 * DELETE /api/stock-notifications/:notificationId
 */
export const deleteStockSubscription = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.userId!;
    const { notificationId } = req.params;

    if (!notificationId) {
      return sendError(res, 'Notification ID is required', 400);
    }

    try {
      const success = await stockNotificationService.deleteSubscription(
        userId,
        notificationId
      );

      if (!success) {
        return sendNotFound(res, 'Subscription not found');
      }

      sendSuccess(res, null, 'Subscription deleted successfully');
    } catch (error) {
      throw new AppError('Failed to delete subscription', 500);
    }
  }
);