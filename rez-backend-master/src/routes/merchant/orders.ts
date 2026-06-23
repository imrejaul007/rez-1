import { Router } from 'express';
import {
  getMerchantOrders,
  getMerchantOrderById,
  getMerchantOrderAnalytics,
  bulkOrderAction,
  refundOrder,
  updateMerchantOrderStatus
} from '../../controllers/merchant/orderController';
import { authMiddleware as authenticateMerchant } from '../../middleware/merchantauth';
import { validate, validateParams, validateQuery, commonSchemas } from '../../middleware/validation';
import { Joi } from '../../middleware/validation';

const router = Router();

// All merchant order routes require authentication
router.use(authenticateMerchant);

// Enhanced GET /api/merchant/orders - List merchant orders with advanced filters
router.get('/',
  validateQuery(Joi.object({
    // Status filter
    status: Joi.string().valid(
      'placed', 'confirmed', 'preparing', 'ready', 'dispatched',
      'delivered', 'cancelled', 'returned', 'refunded'
    ),
    // Payment status filter
    paymentStatus: Joi.string().valid('pending', 'processing', 'paid', 'failed', 'refunded', 'partially_refunded'),
    // Date range filter
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')),
    // Search filter (orderNumber, customer name, email)
    search: Joi.string().trim().max(100),
    // Store filter (for multi-store merchants)
    storeId: commonSchemas.objectId(),
    // Sorting
    sortBy: Joi.string().valid('createdAt', 'total', 'status', 'orderNumber').default('createdAt'),
    order: Joi.string().valid('asc', 'desc').default('desc'),
    // Pagination
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  })),
  getMerchantOrders
);

// GET /api/merchant/orders/analytics - Get order analytics
router.get('/analytics',
  validateQuery(Joi.object({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')),
    storeId: commonSchemas.objectId(),
    interval: Joi.string().valid('day', 'week', 'month').default('day')
  })),
  getMerchantOrderAnalytics
);

// GET /api/merchant/orders/:id - Get single order by ID
router.get('/:id',
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  getMerchantOrderById
);

// PUT /api/merchant/orders/:id/status - Update single order status
router.put('/:id/status',
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  validate(Joi.object({
    status: Joi.string().valid(
      'confirmed', 'preparing', 'ready',
      'dispatched', 'out_for_delivery', 'delivered', 'cancelled'
    ).required(),
    notes: Joi.string().trim().max(500).optional(),
    notifyCustomer: Joi.boolean().default(true)
  })),
  updateMerchantOrderStatus
);

// POST /api/merchant/orders/bulk-action - Bulk order operations
router.post('/bulk-action',
  validate(Joi.object({
    action: Joi.string().valid('confirm', 'prepare', 'ready', 'deliver', 'cancel', 'mark-shipped').required(),
    orderIds: Joi.array().items(commonSchemas.objectId()).min(1).max(50).required(),
    reason: Joi.string().trim().max(500).when('action', {
      is: 'cancel',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    trackingInfo: Joi.object({
      trackingId: Joi.string().trim(),
      deliveryPartner: Joi.string().trim(),
      estimatedTime: Joi.date().iso()
    }).when('action', {
      is: 'mark-shipped',
      then: Joi.optional(),
      otherwise: Joi.forbidden()
    })
  })),
  bulkOrderAction
);

// POST /api/merchant/orders/:id/refund - Process order refund
router.post('/:id/refund',
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  validate(Joi.object({
    amount: Joi.number().min(0).required(),
    reason: Joi.string().trim().min(10).max(500).required(),
    refundItems: Joi.array().items(Joi.object({
      itemId: commonSchemas.objectId().required(),
      quantity: Joi.number().integer().min(1).required()
    })).optional(),
    notifyCustomer: Joi.boolean().default(true)
  })),
  refundOrder
);

export default router;
