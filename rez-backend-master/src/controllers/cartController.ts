import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Cart } from '../models/Cart';
import { Product } from '../models/Product';
import { Store } from '../models/Store';
import { logger } from '../config/logger';
import Event from '../models/Event';
import { pct } from '../utils/currency';
import {
  sendSuccess,
  sendNotFound,
  sendError,
  sendUnauthorized,
  sendConflict,
  sendBadRequest
} from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import redisService from '../services/redisService';
import { CacheTTL } from '../config/redis';
import { CacheKeys, CacheInvalidator } from '../utils/cacheHelper';
import reservationService from '../services/reservationService';
import { regionService, isValidRegion, RegionId, getRegionConfig } from '../services/regionService';

// Helper to get currency symbol from request
const getCurrencySymbolFromRequest = (req: Request): string => {
  const regionHeader = req.headers['x-rez-region'] as string;
  if (regionHeader && isValidRegion(regionHeader)) {
    const config = getRegionConfig(regionHeader as RegionId);
    return config?.currencySymbol || '₹';
  }
  return '₹'; // Default to INR
};


// Get user's active cart
export const getCart = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) {
    return sendUnauthorized(res, 'Authentication required');
  }

  try {
    logger.info('🛒 [GET CART] Getting cart for user:', req.userId);

    // Try to get from cache first
    const cacheKey = CacheKeys.cart(req.userId);
    const cachedCart = await redisService.get<any>(cacheKey);

    if (cachedCart) {
      logger.info('✅ [GET CART] Returning from cache');
      return sendSuccess(res, cachedCart, 'Cart retrieved successfully');
    }

    let cart: any = await Cart.getActiveCart(req.userId);
    logger.info('🛒 [GET CART] Found existing cart:', cart ? 'Yes' : 'No');

    // Create empty cart if doesn't exist
    if (!cart) {
      logger.info('🛒 [GET CART] Creating new cart...');
      cart = new Cart({
        user: req.userId,
        items: [],
        totals: {
          subtotal: 0,
          tax: 0,
          delivery: 0,
          discount: 0,
          cashback: 0,
          total: 0,
          savings: 0
        },
        isActive: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
      });
      await cart.save();
      logger.info('🛒 [GET CART] New cart created:', cart._id);
    }

    // Check if cart is expired
    const isExpired = cart.expiresAt && cart.expiresAt < new Date();
    if (isExpired) {
      logger.info('🛒 [GET CART] Cart expired, clearing...');
      await cart.clearCart();
      await cart.save();
    }

    // BUGFIX: Recalculate totals if total is 0 but subtotal > 0 (stale data)
    if (cart.items.length > 0 && cart.totals.subtotal > 0 && cart.totals.total === 0) {
      logger.info('🛒 [GET CART] Detected stale totals (total=0 but subtotal>0), recalculating...');
      await cart.calculateTotals();
      await cart.save();
      logger.info('🛒 [GET CART] Totals recalculated:', cart.totals);
    }

    // Hydrate product / store / address refs in a single batched query per
    // collection. Replaces the 5+ populate() calls that issued one query
    // per referenced document.
    if (cart.items && cart.items.length > 0) {
      const productIds = new Set<string>();
      const storeIds = new Set<string>();
      for (const it of cart.items) {
        if (it.product) productIds.add(String(it.product));
        if (it.store) storeIds.add(String(it.store));
      }
      const [products, stores] = await Promise.all([
        productIds.size > 0
          ? Product.find({ _id: { $in: Array.from(productIds) } }, 'name images pricing inventory isActive').lean()
          : Promise.resolve([] as any[]),
        storeIds.size > 0
          ? Store.find({ _id: { $in: Array.from(storeIds) } }, 'name location isActive').lean()
          : Promise.resolve([] as any[]),
      ]);
      const productMap = new Map(products.map((p: any) => [String(p._id), p]));
      const storeMap = new Map(stores.map((s: any) => [String(s._id), s]));
      cart.items = cart.items.map((it: any) => ({
        ...it,
        product: it.product ? productMap.get(String(it.product)) || it.product : null,
        store: it.store ? storeMap.get(String(it.store)) || it.store : null,
      }));
    }

    // Cache the cart data
    await redisService.set(cacheKey, cart, CacheTTL.CART_DATA);

    logger.info('🛒 [GET CART] Returning cart with', cart.items.length, 'items');
    sendSuccess(res, cart, 'Cart retrieved successfully');

  } catch (error) {
    logger.error('❌ [GET CART] Error occurred:', error);
    logger.error('❌ [GET CART] Error message:', error instanceof Error ? error.message : 'Unknown error');
    logger.error('❌ [GET CART] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    throw new AppError('Failed to get cart', 500);
  }
});

