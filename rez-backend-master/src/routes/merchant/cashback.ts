import { Router } from 'express';
import {
  listCashbackRequests,
  getCashbackRequest,
  getCashbackStats,
  createCashbackRequest,
  markCashbackAsPaid,
  bulkCashbackAction,
  exportCashbackData,
  getCashbackAnalytics,
  getCashbackMetrics,
  getPendingCashbackCount
} from '../../controllers/merchant/cashbackController';
import { authMiddleware as authenticateMerchant } from '../../middleware/merchantauth';
import { validate, validateParams, validateQuery, commonSchemas } from '../../middleware/validation';
import { Joi } from '../../middleware/validation';

const router = Router();

// All merchant cashback routes require authentication
router.use(authenticateMerchant);

/**
 * GET /api/merchant/cashback
 * List all cashback requests
 */
router.get('/',
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid(
      'pending', 'under_review', 'approved', 'rejected', 'paid', 'expired', 'cancelled'
    ).optional()
  })),
  listCashbackRequests
);

/**
 * GET /api/merchant/cashback/stats
 * Get cashback statistics
 */
router.get('/stats',
  validateQuery(Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional()
  })),
  getCashbackStats
);

/**
 * GET /api/merchant/cashback/pending-count
 * Get count of pending cashback approvals
 */
router.get('/pending-count',
  getPendingCashbackCount
);

/**
 * GET /api/merchant/cashback/export
 * Export cashback data to CSV/Excel
 */
router.get('/export',
  validateQuery(Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
    status: Joi.string().valid(
      'pending', 'under_review', 'approved', 'rejected', 'paid', 'expired', 'cancelled'
    ).optional(),
    format: Joi.string().valid('csv', 'excel').default('csv')
  })),
  exportCashbackData
);

/**
 * GET /api/merchant/cashback/analytics
 * Get cashback analytics and trends
 */
router.get('/analytics',
  validateQuery(Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
    storeId: commonSchemas.objectId().optional()
  })),
  getCashbackAnalytics
);

/**
 * GET /api/merchant/cashback/metrics
 * Get enhanced cashback metrics with trends and comparisons
 */
router.get('/metrics',
  validateQuery(Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional()
  })),
  getCashbackMetrics
);

/**
 * GET /api/merchant/cashback/:id
 * Get single cashback request with complete details
 */
router.get('/:id',
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  getCashbackRequest
);

/**
 * POST /api/merchant/cashback
 * Create new cashback request
 */
router.post('/',
  validate(Joi.object({
    orderId: commonSchemas.objectId().required(),
    customerId: commonSchemas.objectId().required(),
    amount: Joi.number().min(0).required(),
    reason: Joi.string().trim().max(500).optional()
  })),
  createCashbackRequest
);

/**
 * PUT /api/merchant/cashback/:id/mark-paid
 * Mark cashback request as paid
 */
router.put('/:id/mark-paid',
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  validate(Joi.object({
    paymentMethod: Joi.string().valid('wallet', 'bank_transfer', 'check').required(),
    paymentReference: Joi.string().trim().required(),
    notes: Joi.string().trim().max(500).optional()
  })),
  markCashbackAsPaid
);

/**
 * POST /api/merchant/cashback/bulk-action
 * Bulk approve/reject cashback requests
 */
router.post('/bulk-action',
  validate(Joi.object({
    action: Joi.string().valid('approve', 'reject').required(),
    cashbackIds: Joi.array().items(commonSchemas.objectId()).min(1).max(50).required(),
    reason: Joi.string().trim().max(500).when('action', {
      is: 'reject',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    notes: Joi.string().trim().max(500).optional()
  })),
  bulkCashbackAction
);

export default router;
