import { logger } from '../config/logger';
import { Types } from 'mongoose';
import { PromoCode, IPromoCodeValidationResult } from '../models/PromoCode';
import { SubscriptionTier, BillingCycle, Subscription } from '../models/Subscription';
import tierConfigService from './tierConfigService';

/**
 * Get subscription price based on tier and billing cycle (from DB via tierConfigService)
 */
export const getSubscriptionPrice = async (tier: SubscriptionTier, billingCycle: BillingCycle): Promise<number> => {
  return tierConfigService.getTierPrice(tier, billingCycle);
};

/**
 * Validate a promo code for a subscription
 */
export const validatePromoCode = async (
  code: string,
  tier: SubscriptionTier,
  billingCycle: BillingCycle,
  userId: Types.ObjectId | string
): Promise<{
  valid: boolean;
  discount?: number;
  finalPrice?: number;
  message?: string;
  promoCode?: any;
}> => {
  try {
    // Get original price from DB
    const originalPrice = await getSubscriptionPrice(tier, billingCycle);

    // Use the static method from PromoCode model
    const result: IPromoCodeValidationResult = await PromoCode.validateCode(
      code,
      tier,
      billingCycle,
      userId,
      originalPrice
    );

    if (!result.valid) {
      return {
        valid: false,
        message: result.message
      };
    }

    // Return success with discount details
    return {
      valid: true,
      discount: result.discount,
      finalPrice: result.discountedPrice,
      promoCode: result.promoCode,
      message: result.message
    };
  } catch (error: any) {
    logger.error('[PROMO_CODE_SERVICE] Error validating promo code:', error);
    return {
      valid: false,
      message: 'Error validating promo code'
    };
  }
};

/**
 * Apply promo code to a subscription
 * This increments the usage count and records the usage
 */
export const applyPromoCode = async (
  code: string,
  tier: SubscriptionTier,
  billingCycle: BillingCycle,
  userId: Types.ObjectId | string,
  subscriptionId: Types.ObjectId | string
): Promise<{
  success: boolean;
  discount?: number;
  finalPrice?: number;
  message?: string;
}> => {
  try {
    // First validate the code
    const originalPrice = await getSubscriptionPrice(tier, billingCycle);
    const validation = await PromoCode.validateCode(
      code,
      tier,
      billingCycle,
      userId,
      originalPrice
    );

    if (!validation.valid || !validation.promoCode) {
      return {
        success: false,
        message: validation.message
      };
    }

    // Increment usage
    await validation.promoCode.incrementUsage(
      userId,
      subscriptionId,
      originalPrice,
      validation.discountedPrice || originalPrice
    );

    return {
      success: true,
      discount: validation.discount,
      finalPrice: validation.discountedPrice,
      message: `Promo code applied! You saved ₹${validation.discount}`
    };
  } catch (error: any) {
    logger.error('[PROMO_CODE_SERVICE] Error applying promo code:', error);
    return {
      success: false,
      message: 'Error applying promo code'
    };
  }
};

/**
 * Get all active promo codes (admin only)
 */
export const getActivePromoCodes = async (
  tier?: SubscriptionTier,
  billingCycle?: BillingCycle
): Promise<any[]> => {
  try {
    return await PromoCode.getActivePromoCodes(tier, billingCycle);
  } catch (error: any) {
    logger.error('[PROMO_CODE_SERVICE] Error fetching active promo codes:', error);
    return [];
  }
};

/**
 * Check if a user has used a promo code
 */
export const hasUserUsedPromoCode = async (
  code: string,
  userId: Types.ObjectId | string
): Promise<boolean> => {
  try {
    const sanitizedCode = PromoCode.sanitizeCode(code);
    const promoCode = await PromoCode.findOne({ code: sanitizedCode }).lean();

    if (!promoCode) {
      return false;
    }

    const canUse = await promoCode.canBeUsedBy(userId);
    return !canUse; // If can't use, means already used
  } catch (error: any) {
    logger.error('[PROMO_CODE_SERVICE] Error checking user promo usage:', error);
    return false;
  }
};

/**
 * Get promo code usage statistics
 */
export const getPromoCodeStats = async (code: string): Promise<any> => {
  try {
    const sanitizedCode = PromoCode.sanitizeCode(code);
    const promoCode = await PromoCode.findOne({ code: sanitizedCode }).lean();

    if (!promoCode) {
      return null;
    }

    return {
      code: promoCode.code,
      description: promoCode.description,
      usedCount: promoCode.usedCount,
      maxUses: promoCode.maxUses,
      remainingUses: promoCode.maxUses > 0 ? promoCode.maxUses - promoCode.usedCount : 'Unlimited',
      isActive: promoCode.isActive,
      validFrom: promoCode.validFrom,
      validUntil: promoCode.validUntil,
      totalDiscount: promoCode.usedBy.reduce((sum, usage) => sum + usage.discountApplied, 0),
      uniqueUsers: new Set(promoCode.usedBy.map(u => u.user.toString())).size
    };
  } catch (error: any) {
    logger.error('[PROMO_CODE_SERVICE] Error fetching promo code stats:', error);
    return null;
  }
};

/**
 * Create a new promo code (admin only)
 */
export const createPromoCode = async (promoData: {
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  applicableTiers: SubscriptionTier[];
  applicableBillingCycles?: BillingCycle[];
  validFrom: Date;
  validUntil: Date;
  maxUses: number;
  maxUsesPerUser: number;
  metadata?: {
    campaign?: string;
    source?: string;
    notes?: string;
  };
  createdBy?: Types.ObjectId | string;
}): Promise<any> => {
  try {
    const promoCode = new PromoCode(promoData);
    await promoCode.save();
    return promoCode;
  } catch (error: any) {
    logger.error('[PROMO_CODE_SERVICE] Error creating promo code:', error);
    throw error;
  }
};

/**
 * Deactivate a promo code (admin only)
 */
export const deactivatePromoCode = async (code: string): Promise<boolean> => {
  try {
    const sanitizedCode = PromoCode.sanitizeCode(code);
    const result = await PromoCode.updateOne(
      { code: sanitizedCode },
      { isActive: false }
    );
    return result.modifiedCount > 0;
  } catch (error: any) {
    logger.error('[PROMO_CODE_SERVICE] Error deactivating promo code:', error);
    return false;
  }
};

export default {
  validatePromoCode,
  applyPromoCode,
  getActivePromoCodes,
  hasUserUsedPromoCode,
  getPromoCodeStats,
  createPromoCode,
  deactivatePromoCode,
  getSubscriptionPrice
};