// Add item to cart
export const addToCart = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) {
    return sendUnauthorized(res, 'Authentication required');
  }

  const { productId, quantity, variant, metadata, itemType, serviceBookingDetails } = req.body;

  try {
    logger.info('🛒 [ADD TO CART] Starting add to cart for user:', req.userId);
    logger.info('🛒 [ADD TO CART] Request data:', { productId, quantity, variant, metadata, itemType, serviceBookingDetails });

    // Verify product exists and is available
    logger.info('🛒 [ADD TO CART] Finding product:', productId);
    let product = await Product.findById(productId).populate('store').lean() as any;
    let event = null;
    let isEvent = false;
    let isService = itemType === 'service';

    // If product not found, check if it's an event
    if (!product) {
      logger.info('🛒 [ADD TO CART] Product not found, checking if it\'s an event:', productId);
      event = await Event.findById(productId).lean() as any;

      if (event) {
        logger.info('✅ [ADD TO CART] Event found:', event.title);
        isEvent = true;

        // Validate event is published and available
        if (event.status !== 'published') {
          logger.info('❌ [ADD TO CART] Event not available:', event.status);
          return sendNotFound(res, 'Event not available');
        }
      } else {
        logger.info('❌ [ADD TO CART] Product/Event not found:', productId);
        return sendNotFound(res, 'Product not found');
      }
    }

    // Check if product is a service
    if (product && product.productType === 'service') {
      isService = true;
      logger.info('✅ [ADD TO CART] Service found:', product.name);
    }

    // Handle product-specific validation
    if (!isEvent && !isService && product) {
      logger.info('✅ [ADD TO CART] Product found:', product.name);
      logger.info('🛒 [ADD TO CART] Product status:', {
        isActive: product.isActive,
        inventoryAvailable: product.inventory?.isAvailable,
        stock: product.inventory?.stock
      });

      if (!product.isActive || !product.inventory.isAvailable) {
        logger.info('❌ [ADD TO CART] Product not available');
        return sendNotFound(res, 'Product not available');
      }
    }

    // Validate service booking details
    if (isService && serviceBookingDetails) {
      if (!serviceBookingDetails.bookingDate) {
        return sendBadRequest(res, 'Booking date is required for service items');
      }
      if (!serviceBookingDetails.timeSlot || !serviceBookingDetails.timeSlot.start) {
        return sendBadRequest(res, 'Time slot is required for service items');
      }
      logger.info('✅ [ADD TO CART] Service booking details validated:', serviceBookingDetails);
    }

    // Check stock availability with comprehensive validation (only for products, not services)
    if (!isEvent && !isService && product) {
      let availableStock = product.inventory.stock;
      const lowStockThreshold = product.inventory.lowStockThreshold || 5;
      let variantInfo = '';

      logger.info('🛒 [ADD TO CART] Available stock:', availableStock);
      logger.info('🛒 [ADD TO CART] Low stock threshold:', lowStockThreshold);

      // Handle variant stock checking
      if (variant && product.inventory.variants) {
        logger.info('🛒 [ADD TO CART] Checking variant:', variant);
        const variantObj = product.inventory.variants.find(
          (v: any) => v.type === variant.type && v.value === variant.value
        );

        if (!variantObj) {
          logger.info('❌ [ADD TO CART] Product variant not found');
          return sendError(res, `Product variant "${variant.value}" is not available`, 400);
        }

        availableStock = variantObj.stock;
        variantInfo = ` (${variant.type}: ${variant.value})`;
        logger.info('🛒 [ADD TO CART] Variant stock:', availableStock);
      }

      // Stock validation with detailed error messages
      if (!product.inventory.unlimited) {
        // Check if product is completely out of stock
        if (availableStock === 0) {
          logger.info('❌ [ADD TO CART] Product out of stock');
          return sendError(
            res,
            `${product.name}${variantInfo} is currently out of stock`,
            400
          );
        }

        // Check if requested quantity exceeds available stock
        if (availableStock < quantity) {
          logger.info('❌ [ADD TO CART] Insufficient stock. Available:', availableStock, 'Requested:', quantity);

          // Provide helpful message about available quantity
          const message = availableStock === 1
            ? `Only 1 item of ${product.name}${variantInfo} is remaining in stock`
            : `Only ${availableStock} items of ${product.name}${variantInfo} are remaining in stock`;

          return sendError(res, message, 400);
        }

        // Check for low stock warning (this doesn't prevent adding to cart, just logs)
        if (availableStock <= lowStockThreshold) {
          logger.info('⚠️ [ADD TO CART] Low stock warning. Available:', availableStock, 'Threshold:', lowStockThreshold);
          // Note: This is just a warning, we still allow the add to cart
        }
      }
    }

    // Get or create cart
    logger.info('🛒 [ADD TO CART] Getting user cart...');
    let cart = await Cart.getActiveCart(req.userId);

    if (!cart) {
      logger.info('🛒 [ADD TO CART] Creating new cart...');
      cart = new Cart({
        user: req.userId,
        items: [],
        totals: {
          subtotal: 0,
          tax: 0,
          delivery: 0,
          discount: 0,
          cashback: 0,
          total: 0,
          savings: 0
        }
      });
    } else {
      logger.info('✅ [ADD TO CART] Using existing cart:', cart._id);
    }

    // Add item to cart
    logger.info('🛒 [ADD TO CART] Adding item to cart...');
    
    if (isEvent && event) {
      // Handle events - add directly to cart items
      const eventPrice = event.price?.amount || 0;
      const eventOriginalPrice = event.price?.originalPrice || eventPrice;

      // Check if event already exists in cart
      const existingItemIndex = cart.items.findIndex(
        (item: any) => item.event && item.event.toString() === productId
      );

      if (existingItemIndex >= 0) {
        // Update quantity if item already exists
        cart.items[existingItemIndex].quantity += quantity;
        cart.items[existingItemIndex].addedAt = new Date();
      } else {
        // Add new event item
        const cartItem: any = {
          event: event._id,
          store: null, // Events don't have stores
          itemType: 'event',
          quantity,
          price: eventPrice,
          originalPrice: eventOriginalPrice,
          discount: eventOriginalPrice - eventPrice,
          addedAt: new Date(),
          metadata: metadata || {} // Store event metadata (slotId, etc.)
        };
        cart.items.push(cartItem);
      }
    } else if (isService && product) {
      // Handle services - add with booking details
      logger.info('🛒 [ADD TO CART] Adding service to cart');
      const servicePrice = product.pricing?.selling || product.price?.current || 0;
      const serviceOriginalPrice = product.pricing?.original || product.price?.original || servicePrice;

      // Services are unique per booking slot - check for duplicate booking
      const existingServiceIndex = cart.items.findIndex((item: any) => {
        if (item.product?.toString() !== productId) return false;
        if (item.itemType !== 'service') return false;
        // Same service on same date/time is a duplicate
        if (serviceBookingDetails && item.serviceBookingDetails) {
          const sameDate = new Date(item.serviceBookingDetails.bookingDate).toDateString() ===
                           new Date(serviceBookingDetails.bookingDate).toDateString();
          const sameTime = item.serviceBookingDetails.timeSlot?.start === serviceBookingDetails.timeSlot?.start;
          return sameDate && sameTime;
        }
        return false;
      });

      if (existingServiceIndex >= 0) {
        logger.info('❌ [ADD TO CART] Service already booked for this date/time');
        return sendBadRequest(res, 'This service is already in your cart for the selected date and time');
      }

      // Get store ID
      const storeId = typeof product.store === 'object' && (product.store as any)?._id
        ? (product.store as any)._id
        : product.store;

      // Add new service item
      const cartItem: any = {
        product: product._id,
        store: storeId,
        itemType: 'service',
        quantity: 1, // Services are always quantity 1 per booking
        price: servicePrice,
        originalPrice: serviceOriginalPrice,
        discount: serviceOriginalPrice > servicePrice ? serviceOriginalPrice - servicePrice : 0,
        addedAt: new Date(),
        serviceBookingDetails: {
          bookingDate: new Date(serviceBookingDetails.bookingDate),
          timeSlot: serviceBookingDetails.timeSlot,
          duration: serviceBookingDetails.duration || product.serviceDetails?.duration || 60,
          serviceType: serviceBookingDetails.serviceType || product.serviceDetails?.serviceType || 'store',
          customerNotes: serviceBookingDetails.customerNotes,
          customerName: serviceBookingDetails.customerName,
          customerPhone: serviceBookingDetails.customerPhone,
          customerEmail: serviceBookingDetails.customerEmail
        }
      };

      logger.info('🛒 [ADD TO CART] Service cart item:', cartItem);
      cart.items.push(cartItem);
    } else if (product) {
      // Handle products - use existing addItem method
      await cart.addItem(productId, quantity, variant);
    }

    // Recalculate totals
    logger.info('🛒 [ADD TO CART] Calculating totals...');
    await cart.calculateTotals();

    logger.info('🛒 [ADD TO CART] Saving cart...');
    await cart.save();

    // Reserve stock for the added item (only for products, not services or events)
    if (!isEvent && !isService && product) {
      logger.info('🔒 [ADD TO CART] Reserving stock...');
      const reservationResult = await reservationService.reserveStock(
        (cart as any)._id.toString(),
        productId,
        quantity,
        variant
      );

      if (!reservationResult.success) {
        logger.error('❌ [ADD TO CART] Stock reservation failed:', reservationResult.message);
        // Note: We don't fail the cart operation, but log the issue
        // The stock validation will catch this at checkout
      } else {
        logger.info('✅ [ADD TO CART] Stock reserved successfully');
      }
    }

    // Invalidate cart cache after update
    await CacheInvalidator.invalidateCart(req.userId);

    logger.info('✅ [ADD TO CART] Item added successfully. Cart now has', cart.items.length, 'items');
    sendSuccess(res, cart, 'Item added to cart successfully');

  } catch (error) {
    logger.error('❌ [ADD TO CART] Error occurred:', error);
    logger.error('❌ [ADD TO CART] Error message:', error instanceof Error ? error.message : 'Unknown error');
    logger.error('❌ [ADD TO CART] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to add item to cart', 500);
  }
});

