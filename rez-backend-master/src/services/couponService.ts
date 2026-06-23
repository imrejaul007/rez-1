import { logger } from '../config/logger';
// Coupon Service
// Business logic for coupon management and validation

import { Types } from 'mongoose';
import { Coupon, ICoupon } from '../models/Coupon';
import { UserCoupon, IUserCoupon } from '../models/UserCoupon';
import { User } from '../models/User';
import { pct, round2 } from '../utils/currency';
import { escapeRegex } from '../utils/sanitize';
import { Lean } from '../types/lean';

interface CartItem {
  product: Types.ObjectId;
  quantity: number;
  price: number;
  category?: Types.ObjectId;
  store?: Types.ObjectId;
}

interface CartData {
  items: CartItem[];
  subtotal: number;
  userId: Types.ObjectId;
}

interface CouponValidationResult {
  valid: boolean;
  coupon?: Lean<ICoupon>;
  userCoupon?: Lean<IUserCoupon>;
  discount: number;
  message: string;
  error?: string;
}

interface ApplyCouponResult {
  success: boolean;
  discount: number;
  finalAmount: number;
  couponApplied?: {
    code: string;
    type: string;
    value: number;
  };
  message: string;
  error?: string;
}

class CouponService {
  /**
   * Validate if a coupon can be applied to the cart
   */
  async validateCoupon(
    couponCode: string,
    cartData: CartData
  ): Promise<CouponValidationResult> {
    try {
      // Find coupon
      const coupon = await Coupon.findOne({
        couponCode: couponCode.toUpperCase(),
      }).lean();

      if (!coupon) {
        return {
          valid: false,
          discount: 0,
          message: 'Invalid coupon code',
          error: 'COUPON_NOT_FOUND',
        };
      }

      // Check if coupon is active
      if (coupon.status !== 'active') {
        return {
          valid: false,
          discount: 0,
          message: 'This coupon is no longer active',
          error: 'COUPON_INACTIVE',
        };
      }

      // Check validity dates
      const now = new Date();
      if (now < coupon.validFrom) {
        return {
          valid: false,
          discount: 0,
          message: `This coupon is valid from ${coupon.validFrom.toLocaleDateString()}`,
          error: 'COUPON_NOT_YET_VALID',
        };
      }

      if (now > coupon.validTo) {
        return {
          valid: false,
          discount: 0,
          message: 'This coupon has expired',
          error: 'COUPON_EXPIRED',
        };
      }

      // Check minimum order value
      if (cartData.subtotal < coupon.minOrderValue) {
        return {
          valid: false,
          discount: 0,
          message: `Minimum order value of ₹${coupon.minOrderValue} required`,
          error: 'MIN_ORDER_VALUE_NOT_MET',
        };
      }

      // Check total usage limit
      if (coupon.usageLimit.totalUsage > 0) {
        if (coupon.usageLimit.usedCount >= coupon.usageLimit.totalUsage) {
          return {
            valid: false,
            discount: 0,
            message: 'This coupon has reached its usage limit',
            error: 'USAGE_LIMIT_REACHED',
          };
        }
      }

      // Check user-specific usage limit
      const userUsageCount = await (UserCoupon as any).getUserCouponUsageCount(
        cartData.userId,
        coupon._id
      );

      if (userUsageCount >= coupon.usageLimit.perUser) {
        return {
          valid: false,
          discount: 0,
          message: 'You have already used this coupon maximum times',
          error: 'USER_USAGE_LIMIT_REACHED',
        };
      }

      // Check if user has claimed this coupon
      const userCoupon = await UserCoupon.findOne({
        user: cartData.userId,
        coupon: coupon._id,
        status: 'available',
      }).lean();

      // Check applicability to cart items
      const isApplicable = await this.checkCouponApplicability(coupon, cartData);

      if (!isApplicable) {
        return {
          valid: false,
          discount: 0,
          message: 'This coupon is not applicable to items in your cart',
          error: 'NOT_APPLICABLE',
        };
      }

      // Calculate discount
      const discount = this.calculateDiscount(coupon, cartData.subtotal);

      return {
        valid: true,
        coupon,
        userCoupon: userCoupon || undefined,
        discount,
        message: `Coupon applied! You save ₹${discount}`,
      };
    } catch (error) {
      logger.error('❌ [COUPON SERVICE] Error validating coupon:', error);
      return {
        valid: false,
        discount: 0,
        message: 'Error validating coupon',
        error: 'VALIDATION_ERROR',
      };
    }
  }

  /**
   * Apply coupon to cart and calculate final amount
   */
  async applyCouponToCart(
    couponCode: string,
    cartData: CartData
  ): Promise<ApplyCouponResult> {
    const validation = await this.validateCoupon(couponCode, cartData);

    if (!validation.valid) {
      return {
        success: false,
        discount: 0,
        finalAmount: cartData.subtotal,
        message: validation.message,
        error: validation.error,
      };
    }

    const finalAmount = Math.max(0, cartData.subtotal - validation.discount);

    return {
      success: true,
      discount: validation.discount,
      finalAmount,
      couponApplied: {
        code: validation.coupon!.couponCode,
        type: validation.coupon!.discountType,
        value: validation.coupon!.discountValue,
      },
      message: `Coupon applied successfully! You save ₹${validation.discount}`,
    };
  }

