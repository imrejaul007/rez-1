import { Request, Response } from 'express';
import Discount from '../models/Discount';
import DiscountUsage from '../models/DiscountUsage';
import { Store } from '../models/Store';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import mongoose from 'mongoose';
import { logger } from '../config/logger';
import { asyncHandler } from '../utils/asyncHandler';
import { validateSortField } from '../utils/sanitize';

/**
 * GET /api/discounts
 * Get all discounts with filters
 */
export const getDiscounts = asyncHandler(async (req: Request, res: Response) => {
    const {
      page = 1,
      limit = 20,
      applicableOn,
      type,
      minValue,
      maxValue,
      sortBy = 'priority',
      order = 'desc',
      storeId,
      cardType,
    } = req.query;

    // Build filter
    const now = new Date();
    const filter: any = {
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now },
    };

    // Add usage limit check
    const usageLimitConditions = [
      { usageLimit: { $exists: false } },
      { usageLimit: null },
      { $expr: { $lt: ['$usedCount', '$usageLimit'] } }
    ];

    if (applicableOn) {
      filter.applicableOn = applicableOn;
    }

    if (type) {
      filter.type = type;
    }

    // Filter by payment method - include 'all' for both card and upi requests
    const paymentMethod = req.query.paymentMethod as string;
    if (paymentMethod) {
      if (paymentMethod === 'card') {
        filter.paymentMethod = { $in: ['card', 'all'] };
      } else if (paymentMethod === 'upi') {
        filter.paymentMethod = { $in: ['upi', 'all'] };
      } else if (paymentMethod === 'all') {
        filter.paymentMethod = { $in: ['all', 'card', 'upi'] };
      } else {
        filter.paymentMethod = paymentMethod;
      }
    }

    // Filter by card type - include 'all' for both credit and debit requests
    if (cardType) {
      if (cardType === 'credit' || cardType === 'debit') {
        filter.$or = [
          { cardType: cardType },
          { cardType: 'all' },
          { cardType: { $exists: false } }
        ];
      }
    }

    // Note: orderValue filtering is handled by the frontend for display purposes
    // The frontend shows all offers and indicates eligibility with "Add ₹X more to unlock"

    if (minValue) {
      filter.value = { $gte: Number(minValue) };
    }

    if (maxValue) {
      filter.value = { ...filter.value, $lte: Number(maxValue) };
    }

    // Build store-specific filter (similar to getBillPaymentDiscounts)
    if (storeId && mongoose.Types.ObjectId.isValid(storeId as string)) {
      // Get store's merchantId for merchant-level discounts
      const store = await Store.findById(storeId).select('merchantId').lean();
      const merchantId = store?.merchantId;

      // Include: global discounts + merchant discounts + store discounts
      const scopeConditions = [
        { scope: 'global' },
        { scope: { $exists: false } }, // Legacy discounts without scope
        ...(merchantId ? [{ scope: 'merchant', merchantId: merchantId }] : []),
        { scope: 'store', storeId: new mongoose.Types.ObjectId(storeId as string) }
      ];

      // Combine usage limit and scope conditions using $and
      filter.$and = [
        { $or: usageLimitConditions },
        { $or: scopeConditions }
      ];
    } else {
      // No storeId: include global discounts and legacy discounts
      filter.$and = [
        { $or: usageLimitConditions },
        { $or: [{ scope: 'global' }, { scope: { $exists: false } }] }
      ];
    }

    // Sort options (whitelist to prevent sort field injection)
    const ALLOWED_SORT_FIELDS = ['createdAt', 'name', 'discountValue', 'code', 'endDate'] as const;
    const safeSortBy = validateSortField(sortBy as string, ALLOWED_SORT_FIELDS, 'createdAt');
    const sortOptions: any = {};
    sortOptions[safeSortBy] = order === 'asc' ? 1 : -1;

    // Pagination
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [discounts, total] = await Promise.all([
      Discount.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Discount.countDocuments(filter),
    ]);

    sendPaginated(res, discounts, pageNum, limitNum, total, 'Discounts fetched successfully');
});

