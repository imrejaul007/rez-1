import { logger } from '../config/logger';
import Offer, { IOffer } from '../models/Offer';
import FlashSale, { IFlashSale } from '../models/FlashSale';
import { User } from '../models/User';
import mongoose from 'mongoose';
import type { Lean } from '../types/lean';

interface CartItem {
  productId: string;
  quantity: number;
  price: number;
  storeId?: string;
  categoryId?: string;
}

interface OfferCalculation {
  offerId: string;
  offerType: 'flash_sale' | 'exclusive' | 'category' | 'store' | 'general';
  title: string;
  description: string;
  priority: number;
  savings: number;
  finalPrice: number;
  discountPercentage: number;
  applicable: boolean;
  reason?: string;
}

interface BestOfferResult {
  bestOffer: OfferCalculation | null;
  allApplicableOffers: OfferCalculation[];
  originalTotal: number;
  finalTotal: number;
  totalSavings: number;
}

class OfferService {
  /**
   * Priority order for offer types (higher number = higher priority)
   */
  private readonly OFFER_PRIORITY = {
    flash_sale: 100,
    exclusive: 80,
    category: 60,
    store: 40,
    general: 20,
  };

  /**
   * Find the best offer for a cart
   */
  async findBestOffer(
    cartTotal: number,
    items: CartItem[],
    userId: string
  ): Promise<BestOfferResult> {
    try {
      logger.info('🔍 [OfferService] Finding best offer for cart:', {
        cartTotal,
        itemCount: items.length,
        userId,
      });

      // Get all applicable offers
      const allOffers = await this.getAllApplicableOffers(cartTotal, items, userId);

      if (allOffers.length === 0) {
        return {
          bestOffer: null,
          allApplicableOffers: [],
          originalTotal: cartTotal,
          finalTotal: cartTotal,
          totalSavings: 0,
        };
      }

      // Sort by priority and savings
      const sortedOffers = allOffers.sort((a, b) => {
        // First by priority
        if (b.priority !== a.priority) {
          return b.priority - a.priority;
        }
        // Then by savings amount
        return b.savings - a.savings;
      });

      const bestOffer = sortedOffers[0];

      return {
        bestOffer,
        allApplicableOffers: sortedOffers,
        originalTotal: cartTotal,
        finalTotal: bestOffer.finalPrice,
        totalSavings: bestOffer.savings,
      };
    } catch (error) {
      logger.error('❌ [OfferService] Error finding best offer:', error);
      throw error;
    }
  }

  /**
   * Get all applicable offers for cart
   */
  private async getAllApplicableOffers(
    cartTotal: number,
    items: CartItem[],
    userId: string
  ): Promise<OfferCalculation[]> {
    const offers: OfferCalculation[] = [];

    // 1. Check flash sales (highest priority)
    const flashSaleOffers = await this.getFlashSaleOffers(items, cartTotal);
    offers.push(...flashSaleOffers);

    // 2. Check exclusive user offers (based on tier/loyalty)
    const exclusiveOffers = await this.getExclusiveOffers(userId, cartTotal, items);
    offers.push(...exclusiveOffers);

    // 3. Check category offers
    const categoryOffers = await this.getCategoryOffers(items, cartTotal);
    offers.push(...categoryOffers);

    // 4. Check store-wide offers
    const storeOffers = await this.getStoreOffers(items, cartTotal);
    offers.push(...storeOffers);

    // 5. Check general offers
    const generalOffers = await this.getGeneralOffers(cartTotal);
    offers.push(...generalOffers);

    // Filter out non-applicable offers
    return offers.filter(offer => offer.applicable);
  }

  /**
   * Get flash sale offers
   */
  private async getFlashSaleOffers(
    items: CartItem[],
    cartTotal: number
  ): Promise<OfferCalculation[]> {
    try {
      const productIds = items.map(item => new mongoose.Types.ObjectId(item.productId));
      const now = new Date();

      const flashSales = await FlashSale.find({
        products: { $in: productIds },
        isActive: true,
        startTime: { $lte: now },
        endTime: { $gte: now },
        status: { $nin: ['ended', 'sold_out'] },
      }).sort({ priority: -1, discountPercentage: -1 }).lean();

      return flashSales.map(sale => {
        const savings = (cartTotal * sale.discountPercentage) / 100;
        const cappedSavings = sale.maximumDiscount
          ? Math.min(savings, sale.maximumDiscount)
          : savings;

        const applicable = !sale.minimumPurchase || cartTotal >= sale.minimumPurchase;

        return {
          offerId: (sale as any)._id.toString(),
          offerType: 'flash_sale',
          title: sale.title,
          description: sale.description,
          priority: this.OFFER_PRIORITY.flash_sale + (sale.priority || 0),
          savings: cappedSavings,
          finalPrice: cartTotal - cappedSavings,
          discountPercentage: sale.discountPercentage,
          applicable,
          reason: applicable ? undefined : `Minimum purchase of ₹${sale.minimumPurchase} required`,
        };
      });
    } catch (error) {
      logger.error('❌ [OfferService] Error getting flash sale offers:', error);
      return [];
    }
  }

