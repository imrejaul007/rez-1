import { Router } from 'express';
import {
  createOrder,
  getUserOrders,
  getOrderCounts,
  getOrderById,
  cancelOrder,
  updateOrderStatus,
  getOrderTracking,
  rateOrder,
  getOrderStats,
  reorderFullOrder,
  reorderItems,
  validateReorder,
  getFrequentlyOrdered,
  getReorderSuggestions,
  requestRefund,
  getUserRefunds,
  getRefundDetails,
  getOrderFinancialDetails
} from '../controllers/orderController';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validate, validateParams, validateQuery, orderSchemas, commonSchemas } from '../middleware/validation';
import { generalLimiter } from '../middleware/rateLimiter';
import { Joi } from '../middleware/validation';
import { idempotencyMiddleware } from '../middleware/idempotency';

const router = Router();
router.use(generalLimiter);

// All order routes require authentication
router.use(authenticate);

// Get user's order statistics
router.get('/stats',
  getOrderStats
);

// Get reorder suggestions
router.get('/reorder/suggestions',
  getReorderSuggestions
);

// Get frequently ordered items
router.get('/reorder/frequently-ordered',
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10)
  })),
  getFrequentlyOrdered
);

// Get order counts (lightweight, for header display)
router.get('/counts',
  getOrderCounts
);

// Get user's orders (supports server-side search, filter, sort)
router.get('/',
  validateQuery(Joi.object({
    status: Joi.string().valid(
      'all', 'placed', 'confirmed', 'preparing', 'ready',
      'dispatched', 'delivered', 'cancelled', 'returned', 'refunded'
    ),
    statusGroup: Joi.string().valid('active', 'past').optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    cursor: Joi.string().optional(),
    search: Joi.string().trim().max(100).allow('').optional(),
    dateFrom: Joi.date().iso().optional(),
    dateTo: Joi.date().iso().optional(),
    sort: Joi.string().valid('newest', 'oldest', 'amount_high', 'amount_low').default('newest')
  })),
  getUserOrders
);

// Create new order
router.post('/',
  // Order creation is gated by generalLimiter in production (commented out
  // for dev only). The controller also takes an `idempotencyKey` body field
  // for fine-grained dedup; we additionally support header-based idempotency
  // via idempotencyMiddleware so retried requests from the same client get
  // the cached response.
  generalLimiter,
  idempotencyMiddleware({ ttlSeconds: 600 }),
  validate(orderSchemas.createOrder),
  createOrder
);

// IMPORTANT: Static routes must come BEFORE parameterized routes
// Get user's refund history (moved here from below to prevent /:orderId from catching '/refunds')
router.get('/refunds',
  validateQuery(Joi.object({
    status: Joi.string().valid('pending', 'processing', 'completed', 'failed', 'cancelled'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getUserRefunds
);

// Get refund details (moved here from below)
router.get('/refunds/:refundId',
  validateParams(Joi.object({
    refundId: commonSchemas.objectId().required()
  })),
  getRefundDetails
);

// Get single order by ID
router.get('/:orderId',
  validateParams(Joi.object({
    orderId: commonSchemas.objectId().required()
  })),
  // IDOR protection: verify order ownership before controller access
  async (req, res, next) => {
    const { Order } = await import('../models/Order');
    const order = await Order.findById(req.params.orderId).select('_id user').lean();
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.user.toString() !== req.userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    next();
  },
  getOrderById
);

// Get order financial details (ledger trail, coin transactions, refunds)
router.get('/:orderId/financial',
  validateParams(Joi.object({
    orderId: commonSchemas.objectId().required()
  })),
  // IDOR protection: verify order ownership before controller access
  async (req, res, next) => {
    const { Order } = await import('../models/Order');
    const order = await Order.findById(req.params.orderId).select('_id user').lean();
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.user.toString() !== req.userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    next();
  },
  getOrderFinancialDetails
);

// Cancel order
router.patch('/:orderId/cancel',
  validateParams(Joi.object({
    orderId: commonSchemas.objectId().required()
  })),
  validate(Joi.object({
    reason: Joi.string().trim().max(500)
  })),
  cancelOrder
);

// Get order tracking
router.get('/:orderId/tracking',
  validateParams(Joi.object({
    orderId: commonSchemas.objectId().required()
  })),
  getOrderTracking
);

// Rate and review order
router.post('/:orderId/rate',
  validateParams(Joi.object({
    orderId: commonSchemas.objectId().required()
  })),
  validate(Joi.object({
    rating: Joi.number().integer().min(1).max(5).required(),
    review: Joi.string().trim().max(1000)
  })),
  rateOrder
);

// Validate reorder (check availability and prices)
router.get('/:orderId/reorder/validate',
  validateParams(Joi.object({
    orderId: commonSchemas.objectId().required()
  })),
  validateQuery(Joi.object({
    itemIds: Joi.alternatives().try(
      Joi.array().items(commonSchemas.objectId()),
      commonSchemas.objectId()
    )
  })),
  validateReorder
);

// Re-order full order
router.post('/:orderId/reorder',
  validateParams(Joi.object({
    orderId: commonSchemas.objectId().required()
  })),
  reorderFullOrder
);

// Re-order selected items
router.post('/:orderId/reorder/items',
  validateParams(Joi.object({
    orderId: commonSchemas.objectId().required()
  })),
  validate(Joi.object({
    itemIds: Joi.array().items(commonSchemas.objectId()).min(1).required()
  })),
  reorderItems
);

// Refund routes
// Request refund for an order
router.post('/:orderId/refund-request',
  validateParams(Joi.object({
    orderId: commonSchemas.objectId().required()
  })),
  validate(Joi.object({
    reason: Joi.string().trim().min(10).max(500).required(),
    refundItems: Joi.array().items(Joi.object({
      itemId: commonSchemas.objectId().required(),
      quantity: Joi.number().integer().min(1).required()
    })).optional()
  })),
  requestRefund
);

// Note: /refunds and /refunds/:refundId routes are defined above /:orderId to prevent route conflicts

// Admin/Store Owner Routes
// Update order status
router.patch('/:orderId/status',
  requireAdmin,
  validateParams(Joi.object({
    orderId: commonSchemas.objectId().required()
  })),
  validate(Joi.object({
    status: Joi.string().valid('placed', 'confirmed', 'preparing', 'ready', 'dispatched', 'delivered', 'cancelled', 'returned', 'refunded').required(),
    estimatedDeliveryTime: Joi.date().iso(),
    trackingInfo: Joi.object({
      trackingNumber: Joi.string().trim(),
      carrier: Joi.string().trim(),
      estimatedDelivery: Joi.date().iso(),
      location: Joi.string().trim(),
      notes: Joi.string().trim().max(500)
    })
  })),
  updateOrderStatus
);

export default router;