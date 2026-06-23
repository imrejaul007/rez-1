// @ts-nocheck
/**
 * Merchant Web Orders Routes
 *
 * Exposes WebOrder (web QR scan orders) to the merchant app.
 * These are separate from the regular `Order` model orders which come from the REZ app.
 *
 * Routes:
 *   GET  /api/merchant/web-orders          — paginated list filtered to the merchant's store(s)
 *   GET  /api/merchant/web-orders/:orderNumber — single order detail with full split/tip info
 */

import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { authMiddleware } from '../../middleware/merchantauth';
import { WebOrder } from '../../models/WebOrder';
import { Store } from '../../models/Store';
import { logger } from '../../config/logger';
import whatsappOrderingService from '../../services/whatsappOrderingService';

const router = Router();

// All routes require merchant authentication
router.use(authMiddleware);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolve the storeIds that belong to this merchant.
 * If the request includes ?storeId=<id> we validate that it belongs to this merchant
 * and return only that store. Otherwise we return all stores for this merchant.
 */
async function getMerchantStoreIds(merchantId: string, requestedStoreId?: string): Promise<mongoose.Types.ObjectId[]> {
  // CROSS-SERVICE COMPAT: stores written by rez-merchant-service have only
  // `merchant`, stores written by this monolith have only `merchantId`. The
  // pre-save hooks mirror the field on new writes, but legacy stores must be
  // matched by either field. Querying only `merchantId` here was returning
  // an empty set for any merchant whose stores originated in the
  // microservice — every PATCH/GET would 404. Same fix as the deals
  // (rez-merchant-service/src/routes/dealRedemptions.ts) and
  // orders (rez-merchant-service/src/routes/orders.ts) routes.
  const merchantObjectId = new mongoose.Types.ObjectId(merchantId);
  const query: Record<string, any> = {
    $or: [{ merchantId: merchantObjectId }, { merchant: merchantObjectId }],
  };
  if (requestedStoreId) {
    query._id = new mongoose.Types.ObjectId(requestedStoreId);
  }
  const stores = await Store.find(query, { _id: 1 }).lean();
  return stores.map((s: any) => s._id);
}

// ─── List web orders ──────────────────────────────────────────────────────────

// GET /api/merchant/web-orders
router.get('/', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;
    const storeIdParam = req.query.storeId as string | undefined;
    const statusParam = req.query.status as string | undefined;

    // Resolve store IDs this merchant owns
    const storeIds = await getMerchantStoreIds(merchantId, storeIdParam);

    if (storeIds.length === 0) {
      return res.json({
        success: true,
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0, hasMore: false },
      });
    }

    // Build filter
    const filter: Record<string, any> = { storeId: { $in: storeIds } };

    if (statusParam) {
      filter.status = statusParam;
    }

    // Date range filter
    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate) filter.createdAt.$gte = new Date(req.query.startDate as string);
      if (req.query.endDate) filter.createdAt.$lte = new Date(req.query.endDate as string);
    }

    const [orders, total] = await Promise.all([
      WebOrder.find(filter)
        .select(
          'orderNumber items total tipAmount tipPercentage totalWithTip billSplits status ' +
            'customerPhone customerName tableNumber storeName storeSlug paymentStatus ' +
            'specialInstructions channel createdAt updatedAt',
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      WebOrder.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return res.json({
      success: true,
      data: orders,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error: any) {
    logger.error('[MERCHANT WEB-ORDERS] Error listing web orders: ' + error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch web orders' });
  }
});

// ─── Single web order detail ──────────────────────────────────────────────────

// GET /api/merchant/web-orders/:orderNumber
router.get('/:orderNumber', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }

    const { orderNumber } = req.params;

    // Resolve all store IDs for this merchant so we can validate ownership
    const storeIds = await getMerchantStoreIds(merchantId);

    if (storeIds.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const order = await WebOrder.findOne({
      orderNumber,
      storeId: { $in: storeIds },
    }).lean();

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    return res.json({ success: true, data: order });
  } catch (error: any) {
    logger.error('[MERCHANT WEB-ORDERS] Error fetching web order detail: ' + error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch web order' });
  }
});

// ─── Update web order status ──────────────────────────────────────────────────

// `paid` is set by the Razorpay webhook between `pending_payment` and the
// merchant's `confirmed` action. Without it in this map a paid order had
// `allowed=[]`, so the merchant could never advance it — orders would silently
// stall in `paid` forever. Mirror the same transitions as `pending_payment`
// since both are "awaiting merchant acknowledgement" states.
const WEB_ORDER_TRANSITIONS: Record<string, string[]> = {
  pending_payment: ['confirmed', 'cancelled'],
  paid: ['confirmed', 'preparing', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

// PATCH /api/merchant/web-orders/:orderNumber/status
router.patch('/:orderNumber/status', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }

    const { orderNumber } = req.params;
    const { status } = req.body as { status?: string };

    if (!status || typeof status !== 'string') {
      return res.status(400).json({ success: false, message: 'status is required' });
    }

    // Validate ownership
    const storeIds = await getMerchantStoreIds(merchantId);
    if (storeIds.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const order = await WebOrder.findOne({ orderNumber, storeId: { $in: storeIds } });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const allowed = WEB_ORDER_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(status)) {
      return res.status(422).json({
        success: false,
        message: `Cannot transition from "${order.status}" to "${status}"`,
      });
    }

    order.status = status as any;
    await order.save();

    // Emit socket event for real-time web menu update
    const io = req.app.get('io');
    if (io) {
      io.emit('web-order:status-update', {
        orderNumber,
        status,
        storeId: order.storeId?.toString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // WhatsApp notification to customer when order is ready for pickup
    if (status === 'ready' && (order as any).customerPhone) {
      setImmediate(async () => {
        try {
          const msg =
            `✅ *Your order is ready!*\n\n` +
            `Order #${orderNumber} is ready for pickup at ${(order as any).storeName || 'the store'}.\n` +
            `Please collect it from the counter.`;
          await whatsappOrderingService.sendMessage((order as any).customerPhone, msg);
          logger.info(`[MERCHANT WEB-ORDERS] WhatsApp 'ready' sent for ${orderNumber}`);
        } catch (err) {
          logger.warn(`[MERCHANT WEB-ORDERS] WhatsApp failed for ${orderNumber}:`, err);
        }
      });
    }

    logger.info(`[MERCHANT WEB-ORDERS] ${orderNumber} → ${status} by merchant ${merchantId}`);

    return res.json({ success: true, data: { orderNumber, status } });
  } catch (error: any) {
    logger.error('[MERCHANT WEB-ORDERS] Error updating status: ' + error.message);
    return res.status(500).json({ success: false, message: 'Failed to update order status' });
  }
});

export default router;