/**
 * GET /api/discounts/:id
 * Get single discount by ID
 */
export const getDiscountById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const discount = await Discount.findById(id).lean();

    if (!discount) {
      return sendError(res, 'Discount not found', 404);
    }

    sendSuccess(res, discount, 'Discount fetched successfully');
});

/**
 * GET /api/discounts/product/:productId
 * Get available discounts for a specific product
 */
export const getDiscountsForProduct = asyncHandler(async (req: Request, res: Response) => {
    const { productId } = req.params;
    const { orderValue = 0 } = req.query;
    const userId = req.user?.id;

    const now = new Date();
    const productObjId = new mongoose.Types.ObjectId(productId);
    const userObjId = userId ? new mongoose.Types.ObjectId(userId) : undefined;

    // Find discounts applicable to this product
    const filter: any = {
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now },
      minOrderValue: { $lte: Number(orderValue) },
      $or: [
        { usageLimit: { $exists: false } },
        { $expr: { $lt: ['$usedCount', '$usageLimit'] } }
      ],
      $and: [
        {
          $or: [
            { applicableOn: 'all' },
            { applicableOn: 'specific_products', applicableProducts: productObjId }
          ]
        }
      ]
    };

    let discountDocs = await Discount.find(filter)
      .sort({ priority: -1, value: -1 });

    // If user is authenticated, filter by user-specific rules
    let discounts: any[];
    if (userObjId) {
      const availableDiscounts = [];

      for (const discountDoc of discountDocs) {
        const canUse = await discountDoc.canUserUse(userObjId);
        if (canUse.can) {
          // Add calculated discount amount
          const discountAmount = discountDoc.calculateDiscount(Number(orderValue));
          availableDiscounts.push({
            ...discountDoc.toObject(),
            discountAmount,
            canApply: discountAmount > 0
          });
        }
      }
      discounts = availableDiscounts;
    } else {
      // For non-authenticated users, just add discount amount
      discounts = discountDocs.map((doc) => {
        const discount = doc.toObject();
        let discountAmount = 0;
        if (discount.type === 'percentage') {
          discountAmount = (Number(orderValue) * discount.value) / 100;
        } else {
          discountAmount = discount.value;
        }

        if (discount.maxDiscountAmount && discountAmount > discount.maxDiscountAmount) {
          discountAmount = discount.maxDiscountAmount;
        }

        return {
          ...discount,
          discountAmount: Math.round(discountAmount),
          canApply: discountAmount > 0
        };
      });
    }

    sendSuccess(res, discounts, 'Product discounts fetched successfully');
});

/**
 * POST /api/discounts/validate
 * Validate if a discount code can be applied
 */