// Update cart item quantity
export const updateCartItem = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) {
    return sendUnauthorized(res, 'Authentication required');
  }

  const { productId, variant } = req.params;
  const { quantity } = req.body;

  try {
    logger.info('🛒 [UPDATE CART] Starting update for user:', req.userId);
    logger.info('🛒 [UPDATE CART] Request params:', { productId, variant });
    logger.info('🛒 [UPDATE CART] Request body:', { quantity });

    const cart = await Cart.getActiveCart(req.userId);

    if (!cart) {
      logger.info('❌ [UPDATE CART] Cart not found');
      return sendNotFound(res, 'Cart not found');
    }

    logger.info('✅ [UPDATE CART] Cart found with', cart.items.length, 'items');

    // Parse variant from query params
    let variantObj;
    if (variant && variant !== 'null') {
      try {
        variantObj = JSON.parse(variant);
        logger.info('🛒 [UPDATE CART] Parsed variant:', variantObj);
      } catch (e) {
        logger.info('❌ [UPDATE CART] Invalid variant format');
        return sendError(res, 'Invalid variant format', 400);
      }
    }

    // Validate stock before updating quantity (only if increasing)
    if (quantity > 0) {
      const product = await Product.findById(productId).lean() as any;

      if (!product) {
        logger.info('❌ [UPDATE CART] Product not found');
        return sendNotFound(res, 'Product not found');
      }

      if (!product.isActive || !product.inventory.isAvailable) {
        logger.info('❌ [UPDATE CART] Product not available');
        return sendError(res, 'Product is no longer available', 400);
      }

      // Check stock availability
      let availableStock = product.inventory.stock;
      const lowStockThreshold = product.inventory.lowStockThreshold || 5;
      let variantInfo = '';

      if (variantObj && product.inventory.variants) {
        const variantData = product.inventory.variants.find(
          (v: any) => v.type === variantObj.type && v.value === variantObj.value
        );

        if (!variantData) {
          logger.info('❌ [UPDATE CART] Product variant not found');
          return sendError(res, `Product variant "${variantObj.value}" is not available`, 400);
        }

        availableStock = variantData.stock;
        variantInfo = ` (${variantObj.type}: ${variantObj.value})`;
      }

      // Stock validation
      if (!product.inventory.unlimited) {
        if (availableStock === 0) {
          logger.info('❌ [UPDATE CART] Product out of stock');
          return sendError(
            res,
            `${product.name}${variantInfo} is currently out of stock`,
            400
          );
        }

        if (availableStock < quantity) {
          logger.info('❌ [UPDATE CART] Insufficient stock. Available:', availableStock, 'Requested:', quantity);

          const message = availableStock === 1
            ? `Only 1 item of ${product.name}${variantInfo} is remaining in stock`
            : `Only ${availableStock} items of ${product.name}${variantInfo} are remaining in stock`;

          return sendError(res, message, 400);
        }

        if (availableStock <= lowStockThreshold) {
          logger.info('⚠️ [UPDATE CART] Low stock warning. Available:', availableStock, 'Threshold:', lowStockThreshold);
        }
      }
    }

    logger.info('🛒 [UPDATE CART] Updating item quantity...');
    await cart.updateItemQuantity(productId, quantity, variantObj);

    logger.info('🛒 [UPDATE CART] Calculating totals...');
    await cart.calculateTotals();

    logger.info('🛒 [UPDATE CART] Saving cart...');
    await cart.save();

    // Update stock reservation
    if (quantity > 0) {
      logger.info('🔒 [UPDATE CART] Updating stock reservation...');
      const reservationResult = await reservationService.reserveStock(
        (cart as any)._id.toString(),
        productId,
        quantity,
        variantObj
      );

      if (!reservationResult.success) {
        logger.error('❌ [UPDATE CART] Stock reservation update failed:', reservationResult.message);
      } else {
        logger.info('✅ [UPDATE CART] Stock reservation updated successfully');
      }
    } else {
      // If quantity is 0, item was removed, so release reservation
      logger.info('🔓 [UPDATE CART] Releasing stock reservation (quantity = 0)...');
      await reservationService.releaseStock((cart as any)._id.toString(), productId, variantObj);
    }

    // Invalidate cart cache after update
    await CacheInvalidator.invalidateCart(req.userId);

    logger.info('✅ [UPDATE CART] Cart item updated successfully');
    sendSuccess(res, cart, 'Cart item updated successfully');

  } catch (error) {
    logger.error('❌ [UPDATE CART] Error occurred:', error);
    logger.error('❌ [UPDATE CART] Error message:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to update cart item', 500);
  }
});

// Remove item from cart
export const removeFromCart = asyncHandler(async (req: Request, res: Response) => {
  logger.info('🗑️ [REMOVE FROM CART] Starting remove item process');
  logger.info('🗑️ [REMOVE FROM CART] User ID:', req.userId);
  logger.info('🗑️ [REMOVE FROM CART] Request params:', req.params);

  if (!req.userId) {
    return sendUnauthorized(res, 'Authentication required');
  }

  const { productId, variant } = req.params;
  logger.info('🗑️ [REMOVE FROM CART] Product ID:', productId);
  logger.info('🗑️ [REMOVE FROM CART] Variant (raw):', variant);

  try {
    const cart = await Cart.getActiveCart(req.userId);

    if (!cart) {
      logger.error('❌ [REMOVE FROM CART] Cart not found for user:', req.userId);
      return sendNotFound(res, 'Cart not found');
    }

    logger.info('🗑️ [REMOVE FROM CART] Cart found:', cart._id);
    logger.info('🗑️ [REMOVE FROM CART] Current cart items count:', cart.items.length);
    logger.info('🗑️ [REMOVE FROM CART] Cart items:', cart.items.map((item: any) => ({
      id: item._id,
      product: item.product,
      hasProduct: !!item.product
    })));

    // Parse variant from query params
    let variantObj;
    if (variant && variant !== 'null') {
      try {
        variantObj = JSON.parse(variant);
        logger.info('🗑️ [REMOVE FROM CART] Parsed variant:', variantObj);
      } catch (e) {
        logger.error('❌ [REMOVE FROM CART] Invalid variant format:', e);
        return sendError(res, 'Invalid variant format', 400);
      }
    }

    logger.info('🗑️ [REMOVE FROM CART] Calling cart.removeItem with:', { productId, variant: variantObj });
    await cart.removeItem(productId, variantObj);

    logger.info('🗑️ [REMOVE FROM CART] Item removed, items count now:', cart.items.length);

    await cart.calculateTotals();
    await cart.save();

    logger.info('✅ [REMOVE FROM CART] Cart saved successfully');

    // Release stock reservation
    logger.info('🔓 [REMOVE FROM CART] Releasing stock reservation...');
    try {
      await reservationService.releaseStock((cart as any)._id.toString(), productId, variantObj);
    } catch (stockError) {
      logger.warn('⚠️ [REMOVE FROM CART] Stock release failed (non-critical):', stockError);
    }

    // Invalidate cart cache after update
    await CacheInvalidator.invalidateCart(req.userId);

    sendSuccess(res, cart, 'Item removed from cart successfully');

  } catch (error) {
    logger.error('❌ [REMOVE FROM CART] Error:', error);
    throw new AppError('Failed to remove item from cart', 500);
  }
});

