import { logger } from '../config/logger';
/**
 * Coupon Validation Service
 *
 * Validates coupons during cart/checkout operations
 * Handles store-wide and product-specific coupon validation
 */

import { Types } from 'mongoose';

export interface ValidationContext {
  cartItems: Array<{
    productId: string;
    storeId: string;
    quantity: number;
    price: number;
  }>;
  userId: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  applicableItems?: string[]; // Product IDs that the coupon applies to
  discountAmount?: number;
}

/**
 * Validate if coupon can be applied to cart
 */
export async function validateCouponForCart(
  couponId: string,
  context: ValidationContext
): Promise<ValidationResult> {
  try {
    const { Coupon } = await import('../models/Coupon');
    const { UserCoupon } = await import('../models/UserCoupon');

    // 1. Find the coupon
    const coupon = await Coupon.findById(couponId).lean();

    if (!coupon) {
      return {
        isValid: false,
        error: 'Coupon not found'
      };
    }

    // 2. Check if coupon is active and valid
    if (coupon.status !== 'active') {
      return {
        isValid: false,
        error: 'This coupon is no longer active'
      };
    }

    const now = new Date();
    if (coupon.validFrom > now) {
      return {
        isValid: false,
        error: 'This coupon is not yet valid'
      };
    }

    if (coupon.validTo < now) {
      return {
        isValid: false,
        error: 'This coupon has expired'
      };
    }

    // 3. Check user coupon ownership and status
    const userCoupon = await UserCoupon.findOne({
      user: context.userId,
      coupon: couponId
    }).lean();

    if (!userCoupon) {
      return {
        isValid: false,
        error: 'You do not own this coupon'
      };
    }

    if (userCoupon.status === 'used') {
      return {
        isValid: false,
        error: 'This coupon has already been used'
      };
    }

    if (userCoupon.status === 'expired') {
      return {
        isValid: false,
        error: 'This coupon has expired'
      };
    }

    // 4. Check usage limits
    if (coupon.usageLimit && coupon.usageLimit.perUser > 0) {
      const usageCount = await UserCoupon.countDocuments({
        user: context.userId,
        coupon: couponId,
        status: 'used'
      });

      if (usageCount >= coupon.usageLimit.perUser) {
        return {
          isValid: false,
          error: 'You have reached the usage limit for this coupon'
        };
      }
    }

    // 5. Validate applicability based on metadata (for spin wheel coupons)
    if (coupon.metadata && coupon.metadata.source === 'spin_wheel') {
      return validateSpinWheelCoupon(coupon, context);
    }

    // 6. Validate applicability based on products/stores/categories
    return validateStandardCoupon(coupon, context);

  } catch (error) {
    logger.error('❌ [COUPON_VALIDATION] Error validating coupon:', error);
    return {
      isValid: false,
      error: 'Failed to validate coupon. Please try again.'
    };
  }
}

/**
 * Validate spin wheel coupons (with metadata)
 */
function validateSpinWheelCoupon(
  coupon: any,
  context: ValidationContext
): ValidationResult {
  const metadata = coupon.metadata;

  // Product-specific coupon
  if (metadata.isProductSpecific && metadata.productId) {
    const applicableItems = context.cartItems.filter(
      item => item.productId === metadata.productId
    );

    if (applicableItems.length === 0) {
      return {
        isValid: false,
        error: `This coupon is only valid for ${metadata.productName} from ${metadata.storeName}. Please add this product to your cart to use this coupon.`
      };
    }

    // Calculate discount for applicable items
    const subtotal = applicableItems.reduce(
      (sum, item) => sum + (item.price * item.quantity),
      0
    );

    const discountAmount = calculateDiscount(coupon, subtotal);

    return {
      isValid: true,
      applicableItems: applicableItems.map(item => item.productId),
      discountAmount
    };
  }

  // Store-wide coupon
  if (!metadata.isProductSpecific && metadata.storeId && metadata.storeId !== 'generic') {
    const applicableItems = context.cartItems.filter(
      item => item.storeId === metadata.storeId
    );

    if (applicableItems.length === 0) {
      return {
        isValid: false,
        error: `This coupon is only valid for products from ${metadata.storeName}. Please add products from this store to use this coupon.`
      };
    }

    // Calculate discount for applicable items
    const subtotal = applicableItems.reduce(
      (sum, item) => sum + (item.price * item.quantity),
      0
    );

    // Check minimum order value
    if (coupon.minOrderValue && subtotal < coupon.minOrderValue) {
      return {
        isValid: false,
        error: `Minimum order value of ₹${coupon.minOrderValue} required for products from ${metadata.storeName}`
      };
    }

    const discountAmount = calculateDiscount(coupon, subtotal);

    return {
      isValid: true,
      applicableItems: applicableItems.map(item => item.productId),
      discountAmount
    };
  }

  // Generic/fallback (shouldn't happen but handle it)
  return {
    isValid: false,
    error: 'This coupon configuration is invalid'
  };
}

/**
 * Validate standard coupons (based on applicableTo fields)
 */
