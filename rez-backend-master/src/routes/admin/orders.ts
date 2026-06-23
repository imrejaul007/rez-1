import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { requireAuth, requireAdmin, requireSeniorAdmin } from '../../middleware/auth';
import { Order } from '../../models/Order';
import { User } from '../../models/User';
import { isSocketInitialized, getIO } from '../../config/socket';
import { Product } from '../../models/Product';
import { Wallet } from '../../models/Wallet';
import { Subscription } from '../../models/Subscription';
import activityService from '../../services/activityService';
import referralService from '../../services/referralService';
import { QueueService } from '../../services/QueueService';
import userProductService from '../../services/userProductService';
import achievementService from '../../services/achievementService';
import { calculatePromoCoinsEarned, calculatePromoCoinsWithTierBonus } from '../../config/promoCoins.config';
import { logger } from '../../config/logger';
import { escapeRegex } from '../../utils/sanitize';
import merchantWalletService from '../../services/merchantWalletService';
import orderSocketService from '../../services/orderSocketService';
import { Store } from '../../models/Store';
import { LedgerEntry } from '../../models/LedgerEntry';
import {
  ORDER_STATUSES,
  STATUS_TRANSITIONS,
  isValidTransition,
  SLA_THRESHOLDS,
  ACTIVE_STATUSES,
  DELIVERY_STATUS_MAP,
  getOrderProgress
} from '../../config/orderStateMachine';
import { recordStatusTransition, recordStatusDuration } from '../../utils/orderMetrics';
import { asyncHandler } from '../../utils/asyncHandler';
import { validateQuery, validate } from '../../middleware/validation';
import {
  adminOrderSearchSchema,
  adminOrderRefundSchema,
  adminOrderCancelSchema,
  adminOrderStatusSchema,
  adminOrderEscalateSchema,
} from '../../validators/financialValidators';

const router = Router();

// All routes require admin authentication
router.use(requireAuth);
router.use(requireAdmin);

/**
 * @route   GET /api/admin/orders
 * @desc    Get all platform orders with filters
 * @access  Admin
 */
router.get('/', validateQuery(adminOrderSearchSchema), asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Build filter
    const filter: any = {};

    // Status filter
    if (req.query.status) {
      filter.status = req.query.status;
    }

    // Payment status filter
    if (req.query.paymentStatus) {
      filter['payment.status'] = req.query.paymentStatus;
    }

    // Date range filter
    if (req.query.dateFrom || req.query.dateTo) {
      filter.createdAt = {};
      if (req.query.dateFrom) {
        filter.createdAt.$gte = new Date(req.query.dateFrom as string);
      }
      if (req.query.dateTo) {
        filter.createdAt.$lte = new Date(req.query.dateTo as string);
      }
    }

    // Search by order number
    if (req.query.search) {
      filter.orderNumber = { $regex: escapeRegex(req.query.search as string), $options: 'i' };
    }

    // Fulfillment type filter
    if (req.query.fulfillmentType) {
      filter.fulfillmentType = req.query.fulfillmentType;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'profile.firstName profile.lastName phoneNumber email')
        .populate('items.store', 'name slug logo')
        .select('orderNumber status totals payment.status payment.method payment.coinsUsed createdAt user items fulfillmentType fulfillmentDetails')
        .lean(),
      Order.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  }));