// Clear entire cart
export const clearCart = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) {
    return sendUnauthorized(res, 'Authentication required');
  }

  try {
    const cart = await Cart.getActiveCart(req.userId);
    
    if (!cart) {
      return sendNotFound(res, 'Cart not found');
    }

    await cart.clearCart();
    await cart.save();

    sendSuccess(res, cart, 'Cart cleared successfully');

  } catch (error) {
    throw new AppError('Failed to clear cart', 500);
  }
});

// Apply coupon to cart
export const applyCoupon = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) {
    return sendUnauthorized(res, 'Authentication required');
  }

  const { couponCode, couponId } = req.body;

  try {
    logger.info('🎟️ [APPLY COUPON] Starting coupon application');
    logger.info('🎟️ [APPLY COUPON] Coupon code:', couponCode);
    logger.info('🎟️ [APPLY COUPON] Coupon ID:', couponId);

    const cart = await Cart.getActiveCart(req.userId);

    if (!cart) {
      return sendNotFound(res, 'Cart not found');
    }

    if (cart.items.length === 0) {
      return sendError(res, 'Cannot apply coupon to empty cart', 400);
    }

    // Find coupon by code or ID
    const { Coupon } = await import('../models/Coupon');
    let coupon;

    if (couponId) {
      coupon = await Coupon.findById(couponId).lean() as any;
    } else if (couponCode) {
      coupon = await Coupon.findOne({ couponCode: couponCode.toUpperCase() }).lean() as any;
    }

    if (!coupon) {
      return sendError(res, 'Coupon not found', 400);
    }

    logger.info('✅ [APPLY COUPON] Coupon found:', coupon.title);

    // Build validation context from cart items (batch-load products)
    const couponProductIds = cart.items.map((item: any) => item.product).filter(Boolean);
    const couponProducts = await Product.find({ _id: { $in: couponProductIds } })
      .select('store')
      .lean() as any[];
    const couponProductMap = new Map(couponProducts.map(p => [p._id.toString(), p]));

    const cartItems = cart.items.map((item: any) => {
      const product = item.product ? couponProductMap.get(item.product.toString()) : null;
      return {
        productId: item.product?.toString() || '',
        storeId: product?.store?.toString() || '',
        quantity: item.quantity,
        price: item.price
      };
    });

    // Validate coupon using validation service
    const { validateCouponForCart } = await import('../services/couponValidationService');
    const validationResult = await validateCouponForCart(
      (coupon as any)._id.toString(),
      {
        cartItems,
        userId: req.userId
      }
    );

    logger.info('🎟️ [APPLY COUPON] Validation result:', validationResult);

    if (!validationResult.isValid) {
      logger.info('❌ [APPLY COUPON] Validation failed:', validationResult.error);
      return sendError(res, validationResult.error || 'Coupon is not valid', 400);
    }

    // Apply coupon to cart (existing method)
    const couponApplied = await cart.applyCoupon(couponCode || coupon.couponCode);

    if (!couponApplied) {
      return sendError(res, 'Failed to apply coupon', 400);
    }

    await cart.calculateTotals();
    await cart.save();

    // Invalidate cart cache
    await CacheInvalidator.invalidateCart(req.userId);

    logger.info('✅ [APPLY COUPON] Coupon applied successfully');
    sendSuccess(res, {
      cart,
      couponDetails: {
        code: coupon.couponCode,
        title: coupon.title,
        discountAmount: validationResult.discountAmount,
        applicableItems: validationResult.applicableItems,
        metadata: coupon.metadata
      }
    }, 'Coupon applied successfully');

  } catch (error) {
    logger.error('❌ [APPLY COUPON] Error:', error);
    if (error instanceof AppError) {
      return sendError(res, error.message, 400);
    }
    throw new AppError('Failed to apply coupon', 500);
  }
});

// Remove coupon from cart
export const removeCoupon = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) {
    return sendUnauthorized(res, 'Authentication required');
  }

  try {
    const cart = await Cart.getActiveCart(req.userId);
    
    if (!cart) {
      return sendNotFound(res, 'Cart not found');
    }

    await cart.removeCoupon();
    await cart.calculateTotals();
    await cart.save();

    sendSuccess(res, cart, 'Coupon removed successfully');

  } catch (error) {
    throw new AppError('Failed to remove coupon', 500);
  }
});

// Get cart summary/totals
export const getCartSummary = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) {
    return sendUnauthorized(res, 'Authentication required');
  }

  try {
    const cart = await Cart.getActiveCart(req.userId);
    
    if (!cart) {
      return sendSuccess(res, {
        itemCount: 0,
        totals: {
          subtotal: 0,
          tax: 0,
          delivery: 0,
          discount: 0,
          cashback: 0,
          total: 0,
          savings: 0
        }
      }, 'Cart summary retrieved successfully');
    }

    const summary = {
      itemCount: cart.itemCount,
      storeCount: cart.storeCount,
      totals: cart.totals,
      hasItems: cart.items.length > 0,
      coupon: cart.coupon ? {
        code: cart.coupon.code,
        discountType: cart.coupon.discountType,
        appliedAmount: cart.coupon.appliedAmount
      } : null
    };

    sendSuccess(res, summary, 'Cart summary retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to get cart summary', 500);
  }
});

