import { Router } from 'express';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  applyCoupon,
  removeCoupon,
  getCartSummary,
  validateCart,
  lockItem,
  unlockItem,
  moveLockedToCart,
  getLockedItems,
  lockItemWithPayment,
  getLockFeeOptions,
  getCartValidationSummary,
  autoFixCart
} from '../controllers/cartController';
import { authenticate } from '../middleware/auth';
import { validate, validateParams, cartSchemas, commonSchemas } from '../middleware/validation';
import { generalLimiter } from '../middleware/rateLimiter';
import { Joi } from '../middleware/validation';

const router = Router();
router.use(generalLimiter);

// All cart routes require authentication
router.use(authenticate);

// Get user's cart
router.get('/',
  getCart
);

// Get cart summary
router.get('/summary',
  getCartSummary
);

// Validate cart
router.get('/validate',
  validateCart
);

// Add item to cart
router.post('/add',
  validate(cartSchemas.addToCart),
  addToCart
);

// Update cart item
router.put('/item/:productId',
  validateParams(Joi.object({
    productId: commonSchemas.objectId().required()
  })),
  validate(cartSchemas.updateCartItem),
  updateCartItem
);

// Update cart item with variant
router.put('/item/:productId/:variant',
  validateParams(Joi.object({
    productId: commonSchemas.objectId().required(),
    variant: Joi.string().required()
  })),
  validate(cartSchemas.updateCartItem),
  updateCartItem
);

// Remove item from cart
router.delete('/item/:productId',
  validateParams(Joi.object({
    productId: commonSchemas.objectId().required()
  })),
  removeFromCart
);

// Remove item from cart with variant
router.delete('/item/:productId/:variant',
  validateParams(Joi.object({
    productId: commonSchemas.objectId().required(),
    variant: Joi.string().required()
  })),
  removeFromCart
);

// Clear entire cart
router.delete('/clear',
  clearCart
);

// Apply coupon
router.post('/coupon',
  validate(cartSchemas.applyCoupon),
  applyCoupon
);

// Remove coupon
router.delete('/coupon',
  removeCoupon
);

// Lock item at current price
router.post('/lock',
  lockItem
);

// Get locked items
router.get('/locked',
  getLockedItems
);

// Unlock item
router.delete('/lock/:productId',
  validateParams(Joi.object({
    productId: commonSchemas.objectId().required()
  })),
  unlockItem
);

// Move locked item to cart
router.post('/lock/:productId/move-to-cart',
  validateParams(Joi.object({
    productId: commonSchemas.objectId().required()
  })),
  moveLockedToCart
);

// Lock item with payment (MakeMyTrip style)
router.post('/lock-with-payment',
  lockItemWithPayment
);

// Get lock fee options for a product
router.get('/lock-fee-options',
  getLockFeeOptions
);

// Get cart validation summary (summary of all validation issues)
router.get('/validate/summary',
  getCartValidationSummary
);

// Auto-fix cart by removing invalid items
router.post('/validate/auto-fix',
  autoFixCart
);

export default router;