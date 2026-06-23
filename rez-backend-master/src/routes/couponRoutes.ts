import { Router } from 'express';
import {
  getAvailableCoupons,
  getFeaturedCoupons,
  getMyCoupons,
  claimCoupon,
  validateCoupon,
  getBestOffer,
  removeCoupon,
  searchCoupons,
  getCouponDetails
} from '../controllers/couponController';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validateQuery, validateParams, validate, commonSchemas } from '../middleware/validation';
import { Joi } from '../middleware/validation';

const router = Router();

// Public Routes - Coupon Discovery

// Search coupons
router.get('/search',
  optionalAuth,
  validateQuery(Joi.object({
    q: Joi.string().trim().min(1).max(100).required(),
    category: Joi.string().trim(),
    tag: Joi.string().trim().lowercase()
  })),
  searchCoupons
);

// Get featured coupons
router.get('/featured',
  optionalAuth,
  getFeaturedCoupons
);

// Get all available coupons with filters
router.get('/',
  optionalAuth,
  validateQuery(Joi.object({
    category: Joi.string().trim(),
    tag: Joi.string().trim().lowercase(),
    featured: Joi.boolean()
  })),
  getAvailableCoupons
);

// Authenticated Routes - User Coupon Management

// Get user's claimed coupons (MUST come before /:id route)
router.get('/my-coupons',
  authenticate,
  validateQuery(Joi.object({
    status: Joi.string().valid('available', 'used', 'expired'),
    category: Joi.string().max(100),
    limit: Joi.number().integer().min(1).max(50),
  })),
  getMyCoupons
);

// Get single coupon details (MUST come after /my-coupons route)
router.get('/:id',
  optionalAuth,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  getCouponDetails
);

// Claim a coupon
router.post('/:id/claim',
  authenticate,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  claimCoupon
);

// Validate coupon for cart
router.post('/validate',
  authenticate,
  validate(Joi.object({
    couponCode: Joi.string().trim().uppercase().required(),
    cartData: Joi.object({
      items: Joi.array().items(Joi.object({
        product: commonSchemas.objectId().required(),
        quantity: Joi.number().integer().min(1).required(),
        price: Joi.number().min(0).required(),
        category: commonSchemas.objectId(),
        store: commonSchemas.objectId()
      })).min(1).required(),
      subtotal: Joi.number().min(0).required()
    }).required()
  })),
  validateCoupon
);

// Get best coupon offer for cart
router.post('/best-offer',
  authenticate,
  validate(Joi.object({
    cartData: Joi.object({
      items: Joi.array().items(Joi.object({
        product: commonSchemas.objectId().required(),
        quantity: Joi.number().integer().min(1).required(),
        price: Joi.number().min(0).required(),
        category: commonSchemas.objectId(),
        store: commonSchemas.objectId()
      })).min(1).required(),
      subtotal: Joi.number().min(0).required()
    }).required()
  })),
  getBestOffer
);

// Remove claimed coupon
router.delete('/:id',
  authenticate,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  removeCoupon
);

export default router;