// Validate cart before checkout
export const validateCart = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) {
    return sendUnauthorized(res, 'Authentication required');
  }

  try {
    const cart = await Cart.getActiveCart(req.userId);
    
    if (!cart || cart.items.length === 0) {
      return sendError(res, 'Cart is empty', 400);
    }

    // BUGFIX: Recalculate totals if total is 0 but subtotal > 0 (stale data)
    if (cart.items.length > 0 && cart.totals.subtotal > 0 && cart.totals.total === 0) {
      logger.info('✅ [VALIDATE CART] Detected stale totals, recalculating...');
      await cart.calculateTotals();
      await cart.save();
      logger.info('✅ [VALIDATE CART] Totals recalculated:', cart.totals);
    }

    const validationErrors: string[] = [];
    const unavailableItems: any[] = [];

    // Batch-load all products in one query instead of N individual queries
    const productIds = cart.items.map((item: any) => item.product).filter(Boolean);
    const products = await Product.find({ _id: { $in: productIds } })
      .select('name isActive inventory')
      .lean() as any[];
    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    // Check each item's availability and stock with detailed messages
    for (const item of cart.items) {
      const product = item.product ? productMap.get(item.product.toString()) : null;

      if (!product) {
        unavailableItems.push({
          productId: item.product,
          productName: 'Unknown Product',
          reason: 'Product no longer exists',
          severity: 'error'
        });
        continue;
      }

      if (!product.isActive) {
        unavailableItems.push({
          productId: item.product,
          productName: product.name,
          reason: 'Product is no longer available for purchase',
          severity: 'error'
        });
        continue;
      }

      if (!product.inventory.isAvailable) {
        unavailableItems.push({
          productId: item.product,
          productName: product.name,
          reason: 'Product is currently unavailable',
          severity: 'error'
        });
        continue;
      }

      // Check stock with detailed validation
      let availableStock = product.inventory.stock;
      const lowStockThreshold = product.inventory.lowStockThreshold || 5;
      let variantInfo = '';

      if (item.variant && item.variant.type && item.variant.value && product.inventory.variants) {
        const variant = product.inventory.variants.find(
          (v: any) => v.type.toLowerCase() === item.variant!.type.toLowerCase() &&
                       v.value.toLowerCase() === item.variant!.value.toLowerCase()
        );

        if (!variant) {
          unavailableItems.push({
            productId: item.product,
            productName: product.name,
            reason: `Variant "${item.variant.value}" is no longer available`,
            severity: 'error'
          });
          continue;
        }

        availableStock = variant.stock;
        variantInfo = ` (${item.variant.type}: ${item.variant.value})`;
      }

      // Stock availability checks
      if (!product.inventory.unlimited) {
        // Out of stock
        if (availableStock === 0) {
          unavailableItems.push({
            productId: item.product,
            productName: product.name + variantInfo,
            reason: 'Out of stock',
            availableQuantity: 0,
            requestedQuantity: item.quantity,
            severity: 'error'
          });
        }
        // Insufficient stock
        else if (availableStock < item.quantity) {
          const message = availableStock === 1
            ? 'Only 1 item available'
            : `Only ${availableStock} items available`;

          unavailableItems.push({
            productId: item.product,
            productName: product.name + variantInfo,
            reason: message,
            availableQuantity: availableStock,
            requestedQuantity: item.quantity,
            severity: 'error'
          });
        }
        // Low stock warning (doesn't block checkout, just warns)
        else if (availableStock <= lowStockThreshold) {
          validationErrors.push(`${product.name}${variantInfo} has limited stock (${availableStock} remaining)`);
        }
      }
    }

    if (unavailableItems.length > 0) {
      return sendError(
        res,
        'Some items in your cart have stock or availability issues',
        400,
        unavailableItems
      );
    }

    // If there are validation warnings (low stock) but no blocking errors
    const response: any = {
      isValid: true,
      cart: cart
    };

    if (validationErrors.length > 0) {
      response.warnings = validationErrors;
    }

    sendSuccess(
      res,
      response,
      validationErrors.length > 0
        ? 'Cart is valid for checkout with warnings'
        : 'Cart is valid for checkout'
    );

  } catch (error) {
    throw new AppError('Failed to validate cart', 500);
  }
});

// Lock item at current price
export const lockItem = asyncHandler(async (req: Request, res: Response) => {
  logger.info('🔒 [LOCK ITEM] Starting lock process');
  logger.info('🔒 [LOCK ITEM] User ID:', req.userId);
  logger.info('🔒 [LOCK ITEM] Request body:', req.body);

  if (!req.userId) {
    logger.error('❌ [LOCK ITEM] No user ID provided');
    return sendUnauthorized(res, 'Authentication required');
  }

  const { productId, quantity = 1, variant, lockDurationHours = 24 } = req.body;

  if (!productId) {
    logger.error('❌ [LOCK ITEM] No product ID provided');
    return sendBadRequest(res, 'Product ID is required');
  }

  try {
    logger.info('🔒 [LOCK ITEM] Finding cart for user:', req.userId);
    let cart = await Cart.getActiveCart(req.userId);

    if (!cart) {
      logger.info('🔒 [LOCK ITEM] No cart found, creating new cart');
      // Create new cart if not exists
      cart = await Cart.create({
        user: req.userId,
        items: [],
        lockedItems: [],
        totals: {
          subtotal: 0,
          tax: 0,
          delivery: 0,
          discount: 0,
          cashback: 0,
          total: 0,
          savings: 0
        },
        isActive: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      });
      logger.info('🔒 [LOCK ITEM] New cart created:', cart._id);
    } else {
      logger.info('🔒 [LOCK ITEM] Found existing cart:', cart._id);
      logger.info('🔒 [LOCK ITEM] Current locked items count:', cart.lockedItems?.length || 0);
    }

    logger.info('🔒 [LOCK ITEM] Locking product:', productId, 'with quantity:', quantity);
    await cart.lockItem(productId, quantity, variant, lockDurationHours);

    logger.info('🔒 [LOCK ITEM] Item locked successfully');
    logger.info('🔒 [LOCK ITEM] New locked items count:', cart.lockedItems?.length || 0);

    // Reload cart with populated fields
    const populatedCart = await Cart.findById(cart._id)
      .populate({
        path: 'lockedItems.product',
        select: 'name images pricing store category'
      })
      .populate({
        path: 'lockedItems.store',
        select: 'name logo location'
      }).lean();

    sendSuccess(res, { cart: populatedCart, message: 'Item locked successfully' }, 'Item locked successfully');

  } catch (error) {
    logger.error('❌ [LOCK ITEM] Error:', error);
    throw new AppError(error instanceof Error ? error.message : 'Failed to lock item', 500);
  }
});

