/**
 * Order Ownership Middleware
 *
 * Verifies that the requesting merchant owns the order's store.
 * Prevents cross-store status manipulation.
 */

import { Request, Response, NextFunction } from 'express';
import { Order } from '../models/Order';
import { Store } from '../models/Store';
import { logger } from '../config/logger';

/**
 * Verify the requesting user (merchant) owns the store associated with the order.
 * Expects `req.params.orderId` and `req.userId` to be set.
 */
export async function verifyOrderOwnership(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const orderId = req.params.orderId || req.params.id;
    const merchantUserId = (req as any).userId;

    if (!orderId) {
      res.status(400).json({ success: false, message: 'Order ID is required' });
      return;
    }

    if (!merchantUserId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    // Find the order and get its store
    const order = await Order.findById(orderId)
      .select('items.store store')
      .lean();

    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    // Get the store ID from the order
    const orderAny = order as any;
    const storeId = orderAny.store || orderAny.items?.[0]?.store;
    if (!storeId) {
      res.status(400).json({ success: false, message: 'Order has no associated store' });
      return;
    }

    const storeIdStr = typeof storeId === 'object' ? (storeId._id?.toString() || storeId.toString()) : String(storeId);

    // Check if the merchant owns this store
    const store = await Store.findById(storeIdStr)
      .select('merchantId')
      .lean();

    if (!store) {
      res.status(404).json({ success: false, message: 'Store not found' });
      return;
    }

    const storeMerchantId = store.merchantId?.toString();

    if (storeMerchantId !== merchantUserId) {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to modify this order. Order belongs to a different store.',
      });
      return;
    }

    // Attach store info to request for downstream use
    (req as any).orderStoreId = storeIdStr;
    (req as any).orderStoreMerchantId = storeMerchantId;

    next();
  } catch (error: any) {
    logger.error('[ORDER OWNERSHIP] Verification error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify order ownership' });
  }
}