  /**
   * Get best applicable coupon for cart
   */
  async getBestCouponForCart(cartData: CartData): Promise<ICoupon | null> {
    try {
      // Get all active coupons
      const coupons = await (Coupon as any).getActiveCoupons();

      let bestCoupon: ICoupon | null = null;
      let maxDiscount = 0;

      for (const coupon of coupons) {
        // Only check auto-apply coupons
        if (!coupon.autoApply) continue;

        const validation = await this.validateCoupon(coupon.couponCode, cartData);

        if (validation.valid && validation.discount > maxDiscount) {
          maxDiscount = validation.discount;
          bestCoupon = coupon;
        }
      }

      return bestCoupon;
    } catch (error) {
      logger.error('❌ [COUPON SERVICE] Error getting best coupon:', error);
      return null;
    }
  }

  /**
   * Check if coupon is applicable to cart items
   */
  private async checkCouponApplicability(
    coupon: Lean<ICoupon>,
    cartData: CartData
  ): Promise<boolean> {
    // If no specific applicability rules, it's applicable to all
    if (
      coupon.applicableTo.categories.length === 0 &&
      coupon.applicableTo.products.length === 0 &&
      coupon.applicableTo.stores.length === 0 &&
      (coupon.applicableTo.userTiers.length === 0 ||
       coupon.applicableTo.userTiers.includes('all'))
    ) {
      return true;
    }

    // Check user tier
    if (coupon.applicableTo.userTiers.length > 0 &&
        !coupon.applicableTo.userTiers.includes('all')) {
      const user = await User.findById(cartData.userId).select('tier').lean();
      const userTier = (user as any)?.tier || 'bronze';

      if (!coupon.applicableTo.userTiers.includes(userTier)) {
        return false;
      }
    }

    // Check if any cart item matches coupon criteria
    for (const item of cartData.items) {
      // Check category
      if (coupon.applicableTo.categories.length > 0 && item.category) {
        if (coupon.applicableTo.categories.some(cat => cat.equals(item.category!))) {
          return true;
        }
      }

      // Check product
      if (coupon.applicableTo.products.length > 0) {
        if (coupon.applicableTo.products.some(prod => prod.equals(item.product))) {
          return true;
        }
      }

      // Check store
      if (coupon.applicableTo.stores.length > 0 && item.store) {
        if (coupon.applicableTo.stores.some(store => store.equals(item.store!))) {
          return true;
        }
      }
    }

    // If specific rules exist but nothing matched, not applicable
    if (
      coupon.applicableTo.categories.length > 0 ||
      coupon.applicableTo.products.length > 0 ||
      coupon.applicableTo.stores.length > 0
    ) {
      return false;
    }

    return true;
  }

  /**
   * Calculate discount amount
   */
  private calculateDiscount(coupon: Lean<ICoupon>, subtotal: number): number {
    let discount = 0;

    if (coupon.discountType === 'PERCENTAGE') {
      discount = pct(subtotal, coupon.discountValue);

      // Apply max discount cap if set
      if (coupon.maxDiscountCap > 0 && discount > coupon.maxDiscountCap) {
        discount = coupon.maxDiscountCap;
      }
    } else if (coupon.discountType === 'FIXED') {
      discount = coupon.discountValue;

      // Ensure discount doesn't exceed subtotal
      if (discount > subtotal) {
        discount = subtotal;
      }
    }

    return round2(discount);
  }

  /**
   * Claim a coupon for a user
   */
  async claimCoupon(
    userId: Types.ObjectId,
    couponId: Types.ObjectId
  ): Promise<{ success: boolean; userCoupon?: IUserCoupon; message: string }> {
    try {
      // Check if coupon exists and is active
      const coupon = await Coupon.findById(couponId).lean();

      if (!coupon) {
        return {
          success: false,
          message: 'Coupon not found',
        };
      }

      if (coupon.status !== 'active') {
        return {
          success: false,
          message: 'This coupon is no longer active',
        };
      }

      // Check if already claimed
      const alreadyClaimed = await (UserCoupon as any).hasUserClaimedCoupon(userId, couponId);

      if (alreadyClaimed) {
        return {
          success: false,
          message: 'You have already claimed this coupon',
        };
      }

      // Create user coupon — unique index { user, coupon } prevents double-claim atomically
      let userCoupon;
      try {
        userCoupon = await UserCoupon.create({
          user: userId,
          coupon: couponId,
          claimedDate: new Date(),
          expiryDate: coupon.validTo,
          status: 'available',
        });
      } catch (err: any) {
        if (err.code === 11000) {
          return {
            success: false,
            message: 'You have already claimed this coupon',
          };
        }
        throw err;
      }

      // Increment coupon claim count
      await (coupon as any).incrementClaimCount();

      return {
        success: true,
        userCoupon,
        message: 'Coupon claimed successfully!',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error claiming coupon',
      };
    }
  }