/**
 * @route   GET /api/admin/orders/stats
 * @desc    Get order statistics
 * @access  Admin
 */
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = await Order.aggregate([
      {
        $facet: {
          // Status breakdown
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ],
          // Payment status breakdown
          byPaymentStatus: [
            { $group: { _id: '$payment.status', count: { $sum: 1 } } }
          ],
          // Today's stats
          today: [
            { $match: { createdAt: { $gte: today } } },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                revenue: { $sum: '$totals.total' },
                platformFees: { $sum: '$totals.platformFee' }
              }
            }
          ],
          // Overall stats
          overall: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                totalRevenue: { $sum: '$totals.total' },
                totalPlatformFees: { $sum: '$totals.platformFee' },
                avgOrderValue: { $avg: '$totals.total' }
              }
            }
          ]
        }
      }
    ]);

    // Transform results
    const result: any = {
      byStatus: stats[0].byStatus.reduce((acc: any, item: any) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      byPaymentStatus: stats[0].byPaymentStatus.reduce((acc: any, item: any) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      today: stats[0].today[0] || { count: 0, revenue: 0, platformFees: 0 },
      overall: stats[0].overall[0] || { total: 0, totalRevenue: 0, totalPlatformFees: 0, avgOrderValue: 0 }
    };

    // Add stuck orders count (orders exceeding SLA thresholds)
    let stuckOrdersCount = 0;
    const now = new Date();
    for (const [status, thresholdMin] of Object.entries(SLA_THRESHOLDS)) {
      const cutoff = new Date(now.getTime() - thresholdMin * 60 * 1000);
      const count = await Order.countDocuments({ status, updatedAt: { $lt: cutoff } });
      stuckOrdersCount += count;
    }
    result.stuckOrders = stuckOrdersCount;

    // Average delivery time (placed -> delivered, last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const deliveryTimeAgg = await Order.aggregate([
      {
        $match: {
          status: 'delivered',
          'delivery.deliveredAt': { $gte: thirtyDaysAgo },
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $project: {
          deliveryMinutes: {
            $divide: [
              { $subtract: ['$delivery.deliveredAt', '$createdAt'] },
              60000,
            ],
          },
        },
      },
      { $match: { deliveryMinutes: { $gt: 0, $lt: 1440 } } }, // Filter outliers > 24h
      { $group: { _id: null, avg: { $avg: '$deliveryMinutes' }, count: { $sum: 1 } } },
    ]);
    result.avgDeliveryTimeMinutes = Math.round(deliveryTimeAgg[0]?.avg || 0);
    result.deliveredLast30Days = deliveryTimeAgg[0]?.count || 0;

    // SLA breaches in last 24h
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    let slaBreaches24h = 0;
    for (const [status, thresholdMin] of Object.entries(SLA_THRESHOLDS)) {
      const cutoff = new Date(now.getTime() - thresholdMin * 60 * 1000);
      const count = await Order.countDocuments({
        status,
        updatedAt: { $lt: cutoff, $gte: twentyFourHoursAgo },
      });
      slaBreaches24h += count;
    }
    result.slaBreaches24h = slaBreaches24h;

    res.json({
      success: true,
      data: result
    });
  }));

/**
 * @route   GET /api/admin/orders/reconciliation
 * @desc    Check for orders missing ledger entries (ledger drift detection)
 * @access  Senior Admin
 */
router.get('/reconciliation', requireSeniorAdmin, asyncHandler(async (req: Request, res: Response) => {
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : new Date();

    const orders = await Order.find({
      status: { $in: ['delivered', 'refunded'] },
      createdAt: { $gte: dateFrom, $lte: dateTo },
    }).select('_id orderNumber status totals payment createdAt').lean();

    const missingLedgerEntries: any[] = [];
    let driftAmount = 0;

    for (const order of orders) {
      const orderId = String(order._id);

      // Check for coin deduction ledger entry (if coins were used)
      const coinsUsed = order.payment?.coinsUsed;
      const totalCoins = ((coinsUsed as any)?.rezCoins || 0) + ((coinsUsed as any)?.promoCoins || 0) + ((coinsUsed as any)?.storePromoCoins || 0);

      if (totalCoins > 0) {
        const coinLedger = await LedgerEntry.findOne({
          referenceId: orderId,
          referenceModel: 'Order',
          operationType: 'order_coin_deduction',
        });
        if (!coinLedger) {
          missingLedgerEntries.push({ orderId, orderNumber: order.orderNumber, type: 'order_coin_deduction', expectedAmount: totalCoins });
          driftAmount += totalCoins;
        }
      }

      // Check for merchant payout ledger entry (delivered orders)
      if (order.status === 'delivered') {
        const payoutLedger = await LedgerEntry.findOne({
          referenceId: orderId, referenceModel: 'Order', operationType: 'merchant_payout',
        });
        if (!payoutLedger) {
          const netPayout = (order.totals?.subtotal || 0) - (order.totals?.platformFee || 0);
          if (netPayout > 0) {
            missingLedgerEntries.push({ orderId, orderNumber: order.orderNumber, type: 'merchant_payout', expectedAmount: netPayout });
            driftAmount += netPayout;
          }
        }
      }

      // Check for refund ledger entry (refunded orders)
      if (order.status === 'refunded') {
        const refundLedger = await LedgerEntry.findOne({
          referenceId: orderId, referenceModel: 'Order', operationType: 'order_refund',
        });
        if (!refundLedger) {
          const refundAmount = order.totals?.refundAmount || order.totals?.paidAmount || 0;
          if (refundAmount > 0) {
            missingLedgerEntries.push({ orderId, orderNumber: order.orderNumber, type: 'order_refund', expectedAmount: refundAmount });
            driftAmount += refundAmount;
          }
        }
      }
    }

    res.json({
      success: true,
      data: {
        dateRange: { from: dateFrom, to: dateTo },
        ordersChecked: orders.length,
        missingLedgerEntries,
        missingCount: missingLedgerEntries.length,
        driftAmount,
      },
    });
  }));