// Unlock item
export const unlockItem = asyncHandler(async (req: Request, res: Response) => {
  logger.info('🔓 [UNLOCK ITEM] Starting unlock process');
  logger.info('🔓 [UNLOCK ITEM] User ID:', req.userId);
  logger.info('🔓 [UNLOCK ITEM] Product ID:', req.params.productId);
  logger.info('🔓 [UNLOCK ITEM] Request body:', req.body);

  if (!req.userId) {
    logger.error('❌ [UNLOCK ITEM] No user ID provided');
    return sendUnauthorized(res, 'Authentication required');
  }

  const { productId } = req.params;
  const { variant } = req.body || {}; // Handle undefined body for DELETE requests

  if (!productId) {
    logger.error('❌ [UNLOCK ITEM] No product ID provided');
    return sendBadRequest(res, 'Product ID is required');
  }

  try {
    const cart = await Cart.getActiveCart(req.userId);

    if (!cart) {
      logger.error('❌ [UNLOCK ITEM] Cart not found for user:', req.userId);
      return sendNotFound(res, 'Cart not found');
    }

    logger.info('🔓 [UNLOCK ITEM] Cart found, locked items count:', cart.lockedItems?.length || 0);

    // Find the locked item BEFORE removing it (to check if it's a paid lock)
    const lockedItem = cart.lockedItems.find((item: any) => {
      const itemProductId = typeof item.product === 'object' && item.product._id
        ? item.product._id.toString()
        : item.product?.toString();
      const productMatch = itemProductId === productId;
      const variantMatch = !variant || (item.variant?.type === variant?.type && item.variant?.value === variant?.value);
      return productMatch && variantMatch;
    });

    // Refund lock fee for paid locks
    if (lockedItem?.isPaidLock && lockedItem?.lockFee && lockedItem.lockFee > 0) {
      logger.info('🔓💰 [UNLOCK ITEM] Refunding paid lock fee:', lockedItem.lockFee);

      const { Transaction } = await import('../models/Transaction');

      // Refund lock fee via walletService (atomic $inc + CoinTransaction + LedgerEntry)
      const { walletService } = await import('../services/walletService');
      await walletService.credit({
        userId: req.userId,
        amount: lockedItem.lockFee,
        source: 'purchase',
        description: `Lock fee refund - lock cancelled`,
        operationType: 'lock_fee_refund',
        referenceId: `lock-refund:${productId}`,
        referenceModel: 'Cart',
        metadata: { productId },
      });

      {
        // Create refund transaction display record
        await Transaction.create({
          user: req.userId,
          type: 'credit',
          category: 'refund',
          amount: lockedItem.lockFee,
          currency: 'INR',
          description: `Lock fee refund - lock cancelled`,
          source: {
            type: 'order',
            reference: productId,
            description: 'Lock fee refund',
          },
          status: { current: 'completed', history: [{ status: 'completed', timestamp: new Date() }] },
          balanceBefore: 0,
          balanceAfter: lockedItem.lockFee,
          isReversible: false,
          notes: `Refund for cancelled lock on product ${productId}`
        });

        // Update lock payment status
        lockedItem.lockPaymentStatus = 'refunded';
        await cart.save();

        logger.info('✅ [UNLOCK ITEM] Lock fee refunded:', lockedItem.lockFee);
      }
    }

    await cart.unlockItem(productId, variant);

    logger.info('✅ [UNLOCK ITEM] Item unlocked successfully');
    logger.info('✅ [UNLOCK ITEM] Remaining locked items:', cart.lockedItems?.length || 0);

    sendSuccess(res, cart, lockedItem?.isPaidLock
      ? `Item unlocked. Lock fee of ₹${lockedItem.lockFee} has been refunded to your wallet.`
      : 'Item unlocked successfully'
    );

  } catch (error) {
    logger.error('❌ [UNLOCK ITEM] Error:', error);
    logger.error('❌ [UNLOCK ITEM] Error stack:', error instanceof Error ? error.stack : 'No stack');
    throw new AppError('Failed to unlock item', 500);
  }
});

// Move locked item to cart
export const moveLockedToCart = asyncHandler(async (req: Request, res: Response) => {
  logger.info('➡️ [MOVE TO CART] Starting move locked to cart');
  logger.info('➡️ [MOVE TO CART] User ID:', req.userId);
  logger.info('➡️ [MOVE TO CART] Product ID:', req.params.productId);
  logger.info('➡️ [MOVE TO CART] Request body:', req.body);

  if (!req.userId) {
    return sendUnauthorized(res, 'Authentication required');
  }

  const { productId } = req.params;
  const { variant } = req.body || {}; // Handle undefined body safely

  if (!productId) {
    return sendBadRequest(res, 'Product ID is required');
  }

  try {
    const cart = await Cart.getActiveCart(req.userId);

    if (!cart) {
      logger.error('❌ [MOVE TO CART] Cart not found');
      return sendNotFound(res, 'Cart not found');
    }

    logger.info('➡️ [MOVE TO CART] Cart found with locked items:', cart.lockedItems?.length || 0);
    logger.info('➡️ [MOVE TO CART] Locked items:', cart.lockedItems?.map((item: any) => ({
      itemId: item._id,
      productId: typeof item.product === 'object' ? item.product._id : item.product,
      productString: item.product?.toString()
    })));

    await cart.moveLockedToCart(productId, variant);

    // Invalidate cart cache so fresh data with lockedQuantity is returned
    await CacheInvalidator.invalidateCart(req.userId);

    // Re-fetch cart with populated data to ensure lockedQuantity is included
    const updatedCart = await Cart.getActiveCart(req.userId);

    logger.info('✅ [MOVE TO CART] Item moved successfully');
    sendSuccess(res, updatedCart || cart, 'Item moved to cart successfully');

  } catch (error) {
    logger.error('❌ [MOVE TO CART] Error:', error);
    logger.error('❌ [MOVE TO CART] Error message:', error instanceof Error ? error.message : 'Unknown error');
    throw new AppError(error instanceof Error ? error.message : 'Failed to move item to cart', 500);
  }
});

// Get locked items
export const getLockedItems = asyncHandler(async (req: Request, res: Response) => {
  logger.info('🔒 [GET LOCKED] Starting get locked items');
  logger.info('🔒 [GET LOCKED] User ID:', req.userId);

  if (!req.userId) {
    return sendUnauthorized(res, 'Authentication required');
  }

  try {
    const cart = await Cart.findOne({ user: req.userId, isActive: true })
      .populate({
        path: 'lockedItems.product',
        select: 'name images pricing store category'
      })
      .populate({
        path: 'lockedItems.store',
        select: 'name logo location'
      }).lean();

    logger.info('🔒 [GET LOCKED] Cart found:', !!cart);
    logger.info('🔒 [GET LOCKED] Total locked items in cart:', cart?.lockedItems?.length || 0);

    if (!cart) {
      logger.info('🔒 [GET LOCKED] No cart found, returning empty array');
      return sendSuccess(res, { lockedItems: [] }, 'No locked items found');
    }

    // Log all locked items with their expiration
    const now = new Date();
    logger.info('🔒 [GET LOCKED] Current time:', now.toISOString());
    cart.lockedItems.forEach((item: any, index: number) => {
      logger.info(`🔒 [GET LOCKED] Item ${index + 1}:`, {
        id: item._id,
        productId: item.product?._id || item.product,
        expiresAt: item.expiresAt,
        expiresAtISO: new Date(item.expiresAt).toISOString(),
        isExpired: item.expiresAt <= now,
        timeUntilExpiry: item.expiresAt > now ? Math.round((item.expiresAt - now.getTime()) / 1000 / 60) + ' minutes' : 'EXPIRED'
      });
    });

    // Filter out expired locked items
    const validLockedItems = cart.lockedItems.filter((item: any) =>
      item.expiresAt > now
    );

    logger.info('🔒 [GET LOCKED] Found', validLockedItems.length, 'valid locked items out of', cart.lockedItems.length, 'total');
    if (validLockedItems.length > 0) {
      const firstItem = validLockedItems[0] as any;
      logger.info('🔒 [GET LOCKED] First valid item:', {
        id: firstItem._id,
        productId: firstItem.product?._id || firstItem.product,
        productName: firstItem.product?.name || 'N/A'
      });
    }

    sendSuccess(res, { lockedItems: validLockedItems }, 'Locked items retrieved successfully');

  } catch (error) {
    logger.error('❌ [GET LOCKED] Error:', error);
    throw new AppError('Failed to get locked items', 500);
  }
});