function validateStandardCoupon(
  coupon: any,
  context: ValidationContext
): ValidationResult {
  const { applicableTo } = coupon;

  // Find applicable items
  let applicableItems = context.cartItems;

  // Filter by products if specified
  if (applicableTo.products && applicableTo.products.length > 0) {
    const productIds = applicableTo.products.map((p: any) => p.toString());
    applicableItems = applicableItems.filter(item =>
      productIds.includes(item.productId)
    );
  }

  // Filter by stores if specified
  if (applicableTo.stores && applicableTo.stores.length > 0) {
    const storeIds = applicableTo.stores.map((s: any) => s.toString());
    applicableItems = applicableItems.filter(item =>
      storeIds.includes(item.storeId)
    );
  }

  if (applicableItems.length === 0) {
    return {
      isValid: false,
      error: 'This coupon is not applicable to any items in your cart'
    };
  }

  // Calculate discount for applicable items
  const subtotal = applicableItems.reduce(
    (sum, item) => sum + (item.price * item.quantity),
    0
  );

  // Check minimum order value
  if (coupon.minOrderValue && subtotal < coupon.minOrderValue) {
    return {
      isValid: false,
      error: `Minimum order value of ₹${coupon.minOrderValue} required`
    };
  }

  const discountAmount = calculateDiscount(coupon, subtotal);

  return {
    isValid: true,
    applicableItems: applicableItems.map(item => item.productId),
    discountAmount
  };
}

/**
 * Calculate discount amount based on coupon type
 */
function calculateDiscount(coupon: any, subtotal: number): number {
  if (coupon.discountType === 'PERCENTAGE') {
    let discount = (subtotal * coupon.discountValue) / 100;

    // Apply max discount cap if specified
    if (coupon.maxDiscountCap && coupon.maxDiscountCap > 0) {
      discount = Math.min(discount, coupon.maxDiscountCap);
    }

    return Math.round(discount * 100) / 100; // Round to 2 decimal places
  } else if (coupon.discountType === 'FIXED') {
    return Math.min(coupon.discountValue, subtotal);
  }

  return 0;
}

/**
 * Mark coupon as used after successful order
 * Uses atomic operations to prevent race conditions where multiple users
 * could exceed the usage limit
 */
export async function markCouponAsUsed(
  couponId: string,
  userId: string,
  orderId: string
): Promise<boolean> {
  try {
    const { UserCoupon } = await import('../models/UserCoupon');
    const { Coupon } = await import('../models/Coupon');

    const now = new Date();

    // First, atomically check and increment the coupon usage count
    // This prevents race conditions where multiple users exceed the limit
    const updatedCoupon = await Coupon.findOneAndUpdate(
      {
        _id: couponId,
        status: 'active',
        validFrom: { $lte: now },
        validTo: { $gte: now },
        // Only update if usage limit not reached (or unlimited when totalUsage is 0)
        $or: [
          { 'usageLimit.totalUsage': 0 }, // Unlimited usage
          { $expr: { $lt: ['$usageLimit.usedCount', '$usageLimit.totalUsage'] } }
        ]
      },
      {
        $inc: { usageCount: 1, 'usageLimit.usedCount': 1 }
      },
      { new: true }
    );

    if (!updatedCoupon) {
      // Check why the update failed
      const existingCoupon = await Coupon.findById(couponId).lean();

      if (!existingCoupon) {
        logger.error('❌ [COUPON_VALIDATION] Coupon not found:', couponId);
        return false;
      }

      if (existingCoupon.usageLimit.totalUsage > 0 &&
          existingCoupon.usageLimit.usedCount >= existingCoupon.usageLimit.totalUsage) {
        logger.error('❌ [COUPON_VALIDATION] Coupon usage limit reached:', couponId);
        return false;
      }

      logger.error('❌ [COUPON_VALIDATION] Coupon validation failed (inactive/expired):', couponId);
      return false;
    }

    // Check if the coupon should be deactivated after this usage
    if (updatedCoupon.usageLimit.totalUsage > 0 &&
        updatedCoupon.usageLimit.usedCount >= updatedCoupon.usageLimit.totalUsage) {
      await Coupon.updateOne(
        { _id: updatedCoupon._id },
        { $set: { status: 'inactive' } }
      );
      logger.info(`⚠️ [COUPON_VALIDATION] Coupon ${couponId} deactivated - usage limit reached`);
    }

    // Update user coupon status atomically
    const userCoupon = await UserCoupon.findOneAndUpdate(
      {
        user: userId,
        coupon: couponId,
        status: 'available'
      },
      {
        $set: {
          status: 'used',
          usedDate: new Date(),
          usedInOrder: orderId
        }
      },
      { new: true }
    );

    if (!userCoupon) {
      // User coupon not found - might have been used in another concurrent request
      // or user used coupon without claiming first
      // The global counter was already incremented, which is correct behavior
      logger.warn('⚠️ [COUPON_VALIDATION] User coupon not found or already used, but global usage recorded');
    }

    logger.info(`✅ [COUPON_VALIDATION] Coupon ${couponId} marked as used by user ${userId}`);
    return true;
  } catch (error) {
    logger.error('❌ [COUPON_VALIDATION] Error marking coupon as used:', error);
    return false;
  }
}

export default {
  validateCouponForCart,
  markCouponAsUsed
};