/**
 * @route   GET /api/admin/orders/stuck
 * @desc    Get orders exceeding SLA thresholds
 * @access  Admin
 */
router.get('/stuck', asyncHandler(async (req: Request, res: Response) => {
    const now = new Date();
    const stuckOrders: any[] = [];

    // Check each active status against its SLA threshold
    for (const [status, thresholdMin] of Object.entries(SLA_THRESHOLDS)) {
      const cutoff = new Date(now.getTime() - thresholdMin * 60 * 1000);
      const orders = await Order.find({
        status,
        updatedAt: { $lt: cutoff },
      })
        .select('_id orderNumber status updatedAt createdAt totals user items.store')
        .populate('items.store', 'name')
        .sort({ updatedAt: 1 })
        .limit(50)
        .lean();

      for (const order of orders) {
        const stuckMinutes = Math.round((now.getTime() - new Date(order.updatedAt).getTime()) / 60000);
        stuckOrders.push({
          ...order,
          stuckMinutes,
          slaThresholdMin: thresholdMin,
          slaBreached: true,
        });
      }
    }

    res.json({
      success: true,
      data: {
        stuckOrders,
        count: stuckOrders.length,
        timestamp: now,
      },
    });
  }));

/**
 * @route   GET /api/admin/orders/sla-summary
 * @desc    Average time per status transition (last 7 days)
 * @access  Admin
 */
router.get('/sla-summary', asyncHandler(async (req: Request, res: Response) => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Get delivered orders from last 7 days with their timelines
    const deliveredOrders = await Order.find({
      status: 'delivered',
      'delivery.deliveredAt': { $gte: sevenDaysAgo },
    })
      .select('timeline createdAt delivery.deliveredAt')
      .lean();

    // Calculate average time between key transitions
    const transitionTimes: Record<string, number[]> = {};

    for (const order of deliveredOrders) {
      const timeline = order.timeline || [];
      for (let i = 1; i < timeline.length; i++) {
        const from = timeline[i - 1].status;
        const to = timeline[i].status;
        const key = `${from} -> ${to}`;
        const duration = (new Date(timeline[i].timestamp).getTime() - new Date(timeline[i - 1].timestamp).getTime()) / 60000;
        if (duration > 0 && duration < 24 * 60) { // Ignore outliers > 24h
          if (!transitionTimes[key]) transitionTimes[key] = [];
          transitionTimes[key].push(duration);
        }
      }

      // Overall placed -> delivered
      if (order.delivery?.deliveredAt && order.createdAt) {
        const totalMin = (new Date(order.delivery.deliveredAt).getTime() - new Date(order.createdAt).getTime()) / 60000;
        if (totalMin > 0 && totalMin < 24 * 60) {
          if (!transitionTimes['placed -> delivered (total)']) transitionTimes['placed -> delivered (total)'] = [];
          transitionTimes['placed -> delivered (total)'].push(totalMin);
        }
      }
    }

    // Calculate averages
    const summary: Record<string, { avgMinutes: number; count: number; minMinutes: number; maxMinutes: number }> = {};
    for (const [key, times] of Object.entries(transitionTimes)) {
      if (times.length > 0) {
        summary[key] = {
          avgMinutes: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
          count: times.length,
          minMinutes: Math.round(Math.min(...times)),
          maxMinutes: Math.round(Math.max(...times)),
        };
      }
    }

    // Count SLA breaches in last 24h
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let slaBreaches = 0;
    for (const [status, thresholdMin] of Object.entries(SLA_THRESHOLDS)) {
      const cutoff = new Date(Date.now() - thresholdMin * 60 * 1000);
      const count = await Order.countDocuments({
        status,
        updatedAt: { $lt: cutoff, $gte: twentyFourHoursAgo },
      });
      slaBreaches += count;
    }

    res.json({
      success: true,
      data: {
        transitions: summary,
        ordersAnalyzed: deliveredOrders.length,
        period: '7 days',
        slaBreaches24h: slaBreaches,
      },
    });
  }));