// Lock fee configuration - Variable duration lock options (2/4/8 hours)
const LOCK_FEE_CONFIG: Record<number, { hours: number; percentage: number; label: string }> = {
  2: { hours: 2, percentage: 5, label: '2 Hours' },
  4: { hours: 4, percentage: 10, label: '4 Hours' },
  8: { hours: 8, percentage: 15, label: '8 Hours' },
};

// Calculate lock fee
const calculateLockFee = (productPrice: number, durationHours: number): { fee: number; percentage: number } => {
  const config = LOCK_FEE_CONFIG[durationHours];
  if (!config) {
    throw new Error('Invalid lock duration. Choose 2, 4, or 8 hours.');
  }
  const fee = Math.ceil(pct(productPrice, config.percentage));
  return { fee, percentage: config.percentage };
};

// Lock item with payment (MakeMyTrip style)
export const lockItemWithPayment = asyncHandler(async (req: Request, res: Response) => {
  logger.info('🔒💰 [LOCK WITH PAYMENT] Starting paid lock process');
  logger.info('🔒💰 [LOCK WITH PAYMENT] User ID:', req.userId);
  logger.info('🔒💰 [LOCK WITH PAYMENT] Request body:', req.body);

  if (!req.userId) {
    logger.error('❌ [LOCK WITH PAYMENT] No user ID provided');
    return sendUnauthorized(res, 'Authentication required');
  }

  const {
    productId,
    quantity = 1,
    variant,
    duration = 4, // Default 4 hours (middle option)
    paymentMethod = 'wallet' // 'wallet' | 'upi'
  } = req.body;

  if (!productId) {
    logger.error('❌ [LOCK WITH PAYMENT] No product ID provided');
    return sendBadRequest(res, 'Product ID is required');
  }

  // Validate duration (2, 4, or 8 hours)
  if (![2, 4, 8].includes(duration)) {
    return sendBadRequest(res, 'Invalid lock duration. Choose 2, 4, or 8 hours.');
  }

  try {
    // 1. Get product details
    logger.info('🔒💰 [LOCK WITH PAYMENT] Finding product:', productId);
    const product = await Product.findById(productId).populate('store').lean() as any;

    if (!product) {
      return sendNotFound(res, 'Product not found');
    }

    if (!product.isActive || !product.inventory.isAvailable) {
      return sendBadRequest(res, 'Product is not available for purchase');
    }

    // Check stock
    if (!product.inventory.unlimited && product.inventory.stock < quantity) {
      return sendBadRequest(res, `Only ${product.inventory.stock} items available in stock`);
    }

    // Check if product is already locked (prevent double charging)
    // Only check for NON-EXPIRED locks
    const existingCart = await Cart.getActiveCart(req.userId);
    if (existingCart) {
      const now = new Date();

      // Check for non-expired locks
      const alreadyLocked = existingCart.lockedItems.find((item: any) => {
        const itemProductId = item.product?._id?.toString() || item.product?.toString();
        const productMatch = itemProductId === productId;
        const variantMatch = !variant || (item.variant?.type === variant?.type && item.variant?.value === variant?.value);
        const isNotExpired = item.expiresAt > now; // Only check non-expired locks
        return productMatch && variantMatch && isNotExpired;
      });

      if (alreadyLocked) {
        logger.info('🔒💰 [LOCK WITH PAYMENT] Product already locked (non-expired), rejecting duplicate lock');
        return sendBadRequest(res, 'This product is already locked. Go to your cart to view or modify your locked items.');
      }

      // Clean up expired locks for this product/variant combination
      const expiredLocksCount = existingCart.lockedItems.filter((item: any) => {
        const itemProductId = item.product?._id?.toString() || item.product?.toString();
        const productMatch = itemProductId === productId;
        const variantMatch = !variant || (item.variant?.type === variant?.type && item.variant?.value === variant?.value);
        const isExpired = item.expiresAt <= now;
        return productMatch && variantMatch && isExpired;
      }).length;

      if (expiredLocksCount > 0) {
        logger.info(`🔒💰 [LOCK WITH PAYMENT] Found ${expiredLocksCount} expired locks for this product, cleaning up...`);
        existingCart.lockedItems = existingCart.lockedItems.filter((item: any) => {
          const itemProductId = item.product?._id?.toString() || item.product?.toString();
          const productMatch = itemProductId === productId;
          const variantMatch = !variant || (item.variant?.type === variant?.type && item.variant?.value === variant?.value);
          const isExpired = item.expiresAt <= now;
          // Keep items that DON'T match (other products) OR aren't expired
          return !(productMatch && variantMatch && isExpired);
        });
        await existingCart.save();
        logger.info('🔒💰 [LOCK WITH PAYMENT] Expired locks cleaned up');
      }
    }

    // 2. Calculate lock fee
    const productPrice = product.pricing?.selling || product.price?.current || 0;
    if (!productPrice || productPrice === 0) {
      return sendBadRequest(res, 'Product price not available');
    }

    const { fee: lockFee, percentage: lockFeePercentage } = calculateLockFee(productPrice * quantity, duration);
    logger.info('🔒💰 [LOCK WITH PAYMENT] Lock fee calculated:', { productPrice, lockFee, lockFeePercentage, duration });

    // 3. Process payment
    const { Wallet } = await import('../models/Wallet');
    const { Transaction } = await import('../models/Transaction');

    const wallet = await Wallet.findOne({ user: req.userId }).lean() as any;
    if (!wallet) {
      return sendBadRequest(res, 'Wallet not found. Please set up your wallet first.');
    }

    logger.info('🔒💰 [LOCK WITH PAYMENT] Wallet found:', {
      available: wallet.balance.available,
      total: wallet.balance.total
    });

    const availableBalance = wallet.balance.available;

    if (paymentMethod === 'upi') {
      // For UPI, we would redirect to Razorpay - for now, return info for frontend
      return sendSuccess(res, {
        requiresUpiPayment: true,
        lockFee,
        lockFeePercentage,
        duration,
        productId,
        quantity,
        productName: product.name,
        productPrice: productPrice * quantity
      }, 'UPI payment required. Complete payment to lock the item.');
    }

    // Check balance
    if (availableBalance < lockFee) {
      const currencySymbol = getCurrencySymbolFromRequest(req);
      return sendBadRequest(res,
        `Insufficient wallet balance. Required: ${currencySymbol}${lockFee}, Available: ${currencySymbol}${availableBalance}`
      );
    }

    // 4. Deduct from wallet via walletService (atomic $inc + CoinTransaction + LedgerEntry)
    const { walletService: ws } = await import('../services/walletService');
    await ws.debit({
      userId: req.userId,
      amount: lockFee,
      source: 'purchase',
      description: `Lock fee for ${product.name} (${duration}h lock)`,
      operationType: 'lock_fee',
      referenceId: `lock-fee:${product._id}`,
      referenceModel: 'Cart',
      metadata: { productId: product._id, lockDuration: duration },
    });
    logger.info('Lock fee deducted via walletService:', { lockFee });

    // 5. Create transaction record
    const transaction = await Transaction.create({
      user: req.userId,
      type: 'debit',
      category: 'spending',
      amount: lockFee,
      currency: 'INR',
      description: `Lock fee for ${product.name} (${duration}h lock)`,
      source: {
        type: 'order',
        reference: product._id,
        description: `Price lock deposit - ${LOCK_FEE_CONFIG[duration].label}`,
        metadata: {
          projectTitle: product.name,
          storeInfo: product.store ? {
            name: (product.store as any).name,
            id: (product.store as any)._id
          } : undefined
        }
      },
      status: {
        current: 'completed',
        history: [{
          status: 'completed',
          timestamp: new Date()
        }]
      },
      balanceBefore: 0,
      balanceAfter: 0,
      isReversible: true,
      notes: `Lock duration: ${duration} hours, Payment method: wallet`
    });

    logger.info('🔒💰 [LOCK WITH PAYMENT] Transaction created:', transaction.transactionId);

    // 6. Add to cart locked items
    let cart = await Cart.getActiveCart(req.userId);

    if (!cart) {
      cart = await Cart.create({
        user: req.userId,
        items: [],
        lockedItems: [],
        totals: {
          subtotal: 0, tax: 0, delivery: 0, discount: 0, cashback: 0, total: 0, savings: 0
        },
        isActive: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });
    }

    const expiresAt = new Date(Date.now() + duration * 60 * 60 * 1000);
    const storeId = typeof product.store === 'object' && (product.store as any)?._id
      ? (product.store as any)._id
      : product.store || null;

    // Handle existing cart item - can't have same product in both cart and locked
    const existingCartItemIndex = cart.items.findIndex((item: any) => {
      const itemProductId = item.product?._id?.toString() || item.product?.toString();
      const productMatch = itemProductId === productId;
      const variantMatch = !variant || (item.variant?.type === variant?.type && item.variant?.value === variant?.value);
      return productMatch && variantMatch;
    });

    if (existingCartItemIndex > -1) {
      const cartItem = cart.items[existingCartItemIndex];

      // Check if this cart item was previously locked (has lock fee already applied)
      // Only check notes - discount alone doesn't mean lock fee was paid
      const hasLockFeeApplied = cartItem.notes?.includes('Lock fee');

      if (hasLockFeeApplied) {
        // This item already has a lock fee applied - don't allow re-locking
        return sendBadRequest(res, 'This item already has a lock fee applied. Complete your purchase or remove it from cart first.');
      }

      const cartQty = cartItem.quantity || 1;

      if (cartQty <= quantity) {
        // Lock quantity >= cart quantity: Remove entire item from cart
        logger.info(`🔒💰 [LOCK WITH PAYMENT] Removing item from cart (cart qty: ${cartQty}, lock qty: ${quantity})`);
        cart.items.splice(existingCartItemIndex, 1);
      } else {
        // Cart has more than we're locking: Reduce cart quantity
        logger.info(`🔒💰 [LOCK WITH PAYMENT] Reducing cart qty from ${cartQty} to ${cartQty - quantity}`);
        cart.items[existingCartItemIndex].quantity = cartQty - quantity;
      }
    }

    // Add new locked item (duplicates are blocked earlier in the function)
    const currencySymbol = getCurrencySymbolFromRequest(req);
    cart.lockedItems.push({
      product: productId,
      store: storeId,
      quantity,
      variant,
      lockedPrice: productPrice,
      originalPrice: product.pricing?.original || product.price?.original || productPrice,
      lockedAt: new Date(),
      expiresAt,
      notes: `Paid lock - ${currencySymbol}${lockFee} deposit (${lockFeePercentage}%)`,
      lockFee,
      lockFeePercentage,
      lockDuration: duration,
      paymentMethod: 'wallet',
      paymentTransactionId: transaction._id,
      lockPaymentStatus: 'paid',
      isPaidLock: true
    } as any);

    await cart.save();
    logger.info('🔒💰 [LOCK WITH PAYMENT] Lock saved successfully');

    // 7. Reload with populated fields
    const populatedCart = await Cart.findById(cart._id)
      .populate({
        path: 'lockedItems.product',
        select: 'name images pricing store category'
      })
      .populate({
        path: 'lockedItems.store',
        select: 'name logo location'
      }).lean();

    sendSuccess(res, {
      cart: populatedCart,
      lockDetails: {
        lockFee,
        lockFeePercentage,
        duration,
        expiresAt,
        transactionId: transaction.transactionId,
        paymentMethod: 'wallet',
        message: `Price locked for ${LOCK_FEE_CONFIG[duration].label}. ${currencySymbol}${lockFee} will be deducted from your final payment.`
      }
    }, 'Item locked successfully with payment');

  } catch (error) {
    logger.error('❌ [LOCK WITH PAYMENT] Error:', error);
    throw new AppError(error instanceof Error ? error.message : 'Failed to lock item with payment', 500);
  }
});