export const validateDiscount = asyncHandler(async (req: Request, res: Response) => {
    const { code, orderValue, productIds, categoryIds } = req.body;
    const userId = req.user?.id;

    if (!code) {
      return sendError(res, 'Discount code is required', 400);
    }

    if (!orderValue || orderValue <= 0) {
      return sendError(res, 'Valid order value is required', 400);
    }

    // Find discount by code
    const discount = await Discount.findOne({
      code: code.toUpperCase(),
      isActive: true
    }).lean();

    if (!discount) {
      return sendError(res, 'Invalid discount code', 404);
    }

    // Check if currently valid
    const now = new Date();
    if (discount.validFrom > now) {
      return sendError(res, 'This discount is not yet active', 400);
    }

    if (discount.validUntil < now) {
      return sendError(res, 'This discount has expired', 400);
    }

    // Check usage limit
    if (discount.usageLimit && discount.usedCount >= discount.usageLimit) {
      return sendError(res, 'This discount has reached its usage limit', 400);
    }

    // Check minimum order value
    if (orderValue < discount.minOrderValue) {
      return sendError(
        res,
        `Minimum order value of ₹${discount.minOrderValue} required`,
        400
      );
    }

    // Check product/category applicability
    if (discount.applicableOn === 'specific_products') {
      if (!productIds || productIds.length === 0) {
        return sendError(res, 'This discount is only valid for specific products', 400);
      }

      const applicableProductIds = discount.applicableProducts?.map(id => id.toString()) || [];
      const hasApplicableProduct = productIds.some((id: string) =>
        applicableProductIds.includes(id)
      );

      if (!hasApplicableProduct) {
        return sendError(res, 'This discount is not applicable to selected products', 400);
      }
    }

    if (discount.applicableOn === 'specific_categories') {
      if (!categoryIds || categoryIds.length === 0) {
        return sendError(res, 'This discount is only valid for specific categories', 400);
      }

      const applicableCategoryIds = discount.applicableCategories?.map(id => id.toString()) || [];
      const hasApplicableCategory = categoryIds.some((id: string) =>
        applicableCategoryIds.includes(id)
      );

      if (!hasApplicableCategory) {
        return sendError(res, 'This discount is not applicable to selected categories', 400);
      }
    }

    // Check user-specific restrictions
    if (userId) {
      const userObjId = new mongoose.Types.ObjectId(userId);
      const canUse = await discount.canUserUse(userObjId);

      if (!canUse.can) {
        return sendError(res, canUse.reason || 'You cannot use this discount', 400);
      }
    }

    // Calculate discount amount
    const discountAmount = discount.calculateDiscount(orderValue);

    sendSuccess(
      res,
      {
        valid: true,
        discount: {
          _id: discount._id,
          code: discount.code,
          name: discount.name,
          type: discount.type,
          value: discount.value,
          discountAmount,
          finalAmount: orderValue - discountAmount,
        },
      },
      'Discount is valid'
    );
});

/**
 * POST /api/discounts/apply
 * Apply discount to an order (authenticated users only)
 */
export const applyDiscount = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { discountId, orderId, orderValue } = req.body;

    if (!discountId || !orderId || !orderValue) {
      return sendError(res, 'Discount ID, order ID, and order value are required', 400);
    }

    // Find discount
    const discount = await Discount.findById(discountId).lean();

    if (!discount) {
      return sendError(res, 'Discount not found', 404);
    }

    if (!discount.isActive) {
      return sendError(res, 'This discount is not active', 400);
    }

    // Validate discount can be used
    const userObjId = new mongoose.Types.ObjectId(userId);
    const canUse = await discount.canUserUse(userObjId);

    if (!canUse.can) {
      return sendError(res, canUse.reason || 'You cannot use this discount', 400);
    }

    // Calculate discount amount
    const discountAmount = discount.calculateDiscount(orderValue);

    if (discountAmount === 0) {
      return sendError(
        res,
        `Minimum order value of ₹${discount.minOrderValue} required`,
        400
      );
    }

    // Create discount usage record
    const discountUsage = new DiscountUsage({
      discount: discountId,
      user: userId,
      order: orderId,
      discountAmount,
      orderValue,
      metadata: {
        discountCode: discount.code,
        discountType: discount.type,
        originalDiscountValue: discount.value,
      },
    });

    await discountUsage.save();

    // Increment usage count
    discount.usedCount += 1;
    await discount.save();

    sendSuccess(
      res,
      {
        discountAmount,
        finalAmount: orderValue - discountAmount,
        usageId: discountUsage._id,
      },
      'Discount applied successfully',
      201
    );
});

/**
 * GET /api/discounts/my-history
 * Get user's discount usage history (authenticated users only)
 */
export const getUserDiscountHistory = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { page = 1, limit = 20 } = req.query;

    // Pagination
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [history, total] = await Promise.all([
      DiscountUsage.find({ user: userId })
        .populate('discount', 'name code type value')
        .populate('order', 'orderNumber status')
        .sort({ usedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      DiscountUsage.countDocuments({ user: userId }),
    ]);

    sendPaginated(res, history, pageNum, limitNum, total, 'Discount history fetched successfully');
});

/**
 * GET /api/discounts/:id/analytics
 * Get analytics for a specific discount (admin only)
 */