/**
 * @route   GET /api/admin/orders/:id
 * @desc    Get single order details
 * @access  Admin
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const order = await Order.findById(req.params.id)
      .populate('user', 'profile phoneNumber email')
      .populate('items.product', 'name images')
      .populate('items.store', 'name logo')
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });
  }));

/**
 * @route   POST /api/admin/orders/:id/refund
 * @desc    Process refund for an order
 * @access  Admin
 */
router.post('/:id/refund', requireSeniorAdmin, validate(adminOrderRefundSchema), asyncHandler(async (req: Request, res: Response) => {
    const { reason } = req.body;

    // Validate required fields
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Refund reason is required'
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Idempotency guard: atomic claim to prevent double-refund from concurrent requests
    const claimed = await Order.findOneAndUpdate(
      {
        _id: req.params.id,
        'payment.status': { $ne: 'refunded' },
        status: { $ne: 'refunded' },
      },
      {
        $set: {
          status: 'refunded',
          'payment.status': 'refunded',
          'payment.refundedAt': new Date(),
        },
      },
      { new: true }
    );

    if (!claimed) {
      return res.status(409).json({
        success: false,
        message: 'Order has already been refunded or refund is in progress'
      });
    }

    // Calculate refund amount
    const refundAmount = order.calculateRefund ? order.calculateRefund() : order.totals.paidAmount;

    // Process refund via centralized refundService (wallet credit + ledger + notification + event)
    if (order.user && refundAmount > 0) {
      try {
        const { refundService } = await import('../../services/refundService');
        await refundService.processRefund({
          userId: order.user.toString(),
          amount: refundAmount,
          reason: reason.trim(),
          refundType: 'admin_manual',
          referenceId: `admin-refund:${order._id}`,
          referenceModel: 'Order',
          adminUserId: (req as any).userId,
        });
        logger.info(`[ADMIN ORDERS] Refund processed via refundService: ${refundAmount} for order ${order.orderNumber}`);
      } catch (refundErr) {
        logger.error('[ADMIN ORDERS] RefundService failed, falling back to direct wallet credit:', refundErr);
        // Fallback: direct User wallet increment (legacy path)
        if (order.payment.method === 'wallet') {
          await User.findByIdAndUpdate(order.user, {
            $inc: { 'wallet.balance': refundAmount, 'wallet.totalEarned': refundAmount, 'walletBalance': refundAmount }
          });
        }
      }
    }

    // Re-read order to add timeline (claimed already updated status/payment)
    order.status = 'refunded';
    order.payment.status = 'refunded';
    order.payment.refundedAt = new Date();
    order.totals.refundAmount = refundAmount;

    // Add timeline entry
    order.timeline.push({
      status: 'refunded',
      message: `Order refunded. Reason: ${reason.trim()}`,
      timestamp: new Date(),
      updatedBy: 'admin',
      metadata: {
        refundAmount,
        reason: reason.trim(),
        paymentMethod: order.payment.method
      }
    });

    // Update cancellation info if exists
    if (order.cancellation) {
      order.cancellation.refundAmount = refundAmount;
      order.cancellation.refundStatus = 'completed';
    }

    await order.save();

    // Emit real-time notification to consumer app
    if (isSocketInitialized()) {
      getIO().emit('order_refunded', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        userId: order.user,
        refundAmount,
        message: `Your order ${order.orderNumber} has been refunded (₹${refundAmount})`,
      });
    }

    logger.info(`[ORDER:REFUND] orderId=${order._id} orderNumber=${order.orderNumber} userId=${order.user} refundAmount=${refundAmount} paymentMethod=${order.payment.method} adminId=${(req as any).userId}`);

    res.json({
      success: true,
      message: 'Order refunded successfully',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        refundAmount,
        status: order.status,
        paymentStatus: order.payment.status
      }
    });
  }));