// Get lock fee options for a product
export const getLockFeeOptions = asyncHandler(async (req: Request, res: Response) => {
  logger.info('💰 [GET LOCK OPTIONS] Getting lock fee options');

  const { productId, quantity = 1 } = req.query;

  if (!productId) {
    return sendBadRequest(res, 'Product ID is required');
  }

  try {
    const product = await Product.findById(productId).lean() as any;

    if (!product) {
      return sendNotFound(res, 'Product not found');
    }

    const productPrice = product.pricing?.selling || product.price?.current || 0;
    if (!productPrice) {
      return sendBadRequest(res, 'Product price not available');
    }

    const totalPrice = productPrice * Number(quantity);

    // Return all lock duration options (2, 4, 8 hours)
    const options = Object.entries(LOCK_FEE_CONFIG).map(([duration, config]) => ({
      duration: Number(duration),
      label: config.label,
      percentage: config.percentage,
      fee: Math.ceil((totalPrice * config.percentage) / 100)
    })).sort((a, b) => a.duration - b.duration);

    sendSuccess(res, {
      productId,
      productName: product.name,
      productPrice,
      quantity: Number(quantity),
      totalPrice,
      lockOptions: options,
      defaultDuration: 4 // Recommend 4-hour option
    }, 'Lock fee options retrieved successfully');

  } catch (error) {
    logger.error('❌ [GET LOCK OPTIONS] Error:', error);
    throw new AppError('Failed to get lock fee options', 500);
  }
});