export const getDiscountAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const discountObjId = new mongoose.Types.ObjectId(id);
    const analytics = await DiscountUsage.getDiscountAnalytics(discountObjId);

    const discount = await Discount.findById(id).lean();

    if (!discount) {
      return sendError(res, 'Discount not found', 404);
    }

    sendSuccess(
      res,
      {
        discount: {
          _id: discount._id,
          name: discount.name,
          code: discount.code,
          type: discount.type,
          value: discount.value,
        },
        analytics,
      },
      'Analytics fetched successfully'
    );
});

/**
 * GET /api/discounts/bill-payment
 * Get available bill payment discounts
 * Supports store-specific filtering (Phase 2)
 * Returns ALL discounts (regardless of minOrderValue) - frontend handles eligibility display
 */
export const getBillPaymentDiscounts = asyncHandler(async (req: Request, res: Response) => {
    const { orderValue = 0, storeId } = req.query;
    const userId = req.user?.id;

    const now = new Date();

    // Build store-specific filter (Phase 2)
    const storeFilter: any = {};
    if (storeId && mongoose.Types.ObjectId.isValid(storeId as string)) {
      // Get store's merchantId for merchant-level discounts
      const store = await Store.findById(storeId).select('merchantId').lean();
      const merchantId = store?.merchantId;

      // Include: global discounts + merchant discounts + store discounts
      storeFilter.$or = [
        { scope: 'global' }, // Global discounts (available to all stores)
        { scope: { $exists: false } }, // Legacy discounts without scope field
        ...(merchantId ? [{ scope: 'merchant', merchantId: new mongoose.Types.ObjectId(merchantId) }] : []), // Merchant-level discounts
        { scope: 'store', storeId: new mongoose.Types.ObjectId(storeId as string) } // Store-specific discounts
      ];
    } else {
      // No storeId: only global discounts and legacy discounts
      storeFilter.$or = [
        { scope: 'global' },
        { scope: { $exists: false } }
      ];
    }

    // Build base filter - NO minOrderValue filter
    // Frontend will show all discounts and indicate eligibility
    const baseFilter: any = {
      applicableOn: 'bill_payment',
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now }
      // NOTE: minOrderValue filter removed - show all discounts
      // Frontend displays "Add ₹X more to unlock" for ineligible ones
    };

    // Build $and array to combine all OR conditions
    const andConditions: any[] = [];

    // 1. Payment method filter - exclude card-specific discounts
    // Card discounts should appear in Section4 (Card Offers), not Section3 (Mega Sale)
    andConditions.push({
      $or: [
        { paymentMethod: 'upi' },
        { paymentMethod: 'all' },
        { paymentMethod: { $exists: false } },
        { paymentMethod: null }
      ]
    });

    // 2. Store scope filter
    if (storeFilter.$or) {
      andConditions.push({ $or: storeFilter.$or });
    }

    // 3. Usage limit filter
    andConditions.push({
      $or: [
        { usageLimit: { $exists: false } },
        { usageLimit: null },
        { $expr: { $lt: ['$usedCount', '$usageLimit'] } }
      ]
    });

    // Build final filter
    const filter: any = {
      ...baseFilter,
      $and: andConditions
    };

    let discounts = await Discount.find(filter)
      .sort({ priority: -1, value: -1 })
      .lean();

    // Calculate discount amounts
    discounts = discounts.map((discount: any) => {
      let discountAmount = 0;
      if (discount.type === 'percentage') {
        discountAmount = (Number(orderValue) * discount.value) / 100;
      } else {
        discountAmount = discount.value;
      }

      if (discount.maxDiscountAmount && discountAmount > discount.maxDiscountAmount) {
        discountAmount = discount.maxDiscountAmount;
      }

      return {
        ...discount,
        discountAmount: Math.round(discountAmount),
        canApply: discountAmount > 0 && Number(orderValue) >= discount.minOrderValue
      };
    });

    sendSuccess(res, discounts, 'Bill payment discounts fetched successfully');
});

/**
 * POST /api/discounts/card-offers/validate
 * Validate if a card is eligible for offers
 */