/**
 * @route   POST /api/admin/orders/:id/cancel
 * @desc    Cancel an order
 * @access  Admin
 */
router.post('/:id/cancel', requireSeniorAdmin, validate(adminOrderCancelSchema), asyncHandler(async (req: Request, res: Response) => {
    const { reason } = req.body;

    // Validate required fields
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cancellation reason is required'
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order can be cancelled (not delivered)
    const nonCancellableStatuses = ['delivered', 'cancelled', 'refunded'];
    if (nonCancellableStatuses.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order with status '${order.status}'. Orders that are delivered, already cancelled, or refunded cannot be cancelled.`
      });
    }

    // Batch-load all products in one query instead of N individual queries
    const productIds = order.items.map((item: any) => item.product);
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    // Restore inventory stock for each item
    const stockRestorePromises = order.items.map(async (item) => {
      try {
        const product = productMap.get(item.product.toString());
        if (product && !product.inventory.unlimited) {
          product.inventory.stock += item.quantity;
          product.inventory.isAvailable = true;

          if (item.variant && product.inventory.variants) {
            const variant = product.inventory.variants.find(
              (v: { type: string; value: string }) => v.type === item.variant?.type && v.value === item.variant?.value
            );
            if (variant) {
              variant.stock += item.quantity;
              variant.isAvailable = true;
            }
          }

          await product.save();
          logger.info(`[ADMIN ORDERS] Restored ${item.quantity} units to product ${product._id}`);
        }
      } catch (err) {
        logger.error(`[ADMIN ORDERS] Failed to restore stock for product ${item.product}:`, err);
      }
    });

    await Promise.all(stockRestorePromises);

    // Update order status
    order.status = 'cancelled';
    order.cancelReason = reason.trim();
    order.cancelledAt = new Date();
    order.delivery.status = 'failed';

    // Update cancellation object
    order.cancellation = {
      reason: reason.trim(),
      cancelledAt: new Date(),
      refundStatus: order.payment.status === 'paid' ? 'pending' : 'not_applicable'
    };

    // Add timeline entry
    order.timeline.push({
      status: 'cancelled',
      message: `Order cancelled by admin. Reason: ${reason.trim()}`,
      timestamp: new Date(),
      updatedBy: 'admin',
      metadata: {
        reason: reason.trim(),
        itemsRestored: order.items.length
      }
    });

    await order.save();

    logger.info(`✅ [ADMIN ORDERS] Order ${order.orderNumber} cancelled successfully`);

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        cancelReason: order.cancelReason,
        cancelledAt: order.cancelledAt,
        itemsRestored: order.items.length
      }
    });
  }));

/**
 * @route   POST /api/admin/orders/:id/escalate
 * @desc    Manually escalate an order (adds timeline entry, notifies merchant)
 * @access  Admin
 */
router.post('/:id/escalate', validate(adminOrderEscalateSchema), asyncHandler(async (req: Request, res: Response) => {
    const { reason, priority } = req.body;

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Escalation reason is required' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Add escalation to timeline
    order.timeline.push({
      status: order.status,
      message: `Order escalated by admin. Reason: ${reason.trim()}`,
      timestamp: new Date(),
      updatedBy: 'admin',
      metadata: {
        escalation: true,
        priority: priority || 'high',
        adminId: (req as any).userId,
        reason: reason.trim(),
      },
    });

    await order.save();

    // Notify merchant via socket
    const storeId = order.items?.[0]?.store;
    if (storeId) {
      orderSocketService.emitToMerchant(String(storeId), 'ORDER_ESCALATED', {
        orderId: String(order._id),
        orderNumber: order.orderNumber,
        status: order.status,
        reason: reason.trim(),
        priority: priority || 'high',
        timestamp: new Date(),
      });
    }

    logger.info(`[ADMIN ORDERS] Order ${order.orderNumber} escalated: ${reason.trim()}`);

    res.json({
      success: true,
      message: 'Order escalated successfully',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
      },
    });
  }));

/**
 * @route   PUT /api/admin/orders/:id/status
 * @desc    Update order status
 * @access  Admin
 */
router.put('/:id/status', requireSeniorAdmin, validate(adminOrderStatusSchema), asyncHandler(async (req: Request, res: Response) => {
    const { status, notes } = req.body;

    // Validate required fields
    if (!status || typeof status !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    // Validate status value
    if (!ORDER_STATUSES.includes(status as typeof ORDER_STATUSES[number])) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${ORDER_STATUSES.join(', ')}`
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Validate status transition
    if (!isValidTransition(order.status, status) && order.status !== status) {
      const allowedTransitions = STATUS_TRANSITIONS[order.status] || [];
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from '${order.status}' to '${status}'. Allowed transitions: ${allowedTransitions.join(', ') || 'none'}`
      });
    }

    // If status is same as current, no update needed
    if (order.status === status) {
      return res.json({
        success: true,
        message: 'Order status is already set to this value',
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          status: order.status
        }
      });
    }

    const previousStatus = order.status;

    // Update status using the model method if available, otherwise update directly
    if (order.updateStatus) {
      await order.updateStatus(status, notes ? `Admin update: ${notes}` : undefined, 'admin');
    } else {
      // Direct update
      order.status = status as any;

      // Update delivery status based on order status
      const deliveryStatusMap: { [key: string]: string } = {
        confirmed: 'confirmed',
        preparing: 'preparing',
        ready: 'ready',
        dispatched: 'dispatched',
        delivered: 'delivered',
        cancelled: 'failed',
        returned: 'returned'
      };

      if (deliveryStatusMap[status]) {
        order.delivery.status = deliveryStatusMap[status] as any;
      }

      // Set timestamps for specific statuses
      if (status === 'dispatched') {
        order.delivery.dispatchedAt = new Date();
      } else if (status === 'delivered') {
        order.delivery.deliveredAt = new Date();
        order.delivery.actualTime = new Date();
      } else if (status === 'cancelled') {
        order.cancelledAt = new Date();
      } else if (status === 'returned') {
        order.returnedAt = new Date();
      }

      // Add timeline entry
      order.timeline.push({
        status,
        message: notes ? `Status updated to ${status}. Notes: ${notes}` : `Status updated to ${status}`,
        timestamp: new Date(),
        updatedBy: 'admin',
        metadata: {
          previousStatus,
          notes: notes || undefined
        }
      });

      await order.save();
    }

    logger.info(`[ORDER:STATUS] orderId=${order._id} orderNumber=${order.orderNumber} from=${previousStatus} to=${status} adminId=${(req as any).userId}`);

    // Record metrics
    recordStatusTransition(previousStatus, status);
    // Record duration in previous status
    const lastTimelineEntry = order.timeline?.slice(-2, -1)?.[0];
    if (lastTimelineEntry?.timestamp) {
      const durationSec = (Date.now() - new Date(lastTimelineEntry.timestamp).getTime()) / 1000;
      recordStatusDuration(previousStatus, durationSec);
    }

    // If status changed to 'delivered', trigger all delivery rewards
    if (status === 'delivered') {
      const populatedOrder = await Order.findById(order._id)
        .populate('items.product', 'name images')
        .populate('items.store', 'name logo')
        .populate('user', 'profile.firstName profile.lastName');

      if (populatedOrder) {
        const storeData = populatedOrder.items[0]?.store as any;
        const storeName = storeData?.name || 'Store';
        const userIdObj = typeof populatedOrder.user === 'object' ? (populatedOrder.user as any)._id : populatedOrder.user;

        // 1. Activity logging
        try {
          await activityService.order.onOrderDelivered(
            userIdObj as Types.ObjectId,
            populatedOrder._id as Types.ObjectId,
            storeName
          );
        } catch (err) {
          logger.error('[ADMIN ORDERS] Activity logging failed:', err);
        }

        // 2. Referral rewards
        try {
          await referralService.processFirstOrder({
            refereeId: userIdObj as Types.ObjectId,
            orderId: populatedOrder._id as Types.ObjectId,
            orderAmount: populatedOrder.totals.total,
          });
          const deliveredOrdersCount = await Order.countDocuments({ user: userIdObj, status: 'delivered' });
          if (deliveredOrdersCount >= 3) {
            await referralService.processMilestoneBonus(userIdObj as Types.ObjectId, deliveredOrdersCount);
          }
        } catch (err) {
          logger.error('[ADMIN ORDERS] Referral rewards failed:', err);
        }

        // 3. Award 5% purchase reward coins (5% of subtotal)
        try {
          const coinService = require('../../services/coinService');
          const coinsToAward = Math.floor(populatedOrder.totals.subtotal * 0.05);
          if (coinsToAward > 0) {
            await coinService.awardCoins(
              userIdObj.toString(),
              coinsToAward,
              'purchase_reward',
              `5% purchase reward for order ${populatedOrder.orderNumber}`,
              { orderId: populatedOrder._id }
            );
            logger.info(`[ADMIN ORDERS] Awarded ${coinsToAward} purchase reward coins`);
          }
        } catch (err) {
          logger.error('[ADMIN ORDERS] Purchase reward coins failed:', err);
        }

        // 4. Enqueue cashback (processed async by worker)
        try {
          await QueueService.enqueueCashback({
            orderId: (populatedOrder._id as Types.ObjectId).toString(),
            triggeredBy: 'admin_delivery',
            idempotencyKey: `cashback:order:${populatedOrder._id}`,
          });
        } catch (err) {
          logger.error('[ADMIN ORDERS] Cashback enqueue failed:', err);
        }

        // 5. Create user products
        try {
          await userProductService.createUserProductsFromOrder(populatedOrder._id as Types.ObjectId);
        } catch (err) {
          logger.error('[ADMIN ORDERS] User products creation failed:', err);
        }

        // 6. Award store branded coins
        try {
          let userTier = 'free';
          try {
            const subscription = await Subscription.findOne({ user: userIdObj, status: 'active' }).select('tier').lean();
            if (subscription?.tier) userTier = subscription.tier;
          } catch (tierErr) { /* use free */ }

          const orderValue = populatedOrder.totals.total;
          const coinsToEarn = calculatePromoCoinsWithTierBonus(orderValue, userTier);
          if (coinsToEarn > 0) {
            const storeId = typeof storeData === 'object' ? storeData._id : storeData;
            const storeLogo = typeof storeData === 'object' ? storeData.logo : undefined;
            if (storeId) {
              const wallet = await Wallet.findOne({ user: userIdObj });
              if (wallet) {
                await wallet.addBrandedCoins(
                  new Types.ObjectId(storeId.toString()),
                  storeName,
                  coinsToEarn,
                  storeLogo
                );
              }
            }
          }
        } catch (err) {
          logger.error('[ADMIN ORDERS] Branded coins failed:', err);
        }

        // 7. Achievement update
        try {
          await achievementService.triggerAchievementUpdate(populatedOrder.user, 'order_delivered');
        } catch (err) {
          logger.error('[ADMIN ORDERS] Achievement update failed:', err);
        }

        // 8. Partner progress
        try {
          const partnerService = require('../../services/partnerService').default;
          await partnerService.updatePartnerProgress(
            userIdObj.toString(),
            (populatedOrder._id as Types.ObjectId).toString()
          );
        } catch (err) {
          logger.error('[ADMIN ORDERS] Partner progress failed:', err);
        }

        // 9. Credit merchant wallet (subtotal minus 15% platform fee)
        try {
          const firstItem = populatedOrder.items[0];
          if (firstItem && firstItem.store) {
            const storeId = typeof firstItem.store === 'object'
              ? (firstItem.store as any)._id
              : firstItem.store;

            const store = await Store.findById(storeId).lean();
            if (store && store.merchantId) {
              const grossAmount = populatedOrder.totals.subtotal || 0;
              const platformFee = populatedOrder.totals.platformFee || 0;

              const walletResult = await merchantWalletService.creditOrderPayment(
                store.merchantId.toString(),
                populatedOrder._id as Types.ObjectId,
                populatedOrder.orderNumber,
                grossAmount,
                platformFee,
                storeId
              );

              logger.info(`[ADMIN ORDERS] Merchant wallet credited: gross=${grossAmount}, fee=${platformFee}, net=${grossAmount - platformFee}`);

              // Record ledger entry for merchant payout (non-blocking)
              try {
                const ledgerService = require('../../services/ledgerService').default || require('../../services/ledgerService');
                const PLATFORM_FLOAT_ID_PAYOUT = new Types.ObjectId('000000000000000000000002');
                const netPayout = grossAmount - platformFee;
                if (netPayout > 0) {
                  await ledgerService.recordEntry({
                    debitAccount: { type: 'platform_float' as const, id: PLATFORM_FLOAT_ID_PAYOUT },
                    creditAccount: { type: 'merchant_wallet' as const, id: new Types.ObjectId(store.merchantId.toString()) },
                    amount: netPayout,
                    coinType: 'nuqta',
                    operationType: 'merchant_payout' as const,
                    referenceId: String(populatedOrder._id),
                    referenceModel: 'Order',
                    metadata: {
                      description: `Merchant payout for order ${populatedOrder.orderNumber}. Gross: ${grossAmount}, Fee: ${platformFee}, Net: ${netPayout}`,
                      idempotencyKey: `merchant_payout_${String(populatedOrder._id)}`,
                    },
                  });
                  logger.info(`✅ [ORDER:LEDGER] Merchant payout ledger entry: ${netPayout}, order ${populatedOrder.orderNumber}`);
                }

                // Record platform fee ledger entry
                if (platformFee > 0) {
                  const PLATFORM_FEES_ID = new Types.ObjectId('000000000000000000000001');
                  await ledgerService.recordEntry({
                    debitAccount: { type: 'platform_float' as const, id: PLATFORM_FLOAT_ID_PAYOUT },
                    creditAccount: { type: 'platform_fees' as const, id: PLATFORM_FEES_ID },
                    amount: platformFee,
                    coinType: 'nuqta',
                    operationType: 'order_payment' as const,
                    referenceId: String(populatedOrder._id),
                    referenceModel: 'Order',
                    metadata: {
                      description: `Platform fee for order ${populatedOrder.orderNumber}`,
                      idempotencyKey: `platform_fee_${String(populatedOrder._id)}`,
                    },
                  });
                  logger.info(`✅ [ORDER:LEDGER] Platform fee ledger entry: ${platformFee}, order ${populatedOrder.orderNumber}`);
                }
              } catch (ledgerErr) {
                logger.error('[ORDER:LEDGER] Failed to create merchant payout ledger entry (non-blocking):', ledgerErr);
              }

              if (walletResult) {
                orderSocketService.emitMerchantWalletUpdated({
                  merchantId: store.merchantId.toString(),
                  storeId: storeId.toString(),
                  storeName: store.name,
                  transactionType: 'credit',
                  amount: grossAmount - platformFee,
                  orderId: (populatedOrder._id as Types.ObjectId).toString(),
                  orderNumber: populatedOrder.orderNumber,
                  newBalance: {
                    total: walletResult.balance?.total || 0,
                    available: walletResult.balance?.available || 0,
                    pending: walletResult.balance?.pending || 0
                  },
                  timestamp: new Date()
                });
              }
            }
          }
        } catch (err) {
          logger.error('[ADMIN ORDERS] Merchant wallet credit failed:', err);
        }

        // 10. Credit 5% admin commission (5% of subtotal)
        try {
          const adminWalletService = require('../../services/adminWalletService').default;
          const subtotal = populatedOrder.totals.subtotal || 0;
          const adminCommission = Math.floor(subtotal * 0.05);
          if (adminCommission > 0) {
            await adminWalletService.creditOrderCommission(
              populatedOrder._id as Types.ObjectId,
              populatedOrder.orderNumber,
              subtotal
            );
            logger.info(`[ADMIN ORDERS] Admin wallet credited: ${adminCommission}`);
          }
        } catch (err) {
          logger.error('[ADMIN ORDERS] Admin commission credit failed:', err);
        }

        logger.info(`[ORDER:DELIVERED] orderId=${order._id} orderNumber=${order.orderNumber} userId=${userIdObj} total=${populatedOrder.totals.total} subtotal=${populatedOrder.totals.subtotal} platformFee=${populatedOrder.totals.platformFee || 0}`);
      }
    }

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        previousStatus,
        status: order.status,
        deliveryStatus: order.delivery.status,
        notes: notes || null
      }
    });
  }));

export default router;