  /**
   * Mark coupon as used in an order with atomic check-and-increment
   * This prevents race conditions where multiple concurrent users could exceed the usage limit
   */
  async markCouponAsUsed(
    userId: Types.ObjectId,
    couponCode: string,
    orderId: Types.ObjectId
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const upperCouponCode = couponCode.toUpperCase();

      // Use atomic findOneAndUpdate to check limit and increment in a single operation
      // This prevents race conditions where multiple requests pass the check before any increments
      const now = new Date();
      const updatedCoupon = await Coupon.findOneAndUpdate(
        {
          couponCode: upperCouponCode,
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
          $inc: {
            'usageLimit.usedCount': 1,
            usageCount: 1
          }
        },
        {
          new: true, // Return the updated document
          runValidators: true
        }
      );

      if (!updatedCoupon) {
        // Either coupon not found, expired, inactive, or usage limit reached
        const existingCoupon = await Coupon.findOne({ couponCode: upperCouponCode }).lean();

        if (!existingCoupon) {
          logger.error('❌ [COUPON SERVICE] Coupon not found:', couponCode);
          return { success: false, error: 'COUPON_NOT_FOUND' };
        }

        if (existingCoupon.status !== 'active') {
          logger.error('❌ [COUPON SERVICE] Coupon is inactive:', couponCode);
          return { success: false, error: 'COUPON_INACTIVE' };
        }

        if (existingCoupon.usageLimit.totalUsage > 0 &&
            existingCoupon.usageLimit.usedCount >= existingCoupon.usageLimit.totalUsage) {
          logger.error('❌ [COUPON SERVICE] Coupon usage limit reached:', couponCode);
          return { success: false, error: 'USAGE_LIMIT_REACHED' };
        }

        logger.error('❌ [COUPON SERVICE] Coupon validation failed:', couponCode);
        return { success: false, error: 'COUPON_VALIDATION_FAILED' };
      }

      // Check if the coupon should be deactivated after this usage
      if (updatedCoupon.usageLimit.totalUsage > 0 &&
          updatedCoupon.usageLimit.usedCount >= updatedCoupon.usageLimit.totalUsage) {
        await Coupon.updateOne(
          { _id: updatedCoupon._id },
          { $set: { status: 'inactive' } }
        );
        logger.info(`⚠️ [COUPON SERVICE] Coupon ${couponCode} deactivated - usage limit reached`);
      }

      // Atomically update user coupon record to prevent duplicate usage by same user
      const userCouponUpdate = await UserCoupon.findOneAndUpdate(
        {
          user: userId,
          coupon: updatedCoupon._id,
          status: 'available',
        },
        {
          $set: {
            status: 'used',
            usedDate: new Date(),
            usedInOrder: orderId,
          }
        },
        { new: true }
      );

      if (!userCouponUpdate) {
        // User used coupon without claiming first - create a 'used' record atomically
        // Use findOneAndUpdate with upsert to prevent duplicate records in concurrent requests
        await UserCoupon.findOneAndUpdate(
          {
            user: userId,
            coupon: updatedCoupon._id,
            usedInOrder: orderId, // Use orderId to ensure uniqueness for this specific order
          },
          {
            $setOnInsert: {
              user: userId,
              coupon: updatedCoupon._id,
              claimedDate: new Date(),
              expiryDate: updatedCoupon.validTo,
              status: 'used',
              usedDate: new Date(),
              usedInOrder: orderId,
            }
          },
          { upsert: true, new: true }
        );
        logger.info(`✅ [COUPON SERVICE] Created used UserCoupon record for unclaimed coupon ${couponCode}`);
      }

      logger.info(`✅ [COUPON SERVICE] Coupon ${couponCode} marked as used by user ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error('❌ [COUPON SERVICE] Error marking coupon as used:', error);
      return { success: false, error: 'INTERNAL_ERROR' };
    }
  }

  /**
   * Search coupons
   */
  async searchCoupons(
    query: string,
    filters: any = {}
  ): Promise<Lean<ICoupon>[]> {
    try {
      const searchRegex = new RegExp(escapeRegex(query), 'i');

      return await Coupon.find({
        status: 'active',
        $or: [
          { couponCode: searchRegex },
          { title: searchRegex },
          { description: searchRegex },
          { tags: searchRegex },
        ],
        ...filters,
      })
        .sort({ isFeatured: -1, createdAt: -1 })
        .limit(20).lean();
    } catch (error) {
      logger.error('❌ [COUPON SERVICE] Error searching coupons:', error);
      return [];
    }
  }
}

export default new CouponService();
