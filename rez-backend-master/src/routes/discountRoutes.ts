import { Router } from 'express';
import {
  getDiscounts,
  getDiscountById,
  getDiscountsForProduct,
  validateDiscount,
  applyDiscount,
  getUserDiscountHistory,
  getDiscountAnalytics,
  getBillPaymentDiscounts,
  validateCardForOffers,
  applyCardOffer,
} from '../controllers/discountController';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validateQuery, validateParams, validate, commonSchemas } from '../middleware/validation';
import { Joi } from '../middleware/validation';

const router = Router();

// Public Routes (no authentication required)

// Get all discounts with filters
router.get(
  '/',
  optionalAuth,
  validateQuery(
    Joi.object({
      applicableOn: Joi.string().valid('bill_payment', 'card_payment', 'all', 'specific_products', 'specific_categories'),
      paymentMethod: Joi.string().valid('upi', 'card', 'all'),
      type: Joi.string().valid('percentage', 'fixed'),
      minValue: Joi.number().min(0),
      maxValue: Joi.number().min(0),
      orderValue: Joi.number().min(0).optional(), // Added: filter by minimum order value
      sortBy: Joi.string().valid('priority', 'value', 'createdAt').default('priority'),
      order: Joi.string().valid('asc', 'desc').default('desc'),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(20),
      storeId: Joi.string().optional(),
      cardType: Joi.string().valid('credit', 'debit', 'all').optional(), // Added: filter by card type
    })
  ),
  getDiscounts
);

// Get bill payment discounts
router.get(
  '/bill-payment',
  optionalAuth,
  validateQuery(
    Joi.object({
      orderValue: Joi.number().min(0).default(0),
      storeId: Joi.string().optional(), // Phase 2: Optional storeId for store-specific filtering
    })
  ),
  getBillPaymentDiscounts
);

// Get single discount by ID
router.get(
  '/:id',
  optionalAuth,
  validateParams(
    Joi.object({
      id: commonSchemas.objectId().required(),
    })
  ),
  getDiscountById
);

// Get discounts for a specific product
router.get(
  '/product/:productId',
  optionalAuth,
  validateParams(
    Joi.object({
      productId: commonSchemas.objectId().required(),
    })
  ),
  validateQuery(
    Joi.object({
      orderValue: Joi.number().min(0).default(0),
    })
  ),
  getDiscountsForProduct
);

// Validate discount code
router.post(
  '/validate',
  optionalAuth,
  validate(
    Joi.object({
      code: Joi.string().required().trim().uppercase(),
      orderValue: Joi.number().required().min(0),
      productIds: Joi.array().items(commonSchemas.objectId()),
      categoryIds: Joi.array().items(commonSchemas.objectId()),
    })
  ),
  validateDiscount
);

// Authenticated Routes (require user login)

// Apply discount to order
router.post(
  '/apply',
  authenticate,
  validate(
    Joi.object({
      discountId: commonSchemas.objectId().required(),
      orderId: commonSchemas.objectId().required(),
      orderValue: Joi.number().required().min(0),
    })
  ),
  applyDiscount
);

// Get user's discount usage history
router.get(
  '/my-history',
  authenticate,
  validateQuery(
    Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(20),
    })
  ),
  getUserDiscountHistory
);

// Get analytics for a discount (admin only)
router.get(
  '/:id/analytics',
  authenticate,
  validateParams(
    Joi.object({
      id: commonSchemas.objectId().required(),
    })
  ),
  getDiscountAnalytics
);

// Card Offers Routes

// Validate card for offers
router.post(
  '/card-offers/validate',
  optionalAuth,
  validate(
    Joi.object({
      cardNumber: Joi.string().required().min(13).max(19),
      storeId: commonSchemas.objectId().required(),
      orderValue: Joi.number().min(0).default(0),
    })
  ),
  validateCardForOffers
);

// Apply card offer
router.post(
  '/card-offers/apply',
  authenticate,
  validate(
    Joi.object({
      discountId: commonSchemas.objectId().required(),
      orderId: commonSchemas.objectId().optional(),
      cardLast4: Joi.string().optional().length(4),
    })
  ),
  applyCardOffer
);

export default router;
