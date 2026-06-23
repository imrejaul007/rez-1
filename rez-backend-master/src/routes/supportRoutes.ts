import { Router } from 'express';
import {
  createTicket,
  getMyTickets,
  getTicketById,
  addMessageToTicket,
  closeTicket,
  reopenTicket,
  rateTicket,
  getTicketsSummary,
  getAllFAQs,
  searchFAQs,
  getFAQCategories,
  getPopularFAQs,
  markFAQHelpful,
  trackFAQView,
  createOrderIssueTicket,
  reportProductIssue,
  getPublicSupportConfig,
  requestCallback,
  markTicketAsRead,
} from '../controllers/supportController';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validateQuery, validateParams, validate, commonSchemas } from '../middleware/validation';
import { Joi } from '../middleware/validation';
import { createRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// ==================== CONFIG & CALLBACK ROUTES ====================

// Get public support config (hours, phones, categories)
router.get('/config/public',
  optionalAuth,
  getPublicSupportConfig
);

// Rate limiter for callback requests (5 per hour per IP)
const callbackLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many callback requests. Please try again later.',
});

// Request a callback
router.post('/callback',
  authenticate,
  callbackLimiter,
  validate(Joi.object({
    category: Joi.string().trim().min(2).max(50).required(),
    phoneNumber: Joi.string().trim().pattern(/^\d{7,15}$/).required()
      .messages({ 'string.pattern.base': 'Phone number must be 7-15 digits' }),
    countryCode: Joi.string().trim().pattern(/^\+[1-9]\d{0,3}$/).required()
      .messages({ 'string.pattern.base': 'Country code must start with + followed by 1-4 digits' }),
    notes: Joi.string().trim().max(500).allow('').optional(),
    idempotencyKey: Joi.string().max(100).optional(),
  })),
  requestCallback
);

// ==================== TICKET ROUTES ====================

// Get tickets summary
router.get('/tickets/summary',
  authenticate,
  getTicketsSummary
);

// Create ticket
router.post('/tickets',
  authenticate,
  validate(Joi.object({
    subject: Joi.string().trim().min(5).max(200).required(),
    category: Joi.string().valid('order', 'payment', 'product', 'account', 'technical', 'delivery', 'refund', 'other').required(),
    message: Joi.string().trim().min(10).max(5000).required(),
    relatedEntity: Joi.object({
      type: Joi.string().valid('order', 'product', 'transaction', 'none').required(),
      id: commonSchemas.objectId(),
    }),
    attachments: Joi.array().items(Joi.string().uri()),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent'),
    idempotencyKey: Joi.string().max(100).optional(),
    tags: Joi.array().items(Joi.string().trim().max(50)).max(10).optional(),
  })),
  createTicket
);

// Get user's tickets
router.get('/tickets',
  authenticate,
  validateQuery(Joi.object({
    status: Joi.string().valid('open', 'in_progress', 'waiting_customer', 'resolved', 'closed'),
    category: Joi.string().valid('order', 'payment', 'product', 'account', 'technical', 'delivery', 'refund', 'other'),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent'),
    dateFrom: Joi.date().iso(),
    dateTo: Joi.date().iso(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
  })),
  getMyTickets
);

// Get ticket by ID
router.get('/tickets/:id',
  authenticate,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required(),
  })),
  getTicketById
);

// Add message to ticket
router.post('/tickets/:id/messages',
  authenticate,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required(),
  })),
  validate(Joi.object({
    message: Joi.string().trim().min(1).max(5000).required(),
    attachments: Joi.array().items(Joi.string().uri()),
  })),
  addMessageToTicket
);

// Close ticket
router.post('/tickets/:id/close',
  authenticate,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required(),
  })),
  closeTicket
);

// Reopen ticket
router.post('/tickets/:id/reopen',
  authenticate,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required(),
  })),
  validate(Joi.object({
    reason: Joi.string().trim().min(5).max(500).required(),
  })),
  reopenTicket
);

// Rate ticket
router.post('/tickets/:id/rate',
  authenticate,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required(),
  })),
  validate(Joi.object({
    score: Joi.number().integer().min(1).max(5).required(),
    comment: Joi.string().trim().max(1000),
  })),
  rateTicket
);

// Mark messages as read
router.post('/tickets/:id/read',
  authenticate,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required(),
  })),
  markTicketAsRead
);

// ==================== FAQ ROUTES ====================

// Search FAQs
router.get('/faq/search',
  optionalAuth,
  validateQuery(Joi.object({
    q: Joi.string().trim().min(2).max(100).required(),
    limit: Joi.number().integer().min(1).max(50).default(10),
  })),
  searchFAQs
);

// Get FAQ categories
router.get('/faq/categories',
  optionalAuth,
  getFAQCategories
);

// Get popular FAQs
router.get('/faq/popular',
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10),
  })),
  getPopularFAQs
);

// Get all FAQs
router.get('/faq',
  optionalAuth,
  validateQuery(Joi.object({
    category: Joi.string().trim(),
    subcategory: Joi.string().trim(),
    limit: Joi.number().integer().min(1).max(100).default(100),
  })),
  getAllFAQs
);

// Mark FAQ as helpful/not helpful
router.post('/faq/:id/helpful',
  optionalAuth,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required(),
  })),
  validate(Joi.object({
    helpful: Joi.boolean().required(),
  })),
  markFAQHelpful
);

// Track FAQ view
router.post('/faq/:id/view',
  optionalAuth,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required(),
  })),
  trackFAQView
);

// ==================== QUICK ACTIONS ====================

// Create order issue ticket
router.post('/quick-actions/order-issue',
  authenticate,
  validate(Joi.object({
    orderId: commonSchemas.objectId().required(),
    issueType: Joi.string().trim().min(3).max(100).required(),
    description: Joi.string().trim().min(10).max(5000).required(),
  })),
  createOrderIssueTicket
);

// Report product issue
router.post('/quick-actions/report-product',
  authenticate,
  validate(Joi.object({
    productId: commonSchemas.objectId().required(),
    issueType: Joi.string().trim().min(3).max(100).required(),
    description: Joi.string().trim().min(10).max(5000).required(),
    images: Joi.array().items(Joi.string().uri()),
  })),
  reportProductIssue
);

export default router;
