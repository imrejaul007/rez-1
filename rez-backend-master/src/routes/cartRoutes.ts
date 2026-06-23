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
  getLockFeeOptions
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
  // generalLimiter,, // Disabled for development
  getCart
);

// Get cart summary
router.get('/summary', 
  // generalLimiter,, // Disabled for development
  getCartSummary
);

// Validate cart
router.get('/validate', 
  // generalLimiter,, // Disabled for development
  validateCart
);

// Add item to cart
router.post('/add', 
  // generalLimiter,, // Disabled for development
  validate(cartSchemas.addToCart),
  addToCart
);

// Update cart item
router.put('/item/:productId', 
  // generalLimiter,, // Disabled for development
  validateParams(Joi.object({
    productId: commonSchemas.objectId().required()
  })),
  validate(cartSchemas.updateCartItem),
  updateCartItem
);

// Update cart item with variant
router.put('/item/:productId/:variant', 
  // generalLimiter,, // Disabled for development
  validateParams(Joi.object({
    productId: commonSchemas.objectId().required(),
    variant: Joi.string().required()
  })),
  validate(cartSchemas.updateCartItem),
  updateCartItem
);

// Remove item from cart
router.delete('/item/:productId', 
  // generalLimiter,, // Disabled for development
  validateParams(Joi.object({
    productId: commonSchemas.objectId().required()
  })),
  removeFromCart
);

// Remove item from cart with variant
router.delete('/item/:productId/:variant', 
  // generalLimiter,, // Disabled for development
  validateParams(Joi.object({
    productId: commonSchemas.objectId().required(),
    variant: Joi.string().required()
  })),
  removeFromCart
);

// Clear entire cart
router.delete('/clear', 
  // generalLimiter,, // Disabled for development
  clearCart
);

// Apply coupon
router.post('/coupon', 
  // generalLimiter,, // Disabled for development
  validate(cartSchemas.applyCoupon),
  applyCoupon
);

// Remove coupon
router.delete('/coupon',
  // generalLimiter,, // Disabled for development
  removeCoupon
);

// Lock item at current price
router.post('/lock',
  // generalLimiter,, // Disabled for development
  lockItem
);

// Get locked items
router.get('/locked',
  // generalLimiter,, // Disabled for development
  getLockedItems
);

// Unlock item
router.delete('/lock/:productId',
  // generalLimiter,, // Disabled for development
  validateParams(Joi.object({
    productId: commonSchemas.objectId().required()
  })),
  unlockItem
);

// Move locked item to cart
router.post('/lock/:productId/move-to-cart',
  // generalLimiter,, // Disabled for development
  validateParams(Joi.object({
    productId: commonSchemas.objectId().required()
  })),
  moveLockedToCart
);

// Lock item with payment (MakeMyTrip style)
router.post('/lock-with-payment',
  // generalLimiter,, // Disabled for development
  lockItemWithPayment
);

// Get lock fee options for a product
router.get('/lock-fee-options',
  // generalLimiter,, // Disabled for development
  getLockFeeOptions
);

export default router;