export const validateCardForOffers = asyncHandler(async (req: Request, res: Response) => {
    const { cardNumber, storeId, orderValue } = req.body;

    if (!cardNumber || !storeId) {
      return sendError(res, 'Card number and store ID are required', 400);
    }

    // Extract card BIN (first 6 digits)
    const cleanCardNumber = cardNumber.replace(/\s/g, '');
    const cardBin = cleanCardNumber.substring(0, 6);

    // Card type detection using BIN ranges
    // Credit card BINs typically start with: 4 (Visa), 5 (Mastercard), 3 (Amex), 6 (Discover)
    // Note: In production, use a proper BIN database for accurate detection
    // For now, we use 'all' to match both credit and debit offers
    const cardType = req.body.cardType || 'all';

    const now = new Date();
    
    // Build store filter
    const store = await Store.findById(storeId).select('merchantId').lean();
    const merchantId = store?.merchantId;
    
    const storeFilter: any = {
      $or: [
        { scope: 'global' },
        ...(merchantId ? [{ scope: 'merchant', merchantId: new mongoose.Types.ObjectId(merchantId) }] : []),
        { scope: 'store', storeId: new mongoose.Types.ObjectId(storeId) }
      ]
    };

    // Find eligible card offers
    const filter: any = {
      ...storeFilter,
      applicableOn: 'card_payment', // Card offers use card_payment
      paymentMethod: { $in: ['card', 'all'] },
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now },
      minOrderValue: { $lte: Number(orderValue || 0) },
      $or: [
        { cardType: 'all' },
        { cardType: cardType }
      ],
      $and: [
        {
          $or: [
            { bankNames: { $exists: false }, cardBins: { $exists: false } }, // No restrictions
            { bankNames: { $size: 0 }, cardBins: { $size: 0 } }, // Empty arrays
            { cardBins: { $in: [cardBin] } }, // Card BIN matches (cardBins is an array)
          ]
        }
      ]
    };

    let offers = await Discount.find(filter)
      .sort({ priority: -1, value: -1 })
      .lean();

    // Calculate discount amounts
    offers = offers.map((offer: any) => {
      let discountAmount = 0;
      if (offer.type === 'percentage') {
        discountAmount = (Number(orderValue || 0) * offer.value) / 100;
      } else {
        discountAmount = offer.value;
      }

      if (offer.maxDiscountAmount && discountAmount > offer.maxDiscountAmount) {
        discountAmount = offer.maxDiscountAmount;
      }

      return {
        ...offer,
        discountAmount: Math.round(discountAmount),
      };
    });

    const bestOffer = offers.length > 0 ? offers[0] : null;

    sendSuccess(res, {
      eligible: offers.length > 0,
      offers,
      bestOffer,
    }, 'Card validation completed');
});

/**
 * POST /api/discounts/card-offers/apply
 * Apply a card offer to cart/order
 */
export const applyCardOffer = asyncHandler(async (req: Request, res: Response) => {
    const { discountId, orderId, cardLast4 } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return sendError(res, 'Authentication required', 401);
    }

    if (!discountId) {
      return sendError(res, 'Discount ID is required', 400);
    }

    const discount = await Discount.findById(discountId).lean();
    if (!discount) {
      return sendError(res, 'Discount not found', 404);
    }

    // Validate discount
    const now = new Date();
    if (!discount.isActive || now < discount.validFrom || now > discount.validUntil) {
      return sendError(res, 'Discount is not valid', 400);
    }

    // Check usage limits
    if (discount.usageLimit && discount.usedCount >= discount.usageLimit) {
      return sendError(res, 'Discount usage limit reached', 400);
    }

    // Check user usage limit
    const userObjId = new mongoose.Types.ObjectId(userId);
    const canUse = await discount.canUserUse(userObjId);
    if (!canUse.can) {
      return sendError(res, canUse.reason || 'Cannot use this discount', 400);
    }

    // Calculate discount amount (requires orderValue from orderId if provided)
    // For now, return success - actual application happens at checkout
    const discountAmount = discount.type === 'percentage' 
      ? 0 // Will be calculated at checkout with actual order value
      : discount.value;

    sendSuccess(res, {
      success: true,
      discountAmount,
      discount: {
        _id: discount._id,
        name: discount.name,
        type: discount.type,
        value: discount.value,
      },
    }, 'Card offer applied successfully');
});