  /**
   * Get exclusive user offers (based on loyalty tier)
   */
  private async getExclusiveOffers(
    userId: string,
    cartTotal: number,
    items: CartItem[]
  ): Promise<OfferCalculation[]> {
    try {
      // Get user's tier/loyalty level
      const user = await User.findById(userId).select('tier loyaltyPoints').lean();
      if (!user) return [];

      const productIds = items.map(item => new mongoose.Types.ObjectId(item.productId));
      const now = new Date();

      // Find offers that are exclusive to user's tier
      const exclusiveOffers = await Offer.find({
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now },
        $or: [
          { applicableProducts: { $in: productIds } },
          { tags: { $in: ['exclusive', 'vip', 'premium'] } },
        ],
      }).lean();

      return exclusiveOffers.map(offer => {
        const discountPercentage = offer.cashbackPercentage || 0;
        const savings = (cartTotal * discountPercentage) / 100;
        const cappedSavings = offer.restrictions.maxDiscountAmount
          ? Math.min(savings, offer.restrictions.maxDiscountAmount)
          : savings;

        const applicable = !offer.restrictions.minOrderValue || cartTotal >= offer.restrictions.minOrderValue;

        return {
          offerId: (offer as any)._id.toString(),
          offerType: 'exclusive',
          title: offer.title,
          description: offer.description || '',
          priority: this.OFFER_PRIORITY.exclusive,
          savings: cappedSavings,
          finalPrice: cartTotal - cappedSavings,
          discountPercentage,
          applicable,
          reason: applicable ? undefined : `Minimum purchase of ₹${offer.restrictions.minOrderValue} required`,
        };
      });
    } catch (error) {
      logger.error('❌ [OfferService] Error getting exclusive offers:', error);
      return [];
    }
  }

  /**
   * Get category-specific offers
   */
  private async getCategoryOffers(
    items: CartItem[],
    cartTotal: number
  ): Promise<OfferCalculation[]> {
    try {
      const categoryIds = items
        .filter(item => item.categoryId)
        .map(item => new mongoose.Types.ObjectId(item.categoryId!));

      if (categoryIds.length === 0) return [];

      const now = new Date();

      const categoryOffers = await Offer.find({
        category: { $in: categoryIds },
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now },
      }).lean();

      return categoryOffers.map(offer => {
        const discountPercentage = offer.cashbackPercentage || 0;
        const savings = (cartTotal * discountPercentage) / 100;
        const cappedSavings = offer.restrictions.maxDiscountAmount
          ? Math.min(savings, offer.restrictions.maxDiscountAmount)
          : savings;

        const applicable = !offer.restrictions.minOrderValue || cartTotal >= offer.restrictions.minOrderValue;

        return {
          offerId: (offer as any)._id.toString(),
          offerType: 'category',
          title: offer.title,
          description: offer.description || '',
          priority: this.OFFER_PRIORITY.category,
          savings: cappedSavings,
          finalPrice: cartTotal - cappedSavings,
          discountPercentage,
          applicable,
          reason: applicable ? undefined : `Minimum purchase of ₹${offer.restrictions.minOrderValue} required`,
        };
      });
    } catch (error) {
      logger.error('❌ [OfferService] Error getting category offers:', error);
      return [];
    }
  }

  /**
   * Get store-wide offers
   */
  private async getStoreOffers(
    items: CartItem[],
    cartTotal: number
  ): Promise<OfferCalculation[]> {
    try {
      const storeIds = items
        .filter(item => item.storeId)
        .map(item => new mongoose.Types.ObjectId(item.storeId!));

      if (storeIds.length === 0) return [];

      const now = new Date();

      const storeOffers = await Offer.find({
        $or: [
          { store: { $in: storeIds } },
          { applicableStores: { $in: storeIds } },
        ],
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now },
      }).lean();

      return storeOffers.map(offer => {
        const discountPercentage = offer.cashbackPercentage || 0;
        const savings = (cartTotal * discountPercentage) / 100;
        const cappedSavings = offer.restrictions.maxDiscountAmount
          ? Math.min(savings, offer.restrictions.maxDiscountAmount)
          : savings;

        const applicable = !offer.restrictions.minOrderValue || cartTotal >= offer.restrictions.minOrderValue;

        return {
          offerId: (offer as any)._id.toString(),
          offerType: 'store',
          title: offer.title,
          description: offer.description || '',
          priority: this.OFFER_PRIORITY.store,
          savings: cappedSavings,
          finalPrice: cartTotal - cappedSavings,
          discountPercentage,
          applicable,
          reason: applicable ? undefined : `Minimum purchase of ₹${offer.restrictions.minOrderValue} required`,
        };
      });
    } catch (error) {
      logger.error('❌ [OfferService] Error getting store offers:', error);
      return [];
    }
  }

  /**
   * Get general/global offers
   */
  private async getGeneralOffers(cartTotal: number): Promise<OfferCalculation[]> {
    try {
      const now = new Date();

      const generalOffers = await Offer.find({
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now },
        // No specific product, category, or store restrictions
        $and: [
          { $or: [{ applicableProducts: { $exists: false } }, { applicableProducts: { $size: 0 } }] },
          { $or: [{ applicableStores: { $exists: false } }, { applicableStores: { $size: 0 } }] },
          { $or: [{ product: { $exists: false } }, { product: null }] },
          { $or: [{ store: { $exists: false } }, { store: null }] },
        ],
      }).lean();

      return generalOffers.map(offer => {
        const discountPercentage = offer.cashbackPercentage || 0;
        const savings = (cartTotal * discountPercentage) / 100;
        const cappedSavings = offer.restrictions.maxDiscountAmount
          ? Math.min(savings, offer.restrictions.maxDiscountAmount)
          : savings;

        const applicable = !offer.restrictions.minOrderValue || cartTotal >= offer.restrictions.minOrderValue;

        return {
          offerId: (offer as any)._id.toString(),
          offerType: 'general',
          title: offer.title,
          description: offer.description || '',
          priority: this.OFFER_PRIORITY.general,
          savings: cappedSavings,
          finalPrice: cartTotal - cappedSavings,
          discountPercentage,
          applicable,
          reason: applicable ? undefined : `Minimum purchase of ₹${offer.restrictions.minOrderValue} required`,
        };
      });
    } catch (error) {
      logger.error('❌ [OfferService] Error getting general offers:', error);
      return [];
    }
  }

  /**
   * Apply offer to cart
   */
  async applyOffer(
    offerId: string,
    cartTotal: number,
    items: CartItem[],
    userId: string
  ): Promise<{
    success: boolean;
    finalPrice: number;
    savings: number;
    offer?: OfferCalculation;
    message?: string;
  }> {
    try {
      // Get all applicable offers
      const result = await this.findBestOffer(cartTotal, items, userId);

      // Find the specific offer
      const selectedOffer = result.allApplicableOffers.find(
        offer => offer.offerId === offerId
      );

      if (!selectedOffer) {
        return {
          success: false,
          finalPrice: cartTotal,
          savings: 0,
          message: 'Offer not found or not applicable',
        };
      }

      if (!selectedOffer.applicable) {
        return {
          success: false,
          finalPrice: cartTotal,
          savings: 0,
          message: selectedOffer.reason || 'Offer is not applicable',
        };
      }

      return {
        success: true,
        finalPrice: selectedOffer.finalPrice,
        savings: selectedOffer.savings,
        offer: selectedOffer,
      };
    } catch (error) {
      logger.error('❌ [OfferService] Error applying offer:', error);
      throw error;
    }
  }

  /**
   * Validate promo code
   */
  async validatePromoCode(
    promoCode: string,
    cartTotal: number,
    userId: string
  ): Promise<{
    valid: boolean;
    offer?: Lean<IOffer> | Lean<IFlashSale>;
    savings?: number;
    finalPrice?: number;
    message?: string;
  }> {
    try {
      const now = new Date();

      // Check if it's a flash sale promo code
      const flashSale = await FlashSale.findOne({
        redemptionCode: promoCode.toUpperCase(),
        isActive: true,
        startTime: { $lte: now },
        endTime: { $gte: now },
        status: { $nin: ['ended', 'sold_out'] },
      }).lean();

      if (flashSale) {
        const applicable = !flashSale.minimumPurchase || cartTotal >= flashSale.minimumPurchase;

        if (!applicable) {
          return {
            valid: false,
            message: `Minimum purchase of ₹${flashSale.minimumPurchase} required`,
          };
        }

        const savings = (cartTotal * flashSale.discountPercentage) / 100;
        const cappedSavings = flashSale.maximumDiscount
          ? Math.min(savings, flashSale.maximumDiscount)
          : savings;

        return {
          valid: true,
          offer: flashSale as any,
          savings: cappedSavings,
          finalPrice: cartTotal - cappedSavings,
        };
      }

      // Check regular offers
      const offer = await Offer.findOne({
        redemptionCode: promoCode.toUpperCase(),
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now },
      }).lean();

      if (!offer) {
        return {
          valid: false,
          message: 'Invalid promo code',
        };
      }

      const applicable = !offer.restrictions.minOrderValue || cartTotal >= offer.restrictions.minOrderValue;

      if (!applicable) {
        return {
          valid: false,
          message: `Minimum purchase of ₹${offer.restrictions.minOrderValue} required`,
        };
      }

      const discountPercentage = offer.cashbackPercentage || 0;
      const savings = (cartTotal * discountPercentage) / 100;
      const cappedSavings = offer.restrictions.maxDiscountAmount
        ? Math.min(savings, offer.restrictions.maxDiscountAmount)
        : savings;

      return {
        valid: true,
        offer,
        savings: cappedSavings,
        finalPrice: cartTotal - cappedSavings,
      };
    } catch (error) {
      logger.error('❌ [OfferService] Error validating promo code:', error);
      throw error;
    }
  }
}

export default new OfferService();
